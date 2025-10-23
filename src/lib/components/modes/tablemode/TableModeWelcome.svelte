<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { getIn, isJSONArray, isJSONObject } from 'immutable-json-patch'
  import type { JSONParser, OnChangeMode } from '$lib/types.js'
  import { Mode } from '$lib/types.js'
  import { valueType } from '$lib/utils/typeUtils.js'
  import { findNestedArrays } from '$lib/logic/table.js'
  import { t } from '$lib/i18n'
  import { isEmpty } from 'lodash-es'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'

  interface Props {
    text: string | undefined
    json: unknown | undefined
    readOnly: boolean
    parser: JSONParser
    openJSONEditorModal: (path: JSONPath) => void
    extractPath: (path: JSONPath) => void
    onChangeMode: OnChangeMode
    onClick: () => void
  }

  const {
    text,
    json,
    readOnly,
    parser,
    openJSONEditorModal,
    extractPath,
    onChangeMode,
    onClick
  }: Props = $props()

  const nestedArrayPaths: JSONPath[] = $derived(
    json
      ? findNestedArrays(json)
          .slice(0, 99)
          .filter((path) => path.length > 0)
      : []
  )
  const hasNestedArrays = $derived(!isEmpty(nestedArrayPaths))
  const isEmptyDocument = $derived(json === undefined && (text === '' || text === undefined))

  const documentType = $derived(
    hasNestedArrays
      ? t('objectWithNestedArrays')
      : isEmptyDocument
        ? t('emptyDocument')
        : isJSONObject(json)
          ? t('anObject')
          : isJSONArray(json)
            ? t('emptyArray') // note: can also be an array with objects but without properties
            : t('withValueType', { valueType: valueType(json, parser) })
  )

  function countItems(nestedArrayPath: JSONPath): number {
    return (getIn(json, nestedArrayPath) as JSONPath).length
  }
</script>

<div class="jse-table-mode-welcome" onclick={() => onClick()} role="none">
  <div class="jse-space jse-before"></div>

  <div class="jse-nested-arrays">
    <div class="jse-nested-arrays-title">{documentType}</div>
    <div class="jse-nested-arrays-info">
      {#if hasNestedArrays}
        {t('messageObjectCannotBeOpenedInTableMode')}
      {:else if isEmptyDocument && !readOnly}
        {t('messageEmptyDocCannotBeOpenedInTableMode')} <b>Ctrl+V</b>.
      {:else}
        {t('messageDocTypeCannotBeOpenedInTableMode', { doc: documentType })}
      {/if}
    </div>
    {#each nestedArrayPaths as nestedArrayPath}
      {@const count = countItems(nestedArrayPath)}

      <div class="jse-nested-property">
        <div class="jse-nested-property-path">
          "{stringifyJSONPath(nestedArrayPath)}"
          <span class="jse-nested-property-count">({count} {count !== 1 ? 'items' : 'item'})</span>
        </div>

        <button
          type="button"
          class="jse-nested-array-action"
          onclick={() => openJSONEditorModal(nestedArrayPath)}
        >
          {readOnly ? t('View') : t('Edit')}
        </button>
        {#if !readOnly}
          <button
            type="button"
            class="jse-nested-array-action"
            onclick={() => extractPath(nestedArrayPath)}
          >
            {t('Extract')}
          </button>
        {/if}
      </div>
    {/each}
    <button type="button" class="jse-nested-array-action" onclick={() => onChangeMode(Mode.tree)}>
      {t('switchToTextMode')}
    </button>
  </div>

  <div class="jse-space jse-after"></div>
</div>

<style src="./TableModeWelcome.scss"></style>
