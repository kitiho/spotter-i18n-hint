export const patternRegex = /t\s*\(\s*['"]([^'"\s][^'"]*)['"]\s*(?:,[\s\S]*?(?=\))|[^),]*)*\)|i18nKey\s*:\s*['"]([^'"\s][^'"]*)['"]\s*/g

// 添加一个用于测试的辅助函数
export function extractI18nKeys(content: string): string[] {
  const keys: string[] = []
  for (let match; (match = patternRegex.exec(content)) !== null;) {
    if (match[1] || match[2])
      keys.push(match[1] || match[2])
  }
  return keys
}
