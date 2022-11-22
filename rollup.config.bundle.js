import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import path from 'path'
import svelte from 'rollup-plugin-svelte'
import terser from '@rollup/plugin-terser'
import sveltePreprocess from 'svelte-preprocess'

const production = !process.env.ROLLUP_WATCH
const packageFolder = 'package-vanilla'
const name = 'vanilla-jsoneditor'
const moduleFile = 'index.js'
const umdFile = 'index.umd.js'

const plugins = [
  svelte({
    compilerOptions: {
      // enable run-time checks when not in production
      dev: !production
    },

    // we want to embed the CSS in the generated JS bundle
    emitCss: false,

    preprocess: sveltePreprocess()
  }),

  resolve({
    browser: true
  }),
  commonjs(),
  json(),

  typescript({ sourceMap: true, inlineSources: true })
]

export default {
  input: 'src/lib/index-vanilla.ts',
  output: [
    {
      file: path.join(packageFolder, moduleFile),
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
      // output-specific plugins can only modify code after the main analysis of Rollup has completed
      plugins: [
        getBabelOutputPlugin({
          presets: ['@babel/preset-env']
        }),
        // minify
        production && terser()
      ]
    },
    {
      name,
      file: path.join(packageFolder, umdFile),
      format: 'umd',
      sourcemap: true,
      inlineDynamicImports: true,
      globals: {
        [name]: 'JSONEditor'
      },
      plugins: [production && terser()]
    }
  ],
  plugins
}

export { packageFolder, name, moduleFile, umdFile }
