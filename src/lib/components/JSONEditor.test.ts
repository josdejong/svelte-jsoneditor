import { test, describe, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/svelte'
import JSONEditor from './JSONEditor.svelte'

describe('JSONEditor', () => {
  const content = {
    json: [{ id: 1 }, { id: 2, name: 'Joe' }, { id: 3 }]
  }

  beforeEach(() => {
    window.ResizeObserver =
      window.ResizeObserver ||
      vi.fn().mockImplementation(() => ({
        disconnect: vi.fn(),
        observe: vi.fn(),
        unobserve: vi.fn()
      }))
  })

  test('render tree mode', () => {
    const { container } = render(JSONEditor, {
      props: {
        mode: 'tree',
        content
      }
    })

    expect(container.getElementsByClassName('jse-tree-mode').length).toBe(1)
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

    expect(container.getElementsByClassName('jse-text-mode').length).toBe(1)
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

    expect(container.getElementsByClassName('jse-table-mode').length).toBe(1)
    expect(screen.getByText('Joe')).toHaveClass('jse-value', 'jse-string')
    expect(container).toMatchSnapshot()
  })
})
