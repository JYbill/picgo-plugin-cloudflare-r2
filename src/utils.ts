import { ConfigEnum } from './index.enum'

/**
 * 校验配置项，如果不完整则返回错误提示语
 * @param config
 * @returns {string} errorMessage 错误信息
 */
export const verifyConfig = (config: Record<string, string>): undefined | string => {
  if (!config) {
    return '配置项不完整'
  }
  const verifyList = [ConfigEnum.ENDPOINT, ConfigEnum.ACCESS_KEY, ConfigEnum.SECRET_ACCESS, ConfigEnum.BUCKET_NAME, ConfigEnum.DOMAIN]
  for (const item of verifyList) {
    if (!config[item]) {
      return `配置项不完整: ${item}缺失`
    }
  }
}
