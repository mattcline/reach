import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorState } from 'lexical';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import * as Y from 'yjs';
import { Provider } from '@lexical/yjs';
import { WebsocketProvider } from 'y-websocket';
import { Loader2 } from 'lucide-react';

import { BACKEND_URL, Y_WEBSOCKET_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useDocument } from 'context/document';
import { useGlobal } from 'context/global';
import { useUser } from 'context/user';

import { CAN_USE_DOM } from 'components/editor/shared/canUseDOM';
import { ChangePlugin } from 'components/editor/plugins/change';
import { CommentPlugin } from 'components/editor/plugins/comment';
import { TreeViewPlugin } from 'components/editor/plugins/tree-view';
import { ThreadsViewPlugin } from 'components/editor/plugins/threads-view';
import { CustomTabIndentationPlugin } from 'components/editor/plugins/custom-tab-indentation';
import { FloatingTextFormatToolbarPlugin } from 'components/editor/plugins/floating-text-format-toolbar';
import { ChangeButtonsPlugin } from 'components/editor/plugins/change-buttons';

import { CommentProvider, useComment } from 'components/editor/context/CommentContext';
import { ScrollArea } from 'components/ui/scroll-area';

function CommentBridge({ addThreadRef }: { addThreadRef: React.MutableRefObject<any> }) {
  const { addThread } = useComment();
  useEffect(() => {
    addThreadRef.current = addThread;
  }, [addThread, addThreadRef]);
  return null;
}

