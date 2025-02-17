import { describe, expect, it } from 'vitest'
import { extractValidKeys, patternRegex } from '../src/regex'

describe('patternRegex', () => {
  it('应该匹配 t() 函数调用', () => {
    const testCases = [
      't("test.key")',
      't(\'test.key\')',
      't("test.key", { name: "test" })',
      't(\'test.key\', { name: \'test\' })',
      't( "test.key" )',
      't(  "test.key"  )',
    ]

    testCases.forEach((testCase) => {
      const matches = [...testCase.matchAll(patternRegex)]
      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('test.key')
    })
  })

  it('应该匹配 i18nKey 属性', () => {
    const testCases = [
      'i18nKey: "test.key"',
      'i18nKey: \'test.key\'',
      'i18nKey:  "test.key"',
      'i18nKey:   "test.key"  ',
    ]

    testCases.forEach((testCase) => {
      const matches = [...testCase.matchAll(patternRegex)]
      expect(matches.length).toBe(1)
      expect(matches[0][2]).toBe('test.key')
    })
  })

  it('不应该匹配无效的格式', () => {
    const testCases = [
      't()',
      't("")',
      't(\'\')',
      'i18nKey:',
      'i18nKey: ""',
      'i18nKey: \'\'',
    ]

    testCases.forEach((testCase) => {
      const matches = [...testCase.matchAll(patternRegex)]
      expect(matches.length).toBe(0)
    })
  })

  it('应该匹配带有空格和换行的 t() 函数调用', () => {
    const testCases = [
      `t(
        'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate'
      )`,
      't(  \'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate\'  )',
      `t(
        'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate',
      )`,
      't(\'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate\',)',
      `t(
        'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate'
        ,
      )`,
      `t(
        'gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate',
        {}
      )`,
    ]

    testCases.forEach((testCase) => {
      const matches = [...testCase.matchAll(patternRegex)]
      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('gmesh.if_the_problem_is_still_not_resolved_btn_contact_the_r_d_department_to_investigate')
    })
  })

  it('应该匹配带有多余逗号的 t() 函数调用', () => {
    const testCases = [
      't(\'gmesh.test\', { foo: \'bar\' },)',
      't(\'gmesh.test\', { foo: \'bar\' },,)',
      `t(
        'gmesh.test',
        { foo: 'bar' }
        ,
        ,
      )`,
      `t(
        'gmesh.test'
        ,
        { foo: 'bar' }
        ,
        ,
        ,
      )`,
    ]

    testCases.forEach((testCase) => {
      const matches = [...testCase.matchAll(patternRegex)]
      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('gmesh.test')
    })
  })
})

describe('extractValidKeys', () => {
  it('应该正确提取有效的 i18n key', () => {
    const keySet = new Set(['test.key', 'gmesh.copy_uuid'])
    const testCases = [
      {
        input: 't("test.key")',
        expected: [{ index: 2, key: 'test.key' }],
      },
      {
        input: 'i18nKey: "test.key"',
        expected: [{ index: 9, key: 'test.key' }],
      },
      {
        input: '{t(\'test.key\')}\n{t(\'gmesh.copy_uuid\')}',
        expected: [
          { index: 3, key: 'test.key' },
          { index: 19, key: 'gmesh.copy_uuid' },
        ],
      },
    ]

    testCases.forEach(({ input, expected }) => {
      const result = extractValidKeys(input, keySet)
      expect(result).toEqual(expected)
    })
  })

  it('应该忽略不在 keySet 中的 key', () => {
    const keySet = new Set(['test.key'])
    const input = 't("invalid.key")\nt("test.key")'
    const result = extractValidKeys(input, keySet)
    expect(result).toEqual([{ index: 19, key: 'test.key' }])
  })

  it('应该正确处理嵌套的 t 函数调用', () => {
    const keySet = new Set([
      'gmesh.outer',
      'gmesh.inner',
    ])
    const input = `t('gmesh.outer', {
      content: t('gmesh.inner')
    })`
    const result = extractValidKeys(input, keySet)
    expect(result).toEqual([
      { index: 2, key: 'gmesh.outer' },
      { index: 36, key: 'gmesh.inner' },
    ])
  })
})
