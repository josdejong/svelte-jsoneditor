<script>
  import JSONDiffViewer from '$lib/components/diff/JSONDiffViewer.svelte'

  let { data } = $props()

  let selectedIndex = $state(0)

  let currentFile = $derived(data.files[selectedIndex])
  let leftJson = $derived(currentFile?.baseJson ?? {})
  let rightJson = $derived(currentFile?.headJson ?? {})
</script>

<svelte:head>
  <title>PR #{data.prNumber} — {data.prTitle}</title>
</svelte:head>

<h1>PR #{data.prNumber} — {data.prTitle}</h1>

<p>Comparing {data.baseRef} &rarr; {data.headRef}</p>

<div class="file-tabs">
  {#each data.files as file, i}
    <button
      class="file-tab"
      class:active={selectedIndex === i}
      onclick={() => (selectedIndex = i)}
    >
      {file.path}
    </button>
  {/each}
</div>

{#if data.files.length === 0}
  <p class="empty">No script files changed in this PR.</p>
{:else}
  <div class="viewer">
    <JSONDiffViewer {leftJson} {rightJson} leftLabel={data.baseRef} rightLabel={data.headRef} />
  </div>
{/if}

<style>
  .viewer {
    width: 100%;
    height: calc(100vh - 160px);
    min-height: 500px;
  }

  h1 {
    margin: 16px 0 8px;
  }

  p {
    margin: 0 0 12px;
    color: #636c76;
    font-size: 14px;
  }

  .empty {
    padding: 24px;
    text-align: center;
  }

  .file-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .file-tab {
    padding: 6px 14px;
    cursor: pointer;
    border: 1px solid #d1d5da;
    border-radius: 6px;
    background: #fff;
    font-size: 13px;
    color: #57606a;
    transition: all 0.15s;
  }

  .file-tab:hover {
    background: #f0f0f0;
  }

  .file-tab.active {
    background: #0969da;
    color: #fff;
    border-color: #0969da;
    font-weight: 600;
  }
</style>
