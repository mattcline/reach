'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { renderToString } from 'react-dom/server';

import { makeRequest, STATUS } from 'lib/utils/request';
import { BACKEND_URL } from 'lib/constants';
import { injectCSSIntoHTML } from 'lib/utils/html';
import { useUser } from 'context/user';
import { useDialog } from 'context/dialog';
import { useDocuments } from 'context/documents';
import { TermsDialog } from 'components/terms';
import { SelectInput } from 'components/form/form-field/select-input';
import { MultiCheckboxInput } from 'components/form/form-field/multi-checkbox-input';
import { Document as DocumentLite, DocumentText } from 'types/document';

export const DocumentType = {
  JSON: 'application/json',
  HTML: 'text/html',
  PDF: 'application/pdf'
} as const;

export interface Document extends DocumentLite {
  presigned_url: string;
  available_actions: string[];
  editable: boolean;
  content_type?: string;
  needs_migration?: boolean;
}

interface DocumentContext {
  doc: Document | null;
  setDoc: React.Dispatch<React.SetStateAction<Document | null>>;
  getDoc: (id: string) => void;
  updateDoc: (id: string, fields: object) => void;
  insertHtml: (data: DocumentText, save?: boolean) => void;
  saveContent: (content: string, type: typeof DocumentType.JSON | typeof DocumentType.HTML) => void;
  hasSignedTerms: boolean;
  setHasSignedTerms: React.Dispatch<React.SetStateAction<boolean>>;
  activeUsers: any;
  setActiveUsers: React.Dispatch<React.SetStateAction<any>>;
  visibleLayer?: string;
  allThreadProvidersSynced?: boolean;
}

const DocumentContext = React.createContext<DocumentContext | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { user, agreements, agreementsLoaded } = useUser();
  const { setDialog } = useDialog();
  const { getDocuments } = useDocuments();

  const [doc, setDoc] = useState<Document | null>(null);

  const [activeUsers, setActiveUsers] = useState([]);

  const [hasSignedTerms, setHasSignedTerms] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);

  const getDoc = useCallback(async (id: string) => {
    const url = `${BACKEND_URL}/documents/${id}/`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
      const doc = data as Document;
      setDoc(doc);
    }
  }, []);

  const updateDoc = async (id: string, fields: object) => {
    const url = `${BACKEND_URL}/documents/${id}/`;
    const { data, status } = await makeRequest({
      url,
      method: 'PATCH',
      body: fields,
      accept: 'application/json'
    });
  }

  useEffect(() => {
    if (doc && agreementsLoaded) {
      // check if user has signed the offer initiation terms
      const hasSignedTerms = agreements.some((agreement: any) => agreement.terms.name === 'offer_initiation' && agreement.document === doc.id);
      if (!hasSignedTerms) {
        // uncomment once AI is added
        // setDialog(
        //   <TermsDialog
        //     name="offer_initiation"
        //     documentId={doc.id}
        //     onSubmit={() => setHasSignedTerms(true)}
        //   />
        // );
        getDocuments(); // refresh documents in the background since a new document was added
      } else {
        setHasSignedTerms(true);
      }
    }
  }, [doc, agreementsLoaded, agreements]);

  /**
   * Uploads the document JSON content to S3.
   *
   * @param {string} content - A JSON or HTML string representing the document content.
   * @param {string} type - The content type of the document.
   */
  async function saveContent(
    content: string, 
    type: typeof DocumentType.JSON | typeof DocumentType.HTML
  ): Promise<{ data: any, status: number } | undefined> {
    if (!doc) return;
  
    try {
      // get the presigned url
      const { data, status } = await makeRequest({
        url: `${BACKEND_URL}/documents/${doc.id}/`,
        method: 'PUT',
        body: {
          content_type: type
        },
        accept: 'application/json'
      });

      if (status === STATUS.HTTP_200_OK && typeof data === 'string') {
        const presignedUrl = data as string;

        if (type === DocumentType.HTML) {
          content = await injectCSSIntoHTML(content, '/editor-theme.css');
        }
        
        // upload to S3 - use fetch directly, not makeRequest
        // S3 presigned URLs don't accept custom headers like CSRF tokens
        const s3Response = await fetch(presignedUrl, {
          method: 'PUT',
          body: content,
          headers: {
            'Content-Type': type
          }
          // Don't include credentials or CSRF token for S3
        });
        
        if (!s3Response.ok) {
          throw new Error(`Failed to upload to S3: ${s3Response.status}`);
        }
        
        return { data: null, status: s3Response.status };
      } else {
        throw new Error(`Failed to get presigned url: ${status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  function buildInnerHTML(data: DocumentText) {
    const { id, content, order, field_type: fieldType, choices } = data;
    const orderEl = order ? `<span id="${id}-order" class="mr-1">${order}</span>` : '';

    // return early if no choices
    if (choices === undefined) return `${orderEl}${content}`;

    if (fieldType === 'select') {
      // find {select} placeholder in context and replace with select element
      const selectEl = <SelectInput name={id} choices={choices} />;
      return `${orderEl}${content.replace("{select}", '')}${renderToString(selectEl)}`;
    }

    if (fieldType === 'multi-checkbox') {
      // find {multi-checkbox} placeholder in context and replace with multi-checkbox element
      const multiCheckboxEl = <MultiCheckboxInput name={id} choices={choices} />;
      return `${orderEl}${content.replace("{multi-checkbox}", '')}${renderToString(multiCheckboxEl)}`;
    }

    return `${orderEl}${content}`;
  }

  const StepTypeToHtmlData: {
    [key: string]: {
      element: string;
      className: string;
    }
  } = {
    title: {
      element: 'h1',
      className: 'text-2xl my-5 flex justify-center'
    },
    text: {
      element: 'p',
      className: 'p-2 relative group pr-12'
    }
  };

  function buildHTML(data: DocumentText) {
    const { id, content, type, indent, order } = data;
  
    const { element, className } = StepTypeToHtmlData[type];

    return (
      `<${element} ` +
        `id="${id}" ` +
        `class="${className}" ` +
        `style="${indent ? `margin-left: ${indent}rem` : ''}" ` +
        `data-type="${type}"` +
      `>` +
        `${buildInnerHTML(data)}` +
      `</${element}>`
    );
  }

  function insertHtml(data: DocumentText, saveChange: boolean = false) {
    if (!docRef.current) return;

    const { id } = data;

    // Find the element with the specified id
    const elementToReplace = docRef.current.querySelector(`[id="${id}"]`);

    // we want to update the existing element if it exists for when user responds to a question prompting input
    if (elementToReplace) {
      // Replace the content of the found element with the new HTML
      elementToReplace.innerHTML = buildInnerHTML(data);
    } else {
      // If the element with the specified ID is not found, add the new HTML at the end of the original HTML
      docRef.current.insertAdjacentHTML('beforeend', buildHTML(data));

      // focus on the new element
      const paragraphs = docRef.current.querySelectorAll('p');
      const lastP = paragraphs[paragraphs.length - 1];
      if (lastP) {
        lastP.scrollIntoView({ behavior: 'smooth'});
      }
    }

    // TODO: fix, now that save requires an argument
    // if (saveChange) saveContent();
  }

  return (
    <DocumentContext.Provider value={{ 
      doc,
      setDoc,
      getDoc,
      updateDoc,
      insertHtml,
      saveContent,
      hasSignedTerms,
      setHasSignedTerms,
      activeUsers,
      setActiveUsers,
      visibleLayer: 'base', // Default visible layer
      allThreadProvidersSynced: true // Default synced state
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocument() {
  const context = React.useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}