import { readFileSync, writeFileSync } from 'fs'
import mkdirp from 'mkdirp'
import path from 'path'

const outputFolder = './src/generated/ajv'
const jsonDrafts = [
  {
    name: 'draft04',
    path: './node_modules/ajv/lib/refs/json-schema-draft-04.json'
  },
  {
    name: 'draft06',
    path: './node_modules/ajv/lib/refs/json-schema-draft-06.json'
  }
]

mkdirp.sync(outputFolder)

// Create an embedded version of the json drafts for Ajv: a data url
jsonDrafts.forEach(jsonDraft => {
  const json = String(readFileSync(jsonDraft.path))
  const outputFile = path.join(outputFolder, jsonDraft.name + '.js')

  writeFileSync(outputFile, `export const ${jsonDraft.name} = ${json}\n`)
})
