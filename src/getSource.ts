import request from 'request'

const i18n_domain_url = 'https://starling-public.zijieapi.com'

export const getI18nSource = async (locale: 'zh' | 'en', {
  i18n_api_key,
  i18n_operator_id,
  i18n_project_id,
  i18n_namespace_id,
}: {
  i18n_api_key: string
  i18n_operator_id: string
  i18n_project_id: string
  i18n_namespace_id: string
}) => {
  const getTokenUrl = `${i18n_domain_url}/v3/get_auth_token/${i18n_api_key}/${i18n_operator_id}/${i18n_project_id}/${i18n_namespace_id}/`
  const SOURCE_PATH = `${i18n_domain_url}/text_test2/${i18n_namespace_id}/`

  // 获取token
  const getToken = async () => {
    const res = await new Promise((resolve, reject) => {
      request.post(
        {
          url: getTokenUrl,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (error: any, response: any, body: any) => {
          if (response.statusCode === 200)
            resolve(JSON.parse(body))

          reject(error)
        },
      )
    })
    return res
  }

  // 获取源语言
  function getSourceLocale(locale: string) {
    return new Promise((resolve, reject) => {
      getToken().then((res: any) => {
        request(
          {
            url: SOURCE_PATH + locale,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': res?.data?.token,
            },
          },
          (error: any, response: any, body: any) => {
            if (!error && response.statusCode === 200)
              resolve(JSON.parse(body))

            reject(error)
          },
        )
      })
    })
  }

  const res: any = await getSourceLocale(locale)
  if (res.status === 200)
    return res.message.data
  else
    return {}
}
