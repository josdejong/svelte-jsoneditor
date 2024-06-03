export const ReadonlyPasswordAction = (node, initialProps) => {
  let props = initialProps

  function updateResult() {
    const hiddenValue = '*'.repeat(Math.max(String(props.value).length, 3))
    node.innerText = hiddenValue
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
  updateResult()

  return {
    update: (updatedProps) => {
      props = updatedProps
      updateResult()
    },
    destroy: () => {
      node.removeEventListener('dblclick', handleValueDoubleClick)
    }
  }
}
