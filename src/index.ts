import * as fs from 'fs'
import * as path from 'path'
import type { ExtensionContext } from 'vscode'
import { workspace } from 'vscode'
import { version } from '../package.json'
import { registerAnnotations } from './registerAnnotation'
import { log } from './log'
import { getI18nSource } from './getSource'
import { contextMenu } from './contextMenu'
import { search } from './searchChinese'
import { extractValidKeys } from './regex'

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
    return
  }

  // 检查是否包含 @spotter/i18n-sdk 依赖
  try {
    const packageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf-8'))
    const hasI18nSdk = (packageJson.dependencies && '@spotter/i18n-sdk' in packageJson.dependencies)
                       || (packageJson.devDependencies && '@spotter/i18n-sdk' in packageJson.devDependencies)

    if (!hasI18nSdk) {
      log.appendLine('➖ @spotter/i18n-sdk not found in dependencies, spotter-i18n-hint is disabled')
      return
    }
  }
  catch (error) {
    log.appendLine('➖ Error reading client/package.json, spotter-i18n-hint is disabled')
    return
  }

  const config = workspace.getConfiguration('spotter')
  const disabled = config.get<boolean>('disable', false)
  if (disabled) {
    log.appendLine('➖ Disabled by configuration')
    return
  }

  const project = config.get<string>('project', '')
  log.appendLine(`✅ project: ${project}`)

  const component = config.get<string>('component', '')

  if (!component) {
    log.appendLine('➖ component is empty')
    return
  }

  const cwd = projectPath

  try {
    const obj: Record<'zh' | 'en', Record<string, string>> = {
      en: {},
      zh: {},
    }
    const zhData: any = await getI18nSource('zh', {
      components: component,
      project,
    })
    const enData: any = await getI18nSource('en', {
      components: component,
      project,
    })
    obj.zh = zhData
    obj.en = enData
    const allKeys = Object.keys(obj.zh)
    const keySet = new Set(allKeys)

    registerAnnotations(cwd, obj, (content: string) => extractValidKeys(content, keySet))
    contextMenu(_ctx)
    search(_ctx, zhData);
  }
  catch (e: any) {
    log.appendLine(String(e.stack ?? e))
  }
}

export function deactivate() {}
