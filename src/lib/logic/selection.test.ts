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
  const json = {
    obj: {
      arr: [1, 2, { first: 3, last: 4 }]
    },
    str: 'hello world',
    nill: null,
    bool: false
  }
  const state = syncState(json, undefined, [], () => true)

  it('should expand a selection (object)', () => {
    const start = ['obj', 'arr', '2', 'last']
    const end = ['nill']

    const actual = expandSelection(json, state, start, end)
    assert.deepStrictEqual(actual, [['obj'], ['str'], ['nill']])
  })

  it('should expand a selection (array)', () => {
    const start = ['obj', 'arr', 1]
    const end = ['obj', 'arr', 0] // note the "wrong" order of start and end

    const actual = expandSelection(json, state, start, end)
    assert.deepStrictEqual(actual, [
      ['obj', 'arr', 0],
      ['obj', 'arr', 1]
    ])
  })

  it('should expand a selection (array) (2)', () => {
    const start = ['obj', 'arr', 1] // child
    const end = ['obj', 'arr'] // parent

    const actual = expandSelection(json, state, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr', 2, 'first']
    const end = ['obj', 'arr', 2, 'first']

    const actual = expandSelection(json, state, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr', 2, 'first']])
  })

  it('should expand a selection (value)', () => {
    const start = ['obj', 'arr']
    const end = ['obj', 'arr']

    const actual = expandSelection(json, state, start, end)
    assert.deepStrictEqual(actual, [['obj', 'arr']])
  })

  it('should get parent path from a selection', () => {
    const path = ['a', 'b']

    assert.deepStrictEqual(
      getParentPath({ type: SELECTION_TYPE.AFTER, path, anchorPath: path, focusPath: path }),
      ['a']
    )
    assert.deepStrictEqual(
      getParentPath({ type: SELECTION_TYPE.INSIDE, path, anchorPath: path, focusPath: path }),
      ['a', 'b']
    )
    assert.deepStrictEqual(
      getParentPath({
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
      }),
      ['a']
    )

    const path1 = ['a', 'b']
    const path2 = ['a']
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.AFTER,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.INSIDE,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.KEY,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )
    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.VALUE,
        path: path1,
        anchorPath: path1,
        focusPath: path1
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.VALUE,
        path: path2,
        anchorPath: path2,
        focusPath: path2
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.KEY,
        path: path2,
        anchorPath: path2,
        focusPath: path2
      }),
      path2
    )

    assert.deepStrictEqual(
      findRootPath(json, {
        type: SELECTION_TYPE.MULTI,
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
    const state2 = syncState(json2, undefined, [], () => true)

    it('getSelectionLeft', () => {
      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.VALUE,
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        {
          type: SELECTION_TYPE.KEY,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.KEY,
          anchorPath: ['path1'],
          focusPath: ['path1']
        }),
        {
          type: SELECTION_TYPE.AFTER,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.AFTER,
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        {
          type: SELECTION_TYPE.VALUE,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.INSIDE,
          anchorPath: [],
          focusPath: []
        }),
        {
          type: SELECTION_TYPE.VALUE,
          anchorPath: [],
          focusPath: [],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['path1'],
          focusPath: ['path2'],
          paths: [['path1'], ['path2']],
          pathsMap: { '/path1': true, '/path2': true }
        }),
        {
          type: SELECTION_TYPE.KEY,
          anchorPath: ['path2'],
          focusPath: ['path2'],
          edit: false
        }
      )
    })

    it('getSelectionLeft: should select array item as a whole when moving left', () => {
      const json2 = [1, 2, 3]
      const state2 = syncState(json2, undefined, [], () => false)

      assert.deepStrictEqual(
        getSelectionLeft(json2, state2, {
          type: SELECTION_TYPE.VALUE,
          anchorPath: [1],
          focusPath: [1]
        }),
        {
          anchorPath: [1],
          focusPath: [1],
          paths: [[1]],
          pathsMap: {
            '/1': true
          },
          type: 'multi'
        }
      )
    })

    it('getSelectionLeft: keep anchor path', () => {
      const keepAnchorPath = true
      assert.deepStrictEqual(
        getSelectionLeft(
          json2,
          state2,
          { type: SELECTION_TYPE.VALUE, path: ['path'], anchorPath: ['path'], focusPath: ['path'] },
          keepAnchorPath
        ),
        {
          type: SELECTION_TYPE.MULTI,
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
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.KEY,
          path: ['path'],
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        {
          type: SELECTION_TYPE.VALUE,
          anchorPath: ['path'],
          focusPath: ['path'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.VALUE,
          path: [],
          anchorPath: [],
          focusPath: []
        }),
        {
          type: SELECTION_TYPE.INSIDE,
          anchorPath: [],
          focusPath: []
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.VALUE,
          path: ['path'],
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        {
          type: SELECTION_TYPE.AFTER,
          anchorPath: ['path'],
          focusPath: ['path']
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.AFTER,
          path: ['path'],
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        {
          type: SELECTION_TYPE.KEY,
          anchorPath: ['path1'],
          focusPath: ['path1'],
          edit: false
        }
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.INSIDE,
          path: ['path'],
          anchorPath: ['path'],
          focusPath: ['path']
        }),
        null
      )

      assert.deepStrictEqual(
        getSelectionRight(json2, state2, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['path1'],
          focusPath: ['path2'],
          paths: [['path1'], ['path2']],
          pathsMap: { '/path1': true, '/path2': true }
        }),
        {
          type: SELECTION_TYPE.VALUE,
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
          state2,
          { type: SELECTION_TYPE.KEY, path: ['path'], anchorPath: ['path'], focusPath: ['path'] },
          keepAnchorPath
        ),
        {
          type: SELECTION_TYPE.MULTI,
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
      const state2 = syncState(json2, undefined, [], () => true)

      it('should get selection up from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['obj'] })
          ),
          { type: SELECTION_TYPE.KEY, anchorPath: ['a'], focusPath: ['a'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['obj', 'c'] })
          ),
          { type: SELECTION_TYPE.KEY, anchorPath: ['obj'], focusPath: ['obj'] }
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['d'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] }
        )
      })

      it('should get selection up from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['a'], focusPath: ['a'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj', 'c'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['obj'], focusPath: ['obj'] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['d'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] }
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 1] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 0], focusPath: ['arr', 0] }
        )
      })

      it('should get selection up from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 1] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 1],
            focusPath: ['arr', 1]
          })
        )

        // FIXME: this should return multi selection of /obj/c instead of /obj
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.AFTER, path: ['obj'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['obj'],
            focusPath: ['obj']
          })
        )
      })

      it('should get selection up from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.INSIDE, path: ['arr'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr'],
            focusPath: ['arr']
          })
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.INSIDE, path: ['obj'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['obj'],
            focusPath: ['obj']
          })
        )
      })

      it('should get selection up from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['d'],
              focusPath: ['obj']
            })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['a'],
            focusPath: ['a']
          })
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['obj'],
              focusPath: ['d']
            })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['a'],
            focusPath: ['a']
          })
        )

        assert.deepStrictEqual(
          getSelectionUp(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['obj'],
              focusPath: ['d']
            }),
            false,
            true
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 1],
            focusPath: ['arr', 1]
          })
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
      const state2 = syncState(json2, undefined, [], () => true)

      it('should get selection down from KEY selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['obj'] })
          ),
          { type: SELECTION_TYPE.KEY, anchorPath: ['obj', 'c'], focusPath: ['obj', 'c'] }
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['obj', 'c'] })
          ),
          { type: SELECTION_TYPE.KEY, anchorPath: ['arr'], focusPath: ['arr'] }
        )

        // jump from key to array value
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.KEY, path: ['arr'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 0], focusPath: ['arr', 0] }
        )
      })

      it('should get selection down from VALUE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['obj', 'c'], focusPath: ['obj', 'c'] }
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['obj', 'c'] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr'], focusPath: ['arr'] }
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 1] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['d'], focusPath: ['d'] }
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.VALUE, path: ['arr', 0] })
          ),
          { type: SELECTION_TYPE.VALUE, anchorPath: ['arr', 1], focusPath: ['arr', 1] }
        )
      })

      it('should get selection down from AFTER selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 0] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 1],
            focusPath: ['arr', 1]
          })
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.AFTER, path: ['arr', 1] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['d'],
            focusPath: ['d']
          })
        )

        // FIXME
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.AFTER, path: ['obj'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['obj', 'c'],
            focusPath: ['obj', 'c']
          })
        )
      })

      it('should get selection down from INSIDE selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.INSIDE, path: ['arr'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 0],
            focusPath: ['arr', 0]
          })
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, { type: SELECTION_TYPE.INSIDE, path: ['obj'] })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['obj', 'c'],
            focusPath: ['obj', 'c']
          })
        )
      })

      it('should get selection down from MULTI selection', () => {
        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['arr'],
              focusPath: ['a']
            })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 0],
            focusPath: ['arr', 0]
          })
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['arr'],
              focusPath: ['a']
            }),
            false,
            true
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['obj'],
            focusPath: ['obj']
          })
        )

        assert.deepStrictEqual(
          getSelectionDown(
            json2,
            state2,
            createSelection(json2, state2, {
              type: SELECTION_TYPE.MULTI,
              anchorPath: ['a'],
              focusPath: ['arr']
            })
          ),
          createSelection(json2, state2, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: ['arr', 0],
            focusPath: ['arr', 0]
          })
        )
      })
    })
  })

  it('getInitialSelection', () => {
    function getInitialSelectionWithState(json) {
      const state = syncState(json, undefined, [], (path) => path.length <= 1)
      return getInitialSelection(json, state)
    }

    assert.deepStrictEqual(getInitialSelectionWithState({}), {
      type: SELECTION_TYPE.VALUE,
      anchorPath: [],
      focusPath: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState([]), {
      type: SELECTION_TYPE.VALUE,
      anchorPath: [],
      focusPath: []
    })
    assert.deepStrictEqual(getInitialSelectionWithState('test'), {
      type: SELECTION_TYPE.VALUE,
      anchorPath: [],
      focusPath: []
    })

    assert.deepStrictEqual(getInitialSelectionWithState({ a: 2, b: 3 }), {
      type: SELECTION_TYPE.KEY,
      anchorPath: ['a'],
      focusPath: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState({ a: {} }), {
      type: SELECTION_TYPE.KEY,
      anchorPath: ['a'],
      focusPath: ['a']
    })
    assert.deepStrictEqual(getInitialSelectionWithState([2, 3, 4]), {
      type: SELECTION_TYPE.VALUE,
      anchorPath: [0],
      focusPath: [0]
    })
  })

  it('should turn selection into text', () => {
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.KEY, path: ['str'] })
      ),
      'str'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.VALUE, path: ['str'] })
      ),
      'hello world'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.VALUE, path: ['obj', 'arr', 1] })
      ),
      '2'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.AFTER, path: ['str'] })
      ),
      null
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.INSIDE, path: ['str'] })
      ),
      null
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { anchorPath: ['str'], focusPath: ['bool'] })
      ),
      '"str": "hello world",\n' + '"nill": null,\n' + '"bool": false,'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj', 'arr', 0],
          focusPath: ['obj', 'arr', 1]
        })
      ),
      '1,\n' + '2,'
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj', 'arr', 0],
          focusPath: ['obj', 'arr', 0]
        })
      ),
      '1'
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.VALUE, path: ['obj'] })
      ),
      JSON.stringify(json.obj, null, 2)
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj'],
          focusPath: ['obj']
        })
      ),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )
  })

  it('should turn selected root object into text', () => {
    const json2 = {}
    const state2 = syncState(json2, undefined, [], () => true)

    assert.deepStrictEqual(
      selectionToPartialJson(
        json2,
        createSelection(json2, state2, { anchorPath: [], focusPath: [] })
      ),
      '{}'
    )
  })

  it('should turn selection into text with specified indentation', () => {
    const indentation = 4
    const objArr2 = '{\n' + '    "first": 3,\n' + '    "last": 4\n' + '}'

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, { type: SELECTION_TYPE.VALUE, path: ['obj', 'arr', 2] }),
        indentation
      ),
      objArr2
    )
    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj', 'arr', 1],
          focusPath: ['obj', 'arr', 2]
        }),
        indentation
      ),
      `2,\n${objArr2},`
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj'],
          focusPath: ['obj']
        })
      ),
      '"obj": ' + JSON.stringify(json.obj, null, 2) + ','
    )

    assert.deepStrictEqual(
      selectionToPartialJson(
        json,
        createSelection(json, state, {
          anchorPath: ['obj'],
          focusPath: ['obj']
        }),
        indentation
      ),
      '"obj": ' + JSON.stringify(json.obj, null, indentation) + ','
    )
  })

  describe('createSelectionFromOperations', () => {
    it('should get selection from add operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'add', path: '/obj/arr/2', value: 42 },
          { op: 'add', path: '/obj/arr/3', value: 43 }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['obj', 'arr', 2],
          focusPath: ['obj', 'arr', 3]
        })
      )
    })

    it('should get selection from move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'add', from: '/obj/arr/0', path: '/obj/arr/2' },
          { op: 'add', from: '/obj/arr/1', path: '/obj/arr/3' }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['obj', 'arr', 2],
          focusPath: ['obj', 'arr', 3]
        })
      )
    })

    it.skip('should get selection from wrongly ordered move operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'add', from: '/obj/arr/1', path: '/obj/arr/3' },
          { op: 'add', from: '/obj/arr/0', path: '/obj/arr/2' }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['obj', 'arr', 3],
          focusPath: ['obj', 'arr', 2]
        })
      )
    })

    it('should get selection from copy operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'copy', from: '/str', path: '/strCopy' }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.MULTI,
          anchorPath: ['strCopy'],
          focusPath: ['strCopy']
        })
      )
    })

    it('should get selection from replace operations', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'replace', path: '/str', value: 'hello world (updated)' }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.VALUE,
          path: ['str']
        })
      )
    })

    it('should get selection from renaming a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [
          { op: 'move', from: '/str', path: '/strRenamed' },
          { op: 'move', from: '/foo', path: '/foo' },
          { op: 'move', from: '/bar', path: '/bar' }
        ]),
        createSelection(json, state, {
          type: SELECTION_TYPE.KEY,
          path: ['strRenamed']
        })
      )
    })

    it('should get selection from removing a key', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [{ op: 'remove', path: '/str' }]),
        null
      )
    })

    it('should get selection from inserting a new root document', () => {
      assert.deepStrictEqual(
        createSelectionFromOperations(json, state, [{ op: 'replace', path: '', value: 'test' }]),
        createSelection(json, state, {
          type: SELECTION_TYPE.VALUE,
          path: []
        })
      )
    })
  })
})
