import { PicGo } from 'picgo'

export = (ctx: PicGo) => {
  // 注册
  const register = () => {
    ctx.helper.uploader.register('cloudflare-r2', {

      // 根据ctx.output上传文件并输出为新的ctx.output
      async handle (ctx) {
        for (const imageItem of ctx.output) {
          ctx.log.info(JSON.stringify(imageItem.fileName))
        }
        return ctx.output
      }
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
    uploader: 'cloudflare-r2'
  }
}
