import { ConfigEnum } from './index.enum'

export const UploaderConfig = [
  {
    alias: 'cloudflare端点',
    name: ConfigEnum.ENDPOINT,
    type: 'input',
    default: '',
    message: '访问存储桶的API端点',
    required: true
  },
  {
    alias: 'accessKey',
    name: ConfigEnum.ACCESS_KEY,
    type: 'input',
    default: '',
    message: '访问存储痛的Key',
    required: true
  },
  {
    alias: 'access密钥',
    name: ConfigEnum.SECRET_ACCESS,
    type: 'input',
    default: '',
    message: '访问存储桶的密钥',
    required: true
  },
  {
    alias: '存储桶名',
    name: ConfigEnum.BUCKET_NAME,
    type: 'input',
    default: 'markdown',
    message: '存储桶名称',
    required: true
  },
  {
    alias: '目录',
    name: ConfigEnum.SUB_FOLDER,
    type: 'input',
    default: '',
    message: '存储桶内的子目录，可以不填',
    required: false
  },
  {
    alias: '域名地址',
    name: ConfigEnum.DOMAIN,
    type: 'input',
    default: '',
    message: '请输入访问文件的公开域名',
    required: true
  }
]
