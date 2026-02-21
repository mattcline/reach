import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type LexicalEditor,
  $applyNodeReplacement,
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CLEAR_EDITOR_COMMAND,
  createEditor,
  LexicalNode,
  TextNode
} from 'lexical';

import { ArrowUpIcon, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isMarkNode, MarkNode } from '@lexical/mark';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { $createDelNode } from 'components/editor/nodes/DelNode';

import { TextNodeWithKey, $createTextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';
import { $delSelection, DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';
import { $createInsNode } from 'components/editor/nodes/InsNode';
import { generateRandomString } from 'components/editor/plugins/change';

import { useUser } from 'context/user';
import { useDocument } from 'context/document';
import { useWebSockets } from 'context/web-sockets';
import { useComment, ThreadOutput, yLocalComments } from 'components/editor/context/CommentContext';
import {
  useOnChange,
  PlainTextEditor
} from 'components/editor/plugins/comment';
import { Button } from 'components/ui/button';

export function ThreadInput({
  thread,
  placeholder,
}: {
  thread: ThreadOutput;
  placeholder?: string;
}) {
  const { user } = useUser();
  const { doc, visibleLayer } = useDocument();
  const { onEscape, markNodeMap, activeIds, addThread } = useComment();
  const { agentSocket } = useWebSockets();

  const [content, setContent] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const editorRef = useRef<LexicalEditor>(null);

  const onChange = useOnChange(setContent, setCanSubmit);

  const [editor] = useLexicalComposerContext();

  // APPROACH 1
  // function createCommentFromMarkNode(editor, markNode) {
  //   let commentJSON;
    
  //   // Extract serialized children
  //   editor.getEditorState().read(() => {
  //     const childrenJSON = markNode.exportJSON().children;
      
  //     // Create proper editor state JSON structure
  //     commentJSON = JSON.stringify({
  //       root: {
  //         children: [{
  //           type: 'paragraph',
  //           version: 1,
  //           children: childrenJSON
  //         }],
  //         direction: null,
  //         format: '',
  //         indent: 0,
  //         type: 'root',
  //         version: 1
  //       }
  //     });
  //   });
    
  //   return commentJSON;
  // }

  // APPROACH 2
  // function createEditorStateFromNodes(sourceEditor, node1, node2) {
  //   let node1JSON, node2JSON;
    
  //   sourceEditor.getEditorState().read(() => {
  //     node1JSON = node1.exportJSON();
  //     node2JSON = node2.exportJSON();
  //   });
    
  //   const tempEditor = createEditor({
  //     nodes: [
  //       MarkNode,
  //       InsNode,
  //       DelNode,
  //       TextNodeWithKey
  //     ],
  //   });
    
  //   // Build the JSON structure directly
  //   const stateJSON = {
  //     root: {
  //       children: [{
  //         type: 'paragraph',
  //         version: 1,
  //         children: [node1JSON, node2JSON]
  //       }],
  //       direction: null,
  //       format: '',
  //       indent: 0,
  //       type: 'root',
  //       version: 1
  //     }
  //   };
    
  //   // Parse and return - no update() needed
  //   const editorState = tempEditor.parseEditorState(JSON.stringify(stateJSON));
  //   return JSON.stringify(editorState.toJSON());
  // }

  // APPROACH 3
  function createCommentFromMarkNode(delNodeJSON: any, insNodeJSON: any) {
    // Create a temporary editor with the same node configuration
    const tempEditor = createEditor({
      nodes: [
        // MentionNode,
        DelNode,
        InsNode,
        TextNodeWithKey,
        // TextNode,
        // {
        //   replace: TextNode,
        //   with: (node: TextNode) => $applyNodeReplacement(new TextNodeWithKey(node.__text)),
        //   withKlass: TextNodeWithKey
        // }
      ],
    });

    
    tempEditor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      const nodes = $generateNodesFromSerializedNodes([delNodeJSON, insNodeJSON]);
      nodes.forEach(node => {
        paragraph.append(node);
      });
      
      root.append(paragraph);
    }, {discrete: true});
    
    return JSON.stringify(tempEditor.getEditorState().toJSON());
  }

  function exportNodeSubtree(node: LexicalNode) {
    const json = node.exportJSON();
  
    if ($isElementNode(node)) {
      // @ts-ignore
      json.children = node.getChildren().map(exportNodeSubtree);
    }
  
    return json;
  }

  // create comment when ai responds to a comment where it is mentioned
  useEffect(() => {
    if (!agentSocket) return;
    agentSocket.addEventListener('message', (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      // filter to the correct thread since each thread has its own agent listener
      // if (data.thread_id !== thread.yThread.get('id')) return;

      // TODO: uncomment when we can parse the AI's conversational response
      // if (data.comment) {
      //   const yComment = new Y.Map();
      //   yComment.set('id', crypto.randomUUID());
      //   yComment.set('content', data.message);
      //   yComment.set('authorDetails', { full_name: 'ai' });
      //   yComment.set('timestamp', Date.now());

      //   const yComments = thread.yThread.get('comments') as unknown as Y.Array<any>;
      //   if (yComments) {
      //     yComments.push([yComment]);
      //   }
      // } 
      
      if (false) {
        const changes = JSON.parse(data.changes);
        // @ts-ignore
        let lastCreatedDelNode = null;
        // @ts-ignore
        let insNode = null;
        let delNodeJSON = null;
        let insNodeJSON = null;
        editor.update(() => {
          for (let change of changes) {
            if (change.type === 'deletion') {
              const selectionToDelete = $createRangeSelection();
              selectionToDelete.anchor.set(
                change.start_key,
                change.start_offset,
                'text'
              );
              selectionToDelete.focus.set(
                change.end_key,
                change.end_offset,
                'text'
              );
              addThread('', selectionToDelete)
              lastCreatedDelNode = $delSelection(selectionToDelete);


            } else if (change.type === 'addition') {
              // TODO: this will break when we have multiple addition/deletion pairs
              const textNodeWithKey = $createTextNodeWithKey(change.text);
              insNode = $createInsNode(generateRandomString(10));
              insNode.append(textNodeWithKey);
              // @ts-ignore
              lastCreatedDelNode?.insertAfter(insNode);
            }
          }
          // @ts-ignore
          delNodeJSON = lastCreatedDelNode ? lastCreatedDelNode.exportJSON() : $createDelNode().exportJSON()
          // @ts-ignore
          insNodeJSON = exportNodeSubtree(insNode); // need a special fn to serialize the children
        });
          
        const yComment = new Y.Map();
        yComment.set('id', crypto.randomUUID());

        // const commentJSON = createEditorStateFromNodes(editor, lastCreatedDelNode, insNode)
        const commentJSON = createCommentFromMarkNode(delNodeJSON, insNodeJSON);

        yComment.set('content', commentJSON);

        // yComment.set('content', data.message);
        yComment.set('authorDetails', { full_name: 'ai' });
        yComment.set('timestamp', Date.now());

        const yComments = thread.yThread.get('comments') as unknown as Y.Array<any>;
        if (yComments) {
          yComments.push([yComment]);
        }
      }
      setLoading(false);
    });
  }, [agentSocket]);

  const getActiveMarkText = () => {
    if (activeIds.length === 0) return '';
    
    let markText = '';
    
    editor.getEditorState().read(() => {
      const firstId = activeIds[0];
      const keys = markNodeMap.get(firstId);
      
      if (keys !== undefined && keys.size > 0) {
        // Collect text from ALL keys for this mark
        const textParts: string[] = [];
        
        for (const key of keys) {
          const node = $getNodeByKey(key);
          
          if ($isMarkNode(node)) {
            textParts.push(node.getTextContent());
          }
        }
        
        markText = textParts.join('');
      }
    });
    
    return markText;
  };

  // const onSubmit = useCallback(async () => {
  const onSubmit = async (commentEditor: LexicalEditor | null = editorRef.current) => {
    if (!canSubmit || !commentEditor) return;

    const yComment = new Y.Map();
    yComment.set('id', crypto.randomUUID());
    commentEditor.getEditorState().read(() => {
      const editorStateJSON = commentEditor.getEditorState().toJSON();
      yComment.set('content', JSON.stringify(editorStateJSON));
    });
    yComment.set('authorDetails', { id: user?.id, full_name: user?.full_name || user?.email });
    yComment.set('timestamp', Date.now());

    let yComments;

    // handle private comment
    if ((thread.yThread.get('layer') as string) === 'base' && visibleLayer !== 'base') {
      yComment.set('private', true);
      const id = thread.yThread.get('id') as string;
      if (id && yLocalComments && yLocalComments.has(id)) {
        const comments = yLocalComments.get(id) as Y.Array<any>;
        if (comments) {
          comments.push([yComment]);
        }
      } else if (id && yLocalComments) {
        yComments = new Y.Array();
        yComments.push([yComment]);
        yLocalComments.set(id, yComments);
      }
    } else {
      yComments = thread.yThread.get('comments') as unknown as Y.Array<any>;
      if (yComments) {
        yComments.push([yComment]);
      }
    }

    // if message starts with 'ai', send the request to ai
    if (content.substring(0, 2) === 'ai') {
      if (!doc || !agentSocket || !editor) return;

      setLoading(true);
      
      const documentJson = JSON.stringify(editor.getEditorState());

      agentSocket.send(JSON.stringify({
        'message': content.substring(2),
        'document_id': doc.id,
        'stream': false,
        'conversation_history': yComments,
        'document_text': documentJson,
        'active_mark_ids': activeIds,
        'thread_id': thread.yThread.get('id')
      }));
    }

    // clear the editor
    const threadInputEditor = editorRef.current;
    if (threadInputEditor !== null) {
      threadInputEditor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    }
  }
  // }, [doc, agentSocket, editor]);

  return (
    <div className="relative flex flex-row flex-1 w-full">
      <PlainTextEditor
        className="outline-none relative w-full h-full flex-1 rounded-md bg-transparent z-1"
        autoFocus={thread.focused}
        onChange={onChange}
        onSubmit={onSubmit}
        onEscape={onEscape}
        editorRef={editorRef}
        placeholder={placeholder}
        namespace={`${thread.yThread.get('layer')}-${thread.yThread.get('id')}`}
      />
      <div className="mb-4">
        {/* <AtSign size={20} /> */}
        <Button
          onClick={(e) => onSubmit()}
          variant="default"
          className={`rounded-full`}
          size="icon-xs"
          Icon={ArrowUpIcon}
          loading={loading}
          disabled={!canSubmit}
        >
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
}