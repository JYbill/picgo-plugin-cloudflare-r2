import { PicGo } from 'picgo'
import type { IPicGo } from 'picgo'
import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { AppConfig, ConfigEnum } from './index.enum'
import { UploaderConfig } from './config'
import { verifyConfig } from './utils'

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
  // 注册
  const register = (ctx: IPicGo) => {
    /**
     * Uploader组件
     */
    ctx.helper.uploader.register(AppConfig.NAME, {
      async handle (ctx) {
        const { default: mime } = await import('mime')

        // 配置校验
        const config = ctx.getConfig<Record<string, string>>('picBed.cloudflare-r2')
        // 重命名存储路径
        const storageKey = config[ConfigEnum.SUB_FOLDER] ?? '/'
        const errMeg = verifyConfig(config)
        if (errMeg) {
          notify(ctx, {
            title: '配置错误',
            body: errMeg
          })
          return ctx.output
        }
        const S3 = new S3Client({
          region: 'auto',
          endpoint: config[ConfigEnum.ENDPOINT],
          credentials: {
            accessKeyId: config[ConfigEnum.ACCESS_KEY],
            secretAccessKey: config[ConfigEnum.SECRET_ACCESS]
          }
        })

        for (const imageItem of ctx.output) {
          const { fileName: filename, buffer, base64Image, extname, imgUrl } = imageItem
          if ((/(\\|\/|:)/ig).test(filename)) {
            notify(ctx, {
              title: '上传文件名错误',
              body: '请勿使用.:/\\此类具有歧义的符号'
            })
            continue
          }
          // debug
          /* ctx.log.info('config', JSON.stringify({
            Bucket: config[ConfigEnum.BUCKET_NAME],
            Key: `${storageKey}${filename}`,
            ContentType: mime.getType(extname)
          })) */

          try {
            // 格式化上传路径
            let uri = storageKey + '/' +filename // 格式: /md/1.png、md/1.png
            // replace "\" to "/"
            uri = uri.replace(/\\/g, '/')
            // replace "//" to "/"
            uri = uri.replace(/\/\//g, '/')
            if (uri.startsWith('/')) {
              uri = uri.slice(1)
            }
            // 上传文件
            const objRes = await S3.send(new PutObjectCommand({
              Bucket: config[ConfigEnum.BUCKET_NAME],
              Body: buffer,
              Key: uri,
              ContentType: mime.getType(extname)
            }))
            ctx.log.info('objRes', objRes as any)
            if (objRes.$metadata.httpStatusCode !== 200) {
              throw new Error('上传到存储桶失败，请检查原因')
            }
            const url = new URL(uri, config.domain)
            imageItem.imgUrl = url.href
            imageItem.url = url.href
          } catch (error) {
            ctx.log.error('uploader error', error)
            if (error.name.includes('NoSuchBucket')) {
              notify(ctx, { title: '上传错误', body: '对应的存储桶不存在' })
            } else if (error.name.includes('InvalidBucketName')) {
              notify(ctx, { title: '上传错误', body: '存储桶名称至少三个字符' })
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
    ctx.on('remove', (files: FileType[], guiApi) => {
      const config = ctx.getConfig<Record<string, string>>('picBed.cloudflare-r2')
      const S3 = new S3Client({
        region: 'auto',
        endpoint: config[ConfigEnum.ENDPOINT],
        credentials: {
          accessKeyId: config[ConfigEnum.ACCESS_KEY],
          secretAccessKey: config[ConfigEnum.SECRET_ACCESS]
        }
      })

      for (const file of files) {
        const { type, imgUrl, fileName } = file
        ctx.log.info('file', file as any)
        if (type !== AppConfig.NAME) continue // 其他uploader

        // cloudflare-r2 uploader
        const url = new URL(imgUrl)
        let pathname = url.pathname
        if (pathname.startsWith('/')) {
          pathname = pathname.slice(1)
        }

        // 删除文件
        ctx.log.info('remove file', pathname)
        S3.send(new DeleteObjectCommand({
          Bucket: config[ConfigEnum.BUCKET_NAME],
          Key: pathname
        })).then((delRes) => {
          ctx.log.info('remove success', delRes as any)
          notify(ctx, {
            title: '删除成功',
            body: `cloudflare-r2中成功删除${fileName}文件`
          })
        }).catch((err: Error) => {
          ctx.log.info('remove error', err.message)
          notify(ctx, {
            title: '删除失败❌',
            body: err.message
          })
        })
      }
      // ctx.log.info('remove event:', JSON.stringify(files))
    })
  }
  return {
    register,
    uploader: AppConfig.NAME
  }
}
