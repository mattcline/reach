'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileCheck2,
  FileInput,
  FilePlus,
  LucideProps,
  XCircle,
  CircleCheckBig,
  RotateCcw,
  ClipboardCheck,
  Trash
} from 'lucide-react';
import { type VariantProps } from 'class-variance-authority';
import { toast } from 'sonner';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';
import { useDialog } from 'context/dialog';
import { buttonVariants } from 'components/ui/button';
import { ConfirmDialog } from 'components/confirm-dialog';
import { SubmitOfferDialog } from 'components/submit-offer-dialog';
import { Document, DocumentHead } from 'types/document';

type ActionData = {
  pastTense: string;
  Icon: React.ComponentType<LucideProps>;
  hoverText?: string;
  fn: (id: string) => Promise<void>;
  disableLoading?: boolean;
  confirm: boolean;
} & VariantProps<typeof buttonVariants>;

interface DocumentsContext {
  documents: DocumentHead[];
  getDocuments: () => void;
  getDocument: (id: string) => void;
  createDocument: (propertyId?: string) => void;
  loading: boolean;
  getActionData: (type: string) => ActionData;
  onDownload: (id: string) => Promise<void>;
  confirmAction: (action: string, id: string) => Promise<void>;
  versions: any;
  setVersions: any;
}

