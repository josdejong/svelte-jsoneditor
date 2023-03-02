<script lang="ts">
  import Icon from 'svelte-awesome'
  import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons'
  import type { QueryLanguage, OnChangeQueryLanguage } from '$lib/types.js'

  export let queryLanguages: QueryLanguage[]
  export let queryLanguageId: string
  export let onChangeQueryLanguage: OnChangeQueryLanguage

  function handleChangeQueryLanguage(newQueryLanguageId: string) {
    queryLanguageId = newQueryLanguageId
    onChangeQueryLanguage(newQueryLanguageId)
  }
</script>

<div class="jse-select-query-language">
  <div class="jse-select-query-language-container">
    {#each queryLanguages as queryLanguage}
      <button
        type="button"
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
