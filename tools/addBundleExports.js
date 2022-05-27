import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

export function addBundleExports(packageFolder, file, sourcemapFile, definitionsFile) {
  const pkgFile = path.join(packageFolder, 'package.json')

  const distPkg = JSON.parse(String(readFileSync(pkgFile)))
  const relativeFile = normalizePath(packageFolder, file)
  const relativeSourcemapFile = normalizePath(packageFolder, sourcemapFile)
  const relativeDefinitionsFile = normalizePath(packageFolder, definitionsFile)

  console.info('add bundle exports', {
    relativeFile,
    relativeSourcemapFile,
    relativeDefinitionsFile
  })

  const updatedDistPkg = {
    ...distPkg,
    exports: {
      ...distPkg.exports,
      [relativeFile]: relativeFile,
      [relativeSourcemapFile]: relativeSourcemapFile,
      [relativeDefinitionsFile]: relativeDefinitionsFile
    }
  }

  writeFileSync(pkgFile, JSON.stringify(updatedDistPkg, null, 2))
}

function normalizePath(packageFolder, file) {
  return './' + path.normalize(path.relative(packageFolder, file)).replace('\\', '/')
}
