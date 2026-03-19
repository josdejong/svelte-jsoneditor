import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
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

function findMetadataRepo(): string | null {
  const cwd = process.cwd()
  const candidates = [
    resolve(cwd, '../metadata-scripts/main'),
    resolve(cwd, '../metadata-scripts'),
    resolve(process.env.HOME ?? '', 'Work/boddle-projects/metadata-scripts/main')
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
  return null
}

function exec(cmd: string, options?: { cwd?: string }): string {
  return execSync(cmd, { ...options, stdio: 'pipe', encoding: 'utf-8', timeout: 30000 }).trim()
}

function gitShow(repoDir: string, ref: string, filepath: string): string | null {
  try {
    return exec(`git show "${ref}:${filepath}"`, { cwd: repoDir })
  } catch {
    return null
  }
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

  // Find the metadata-scripts repo
  const metadataRepo = findMetadataRepo()
  if (!metadataRepo) {
    error(500, 'Could not find metadata-scripts git repo')
  }

  // Fetch remote refs
  try {
    exec(`git fetch origin "${prInfo.baseRefName}" --quiet`, { cwd: metadataRepo })
  } catch { /* ignore */ }
  try {
    exec(`git fetch origin "${prInfo.headRefName}" --quiet`, { cwd: metadataRepo })
  } catch { /* ignore */ }

  const baseRef = `origin/${prInfo.baseRefName}`
  const headRef = `origin/${prInfo.headRefName}`

  // Get changed script files
  const scriptFiles = prInfo.files.filter((f) => f.path.startsWith('scripts/'))

  // Parse each file
  const files = scriptFiles.map((f) => {
    const baseContent = gitShow(metadataRepo, baseRef, f.path)
    const headContent = gitShow(metadataRepo, headRef, f.path)

    const baseJson = baseContent ? parseHsetFile(baseContent) : {}
    const headJson = headContent ? parseHsetFile(headContent) : {}

    return {
      path: f.path,
      key: f.path.replace(/\//g, '_'),
      baseJson,
      headJson
    }
  })

  return {
    prNumber: prInfo.number,
    prTitle: prInfo.title,
    baseRef,
    headRef,
    files
  }
}
