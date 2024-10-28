<script lang="ts">
  import {
    JSONEditor,
    ReadonlyValue,
    type RenderValueComponentDescription,
    type RenderValueProps
  } from 'svelte-jsoneditor'
  import EditableValueInput from '../../components/EditableValueInput.svelte'

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd' },
      string: 'Hello World'
    }
  }

  function onRenderValue(props: RenderValueProps): RenderValueComponentDescription[] {
    if (props.isEditing && !props.readOnly) {
      return [{ component: EditableValueInput, props }]
    }

    return [{ component: ReadonlyValue, props }]
  }
</script>

<svelte:head>
  <title>Custom value renderer (editable input) | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom value renderer 2 (editable input)</h1>

<p>
  Provide a custom <code>onRenderValue</code> method, which demonstrates how to create a fully editable
  input field. The same can be used to for example create an embedded code editor.
</p>

<div class="editor">
  <JSONEditor bind:content {onRenderValue} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }

  p {
    max-width: 700px;
  }
</style>
