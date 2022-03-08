import { HighlightStyle, tags } from '@codemirror/highlight'

// Note that these colors must correspond with the colors in styles.scss
const colorBoolean = '#ff8c00'
const colorNull = '#004ed0'
const colorNumber = '#ee422e'
const colorString = '#008000'

export const highlightStyle = HighlightStyle.define([
  { tag: tags.number, color: colorNumber },
  { tag: tags.bool, color: colorBoolean },
  { tag: tags.string, color: colorString },
  { tag: tags.keyword, color: colorNull } // null
])
