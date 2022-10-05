import assert, { deepStrictEqual } from 'assert'
import { flatMap, isEqual, range, times } from 'lodash-es'
import { ARRAY_SECTION_SIZE } from '../constants.js'
import {
  collapsePath,
  createDocumentState,
  deletePath,
  documentStatePatch,
  expandPath,
  expandSection,
  expandWithCallback,
  filterPath,
  forEachVisibleIndex,
  getEnforceString,
  getVisibleCaretPositions,
  getVisiblePaths,
  shiftPath,
  shiftVisibleSections,
  syncKeys
} from './documentState.js'
import {
  CaretType,
  type DocumentState,
  type JSONPointerMap,
  type VisibleSection
} from '../types.js'
import type { JSONValue, JSONPatchDocument } from 'immutable-json-patch'
import { compileJSONPointer, deleteIn, setIn } from 'immutable-json-patch'

describe('documentState', () => {
  it('syncKeys should append new keys and remove old keys', () => {
    assert.deepStrictEqual(syncKeys(['b', 'c'], ['a', 'b']), ['b', 'c'])
  })

  it('syncKeys should keep the previous order of the keys ', () => {
    assert.deepStrictEqual(syncKeys(['a', 'b'], ['b', 'a']), ['b', 'a'])
  })

  describe('expandWithCallback', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }
    const state = createDocumentState()

    it('should fully expand a json document', () => {
      assert.deepStrictEqual(expandWithCallback(json, state, [], () => true).expandedMap, {
        '': true,
        '/array': true,
        '/array/2': true,
        '/object': true
      })
    })

    it('should expand a nested item of a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, state, ['array'], (path) => isEqual(path, ['array'])).expandedMap,
        {
          '/array': true
        }
      )
    })

    it('should expand a part of a json document recursively', () => {
      assert.deepStrictEqual(expandWithCallback(json, state, ['array'], () => true).expandedMap, {
        '/array': true,
        '/array/2': true
      })
    })

    it('should partially expand a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, state, [], (path) => path.length <= 1).expandedMap,
        {
          '': true,
          '/array': true,
          '/object': true
        }
      )
    })

    it('should expand the root of a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, state, [], (path) => path.length === 0).expandedMap,
        {
          '': true
        }
      )
    })

    it('should not traverse non-expanded nodes', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, state, [], (path) => path.length > 0).expandedMap,
        {}
      )
    })

    it('should leave already expanded nodes as is', () => {
      const expandedMap = {
        '': true,
        '/array': true
      }
      const stateWithExpanded = {
        ...state,
        expandedMap
      }

      assert.deepStrictEqual(
        expandWithCallback(json, stateWithExpanded, [], () => false).expandedMap,
        expandedMap
      )
    })
  })

  it('get all expanded paths', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    const documentState = createDocumentState()
    assert.deepStrictEqual(getVisiblePaths(json, documentState), [[]])

    const documentState0 = createDocumentState({ json, expand: (path) => path.length <= 0 })
    assert.deepStrictEqual(getVisiblePaths(json, documentState0), [
      [],
      ['array'],
      ['object'],
      ['value']
    ])

    const documentState1 = createDocumentState({ json, expand: (path) => path.length <= 1 })
    assert.deepStrictEqual(getVisiblePaths(json, documentState1), [
      [],
      ['array'],
      ['array', '0'],
      ['array', '1'],
      ['array', '2'],
      ['object'],
      ['object', 'a'],
      ['object', 'b'],
      ['value']
    ])

    const documentState2 = createDocumentState({ json, expand: (path) => path.length <= 2 })
    assert.deepStrictEqual(getVisiblePaths(json, documentState2), [
      [],
      ['array'],
      ['array', '0'],
      ['array', '1'],
      ['array', '2'],
      ['array', '2', 'c'],
      ['object'],
      ['object', 'a'],
      ['object', 'b'],
      ['value']
    ])
  })

  it('getVisiblePaths should recon with visible sections in an array', () => {
    const count = 5 * ARRAY_SECTION_SIZE
    const json = {
      array: times(count, (index) => `item ${index}`)
    }

    // by default, should have a visible section from 0-100 only (so 100-500 is invisible)
    const documentState1 = createDocumentState({ json, expand: (path) => path.length <= 1 })
    assert.deepStrictEqual(getVisiblePaths(json, documentState1), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', String(index)])
    ])

    // create a visible section from 200-300 (in addition to the visible section 0-100)
    const start = 2 * ARRAY_SECTION_SIZE
    const end = 3 * ARRAY_SECTION_SIZE
    const documentState2 = expandSection(json, documentState1, compileJSONPointer(['array']), {
      start,
      end
    })
    assert.deepStrictEqual(getVisiblePaths(json, documentState2), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', String(index)]),
      ...times(end - start, (index) => ['array', String(index + start)])
    ])
  })

  it('should get all visible caret positions', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    const documentState = createDocumentState({ json, expand: () => false })
    assert.deepStrictEqual(getVisibleCaretPositions(json, documentState), [
      { path: [], type: CaretType.value }
    ])

    const documentState0 = createDocumentState({ json, expand: (path) => path.length <= 0 })
    assert.deepStrictEqual(getVisibleCaretPositions(json, documentState0), [
      { path: [], type: CaretType.value },
      { path: [], type: CaretType.inside },
      { path: ['array'], type: CaretType.key },
      { path: ['array'], type: CaretType.value },
      { path: ['array'], type: CaretType.after },
      { path: ['object'], type: CaretType.key },
      { path: ['object'], type: CaretType.value },
      { path: ['object'], type: CaretType.after },
      { path: ['value'], type: CaretType.key },
      { path: ['value'], type: CaretType.value },
      { path: ['value'], type: CaretType.after }
    ])
    assert.deepStrictEqual(getVisibleCaretPositions(json, documentState0, false), [
      { path: [], type: CaretType.value },
      { path: ['array'], type: CaretType.key },
      { path: ['array'], type: CaretType.value },
      { path: ['object'], type: CaretType.key },
      { path: ['object'], type: CaretType.value },
      { path: ['value'], type: CaretType.key },
      { path: ['value'], type: CaretType.value }
    ])

    const documentState1 = createDocumentState({ json, expand: (path) => path.length <= 1 })
    assert.deepStrictEqual(getVisibleCaretPositions(json, documentState1), [
      { path: [], type: CaretType.value },
      { path: [], type: CaretType.inside },
      { path: ['array'], type: CaretType.key },
      { path: ['array'], type: CaretType.value },
      { path: ['array'], type: CaretType.inside },
      { path: ['array', '0'], type: CaretType.value },
      { path: ['array', '0'], type: CaretType.after },
      { path: ['array', '1'], type: CaretType.value },
      { path: ['array', '1'], type: CaretType.after },
      { path: ['array', '2'], type: CaretType.value },
      { path: ['array', '2'], type: CaretType.after },
      { path: ['array'], type: CaretType.after },
      { path: ['object'], type: CaretType.key },
      { path: ['object'], type: CaretType.value },
      { path: ['object'], type: CaretType.inside },
      { path: ['object', 'a'], type: CaretType.key },
      { path: ['object', 'a'], type: CaretType.value },
      { path: ['object', 'a'], type: CaretType.after },
      { path: ['object', 'b'], type: CaretType.key },
      { path: ['object', 'b'], type: CaretType.value },
      { path: ['object', 'b'], type: CaretType.after },
      { path: ['object'], type: CaretType.after },
      { path: ['value'], type: CaretType.key },
      { path: ['value'], type: CaretType.value },
      { path: ['value'], type: CaretType.after }
    ])

    const documentState2 = createDocumentState({ json, expand: (path) => path.length <= 2 })
    assert.deepStrictEqual(getVisibleCaretPositions(json, documentState2), [
      { path: [], type: CaretType.value },
      { path: [], type: CaretType.inside },
      { path: ['array'], type: CaretType.key },
      { path: ['array'], type: CaretType.value },
      { path: ['array'], type: CaretType.inside },
      { path: ['array', '0'], type: CaretType.value },
      { path: ['array', '0'], type: CaretType.after },
      { path: ['array', '1'], type: CaretType.value },
      { path: ['array', '1'], type: CaretType.after },
      { path: ['array', '2'], type: CaretType.value },
      { path: ['array', '2'], type: CaretType.inside },
      { path: ['array', '2', 'c'], type: CaretType.key },
      { path: ['array', '2', 'c'], type: CaretType.value },
      { path: ['array', '2', 'c'], type: CaretType.after },
      { path: ['array', '2'], type: CaretType.after },
      { path: ['array'], type: CaretType.after },
      { path: ['object'], type: CaretType.key },
      { path: ['object'], type: CaretType.value },
      { path: ['object'], type: CaretType.inside },
      { path: ['object', 'a'], type: CaretType.key },
      { path: ['object', 'a'], type: CaretType.value },
      { path: ['object', 'a'], type: CaretType.after },
      { path: ['object', 'b'], type: CaretType.key },
      { path: ['object', 'b'], type: CaretType.value },
      { path: ['object', 'b'], type: CaretType.after },
      { path: ['object'], type: CaretType.after },
      { path: ['value'], type: CaretType.key },
      { path: ['value'], type: CaretType.value },
      { path: ['value'], type: CaretType.after }
    ])
  })

  it('getVisibleCaretPositions should recon with visible sections in an array', () => {
    const count = 5 * ARRAY_SECTION_SIZE
    const json = {
      array: times(count, (index) => `item ${index}`)
    }

    // by default, should have a visible section from 0-100 only (so 100-500 is invisible)
    const documentState1 = createDocumentState({ json, expand: (path) => path.length <= 1 })
    assert.deepStrictEqual(
      getVisibleCaretPositions(json, documentState1),
      flatMap([
        { path: [], type: CaretType.value },
        { path: [], type: CaretType.inside },

        { path: ['array'], type: CaretType.key },
        { path: ['array'], type: CaretType.value },
        { path: ['array'], type: CaretType.inside },

        ...times(ARRAY_SECTION_SIZE, (index) => {
          return [
            { path: ['array', String(index)], type: CaretType.value },
            { path: ['array', String(index)], type: CaretType.after }
          ]
        }),

        { path: ['array'], type: CaretType.after }
      ])
    )

    // create a visible section from 200-300 (in addition to the visible section 0-100)
    const start = 2 * ARRAY_SECTION_SIZE
    const end = 3 * ARRAY_SECTION_SIZE
    const documentState2 = expandSection(json, documentState1, compileJSONPointer(['array']), {
      start,
      end
    })
    assert.deepStrictEqual(
      getVisibleCaretPositions(json, documentState2),
      flatMap([
        { path: [], type: CaretType.value },
        { path: [], type: CaretType.inside },

        { path: ['array'], type: CaretType.key },
        { path: ['array'], type: CaretType.value },
        { path: ['array'], type: CaretType.inside },

        ...times(ARRAY_SECTION_SIZE, (index) => {
          return [
            { path: ['array', String(index)], type: CaretType.value },
            { path: ['array', String(index)], type: CaretType.after }
          ]
        }),

        ...times(end - start, (index) => {
          return [
            { path: ['array', String(index + start)], type: CaretType.value },
            { path: ['array', String(index + start)], type: CaretType.after }
          ]
        }),
        { path: ['array'], type: CaretType.after }
      ])
    )
  })

  it('should keep/update enforce string', () => {
    const json1 = 42
    const documentState1 = createDocumentState()
    assert.strictEqual(
      getEnforceString(json1, documentState1.enforceStringMap, compileJSONPointer([]), JSON),
      false
    )

    const json2 = '42'
    const documentState2 = createDocumentState()
    assert.strictEqual(
      getEnforceString(json2, documentState2.enforceStringMap, compileJSONPointer([]), JSON),
      true
    )
  })

  describe('documentStatePatch', () => {
    function createJsonAndState(): { json: JSONValue; documentState: DocumentState } {
      const json = {
        members: [
          { id: 1, name: 'Joe' },
          { id: 2, name: 'Sarah' },
          { id: 3, name: 'Mark' }
        ],
        group: {
          name: 'Group 1',
          location: 'Block C',
          details: {
            description: 'The first group'
          }
        }
      }

      const documentState: DocumentState = {
        ...createDocumentState({ json, expand: () => true }),
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 2 }]
        }
      }

      return { json, documentState }
    }

    it('add: should add a value to an object', () => {
      const json = { a: 2, b: 3 }
      const documentState = createDocumentState()

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/c', value: 4 }])

      assert.deepStrictEqual(res.json, { a: 2, b: 3, c: 4 })
      assert.deepStrictEqual(res.documentState, documentState)
    })

    it('add: should add a value to an object (expanded)', () => {
      const json = { a: 2, b: 3 }
      const documentState: DocumentState = {
        ...createDocumentState(),
        expandedMap: {
          '': true
        }
      }

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/c', value: 42 }])

      assert.deepStrictEqual(res.json, { a: 2, b: 3, c: 42 })
      assert.deepStrictEqual(res.documentState, documentState)
    })

    it('add: should override a value in an object', () => {
      const json = { a: 2, b: 3 }
      const documentState: DocumentState = {
        ...createDocumentState(),
        expandedMap: {
          '': true
        }
      }

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/a', value: 42 }])

      assert.deepStrictEqual(res.json, { a: 42, b: 3 })
      assert.deepStrictEqual(res.documentState, {
        ...documentState
      })
    })

    it('add: should insert a value in an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'add', path: '/members/1', value: { id: 42, name: 'Julia' } }
      ])

      assert.deepStrictEqual(res.json['members'], [
        { id: 1, name: 'Joe' },
        { id: 42, name: 'Julia' },
        { id: 2, name: 'Sarah' },
        { id: 3, name: 'Mark' }
      ])

      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/group/details': true,
          '/members': true,
          '/members/0': true,
          '/members/2': true,
          '/members/3': true
        },
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 3 }]
        }
      })
    })

    it('add: should append a value to an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'add', path: '/members/-', value: { id: 4, name: 'John' } }
      ])

      assert.deepStrictEqual(res.json['members'], [
        { id: 1, name: 'Joe' },
        { id: 2, name: 'Sarah' },
        { id: 3, name: 'Mark' },
        { id: 4, name: 'John' }
      ])
      assert.deepStrictEqual(res.documentState, documentState)
    })

    it('add: extend the visibleSection when appending a value to an array', () => {
      const json = [0, 1, 2, 3]
      const documentState = {
        ...createDocumentState(),
        expandedMap: {
          '': true
        },
        visibleSectionsMap: {
          '': [{ start: 0, end: 4 }]
        }
      }

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/4', value: 4 }])

      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        visibleSectionsMap: {
          '': [{ start: 0, end: 5 }]
        }
      })
    })

    it('replace: should keep enforceString state', () => {
      const json = '42'
      const documentState = {
        ...createDocumentState(),
        enforceStringMap: {
          '': true
        }
      }
      const pointer = compileJSONPointer([])
      assert.strictEqual(
        getEnforceString(json, documentState.enforceStringMap, pointer, JSON),
        true
      )

      const operations: JSONPatchDocument = [{ op: 'replace', path: '', value: 'forty two' }]
      const res = documentStatePatch(json, documentState, operations)
      assert.deepStrictEqual(
        getEnforceString(res.json, res.documentState.enforceStringMap, pointer, JSON),
        true
      )
    })

    it('remove: should remove a value from an object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'remove', path: '/group/location' }
      ])

      assert.deepStrictEqual(res.json, deleteIn(json, ['group', 'location']))
      assert.deepStrictEqual(res.documentState, documentState)
    })

    it('remove: should remove a value from an array', () => {
      const { json, documentState } = createJsonAndState()
      const res = documentStatePatch(json, documentState, [{ op: 'remove', path: '/members/1' }])

      assert.deepStrictEqual(res.json, deleteIn(json, ['members', '1']))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: deleteIn(documentState.expandedMap, ['/members/2']), // [2] is moved to [1]
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 1 }]
        }
      })
    })

    it('remove: should remove a value from an array (2)', () => {
      // verify that the maps indices are shifted
      const { json, documentState } = createJsonAndState()
      const documentState2 = collapsePath(documentState, ['members', '1'])

      const res = documentStatePatch(json, documentState2, [{ op: 'remove', path: '/members/1' }])

      assert.deepStrictEqual(res.json, deleteIn(json, ['members', '1']))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: deleteIn(documentState.expandedMap, ['/members/2']), // [2] is moved to [1]
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 1 }]
        }
      })
    })

    it('replace: should replace a an object with a value', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/group', value: 42 }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['group'], 42))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/members': true,
          '/members/0': true,
          '/members/1': true,
          '/members/2': true
        }
      })
    })

    it('replace: should replace a an object with a new object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/group', value: { groupId: '1234' } }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['group'], { groupId: '1234' }))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/members': true,
          '/members/0': true,
          '/members/1': true,
          '/members/2': true
        }
      })
    })

    it('replace: should replace a value in an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/members/1', value: 42 }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['members', '1'], 42))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: deleteIn(documentState.expandedMap, ['/members/1'])
      })
    })

    it('replace: should replace an array with a value', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/members', value: 42 }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['members'], 42))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/group/details': true
        },
        visibleSectionsMap: {}
      })
    })

    it('replace: should replace the root document itself', () => {
      const json = {
        c: {
          cc: 4
        },
        b: {
          bb: 3
        },
        a: 2
      }
      const documentState = {
        ...createDocumentState({ json, expand: () => true })
      }

      const operations: JSONPatchDocument = [
        {
          op: 'replace',
          path: '',
          value: { a: 22, b: 33, d: 55 }
        }
      ]
      const res = documentStatePatch(json, documentState, operations)

      // check order of keys
      assert.deepStrictEqual(Object.keys(res.json), ['a', 'b', 'd'])

      // keep expanded state of existing keys
      assert.strictEqual(res.documentState.expandedMap[compileJSONPointer([])], true)
      assert.strictEqual(res.documentState.expandedMap[compileJSONPointer(['b'])], true)

      // remove expanded state of removed keys
      assert.strictEqual(res.documentState.expandedMap[compileJSONPointer(['c'])], undefined)
    })

    it('copy: should copy a value into an object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'copy', from: '/members/1', path: '/group/user' }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['group', 'user'], json['members'][1]))
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          ...documentState.expandedMap,
          '/group/user': true
        }
      })
    })

    it('copy: should copy a value into an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'copy', from: '/group/details', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: json['group'],
        members: [
          json['members'][0],
          json['group']['details'],
          json['members'][1],
          json['members'][2]
        ]
      })

      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          ...documentState.expandedMap,
          '/members/3': true
        },
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 3 }]
        }
      })
    })

    it('move: should move a value from object to object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/details', path: '/details' }
      ])

      assert.deepStrictEqual(res.json, {
        members: json['members'],
        group: {
          name: 'Group 1',
          location: 'Block C'
        },
        details: {
          description: 'The first group'
        }
      })
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/details': true,
          '/members': true,
          '/members/0': true,
          '/members/1': true,
          '/members/2': true
        }
      })
    })

    it('move: moving a value inside the object itself should move it to the end of keys', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/name', path: '/group/name' }
      ])

      assert.deepStrictEqual(res.json, json)
      assert.deepStrictEqual(res.documentState, documentState)
    })

    it('move: should move a value from array to array (up)', () => {
      // we collapse the member we're going to move, so we can see whether the state is correctly switched
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = collapsePath(jsonAndState.documentState, ['members', '1'])

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/1', path: '/members/0' }
      ])

      assert.deepStrictEqual(res.json, {
        group: json['group'],
        members: [json['members'][1], json['members'][0], json['members'][2]]
      })

      // we have collapsed members[1], and after that moved it from index 1 to 0, so now members[0] should be collapsed
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/group/details': true,
          '/members': true,
          '/members/1': true,
          '/members/2': true
        }
      })
    })

    it('move: should move a value from array to array (down)', () => {
      // we collapse the member we're going to move, so we can see whether the state is correctly switched
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = collapsePath(jsonAndState.documentState, ['members', '0'])

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/0', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: json['group'],
        members: [json['members'][1], json['members'][0], json['members'][2]]
      })

      // we have collapsed members[0], and after that moved it from index 0 to 1, so now members[1] should be collapsed
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/group/details': true,
          '/members': true,
          '/members/0': true,
          '/members/2': true
        }
      })
    })

    it('move: should move a value from object to array', () => {
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = collapsePath(jsonAndState.documentState, ['members', '1'])

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/details', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: {
          name: 'Group 1',
          location: 'Block C'
        },
        members: [
          json['members'][0],
          {
            description: 'The first group'
          },
          json['members'][1],
          json['members'][2]
        ]
      })

      // we have collapsed members[0], and after that moved it from index 0 to 1, so now members[1] should be collapsed
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/members': true,
          '/members/0': true,
          '/members/1': true,
          '/members/3': true
        },
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 3 }]
        }
      })
    })

    it('move: should move a value from array to object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/1', path: '/group/user' }
      ])

      assert.deepStrictEqual(res.json, {
        group: {
          ...json['group'],
          user: json['members'][1]
        },
        members: [json['members'][0], json['members'][2]]
      })

      // we have collapsed members[0], and after that moved it from index 0 to 1, so now members[1] should be collapsed
      assert.deepStrictEqual(res.documentState, {
        ...documentState,
        expandedMap: {
          '': true,
          '/group': true,
          '/group/details': true,
          '/group/user': true,
          '/members': true,
          '/members/0': true,
          '/members/1': true
        },
        visibleSectionsMap: {
          '/members': [{ start: 0, end: 1 }]
        }
      })
    })
  })

  describe('shiftVisibleSections', () => {
    const json = [1, 2, 3, 4, 5, 6, 7, 8]
    const visibleSections: VisibleSection[] = [
      { start: 0, end: 2 },
      { start: 4, end: 6 }
    ]

    it('should have the right initial indices visible', () => {
      assert.deepStrictEqual(getVisibleIndices(json, visibleSections), [0, 1, 4, 5])
    })

    it('should insert at the start of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 0, 1), [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should insert halfway a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 1, 1), [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should insert at the end of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 2, 1), [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should remove at the start of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 0, -1), [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    it('should remove halfway a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 1, -1), [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    it('should remove at the end of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 2, -1), [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })
  })

  describe('expandPath', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    it('should expand root path', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState(), []).expandedMap, {
        '': true
      })
    })

    it('should expand an array', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState(), ['array']).expandedMap, {
        '': true,
        '/array': true
      })
    })

    it('should expand an object inside an array', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState(), ['array', '2']).expandedMap, {
        '': true,
        '/array': true,
        '/array/2': true
      })
    })

    it('should not expand a value (only objects and arrays)', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState(), ['array', '0']).expandedMap, {
        '': true,
        '/array': true
      })
    })

    it('should expand an object', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState(), ['object']).expandedMap, {
        '': true,
        '/object': true
      })
    })

    it('should expand visible section of an array if needed', () => {
      const json = {
        largeArray: range(0, 500)
      }

      assert.deepStrictEqual(expandPath(json, createDocumentState(), ['largeArray', '120']), {
        ...createDocumentState(),
        expandedMap: {
          '': true,
          '/largeArray': true
        },
        visibleSectionsMap: {
          '/largeArray': [{ start: 0, end: 200 }]
        }
      })
    })
  })

  describe('shiftPath', () => {
    const expandedPaths: JSONPointerMap<number> = {
      '/array': 1,
      '/array/0': 2,
      '/array/0/name': 3,
      '/array/2': 4,
      '/array/2/name': 5,
      '/array/3': 6,
      '/array/3/name': 7,
      '/obj': 8
    }

    it('should shift entries one up', () => {
      deepStrictEqual(shiftPath(expandedPaths, ['array'], 2, -1), {
        '/array': 1,
        '/array/0': 2,
        '/array/0/name': 3,
        '/array/1': 4,
        '/array/1/name': 5,
        '/array/2': 6,
        '/array/2/name': 7,
        '/obj': 8
      })
    })

    it('should shift entries one down', () => {
      deepStrictEqual(shiftPath(expandedPaths, ['array'], 2, 1), {
        '/array': 1,
        '/array/0': 2,
        '/array/0/name': 3,
        '/array/3': 4,
        '/array/3/name': 5,
        '/array/4': 6,
        '/array/4/name': 7,
        '/obj': 8
      })
    })

    it('should shift entries an offset 0 (do nothing)', () => {
      deepStrictEqual(shiftPath(expandedPaths, ['array'], 2, 0), expandedPaths)
    })
  })

  describe('deletePath', () => {
    const myStateMap: JSONPointerMap<number> = {
      '/array': 1,
      '/array/0': 2,
      '/array/1': 3,
      '/array/2': 4,
      '/array/2/name': 5,
      '/obj': 6
    }

    it('should delete an object path from a PathsMap', () => {
      deepStrictEqual(deletePath(myStateMap, ['obj']), {
        '/array': 1,
        '/array/0': 2,
        '/array/1': 3,
        '/array/2': 4,
        '/array/2/name': 5
      })
    })

    it('should delete an array item from a PathsMap', () => {
      deepStrictEqual(deletePath(myStateMap, ['array', '1']), {
        '/array': 1,
        '/array/0': 2,
        '/array/2': 4,
        '/array/2/name': 5,
        '/obj': 6
      })
    })

    it('should delete nested paths from a PathsMap', () => {
      deepStrictEqual(deletePath(myStateMap, ['array']), {
        '/obj': 6
      })
    })
  })

  describe('filterPath', () => {
    const expandedPaths: JSONPointerMap<number> = {
      '/array': 1,
      '/array/0': 2,
      '/array/1': 3,
      '/array/2': 4,
      '/array/2/name': 5,
      '/obj': 6
    }

    it('should filter an object path from a PathsMap', () => {
      deepStrictEqual(filterPath(expandedPaths, '/obj'), {
        '/obj': 6
      })
    })

    it('should filter an array item from a PathsMap', () => {
      deepStrictEqual(filterPath(expandedPaths, '/array/1'), {
        '/array/1': 3
      })
    })

    it('should delete nested paths from a PathsMap', () => {
      deepStrictEqual(filterPath(expandedPaths, '/array'), {
        '/array': 1,
        '/array/0': 2,
        '/array/1': 3,
        '/array/2': 4,
        '/array/2/name': 5
      })
    })
  })
})

/**
 * Helper function to get the visible indices of an Array state
 */
function getVisibleIndices(json: JSONValue, visibleSections: VisibleSection[]): number[] {
  const visibleIndices = []

  if (Array.isArray(json)) {
    forEachVisibleIndex(json, visibleSections, (index) => {
      visibleIndices.push(index)
    })
  }

  return visibleIndices
}
