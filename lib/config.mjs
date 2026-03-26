import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/** Load user config from docsite.config.mjs, merged with defaults */
export async function loadConfig(root) {
  const defaults = {
    title: 'Forgedocs',
    description: 'Architecture documentation for your services',
    github: '',
    scanDirs: ['~/working', '~/projects', '~/code', '~/src', '~/dev'],
    nestedDirs: ['apis', 'packages', 'services', 'apps', 'modules'],
    maxDepth: 3,
    extraExcludes: [],
    plugins: [],
  }

  const configPath = path.join(root, 'docsite.config.mjs')
  if (fs.existsSync(configPath)) {
    try {
      const userConfig = (await import(`file://${configPath}`)).default
      return { ...defaults, ...userConfig }
    } catch (err) {
      console.error(`Warning: Could not load docsite.config.mjs: ${err.message}`)
    }
  }

  return defaults
}

/** Load .repos.json — returns the repo map or throws if invalid */
export function loadReposConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const repos = JSON.parse(raw)
    if (typeof repos !== 'object' || repos === null || Array.isArray(repos)) {
      throw new Error('.repos.json must be a JSON object mapping repo names to paths')
    }
    for (const [name, repoPath] of Object.entries(repos)) {
      if (typeof repoPath !== 'string') {
        throw new Error(`.repos.json: value for "${name}" must be a string path`)
      }
    }
    return repos
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`.repos.json is not valid JSON: ${err.message}`)
    }
    throw err
  }
}

/** Save repos config to .repos.json */
export function saveReposConfig(configPath, repos) {
  fs.writeFileSync(configPath, `${JSON.stringify(repos, null, 2)}\n`)
  debug(`Saved ${Object.keys(repos).length} repos to ${configPath}`)
}
