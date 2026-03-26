import os from 'node:os'
import { describe, expect, it } from 'vitest'
import { expandHome, formatServiceName } from '../lib/utils.mjs'

describe('utils', () => {
  describe('expandHome()', () => {
    it('expands ~ to home directory', () => {
      expect(expandHome('~/projects')).toBe(`${os.homedir()}/projects`)
    })

    it('leaves absolute paths unchanged', () => {
      expect(expandHome('/usr/local')).toBe('/usr/local')
    })

    it('leaves relative paths unchanged', () => {
      expect(expandHome('relative/path')).toBe('relative/path')
    })
  })

  describe('formatServiceName()', () => {
    it('converts slug to title case', () => {
      expect(formatServiceName('my-service')).toBe('My Service')
    })

    it('handles single word', () => {
      expect(formatServiceName('api')).toBe('Api')
    })

    it('handles multiple dashes', () => {
      expect(formatServiceName('my-cool-service')).toBe('My Cool Service')
    })
  })
})
