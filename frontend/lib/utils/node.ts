import { diffChars, diffWords, diffWordsWithSpace, Change } from 'diff';

/* DIFFS */

function createChangeNode(children: Node[]): Node {
  let changeSpan = document.createElement('span');
  changeSpan.className = 'change group relative';
  changeSpan.contentEditable = 'false';
  changeSpan.id = `change-${Date.now()}`;  // TODO: the id will eventually be the Comment id

  // create an inner span to hold the changes
  // and act as the trigger for the tooltip
  const changesSpan = document.createElement('span');
  changesSpan.className = 'changes';
  children.forEach(child => {
    changesSpan.appendChild(child);
  });
  
  changeSpan.appendChild(changesSpan);
  return changeSpan;
}

function createAddedOrRemovedNode(added: boolean = true, text?: string, child?: Node) {
  const span = document.createElement('span');
  span.className = added ? 'added' : 'removed';
  if (text) {
    span.textContent = text;
  } else if (child) {
    // clone the child node so that the original node isn't moved
    span.appendChild(child.cloneNode(true));
  }
  return span;
}

function createAddedNode(text?: string, child?: Node) {
  return createAddedOrRemovedNode(true, text, child);
}

function createAddedNodeFromText(text: string) {
  return createAddedNode(text);
}

function createAddedNodeFromNode(child: Node) {
  return createAddedNode(undefined, child);
}

function createRemovedNode(text?: string, child?: Node) {
  return createAddedOrRemovedNode(false, text, child);
}

function createRemovedNodeFromText(text: string) {
  return createRemovedNode(text);
}

function createRemovedNodeFromNode(child: Node) {
  return createRemovedNode(undefined, child);
}

function replaceChildrenNodes(node: Node, children: Node[]) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  
  children.forEach(child => {
    node.appendChild(child);
  });
}

const diffTextNodes = (node: Text, prevNode: Text) => {
  const diffedNodes: Node[] = [];
  let changeNodes: Node[] = [];
  const diff: Change[] = diffWords(prevNode.textContent || "", node.textContent || "");
  diff.forEach((change: Change) => {
    if (change.added) {
      changeNodes.push(createAddedNodeFromText(change.value));
    } else if (change.removed) {
      changeNodes.push(createRemovedNodeFromText(change.value));
    } else {
      if (changeNodes.length > 0) {
        // capture the added or removed nodes so far in a change node
        diffedNodes.push(createChangeNode(changeNodes));
        changeNodes = [];
      }
      diffedNodes.push(document.createTextNode(change.value));
    }
  });
  if (changeNodes.length > 0) {
    // add the last added or removed nodes
    diffedNodes.push(createChangeNode(changeNodes));
  }
  return diffedNodes;
}

function diffNodes(node: Node, prevNode: Node) {
  const children = Array.from(node.childNodes).map((child: Node) => child.cloneNode(true));
  const childrenIds = new Set(Array.from(children).filter((child: Node) => child instanceof Element).map((child) => (child as Element).id));
  const prevChildren = Array.from(prevNode.childNodes).map((child: Node) => child.cloneNode(true));
  const prevChildrenIds = new Set(Array.from(prevChildren).filter((child: Node) => child instanceof Element).map((child) => (child as Element).id));
  const diffedChildren: Node[] = [];

  let i = 0, j = 0;
  while (i < children.length && j < prevChildren.length) {
    const childNode = children[i];
    const prevChildNode = prevChildren[j];

    if (childNode instanceof Text && prevChildNode instanceof Text) {
      diffedChildren.push(...diffTextNodes(childNode as Text, prevChildNode as Text));
      i++;
      j++;
    } else {
      if (childNode instanceof Element && prevChildNode instanceof Element && childNode.id === prevChildNode.id) {
        // we know that the element is the same, so we get the diff of the content
        diffNodes(childNode, prevChildNode);
        diffedChildren.push(childNode);
        i++;
        j++;
      } else if (prevChildNode instanceof Element) {
        if (!childrenIds.has(prevChildNode.id)) {
          // we know that we removed the element
          diffedChildren.push(createChangeNode([createRemovedNodeFromNode(prevChildNode)]));
          j++;
        } else {
          // we know that we added the element
          diffedChildren.push(createChangeNode([createAddedNodeFromNode(childNode)]));
          i++;
        }
      } else if (childNode instanceof Element) {
        if (!prevChildrenIds.has(childNode.id)) {
          // we know that we added the element
          diffedChildren.push(createChangeNode([createAddedNodeFromNode(childNode)]));
          i++;
        } else {
          // we know that we removed the element
          diffedChildren.push(createChangeNode([createRemovedNodeFromNode(prevChildNode)]));
          j++;
        }
      }
    }
  }
  replaceChildrenNodes(node, diffedChildren);
}

// @ts-ignore
export { wrapTextNodesInHighlightSpans, removeWrappers, diffNodes };