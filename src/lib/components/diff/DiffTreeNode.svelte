<script lang="ts">
  import { escapePointer, type StructuralDiffType } from '../../logic/structuralDiff.js'
  import DiffTreeNode from './DiffTreeNode.svelte'

  interface Props {
    value: unknown
    path: string
    level: number
    keyName: string | number | null
    diffMap: Map<string, StructuralDiffType>
    changedAncestors: Set<string>
    expandedPaths: Set<string>
    onToggleExpand: (path: string) => void
    activePath?: string | null
  }

  let {
    value,
    path,
    level,
    keyName,
    diffMap,
    changedAncestors,
    expandedPaths,
    onToggleExpand,
    activePath = null
  }: Props = $props()

  let isObject = $derived(
    value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
  )
  let isArray = $derived(Array.isArray(value))
  let isExpandable = $derived(isObject || isArray)
  let expanded = $derived(expandedPaths.has(path))

  let diffType = $derived(diffMap.get(path) ?? null)
  let hasChangedDescendants = $derived(changedAncestors.has(path))
  let isActive = $derived(activePath === path)

  // Object/array children
  let objectKeys = $derived(isObject ? Object.keys(value as Record<string, unknown>) : [])
  let arrayItems = $derived(isArray ? (value as unknown[]) : [])
  let childCount = $derived(isObject ? objectKeys.length : isArray ? arrayItems.length : 0)

  function formatValue(val: unknown): string {
    if (val === null) return 'null'
    if (val === undefined) return 'undefined'
    if (typeof val === 'string') return JSON.stringify(val)
    if (typeof val === 'boolean') return String(val)
    if (typeof val === 'number') return String(val)
    return String(val)
  }

  function getValueTypeClass(val: unknown): string {
    if (val === null) return 'jse-null'
    if (typeof val === 'string') return 'jse-string'
    if (typeof val === 'number') return 'jse-number'
    if (typeof val === 'boolean') return 'jse-boolean'
    return ''
  }

  function getDiffClass(): string {
    if (diffType === 'added') return 'diff-added'
    if (diffType === 'removed') return 'diff-removed'
    if (diffType === 'modified') return 'diff-modified'
    if (hasChangedDescendants) return 'diff-ancestor'
    return ''
  }

  function handleToggle(event: Event) {
    event.stopPropagation()
    onToggleExpand(path)
  }
</script>

<div
  class="diff-tree-node {getDiffClass()}"
  class:diff-active={isActive}
  style:--level={level}
  data-path={path}
