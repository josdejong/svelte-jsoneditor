import { createValueSelection, type OnJSONSelect } from 'svelte-jsoneditor'
import type { Action } from 'svelte/action'
import { type JSONPath } from 'immutable-json-patch'

export interface EvaluatorActionProps {
  value: unknown
  path: JSONPath
  readOnly: boolean
  onSelect: OnJSONSelect
}

export const EvaluatorAction: Action<HTMLDivElement, Record<string, unknown>> = (
  node,
  initialProps
) => {
  let props = toEvaluatorProps(initialProps as Record<string, unknown>)

  function updateResult() {
    node.innerText = evaluate(String(props.value))
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
  updateResult()

  return {
    update: (updatedProps) => {
      props = toEvaluatorProps(updatedProps)
      updateResult()
    },
    destroy: () => {
      node.removeEventListener('dblclick', handleValueDoubleClick)
    }
  }
}

function evaluate(expr: string) {
  const result = expr
    .split('+')
    .map((value) => parseFloat(value.trim()))
    .reduce((a, b) => a + b)

  return `The result of "${expr}" is "${result}" (double-click to edit)`
}

function toEvaluatorProps(props: Record<string, unknown>): EvaluatorActionProps {
  // you can add validations and typeguards here if needed
  return props as unknown as EvaluatorActionProps
}
