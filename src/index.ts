/* eslint-disable no-console */
import * as fs from 'fs'
import * as path from 'path'
import type { ExtensionContext } from 'vscode'
import { workspace } from 'vscode'
import { version } from '../package.json'
import { registerAnnotations, resetDecoration } from './registerAnnotation'
import { log } from './log'
import { getI18nSource } from './getSource'
import { contextMenu } from './contextMenu'

export async function activate(_ctx: ExtensionContext) {
  log.appendLine(`⚪️ spotter-i18n-hint for VS Code v${version}\n`)

  const projectPath = workspace.workspaceFolders?.[0].uri.fsPath
  if (!projectPath) {
    log.appendLine(
      '➖ No active workspace found, spotter-i18n-hint is disabled',
    )
    return
  }

  // 检查 client/package.json 是否存在
  const clientPackageJsonPath = path.join(projectPath, 'client', 'package.json')
  if (!fs.existsSync(clientPackageJsonPath)) {
    log.appendLine('➖ client/package.json not found, spotter-i18n-hint is disabled')
    console.log('client/package.json not found, spotter-i18n-hint is disabled')
    return
  }

  // 检查是否包含 @spotter/i18n-sdk 依赖
  try {
    const packageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf-8'))
    const hasI18nSdk = (packageJson.dependencies && '@spotter/i18n-sdk' in packageJson.dependencies)
                       || (packageJson.devDependencies && '@spotter/i18n-sdk' in packageJson.devDependencies)

    if (!hasI18nSdk) {
      log.appendLine('➖ @spotter/i18n-sdk not found in dependencies, spotter-i18n-hint is disabled')
      console.log('@spotter/i18n-sdk not found in dependencies, spotter-i18n-hint is disabled')
      return
    }
  }
  catch (error) {
    log.appendLine('➖ Error reading client/package.json, spotter-i18n-hint is disabled')
    console.log('Error reading client/package.json, spotter-i18n-hint is disabled')
    return
  }

  const config = workspace.getConfiguration('spotter')
  const disabled = config.get<boolean>('disable', false)
  if (disabled) {
    log.appendLine('➖ Disabled by configuration')
    console.log('Disabled by configuration')
    return
  }

  const component = config.get<string>('component', '')

  if (!component) {
    log.appendLine('➖ component is empty')
    console.log('component is empty')
    return
  }

  const cwd = projectPath

  // 监听文件打开和保存事件
  workspace.onDidOpenTextDocument((document) => {
    checkLanguageId(document.languageId)
  })

  workspace.onDidSaveTextDocument((document) => {
    checkLanguageId(document.languageId)
  })

  function checkLanguageId(languageId: string) {
    if (!['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(languageId)) {
      // 清理已有的翻译标注
      resetDecoration()
      return false
    }
    return true
  }

  try {
    const obj: Record<'zh' | 'en', Record<string, string>> = {
      en: {},
      zh: {},
    }
    const zhData: any = await getI18nSource('zh', {
      component,
    })
    const enData: any = await getI18nSource('en', {
      component,
    })
    obj.zh = zhData
    obj.en = enData
    const allKeys = Object.keys(obj.zh)
    // 构建正则表达式，匹配 t 函数调用和 i18nKey 属性中的 key
    const regEx = new RegExp(
      `(?:t\\s*\\(\\s*['"]|i18nKey\\s*:\\s*['"])(?:${
        allKeys
          .sort((a, b) => b.length - a.length)
          .map(item => item.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'))
          .join('|')
      })['"](?:\\s*\\)|)`,
      'g',
    )

    registerAnnotations(cwd, obj, regEx)
    contextMenu(_ctx)
  }
  catch (e: any) {
    log.appendLine(String(e.stack ?? e))
  }
}

export function deactivate() {}
