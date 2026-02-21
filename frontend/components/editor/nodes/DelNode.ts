import {
  ElementNode,
  LexicalNode,
  EditorConfig,
  $applyNodeReplacement,
  RangeSelection,
  LexicalUpdateJSON,
  SerializedElementNode,
  SerializedTextNode,
  Spread,
  $createRangeSelection,
  $isElementNode,
  $isTextNode,
  TextNode,
  $getNodeByKey,
  $cloneWithProperties,
  $getSelection,
  $setSelection,
  $isRangeSelection
} from 'lexical';

import { addClassNamesToElement } from '@lexical/utils';

import { $isInsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey, $isTextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';

export type SerializedDelNode = Spread<
  {
    change_id: string;
  },
  SerializedElementNode
>;

export class DelNode extends TextNodeWithKey {
  static getType() {
    return 'del';
  }

  static clone(node: DelNode): DelNode {
    return new DelNode(node.__text, node.__key);
  }

  // @ts-ignore
  constructor(text = '', key) {
    super(text, key);

    // we have to set style like this to differentiate DelNode from TextNode
    // TODO: add special handling for when user strikesthrough text
    // and/or makes it red
    // TODO: don't use strikethrough as a text formatting option?
    // or provide a different color red so that user will not set a text color
    // as the same color of the del
    // this.__style = "background-color: oklch(39.6% 0.141 25.723); text-decoration: line-through; text-decoration-color: red;"
    // this.__mode = 1; // 'token'
  }

  createDOM(config: EditorConfig) {
    // TODO: copy createDOM from TextNode and create actual 'del' tag

    const element = super.createDOM(config);
    addClassNamesToElement(element, "bg-red-300 dark:bg-red-900 line-through decoration-red-800");
    element.setAttribute('spellcheck', 'false');

    return element;
  }

  // TODO: fill this out?
    // isSimpleText() {
  //   return (
  //     (this.__type === 'del') &&
  //     this.__mode === 0
  //   );
  // }
  isSimpleText(): boolean {
    return true;
  }

  // canInsertTextAfter(): boolean {
  //   return false;
  // }

  // canInsertTextBefore(): boolean {
  //   return false;
  // }

  // isTextEntity() {
  //   return true;
  // }

  static importJSON(serializedNode: SerializedTextNode): DelNode {
    return $createDelNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedTextNode>): this {
    return super.updateFromJSON(serializedNode);
    // return super.updateFromJSON(serializedNode).setChangeId(serializedNode.change_id);
  }

  // exportJSON() {
  //   return {
  //     ...super.exportJSON(),
  //     change_id: this.getChangeId()
  //   };
  // }

  // constructor(change_id: string = '', key?: string) {
  //   super(key);
  //   this.__change_id = change_id;
  // }

  // getChangeId(): string {
  //   return this.getLatest().__change_id;
  // }

  // setChangeId(change_id: string) {
  //   const self = this.getWritable();
  //   self.__change_id = change_id;
  //   return self;
  // }
}

export function $createDelNode(text: string = '') {
  // @ts-ignore
  return $applyNodeReplacement(new DelNode(text));
}

export function $createDelNodeFromTextNodeWithKey(textNode: TextNodeWithKey): DelNode {
  // @ts-ignore
  const delNode = $applyNodeReplacement(new DelNode(textNode.__text));

  // taken from TextNode's afterCloneFrom()
  delNode.__text = textNode.__text;
  delNode.__format = textNode.__format;
  if (textNode.__style) {
    delNode.__style += ` ${textNode.__style}`
  }
  delNode.__mode = textNode.__mode;
  delNode.__detail = textNode.__detail;

  delNode.__state = textNode.__state; // taken from LexicalNode's afterCloneFrom()

  // __parent, __next, and __prev are set by replace()

  return delNode;
}

export function $isDelNode(node: LexicalNode): node is DelNode {
  return node instanceof DelNode;
}

/**
 * Converts TextNodes to DelNodes and erases InsNodes.
 * Inspired by lexical's $wrapSelectionInMarkNode.
 * 
 * @param selection 
 * @param id
 */
export function $delSelection(
  selection: RangeSelection
): DelNode | undefined {
  // Force a forwards selection since append is used, ignore the argument.
  // A new selection is used to avoid side-effects of flipping the given
  // selection
  const forwardSelection = $createRangeSelection();
  const [startPoint, endPoint] = selection.isBackward()
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus];
  forwardSelection.anchor.set(
    startPoint.key,
    startPoint.offset,
    startPoint.type,
  );
  forwardSelection.focus.set(endPoint.key, endPoint.offset, endPoint.type);
  $setSelection(forwardSelection);

  let anchorNode = $getNodeByKey(startPoint.key);

  let currentNodeParent: ElementNode | null | undefined;
  let lastCreatedDelNode: DelNode | undefined;

  // TODO: add optimization before we perform an extract():
  // if getNodes.length === 1 and the node is a DelNode, don't extract()

  // TODO: solve bug where del style is carried over upon enter - 
  // I think this will be solved when InsNode extends TextNode

  // TODO: solve bug when backspacing at the beginning of a link
  // node and there's no previous sibling to move the selection to.
  // InsNode would clear DelNode styling which is prob not the
  // best practice but maybe the best solution

  // Note that extract will split text nodes at the boundaries
  const nodes = forwardSelection.extract();

  // We only want wrap adjacent text nodes, line break nodes
  // and inline element nodes. For decorator nodes and block
  // element nodes, we step out of their boundary and start
  // again after, if there are more nodes.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if ($isInsNode(node)) {
      node.remove();
      continue;
    }

    if ($isElementNode(lastCreatedDelNode) && lastCreatedDelNode.isParentOf(node)) {
      // If the current node is a child of the last created del node, there is nothing to do here
      continue;
    }
    let targetNode = null;
    if (
      $isDelNode(node)
      || (i === 0 && anchorNode !== null && $isDelNode(anchorNode))
    ) {
      // check if original anchor node (before split by extract())
      // is a del node too because extract() returns a TextNode
      // instead of DelNode for the split node at the start of the selection
      continue;
    }
    else if ($isTextNodeWithKey(node)) {
      // Case 1: The node is a text node and we can include it
      targetNode = node;
    }
    if (targetNode !== null) {

      // Now that we have a target node for wrapping with a del, we can run
      // through special cases.
      if (targetNode && targetNode.is(currentNodeParent)) {
        // The current node is a child of the target node to be wrapped, there
        // is nothing to do here.
        continue;
      }
      const parentNode = targetNode.getParent();
      if (parentNode == null || !parentNode.is(currentNodeParent)) {
        // If the parent node is not the current node's parent node (i.e. siblings), we can
        // clear the last created del node.
        lastCreatedDelNode = undefined;
      }
      currentNodeParent = parentNode;
      if (lastCreatedDelNode === undefined) {
        // If we don't have a created del node, we can make one
        lastCreatedDelNode = $createDelNodeFromTextNodeWithKey(targetNode);
      }

      // convert target node to del node
      targetNode.replace(lastCreatedDelNode);

    } else {
      // If we don't have a target node to wrap we can clear our state and
      // continue on with the next node
      currentNodeParent = undefined;
      lastCreatedDelNode = undefined;
    }
  }

  const updatedSelection = $getSelection();

  if ($isRangeSelection(updatedSelection)) {
    // create copy
    // TODO: is there a better way to create a copy?
    const copyOfUpdateSelection = $createRangeSelection();
    copyOfUpdateSelection.anchor.set(
      updatedSelection.anchor.key,
      updatedSelection.anchor.offset,
      updatedSelection.anchor.type,
    )
    copyOfUpdateSelection.focus.set(
      updatedSelection.focus.key,
      updatedSelection.focus.offset,
      updatedSelection.focus.type,
    )

    // select start of selection
    anchorNode = $getNodeByKey(updatedSelection.anchor.key);
    anchorNode?.selectStart();

    // return copyOfUpdateSelection;
  }
  return lastCreatedDelNode;
}