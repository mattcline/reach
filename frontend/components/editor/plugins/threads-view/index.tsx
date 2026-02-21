import { useEffect } from 'react';

import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';

import { useDocument } from 'context/document';

export function ThreadsViewPlugin() {
  const collabContext = useCollaborationContext();
  const {
    yjsDocMap
  } = collabContext;

  const { doc } = useDocument();

  useEffect(() => {
    if (!doc || !yjsDocMap) return;
  
    const yDoc = yjsDocMap.get(doc.id);

    if (!yDoc) return;
  
    console.log(`threads: ${JSON.stringify(yDoc.getArray('threads'), null, 4)}`);
  }, [doc, yjsDocMap])

  return null;
}