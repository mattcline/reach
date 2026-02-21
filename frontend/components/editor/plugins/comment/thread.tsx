import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';

import { useDocument } from 'context/document';
import { useComment, type ThreadOutput } from 'components/editor/context/CommentContext';
import { Comment } from 'components/editor/plugins/comment/comment';
import { ThreadInput } from 'components/editor/plugins/comment/thread-input';

export function Thread({
  thread,
  onRef,
  onClick
}: {
  thread: ThreadOutput;
  onRef: (el: HTMLDivElement) => void;
  onClick: () => void;
}) {
  const { visibleLayer, allThreadProvidersSynced } = useDocument();
  const { localComments } = useComment();

  const [comments, setComments] = useState<any>(undefined);

  const rtf = useMemo(
    () =>
      new Intl.RelativeTimeFormat('en', {
        localeMatcher: 'best fit',
        numeric: 'auto',
        style: 'narrow',
      }),
    [],
  );

  useEffect(() => {
    if (!allThreadProvidersSynced) return;

    const commentsArray = thread.yThread.get('comments') as unknown as Y.Array<Y.Map<any>>;
    let finalComments = commentsArray;

    // stitch in private comments in if there are any
    const id = thread.yThread.get('id') as string;
    if (id && localComments.has(id)) {
      const privateComments = localComments.get(id);
      // sort by timestamp
      const mergedComments = [...commentsArray.toArray(), ...privateComments.toArray()].sort((a, b) => Number(a.get('timestamp')) - Number(b.get('timestamp')));
      finalComments = mergedComments as any;
    }

    setComments(finalComments);
  }, [localComments, allThreadProvidersSynced, thread.yThread]);

  // TODO: test this, might be for the case of user no longer deciding to make a comment
  // after queueing up the window to add a comment
  if (comments === undefined) return;
  return (
    <div
      key={thread.yThread.get('id')}
      ref={onRef}
      onClick={onClick}
      className={`absolute w-full max-w-1/3 right-3 pt-5 px-5 border rounded-xl ${thread.focused ? 'bg-blue-400/10 dark:bg-blue-950/30 border-blue-600' : ''}`}
      style={{top: `${thread.position}px`}}
    >
      {/* <div className="flex flex-row justify-center gap-5 mb-5">
        <Check size={20} className="opacity-50 hover:opacity-100 hover:cursor-pointer"/>
        <X size={20} className="opacity-50 hover:opacity-100 hover:cursor-pointer"/>
      </div> */}
      <ul className="flex-1 p-0 m-0">
        {comments.map((comment: Y.Map<any>) => (
          <Comment
            key={comment.get('id')}
            comment={comment}
            disabled={visibleLayer !== 'base' && (thread.yThread.get('layer') as string) === 'base' && !comment.get('private')}
            rtf={rtf}
          />
        ))}
      </ul>
      <div className={`flex-1 ${comments.length > 0 && 'mt-2'}`}>
        <ThreadInput
          thread={thread}
          placeholder="Comment..."
        />
      </div>
    </div>
  );
}