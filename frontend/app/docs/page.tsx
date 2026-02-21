'use client';

import { useUser } from 'context/user';
import { useDocuments } from 'context/documents';

import { AuthenticationRequired } from 'components/auth-required';
import { DocumentsList } from 'components/documents-list';

export default function DocsPage() {
  const { user, loading: userLoading } = useUser();
  const { documents, loading: documentsLoading } = useDocuments();

  // Wait for both user and documents to load
  if (userLoading || (user && documentsLoading)) {
    return null; // or a loading spinner
  }

  // Show landing page if not authenticated or no documents
  const showLanding = !user // || (user && documents.length === 0);

  return showLanding ? <AuthenticationRequired message="Please log in to access your account." /> : <DocumentsList />;
}