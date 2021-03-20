import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'
import sveltePreprocess from 'svelte-preprocess'
import { terser } from 'rollup-plugin-terser'

const production = !process.env.ROLLUP_WATCH

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.module, format: 'es' },
    { file: pkg.main, format: 'umd', name: 'jsoneditor', sourcemap: true }
  ],
  plugins: [
    svelte({
      // enable run-time checks when not in production
      compilerOptions: {
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
  ],

  // // suppress Ajv circular dependency warnings, see https://github.com/ajv-validator/ajv/issues/1399
  // onwarn: warning => {
  //   const isAjvCircularWarning = (
  //     warning.code === 'CIRCULAR_DEPENDENCY' &&
  //     warning.importer.includes('ajv')
  //   )
  //
  //   if (!isAjvCircularWarning) {
  //     console.warn(`(!) ${warning.message}`);
  //   }
  // }
}
