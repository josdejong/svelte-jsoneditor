# svelte-jsoneditor

A web-based tool to view, edit, format, transform, and validate JSON

The library is written with Svelte, but can be used in any framework (React, Vue, Angular, plain JavaScript).

![JSONEditor screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_screenshot.png)

<!-- TODO: describe features -->

## Install

Install via npm:

```
npm install svelte-jsoneditor
```

## Use

See the [/examples](/examples) section for some full examples.

### SvelteKit setup

There is currently an issue in SvelteKit with processing some dependencies (more precisely: Vite used by SvelteKit). `svelte-jsoneditor` depends on some libraries that hit this issue. To work around it, each of these dependencies needs to be listed in the configuration. Without the workaround, you'll see errors like "ReferenceError: module is not defined" (for `debug`, `ajv`, `ace-builds`, etc.).

In your SvelteKit configuration file `svelte.config.js`, add the list with dependencies `viteOptimizeDeps`, available in the `svelte-jsoneditor/config.js`, and use that in the configuration of vite (`config.kit.vite.optimizeDeps.include`):

```js
// svelte.config.js

// ...
import { viteOptimizeDeps } from 'svelte-jsoneditor/config.js'

const config = {
  // ...

  kit: {
    // ...

    vite: {
      optimizeDeps: {
        include: [...viteOptimizeDeps]
      }
    }
  }
}

// ...
```

### Svelte usage

Create a JSONEditor with two-way binding `bind:json`:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let json = {
    array: [1, 2, 3],
    boolean: true,
    color: '#82b92c',
    null: null,
    number: 123,
    object: { a: 'b', c: 'd' },
    string: 'Hello World'
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
    greeting: 'Hello World'
  }

  function onChange(content) {
    // content is an object { json: JSON | undefined, text: string | undefined }
    console.log('onChange: ', content)
    json = content.json
  }
</script>

<div>
  <JSONEditor json="{json}" onChange="{onChange}" />
</div>
```

### Standalone bundle (use in React, Vue, Angular, plain JavaScript, ...)

The library provides a standalone bundle of the editor which can be used in any browser environment and framework. In a framework like React, Vue, or Angular, you'll need to write some wrapper code around the class interface.

Browser example loading the ES module:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>JSONEditor</title>
  </head>
  <body>
    <div id="jsoneditor"></div>

    <script type="module">
      import { JSONEditor } from 'svelte-jsoneditor/dist/jsoneditor.js'

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
  <JSONEditor json="{json}" />
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
- `readOnly: boolean` Open the editor in read-only mode: no changes can be made, non-relevant buttons are hidden from the menu, and the context menu is not enabled. Default value is `false`.
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

  A menu item can be one of the following types:

  - Button:

    ```ts
    interface MenuButtonItem {
      onClick: () => void
      icon?: FontAwesomeIcon
      text?: string
      title?: string
      className?: string
      disabled?: boolean
    }
    ```

  - Separator (gray vertical line between a group of items):

    ```ts
    interface MenuSeparatorItem {
      separator: true
    }
    ```

  - Space (fills up empty space):

    ```ts
    interface MenuSpaceItem {
      space: true
    }
    ```

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

Install dependencies (once):

```
npm install
```

Start the demo project (at http://localhost:3000):

```
npm run dev
```

Build the library:

```
npm run package
```

Run unit tests:

```
npm test
```

Run linter:

```
npm run lint
```

Publish to npm (will increase version number and publish to npm):

```
npm run release
```

## License

Released under the [ISC license](LICENSE.md).
