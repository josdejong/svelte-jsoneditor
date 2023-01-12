import { test, describe, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/svelte'
import JSONEditor from './JSONEditor.svelte'

describe('JSONEditor', () => {
  const content = {
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
    const { container } = render(JSONEditor, {
      props: {
        mode: 'tree',
        content
      }
    })

    const main = container.getElementsByClassName('jse-main')[0]
    expect(main.firstChild).toHaveClass('jse-tree-mode')
    expect(screen.getByText('Joe')).toHaveClass('jse-value', 'jse-string')
    expect(container).toMatchSnapshot()
  })

  test('render text mode', () => {
    const { container } = render(JSONEditor, {
      props: {
        mode: 'text',
        content
      }
    })

    const main = container.getElementsByClassName('jse-main')[0]
    expect(main.firstChild).toHaveClass('jse-text-mode')
    expect(screen.getByText('"Joe"').parentNode).toHaveClass('cm-line')
    expect(container).toMatchSnapshot()
  })

  test('render table mode', () => {
    const { container } = render(JSONEditor, {
      props: {
        mode: 'table',
        content
      }
    })

    const main = container.getElementsByClassName('jse-main')[0]
    expect(main.firstChild).toHaveClass('jse-table-mode')
    expect(screen.getByText('Joe')).toHaveClass('jse-value', 'jse-string')
    expect(container).toMatchSnapshot()
  })
})
