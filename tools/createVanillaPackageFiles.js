// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { dirname } from './dirname.cjs'

const outputFolder = path.join(dirname, '..', 'package-vanilla')

// FIXME: first clear the outputFolder
// mkdirSync(outputFolder)

// copy markdown files
const copyFilenames = ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'SECURITY.md']
copyFilenames.forEach((filename) => {
  copyFileSync(path.join(dirname, '..', filename), path.join(outputFolder, filename))
})

// TODO: create a different README.md explaining what vanilla-jsoneditor is

// collect all file names
const exports = {}
const filenames = readdirSync(outputFolder).concat(['package.json'])
filenames.forEach((filename) => {
  const relativeFilename = './' + filename
  exports[relativeFilename] = relativeFilename
})

// generate a package.json
const pkg = JSON.parse(String(readFileSync(path.join(dirname, '..', 'package.json'))))
const vanillaPackage = {
  ...pkg,
  name: 'vanilla-jsoneditor',
  module: 'jsoneditor.js',
  main: 'jsoneditor.js',
  types: 'jsoneditor.d.ts',
  scripts: undefined,
  exports
}
writeFileSync(path.join(outputFolder, 'package.json'), JSON.stringify(vanillaPackage, null, 2))
