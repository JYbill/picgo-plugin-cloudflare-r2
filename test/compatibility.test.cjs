const assert = require('node:assert/strict')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { once } = require('node:events')
const { test } = require('node:test')
const { PicGo, Logger } = require(process.env.PICGO_COMPAT_MODULE || 'picgo')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const plugin = require('../dist')
const manifest = require('../package.json')

// 目的：确认 PicGo 能通过插件加载接口注册本插件，并取得桌面界面所需的配置项。
// 预期：插件声明支持桌面版，注册的上传器名称正确，能读取全部六个配置字段，
// 且只注册一个删除事件监听器。这里检查的是界面所需的数据，不实际打开桌面界面。
test('PicGo 能加载插件并读取桌面版配置项', (t) => {
  const { ctx, registered, uploader } = setup(t)
  assert.ok(manifest.keywords.includes('picgo-gui-plugin'))
  assert.equal(registered.uploader, 'cloudflare-r2')
  assert.equal(ctx.pluginLoader.getPlugin(manifest.name), registered)
  assert.deepEqual(uploader.config(ctx).map(field => field.name), [
    'endpoint', 'accessKeyId', 'secretAccessKey', 'bucketName', 'subFolder', 'domain'
  ])
  assert.equal(ctx.listenerCount('remove'), 1)
})

// 目的：从本地 PNG 文件开始，验证 PicGo 读取图片、调用上传器和返回结果的完整流程。
// 预期：只生成一条上传指令，目标为指定存储桶中的 docs/pixel.png，
// 图片内容与原文件一致，类型为 image/png，并返回使用公开域名拼接的正确图片地址。
test('本地 PNG 经完整上传流程后返回正确的图片地址', async (t) => {
  const { ctx, directory, commands } = setup(t)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=', 'base64')
  const file = join(directory, 'pixel.png')
  writeFileSync(file, png)
  const result = await ctx.upload([file])
  assert.ok(Array.isArray(result))
  assert.equal(result.length, 1)
  assert.equal(commands.length, 1)
  assert.ok(commands[0] instanceof PutObjectCommand)
  assert.equal(commands[0].input.Bucket, 'smoke-test')
  assert.equal(commands[0].input.Key, 'docs/pixel.png')
  assert.equal(commands[0].input.ContentType, 'image/png')
  assert.deepEqual(commands[0].input.Body, png)
  assert.equal(result[0].imgUrl, 'https://images.invalid/docs/pixel.png')
  assert.equal(result[0].url, result[0].imgUrl)
})

// 目的：模拟桌面版发出的删除事件，确认插件只处理属于自身上传器的图片。
// 预期：忽略其他上传器的图片，仅为指定存储桶中的 docs/pixel.png 生成一条删除指令，
// 并在模拟请求成功后发出“删除成功”通知；整个过程应在五秒内完成。
test('删除事件只处理本插件的图片，并通知删除成功', { timeout: 5000 }, async (t) => {
  const { ctx, commands } = setup(t)
  const notification = once(ctx, 'notification')
  ctx.emit('remove', [
    { type: 'other-uploader', imgUrl: 'https://other.invalid/keep.png', fileName: 'keep.png' },
    { type: 'cloudflare-r2', imgUrl: 'https://images.invalid/docs/pixel.png', fileName: 'pixel.png' }
  ], {})
  const [message] = await notification
  assert.equal(commands.length, 1)
  assert.ok(commands[0] instanceof DeleteObjectCommand)
  assert.equal(commands[0].input.Key, 'docs/pixel.png')
  assert.equal(commands[0].input.Bucket, 'smoke-test')
  assert.equal(message.title, '删除成功')
})

// 目的：确认用户填写不合法的公开域名时，插件能够识别配置错误。
// 预期：发出“配置错误”通知，不生成任何 S3 请求。
test('公开域名配置不合法时提示错误，不发送请求', async (t) => {
  const { ctx, uploader, commands } = setup(t)
  ctx.setConfig({ 'picBed.cloudflare-r2.domain': 'invalid-domain' })
  const notification = once(ctx, 'notification')
  await uploader.handle(ctx)
  assert.equal((await notification)[0].title, '配置错误')
  assert.equal(commands.length, 0)
})

// 目的：确认文件名包含斜杠时，插件会在上传前拦截，避免将其误当成目录路径。
// 预期：发出“上传文件名错误”通知，不生成任何 S3 请求。
test('文件名包含斜杠时拒绝上传并提示错误', async (t) => {
  const { ctx, uploader, commands } = setup(t)
  ctx.output = [{ fileName: 'bad/name.png', extname: '.png', buffer: Buffer.alloc(0) }]
  const notification = once(ctx, 'notification')
  await uploader.handle(ctx)
  assert.equal((await notification)[0].title, '上传文件名错误')
  assert.equal(commands.length, 0)
})

// 目的：模拟 R2 返回“存储桶不存在”错误，检查插件能否转成用户可理解的提示。
// 预期：捕获 NoSuchBucket 异常，通知标题为“上传错误”，内容为“对应的存储桶不存在”。
test('存储桶不存在时提示明确的上传失败原因', async (t) => {
  const { ctx, uploader } = setup(t)
  S3Client.prototype.send.mock.mockImplementation(async () => {
    throw Object.assign(new Error('Missing test bucket'), { name: 'NoSuchBucket' })
  })
  ctx.output = [{ fileName: 'pixel.png', extname: '.png', buffer: Buffer.alloc(0) }]
  const notification = once(ctx, 'notification')
  await uploader.handle(ctx)
  const [message] = await notification
  assert.equal(message.title, '上传错误')
  assert.equal(message.body, '对应的存储桶不存在')
})

// 为每项测试创建独立的临时配置，测试结束后自动清理，避免影响用户配置或其他测试。
// 使用真实的 PicGo 注册和上传流程，模拟 S3 请求并关闭日志输出。
// 配置中的密钥只是测试用的占位文本，不会发送到外部服务，也不会操作真实存储桶。
function setup (t) {
  const directory = mkdtempSync(join(tmpdir(), 'r2-compat-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  // 在创建 PicGo 实例前关闭所有日志输出，包括 Core 3 的审计日志，
  // 避免临时目录清理后，延迟执行的日志写入仍尝试访问该目录。
  for (const method of ['info', 'warn', 'error', 'success', 'debug']) {
    t.mock.method(Logger.prototype, method, () => {})
  }
  const ctx = new PicGo(join(directory, 'config.json'))
  const commands = []
  t.mock.method(S3Client.prototype, 'send', async function (command) {
    commands.push(command)
    return { $metadata: { httpStatusCode: 200 } }
  })
  ctx.setConfig({
    'picBed.current': 'cloudflare-r2',
    'picBed.uploader': 'cloudflare-r2',
    'picBed.cloudflare-r2': {
      endpoint: 'https://r2.invalid',
      accessKeyId: 'offline-fixture',
      secretAccessKey: 'offline-fixture',
      bucketName: 'smoke-test',
      domain: 'https://images.invalid/',
      subFolder: '/docs/'
    }
  })
  const registered = ctx.use(plugin, manifest.name)
  const uploader = ctx.helper.uploader.get('cloudflare-r2')
  return { ctx, registered, uploader, commands, directory }
}