>
  {#if isExpandable}
    <!-- Object or Array node -->
    <div class="node-header" role="button" tabindex="0" onclick={handleToggle} onkeydown={(e) => e.key === 'Enter' && handleToggle(e)}>
      <button type="button" class="node-expand" onclick={handleToggle} aria-label={expanded ? 'Collapse' : 'Expand'}>
        <svg class="caret" class:expanded width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4l4 4-4 4z" />
        </svg>
      </button>

      {#if keyName !== null}
        <span class="node-key">
          {#if typeof keyName === 'number'}
            <span class="node-index">{keyName}</span>
          {:else}
            <span class="node-prop">{keyName}</span>
          {/if}
          <span class="node-separator">:</span>
        </span>
      {/if}

      {#if !expanded}
        <!-- Collapsed summary -->
        <span class="node-meta">
          <span class="node-bracket">{isArray ? '[' : '{'}</span>
          <span class="node-tag">{childCount} {isArray ? (childCount === 1 ? 'item' : 'items') : (childCount === 1 ? 'prop' : 'props')}</span>
          <span class="node-bracket">{isArray ? ']' : '}'}</span>
        </span>
      {:else}
        <!-- Expanded header -->
        <span class="node-meta">
          <span class="node-bracket">{isArray ? '[' : '{'}</span>
          <span class="node-tag expanded-tag">{childCount} {isArray ? (childCount === 1 ? 'item' : 'items') : (childCount === 1 ? 'prop' : 'props')}</span>
        </span>
      {/if}
    </div>

    {#if expanded}
      <div class="node-children">
        {#if isArray}
          {#each arrayItems as item, i (i)}
            <DiffTreeNode
              value={item}
              path={path + '/' + i}
              level={level + 1}
              keyName={i}
              {diffMap}
              {changedAncestors}
              {expandedPaths}
              {onToggleExpand}
              {activePath}
            />
          {/each}
        {:else}
          {#each objectKeys as key (key)}
            <DiffTreeNode
              value={(value as Record<string, unknown>)[key]}
              path={path + '/' + escapePointer(key)}
              level={level + 1}
              keyName={key}
              {diffMap}
              {changedAncestors}
              {expandedPaths}
              {onToggleExpand}
              {activePath}
            />
          {/each}
        {/if}
      </div>

      <!-- Closing bracket -->
      <div class="node-footer" style:--level={level}>
        <span class="node-bracket">{isArray ? ']' : '}'}</span>
      </div>
    {/if}
  {:else}
    <!-- Scalar value -->
    <div class="node-leaf">
      {#if keyName !== null}
        <span class="node-key">
          {#if typeof keyName === 'number'}
            <span class="node-index">{keyName}</span>
          {:else}
            <span class="node-prop">{keyName}</span>
          {/if}
          <span class="node-separator">:</span>
        </span>
      {/if}
      <span class="node-value {getValueTypeClass(value)}">{formatValue(value)}</span>
    </div>
  {/if}
</div>

<style>
  .diff-tree-node {
    font-family: 'SF Mono', 'Consolas', 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    line-height: 22px;
  }

  .node-header {
    display: flex;
    align-items: center;
    padding-left: calc(var(--level, 0) * 18px);
    cursor: pointer;
    user-select: none;
    border-radius: 2px;
  }

  .node-header:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .node-leaf {
    display: flex;
    align-items: center;
    padding-left: calc(var(--level, 0) * 18px + 20px);
  }

  .node-footer {
    padding-left: calc(var(--level, 0) * 18px + 20px);
  }

  .node-expand {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--jse-delimiter-color, rgba(0, 0, 0, 0.38));
    flex-shrink: 0;
  }

  .node-expand:hover {
    color: var(--jse-key-color, #1a1a1a);
  }

  .caret {
    transition: transform 0.1s ease;
  }

  .caret.expanded {
    transform: rotate(90deg);
  }

  .node-key {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .node-prop {
    color: var(--jse-key-color, #1a1a1a);
  }

  .node-index {
    color: var(--jse-delimiter-color, rgba(0, 0, 0, 0.38));
  }

  .node-separator {
    color: var(--jse-delimiter-color, rgba(0, 0, 0, 0.38));
    margin: 0 4px 0 2px;
  }

  .node-meta {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .node-bracket {
    color: var(--jse-delimiter-color, rgba(0, 0, 0, 0.38));
    font-weight: normal;
  }

  .node-tag {
    display: inline-block;
    padding: 0 4px;
    border-radius: 2px;
    font-size: 80%;
    background: var(--jse-tag-background, rgba(0, 0, 0, 0.2));
    color: var(--jse-tag-color, #fff);
    line-height: 1.4;
  }

  .expanded-tag {
    opacity: 0.7;
  }

  .node-value {
    color: var(--jse-value-color, #1a1a1a);
  }

  .node-value.jse-string {
    color: var(--jse-value-color-string, #008000);
  }

  .node-value.jse-number {
    color: var(--jse-value-color-number, #ee422e);
  }

  .node-value.jse-boolean {
    color: var(--jse-value-color-boolean, #ff8c00);
  }

  .node-value.jse-null {
    color: var(--jse-value-color-null, #004ed0);
  }

  /* Diff highlighting */
  .diff-added > .node-header,
  .diff-added > .node-leaf {
    background-color: var(--jse-diff-added-bg, #e6ffec);
  }

  .diff-removed > .node-header,
  .diff-removed > .node-leaf {
    background-color: var(--jse-diff-removed-bg, #ffebe9);
  }

  .diff-modified > .node-header,
  .diff-modified > .node-leaf {
    background-color: var(--jse-diff-modified-bg, #fff8c5);
  }

  .diff-ancestor > .node-header {
    border-left: 3px solid var(--jse-diff-modified-gutter-bg, #e8a735);
    background-color: rgba(255, 237, 179, 0.15);
  }

  .diff-active > .node-header,
  .diff-active > .node-leaf {
    outline: 2px solid var(--jse-diff-current-outline, #0969da);
    outline-offset: -1px;
  }
</style>
