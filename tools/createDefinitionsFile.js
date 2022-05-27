import { writeFileSync } from 'fs'

const code = `export * from '../index'\n`

export function createDefinitionsFile(definitionsFile) {
  console.info('create definitions file', definitionsFile)
  writeFileSync(definitionsFile, code)
}
