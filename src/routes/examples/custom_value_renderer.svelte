<script>
  import { JSONEditor, renderValue } from '$lib'
  import ReadonlyPassword from './components/ReadonlyPassword.svelte'

  let content = {
    text: undefined, // used when in code mode
    json: {
      username: 'Jo',
      password: 'secret...'
    }
  }

  function onRenderValue(props) {
    const { path, value, readOnly, isEditing, isSelected, onSelect } = props

    const key = props.path[props.path.length - 1]
    if (key === 'password' && !isEditing) {
      return [
        {
          component: ReadonlyPassword,
          props: {
            value,
            path,
            readOnly,
            isSelected,
            onSelect
          }
        }
      ]
    }

    return renderValue(props)
  }
</script>

<svelte:head>
  <title>Custom value renderer (hide password) | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom value renderer (hide password)</h1>

<p>
  Provide a custom <code>onRenderValue</code> method, which hides the value of all fields with the name
  "password".
</p>
<p>
  <i>EXPERIMENTAL! This API will most likely change in future versions.</i>
</p>

<div class="editor">
  <JSONEditor bind:content {onRenderValue} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
