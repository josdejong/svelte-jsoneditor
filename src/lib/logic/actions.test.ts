import { describe, expect, test } from 'vitest'
import { isMultilineTextPastedAsArray } from '$lib/logic/actions'
import { insert } from '$lib/logic/operations'
import { createValueSelection } from 'svelte-jsoneditor'

describe('actions', () => {
  describe('isMultiLineTextPastedAsArray', () => {
    const maxMultilinePasteSize = 100

    function isMultilineText(
      clipboardText: string,
      json = {},
      selection = createValueSelection([])
    ): boolean {
      const parser = JSON
      const operations = insert(json, selection, clipboardText, parser)

      return isMultilineTextPastedAsArray(clipboardText, operations, parser, maxMultilinePasteSize)
    }

    test('should return false when the text is too large', () => {
      expect(isMultilineText('a\n'.repeat(maxMultilinePasteSize / 2 + 1))).toEqual(false)
    })

    test('should return false when not containing a newline', () => {
      expect(isMultilineText('Hello world')).toEqual(false)
    })

    test('should return false when containing partial JSON', () => {
      expect(isMultilineText('1,\n2,')).toEqual(false)
      expect(isMultilineText('"a",\n"b",')).toEqual(false)
      expect(isMultilineText('"a":1,\n"b":2,')).toEqual(false)
    })

    test('should return true when containing a newline and not being partial JSON', () => {
      expect(isMultilineText('A\nB\nC\n')).toEqual(true)
      expect(isMultilineText('Hello,\nmulti line text')).toEqual(true)
    })
  })
})
