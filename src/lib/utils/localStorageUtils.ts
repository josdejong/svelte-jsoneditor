import { writable } from 'svelte/store'

export function useLocalStorage(key, defaultValue) {
  const initialValue = loadFromLocalStorage(key, defaultValue)
  const store = writable(initialValue)
  store.subscribe((value) => saveToLocalStorage(key, value))
  return store
}

function loadFromLocalStorage(key, defaultValue) {
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

function saveToLocalStorage(key, value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage[key] = JSON.stringify(value)
}
