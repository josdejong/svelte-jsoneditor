// deprecation warning since v0.5.0
const message =
  'Deprecation error: the bundled file has been moved into a separate npm package. \n' +
  'Please replace: \n' +
  '    import { JSONEditor} from "svelte-jsoneditor/dist/jsoneditor.js" \n' +
  'With: \n' +
  '    import { JSONEditor} from "vanilla-jsoneditor" \n' +
  'Read more about v0.5.0: https://github.com/josdejong/svelte-jsoneditor/blob/main/CHANGELOG.md'

export function JSONEditor() {
  throw new Error(message)
}

export function createAjvValidator() {
  throw new Error(message)
}

export function renderJSONSchemaEnum() {
  throw new Error(message)
}

export function renderValue() {
  throw new Error(message)
}

throw new Error(message)
