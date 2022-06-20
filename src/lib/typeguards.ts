import type {
  JSONPatchAdd,
  JSONPatchCopy,
  JSONPatchMove,
  JSONPatchOperation,
  JSONPatchRemove,
  JSONPatchReplace,
  JSONPatchTest,
  MenuSpaceItem
} from './types.js'

export function isMenuSpaceItem(item: unknown): item is MenuSpaceItem {
  return item && item['space'] === true && Object.keys(item).length === 1
}

export function isJSONPatchAdd(operation: JSONPatchOperation): operation is JSONPatchAdd {
  return operation && operation.op === 'add'
}

export function isJSONPatchRemove(operation: JSONPatchOperation): operation is JSONPatchRemove {
  return operation && operation.op === 'remove'
}

export function isJSONPatchReplace(operation: JSONPatchOperation): operation is JSONPatchReplace {
  return operation && operation.op === 'replace'
}

export function isJSONPatchCopy(operation: JSONPatchOperation): operation is JSONPatchCopy {
  return operation && operation.op === 'copy'
}

export function isJSONPatchMove(operation: JSONPatchOperation): operation is JSONPatchMove {
  return operation && operation.op === 'move'
}

export function JSONPatchTest(operation: JSONPatchOperation): operation is JSONPatchTest {
  return operation && operation.op === 'test'
}
