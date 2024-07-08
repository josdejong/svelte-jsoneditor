export const EvaluatorAction = (node, initialProps) => {
  let props = initialProps

  function updateResult() {
    node.innerText = evaluate(String(props.value))
  }

  function handleValueDoubleClick(event) {
    if (!props.readOnly) {
      event.preventDefault()
      event.stopPropagation()

      // open in edit mode
      props.onSelect({ type: 'value', path: props.path, edit: true })
    }
  }

  node.addEventListener('dblclick', handleValueDoubleClick)
  node.classList.add('custom-evaluator-component')
  updateResult()

  return {
    update: (updatedProps) => {
      props = updatedProps
      updateResult()
    },
    destroy: () => {
      node.removeEventListener('dblclick', handleValueDoubleClick)
      node.classList.remove('custom-evaluator-component')
    }
  }
}

function evaluate(expr) {
  const result = expr
    .split('+')
    .map((value) => parseFloat(value.trim()))
    .reduce((a, b) => a + b)

  return `The result of "${expr}" is "${result}" (double-click to edit)`
}
