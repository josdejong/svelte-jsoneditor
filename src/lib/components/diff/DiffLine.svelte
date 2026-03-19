<script lang="ts">
  import type { DiffLine } from '../../logic/diff.js'

  interface Props {
    line: DiffLine
    side: 'left' | 'right'
    isCurrent?: boolean
    searchQuery?: string
  }

  let { line, side, isCurrent = false, searchQuery = '' }: Props = $props()

  let rowClass = $derived(
    [
      'diff-row',
      line.type !== 'equal' ? `diff-${line.type}` : '',
      isCurrent ? 'diff-current' : ''
    ]
      .filter(Boolean)
      .join(' ')
  )

  function highlightSegments(text: string): Array<{ text: string; match: boolean }> {
    if (!searchQuery) return [{ text, match: false }]
    const lower = text.toLowerCase()
    const lq = searchQuery.toLowerCase()
    const segs: Array<{ text: string; match: boolean }> = []
    let last = 0
    let idx = lower.indexOf(lq)
    while (idx !== -1) {
      if (idx > last) segs.push({ text: text.slice(last, idx), match: false })
      segs.push({ text: text.slice(idx, idx + searchQuery.length), match: true })
      last = idx + searchQuery.length
      idx = lower.indexOf(lq, last)
    }
    if (last < text.length) segs.push({ text: text.slice(last), match: false })
    return segs.length > 0 ? segs : [{ text, match: false }]
  }
</script>

<tr class={rowClass}>
  <td class="line-number">
    {#if line.lineNumber !== null}
      {line.lineNumber}
    {/if}
  </td>
  <td class="line-content">
    {#if line.type === 'modified' && line.wordDiffs}
      {#each line.wordDiffs as wd}
        {#if wd.type === 'equal'}
          <span>{#each highlightSegments(wd.value) as seg}{#if seg.match}<mark class="search-mark">{seg.text}</mark>{:else}{seg.text}{/if}{/each}</span>
        {:else if wd.type === 'added' && side === 'right'}
          <span class="word-added">{#each highlightSegments(wd.value) as seg}{#if seg.match}<mark class="search-mark">{seg.text}</mark>{:else}{seg.text}{/if}{/each}</span>
        {:else if wd.type === 'removed' && side === 'left'}
          <span class="word-removed">{#each highlightSegments(wd.value) as seg}{#if seg.match}<mark class="search-mark">{seg.text}</mark>{:else}{seg.text}{/if}{/each}</span>
        {/if}
      {/each}
    {:else if line.lineNumber !== null}
      {#each highlightSegments(line.content) as seg}{#if seg.match}<mark class="search-mark">{seg.text}</mark>{:else}{seg.text}{/if}{/each}
    {/if}
  </td>
</tr>

<style>
  .diff-row {
    font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    line-height: 20px;
  }

  .line-number {
    width: 50px;
    min-width: 50px;
    padding: 0 8px;
    text-align: right;
    color: var(--jse-diff-line-number-color, #636c76);
    background: var(--jse-diff-gutter-bg, #f6f8fa);
    user-select: none;
    border-right: 1px solid var(--jse-diff-border-color, #d1d9e0);
    vertical-align: top;
  }

  .line-content {
    padding: 0 12px;
    white-space: pre;
    overflow: hidden;
  }

  .diff-added .line-number {
    background: var(--jse-diff-added-gutter-bg, #ccffd8);
  }

  .diff-added .line-content {
    background: var(--jse-diff-added-bg, #e6ffec);
  }

  .diff-removed .line-number {
    background: var(--jse-diff-removed-gutter-bg, #ffd7d5);
  }

  .diff-removed .line-content {
    background: var(--jse-diff-removed-bg, #ffebe9);
  }

  .diff-modified .line-number {
    background: var(--jse-diff-modified-gutter-bg, #ffedb3);
  }

  .diff-modified .line-content {
    background: var(--jse-diff-modified-bg, #fff8c5);
  }

  .diff-current .line-content {
    outline: 2px solid var(--jse-diff-current-outline, #0969da);
    outline-offset: -2px;
  }

  .word-added {
    background: var(--jse-diff-word-added-bg, #abf2bc);
    border-radius: 2px;
  }

  .word-removed {
    background: var(--jse-diff-word-removed-bg, #ff8182);
    border-radius: 2px;
  }

  :global(.search-mark) {
    background: #fff2a8;
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
