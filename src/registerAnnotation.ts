import path from 'node:path'
import type { DecorationOptions, ExtensionContext } from 'vscode'
import { DecorationRangeBehavior, MarkdownString, Range, window, workspace } from 'vscode'

export async function registerAnnotations(cwd: string,
  ext: ExtensionContext,
  obj: Record<string, string>,
  regEx: RegExp) {
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
      while (match = regEx.exec(text)) {
        const startPos = editor.document.positionAt(match.index)
        const endPos = editor.document.positionAt(match.index + match[0].length)
        const decoration = {
          range: new Range(startPos, endPos),
          hoverMessage: new MarkdownString(`**${obj[match[0]]}**`),
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
export function isSubdir(parent: string, child: string) {
  const relative = path.relative(parent, child)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}
export function throttle<T extends ((...args: any) => any)>(func: T, timeFrame: number): T {
  let lastTime = 0
  let timer: any
  return function (...args) {
    const now = Date.now()
    clearTimeout(timer)
    if (now - lastTime >= timeFrame) {
      lastTime = now
      return func(...args)
    }
    else {
      timer = setTimeout(func, timeFrame, ...args)
    }
  } as T
}

