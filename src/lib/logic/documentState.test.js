import assert from 'assert'
import { flatMap, times } from 'lodash-es'
import {
  ARRAY_SECTION_SIZE,
  DEFAULT_VISIBLE_SECTIONS,
  STATE_ENFORCE_STRING,
  STATE_EXPANDED,
  STATE_ID,
  STATE_KEYS,
  STATE_VISIBLE_SECTIONS
} from '../constants.js'
import { isObject } from '../utils/typeUtils.ts'
import {
  CARET_POSITION,
  collapseSinglePath,
  createState,
  documentStatePatch,
  expandSection,
  expandSinglePath,
  forEachVisibleIndex,
  getVisibleCaretPositions,
  getVisiblePaths,
  initializeState,
  shiftVisibleSections,
  syncKeys,
  syncState
} from './documentState.js'

describe('documentState', () => {
  it('syncState', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    function expand(path) {
      return path.length <= 1
    }

    function throwUndefinedId() {
      throw new Error('Undefined id')
    }

    const state = syncState(json, undefined, [], expand)

    const expectedState = {}
    expectedState[STATE_EXPANDED] = true
    expectedState[STATE_ID] = state[STATE_ID] || throwUndefinedId()
    expectedState[STATE_KEYS] = ['array', 'object', 'value']
    expectedState.array = [
      {
        [STATE_ID]: state.array[0][STATE_ID] || throwUndefinedId()
      },
      {
        [STATE_ID]: state.array[1][STATE_ID] || throwUndefinedId()
      },
      {
        [STATE_ID]: state.array[2][STATE_ID] || throwUndefinedId(),
        [STATE_EXPANDED]: false,
        [STATE_KEYS]: ['c'] // FIXME: keys should not be created because node is not expanded
      }
    ]
    expectedState.array[STATE_ID] = state.array[STATE_ID] || throwUndefinedId()
    expectedState.array[STATE_EXPANDED] = true
    expectedState.array[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS
    expectedState.object = {
      [STATE_ID]: state.object[STATE_ID] || throwUndefinedId(),
      [STATE_EXPANDED]: true,
      [STATE_KEYS]: ['a', 'b'],
      a: {
        [STATE_ID]: state.object.a[STATE_ID] || throwUndefinedId()
      },
      b: {
        [STATE_ID]: state.object.b[STATE_ID] || throwUndefinedId()
      }
    }
    expectedState.value = {
      [STATE_ID]: state.value[STATE_ID] || throwUndefinedId()
    }

    assert.deepStrictEqual(state, expectedState)
  })

  it('updateKeys (1)', () => {
    const keys1 = syncKeys({ b: 2 })
    assert.deepStrictEqual(keys1, ['b'])

    const keys2 = syncKeys({ a: 1, b: 2 }, keys1)
    assert.deepStrictEqual(keys2, ['b', 'a'])
  })

  it('updateKeys (2)', () => {
    const keys1 = syncKeys({ a: 1, b: 2 })
    const keys2 = syncKeys({ a: 1, b: 2 }, keys1)
    assert.deepStrictEqual(keys2, keys1)
  })

  it('get all expanded paths', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    const state = syncState(json, undefined, [], () => false)
    assert.deepStrictEqual(getVisiblePaths(json, state), [[]])

    const state0 = syncState(json, undefined, [], (path) => path.length <= 0)
    assert.deepStrictEqual(getVisiblePaths(json, state0), [[], ['array'], ['object'], ['value']])

    const state1 = syncState(json, undefined, [], (path) => path.length <= 1)
    assert.deepStrictEqual(getVisiblePaths(json, state1), [
      [],
      ['array'],
      ['array', 0],
      ['array', 1],
      ['array', 2],
      ['object'],
      ['object', 'a'],
      ['object', 'b'],
      ['value']
    ])

    const state2 = syncState(json, undefined, [], (path) => path.length <= 2)
    assert.deepStrictEqual(getVisiblePaths(json, state2), [
      [],
      ['array'],
      ['array', 0],
      ['array', 1],
      ['array', 2],
      ['array', 2, 'c'],
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
    const state1 = syncState(json, undefined, [], (path) => path.length <= 1)
    assert.deepStrictEqual(getVisiblePaths(json, state1), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', index])
    ])

    // create a visible section from 200-300 (in addition to the visible section 0-100)
    const start = 2 * ARRAY_SECTION_SIZE
    const end = 3 * ARRAY_SECTION_SIZE
    const state2 = expandSection(json, state1, ['array'], { start, end })
    assert.deepStrictEqual(getVisiblePaths(json, state2), [
      [],
      ['array'],
      ...times(ARRAY_SECTION_SIZE, (index) => ['array', index]),
      ...times(end - start, (index) => ['array', index + start])
    ])
  })

  it('should get all visible caret positions', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }

    const state = syncState(json, undefined, [], () => false)
    assert.deepStrictEqual(getVisibleCaretPositions(json, state), [
      { path: [], type: CARET_POSITION.VALUE }
    ])

    const state0 = syncState(json, undefined, [], (path) => path.length <= 0)
    assert.deepStrictEqual(getVisibleCaretPositions(json, state0), [
      { path: [], type: CARET_POSITION.VALUE },
      { path: [], type: CARET_POSITION.INSIDE },
      { path: ['array'], type: CARET_POSITION.KEY },
      { path: ['array'], type: CARET_POSITION.VALUE },
      { path: ['array'], type: CARET_POSITION.AFTER },
      { path: ['object'], type: CARET_POSITION.KEY },
      { path: ['object'], type: CARET_POSITION.VALUE },
      { path: ['object'], type: CARET_POSITION.AFTER },
      { path: ['value'], type: CARET_POSITION.KEY },
      { path: ['value'], type: CARET_POSITION.VALUE },
      { path: ['value'], type: CARET_POSITION.AFTER }
    ])
    assert.deepStrictEqual(getVisibleCaretPositions(json, state0, false), [
      { path: [], type: CARET_POSITION.VALUE },
      { path: ['array'], type: CARET_POSITION.KEY },
      { path: ['array'], type: CARET_POSITION.VALUE },
      { path: ['object'], type: CARET_POSITION.KEY },
      { path: ['object'], type: CARET_POSITION.VALUE },
      { path: ['value'], type: CARET_POSITION.KEY },
      { path: ['value'], type: CARET_POSITION.VALUE }
    ])

    const state1 = syncState(json, undefined, [], (path) => path.length <= 1)
    assert.deepStrictEqual(getVisibleCaretPositions(json, state1), [
      { path: [], type: CARET_POSITION.VALUE },
      { path: [], type: CARET_POSITION.INSIDE },
      { path: ['array'], type: CARET_POSITION.KEY },
      { path: ['array'], type: CARET_POSITION.VALUE },
      { path: ['array'], type: CARET_POSITION.INSIDE },
      { path: ['array', 0], type: CARET_POSITION.VALUE },
      { path: ['array', 0], type: CARET_POSITION.AFTER },
      { path: ['array', 1], type: CARET_POSITION.VALUE },
      { path: ['array', 1], type: CARET_POSITION.AFTER },
      { path: ['array', 2], type: CARET_POSITION.VALUE },
      { path: ['array', 2], type: CARET_POSITION.AFTER },
      { path: ['array'], type: CARET_POSITION.AFTER },
      { path: ['object'], type: CARET_POSITION.KEY },
      { path: ['object'], type: CARET_POSITION.VALUE },
      { path: ['object'], type: CARET_POSITION.INSIDE },
      { path: ['object', 'a'], type: CARET_POSITION.KEY },
      { path: ['object', 'a'], type: CARET_POSITION.VALUE },
      { path: ['object', 'a'], type: CARET_POSITION.AFTER },
      { path: ['object', 'b'], type: CARET_POSITION.KEY },
      { path: ['object', 'b'], type: CARET_POSITION.VALUE },
      { path: ['object', 'b'], type: CARET_POSITION.AFTER },
      { path: ['object'], type: CARET_POSITION.AFTER },
      { path: ['value'], type: CARET_POSITION.KEY },
      { path: ['value'], type: CARET_POSITION.VALUE },
      { path: ['value'], type: CARET_POSITION.AFTER }
    ])

    const state2 = syncState(json, undefined, [], (path) => path.length <= 2)
    assert.deepStrictEqual(getVisibleCaretPositions(json, state2), [
      { path: [], type: CARET_POSITION.VALUE },
      { path: [], type: CARET_POSITION.INSIDE },
      { path: ['array'], type: CARET_POSITION.KEY },
      { path: ['array'], type: CARET_POSITION.VALUE },
      { path: ['array'], type: CARET_POSITION.INSIDE },
      { path: ['array', 0], type: CARET_POSITION.VALUE },
      { path: ['array', 0], type: CARET_POSITION.AFTER },
      { path: ['array', 1], type: CARET_POSITION.VALUE },
      { path: ['array', 1], type: CARET_POSITION.AFTER },
      { path: ['array', 2], type: CARET_POSITION.VALUE },
      { path: ['array', 2], type: CARET_POSITION.INSIDE },
      { path: ['array', 2, 'c'], type: CARET_POSITION.KEY },
      { path: ['array', 2, 'c'], type: CARET_POSITION.VALUE },
      { path: ['array', 2, 'c'], type: CARET_POSITION.AFTER },
      { path: ['array', 2], type: CARET_POSITION.AFTER },
      { path: ['array'], type: CARET_POSITION.AFTER },
      { path: ['object'], type: CARET_POSITION.KEY },
      { path: ['object'], type: CARET_POSITION.VALUE },
      { path: ['object'], type: CARET_POSITION.INSIDE },
      { path: ['object', 'a'], type: CARET_POSITION.KEY },
      { path: ['object', 'a'], type: CARET_POSITION.VALUE },
      { path: ['object', 'a'], type: CARET_POSITION.AFTER },
      { path: ['object', 'b'], type: CARET_POSITION.KEY },
      { path: ['object', 'b'], type: CARET_POSITION.VALUE },
      { path: ['object', 'b'], type: CARET_POSITION.AFTER },
      { path: ['object'], type: CARET_POSITION.AFTER },
      { path: ['value'], type: CARET_POSITION.KEY },
      { path: ['value'], type: CARET_POSITION.VALUE },
      { path: ['value'], type: CARET_POSITION.AFTER }
    ])
  })

  it('getVisibleCaretPositions should recon with visible sections in an array', () => {
    const count = 5 * ARRAY_SECTION_SIZE
    const json = {
      array: times(count, (index) => `item ${index}`)
    }

    // by default, should have a visible section from 0-100 only (so 100-500 is invisible)
    const state1 = syncState(json, undefined, [], (path) => path.length <= 1)
    assert.deepStrictEqual(
      getVisibleCaretPositions(json, state1),
      flatMap([
        { path: [], type: CARET_POSITION.VALUE },
        { path: [], type: CARET_POSITION.INSIDE },

        { path: ['array'], type: CARET_POSITION.KEY },
        { path: ['array'], type: CARET_POSITION.VALUE },
        { path: ['array'], type: CARET_POSITION.INSIDE },

        ...times(ARRAY_SECTION_SIZE, (index) => {
          return [
            { path: ['array', index], type: CARET_POSITION.VALUE },
            { path: ['array', index], type: CARET_POSITION.AFTER }
          ]
        }),

        { path: ['array'], type: CARET_POSITION.AFTER }
      ])
    )

    // create a visible section from 200-300 (in addition to the visible section 0-100)
    const start = 2 * ARRAY_SECTION_SIZE
    const end = 3 * ARRAY_SECTION_SIZE
    const state2 = expandSection(json, state1, ['array'], { start, end })
    assert.deepStrictEqual(
      getVisibleCaretPositions(json, state2),
      flatMap([
        { path: [], type: CARET_POSITION.VALUE },
        { path: [], type: CARET_POSITION.INSIDE },

        { path: ['array'], type: CARET_POSITION.KEY },
        { path: ['array'], type: CARET_POSITION.VALUE },
        { path: ['array'], type: CARET_POSITION.INSIDE },

        ...times(ARRAY_SECTION_SIZE, (index) => {
          return [
            { path: ['array', index], type: CARET_POSITION.VALUE },
            { path: ['array', index], type: CARET_POSITION.AFTER }
          ]
        }),

        ...times(end - start, (index) => {
          return [
            { path: ['array', index + start], type: CARET_POSITION.VALUE },
            { path: ['array', index + start], type: CARET_POSITION.AFTER }
          ]
        }),
        { path: ['array'], type: CARET_POSITION.AFTER }
      ])
    )
  })

  it('should update enforce string in syncState', () => {
    const json1 = 42
    const state1 = syncState(json1, undefined, [], () => false)
    assert.strictEqual(state1[STATE_ENFORCE_STRING], undefined)

    const json2 = '42'
    const state2 = syncState(json2, state1, [], () => false)
    assert.strictEqual(state2[STATE_ENFORCE_STRING], true)

    // should keep the enforceString also when not needed anymore
    const json3 = 'forty two'
    const state3 = syncState(json3, state2, [], () => false)
    assert.strictEqual(state3[STATE_ENFORCE_STRING], true)

    // should not override when containing a boolean false
    const json4 = '42'
    const state4 = { ...state2, [STATE_ENFORCE_STRING]: false }
    const state4updated = syncState(json4, state4, [], () => false)
    assert.strictEqual(state4[STATE_ENFORCE_STRING], false)
    assert.strictEqual(state4updated[STATE_ENFORCE_STRING], false)
  })

  describe('createState', () => {
    it('should create state for an object', () => {
      const state = createState({ a: 2, b: 3 })

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_EXPANDED] = false
      expected[STATE_KEYS] = ['a', 'b']

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })

    it('should create state for an array', () => {
      const state = createState([1, 2, 3])

      const expected = []
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_EXPANDED] = false
      expected[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })

    it('should create state for a primitive value', () => {
      const state = createState(42)

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })

    it('should create state with enforce string', () => {
      const state = createState('42')

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_ENFORCE_STRING] = true

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })
  })

  describe('expand', () => {
    it('should expand an object', () => {
      const json = { a: 2, b: { bb: 3 } }
      const state = expandSinglePath(json, createState(json), [])

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_EXPANDED] = true
      expected[STATE_KEYS] = ['a', 'b']
      expected.a = { [STATE_ID]: state.a[STATE_ID] }
      expected.b = {
        [STATE_ID]: state.b[STATE_ID],
        [STATE_EXPANDED]: false,
        [STATE_KEYS]: ['bb']
      }

      assert.deepStrictEqual(state, expected)

      // expand nested object
      const state2 = expandSinglePath(json, state, ['b'])

      const expected2 = {}
      expected2[STATE_ID] = state[STATE_ID]
      expected2[STATE_EXPANDED] = true
      expected2[STATE_KEYS] = ['a', 'b']
      expected2.a = { [STATE_ID]: state.a[STATE_ID] }
      expected2.b = {
        [STATE_ID]: state.b[STATE_ID],
        [STATE_EXPANDED]: true,
        [STATE_KEYS]: ['bb'],
        bb: {
          [STATE_ID]: state2.b.bb[STATE_ID]
        }
      }

      assert.deepStrictEqual(state2, expected2)
    })

    it('should expand an array', () => {
      const json = [1, 2, 3]
      const state = expandSinglePath(json, createState(json), [])

      const expected = []
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_EXPANDED] = true
      expected[STATE_VISIBLE_SECTIONS] = [{ start: 0, end: ARRAY_SECTION_SIZE }]
      expected[0] = { [STATE_ID]: state[0][STATE_ID] }
      expected[1] = { [STATE_ID]: state[1][STATE_ID] }
      expected[2] = { [STATE_ID]: state[2][STATE_ID] }

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })

    it('should expand a nested array', () => {
      // TODO
    })

    it('should not expand a primitive value', () => {
      const json = 42
      const state = expandSinglePath(json, createState(json), [])

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]

      assert.deepStrictEqual(state, expected)
      assert(typeof state[STATE_ID] === 'string')
    })
  })

  describe('collapse', () => {
    it('should collapse an object', () => {
      const json = { a: 2, b: { bb: 3 } }
      const state = expandSinglePath(json, createState(json), [])
      assert.strictEqual(state[STATE_EXPANDED], true)
      assert.notStrictEqual(state.a, undefined)
      assert.notStrictEqual(state.b, undefined)

      const collapsedState = collapseSinglePath(json, state, [])

      const expected = {}
      expected[STATE_ID] = state[STATE_ID]
      expected[STATE_EXPANDED] = false
      expected[STATE_KEYS] = ['a', 'b']
      assert.deepStrictEqual(collapsedState, expected)
    })

    it('should collapse an array', () => {
      const json = [1, 2, 3]
      const state = createState(json)
      assert.strictEqual(state.length, 0)
      assert.strictEqual(state[1], undefined)
      assert.strictEqual(state[2], undefined)
      assert.strictEqual(state[2], undefined)

      const expandedState = expandSinglePath(json, state, [])
      assert.strictEqual(expandedState[STATE_EXPANDED], true)
      assert.deepStrictEqual(expandedState[STATE_VISIBLE_SECTIONS], DEFAULT_VISIBLE_SECTIONS)
      assert.strictEqual(expandedState.length, 3)
      assert.notStrictEqual(expandedState[1], undefined)
      assert.notStrictEqual(expandedState[2], undefined)
      assert.notStrictEqual(expandedState[2], undefined)

      const collapsedState = collapseSinglePath(json, expandedState, [])
      assert.deepStrictEqual(collapsedState, state)
      assert.deepStrictEqual(collapsedState[STATE_VISIBLE_SECTIONS], DEFAULT_VISIBLE_SECTIONS)
      assert.strictEqual(collapsedState.length, 0)
      assert.strictEqual(collapsedState[1], undefined)
      assert.strictEqual(collapsedState[2], undefined)
      assert.strictEqual(collapsedState[2], undefined)
    })

    it('should not do anything in case of collapsing a primitive value', () => {
      const json = 42
      const state = createState(json)

      const expandedState = expandSinglePath(json, state, [])
      assert.deepStrictEqual(expandedState, state)

      const collapsedState = collapseSinglePath(json, state, [])
      assert.deepStrictEqual(collapsedState, state)
    })
  })

  describe('documentStatePatch', () => {
    it('add: should add a value to an object', () => {
      const json = { a: 2, b: 3 }
      const state = createState(json)

      const updatedState = documentStatePatch(json, state, [
        { op: 'add', path: '/c', value: 4 }
      ]).state

      assert.deepStrictEqual(updatedState[STATE_EXPANDED], false)
      assert.deepStrictEqual(updatedState[STATE_KEYS], ['a', 'b', 'c'])
      assert(isObject(updatedState.c))
      assert.strictEqual(typeof updatedState.c[STATE_ID], 'string')
    })

    it('add: should add a value to an object (expanded)', () => {
      const json = { a: 2, b: 3 }
      const state = expandSinglePath(json, createState(json), [])

      const updatedState = documentStatePatch(json, state, [
        { op: 'add', path: '/c', value: 4 }
      ]).state

      assert.deepStrictEqual(updatedState[STATE_EXPANDED], true)
      assert.deepStrictEqual(updatedState[STATE_KEYS], ['a', 'b', 'c'])
      assert(isObject(updatedState.c))
      assert.strictEqual(typeof updatedState.c[STATE_ID], 'string')
    })

    it('replace: should keep enforceString state', () => {
      const json = '42'
      const state = syncState(json, undefined, [], () => false)
      assert.strictEqual(state[STATE_ENFORCE_STRING], true)

      const operations = [{ op: 'replace', path: '', value: 'forty two' }]
      const updatedState = documentStatePatch(json, state, operations).state
      assert.deepStrictEqual(updatedState[STATE_ENFORCE_STRING], true)
    })

    it('add: should override a value in an object', () => {
      // TODO
    })

    it('add: should insert a value in an array', () => {
      // TODO
    })

    it('add: should append a value to an array', () => {
      // TODO
    })

    it('remove: should remove a value from an object', () => {
      // TODO
    })

    it('remove: should remove a value from an array', () => {
      // TODO
    })

    it('replace: should replace a value in an object', () => {
      // TODO
    })

    it('replace: should replace a value in an array', () => {
      // TODO
    })

    it('replace: should replace the root document itself', () => {
      const json = {
        a: 2,
        b: 3
      }
      const state = syncState(json, undefined, [], () => true)

      assert.deepStrictEqual(state[STATE_KEYS], ['a', 'b'])
      assert.deepStrictEqual(state[STATE_EXPANDED], true)
      assert.strictEqual(typeof state.a, 'object')
      assert.strictEqual(typeof state.b, 'object')
      assert.strictEqual(typeof state.d, 'undefined')

      const operations = [
        {
          op: 'replace',
          path: '',
          value: { d: 4 }
        }
      ]
      const updatedState = documentStatePatch(json, state, operations).state

      assert.deepStrictEqual(updatedState[STATE_KEYS], ['d'])
      assert.deepStrictEqual(updatedState[STATE_EXPANDED], false)
      assert.strictEqual(typeof updatedState.a, 'undefined')
      assert.strictEqual(typeof updatedState.b, 'undefined')
      assert.strictEqual(typeof updatedState.d, 'undefined') // not expanded
    })

    it('copy: should copy a value into an object', () => {
      // TODO
    })

    it('copy: should copy a value into an array', () => {
      // TODO
    })

    it('move: should move a value from object to object', () => {
      // TODO
    })

    it('move: should move and replace a value into an object', () => {
      // TODO
    })

    it('move: should move a value from array to array', () => {
      // TODO
    })

    it('move: should move a value from object to array', () => {
      // TODO
    })

    it('move: should move a value from array to object', () => {
      // TODO
    })
  })

  describe('shiftVisibleSections', () => {
    const json = [1, 2, 3, 4, 5, 6, 7, 8]
    const state = syncState(json, undefined, [], () => true)
    state[STATE_VISIBLE_SECTIONS] = [
      { start: 0, end: 2 },
      { start: 4, end: 6 }
    ]

    it('should have the right initial indices visible', () => {
      assert.deepStrictEqual(getVisibleIndices(json, state), [0, 1, 4, 5])
    })

    it('should insert at the start of a visible section', () => {
      const updatedState = shiftVisibleSections(state, [0], 1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should insert halfway a visible section', () => {
      const updatedState = shiftVisibleSections(state, [1], 1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should insert at the end of a visible section', () => {
      const updatedState = shiftVisibleSections(state, [2], 1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 3 },
        { start: 5, end: 7 }
      ])
    })

    it('should remove at the start of a visible section', () => {
      const updatedState = shiftVisibleSections(state, [0], -1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    it('should remove halfway a visible section', () => {
      const updatedState = shiftVisibleSections(state, [1], -1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })

    it('should remove at the end of a visible section', () => {
      const updatedState = shiftVisibleSections(state, [2], -1)

      assert.deepStrictEqual(updatedState[STATE_VISIBLE_SECTIONS], [
        { start: 0, end: 1 },
        { start: 3, end: 5 }
      ])
    })
  })

  describe('initializeState', () => {
    const json = {
      array: [1, 2, { c: 6 }],
      object: { a: 4, b: 5 },
      value: 'hello'
    }
    const state = syncState(json, undefined, [], () => false)

    it('should have non expanded initial state', () => {
      assert.deepStrictEqual(state[STATE_EXPANDED], false)
      assert.deepStrictEqual(state[STATE_KEYS], ['array', 'object', 'value'])
      assert.deepStrictEqual(state.array, undefined)
      assert.deepStrictEqual(state.object, undefined)
      assert.deepStrictEqual(state.value, undefined)
    })

    it('should initialize nested state for operation add', () => {
      const operations = [{ op: 'add', path: '/array/2/d', value: 7 }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(Array.isArray(updatedState.array), true)
      assert.deepStrictEqual(updatedState.array[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.array[2], 'object')
      assert.deepStrictEqual(updatedState.array[2][STATE_EXPANDED], false)
      assert.deepStrictEqual(updatedState.array[0], undefined)
      assert.deepStrictEqual(updatedState.array[1], undefined)
      assert.deepStrictEqual(updatedState.array[2].d, undefined)
    })

    it('should initialize nested state for operation move', () => {
      const operations = [{ op: 'move', from: '/object/a', path: '/array/0' }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(typeof updatedState.object, 'object')
      assert.deepStrictEqual(updatedState.object[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.object.a, 'object')

      assert.deepStrictEqual(Array.isArray(updatedState.array), true)
      assert.deepStrictEqual(updatedState.array[STATE_EXPANDED], false)
      assert.deepStrictEqual(updatedState.array[0], undefined)
      assert.deepStrictEqual(updatedState.array[1], undefined)
      assert.deepStrictEqual(updatedState.array[2], undefined)
    })

    it('should initialize nested state for operation copy', () => {
      const operations = [{ op: 'copy', from: '/object/a', path: '/array/0' }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(typeof updatedState.object, 'object')
      assert.deepStrictEqual(updatedState.object[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.object.a, 'object')

      assert.deepStrictEqual(Array.isArray(updatedState.array), true)
      assert.deepStrictEqual(updatedState.array[STATE_EXPANDED], false)
      assert.deepStrictEqual(updatedState.array[0], undefined)
      assert.deepStrictEqual(updatedState.array[1], undefined)
      assert.deepStrictEqual(updatedState.array[2], undefined)
    })

    it('should initialize nested state for operation remove', () => {
      const operations = [{ op: 'remove', path: '/object/a' }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(typeof updatedState.object, 'object')
      assert.deepStrictEqual(updatedState.object[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.object.a, 'object')
    })

    it('should initialize nested state for operation replace', () => {
      const operations = [{ op: 'replace', path: '/object/a', value: 42 }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(typeof updatedState.object, 'object')
      assert.deepStrictEqual(updatedState.object[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.object.a, 'object')
    })

    it('should initialize nested state for operation test', () => {
      const operations = [{ op: 'test', path: '/object/a', value: 42 }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(typeof updatedState.object, 'object')
      assert.deepStrictEqual(updatedState.object[STATE_EXPANDED], false)
      assert.deepStrictEqual(typeof updatedState.object.a, 'object')
    })

    it('should not initialize nested state when not existing in json itself', () => {
      const operations = [{ op: 'add', path: '/foo/bar', value: 42 }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(updatedState.foo, undefined)
    })

    it('should initialize state for replacing the whole json', () => {
      const operations = [{ op: 'replace', path: '', value: 42 }]
      const updatedState = initializeState(json, state, operations)

      assert.deepStrictEqual(updatedState, state)
    })
  })
})

/**
 * Helper function to get the visible indices of an Array state
 * @param {JSON} json
 * @param {JSON} state
 * @returns {number[]}
 */
function getVisibleIndices(json, state) {
  const visibleIndices = []

  forEachVisibleIndex(json, state, (index) => {
    visibleIndices.push(index)
  })

  return visibleIndices
}
