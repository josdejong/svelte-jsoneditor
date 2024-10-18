import adapter from '@sveltejs/adapter-auto'
import { sveltePreprocess } from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: sveltePreprocess(),

  compilerOptions: {
    warningFilter: (warning) => {
      if (warning.code === 'reactive_declaration_non_reactive_property') {
        // Disable the warning:
        //     Properties of objects and arrays are not reactive unless in runes mode.
        //     Changes to this property will not cause the reactive statement to update (svelte)
        // These warnings are wrongfully thrown when using TypeScript enums like Mode.tree
        // TODO: find a solution and remove this warningFilter again (possibly this is a bug in Svelte 5)

        return false
      }

      return true
    }
  },

  kit: {
    adapter: adapter(),
    alias: {
      'svelte-jsoneditor': 'src/lib'
    }
  }
}

export default config
