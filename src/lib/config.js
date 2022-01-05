// workaround for SvelteKit/Vite issue,
// see https://github.com/josdejong/svelte-jsoneditor/issues/9
export const viteOptimizeDeps = [
  'ace-builds/src-noconflict/ace',
  'ace-builds/src-noconflict/ext-searchbox',
  'ace-builds/src-noconflict/mode-json',
  'ajv',
  'classnames',
  'diff-sequences',
  'jmespath', // TODO: double check whether jmespath dep is necessary here
  'json-source-map',
  'natural-compare-lite'
]
