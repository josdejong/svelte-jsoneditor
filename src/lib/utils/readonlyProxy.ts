/**
 * Create a readonly proxy around an object or array.
 *
 * Will throw an error when trying to mutate the object or array
 *
 * Inspired by: https://github.com/kourge/readonly-proxy/
 */
export function readonlyProxy(target: unknown): unknown {
  if (!isObject(target)) {
    return target
  }

  return new Proxy(target, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)

      return readonlyProxy(value)
    },

    set() {
      return false
    },

    deleteProperty() {
      return false
    }
  })
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
