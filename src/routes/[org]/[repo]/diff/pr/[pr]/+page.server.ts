import { error } from '@sveltejs/kit'
import { exec, resolveRepo, gitShow, smartParse } from '$lib/server/git.js'
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
  baseRefOid: string
  headRefOid: string
  files: PrFile[]
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
      `gh pr view ${prNumber} --repo "${ghRepo}" --json baseRefName,headRefName,baseRefOid,headRefOid,files,title,number`
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

  // Fetch PR ref to ensure commits are available locally (even if head branch was deleted)
  try {
    exec(`git fetch origin "refs/pull/${prNumber}/head" --quiet`, { cwd: repoDir })
  } catch { /* ignore */ }

  // Use immutable commit SHAs instead of branch names —
  // branch names point to wrong content after a PR is merged
  const baseRef = prInfo.baseRefOid
  const headRef = prInfo.headRefOid

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
    baseRef: prInfo.baseRefName,
    headRef: prInfo.headRefName,
    files
  }
}
