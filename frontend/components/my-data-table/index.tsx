'use client';

import { useState, useEffect } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
  getExpandedRowModel,
  ExpandedState,
} from '@tanstack/react-table';
import { Loader2, Plus } from 'lucide-react';

import { Button } from 'components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';

interface DataTableProps<TData> {
  data: TData[];
  loading: boolean;
  columns: ColumnDef<TData>[];
  RowComponent?: React.ComponentType<{
    row: Row<TData>;
    columns: ColumnDef<TData>[];
    onClick: () => void;
  }> | null;
  onCreate: () => void;
}

export function MyDataTable<TData>({ 
  data,
  loading,
  columns,
  RowComponent,
  onCreate
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [onCreateLoading, setOnCreateLoading] = useState(false);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowCanExpand: (row) => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded: expanded
    },
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  })

  useEffect(() => {
    // if there is only one row, expand it
    if (data?.length === 1) {
      setExpanded({0: true});
    }
  }, [data]);

  async function handleCreate() {
    setOnCreateLoading(true);
    await onCreate();
    setOnCreateLoading(false);
  }

  return (
    <>
      <div className="my-4 w-[150px]">
        { onCreateLoading ? (
          <Button 
            variant="default"
            className="" 
            disabled
            disableLoading
          >
            <Loader2 size={20} className='mr-1 animate-spin' />
            New
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={handleCreate}
            className=""
            disableLoading
          >
            <Plus size={20} />
            New
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="overflow-scroll">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              RowComponent ? (
                <RowComponent
                  key={row.id}
                  row={row}
                  columns={columns}
                  onClick={() => setExpanded({[row.id]: !row.getIsExpanded()})}
                /> ) : (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                { loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "No results." }
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-end space-x-2 py-4">
          <span className="text-sm text-muted-foreground mr-2">
            Page{" "}
            <strong>{table.getState().pagination.pageIndex + 1}</strong> of {table.getPageCount()}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null }
    </>
  )
}