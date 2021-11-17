<script>
  import Icon from 'svelte-awesome'
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'

  /** @type {QueryLanguage[]} */
  export let queryLanguages

  /** @type {string} */
  export let queryLanguageId

  /** @type {(queryLanguageId: string) => void} */
  export let onChangeQueryLanguage

  function handleChangeQueryLanguage(newQueryLanguageId) {
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)
  }
</script>

<div class="jse-select-query-language">
  <div class="jse-select-query-language-container">
    {#each queryLanguages as queryLanguage}
      <button
        on:click={() => handleChangeQueryLanguage(queryLanguage.id)}
        class="jse-query-language"
        class:selected={queryLanguage.id === queryLanguageId}
        title={`Select ${queryLanguage.name} as query language`}
      >
        {#if queryLanguage.id === queryLanguageId}
          <Icon data={faCheckSquare} />
        {:else}
          <Icon data={faSquare} />
        {/if}
        {queryLanguage.name}
      </button>
    {/each}
  </div>
</div>

<style src="./SelectQueryLanguage.scss"></style>
