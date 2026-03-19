<script lang="ts">
  import {
    computeJsonDiff,
    pruneToChanges,
    getKeyDiffSummary,
    type KeyInfo
  } from '../../logic/diff.js'
  import { computeStructuralDiff } from '../../logic/structuralDiff.js'
  import DiffPanel from './DiffPanel.svelte'
  import DiffTreePanel from './DiffTreePanel.svelte'
  import DiffControls from './DiffControls.svelte'

  interface Props {
    leftJson: unknown
    rightJson: unknown
    leftLabel?: string
    rightLabel?: string
  }

  let { leftJson, rightJson, leftLabel = 'Left', rightLabel = 'Right' }: Props = $props()

  let activeTab: 'tree' | 'text' = $state('tree')
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

  // ── Structural diff (tree mode) ──────────────────────────────────
  let structuralDiff = $derived(computeStructuralDiff(effectiveLeft, effectiveRight))

  // Shared expand state for both tree panels
  let expandedPaths: Set<string> = $state(new Set(['']))

  // Auto-expand root when data changes
  $effect(() => {
    // Reset expand state when data changes
    effectiveLeft
    effectiveRight
    expandedPaths = new Set([''])
  })

  function handleToggleExpand(path: string) {
    const next = new Set(expandedPaths)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    expandedPaths = next
  }

  // Active change path for tree navigation
  let activeChangePath = $derived(
    structuralDiff.changedPaths[activeChangeIndex] ?? null
  )

  // ── Text diff (text mode) ────────────────────────────────────────
  let textDiff = $derived(computeJsonDiff(effectiveLeft, effectiveRight))

  let textChangeIndices = $derived.by(() => {
    const indices: number[] = []
    for (let i = 0; i < textDiff.leftLines.length; i++) {
      if (textDiff.leftLines[i].type !== 'equal') {
        indices.push(i)
      }
    }
    return indices
  })

  // ── Shared state ─────────────────────────────────────────────────

  // Use structural diff for change count/navigation in tree mode,
  // text diff for text mode
  let changeCount = $derived(
    activeTab === 'tree' ? structuralDiff.changeCount : textDiff.changeCount
  )

  // Synced scrolling — deliberately NOT $state to avoid reactivity on a reentrancy guard
  let scrollGuard = false
  let leftTreePanel: DiffTreePanel | undefined = $state(undefined)
  let rightTreePanel: DiffTreePanel | undefined = $state(undefined)

  // Synced scrolling (text panels)
  let leftTextPanel: DiffPanel | undefined = $state(undefined)
  let rightTextPanel: DiffPanel | undefined = $state(undefined)

  function handleLeftScroll(scrollTop: number) {
    if (scrollGuard) return
    scrollGuard = true
    if (activeTab === 'tree') {
      rightTreePanel?.setScrollTop(scrollTop)
    } else {
      rightTextPanel?.setScrollTop(scrollTop)
    }
    requestAnimationFrame(() => {
      scrollGuard = false
    })
  }

  function handleRightScroll(scrollTop: number) {
    if (scrollGuard) return
    scrollGuard = true
    if (activeTab === 'tree') {
      leftTreePanel?.setScrollTop(scrollTop)
    } else {
      leftTextPanel?.setScrollTop(scrollTop)
    }
    requestAnimationFrame(() => {
      scrollGuard = false
    })
  }

  function navigatePrev() {
    if (activeTab === 'tree') {
      if (structuralDiff.changedPaths.length === 0) return
      activeChangeIndex =
        (activeChangeIndex - 1 + structuralDiff.changedPaths.length) %
        structuralDiff.changedPaths.length
      expandToChange()
    } else {
      if (textChangeIndices.length === 0) return
      activeChangeIndex =
        (activeChangeIndex - 1 + textChangeIndices.length) % textChangeIndices.length
      scrollToTextChange()
    }
  }

  function navigateNext() {
    if (activeTab === 'tree') {
      if (structuralDiff.changedPaths.length === 0) return
      activeChangeIndex =
        (activeChangeIndex + 1) % structuralDiff.changedPaths.length
      expandToChange()
    } else {
      if (textChangeIndices.length === 0) return
      activeChangeIndex = (activeChangeIndex + 1) % textChangeIndices.length
      scrollToTextChange()
    }
  }

  function expandToChange() {
    const path = structuralDiff.changedPaths[activeChangeIndex]
    if (!path) return

    // Expand all ancestor paths so the change is visible
    const next = new Set(expandedPaths)
    let pos = 0
    next.add('')
    while (true) {
      const nextSlash = path.indexOf('/', pos + 1)
      if (nextSlash === -1) break
      next.add(path.substring(0, nextSlash))
      pos = nextSlash
    }
    expandedPaths = next

    // Scroll to the change after DOM update
    requestAnimationFrame(() => {
      leftTreePanel?.scrollToPath(path)
      rightTreePanel?.scrollToPath(path)
    })
  }

  function scrollToTextChange() {
    const lineIndex = textChangeIndices[activeChangeIndex]
    if (lineIndex !== undefined) {
      leftTextPanel?.scrollToLine(lineIndex)
      rightTextPanel?.scrollToLine(lineIndex)
    }
  }

  function toggleChangesOnly() {
    changesOnly = !changesOnly
    activeChangeIndex = 0
  }

  // Reset navigation when diff changes
  $effect(() => {
    structuralDiff
    textDiff
    activeChangeIndex = 0
  })
