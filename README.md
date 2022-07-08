# svelte-jsoneditor

A web-based tool to view, edit, format, transform, and validate JSON

The library is written with Svelte, but can be used in any framework (React, Vue, Angular, plain JavaScript).

![JSONEditor tree mode screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_tree_mode_screenshot.png)
![JSONEditor text mode screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_text_mode_screenshot.png)

## Features

- View and edit JSON
- Has a low level text mode and high level tree mode
- Format (beautify) and compact JSON
- Sort, query, filter, and transform JSON
- Repair JSON
- JSON schema validation and pluggable custom validation
- Color highlighting, undo/redo, search and replace
- Utilities like a color picker and timestamp tag
- Handles large JSON documents up to 500 MB

## Install

Install via npm for usage in a Svelte project:

```
npm install svelte-jsoneditor
```

For use in frameworks like React, Vue, Angular, or vanilla JavaScript:

```
npm install vanilla-jsoneditor
```

Remark: you may notice that `svelte` is a dependency in the project and ask yourself why. This is necessary when using it in a Svelte project or when using it in a TypeScript project. In the latter case, the project depends on types that are defined in the `svelte` package.

## Use

### Examples

- Svelte examples: [/src/routes/examples](/src/routes/examples)
- Plain JavaScript examples: [/examples/browser](/examples/browser)
- React example: https://codesandbox.io/s/svelte-jsoneditor-react-59wxz
- Vue example: https://codesandbox.io/s/svelte-jsoneditor-vue-toln3w

### Svelte usage

Create a JSONEditor with two-way binding `bind:json`:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // used when in text mode
    json: {
      array: [1, 2, 3],
      boolean: true,
      color: '#82b92c',
      null: null,
      number: 123,
      object: { a: 'b', c: 'd' },
      string: 'Hello World'
    }
  }
</script>

<div>
  <JSONEditor bind:content />
</div>
```

Or one-way binding:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // used when in text mode
    json: {
      greeting: 'Hello World'
    }
  }

  function handleChange(updatedContent, previousContent, patchResult) {
    // content is an object { json: JSONData } | { text: string }
    console.log('onChange: ', updatedContent, previousContent, patchResult)
    content = updatedContent
  }
</script>

<div>
  <JSONEditor {content} onChange="{handleChange}" />
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
      import { JSONEditor } from 'vanilla-jsoneditor'

      let content = {
        text: undefined,
        json: {
          greeting: 'Hello World'
        }
      }

      const editor = new JSONEditor({
        target: document.getElementById('jsoneditor'),
        props: {
          content,
          onChange: (updatedContent, previousContent, patchResult) => {
            // content is an object { json: JSONData } | { text: string }
            console.log('onChange', updatedContent, previousContent, patchResult)
            content = updatedContent
          }
        }
      })

      // use methods get, set, update, and onChange to get data in or out of the editor.
      // Use updateProps to update properties.
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
  <JSONEditor {content} />
</div>
```

JavasScript class:

```js
import { JSONEditor } from 'vanilla-jsoneditor'

const editor = new JSONEditor({
  target: document.getElementById('jsoneditor'),
  props: {
    content,
    onChange: (updatedContent, previousContent, patchResult) => {
      // content is an object { json: JSONData } | { text: string }
      console.log('onChange', updatedContent, previousContent, patchResult)
    }
  }
})
```

### properties

