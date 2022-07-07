import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import path from 'path'
import fs from 'fs'
import svelte from 'rollup-plugin-svelte'
import { terser } from 'rollup-plugin-terser'
import sveltePreprocess from 'svelte-preprocess'
import pkg from './package.json'
import { addBundleExports } from './tools/addBundleExports.js'
import { createDefinitionsFile } from './tools/createDefinitionsFile.js'

const production = !process.env.ROLLUP_WATCH
const packageFolder = 'package'
const file = path.join(packageFolder, pkg.module)
const sourcemapFile = file + '.map'
const definitionsFile = file.replace(/\.js$/, '.d.ts')

fs.mkdirSync(path.dirname(file))
createDefinitionsFile(definitionsFile)
addBundleExports(packageFolder, file, sourcemapFile, definitionsFile)

export default {
  input: 'src/lib/index.ts',
  output: [
    {
      file,
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true
    }
  ],
  plugins: [
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

    typescript({ sourceMap: true, inlineSources: true }),
    getBabelOutputPlugin({
      presets: ['@babel/preset-env']
    }),

    // minify
    production && terser()
  ]
}
