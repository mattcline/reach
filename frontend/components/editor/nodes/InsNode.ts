import {
  ElementNode,
  LexicalNode,
  EditorConfig,
  $applyNodeReplacement
} from 'lexical';

import { addClassNamesToElement } from '@lexical/utils';

export class InsNode extends ElementNode {
  __id: string; // TODO: why is __ids not declared like this in MarkNode?

  static getType() {
    return 'ins';
  }

  static clone(node: InsNode) {
    return new InsNode(node.__id, node.__key);
  }

  // @ts-ignore
  static importJSON(serializedNode: SerializedInsNode): InsNode {
    // @ts-ignore
    return $createInsNode().updateFromJSON(serializedNode);
  }

  constructor(id: string, key?: string) {
    super(key);
    this.__id = id;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('ins');
    addClassNamesToElement(element, "bg-green-300 dark:bg-green-900 no-underline");
    return element;
  }

  updateDOM(): false {
    return false;
  }

  isInline() {
    return true;
  }

  // canInsertTextBefore(): boolean {
  //   return false;
  // }

  // canInsertTextAfter(): boolean {
  //   return false;
  // }

  // Taken from BannerNode, might need later:

  // insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | LexicalNode {
  //   // taken from QuoteNode in LexicalRichText.dev.js
  //   const newBlock = $createParagraphNode();
  //   const direction = this.getDirection();
  //   newBlock.setDirection(direction);
  //   this.insertAfter(newBlock, restoreSelection);
  //   return newBlock;
  // }

  // collapseAtStart(): boolean {
  //   // taken from QuoteNode in LexicalRichText.dev.js
  //   const paragraph = $createParagraphNode();
  //   const children = this.getChildren();
  //   children.forEach(child => paragraph.append(child));
  //   this.replace(paragraph);
  //   return true;
  // }
}

export function $createInsNode(id: string) {
  return $applyNodeReplacement(new InsNode(id));
}

export function $isInsNode(node: LexicalNode): node is InsNode {
  return node instanceof InsNode;
}