import { useEffect, useMemo } from 'react';
import {
  TextNode,
  $getNodeByKey,
  ElementNode,
  LexicalNode,
  NodeKey,
  EditorConfig,
  KEY_BACKSPACE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $isRangeSelection,
  $getSelection,
  DELETE_CHARACTER_COMMAND,
  REMOVE_TEXT_COMMAND,
  DELETE_WORD_COMMAND,
  DELETE_LINE_COMMAND,
  KEY_DELETE_COMMAND,
  CUT_COMMAND,
  CLEAR_EDITOR_COMMAND,
  $createRangeSelection,
  createState,
  $setState,
  $getState,
} from 'lexical';
import { addClassNamesToElement, mergeRegister, registerNestedElementResolver } from '@lexical/utils';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { useDocument } from 'context/document';
import { simpleDiffWithCursor } from 'components/editor/shared/simpleDiffWithCursor';
import { useComment } from 'components/editor/context/CommentContext';
import { DelNode, $delSelection, $createDelNode, $isDelNode } from '@/components/editor/nodes/DelNode';
import { $createInsNode, InsNode } from '@/components/editor/nodes/InsNode';

export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
  }
  return result;
}

export function wrapSelectionInChangeNode() {
  // TODO: make sure 'undo' works

  // Reviewing change: 'accept', 'reject', 'comment'
  // Making change: 'include' (from bot), 'undo'/'delete', 'comment'

  // Case 0: agent suggests deletion of text
  // Case 1: agent suggests deletion of existing selection and replacement with new text
  // Case 1.5: agent suggestions deletion of existing selection and addition somewhere else (change is not contiguous)
    // TODO: split them into two changes?

  // Case 1.6: agent suggests new text
  // Case 2: user removes text
  // Case 3: user removes text and replaces with new text
  // Case 4: user adds new text

  // wrap in mark node
}

export function acceptChange() {
  // remove deletion and unwrap insertion
}

export function rejectChange() {
  // unwrap deletion and remove insertion
}

