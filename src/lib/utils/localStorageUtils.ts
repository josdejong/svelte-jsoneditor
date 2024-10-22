import { writable } from 'svelte/store'

export function useLocalStorage(key: string, defaultValue: unknown) {
  const initialValue = loadFromLocalStorage(key, defaultValue)
  const store = writable(initialValue)
  store.subscribe((value) => saveToLocalStorage(key, value))
  return store
}

function loadFromLocalStorage(key: string, defaultValue: unknown) {
  if (typeof localStorage === 'undefined') {
    return defaultValue
  }

  try {
    const value = localStorage[key]

    return value !== undefined ? JSON.parse(value) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToLocalStorage(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage[key] = JSON.stringify(value)
}
