interface FileType {
  fileName: string
  width: number
  height: number
  extname: string
  imgUrl: string
  type: string // uploader上传类型，如：qiniu（七牛云）
  id: string
  createdAt: number
  updatedAt: number
}
