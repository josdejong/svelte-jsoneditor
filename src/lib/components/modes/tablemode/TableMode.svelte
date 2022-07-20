<svelte:options immutable={true} />

<script lang="ts">
  import type { Content } from '../../../types'
  import TableMenu from './menu/TableMenu.svelte'
  import { noop } from 'lodash-es'

  export let mainMenuBar = true
  export let externalContent: Content
  export let onRenderMenu = noop
</script>

<div class="jse-table-mode" class:no-main-menu={!mainMenuBar}>
  {#if mainMenuBar}
    <TableMenu {onRenderMenu} />
  {/if}
  <div class="contents">
    {JSON.stringify(externalContent)}
  </div>
</div>

<style src="./TableMode.scss"></style>
