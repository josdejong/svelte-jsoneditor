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
  </div>
  <div class="diff-panel-scroll" bind:this={scrollContainer} onscroll={handleScroll}>
    <table class="diff-table">
      <tbody>
        {#each visibleLines as line, i (i)}
          <DiffLineComponent
            {line}
            {side}
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
    padding: 8px 12px;
    background: var(--jse-diff-header-bg, #f6f8fa);
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    font-weight: 600;
    font-size: 13px;
  }

  .diff-panel-label {
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
