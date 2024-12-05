import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'
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
  input: 'src/lib/index-vanilla.ts',
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

      emitCss: true,

      preprocess: sveltePreprocess()
    }),

    postcss({
      plugins: []
    }),

    resolve({
      browser: true,
      exportConditions: ['svelte', 'module', 'production', 'browser']
    }),
    commonjs(),
    json(),

    typescript({ sourceMap: true, inlineSources: true }),
    getBabelOutputPlugin({
      // { modules: false } is to resolve the following console warning:
      //     Dynamic import can only be transformed when transforming ES modules to AMD, CommonJS or SystemJS.
      // See: https://stackoverflow.com/questions/63563485/how-can-i-preserve-dynamic-import-statements-with-babel-preset-env
      presets: [['@babel/preset-env', { modules: false }]],

      // { compact: true } is to resolve the following console warning:
      //     [BABEL] Note: The code generator has deoptimised the styling of undefined as it exceeds the max of 500KB.
      // See: https://github.com/babel/babel/discussions/13676
      compact: true
    }),

    // minify
    production && terser()
  ]
}
