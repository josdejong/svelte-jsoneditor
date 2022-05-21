/**
 * Return a human readable document size
 * For example formatSize(7570718) outputs '7.6 MB'
 * @param size
 * @param kilo Is 1000 by default, you can specify 1024 if you
 *                             want the output in KiB
 * @return Returns a human readable size
 */
export function formatSize(size: number, kilo = 1000): string {
  if (size < 0.9 * kilo) {
    return size.toFixed() + ' B'
  }

  const KB = size / kilo
  if (KB < 0.9 * kilo) {
    return KB.toFixed(1) + ' KB'
  }

  const MB = KB / kilo
  if (MB < 0.9 * kilo) {
    return MB.toFixed(1) + ' MB'
  }

  const GB = MB / kilo
  if (GB < 0.9 * kilo) {
    return GB.toFixed(1) + ' GB'
  }

  const TB = GB / kilo
  return TB.toFixed(1) + ' TB'
}
