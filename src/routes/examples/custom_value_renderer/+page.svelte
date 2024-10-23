<script lang="ts">
  import {
    EnumValue,
    JSONEditor,
    renderValue,
    type RenderValueComponentDescription,
    type RenderValueProps
  } from 'svelte-jsoneditor'
  import ReadonlyPassword from '../../components/ReadonlyPassword.svelte'
  import { EvaluatorAction } from '../../components/EvaluatorAction'

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

  function onRenderValue(props: RenderValueProps): RenderValueComponentDescription[] {
    const key = props.path[props.path.length - 1]
    if (key === 'password' && !props.isEditing) {
      return [{ component: ReadonlyPassword, props }]
    }

    if (key === 'gender') {
      return [
        {
          component: EnumValue,
          props: {
            ...props,
            options: genderOptions
          }
        }
      ]
    }

    if (key === 'evaluate' && !props.isEditing) {
      return [{ action: EvaluatorAction, props }]
    }

    // fallback on the default render components
    return renderValue(props)
  }
</script>

<svelte:head>
  <title>Custom value renderer (password, enum, action) | svelte-jsoneditor</title>
</svelte:head>

<h1>Custom value renderer (password, enum, action)</h1>

<p>
  Provide a custom <code>onRenderValue</code> method, which demonstrates three things:
</p>
<ol>
  <li>
    It hides the value of all fields with the name "password" using a Svelte password component <code
      >ReadonlyPassword</code
    >
  </li>
  <li>
    It creates an enum component for the fields with name "gender" using a Svelte component <code
      >EnumValue</code
    >.
  </li>
  <li>
    The creates a custom component for the field named "evaluate" using a Svelte Action, which
    evaluates the value as an expression containing an addition of two or more values. This solution
    can be used when using svelte-jsoneditor in a Vanilla JS environment.
  </li>
</ol>

<div class="editor">
  <JSONEditor bind:content {onRenderValue} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
