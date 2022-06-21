import assert from 'assert'
import {
  createAfterSelection,
  createInsideSelection,
  createKeySelection,
  createMultiSelection,
  createSelectionFromOperations,
  createValueSelection,
  expandSelection,
  findRootPath,
  getInitialSelection,
  getParentPath,
  getSelectionDown,
  getSelectionLeft,
  getSelectionRight,
  getSelectionUp,
  selectionToPartialJson
} from './selection.js'
import { createDocumentState } from './documentState.js'
import { type DocumentState, type Selection, SelectionType } from '../types.js'

describe('selection', () => {
  const json = {
    obj: {
      arr: [1, 2, { first: 3, last: 4 }]
    },
    str: 'hello world',
    nill: null,
    bool: false
  }
  const documentState = createDocumentState({ json, expand: () => true })

  it('should expand a selection (object)', () => {
    const start = ['obj', 'arr', '2', 'last']
    const end = ['nill']

    const actual = expandSelection(json, documentState, start, end)
    assert.deepStrictEqual(actual, [['obj'], ['str'], ['nill']])
  })

  it('should expand a selection (array)', () => {
    const start = ['obj', 'arr', 1]
    const end = ['obj', 'arr', 0] // note the "wrong" order of start and end

    const actual = expandSelection(json, documentState, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr', 0],
      ['obj', 'arr', 1]
    ])
  })

  it('should expand a selection (array) (2)', () => {
    const start = ['obj', 'arr', 1] // child
    const end = ['obj', 'arr'] // parent

    const actual = expandSelection(json, documentState, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr', 2, 'first']
    const end = ['obj', 'arr', 2, 'first']

    const actual = expandSelection(json, documentState, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr', 2, 'first']])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr']
    const end = ['obj', 'arr']

    const actual = expandSelection(json, documentState, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  it('should get parent path from a selection', () => {
    const path = ['a', 'b']

    assert.deepStrictEqual(getParentPath(createAfterSelection(path)), ['a'])
    assert.deepStrictEqual(getParentPath(createInsideSelection(path)), ['a', 'b'])
    assert.deepStrictEqual(
      getParentPath({
        type: SelectionType.multi,
        anchorPath: ['a', 'b'],
        focusPath: ['a', 'd'],
        paths: [
          ['a', 'b'],
          ['a', 'c'],
          ['a', 'd']
        ],
        pathsMap: {
          '/a/b': true,
          '/a/c': true,
          '/a/d': true
        }
      }),
      ['a']
    )
  })

  it('should find the root path from a selection', () => {
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
        focusPath: ['a', 'd'],
        paths: [
          ['a', 'b'],
          ['a', 'c'],
          ['a', 'd']
        ],
        pathsMap: {
          '/a/b': true,
          '/a/c': true,
          '/a/d': true
        }
      }),
      ['a']
    )

    const path1 = ['a', 'b']
    const path2 = ['a']
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.after,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.inside,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.key,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.value,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.value,
        path: path2,
        anchorPath: path2,
        focusPath: path2
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.key,
        path: path2,
        anchorPath: path2,
        focusPath: path2
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SelectionType.multi,
        anchorPath: ['a'],
        focusPath: ['a'],
        paths: [['a']],
        pathsMap: {
          '/a': true
        }
      }),
      path2
    )
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

    function withSelection(documentState: DocumentState, selection: Selection): DocumentState {
      return {
        ...documentState,
        selection
      }
    }

    it('getSelectionLeft', () => {
      assert.deepStrictEqual(
        getSelectionLeft(json2, {
          ...documentState2,
          selection: createValueSelection(['path'], false)
        }),
        {
          type: SelectionType.key,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(
          json2,
          withSelection(documentState2, createKeySelection(['path1'], false))
        ),
        {
          type: SelectionType.after,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, withSelection(documentState2, createAfterSelection(['path']))),
        {
          type: SelectionType.value,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, withSelection(documentState2, createInsideSelection([]))),
        {
          type: SelectionType.value,
          anchorPath: [],
          focusPath: [],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(
          json2,
          withSelection(
            documentState2,
            createMultiSelection(json2, documentState2, ['path1'], ['path2'])
          )
        ),
        {
          type: SelectionType.key,
          anchorPath: ['path2'],
          focusPath: ['path2'],
          edit: false
        }
      )
    })

    it('getSelectionLeft: should select array item as a whole when moving left', () => {
      const json2 = [1, 2, 3]
      const documentState2 = createDocumentState({
        json: json2,
        expand: () => false,
        select: () => createValueSelection([1], false)
      })

      assert.deepStrictEqual(getSelectionLeft(json2, documentState2), {
        anchorPath: [1],
        focusPath: [1],
        paths: [[1]],
        pathsMap: {
          '/1': true
        },
        type: 'multi'
      })
    })

    it('getSelectionLeft: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(
        getSelectionLeft(
          json2,
          withSelection(documentState2, createValueSelection(['path'], false)),
          keepAnchorPath
        ),
        {
          type: SelectionType.multi,
          anchorPath: ['path'],
          focusPath: ['path'],
          paths: [['path']],
          pathsMap: {
            '/path': true
          }
        }
      )
    })

    it('getSelectionRight', () => {
      assert.deepStrictEqual(
        getSelectionRight(
          json2,
          withSelection(documentState2, createKeySelection(['path'], false))
        ),
        {
          type: SelectionType.value,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, withSelection(documentState2, createValueSelection([], false))),
        {
          type: SelectionType.inside,
          anchorPath: [],
          focusPath: []
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(
          json2,
          withSelection(documentState2, createValueSelection(['path'], false))
        ),
        {
          type: SelectionType.after,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, withSelection(documentState2, createAfterSelection(['path']))),
        {
          type: SelectionType.key,
          anchorPath: ['path1'],
          focusPath: ['path1'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, withSelection(documentState2, createInsideSelection(['path']))),
        null
      )

      assert.deepStrictEqual(
        getSelectionRight(
          json2,
          withSelection(
            documentState2,
            createMultiSelection(json2, documentState2, ['path1'], ['path2'])
          )
        ),
        {
          type: SelectionType.value,
          anchorPath: ['path2'],
          focusPath: ['path2'],
          edit: false
        }
      )
    })

    it('getSelectionRight: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(
        getSelectionRight(
          json2,
          withSelection(documentState2, createKeySelection(['path'], false)),
          keepAnchorPath
        ),
        {
          type: SelectionType.multi,
          anchorPath: ['path'],
          focusPath: ['path'],
          paths: [['path']],
          pathsMap: {
            '/path': true
          }
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

      it('should get selection up from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createKeySelection(['obj'], false))),
          { type: SelectionType.key, anchorPath: ['a'], focusPath: ['a'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(documentState2, createKeySelection(['obj', 'c'], false))
          ),
          { type: SelectionType.key, anchorPath: ['obj'], focusPath: ['obj'] }
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createKeySelection(['d'], false))),
          { type: SelectionType.value, anchorPath: ['arr', 1], focusPath: ['arr', 1] }
        )
      })

      it('should get selection up from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(documentState2, createValueSelection(['obj'], false))
          ),
          { type: SelectionType.value, anchorPath: ['a'], focusPath: ['a'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(documentState2, createValueSelection(['obj', 'c'], false))
          ),
          { type: SelectionType.value, anchorPath: ['obj'], focusPath: ['obj'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createValueSelection(['d'], false))),
          { type: SelectionType.value, anchorPath: ['arr', 1], focusPath: ['arr', 1] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(documentState2, createValueSelection(['arr', 1], false))
          ),
          { type: SelectionType.value, anchorPath: ['arr', 0], focusPath: ['arr', 0] }
        )
      })

      it('should get selection up from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createAfterSelection(['arr', 1]))),
          createMultiSelection(json2, documentState2, ['arr', 1], ['arr', 1])
        )

        // FIXME: this should return multi selection of /obj/c instead of /obj
        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createAfterSelection(['obj']))),
          createMultiSelection(json2, documentState2, ['obj'], ['obj'])
        )
      })

      it('should get selection up from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createInsideSelection(['arr']))),
          createMultiSelection(json2, documentState2, ['arr'], ['arr'])
        )

        assert.deepStrictEqual(
          getSelectionUp(json2, withSelection(documentState2, createInsideSelection(['obj']))),
          createMultiSelection(json2, documentState2, ['obj'], ['obj'])
        )
      })

      it('should get selection up from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['d'], ['obj'])
            )
          ),
          createMultiSelection(json2, documentState2, ['a'], ['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['obj'], ['d'])
            )
          ),
          createMultiSelection(json2, documentState2, ['a'], ['a'])
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['obj'], ['d'])
            ),
            false,
            true
          ),
          createMultiSelection(json2, documentState2, ['arr', 1], ['arr', 1])
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

      it('should get selection down from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createKeySelection(['obj'], false))
          ),
          createKeySelection(['obj', 'c'], false)
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createKeySelection(['obj', 'c'], false))
          ),
          createKeySelection(['arr'], false)
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createKeySelection(['arr'], false))
          ),
          createValueSelection(['arr', 0], false)
        )
      })

      it('should get selection down from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createValueSelection(['obj'], false))
          ),
          createValueSelection(['obj', 'c'], false)
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createValueSelection(['obj', 'c'], false))
          ),
          createValueSelection(['arr'], false)
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createValueSelection(['arr', 1], false))
          ),
          createValueSelection(['d'], false)
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(documentState2, createValueSelection(['arr', 0], false))
          ),
          createValueSelection(['arr', 1], false)
        )
      })

      it('should get selection down from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, withSelection(documentState2, createAfterSelection(['arr', 0]))),
          createMultiSelection(json2, documentState2, ['arr', 1], ['arr', 1])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, withSelection(documentState2, createAfterSelection(['arr', 1]))),
          createMultiSelection(json2, documentState2, ['d'], ['d'])
        )

        // FIXME
        assert.deepStrictEqual(
          getSelectionDown(json2, withSelection(documentState2, createAfterSelection(['obj']))),
          createMultiSelection(json2, documentState2, ['obj', 'c'], ['obj', 'c'])
        )
      })

      it('should get selection down from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(json2, withSelection(documentState2, createInsideSelection(['arr']))),
          createMultiSelection(json2, documentState2, ['arr', 0], ['arr', 0])
        )

        assert.deepStrictEqual(
          getSelectionDown(json2, withSelection(documentState2, createInsideSelection(['obj']))),
          createMultiSelection(json2, documentState2, ['obj', 'c'], ['obj', 'c'])
        )
      })

      it('should get selection down from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['arr'], ['a'])
            )
          ),
          createMultiSelection(json2, documentState2, ['arr', 0], ['arr', 0])
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['arr'], ['a'])
            ),
            false,
            true
          ),
          createMultiSelection(json2, documentState2, ['obj'], ['obj'])
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            withSelection(
              documentState2,
              createMultiSelection(json2, documentState2, ['a'], ['arr'])
            )
          ),
          createMultiSelection(json2, documentState2, ['arr', 0], ['arr', 0])
        )
      })
    })
  })

  it('getInitialSelection', () => {
    function getInitialSelectionWithState(json) {
      const documentState = createDocumentState({ json, expand: (path) => path.length <= 1 })
      return getInitialSelection(json, documentState)
    }

    assert.deepStrictEqual(getInitialSelectionWithState({}), {
      type: SelectionType.value,
      anchorPath: [],
      focusPath: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState([]), {
      type: SelectionType.value,
      anchorPath: [],
      focusPath: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState('test'), {
      type: SelectionType.value,
      anchorPath: [],
      focusPath: []
    })

    assert.deepStrictEqual(getInitialSelectionWithState({ a: 2, b: 3 }), {
      type: SelectionType.key,
      anchorPath: ['a'],
      focusPath: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState({ a: {} }), {
      type: SelectionType.key,
      anchorPath: ['a'],
      focusPath: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState([2, 3, 4]), {
      type: SelectionType.value,
      anchorPath: [0],
      focusPath: [0]
    })
  })

  it('should turn selection into text', () => {
    assert.deepStrictEqual(selectionToPartialJson(json, createKeySelection(['str'], false)), 'str')
    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['str'], false)),
      'hello world'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj', 'arr', 1], false)),
      '2'
    )
    assert.deepStrictEqual(selectionToPartialJson(json, createAfterSelection(['str'])), null)
    assert.deepStrictEqual(selectionToPartialJson(json, createInsideSelection(['str'])), null)

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(json, documentState, ['str'], ['bool'])),
      '"str": "hello world",\n' + '"nill": null,\n' + '"bool": false,'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(json, documentState, ['obj', 'arr', 0], ['obj', 'arr', 1])
      ),
      '1,\n' + '2,'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(json, documentState, ['obj', 'arr', 0], ['obj', 'arr', 0])
      ),
      '1'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj'], false)),
      JSON.stringify(json.obj, null, 2)
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(json, documentState, ['obj'], ['obj'])),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )
  })

  it('should turn selected root object into text', () => {
    const json2 = {}
    const documentState2 = createDocumentState({ json: json2, expand: () => true })

    assert.deepStrictEqual(
      selectionToPartialJson(json2, createMultiSelection(json2, documentState2, [], [])),
      '{}'
    )
  })

  it('should turn selection into text with specified indentation', () => {
    const indentation = 4
    const objArr2 = '{\n' + '    "first": 3,\n' + '    "last": 4\n' + '}'

    assert.deepStrictEqual(
      selectionToPartialJson(json, createValueSelection(['obj', 'arr', 2], false), indentation),
      objArr2
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(json, documentState, ['obj', 'arr', 1], ['obj', 'arr', 2]),
        indentation
      ),
      `2,\n${objArr2},`
    )

    assert.deepStrictEqual(
      selectionToPartialJson(json, createMultiSelection(json, documentState, ['obj'], ['obj'])),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createMultiSelection(json, documentState, ['obj'], ['obj']),
        indentation
      ),
      '"obj": ' + JSON.stringify(json.obj, null, indentation) + ','
    )
  })

  describe('createSelectionFromOperations', () => {
    it('should get selection from add operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'add', path: '/obj/arr/2', value: 42 },
          { op: 'add', path: '/obj/arr/3', value: 43 }
        ]),
        createMultiSelection(json, documentState, ['obj', 'arr', 2], ['obj', 'arr', 3])
      )
    })

    it('should get selection from move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/obj/arr/0', path: '/obj/arr/2' },
          { op: 'move', from: '/obj/arr/1', path: '/obj/arr/3' }
        ]),
        createMultiSelection(json, documentState, ['obj', 'arr', 2], ['obj', 'arr', 3])
      )
    })

    it.skip('should get selection from wrongly ordered move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/obj/arr/1', path: '/obj/arr/3' },
          { op: 'move', from: '/obj/arr/0', path: '/obj/arr/2' }
        ]),
        createMultiSelection(json, documentState, ['obj', 'arr', 3], ['obj', 'arr', 2])
      )
    })

    it('should get selection from copy operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'copy', from: '/str', path: '/strCopy' }]),
        createMultiSelection(json, documentState, ['strCopy'], ['strCopy'])
      )
    })

    it('should get selection from replace operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'replace', path: '/str', value: 'hello world (updated)' }
        ]),
        createValueSelection(['str'], false)
      )
    })

    it('should get selection from renaming a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [
          { op: 'move', from: '/str', path: '/strRenamed' },
          { op: 'move', from: '/foo', path: '/foo' },
          { op: 'move', from: '/bar', path: '/bar' }
        ]),
        createKeySelection(['strRenamed'], false)
      )
    })

    it('should get selection from removing a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'remove', path: '/str' }]),
        null
      )
    })

    it('should get selection from inserting a new root document', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, [{ op: 'replace', path: '', value: 'test' }]),
        createValueSelection([], false)
      )
    })
  })
})
