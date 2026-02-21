import { $applyNodeReplacement, LexicalNode, TextNode } from 'lexical';

export class TextNodeWithKey extends TextNode {
  static getType() {
    return 'text-with-key';
  }

  static clone(node: TextNodeWithKey): TextNodeWithKey {
    return new TextNodeWithKey(node.__text, node.__key);
  }

  // @ts-ignore
  exportJSON(): SerializedTextNodeWithKey {
    return {
      ...super.exportJSON(),
      __key: this.__key
    };
  }

  // @ts-ignore
  static importJSON(serializedNode: SerializedTextNodeWithKey): TextNodeWithKey {
    return $createTextNodeWithKey().updateFromJSON(serializedNode);
  }
}

export function $createTextNodeWithKey(text: string = '') {
  return $applyNodeReplacement(new TextNodeWithKey(text));
}

export function $isTextNodeWithKey(
  node: LexicalNode | null | undefined,
): node is TextNodeWithKey {
  return node instanceof TextNodeWithKey;
}