<svelte:options immutable={true} />

<script lang="ts">
  import { isEmpty, isEqual } from 'lodash-es'
  import type { JSONData, Path, SearchResultItem, Selection, TreeModeContext } from '../../../types'
  import { SearchField } from '../../../types'
  import { onDestroy } from 'svelte'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '../../../logic/selection'

  export let path: Path
  export let value: JSONData
  export let context: TreeModeContext
  export let enforceString: boolean
  export let selection: Selection | undefined

  $: pointer = compileJSONPointer(path)

  let searchResultItems: SearchResultItem[] | undefined = undefined

  const unsubscribe = context.documentStateStore.subscribe((state) => {
    // search results
    const items: SearchResultItem[] = state.searchResult?.itemsMap[pointer]?.filter(
      (item: SearchResultItem) => item.field === SearchField.value
    )
    const nonEmptyItems = !isEmpty(items) ? items : undefined
    if (!isEqual(nonEmptyItems, searchResultItems)) {
      searchResultItems = nonEmptyItems
    }
  })

  onDestroy(() => {
    unsubscribe()
  })

  $: isSelected = isValueSelection(selection) ? isEqual(selection.focusPath, path) : false

  $: isEditing = !context.readOnly && isValueSelection(selection) && isEditingSelection(selection)

  $: renderers = context.onRenderValue({
    path,
    value,
    readOnly: context.readOnly,
    enforceString,
    isSelected,
    isEditing,
    normalization: context.normalization,
    selection,
    searchResultItems,
    onPatch: context.onPatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
