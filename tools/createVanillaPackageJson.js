// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'
import { generateExports } from './utils/generateExports.mjs'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', 'package-vanilla')

const exports = generateExports(vanillaPackageFolder)

const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))
const types = String(
  readFileSync(getAbsolutePath(import.meta.url, '..', 'package-vanilla', 'index.d.ts'))
)

// scan the index.d.ts bundle file for all occurrences of "import { ...} from '...'" and extract the name
const usedDependencyNames = Array.from(types.matchAll(/(import|export) .+ from '(.+)'/g)).map(
  (match) => match[2]
)
const usedDependencies = usedDependencyNames.reduce((deps, name) => {
  deps[name] = pkg.dependencies[name]
  return deps
}, {})

const vanillaPackage = {
  ...pkg,
  name: 'vanilla-jsoneditor',
  scripts: {},
  dependencies: usedDependencies, // needed for the TypeScript types
  devDependencies: {},
  svelte: undefined,
  exports: {
    ...exports,
    '.': {
      types: './index.d.ts',
      module: './index.js'
    }
  }
}

writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
