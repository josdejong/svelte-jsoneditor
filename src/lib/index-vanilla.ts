export * from './index'

// overwrite the Svelte component (cannot be used in a vanilla environment)
export const JSONEditor = () => {
  throw new Error(
    'Class constructor is deprecated. Use `createJSONEditor(...)` instead of `new JSONEditor(...)`'
  )
}
