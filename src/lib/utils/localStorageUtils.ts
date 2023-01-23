import { writable } from 'svelte/store'
import type { JSONValue } from 'lossless-json'

export function useLocalStorage(key: string, defaultValue: JSONValue) {
  const initialValue = loadFromLocalStorage(key, defaultValue)
  const store = writable(initialValue)
  store.subscribe((value) => saveToLocalStorage(key, value))
  return store
}

function loadFromLocalStorage(key: string, defaultValue: JSONValue) {
  if (typeof localStorage === 'undefined') {
    return defaultValue
  }

  try {
    const value = localStorage[key]

    return value !== undefined ? JSON.parse(value) : defaultValue
  } catch (err) {
    return defaultValue
  }
}

function saveToLocalStorage(key: string, value: JSONValue) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage[key] = JSON.stringify(value)
}
