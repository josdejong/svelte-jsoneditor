import path from 'path'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    package: {
      dir: 'package'
    },

    vite: {
      resolve: {
        alias: {
          'svelte-jsoneditor': path.resolve('src/lib')
        }
      }
    }
  }
}

export default config
