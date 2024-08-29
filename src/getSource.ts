import axios from 'axios'

enum Lang {
  ZH = 'zh',
  EN = 'en',
  // 默认语言中文简体
  ZH_HANS = 'zh_Hans',
}
// 默认域名
const DOMAIN_URL = 'https://weblate.spotterio.com'
// 默认项目
const PROJECT = 'spotter-dev'
// 默认部件
const COMMON = 'common'

export const getI18nSource = async (
  locale: 'zh' | 'en',
  {
    component,
  }: {
    component: string
  },
) => {
  // 获取源语言
  function getSourceLocale(_locale: string, _component: string) {
    return new Promise((resolve, reject) => {
      axios({
        url: `${DOMAIN_URL}/api/translations/${PROJECT}/${_component}/${
          // zh_Hans to zh映射
          _locale === Lang.ZH ? Lang.ZH_HANS : _locale || Lang.ZH_HANS
        }/file/`,
        headers: {
          'Content-Type': 'application/json',
          // token这里直接写死
          'Authorization': 'Token wlu_xRmTEHTCLVlpGhYunVeyFm4kO7AORbHUcZfv',
          'Cache-Control': 'no-cache',
        },
      })
        .then((res: any) => {
          // TODO 304命中缓存去拿数据
          if (res.status === 200)
            resolve(res.data)
          else reject(new Error('拉取翻译失败'))
        })
        .catch((err: any) => {
          reject(err)
        })
    })
  }

  const resList: any = await Promise.all([
    getSourceLocale(locale, component),
    getSourceLocale(locale, COMMON),
  ])
  const source = {
    ...resList[0],
    ...resList[1],
  }
  return source
}
