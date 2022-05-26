import { HighlightStyle, tags } from '@codemirror/highlight'

export const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--jse-key-color)' }, // keys
  { tag: tags.number, color: 'var(--jse-value-color-number)' },
  { tag: tags.bool, color: 'var(--jse-value-color-boolean)' },
  { tag: tags.string, color: 'var(--jse-value-color-string)' },
  { tag: tags.keyword, color: 'var(--jse-value-color-null)' } // null
])
