<script context="module" lang="ts">
  export const prerender = true
</script>

<script lang="ts">
  import {
    createAjvValidator,
    JSONEditor,
    jmespathQueryLanguage,
    lodashQueryLanguage,
    javascriptQueryLanguage,
    renderValue,
    EditableValue,
    ReadonlyValue
  } from '$lib'
  import { useLocalStorage } from '../lib/utils/localStorageUtils.js'
  import { range } from 'lodash-es'
  import { tick } from 'svelte'

  let content = {
    text: `{
  "boolean": true,
  "color": "#82b92c",
  "html_code": "&quot;",
  "html_characters<a>": "<a>",
  "escaped_unicode": "\\u260e",
  "unicode": "😀,💩",
  "return": "\\n",
  "null": null,
  "number": 123,
  "object": {
    "a": "b",
    "c": "d"
  },
  "string": "Greeting!",
  "stringContainingNumber": "1234",
  "multi\\nline    text": "Hello\\nWorld    text",
  "tab": "Hello\\tTab",
  "timestamp": 1534952749890,
  "url": "https://jsoneditoronline.org",
  "array": [
    1,
    2,
    [
      3,
      4,
      5
    ],
    4,
    5,
    6,
    7,
    8,
    9,
    10
  ],
  "xss?": "<button onclick=alert('oopsie!!!')>test xss</button>",
  "xss array": [
    {
      "<button onclick=alert('oopsie!!!')>test xss</button>": "xss?"
    }
  ],
  "long line": "longwordlongword longword2longword2longword2 longlinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelongline"
}`,
    json: undefined
  }

  const schema = {
    title: 'Employee',
    description: 'Object containing employee details',
    type: 'object',
    properties: {
      boolean: {
        title: 'A boolean',
        type: 'boolean'
      },
      array: {
        type: 'array',
        items: {
          type: 'number',
          minimum: 10
        }
      }
    },
    required: ['foo']
  }

  const themes = [
    { value: 'jse-theme-default', label: 'default' },
    { value: 'jse-theme-dark', label: 'dark' },
    { value: 'jse-theme-big', label: 'big' }
  ]

  const indentations = [
    { value: 2, label: '2 spaces' },
    { value: 3, label: '3 spaces' },
    { value: '    ', label: '4 spaces' }, // equivalent to value: 4
    { value: 6, label: '6 spaces' },
    { value: 8, label: '8 spaces' },
    { value: '\t', label: '1 tab' }
  ]

  const validator = createAjvValidator(schema)

  let refTreeEditor
  let refTextEditor

  // for debugging
  $: if (typeof window !== 'undefined') {
    window['refTreeEditor'] = refTreeEditor
  }
  $: if (typeof window !== 'undefined') {
    window['refTextEditor'] = refTextEditor
  }

  const showTreeEditor = useLocalStorage('svelte-jsoneditor-demo-showTreeEditor', true)
  const showTextEditor = useLocalStorage('svelte-jsoneditor-demo-showTextEditor', true)
  const showRawContents = useLocalStorage('svelte-jsoneditor-demo-showRawContents', true)
  let height = '430px'
  const validate = useLocalStorage('svelte-jsoneditor-demo-validate', true)
  const readOnly = useLocalStorage('svelte-jsoneditor-demo-readOnly', false)
  const mainMenuBar = useLocalStorage('svelte-jsoneditor-demo-mainMenuBar', true)
  const navigationBar = useLocalStorage('svelte-jsoneditor-demo-navigationBar', true)
  const statusBar = useLocalStorage('svelte-jsoneditor-demo-statusBar', true)
  const escapeControlCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeControlCharacters',
    false
  )
  const escapeUnicodeCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeUnicodeCharacters',
    false
  )
  const useCustomValueRenderer = useLocalStorage(
    'svelte-jsoneditor-demo-useCustomValueRenderer',
    false
  )
  const multipleQueryLanguages = useLocalStorage(
    'svelte-jsoneditor-demo-multipleQueryLanguages',
    true
  )
  const selectedTheme = useLocalStorage('svelte-jsoneditor-demo-theme', themes[0].value)
  const selectedIndentation = useLocalStorage(
    'svelte-jsoneditor-demo-indentation',
    indentations[0].value
  )
  const tabSize = useLocalStorage('svelte-jsoneditor-demo-tabSize', indentations[0].value)
  let leftEditorMode = 'table'

  $: queryLanguages = $multipleQueryLanguages
    ? [javascriptQueryLanguage, lodashQueryLanguage, jmespathQueryLanguage]
    : [javascriptQueryLanguage]
  let queryLanguageId = javascriptQueryLanguage.id // TODO: store in local storage

  // only editable/readonly div, no color picker, boolean toggle, timestamp
  function customRenderValue({
    path,
    value,
    readOnly,
    enforceString,
    searchResultItems,
    isEditing,
    normalization,
    onPatch,
    onPasteJson,
    onSelect,
    onFind,
    focus
  }) {
    const renderers = []

    if (isEditing) {
      renderers.push({
        component: EditableValue,
        props: {
          path,
          value,
          enforceString,
          normalization,
          onPatch,
          onPasteJson,
          onSelect,
          onFind,
          focus
        }
      })
    }

    if (!isEditing) {
      renderers.push({
        component: ReadonlyValue,
        props: { path, value, readOnly, normalization, searchResultItems, onSelect }
      })
    }

    return renderers
  }

  function onRenderMenu(mode, items) {
    if (!import.meta.env.SSR) {
      console.log('onRenderMenu', mode, items)
    }
  }

  function onChangeTree(content, previousContent, { contentErrors, patchResult }) {
    console.log('onChangeTree', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onChangeText(content, previousContent, { contentErrors, patchResult }) {
    console.log('onChangeText', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onChangeMode(mode) {
    console.log('onChangeMode', mode)
  }

  function onChangeQueryLanguage(newQueryLanguageId) {
    console.log('onChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
  }

  function openInWindow() {
    const popupWindow = window.open(
      '',
      '_blank',
      `location=no,toolbar=no,menubar=no,status=no,directories=no,width=${500},height=${600},left=${0},top=${0},editorWind=yes`
    )
    window['popupEditor'] = new JSONEditor({
      target: popupWindow.document.body,
      props: {}
    })
  }
</script>

<svelte:head>
  <title>development application | svelte-jsoneditor</title>
</svelte:head>

<div class="demo-app {$selectedTheme}">
  <h1>svelte-jsoneditor development application</h1>
  <p>
    <label>
      Indentation: <select bind:value={$selectedIndentation}>
        {#each indentations as indentation}
          <option value={indentation.value}>{indentation.label}</option>
        {/each}
      </select>
    </label>
    <label>
      tabSize: <input type="number" bind:value={$tabSize} />
    </label>
    <label>
      Height: <input type="text" bind:value={height} />
    </label>
    <label>
      Theme: <select bind:value={$selectedTheme}>
        {#each themes as theme}
          <option value={theme.value}>{theme.label}</option>
        {/each}
      </select>
    </label>
  </p>
  <p>
    <label>
      <input type="checkbox" bind:checked={$validate} /> validate
    </label>
    <label>
      <input type="checkbox" bind:checked={$mainMenuBar} /> mainMenuBar
    </label>
    <label>
      <input type="checkbox" bind:checked={$navigationBar} /> navigationBar
    </label>
    <label>
      <input type="checkbox" bind:checked={$statusBar} /> statusBar
    </label>
    <label>
      <input type="checkbox" bind:checked={$escapeControlCharacters} /> escapeControlCharacters
    </label>
    <label>
      <input type="checkbox" bind:checked={$escapeUnicodeCharacters} /> escapeUnicodeCharacters
    </label>
    <label>
      <input type="checkbox" bind:checked={$readOnly} /> readOnly
    </label>
    <label>
      <input type="checkbox" bind:checked={$useCustomValueRenderer} /> Custom onRenderValue
    </label>
  </p>
  <p>
    <label>
      <input type="checkbox" bind:checked={$multipleQueryLanguages} /> Multiple query languages
    </label>
  </p>
  {#if $multipleQueryLanguages}
    <p>
      Selected query language:
      <select bind:value={queryLanguageId}>
        {#each queryLanguages as queryLanguage}
          <option value={queryLanguage.id}>{queryLanguage.name}</option>
        {/each}
      </select>
    </p>
  {/if}
  <p class="buttons">
    <button
      on:click={() => {
        content = {
          text: undefined,
          json: [1, 2, 3, 4, 5]
        }
      }}
    >
      Update json
    </button>
    <button
      on:click={() => {
        content = {
          text: '[1, 2, 3, 4]',
          json: undefined
        }
      }}
    >
      Update text
    </button>
    <button
      on:click={() => {
        content = {
          text: '',
          json: undefined
        }
      }}
    >
      Set empty text
    </button>
    <button
      on:click={() => {
        content = {
          text: undefined,
          json: ''
        }
      }}
    >
      Set empty string
    </button>
    <button
      on:click={() => {
        content = {
          text: undefined,
          json: range(0, 999)
        }
      }}
    >
      Set long array
    </button>
    <button
      on:click={() => {
        content = {
          text: undefined,
          json: [...new Array(1000)].map((value, index) => {
            return {
              id: index,
              name: 'Item ' + index,
              random: Math.round(Math.random() * 1000)
            }
          })
        }
      }}
    >
      Set long array with objects
    </button>
    <button
      on:click={() => {
        content = {
          text: 'abc',
          json: undefined
        }
      }}
    >
      Set repairable text
    </button>
    <button
      on:click={() => {
        content = {
          text: '[1, 2, 3 }',
          json: undefined
        }
      }}
    >
      Set unrepairable text
    </button>
    <button on:click={openInWindow}>Open editor in new window</button>
    <input
      type="file"
      on:change={(event) => {
        console.log('loadFile', event.target.files)
        console.time('load file')

        const reader = new window.FileReader()
        const file = event.target.files[0]
        reader.onload = function (event) {
          console.timeEnd('load file')

          console.time('parse and render')

          content = {
            text: event.target.result,
            json: undefined
          }

          tick().then(() => console.timeEnd('parse and render'))
        }
        reader.readAsText(file)
      }}
    />
  </p>

  <p>
    <label>
      <input type="checkbox" bind:checked={$showRawContents} /> Show raw contents (at the bottom)
    </label>
  </p>

  <div class="columns">
    <div class="left">
      <p>
        <label>
          <input type="checkbox" bind:checked={$showTreeEditor} /> Show tree editor
        </label>
        <select class="mode-toggle" bind:value={leftEditorMode}>
          <option value="tree">tree</option>
          <option value="text">text</option>
          <option value="table">table</option>
          <option value="code">code (deprecated)</option>
        </select>
      </p>
      <div class="tree-editor" style="height: {height}">
        {#if $showTreeEditor}
          <JSONEditor
            bind:this={refTreeEditor}
            bind:content
            bind:mode={leftEditorMode}
            mainMenuBar={$mainMenuBar}
            navigationBar={$navigationBar}
            statusBar={$statusBar}
            escapeControlCharacters={$escapeControlCharacters}
            escapeUnicodeCharacters={$escapeUnicodeCharacters}
            readOnly={$readOnly}
            indentation={$selectedIndentation}
            tabSize={$tabSize}
            validator={$validate ? validator : undefined}
            {queryLanguages}
            bind:queryLanguageId
            {onRenderMenu}
            onChange={onChangeTree}
            onRenderValue={$useCustomValueRenderer ? customRenderValue : renderValue}
            {onChangeMode}
          />
        {/if}
      </div>

      {#if $showRawContents}
        <div class="data">
          json contents:
          <pre>
					<code>
					{content.json !== undefined ? JSON.stringify(content.json, null, 2) : 'undefined'}
					</code>
				</pre>
        </div>
      {/if}
    </div>
    <div class="right">
      <p>
        <label>
          <input type="checkbox" bind:checked={$showTextEditor} /> Show text editor
        </label>
      </p>

      <div class="text-editor" style="height: {height}">
        {#if $showTextEditor}
          <JSONEditor
            bind:this={refTextEditor}
            mode="text"
            bind:content
            mainMenuBar={$mainMenuBar}
            navigationBar={$navigationBar}
            statusBar={$statusBar}
            escapeControlCharacters={$escapeControlCharacters}
            escapeUnicodeCharacters={$escapeUnicodeCharacters}
            readOnly={$readOnly}
            indentation={$selectedIndentation}
            tabSize={$tabSize}
            validator={$validate ? validator : undefined}
            {queryLanguages}
            {queryLanguageId}
            {onChangeQueryLanguage}
            {onRenderMenu}
            onChange={onChangeText}
            onRenderValue={$useCustomValueRenderer ? customRenderValue : renderValue}
            {onChangeMode}
          />
        {/if}
      </div>

      {#if $showRawContents}
        <div class="data">
          text contents:
          <pre>
						<code>
						{content.text}
						</code>
					</pre>
        </div>
      {/if}
    </div>
  </div>
</div>

<!--
Workaround for the console warning:

 <Development> received an unexpected slot "default".

See https://github.com/sveltejs/kit/issues/981
-->
{#if false}
  <slot />
{/if}

<style lang="scss">
  @import '../lib/themes/jse-theme-dark.css';
  @import 'examples/themes/jse-theme-big.css';

  .demo-app {
    margin: -10px; // compensate for the padding of the root element
    padding: 10px;
    height: 100%;
    overflow: auto;

    &.jse-theme-dark {
      background: #4d4d4d;
      color: #fff;
    }

    &.jse-theme-big {
      background: #ffe2d8;
    }
  }

  .columns {
    display: flex;
    gap: 20px;
    width: 100%;
    max-width: 1200px;
  }

  .columns .left,
  .columns .right {
    flex: 1;
    min-width: 0;
  }

  .tree-editor,
  .text-editor {
    // some styling to try out if it doesn't break the styling of the editor
    line-height: 72px;
    font-size: 72px;
    font-family: 'Comic Sans MS', 'Courier New', serif;
  }

  .mode-toggle {
    font-size: 12pt;
    font-family: arial, serif;
  }

  .data {
    margin-top: 10px;
  }

  pre {
    background: #f5f5f5;
  }

  p {
    max-width: none;

    &.buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
  }

  button,
  input,
  select {
    font-size: inherit;
    font-family: inherit;
  }

  label {
    white-space: nowrap;
  }

  :global(.jse-main.jse-focus) {
    box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.24);
  }
</style>
