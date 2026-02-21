import { type JSX } from 'react';
import {
  $addUpdateTag,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  SKIP_SELECTION_FOCUS_TAG
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setBlocksType } from '@lexical/selection';
import { 
  $createHeadingNode, 
  type HeadingTagType
} from '@lexical/rich-text';
import { 
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  type ListNodeTagType
 } from '@lexical/list';
import {
  Text,
  Type,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ChevronDown,
 } from 'lucide-react';

 import { useToolbarState, blockTypeToBlockName } from 'components/editor/context/ToolbarContext';

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { Button } from 'components/ui/button';

const tagToBlockType: Record<string, keyof typeof blockTypeToBlockName> = {
  p: 'paragraph',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  ul: 'bullet',
  ol: 'number'
};

const blockTypeToIcon = {
  bullet: List,
  check: Text,
  code: Text,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
  number: ListOrdered,
  paragraph: Text,
  quote: Text
};

function NormalToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const {toolbarState, updateToolbarState} = useToolbarState();
  
  const normalTags = ['p'];
  const onClick = (tag: string): void => {
    editor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      const selection = $getSelection();
      $setBlocksType(selection, () => $createParagraphNode());  
    });
  }
  return (
    <>
      {normalTags.map((tag) => {
        const blockType = tagToBlockType[tag] as keyof typeof blockTypeToBlockName;
        const Icon = blockTypeToIcon[blockType];
        const name = blockTypeToBlockName[blockType];
        return (
          <MenubarCheckboxItem
            onClick={() => onClick(tag)}
            key={tag}
            checked={toolbarState.blockType === blockType}
          >
            <Icon />
            {name}
            {/* <MenubarShortcut>⌘T</MenubarShortcut> */}
          </MenubarCheckboxItem>
        );
      })}
    </>
  );
}

function HeadingToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const {toolbarState, updateToolbarState} = useToolbarState();
  
  const headingTags: HeadingTagType[] = ['h1', 'h2', 'h3'];
  const onClick = (tag: HeadingTagType): void => {
    editor.update(() => {
      const selection = $getSelection();
      
      if ($isRangeSelection(selection)) {
        // note: set block type only works with range selection (maybe grid selection too)
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
      // TODO: can also handle grid and node selection types separately
    });
  }
  return (
    <>
      {headingTags.map((tag) => {
        const blockType = tagToBlockType[tag] as keyof typeof blockTypeToBlockName;
        const Icon = blockTypeToIcon[blockType];
        const name = blockTypeToBlockName[blockType];
        return (
          <MenubarCheckboxItem
            onClick={() => onClick(tag)}
            key={tag}
            checked={toolbarState.blockType === blockType}
          >
            <Icon />
            {name}
            {/* <MenubarShortcut>⌘T</MenubarShortcut> */}
          </MenubarCheckboxItem>
        );
      })}
    </>
  );
}

function ListToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const {toolbarState, updateToolbarState} = useToolbarState();

  const listTags: ListNodeTagType[] = ['ul', 'ol'];
  const onClick = (tag: ListNodeTagType): void => {
    // when you dispatch a command, it's implicity wrapped in an update
    if (tag === 'ol') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      return;
    }
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  }
  return (
    <>
      {listTags.map((tag) => {
        const blockType = tagToBlockType[tag] as keyof typeof blockTypeToBlockName;
        const Icon = blockTypeToIcon[blockType];
        const name = blockTypeToBlockName[blockType];
        return (
          <MenubarCheckboxItem
            onClick={() => onClick(tag)}
            key={tag}
            checked={toolbarState.blockType === blockType}
          >
            <Icon />
            {name}
            {/* <MenubarShortcut>⌘T</MenubarShortcut> */}
            {/* https://lexical.dev/docs/react/plugins#lexicalmarkdownshortcutplugin */}
            {/* https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ShortcutsPlugin/index.tsx */}
          </MenubarCheckboxItem>
        );
      })}
    </>
  );
}

export function TextTypeToolbarPlugin(): JSX.Element {
  const {toolbarState, updateToolbarState} = useToolbarState();

  const Icon = blockTypeToIcon[toolbarState.blockType];
  const name = blockTypeToBlockName[toolbarState.blockType];

  return (
    <MenubarMenu>
      <MenubarTrigger asChild>
        <Button
          variant="ghost"
          Icon={Icon}
        >
          {name}
          <ChevronDown className="text-white/50"/>
        </Button>
      </MenubarTrigger>
      <MenubarContent>
        <NormalToolbarPlugin />
        <HeadingToolbarPlugin />
        <MenubarSeparator />
        <ListToolbarPlugin />
      </MenubarContent>
    </MenubarMenu>
  );
}