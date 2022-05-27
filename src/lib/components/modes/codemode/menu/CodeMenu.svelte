<svelte:options immutable={true} />

<script lang="ts">
  import {
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import { faJSONEditorCompact, faJSONEditorFormat } from '$lib/img/customFontawesomeIcons'
  import Menu from '../../../controls/Menu.svelte'
  import { noop } from 'lodash-es'

  export let readOnly = false
  export let onFormat
  export let onCompact
  export let onSort
  export let onTransform
  export let onToggleSearch
  export let onUndo
  export let onRedo
  export let canUndo
  export let canRedo
  export let canFormat
  export let canCompact
  export let canSort
  export let canTransform
  export let onRenderMenu = noop

  /* @type {MenuItem[]} */
  $: defaultItems = !readOnly
    ? [
        {
          icon: faJSONEditorFormat,
          title: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
          className: 'jse-format',
          onClick: onFormat,
          disabled: readOnly || !canFormat
        },
        {
          icon: faJSONEditorCompact,
          title: 'Compact JSON: remove all white spacing and new lines (Ctrl+Shift+I)',
          className: 'jse-compact',
          onClick: onCompact,
          disabled: readOnly || !canCompact
        },
        {
          separator: true
        },
        {
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'jse-sort',
          onClick: onSort,
          disabled: readOnly || !canSort
        },
        {
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'jse-transform',
          onClick: onTransform,
          disabled: readOnly || !canTransform
        },
        {
          icon: faSearch,
          title: 'Search (Ctrl+F)',
          className: 'jse-search',
          onClick: onToggleSearch
        },
        {
          separator: true
        },
        {
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'jse-undo',
          onClick: onUndo,
          disabled: !canUndo
        },
        {
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'jse-redo',
          onClick: onRedo,
          disabled: !canRedo
        },
        {
          space: true
        }
      ]
    : [
        {
          space: true
        }
      ]

  $: items = onRenderMenu('code', defaultItems) || defaultItems
</script>

<Menu {items}>
  <div slot="right" class="jse-powered-by">
    <a
      href="https://codemirror.net/6/"
      target="_blank"
      rel="noopener noreferrer"
      title="Code mode is powered by CodeMirror"
    >
      powered by CodeMirror
    </a>
  </div>
</Menu>

<style src="./CodeMenu.scss"></style>
