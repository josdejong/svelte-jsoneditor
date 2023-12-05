<svelte:options immutable={true}/>

<script lang="ts">
    import {
        faArrowRightArrowLeft,
        faCaretSquareDown,
        faCaretSquareUp,
        faClone,
        faCopy,
        faCropAlt,
        faCut,
        faFilter,
        faPaste,
        faPen,
        faPlus,
        faSortAmountDownAlt,
        faTrashCan,
        faBan, faSort
    } from '@fortawesome/free-solid-svg-icons'
    import type {JSONValue} from 'immutable-json-patch'
    import {compileJSONPointer, getIn} from 'immutable-json-patch'
    import {initial, isEmpty} from 'lodash-es'
    import {
        canConvert,
        isKeySelection,
        isMultiSelection,
        isValueSelection,
        singleItemSelected
    } from '$lib/logic/selection.js'
    import {isObject, isObjectOrArray} from '$lib/utils/typeUtils.js'
    import {faCheckSquare, faSquare} from '@fortawesome/free-regular-svg-icons'
    import type {ContextMenuItem, DocumentState, JSONParser} from '$lib/types'
    import {getEnforceString} from '$lib/logic/documentState.js'
    import ContextMenu from '../../../../components/controls/contextmenu/ContextMenu.svelte'
    import type {CompareConfigType} from "$lib/types";

    export let json: JSONValue
    export let documentState: DocumentState
    export let parser: JSONParser

    export let language: "en" | "cn"
    export let onIgnoreKey: ((type?: CompareConfigType) => void) | undefined
    export let onIgnoreKeyMono: (() => void) | undefined
    export let onSortKey: (() => void) | undefined
    export let onReferenceKey: (() => void) | undefined
    export let onCompressKey: (() => void) | undefined
    export let onDiffMatch: (() => void) | undefined
    export let onNodeDecode: (() => void) | undefined

    export let onCloseContextMenu
    export let onEditKey
    export let onEditValue
    export let onToggleEnforceString
    export let onCut
    export let onCopy
    export let onPaste
    export let onRemove
    export let onDuplicate
    export let onExtract
    export let onInsertBefore
    export let onInsert
    export let onConvert
    export let onInsertAfter
    export let onSort
    export let onTransform

    $: selection = documentState.selection

    $: hasJson = json !== undefined
    $: hasSelection = selection != null
    $: rootSelected = hasSelection && isEmpty(selection.focusPath)
    $: focusValue = hasSelection ? getIn(json, selection.focusPath) : undefined
    $: editValueText = Array.isArray(focusValue)
        ? 'Edit array'
        : isObject(focusValue)
            ? 'Edit object'
            : 'Edit value'

    $: hasSelectionContents =
        hasJson &&
        (isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection))

    $: canDuplicate = hasJson && hasSelectionContents && !rootSelected // must not be root

    $: canExtract =
        hasJson &&
        selection != null &&
        (isMultiSelection(selection) || isValueSelection(selection)) &&
        !rootSelected // must not be root

    $: canEditKey =
        hasJson &&
        selection != null &&
        singleItemSelected(selection) &&
        !rootSelected &&
        !Array.isArray(getIn(json, initial(selection.focusPath)))

    $: canEditValue = hasJson && selection != null && singleItemSelected(selection)
    $: canEnforceString = canEditValue && !isObjectOrArray(focusValue)

    $: convertMode = hasSelectionContents
    $: insertOrConvertText = convertMode ? 'Convert to:' : 'Insert:'
    $: canInsertOrConvertStructure = convertMode ? false : hasSelection
    $: canInsertOrConvertObject = convertMode
        ? canConvert(selection) && !isObject(focusValue)
        : hasSelection
    $: canInsertOrConvertArray = convertMode
        ? canConvert(selection) && !Array.isArray(focusValue)
        : hasSelection
    $: canInsertOrConvertValue = convertMode
        ? canConvert(selection) && isObjectOrArray(focusValue)
        : hasSelection

    $: enforceString =
        selection != null
            ? getEnforceString(
                focusValue,
                documentState.enforceStringMap,
                compileJSONPointer(selection.focusPath),
                parser
            )
            : false

    $: isArrayNode = hasJson && selection != null && Array.isArray(focusValue)
    $: isLeafNode = hasJson && selection != null && !isObjectOrArray(focusValue)


    function handleIgnoreKey(type?: CompareConfigType ) {
        onCloseContextMenu()
        onIgnoreKey?.(type)
    }

    function handleIgnoreKeyMono(){
        onCloseContextMenu()
        onIgnoreKeyMono?.()
    }

    function handleSortKey() {
        onCloseContextMenu()
        onSortKey?.()
    }

    function handleReferenceKey() {
        onCloseContextMenu()
        onReferenceKey?.()
    }

    function handleCompressKey() {
        onCloseContextMenu()
        onCompressKey?.()
    }

    function handleDiffMatch(){
      onCloseContextMenu()
      onDiffMatch?.()
    }

    function handleNodeDecode(){
      onCloseContextMenu()
      onNodeDecode?.()
    }

    let items: ContextMenuItem[]
    $: items = language === 'en' ? [
        {
            type: 'row',
            items: [{
                type: 'column',
                items: ([] as any).concat(onIgnoreKey ? [{
                    type: 'dropdown-button',
                    width: '17em',
                    main: {
                        type: 'button',
                        text: 'Ignore Key',
                        onClick: () => handleIgnoreKey(),
                    },
                    items: [{
                        type: 'button',
                        text: 'Ignore to Global',
                        onClick: () => handleIgnoreKey('global'),
                    }, {
                        type: 'button',
                        text: 'Ignore to Interface / Dependency',
                        onClick: () => handleIgnoreKey('interface'),
                    },{
                      type: 'button',
                      text: 'Temporary Ignore(7d)',
                      onClick: () => handleIgnoreKey('temporary'),
                    }]
                }] : []).concat(onIgnoreKeyMono ? [{
                    type: 'button',
                    text: 'Ignore Key',
                    onClick: () => handleIgnoreKeyMono(),
                }] : []).concat(onSortKey ? [{
                    type: 'button',
                    text: 'Sort Key',
                    disabled: !isArrayNode,
                    onClick: () => handleSortKey(),
                }] : []).concat(onReferenceKey ? [{
                    type: 'button',
                    text: 'Reference Key',
                    disabled: !isLeafNode,
                    onClick: () => handleReferenceKey(),
                }] : []).concat(onCompressKey ? [{
                  type: 'button',
                  text: 'Compress Key',
                  disabled: !isLeafNode,
                  onClick: () => handleCompressKey(),
                }] : []).concat(onDiffMatch ? [{
                  type: 'button',
                  text: 'Diff Match',
                  disabled: !isLeafNode,
                  onClick: () => handleDiffMatch(),
                }] : []).concat(onNodeDecode ? [{
                    type: 'button',
                    text: 'Node Decode',
                    onClick: () => handleNodeDecode(),
                }] : []),
            }]
        }
    ] : [
        {
            type: 'row',
            items: [{
                type: 'column',
                items: ([] as any).concat(onIgnoreKey ? [{
                    type: 'dropdown-button',
                    width: '10em',
                    main: {
                        type: 'button',
                        text: '添加忽略',
                        onClick: () => handleIgnoreKey(),
                    },
                    items: [{
                        type: 'button',
                        text: "忽略至全局",
                        onClick: () => handleIgnoreKey('global'),
                    }, {
                        type: 'button',
                        text: "忽略至接口 / 依赖",
                        onClick: () => handleIgnoreKey('interface'),
                    },{
                      type: 'button',
                      text: '临时忽略(7天)',
                      onClick: () => handleIgnoreKey('temporary'),
                    }]
                },] : []).concat(onIgnoreKeyMono ? [{
                    type: 'button',
                    text: '添加忽略',
                    onClick: () => handleIgnoreKeyMono(),
                }] : []).concat(onSortKey ? [{
                    type: 'button',
                    text: '添加排序',
                    disabled: !isArrayNode,
                    onClick: () => handleSortKey(),
                }] : []).concat(onReferenceKey ? [{
                    type: 'button',
                    text: '添加映射',
                    disabled: !isLeafNode,
                    onClick: () => handleReferenceKey(),
                }] : []).concat(onCompressKey ? [{
                  type: 'button',
                  text: '添加压缩',
                  disabled: !isLeafNode,
                  onClick: () => handleCompressKey(),
                }] : []).concat(onDiffMatch ? [{
                  type: 'button',
                  text: '显示差异',
                  disabled: !isLeafNode,
                  onClick: () => handleDiffMatch(),
                }] : []).concat(onNodeDecode ? [{
                    type: 'button',
                    text: '节点解析',
                    onClick: () => handleNodeDecode(),
                }] : []),
            }]
        }
        ,
    ]

</script>

<ContextMenu
        {items}
/>
<!--  tip={showTip ? 'Tip: you can open this context menu via right-click or with Ctrl+Q' : undefined}-->
