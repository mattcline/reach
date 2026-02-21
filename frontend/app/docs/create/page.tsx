'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useDocuments } from 'context/documents';

export default function CreateDocumentPage() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId') ?? undefined;
  const { createDocument } = useDocuments();

  useEffect(() => {
    createDocument(propertyId);
  }, [createDocument, propertyId]);
}