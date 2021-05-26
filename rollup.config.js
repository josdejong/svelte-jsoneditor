import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import svelte from 'rollup-plugin-svelte'
import { terser } from 'rollup-plugin-terser'
import sveltePreprocess from 'svelte-preprocess'
import pkg from './package.json'

const production = !process.env.ROLLUP_WATCH

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.module, format: 'es', sourcemap: true },
    { file: pkg.main, format: 'umd', name: 'jsoneditor', sourcemap: true }
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
    resolve(),

    // minify
    production && terser()
  ]
}
