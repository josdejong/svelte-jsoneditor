<script lang="ts">
  import type { DiffLine } from '../../logic/diff.js'

  interface Props {
    line: DiffLine
    side: 'left' | 'right'
    isCurrent?: boolean
  }

  let { line, side, isCurrent = false }: Props = $props()

  let rowClass = $derived(
    [
      'diff-row',
      line.type !== 'equal' ? `diff-${line.type}` : '',
      isCurrent ? 'diff-current' : ''
    ]
      .filter(Boolean)
      .join(' ')
  )
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
          <span>{wd.value}</span>
        {:else if wd.type === 'added' && side === 'right'}
          <span class="word-added">{wd.value}</span>
        {:else if wd.type === 'removed' && side === 'left'}
          <span class="word-removed">{wd.value}</span>
        {/if}
      {/each}
    {:else if line.lineNumber !== null}
      {line.content}
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
</style>
