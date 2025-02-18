import * as vscode from 'vscode';
/** 文件内搜索并标记 */
async function fileSearch(keyword: string, source: Record<string, string>) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const results = [];
        // 从翻译源中找到匹配的 key-value 对
        const matchedPairs = Object.entries(source)
            .filter(([_, value]) => value === keyword);
      
        if (matchedPairs.length > 0) {
            // 获取当前文件内容
            const text = document.getText();
      
            // 在当前文件中搜索匹配的 key
            for (const [key, _] of matchedPairs) {
                const keyRegex = new RegExp(`t\\(['"]${key}['"]`, 'g');
                if (keyRegex.test(text)) {
                    results.push(key);
                }
            }
      
            // 如果找到匹配项,选中所有匹配的key
            if (results.length > 0) {
                const selections: vscode.Selection[] = [];
                    
                // 遍历每一行查找匹配的key
                // 构建一个合并的正则表达式来匹配所有key
                const combinedPattern = results.map(key => `t\\(['"]${key}['"]\\)`).join('|');
                const combinedRegex = new RegExp(combinedPattern, 'g');
                    
                // 获取整个文档文本
                const fullText = document.getText();
                let match;
                    
                // 只需要一次遍历就能找到所有匹配
                while ((match = combinedRegex.exec(fullText)) !== null) {
                    // 通过位置计算行号和列号
                    const pos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);
                    selections.push(new vscode.Selection(pos, endPos));
                }
                    
                // 设置编辑器选中
                editor.selections = selections;
            }
        } else {
            vscode.window.showInformationMessage("翻译源中未找到包含该中文的条目");
        }
    }
}

/** 全局搜索中文 */
async function globalSearch(keyword: string, source: Record<string, string>) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "正在搜索...",
        cancellable: true
    }, async (progress, token) => {
        const results = Object.entries(source)
            .filter(([key, value]) => value === keyword);

        if (results.length > 0) {
            const files = await vscode.workspace.findFiles(
                '**/routes/**/*.{ts,tsx}', 
                '**/node_modules/**,**/i18n_source/**,**/dist/**'
            );

            const keyLocations = new Map<string, string>();
            const totalFiles = files.length;

            // 并行处理文件搜索
            const promises = files.map(async (file, index) => {
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ 
                    increment: (100 / totalFiles), 
                    message: `搜索文件 ${index + 1}/${totalFiles}` 
                });

                try {
                    const content = await vscode.workspace.fs.readFile(file);
                    const text = new TextDecoder().decode(content);
                    
                    for (const [key, value] of results) {
                        if (text.includes(value)) {
                            keyLocations.set(key, file.fsPath);
                            return; // 找到后立即返回，不再继续搜索该文件
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file.fsPath}:`, error);
                }
            });

            await Promise.all(promises);

            const quickPick = vscode.window.createQuickPick();

            quickPick.items = results.map(result => ({
                label: `$(file) ${result[0]}`,
                description: result[1],
                detail: keyLocations.get(result[0]) || '未找到文件位置'
            }));
            quickPick.placeholder = '选择要跳转的结果';
            quickPick.title = `找到 ${results.length} 个匹配项`;

            quickPick.onDidAccept(async () => {
                const selected = quickPick.selectedItems[0];
                if (selected && selected.description) {
                    const filePath = selected.detail;
                    if (filePath && filePath !== '未找到文件位置') {
                        const document = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(document);
                        fileSearch(selected.description, source);
                    }
                }
                quickPick.hide();
            });

            quickPick.show();
        }  else {
            vscode.window.showInformationMessage('未找到匹配项');
        }
    });
}

/** 支持搜索中文 */
export function search(
    context: vscode.ExtensionContext,
    source: { 
        [key: string]: string;
    }
) {
    const searchBoxDisposable = vscode.commands.registerCommand('spotter-i18n-hint.search', async () => {
        const keyword = await vscode.window.showInputBox({
            placeHolder: '请输入要搜索的中文',
            prompt: '搜索文案',
            ignoreFocusOut: true  // 让输入框常驻
        });
        if (keyword) {
            if (keyword.includes('/g')) {
                /** 全局搜索 */
                await globalSearch(keyword.replace('/g', ''), source);
            } else {
                /** 文件内搜索并标记 */
                fileSearch(keyword, source);
            }
        }
    });
    context.subscriptions.push(searchBoxDisposable);
}

