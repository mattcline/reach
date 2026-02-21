'use client';

import {
  useEffect,
  useState,
  useRef,
  useContext,
  createContext,
  useMemo,
  useCallback,
  useLayoutEffect
} from 'react';
import {
  type LexicalEditor,
  type NodeKey,
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  RangeSelection
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { $isMarkNode, $unwrapMarkNode, MarkNode } from '@lexical/mark';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { useUser } from 'context/user';
import { useDocument, DocumentType } from 'context/document';
import { $wrapSelectionInMarkNode } from 'components/editor/utils/wrapSelectionInMarkNode';
import type { UserProfileAbbreviated } from '@/types/user';

export interface Comment {
  content: string;
}

export interface CommentInput extends Comment {
  author: string; // write only
  thread: string;
  timestamp?: string;
}

export interface CommentOutput extends Comment {
  id: string;
  timestamp: string;
  author_details: UserProfileAbbreviated; // read only
}

export interface Thread {
  thread_id: string;
}

export interface ThreadInput {
  document: string;
}

export interface AuthorDetails {
  id: string;
  full_name: string;
}

type YComment = {
  id: string;
  content: string;
  authorDetails: AuthorDetails;
  timestamp: number;
}

type YThread = {
  id: string;
  comments: Y.Array<Y.Map<keyof YComment>>;
  resolved: boolean;
  layer?: string;
}

export interface ThreadOutput {
  yThread: Y.Map<keyof YThread>;
  position: number; // position of top of thread recorded in number of pixels from the top of the editor container
  height?: number;
  focused?: boolean;
}

export type SelectionData = {
  anchorKey: string;
  anchorOffset: number;
  focusKey: string;
  focusOffset: number;
};

type CommentContext = {
  threads: ThreadOutput[];
  setThreads: React.Dispatch<React.SetStateAction<ThreadOutput[]>>;
  // addComment: (content: string, threadId: string) => Promise<CommentOutput | null>;
  addThread: (content: string, selection: RangeSelection | SelectionData) => ThreadOutput | undefined;
  updateThead: (id: string, content: string) => void;
  onEscape: (event: KeyboardEvent) => boolean;
  markNodeMap: Map<string, Set<NodeKey>>;
  activeIds: Array<string>;
  setActiveIds: React.Dispatch<React.SetStateAction<string[]>>;
  threadRefs: React.RefObject<any[]>;
  localComments: any;
  setLocalComments: any;
  setNumThreadsMounted: any;
}

const CommentContext = createContext<CommentContext | undefined>(undefined);

const BOTTOM_MARGIN = 10; // px

export let yLocalComments: Y.Map<unknown> | null = null;

export function CommentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { doc } = useDocument();
  const [editor] = useLexicalComposerContext();
  const collabContext = useCollaborationContext();
  const {
    yjsDocMap
  } = collabContext;

  const [yThreads, setYThreads] = useState<any>([]);
  const [localComments, setLocalComments] = useState<any>(new Map());

  const [threads, setThreads] = useState<ThreadOutput[]>([]);
  const [activeIds, setActiveIds] = useState<Array<string>>([]);
  const [numThreadsMounted, setNumThreadsMounted] = useState(0);
  const [allThreadsMounted, setAllThreadsMounted] = useState<boolean>(false);

  const threadRefs = useRef<any[]>([]);
  const prevThreadsRef = useRef<ThreadOutput[]>([]);
  const resizeObserver = useRef<any>(null);

  const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => {
    return new Map();
  }, []);

  useEffect(() => {
    if (threads.length === 0) return;
    if (numThreadsMounted >= threads.length) {
      setAllThreadsMounted(true);
    }
  }, [numThreadsMounted, threads]);

  useEffect(() => {
    if (!doc || !yjsDocMap) return;

    const yDoc = yjsDocMap.get(doc.id);
    if (!yDoc) return;

    const yThreads = yDoc.getArray('threads');

    setYThreads(yThreads.toArray()); // set yThreads here in case they have already loaded from db

    const threadsObserver = (events: any) => {
      queueMicrotask(() => {
        setYThreads(yThreads.toArray());
      });
    }
    yThreads.observeDeep(threadsObserver);

    let commentsObserver = null;

    // for private comments on shared threads
    yLocalComments = yDoc.getMap('comments'); // map from shared thread id => list of comments
    
    setLocalComments(new Map(yLocalComments.entries())); // set localComments here in case they have already loaded from db
    
    commentsObserver = (events: any) => {
      queueMicrotask(() => {
        if (yLocalComments) {
          setLocalComments(new Map(yLocalComments.entries()));
        }
      });
    }
    yLocalComments.observeDeep(commentsObserver);

    return () => {
      yThreads.unobserveDeep(threadsObserver);
      if (commentsObserver) {
        yLocalComments?.unobserveDeep(commentsObserver);
      }
    };
  }, [doc, yjsDocMap]);

  const getMarkNode = useCallback((id: string): MarkNode | null => {
    let markNode = null;
  
    const markNodeKeys = markNodeMap.get(id);
    if (markNodeKeys !== undefined) {
      editor.read(() => {
        const markNodeKey = Array.from(markNodeKeys).pop();
        if (markNodeKey) {
          markNode = $getNodeByKey<MarkNode>(markNodeKey);
        }
      })
    }
    return markNode;
  }, [markNodeMap, editor]);

  const compare = useCallback((a: ThreadOutput, b: ThreadOutput): number => {
    const aThreadId = a.yThread.get('id');
    const bThreadId = b.yThread.get('id');

    if (aThreadId === undefined) return 1;
    if (bThreadId === undefined) return -1;

    const aMarkNode = getMarkNode(aThreadId);
    const bMarkNode = getMarkNode(bThreadId);

    if (!aMarkNode) return 1;
    if (!bMarkNode) return -1;

    let isBefore = false;
    editor.read(() => {
      isBefore = aMarkNode.isBefore(bMarkNode);
    })
    return isBefore ? -1 : 1;
  }, [getMarkNode, editor]);

  useEffect(() => {
    // when underlying data changes need to update the threads to handle new positioning

    // TODO: don't overwrite 'focused' status
    // retain the 'focused' param?  could just remove it and just activeIds

    // wrap yThread in an object so it can be ordered using additional fields (position, height)
    const threads = yThreads.map((yThread: Y.Map<keyof YThread>) => {
      return { yThread, position: 0 } as ThreadOutput;
    });

    // sort threads
    threads.sort(compare);

    setThreads(threads);
  }, [yThreads, compare]);

  const getAnchorPosition = useCallback((thread: ThreadOutput) => {
    let position = 0;
    const threadId = thread.yThread.get('id');
    if (threadId === undefined) {
      return position;
    }

    const markNodeKeys = markNodeMap.get(threadId);
    if (markNodeKeys !== undefined) {
      editor.read(() => {
        const markNodeKey = Array.from(markNodeKeys)[0];
        const markNode = $getNodeByKey<MarkNode>(markNodeKey);

        if ($isMarkNode(markNode)) {
          const rootElement = editor.getRootElement();
          // @ts-ignore
          const { top: topRoot } = rootElement?.getBoundingClientRect();

          const markEl = editor.getElementByKey(markNodeKey);
          // @ts-ignore
          const { top } = markEl?.getBoundingClientRect();
          
          position = top - topRoot;
        }
      });
    }
    return position;
  }, [editor, markNodeMap]);

  function createResizeObserver(threads: ThreadOutput[]) {
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
    }

    resizeObserver.current = new ResizeObserver((entries, observer) => {
      for (let entry of entries) {
        const target = entry.target as HTMLDivElement;
        const index = threadRefs.current.indexOf(target);
        if (
          threads[index]?.height !== undefined
          && target.offsetHeight !== threads[index]?.height
        ) {
          console.log(`Resize index ${index} (${target.innerText}) because previous height was ${threads[index]?.height} and new height is ${target.offsetHeight}`);
          // TODO: add an index to update from instead??
          setThreads(threads =>
            threads.map((thread, i) => {
              if (i === index) {
                return {
                  ...thread,
                  height: target.offsetHeight
                }
              }
              return thread;
            })
          )
        } else {
          console.log('heights are the same')
        }
      }
    });
  }

  // position threads
  useEffect(() => {
    // not ready to position threads yet
    if (!allThreadsMounted) return;

    // no change has been made to warrant re-positioning
    if (JSON.stringify(threads) === JSON.stringify(prevThreadsRef.current)) return;

    console.log('positioning threads...');

    // by wrapping it in a queueMicrotask, we solve the following issue:
    // Cannot update a component (`Placeholder`) while rendering a different component (`CommentProvider`). To locate the bad setState() call inside `CommentProvider`, follow the stack trace as described in https://react.dev/link/setstate-in-render
    queueMicrotask(() => {
      setThreads(threads => {
        // identify the first focused thread
        let focusedThread = null, focusedThreadIndex = null;
        for (let i = 0; i < threads.length; i++) {
          const thread = threads[i];
          if (thread.focused) {
            focusedThread = thread;
            focusedThreadIndex = i;
            break;
          }
        }

        // calculate new bottom position of previous thread
        let offset = 0, bottomPosOfPrevThread = 0;
        if (focusedThread && focusedThreadIndex && focusedThreadIndex > 0) {
          // get current position of focused thread
          bottomPosOfPrevThread = threads[focusedThreadIndex - 1].position + threadRefs.current[focusedThreadIndex - 1].offsetHeight + BOTTOM_MARGIN;
          const position = focusedThread.position || bottomPosOfPrevThread;

          // get anchor position
          const anchorPosition = getAnchorPosition(focusedThread);

          // calculate the difference (should be non-positive number)
          offset = anchorPosition - position;
    
          // note: assume threads have already been positioned before a thread can be focused
          // so the position field exists
          bottomPosOfPrevThread =
            threads[focusedThreadIndex - 1].position
            + threadRefs.current[focusedThreadIndex - 1]?.offsetHeight
            + BOTTOM_MARGIN
            + offset;
        }

        createResizeObserver(threads);

        const positionedThreads = threads.map((thread: ThreadOutput, i: number) => {
          resizeObserver.current.observe(threadRefs.current[i]);

          // shift previous threads up by offset
          if (
            focusedThreadIndex !== null
            && i < focusedThreadIndex
          ) {
            return {
              ...thread,
              height: threadRefs.current[i]?.offsetHeight,
              position: thread.position + offset
            }
          }

          // shift thread up to the previous thread or the anchor position if it's lower
          const anchorPosition = getAnchorPosition(thread);
          const position = Math.max(bottomPosOfPrevThread, anchorPosition);
          bottomPosOfPrevThread = position + threadRefs.current[i]?.offsetHeight + BOTTOM_MARGIN;
          return {
            ...thread,
            height: threadRefs.current[i]?.offsetHeight,
            position
          }
        });
        prevThreadsRef.current = positionedThreads;
        return positionedThreads;
      });
    });
  }, [threads, allThreadsMounted, getAnchorPosition]);

  const removeDeletedNodes = useCallback((id: string) => {
    // Remove ids from associated marks
    const markNodeKeys = markNodeMap.get(id);
    if (markNodeKeys !== undefined) {
      // Do async to avoid causing a React infinite loop
      setTimeout(() => {
        editor.update(() => {
          for (const key of markNodeKeys) {
            const node: null | MarkNode = $getNodeByKey(key);
            if ($isMarkNode(node)) {
              node.deleteID(id);
              if (node.getIDs().length === 0) {
                $unwrapMarkNode(node);
              }
            }
          }
        });
      });
    }
  }, [markNodeMap, editor]);

  const deleteThread = useCallback(async (thread: ThreadOutput) => {
    const id = thread.yThread.get('id');
    if (id === undefined) return;

    if (!doc) return;
    const yThreads = yjsDocMap.get(doc?.id)?.getArray('threads');
    if (!yThreads) return;

    // delete directly from Y.Array
    const index = yThreads.toArray().findIndex((thread: unknown) => (thread as Y.Map<keyof YThread>).get('id') === id);
    if (index !== -1) {
      yThreads.delete(index, 1);
    }

    removeDeletedNodes(id);
  }, [yThreads, removeDeletedNodes, doc]);

  // delete any threads with no comments after any previously focused thread becomes unfocused
  useEffect(() => {
    console.log(`active ids ${activeIds} have changed, updating threads...`);
    setThreads(threads => {
      const activeThreads = [];
      for (const thread of threads) {
        if (activeIds.length === 0 && thread.yThread.get('comments')?.length === 0) {
          deleteThread(thread);
        } else {
          activeThreads.push({
            ...thread,
            focused: activeIds.includes(thread.yThread.get('id') || '')
          });
        }
      }
      return activeThreads;
    });
  }, [activeIds, deleteThread]);

  const addThread = useCallback((
    content: string,
    selection: RangeSelection | SelectionData
  ) => {
    if (!doc) return;

    const yComments = new Y.Array();

    // create comment if content was passed in
    if (content) {
      const yComment = new Y.Map();
      yComment.set('id', crypto.randomUUID());
      yComment.set('content', content);
      yComment.set('authorDetails', { id: user?.id, full_name: user?.full_name || user?.email });
      yComment.set('timestamp', Date.now());
      yComments.insert(0, [yComment]);
    }

    const yThread = new Y.Map();
    yThread.set('id', crypto.randomUUID());
    yThread.set('comments', yComments);
    yThread.set('resolved', false);
    yThread.set('layer', 'base'); // Default layer value

    // TODO: move yThreads to a useMemo variable
    const yThreads = yjsDocMap.get(doc.id)?.getArray('threads');
    if (!yThreads) return;
    yThreads.insert(0, [yThread]);

    editor.update(() => {
      let sel: RangeSelection;
      if ($isRangeSelection(selection)) {
        sel = selection;
      } else {
        sel = $createRangeSelection();
        sel.anchor.set(selection.anchorKey, selection.anchorOffset, 'text');
        sel.focus.set(selection.focusKey, selection.focusOffset, 'text');
      }
      $wrapSelectionInMarkNode(sel, yThread.get('id') as string);
    }, {discrete: true});

    // Return a ThreadOutput object instead of just yThread
    const threadOutput: ThreadOutput = {
      yThread: yThread as Y.Map<keyof YThread>,
      position: 0, // Will be calculated by the component
      focused: true
    };
    return threadOutput;
  }, [yThreads, editor, doc, user, yjsDocMap]);

  const onEscape = useCallback((event: KeyboardEvent): boolean => {
    event.preventDefault();

    // TODO: I think remove
    editor.update(() => {
      const selection = $getSelection();
      // Restore selection
      if (selection !== null) {
        selection.dirty = true;
      }
    });

    console.log(`active ids on escape: ${activeIds}`)
    // loop through active threads and if any don't have comments (i.e. empty), delete them
    for (let activeId of activeIds) {
      const thread = threads.find(thread => thread.yThread.get('id') === activeId);
      if (thread && (thread.yThread.get('comments') as any)?.length === 0) {
        // delete the thread
        console.log(`deleting thread...`)
        deleteThread(thread);
      }
    }

    return true;
  }, [editor, threads, activeIds, deleteThread]);

  return (
    // @ts-ignore
    <CommentContext.Provider value={{ 
      threads,
      setThreads,
      addThread,
      onEscape,
      markNodeMap,
      activeIds,
      setActiveIds,
      threadRefs,
      localComments,
      setLocalComments,
      setNumThreadsMounted
    }}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComment() {
  const context = useContext(CommentContext);
  if (context === undefined) {
    throw new Error('useComment must be used within a CommentProvider');
  }
  return context;
}