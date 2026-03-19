<script lang="ts">
  import DiffTreeNode from './DiffTreeNode.svelte'
  import type { StructuralDiffType } from '../../logic/structuralDiff.js'

  interface Props {
    value: unknown
    label: string
    diffMap: Map<string, StructuralDiffType>
    changedAncestors: Set<string>
    expandedPaths: Set<string>
    onToggleExpand: (path: string) => void
    activePath?: string | null
    onscroll?: (scrollTop: number) => void
  }

  let {
    value,
    label,
    diffMap,
    changedAncestors,
    expandedPaths,
    onToggleExpand,
    activePath = null,
    onscroll
  }: Props = $props()

  let scrollContainer: HTMLDivElement | undefined = $state(undefined)

  function handleScroll() {
    if (scrollContainer && onscroll) {
      onscroll(scrollContainer.scrollTop)
    }
  }

  export function setScrollTop(top: number) {
    if (scrollContainer && Math.abs(scrollContainer.scrollTop - top) > 1) {
      scrollContainer.scrollTop = top
    }
  }

  export function scrollToPath(path: string) {
    if (!scrollContainer) return
    // Escape quotes in path for attribute selector (JSON pointers can contain special chars)
    const escaped = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const el = scrollContainer.querySelector(`[data-path="${escaped}"]`)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }
</script>

<div class="diff-tree-panel">
  <div class="diff-tree-header">
    <span class="diff-tree-label">{label}</span>
  </div>
  <div class="diff-tree-scroll" bind:this={scrollContainer} onscroll={handleScroll}>
    <div class="diff-tree-content">
      {#if value !== null && value !== undefined}
        <DiffTreeNode
          {value}
          path=""
          level={0}
          keyName={null}
          {diffMap}
          {changedAncestors}
          {expandedPaths}
          {onToggleExpand}
          {activePath}
        />
      {:else}
        <div class="diff-tree-empty">No data</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .diff-tree-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 6px;
  }

  .diff-tree-header {
    padding: 8px 12px;
    background: var(--jse-diff-header-bg, #f6f8fa);
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    font-weight: 600;
    font-size: 13px;
  }

  .diff-tree-label {
    color: var(--jse-diff-header-color, #1f2328);
  }

  .diff-tree-scroll {
    flex: 1;
    overflow: auto;
    padding: 4px 0;
  }

  .diff-tree-content {
    min-width: fit-content;
  }

  .diff-tree-empty {
    padding: 16px;
    color: var(--jse-diff-label-color, #636c76);
    font-size: 13px;
    text-align: center;
  }
</style>
