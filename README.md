# svelte-jsoneditor

A web-based tool to view, edit, format, transform, and validate JSON

The library is written with Svelte, but can be used in any framework (React, Angular, plain JavaScript).

![JSONEditor screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_screenshot.png)

<!-- TODO: describe features -->

## Install

```
npm install
```

## Use

See the [/examples](/examples) section for some full examples.

### Svelte

Create a JSONEditor with two-way binding `bind:json`:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let json = {
    'array': [1, 2, 3],
    'boolean': true,
    'color': '#82b92c',
    'null': null,
    'number': 123,
    'object': {'a': 'b', 'c': 'd'},
    'string': 'Hello World'
  }
</script>

<div>
  <JSONEditor bind:json />
</div>
```

Or one-way binding:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let json = {
    text: 'Hello World'
  }
  
  function onChange(content) {
    // content is an object { json: JSON | undefined, text: string | undefined }
    console.log('onChange: ', content)
    json = content.json
  }
</script>

<div>
  <JSONEditor 
    json={json}
    onChange={onChange}
  />
</div>
```

### Browser

Load as ES module:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>JSONEditor</title>
</head>
<body>
<div id="jsoneditor"></div>

<script type="module">
  import { JSONEditor } from 'svelte-jsoneditor/dist/jsoneditor.mjs'

  const editor = new JSONEditor({
    target: document.getElementById('jsoneditor'),
    props: {
      json: {
        greeting: 'Hello World'
      },
      onChange: (content) => {
        // content is an object { json: JSON | undefined, text: string | undefined }
        console.log('onChange', content)
      }
    }
  })
</script>
</body>
</html>
```

Or using UMD (exposed as `window.jsoneditor.JSONEditor`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>JSONEditor</title>
  <script src="svelte-jsoneditor/dist/jsoneditor.js"></script>
</head>
<body>
<div id="jsoneditor"></div>

<script>
  const editor = new JSONEditor({
    target: document.getElementById('jsoneditor'),
    props: {
      json: {
        greeting: 'Hello World'
      },
      onChange: (content) => {
        // content is an object { json: JSON | undefined, text: string | undefined }
        console.log('onChange', content)
      }
    }
  })
</script>
</body>
</html>
```

## API

### constructor

Svelte component:

```html

<script>
  import { JSONEditor } from 'svelte-jsoneditor'
</script>

<div>
  <JSONEditor json={json} />
</div>
```

JavasScript class:

```js
import { JSONEditor } from 'svelte-jsoneditor'

const editor = new JSONEditor({
  target: document.getElementById('jsoneditor'),
  props: {
    json,
    onChange: (content) => {
      // content is an object { json: JSON | undefined, text: string | undefined }
      console.log('onChange', content)
    }
  }
})
```


### properties

- `json` Pass the JSON document to be rendered in the JSONEditor
<!-- FIXME: readOnly is currently broken
- `readOnly: boolean` If `true`, the editor is read only. Default value is `false`.
-->
- `mode: 'tree' | 'code'`. Open the editor in `'tree'` mode (default) or `'code'` mode.
- `mainMenuBar: boolean` Show the main menu bar. Default value is `true`.
- `indentation: number` Number of spaces use for indentation when stringifying JSON.
- `validator: function (json): ValidationError[]`. Validate the JSON document.
  For example use the built-in JSON Schema validator powered by Ajv:
  ```js
  import { createAjvValidator } from 'svelte-jsoneditor'
  
  const validator = createAjvValidator(schema, schemaRefs)
  ```
- `onError(err: Error)`.
  Callback fired when an error occurs. Default implementation is to log an error in the console and show a simple alert message to the user.
- `onChange({ json: JSON | undefined, text: string | undefined})`.
  Callback which is invoked on every change made in the JSON document.
- `onChangeMode(mode: string)`. Invoked when the mode is changed.
- `onClassName(path: Array.<string|number>, value: any): string | undefined`. 
  Add a custom class name to specific nodes, based on their path and/or value.
- `onRenderMenu(mode: string, items: Array) : Array | undefined`.
  Callback which can be used to make changes to the menu items. New items can
  be added, or existing items can be removed or reorganized. When the function 
  returns `undefined`, the original `items` will be applied.
- `onFocus()` callback fired when the editor got focus.
- `onBlur()` callback fired when the editor lost focus.

### methods

- `get(): JSON` Get the current JSON document. Will throw an error when the editor is `code` mode and does not contain valid JSON.
- `getText(): string` Get the current JSON document as stringified JSON.
- `set(json: JSON)` Replace the current JSON document. Will reset the state of the editor.
- `setText(text: string)` Replace the current JSON document, passing stringified JSON contents.
- `update(json: JSON)` Update the loaded JSON document, keeping the state of the editor (like expanded objects).
- `updateText(text: JSON)` Update the loaded JSON document, keeping the state of the editor (like expanded objects).
- `patch(operations: JSONPatchDocument)` Apply a JSON patch document to update the contents of the JSON document.
- `scrollTo(path: Array.<string|number>)` Scroll the editor vertically such that the specified path comes into view. The path will be expanded when needed.
- `focus()`. Give the editor focus. 
- `destroy()`. Destroy the editor, remove it from the DOM.

## Develop

Clone the git repository

Install dependencies:

```
npm install
```

Start watcher:

```
npm start
```

Build the library:

```
npm run build
```

Run unit tests:

```
npm test
```

Run linter:

```
npm run lint
```

## License

Released under the [ISC license](LICENSE.md).
