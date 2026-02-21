'use client';

import { useId } from 'react';
import { TextNode } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { Check, X } from 'lucide-react';

import { DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';
import ContentEditable from 'components/editor/ui/ContentEditable';
import { Button } from 'components/ui/button';

interface ChangeDiffProps {
  justification: string;
  diffState: string;
  onAccept: () => void;
  onReject: () => void;
}

export function ChangeDiff({ justification, diffState, onAccept, onReject }: ChangeDiffProps) {
  const id = useId();
  const namespace = `agent-diff-${id}`;

  return (
    <div className="mt-2 rounded-lg border border-border p-3 space-y-2">
      {justification && (
        <p className="text-sm italic text-muted-foreground">{justification}</p>
      )}
      <LexicalComposer initialConfig={{
        editable: false,
        editorState: diffState,
        namespace,
        nodes: [DelNode, InsNode, TextNode, TextNodeWithKey],
        onError: (e) => { throw e; },
        theme: { paragraph: 'mb-0 text-sm' }
      }}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="p-0 min-h-0" placeholder="" />}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={onAccept}
        >
          <Check size={14} className="mr-1" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground"
          onClick={onReject}
        >
          <X size={14} className="mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
