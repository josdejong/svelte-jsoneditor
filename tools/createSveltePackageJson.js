// create package.json and copy files like LICENSE.md to package-vanilla

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'

const sveltePackageFolder = getAbsolutePath(import.meta.url, '..', 'package')

// generate a package.json
const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))
const vanillaPackage = {
  ...pkg,
  scripts: {},
  devDependencies: {}
}
writeFileSync(
  path.join(sveltePackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
