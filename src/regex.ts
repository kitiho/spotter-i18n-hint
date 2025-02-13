export const patternRegex = /t\s*\(\s*['"]([^'"\s][^'"]*)['"]\s*(?:,[\s\S]*?(?=\))|[^),]*)*\)|i18nKey\s*:\s*['"]([^'"\s][^'"]*)['"]\s*/g

export function extractValidKeys(content: string, keySet: Set<string>) {
  const results: { index: number; key: string }[] = []
  let lastIndex = 0

  try {
    while (true) {
      const match = patternRegex.exec(content)
      if (!match)
        break

      // match[1] 是 t() 的 key
      // match[2] 是 i18nKey 的 key
      const key = match[1] || match[2]
      // 验证key是否存在且在keySet中
      if (!key || !keySet.has(key))
        continue

      // 获取完整的匹配字符串
      const fullMatch = match[0]
      // 获取 key 的匹配字符串
      const keyMatch = fullMatch.match(/['"]([^'"]+)['"]/)
      if (!keyMatch)
        continue

      // 获取 key 的索引
      const index = match.index + fullMatch.indexOf(keyMatch[0])
      results.push({ index, key })

      // 更新 lastIndex 以继续搜索
      lastIndex = match.index + 1
      patternRegex.lastIndex = lastIndex
    }
  }
  catch (error) {
    // return {
    //   results,
    //   error: error instanceof Error ? error : new Error(String(error)),
    // }
    return []
  }
  finally {
    // 重置正则表达式状态
    patternRegex.lastIndex = 0
  }

  return results
}
