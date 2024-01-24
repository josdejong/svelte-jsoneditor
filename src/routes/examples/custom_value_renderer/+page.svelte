<script>
  import { EnumValue, JSONEditor, renderValue } from 'svelte-jsoneditor'
  import ReadonlyPassword from '../../components/ReadonlyPassword.svelte'
  import { Evaluator } from '../../components/Evaluator.ts'

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      username: 'John',
      password: 'secret...',
      gender: 'male',
      evaluate: '2 + 3'
    }
  }

  const genderOptions = [
    { value: null, text: '-' },
    { value: 'male', text: 'Male' },
    { value: 'female', text: 'Female' },
    { value: 'other', text: 'Other' }
  ]

  function onRenderValue(props) {
    const { path, value, readOnly, parser, isEditing, selection, onSelect, onPatch } = props

    const key = props.path[props.path.length - 1]
    if (key === 'password' && !isEditing) {
      return [
        {
          component: ReadonlyPassword,
          props: {
            value,
            path,
            readOnly,
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
            parser,
            onPatch,
            selection,
            options: genderOptions
          }
        }
      ]
    }

    if (key === 'evaluate' && !isEditing) {
      return [
        {
          action: Evaluator,
          props: {
            value,
            path,
            readOnly,
            onSelect
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
  "password", and creates an enum for the fields with name "gender". The field named "evaluate" is rendered
  using a vanilla JS component (action) which evaluates the value as an expression containing an addition
  of two or more values.
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
