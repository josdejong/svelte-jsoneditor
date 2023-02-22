<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  const themes = [
    { value: 'jse-theme-default', label: 'default' },
    { value: 'jse-theme-dark', label: 'dark' },
    { value: 'jse-theme-big', label: 'big' }
  ]

  const fontSizes = [
    { value: 'jse-font-small', label: 'small' },
    { value: 'jse-font-normal', label: 'normal' },
    { value: 'jse-font-large', label: 'large' }
  ]

  let selectedTheme = themes[1].value
  let selectedFontSize = fontSizes[1].value

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

  let editorRef
  function refresh() {
    // call refresh to make sure the line numbers in the gutter are resized too,
    // and the color of the indentation markers is updated
    editorRef?.refresh()
  }

  $: console.log('contents changed:', content)
</script>

<svelte:head>
  <title>Switch themes and font size with CSS variables | svelte-jsoneditor</title>
</svelte:head>

<div class="page {selectedTheme} {selectedFontSize}">
  <h1>Switch themes and font size with CSS variables</h1>

  <p>You can customize the styling of the editor using CSS variables</p>

  <p>
    Theme: <select bind:value={selectedTheme} on:change={refresh}>
      {#each themes as theme}
        <option value={theme.value}>{theme.label}</option>
      {/each}
    </select>
  </p>
  <p>
    Font size:
    <select bind:value={selectedFontSize} on:change={refresh}>
      {#each fontSizes as fontSize}
        <option value={fontSize.value}>{fontSize.label}</option>
      {/each}
    </select>
  </p>

  <div class="editor">
    <JSONEditor bind:content bind:this={editorRef} />
  </div>
</div>

<style lang="scss">
  // replace the dark theme import with:
  //
  //    @import 'svelte-jsoneditor/themes/jse-theme-dark.css';
  //
  @import '../../../lib/themes/jse-theme-dark.css';
  @import '../../themes/jse-theme-big.css';

  .page {
    width: 100%;
    height: 100%;
    padding: 10px;
    margin: -10px; // compensate for the padding of the root element
    overflow: auto;

    &.jse-theme-dark {
      background: black;
      color: white;
    }

    &.jse-theme-big {
      background: #ffe2d8;
    }

    &.jse-font-small {
      --jse-font-size-mono: 12px;
    }

    &.jse-font-normal {
      --jse-font-size-mono: 14px;
    }

    &.jse-font-large {
      --jse-font-size-mono: 20px;
    }

    .editor {
      width: 700px;
      height: 400px;
    }
  }
</style>