- `content: Content` Pass the JSON contents to be rendered in the JSONEditor. Contents is an object containing a property `json` and `text`. Only one of the two must be defined. In case of `tree` mode, `json` is used. In case of `text` mode, `text` is used.
- `mode: 'tree' | 'text'`. Open the editor in `'tree'` mode (default) or `'text'` mode (formerly: `code` mode).
- `mainMenuBar: boolean` Show the main menu bar. Default value is `true`.
- `navigationBar: boolean` Show the navigation bar with, where you can see the selected path and navigate through your document from there. Default value is `true`.
- `statusBar: boolean` Show a status bar at the bottom of the `'text'` editor, showing information about the cursor location and selected contents. Default value is `true`.
- `readOnly: boolean` Open the editor in read-only mode: no changes can be made, non-relevant buttons are hidden from the menu, and the context menu is not enabled. Default value is `false`.
- `indentation: number | string` Number of spaces use for indentation when stringifying JSON, or a string to be used as indentation like `'\t'` to use a tab as indentation, or `' '` to use 4 spaces (which is equivalent to configuring `indentation: 4`). See also property `tabSize`.
- `tabSize: number` When indentation is configured as a tab character (`indentation: '\t'`), `tabSize` configures how large a tab character is rendered. Default value is `4`. Only applicable to `text` mode.
- `escapeControlCharacters: boolean`. False by default. When `true`, control characters like newline and tab are rendered as escaped characters `\n` and `\t`. Only applicable for `'tree'` mode, in `'text'` mode control characters are always escaped.
- `escapeUnicodeCharacters: boolean`. False by default. When `true`, unicode characters like ☎ and 😀 are rendered escaped like `\u260e` and `\ud83d\ude00`.
- `validator: function (json: JSONData): ValidationError[]`. Validate the JSON document.
  For example use the built-in JSON Schema validator powered by Ajv:

  ```js
  import { createAjvValidator } from 'svelte-jsoneditor'

  const validator = createAjvValidator(schema, schemaDefinitions)
  ```

- `onError(err: Error)`.
  Callback fired when an error occurs. Default implementation is to log an error in the console and show a simple alert message to the user.
- `onChange(content: Content, previousContent: Content, patchResult: JSONPatchResult | null)`. The callback which is invoked on every change made in the JSON document. The parameter `patchResult` is only available in `tree` mode, and not in `text` mode, since a change in arbitrary text cannot be expressed as a JSON Patch document.
- `onChangeMode(mode: 'tree' | 'text')`. Invoked when the mode is changed.
- `onClassName(path: Path, value: any): string | undefined`.
  Add a custom class name to specific nodes, based on their path and/or value.
- `onRenderValue(props: RenderValueProps) : RenderValueComponentDescription[]`

  _EXPERIMENTAL! This API will most likely change in future versions._

  Customize rendering of the values. By default, `renderValue` is used, which renders a value as an editable div and depending on the value can also render a boolean toggle, a color picker, and a timestamp tag. Multiple components can be rendered alongside each other, like the boolean toggle and color picker being rendered left from the editable div. Built in value renderer components: `EditableValue`, `ReadonlyValue`, `BooleanToggle`, `ColorPicker`, `TimestampTag`, `EnumValue`.

  For JSON Schema enums, there is a value renderer `renderJSONSchemaEnum` which renders enums using the `EnumValue` component. This can be used like:

  ```js
  import { renderJSONSchemaEnum, renderValue } from 'svelte-jsoneditor'

  function onRenderValue(props) {
    // use the enum renderer, and fallback on the default renderer
    return renderJSONSchemaEnum(props, schema, schemaDefinitions) || renderValue(props)
  }
  ```

- `onRenderMenu(mode: 'tree' | 'text', items: MenuItem[]) : MenuItem[] | undefined`.
  Callback which can be used to make changes to the menu items. New items can
  be added, or existing items can be removed or reorganized. When the function
  returns `undefined`, the original `items` will be applied.

  A menu item `MenuItem` can be one of the following types:

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

- `queryLanguages: QueryLanguage[]`.  
   Configure one or multiple query language that can be used in the Transform modal. The library comes with three languages:

  ```ts
  import {
    jmespathQueryLanguage,
    lodashQueryLanguage,
    javascriptQueryLanguage
  } from 'svelte-jsoneditor'

  const allQueryLanguages = [jmespathQueryLanguage, lodashQueryLanguage, javascriptQueryLanguage]
  ```

  By default, only `javascriptQueryLanguage` is loaded.

- `queryLanguageId`.
  The `id` of the currently selected query language.

- `onChangeQueryLanguage: (queryLanguageId: string) => void`.
  Callback function invoked when the user changes the selected query language in the TransformModal via the configuration button top right.

- `onFocus()` callback fired when the editor got focus.
- `onBlur()` callback fired when the editor lost focus.

### methods

- `get(): Content` Get the current JSON document.
- `set(content: Content)` Replace the current content. Will reset the state of the editor. See also method `update(content)`.
- `update(content: Content)` Update the loaded content, keeping the state of the editor (like expanded objects). You can also call `editor.updateProps({ content })`. See also method `set(content)`.
- `patch(operations: JSONPatchDocument) : JSONPatchResult` Apply a JSON patch document to update the contents of the JSON document. A JSON patch document is a list with JSON Patch operations.
- `updateProps(props: Object)` update some or all of the properties. Updated `content` can be passed too; this is equivalent to calling `update(content)`. Example:

  ```js
  editor.updateProps({
    readOnly: true
  })
  ```

