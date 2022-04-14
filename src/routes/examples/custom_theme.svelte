<script>
  import { JSONEditor } from 'svelte-jsoneditor'
  import { useLocalStorage } from '../../lib/utils/localStorageUtils.js'

  const themes = [
    { value: 'default', label: 'default' },
    { value: 'dark', label: 'dark' },
    { value: 'svelte', label: 'svelte' }
  ]

  let selectedTheme = useLocalStorage('svelte-jsoneditor-custom-theme', 'dark')

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

<h1>Custom theme with CSS variables</h1>

<p>You can customize the styling of the editor using CSS variables</p>

<p>
  Theme: <select bind:value={$selectedTheme}>
    {#each themes as theme}
      <option value={theme.value}>{theme.label}</option>
    {/each}
  </select>
</p>

<div class="editor {$selectedTheme}">
  <JSONEditor bind:content />
</div>

<style lang="scss">
  .editor {
    width: 700px;
    height: 400px;

    &.dark {
      --jse-background-color: #1e1e1e;
      --jse-text-color: #d4d4d4;
      --jse-selection-background-color: #464646;
      --jse-selection-background-dark-color: #343434;
      --jse-edit-outline: 2px solid #d4d4d4;

      --jse-menu-color: #3c3c3c;
      --jse-menu-color-light: #565656;
      --jse-menu-text-color: #e5e5e5;

      --jse-panel-background-color: #333333;
      --jse-panel-text-color: #d4d4d4;
      --jse-panel-text-color-readonly: #737373;
      --jse-panel-text-color-dark: #8d8d8d;
      --jse-panel-border: 1px solid #3c3c3c;

      --jse-key-color: #9cdcfe;
      --jse-value-color: #d4d4d4;
      --jse-value-color-number: #b5cea8;
      --jse-value-color-boolean: #569cd6;
      --jse-value-color-null: #569cd6;
      --jse-value-color-string: #ce9178;
      --jse-value-color-url: #ce9178;
      --jse-meta-color: #575757;

      --jse-tag-background: #575757;
      --jse-tag-text-color: #d4d4d4;

      --jse-input-border: 1px solid #737373;
      --jse-input-border-readonly: 1px solid #3f3f3f;
      --jse-input-border-focus: 1px solid #3f3f3f;

      // svelte-select
      --border: 1px solid #737373;
    }

    &.svelte {
      --jse-menu-color: #ff3e00;
      --jse-menu-color-light: #fd5e2d;

      --jse-font-family: times new roman;
      --jse-font-family-mono: Courier New;
      --jse-font-size: 32px;
      --jse-font-size-small: 24px;
      --jse-font-size-smallest: 18px;
      --jse-font-size-mono: 32px;

      --jse-button-primary-background: #ff3e00;
      --jse-button-primary-background-highlight: #e74c1c;
      --itemIsActiveBG: #fd5e2d;

      --jse-context-menu-background: #ff3e00;
      --jse-context-menu-background-highlight: #ea3600;
      --jse-context-menu-text-color: #fff;
      --jse-context-menu-text-color-disabled: rgba(255, 255, 255, 0.4);
      --jse-context-menu-separator-color: rgba(255, 255, 255, 0.2);
    }
  }
</style>
