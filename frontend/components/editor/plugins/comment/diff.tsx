import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';

import { theme } from 'components/editor/theme';

import { HeadingNode } from '@lexical/rich-text';
import {
  ListItemNode,
  ListNode
} from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';

import { $getRoot, $createTextNode, $createParagraphNode, ElementNode, RootNode } from 'lexical';

import { $createDelNode } from 'components/editor/nodes/DelNode';
import { $createInsNode } from 'components/editor/nodes/InsNode';

export function Diff({ id }: { id: string }) {
  function onError(error: Error): void {
    console.error(error);
  }

  return (
    <LexicalComposer
      key={id}
      initialConfig={{
        namespace: 'diff',
        theme,
        onError,
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          MarkNode,
          DelNode,
          InsNode,
          AutoLinkNode,
          LinkNode
        ],
        // html: {import: buildImportMap()},
        editorState: (editor) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          
          const customNode1 = $createDelNode('c');
          const customNode2 = $createInsNode('d');
          
          paragraph.append(customNode1, customNode2);
          root.append(paragraph);
        },      
        editable: false
      }}
    >
      <RichTextPlugin
        contentEditable={
          <div
            className="flex flex-1 max-w-2/3 h-full relative focus:outline-none border-none ring-none ml-12"
            // ref={onRef}
          >
            <ContentEditable
              // spellCheck="false"
              // writingsuggestions="false" // https://discord.com/channels/953974421008293909/953974421486436393/1360300939973628015
              autoComplete="off" // https://discord.com/channels/953974421008293909/953974421486436393/1359640714862133430
              autoCorrect="off"
              className="flex-1 focus-visible:outline-none mr-20 scroll-py-10"
            />
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}