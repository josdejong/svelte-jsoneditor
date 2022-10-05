// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './getAbsolutePath.mjs'
import { getFilesRecursively } from './getFilesRecursively.js'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', 'package-vanilla')

// collect all file names and generate the exports map for package.json
const exports = {
  '.': './index.js'
}
const filenames = getFilesRecursively(vanillaPackageFolder).concat([
  path.join(vanillaPackageFolder, 'package.json')
])
filenames.forEach((filename) => {
  const relativeFilename = './' + path.relative(vanillaPackageFolder, filename).replace(/\\/g, '/')
  exports[relativeFilename] = relativeFilename
})

// generate a package.json
const pkg = JSON.parse(String(readFileSync(getAbsolutePath(import.meta.url, '..', 'package.json'))))
const vanillaPackage = {
  ...pkg,
  name: 'vanilla-jsoneditor',
  scripts: {},
  dependencies: {},
  devDependencies: {},
  exports
}
writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
