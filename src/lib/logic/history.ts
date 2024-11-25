import { createDebug } from '../utils/debug.js'
import type { HistoryInstance, History } from 'svelte-jsoneditor'

const MAX_HISTORY_ITEMS = 1000

const debug = createDebug('jsoneditor:History')

export interface HistoryOptions<T> {
  maxItems?: number
  onChange?: (state: History<T>) => void
}

export function createHistoryInstance<T>(options: HistoryOptions<T> = {}): HistoryInstance<T> {
  const maxItems = options.maxItems || MAX_HISTORY_ITEMS

  /**
   * items in history are sorted from newest first to oldest last
   */
  let items: T[] = []

  let index = 0

  function canUndo(): boolean {
    return index < items.length
  }

  function canRedo(): boolean {
    return index > 0
  }

  function get(): History<T> {
    return {
      canUndo: canUndo(),
      canRedo: canRedo(),
      length: items.length,
      add,
      undo,
      redo,
      clear
    }
  }

  function handleChange() {
    if (options.onChange) {
      options.onChange(get())
    }
  }

  function add(item: T) {
    debug('add', item)

    items = [item].concat(items.slice(index)).slice(0, maxItems)

    index = 0

    handleChange()
  }

  function clear() {
    debug('clear')

    items = []
    index = 0

    handleChange()
  }

  function undo(): T | undefined {
    if (canUndo()) {
      const item = items[index]
      index += 1

      debug('undo', item)

      handleChange()

      return item
    }

    return undefined
  }

  function redo(): T | undefined {
    if (canRedo()) {
      index -= 1

      debug('redo', items[index])

      handleChange()

      return items[index]
    }

    return undefined
  }

  return {
    get
  }
}