</script>

<div class="jse-diff-viewer">
  <div class="diff-toolbar">
    <div class="diff-tabs">
      <button
        class="diff-tab"
        class:active={activeTab === 'tree'}
        onclick={() => { activeTab = 'tree'; activeChangeIndex = 0 }}
      >
        Tree
      </button>
      <button
        class="diff-tab"
        class:active={activeTab === 'text'}
        onclick={() => { activeTab = 'text'; activeChangeIndex = 0 }}
      >
        Text
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

  {#if activeTab === 'tree'}
    <div class="diff-container">
      <DiffTreePanel
        bind:this={leftTreePanel}
        value={effectiveLeft}
        label={leftLabel}
        diffMap={structuralDiff.changes}
        changedAncestors={structuralDiff.changedAncestors}
        {expandedPaths}
        onToggleExpand={handleToggleExpand}
        activePath={activeChangePath}
        onscroll={handleLeftScroll}
      />

      <DiffControls
        {changeCount}
        currentIndex={activeChangeIndex}
        {changesOnly}
        onprev={navigatePrev}
        onnext={navigateNext}
        ontogglechangesonly={toggleChangesOnly}
      />

      <DiffTreePanel
        bind:this={rightTreePanel}
        value={effectiveRight}
        label={rightLabel}
        diffMap={structuralDiff.changes}
        changedAncestors={structuralDiff.changedAncestors}
        {expandedPaths}
        onToggleExpand={handleToggleExpand}
        activePath={activeChangePath}
        onscroll={handleRightScroll}
      />
    </div>
  {:else}
    <div class="diff-container">
      <DiffPanel
        bind:this={leftTextPanel}
        lines={textDiff.leftLines}
        label={leftLabel}
        side="left"
        currentChangeIndex={activeChangeIndex}
        changeIndices={textChangeIndices}
        changesOnly={false}
        onscroll={handleLeftScroll}
      />

      <DiffControls
        changeCount={textDiff.changeCount}
        currentIndex={activeChangeIndex}
        {changesOnly}
        onprev={navigatePrev}
        onnext={navigateNext}
        ontogglechangesonly={toggleChangesOnly}
      />

      <DiffPanel
        bind:this={rightTextPanel}
        lines={textDiff.rightLines}
        label={rightLabel}
        side="right"
        currentChangeIndex={activeChangeIndex}
        changeIndices={textChangeIndices}
        changesOnly={false}
        onscroll={handleRightScroll}
      />
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
</style>