export function Editor({ addThreadRef }: { addThreadRef: React.MutableRefObject<any> }) {
  const [editor] = useLexicalComposerContext();

  const { setEditor } = useGlobal();
  const { user } = useUser();
  const { doc, saveContent, setActiveUsers } = useDocument();

  const collabContext = useCollaborationContext();
  const {
    yjsDocMap
  } = collabContext;

  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const [wsToken, setWsToken] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const authTokenRefreshAttemptsRef = useRef(0);
  const MAX_AUTH_TOKEN_REFRESH_ATTEMPTS = 3;

  function getTailwindColorName(userId: string): { name: string; borderClass: string, rgb: string } {
    const colors = [
      { name: 'red',      borderClass: 'border-red-700',      rgb: 'rgb(185, 28, 28)' },
      { name: 'orange',   borderClass: 'border-orange-700',   rgb: 'rgb(194, 65, 12)' },
      { name: 'amber',    borderClass: 'border-amber-700',    rgb: 'rgb(180, 83, 9)' },
      { name: 'yellow',   borderClass: 'border-yellow-700',   rgb: 'rgb(161, 98, 7)' },
      { name: 'lime',     borderClass: 'border-lime-700',     rgb: 'rgb(77, 124, 15)' },
      { name: 'green',    borderClass: 'border-green-700',    rgb: 'rgb(21, 128, 61)' },
      { name: 'emerald',  borderClass: 'border-emerald-700',  rgb: 'rgb(4, 120, 87)' },
      { name: 'teal',     borderClass: 'border-teal-700',     rgb: 'rgb(15, 118, 110)' },
      { name: 'cyan',     borderClass: 'border-cyan-700',     rgb: 'rgb(14, 116, 144)' },
      { name: 'sky',      borderClass: 'border-sky-700',      rgb: 'rgb(3, 105, 161)' },
      { name: 'blue',     borderClass: 'border-blue-700',     rgb: 'rgb(29, 78, 216)' },
      { name: 'indigo',   borderClass: 'border-indigo-700',   rgb: 'rgb(67, 56, 202)' },
      { name: 'violet',   borderClass: 'border-violet-700',   rgb: 'rgb(109, 40, 217)' },
      { name: 'purple',   borderClass: 'border-purple-700',   rgb: 'rgb(126, 34, 206)' },
      { name: 'fuchsia',  borderClass: 'border-fuchsia-700',  rgb: 'rgb(162, 28, 175)' },
      { name: 'pink',     borderClass: 'border-pink-700',     rgb: 'rgb(190, 24, 93)' },
      { name: 'rose',     borderClass: 'border-rose-700',     rgb: 'rgb(190, 18, 60)' },
    ];
    
    const hash = userId.split('').reduce((acc, char) => 
      char.charCodeAt(0) + ((acc << 5) - acc), 0
    );
    
    return colors[Math.abs(hash) % colors.length];
  }

  const awarenessData = useMemo(() => ({
    email: user?.email,
    color: user ? getTailwindColorName(user.id).rgb : 'blue',
    twColor: user ? getTailwindColorName(user.id).borderClass : 'bg-blue-600'
  }), [user]);

  useEffect(() => {
    // hoist the editor to be used by the navbar
    setEditor(editor);
  }, [editor, setEditor]);

  useEffect(() => {
    fetchToken();
  }, [doc]);

  const fetchToken = async () => {
    if (!doc) return;
    const token = await getToken(doc.id);
    if (token) {
      setWsToken(token);
    }
  };

  // FLOATING TEXT FORMAT TOOLBAR PLUGIN
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  // Autosave handler with debouncing
  const handleChange = useCallback((editorState: EditorState) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout for saving (3 seconds delay)
    // saveTimeoutRef.current = setTimeout(() => {
    //   if (doc && saveContent) {
    //     const jsonString = JSON.stringify(editorState.toJSON());
    //     saveContent(jsonString, 'application/json');
    //   }
    // }, 3000);
  }, [doc, saveContent]);

  // AUTOLINK PLUGIN
  const URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

  const MATCHERS = [
    // @ts-ignore
    (text) => {
      const match = URL_MATCHER.exec(text);
      if (match === null) {
        return null;
      }
      const fullMatch = match[0];
      return {
        index: match.index,
        length: fullMatch.length,
        text: fullMatch,
        url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
        // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
      };
    },
  ];

  // COLLABORATION PLUGIN
  function getDocFromMap(id: string, yjsDocMap: Map<string, Y.Doc>): Y.Doc {
    let doc = yjsDocMap.get(id);
  
    if (doc === undefined) {
      doc = new Y.Doc();
      yjsDocMap.set(id, doc);
    } else {
      doc.load();
    }

    return doc;
  }

  const getToken = async (id: string) => {
    const url = `${BACKEND_URL}/documents/${id}/ws-token/`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
      const token = (data as { token: string }).token as string;
      return token;
    }
  }

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>): Provider => {
      const doc = getDocFromMap(id, yjsDocMap);

      if (!wsToken) {
        throw new Error('Websocket token not available');
      }

      const provider = new WebsocketProvider(Y_WEBSOCKET_URL, id, doc, {
        connect: false,
        params: { token: wsToken }
      });

      provider.on('status', (event) => {
        console.log(event.status);

        // Reset counter on successful connection
        if (event.status === 'connected') {
          authTokenRefreshAttemptsRef.current = 0;

          // initialize state if this is a duplicate of another doc
          const pending = sessionStorage.getItem('pendingDocState');
          if (pending) {
            const { id: pendingId, state } = JSON.parse(pending);
            if (pendingId === id) {
              Y.applyUpdate(doc, new Uint8Array(state));
              sessionStorage.removeItem('pendingDocState');
            }
          }
        }
      });

      // Listen to awareness changes from other users
      provider.awareness.on('change', (changes: any) => {
        const activeUsers: any = [];
        provider.awareness.getStates().forEach((state, clientId) => {
          activeUsers.push(state.awarenessData);
        });
       
        setActiveUsers(activeUsers);
      });

      provider.on('connection-close', async (event) => {
        console.log('[Connection Close]', {
          code: event?.code,
          reason: event?.reason,
          wasClean: event?.wasClean,
          timestamp: new Date().toISOString()
        });

        // Token expired or auth issue
        if (event?.code === 4401) {
          if (authTokenRefreshAttemptsRef.current >= MAX_AUTH_TOKEN_REFRESH_ATTEMPTS) {
            console.error('Max token refresh attempts reached.');
            return;
          }

          authTokenRefreshAttemptsRef.current++;
          console.log(`Token refresh attempt ${authTokenRefreshAttemptsRef.current}/${MAX_AUTH_TOKEN_REFRESH_ATTEMPTS}`);

          fetchToken();
        }
      });

      // @ts-ignore
      return provider;
    }, [wsToken],
  );
  
  if (!doc || !wsToken || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex overflow-hidden w-full">
      <div className="relative flex-1 overflow-auto">
        <CollaborationPlugin
          id={doc.id}
          providerFactory={providerFactory}
          shouldBootstrap={false}
          username={user?.email}
          awarenessData={awarenessData}
        />
        <CommentProvider>
        <CommentBridge addThreadRef={addThreadRef} />
        <ListPlugin />
        <RichTextPlugin
          contentEditable={
            <div
              className="flex flex-1 max-w-2/3 h-full relative focus:outline-none border-none ring-none ml-5"
              ref={onRef}
            >
              <ContentEditable
                // spellCheck="false"
                // writingsuggestions="false" // https://discord.com/channels/953974421008293909/953974421486436393/1360300939973628015
                autoComplete="off" // https://discord.com/channels/953974421008293909/953974421486436393/1359640714862133430
                autoCorrect="off"
                className="flex-1 focus-visible:outline-none mr-10 scroll-py-10"
              />
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin
          onChange={handleChange}
          ignoreSelectionChange
        />
        <ChangeButtonsPlugin />
        <CommentPlugin />
        <ChangePlugin />
        {/* DO NOT ERASE THIS PLUGIN - we rely on it to run the node transforms upon switching layers */}
        <AutoLinkPlugin matchers={MATCHERS} />
        <CustomTabIndentationPlugin />
        {floatingAnchorElem && !isSmallWidthViewport && (
          <FloatingTextFormatToolbarPlugin
            anchorElem={floatingAnchorElem}
          />
        )}
        <ThreadsViewPlugin />
        {/* <TreeViewPlugin /> */}
        </CommentProvider>
      </div>
    </div>
  );
}