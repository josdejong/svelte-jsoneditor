<svelte:options immutable={true} />

<script>
  import { isEqual } from 'lodash-es'
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { isBoolean, isColor, isTimestamp } from '$lib/utils/typeUtils'
  import BooleanToggle from './value/BooleanToggle.svelte'
  import Timestamp from './value/Timestamp.svelte'
  import Color from './value/Color.svelte'
  import EditableDiv from './value/EditableDiv.svelte'
  import ReadonlyDiv from './value/ReadonlyDiv.svelte'

  export let path
  export let value
  export let readOnly
  export let onPatch
  export let selection
  export let onSelect
  export let onPasteJson

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  $: isSelected =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false
  $: isEditing = !readOnly && isSelected && selection && selection.edit === true
</script>

<!-- TODO: create an API to customize rendering of a value -->

{#if !isEditing && isBoolean(value)}
  <BooleanToggle {path} {value} {onPatch} />
{/if}

{#if !isEditing && isColor(value)}
  <Color {path} {value} {onPatch} {readOnly} />
{/if}

{#if isEditing}
  <EditableDiv {path} {value} {onPasteJson} {onPatch} {onSelect} />
{/if}

{#if !isEditing}
  <ReadonlyDiv {path} {value} {readOnly} {searchResult} {onSelect} />
{/if}

{#if !isEditing && isTimestamp(value)}
  <Timestamp {value} />
{/if}
