import { useRef, type JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Import, Save } from 'lucide-react';

import { Button } from 'components/ui/button';

import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';

export function ImportPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const fileInputRef = useRef(null);

  const handleFileImport = (event: any) => {
    const file = event.target.files[0];
    
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        // @ts-ignore
        const markdownContent = e.target.result;
        editor.update(() => {
          // @ts-ignore
          $convertFromMarkdownString(markdownContent, TRANSFORMERS);
        });
      };
      
      reader.readAsText(file);
    }
    
    // Reset input so same file can be imported again
    event.target.value = '';
  };

  return (
    <>
      <Button
        variant="ghost"
        Icon={Import}
        hoverText="Import Markdown"
        // @ts-ignore
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </>
  );
}