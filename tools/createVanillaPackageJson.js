// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'
import { getVanillaDependencies } from './getExternalDependencies.js'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', 'package-vanilla')

const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))

// We move peerDependencies to dependencies to make the package standalone.
// This is necessary for the "svelte" dependency, which is needed to export the TypeScript types
const usedDependencyNames = [
  ...getVanillaDependencies(),
  ...Object.keys(pkg.peerDependencies)
].sort()

const usedDependencies = usedDependencyNames.reduce((deps, name) => {
  deps[name] = pkg.dependencies[name] || pkg.peerDependencies[name]
  return deps
}, {})

const vanillaPackage = {
  ...pkg,
  name: 'vanilla-jsoneditor',
  scripts: {},
  dependencies: usedDependencies,
  peerDependencies: {}, // all peer dependencies are moved to dependencies
  devDependencies: {},
  svelte: undefined,
  browser: './standalone.js',
  exports: {
    ...pkg.exports,
    '.': './index.js', // we don't create an object here, see https://github.com/josdejong/svelte-jsoneditor/issues/334
    './index.js.map': './index.js.map',
    './standalone.js': './standalone.js',
    './standalone.js.map': './standalone.js.map',
    './standalone.d.ts': './standalone.d.ts'
  }
}

writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
