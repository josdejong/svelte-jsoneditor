import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // workaround for a bug in svelte/vite/vitest introduced in vite@4.1.0
    // see https://github.com/vitest-dev/vitest/issues/2834#issuecomment-1439576110
    alias: [{ find: /^svelte$/, replacement: 'svelte/internal' }],

    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globals: true,
    environment: 'jsdom',
    threads: false // disabling threads is currently 50% faster
  }
})
