<script>
  import {
    faFilter,
    faRedo,
    faSearch,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import {
    faJSONEditorCompact,
    faJSONEditorFormat
  } from '../../../../img/customFontawesomeIcons.js'
  import Menu from '../../../controls/Menu.svelte'

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
  export let onRenderMenu = () => {}

  /* @type {MenuItem[]} */
  $: defaultItems = !readOnly
    ? [
        {
          icon: faJSONEditorFormat,
          title: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
          className: 'format',
          onClick: onFormat,
          disabled: readOnly || !canFormat
        },
        {
          icon: faJSONEditorCompact,
          title: 'Compact JSON: remove all white spacing and new lines (Ctrl+Shift+I)',
          className: 'compact',
          onClick: onCompact,
          disabled: readOnly || !canCompact
        },
        {
          separator: true
        },
        {
          icon: faSortAmountDownAlt,
          title: 'Sort',
          className: 'sort',
          onClick: onSort,
          disabled: readOnly || !canSort
        },
        {
          icon: faFilter,
          title: 'Transform contents (filter, sort, project)',
          className: 'transform',
          onClick: onTransform,
          disabled: readOnly || !canTransform
        },
        {
          icon: faSearch,
          title: 'Search (Ctrl+F)',
          className: 'search',
          onClick: onToggleSearch
        },
        {
          separator: true
        },
        {
          icon: faUndo,
          title: 'Undo (Ctrl+Z)',
          className: 'undo',
          onClick: onUndo,
          disabled: !canUndo
        },
        {
          icon: faRedo,
          title: 'Redo (Ctrl+Shift+Z)',
          className: 'redo',
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

<Menu items={items}>
  <div slot="right" class="powered-by">
    <a
      href="https://ace.c9.io/"
      target="_blank"
      rel='noopener noreferrer'
      title='Code mode is powered by Ace editor'
    >
      powered by ace
    </a>
  </div>
</Menu>

<style src="./CodeMenu.scss"></style>
