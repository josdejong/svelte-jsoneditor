import { HighlightStyle, tags } from '@codemirror/highlight'

// Note that these colors must correspond with the colors in styles.scss
const colorBoolean = 'var(--jse-value-color-boolean)'
const colorNull = 'var(--jse-value-color-null)'
const colorNumber = 'var(--jse-value-color-number)'
const colorString = 'var(--jse-value-color-string)'

export const highlightStyle = HighlightStyle.define([
  { tag: tags.number, color: colorNumber },
  { tag: tags.bool, color: colorBoolean },
  { tag: tags.string, color: colorString },
  { tag: tags.keyword, color: colorNull } // null
])
