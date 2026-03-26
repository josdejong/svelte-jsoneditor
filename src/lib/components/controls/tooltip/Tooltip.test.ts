import { getByText } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import { mount } from 'svelte'
import { describe, expect, test } from 'vitest'
import Tooltip from './Tooltip.svelte'

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
