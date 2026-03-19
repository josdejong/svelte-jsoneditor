<script lang="ts">
  interface Props {
    changeCount: number
    currentIndex: number
    changesOnly: boolean
    onprev: () => void
    onnext: () => void
    ontogglechangesonly: () => void
  }

  let { changeCount, currentIndex, changesOnly, onprev, onnext, ontogglechangesonly }: Props =
    $props()
</script>

<div class="diff-controls">
  <div class="diff-count">
    {#if changeCount === 0}
      <span class="no-changes">No differences</span>
    {:else}
      <span class="change-badge">{changeCount}</span>
      <span class="change-label">{changeCount === 1 ? 'change' : 'changes'}</span>
    {/if}
  </div>

  {#if changeCount > 0}
    <div class="diff-nav">
      <button class="nav-btn" onclick={onprev} title="Previous change" disabled={changeCount === 0}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 9.5L8 5l4.5 4.5-1 1L8 7l-3.5 3.5z" />
        </svg>
      </button>
      <span class="nav-position">{currentIndex + 1} / {changeCount}</span>
      <button class="nav-btn" onclick={onnext} title="Next change" disabled={changeCount === 0}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M12.5 6.5L8 11 3.5 6.5l1-1L8 9l3.5-3.5z" />
        </svg>
      </button>
    </div>

    <div class="diff-toggle">
      <label>
        <input type="checkbox" checked={changesOnly} onclick={ontogglechangesonly} />
        Changes only
      </label>
    </div>
  {/if}

  <div class="diff-legend">
    <span class="legend-item">
      <span class="legend-swatch legend-added"></span> Added
    </span>
    <span class="legend-item">
      <span class="legend-swatch legend-removed"></span> Removed
    </span>
    <span class="legend-item">
      <span class="legend-swatch legend-modified"></span> Modified
    </span>
  </div>
</div>

<style>
  .diff-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 12px 8px;
    min-width: 120px;
    user-select: none;
  }

  .diff-count {
    text-align: center;
  }

  .change-badge {
    display: inline-block;
    background: var(--jse-diff-badge-bg, #0969da);
    color: white;
    font-weight: 700;
    font-size: 18px;
    border-radius: 12px;
    min-width: 32px;
    padding: 2px 10px;
    text-align: center;
  }

  .change-label {
    display: block;
    font-size: 12px;
    color: var(--jse-diff-label-color, #636c76);
    margin-top: 2px;
  }

  .no-changes {
    font-size: 13px;
    color: var(--jse-diff-label-color, #636c76);
  }

  .diff-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 6px;
    background: white;
    cursor: pointer;
    color: var(--jse-diff-nav-color, #1f2328);
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--jse-diff-nav-hover-bg, #f3f4f6);
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .nav-position {
    font-size: 12px;
    color: var(--jse-diff-label-color, #636c76);
    min-width: 48px;
    text-align: center;
  }

  .diff-toggle label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--jse-diff-label-color, #636c76);
    cursor: pointer;
  }

  .diff-toggle input {
    margin: 0;
  }

  .diff-legend {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--jse-diff-label-color, #636c76);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-added {
    background: var(--jse-diff-added-bg, #e6ffec);
    border: 1px solid var(--jse-diff-added-gutter-bg, #ccffd8);
  }

  .legend-removed {
    background: var(--jse-diff-removed-bg, #ffebe9);
    border: 1px solid var(--jse-diff-removed-gutter-bg, #ffd7d5);
  }

  .legend-modified {
    background: var(--jse-diff-modified-bg, #fff8c5);
    border: 1px solid var(--jse-diff-modified-gutter-bg, #ffedb3);
  }
</style>
