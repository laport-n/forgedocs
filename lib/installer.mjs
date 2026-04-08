import fs from 'node:fs'
import path from 'node:path'

/**
 * Install files from a source directory into a target directory.
 * Returns { installed, updated, skipped } arrays of labels.
 */
export function installTemplates(templatesDir, targetRepo, { force = false, dryRun = false } = {}) {
  const installed = []
  const skipped = []
  const updated = []

  function installFile(sourcePath, targetPath, label) {
    if (fs.existsSync(targetPath) && !force) {
      skipped.push(`${label} (already exists)`)
      return
    }

    const wasExisting = fs.existsSync(targetPath)
    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.copyFileSync(sourcePath, targetPath)
    }

    if (wasExisting && force) {
      updated.push(label)
    } else {
      installed.push(label)
    }
  }

  // Install commands
  const commandsSource = path.join(templatesDir, 'claude-commands')
  const commandsTarget = path.join(targetRepo, '.claude', 'commands')

  for (const file of fs.readdirSync(commandsSource)) {
    if (!file.endsWith('.md')) continue
    installFile(path.join(commandsSource, file), path.join(commandsTarget, file), `.claude/commands/${file}`)
  }

  // Install skills
  const skillsSource = path.join(templatesDir, 'claude-skills')
  for (const skillDir of fs.readdirSync(skillsSource)) {
    const sourceDir = path.join(skillsSource, skillDir)
    if (!fs.statSync(sourceDir).isDirectory()) continue

    installFile(
      path.join(sourceDir, 'SKILL.md'),
      path.join(targetRepo, '.claude', 'skills', skillDir, 'SKILL.md'),
      `.claude/skills/${skillDir}/SKILL.md`,
    )
  }

  // Install CI workflows
  const workflowsSource = path.join(templatesDir, 'github-workflows')
  if (fs.existsSync(workflowsSource)) {
    for (const file of fs.readdirSync(workflowsSource)) {
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue
      installFile(
        path.join(workflowsSource, file),
        path.join(targetRepo, '.github', 'workflows', file),
        `.github/workflows/${file}`,
      )
    }
  }

  // Install PR template (append doc checklist if template exists, create if not)
  const prTemplatePath = path.join(targetRepo, '.github', 'PULL_REQUEST_TEMPLATE.md')
  const prTemplateSource = path.join(templatesDir, 'github-pr-template.md')
  if (fs.existsSync(prTemplateSource)) {
    if (fs.existsSync(prTemplatePath)) {
      const existing = fs.readFileSync(prTemplatePath, 'utf-8')
      if (!existing.includes('ARCHITECTURE.md') && !existing.includes('docs/adr/')) {
        if (!dryRun) {
          const checklist = fs.readFileSync(prTemplateSource, 'utf-8')
          fs.writeFileSync(prTemplatePath, `${existing.trimEnd()}\n\n${checklist}`)
        }
        updated.push('.github/PULL_REQUEST_TEMPLATE.md (added doc checklist)')
      } else {
        skipped.push('.github/PULL_REQUEST_TEMPLATE.md (doc checklist already present)')
      }
    } else {
      installFile(prTemplateSource, prTemplatePath, '.github/PULL_REQUEST_TEMPLATE.md')
    }
  }

  // Install hooks
  const hooksSource = path.join(templatesDir, 'claude-hooks')
  if (fs.existsSync(hooksSource)) {
    for (const file of fs.readdirSync(hooksSource)) {
      const targetPath = path.join(targetRepo, '.claude', 'hooks', file)
      installFile(path.join(hooksSource, file), targetPath, `.claude/hooks/${file}`)
      // Make hook scripts executable
      if (file.endsWith('.sh') && !dryRun) {
        try {
          fs.chmodSync(targetPath, 0o755)
        } catch {
          /* ignore on Windows */
        }
      }
    }
  }

  // Configure MCP server and hooks in .claude/settings.json
  const settingsPath = path.join(targetRepo, '.claude', 'settings.json')
  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      /* start fresh if corrupt */
    }
  }

  let settingsChanged = false

  if (!settings.mcpServers?.forgedocs) {
    settings.mcpServers = settings.mcpServers || {}
    settings.mcpServers.forgedocs = {
      command: 'npx',
      args: ['forgedocs', 'mcp'],
      description: 'Documentation tools — search, health scores, drift detection, codemap, and update suggestions',
    }
    settingsChanged = true
    installed.push('.claude/settings.json (MCP server)')
  } else {
    skipped.push('.claude/settings.json (MCP already configured)')
  }

  // Migrate: remove legacy post-commit audit hook if present
  if (settings.hooks?.PostToolUse) {
    const before = settings.hooks.PostToolUse.length
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
      (h) => !h.hooks?.some((hook) => hook.command?.includes('post-commit-audit')),
    )
    if (settings.hooks.PostToolUse.length < before) {
      settingsChanged = true
    }
    if (settings.hooks.PostToolUse.length === 0) {
      delete settings.hooks.PostToolUse
    }
  }

  // Configure post-push doc check hook
  const pushHookPath = path.join('.claude', 'hooks', 'post-push-doc-check.sh')
  const hasPostPushHook = settings.hooks?.PostToolUse?.some((h) =>
    h.hooks?.some((hook) => hook.command?.includes('post-push-doc-check')),
  )
  if (!hasPostPushHook) {
    settings.hooks = settings.hooks || {}
    settings.hooks.PostToolUse = settings.hooks.PostToolUse || []

    // Merge into existing Bash matcher if one exists, otherwise create a new one
    let bashMatcher = settings.hooks.PostToolUse.find((h) => h.matcher === 'Bash')
    if (!bashMatcher) {
      bashMatcher = { matcher: 'Bash', hooks: [] }
      settings.hooks.PostToolUse.push(bashMatcher)
    }
    bashMatcher.hooks.push({
      type: 'command',
      command: `bash "${pushHookPath}"`,
      timeout: 30,
    })

    settingsChanged = true
    installed.push('.claude/settings.json (post-push doc check hook)')
  } else {
    skipped.push('.claude/settings.json (post-push hook already configured)')
  }

  if (settingsChanged && !dryRun) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
  }

  // Append documentation maintenance section to CLAUDE.md if it exists
  const claudeMdPath = path.join(targetRepo, 'CLAUDE.md')
  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf-8')
    if (!existing.includes('Documentation maintenance')) {
      if (!dryRun) {
        const section = [
          '',
          '## Documentation maintenance',
          '- After pushing code, check for documentation drift by running `/doc-sync`',
          '- If structural changes were made (new modules, renamed files, new CLI commands), update ARCHITECTURE.md codemap',
          '- Run `/doc-review` quarterly or after major refactors to audit all documentation',
          '',
        ].join('\n')
        fs.writeFileSync(claudeMdPath, `${existing.trimEnd()}\n${section}`)
      }
      updated.push('CLAUDE.md (added documentation maintenance section)')
    } else {
      skipped.push('CLAUDE.md (documentation maintenance section already present)')
    }
  }

  return { installed, updated, skipped }
}
