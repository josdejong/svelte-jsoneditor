import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/**
 * Usage:
 *
 *   getAbsolutePath(import.meta.url)
 *   getAbsolutePath(import.meta.url, '../package.json')
 *   getAbsolutePath(import.meta.url, '..' , 'package.json')
 *
 * Source: https://github.com/ivangabriele/esm-path
 *
 * @param {string} importMetaUrl
 * @param {string} [relativePaths]
 * @returns {string}
 */
export function getAbsolutePath(importMetaUrl, ...relativePaths) {
  const importMetaPath = fileURLToPath(importMetaUrl)
  const importMetaDirectoryPath = dirname(importMetaPath)
  return join(importMetaDirectoryPath, ...relativePaths)
}