- `expand([callback: (path: Path) => boolean])` Expand or collapse paths in the editor. The `callback` determines which paths will be expanded. If no `callback` is provided, all paths will be expanded. It is only possible to expand a path when all of its parent paths are expanded too. Examples:
  - `editor.expand(path => true)` expand all
  - `editor.expand(path => false)` collapse all
  - `editor.expand(path => path.length < 2)` expand all paths up to 2 levels deep
- `transform({ id?: string, selectedPath?: [], onTransform?: ({ operations: JSONPatchDocument, json: JSONData, transformedJson: JSONData }) => void, onClose?: () => void })` programmatically trigger clicking of the transform button in the main menu, opening the transform model. If a callback `onTransform` is provided, it will replace the build-in logic to apply a transform, allowing you to process the transform operations in an alternative way. If provided, `onClose` callback will trigger when the transform modal closes, both after the user clicked apply or cancel. If an `id` is provided, the transform modal will load the previous status of this `id` instead of the status of the editors transform modal.
- `scrollTo(path: Path)` Scroll the editor vertically such that the specified path comes into view. The path will be expanded when needed.
- `findElement(path: Path)` Find the DOM element of a given path. Returns `null` when not found.
- `acceptAutoRepair(): Content` In tree mode, invalid JSON is automatically repaired when loaded. When the repair was successful, the repaired contents are rendered but not yet applied to the document itself until the user clicks "Ok" or starts editing the data. Instead of accepting the repair, the user can also click "Repair manually instead". Invoking `.acceptAutoRepair()` will programmatically accept the repair. This will trigger an update, and the method itself also returns the updated contents. In case of `text` mode or when the editor is not in an "accept auto repair" status, nothing will happen, and the contents will be returned as is.
- `refresh()`. Refresh rendering of the contents, for example after changing the font size. This is only available in `text` mode.
- `focus()`. Give the editor focus.
- `destroy()`. Destroy the editor, remove it from the DOM.

### Types

```ts
type JSONData = { [key: string]: JSONData } | JSONData[] | string | number | boolean | null

type TextContent = { text: string } | { json: undefined; text: string }
type JSONContent = { json: JSONData } | { json: JSONData; text: undefined }
type Content = JSONContent | TextContent

type Path = Array<string | number | symbol>

type JSONPatchDocument = JSONPatchOperation[]

type JSONPatchOperation = {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: string
  from?: string
  value?: JSONData
}

type JSONPatchResult = {
  json: JSONData
  previousJson: JSONData
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

type ValidationError = {
  path: Path
  message: string
  isChildError?: boolean
}

type QueryLanguage = {
  id: string
  name: string
  description: string
  createQuery: (json: JSONData, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: JSONData, query: string) => JSONData
}

type QueryLanguageOptions = {
  filter?: {
    path?: string[]
    relation?: '==' | '!=' | '<' | '<=' | '>' | '>='
    value?: string
  }
  sort?: {
    path?: string[]
    direction?: 'asc' | 'desc'
  }
  projection?: {
    paths?: string[][]
  }
}

interface RenderValuePropsOptional {
  path?: Path
  value?: JSONData
  readOnly?: boolean
  enforceString?: boolean
  selection?: Selection
  searchResultItems?: SearchResultItem[]
  isSelected?: boolean
  isEditing?: boolean
  normalization?: ValueNormalization
  onPatch?: TreeModeContext['onPatch']
  onPasteJson?: (pastedJson: { path: Path; contents: JSONData }) => void
  onSelect?: (selection: Selection) => void
  onFind?: (findAndReplace: boolean) => void
  focus?: () => void
}

interface RenderValueProps extends RenderValuePropsOptional {
  path: Path
  value: JSONData
  readOnly: boolean
  enforceString: boolean | undefined
  selection: Selection | undefined
  searchResultItems: SearchResultItem[] | undefined
  isSelected: boolean
  isEditing: boolean
  normalization: ValueNormalization
  onPatch: (patch: JSONPatchDocument) => void
  onPasteJson: (pastedJson: { path: Path; contents: JSONData }) => void
  onSelect: (selection: Selection) => void
  onFind: (findAndReplace: boolean) => void
  focus: () => void
}

type ValueNormalization = {
  escapeValue: (any) => string
  unescapeValue: (string) => string
}

type SearchResultItem = {
  path: Path
  field: Symbol
  fieldIndex: number
  start: number
  end: number
}

interface RenderValueComponentDescription {
  component: SvelteComponent
  props: RenderValuePropsOptional
}
```

