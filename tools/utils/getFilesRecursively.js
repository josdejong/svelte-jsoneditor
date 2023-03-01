import fs from 'fs'
import path from 'path'

/**
 * source: https://coderrocketfuel.com/article/recursively-list-all-the-files-in-a-directory-using-node-js
 * @param {string} dirPath
 * @returns {string[]}
 */
export function getFilesRecursively(dirPath) {
  let filenames = []

  fs.readdirSync(dirPath).forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      const nestedFiles = getFilesRecursively(dirPath + '/' + file)
      filenames = filenames.concat(nestedFiles)
    } else {
      filenames.push(path.join(dirPath, '/', file))
    }
  })

  return filenames
}
