<script lang="ts">
  import { JSONEditor } from 'svelte-jsoneditor'
  import { english, french, russian, simplifiedChinese } from 'svelte-jsoneditor/locales'
  import type { Language } from 'svelte-jsoneditor'

  const languages: Language[] = [english, french, russian, simplifiedChinese]

  let selectedLanguage = $state(languages[0])

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
  <title>Switch language | svelte-jsoneditor</title>
</svelte:head>

<h1>Switch language</h1>

<p>
  Pass a <code>Language</code> to the <code>language</code> property to translate the user
  interface. The library ships with <code>english</code>, <code>french</code>, <code>russian</code>
  and
  <code>simplifiedChinese</code>, and you can pass a custom
  <code>Language</code> of your own.
</p>

<p>
  <label>
    Language:
    <select bind:value={selectedLanguage}>
      {#each languages as language (language.langCode)}
        <option value={language}>{language.langCode}</option>
      {/each}
    </select>
  </label>
</p>

<div class="editor">
  <JSONEditor bind:content language={selectedLanguage} />
</div>

<style>
  .editor {
    width: 700px;
    height: 400px;
  }
</style>
