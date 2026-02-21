import { DocumentsProvider } from 'context/documents';

export default async function DocumentsLayout(
  props: {
    children: React.ReactNode
  }
) {
  const {
    children
  } = props;

  return (
    <DocumentsProvider>
      {children}
    </DocumentsProvider>
  )
}