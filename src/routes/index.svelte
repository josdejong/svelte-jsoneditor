<script context="module" lang="ts">
  import DevelopmentApp from './development/DevelopmentApp.svelte'

  export const prerender = true
  export const ssr = true
</script>

<svelte:head>
  <title>svelte-jsoneditor development app</title>
</svelte:head>

<section>
  <DevelopmentApp />
</section>
