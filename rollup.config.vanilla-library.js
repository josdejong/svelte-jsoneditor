import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import path from 'path'
import svelte from 'rollup-plugin-svelte'
import terser from '@rollup/plugin-terser'
import { sveltePreprocess } from 'svelte-preprocess'
import { getVanillaDependencies } from './tools/getExternalDependencies.js'

const production = !process.env.ROLLUP_WATCH
const packageFolder = 'package-vanilla'
const file = path.join(packageFolder, 'index.js')

export default {
  input: 'src/lib/index.ts',
  external: getVanillaDependencies(),
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
      browser: true,
      exportConditions: ['svelte']
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
