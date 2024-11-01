<script lang="ts">
  import {
    type Content,
    type ContextMenuItem,
    createAjvValidator,
    createValueSelection,
    EditableValue,
    isJSONContent,
    isTextContent,
    javascriptQueryLanguage,
    jmespathQueryLanguage,
    jsonQueryLanguage,
    jsonpathQueryLanguage,
    JSONEditor,
    type JSONEditorSelection,
    type JSONParser,
    lodashQueryLanguage,
    type MenuItem,
    Mode,
    type OnChangeStatus,
    ReadonlyValue,
    type RenderMenuContext,
    renderValue,
    type RenderValueComponentDescription,
    type RenderValuePropsOptional,
    SelectionType,
    toJSONContent
  } from 'svelte-jsoneditor'
  import { useLocalStorage } from '$lib/utils/localStorageUtils.js'
  import { range } from 'lodash-es'
  import { tick, mount } from 'svelte'
  import { parse, stringify } from 'lossless-json'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { compileJSONPointer, isJSONObject, parseJSONPointer } from 'immutable-json-patch'

  const LosslessJSON = {
    parse,
    stringify
  }

  let content: Content = {
    text: `{
  "boolean": true,
  "color": "#82b92c",
  "html_code": "&quot;",
  "html_characters<a>": "<a>",
  "escaped_unicode": "\\u260e",
  "long": 9223372036854775807,
  "float": 4.0,
  "big": 1e500,
  "unicode": "😀,💩",
  "escaped double quote": "\\"abc\\"",
  "unicode double quote": "\\u0022abc\\u0022",
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
  "backslash": "back\\\\slash",
  "forwardslash": "forward\\/slash",
  "quote": "quote\\"",
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

  let selectionTree: JSONEditorSelection | undefined
  let selectionText: JSONEditorSelection | undefined

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

  const arraySchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'number'
        },
        random: {
          type: 'number',
          minimum: 0
        },
        array: {
          type: 'array',
          items: {
            type: 'number'
          }
        },
        name: {
          type: 'string'
        },
        long: {
          type: 'number'
        },
        'nested object': {
          type: 'object',
          properties: {
            value: { type: 'number' }
          }
        }
      },
      required: ['id', 'name', 'random', 'array'],
      additionalProperties: false
    },
    minItems: 1001
  }

  const themes = [
    { value: 'jse-theme-default', label: 'default' },
    { value: 'jse-theme-dark', label: 'dark' },
    { value: 'jse-theme-big', label: 'big' },
    { value: 'jse-theme-custom-contents', label: 'custom-contents' }
  ]

  const indentations = [
    { value: 2, label: '2 spaces' },
    { value: 3, label: '3 spaces' },
    { value: '    ', label: '4 spaces' }, // equivalent to value: 4
    { value: 6, label: '6 spaces' },
    { value: 8, label: '8 spaces' },
    { value: '\t', label: '1 tab' }
  ]

  interface ParserOption {
    id: string
    value: JSONParser
    label: string
  }

  const parsers: ParserOption[] = [
    {
      id: 'JSON',
      value: JSON,
      label: 'JSON'
    },
    {
      id: 'LosslessJSON',
      value: LosslessJSON,
      label: 'LosslessJSON'
    }
  ]

  const pathParsers = [
    {
      id: 'JSONPath',
      value: {
        parse: parseJSONPath,
        stringify: stringifyJSONPath
      },
      label: 'JSONPath'
    },
    {
      id: 'JSONPointer',
      value: {
        parse: parseJSONPointer,
        stringify: compileJSONPointer
      },
      label: 'JSONPointer'
    },
    {
      id: 'JSON',
      value: JSON,
      label: 'JSON'
    }
  ]

  const validator = createAjvValidator({ schema })
  const arrayValidator = createAjvValidator({ schema: arraySchema })

  let refTreeEditor: JSONEditor | undefined
  let refTextEditor: JSONEditor | undefined

  // for debugging
  $: if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.refTreeEditor = refTreeEditor
  }
  $: if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.refTextEditor = refTextEditor
  }

  const showTreeEditor = useLocalStorage('svelte-jsoneditor-demo-showTreeEditor', true)
  const showTextEditor = useLocalStorage('svelte-jsoneditor-demo-showTextEditor', true)
  const showRawContents = useLocalStorage('svelte-jsoneditor-demo-showRawContents', false)
  const showSelection = useLocalStorage('svelte-jsoneditor-demo-showSelection', false)
  let height = '440px'
  const validate = useLocalStorage('svelte-jsoneditor-demo-validate', false)
  const validateArray = useLocalStorage('svelte-jsoneditor-demo-validate-array', false)
  const readOnly = useLocalStorage('svelte-jsoneditor-demo-readOnly', false)
  const mainMenuBar = useLocalStorage('svelte-jsoneditor-demo-mainMenuBar', true)
  const navigationBar = useLocalStorage('svelte-jsoneditor-demo-navigationBar', true)
  const statusBar = useLocalStorage('svelte-jsoneditor-demo-statusBar', true)
  const askToFormat = useLocalStorage('svelte-jsoneditor-demo-askToFormat', true)
  const escapeControlCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeControlCharacters',
    false
  )
  const escapeUnicodeCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeUnicodeCharacters',
    false
  )
  const flattenColumns = useLocalStorage('svelte-jsoneditor-demo-flattenColumns', false)
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
  const selectedParserId = useLocalStorage('svelte-jsoneditor-demo-parser', parsers[1].id)
  const selectedPathParserId = useLocalStorage(
    'svelte-jsoneditor-demo-path-parser',
    pathParsers[0].id
  )
  const tabSize = useLocalStorage('svelte-jsoneditor-demo-tabSize', indentations[0].value)
  let leftEditorMode: Mode = Mode.tree

  $: queryLanguages = $multipleQueryLanguages
    ? [
        jsonQueryLanguage,
        jmespathQueryLanguage,
        jsonpathQueryLanguage,
        javascriptQueryLanguage,
        lodashQueryLanguage
      ]
    : [jsonQueryLanguage]
  let queryLanguageId = jsonQueryLanguage.id // TODO: store in local storage

  let selectedParser: JSONParser
  $: selectedParser =
    parsers.find((parser) => parser.id === $selectedParserId)?.value || parsers[0].value
  $: selectedPathParser =
    pathParsers.find((parser) => parser.id === $selectedPathParserId)?.value || pathParsers[0].value

  $: selectedValidator = $validate ? validator : $validateArray ? arrayValidator : undefined

  // only editable/readonly div, no color picker, boolean toggle, timestamp
  function customRenderValue(props: RenderValuePropsOptional): RenderValueComponentDescription[] {
    return props.isEditing
      ? [{ component: EditableValue, props }]
      : [{ component: ReadonlyValue, props }]
  }

  function onRenderMenu(items: MenuItem[], { mode }: RenderMenuContext) {
    if (!import.meta.env.SSR) {
      console.log('onRenderMenu', mode, items)
    }

    return items
  }

  function onChangeTree(
    content: Content,
    previousContent: Content,
    { contentErrors, patchResult }: OnChangeStatus
  ) {
    console.log('onChangeTree', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onChangeText(
    content: Content,
    previousContent: Content,
    { contentErrors, patchResult }: OnChangeStatus
  ) {
    console.log('onChangeText', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onSelectTree(selection: JSONEditorSelection | undefined) {
    console.log('onSelectTree', selection)
  }

  function onSelectText(selection: JSONEditorSelection | undefined) {
    console.log('onSelectText', selection)
  }

  function onChangeMode(mode: Mode) {
    console.log('onChangeMode', mode)
  }

  function onChangeQueryLanguage(newQueryLanguageId: string) {
    console.log('onChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
  }

  function onRenderContextMenu(items: ContextMenuItem[], context: RenderMenuContext) {
    console.log('onRenderContextMenu', items, context)
    return items
  }

  function openInWindow() {
    const popupWindow = window.open(
      '',
      '_blank',
      `location=no,toolbar=no,menubar=no,status=no,directories=no,width=${500},height=${600},left=${0},top=${0},editorWind=yes`
    )
    if (!popupWindow) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.popupEditor = mount(JSONEditor, {
      target: popupWindow.document.body,
      props: {}
    })
  }

  function refresh() {
    if (refTreeEditor) {
      refTreeEditor.refresh()
    }
    if (refTextEditor) {
      refTextEditor.refresh()
    }
  }

  function generateLongArray() {
    return [...new Array(1000)].map((value, index) => {
      const random = Math.round(Math.random() * 1000)
      const item: Record<string, unknown> = {
        id: index,
        name: 'Item ' + index,
        random,
        'nested object': {
          value: random
        },
        array: [index, 1, 7, 3],
        long:
          selectedParser.stringify === stringify
            ? 9223372000000000000n + BigInt(random)
            : Number(9223372000000000000n + BigInt(random))
      }

      // introduce some validation issues
      if (index === 3) {
        const array = item.array as Array<string | null>
        array[2] = 'oopsie'
        array[3] = null
        delete item['id']
      }
      if (index === 4) {
        item.random = -1
      }
      if (index === 7 || index === 802) {
        item.random = String(item.random)
        item.long = String(item.long)
      }
      if (index === 9) {
        item.unknownProp = 'other'
      }

      return item
    })
  }

  function handleOpenFile(event: Event) {
    const target = event.target as HTMLInputElement

    console.log('loadFile', target.files)
    console.time('load file')

    const reader = new window.FileReader()
    const file = target.files?.[0]
    if (!file) {
      return
    }

    reader.onload = function (event: ProgressEvent<FileReader>) {
      console.timeEnd('load file')

      if (!event.target) {
        return
      }

      console.time('parse and render')

      content = {
        text: String(event.target?.result),
        json: undefined
      }

      tick().then(() => console.timeEnd('parse and render'))
    }
    reader.readAsText(file)
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
      Theme: <select bind:value={$selectedTheme} on:change={refresh}>
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
      <input type="checkbox" bind:checked={$validateArray} /> validate array
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
      <input type="checkbox" bind:checked={$askToFormat} /> askToFormat
    </label>
    <label>
      <input type="checkbox" bind:checked={$escapeControlCharacters} /> escapeControlCharacters
    </label>
    <label>
      <input type="checkbox" bind:checked={$escapeUnicodeCharacters} /> escapeUnicodeCharacters
    </label>
    <label>
      <input type="checkbox" bind:checked={$flattenColumns} /> flattenColumns
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
    {#if $multipleQueryLanguages}
      . Selected query language:
      <select bind:value={queryLanguageId}>
        {#each queryLanguages as queryLanguage}
          <option value={queryLanguage.id}>{queryLanguage.name}</option>
        {/each}
      </select>
    {/if}
  </p>

  <p>
    JSON Parser: <select bind:value={$selectedParserId}>
      {#each parsers as parser}
        <option value={parser.id}>{parser.label}</option>
      {/each}
    </select>

    Path Parser:
    <select bind:value={$selectedPathParserId}>
      {#each pathParsers as pathParser}
        <option value={pathParser.id}>{pathParser.label}</option>
      {/each}
    </select>
  </p>

  <p class="buttons">
    <button
      on:click={() => {
        content = {
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
          json: generateLongArray()
        }
      }}
    >
      Set long array with objects
    </button>
    <button
      on:click={() => {
        content = {
          text: '[1,2,3',
          json: undefined
        }
      }}
    >
      Set repairable text
    </button>
    <button
      on:click={() => {
        content = {
          text: '[1, 2, 3] [',
          json: undefined
        }
      }}
    >
      Set unrepairable text
    </button>
    <button
      on:click={() => {
        refTreeEditor?.scrollTo(['669', 'array'])
      }}
    >
      Scroll to ['669', 'array']
    </button>
    <button
      on:click={() => {
        selectionTree = createValueSelection(['object', 'a'])
        refTreeEditor?.focus()
      }}
    >
      Select ['object', 'a']
    </button>
    <button
      on:click={() => {
        refTreeEditor?.select(createValueSelection(['669', 'name']))
        refTreeEditor?.focus()
      }}
    >
      Select ['669', 'name']
    </button>
    <button
      on:click={() => {
        if (!refTextEditor) {
          alert('Open the text editor first (right panel)')
          return
        }
        refTextEditor.select({
          type: SelectionType.text,
          ranges: [{ anchor: 5, head: 12 }],
          main: 0
        })
        refTextEditor.focus()
      }}
    >
      Select char 5 to 12
    </button>
    <button
      on:click={() => {
        refTreeEditor?.select(undefined)
        refTextEditor?.select(undefined)
      }}
    >
      Select nothing
    </button>
  </p>
  <p class="buttons">
    <button
      on:click={() => {
        refTreeEditor?.patch([{ op: 'add', path: '/updated', value: '2022-09-01T10:13:44Z' }])
      }}
    >
      Patch json in tree editor
    </button>
    <button
      on:click={() => {
        if (!refTreeEditor) {
          return
        }

        const content = toJSONContent(refTreeEditor.get(), LosslessJSON)
        if (isJSONObject(content.json)) {
          const updatedContent = {
            json: { ...content.json, updated: '2022-09-01T10:13:44Z' }
          }
          refTreeEditor.update(updatedContent)
        }
      }}
    >
      Update json in tree editor
    </button>
    <button on:click={openInWindow}>Open editor in new window</button>
    <input type="file" on:change={handleOpenFile} />
  </p>

  <p>
    <label>
      <input type="checkbox" bind:checked={$showRawContents} /> Show raw contents (at the bottom)
    </label>
    <label>
      <input type="checkbox" bind:checked={$showSelection} /> Show selection (at the bottom)
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
        </select>
      </p>
      <div class="tree-editor" style="height: {height}">
        {#if $showTreeEditor}
          <form novalidate action="/">
            <JSONEditor
              bind:this={refTreeEditor}
              bind:content
              bind:selection={selectionTree}
              bind:mode={leftEditorMode}
              mainMenuBar={$mainMenuBar}
              navigationBar={$navigationBar}
              statusBar={$statusBar}
              askToFormat={$askToFormat}
              escapeControlCharacters={$escapeControlCharacters}
              escapeUnicodeCharacters={$escapeUnicodeCharacters}
              flattenColumns={$flattenColumns}
              readOnly={$readOnly}
              indentation={$selectedIndentation}
              tabSize={$tabSize}
              parser={selectedParser}
              pathParser={selectedPathParser}
              validator={selectedValidator}
              {queryLanguages}
              bind:queryLanguageId
              {onRenderMenu}
              onChange={onChangeTree}
              onSelect={onSelectTree}
              onRenderValue={$useCustomValueRenderer ? customRenderValue : renderValue}
              {onRenderContextMenu}
              {onChangeMode}
              onFocus={() => console.log('onFocus tree')}
              onBlur={() => console.log('onBlur tree', { content: refTreeEditor?.get() })}
            />
          </form>
        {/if}
      </div>

      {#if $showSelection}
        <div class="data">
          selection:
          <pre><code>{JSON.stringify(selectionTree, null, 2)}</code></pre>
        </div>
      {/if}

      {#if $showRawContents}
        <div class="data">
          json contents:
          <pre>
            <code>
            {isJSONContent(content)
                ? truncate(selectedParser.stringify(content.json, null, 2) ?? '', 1e5)
                : 'undefined'}
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
          <form novalidate action="/">
            <JSONEditor
              bind:this={refTextEditor}
              mode={Mode.text}
              bind:content
              bind:selection={selectionText}
              mainMenuBar={$mainMenuBar}
              navigationBar={$navigationBar}
              statusBar={$statusBar}
              askToFormat={$askToFormat}
              escapeControlCharacters={$escapeControlCharacters}
              escapeUnicodeCharacters={$escapeUnicodeCharacters}
              flattenColumns={$flattenColumns}
              readOnly={$readOnly}
              indentation={$selectedIndentation}
              tabSize={$tabSize}
              parser={selectedParser}
              pathParser={selectedPathParser}
              validator={selectedValidator}
              {queryLanguages}
              {queryLanguageId}
              {onChangeQueryLanguage}
              {onRenderMenu}
              onChange={onChangeText}
              onSelect={onSelectText}
              onRenderValue={$useCustomValueRenderer ? customRenderValue : renderValue}
              {onChangeMode}
              onFocus={() => console.log('onFocus text')}
              onBlur={() => console.log('onBlur text', { content: refTextEditor?.get() })}
            />
          </form>
        {/if}
      </div>

      {#if $showSelection}
        <div class="data">
          selection:
          <pre><code>{JSON.stringify(selectionText, null, 2)}</code></pre>
        </div>
      {/if}

      {#if $showRawContents}
        <div class="data">
          text contents:
          <pre>
            <code>
              {isTextContent(content) ? truncate(content.text, 1e5) : undefined}
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
  @use 'sass:color';
  @import '../../lib/themes/jse-theme-dark.css';
  @import '../themes/jse-theme-big.css';

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

    &.jse-theme-custom-contents {
      $background-color: hsl(76, 52%, 70%);

      --jse-contents-background-color: #{$background-color};
      --jse-selection-background-color: #{color.adjust(
          $background-color,
          $lightness: -10%,
          $saturation: -20%
        )};
      --jse-selection-background-inactive-color: #{color.adjust(
          $background-color,
          $lightness: -5%,
          $saturation: -10%
        )};
      --jse-hover-background-color: #{color.adjust(
          $background-color,
          $lightness: -5%,
          $saturation: -10%
        )};

      --jse-context-menu-pointer-hover-background: #{color.adjust(
          $background-color,
          $lightness: -20%,
          $saturation: -20%
        )};
      --jse-context-menu-pointer-background-highlight: #{color.adjust(
          $background-color,
          $lightness: -30%,
          $saturation: -30%
        )};
      --jse-context-menu-pointer-background: #{color.adjust(
          $background-color,
          $lightness: -40%,
          $saturation: -40%
        )};

      --jse-collapsed-items-background-color: #{color.adjust(
          $background-color,
          $lightness: -5%,
          $saturation: -10%
        )};
      --jse-collapsed-items-selected-background-color: #{color.adjust(
          $background-color,
          $lightness: -20%,
          $saturation: -20%
        )};
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

  form {
    flex: 1;
    display: flex;
  }

  .tree-editor,
  .text-editor {
    display: flex;

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
    margin: 10px 0;

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

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }

  :global(.jse-main.jse-focus) {
    box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.24);
  }
</style>
