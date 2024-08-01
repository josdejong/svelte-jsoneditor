import { describe, test } from 'vitest'
import assert from 'assert'
import {
  createAfterSelection,
  createInsideSelection,
  createKeySelection,
  createMultiSelection,
  createSelectionFromOperations,
  createValueSelection,
  findRootPath,
  getInitialSelection,
  getParentPath,
  getSelectionDown,
  getSelectionLeft,
  getSelectionPaths,
  getSelectionRight,
  getSelectionUp,
  pathInSelection,
  pathStartsWith,
  selectionIfOverlapping,
  selectionToPartialJson
} from './selection.js'
import { createDocumentState } from './documentState.js'
import { SelectionType } from '$lib/types.js'

describe('selection', () => {
  const json = {
    start: true,
    obj: {
      arr: [1, 2, { first: 3, last: 4 }]
    },
    str: 'hello world',
    nill: null,
    bool: false
  }

  test('should expand a selection (object)', () => {
    const anchorPath = ['obj', 'arr', '2', 'last']
    const focusPath = ['nill']

    const actual = getSelectionPaths(json, createMultiSelection(anchorPath, focusPath))
    assert.deepStrictEqual(actual, [['obj'], ['str'], ['nill']])
  })

  test('should expand a selection (array)', () => {
    const anchorPath = ['obj', 'arr', '1']
    const focusPath = ['obj', 'arr', '0'] // note the "wrong" order of start and end

    const actual = getSelectionPaths(json, createMultiSelection(anchorPath, focusPath))
    assert.deepStrictEqual(actual, [
      ['obj', 'arr', '0'],
      ['obj', 'arr', '1']
    ])
  })

  test('should expand a selection (array) (2)', () => {
    const anchorPath = ['obj', 'arr', '1'] // child
    const focusPath = ['obj', 'arr'] // parent

    const actual = getSelectionPaths(json, createMultiSelection(anchorPath, focusPath))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should expand a selection (value) (1)', () => {
    const anchorPath = ['obj', 'arr', '2', 'first']
    const focusPath = ['obj', 'arr', '2', 'first']

    const actual = getSelectionPaths(json, createMultiSelection(anchorPath, focusPath))
    assert.deepStrictEqual(actual, [['obj', 'arr', '2', 'first']])
  })

  test('should expand a selection (value) (2)', () => {
    const anchorPath = ['obj', 'arr']
    const focusPath = ['obj', 'arr']

    const actual = getSelectionPaths(json, createMultiSelection(anchorPath, focusPath))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should expand a key selection', () => {
    const path = ['obj', 'arr']

    const actual = getSelectionPaths(json, createKeySelection(path))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should expand a value selection', () => {
    const path = ['obj', 'arr']

    const actual = getSelectionPaths(json, createValueSelection(path))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should expand an inside selection', () => {
    const path = ['obj', 'arr']

    const actual = getSelectionPaths(json, createInsideSelection(path))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should expand an after selection', () => {
    const path = ['obj', 'arr']

    const actual = getSelectionPaths(json, createAfterSelection(path))
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  test('should get parent path from a selection', () => {
    const path = ['a', 'b']

    assert.deepStrictEqual(getParentPath(createAfterSelection(path)), ['a'])
    assert.deepStrictEqual(getParentPath(createInsideSelection(path)), ['a', 'b'])
    assert.deepStrictEqual(
      getParentPath({
        type: SelectionType.multi,
        anchorPath: ['a', 'b'],
        focusPath: ['a', 'd']
      }),
      ['a']
    )
  })

  test('should find the root path from a selection', () => {
    const json = {
      a: {
        b: 1,
        c: 2,
        d: 3
      }
    }

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.multi,
        anchorPath: ['a', 'b'],
        focusPath: ['a', 'd']
      }),
      ['a']
    )

    const path1 = ['a', 'b']
    const path2 = ['a']
    assert.deepStrictEqual(findRootPath(json, createAfterSelection(path1)), path2)
    assert.deepStrictEqual(findRootPath(json, createInsideSelection(path1)), path2)
    assert.deepStrictEqual(findRootPath(json, createKeySelection(path1)), path2)
    assert.deepStrictEqual(findRootPath(json, createValueSelection(path1)), path2)
    assert.deepStrictEqual(findRootPath(json, createValueSelection(path2)), path2)
    assert.deepStrictEqual(findRootPath(json, createKeySelection(path2)), path2)
    assert.deepStrictEqual(findRootPath(json, createMultiSelection(['a'], ['a'])), path2)
  })

  describe('navigate', () => {
    const json2 = {
      path: true,
      path1: true,
      path2: true
    }
    const documentState2 = createDocumentState({
      json: json2,
      expand: () => true
    })

    test('getSelectionLeft', () => {
      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createValueSelection(['path'])),
        createKeySelection(['path'])
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createKeySelection(['path1'])),
        createAfterSelection(['path'])
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createAfterSelection(['path'])),
        createValueSelection(['path'])
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createInsideSelection([])),
        createValueSelection([])
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createMultiSelection(['path1'], ['path2'])),
        createKeySelection(['path2'])
      )
    })

    test('getSelectionLeft: should select array item as a whole when moving left', () => {
      const json2 = [1, 2, 3]
      const documentState2 = createDocumentState({
        json: json2,
        expand: () => false
      })
      const selection = createValueSelection(['1'])

      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, selection),
        createMultiSelection(['1'], ['1'])
      )
    })

    test('getSelectionLeft: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(
        getSelectionLeft(json2, documentState2, createValueSelection(['path']), keepAnchorPath),
        {
          type: SelectionType.multi,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )
    })

    test('getSelectionRight', () => {
      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createKeySelection(['path'])),
        createValueSelection(['path'])
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createValueSelection([])),
        createInsideSelection([])
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createValueSelection(['path'])),
        createAfterSelection(['path'])
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createAfterSelection(['path'])),
        createKeySelection(['path1'])
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createInsideSelection(['path'])),
        undefined
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createMultiSelection(['path1'], ['path2'])),
        createValueSelection(['path2'])
      )
    })

    test('getSelectionRight: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(
        getSelectionRight(json2, documentState2, createKeySelection(['path']), keepAnchorPath),
        {
          type: SelectionType.multi,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )
    })

    describe('getSelectionUp', () => {
      const json2 = {
        a: 2,
        obj: {
          c: 3
        },
        arr: [1, 2],
        d: 4
      }
      const documentState2 = createDocumentState({ json: json2, expand: () => true })

      test('should get selection up from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createKeySelection(['obj'])),
          createKeySelection(['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createKeySelection(['obj', 'c'])),
          createKeySelection(['obj'])
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createKeySelection(['d'])),
          createValueSelection(['arr', '1'])
        )
      })

      test('should get selection up from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createValueSelection(['obj'])),
          createValueSelection(['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createValueSelection(['obj', 'c'])),
          createValueSelection(['obj'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createValueSelection(['d'])),
          createValueSelection(['arr', '1'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createValueSelection(['arr', '1'])),
          createValueSelection(['arr', '0'])
        )
      })

      test('should get selection up from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createAfterSelection(['arr', '1'])),
          createValueSelection(['arr', '1'])
        )

        // FIXME: this should return a value selection of /obj/c instead of /obj
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createAfterSelection(['obj'])),
          createValueSelection(['obj'])
        )
      })

      test('should get selection up from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createInsideSelection(['arr'])),
          createValueSelection(['arr'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createInsideSelection(['obj'])),
          createValueSelection(['obj'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createInsideSelection([])),
          createValueSelection([])
        )
      })

      test('should get selection up from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['d'], ['obj'])),
          createValueSelection(['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['d'], ['obj']), true),
          createMultiSelection(['d'], ['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['obj'], ['d'])),
          createValueSelection(['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['obj'], ['d'])),
          createValueSelection(['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['obj'], ['d']), true),
          createMultiSelection(['obj'], ['arr'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, documentState2, createMultiSelection(['a'], ['a'])),
          createValueSelection([])
        )
      })
    })

    describe('getSelectionDown', () => {
      const json2 = {
        a: 2,
        obj: {
          c: 3
        },
        arr: [1, 2],
        d: 4
      }
      const documentState2 = createDocumentState({ json: json2, expand: () => true })

      test('should get selection down from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createKeySelection(['obj'])),
          createKeySelection(['obj', 'c'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createKeySelection(['obj', 'c'])),
          createKeySelection(['arr'])
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createKeySelection(['arr'])),
          createValueSelection(['arr', '0'])
        )
      })

      test('should get selection down from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createValueSelection(['obj'])),
          createValueSelection(['obj', 'c'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createValueSelection(['obj', 'c'])),
          createValueSelection(['arr'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createValueSelection(['arr', '1'])),
          createValueSelection(['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createValueSelection(['arr', '0'])),
          createValueSelection(['arr', '1'])
        )
      })

      test('should get selection down from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createAfterSelection(['arr', '0'])),
          createValueSelection(['arr', '1'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createAfterSelection(['arr', '1'])),
          createValueSelection(['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createAfterSelection(['obj'])),
          createValueSelection(['arr'])
        )
      })

      test('should get selection down from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createInsideSelection(['arr'])),
          createValueSelection(['arr', '0'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createInsideSelection(['obj'])),
          createValueSelection(['obj', 'c'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createInsideSelection(['arr']), true),
          createMultiSelection(['arr', '0'], ['arr', '0'])
        )
      })

      test('should get selection down from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['arr'], ['a'])),
          createValueSelection(['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['arr'], ['a'])),
          createValueSelection(['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['arr'], ['a']), true),
          createMultiSelection(['arr'], ['obj'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['a'], ['arr'])),
          createValueSelection(['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['a'], ['arr']), true),
          createMultiSelection(['a'], ['d'])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, documentState2, createMultiSelection(['arr'], ['arr'])),
          createValueSelection(['d'])
        )
      })

      test('should get selection down from AFTER selection', () => {
        const json3 = {
          a: 2,
          obj: {
            c: 3
          },
          arr: [1, 2]
        }
        const documentState3 = createDocumentState({ json: json3, expand: () => true })

        assert.deepStrictEqual(
          getSelectionDown(json3, documentState3, createAfterSelection(['arr'])),
          undefined
        )
      })
    })
  })

  test('getInitialSelection', () => {
    function getInitialSelectionWithState(json: unknown) {
      const documentState = createDocumentState({ json, expand: (path) => path.length <= 1 })
      return getInitialSelection(json, documentState)
    }

    assert.deepStrictEqual(getInitialSelectionWithState({}), {
      type: SelectionType.value,
      path: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState([]), {
      type: SelectionType.value,
      path: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState('test'), {
      type: SelectionType.value,
      path: []
    })

    assert.deepStrictEqual(getInitialSelectionWithState({ a: 2, b: 3 }), {
      type: SelectionType.key,
      path: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState({ a: {} }), {
      type: SelectionType.key,
      path: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState([2, 3, 4]), {
      type: SelectionType.value,
      path: ['0']
    })
  })

  test('should turn selection into text', () => {
    assert.deepStrictEqual(
      selectionToPartialJson(json, createKeySelection(['str']), 2, JSON),
      'str'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['str']), 2, JSON),
      'hello world'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj', 'arr', '1']), 2, JSON),
      '2'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(json, createAfterSelection(['str']), 2, JSON),
      undefined
    )
    assert.deepStrictEqual(
      selectionToPartialJson(json, createInsideSelection(['str']), 2, JSON),
      undefined
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(['str'], ['bool']), 2, JSON),
      '"str": "hello world",\n' + '"nill": null,\n' + '"bool": false,'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(['obj', 'arr', '0'], ['obj', 'arr', '1']),
        2,
        JSON
      ),
      '1,\n' + '2,'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(['obj', 'arr', '0'], ['obj', 'arr', '0']),
        2,
        JSON
      ),
      '1'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj']), 2, JSON),
      JSON.stringify(json.obj, null, 2)
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(['obj'], ['obj']), 2, JSON),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )
  })

  test('should turn selected root object into text', () => {
    const json2 = {}

    assert.deepStrictEqual(
      selectionToPartialJson(json2, createMultiSelection([], []), 2, JSON),
      '{}'
    )
  })

  test('should turn selection into text with specified indentation', () => {
    const indentation = 4
    const objArr2 = '{\n' + '    "first": 3,\n' + '    "last": 4\n' + '}'

    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj', 'arr', '2']), indentation, JSON),
      objArr2
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(['obj', 'arr', '1'], ['obj', 'arr', '2']),
        indentation,
        JSON
      ),
      `2,\n${objArr2},` as string
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(['obj'], ['obj']), 2, JSON),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(['obj'], ['obj']), indentation, JSON),
      '"obj": ' + JSON.stringify(json.obj, null, indentation) + ','
    )
  })

  describe('createSelectionFromOperations', () => {
    test('should get selection from add operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'add', path: '/obj/arr/2', value: 42 },
          { op: 'add', path: '/obj/arr/3', value: 43 }
        ]),
        createMultiSelection(['obj', 'arr', '2'], ['obj', 'arr', '3'])
      )
    })

    test('should get selection from move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/obj/arr/0', path: '/obj/arr/2' },
          { op: 'move', from: '/obj/arr/1', path: '/obj/arr/3' }
        ]),
        createMultiSelection(['obj', 'arr', '2'], ['obj', 'arr', '3'])
      )
    })

    test.skip('should get selection from wrongly ordered move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/obj/arr/1', path: '/obj/arr/3' },
          { op: 'move', from: '/obj/arr/0', path: '/obj/arr/2' }
        ]),
        createMultiSelection(['obj', 'arr', '3'], ['obj', 'arr', '2'])
      )
    })

    test('should get selection from copy operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'copy', from: '/str', path: '/strCopy' }]),
        createMultiSelection(['strCopy'], ['strCopy'])
      )
    })

    test('should get selection from replace operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'replace', path: '/str', value: 'hello world (updated)' }
        ]),
        createValueSelection(['str'])
      )
    })

    test('should get selection from renaming a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/str', path: '/strRenamed' },
          { op: 'move', from: '/foo', path: '/foo' },
          { op: 'move', from: '/bar', path: '/bar' }
        ]),
        createKeySelection(['strRenamed'])
      )
    })

    test('should get selection from renaming the last key of an object', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'move', from: '/arr', path: '/arrRenamed' }]),
        createKeySelection(['arrRenamed'])
      )
    })

    test('should get selection from removing a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'remove', path: '/str' }]),
        undefined
      )
    })

    test('should get selection from inserting a new root document', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'replace', path: '', value: 'test' }]),
        createValueSelection([])
      )
    })
  })

  test('createMultiSelection', () => {
    assert.deepStrictEqual(createMultiSelection(['obj', 'arr', '0'], ['obj', 'arr', '2']), {
      type: SelectionType.multi,
      anchorPath: ['obj', 'arr', '0'],
      focusPath: ['obj', 'arr', '2']
    })

    assert.deepStrictEqual(createMultiSelection(['obj', 'arr', '2'], ['obj', 'arr', '0']), {
      type: SelectionType.multi,
      anchorPath: ['obj', 'arr', '2'],
      focusPath: ['obj', 'arr', '0']
    })

    assert.deepStrictEqual(createMultiSelection(['obj', 'arr', '0'], ['obj', 'arr']), {
      type: SelectionType.multi,
      anchorPath: ['obj', 'arr'],
      focusPath: ['obj', 'arr']
    })

    assert.deepStrictEqual(createMultiSelection(['obj', 'nested', '0'], ['arr', '2']), {
      type: SelectionType.multi,
      anchorPath: ['obj'],
      focusPath: ['arr']
    })
  })

  describe('selectionIfOverlapping', () => {
    test('should determine whether a KeySelection is relevant for given pointer', () => {
      const selection = createKeySelection(['obj', 'arr'])

      assert.deepStrictEqual(selectionIfOverlapping(json, selection, []), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj']), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj', 'arr']), selection)
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '0']),
        undefined
      )
    })

    test('should determine whether a ValueSelection is relevant for given pointer', () => {
      const selection = createValueSelection(['obj', 'arr'])

      assert.deepStrictEqual(selectionIfOverlapping(json, selection, []), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj']), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj', 'arr']), selection)
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '0']),
        selection
      )
    })

    test('should determine whether a AfterSelection is relevant for given pointer', () => {
      const selection = createAfterSelection(['obj', 'arr'])

      assert.deepStrictEqual(selectionIfOverlapping(json, selection, []), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj']), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj', 'arr']), selection)
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '0']),
        undefined
      )
    })

    test('should determine whether an InsideSelection is relevant for given pointer', () => {
      const selection = createInsideSelection(['obj', 'arr'])

      assert.deepStrictEqual(selectionIfOverlapping(json, selection, []), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj']), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj', 'arr']), selection)
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '0']),
        undefined
      )
    })

    test('should determine whether a MultiSelection is relevant for given pointer', () => {
      const selection = createMultiSelection(['obj', 'arr', '0'], ['obj', 'arr', '2'])

      assert.deepStrictEqual(selectionIfOverlapping(json, selection, []), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj']), selection)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['obj', 'arr']), selection)
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '0']),
        selection
      )
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '1']),
        selection
      )
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '2']),
        selection
      )
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '2', 'first']),
        selection
      )
      assert.deepStrictEqual(
        selectionIfOverlapping(json, selection, ['obj', 'arr', '2', 'last']),
        selection
      )
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['str']), undefined)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['nill']), undefined)
      assert.deepStrictEqual(selectionIfOverlapping(json, selection, ['bool']), undefined)
    })
  })

  describe('pathInSelection', () => {
    test('should determine path in selection for a KeySelection', () => {
      const selection = createKeySelection(['obj'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), false)
    })

    test('should determine path in selection for a ValueSelection', () => {
      const selection = createValueSelection(['obj'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), true)
    })

    test('should determine path in selection for an InsideSelection', () => {
      const selection = createInsideSelection(['obj'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), false)
    })

    test('should determine path in selection for an AfterSelection', () => {
      const selection = createAfterSelection(['obj'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), false)
    })

    test('should determine path in selection for a MultiSelection', () => {
      const selection = createMultiSelection(['start'], ['nill'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), true)
      assert.strictEqual(pathInSelection(json, selection, ['bool']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), true)
    })

    test('should determine path in selection for a MultiSelection with one item', () => {
      const selection = createMultiSelection(['obj'], ['obj'])
      assert.strictEqual(pathInSelection(json, selection, ['obj']), true)
      assert.strictEqual(pathInSelection(json, selection, ['str']), false)
      assert.strictEqual(pathInSelection(json, selection, ['bool']), false)
      assert.strictEqual(pathInSelection(json, selection, ['obj', 'arr', '1']), true)
    })
  })

  describe('pathStartsWith', () => {
    test('should determine whether a path starts with parent path', () => {
      assert.strictEqual(pathStartsWith([], []), true)
      assert.strictEqual(pathStartsWith(['a'], []), true)
      assert.strictEqual(pathStartsWith(['a'], ['a']), true)
      assert.strictEqual(pathStartsWith(['a', 'b'], ['a']), true)
      assert.strictEqual(pathStartsWith(['a', 'b'], ['a', 'b']), true)
      assert.strictEqual(pathStartsWith(['a'], ['a', 'b']), false)
      assert.strictEqual(pathStartsWith(['a', 'b'], ['b']), false)
      assert.strictEqual(pathStartsWith(['a', 'b'], ['a', 'b', 'c']), false)
    })
  })
})
