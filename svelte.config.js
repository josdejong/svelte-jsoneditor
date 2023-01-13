import adapter from '@sveltejs/adapter-auto'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter()
  },

  package: {
    dir: 'package',
    files: (filepath) => {
      // ignore test and snapshot files
      if (filepath.endsWith('.test.ts') || filepath.includes('__snapshots__')) {
        return false
      }

      return true
    }
  }
}

export default config
