// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import assert from 'assert'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'
import { generateExports } from './utils/generateExports.mjs'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', 'package-vanilla')

const exports = generateExports(vanillaPackageFolder)

const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))
const typesPath = getAbsolutePath(import.meta.url, '..', 'package-vanilla', 'index.d.ts')
const types = String(readFileSync(typesPath))

// scan the index.d.ts bundle file for all occurrences of "import { ...} from '...'" and extract the name
const usedDependencyNames = uniq(
  Array.from(types.matchAll(/(import|export) .+ from '(.+)'/g))
    .map((match) => match[2])
    .sort()
)
const expectedDependencyNames = [
  '@fortawesome/free-solid-svg-icons',
  'ajv',
  'immutable-json-patch',
  'svelte'
]

// We do not want to get surprises
assert.deepStrictEqual(
  usedDependencyNames,
  expectedDependencyNames,
  `Used dependencies found in "${typesPath}" does not equal the expected dependencies. ` +
    'Please update the list in createVanillaPackageJson.js manually.'
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
  exports: './index.js'
}

writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)

function uniq(array) {
  return [...new Set(array)]
}
