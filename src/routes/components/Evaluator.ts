import { createValueSelection, type OnSelect } from 'svelte-jsoneditor'
import type { Action } from 'svelte/action'
import type { JSONPath } from 'immutable-json-patch'

export interface EvaluatorProps {
  value: unknown
  path: JSONPath
  readOnly: boolean
  onSelect: OnSelect
}

export const Evaluator: Action<HTMLDivElement, EvaluatorProps> = (node, props) => {
  function evaluate(expr: string) {
    const result = expr
      .split('+')
      .map((value) => parseFloat(value.trim()))
      .reduce((a, b) => a + b)

    return `The result of "${expr}" is "${result}" (double-click to edit)`
  }

  function handleValueDoubleClick(event: MouseEvent) {
    if (!props.readOnly) {
      event.preventDefault()
      event.stopPropagation()

      // open in edit mode
      props.onSelect(createValueSelection(props.path, true))
    }
  }

  node.addEventListener('dblclick', handleValueDoubleClick)
  node.innerText = evaluate(String(props.value))

  return {
    update: (props) => {
      node.innerText = evaluate(String(props.value))
    },
    destroy: () => {
      node.removeEventListener('dblclick', handleValueDoubleClick)
    }
  }
}