const DocumentsContext = React.createContext<DocumentsContext | undefined>(undefined);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setDialog } = useDialog();
  const [documents, setDocuments] = useState<DocumentHead[]>([]);
  const [loading, setLoading] = useState(true);

  // used to keep track of the versions for the currently selected document if there is one
  // so that the select persists upon rerouting to a different document version in the
  // navbar select
  const [versions, setVersions] = useState<Document[]>([]);

  useEffect(() => {
    getDocuments();
  }, []);

  async function getDocuments() {
    const url = `${BACKEND_URL}/documents/`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && Array.isArray(data)) {
      const documents = data as DocumentHead[];
      setDocuments(documents);
      setLoading(false);
    }
  }

  async function getDocument(id: string) {
    const url = `${BACKEND_URL}/documents/${id}/history/`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
      const document = data as DocumentHead;

      // update the document in the list of documents
      setDocuments(documents.map((d) => d.document.id === document.document.id ? document : d));
    }
  }

  async function createDocument(propertyId?: string, rootId?: string) {
    const url = `${BACKEND_URL}/documents/`;

    const { data, status } = await makeRequest({ 
      url,
      method: 'POST',
      body: {
        title: "Purchase Agreement",
        ...(propertyId && { property: propertyId }),
        ...(rootId && { root: rootId })
      },
      accept: 'application/json'
    });

    if (status === STATUS.HTTP_201_CREATED && typeof data === 'object') {
      const document = data as Document;
      router.push(`/docs/${document.id}`);
    }
  }

  function getActionData(type: string): ActionData {
    // Handle null/undefined type
    if (!type) {
      console.error('Action type is null or undefined');
      return {
        pastTense: 'performed action',
        Icon: FilePlus,
        variant: 'outline',
        fn: async () => {},
        disableLoading: false,
        confirm: false
      };
    }
    
    const ACTION_DATA: Record<string, any> = {
      'create': {
        pastTense: 'created a draft',
        Icon: FilePlus,
        variant: 'outline',
        fn: async () => {},
        confirm: false
      },
      'counter': {
        pastTense: 'countered',
        Icon: RotateCcw,
        variant: 'default',
        fn: onCounter,
        confirm: false
      },
      'review': {
        pastTense: 'created a review',
        Icon: FilePlus,
        variant: 'outline',
        fn: async () => {}, // TODO: call Document.create_copy() in the backend
        confirm: false
      },
      'delete': {
        pastTense: 'deleted',
        Icon: Trash,
        variant: 'outline',
        fn: onDelete,
        confirm: true
      },
      'submit': {
        pastTense: 'submitted an offer',
        Icon: FileInput,
        variant: 'outline',
        fn: onSubmit,
        confirm: false
      },
      'share': {
        pastTense: 'shared the document',
        Icon: FileInput,
        variant: 'outline',
        fn: async () => {},
        confirm: false
      },
      'request_review': {
        pastTense: 'requested a review',
        Icon: ClipboardCheck,
        variant: 'outline',
        fn: onRequestReview,
        confirm: false
      },
      'accept': {
        pastTense: 'accepted',
        Icon: CircleCheckBig,
        variant: 'success',
        fn: onAccept,
        confirm: true
      },
      'decline': {
        pastTense: 'declined',
        Icon: XCircle,
        variant: 'destructive',
        fn: onDecline,
        confirm: true
      },
      'sign': {
        pastTense: 'signed',
        Icon: FileCheck2,
        variant: 'outline',
        fn: async () => {},
        confirm: false
      }
    } as Record<string, ActionData>;

    const data = ACTION_DATA[type];
    if (!data) {
      console.error(`Unknown action type: ${type}`);
      return {
        pastTense: 'performed action',
        Icon: FilePlus,
        variant: 'outline',
        fn: async () => {},
        disableLoading: false,
        confirm: false
      };
    }
    
    // Defensive check for confirm property
    if (!('confirm' in data)) {
      console.error(`Action type '${type}' is missing the 'confirm' property`);
    }
    
    return { 
      ...data,
      disableLoading: Boolean(data.confirm) || type === 'submit'
    };
  }

  /**
   * Downloads a document as a PDF.
   *
   * @param {string} id - The ID of the document to download.
   */
  async function onDownload(id: string) {
    const url = await getPDFDownloadUrl(id);
    if (!url) return;
    // download the PDF as an attachment
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Retrieves a presigned URL for downloading a document as a PDF.
   *
   * @param {string} id - The ID of the document.
   * @returns {Promise<string | null>} A promise that resolves to a string representing the presigned URL for downloading the document.
   */
  async function getPDFDownloadUrl(id: string): Promise<string | null> {
    const url = `${BACKEND_URL}/documents/${id}/download_url`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });

    if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
      const presignedURL = (data as { url: string }).url;
      return presignedURL;
    };
    return null;
  }

  /**
   * Opens a dialog asking the user to confirm an action before doing so.
   * 
   * @param action the action to perform
   * @param id the id of the document to perform the action on
   */
  async function confirmAction(
    action: string,
    id: string
  ): Promise<void> {
    const { pastTense, fn } = getActionData(action);

    return new Promise((resolve) => {
      setDialog(
        <ConfirmDialog
          action={action}
          description={
            new Set(['accept', 'decline']).has(action) ? 
            "Note: an email notification will be sent to the recipient." : undefined
          }
          toastMessage={`Offer ${pastTense}.`}
          onConfirm={async () => {
            await fn(id);
            resolve();
          }}
          onCancel={async () => resolve()}
        />
      );
    });
  }

  /**
   * Deletes an offer.
   * 
   * @param {string} id - id of the document to delete
   */
  async function onDelete(id: string) {
    const url = `${BACKEND_URL}/documents/${id}/`;
    const { data, status } = await makeRequest({ url, method: 'DELETE' });
    if (status === STATUS.HTTP_204_NO_CONTENT) {
      console.log("Deleted offer");
    }
  }

  /**
   * Submits an offer.
   * 
   * @param {string} id - id of the document to submit
   */
  async function onSubmit(id: string): Promise<void> {
    return new Promise((resolve) => {
      setDialog(
        <SubmitOfferDialog
          documentId={id}
          onSubmit={async () => resolve()}
          onCancel={async () => resolve()}
        />
      );
    });
  }

  /**
   * Accepts an offer.
   * 
   * @param {string} id - id of the document to accept
   */
  async function onAccept(id: string) {
    const url = `${BACKEND_URL}/documents/${id}/accept/`;
    const { data, status } = await makeRequest({
      url,
      method: 'POST',
      accept: 'application/json'
    });
  }

  /**
   * Declines an offer.
   * 
   * @param {string} id - id of the document to decline
   */
  async function onDecline(id: string) {
    const url = `${BACKEND_URL}/documents/${id}/decline/`;
    const { data, status } = await makeRequest({
      url,
      method: 'POST',
      accept: 'application/json'
    });
  }

  /**
   * Counters an offer.
   * 
   * @param {string} id - id of the document to counter
   */
  async function onCounter(id: string) {
    const url = `${BACKEND_URL}/documents/${id}/counter/`;
    const { data, status } = await makeRequest({
      url,
      method: 'POST',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK) {
      const { id } = data as { id: string };
      router.push(`/docs/${id}`);

      // allow redirect to complete before resetting the loading state on the button
      await new Promise((resolve) => window.setTimeout(resolve, 500));

      toast("Created new offer.");
    }
  }

  /**
   * Requests a review from an attorney.
   * 
   * @param {string} id - id of the document the user is requesting a review for
   */
  async function onRequestReview(id: string) {
    // TODO: navigate to payment dialog before calling the backend endpoint
    //  look into RequestReviewDialog to see what you can re-use from there
    const url = `${BACKEND_URL}/documents/${id}/request_review/`;
    const { data, status } = await makeRequest({
      url,
      method: 'POST',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK) {
      // TODO: display success tippy
    }
  }

  return (
    <DocumentsContext.Provider value={{ 
      documents,
      getDocuments,
      getDocument,
      createDocument,
      loading,
      getActionData,
      onDownload,
      confirmAction,
      versions,
      setVersions
    }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const context = React.useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
}