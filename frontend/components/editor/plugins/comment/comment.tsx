import {
  useState,
  type JSX
} from 'react';
import { Check, CircleCheckBig, CircleX, Ellipsis, Eye, EyeClosed, EyeOff, MessageSquareLock, Trash } from 'lucide-react';
import * as Y from 'yjs';

import { getDateAndTimeStr } from 'lib/utils/date';
import { CommentOutput } from 'components/editor/context/CommentContext';
import { Diff } from 'components/editor/plugins/comment/diff';

import { TextNode, $applyNodeReplacement } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MentionNode } from 'components/editor/nodes/MentionNode';
import { DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';
import ContentEditable from 'components/editor/ui/ContentEditable';

export function Comment({
  comment,
  disabled,
  rtf,
}: {
  comment: CommentOutput | Y.Map<any>;
  disabled: boolean;
  rtf: Intl.RelativeTimeFormat;
}): JSX.Element {
  // Helper functions to get values from either CommentOutput or Y.Map
  const getTimestamp = () => {
    if ('timestamp' in comment) {
      return comment.timestamp;
    }
    return comment.get('timestamp');
  };

  const getContent = () => {
    // return (
    //   <div>
    //     <div>Here's what I suggest:</div>
    //     <Diff id={comment.get('id')} />
    //   </div>
    // )
    // if ('content' in comment) {
    //   return comment.content;
    // }
    // return comment.get('content');

    // @ts-ignore
    if (!comment.get('content')) return;

    // TODO: migrate existing production comments to JSON

    return (
      <LexicalComposer initialConfig={{
        editable: false, // @ts-ignore
        editorState: comment.get('content'), // @ts-ignore
        namespace: comment.get('id'),
        nodes: [
          MentionNode,
          DelNode,
          InsNode,
          TextNode,
          TextNodeWithKey,
          // {
          //   replace: TextNode,
          //   with: (node: TextNode) => $applyNodeReplacement(new TextNodeWithKey(node.__text)),
          //   withKlass: TextNodeWithKey
          // }
        ],
        onError: (error: Error) => {
          throw error;
        },
        theme: {
          paragraph: 'mb-0 text-sm'
        }
      }}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="p-0 min-h-0" placeholder=''/>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    )
  };

  const getAuthorDetails = () => {
    if ('author_details' in comment) {
      return comment.author_details;
    }
    return comment.get('authorDetails');
  };

  const seconds = Math.round(
    (new Date(getTimestamp()).getTime() - (performance.timeOrigin + performance.now())) / 1000,
  );
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  function onDelete(comment: CommentOutput | Y.Map<any>) {
    return;
  }

  function getTime() {
    if (seconds > -10) {
      return 'Just now';
    } else if (minutes > -60) {
      return rtf.format(minutes, 'minute');
    } else if (hours > -24) {
      return rtf.format(hours, 'hour');
    } else {
      return getDateAndTimeStr(getTimestamp());
    }
  }

  // TODO: add nested text editor to display a proposed change

  // TODO: add 'italic' for locked or private comment

  const content = getContent();
  return (
    <div className="flex flex-row flex-1 mb-4 justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row items-center text-xs opacity-60 gap-1">
            {/* <span className={`size-2 rounded-full ${getAuthorDetails().full_name === 'Seller Sally' ? 'bg-cyan-500' : 'bg-pink-500'}`} /> */}
            {/* @ts-ignore */}
            {comment.get('action') === 'approve' && <CircleCheckBig size={13} />}
            {/* @ts-ignore */}
            {comment.get('action') === 'reject' && <CircleX size={13} />}
            {/* @ts-ignore */}
            <div>{getAuthorDetails().full_name}{comment.get('action') === 'approve' && ' approved this change'}{comment.get('action') === 'reject' && ' rejected this change'}</div>
          </div>
          <div className="opacity-60 text-xs">{getTime()}</div>
        </div>
        {content && <div className={`wrap-anywhere text-sm ${disabled ? 'opacity-45' : ''}`}>{content}</div>}
      </div>
      <div className="flex flex-row">
        {/* <Trash size={15} className="ml-2 opacity-40 hover:opacity-100 hover:cursor-pointer" onClick={() => onDelete(comment)} /> */}
        {/* <Ellipsis size={15} className="ml-2 opacity-40 hover:opacity-100 hover:cursor-pointer" /> */}
      </div>
    </div>
  );
}