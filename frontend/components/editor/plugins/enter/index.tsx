import { useEffect } from 'react';
import {
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
  LexicalEditor
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export function EnterPlugin({ onSubmit, disabled }: { onSubmit: (editor: LexicalEditor) => void, disabled: boolean }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (payload: KeyboardEvent) => {
      if (disabled) return false;

      const event: KeyboardEvent = payload;
      
      // Shift + Enter should not submit
      if (!event.shiftKey) {
        event.preventDefault();
        onSubmit(editor);
      }

      return true;
    }, COMMAND_PRIORITY_LOW);
  }, [editor, onSubmit, disabled]);

  return null;
}