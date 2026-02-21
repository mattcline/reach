import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_TAB_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  LexicalEditor,
  RangeSelection,
  NodeSelection,
  LexicalNode,
} from 'lexical';
import {
  $isListItemNode,
  ListItemNode,
} from '@lexical/list';

function $isAnyParentListItem(node: LexicalNode): boolean {
  let parent = node.getParent();
  while (parent !== null) {
    if ($isListItemNode(parent)) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}

function $getListItemsInSelection(selection: RangeSelection | NodeSelection): ListItemNode[] {
  const nodes = selection.getNodes();
  const listItems = new Set<ListItemNode>();

  nodes.forEach((node) => {
    // Check if the node itself is a list item
    if ($isListItemNode(node)) {
      listItems.add(node);
    } else {
      // Check if any parent is a list item
      let parent = node.getParent();
      while (parent !== null) {
        if ($isListItemNode(parent)) {
          listItems.add(parent);
          break;
        }
        parent = parent.getParent();
      }
    }
  });

  return Array.from(listItems);
}

function handleTabKeyPress(
  event: KeyboardEvent,
  editor: LexicalEditor,
): boolean {
  // Prevent default tab behavior
  event.preventDefault();

  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) {
      // For other selection types, dispatch the appropriate command
      editor.dispatchCommand(
        event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
        undefined,
      );
      return;
    }

    // Check if we're in a list context
    const nodes = selection.getNodes();
    const isInList = nodes.some(node => 
      $isListItemNode(node) || $isAnyParentListItem(node)
    );

    if (isInList) {
      // Always handle tab in lists, regardless of cursor position
      editor.dispatchCommand(
        event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
        undefined,
      );
    } else {
      // For non-list content, use default indentation behavior
      editor.dispatchCommand(
        event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
        undefined,
      );
    }
  });

  return true;
}

// Helper to check if selection is a NodeSelection
function $isNodeSelection(selection: unknown): selection is NodeSelection {
  return selection !== null && 
    typeof selection === 'object' && 
    'getNodes' in selection &&
    '_nodes' in selection;
}

export function CustomTabIndentationPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        return handleTabKeyPress(event, editor);
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
}