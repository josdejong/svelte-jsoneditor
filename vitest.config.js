import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig(({ mode }) => ({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globals: true,
    environment: 'jsdom',
    threads: false // disabling threads is currently 50% faster
  },
  resolve: {
    // See https://github.com/sveltejs/svelte/issues/11394
    conditions: mode === 'test' ? ['browser'] : []
  }
}))
