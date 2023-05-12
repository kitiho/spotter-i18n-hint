import type { ExtensionContext } from 'vscode'
import { Uri, workspace } from 'vscode'
import { version } from '../package.json'
import { registerAnnotations } from './registerAnnotation'
import { log } from './log'

export async function activate(ctx: ExtensionContext) {
  log.appendLine(`⚪️ spotter-i18n-hint for VS Code v${version}\n`)

  const projectPath = workspace.workspaceFolders?.[0].uri.fsPath
  if (!projectPath) {
    log.appendLine('➖ No active workspace found, spotter-i18n-hint is disabled')
    return
  }

  const config = workspace.getConfiguration('spotter')
  const disabled = config.get<boolean>('disable', false)
  if (disabled) {
    log.appendLine('➖ Disabled by configuration')
    return
  }

  const cwd = projectPath

  try {
    const obj: Record<'zh' | 'en', Record<string, Record<string, string>>> = {
      en: {},
      zh: {},
    }
    const enJsonFilePath = config.get<string>('i18nJsonFilePath_en')
    const zhJsonFilePath = config.get<string>('i18nJsonFilePath_zh')
    if (!enJsonFilePath || !zhJsonFilePath) {
      log.appendLine('➖ No i18n json file found, spotter-i18n-hint is disabled')
      return
    }
    const res = await Promise.allSettled(
      [enJsonFilePath, zhJsonFilePath].map((jsonFilePath) => {
        if (!jsonFilePath)
          return Promise.resolve('{}')
        const jsonFileUri = Uri.file(jsonFilePath)
        workspace.fs.readFile(jsonFileUri)
        // 解析json文件，获取所有的key和value，然后拼接成一个对象
        return workspace.fs.readFile(jsonFileUri)
      }),
    )
    const data = res.filter(data => data.status === 'fulfilled' && data.value !== '{}')
    if (!data.length) {
      log.appendLine('➖ No i18n json file found, spotter-i18n-hint is disabled')
      return
    }

    data.forEach((data: any, index) => {
      const dtsFileStr = Buffer.from(data.value).toString('utf8')
      const jsonData = JSON.parse(dtsFileStr)
      obj[index === 0 ? 'en' : 'zh'] = jsonData
    })
    const allKeys = Object.keys(obj.en).map(firstKey => Object.keys(obj.en[firstKey]).map(secondKey => `${firstKey}.${secondKey}`)).flat()
    // 将obj的key按照长度排序，然后拼接成正则表达式，其中特殊符号需要转义
    const regEx = new RegExp(
      allKeys
        .sort((a, b) => b.length - a.length)
        .map(item => item.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'))
        .join('|'),
      'g',
    )
    registerAnnotations(cwd, ctx, obj, regEx)
  }
  catch (e: any) {
    log.appendLine(String(e.stack ?? e))
  }
}

export function deactivate() {}
