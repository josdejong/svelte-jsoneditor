import assert from 'assert'
import { syncState } from './documentState.js'
import {
  createSelection,
  createSelectionFromOperations,
  expandSelection,
  findRootPath,
  getInitialSelection,
  getParentPath,
  getSelectionDown,
  getSelectionLeft,
  getSelectionRight,
  getSelectionUp,
  SELECTION_TYPE,
  selectionToPartialJson
} from './selection.js'

describe('selection', () => {
  const doc = {
    obj: {
      arr: [1, 2, { first: 3, last: 4 }]
    },
    str: 'hello world',
    nill: null,
    bool: false
  }
  const state = syncState(doc, undefined, [], () => true)

  it('should expand a selection (object)', () => {
    const start = ['obj', 'arr', '2', 'last']
    const end = ['nill']

    const actual = expandSelection(doc, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj'],
      ['str'],
      ['nill']
    ])
  })

  it('should expand a selection (array)', () => {
    const start = ['obj', 'arr', 1]
    const end = ['obj', 'arr', 0] // note the "wrong" order of start and end

    const actual = expandSelection(doc, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr', 0],
      ['obj', 'arr', 1]
    ])
  })

  it('should expand a selection (array) (2)', () => {
    const start = ['obj', 'arr', 1] // child
    const end = ['obj', 'arr'] // parent

    const actual = expandSelection(doc, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr']
    ])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr', 2, 'first']
    const end = ['obj', 'arr', 2, 'first']

    const actual = expandSelection(doc, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr', 2, 'first']
    ])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr']
    const end = ['obj', 'arr']

    const actual = expandSelection(doc, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr']
    ])
  })

  it('should get parent path from a selection', () => {
    const path = ['a', 'b']

    assert.deepStrictEqual(getParentPath({ type: SELECTION_TYPE.AFTER, path, anchorPath: path, focusPath: path }), ['a'])
    assert.deepStrictEqual(getParentPath({ type: SELECTION_TYPE.INSIDE, path, anchorPath: path, focusPath: path }), ['a', 'b'])
    assert.deepStrictEqual(getParentPath({
      type: SELECTION_TYPE.MULTI,
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
    }), ['a'])
  })

  it('should find the root path from a selection', () => {
    assert.deepStrictEqual(findRootPath({
      type: SELECTION_TYPE.MULTI,
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
    }), ['a'])

    const path = ['a', 'b']
    assert.deepStrictEqual(findRootPath({ type: SELECTION_TYPE.AFTER, path, anchorPath: path, focusPath: path }), [])
    assert.deepStrictEqual(findRootPath({ type: SELECTION_TYPE.INSIDE, path, anchorPath: path, focusPath: path }), [])
    assert.deepStrictEqual(findRootPath({ type: SELECTION_TYPE.KEY, path, anchorPath: path, focusPath: path }), [])
    assert.deepStrictEqual(findRootPath({ type: SELECTION_TYPE.VALUE, path, anchorPath: path, focusPath: path }), path)
  })

  describe('navigate', () => {
    const doc2 = {
      path: true,
      path1: true,
      path2: true
    }
    const state2 = syncState(doc2, undefined, [], () => true)

    it('getSelectionLeft', () => {
      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.VALUE,
        anchorPath: ['path'],
        focusPath: ['path']
      }), {
        type: SELECTION_TYPE.KEY,
        anchorPath: ['path'],
        focusPath: ['path'],
        edit: false
      })

      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.KEY,
        anchorPath: ['path1'],
        focusPath: ['path1']
      }), {
        type: SELECTION_TYPE.AFTER,
        anchorPath: ['path'],
        focusPath: ['path']
      })

      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.AFTER,
        anchorPath: ['path'],
        focusPath: ['path']
      }), {
        type: SELECTION_TYPE.VALUE,
        anchorPath: ['path'],
        focusPath: ['path'],
        edit: false
      })

      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.INSIDE,
        anchorPath: [],
        focusPath: []
      }), {
        type: SELECTION_TYPE.VALUE,
        anchorPath: [],
        focusPath: [],
        edit: false
      })

      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['path1'],
        focusPath: ['path2'],
        paths: [['path1'], ['path2']],
        pathsMap: { '/path1': true, '/path2': true }
      }), {
        type: SELECTION_TYPE.KEY,
        anchorPath: ['path2'],
        focusPath: ['path2'],
        edit: false
      })
    })

    it('getSelectionLeft: should select array item as a whole when moving left', () => {
      const doc2 = [1, 2, 3]
      const state2 = syncState(doc2, undefined, [], () => false)

      assert.deepStrictEqual(getSelectionLeft(doc2, state2, {
        type: SELECTION_TYPE.VALUE,
        anchorPath: [1],
        focusPath: [1]
      }), {
        anchorPath: [1],
        focusPath: [1],
        paths: [
          [1]
        ],
        pathsMap: {
          '/1': true
        },
        type: 'multi'
      })
    })

    it('getSelectionLeft: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(getSelectionLeft(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }, keepAnchorPath), {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['path'],
        focusPath: ['path'],
        paths: [
          ['path']
        ],
        pathsMap: {
          '/path': true
        }
      })
    })

    it('getSelectionRight', () => {
      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }), {
        type: SELECTION_TYPE.VALUE,
        anchorPath: ['path'],
        focusPath: ['path'],
        edit: false
      })

      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.VALUE, path: [], anchorPath: [], focusPath: [] }), {
        type: SELECTION_TYPE.INSIDE,
        anchorPath: [],
        focusPath: []
      })

      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }), {
        type: SELECTION_TYPE.AFTER,
        anchorPath: ['path'],
        focusPath: ['path']
      })

      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }), {
        type: SELECTION_TYPE.KEY,
        anchorPath: ['path1'],
        focusPath: ['path1'],
        edit: false
      })

      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.INSIDE, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }), null)

      assert.deepStrictEqual(getSelectionRight(doc2, state2, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['path1'],
        focusPath: ['path2'],
        paths: [['path1'], ['path2']],
        pathsMap: { '/path1': true, '/path2': true }
      }), {
        type: SELECTION_TYPE.VALUE,
        anchorPath: ['path2'],
        focusPath: ['path2'],
        edit: false
      })
    })

    it('getSelectionRight: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(getSelectionRight(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['path'], anchorPath: ['path'], focusPath: ['path'] }, keepAnchorPath), {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['path'],
        focusPath: ['path'],
        paths: [
          ['path']
        ],
        pathsMap: {
          '/path': true
        }
      })
    })

    describe('getSelectionUp', () => {
      const doc2 = {
        a: 2,
        obj: {
          c: 3
        },
        arr: [
          1,
          2
        ],
        d: 4
      }
      const state2 = syncState(doc2, undefined, [], () => true)

      it('should get selection up from KEY selection', () => {
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['obj'] })),
        { type: SELECTION_TYPE.KEY, anchorPath: ['a'], focusPath: ['a'] })

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['obj', 'c'] })),
        { type: SELECTION_TYPE.KEY, anchorPath: ['obj'], focusPath: ['obj'] })

        // jump from key to array value
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['d'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] })
      })

      it('should get selection up from VALUE selection', () => {
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['a'], focusPath: ['a'] })

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj', 'c'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['obj'], focusPath: ['obj'] })

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['d'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] })

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 1] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 0], focusPath: ['arr', 0] })
      })

      it('should get selection up from AFTER selection', () => {
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 1] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr', 1], focusPath: ['arr', 1] }))

        // FIXME: this should return multi selection of /obj/c instead of /obj
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['obj'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['obj'], focusPath: ['obj'] }))
      })

      it('should get selection up from INSIDE selection', () => {
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.INSIDE, path: ['arr'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr'], focusPath: ['arr'] }))

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.INSIDE, path: ['obj'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['obj'], focusPath: ['obj'] }))
      })

      it('should get selection up from MULTI selection', () => {
        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['d'], focusPath: ['obj'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['a'], focusPath: ['a'] }))

        assert.deepStrictEqual(getSelectionUp(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['obj'], focusPath: ['d'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr', 1], focusPath: ['arr', 1] }))
      })
    })

    describe('getSelectionDown', () => {
      const doc2 = {
        a: 2,
        obj: {
          c: 3
        },
        arr: [
          1,
          2
        ],
        d: 4
      }
      const state2 = syncState(doc2, undefined, [], () => true)

      it('should get selection up from KEY selection', () => {
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['obj'] })),
        { type: SELECTION_TYPE.KEY, anchorPath: ['obj', 'c'], focusPath: ['obj', 'c'] })

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['obj', 'c'] })),
        { type: SELECTION_TYPE.KEY, anchorPath: ['arr'], focusPath: ['arr'] })

        // jump from key to array value
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.KEY, path: ['arr'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 0], focusPath: ['arr', 0] })
      })

      it('should get selection up from VALUE selection', () => {
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['obj', 'c'], focusPath: ['obj', 'c'] })

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj', 'c'] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr'], focusPath: ['arr'] })

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 1] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['d'], focusPath: ['d'] })

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 0] })),
        { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] })
      })

      it('should get selection up from AFTER selection', () => {
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 0] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr', 1], focusPath: ['arr', 1] }))

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 1] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['d'], focusPath: ['d'] }))

        // FIXME
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.AFTER, path: ['obj'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr'], focusPath: ['arr'] }))
      })

      it('should get selection up from INSIDE selection', () => {
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.INSIDE, path: ['arr'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr', 0], focusPath: ['arr', 0] }))

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.INSIDE, path: ['obj'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['obj', 'c'], focusPath: ['obj', 'c'] }))
      })

      it('should get selection up from MULTI selection', () => {
        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['arr'], focusPath: ['a'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['obj'], focusPath: ['obj'] }))

        assert.deepStrictEqual(getSelectionDown(doc2, state2,
          createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['a'], focusPath: ['arr'] })),
        createSelection(doc2, state2, { type: SELECTION_TYPE.MULTI, anchorPath: ['d'], focusPath: ['d'] }))
      })
    })
  })

  it('getInitialSelection', () => {
    function getInitialSelectionWithState (doc) {
      const state = syncState(doc, undefined, [], path => path.length <= 1)
      return getInitialSelection(doc, state)
    }

    assert.deepStrictEqual(getInitialSelectionWithState({}), { type: SELECTION_TYPE.VALUE, anchorPath: [], focusPath: [] })
    assert.deepStrictEqual(getInitialSelectionWithState([]), { type: SELECTION_TYPE.VALUE, anchorPath: [], focusPath: [] })
    assert.deepStrictEqual(getInitialSelectionWithState('test'), { type: SELECTION_TYPE.VALUE, anchorPath: [], focusPath: [] })

    assert.deepStrictEqual(getInitialSelectionWithState({ a: 2, b: 3 }), { type: SELECTION_TYPE.KEY, anchorPath: ['a'], focusPath: ['a'] })
    assert.deepStrictEqual(getInitialSelectionWithState({ a: {} }), { type: SELECTION_TYPE.KEY, anchorPath: ['a'], focusPath: ['a'] })
    assert.deepStrictEqual(getInitialSelectionWithState([2, 3, 4]), { type: SELECTION_TYPE.VALUE, anchorPath: [0], focusPath: [0] })
  })

  it('should turn selection into text', () => {
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.KEY, path: ['str'] })), '"str"')
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.VALUE, path: ['str'] })), '"hello world"')
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.VALUE, path: ['obj', 'arr', 1] })), '2')
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.AFTER, path: ['str'] })), null)
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.INSIDE, path: ['str'] })), null)

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { anchorPath: ['str'], focusPath: ['bool'] })),
      '"str": "hello world",\n' +
      '"nill": null,\n' +
      '"bool": false,'
    )

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { anchorPath: ['obj', 'arr', 0], focusPath: ['obj', 'arr', 1] })),
      '1,\n' +
      '2,'
    )
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { anchorPath: ['obj', 'arr', 0], focusPath: ['obj', 'arr', 0] })), '1')

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.VALUE, path: ['obj'] })), JSON.stringify(doc.obj, null, 2))

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, {
      anchorPath: ['obj'],
      focusPath: ['obj']
    })), '"obj": ' + JSON.stringify(doc.obj, null, 2) + ',')
  })

  it('should turn selected root object into text', () => {
    const doc2 = {}
    const state2 = syncState(doc2, undefined, [], () => true)

    assert.deepStrictEqual(selectionToPartialJson(doc2, createSelection(doc2, state2, { anchorPath: [], focusPath: [] })),
      '{}'
    )
  })

  it('should turn selection into text with specified indentation', () => {
    const indentation = 4
    const objArr2 = '{\n' +
      '    "first": 3,\n' +
      '    "last": 4\n' +
      '}'

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, { type: SELECTION_TYPE.VALUE, path: ['obj', 'arr', 2] }), indentation), objArr2)
    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, {
      anchorPath: ['obj', 'arr', 1],
      focusPath: ['obj', 'arr', 2]
    }), indentation), `2,\n${objArr2},`)

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, {
      anchorPath: ['obj'],
      focusPath: ['obj']
    })), '"obj": ' + JSON.stringify(doc.obj, null, 2) + ',')

    assert.deepStrictEqual(selectionToPartialJson(doc, createSelection(doc, state, {
      anchorPath: ['obj'],
      focusPath: ['obj']
    }), indentation), '"obj": ' + JSON.stringify(doc.obj, null, indentation) + ',')
  })

  describe('createSelectionFromOperations', () => {
    it('should get selection from add operations', () => {
      assert.deepStrictEqual(createSelectionFromOperations(doc, [
        { op: 'add', path: '/obj/arr/2', value: 42 },
        { op: 'add', path: '/obj/arr/3', value: 43 }
      ]), createSelection(doc, state, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['obj', 'arr', 2],
        focusPath: ['obj', 'arr', 3]
      }))
    })
  })

  it('should get selection from copy operations', () => {
    assert.deepStrictEqual(createSelectionFromOperations(doc, [
      { op: 'copy', from: '/str', path: '/strCopy' }
    ]), createSelection(doc, state, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: ['strCopy'],
      focusPath: ['strCopy']
    }))
  })

  it('should get selection from replace operations', () => {
    assert.deepStrictEqual(createSelectionFromOperations(doc, [
      { op: 'replace', path: '/str', value: 'hello world (updated)' }
    ]), createSelection(doc, state, {
      type: SELECTION_TYPE.VALUE,
      path: ['str']
    }))
  })

  it('should get selection from renaming a key', () => {
    assert.deepStrictEqual(createSelectionFromOperations(doc, [
      { op: 'move', from: '/str', path: '/strRenamed' },
      { op: 'move', from: '/foo', path: '/foo' },
      { op: 'move', from: '/bar', path: '/bar' }
    ]), createSelection(doc, state, {
      type: SELECTION_TYPE.KEY,
      path: ['strRenamed']
    }))
  })

  it('should get selection from removing a key', () => {
    assert.deepStrictEqual(createSelectionFromOperations(doc, [
      { op: 'remove', path: '/str' }
    ]), null)
  })

  it('should get selection from inserting a new root document', () => {
    assert.deepStrictEqual(createSelectionFromOperations(doc, [
      { op: 'replace', path: '', value: 'test' }
    ]), createSelection(doc, state, {
      type: SELECTION_TYPE.VALUE,
      path: []
    }))
  })
})
