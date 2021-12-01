<script>
  import { EnumValue, JSONEditor, renderValue } from '$lib'
  import ReadonlyPassword from './components/ReadonlyPassword.svelte'

  let content = {
    text: undefined, // used when in code mode
    json: {
      username: 'John',
      password: 'secret...',
      gender: 'male'
    }
  }

  const genderOptions = [
    { value: null, text: '-' },
    { value: 'male', text: 'Male' },
    { value: 'female', text: 'Female' },
    { value: 'other', text: 'Other' }
  ]

  function onRenderValue(props) {
    const { path, value, readOnly, isEditing, isSelected, onSelect, onPatch } = props

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

    if (key === 'gender') {
      return [
        {
          component: EnumValue,
          props: {
            value,
            path,
            readOnly,
            onPatch,
            isSelected,
            options: genderOptions
          }
        }
      ]
    }

    // fallback on the default render components
    return renderValue(props)
  }
</script>

<svelte:head>
  <title>Custom value renderer (password, enum) | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom value renderer (password, enum)</h1>

<p>
  Provide a custom <code>onRenderValue</code> method, which hides the value of all fields with the name
  "password", and creates an enum for the fields with name "gender".
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
