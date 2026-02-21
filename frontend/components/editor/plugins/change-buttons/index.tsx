
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { MarkNode } from '@lexical/mark';
import { $unwrapAndFilterDescendants, $unwrapNode } from '@lexical/utils';
import { $getNodeByKey, $isTextNode, ElementNode, $isElementNode, LexicalEditor, $createTextNode, $createParagraphNode, $getRoot, createEditor, TextNode } from 'lexical';

import * as Y from 'yjs';

import { Check, X } from 'lucide-react';

import { $isTextNodeWithKey, $createTextNodeWithKey, TextNodeWithKey } from 'components/editor/nodes/TextNodeWithKey';
import { $isInsNode, InsNode } from 'components/editor/nodes/InsNode';
import { $isDelNode, DelNode } from 'components/editor/nodes/DelNode';

import { Button } from 'components/ui/button';

import { useComment } from 'components/editor/context/CommentContext';

import { useUser } from 'context/user';

export function ChangeButtonsPlugin() {
  const [editor] = useLexicalComposerContext();
  const { threads, activeIds } = useComment();
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [anchorElem, setAnchorElem] = useState<any>(null);
  const [anchorNodeKey, setAnchorNodeKey] = useState('');  // node key for the anchor mark node
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, height: 0 });
  const buttonsRef = useRef(null);
  const hideTimeoutRef = useRef<any>(null);
  const handlerMapRef = useRef(new Map());

  const handleMouseEnter = (e: Event, key: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setAnchorElem(e.currentTarget);
    setAnchorNodeKey(key);
    setIsVisible(true);
  };

  const handleMouseLeave = (e: Event) => {
    // Small delay so user can move to buttons
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setAnchorElem(null);
    }, 300);
  };

  const clearEventListenersForKey = (key: string) => {
    const elem = editor.getElementByKey(key);
    if (!elem) return;

    const oldHandlers = handlerMapRef.current.get(key);
    if (oldHandlers) {
      elem.removeEventListener('mouseenter', oldHandlers.mouseenter);
      elem.removeEventListener('mouseleave', oldHandlers.mouseleave);
    }
  }

  useEffect(() => {
    return editor.registerMutationListener(MarkNode, (mutatedNodes) => {
      editor.read(() => {
        for (let [key, mutation] of mutatedNodes) {
          if (mutation === 'created' || mutation === 'updated') {
            const elem = editor.getElementByKey(key);
            if (!elem) continue;

            const node = $getNodeByKey(key);
            if (!node || !$isElementNode(node)) continue; // getChildren() is only available on ElementNodes

            // only mark nodes with changes should display buttons
            const hasChange = node.getChildren().some(child => $isDelNode(child) || $isInsNode(child));
            if (!hasChange) continue;

            clearEventListenersForKey(key);
            
            // Create new handlers
            const mouseenterHandler = (e: Event) => { handleMouseEnter(e, key) };
            const mouseleaveHandler = (e: Event) => handleMouseLeave(e)
            
            // Store the handler references
            handlerMapRef.current.set(key, {
              mouseenter: mouseenterHandler,
              mouseleave: mouseleaveHandler
            });
            
            // Add the new listeners
            elem.addEventListener('mouseenter', mouseenterHandler);
            elem.addEventListener('mouseleave', mouseleaveHandler);
          }
        }
      });
    });
  }, [editor]);

  // Position at end of mark
  useEffect(() => {
    if (!isVisible || !anchorElem || !buttonsRef.current) return;

    const updatePosition = () => {
      const anchorRect = anchorElem.getBoundingClientRect();
      
      // Position at the END (right side) of the marked text
      setCoords({
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.right,
        height: anchorRect.height
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, anchorElem]);

  if (!isVisible) return null;

  const logChangeActionInComments = (action: 'approve' | 'reject') => {
    // insert comment
    const yComment = new Y.Map();
    yComment.set('id', crypto.randomUUID());
    yComment.set('authorDetails', { id: user?.id, full_name: user?.full_name || user?.email });
    yComment.set('timestamp', Date.now());
    yComment.set('action', action)

    // find active thread objects given the active thread ids
    const activeThreads = threads.filter(thread => 
      activeIds.includes(thread.yThread.get('id') as string)
    );

    if (activeThreads) {
      const thread = activeThreads[0];
      let yComments = thread.yThread.get('comments') as unknown as Y.Array<any>;
      if (yComments) {
        yComments.push([yComment]);
      }
    }
  }

  const handleAccept = () => {
    editor.update(() => {
      const node = $getNodeByKey(anchorNodeKey) as ElementNode;
      const children = node?.getChildren();
      children.forEach((node, index) => {
        if ($isInsNode(node)) {
          $unwrapNode(node);
        } else if ($isDelNode(node)) {
          node.remove();
        }
      });
    });
    setIsVisible(false);
    clearEventListenersForKey(anchorNodeKey);
    
    logChangeActionInComments('approve');
  };

  const handleReject = () => {
    editor.update(() => {
      const node = $getNodeByKey(anchorNodeKey) as ElementNode;
      const children = node?.getChildren();
      children.forEach((node, index) => {
        if ($isInsNode(node)) {
          node.remove();
        } else if ($isDelNode(node)) {
          // convert DelNode to TextNodeWithKey
          const textNodeWithKey = $createTextNodeWithKey(node.getTextContent());
          textNodeWithKey.setFormat(node.getFormat()); // updates italics, bold, etc. and not the red color or strikethrough
          node.replace(textNodeWithKey);
        }
      });
    });
    setIsVisible(false);
    clearEventListenersForKey(anchorNodeKey);

    logChangeActionInComments('reject');
  };

  return createPortal(
    <div
      ref={buttonsRef}
      onMouseEnter={() => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      }}
      onMouseLeave={() => {
        setIsVisible(false);
        setAnchorElem(null);
      }}
      style={{
        position: 'fixed',
        top: `${coords.top + coords.height + 8}px`,
        left: `${coords.right - 8}px`,
        transform: 'translateX(-100%)', // Shift left by the button container's width
        zIndex: 1000,
      }}
      className="flex gap-2 shadow-lg"
    >
      <Button
        onClick={handleAccept}
        Icon={Check}
        className="px-3 bg-neutral-850 text-white rounded hover:bg-green-600 dark:hover:bg-green-950"
      >
        Accept
      </Button>
      <Button
        onClick={handleReject}
        Icon={X}
        className="px-3 bg-neutral-850 text-white rounded hover:bg-red-600 dark:hover:bg-red-950"
      >
        Reject
      </Button>
    </div>,
    document.body
  );
}