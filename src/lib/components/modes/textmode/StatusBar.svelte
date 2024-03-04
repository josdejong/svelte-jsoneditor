<script lang="ts">
  import type { EditorState, Line } from '@codemirror/state'

  export let editorState: EditorState | undefined

  let pos: number | undefined
  $: pos = editorState?.selection?.main?.head

  let line: Line | undefined
  $: line = pos !== undefined ? editorState?.doc?.lineAt(pos) : undefined

  let lineNumber: number | undefined
  $: lineNumber = line !== undefined ? line.number : undefined

  let columnNumber: number | undefined
  $: columnNumber = line !== undefined && pos !== undefined ? pos - line.from + 1 : undefined

  let charCount: number | undefined
  $: charCount = editorState?.selection?.ranges?.reduce((count, range) => {
    return count + range.to - range.from
  }, 0)
</script>

<div class="jse-status-bar">
  {#if lineNumber !== undefined}
    <div class="jse-status-bar-info">Line: {lineNumber}</div>
  {/if}

  {#if columnNumber !== undefined}
    <div class="jse-status-bar-info">Column: {columnNumber}</div>
  {/if}

  {#if charCount !== undefined && charCount > 0}
    <div class="jse-status-bar-info">Selection: {charCount} characters</div>
  {/if}
</div>

<style src="./StatusBar.scss"></style>
