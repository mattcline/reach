import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  Cell
} from '@tanstack/react-table';
import { 
  Download
} from 'lucide-react';

import { getDateStr } from 'lib/utils/date';
import { convertCharToSpacesAndCapitalize } from 'lib/utils/text';
import { useUser } from 'context/user';
import { useDocuments } from 'context/documents';
import { Button } from 'components/ui/button';
import { Separator } from 'components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { Action, Document, DocumentHead } from 'types/document';

export function DocumentRow({ 
  row,
  columns,
  onClick
}: {
  row: Row<DocumentHead>,
  columns: ColumnDef<DocumentHead>[],
  onClick: () => void
}) {
  const router = useRouter();
  const { user } = useUser();
  const { getActionData, onDownload, getDocument, confirmAction, getDocuments } = useDocuments();

  function getDocumentAction({ type, timestamp, from_user }: Action) {
    const { pastTense, variant, Icon } = getActionData(type);
    return (
      <div className={`flex flex-row items-center space-x-3 px-4 py-2`} key={timestamp}>
        <div className="flex-shrink-0">
          <Icon
            className=""
            size={18} 
          />
        </div>
        <div className="flex flex-row items-center">
          <span className="text-sm">
            { from_user.id === user?.id ? (
              <span>You</span>
            ) : (
              <Button
                variant="link"
                className="text-blue-accent p-0 h-0 font-medium"
                onClick={async () => router.push(`inbox/${from_user.id}`)}
              >
                { from_user.full_name }
              </Button>
            )}
            <span className="ml-1">{ pastTense }</span>
            <span className="ml-1 opacity-50">
              on {getDateStr(timestamp)}
            </span>
          </span>
        </div>
      </div>
    )
  }

  function getDocumentCard(
    document: Document,
    includeSeparator: boolean = true,
    availableActions: string[] = []
  ) {
    return (
      <div key={document.id}>
        <div className={`border border-primary/25 rounded-lg py-4 px-4 ${availableActions?.length ? 'bg-card' : 'bg-card/25'}`}>
          <div className="flex flex-row flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={async () => router.push(`/docs/${document.id}`)}
              >
                Open
              </Button>
              { availableActions.map((action: string) => {
                const {
                  Icon,
                  hoverText,
                  fn,
                  disableLoading,
                  confirm,
                  variant
                } = getActionData(action);
                return (
                  <Button
                    key={action}
                    onClick={async () => {
                      if (confirm) {
                        await confirmAction(action, document.id);
                      } else {
                        await fn(document.id);
                      }

                      if (action !== 'delete') {
                        getDocument(document.id);
                      } else {
                        getDocuments();
                      }
                    }}
                    disableLoading={disableLoading}
                    variant={variant}
                    Icon={Icon}
                    hoverText={hoverText}
                  >
                    { convertCharToSpacesAndCapitalize(action, '_') }
                  </Button>
                )
              })}
            </div>
            {/* <Button
              Icon={Download}
              hoverText="Download"
              onClick={() => onDownload(document.id)}
              variant="outline"
              size="icon"
            /> */}
          </div>
          <Separator className="my-3" />
          {document.actions?.map((action: Action) => getDocumentAction(action))}
        </div>
        {includeSeparator && (
          <div className="flex flex-1 h-9 justify-center">
            <Separator orientation="vertical" className="bg-primary/25" />
          </div>
        )}
      </div>
    )
  }

  return (
    <React.Fragment key={row.id}>
      <TableRow
        key={row.original.document.id}
        onClick={onClick}
        className="hover:cursor-pointer"
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="py-4">
            {flexRender(
              cell.column.columnDef.cell,
              cell.getContext()
            )}
          </TableCell>
        ))}
      </TableRow>
      {row.getIsExpanded() && (
        <TableRow className="hover:bg-background bg-background">
          <TableCell
            colSpan={columns.length}
          >
            <div className="m-6">
              {row.original.history?.map((document: Document, idx: number) => (
                getDocumentCard(
                  document,
                  idx !== row.original.history.length - 1,
                  idx === 0 ? row.original.available_actions : []
                )
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  )
}