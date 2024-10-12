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
  title, body, text = ''
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
  // 注册
  const register = (ctx: IPicGo) => {
    /**
     * Uploader组件
     */
    ctx.helper.uploader.register(AppConfig.NAME, {

      // 根据ctx.output上传文件并输出为新的ctx.output
      async handle (ctx) {
        const config = ctx.getConfig<Record<string, string>>('picBed.cloudflare-r2')
        S3 = new S3Client({
          region: config[ConfigEnum.REGION],
          endpoint: config[ConfigEnum.ENDPOINT],
          credentials: {
            accessKeyId: config[ConfigEnum.ACCESS_KEY],
            secretAccessKey: config[ConfigEnum.SECRET_ACCESS]
          }
        })

        // ctx.log.info(JSON.stringify(ctx.output[0]))
        for (const imageItem of ctx.output) {
          const filename = imageItem.fileName
          const buffer = imageItem.buffer
          let storageKey = config[ConfigEnum.SUB_FOLDER]
          if (storageKey.startsWith('/')) {
            storageKey = storageKey.slice(1)
          }

          ctx.log.info('config', JSON.stringify({
            Bucket: config[ConfigEnum.BUCKET_NAME],
            Key: `${storageKey}${filename}`,
            ContentType: 'image/png'
          }))

          try {
            const objRes = await S3.send(new PutObjectCommand({
              Bucket: config[ConfigEnum.BUCKET_NAME],
              Body: buffer,
              Key: `${storageKey}${filename}`,
              ContentType: 'image/png'
            }))
            ctx.log.info('objRes', objRes)
          } catch (error) {
            ctx.log.error('uploader error', error)
            if (error.name.includes('NoSuchBucket')) {
              notify(ctx, { title: '上传错误', body: '对应的存储桶不存在' })
            } else {
              notify(ctx, { title: '上传错误', body: error.message })
            }
          }
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
