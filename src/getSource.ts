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
const DEFAULT_PROJECT = 'spotter-dev'
// 默认部件
const COMMON = 'common'

export const getI18nSource = async (
  locale: 'zh' | 'en',
  {
    components,
    project,
  }: {
    project?: string
    components: string
  },
) => {
  // 获取源语言
  function getSourceLocale(_locale: string, _component: string, _project?: string) {
    return new Promise((resolve, reject) => {
      axios({
        // 默认仍然取spotter-dev项目下的翻译数据，如果配置了project，则取配置的项目
        url: `${DOMAIN_URL}/api/translations/${_project || DEFAULT_PROJECT}/${_component}/${
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

  const componentsList = components.split(',').map(item => item.trim())

  const resList: any = await Promise.all([
    ...componentsList.map((component) => {
      return getSourceLocale(locale, component, project)
    }),
    // 公共组件
    getSourceLocale(locale, COMMON, DEFAULT_PROJECT),
  ])
  const source = resList.reduce((acc: Record<string, any>, curr: Record<string, any>) => {
    return {
      ...acc,
      ...curr,
    }
  }, {})
  return source
}

// 更新翻译单元
export const updateUnit = async (
  key: string,
  translation: string,
  project: string = DEFAULT_PROJECT,
  component: string,
) => {
  try {
    // 获取翻译单元ID
    const unitsResponse = await axios({
      url: `${DOMAIN_URL}/api/translations/${project}/${component}/units/`,
      params: { source: key },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Token wlu_xRmTEHTCLVlpGhYunVeyFm4kO7AORbHUcZfv',
        'Cache-Control': 'no-cache',
      },
    })

    if (unitsResponse.status === 200) {
      const units = unitsResponse.data?.results || []

      if (units.length > 0) {
        const unitId = units[0].id

        // 更新翻译内容
        const updateResponse = await axios({
          method: 'PATCH',
          url: `${DOMAIN_URL}/api/units/${unitId}/`,
          data: { target: translation },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token wlu_xRmTEHTCLVlpGhYunVeyFm4kO7AORbHUcZfv',
          },
        })

        if (updateResponse.status === 200)
          return { success: true, data: updateResponse.data }
        else
          throw new Error(`更新失败: ${updateResponse.status}`)
      }
      else {
        throw new Error('未找到对应的翻译单元')
      }
    }
    else {
      throw new Error(`获取翻译单元失败: ${unitsResponse.status}`)
    }
  }
  catch (error: any) {
    return {
      success: false,
      error: error.message || '更新翻译失败',
    }
  }
}
