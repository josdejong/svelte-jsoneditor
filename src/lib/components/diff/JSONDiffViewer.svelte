<script lang="ts">
  import {
    computeJsonDiff,
    pruneToChanges,
    getKeyDiffSummary,
    type KeyInfo
  } from '../../logic/diff.js'
  import DiffPanel from './DiffPanel.svelte'
  import DiffControls from './DiffControls.svelte'
  import JSONEditor from '../JSONEditor.svelte'
  import { Mode } from '../../types.js'

  interface Props {
    leftJson: unknown
    rightJson: unknown
    leftLabel?: string
    rightLabel?: string
  }

  let { leftJson, rightJson, leftLabel = 'Left', rightLabel = 'Right' }: Props = $props()

  let activeTab: 'diff' | 'tree' = $state('diff')
  let changesOnly = $state(true)
  let selectedKey = $state('__all__')
  let activeChangeIndex = $state(0)

  // Key summary for the selector
  let keyInfos: KeyInfo[] = $derived.by(() => {
    if (
      leftJson &&
      typeof leftJson === 'object' &&
      !Array.isArray(leftJson) &&
      rightJson &&
      typeof rightJson === 'object' &&
      !Array.isArray(rightJson)
    ) {
      return getKeyDiffSummary(
        leftJson as Record<string, unknown>,
        rightJson as Record<string, unknown>
      )
    }
    return []
  })

  // Effective data: filter by key, then optionally prune
  let effectiveLeft = $derived.by(() => {
    let data = leftJson
    if (
      selectedKey !== '__all__' &&
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) {
      const obj = data as Record<string, unknown>
      data = selectedKey in obj ? { [selectedKey]: obj[selectedKey] } : {}
    }
    if (changesOnly && data && typeof data === 'object' && !Array.isArray(data)) {
      const right =
        selectedKey !== '__all__' && rightJson && typeof rightJson === 'object' && !Array.isArray(rightJson)
          ? (selectedKey in (rightJson as Record<string, unknown>)
              ? { [selectedKey]: (rightJson as Record<string, unknown>)[selectedKey] }
              : {})
          : rightJson
      return pruneToChanges(
        data as Record<string, unknown>,
        (right ?? {}) as Record<string, unknown>
      )[0]
    }
    return data
  })

  let effectiveRight = $derived.by(() => {
    let data = rightJson
    if (
      selectedKey !== '__all__' &&
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) {
      const obj = data as Record<string, unknown>
      data = selectedKey in obj ? { [selectedKey]: obj[selectedKey] } : {}
    }
    if (changesOnly && data && typeof data === 'object' && !Array.isArray(data)) {
      const left =
        selectedKey !== '__all__' && leftJson && typeof leftJson === 'object' && !Array.isArray(leftJson)
          ? (selectedKey in (leftJson as Record<string, unknown>)
              ? { [selectedKey]: (leftJson as Record<string, unknown>)[selectedKey] }
              : {})
          : leftJson
      return pruneToChanges(
        (left ?? {}) as Record<string, unknown>,
        data as Record<string, unknown>
      )[1]
    }
    return data
  })

  // Reactive diff on the effective (possibly pruned) data
  let diff = $derived(computeJsonDiff(effectiveLeft, effectiveRight))

  // Indices of change lines (non-equal) in the aligned arrays
  let changeIndices = $derived.by(() => {
    const indices: number[] = []
    for (let i = 0; i < diff.leftLines.length; i++) {
      if (diff.leftLines[i].type !== 'equal') {
        indices.push(i)
      }
    }
    return indices
  })

  // Synced scrolling
  let scrollGuard = false
  let leftPanel: DiffPanel | undefined = $state(undefined)
  let rightPanel: DiffPanel | undefined = $state(undefined)

  function handleLeftScroll(scrollTop: number) {
    if (scrollGuard) return
    scrollGuard = true
    rightPanel?.setScrollTop(scrollTop)
    requestAnimationFrame(() => {
      scrollGuard = false
    })
  }

  function handleRightScroll(scrollTop: number) {
    if (scrollGuard) return
    scrollGuard = true
    leftPanel?.setScrollTop(scrollTop)
    requestAnimationFrame(() => {
      scrollGuard = false
    })
  }

  function navigatePrev() {
    if (changeIndices.length === 0) return
    activeChangeIndex = (activeChangeIndex - 1 + changeIndices.length) % changeIndices.length
    scrollToCurrentChange()
  }

  function navigateNext() {
    if (changeIndices.length === 0) return
    activeChangeIndex = (activeChangeIndex + 1) % changeIndices.length
    scrollToCurrentChange()
  }

  function scrollToCurrentChange() {
    const lineIndex = changeIndices[activeChangeIndex]
    if (lineIndex !== undefined) {
      leftPanel?.scrollToLine(lineIndex)
      rightPanel?.scrollToLine(lineIndex)
    }
  }

  function toggleChangesOnly() {
    changesOnly = !changesOnly
    activeChangeIndex = 0
  }

  // Reset navigation when diff changes
  $effect(() => {
    diff
    activeChangeIndex = 0
  })

  // Content for tree mode (always full data, not pruned)
  let leftContent = $derived({ json: leftJson })
  let rightContent = $derived({ json: rightJson })
