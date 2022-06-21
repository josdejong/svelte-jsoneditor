const MAX_HISTORY_ITEMS = 1000

/**
 * @typedef {*} HistoryItem
 * @property {Object} undo
 * @property {Object} redo
 */

export interface HistoryOptions {
  maxItems?: number
  onChange?: (props: { canUndo: boolean; canRedo: boolean; length: number }) => void
}

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  length: number
}

export interface History<T> {
  add: (item: T) => void
  clear: () => void
  getState: () => HistoryState
  undo: () => T | undefined
  redo: () => T | undefined
}

export function createHistory<T>(options: HistoryOptions = {}): History<T> {
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

  function getState(): HistoryState {
    return {
      canUndo: canUndo(),
      canRedo: canRedo(),
      length: items.length
    }
  }

  function handleChange() {
    if (options.onChange) {
      options.onChange(getState())
    }
  }

  function add(item: T) {
    items = [item].concat(items.slice(index)).slice(0, maxItems)

    index = 0

    handleChange()
  }

  function clear() {
    items = []
    index = 0

    handleChange()
  }

  function undo(): T | undefined {
    if (canUndo()) {
      const item = items[index]
      index += 1

      handleChange()

      return item
    }

    return undefined
  }

  function redo(): T | undefined {
    if (canRedo()) {
      index -= 1

      handleChange()

      return items[index]
    }

    return undefined
  }

  return {
    add,
    clear,
    getState,
    undo,
    redo
  }
}
