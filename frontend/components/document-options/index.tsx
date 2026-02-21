import React, { useEffect, useState } from 'react';
import { Download, Ellipsis } from 'lucide-react';

import { convertCharToSpacesAndCapitalize } from 'lib/utils/text';
import { useDocument } from 'context/document';
import { useDocuments } from 'context/documents';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';
import { Button } from 'components/ui/button';

export function DocumentOptions() {
  const { doc, getDoc } = useDocument();
  const { getDocuments, getActionData, onDownload, confirmAction } = useDocuments();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // save document when user opens the dropdown
    // and is about to perform an action
    if (open) {
      // save();
    }
  }, [open]);

  function getMenuItem(action: string) {
    if (!doc) return null;
    const { Icon, fn, disableLoading, confirm } = getActionData(action);
    return (
      <div
        key={action}
      >
        <Button
          className="p-5 w-full justify-start"
          onClick={async () => {
            if (disableLoading) {
              setOpen(false);
            }

            if (confirm) {
              await confirmAction(action, doc.id);
            } else {
              await fn(doc.id);
            }

            getDoc(doc.id); // refresh document i.e. editability
            getDocuments(); // refresh documents in the background

            if (!disableLoading) {
              setOpen(false);
              // allow dropdown to close before resetting the loading state on the button
              await new Promise((resolve) => window.setTimeout(resolve, 500));
            }
          }}
          disableLoading={disableLoading}
          variant="ghost"
          Icon={Icon}
        >
          { convertCharToSpacesAndCapitalize(action, '_') }
        </Button>
      </div>
    )
  }

  if (!doc) return;
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
    >
      <DropdownMenuTrigger asChild>
        <Ellipsis
          size={30}
          className="hover:cursor-pointer"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-neutral-900"
      >
        {doc?.available_actions.map((s: string) => (
          getMenuItem(s)
        ))}
        <div
          key="download"
        >
          <Button
            className="p-5 w-full justify-start"
            onClick={async () => {
              await onDownload(doc.id);
              setOpen(false);
              // allow dropdown to close before resetting the loading state on the button
              await new Promise((resolve) => window.setTimeout(resolve, 500));
            }}
            variant="ghost"
            Icon={Download}
          >
            Download PDF
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}