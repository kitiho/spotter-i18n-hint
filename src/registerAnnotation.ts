import type { DecorationOptions } from 'vscode'
import { DecorationRangeBehavior, MarkdownString, Range, window, workspace } from 'vscode'
import { isSubdir, throttle } from './utils'

export async function registerAnnotations(cwd: string, obj: Record<'zh' | 'en', Record<string, string>>, regEx: RegExp) {
  const UnderlineDecoration = window.createTextEditorDecorationType({
    textDecoration: 'none; border-bottom: 1px dashed currentColor',
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
  })
  const NoneDecoration = window.createTextEditorDecorationType({
    textDecoration: 'none',
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
  })

  async function updateAnnotation(editor = window.activeTextEditor) {
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

      const code = doc.getText()
      if (!code)
        return reset()

      const text = editor.document.getText()
      // 匹配text
      let match
      const i18nKeys: DecorationOptions[] = []
      // eslint-disable-next-line no-cond-assign
      while ((match = regEx.exec(text))) {
        const key = match[0]
        const startPos = editor.document.positionAt(match.index)
        const endPos = editor.document.positionAt(match.index + match[0].length)
        const markdown = new MarkdownString()
          .appendMarkdown(`\n\nen · <code>${obj.en?.[key]}</code>`)
          .appendMarkdown(`\n\nzh · <code>${obj.zh?.[key]}</code>`)
          .appendMarkdown('\n\n![alt](https://raw.githubusercontent.com/kitiho/spotter-i18n-hint/main/res/spotter.svg|"width=50")')
        markdown.supportHtml = true
        const decoration: DecorationOptions = {
          range: new Range(startPos, endPos),
          hoverMessage: markdown,
        }
        i18nKeys.push(decoration)
      }

      editor.setDecorations(NoneDecoration, [])
      editor.setDecorations(UnderlineDecoration, i18nKeys)
    }
    catch (error) { }
  }

  const throttledUpdateAnnotation = throttle(updateAnnotation, 200)
  window.onDidChangeActiveTextEditor(updateAnnotation)
  workspace.onDidChangeTextDocument((e) => {
    if (e.document === window.activeTextEditor?.document)
      throttledUpdateAnnotation()
  })
  await updateAnnotation()
}
