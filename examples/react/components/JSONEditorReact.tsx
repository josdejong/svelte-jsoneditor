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
