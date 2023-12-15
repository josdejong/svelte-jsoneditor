<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faCog, faTimes } from '@fortawesome/free-solid-svg-icons'
  import SelectQueryLanguage from '../controls/selectQueryLanguage/SelectQueryLanguage.svelte'
  import type { AbsolutePopupContext, OnChangeQueryLanguage, QueryLanguage } from '$lib/types.js'
  import type { Context } from 'svelte-simple-modal'

  export let queryLanguages: QueryLanguage[]
  export let queryLanguageId: string
  export let onChangeQueryLanguage: OnChangeQueryLanguage

  let refConfigButton: HTMLButtonElement | undefined
  let popupId: number | undefined

  const { close } = getContext<Context>('simple-modal')
  const { openAbsolutePopup, closeAbsolutePopup } =
    getContext<AbsolutePopupContext>('absolute-popup')

  function openConfig() {
    const props = {
      queryLanguages,
      queryLanguageId,
      onChangeQueryLanguage: (queryLanguageId: string) => {
        closeAbsolutePopup(popupId)
        onChangeQueryLanguage(queryLanguageId)
      }
    }

    popupId = openAbsolutePopup(SelectQueryLanguage, props, {
      position: 'bottom',
      offsetTop: -2,
      offsetLeft: 0,
      anchor: refConfigButton,
      closeOnOuterClick: true
    })
  }
</script>

<div class="jse-header">
  <div class="jse-title">Transform</div>
  {#if queryLanguages.length > 1}
    <button
      type="button"
      bind:this={refConfigButton}
      class="jse-config"
      on:click={openConfig}
      title="Select a query language"
    >
      <Icon data={faCog} />
    </button>
  {/if}
  <button type="button" class="jse-close" on:click={() => close()}>
    <Icon data={faTimes} />
  </button>
</div>

<style src="./Header.scss"></style>
