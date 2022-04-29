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
    text: undefined, // used when in code mode
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

  $: console.log('contents changed:', content)
</script>

<svelte:head>
  <title>Custom theme with CSS variables | svelte-jsoneditor</title>
</svelte:head>

<div class="page {selectedTheme} {selectedFontSize}">
  <h1>Custom theme with CSS variables</h1>

  <p>You can customize the styling of the editor using CSS variables</p>

  <p>
    Theme: <select bind:value={selectedTheme}>
      {#each themes as theme}
        <option value={theme.value}>{theme.label}</option>
      {/each}
    </select>
  </p>
  <p>
    Font size:
    <select bind:value={selectedFontSize}>
      {#each fontSizes as fontSize}
        <option value={fontSize.value}>{fontSize.label}</option>
      {/each}
    </select>
  </p>

  <div class="editor">
    <JSONEditor bind:content />
  </div>
</div>

<style lang="scss">
  // replace the dark theme import with:
  //
  //    @import 'svelte-jsoneditor/themes/jse-theme-dark.css';
  //
  @import '../../lib/themes/jse-theme-dark.css';
  @import 'themes/jse-theme-big.css';

  :global(#svelte main) {
    padding: 0;
  }

  .page {
    width: 100%;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
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
      --jse-font-size-mono: 16px;
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
