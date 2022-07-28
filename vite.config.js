import path from 'path'
import { sveltekit } from '@sveltejs/kit/vite'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  resolve: {
    alias: {
      'svelte-jsoneditor': path.resolve('src/lib')
    }
  }
}

export default config
