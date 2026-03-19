<script lang="ts">
  import type { DiffLine } from '../../logic/diff.js'
  import DiffLineComponent from './DiffLine.svelte'

  interface Props {
    lines: DiffLine[]
    label: string
    side: 'left' | 'right'
    currentChangeIndex?: number
    changeIndices?: number[]
    changesOnly?: boolean
    onscroll?: (scrollTop: number) => void
  }

  let {
    lines,
    label,
    side,
    currentChangeIndex = -1,
    changeIndices = [],
    changesOnly = false,
    onscroll
  }: Props = $props()

  let scrollContainer: HTMLDivElement | undefined = $state(undefined)

  // ── Search ──────────────────────────────────────────────────────────
  let searchQuery = $state('')
  let searchIndex = $state(0)

  let searchLineMatches: number[] = $derived.by(() => {
    if (!searchQuery) return []
    const lq = searchQuery.toLowerCase()
    const matches: number[] = []
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].content.toLowerCase().includes(lq)) matches.push(i)
    }
    return matches
  })

  $effect(() => {
    if (searchIndex >= searchLineMatches.length) searchIndex = Math.max(0, searchLineMatches.length - 1)
  })

  $effect(() => {
    if (searchLineMatches.length > 0 && scrollContainer) {
      const lineIdx = searchLineMatches[searchIndex]
      if (lineIdx !== undefined) {
        requestAnimationFrame(() => {
          scrollToLine(lineIdx)
          handleScroll() // explicitly sync the other panel
        })
      }
    }
  })

  function searchPrev() {
    if (searchLineMatches.length === 0) return
    searchIndex = (searchIndex - 1 + searchLineMatches.length) % searchLineMatches.length
  }

  function searchNext() {
    if (searchLineMatches.length === 0) return
    searchIndex = (searchIndex + 1) % searchLineMatches.length
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) searchPrev(); else searchNext()
    }
    if (e.key === 'Escape') searchQuery = ''
  }
  // ── End search ──────────────────────────────────────────────────────

  // Filter to changes only with context lines
  let visibleLines = $derived.by(() => {
    if (!changesOnly) return lines

    const contextSize = 3
    const visible = new Set<number>()
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type !== 'equal') {
        for (let j = Math.max(0, i - contextSize); j <= Math.min(lines.length - 1, i + contextSize); j++) {
          visible.add(j)
        }
      }
    }

    return lines.map((line, i) => (visible.has(i) ? line : null)).filter((l): l is DiffLine => l !== null)
  })

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

  /**
   * Scroll to a specific line index in the table
   */
  export function scrollToLine(lineIndex: number) {
    if (!scrollContainer) return
    const lineHeight = 20
    const containerHeight = scrollContainer.clientHeight
    const targetTop = lineIndex * lineHeight
    const currentTop = scrollContainer.scrollTop

    // Only scroll if the target is not already in view
    if (targetTop < currentTop || targetTop > currentTop + containerHeight - lineHeight) {
      scrollContainer.scrollTop = targetTop - containerHeight / 3
    }
  }
</script>

<div class="diff-panel">
  <div class="diff-panel-header">
    <span class="diff-panel-label">{label}</span>
    <span class="search-box">
      <input
        class="search-input"
        type="text"
        placeholder="Search…"
        bind:value={searchQuery}
        onkeydown={handleSearchKeydown}
      />
      {#if searchQuery}
        <span class="search-count">
          {searchLineMatches.length > 0 ? `${searchIndex + 1}/${searchLineMatches.length}` : '0'}
        </span>
        <button class="search-nav" onclick={searchPrev} title="Previous (Shift+Enter)">&#x25B2;</button>
        <button class="search-nav" onclick={searchNext} title="Next (Enter)">&#x25BC;</button>
      {/if}
    </span>
  </div>
  <div class="diff-panel-scroll" bind:this={scrollContainer} onscroll={handleScroll}>
    <table class="diff-table">
      <tbody>
        {#each visibleLines as line, i (i)}
          <DiffLineComponent
            {line}
            {side}
            {searchQuery}
            isCurrent={changeIndices[currentChangeIndex] === (changesOnly ? i : i)}
          />
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .diff-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 6px;
  }

  .diff-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--jse-diff-header-bg, #f6f8fa);
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    font-weight: 600;
    font-size: 13px;
  }

  .diff-panel-label {
    color: var(--jse-diff-header-color, #1f2328);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .search-input {
    width: 120px;
    padding: 2px 6px;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 4px;
    font-size: 12px;
    font-weight: normal;
    outline: none;
  }

  .search-input:focus {
    border-color: var(--jse-diff-current-outline, #0969da);
    box-shadow: 0 0 0 1px var(--jse-diff-current-outline, #0969da);
  }

  .search-count {
    font-size: 11px;
    font-weight: normal;
    color: var(--jse-diff-label-color, #636c76);
    white-space: nowrap;
    min-width: 28px;
    text-align: center;
  }

  .search-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 3px;
    background: #fff;
    font-size: 8px;
    cursor: pointer;
    color: var(--jse-diff-label-color, #636c76);
  }

  .search-nav:hover {
    background: var(--jse-diff-nav-hover-bg, #f3f4f6);
    color: var(--jse-diff-header-color, #1f2328);
  }

  .diff-panel-scroll {
    flex: 1;
    overflow: auto;
  }

  .diff-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
</style>
