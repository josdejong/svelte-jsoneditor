import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@sveltejs/kit'
import { parseHsetFile } from '$lib/logic/hsetParser.js'
import type { PageServerLoad } from './$types.js'

export const prerender = false

interface PrFile {
  path: string
  additions: number
  deletions: number
}

interface PrInfo {
  number: number
  title: string
  baseRefName: string
  headRefName: string
  files: PrFile[]
}

function exec(cmd: string, options?: { cwd?: string }): string {
  return execSync(cmd, { ...options, stdio: 'pipe', encoding: 'utf-8', timeout: 60000 }).trim()
}

/**
 * Resolve or clone the repo locally.
 * Checks common worktree locations first, falls back to a cached shallow clone.
 */
function resolveRepo(org: string, repo: string): string {
  const cwd = process.cwd()
  const home = process.env.HOME ?? ''

  // Check common local worktree locations (siblings of this project)
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

  // No local clone found — create a cached shallow clone
  const cacheDir = resolve(tmpdir(), 'jsonator-repos', `${org}_${repo}`)
  if (existsSync(resolve(cacheDir, '.git'))) {
    // Already cloned — just fetch
    try {
      exec('git fetch origin --quiet', { cwd: cacheDir })
    } catch { /* ignore fetch errors */ }
    return cacheDir
  }

  mkdirSync(resolve(tmpdir(), 'jsonator-repos'), { recursive: true })
  exec(`gh repo clone "${org}/${repo}" "${cacheDir}" -- --bare --quiet`)
  return cacheDir
}

function gitShow(repoDir: string, ref: string, filepath: string): string | null {
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
function smartParse(content: string): unknown | null {
  // Try plain JSON first
  try {
    return JSON.parse(content)
  } catch {
    // not JSON
  }

  // Try hset/set Redis format
  const parsed = parseHsetFile(content)
  if (Object.keys(parsed).length > 0) {
    return parsed
  }

  return null
}

export const load: PageServerLoad = async ({ params }) => {
  const { org, repo, pr } = params
  const ghRepo = `${org}/${repo}`
  const prNumber = parseInt(pr, 10)

  if (isNaN(prNumber)) {
    error(400, `Invalid PR number: ${pr}`)
  }

  // Fetch PR info from GitHub
  let prInfo: PrInfo
  try {
    const raw = exec(
      `gh pr view ${prNumber} --repo "${ghRepo}" --json baseRefName,headRefName,files,title,number`
    )
    prInfo = JSON.parse(raw)
  } catch (e) {
    error(502, `Failed to fetch PR #${prNumber} from ${ghRepo}: ${e}`)
  }

  // Resolve or clone the repo
  let repoDir: string
  try {
    repoDir = resolveRepo(org, repo)
  } catch (e) {
    error(500, `Could not resolve repo ${ghRepo}: ${e}`)
  }

  // Fetch remote refs
  try {
    exec(`git fetch origin "${prInfo.baseRefName}" --quiet`, { cwd: repoDir })
  } catch { /* ignore */ }
  try {
    exec(`git fetch origin "${prInfo.headRefName}" --quiet`, { cwd: repoDir })
  } catch { /* ignore */ }

  const baseRef = `origin/${prInfo.baseRefName}`
  const headRef = `origin/${prInfo.headRefName}`

  // Process ALL changed files — smart parse determines if they're JSON-parseable
  const files: Array<{ path: string; key: string; baseJson: unknown; headJson: unknown }> = []

  for (const f of prInfo.files) {
    const baseContent = gitShow(repoDir, baseRef, f.path)
    const headContent = gitShow(repoDir, headRef, f.path)

    const baseJson = baseContent ? smartParse(baseContent) : null
    const headJson = headContent ? smartParse(headContent) : null

    // Skip files that aren't JSON-parseable on either side
    if (baseJson === null && headJson === null) continue

    files.push({
      path: f.path,
      key: f.path.replace(/\//g, '_'),
      baseJson: baseJson ?? {},
      headJson: headJson ?? {}
    })
  }

  return {
    prNumber: prInfo.number,
    prTitle: prInfo.title,
    baseRef,
    headRef,
    files
  }
}
