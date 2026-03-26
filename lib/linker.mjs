import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/** Check if symlinks are supported (Windows without admin may not support them) */
export function symlinkSupported(root) {
  const testLink = path.join(root, '.symlink-test')
  try {
    fs.symlinkSync(root, testLink)
    fs.unlinkSync(testLink)
    return true
  } catch {
    return false
  }
}

/** Copy only markdown files and docs/ directory (fallback for no-symlink environments) */
export function copyMarkdownFiles(source, dest) {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory() && entry.name === 'docs') {
      fs.cpSync(srcPath, destPath, { recursive: true })
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Link repos into a content/ directory.
 * Uses symlinks when available, falls back to directory junctions (Windows)
 * or copy for environments where symlinks aren't supported.
 */
export function linkRepos(repos, contentDir, root) {
  if (fs.existsSync(contentDir)) {
    fs.rmSync(contentDir, { recursive: true })
  }
  fs.mkdirSync(contentDir, { recursive: true })

  const useSymlinks = symlinkSupported(root)
  debug(`Symlink support: ${useSymlinks}`)

  for (const [name, repoPath] of Object.entries(repos)) {
    const linkPath = path.join(contentDir, name)

    // Guard against circular symlinks: ensure the target doesn't point back into contentDir
    try {
      const resolvedTarget = fs.realpathSync(repoPath)
      const resolvedContent = fs.realpathSync(contentDir)
      if (resolvedTarget.startsWith(`${resolvedContent}${path.sep}`) || resolvedTarget === resolvedContent) {
        console.error(`  Skipped ${name}: target path is inside content/ (circular symlink)`)
        continue
      }
    } catch {
      // realpathSync can fail if path doesn't exist yet — proceed with caution
    }

    try {
      if (useSymlinks) {
        fs.symlinkSync(repoPath, linkPath)
      } else if (process.platform === 'win32') {
        fs.symlinkSync(repoPath, linkPath, 'junction')
      } else {
        copyMarkdownFiles(repoPath, linkPath)
      }
      console.log(`  ${name} -> ${repoPath}${useSymlinks ? '' : ' (copied)'}`)
    } catch (err) {
      console.error(`  Failed to link ${name}: ${err.message}`)
    }
  }
}
