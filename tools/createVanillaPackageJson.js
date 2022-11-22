// create package.json and copy files like LICENSE.md to package-vanilla

import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './getAbsolutePath.mjs'
import { getFilesRecursively } from './getFilesRecursively.js'
import {
  packageFolder,
  name,
  moduleFile as module,
  umdFile as main
} from '../rollup.config.bundle.js'

const vanillaPackageFolder = getAbsolutePath(import.meta.url, '..', packageFolder)

// collect all file names and generate the exports map for package.json
const exports = {
  '.': {
    browser: {
      import: './' + module,
      require: './' + main
    },
    import: './' + module,
    require: './' + main
  }
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
  module,
  main,
  name,
  scripts: {},
  dependencies: {},
  devDependencies: {},
  exports
}
writeFileSync(
  path.join(vanillaPackageFolder, 'package.json'),
  JSON.stringify(vanillaPackage, null, 2)
)
