'use client';

import React, { use } from 'react';
import {
  $isTextNode,
  DOMConversionMap,
  TextNode,
  $applyNodeReplacement
} from 'lexical';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode } from '@lexical/rich-text';
import {
  ListItemNode,
  ListNode
} from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import {
  BotMessageSquare,
  UserRoundSearch,
  MessageSquare
} from 'lucide-react';

import { DocumentProvider, useDocument } from 'context/document';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from 'components/ui/resizable';
import { ToolbarPlugin } from 'components/editor/plugins/toolbar';
import { DocumentNavbar } from 'components/document-navbar';
import { theme } from 'components/editor/theme';
import { Editor } from 'components/editor';
import {
  MIN_ALLOWED_FONT_SIZE,
  MAX_ALLOWED_FONT_SIZE,
  ToolbarProvider
} from '@/components/editor/context/ToolbarContext';
import { parseAllowedColor } from 'components/editor/ui/ColorPicker';
import { DelNode } from 'components/editor/nodes/DelNode';
import { InsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';

import { Agent } from 'components/agent';

export default function DocumentLayout(
  props: {
    params: Promise<{ id: string }>,
    children: React.ReactNode
  }
) {
  const { children } = props;
  const params = use(props.params);
  const addThreadRef = React.useRef<any>(null);

  // Upon navigating to a document url (i.e. documents/[id]) and switching versions
  // in the version select, a ring will quickly flash on and off because
  // the focus-visible property is cleared when a new version (aka route)
  // is navigated to.  I was able to fix it by hoisting <DocumentNavbar />
  // to documents/layout.tsx but this caused a problem with setting the initial
  // defaultValue to params.id since it doesn't exist for just /documents.
  // I since reverted that fix since I assume most people will navigate to a
  // document from opening one in the documents page and not navigating directly
  // to a document url in the browser's address bar, in which case the ring flash
  // does not occur.

  function parseAllowedFontSize(input: string): string {
    const match = input.match(/^(\d+(?:\.\d+)?)px$/);
    if (match) {
      const n = Number(match[1]);
      if (n >= MIN_ALLOWED_FONT_SIZE && n <= MAX_ALLOWED_FONT_SIZE) {
        return input;
      }
    }
    return '';
  }

  function getExtraStyles(element: HTMLElement): string {
    // Parse styles from pasted input, but only if they match exactly the
    // sort of styles that would be produced by exportDOM
    let extraStyles = '';
    const fontSize = parseAllowedFontSize(element.style.fontSize);
    const backgroundColor = parseAllowedColor(element.style.backgroundColor);
    const color = parseAllowedColor(element.style.color);
    if (fontSize !== '' && fontSize !== '15px') {
      extraStyles += `font-size: ${fontSize};`;
    }
    if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
      extraStyles += `background-color: ${backgroundColor};`;
    }
    if (color !== '' && color !== 'rgb(0, 0, 0)') {
      extraStyles += `color: ${color};`;
    }
    return extraStyles;
  }

  function buildImportMap(): DOMConversionMap {
    const importMap: DOMConversionMap = {};
    
    // Wrap all TextNode importers with a function that also imports
    // the custom styles implemented by the playground
    for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
      importMap[tag] = (importNode) => {
        const importer = fn(importNode);
        if (!importer) {
          return null;
        }
        return {
          ...importer,
          conversion: (element) => {
            const output = importer.conversion(element);
            if (
              output === null ||
              output.forChild === undefined ||
              output.after !== undefined ||
              output.node !== null
            ) {
              return output;
            }
            const extraStyles = getExtraStyles(element);
            if (extraStyles) {
              const {forChild} = output;
              return {
                ...output,
                forChild: (child, parent) => {
                  const textNode = forChild(child, parent);
                  if ($isTextNode(textNode)) {
                    textNode.setStyle(textNode.getStyle() + extraStyles);
                  }
                  return textNode;
                },
              };
            }
            return output;
          },
        };
      };
    }
  
    return importMap;
  }

  // Catch any errors that occur during Lexical updates and log them
  // or throw them as needed. If you don't throw them, Lexical will
  // try to recover gracefully without losing user data.
  function onError(error: Error): void {
    console.error(error);
  }

  return (
    <DocumentProvider>
      <LexicalCollaboration>
        <LexicalComposer
          key={params.id}
          initialConfig={{
            namespace: 'editor',
            theme,
            onError,
            nodes: [
              HeadingNode,
              ListNode,
              ListItemNode,
              MarkNode,
              DelNode,
              InsNode,
              AutoLinkNode,
              LinkNode,
              TextNodeWithKey,
              {
                replace: TextNode,
                with: (node: TextNode) => $applyNodeReplacement(new TextNodeWithKey(node.__text)),
                withKlass: TextNodeWithKey
              }, // TODO: migrate existing TextNodes (and DelNodes) to TextNodeWithKey (maybe with transforms?  look at gemini convo)
            ],
            html: {import: buildImportMap()},
            editorState: null,
            editable: true // TODO: replace with doc.editable and can toggle with editor.setEditable(true); after submitting, etc.
          }}
        >
          <div className="flex flex-col flex-1 h-svh">
            <DocumentNavbar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <ResizablePanelGroup
                direction="horizontal"
                className="flex-1 overflow-hidden"
              >
                <ResizablePanel
                  order={1}
                  className="flex-1 flex flex-col items-center overflow-hidden gap-8"
                >
                  <ToolbarProvider>
                    <ToolbarPlugin />
                    <Editor addThreadRef={addThreadRef} />
                    {children}
                  </ToolbarProvider>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel
                  order={2}
                  defaultSize={30}
                  minSize={0}
                  className="flex-1 flex flex-col"
                >
                  <Agent addThreadRef={addThreadRef} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </LexicalComposer>
      </LexicalCollaboration>
    </DocumentProvider>
  )
}