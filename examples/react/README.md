## Using with React

### First, create a React component to wrap the vanilla-jsoneditor

Depending on whether you are using JavaScript of TypeScript, create either a JSX or TSX file:

```typescript
//
// JSONEditorReact.tsx
//
import { useEffect, useRef } from "react";
import { JSONEditor, JSONEditorPropsOptional } from "vanilla-jsoneditor";

const JSONEditorReact = (props: JSONEditorPropsOptional) => {
  const editorDivRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>();  
  useEffect(() => {
    if (editorDivRef.current && !editorRef.current) {
      editorRef.current = new JSONEditor({
        target: editorDivRef.current,
        props,
      });
    }
  }, [editorDivRef, editorRef, props]);  
  return <div ref={editorDivRef} />;
};

export default JSONEditorReact;
```

```javascript
//
// JSONEditorReact.jsx
//
import { useEffect, useRef } from "react";
import { JSONEditor, JSONEditorPropsOptional } from "vanilla-jsoneditor";

const JSONEditorReact = (props) => {
  const editorDivRef = useRef(null);
  const editorRef = useRef();  
  useEffect(() => {
    if (editorDivRef.current && !editorRef.current) {
      editorRef.current = new JSONEditor({
        target: editorDivRef.current,
        props,
      });
    }
  }, [editorDivRef, editorRef, props]);  
  return <div ref={editorDivRef} />;
};

export default JSONEditorReact;
```

### Import and use the React component

If you are using NextJS, you will need to use a dynamic import to only render the component in the browser (disabling server-side rendering of the wrapper), as shown below in a NextJS TypeScript example.

If you are using React in an conventional non-NextJS browser app, you can import the component using a standard import statement like `import JSONEditorReact from '../JSONEditorReact'`

```typescript
//
// Demo.tsx for use with NextJS
//
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { Content, OnChangeStatus } from 'vanilla-jsoneditor';

//
// In NextJS the JSONEditor needs to be imported
// dynamically in order to turn off server-side
// rendering of the component
//
const JSONEditorReact = dynamic(() => import('../JSONEditorReact'), { ssr: false });

const initialContent = { 
  "hello": "world",
  "count": 1,
  "foo": [
    "bar",
    "car",
  ],
};

export default function Demo() {
  const [jsonContent, setJsonContent] = useState<Content>({ json: initialContent });
  const handler = useCallback((content: Content, previousContent: Content, status: OnChangeStatus) => {
    setJsonContent(content);
  }, [setJsonContent]);

  return (
    <div>
      <JSONEditorReact
        content={jsonContent}
        onChange={handler}
      />
      <div>
        { JSON.stringify(jsonContent) }
      </div>
    </div>
  )
}
```