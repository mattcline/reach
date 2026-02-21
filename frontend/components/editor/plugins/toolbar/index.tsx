import { useEffect, useState, useCallback, type JSX } from 'react';
import {
  $addUpdateTag,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  CommandPayloadType,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
  TextFormatType,
  UNDO_COMMAND
} from 'lexical';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  IS_APPLE,
  mergeRegister,
} from '@lexical/utils';
import {$isHeadingNode} from '@lexical/rich-text';
import {$isListNode, ListNode} from '@lexical/list';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Signature,
  Link2,
  CaseLower,
  CaseUpper,
  IndentDecrease,
  IndentIncrease,
  Palette,
  Undo2,
  Redo2,
  Highlighter,
  ALargeSmall,
  Ellipsis,
  CircleHelp,
  History,
  ArrowLeft,
  Lock,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Search,
  Share,
  Share2,
  UserSearch,
  Import
} from 'lucide-react';

import { useToolbarState, blockTypeToBlockName } from 'components/editor/context/ToolbarContext';

import { getSelectedNode } from 'components/editor/utils/getSelectedNode';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from 'components/ui/menubar';
import { Button } from 'components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { TextTypeToolbarPlugin } from 'components/editor/plugins/toolbar/text-type';
import { SavePlugin } from 'components/editor/plugins/toolbar/save';
import { DownloadPlugin } from 'components/editor/plugins/toolbar/download';
import { ImportPlugin } from 'components/editor/plugins/toolbar/import';
import { INSERT_BANNER_COMMAND } from 'components/editor/plugins/banner';

import { ToggleGroup, ToggleGroupItem } from 'components/ui/toggle-group';

/**
 * A plugin for an example custom node (Banner)
 */
function BannerToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const onClick = (e: React.MouseEvent): void => {
    // when you dispatch a command, it's implicity wrapped in an update
    editor.dispatchCommand(INSERT_BANNER_COMMAND, undefined);
  }
  return <button onClick={onClick}>Banner</button>;
}

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, (e) => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

export function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  const {toolbarState, updateToolbarState} = useToolbarState();

  const $handleHeadingNode = useCallback(
    (selectedElement: LexicalNode) => {
      const type = $isHeadingNode(selectedElement)
        ? selectedElement.getTag()
        : selectedElement.getType();

      if (type in blockTypeToBlockName) {
        updateToolbarState(
          'blockType',
          type as keyof typeof blockTypeToBlockName,
        );
      }
    },
    [updateToolbarState],
  );

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey); // activeEditor.getElementByKey(elementKey);

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          $handleHeadingNode(element);
        }
      }

      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );

      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
    }
    if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      for (const selectedNode of nodes) {
        const parentList = $getNearestNodeOfType<ListNode>(
          selectedNode,
          ListNode,
        );
        if (parentList) {
          const type = parentList.getListType();
          updateToolbarState('blockType', type);
        } else {
          const selectedElement = $findTopLevelElement(selectedNode);
          $handleHeadingNode(selectedElement);
          // Update elementFormat for node selection (e.g., images)
          if ($isElementNode(selectedElement)) {
            updateToolbarState(
              'elementFormat',
              selectedElement.getFormatType(),
            );
          }
        }
      }
    }
  }, [
    editor,
    updateToolbarState,
    $handleHeadingNode,
  ]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => { // TODO: might need to set active editor here when nested editors in threads come into play: https://github.com/facebook/lexical/blob/45e1df032245102095928b9ba8352a111fa117b3/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx#L786
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      // editor.registerEditableListener((editable) => {
      //   setIsEditable(editable);
      // }),
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(
          () => {
            $updateToolbar();
          },
          // {editor: activeEditor},
        );
      }),
      editor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, editor, updateToolbarState]);

  return (
    <Menubar className="bg-accent/50 rounded-lg mx-2 py-5">
      {/* <SavePlugin /> */}

      {/* Don't need HistoryPlugin for these because CollaborationPlugin has its own history */}
      <Button
        variant="ghost"
        onClick={() => { editor.dispatchCommand(UNDO_COMMAND, undefined) }}
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        onClick={() => { editor.dispatchCommand(REDO_COMMAND, undefined) }}
      >
        <Redo2 />
      </Button>

      <TextTypeToolbarPlugin />

      {/* <Button variant="ghost"><ALargeSmall />Lexend</Button> */}

     <ToggleGroup
        type="multiple"
        value={[
          ...(toolbarState.elementFormat === 'left' ? ['left'] : []),
          ...(toolbarState.elementFormat === 'center' ? ['center'] : []),
          ...(toolbarState.elementFormat === 'right' ? ['right'] : [])
        ]}
      >
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          value="left"
          aria-label="Left align"
          className="hover:bg-neutral-750 px-3"
        >
          <AlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          value="center"
          aria-label="Center align"
          className="hover:bg-neutral-750 px-3"
        >
          <AlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          value="right"
          aria-label="Right align"
          className="hover:bg-neutral-750 px-3"
        >
          <AlignRight />
        </ToggleGroupItem>
      </ToggleGroup>

      <Button 
        variant="ghost"
        onClick={() => { editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined) }}
      >
        <IndentDecrease />
      </Button>
      <Button 
        variant="ghost"
        onClick={() => { editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined) }}
      >
        <IndentIncrease />
      </Button>

      {/* {editor.isEditable() && <ToggleGroup
        type="multiple"
        value={[
          ...(isBold ? ['bold'] : []),
          ...(isItalic ? ['italic'] : []),
          ...(isUnderline ? ['underline'] : []),
          ...(isStrikethrough ? ['strikethrough'] : [])
        ]}
      >
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
          value="bold"
          aria-label="Format text as bold"
          className="hover:bg-neutral-750"
        >
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
          value="italic"
          aria-label="Format text as italics"
          className="hover:bg-neutral-750"
        >
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
          value="underline"
          aria-label="Format text to underlined"
          className="hover:bg-neutral-750"
        >
          <Underline />
        </ToggleGroupItem>
        <ToggleGroupItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
          }}
          value="strikethrough"
          aria-label="Format text with a strikethrough"
          className="hover:bg-neutral-750"
        >
          <Strikethrough />
        </ToggleGroupItem>
      </ToggleGroup>} */}
      {/* <Button variant="ghost"><CaseLower /></Button>
      <Button variant="ghost"><CaseUpper /></Button> */}
      {/* <Button variant="ghost"><Highlighter /></Button> */}
      {/* <Button variant="ghost"><Palette /></Button> */}
      {/* <Button variant="ghost"><Link2 /></Button> */}
      {/* <Button variant="ghost"><Signature /></Button> */}
      {/* <Button variant="ghost"><CircleHelp /></Button> */}
      {/* TODO: replace Ellipsis with DocumentOptions */}
      {/* <Button variant="ghost"><Ellipsis /></Button> */}
      {/* <BannerToolbarPlugin /> */}
      {/* TODO: look into shadcn/ui's toggle group for bold, italic, underline, etc. */}
    </Menubar>
  );
}