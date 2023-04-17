import path from 'path'
import { getFilesRecursively } from './getFilesRecursively.js'

export function generateExports(folder) {
  // collect all file names and generate the exports map for package.json
  const exports = {
    '.': './index.js'
  }
  const filenames = getFilesRecursively(folder).concat([path.join(folder, 'package.json')])
  filenames.forEach((filename) => {
    const relativeFilename = './' + path.relative(folder, filename).replace(/\\/g, '/')
    exports[relativeFilename] = relativeFilename
  })

  return exports
}
