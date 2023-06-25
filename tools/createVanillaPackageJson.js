// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'
import { generateExports } from './utils/generateExports.mjs'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', 'package-vanilla')

const exports = generateExports(vanillaPackageFolder)

// generate a package.json
const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))
const vanillaPackage = {
  ...pkg,
  name: '@arextest/vanilla-jsoneditor',
  scripts: {},
  dependencies: {},
  devDependencies: {},
  exports: {
    '.': './index.js',
    ...exports
  }
}
writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
