import { type JSX } from 'react';
import { $getNodeByKey } from 'lexical';
import {
  $isMarkNode,
  MarkNode,
} from '@lexical/mark';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import { ThreadOutput, useComment } from 'components/editor/context/CommentContext';
import { Thread } from 'components/editor/plugins/comment/thread';

export function Threads(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { threads, markNodeMap, activeIds, threadRefs, setNumThreadsMounted } = useComment();

  function handleClickThread(index: number) {
    const id = threads[index].yThread.get('id') as string;

    const markNodeKeys = markNodeMap.get(id);
    if (
      markNodeKeys !== undefined &&
      (activeIds === null || activeIds.indexOf(id) === -1)
    ) {
      const activeElement = document.activeElement;
      // Move selection to the start of the mark, so that we
      // update the UI with the selected thread.
      editor.update(
        () => {
          const markNodeKey = Array.from(markNodeKeys)[0];
          const markNode = $getNodeByKey<MarkNode>(markNodeKey);
          if ($isMarkNode(markNode)) {
            markNode.selectStart();
          }
        },
        {
          onUpdate() {
            // Restore selection to the previous element
            if (activeElement !== null) {
              (activeElement as HTMLElement).focus();
            }
          },
        },
      );
    }
  }

  return (
    <>
      {threads.map((thread: ThreadOutput, index: number) => (
        <Thread
          thread={thread}
          key={thread.yThread.get('id')}
          onRef={(el: HTMLDivElement) => { 
            threadRefs.current[index] = el;
            setNumThreadsMounted((numThreadsMounted: number) => {
              if (el === null) {
                return numThreadsMounted - 1;
              } else if (numThreadsMounted >= threads.length) {
                return numThreadsMounted;
              } else {
                return numThreadsMounted + 1;
              }
            });
          }}
          onClick={() => handleClickThread(index)}
        />
      ))}
    </>
  );
}