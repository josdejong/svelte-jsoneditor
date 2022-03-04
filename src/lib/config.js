// workaround for SvelteKit/Vite issue,
// see https://github.com/josdejong/svelte-jsoneditor/issues/9
export const viteOptimizeDeps = [
  'ajv',
  'classnames',
  'diff-sequences',
  'jmespath', // TODO: double check whether jmespath dep is necessary here
  'json-source-map',
  'natural-compare-lite'
]
