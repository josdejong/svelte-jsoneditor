import { beforeEach, afterEach, test, describe, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import JSONEditor from './JSONEditor.svelte'
import { type Content, Mode } from '$lib/types.js'
import { mount, tick } from 'svelte'
import { getByText } from '@testing-library/svelte'

describe('JSONEditor', () => {
  const content: Content = {
    json: [{ id: 1 }, { id: 2, name: 'Joe' }, { id: 3 }]
  }

  const originalResizeObserver = window.ResizeObserver

  beforeEach(() => {
    window.ResizeObserver =
      window.ResizeObserver ||
      vi.fn().mockImplementation(() => ({
        disconnect: vi.fn(),
        observe: vi.fn(),
        unobserve: vi.fn()
      }))
  })

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver
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

    await tick() // wait until CodeMirror is rendered

    const main = target.getElementsByClassName('jse-main')[0]
    expect(main.children[0]).toHaveClass('jse-text-mode')
    expect(getByText(target, '"Joe"').parentNode).toHaveClass('cm-line')
    expect(target).toMatchSnapshot()
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
