'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { prod } from 'lib/constants';

import { useDocuments } from 'context/documents';
import { useDocument } from 'context/document';
import { RequestError } from 'lib/utils/request';

export default function DocumentPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  
  const {
    doc,
    setDoc,
    getDoc
  } = useDocument();

  useEffect(() => {
    if (!params.id) return;

    (async () => {
      try {
        await getDoc(params.id);
      } catch (error) {
        if (error instanceof Error && 'status' in error) {
          const requestError = error as RequestError;
          if (requestError.status === 404) {
            toast.error('Document not found');
            router.push(prod ? '/' : '/docs');
          }
        }
      }
    })();
  }, [params.id, getDoc, router]);

  useEffect(() => {
    // TODO: Handle document versions when implemented
  }, [doc]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      setDoc(null);
    }
  }, [setDoc]);

  return null;
}