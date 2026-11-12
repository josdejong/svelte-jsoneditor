import { beforeEach, afterEach, test, describe, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import JSONEditor from './JSONEditor.svelte'
import { type Content, Mode, SelectionType, type TextSelection } from '$lib/types.js'
import { flushSync, mount, tick, unmount } from 'svelte'
import { getByText } from '@testing-library/svelte'
import { EditorView } from '@codemirror/view'
import { TEXT_MODE_ONCHANGE_DELAY } from '$lib/constants.js'

describe('JSONEditor', () => {
  const content: Content = {
    json: [{ id: 1 }, { id: 2, name: 'Joe' }, { id: 3 }]
  }

  beforeEach(() => {
    const ResizeObserverMock = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('render tree mode', () => {
    const target = document.createElement('div')

    mount(JSONEditor, {
      target,
      props: {
        mode: Mode.tree,
        content
      }
    })

    const main = target.getElementsByClassName('jse-main')[0]
    expect(main.children[0]).toHaveClass('jse-tree-mode')
    expect(getByText(target, 'Joe')).toHaveClass('jse-value', 'jse-string')
    expect(target).toMatchSnapshot()
  })

  test('render text mode', async () => {
    const target = document.createElement('div')

    mount(JSONEditor, {
      target,
      props: {
        mode: Mode.text,
        content
      }
    })

    flushSync() // wait until CodeMirror is rendered during onMount

    const main = target.getElementsByClassName('jse-main')[0]
    expect(main.children[0]).toHaveClass('jse-text-mode')
    expect(getByText(target, '"Joe"').parentNode).toHaveClass('cm-line')
    expect(target).toMatchSnapshot()
  })

  test('render a custom aria-label in all modes', () => {
    const ariaLabel = 'Custom label'

    const labelOf = (mode: Mode, selector: string): string | null | undefined => {
      const target = document.createElement('div')

      mount(JSONEditor, {
        target,
        props: { mode, content, ariaLabel }
      })

      flushSync() // wait until CodeMirror is rendered during onMount

      return target.querySelector(selector)?.getAttribute('aria-label')
    }

    expect(labelOf(Mode.tree, '[role="tree"]')).toBe(ariaLabel)
    expect(labelOf(Mode.table, '[role="table"]')).toBe(ariaLabel)
    expect(labelOf(Mode.text, '.cm-content')).toBe(ariaLabel)
  })

  test('render table mode', () => {
    const target = document.createElement('div')

    mount(JSONEditor, {
      target,
      props: {
        mode: Mode.table,
        content
      }
    })

    const main = target.getElementsByClassName('jse-main')[0]
    expect(main.children[0]).toHaveClass('jse-table-mode')
    expect(getByText(target, 'Joe')).toHaveClass('jse-value', 'jse-string')
    expect(target).toMatchSnapshot()
  })

  test('open the context menu after switching modes with a pending text change', async () => {
    const target = document.createElement('div')
    const text = '{"country":"Switzerland"}'
    const onChange = vi.fn()
    const editor = mount(JSONEditor, {
      target,
      props: { mode: Mode.text, content: { text }, onChange }
    })

    try {
      flushSync()
      const view = EditorView.findFromDOM(target.querySelector('.cm-content')!)!
      view.dispatch({ changes: { from: text.length, insert: ' ' } })

      // Switch before the debounced text change runs.
      editor.updateProps({ mode: Mode.tree })
      await tick()

      expect(editor.get()).toEqual({ text: text + ' ' })
      expect(onChange).toHaveBeenCalledTimes(1)

      getByText(target, 'Switzerland').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      )
      await tick()

      expect(target.querySelector('[role="menu"]')).toHaveTextContent('Copy')
    } finally {
      await unmount(editor)
    }
  })

  test('keep the new text selection when switching away and back with a pending change', async () => {
    const target = document.createElement('div')
    const text = '{"country":"Switzerland"}'
    const onSelect = vi.fn()
    const editor = mount(JSONEditor, {
      target,
      props: { mode: Mode.text, content: { text }, onSelect }
    })

    try {
      flushSync()
      const view = EditorView.findFromDOM(target.querySelector('.cm-content')!)!
      view.dispatch({
        changes: { from: text.length, insert: ' ' },
        selection: { anchor: text.length + 1 }
      })

      editor.updateProps({ mode: Mode.tree })
      const selection: TextSelection = {
        type: SelectionType.text,
        ranges: [{ anchor: 0, head: 0 }],
        main: 0
      }
      editor.updateProps({ mode: Mode.text, selection })
      await tick()

      const newView = EditorView.findFromDOM(target.querySelector('.cm-content')!)!
      expect(newView.state.selection.main.anchor).toBe(0)
      expect(onSelect).toHaveBeenLastCalledWith(selection)
    } finally {
      await unmount(editor)
    }
  })

  test('update the text selection after onChange replaces the document with shorter JSON', async () => {
    vi.useFakeTimers()
    const target = document.createElement('div')
    const onSelect = vi.fn()
    const editor = mount(JSONEditor, {
      target,
      props: {
        mode: Mode.text,
        content: { text: '{}' },
        onChange: (updatedContent) => {
          if ('text' in updatedContent) {
            editor.update({ json: JSON.parse(updatedContent.text) })
          }
        },
        onSelect
      }
    })

    try {
      flushSync()
      const view = EditorView.findFromDOM(target.querySelector('.cm-content')!)!
      const text = '{"a":"a", "a":"b"}'
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: text.length }
      })
      await vi.advanceTimersByTimeAsync(TEXT_MODE_ONCHANGE_DELAY)
      await tick()

      expect(view.state.doc.toString()).toBe(JSON.stringify({ a: 'b' }, null, 2))
      const selection = onSelect.mock.lastCall?.[0]
      expect(selection.ranges[0].anchor).toBeLessThanOrEqual(view.state.doc.length)
    } finally {
      await unmount(editor)
      vi.useRealTimers()
    }
  })

  test('flush pending text when destroyed without emitting a selection afterwards', async () => {
    const target = document.createElement('div')
    const onChange = vi.fn()
    const onSelect = vi.fn()
    const editor = mount(JSONEditor, {
      target,
      props: { mode: Mode.text, content: { text: '{}' }, onChange, onSelect }
    })

    flushSync()
    const view = EditorView.findFromDOM(target.querySelector('.cm-content')!)!
    view.dispatch({ changes: { from: 2, insert: ' ' } })
    await unmount(editor)
    await tick()

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.lastCall?.[0]).toEqual({ text: '{} ' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