</script>

<div class="jse-diff-viewer">
  <div class="diff-toolbar">
    <div class="diff-tabs">
      <button
        class="diff-tab"
        class:active={activeTab === 'diff'}
        onclick={() => (activeTab = 'diff')}
      >
        Diff
      </button>
      <button
        class="diff-tab"
        class:active={activeTab === 'tree'}
        onclick={() => (activeTab = 'tree')}
      >
        Tree
      </button>
    </div>

    {#if keyInfos.length > 0}
      <div class="key-selector">
        <label for="key-select">Key:</label>
        <select id="key-select" bind:value={selectedKey}>
          <option value="__all__">All keys</option>
          {#each keyInfos as ki}
            <option value={ki.key}>
              {ki.key}{ki.status === 'added' ? ' [NEW]' : ki.status === 'removed' ? ' [REMOVED]' : ki.status === 'modified' ? ' *' : ''}
            </option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if activeTab === 'diff'}
    <div class="diff-container">
      <DiffPanel
        bind:this={leftPanel}
        lines={diff.leftLines}
        label={leftLabel}
        side="left"
        currentChangeIndex={activeChangeIndex}
        {changeIndices}
        changesOnly={false}
        onscroll={handleLeftScroll}
      />

      <DiffControls
        changeCount={diff.changeCount}
        currentIndex={activeChangeIndex}
        {changesOnly}
        onprev={navigatePrev}
        onnext={navigateNext}
        ontogglechangesonly={toggleChangesOnly}
      />

      <DiffPanel
        bind:this={rightPanel}
        lines={diff.rightLines}
        label={rightLabel}
        side="right"
        currentChangeIndex={activeChangeIndex}
        {changeIndices}
        changesOnly={false}
        onscroll={handleRightScroll}
      />
    </div>
  {:else}
    <div class="tree-container">
      <div class="tree-panel">
        <div class="tree-panel-header">{leftLabel}</div>
        <div class="tree-editor">
          <JSONEditor content={leftContent} readOnly={true} mode={Mode.tree} />
        </div>
      </div>
      <div class="tree-panel">
        <div class="tree-panel-header">{rightLabel}</div>
        <div class="tree-editor">
          <JSONEditor content={rightContent} readOnly={true} mode={Mode.tree} />
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .jse-diff-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--jse-diff-bg, #ffffff);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  }

  .diff-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    background: var(--jse-diff-toolbar-bg, #f6f8fa);
  }

  .diff-tabs {
    display: flex;
    gap: 2px;
    background: var(--jse-diff-tab-bg, #e8eaed);
    border-radius: 6px;
    padding: 2px;
  }

  .diff-tab {
    padding: 4px 16px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--jse-diff-tab-color, #636c76);
    transition: all 0.15s ease;
  }

  .diff-tab:hover {
    color: var(--jse-diff-tab-hover-color, #1f2328);
  }

  .diff-tab.active {
    background: var(--jse-diff-tab-active-bg, #ffffff);
    color: var(--jse-diff-tab-active-color, #1f2328);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .key-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .key-selector label {
    font-size: 13px;
    color: var(--jse-diff-label-color, #636c76);
  }

  .key-selector select {
    padding: 4px 8px;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 4px;
    font-size: 13px;
    background: #fff;
    color: var(--jse-diff-tab-active-color, #1f2328);
  }

  .diff-container {
    flex: 1;
    display: flex;
    gap: 0;
    padding: 12px;
    overflow: hidden;
  }

  .tree-container {
    flex: 1;
    display: flex;
    gap: 12px;
    padding: 12px;
    overflow: hidden;
  }

  .tree-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--jse-diff-border-color, #d1d9e0);
    border-radius: 6px;
    overflow: hidden;
  }

  .tree-panel-header {
    padding: 8px 12px;
    background: var(--jse-diff-header-bg, #f6f8fa);
    border-bottom: 1px solid var(--jse-diff-border-color, #d1d9e0);
    font-weight: 600;
    font-size: 13px;
  }

  .tree-editor {
    flex: 1;
    overflow: hidden;
  }
</style>
