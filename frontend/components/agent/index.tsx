'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $isTextNode,
  $isElementNode,
  createEditor,
  LexicalNode,
  ElementNode,
  RootNode
} from 'lexical';
import {
  $createHeadingNode,
  HeadingNode
} from '@lexical/rich-text';
import {
  $createListNode,
  $createListItemNode,
  $isListItemNode,
  $isListNode
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from '@lexical/markdown';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { motion } from 'motion/react';
import {
  X,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { Lexend } from 'next/font/google';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import { createWebSocket } from 'lib/utils/socket';
import { useGlobal } from 'context/global';
import { useDocument } from 'context/document';
import { useWebSockets } from 'context/web-sockets';
import { Button } from 'components/ui/button';
import { Progress } from 'components/ui/progress';
import { ChatInput } from 'components/chat-input';
import Message from 'components/message';
import { Message as IMessage } from 'types/message';
import { ScrollArea } from 'components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { DelNode, $delSelection, $createDelNode } from 'components/editor/nodes/DelNode';
import { InsNode, $createInsNode } from 'components/editor/nodes/InsNode';
import { TextNodeWithKey, $createTextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';
import { generateRandomString } from 'components/editor/plugins/change';
import { ChangeDiff } from 'components/agent/change-diff';

interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  user_profile_name?: string;
  metadata?: any;
}

const font = Lexend({ weight: '400', subsets: ['latin'] });

export function Agent({ addThreadRef }: { addThreadRef: React.MutableRefObject<any> }) {
  const { editor } = useGlobal();
  const { doc, hasSignedTerms } = useDocument();
  const { agentSocket, setAgentSocket } = useWebSockets();

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<IMessage | null>(null);
  const [progress, setProgress] = useState(0);

  const [messages, setMessages] = useState<IMessage[]>([]);
  const messagesRef = useRef(messages);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const streamingMessageRef = useRef(streamingMessage);
  const messagesEndRef = React.createRef() as React.RefObject<HTMLDivElement | null>;

  const webSocketRef = useRef<WebSocket | null>(null); // used for cleanup

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messagesEndRef]);

  // Use refs to avoid stale closures resulting from ws callback: https://github.com/facebook/react/issues/16975#issuecomment-537178823
  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    streamingMessageRef.current = streamingMessage;
  }, [streamingMessage]);

  // Load message history when document changes
  useEffect(() => {
    if (!doc) return;

    const loadMessageHistory = async () => {
      const response = await makeRequest({
        url: `${BACKEND_URL}/agent_messages/?document=${doc.id}`,
        method: 'GET',
        accept: 'application/json'
      });

      if (response.status === STATUS.HTTP_200_OK && response.data) {
        const data = response.data as AgentMessage[];
        if (data) {
          const loadedMessages: IMessage[] = data.map(msg => ({
          content: msg.content,
          type: msg.role === 'agent' ? 'ai' : 'human',
          timestamp: msg.timestamp,
          }));
          setMessages(loadedMessages);
        }
      }
    };

    loadMessageHistory();
  }, [doc]);

  useEffect(() => {
    if (!doc) return;
    // if (!doc || !hasSignedTerms) return;

    const initWebSocket = () => {
      const webSocket = createWebSocket('agent');
      webSocket.onopen = function(event: Event) {
        // Send document_id on connection to establish context
        webSocket.send(JSON.stringify({
          'document_id': doc.id
        }));
      };
      let buffer = '';
      webSocket.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.streaming) {
          onStreamingMessage(data);
        } else if (data.message === "") {
          onStreamingFinished(data.changes, data.justification);
        } else if (data.markdown) {
          const { markdown } = data;
          buffer += markdown;
        } else if (data.progress) {
          setProgress(data.progress);
        } else {
          setMessages([{ content: data, type: 'ai', timestamp: new Date().toISOString() }]);
          setMessage({ content: data, type: 'ai', requires_response: data.requires_response || false, timestamp: new Date().toISOString() });
        }
      };
      webSocket.onclose = function(event: Event) {
        console.log(`Chat socket closed unexpectedly! ${event}`);
        reconnectTimeoutId = window.setTimeout(() => initWebSocket(), 5000); // try to reconnect
      };
      setAgentSocket(webSocket);
      webSocketRef.current = webSocket; // used for cleanup
    }

    let reconnectTimeoutId: number | undefined = undefined;
    initWebSocket();

    // cleanup
    return () => {
      // close websocket connection when component unmounts
      if (webSocketRef.current) {
        webSocketRef.current.onclose = null; // remove onclose handler first
        webSocketRef.current.onmessage = null; // prevent stale socket from firing handlers
        webSocketRef.current.close(); // close regardless of CONNECTING or OPEN state
      }
      setAgentSocket(null);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    };
  }, [doc, hasSignedTerms, setAgentSocket]);

  const handleSubmit = (e: any) => {
    if (!doc) return;

    // e.preventDefault();
    if (!agentSocket) {
      // TODO: show error
      return;
    }

    // save streaming message as a new message when user submits another input
    // and clear streaming message for a new response
    setMessages(messages => [...messages, { content: input, type: 'human', timestamp: new Date().toISOString() }]);

    const documentJson = JSON.stringify(editor.getEditorState());

    agentSocket.send(JSON.stringify({
      'message': input,
      'document_id': doc.id,
      'document_text': documentJson,
    }));

    setInput("");
  }

  const onStreamingMessage = (data: any) => {
    setStreamingMessage(streamingMessage => streamingMessage + data.message);
  }

  /**
   * Builds a serialized read-only Lexical editor state representing the diff
   * (red strikethrough for deletions, green highlight for insertions).
   * Reads the document without mutating it.
   */
  const buildDiffPreview = (changesJson: string): string | null => {
    try {
      const changes = JSON.parse(changesJson);
      const nodeJsons: any[] = [];

      editor.getEditorState().read(() => {
        for (const change of changes) {
          if (change.type === 'deletion') {
            const startNode = $getNodeByKey(change.start_key);
            if (startNode !== null && $isTextNode(startNode)) {
              const fullText = startNode.getTextContent();
              const endOffset = change.start_key === change.end_key
                ? change.end_offset
                : fullText.length;
              const deletedText = fullText.slice(change.start_offset, endOffset);
              nodeJsons.push({
                type: 'del',
                text: deletedText,
                format: 0,
                style: '',
                mode: 'normal',
                detail: 0,
                version: 1,
              });
            }
          } else if (change.type === 'addition') {
            nodeJsons.push({
              type: 'ins',
              children: [{
                type: 'text-with-key',
                text: change.text,
                format: 0,
                style: '',
                mode: 'normal',
                detail: 0,
                version: 1,
              }],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            });
          }
        }
      });

      if (nodeJsons.length === 0) return null;

      const tempEditor = createEditor({
        nodes: [DelNode, InsNode, TextNodeWithKey],
      });

      tempEditor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const nodes = $generateNodesFromSerializedNodes(nodeJsons);
        nodes.forEach((node: LexicalNode) => {
          paragraph.append(node);
        });
        root.append(paragraph);
      }, { discrete: true });

      return JSON.stringify(tempEditor.getEditorState().toJSON());
    } catch (e) {
      console.error('Error building diff preview:', e);
      return null;
    }
  };

  /**
   * Creates a minimal serialized Lexical editor state with a single text paragraph.
   * Used for storing justification text as a thread comment.
   */
  const createTextEditorState = (text: string): string => {
    const tempEditor = createEditor({ nodes: [] });
    tempEditor.update(() => {
      const root = $getRoot();
      const p = $createParagraphNode();
      p.append($createTextNode(text));
      root.append(p);
    }, { discrete: true });
    return JSON.stringify(tempEditor.getEditorState().toJSON());
  };

  const onStreamingFinished = (changes?: string, justification?: string) => {
    const content = streamingMessageRef.current;
    streamingMessageRef.current = ""; // prevent double-fire from producing duplicate
    if (!content) return;

    const diffState = changes ? buildDiffPreview(changes) ?? undefined : undefined;
    setMessages(msgs => [...msgs, {
      content,
      type: 'ai',
      timestamp: new Date().toISOString(),
      justification,
      diffState,
      pendingChanges: changes,
    }]);
    setMessage({ content, type: 'ai', timestamp: new Date().toISOString() });
    setStreamingMessage("");
  }

  const handleAccept = (msgTimestamp: string, changesJson: string, justification: string) => {
    const changes = JSON.parse(changesJson);
    const justificationContent = createTextEditorState(justification);

    // Step 1: Create threads FIRST (outside editor.update), so addThread's inner
    // editor.update({ discrete: true }) runs synchronously and wraps original nodes
    // in MarkNodes before $delSelection replaces them.
    // Pass plain SelectionData so addThread creates $createRangeSelection() inside
    // its own editor.update callback ($ functions require an active editor state).
    for (const change of changes) {
      if (change.type === 'deletion') {
        addThreadRef.current?.(justificationContent, {
          anchorKey: change.start_key,
          anchorOffset: change.start_offset,
          focusKey: change.end_key,
          focusOffset: change.end_offset,
        });
      }
    }

    // Step 2: Apply del/ins nodes. Original text nodes are now children of MarkNodes,
    // so $delSelection replaces them with DelNodes that remain inside the MarkNode.
    editor.update(() => {
      let lastCreatedDelNode: any = null;

      for (const change of changes) {
        if (change.type === 'deletion') {
          const sel = $createRangeSelection();
          sel.anchor.set(change.start_key, change.start_offset, 'text');
          sel.focus.set(change.end_key, change.end_offset, 'text');
          lastCreatedDelNode = $delSelection(sel) ?? null;
        } else if (change.type === 'addition') {
          const textNodeWithKey = $createTextNodeWithKey(change.text);
          const insNode = $createInsNode(generateRandomString(10));
          insNode.append(textNodeWithKey);
          lastCreatedDelNode?.insertAfter(insNode);
        }
      }
    });

    setMessages(msgs => msgs.map(m =>
      m.timestamp === msgTimestamp
        ? { ...m, pendingChanges: undefined, diffState: undefined }
        : m
    ));
  };

  const handleReject = (msgTimestamp: string) => {
    setMessages(msgs => msgs.map(m =>
      m.timestamp === msgTimestamp
        ? { ...m, pendingChanges: undefined, diffState: undefined }
        : m
    ));
  };

  const onContinue = async (e: any) => {
    if (input) {
      // if user clicks continue button thinking it's an 'enter' button
      handleSubmit(e);
    }

    if (agentSocket) {
      // clear messages when user clicks continue
      setMessage(null);

      // remove messages
      setMessages([]);

      // if user had something in input but clicked 'continue', send the input to the bot
      if (input) {
        agentSocket.send(JSON.stringify({
          'message': input
        }));

        setInput("");
      } else {
        agentSocket.send(JSON.stringify({
          'message': 'continue'
        }));
      }
    }
  }

  const getMessageContent = (content: any) => {
    if (typeof content === 'string') return content;
    if (typeof content.message === 'string') return content.message;
  }

  let messageHTML = null;

  // only show last two messages if the last message is a question
  let askedQuestion = false;
  if (messages.length > 1) {
    const lastMessage = messages[messages.length - 1].content;
    askedQuestion = lastMessage[lastMessage.length - 1] === "?";
  }

  if (streamingMessage || messages.length > 0 || askedQuestion) {
    messageHTML = (
      <div className={`flex flex-col flex-1 overflow-scroll`}>
        {messages.map(msg => (
          <div key={msg.timestamp}>
            <Message
              content={getMessageContent(msg.content)}
              type={msg.type === 'human' ? 'sent' : 'received'}
            />
            {msg.diffState && (
              <ChangeDiff
                justification={msg.justification ?? ''}
                diffState={msg.diffState}
                onAccept={() => handleAccept(msg.timestamp!, msg.pendingChanges!, msg.justification ?? '')}
                onReject={() => handleReject(msg.timestamp!)}
              />
            )}
          </div>
        ))}
        { streamingMessage !== "" && <Message content={streamingMessage} type='ai' key={'streaming'} /> }
        <div ref={messagesEndRef} />
      </div>
    )
  } else if (message && message.content.message) {
    messageHTML = (
      <Message
        content={getMessageContent(message.content)}
        key={message.timestamp}
      />
    )
  }

  // TODO: look into cursor composer for inspiration: https://docs.cursor.com/composer
  return (
    <>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className={`h-full px-5`}>
          {messageHTML}
        </ScrollArea>
      </div>
      <div className="flex flex-col m-3 rounded-lg bg-input/30">
        <ChatInput
          placeholder="Message"
          value={input}
          onChange={(e: any) => setInput(e.target.value)}
          onSubmit={handleSubmit}
          className="my-1 py-6 px-4 md:text-base border-none dark:bg-transparent bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between mx-2 mb-2">
          <div className="flex flex-row gap-2">
            <Select defaultValue="openai">
              <SelectTrigger className="items-center">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" defaultChecked>gpt-5-mini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrowUp size={20} onClick={handleSubmit}/>
        </div>
      </div>
      <p className="text-xs mx-5">AI can make mistakes. Interpretation may be inaccurate. Not legal, medical, or financial advice.</p>
    </>
  )
}