export function ChangePlugin(): null {
  const [editor] = useLexicalComposerContext();

  // @ts-ignore
  const { addThread, updateThread } = useComment();

  const changeNodesMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map();
  }, []);

  const nodeChangeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map();
  }, []);

  useEffect(() => {
    function handleEraseText(event: KeyboardEvent) {
      const selection = $getSelection();
      // if (!selection || !$isRangeSelection(selection)) return;
      // if ($getNodeByKey(selection.anchor.key) === )

      event.preventDefault();

      // Case 1: in deletion node, if so, move cursor
      // Case 1.5: selection includes deletion node (or touches it)
                // combine it
                // TODO: might be solved by can insert before or after

      // Case 3: in neither, so create a deletion node
      if ($isRangeSelection(selection)) {
        // if selection is collapsed, expand it to include the previous character
        if (selection.isCollapsed()) {
          const expandedSelection = $createRangeSelection();
          const anchor = selection.anchor;
          const focus = selection.focus;
          if (anchor.type === 'text' && anchor.offset > 0) {
            expandedSelection.anchor.set(anchor.key, anchor.offset - 1, 'text');
            expandedSelection.focus.set(focus.key, focus.offset, focus.type);
          }
          // selection.modify('extend', true, 'character');
          let updatedSelection = $delSelection(expandedSelection); // TODO: stale code, check updated return type which returns last created del node
        } else {
          $delSelection(selection);
          // addThread('', selection);
        }
      }
      // TODO: if backspacing over a single char, move cursor

      return true;
    }

    // TODO: handle paste separately

    // TODO: do not allow user to add text inside a del node

    // we use a node transform for addition so we don't
    // have to handle the complication of detecting new text
    // (there's no direct INSERT_CHARACTER command we can listen
    // to other than KEY_DOWN_COMMAND and that would be complicated
    // to handle)
    return mergeRegister(
      editor.registerNodeTransform(TextNode, (node: TextNode) => {
        return;
        // get previous node text
        // https://discord.com/channels/953974421008293909/1040601449496846366/1041733840571469944
        const prevNode = $getNodeByKey(node.__key, editor.getEditorState()) as TextNode;

        // prevents infinite loop
        if (!prevNode || prevNode.getParent()?.getType() === 'ins') return;

        if ($isDelNode(node)) return;

        // TODO: instead of .length, look into this API example:
        // const prevTextContentSize = prevEditorState.read(() =>
        //   rootNode.getTextContentSize(),
        // );

        // only deal with text insertion
        if (node.__text.length > prevNode.__text.length) {

          const selection = $getSelection();
          let cursorOffset = node.__text.length;
          // @ts-ignore
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            // @ts-ignore
            const anchor = selection.anchor;
            if (anchor.key === node.__key) {
              cursorOffset = anchor.offset;
            }
          }

          // get inserted text
          const {
            index,
            insert,
            remove
          } = simpleDiffWithCursor(prevNode.__text, node.__text, cursorOffset);
          console.log(index);
          console.log(insert);
          console.log(remove);

          // insert InsNode
          const insertionNode = $createInsNode(generateRandomString(10));

          // split the text node into two
          const newNodes = node.splitText(index, index + insert.length);

          const newNode = newNodes[1];
          
          // TODO: sandwich the new node in between the split nodes
          newNode.insertBefore(insertionNode);
          insertionNode.append(newNode);
        }
      }),
      editor.registerMutationListener(
        DelNode,
        async (mutatedNodes, { updateTags, dirtyLeaves, prevEditorState }) => {
          // mutatedNodes is a Map where each key is the NodeKey, and the value is the state of mutation.
          for (let [nodeKey, mutation] of mutatedNodes) {
            // console.log(nodeKey, mutation)
            // console.log(updateTags)
            // console.log(dirtyLeaves)
            // console.log(prevEditorState)

            // TODO: can this surrounding fn be async?

            editor.read(() => {
              const node = $getNodeByKey(nodeKey);
              // TODO: bug with creating a copy of the selection which skips over a key number
              if (node === null) {
                console.log(`node for node key ${nodeKey} is null!!`)
                return;
              }
              const content = node.getTextContent();
              return;

              if (mutation === 'created') {
                // const thread = await addThread(`Remove: ${content}`);
                // TODO: should a 'change' be different than a 'thread'?
                // @ts-ignore
                changeNodesMap.set(thread?.id, new Set([nodeKey]));
                // @ts-ignore
                nodeChangeMap.set(nodeKey, thread.id);
              } else if (mutation === 'updated') {
                updateThread(nodeChangeMap.get(nodeKey), `Remove: ${content}`);
              } else if (mutation === 'destroyed') {
                // delete node from changeNodeMap
              }
            })
          }
        },
        {skipInitialization: true}
      ),
      // registerNestedElementResolver<DelNode>(
      //   editor,
      //   DelNode,
      //   (from: DelNode) => {
      //     return $createDelNode(from.getChangeId());
      //   },
      //   (from: DelNode, to: DelNode) => {
      //     // assign the change id to target node
      //     const changeId = from.getChangeId();
      //     to.setChangeId(changeId);
      //   },
      // ),
      // editor.registerCommand(
      //   DELETE_CHARACTER_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   REMOVE_TEXT_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   DELETE_WORD_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   DELETE_LINE_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   KEY_BACKSPACE_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   KEY_DELETE_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   CUT_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // ),
      // editor.registerCommand(
      //   CLEAR_EDITOR_COMMAND,
      //   handleEraseText,
      //   COMMAND_PRIORITY_LOW
      // )
    )

    // TODO: do we need KEY_BACKSPACE_COMMAND if DELETE_CHARACTER_COMMAND is already covered?
    // https://discord.com/channels/953974421008293909/953974421486436393/1344689146308067442
    // https://discord.com/channels/953974421008293909/953974421486436393/1344691167857606730
  }, [editor, changeNodesMap, nodeChangeMap, updateThread]);

  return null;
}