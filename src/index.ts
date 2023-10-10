import type { ExtensionContext } from 'vscode'
import { workspace } from 'vscode'
import { version } from '../package.json'
import { registerAnnotations } from './registerAnnotation'
import { log } from './log'
import { getI18nSource } from './getSource'

export async function activate(_ctx: ExtensionContext) {
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

  const i18n_api_key = config.get<string>('i18n_api_key', '')
  const i18n_operator_id = config.get<string>('i18n_operator_id', '')
  const i18n_project_id = config.get<string>('i18n_project_id', '')
  const i18n_namespace_id = config.get<string>('i18n_namespace_id', '')
  if (!i18n_api_key || !i18n_operator_id || !i18n_project_id || !i18n_namespace_id) {
    log.appendLine('➖ i18n_api_key or i18n_operator_id or i18n_project_id or i18n_namespace_id is empty')
    return
  }

  const cwd = projectPath

  try {
    const obj: Record<'zh' | 'en', Record<string, string>> = {
      en: {},
      zh: {},
    }
    const zhData: any = await getI18nSource('zh', {
      i18n_api_key,
      i18n_operator_id,
      i18n_project_id,
      i18n_namespace_id,
    })
    const enData: any = await getI18nSource('en', {
      i18n_api_key,
      i18n_operator_id,
      i18n_project_id,
      i18n_namespace_id,
    })
    obj.zh = zhData
    obj.en = enData
    const allKeys = Object.keys(obj.zh)
    // 将obj的key按照长度排序，然后拼接成正则表达式，其中特殊符号需要转义
    const regEx = new RegExp(
      allKeys
        .sort((a, b) => b.length - a.length)
        .map(item => item.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'))
        .join('|'),
      'g',
    )
    registerAnnotations(cwd, obj, regEx)
  }
  catch (e: any) {
    log.appendLine(String(e.stack ?? e))
  }
}

export function deactivate() { }
