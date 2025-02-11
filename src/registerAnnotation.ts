import type { DecorationOptions } from 'vscode'
import { DecorationRangeBehavior, MarkdownString, Range, window, workspace } from 'vscode'
import { isSubdir, throttle } from './utils'
import { log } from './log'

function checkLanguageId(languageId: string) {
  if (!['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(languageId)) {
    // 清理已有的翻译标注
    return false
  }
  return true
}

const UnderlineDecoration = window.createTextEditorDecorationType({
  textDecoration: 'none; border-bottom: 1px dashed currentColor',
  rangeBehavior: DecorationRangeBehavior.ClosedClosed,
})
const NoneDecoration = window.createTextEditorDecorationType({
  textDecoration: 'none',
  rangeBehavior: DecorationRangeBehavior.ClosedClosed,
})

export function resetDecoration() {
  const editor = window.activeTextEditor
  editor?.setDecorations(UnderlineDecoration, [])
  editor?.setDecorations(NoneDecoration, [])
}

export async function registerAnnotations(
  cwd: string,
  obj: Record<'zh' | 'en', Record<string, string>>,
  matcher: RegExp | ((content: string) => { index: number; key: string }[]),
) {
  async function updateAnnotation(editor = window.activeTextEditor) {
    if (!checkLanguageId(editor?.document.languageId || ''))
      return

    try {
      function reset() {
        editor?.setDecorations(UnderlineDecoration, [])
        editor?.setDecorations(NoneDecoration, [])
      }
      const doc = editor?.document

      if (!doc)
        return reset()

      const id = doc.uri.fsPath
      // 当前打开的不属于项目内
      if (!isSubdir(cwd, id))
        return reset()

      const text = editor.document.getText()
      if (!text)
        return reset()

      const i18nKeys: DecorationOptions[] = []

      if (matcher instanceof RegExp) {
        // 使用原有的正则匹配逻辑
        let match
        // eslint-disable-next-line no-cond-assign
        while ((match = matcher.exec(text))) {
          const fullMatch = match[0]
          const keyMatch = fullMatch.match(/['"]([^'"]+)['"]/)
          if (!keyMatch)
            continue

          const key = keyMatch[1]
          const keyStartIndex = match.index + fullMatch.indexOf(keyMatch[0])
          const startPos = editor.document.positionAt(keyStartIndex)
          const endPos = editor.document.positionAt(keyStartIndex + keyMatch[0].length)
          const markdown = new MarkdownString()
          markdown.supportHtml = true
          markdown.appendMarkdown('<b><h3>Spotter i18n hint ![alt](https://raw.githubusercontent.com/kitiho/spotter-i18n-hint/main/res/spotter.png|"width=20") </h3></b>')
            .appendMarkdown('<hr>')
            .appendMarkdown(`\n\nen · <code>${obj.en?.[key]}</code>`)
            .appendMarkdown(`\n\nzh · <code>${obj.zh?.[key]}</code>`)
          const decoration: DecorationOptions = {
            range: new Range(startPos, endPos),
            hoverMessage: markdown,
          }
          i18nKeys.push(decoration)
        }
      }
      else {
        // 使用新的函数匹配逻辑
        const matches = matcher(text)
        for (const match of matches) {
          const key = match.key
          const startPos = editor.document.positionAt(match.index)
          const endPos = editor.document.positionAt(match.index + key.length + 2) // +2 for quotes
          const markdown = new MarkdownString()
          markdown.supportHtml = true
          markdown.appendMarkdown('<b><h3>Spotter i18n hint ![alt](https://raw.githubusercontent.com/kitiho/spotter-i18n-hint/main/res/spotter.png|"width=20") </h3></b>')
            .appendMarkdown('<hr>')
            .appendMarkdown(`\n\nen · <code>${obj.en?.[key]}</code>`)
            .appendMarkdown(`\n\nzh · <code>${obj.zh?.[key]}</code>`)
          const decoration: DecorationOptions = {
            range: new Range(startPos, endPos),
            hoverMessage: markdown,
          }
          i18nKeys.push(decoration)
        }
      }

      editor.setDecorations(NoneDecoration, [])
      editor.setDecorations(UnderlineDecoration, i18nKeys)
    }
    catch (e: any) {
      log.appendLine(String(e.stack ?? e))
    }
  }

  function resetAnnotation(editor = window.activeTextEditor) {
    editor?.setDecorations(UnderlineDecoration, [])
    editor?.setDecorations(NoneDecoration, [])
  }

  const throttledUpdateAnnotation = throttle(updateAnnotation, 200)
  window.onDidChangeActiveTextEditor(updateAnnotation)
  workspace.onDidChangeTextDocument((e) => {
    if (e.document === window.activeTextEditor?.document)
      throttledUpdateAnnotation()
  })

  await updateAnnotation()

  return {
    updateAnnotation,
    resetAnnotation,
  }
}
