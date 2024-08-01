export function int(value: string): number {
  return parseInt(value, 10)
}

export function isDigit(char: string): boolean {
  return DIGIT_REGEX.test(char)
}

const DIGIT_REGEX = /^[0-9]$/

// TODO: unit test
export function containsNumber(value: string): boolean {
  return NUMBER_REGEX.test(value)
}

const NUMBER_REGEX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/
