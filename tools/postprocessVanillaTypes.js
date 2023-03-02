import { readFileSync, writeFileSync } from 'fs'
import { getAbsolutePath } from './utils/getAbsolutePath.mjs'

const declareModuleSection = `declare module '*.svelte' {
    export { SvelteComponentDev as default } from 'svelte/internal';
}
`

const filename = getAbsolutePath(import.meta.url, '..', 'package-vanilla', 'index.d.ts')
const contents = String(readFileSync(filename))

const index = contents.indexOf(declareModuleSection)
if (index === -1) {
  console.error(`Failed to remove the Svelte declare module section from ${filename}`)
  process.exit(1)
}

const cleanedContents = contents.replace(declareModuleSection, '')
writeFileSync(filename, cleanedContents)
