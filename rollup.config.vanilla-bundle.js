import config from './rollup.config.vanilla-library.js'
import path from 'path'

const packageFolder = 'package-vanilla'
const file = path.join(packageFolder, 'standalone.js')

export default {
  ...config,
  external: undefined,
  output: [
    {
      file,
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true
    }
  ]
}
