import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { parseHsetFile } from '$lib/logic/hsetParser.js'

export function exec(cmd: string, options?: { cwd?: string }): string {
  return execSync(cmd, { ...options, stdio: 'pipe', encoding: 'utf-8', timeout: 60000 }).trim()
}

/**
 * Resolve or clone the repo locally.
 * Checks common worktree locations first, falls back to a cached shallow clone.
 */
export function resolveRepo(org: string, repo: string): string {
  const cwd = process.cwd()

  const candidates = [
    resolve(cwd, `../${repo}/main`),
    resolve(cwd, `../${repo}`)
  ]

  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    try {
      execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe' })
      return dir
    } catch {
      // not a git repo
    }
  }

  const cacheDir = resolve(tmpdir(), 'jsonator-repos', `${org}_${repo}`)

  try {
    execSync('git rev-parse --git-dir', { cwd: cacheDir, stdio: 'pipe' })
    try {
      exec('git fetch origin --quiet', { cwd: cacheDir })
    } catch { /* ignore fetch errors */ }
    return cacheDir
  } catch {
    // Not a valid repo — remove stale dir and re-clone
  }

  if (existsSync(cacheDir)) {
    execSync(`rm -rf "${cacheDir}"`)
  }

  mkdirSync(resolve(tmpdir(), 'jsonator-repos'), { recursive: true })
  exec(`gh repo clone "${org}/${repo}" "${cacheDir}" -- --quiet`)
  return cacheDir
}

export function gitShow(repoDir: string, ref: string, filepath: string): string | null {
  try {
    return exec(`git show "${ref}:${filepath}"`, { cwd: repoDir })
  } catch {
    return null
  }
}

/**
 * Try to parse file content as JSON. If it fails, try the hset/set parser.
 * Returns the parsed object, or null if unparseable.
 */
export function smartParse(content: string): unknown | null {
  try {
    return JSON.parse(content)
  } catch {
    // not JSON
  }

  const parsed = parseHsetFile(content)
  if (Object.keys(parsed).length > 0) {
    return parsed
  }

  return null
}
