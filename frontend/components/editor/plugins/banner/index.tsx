import { useEffect } from 'react';
import {
  COMMAND_PRIORITY_LOW,
  createCommand,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  $getSelection,
  $isRangeSelection,
  ElementNode,
  LexicalEditor,
  RangeSelection,
  $createParagraphNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setBlocksType } from '@lexical/selection';

export class BannerNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return 'banner';
  }

  static clone(node: BannerNode): BannerNode {
    return new BannerNode(node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.className = config.theme.banner;
    return element;
  }

  updateDOM(): false {
    return false;
  }

  insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | LexicalNode {
    // taken from QuoteNode in LexicalRichText.dev.js
    const newBlock = $createParagraphNode();
    const direction = this.getDirection();
    newBlock.setDirection(direction);
    this.insertAfter(newBlock, restoreSelection);
    return newBlock;
  }

  collapseAtStart(): boolean {
    // taken from QuoteNode in LexicalRichText.dev.js
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }

  // TODO: still need a way to escape out of the banner when typing in it
}

export function $createBannerNode(): BannerNode {
  return new BannerNode();
}

// not required, unless its used somewhere
export function $isBannerNode(node: LexicalNode): node is BannerNode {
  return node instanceof BannerNode;
}

export const INSERT_BANNER_COMMAND = createCommand('insertBanner');

export function BannerPlugin(): null {
  const [editor] = useLexicalComposerContext();
  if (!editor.hasNodes([BannerNode])) {
    throw new Error('BannerPlugin: BannerNode not registered on editor');
  }

  useEffect(() => {
    return editor.registerCommand(INSERT_BANNER_COMMAND, () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, $createBannerNode);
      }
      return true;
    }, COMMAND_PRIORITY_LOW);
  }, [editor]);

  return null;
}