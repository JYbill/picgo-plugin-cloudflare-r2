export enum ConfigEnum {
  // 必须存在的配置
  ENDPOINT = 'endpoint',
  ACCESS_KEY = 'accessKeyId',
  SECRET_ACCESS = 'secretAccessKey',
  BUCKET_NAME = 'bucketName',
  DOMAIN = 'domain',
  // 可选
  SUB_FOLDER = 'subFolder',
}

export enum AppConfig {
  NAME = 'cloudflare-r2',
}
