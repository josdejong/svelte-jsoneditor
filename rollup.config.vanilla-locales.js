import typescript from '@rollup/plugin-typescript'
import path from 'path'

// The locales are published as a separate entry point so applications only
// bundle the languages they import. They are plain data, no dependencies.
export default {
  input: 'src/lib/locales.ts',
  output: [
    {
      file: path.join('package-vanilla', 'locales.js'),
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [typescript({ sourceMap: true, inlineSources: true })]
}
