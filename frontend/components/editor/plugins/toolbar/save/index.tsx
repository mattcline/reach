import { type JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { useDocument, DocumentType } from 'context/document';
import { Button } from 'components/ui/button';

export function SavePlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { saveContent } = useDocument();

  async function onClick() {
    const stringifiedEditorState = JSON.stringify(editor.getEditorState());
    try {
      // Parse the JSON string into a JavaScript object
      const parsedObject = JSON.parse(stringifiedEditorState);

      // Pretty print the parsed object with indentation
      const prettyJson = JSON.stringify(parsedObject, null, 2); // `2` is the number of spaces for indentation

      console.log(prettyJson);

      console.log(stringifiedEditorState);

      return saveContent(stringifiedEditorState, DocumentType.JSON);
    } catch (error) {
      console.error(error);
      toast.error('Error saving document, please try again.');
    }
  }

  return (
    <Button
      onClick={onClick}
      Icon={Save}
      variant="ghost"
    >
      Save
    </Button>
  );
}