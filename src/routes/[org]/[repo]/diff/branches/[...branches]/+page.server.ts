import { error } from '@sveltejs/kit'
import { exec, resolveRepo, gitShow, smartParse } from '$lib/server/git.js'
import type { PageServerLoad } from './$types.js'

export const prerender = false

export const load: PageServerLoad = async ({ params }) => {
  const { org, repo, branches } = params

  // Split on "..." separator (e.g. "main...develop" or "main...feature/foo")
  const sepIndex = branches.indexOf('...')
  if (sepIndex === -1) {
    error(400, 'Invalid format. Use: /diff/branches/{from}...{to}')
  }

  const fromBranch = branches.slice(0, sepIndex)
  const toBranch = branches.slice(sepIndex + 3)

  if (!fromBranch || !toBranch) {
    error(400, 'Both from and to branches are required')
  }

  // Resolve or clone the repo
  let repoDir: string
  try {
    repoDir = resolveRepo(org, repo)
  } catch (e) {
    error(500, `Could not resolve repo ${org}/${repo}: ${e}`)
  }

  // Fetch both branches
  try {
    exec(`git fetch origin "${fromBranch}" --quiet`, { cwd: repoDir })
  } catch { /* ignore */ }
  try {
    exec(`git fetch origin "${toBranch}" --quiet`, { cwd: repoDir })
  } catch { /* ignore */ }

  const fromRef = `origin/${fromBranch}`
  const toRef = `origin/${toBranch}`

  // Get list of changed files between the two refs
  let changedFiles: string[]
  try {
    const output = exec(`git diff --name-only "${fromRef}" "${toRef}"`, { cwd: repoDir })
    changedFiles = output ? output.split('\n').filter(Boolean) : []
  } catch (e) {
    error(500, `Failed to diff branches: ${e}`)
  }

  // Process changed files
  const files: Array<{ path: string; key: string; baseJson: unknown; headJson: unknown }> = []

  for (const filePath of changedFiles) {
    const baseContent = gitShow(repoDir, fromRef, filePath)
    const headContent = gitShow(repoDir, toRef, filePath)

    const baseJson = baseContent ? smartParse(baseContent) : null
    const headJson = headContent ? smartParse(headContent) : null

    // Skip files that aren't parseable on either side
    if (baseJson === null && headJson === null) continue

    files.push({
      path: filePath,
      key: filePath.replace(/\//g, '_'),
      baseJson: baseJson ?? {},
      headJson: headJson ?? {}
    })
  }

  return {
    fromBranch,
    toBranch,
    baseRef: fromRef,
    headRef: toRef,
    files
  }
}
