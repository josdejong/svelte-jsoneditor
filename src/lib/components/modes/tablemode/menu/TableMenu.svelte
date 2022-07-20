<script lang="ts">
  import type { MenuItem, OnRenderMenu } from '../../../../types'
  import Menu from '../../../controls/Menu.svelte'
  import { noop } from 'lodash-es'

  export let onRenderMenu: OnRenderMenu = noop

  const defaultItems: MenuItem[] = []

  let items: MenuItem[]
  $: items = onRenderMenu('table', defaultItems) || defaultItems
</script>

<Menu {items} />
