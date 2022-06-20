<svelte:options immutable={true} />

<script lang="ts">
  import { SELECTION_TYPE } from '../../../logic/selection'
  import { isEmpty, isEqual } from 'lodash-es'
  import type { Path, SearchResultItem, Selection, TreeModeContext } from '../../../types'
  import { SearchField } from '../../../types'
  import { onDestroy } from 'svelte'
  import { compileJSONPointer } from 'immutable-json-patch'

  export let path: Path
  export let value: JSON

  export let context: TreeModeContext

  export let enforceString: boolean
  export let selection: Selection | undefined

  $: pointer = compileJSONPointer(path)

  let searchResultItems: SearchResultItem[] | undefined = undefined
  const unsubscribe = context.documentStateStore.subscribe((state) => {
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

  $: isSelected =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false

  $: isEditing = !context.readOnly && isSelected && selection && selection.edit === true

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
