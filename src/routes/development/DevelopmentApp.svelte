<script lang="ts">
  import { createAjvValidator, JSONEditor } from '$lib'
  import { useLocalStorage } from '$lib/utils/localStorageUtils.js'
  import { range } from 'lodash-es'

  let json = {
    array: [1, 2, [3, 4, 5]],
    boolean: true,
    color: '#82b92c',
    htmlcode: '&quot;',
    escaped_unicode: '\\u20b9',
    unicode: '\u{1F600},\uD83D\uDCA9',
    return: '\n',
    null: null,
    number: 123,
    object: { a: 'b', c: 'd' },
    string: 'Hello World',
    timestamp: 1534952749890,
    url: 'http://jsoneditoronline.org',
    "<button onclick=alert('oopsie!!!')>test xss</button>": 'xss?',
    'xss array': [
      {
        "<button onclick=alert('oopsie!!!')>test xss</button>": 'xss?'
      }
    ],
    'long line': 'longword'.repeat(2) + ' ' + 'longword2'.repeat(3) + ' ' + 'longline'.repeat(20)
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

  const validator = createAjvValidator(schema)

  let text = undefined

  const showTreeEditor = useLocalStorage('svelte-jsoneditor-demo-showTreeEditor', true)
  const showCodeEditor = useLocalStorage('svelte-jsoneditor-demo-showCodeEditor', true)
  const showRawContents = useLocalStorage('svelte-jsoneditor-demo-showRawContents', true)
  let indentation = 2
  let height = '400px'
  const validate = useLocalStorage('svelte-jsoneditor-demo-validate', true)
  const readOnly = useLocalStorage('svelte-jsoneditor-demo-readOnly', false)
  const mainMenuBar = useLocalStorage('svelte-jsoneditor-demo-mainMenuBar', true)

  function onRenderMenu(mode, items) {
    if (!import.meta.env.SSR) {
      console.log('onRenderMenu', mode, items)
    }
  }

  function onChangeTree({ json, text }) {
    if ($showRawContents) {
      console.log('onChangeTree', { json, text })
    }
  }

  function onChangeCode({ json, text }) {
    if ($showRawContents) {
      console.log('onChangeCode', { json, text })
    }
  }

  function onChangeMode(mode) {
    console.log('onChangeMode', mode)
  }
</script>

<div class="demo-app">
  <h1>svelte-jsoneditor development application</h1>
  <p>
    <label>
      Indentation: <input type="number" bind:value={indentation} />
    </label>
    <label>
      Height: <input type="text" bind:value={height} />
    </label>
    <label>
      <input type="checkbox" bind:checked={$validate} /> Validate
    </label>
    <label>
      <input type="checkbox" bind:checked={$mainMenuBar} /> Menu bar
    </label>
    <label>
      <input type="checkbox" bind:checked={$readOnly} /> Read-only
    </label>
  </p>
  <p>
    <button
      on:click={() => {
        text = undefined
        json = [1, 2, 3, 4, 5]
      }}
    >
      Update json
    </button>
    <button
      on:click={() => {
        text = '[1, 2, 3, 4]'
        json = undefined
      }}
    >
      Update text
    </button>
    <button
      on:click={() => {
        text = ''
        json = undefined
      }}
    >
      Set empty text
    </button>
    <button
      on:click={() => {
        text = undefined
        json = ''
      }}
    >
      Set empty string
    </button>
    <button
      on:click={() => {
        text = undefined
        json = range(0, 999)
      }}
    >
      Set long array
    </button>
    <button
      on:click={() => {
        text = 'abc'
        json = undefined
      }}
    >
      Set repairable text
    </button>
    <button
      on:click={() => {
        text = '[1, 2, 3 }'
        json = undefined
      }}
    >
      Set unrepairable text
    </button>
    <input
      type="file"
      on:change={(event) => {
        console.log('loadFile', event.target.files)
        console.time('load file')

        const reader = new window.FileReader()
        const file = event.target.files[0]
        reader.onload = function (event) {
          console.timeEnd('load file')

          console.time('set JSON')
          text = event.target.result
          json = undefined
          console.timeEnd('set JSON')
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
      </p>
      <div class="tree-editor" style="height: {height}">
        {#if $showTreeEditor}
          <JSONEditor
            bind:text
            bind:json
            mainMenuBar={$mainMenuBar}
            readOnly={$readOnly}
            {indentation}
            validator={$validate ? validator : undefined}
            {onRenderMenu}
            onChange={onChangeTree}
            {onChangeMode}
          />
        {/if}
      </div>

      {#if $showRawContents}
        <div class="data">
          json contents:
          <pre>
					<code>
					{json !== undefined ? JSON.stringify(json, null, 2) : 'undefined'}
					</code>
				</pre>
        </div>
      {/if}
    </div>
    <div class="right">
      <p>
        <label>
          <input type="checkbox" bind:checked={$showCodeEditor} /> Show code editor
        </label>
      </p>

      <div class="code-editor" style="height: {height}">
        {#if $showCodeEditor}
          <JSONEditor
            mode="code"
            bind:text
            bind:json
            mainMenuBar={$mainMenuBar}
            readOnly={$readOnly}
            {indentation}
            validator={$validate ? validator : undefined}
            {onRenderMenu}
            onChange={onChangeCode}
            {onChangeMode}
          />
        {/if}
      </div>

      {#if $showRawContents}
        <div class="data">
          text contents:
          <pre>
						<code>
						{text}
						</code>
					</pre>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 1.5em;
    font-weight: 100;
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

  .tree-editor {
  }

  .code-editor {
  }

  .data {
    margin-top: 10px;
  }

  pre {
    background: #f5f5f5;
  }
</style>
