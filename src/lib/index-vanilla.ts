import JsonEditor from './components/JSONEditor.svelte'
import type { JSONEditorPropsOptional } from '$lib/types'
import { mount, unmount } from 'svelte'

// Note: index.ts exports `JSONEditor`, but we will override this on purpose
//  since we cannot use it in the vanilla environment starting in Svelte 5.
export * from './index'

export interface CreateJSONEditorProps {
  target: HTMLDivElement
  props: JSONEditorPropsOptional
}

export { JsonEditor }

export function createJSONEditor({ target, props }: Parameters<typeof mount>[1]): JsonEditor {
  const editor = mount(JsonEditor, { target, props })

  editor.destroy = async () => {
    unmount(editor)

    return new Promise((resolve) => setTimeout(resolve))
  }

  return editor as JsonEditor
}

/**
 * @deprecated The constructor "new JSONEditor(...)" is deprecated. Please use "createJSONEditor(...)" instead.
 */
export function JSONEditor({ target, props }: CreateJSONEditorProps) {
  // TODO: deprecation warning since v1. Remove some day
  console.warn(
    'WARNING: the constructor "new JSONEditor(...)" is deprecated since v1. ' +
      'Please use "createJSONEditor(...)" instead.'
  )

  return createJSONEditor({ target, props })
}
