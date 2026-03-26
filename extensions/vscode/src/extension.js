const vscode = require('node:vscode')
const path = require('node:path')
const fs = require('node:fs')

/**
 * Forgedocs VS Code Extension
 *
 * Features:
 * - Status bar: shows doc health score
 * - Sidebar: lists documentation files with quick navigation
 * - Commands: open ARCHITECTURE.md, check drift, show health
 * - Diagnostics: warns when modified files may need doc updates
 */

let statusBarItem
let healthData = null

function activate(context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspaceRoot) return

  // Status bar — doc health score
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50)
  statusBarItem.command = 'forgedocs.showHealth'
  statusBarItem.tooltip = 'Forgedocs Doc Health Score — click for details'
  context.subscriptions.push(statusBarItem)

  // Initial health check
  updateHealthScore(workspaceRoot)

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('forgedocs.showHealth', () => showHealthPanel(workspaceRoot)),
    vscode.commands.registerCommand('forgedocs.showDrift', () => showDriftPanel(workspaceRoot)),
    vscode.commands.registerCommand('forgedocs.openArchitecture', () => openArchitecture(workspaceRoot)),
    vscode.commands.registerCommand('forgedocs.openInBrowser', () => openInBrowser()),
  )

  // Register tree data providers
  const docsProvider = new DocsTreeProvider(workspaceRoot)
  const healthProvider = new HealthTreeProvider(workspaceRoot)
  vscode.window.registerTreeDataProvider('forgedocs.docs', docsProvider)
  vscode.window.registerTreeDataProvider('forgedocs.health', healthProvider)

  // Watch for file changes that may affect docs
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,ts,py,rs,go,rb,mjs}')
  watcher.onDidCreate(() => checkForDriftWarning(workspaceRoot))
  watcher.onDidDelete(() => checkForDriftWarning(workspaceRoot))
  context.subscriptions.push(watcher)

  // Refresh health when docs change
  const docWatcher = vscode.workspace.createFileSystemWatcher('**/*.md')
  docWatcher.onDidChange(() => {
    updateHealthScore(workspaceRoot)
    healthProvider.refresh()
    docsProvider.refresh()
  })
  context.subscriptions.push(docWatcher)
}

function deactivate() {
  if (statusBarItem) statusBarItem.dispose()
}

// --- Health Score ---

