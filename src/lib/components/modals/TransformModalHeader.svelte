<svelte:options immutable={true} />

<script>
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faCog, faTimes } from '@fortawesome/free-solid-svg-icons'
  import SelectQueryLanguage from '../controls/selectQueryLanguage/SelectQueryLanguage.svelte'

  /** @type {QueryLanguage[]} */
  export let queryLanguages

  /** @type {string} */
  export let queryLanguageId

  /** @type {(queryLanguageId: string) => void} */
  export let onChangeQueryLanguage

  let refConfigButton

  const { close } = getContext('simple-modal')
  const { openAbsolutePopup, closeAbsolutePopup } = getContext('absolute-popup')

  function openConfig() {
    const props = {
      queryLanguages,
      queryLanguageId,
      onChangeQueryLanguage: (selectedQueryLanguage) => {
        closeAbsolutePopup()
        onChangeQueryLanguage(selectedQueryLanguage)
      }
    }

    openAbsolutePopup(SelectQueryLanguage, props, {
      position: 'bottom',
      offsetTop: -2,
      offsetLeft: 0,
      anchor: refConfigButton,
      closeOnOuterClick: true
    })
  }
</script>

<div class="header">
  <div class="title">Transform</div>
  {#if queryLanguages.length > 1}
    <button
      bind:this={refConfigButton}
      type="button"
      class="config"
      on:click={openConfig}
      title="Select a query language"
    >
      <Icon data={faCog} />
    </button>
  {/if}
  <button type="button" class="close" on:click={close}>
    <Icon data={faTimes} />
  </button>
</div>

<style src="./Header.scss"></style>
