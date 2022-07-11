// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { dirname } from './dirname.cjs'
import { getFilesRecursively } from './getFilesRecursively.js'

const vanillaPackageFolder = path.join(dirname, '..', 'package-vanilla')

// collect all file names and generate the exports map for package.json
const exports = {
  '.': './index.js'
}
const filenames = getFilesRecursively(vanillaPackageFolder).concat([
  path.join(vanillaPackageFolder, 'package.json')
])
filenames.forEach((filename) => {
  const relativeFilename =
    './' + path.relative(vanillaPackageFolder, filename).replaceAll('\\', '/')
  exports[relativeFilename] = relativeFilename
})

// generate a package.json
const pkg = JSON.parse(String(readFileSync(path.join(dirname, '..', 'package.json'))))
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
