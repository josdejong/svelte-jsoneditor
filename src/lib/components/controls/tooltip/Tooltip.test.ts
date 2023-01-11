import { render, screen } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import { describe, expect } from 'vitest'
import Tooltip from './Tooltip.svelte'

describe('Tooltip', () => {
  test('render a tooltip', () => {
    const props = { text: 'hello world' }
    render(Tooltip, { props })

    expect(screen.getByText(props.text)).toBeInTheDocument()
  })
})
