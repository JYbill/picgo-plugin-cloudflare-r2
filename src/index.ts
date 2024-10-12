import { PicGo } from 'picgo'
import type { IPicGo } from 'picgo'
import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { AppConfig, ConfigEnum } from './index.enum'
import { UploaderConfig } from './config'
import { resolve } from 'path'

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
     * Uploader组件
     */
    ctx.helper.uploader.register(AppConfig.NAME, {

      // 根据ctx.output上传文件并输出为新的ctx.output
      async handle (ctx) {
        const { default: mime } = await import('mime')
        const config = ctx.getConfig<Record<string, string>>('picBed.cloudflare-r2')
        // 配置校验
        const domain = config[ConfigEnum.DOMAIN]
        if (!domain) {
          notify(ctx, { title: '配置错误', body: '未填写访问域名地址' })
          return ctx.output
        }

        S3 = new S3Client({
          region: 'auto',
          endpoint: config[ConfigEnum.ENDPOINT],
          credentials: {
            accessKeyId: config[ConfigEnum.ACCESS_KEY],
            secretAccessKey: config[ConfigEnum.SECRET_ACCESS]
          }
        })

        for (const imageItem of ctx.output) {
          const { fileName: filename, buffer, base64Image, extname, imgUrl } = imageItem
          // 重命名存储路径
          const storageKey = config[ConfigEnum.SUB_FOLDER] ?? '/'
          // debug
          /* ctx.log.info('config', JSON.stringify({
            Bucket: config[ConfigEnum.BUCKET_NAME],
            Key: `${storageKey}${filename}`,
            ContentType: mime.getType(extname)
          })) */

          try {
            // 上传文件
            let uri = resolve(storageKey, filename) // 格式: /md/1.png、md/1.png
            if (uri.startsWith('/')) {
              uri = uri.slice(1)
            }

            const objRes = await S3.send(new PutObjectCommand({
              Bucket: config[ConfigEnum.BUCKET_NAME],
              Body: buffer,
              Key: uri,
              ContentType: mime.getType(extname)
            }))
            if (objRes.$metadata.httpStatusCode !== 200) {
              throw new Error('上传到存储桶失败，请检查原因')
            }
            const url = new URL(uri, domain)
            imageItem.imgUrl = url.href
            imageItem.url = url.href
          } catch (error) {
            ctx.log.error('uploader error', error)
            if (error.name.includes('NoSuchBucket')) {
              notify(ctx, { title: '上传错误', body: '对应的存储桶不存在' })
            } else {
              notify(ctx, { title: '上传错误', body: error.message })
            }
          }
        }

        ctx.log.info('uploader output', ctx.output as any)
        return ctx.output
      },
      // uploader配置
      config: (ctx) => UploaderConfig
    })

    /**
     * 移除图片事件
     */
    ctx.on('remove', (files: FileType[], guiApi) => {
      for (const file of files) {
        const { fileName, type } = file
        S3.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `${folderName}/${fileName}`
        })).then((delRes) => {

        }).catch((err: any) => {
          ctx.log.info('remove error', err)
        })
      }
      ctx.log.info('remove event:', JSON.stringify(files))
    })
  }
  return {
    register,
    uploader: AppConfig.NAME
  }
}
