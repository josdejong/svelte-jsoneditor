/**
 * This script validates whether all imports from @fortawesome
 * use /index.es. This is a workaround to make sure the ES version
 * is used when building using svelte-kit.
 *
 * For reference:
 * https://github.com/Cweili/svelte-fa#work-with-sveltekitvite
 * https://github.com/josdejong/svelte-jsoneditor/issues/107
 */

import fs from 'fs'
import path from 'path'
import { dirname } from './dirname.cjs'

const extensions = ['.js', '.ts', '.svelte']

const valid = run()
if (!valid) {
  process.exit(1) // no success
}

/**
 * @returns {boolean} Returns true if successful, false when there are issues
 */
function run() {
  const filenames = getAllFiles(path.join(dirname, '../src')).filter((file) =>
    hasExtensionOf(file, extensions)
  )

  const issues = collectIssues(filenames)

  if (issues.length > 0) {
    issues.forEach((issue) => {
      console.error(
        `Error: file ${issue.filename} has an @fortawesome import that does not` +
          ` explicitly uses the ES import ending with /index.es: \n` +
          issue.lines
            .map((line) => {
              return `    line ${line.lineNumber}: ${line.text.trim()}`
            })
            .join('\n') +
          '\n' +
          'Please change the import to end with /index.es, ' +
          'see https://github.com/josdejong/svelte-jsoneditor/issues/107'
      )
    })

    return false
  } else {
    return true
  }
}

/**
 * @param {string[]} filenames
 * @returns {Array<{ filename: string, lines: Array<{lineNumber: number, text: string}>}>}
 */
function collectIssues(filenames) {
  const issues = []

  for (const filename of filenames) {
    const lines = getNonESImportLineNumbers(filename)
    if (lines.length > 0) {
      issues.push({
        filename,
        lines
      })
    }
  }

  return issues
}

/**
 * @param {string} filename
 * @returns {Array<{lineNumber: number, text: string}>}
 */
function getNonESImportLineNumbers(filename) {
  const file = String(fs.readFileSync(filename))
  const lines = file.split('\n')
  const issues = []

  lines.forEach((line, index) => {
    if (/@fortawesome/.test(line) && !/index\.es/.test(line)) {
      issues.push({
        lineNumber: index + 1,
        text: line
      })
    }
  })

  return issues
}

/**
 * source: https://coderrocketfuel.com/article/recursively-list-all-the-files-in-a-directory-using-node-js
 * @param {string} dirPath
 * @returns {string[]}
 */
function getAllFiles(dirPath) {
  let filenames = []

  fs.readdirSync(dirPath).forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      const nestedFiles = getAllFiles(dirPath + '/' + file)
      filenames = filenames.concat(nestedFiles)
    } else {
      filenames.push(path.join(dirPath, '/', file))
    }
  })

  return filenames
}

function hasExtensionOf(filename, extensions) {
  const extension = path.extname(filename)

  return extensions.includes(extension)
}