## Styling

The editor can be styled using the available CSS variables. A full list with all variables can be found here:

https://github.com/josdejong/svelte-jsoneditor/blob/main/src/lib/themes/jse-theme-default.css

### Custom theme color

For example, to change the default blue theme color to anthracite:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // used when in text mode
    json: {
      string: 'Hello custom theme color :)'
    }
  }
</script>

<div class="my-json-editor">
  <JSONEditor bind:content />
</div>

<style>
  .my-json-editor {
    /* define a custom theme color */
    --jse-theme-color: #383e42;
    --jse-theme-color-highlight: #687177;
  }
</style>
```

### Dark theme

The editor comes with a built-in dark theme. To use this theme:

- Load the css file of the dark theme: `themes/jse-theme-dark.css`
- Add the class name `jse-theme-dark` of the dark theme to the HTML container element where the editor is loaded.

It is possible to load styling of multiple themes, and toggle them by changing the class name (like `jse-theme-dark`) attached to the HTML container element.

Full Svelte example:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // used when in text mode
    json: {
      string: 'Hello dark theme :)'
    }
  }
</script>

<!-- use a theme by adding its name to the container class -->
<div class="my-json-editor jse-theme-dark">
  <JSONEditor bind:content />
</div>

<style>
  /* load one or multiple themes */
  @import 'svelte-jsoneditor/themes/jse-theme-dark.css';
</style>
```

## Differences between `josdejong/svelte-jsoneditor` and `josdejong/jsoneditor`

This library [`josdejong/svelte-jsoneditor`](https://github.com/josdejong/svelte-jsoneditor/) is the successor of [`josdejong/jsoneditor`](https://github.com/josdejong/jsoneditor). The main differences are:

|              | `josdejong/jsoneditor`                                                                                               | `josdejong/svelte-jsoneditor`                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creation     | Orginal (first published in 2011)                                                                                    | Successor (first published in 2021)                                                                                                                                                                                   |
| Framework    | Implemented in plain JavaScript, using low level DOM operations                                                      | Uses [Svelte](https://svelte.dev/)                                                                                                                                                                                    |
| Tree mode    | A tree view having context menu buttons on the left of every line. The keys and values are always in editable state. | A tree view utilizing right-click to open the context menu, and double-click to start editing a key or value (more similar to a Spreadsheet or text editor). It supports copy/paste from and to the system clipboard. |
| Text mode    | Powered by [Ace editor](https://ace.c9.io/)                                                                          | Powered by [Code Mirror](https://codemirror.net)                                                                                                                                                                      |
| Preview mode | Used to preview large documents                                                                                      | Not needed, both `tree` and `text` mode can handle large documents                                                                                                                                                    |

The main reasons to create a new library instead of extending the existing one are:

- The codebase had become hard to maintain, the architecture needed a big overhaul. The codebase uses plain JavaScript to create and update the DOM based on changes in the state of the application. This is complex. Letting a framework like Svelte do this for you makes the code base much simpler.
- Performance limitations in the old editor.
- Tree mode: the classic tree mode of `josdejong/jsoneditor` is simple and straightforward, but also limited. The new tree mode of `josdejong/svelte-jsoneditor` allows for much more streamlined editing and interaction. It works quite similar to a Spreadsheet or text editor. Navigate and select using the Arrow and Shift+Arrow keys or by dragging with the mouse. Double-click (or press Enter) to start editing a key or value. Open the context menu by right-clicking on the item or selection you want to operate on. Use cut/copy/paste to move parts of the JSON around and interoperate with other applications.
- Code or text mode: the Ace editor library is using an outdated module system (AMD) and the way it is bundled and published is hard to integrate in modern JavaScript projects. Code Mirror 6 is very straightforward to integrate, has much better performance, and is very extensible (paving the way for future features).

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
