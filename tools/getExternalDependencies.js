import { readFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'

// Get all dependencies for the vanilla package: dependencies that do not start with "svelte*"
// (for example jsonrepair, lodash-es, ...)
export function getVanillaDependencies() {
  const sveltePackageFolder = getAbsolutePath(import.meta.url, '..', 'package.json')

  const pkg = JSON.parse(String(readFileSync(sveltePackageFolder)))
  return Object.keys(pkg.dependencies).filter((name) => !name.startsWith('svelte'))
}
