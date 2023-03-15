import path from 'node:path'
import type { ExtensionContext } from 'vscode'
import { Uri, window, workspace } from 'vscode'
import { parse } from '@babel/parser'
import { version } from '../package.json'
import { registerAnnotations } from './registerAnnotation'
import { log } from './log'

export async function activate(ext: ExtensionContext) {
  log.appendLine(`⚪️ spotter-i18n-hint for VS Code v${version}\n`)

  window.showInformationMessage(`⚪️ spotter-i18n-hint for VS Code v${version}\n`)

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
    // client/node_modules/@spotter/i18n-sdk/lib/trans/index.d.ts
    const i18nDtsFilePath = config.get<string>('i18nDtsFilePath') || 'client/node_modules/@spotter/i18n-sdk/lib/trans/index.d.ts'
    const dtsFilePath = path.join(cwd, i18nDtsFilePath)
    const dtsFileUri = Uri.file(dtsFilePath)
    // 解析dts文件，获取所有的key和value，然后拼接成一个对象
    const readData = await workspace.fs.readFile(dtsFileUri)
    const dtsFileStr = Buffer.from(readData).toString('utf8')
    const ast = parse(dtsFileStr, {
      sourceType: 'module',
      plugins: ['typescript'],
    })
    const obj: Record<string, string> = {}
    // dts 的 ast生成的结构，debug出来的
    const i18nData = (ast.program.body[0] as any).declarations[0].id.typeAnnotation.typeAnnotation.members
    i18nData.forEach((item: any) => {
      const key = item.key?.value
      const value = item.typeAnnotation.typeAnnotation.literal?.value
      if (!key || !value)
        log.appendLine(`➖ key or value is undefined, key: ${key}, value: ${value}`)
      else
        obj[key] = value
    })

    // 将obj的key按照长度排序，然后拼接成正则表达式，其中特殊符号需要转义
    const regEx = new RegExp(Object.keys(obj).sort((a, b) => b.length - a.length).map(item => item.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1')).join('|'), 'g')
    registerAnnotations(cwd, ext, obj, regEx)
  }
  catch (e: any) {
    log.appendLine(String(e.stack ?? e))
  }
}

export function deactivate() { }
