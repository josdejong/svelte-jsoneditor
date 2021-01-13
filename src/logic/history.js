
const MAX_HISTORY_ITEMS = 1000

/**
 * @typedef {*} HistoryItem
 * @property {Object} undo
 * @property {Object} redo
 */

/**
 * @param {Object} [options]
 * @property {number} [maxItems]
 * @property {onChange} [({canUndo: boolean, canRedo: boolean, length: number}) => void]
 * @returns {Object}
 */
export function createHistory (options = {}) {
  const maxItems = options.maxItems || MAX_HISTORY_ITEMS

  /**
   * items in history are sorted from newest first to oldest last
   * @type {HistoryItem[]}
   */
  let items = []

  /**
   * @type {number}
   */
  let index = 0

  /**
   * @return {boolean}
   */
  function canUndo () {
    return index < items.length
  }

  /**
   * @return {boolean}
   */
  function canRedo () {
    return index > 0
  }

  function getState () {
    return {
      canUndo: canUndo(),
      canRedo: canRedo(),
      length: items.length
    }
  }

  function handleChange () {
    if (options.onChange) {
      options.onChange(getState())
    }
  }

  /**
   * @param {HistoryItem} item
   */
  function add (item) {
    items = [item]
      .concat(items.slice(index))
      .slice(0, maxItems)

    index = 0

    handleChange()
  }

  function clear () {
    items = []
    index = 0

    handleChange()
  }

  /**
   * @return {HistoryItem | undefined}
   */
  function undo () {
    if (canUndo()) {
      const item = items[index]
      index += 1

      handleChange()

      return item
    }

    return undefined
  }

  /**
   * @return {HistoryItem | undefined}
   */
  function redo () {
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