function updateHealthScore(workspaceRoot) {
  const archPath = path.join(workspaceRoot, 'ARCHITECTURE.md')
  if (!fs.existsSync(archPath)) {
    statusBarItem.text = '$(book) No ARCHITECTURE.md'
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
    statusBarItem.show()
    return
  }

  // Calculate a lightweight health score inline (no dependency on lib/)
  let score = 0
  const maxScore = 100

  const checks = [
    ['ARCHITECTURE.md', 15],
    ['README.md', 10],
    ['CLAUDE.md', 5],
    ['docs', 5],
    ['docs/service-map.md', 5],
    ['docs/security.md', 5],
    ['docs/glossary.md', 10],
  ]

  for (const [file, points] of checks) {
    if (fs.existsSync(path.join(workspaceRoot, file))) {
      score += points
    }
  }

  // Check for codemap in ARCHITECTURE.md
  const archContent = fs.readFileSync(archPath, 'utf-8')
  if (/## Codemap/i.test(archContent)) score += 10
  if (/## (Verifiable )?Invariants/i.test(archContent)) score += 10

  // Check features and ADRs
  const featDir = path.join(workspaceRoot, 'docs', 'features')
  if (fs.existsSync(featDir)) {
    const count = fs.readdirSync(featDir).filter((f) => f.endsWith('.md')).length
    if (count > 0) score += 10
  }
  const adrDir = path.join(workspaceRoot, 'docs', 'adr')
  if (fs.existsSync(adrDir)) {
    const count = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md').length
    if (count > 0) score += 10
  }

  score = Math.min(score, maxScore)
  healthData = { score, maxScore }

  const pct = Math.round((score / maxScore) * 100)
  const icon = pct >= 80 ? '$(pass)' : pct >= 60 ? '$(warning)' : '$(error)'
  statusBarItem.text = `${icon} Doc: ${pct}%`

  if (pct >= 80) {
    statusBarItem.backgroundColor = undefined
  } else if (pct >= 60) {
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground')
  } else {
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
  }

  statusBarItem.show()
}

// --- Panels ---

function showHealthPanel(workspaceRoot) {
  const panel = vscode.window.createWebviewPanel('forgedocsHealth', 'Forgedocs Health', vscode.ViewColumn.One)
  updateHealthScore(workspaceRoot)
  const { score, maxScore } = healthData || { score: 0, maxScore: 100 }
  const pct = Math.round((score / maxScore) * 100)

  panel.webview.html = `<!DOCTYPE html>
<html><body style="font-family: sans-serif; padding: 2rem;">
<h1>Doc Health Score: ${pct}%</h1>
<div style="background: #e2e8f0; border-radius: 8px; height: 30px; width: 100%; max-width: 400px;">
  <div style="background: ${pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'}; height: 100%; width: ${pct}%; border-radius: 8px; transition: width 0.3s;"></div>
</div>
<p style="margin-top: 1rem;">Run <code>forgedocs score</code> in the terminal for a detailed breakdown.</p>
<p>Use <code>/doc-init</code> in Claude Code to bootstrap missing documentation.</p>
</body></html>`
}

function showDriftPanel(workspaceRoot) {
  vscode.window.createTerminal({ name: 'Forgedocs Drift', cwd: workspaceRoot })
    .sendText('npx forgedocs diff')
}

function openArchitecture(workspaceRoot) {
  const archPath = path.join(workspaceRoot, 'ARCHITECTURE.md')
  if (fs.existsSync(archPath)) {
    vscode.workspace.openTextDocument(archPath).then(vscode.window.showTextDocument)
  } else {
    vscode.window.showWarningMessage('No ARCHITECTURE.md found. Run `forgedocs quickstart` to create one.')
  }
}

function openInBrowser() {
  vscode.env.openExternal(vscode.Uri.parse('http://localhost:5173'))
}

// --- Drift Warning ---

function checkForDriftWarning(workspaceRoot) {
  const archPath = path.join(workspaceRoot, 'ARCHITECTURE.md')
  if (!fs.existsSync(archPath)) return

  vscode.window.showInformationMessage(
    'Files changed — documentation may need updating.',
    'Check Drift', 'Dismiss',
  ).then((choice) => {
    if (choice === 'Check Drift') {
      vscode.commands.executeCommand('forgedocs.showDrift')
    }
  })
}

// --- Tree Providers ---

class DocsTreeProvider {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event
  }

  refresh() { this._onDidChangeTreeData.fire() }

  getTreeItem(element) { return element }

  getChildren() {
    const items = []
    const docFiles = [
      ['ARCHITECTURE.md', 'System Architecture'],
      ['README.md', 'README'],
      ['CLAUDE.md', 'AI Agent Guide'],
      ['docs/glossary.md', 'Glossary'],
      ['docs/service-map.md', 'Service Map'],
      ['docs/security.md', 'Security'],
    ]

    for (const [file, label] of docFiles) {
      const fullPath = path.join(this.workspaceRoot, file)
      if (fs.existsSync(fullPath)) {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None)
        item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(fullPath)] }
        item.iconPath = new vscode.ThemeIcon('file')
        items.push(item)
      }
    }

    // Features
    const featDir = path.join(this.workspaceRoot, 'docs', 'features')
    if (fs.existsSync(featDir)) {
      for (const f of fs.readdirSync(featDir).filter((f) => f.endsWith('.md'))) {
        const item = new vscode.TreeItem(`Feature: ${f.replace('.md', '')}`, vscode.TreeItemCollapsibleState.None)
        item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(path.join(featDir, f))] }
        item.iconPath = new vscode.ThemeIcon('star')
        items.push(item)
      }
    }

    // ADRs
    const adrDir = path.join(this.workspaceRoot, 'docs', 'adr')
    if (fs.existsSync(adrDir)) {
      for (const f of fs.readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'README.md')) {
        const item = new vscode.TreeItem(`ADR: ${f.replace('.md', '')}`, vscode.TreeItemCollapsibleState.None)
        item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(path.join(adrDir, f))] }
        item.iconPath = new vscode.ThemeIcon('law')
        items.push(item)
      }
    }

    if (items.length === 0) {
      const item = new vscode.TreeItem('No documentation found', vscode.TreeItemCollapsibleState.None)
      item.description = 'Run forgedocs quickstart'
      items.push(item)
    }

    return items
  }
}

class HealthTreeProvider {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event
  }

  refresh() { this._onDidChangeTreeData.fire() }

  getTreeItem(element) { return element }

  getChildren() {
    const items = []
    const checks = [
      ['ARCHITECTURE.md', 'ARCHITECTURE.md', 'pass'],
      ['README.md', 'README.md', 'pass'],
      ['CLAUDE.md', 'CLAUDE.md', 'pass'],
      ['docs', 'docs/ directory', 'pass'],
      ['docs/glossary.md', 'Glossary', 'pass'],
      ['docs/security.md', 'Security', 'pass'],
      ['docs/service-map.md', 'Service Map', 'pass'],
    ]

    for (const [file, label] of checks) {
      const exists = fs.existsSync(path.join(this.workspaceRoot, file))
      const item = new vscode.TreeItem(
        `${exists ? '\u2705' : '\u274C'} ${label}`,
        vscode.TreeItemCollapsibleState.None,
      )
      if (exists) {
        item.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'))
      } else {
        item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'))
      }
      items.push(item)
    }

    return items
  }
}

module.exports = { activate, deactivate }
