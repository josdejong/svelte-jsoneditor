# vanilla-jsoneditor

A web-based tool to view, edit, format, transform, and validate JSON.

This is the vanilla variant of `svelte-jsoneditor` that can be used in vanilla JavaScript or frameworks like SolidJS, React, Vue, Angular.

## Install

Install using npm:

```
npm install vanilla-jsoneditor
```

## Use

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
          onChange: (updatedContent, previousContent, { contentErrors, patchResult }) => {
            // content is an object { json: JSONData } | { text: string }
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

## Documentation

For documentation, see: https://github.com/josdejong/svelte-jsoneditor
