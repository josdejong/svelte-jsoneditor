<script lang="ts">
  import { english, JSONEditor, russian, type Language } from 'svelte-jsoneditor'


  let editorRef
  function refresh() {
    // call refresh to make sure the line numbers in the gutter are resized too,
    // and the color of the indentation markers is updated
    editorRef?.refresh()
  }

  // если нужен массив языков — делаем derived (реактивный computed)
  const translatedText = $derived([english, russian])

  // выбранный язык
  let selectedLanguage = $state<Language>(english)

  let content = $state({
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
  })
  
  $inspect('content', content)
</script>

<svelte:head>
  <title>Switch and set language | svelte-jsoneditor</title>
</svelte:head>

<div class="page">
  <h1>Switch and set language</h1>

  <p>You can set ...</p>

  <section>
    <span>i18n</span>
    {#if translatedText}
      <select bind:value={selectedLanguage}>
        {#each translatedText as lang}
          <option value={lang}>{lang.landCode}</option>
        {/each}
      </select>
    {/if}
  </section>
  <div class="editor">
    <JSONEditor bind:content bind:this={editorRef} language={selectedLanguage} />
  </div>
</div>

<style lang="scss">
</style>
