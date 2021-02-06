<script>
  import {
    faFilter,
    faRedo,
    faSortAmountDownAlt,
    faUndo
  } from '@fortawesome/free-solid-svg-icons'
  import {
    faJSONEditorCompact,
    faJSONEditorFormat
  } from '../../img/customFontawesomeIcons.js'
  import Menu from '../controls/Menu.svelte'

  export let readOnly = false
  export let onFormat
  export let onCompact
  export let onSort
  export let onTransform
  export let onUndo
  export let onRedo
  export let canUndo
  export let canRedo
  export let onCreateMenu = () => {}

  /* @type {MenuItem[]} */
  $: defaultItems = [
    {
      icon: faJSONEditorFormat,
      title: 'Format JSON: add proper indentation and new lines (Ctrl+\\)',
      className: 'format',
      onClick: onFormat,
      disabled: readOnly
    },
    {
      icon: faJSONEditorCompact,
      title: 'Compact JSON: remove all white spacing and new lines (Ctrl+Shift+\\)',
      className: 'compact',
      onClick: onCompact,
      disabled: readOnly
    },
    {
      separator: true
    },
    {
      icon: faSortAmountDownAlt,
      title: 'Sort',
      className: 'sort',
      onClick: onSort,
      disabled: readOnly
    },
    {
      icon: faFilter,
      title: 'Transform contents (filter, sort, project)',
      className: 'transform',
      onClick: onTransform,
      disabled: readOnly
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
    },
  ]

  $: items = onCreateMenu('code', defaultItems) || defaultItems
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
