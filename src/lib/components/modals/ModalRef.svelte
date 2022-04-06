<svelte:options immutable={true} />

<script>
  // This component is to get a reference to the simple-modal context
  // containing open and close. Usage:
  //
  // <script>
  //   export let open
  //   export let close
  // < /script>
  //
  // <ModalRef bind:open bind:close />
  //
  import { getContext } from 'svelte'

  const context = getContext('simple-modal')

  export const open = context.open
  export const close = context.close
</script>
