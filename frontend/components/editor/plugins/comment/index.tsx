import {
  useState,
  useCallback,
  useEffect,
  type JSX
} from 'react';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  getDOMSelection,
  KEY_ESCAPE_COMMAND,
  TextNode,
  $applyNodeReplacement
} from 'lexical';
import type {
  EditorState,
  LexicalCommand,
  LexicalEditor,
  NodeKey
} from 'lexical';
import {
  $createMarkNode,
  $getMarkIDs,
  $isMarkNode,
  MarkNode
} from '@lexical/mark';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import {EditorRefPlugin} from '@lexical/react/LexicalEditorRefPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import { MentionsPlugin } from 'components/editor/plugins/mentions';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import {$isRootTextContentEmpty, $rootTextContent} from '@lexical/text';
import {mergeRegister, registerNestedElementResolver} from '@lexical/utils';

import { useComment } from 'components/editor/context/CommentContext';
import ContentEditable from 'components/editor/ui/ContentEditable';
import { EnterPlugin } from 'components/editor/plugins/enter';
import { Threads } from '@/components/editor/plugins/comment/threads';

import { MentionNode } from 'components/editor/nodes/MentionNode';
import { DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';

export const INSERT_INLINE_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_INLINE_COMMAND',
);

function EscapeHandlerPlugin({
  onEscape,
}: {
  onEscape: (e: KeyboardEvent) => boolean;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event: KeyboardEvent) => {
        return onEscape(event);
      },
      2,
    );
  }, [editor, onEscape]);

  return null;
}

export function PlainTextEditor({
  className,
  autoFocus,
  onChange,
  onSubmit,
  onEscape,
  editorRef,
  placeholder = 'Type a comment...',
  namespace = 'Commenting'
}: {
  className?: string;
  autoFocus?: boolean;
  onChange: (editorState: EditorState, editor: LexicalEditor) => void;
  onSubmit: (editor: LexicalEditor) => void;
  onEscape: (event: KeyboardEvent) => boolean;
  editorRef?: {current: null | LexicalEditor};
  placeholder?: string;
  namespace?: string;
}) {
  const initialConfig = {
    namespace: namespace,
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
  };

  const [isMentionsTypeaheadOpen, setIsMentionsTypeaheadOpen] = useState<boolean>(false);

  return (
    <LexicalCollaboration>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              placeholder={placeholder}
              className={className}
              placeholderClassName="absolute text-sm left-0 top-0.5 items-center justify-center opacity-40"
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MentionsPlugin setIsMentionsTypeaheadOpen={setIsMentionsTypeaheadOpen} />
        <OnChangePlugin onChange={onChange} />
        {/* <HistoryPlugin /> */}
        {autoFocus !== false && <AutoFocusPlugin />}
        <EscapeHandlerPlugin onEscape={onEscape} />
        <ClearEditorPlugin />
        {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}
        <EnterPlugin onSubmit={onSubmit} disabled={isMentionsTypeaheadOpen} />
      </LexicalComposer>
    </LexicalCollaboration>
  );
}

export function useOnChange(
  setContent: (text: string) => void,
  setCanSubmit: (canSubmit: boolean) => void,
) {
  return useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      editorState.read(() => {
        setContent($rootTextContent());
        setCanSubmit(!$isRootTextContentEmpty(_editor.isComposing(), true));
      });
    },
    [setCanSubmit, setContent],
  );
}

// function ShowDeleteCommentOrThreadDialog({
//   commentOrThread,
//   onClose,
//   thread = undefined,
// }: {
//   commentOrThread: Comment | Thread;
//   onClose: () => void;
//   thread?: Thread;
// }): JSX.Element {
//   return (
//     <>
//       Are you sure you want to delete this {commentOrThread.type}?
//       <div className="Modal__content">
//         <Button
//           onClick={() => {
//             deleteCommentOrThread(commentOrThread, thread);
//             onClose();
//           }}>
//           Delete
//         </Button>{' '}
//         <Button
//           onClick={() => {
//             onClose();
//           }}>
//           Cancel
//         </Button>
//       </div>
//     </>
//   );
// }

export function CommentPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const {
    addThread,
    markNodeMap,
    activeIds,
    setActiveIds
  } = useComment();

  // highlight active nodes
  useEffect(() => {
    const changedElems: Array<HTMLElement> = [];
    for (let i = 0; i < activeIds.length; i++) {
      const id = activeIds[i];
      const keys = markNodeMap.get(id);
      if (keys !== undefined) {
        for (const key of keys) {
          const elem = editor.getElementByKey(key);
          if (elem !== null) {
            elem.classList.add('selected');
            changedElems.push(elem);
          }
        }
      }
    }
    return () => {
      for (let i = 0; i < changedElems.length; i++) {
        const changedElem = changedElems[i];
        changedElem.classList.remove('selected');
      }
    };
  }, [activeIds, editor, markNodeMap]);

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map();
    return mergeRegister(
      registerNestedElementResolver<MarkNode>(
        editor,
        MarkNode,
        (from: MarkNode) => {
          return $createMarkNode(from.getIDs());
        },
        (from: MarkNode, to: MarkNode) => {
          // Merge the IDs
          const ids = from.getIDs();
          ids.forEach((id) => {
            to.addID(id);
          });
        },
      ),
      editor.registerMutationListener(
        MarkNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, mutation] of mutations) {
              const node: null | MarkNode = $getNodeByKey(key);
              let ids: NodeKey[] = [];

              if (mutation === 'destroyed') {
                ids = markNodeKeysToIDs.get(key) || [];
              } else if ($isMarkNode(node)) {
                ids = node.getIDs();
              }

              for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                let markNodeKeys = markNodeMap.get(id);
                markNodeKeysToIDs.set(key, ids);

                if (mutation === 'destroyed') {
                  if (markNodeKeys !== undefined) {
                    markNodeKeys.delete(key);
                    if (markNodeKeys.size === 0) {
                      markNodeMap.delete(id);
                    }
                  }
                } else {
                  if (markNodeKeys === undefined) {
                    markNodeKeys = new Set();
                    markNodeMap.set(id, markNodeKeys);
                  }
                  if (!markNodeKeys.has(key)) {
                    markNodeKeys.add(key);
                  }
                }
              }
            }
          });
        },
        {skipInitialization: false},
      ),
      editor.registerUpdateListener(({editorState, tags}) => {
        editorState.read(() => {
          const selection = $getSelection();
          let hasActiveIds = false;

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              const commentIDs = $getMarkIDs(
                anchorNode,
                selection.anchor.offset,
              );
              if (commentIDs !== null) {
                console.log('setting active ids')
                setActiveIds(commentIDs);

                hasActiveIds = true; 
              }
            }
          }
          if (!hasActiveIds) {
            // console.log('erasing active ids')
            setActiveIds((_activeIds) =>
              _activeIds.length === 0 ? _activeIds : [],
            );
          }
        });
      }),
      editor.registerCommand(
        INSERT_INLINE_COMMAND,
        () => {
          // add empty thread
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            addThread('', selection);
          }

          // TODO: there's a bug where selection is not cleared after
          // clicking 'add comment' - maybe need something like the following?
          // const domSelection = getDOMSelection(editor._window);
          // if (domSelection !== null) {
          //   domSelection.removeAllRanges();
          // }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor, markNodeMap, addThread, setActiveIds]);

  return <Threads />;
}