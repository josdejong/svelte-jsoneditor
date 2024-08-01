<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Icon from 'svelte-awesome'
  import { faCog } from '@fortawesome/free-solid-svg-icons'
  import SelectQueryLanguage from '../controls/selectQueryLanguage/SelectQueryLanguage.svelte'
  import type { AbsolutePopupContext, OnChangeQueryLanguage, QueryLanguage } from '$lib/types.js'
  import Header from './Header.svelte'

  export let queryLanguages: QueryLanguage[]
  export let queryLanguageId: string
  export let fullscreen: boolean
  export let onChangeQueryLanguage: OnChangeQueryLanguage
  export let onClose: () => void

  let refConfigButton: HTMLButtonElement | undefined
  let popupId: number | undefined

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
      offsetTop: -2,
      offsetLeft: 0,
      anchor: refConfigButton,
      closeOnOuterClick: true
    })
  }
</script>

<Header title="Transform" fullScreenButton={true} bind:fullscreen {onClose}>
  <button
    slot="actions"
    type="button"
    bind:this={refConfigButton}
    class="jse-config"
    class:hide={queryLanguages.length <= 1}
    on:click={openConfig}
    title="Select a query language"
  >
    <Icon data={faCog} />
  </button>
</Header>

<style src="./TransformModalHeader.scss"></style>
