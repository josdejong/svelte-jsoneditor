/**
 * Return a human-readable document size
 * For example formatSize(7570718) outputs '7.6 MB'
 * This function uses 1000 for kilo (not 1024)
 * @param size
 * @return Returns a human-readable size
 */
export function formatSize(size: number): string {
  const kilo = 1000
  const factor = 0.9

  if (size < factor * kilo) {
    return size.toFixed() + ' B'
  }

  const KB = size / kilo
  if (KB < factor * kilo) {
    return KB.toFixed(1) + ' KB'
  }

  const MB = KB / kilo
  if (MB < factor * kilo) {
    return MB.toFixed(1) + ' MB'
  }

  const GB = MB / kilo
  if (GB < factor * kilo) {
    return GB.toFixed(1) + ' GB'
  }

  const TB = GB / kilo
  return TB.toFixed(1) + ' TB'
}
