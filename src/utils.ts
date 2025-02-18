import path from 'node:path'

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

export const parseJson = (json: string) => {
  try {
    return JSON.parse(json)
  } catch (error) {
    return json
  }
}