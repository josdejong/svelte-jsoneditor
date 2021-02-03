import { readFileSync, writeFileSync } from 'fs'

const workerBundleFile = '../node_modules/ace-builds/src-noconflict/worker-json.js'
const workerEmbeddedFile = '../src/generated/worker-json-data-url.js'
const workerScript = String(readFileSync(workerBundleFile))

const btoa = (b) => Buffer.from(b).toString('base64')

const workerDataUrl = 'data:application/javascript;base64,' + btoa(workerScript)

writeFileSync(workerEmbeddedFile, 'export default \'' + workerDataUrl + '\'\n')
