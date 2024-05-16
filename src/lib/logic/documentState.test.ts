import assert from 'assert'
import { describe, expect, test } from 'vitest'
import { flatMap, isEqual, range, times } from 'lodash-es'
import { ARRAY_SECTION_SIZE, DEFAULT_VISIBLE_SECTIONS } from '../constants.js'
import {
  createArrayDocumentState,
  createDocumentState,
  createObjectDocumentState,
  createValueDocumentState,
  documentStatePatch,
  ensureNestedDocumentState,
  expandPath,
  expandSection,
  expandWithCallback,
  forEachVisibleIndex,
  getEnforceString,
  getVisibleCaretPositions,
  getVisiblePaths,
  shiftVisibleSections,
  syncDocumentState,
  syncKeys,
  toRecursiveStatePath,
  updateInDocumentState
} from './documentState.js'
import { CaretType, type DocumentState, type VisibleSection } from '$lib/types.js'
import { deleteIn, getIn, type JSONPatchDocument, setIn, updateIn } from 'immutable-json-patch'
import { isArrayDocumentState } from 'svelte-jsoneditor'

describe('documentState', () => {
  test('syncKeys should append new keys and remove old keys', () => {
    assert.deepStrictEqual(syncKeys(['b', 'c'], ['a', 'b']), ['b', 'c'])
  })

  test('syncKeys should keep the previous order of the keys ', () => {
    assert.deepStrictEqual(syncKeys(['a', 'b'], ['b', 'a']), ['b', 'a'])
  })

  describe('ensureNestedDocumentState', () => {
    test('should create nested state in an array', () => {
      const expected: DocumentState = {
        type: 'array',
        expanded: false,
        // eslint-disable-next-line no-sparse-arrays
        items: [, { type: 'value' }],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      assert.deepStrictEqual(ensureNestedDocumentState([1, 2, 3], undefined, ['1']), expected)
    })

    test('should maintain state when creating nested state in an array', () => {
      const state: DocumentState = {
        type: 'array',
        expanded: true,
        items: [],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      const expected: DocumentState = {
        type: 'array',
        expanded: true,
        // eslint-disable-next-line no-sparse-arrays
        items: [, { type: 'value' }],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      assert.deepStrictEqual(ensureNestedDocumentState([1, 2, 3], state, ['1']), expected)
    })

    test('should create nested state in an object', () => {
      const expected: DocumentState = {
        type: 'object',
        expanded: false,
        properties: {
          a: { type: 'value' }
        }
      }

      assert.deepStrictEqual(ensureNestedDocumentState({ a: 2, b: 3 }, undefined, ['a']), expected)
    })

    test('should maintain state when creating nested state in an object', () => {
      const state: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {}
      }

      const expected: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          a: { type: 'value' }
        }
      }

      assert.deepStrictEqual(ensureNestedDocumentState({ a: 2, b: 3 }, state, ['a']), expected)
    })

    test('should create nested state in an object and array', () => {
      const expected: DocumentState = {
        type: 'object',
        expanded: false,
        properties: {
          array: {
            type: 'array',
            expanded: false,
            // eslint-disable-next-line no-sparse-arrays
            items: [, { type: 'value' }],
            visibleSections: DEFAULT_VISIBLE_SECTIONS
          }
        }
      }

      assert.deepStrictEqual(
        ensureNestedDocumentState({ array: [1, 2, 3] }, undefined, ['array', '1']),
        expected
      )
    })

    test('should maintain value state', () => {
      const state: DocumentState = {
        type: 'value',
        enforceString: true
      }

      assert.deepStrictEqual(ensureNestedDocumentState(42, state, []), state)
    })
  })

  describe('syncDocumentState', () => {
    test('should maintain array documentState when no change is needed', () => {
      const state: DocumentState = {
        type: 'array',
        expanded: true,
        items: [{ type: 'value', enforceString: false }],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }
      assert.deepStrictEqual(syncDocumentState([1, 2, 3], state), state)
    })

    test('should maintain object documentState when no change is needed', () => {
      const state: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          c: { type: 'value', enforceString: false }
        }
      }
      assert.deepStrictEqual(syncDocumentState({ a: 1, b: 2, c: 3 }, state), state)
    })

    test('should switch array, object, and value state', () => {
      const arrayState = createArrayDocumentState()
      const objectState = createObjectDocumentState()
      const valueState = createValueDocumentState()

      assert.deepStrictEqual(syncDocumentState(undefined, arrayState), undefined)
      assert.deepStrictEqual(syncDocumentState(undefined, objectState), undefined)
      assert.deepStrictEqual(syncDocumentState(undefined, valueState), undefined)
      assert.deepStrictEqual(syncDocumentState(undefined, undefined), undefined)

      assert.deepStrictEqual(syncDocumentState([], arrayState), arrayState)
      assert.deepStrictEqual(syncDocumentState([], objectState), arrayState)
      assert.deepStrictEqual(syncDocumentState([], valueState), arrayState)
      assert.deepStrictEqual(syncDocumentState([], undefined), undefined)

      assert.deepStrictEqual(syncDocumentState({}, arrayState), objectState)
      assert.deepStrictEqual(syncDocumentState({}, objectState), objectState)
      assert.deepStrictEqual(syncDocumentState({}, valueState), objectState)
      assert.deepStrictEqual(syncDocumentState({}, undefined), undefined)

      assert.deepStrictEqual(syncDocumentState(42, arrayState), undefined)
      assert.deepStrictEqual(syncDocumentState(42, objectState), undefined)
      assert.deepStrictEqual(syncDocumentState(42, valueState), valueState)
      assert.deepStrictEqual(syncDocumentState(42, undefined), undefined)
    })

    test('should maintain expanded state when switching between array and object', () => {
      const arrayState = createArrayDocumentState({ expanded: false })
      const objectState = createObjectDocumentState({ expanded: false })
      const arrayStateExpanded = createArrayDocumentState({ expanded: true })
      const objectStateExpanded = createObjectDocumentState({ expanded: true })

      assert.deepStrictEqual(syncDocumentState({}, arrayState), objectState)
      assert.deepStrictEqual(syncDocumentState([], objectState), arrayState)

      assert.deepStrictEqual(syncDocumentState({}, arrayStateExpanded), objectStateExpanded)
      assert.deepStrictEqual(syncDocumentState([], objectStateExpanded), arrayStateExpanded)
    })

    test('should remove deleted properties', () => {
      const state: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          a: { type: 'value', enforceString: false },
          b: { type: 'value', enforceString: false },
          c: { type: 'value', enforceString: false }
        }
      }

      const expected: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          a: { type: 'value', enforceString: false },
          c: { type: 'value', enforceString: false }
        }
      }

      assert.deepStrictEqual(syncDocumentState({ a: 1, c: 3, d: 4 }, state), expected)
    })

    test('should remove deleted items', () => {
      const state: DocumentState = {
        type: 'array',
        expanded: true,
        // eslint-disable-next-line no-sparse-arrays
        items: [, { type: 'value' }, { type: 'value' }],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      const expected: DocumentState = {
        type: 'array',
        expanded: true,
        // eslint-disable-next-line no-sparse-arrays
        items: [, { type: 'value' }],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      assert.deepStrictEqual(syncDocumentState([1, 2], state), expected)
    })

    test('should work on nested objects', () => {
      const state: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          nested: {
            type: 'object',
            expanded: true,
            properties: {
              c: { type: 'value', enforceString: false },
              d: { type: 'value', enforceString: false }
            }
          }
        }
      }

      const expected: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {
          nested: {
            type: 'object',
            expanded: true,
            properties: {
              c: { type: 'value', enforceString: false }
            }
          }
        }
      }

      assert.deepStrictEqual(syncDocumentState({ nested: { a: 1, b: 2, c: 3 } }, state), expected)

      const expected2: DocumentState = {
        type: 'object',
        expanded: true,
        properties: {}
      }

      assert.deepStrictEqual(syncDocumentState({ nested: 42 }, state), expected2)
    })

    test('should work on nested arrays', () => {
      const state: DocumentState = {
        type: 'array',
        expanded: true,
        items: [
          {
            type: 'array',
            expanded: true,
            visibleSections: DEFAULT_VISIBLE_SECTIONS,
            // eslint-disable-next-line no-sparse-arrays
            items: [{ type: 'value' }, { type: 'value' }, { type: 'value' }, { type: 'value' }]
          }
        ],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      const expected: DocumentState = {
        type: 'array',
        expanded: true,
        items: [
          {
            type: 'array',
            expanded: true,
            visibleSections: DEFAULT_VISIBLE_SECTIONS,
            // eslint-disable-next-line no-sparse-arrays
            items: [{ type: 'value' }, { type: 'value' }, { type: 'value' }]
          }
        ],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      assert.deepStrictEqual(syncDocumentState([[1, 2, 3]], state), expected)

      const expected2: DocumentState = {
        type: 'array',
        expanded: true,
        // eslint-disable-next-line no-sparse-arrays
        items: [],
        visibleSections: DEFAULT_VISIBLE_SECTIONS
      }

      assert.deepStrictEqual(syncDocumentState([42], state), expected2)
    })
  })

  test('toRecursiveStatePath', () => {
    const json = {
      foo: { a: 42 },
      bar: [1, 2, 3]
    }

    expect(toRecursiveStatePath(json, [])).toEqual([])
    expect(toRecursiveStatePath(json, ['foo'])).toEqual(['properties', 'foo'])
    expect(toRecursiveStatePath(json, ['bar'])).toEqual(['properties', 'bar'])
    expect(toRecursiveStatePath(json, ['bar', '2'])).toEqual(['properties', 'bar', 'items', '2'])
  })

  describe('expandWithCallback', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }
    const expandedState = createDocumentState({ json })

    test('should fully expand a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, [], () => true),
        {
          type: 'object',
          expanded: true,
          properties: {
            array: {
              type: 'array',
              expanded: true,
              visibleSections: DEFAULT_VISIBLE_SECTIONS,
              // eslint-disable-next-line no-sparse-arrays
              items: [, , { type: 'object', expanded: true, properties: {} }]
            },
            object: {
              type: 'object',
              expanded: true,
              properties: {}
            }
          }
        }
      )
    })

    test('should expand a nested item of a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, ['array'], (path) => isEqual(path, ['array'])),
        {
          expanded: false,
          properties: {
            array: {
              type: 'array',
              expanded: true,
              visibleSections: DEFAULT_VISIBLE_SECTIONS,
              items: []
            }
          },
          type: 'object'
        }
      )
    })

    test('should expand a part of a json document recursively', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, ['array'], () => true),
        {
          expanded: false,
          properties: {
            array: {
              type: 'array',
              expanded: true,
              visibleSections: DEFAULT_VISIBLE_SECTIONS,
              // eslint-disable-next-line no-sparse-arrays
              items: [, , { expanded: true, properties: {}, type: 'object' }]
            }
          },
          type: 'object'
        }
      )
    })

    test('should partially expand a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, [], (path) => path.length <= 1),
        {
          expanded: true,
          properties: {
            array: {
              type: 'array',
              expanded: true,
              visibleSections: DEFAULT_VISIBLE_SECTIONS,
              items: []
            },
            object: { type: 'object', expanded: true, properties: {} }
          },
          type: 'object'
        }
      )
    })

    test('should expand the root of a json document', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, [], (path) => path.length === 0),
        {
          expanded: true,
          properties: {},
          type: 'object'
        }
      )
    })

    test('should not traverse non-expanded nodes', () => {
      assert.deepStrictEqual(
        expandWithCallback(json, expandedState, [], (path) => path.length > 0),
        {
          expanded: false,
          properties: {},
          type: 'object'
        }
      )
    })
  })

  test('get all expanded paths', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    const documentState = createDocumentState({ json })
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

  test('getVisiblePaths should recon with visible sections in an array', () => {
    const count = 5 * ARRAY_SECTION_SIZE
    const json = {
      array: times(count, (index) => `item ${index}`)
    }

    // by default, should have a visible section from 0-100 only (so 100-500 is invisible)
    const documentState1 = createDocumentState({ json, expand: () => true })
    assert.deepStrictEqual(getVisiblePaths(json, documentState1), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', String(index)])
    ])

    // create a visible section from 200-300 (in addition to the visible section 0-100)
    const start = 2 * ARRAY_SECTION_SIZE
    const end = 3 * ARRAY_SECTION_SIZE
    const documentState2 = expandSection(json, documentState1, ['array'], { start, end })
    assert.deepStrictEqual(getVisiblePaths(json, documentState2), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', String(index)]),
      ...times(end - start, (index) => ['array', String(index + start)])
    ])
  })

  test('should get all visible caret positions', () => {
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

  test('getVisibleCaretPositions should recon with visible sections in an array', () => {
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
    const documentState2 = expandSection(json, documentState1, ['array'], { start, end })
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

  test('should keep/update enforce string', () => {
    const json1 = 42
    const documentState1 = createDocumentState({ json: json1 })
    assert.strictEqual(getEnforceString(json1, documentState1, [], JSON), false)

    const json2 = '42'
    const documentState2 = createDocumentState({ json: json2 })
    assert.strictEqual(getEnforceString(json2, documentState2, [], JSON), true)
  })

  describe('documentStatePatch', () => {
    function createJsonAndState(): { json: unknown; documentState: DocumentState | undefined } {
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

      let documentState = createDocumentState({ json, expand: () => true })

      documentState = updateInDocumentState(json, documentState, ['members'], (_value, state) => {
        return isArrayDocumentState(state)
          ? { ...state, visibleSections: [{ start: 0, end: 3 }] }
          : state
      })

      return { json, documentState }
    }

    test('add: should add a value to an object', () => {
      const json = { a: 2, b: 3 }
      const documentState = createDocumentState({ json })

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/c', value: 4 }])

      assert.deepStrictEqual(res.json, { a: 2, b: 3, c: 4 })
      assert.deepStrictEqual(res.state, documentState)
    })

    test('add: should add a value to an object (expanded)', () => {
      const json = { a: 2, b: 3 }
      const documentState = createDocumentState({ json, expand: () => true })

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/c', value: 42 }])

      assert.deepStrictEqual(res.json, { a: 2, b: 3, c: 42 })
      assert.deepStrictEqual(res.state, documentState)
    })

    test('add: should override a value in an object', () => {
      const json = { a: 2, b: 3 }
      const documentState = createDocumentState({ json, expand: () => true })

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/a', value: 42 }])

      assert.deepStrictEqual(res.json, { a: 42, b: 3 })
      assert.deepStrictEqual(res.state, {
        ...documentState
      })
    })

    test('add: should insert a value in an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'add', path: '/members/1', value: { id: 42, name: 'Julia' } }
      ])

      assert.deepStrictEqual((res.json as Record<string, unknown>)?.['members'], [
        { id: 1, name: 'Joe' },
        { id: 42, name: 'Julia' },
        { id: 2, name: 'Sarah' },
        { id: 3, name: 'Mark' }
      ])

      assert.deepStrictEqual(res.state, {
        expanded: true,
        properties: {
          group: {
            expanded: true,
            properties: {
              details: { expanded: true, properties: {}, type: 'object' }
            },
            type: 'object'
          },
          members: {
            expanded: true,
            // eslint-disable-next-line no-sparse-arrays
            items: [
              { expanded: true, properties: {}, type: 'object' },
              ,
              { expanded: true, properties: {}, type: 'object' },
              { expanded: true, properties: {}, type: 'object' }
            ],
            type: 'array',
            visibleSections: [{ start: 0, end: 4 }]
          }
        },
        type: 'object'
      })
    })

    test('add: should append a value to an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'add', path: '/members/-', value: { id: 4, name: 'John' } }
      ])

      assert.deepStrictEqual((res.json as Record<string, unknown>)['members'], [
        { id: 1, name: 'Joe' },
        { id: 2, name: 'Sarah' },
        { id: 3, name: 'Mark' },
        { id: 4, name: 'John' }
      ])
      assert.deepStrictEqual(res.state, documentState)
    })

    test('add: extend the visibleSection when appending a value to an array', () => {
      const json = [0, 1, 2, 3]
      const documentState: DocumentState = {
        type: 'array',
        expanded: true,
        items: [],
        visibleSections: [{ start: 0, end: 5 }]
      }

      const res = documentStatePatch(json, documentState, [{ op: 'add', path: '/4', value: 4 }])

      assert.deepStrictEqual(res.state, {
        type: 'array',
        expanded: true,
        items: [],
        visibleSections: [{ start: 0, end: 6 }]
      })
    })

    test('replace: should keep enforceString state', () => {
      const json = '42'
      const documentState: DocumentState = {
        type: 'value',
        enforceString: true
      }

      const operations: JSONPatchDocument = [{ op: 'replace', path: '', value: 'forty two' }]
      const res = documentStatePatch(json, documentState, operations)
      assert.deepStrictEqual(res.state, {
        type: 'value',
        enforceString: true
      })
    })

    test('remove: should remove a value from an object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'remove', path: '/group/location' }
      ])

      assert.deepStrictEqual(res.json, deleteIn(json, ['group', 'location']))
      assert.deepStrictEqual(res.state, documentState)
    })

    test('remove: should remove a value from an array', () => {
      const { json, documentState } = createJsonAndState()
      const res = documentStatePatch(json, documentState, [{ op: 'remove', path: '/members/1' }])

      assert.deepStrictEqual(res.json, deleteIn(json, ['members', '1']))
      assert.deepStrictEqual(
        res.state,
        updateIn(documentState, ['properties', 'members'], (state: DocumentState) => ({
          ...state,
          items: state.type === 'array' ? state.items.slice(0, 2) : null,
          visibleSections: [{ start: 0, end: 2 }]
        }))
      )
    })

    test('remove: should remove a value from an array (2)', () => {
      // verify that the maps indices are shifted
      const { json, documentState } = createJsonAndState()
      const documentState2 = setIn<DocumentState>(
        documentState,
        ['properties', 'members', 'items', '1', 'expanded'],
        false
      )

      const res = documentStatePatch(json, documentState2, [{ op: 'remove', path: '/members/1' }])

      assert.deepStrictEqual(res.json, deleteIn(json, ['members', '1']))
      assert.deepStrictEqual(
        res.state,
        updateIn(documentState, ['properties', 'members'], (state: DocumentState) => ({
          ...state,
          items: state.type === 'array' ? [state.items[0], state.items[2]] : null,
          visibleSections: [{ start: 0, end: 2 }]
        }))
      )
    })

    test('replace: should replace a an object with a value', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/group', value: 42 }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['group'], 42))
      assert.deepStrictEqual(res.state, deleteIn(documentState, ['properties', 'group']))
    })

    test('replace: should replace a an object with a new object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/group', value: { groupId: '1234' } }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['group'], { groupId: '1234' }))
      assert.deepStrictEqual(res.state, {
        type: 'object',
        expanded: true,
        properties: {
          group: { expanded: true, properties: {}, type: 'object' },
          members: {
            type: 'array',
            expanded: true,
            items: [
              { expanded: true, properties: {}, type: 'object' },
              { expanded: true, properties: {}, type: 'object' },
              { expanded: true, properties: {}, type: 'object' }
            ],
            visibleSections: [{ end: 3, start: 0 }]
          }
        }
      })
    })

    test('replace: should replace a value in an array', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/members/1', value: 42 }
      ])

      const items = getIn(documentState, ['properties', 'members', 'items']) as DocumentState[]
      assert.deepStrictEqual(res.json, setIn(json, ['members', '1'], 42))
      assert.deepStrictEqual(
        res.state,
        // eslint-disable-next-line no-sparse-arrays
        setIn(documentState, ['properties', 'members', 'items'], [items[0], , items[2]])
      )
    })

    test('replace: should replace an array with a value', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'replace', path: '/members', value: 42 }
      ])

      assert.deepStrictEqual(res.json, setIn(json, ['members'], 42))
      assert.deepStrictEqual(res.state, deleteIn(documentState, ['properties', 'members']))
    })

    test('replace: should replace the root document itself', () => {
      const json = {
        c: { cc: 4 },
        b: { bb: 3 },
        a: { aa: 222 }
      }
      const documentState = createDocumentState({ json, expand: () => true })

      const operations: JSONPatchDocument = [
        {
          op: 'replace',
          path: '',
          value: { a: { aa: 22 }, b: 33, d: 55 }
        }
      ]
      const res = documentStatePatch(json, documentState, operations)

      // check order of keys
      assert.deepStrictEqual(Object.keys(res.json as Record<string, unknown>), ['a', 'b', 'd'])

      // keep expanded state of existing keys, and remove expanded state of removed keys
      assert.deepStrictEqual(res.state, {
        type: 'object',
        expanded: true,
        properties: {
          a: { type: 'object', expanded: true, properties: {} }
        }
      })
    })

    test('copy: should copy a value into an object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'copy', from: '/members/1', path: '/group/user' }
      ])

      assert.deepStrictEqual(
        res.json,
        setIn(json, ['group', 'user'], getIn(json, ['members', '1']))
      )
      assert.deepStrictEqual(
        res.state,
        setIn(documentState, ['properties', 'group', 'properties', 'user'], {
          type: 'object',
          expanded: true,
          properties: {}
        })
      )
    })

    test('copy: should copy a value into an array', () => {
      const { json, documentState } = createJsonAndState()
      const documentState2 = setIn<DocumentState>(
        documentState,
        ['properties', 'group', 'properties', 'details', 'expanded'],
        false
      )

      const res = documentStatePatch(json, documentState2, [
        { op: 'copy', from: '/group/details', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: getIn(json, ['group']),
        members: [
          getIn(json, ['members', '0']),
          getIn(json, ['group', 'details']),
          getIn(json, ['members', '1']),
          getIn(json, ['members', '2'])
        ]
      })

      assert.deepStrictEqual(
        res.state,
        updateIn(documentState2, ['properties', 'members'], (state: DocumentState) => ({
          ...state,
          items:
            state.type === 'array'
              ? [
                  state.items[0],
                  getIn(documentState2, ['properties', 'group', 'properties', 'details']),
                  state.items[1],
                  state.items[2]
                ]
              : null,
          visibleSections: [{ start: 0, end: 4 }]
        }))
      )
    })

    test('move: should move a value from object to object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/details', path: '/details' }
      ])

      assert.deepStrictEqual(res.json, {
        members: (json as Record<string, unknown>)['members'],
        group: {
          name: 'Group 1',
          location: 'Block C'
        },
        details: {
          description: 'The first group'
        }
      })

      let expectedDocumentState = documentState
      const fromPathRecursive = ['properties', 'group', 'properties', 'details']
      const value = getIn(expectedDocumentState, fromPathRecursive)
      expectedDocumentState = deleteIn(expectedDocumentState, fromPathRecursive)
      expectedDocumentState = setIn(expectedDocumentState, ['properties', 'details'], value)

      assert.deepStrictEqual(res.state, expectedDocumentState)
    })

    test('move: moving a value inside the object itself should move it to the end of keys', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/name', path: '/group/name' }
      ])

      assert.deepStrictEqual(res.json, json)
      assert.deepStrictEqual(res.state, documentState)
    })

    test('move: should move a value from array to array (up)', () => {
      // we collapse the member we're going to move, so we can see whether the state is correctly switched
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = setIn<DocumentState>(
        jsonAndState.documentState,
        ['properties', 'members', 'items', '1', 'expanded'],
        false
      )

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/1', path: '/members/0' }
      ])

      assert.deepStrictEqual(res.json, {
        group: (json as Record<string, unknown>)['group'],
        members: [
          getIn(json, ['members', '1']),
          getIn(json, ['members', '0']),
          getIn(json, ['members', '2'])
        ]
      })

      // we have collapsed members[1], and after that moved it from index 1 to 0, so now members[0] should be collapsed
      assert.deepStrictEqual(
        res.state,
        updateIn(documentState, ['properties', 'members'], (state: DocumentState | undefined) => {
          return {
            ...state,
            items: state?.type === 'array' ? [state.items[1], state.items[0], state.items[2]] : null
          }
        })
      )
    })

    test('move: should move a value from array to array (down)', () => {
      // we collapse the member we're going to move, so we can see whether the state is correctly switched
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = setIn<DocumentState>(
        jsonAndState.documentState,
        ['properties', 'members', 'items', '0', 'expanded'],
        false
      )

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/0', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: (json as Record<string, unknown>)['group'],
        members: [
          getIn(json, ['members', '1']),
          getIn(json, ['members', '0']),
          getIn(json, ['members', '2'])
        ]
      })

      // we have collapsed members[0], and after that moved it from index 0 to 1, so now members[1] should be collapsed
      assert.deepStrictEqual(
        res.state,
        updateIn(documentState, ['properties', 'members'], (state: DocumentState | undefined) => {
          return {
            ...state,
            items: state?.type === 'array' ? [state.items[1], state.items[0], state.items[2]] : null
          }
        })
      )
    })

    test('move: should move a value from object to array', () => {
      const jsonAndState = createJsonAndState()
      const json = jsonAndState.json
      const documentState = setIn<DocumentState>(
        jsonAndState.documentState,
        ['properties', 'members', 'items', '1', 'expanded'],
        false
      )

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/group/details', path: '/members/1' }
      ])

      assert.deepStrictEqual(res.json, {
        group: {
          name: 'Group 1',
          location: 'Block C'
        },
        members: [
          getIn(json, ['members', '0']),
          { description: 'The first group' },
          getIn(json, ['members', '1']),
          getIn(json, ['members', '2'])
        ]
      })

      const fromPathRecursive = ['properties', 'group', 'properties', 'details']
      let expectedDocumentState = deleteIn(documentState, fromPathRecursive)
      expectedDocumentState = updateIn(
        expectedDocumentState,
        ['properties', 'members'],
        (state: DocumentState) => ({
          ...state,
          items:
            state.type === 'array'
              ? [
                  state.items[0],
                  getIn(documentState, fromPathRecursive),
                  state.items[1],
                  state.items[2]
                ]
              : null,
          visibleSections: [{ start: 0, end: 4 }]
        })
      )
      assert.deepStrictEqual(res.state, expectedDocumentState)
    })

    test('move: should move a value from array to object', () => {
      const { json, documentState } = createJsonAndState()

      const res = documentStatePatch(json, documentState, [
        { op: 'move', from: '/members/1', path: '/group/user' }
      ])

      assert.deepStrictEqual(res.json, {
        group: {
          ...(getIn(json, ['group']) as Record<string, unknown>),
          user: getIn(json, ['members', '1'])
        },
        members: [getIn(json, ['members', '0']), getIn(json, ['members', '2'])]
      })

      const pathRecursive = ['properties', 'group', 'properties', 'user']
      let expectedDocumentState = setIn(documentState, pathRecursive, {
        type: 'object',
        expanded: true,
        properties: {}
      })
      expectedDocumentState = updateIn(
        expectedDocumentState,
        ['properties', 'members'],
        (state: DocumentState) => ({
          ...state,
          items: state.type === 'array' ? [state.items[0], state.items[2]] : null,
          visibleSections: [{ start: 0, end: 2 }]
        })
      )
      assert.deepStrictEqual(res.state, expectedDocumentState)
    })
  })

  describe('shiftVisibleSections', () => {
    const json = [1, 2, 3, 4, 5, 6, 7, 8]
    const visibleSections: VisibleSection[] = [
      { start: 0, end: 2 },
      { start: 4, end: 6 }
    ]

    test('should have the right initial indices visible', () => {
      assert.deepStrictEqual(getVisibleIndices(json, visibleSections), [0, 1, 4, 5])
    })

    test('should insert at the start of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 0, 1), [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    test('should insert halfway a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 1, 1), [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    test('should insert at the end of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 2, 1), [
        { start: 0, end: 2 },
        { start: 5, end: 7 }
      ])
    })

    test('should remove at the start of a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 0, -1), [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    test('should remove halfway a visible section', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 1, -1), [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    test('should remove inside an invisible section (start)', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 2, -1), [
        { start: 0, end: 2 },
        { start: 3, end: 5 }
      ])
    })

    test('should remove inside an invisible section (middle)', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 3, -1), [
        { start: 0, end: 2 },
        { start: 3, end: 5 }
      ])
    })

    test('should remove inside an invisible section (end)', () => {
      assert.deepStrictEqual(shiftVisibleSections(visibleSections, 4, -1), [
        { start: 0, end: 2 },
        { start: 4, end: 5 }
      ])
    })

    test('should merge visible sections when adjacent', () => {
      const visibleSections2 = [
        { start: 0, end: 100 },
        { start: 200, end: 300 }
      ]

      assert.deepStrictEqual(shiftVisibleSections(visibleSections2, 100, -100), [
        { start: 0, end: 200 }
      ])
    })
  })

  describe('expandPath', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5, nested: { c: 6 } },
      value: 'hello'
    }

    test('should expand root path', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState({ json }), []), {
        type: 'object',
        expanded: false,
        properties: {}
      })
    })

    test('should expand an array', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState({ json }), ['array']), {
        type: 'object',
        expanded: true,
        properties: {}
      })
    })

    test('should expand an object inside an array', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState({ json }), ['array', '2']), {
        type: 'object',
        expanded: true,
        properties: {
          array: {
            type: 'array',
            expanded: true,
            items: [],
            visibleSections: DEFAULT_VISIBLE_SECTIONS
          }
        }
      })
    })

    test('should not expand a value (only objects and arrays)', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState({ json }), ['array', '0']), {
        type: 'object',
        expanded: true,
        properties: {
          array: {
            type: 'array',
            expanded: true,
            items: [],
            visibleSections: DEFAULT_VISIBLE_SECTIONS
          }
        }
      })
    })

    test('should expand an object', () => {
      assert.deepStrictEqual(expandPath(json, createDocumentState({ json }), ['object']), {
        type: 'object',
        expanded: true,
        properties: {}
      })
    })

    test('should expand a nested object', () => {
      assert.deepStrictEqual(
        expandPath(json, createDocumentState({ json }), ['object', 'nested']),
        {
          type: 'object',
          expanded: true,
          properties: {
            object: {
              type: 'object',
              expanded: true,
              properties: {}
            }
          }
        }
      )
    })

    test('should expand visible section of an array if needed', () => {
      const json = {
        largeArray: range(0, 500).map((index) => ({ id: index }))
      }

      assert.deepStrictEqual(
        expandPath(json, createDocumentState({ json }), ['largeArray', '120']),
        {
          type: 'object',
          expanded: true,
          properties: {
            largeArray: {
              type: 'array',
              expanded: true,
              items: [],
              visibleSections: [{ start: 0, end: 200 }]
            }
          }
        }
      )
    })
  })
})

/**
 * Helper function to get the visible indices of an Array state
 */
function getVisibleIndices(json: unknown, visibleSections: VisibleSection[]): number[] {
  const visibleIndices: number[] = []

  if (Array.isArray(json)) {
    forEachVisibleIndex(json, visibleSections, (index) => {
      visibleIndices.push(index)
    })
  }

  return visibleIndices
}
