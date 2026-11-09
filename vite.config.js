import adapter from '@sveltejs/adapter-static'
import { sveltePreprocess } from 'svelte-preprocess'
import path from 'path'
import { sveltekit } from '@sveltejs/kit/vite'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [
    sveltekit({
      // Consult https://github.com/sveltejs/svelte-preprocess
      // for more information about preprocessors
      preprocess: sveltePreprocess(),
      adapter: adapter()
    })
  ],
  resolve: { alias: { 'svelte-jsoneditor': path.resolve('src/lib') } }
}

export default config
