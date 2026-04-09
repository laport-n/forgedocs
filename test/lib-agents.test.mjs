import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { agents, detectAgents, findInstructionFiles, registerMcp, resolveAgents } from '../lib/agents.mjs'

describe('agents', () => {
  let tmpDir

  beforeAll(() => {
    tmpDir = path.join(os.tmpdir(), `forgedocs-test-agents-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('agents registry', () => {
    it('has 5 agents defined', () => {
      expect(Object.keys(agents)).toHaveLength(5)
    })

    it('every agent has required fields', () => {
      for (const agent of Object.values(agents)) {
        expect(agent.name).toBeDefined()
        expect(agent.instructionFile).toBeDefined()
        expect(agent.supports).toBeDefined()
        expect(typeof agent.supports.mcp).toBe('boolean')
      }
    })
  })

  describe('detectAgents', () => {
    it('returns empty array for bare directory', () => {
      expect(detectAgents(tmpDir)).toEqual([])
    })

    it('detects claude when .claude/ exists', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true })
      expect(detectAgents(tmpDir)).toContain('claude')
    })

    it('detects cursor when .cursor/ exists', () => {
      fs.mkdirSync(path.join(tmpDir, '.cursor'), { recursive: true })
      expect(detectAgents(tmpDir)).toContain('cursor')
    })

    it('detects windsurf when .windsurfrules exists', () => {
      fs.writeFileSync(path.join(tmpDir, '.windsurfrules'), '# rules')
      expect(detectAgents(tmpDir)).toContain('windsurf')
    })

    it('detects copilot when copilot-instructions.md exists', () => {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true })
      fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '# instructions')
      expect(detectAgents(tmpDir)).toContain('copilot')
    })

    it('detects cline when .clinerules exists', () => {
      fs.writeFileSync(path.join(tmpDir, '.clinerules'), '# rules')
      expect(detectAgents(tmpDir)).toContain('cline')
    })
  })

  describe('resolveAgents', () => {
    it('returns detected agents for "auto"', () => {
      const result = resolveAgents('auto', tmpDir)
      expect(result.length).toBeGreaterThan(0)
    })

    it('defaults to claude when no agents detected', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir, { recursive: true })
      expect(resolveAgents('auto', emptyDir)).toEqual(['claude'])
    })

    it('returns all agents for "all"', () => {
      expect(resolveAgents('all', tmpDir)).toEqual(Object.keys(agents))
    })

    it('parses comma-separated list', () => {
      expect(resolveAgents('claude,cursor', tmpDir)).toEqual(['claude', 'cursor'])
    })

    it('throws for unknown agent', () => {
      expect(() => resolveAgents('unknown', tmpDir)).toThrow('Unknown agent')
    })
  })

  describe('findInstructionFiles', () => {
    it('finds CLAUDE.md', () => {
      const dir = path.join(tmpDir, 'find-test')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# test')
      const { found, files } = findInstructionFiles(dir)
      expect(found).toBe(true)
      expect(files).toContain('CLAUDE.md')
    })

    it('returns found=false for empty dir', () => {
      const dir = path.join(tmpDir, 'find-empty')
      fs.mkdirSync(dir, { recursive: true })
      expect(findInstructionFiles(dir).found).toBe(false)
    })
  })

  describe('registerMcp', () => {
    it('registers MCP in cursor format', () => {
      const dir = path.join(tmpDir, 'mcp-cursor')
      fs.mkdirSync(dir, { recursive: true })
      const result = registerMcp('cursor', dir)
      expect(result.registered).toBe(true)

      const config = JSON.parse(fs.readFileSync(path.join(dir, '.cursor', 'mcp.json'), 'utf-8'))
      expect(config.mcpServers.forgedocs).toBeDefined()
      expect(config.mcpServers.forgedocs.command).toBe('npx')
    })

    it('skips if already configured', () => {
      const dir = path.join(tmpDir, 'mcp-cursor')
      const result = registerMcp('cursor', dir)
      expect(result.registered).toBe(false)
      expect(result.reason).toBe('already configured')
    })

    it('returns no MCP support for copilot', () => {
      const result = registerMcp('copilot', tmpDir)
      expect(result.registered).toBe(false)
      expect(result.reason).toBe('no MCP support')
    })
  })
})
