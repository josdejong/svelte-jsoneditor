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
  let copyFeedback: string | null = $state(null)

  async function copyJson(compact: boolean) {
    if (value === null || value === undefined) return
    const text = compact ? JSON.stringify(value) : JSON.stringify(value, null, 2)
    await navigator.clipboard.writeText(text)
    copyFeedback = compact ? 'Compact copied!' : 'Pretty copied!'
    setTimeout(() => { copyFeedback = null }, 1500)
  }

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
    <span class="diff-tree-actions">
      {#if copyFeedback}
        <span class="copy-feedback">{copyFeedback}</span>
      {:else}
        <button class="copy-btn" onclick={() => copyJson(false)} title="Copy pretty-printed JSON">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
          Pretty
        </button>
        <button class="copy-btn" onclick={() => copyJson(true)} title="Copy compact JSON">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>
          Compact
        </button>
      {/if}
    </span>
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--jse-diff-header-bg, #f6f8fa);
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    font-weight: 600;
    font-size: 13px;
  }

  .diff-tree-label {
    color: var(--jse-diff-header-color, #1f2328);
  }

  .diff-tree-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 4px;
    background: #fff;
    font-size: 11px;
    font-weight: 500;
    color: var(--jse-diff-label-color, #636c76);
    cursor: pointer;
  }

  .copy-btn:hover {
    background: var(--jse-diff-nav-hover-bg, #f3f4f6);
    color: var(--jse-diff-header-color, #1f2328);
  }

  .copy-feedback {
    font-size: 11px;
    font-weight: 500;
    color: #1a7f37;
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
