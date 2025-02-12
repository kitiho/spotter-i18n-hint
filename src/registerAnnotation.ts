import type { DecorationOptions, TextEditor } from 'vscode'
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

// 获取配置
const config = workspace.getConfiguration('spotter')
const displayMode = config.get<string>('displayMode', 'inline') // 默认为内联模式
const inlineTextColor = config.get<string>('inlineTextColor', 'rgba(153, 153, 153, .8)')
const inlineBorderColor = config.get<string>('inlineBorderColor', 'rgba(153, 153, 153, .2)')

const UnderlineDecoration = window.createTextEditorDecorationType({
  textDecoration: 'none; border-bottom: 1px dashed currentColor',
  rangeBehavior: DecorationRangeBehavior.ClosedClosed,
})

const NoneDecoration = window.createTextEditorDecorationType({
  textDecoration: 'none',
  rangeBehavior: DecorationRangeBehavior.ClosedClosed,
})

const InlineDecoration = window.createTextEditorDecorationType({
  textDecoration: 'none; display: none;',
})

export function resetDecoration() {
  const editor = window.activeTextEditor
  editor?.setDecorations(UnderlineDecoration, [])
  editor?.setDecorations(NoneDecoration, [])
  editor?.setDecorations(InlineDecoration, [])
}

export async function registerAnnotations(
  cwd: string,
  obj: Record<'zh' | 'en', Record<string, string>>,
  matcher: ((content: string) => { index: number; key: string }[]),
) {
  let currentDecorations: DecorationOptions[] = []

  // 更新装饰器显示状态
  function updateDecorationVisibility(editor: TextEditor | undefined = window.activeTextEditor) {
    if (!editor)
      return

    const position = editor.selection.active

    // 过滤出不包含当前光标的装饰器
    const visibleDecorations = currentDecorations.filter(decoration =>
      !decoration.range.contains(position),
    )

    if (displayMode === 'inline')
      editor.setDecorations(InlineDecoration, visibleDecorations)
  }

  // 监听光标位置变化
  window.onDidChangeTextEditorSelection(() => {
    updateDecorationVisibility()
  })

  async function updateAnnotation(editor = window.activeTextEditor) {
    if (!checkLanguageId(editor?.document.languageId || ''))
      return

    try {
      function reset() {
        currentDecorations = []
        editor?.setDecorations(UnderlineDecoration, [])
        editor?.setDecorations(NoneDecoration, [])
        editor?.setDecorations(InlineDecoration, [])
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
      const inlineDecorations: DecorationOptions[] = []
      // 使用新的函数匹配逻辑
      const matches = matcher(text)
      for (const match of matches) {
        const key = match.key
        const startPos = editor.document.positionAt(match.index - 1)
        const endPos = editor.document.positionAt(match.index + key.length + 1)
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

        if (displayMode === 'inline') {
          const inlineDecoration: DecorationOptions = {
            range: new Range(startPos, endPos),
            renderOptions: {
              after: {
                contentText: `${obj.zh?.[key] || obj.en?.[key]}`,
                color: inlineTextColor,
                border: `0.5px solid ${inlineBorderColor}; border-radius: 2px;`,
              },
            },
            hoverMessage: new MarkdownString().appendText(`Key: ${key}`),
          }
          inlineDecorations.push(inlineDecoration)
        }
      }

      editor.setDecorations(NoneDecoration, [])
      if (displayMode === 'inline') {
        currentDecorations = inlineDecorations
        updateDecorationVisibility(editor)
      }
      editor.setDecorations(UnderlineDecoration, i18nKeys)
    }
    catch (e: any) {
      log.appendLine(String(e.stack ?? e))
    }
  }

  function resetAnnotation(editor = window.activeTextEditor) {
    currentDecorations = []
    editor?.setDecorations(UnderlineDecoration, [])
    editor?.setDecorations(NoneDecoration, [])
    editor?.setDecorations(InlineDecoration, [])
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
