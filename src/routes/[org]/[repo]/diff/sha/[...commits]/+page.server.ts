import { error } from '@sveltejs/kit'
import { exec, resolveRepo, gitShow, smartParse } from '$lib/server/git.js'
import type { PageServerLoad } from './$types.js'

export const prerender = false

export const load: PageServerLoad = async ({ params }) => {
  const { org, repo, commits } = params

  // Split on "..." separator (e.g. "abc123...def456")
  const sepIndex = commits.indexOf('...')
  if (sepIndex === -1) {
    error(400, 'Invalid format. Use: /diff/sha/{from_sha}...{to_sha}')
  }

  const fromSha = commits.slice(0, sepIndex)
  const toSha = commits.slice(sepIndex + 3)

  if (!fromSha || !toSha) {
    error(400, 'Both from and to commit SHAs are required')
  }

  // Resolve or clone the repo
  let repoDir: string
  try {
    repoDir = resolveRepo(org, repo)
  } catch (e) {
    error(500, `Could not resolve repo ${org}/${repo}: ${e}`)
  }

  // Fetch latest so we have the commits locally
  try {
    exec('git fetch origin --quiet', { cwd: repoDir })
  } catch { /* ignore */ }

  // Verify both commits exist
  for (const sha of [fromSha, toSha]) {
    try {
      exec(`git cat-file -t "${sha}"`, { cwd: repoDir })
    } catch {
      error(404, `Commit not found: ${sha}`)
    }
  }

  // Get short SHAs for display
  const fromShort = exec(`git rev-parse --short "${fromSha}"`, { cwd: repoDir })
  const toShort = exec(`git rev-parse --short "${toSha}"`, { cwd: repoDir })

  // Get list of changed files between the two commits
  let changedFiles: string[]
  try {
    const output = exec(`git diff --name-only "${fromSha}" "${toSha}"`, { cwd: repoDir })
    changedFiles = output ? output.split('\n').filter(Boolean) : []
  } catch (e) {
    error(500, `Failed to diff commits: ${e}`)
  }

  // Process changed files
  const files: Array<{ path: string; key: string; baseJson: unknown; headJson: unknown }> = []

  for (const filePath of changedFiles) {
    const baseContent = gitShow(repoDir, fromSha, filePath)
    const headContent = gitShow(repoDir, toSha, filePath)

    const baseJson = baseContent ? smartParse(baseContent) : null
    const headJson = headContent ? smartParse(headContent) : null

    if (baseJson === null && headJson === null) continue

    files.push({
      path: filePath,
      key: filePath.replace(/\//g, '_'),
      baseJson: baseJson ?? {},
      headJson: headJson ?? {}
    })
  }

  return {
    fromSha,
    toSha,
    fromShort,
    toShort,
    files
  }
}
