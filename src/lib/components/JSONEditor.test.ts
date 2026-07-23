import { beforeEach, afterEach, test, describe, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import JSONEditor from './JSONEditor.svelte'
import { type Content, Mode } from '$lib/types.js'
import { flushSync, mount } from 'svelte'
import { getByText } from '@testing-library/svelte'

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
})
