// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from './dirname.cjs'
import { getFilesRecursively } from './getFilesRecursively.js'

const outputFolder = path.join(dirname, '..', 'package-vanilla')

// copy markdown files
const copyFilenames = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'SECURITY.md']
copyFilenames.forEach((filename) => {
  copyFileSync(path.join(dirname, '..', filename), path.join(outputFolder, filename))
})

// collect all file names and generate the exports map for package.json
const exports = {
  '.': './index.js'
}
const filenames = getFilesRecursively(outputFolder).concat([
  path.join(outputFolder, 'package.json')
])
filenames.forEach((filename) => {
  const relativeFilename = './' + path.relative(outputFolder, filename).replaceAll('\\', '/')
  exports[relativeFilename] = relativeFilename
})

// generate a package.json
const pkg = JSON.parse(String(readFileSync(path.join(dirname, '..', 'package.json'))))
const vanillaPackage = {
  ...pkg,
  name: 'vanilla-jsoneditor',
  scripts: undefined,
  exports
}
writeFileSync(path.join(outputFolder, 'package.json'), JSON.stringify(vanillaPackage, null, 2))
