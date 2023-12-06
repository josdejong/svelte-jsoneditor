import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--internal-key-color)' }, // keys
  { tag: tags.number, color: 'var(--internal-value-color-number)' },
  { tag: tags.bool, color: 'var(--internal-value-color-boolean)' },
  { tag: tags.string, color: 'var(--internal-value-color-string)' },
  { tag: tags.keyword, color: 'var(--internal-value-color-null)' } // null
])

export const highlighter = syntaxHighlighting(highlightStyle)

// TODO: remove workaround when not needed anymore
// Workaround for the error "CodeMirror plugin crashed: TypeError: tags3 is undefined"
// thrown when using the json() language from '@codemirror/lang-json'
//
// Note that a plain CodeSandbox with parcel and code mirror v6.0.0,
// so it is maybe related to Vite
//
// See https://discuss.codemirror.net/t/highlighting-that-seems-ignored-in-cm6/4320/15
const originalStyle = highlightStyle.style
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// noinspection JSConstantReassignment
highlightStyle.style = (tags) => originalStyle(tags || [])
