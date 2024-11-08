import * as vscode from 'vscode';
/** 右键菜单 */
export function contextMenu(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'spotter-i18n-hint.translater',
    (uri?: vscode.Uri) => {
      let commandParams = '';
      if (uri) {
        // 目录
        if (uri.fsPath.endsWith('/') || uri.fsPath.endsWith('\\')) {
          vscode.window.showInformationMessage(`目录路径: ${uri.fsPath}`);
          commandParams = uri.fsPath
        } else {
          // 如果uri是文件，获取其父目录
          const directoryPath = vscode.Uri.joinPath(uri, '..').fsPath;
          vscode.window.showInformationMessage(
            `Directory path: ${directoryPath}`,
          );
          commandParams = uri.fsPath
        }
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage('请先打开一个文件');
          return;
        }
        const document = editor.document;
        const fileUri = document.uri;
        const filePath = fileUri.fsPath;
        commandParams = filePath;
      }

      const terminal = vscode.window.createTerminal({
        name: 'i18n-HINT',
      });
      terminal.sendText(`pnpm i18n --entry ${commandParams}`, true);
    },
  );
  context.subscriptions.push(disposable);
}
