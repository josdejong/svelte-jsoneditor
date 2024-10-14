import { getByText } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import { describe, expect, test } from 'vitest'
import Tooltip from './Tooltip.svelte'
import { mount } from 'svelte'

describe('Tooltip', () => {
  test('render a tooltip', () => {
    const target = document.createElement('div')

    const props = { text: 'hello world' }

    mount(Tooltip, {
      target,
      props: { text: 'hello world' }
    })

    expect(getByText(target, props.text)).toBeDefined()
  })
})
