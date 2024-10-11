import { ConfigEnum } from './index.enum'

export const UploaderConfig = [
  {
    alias: '地区',
    name: ConfigEnum.REGION,
    type: 'input',
    default: 'auto',
    required: true
  },
  {
    alias: 'cloudflare端点',
    name: ConfigEnum.ENDPOINT,
    type: 'input',
    default: '',
    required: true
  },
  {
    alias: 'accessKey',
    name: ConfigEnum.ACCESS_KEY,
    type: 'input',
    default: '',
    required: true
  },
  {
    alias: 'access密钥',
    name: ConfigEnum.SECRET_ACCESS,
    type: 'input',
    default: '',
    required: true
  },
  {
    alias: '存储桶名',
    name: ConfigEnum.BUCKET_NAME,
    type: 'input',
    default: 'md',
    required: true
  }
]
