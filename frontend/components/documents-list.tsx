'use client';

import { useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  CircleUserRound,
  Bell
} from 'lucide-react';

import { getDateStr } from 'lib/utils/date';
import { convertCharToSpacesAndCapitalize } from 'lib/utils/text';
import { useDocuments } from 'context/documents';
import { Button } from 'components/ui/button';
import { MyDataTable } from 'components/my-data-table';
import { DocumentRow } from 'components/my-data-table/document-row';
import { DocumentHead } from 'types/document';

export function DocumentsList() {
  const { documents, createDocument, loading } = useDocuments();

  const columns: ColumnDef<DocumentHead>[] = [
    {
      accessorKey: "expand",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-center"><ChevronDown className={`${row.getIsExpanded() && 'rotate-[-180deg]'} transition-all`} /></div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <div>{ row.original.document.title }</div>,
    },
    {
      accessorKey: "recipient_name",
      header: () => <CircleUserRound size={17} />,
      cell: ({ row }) => <div>{ row.original.recipient_name }</div>,
    },
    // {
    //   accessorKey: "status",
    //   header: "Status",
    //   cell: ({ row }) => (
    //     <div className="capitalize">{convertCharToSpacesAndCapitalize(row.original.document.actions[0]?.type, "_")}</div>
    //   ),
    // },
    {
      accessorKey: "date_submitted",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={async () => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown size={17}/>
          </Button>
        )
      },
      cell: ({ row }) => <div>{getDateStr(row.original.document.actions[0]?.timestamp)}</div>,
    }
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col flex-1 items-center max-h-screen overflow-scroll">
        <div className="flex flex-1 flex-col justify-start mt-5 px-5 w-2/3">
          <MyDataTable
            data={documents}
            loading={loading}
            columns={columns}
            RowComponent={DocumentRow}
            onCreate={createDocument}
          />
        </div>
      </div>
    </div>
  )
}