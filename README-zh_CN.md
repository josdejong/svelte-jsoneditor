# svelte-jsoneditor

一种基于 Web 的工具，用于查看、编辑、格式化、转换和验证 JSON。

试试看： https://jsoneditoronline.org

该库是用 Svelte 编写的，但也可以在纯 JavaScript 和任何框架（SolidJS、React、Vue、Angular 等）中使用。

![JSONEditor tree mode screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_tree_mode_screenshot.png)
![JSONEditor text mode screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_text_mode_screenshot.png)
![JSONEditor table mode screenshot](https://raw.githubusercontent.com/josdejong/svelte-jsoneditor/main/misc/jsoneditor_table_mode_screenshot.png)

## 功能

- 查看和编辑 JSON
- 具有文本编辑器、树视图和表格视图
- 格式化（美化）和压缩 JSON
- 排序、查询、过滤和转换 JSON
- 修复 JSON
- JSON schema验证和可插拔的自定义验证
- 颜色高亮显示、撤消/重做、搜索和替换
- 颜色选择器和时间戳标签等实用程序
- 最大可处理 512 MB 的大型 JSON 文档

## 安装

在 Svelte 项目中使用：

```
npm install svelte-jsoneditor
```

对于 原生JavaScript 或 SolidJS、React、Vue、Angular 等框架的使用：

```
npm install vanilla-jsoneditor
```

## 用法

### 例子

- Svelte 例子: [/src/routes/examples](/src/routes/examples)
- 原生 JavaScript 例子: [/examples/browser](/examples/browser)
- React 例子: https://codesandbox.io/s/svelte-jsoneditor-react-59wxz
- Vue 例子: https://codesandbox.io/s/svelte-jsoneditor-vue-toln3w

### Svelte 的用法

创建具有双向绑定的 JSONEditor `bind:json`:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // 可用于传递字符串化的 JSON 文档
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

或单向绑定：


```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = {
    text: undefined, // can be used to pass a stringified JSON document instead
    json: {
      greeting: 'Hello World'
    }
  }

  function handleChange(updatedContent, previousContent, { contentErrors, patchResult }) {
    // content is an object { json: JSONValue } | { text: string }
    console.log('onChange: ', { updatedContent, previousContent, contentErrors, patchResult })
    content = updatedContent
  }
</script>

<div>
  <JSONEditor {content} onChange="{handleChange}" />
</div>
```

### 独立包（用于 React、Vue、Angular、纯 JavaScript 等)

该库通过 npm 库提供了一个独立的编辑器包 `vanilla-jsoneditor`（代替 `svelte-jsoneditor`) 可以在任何浏览器环境和框架中使用。 在像 React、Vue 或 Angular 这样的框架中，您需要围绕类接口编写一些包装代码。

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
          onChange: (updatedContent, previousContent, { contentErrors, patchResult }) => {
            // content is an object { json: JSONValue } | { text: string }
            console.log('onChange', { updatedContent, previousContent, contentErrors, patchResult })
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

### 特定框架的包装库

为了更容易在您选择的框架中使用该库，您可以使用包装器库：

- Vue:
  - [json-editor-vue](https://github.com/cloydlau/json-editor-vue)
  - [vue3-ts-jsoneditor](https://github.com/bestkolobok/vue3-jsoneditor)

## API

### 构造器（constructor）

Svelte 组件:

```html
<script>
  import { JSONEditor } from 'svelte-jsoneditor'

  let content = { text: '[1,2,3]' }
</script>

<div>
  <JSONEditor {content} />
</div>
```

JavasScript 类:

```js
import { JSONEditor } from 'vanilla-jsoneditor'

const content = { text: '[1,2,3]' }

const editor = new JSONEditor({
  target: document.getElementById('jsoneditor'),
  props: {
    content,
    onChange: (updatedContent, previousContent, { contentErrors, patchResult }) => {
      // 内容是一个对象 { json: JSONValue } | { text: string }
      console.log('onChange', { updatedContent, previousContent, contentErrors, patchResult })
    }
  }
})
```

### 属性

- `content: Content` 传递要在 JSONEditor 中呈现的 JSON 内容。 `Content`是包含属性的对象 `json`（已解析的 JSON 文档）或 `text`（字符串化的 JSON 文档）。 必须只定义两个属性之一。 您可以将这两种内容类型传递给编辑器，而不管它是什么模式。
- `mode: 'tree' | 'text' | 'table'`. 打开编辑器 `'tree'`模式（默认）， `'table'`模式，或 `'text'`模式（以前： `code`模式）
- `mainMenuBar: boolean` 显示主菜单栏。 默认值为 `true`.
- `navigationBar: boolean` 显示导航栏，您可以在其中查看所选路径并从那里浏览文档。 默认值为 `true`.
- `statusBar: boolean` 在底部显示状态栏 `'text'`编辑器，显示有关光标位置和所选内容的信息。 默认值为 true.
- `readOnly: boolean` 以只读模式打开编辑器：不能进行任何更改，不相关的按钮从菜单中隐藏，上下文菜单不可用。 默认值为 `false`.
- `indentation: number | string` 字符串化 JSON 时用于缩进的空格数，或用作缩进的字符串，如 `'\t'`使用制表符作为缩进，或 `' '`使用 4 个空格（相当于配置 `indentation: 4`). 另见属性 `tabSize`.
- `tabSize: number` 当缩进配置为制表符 ( `indentation: '\t'`), `tabSize`配置制表符呈现的大小。 默认值为 `4`. 只适用于 `text`模式。
- `escapeControlCharacters: boolean`. 默认为 `false`。 什么时候 `true`，换行符和制表符等控制字符呈现为转义字符 `\n`和 `\t`. 只适用于 `'tree'`模式，在 `'text'`模式控制字符总是被转义。
- `escapeUnicodeCharacters: boolean`. 默认为`false`。 什么时候 `true`, unicode 字符如 ☎和 😀被转义为 `\u260e`和 `\ud83d\ude00`.
- `flattenColumns: boolean`. 默认情况下为 `true`。 只适用于 `'table'`模式。 什么时候 `true`, 嵌套对象属性将分别显示在各自的列中，嵌套路径作为列名。 什么时候 `false`, 嵌套对象将内联呈现，双击它们将在弹出窗口中打开它们。
- `validator: function (json: JSONValue): ValidationError[]`. 验证 JSON 文档。 例如，使用由 Ajv 提供支持的内置 JSON Schema 验证器：

  ```js
  import { createAjvValidator } from 'svelte-jsoneditor'

  const validator = createAjvValidator({ schema, schemaDefinitions })
  ```

- `parser: JSON = JSON`. 配置自定义 JSON 解析器，例如  [`lossless-json`](https://github.com/josdejong/lossless-json). 默认情况下，使用 JavaScript 的原生 JSON 解析器。 这 JSON接口是一个对象 parse和 stringify功能。 例如：

  ```html
  <script>
    import { JSONEditor } from 'svelte-jsoneditor'
    import { parse, stringify } from 'lossless-json'

    const LosslessJSONParser = { parse, stringify }

    let content = { text: '[1,2,3]' }
  </script>

  <div>
    <JSONEditor {content} parser="{LosslessJSONParser}" />
  </div>
  ```

- `validationParser: JSONParser = JSON`. 仅适用于 `validator`。这与`parser`相同，只是此解析器用于在将数据发送到验证器之前解析数据。。 配置一个自定义 JSON 解析器，用于在将 JSON 传递给验证器之前解析它。. 默认使用内置的 JSON 解析器。传递自定义 `validationParser` 时，请确保配置的验证器支持解析器的输出。 因此，当 `validationParser` 可以输出 `bigint` 数字或其他数字类型时，验证器也必须支持它。 在树模式(tree mode)下，当 `parser` 不等于 `validationParser` 时，JSON 文档将在通过 `validationParser.parse(parser.stringify(json))` 传递给 `validator` 之前进行转换。
- `pathParser: JSONPathParser`. 一个可选对象，带有解析和字符串化方法，用于解析和字符串化 `JSONPath`，它是一个带有属性名称的数组。`pathParser`用于导航栏中的路径编辑器，点击导航栏右侧的编辑按钮打开。 当输入无效时，允许 `pathParser.parse` 函数抛出错误。 默认情况下，使用 JSON 路径表示法，类似于 `$.data[2].nested.property`。 或者，可以使用例如 `/data/2/nested/property` 之类的 JSON 指针符号或定制的东西。 相关辅助函数：`parseJSONPath` 和 `stringifyJSONPath`、`parseJSONPointer` 和 `compileJSONPointer`。
- `onError(err: Error)`.
   发生错误时触发的回调。 默认实现是在控制台中记录错误并向用户显示简单的警报消息。
- `onChange(content: Content, previousContent: Content, changeStatus: { contentErrors: ContentErrors, patchResult: JSONPatchResult | null })`.在内容每次更改时调用的回调，包括用户所做的更改和通过 `.set()`、`.update()` 或 `.patch()` 等方法进行的更改。 返回的内容有时是`{json}`类型，有时是`{text}`类型。 返回两者中的哪一个取决于编辑器的模式、应用的更改以及文档的状态（有效、无效、空）。 请注意 `{ text }` 可能包含无效的 JSON：在`text`模式下输入时，JSON 文档将暂时无效，就像用户输入新字符串时一样。 参数 `patchResult` 仅在可以表示为 JSON 补丁文档的更改时返回，例如在`text`模式下自由输入时不返回。
- `onChangeMode(mode: 'tree' | 'text' | 'table')`. 模式改变时调用。
- `onClassName(path: Path, value: any): string | undefined`.
  根据路径和/或值向特定节点添加自定义类名。
- `onRenderValue(props: RenderValueProps) : RenderValueComponentDescription[]`

  _实验性的！ 此 API 很可能会在未来版本中更改。_

  自定义值的呈现。 默认， `renderValue`被使用，它将值呈现为可编辑的 div，并且根据该值还可以切换展示、颜色选择器和时间戳标记。 多个组件可以并排呈现，例如布尔切换和颜色选择器呈现在可编辑 div 的左侧。 内置值渲染器组件： `EditableValue`, `ReadonlyValue`, `BooleanToggle`, `ColorPicker`, `TimestampTag`, `EnumValue`.
  对于 JSON Schema 枚举，有一个值渲染器 `renderJSONSchemaEnum`它使用 `EnumValue零件`。 这可以像这样使用：

  ```js
  import { renderJSONSchemaEnum, renderValue } from 'svelte-jsoneditor'

  function onRenderValue(props) {
    // 使用自定义渲染器，并使用默认渲染器兜底
    return renderJSONSchemaEnum(props, schema, schemaDefinitions) || renderValue(props)
  }
  ```

- `onRenderMenu(mode: 'tree' | 'text' | 'table', items: MenuItem[]) : MenuItem[] | undefined`.
  Callback which can be used to make changes to the menu items. New items can
  be added, or existing items can be removed or reorganized. When the function
  returns `undefined`, the original `items` will be applied.
- 可用于更改菜单项的回调。 可以添加新项目，也可以删除或重组现有项目。 当函数返回 `undefined` 时，将使用默认选项。

  一个菜单项 `MenuItem`可以是以下类型之一：

  - 按钮:

    ```ts
    interface MenuButtonItem {
      onClick: () => void
      icon?: IconDefinition
      text?: string
      title?: string
      className?: string
      disabled?: boolean
    }
    ```

  - 分隔符 (一组项目之间的灰色垂直线):

    ```ts
    interface MenuSeparatorItem {
      separator: true
    }
    ```

  - 空间（填满空白空间）：

    ```ts
    interface MenuSpaceItem {
      space: true
    }
    ```

- `queryLanguages: QueryLanguage[]`.  
  配置一种或多种查询语言，可以在转换模式中使用。 该库附带三种语言：

  ```ts
  import {
    jmespathQueryLanguage,
    lodashQueryLanguage,
    javascriptQueryLanguage
  } from 'svelte-jsoneditor'

  const allQueryLanguages = [jmespathQueryLanguage, lodashQueryLanguage, javascriptQueryLanguage]
  ```

  默认情况下，只加载 `javascriptQueryLanguage`。

- `queryLanguageId`.
  当前所选查询语言的`id`。

- `onChangeQueryLanguage: (queryLanguageId: string) => void`.
  当用户通过右上角的配置按钮更改 TransformModal 中选定的查询语言时调用的回调函数。

- `onFocus()` 当编辑器获得焦点时触发回调。
- `onBlur()` 当编辑器失去焦点时触发回调。

### 方法

- `get(): Content` 获取当前的 JSON 文档。
- `set(content: Content)` 替换当前内容。 将重置编辑器的状态。 另见方法 `update(content)`.
- `update(content: Content)` 更新加载的内容，保持编辑器的状态（如展开的对象）。 你也可以使用 `editor.updateProps({ content })`. 另见方法 `set(content)`.
- `patch(operations: JSONPatchDocument) : JSONPatchResult` 应用 JSON 补丁文档来更新 JSON 文档的内容。 一个 JSON 补丁文档是一个包含 JSON 补丁操作的列表。
- `updateProps(props: Object)` 更新部分或全部属性。 也可以通过`content`更新， 这相当于调用` update(content)`. 例子：

  ```js
  editor.updateProps({
    readOnly: true
  })
  ```

- `expand([callback: (path: Path) => boolean])` 在编辑器中展开或折叠路径。 通过`callback`确定将展开哪些路径。 如果不提供 `callback`，所有展开所有路径。 只有当路径的所有父路径都已展开时，才有可能展开路径。 例子：
  - `editor.expand(path => true)` 展开全部
  - `editor.expand(path => false)` 折叠全部
  - `editor.expand(path => path.length < 2)` 将所有路径展开到 2 级目录
- `transform({ id?: string, rootPath?: [], onTransform: ({ operations: JSONPatchDocument, json: JSONValue, transformedJson: JSONValue }) => void, onClose: () => void })`  以编程方式触发单击主菜单中的变换按钮，打开变换模型。 如果提供了`onTransform`回调，它将替换内置逻辑以应用转换，允许您以替代方式处理转换操作。 如果提供了`onClose`回调， 回调将在转换模式关闭时触发，无论是在用户单击应用还是取消之后。 如果提供 `id`，转换模态将加载此的先前状态 `id`而不是编辑器转换模式的状态。
- `scrollTo(path: Path)` 垂直滚动编辑器，使指定的路径出现在视图中。 路径将在需要时展开。
- `findElement(path: Path)` 查找给定路径的 DOM 元素。 找不到的时候返回 `null`。
- `acceptAutoRepair(): Content` 在树模式（tree mode）下，加载时自动修复无效的 JSON。 修复成功后，修复后的内容会呈现出来，但不会应用到文档本身，直到用户单击“Ok”或开始编辑数据。 除了接受修复，用户还可以单击“Repair manually instead(改为手动修复)”。 调用 `.acceptAutoRepair()`将以编程方式接受修复。 这将触发更新，方法本身也会返回更新后的内容。 的情况下 `text`模式或当编辑器不处于“接受自动修复”状态时，不会有任何反应，内容将原样返回。
- `refresh()`. 刷新内容的呈现，例如在更改字体大小之后。 这仅适用于 `text`模式。
- `validate() : ContentErrors`. 获取所有当前的解析错误和验证错误。
- `focus()`. 给编辑器获取焦点。
- `destroy()`. 销毁编辑器，将其从 DOM 中移除。

### Utility functions

- Rendering of values:
  - `renderValue`
  - `renderJSONSchemaEnum`
  - Components:
    - `BooleanToggle`
    - `ColorPicker`
    - `EditableValue`
    - `EnumValue`
    - `ReadonlyValue`
    - `TimestampTag`
- Validation:
  - `createAjvValidator`
- Query languages:
  - `lodashQueryLanguage`
  - `javascriptQueryLanguage`
  - `jmespathQueryLanguage`
- Content:
  - `isContent`
  - `isTextContent`
  - `isJSONContent`
  - `isLargeContent`
  - `toTextContent`
  - `toJSONContent`
  - `estimateSerializedSize`
- Selection:
  - `isValueSelection`
  - `isKeySelection`
  - `isInsideSelection`
  - `isAfterSelection`
  - `isMultiSelection`,
  - `isEditingSelection`
  - `createValueSelection`
  - `createKeySelection`
  - `createInsideSelection`,
  - `createAfterSelection`
  - `createMultiSelection`
- Parser:
  - `isEqualParser`
- Path:
  - `parseJSONPath`
  - `stringifyJSONPath`
- Functions from [`immutable-json-patch`](https://github.com/josdejong/immutable-json-patch/):
  - `immutableJSONPatch`
  - `revertJSONPatch`
  - `parseJSONPointer`
  - `parsePath`
  - `parseFrom`
  - `compileJSONPointer`
  - `compileJSONPointerProp`
  - `getIn`
  - `setIn`
  - `updateIn`
  - `insertAt`
  - `existsIn`
  - `deleteIn`

### Types

```ts
type JSONValue = { [key: string]: JSONValue } | JSONValue[] | string | number | boolean | null

type TextContent = { text: string }
type JSONContent = { json: JSONValue }
type Content = JSONContent | TextContent

type JSONParser = JSON

interface JSONPathParser {
  parse: (pathStr) => JSONPath
  stringify: (path: JSONPath) => string
}

type JSONPatchDocument = JSONPatchOperation[]

type JSONPatchOperation = {
  op: 'add' | 'remove' | 'replace' | 'copy' | 'move' | 'test'
  path: string
  from?: string
  value?: JSONValue
}

type JSONPatchResult = {
  json: JSONValue
  previousJson: JSONValue
  undo: JSONPatchDocument
  redo: JSONPatchDocument
}

interface ParseError {
  position: number | null
  line: number | null
  column: number | null
  message: string
}

interface ValidationError {
  path: JSONPath
  message: string
  severity: ValidationSeverity
}

interface ContentParseError {
  parseError: ParseError
  isRepairable: boolean
}

interface ContentValidationErrors {
  validationErrors: ValidationError[]
}

type ContentErrors = ContentParseError | ContentValidationErrors

interface QueryLanguage {
  id: string
  name: string
  description: string
  createQuery: (json: JSONValue, queryOptions: QueryLanguageOptions) => string
  executeQuery: (json: JSONValue, query: string) => JSONValue
}

interface QueryLanguageOptions {
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
  value?: JSONValue
  readOnly?: boolean
  enforceString?: boolean
  selection?: Selection
  searchResultItems?: SearchResultItem[]
  isSelected?: boolean
  isEditing?: boolean
  normalization?: ValueNormalization
  onPatch?: TreeModeContext['onPatch']
  onPasteJson?: (pastedJson: { path: Path; contents: JSONValue }) => void
  onSelect?: (selection: Selection) => void
  onFind?: (findAndReplace: boolean) => void
  focus?: () => void
}

interface RenderValueProps extends RenderValuePropsOptional {
  path: Path
  value: JSONValue
  readOnly: boolean
  enforceString: boolean | undefined
  selection: Selection | undefined
  searchResultItems: SearchResultItem[] | undefined
  isSelected: boolean
  isEditing: boolean
  normalization: ValueNormalization
  onPatch: (patch: JSONPatchDocument, afterPatch?: AfterPatchCallback) => JSONPatchResult
  onPasteJson: (pastedJson: { path: Path; contents: JSONValue }) => void
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
    text: undefined, // can be used to pass a stringified JSON document instead
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
    text: undefined, // can be used to pass a stringified JSON document instead
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
| Creation     | Original (first published in 2011)                                                                                   | Successor (first published in 2021)                                                                                                                                                                                   |
| Framework    | Implemented in plain JavaScript, using low level DOM operations                                                      | Uses [Svelte](https://svelte.dev/)                                                                                                                                                                                    |
| Tree mode    | A tree view having context menu buttons on the left of every line. The keys and values are always in editable state. | A tree view utilizing right-click to open the context menu, and double-click to start editing a key or value (more similar to a Spreadsheet or text editor). It supports copy/paste from and to the system clipboard. |
| Text mode    | Powered by [Ace editor](https://ace.c9.io/)                                                                          | Powered by [Code Mirror](https://codemirror.net)                                                                                                                                                                      |
| Preview mode | Used to preview large documents                                                                                      | Not needed, both `tree` and `text` mode can handle large documents                                                                                                                                                    |

The main reasons to create a new library instead of extending the existing one are:

- The codebase had become hard to maintain, the architecture needed a big overhaul. The codebase uses plain JavaScript to create and update the DOM based on changes in the state of the application. This is complex. Letting a framework like Svelte do this for you makes the code base much simpler.
- Performance limitations in the old editor.
- Tree mode: the classic tree mode of `josdejong/jsoneditor` is simple and straightforward, but also limited. The new tree mode of `josdejong/svelte-jsoneditor` allows for much more streamlined editing and interaction. It works quite similar to a Spreadsheet or text editor. Navigate and select using the Arrow and Shift+Arrow keys or by dragging with the mouse. Double-click (or press Enter) to start editing a key or value. Open the context menu by right-clicking on the item or selection you want to operate on. Use cut/copy/paste to move parts of the JSON around and interoperate with other applications.
- Code or text mode: the Ace editor library is using an outdated module system (AMD) and the way it is bundled and published is hard to integrate in modern JavaScript projects. Code Mirror 6 is very straightforward to integrate, has much better performance, and is very extensible (paving the way for future features).

## Known issues

When the library gives compile errors in your Svelte setup, it could be related to Vite having trouble importing ESM/CommonJS libraries the right way. The error could look like:

> SyntaxError: The requested module '/node_modules/json-source-map/index.js?v=fda884be' does not provide an export named 'default' (at jsonUtils.js?v=fda884be:2:8)

A workaround is to add the following to your `vite.config.js` file ([read more](https://github.com/josdejong/svelte-jsoneditor/issues/185)):

```js
// ...

/** @type {import('vite').UserConfig} */
const config = {
  // ...
  optimizeDeps: {
    include: [
      'ajv-dist',
      'immutable-json-patch',
      'lodash-es',
      '@fortawesome/free-regular-svg-icons',
      'jmespath'
    ]
  }
}

// ...
```

## Develop

Clone the git repository

Install dependencies (once):

```
npm install
```

Start the demo project (at http://localhost:5173):

```
npm run dev
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

Automatically fix linting issues:

```
npm run format
```

Publish to npm (will increase version number and publish to npm):

```
npm run release
```

Note that it will publish two npm packages: `svelte-jsoneditor` and `vanilla-jsoneditor`. You'll need to enter an npm one-time password twice.

To try a build and see the change list, run:

```
npm run release-dry-run
```

## License

`svelte-jsoneditor` is released as open source under the permissive the [ISC license](LICENSE.md).

**If you are using `svelte-jsoneditor` commercially, there is a _social_ (but no legal) expectation that you help fund its maintenance. [Start here](https://github.com/sponsors/josdejong).**
