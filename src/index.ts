import { PicGo } from 'picgo'
import type { IPicGo } from 'picgo'
import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { AppConfig, ConfigEnum } from './index.enum'
import { UploaderConfig } from './config'

let S3 = null

/**
 * 消息通知函数
 * @param ctx
 * @param title
 * @param body
 * @param text
 */
const notify = (ctx: IPicGo, {
  title, body, text
}: {
  title: string
  body: string
  text?: string
}): void => {
  ctx.emit('notification', {
    title,
    body,
    text
  })
}

export = (ctx: PicGo) => {
  const config = ctx.getConfig<Record<string, string>>('picBed.cloudflare-r2')
  S3 = new S3Client({
    region: config[ConfigEnum.REGION],
    endpoint: config[ConfigEnum.ENDPOINT],
    credentials: {
      accessKeyId: config[ConfigEnum.ACCESS_KEY],
      secretAccessKey: config[ConfigEnum.SECRET_ACCESS]
    }
  })

  // 注册
  const register = (ctx: IPicGo) => {
    /**
     * 转换之前的钩子
     */
    ctx.helper.beforeTransformPlugins.register(AppConfig.NAME, {
      async handle (ctx) {
        const buckRes = await S3.send(new ListBucketsCommand({}))
        ctx.log.info('bucket', buckRes)
        if (buckRes.$metadata.httpStatusCode !== 200 && !buckRes.Buckets[0]) {
          notify(ctx, {
            title: 'cloudflare配置错误',
            body: '无法读取到对应存储桶信息',
            text: '无法读取到对应存储桶信息'
          })
        }
        return ctx
      }
    })

    /**
     * Uploader组件
     */
    ctx.helper.uploader.register(AppConfig.NAME, {

      // 根据ctx.output上传文件并输出为新的ctx.output
      async handle (ctx) {
        // ctx.log.info(JSON.stringify(ctx.output[0]))
        for (const imageItem of ctx.output) {
          const filename = imageItem.fileName
          const buffer = imageItem.buffer
        }
        return ctx.output
      },
      // uploader配置
      config: (ctx) => UploaderConfig
    })

    /**
     * 移除图片事件
     */
    ctx.on('remove', (files, guiApi) => {
      console.log(files, guiApi)
    })
  }
  return {
    register,
    uploader: AppConfig.NAME
  }
}
