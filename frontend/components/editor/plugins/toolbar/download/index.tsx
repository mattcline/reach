import { type JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

import { useGlobal } from 'context/global';
import { useDocuments } from '@/context/documents';
import { useDocument, DocumentType } from 'context/document';
import { Button } from 'components/ui/button';
import { injectCSSIntoHTML } from 'lib/utils/html';

export function DownloadPlugin(): JSX.Element {
  const { editor } = useGlobal(); // use the hoisted editor

  const { onDownload } = useDocuments();
  const { doc, saveContent } = useDocument();

  async function onClick() {
    if (!doc) return;
    const htmlString = editor.read(() => {
      return $generateHtmlFromNodes(editor, null);
    });

    try {
      // Inject the editor theme CSS into the HTML for proper styling
      const styledHtml = await injectCSSIntoHTML(htmlString, '/editor-theme.css');
      await saveContent(styledHtml, DocumentType.HTML);
      return await onDownload(doc.id);
    } catch (error) {
      console.error(error);
      toast.error('Error downloading document, please try again.');
    }
  }

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      Icon={Download}
      hoverText="Download PDF"
    >
    </Button>
  );
}