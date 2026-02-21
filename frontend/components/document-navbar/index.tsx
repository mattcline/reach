'use client';

import { useState, useEffect } from 'react';

import { useRouter, useParams } from 'next/navigation';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import * as Y from 'yjs';
import {
  History,
  Lock,
  UserSearch,
  Users,
  Sun,
  FileClock,
  FileLock2,
  Files
} from 'lucide-react';

import { makeRequest, STATUS } from 'lib/utils/request';
import { useUser } from 'context/user';
import { useDocuments } from 'context/documents';
import { useDocument } from 'context/document';
import { useDialog } from 'context/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Skeleton } from 'components/ui/skeleton';
import { Badge } from 'components/ui/badge';
// import { DocumentsButton } from 'components/document-navbar/documents-button';
import { StartReviewDialog } from 'components/start-review-dialog';
import { ShareDialog } from 'components/share-dialog';
import { ProfileDropdown } from 'components/profile-dropdown';
import { ImportPlugin } from 'components/editor/plugins/toolbar/import';
import { DownloadPlugin } from 'components/editor/plugins/toolbar/download';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from 'components/ui/hover-card';
import { Avatar } from 'components/avatar';
import { ModeToggle } from 'components/mode-toggle';

export function DocumentNavbar() {
  const router = useRouter();
  const params = useParams();

  const { user } = useUser();
  const { getDocuments, documents } = useDocuments();
  const { doc, updateDoc, activeUsers } = useDocument();
  const { setDialog } = useDialog();

  const collabContext = useCollaborationContext();
  const {
    yjsDocMap
  } = collabContext;

  const [title, setTitle] = useState<string>('');

  function onValueChange(value: string) {
    router.replace(`/docs/${value}`, { scroll: false });
  }

  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
  }, [doc]);

  // look into making select a loading bar when navigating to new document
  const versionSelect = (
    <Select
      key="persistent-select"
      value={Array.isArray(params.id) ? params.id[0] : params.id}
      onValueChange={onValueChange}
    >
      <SelectTrigger className="dark:bg-transparent dark:hover:bg-input/30">
        <SelectValue placeholder="Loading..."/>
      </SelectTrigger>
      <SelectContent>
        { documents.filter(document => document.document.root === doc?.root)[0]?.history.map((d: any) => <SelectItem className="dark:hover:bg-input/10 dark:focus:bg-accent/50" key={d.id} value={d.id}>{ d.title.includes('Review') ? <>Review<Badge variant="destructive">Private</Badge></> : <>Main<Badge variant="secondary">Shared</Badge></>}</SelectItem>) }
        {/* { versions.map((d: any) => <SelectItem key={d.id} value={d.id}>{ d.id }</SelectItem>) } */}
        {/* <SelectGroup>
          <SelectLabel>June 13, 2025</SelectLabel>
          <SelectItem value="estt">v2<Badge variant="outline" className="bg-blue-500 text-white dark:bg-blue-600"><BadgeCheckIcon />Reviewed</Badge></SelectItem>
          <SelectItem value="">v2</SelectItem>
        </SelectGroup> */}
        {/* <SelectGroup>
          <SelectLabel>June 12, 2025</SelectLabel>
          <SelectItem value="">Review<Badge variant="destructive">Private</Badge></SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>June 11, 2025</SelectLabel>
          <SelectItem value="">Main<Badge>Shared</Badge></SelectItem>
          <SelectItem value="">Main</SelectItem>
        </SelectGroup> */}
      </SelectContent>
    </Select>
  )
  // : <Skeleton className="h-[20px] w-[100px] rounded-full" />;

  function startReviewHandleSubmit(data: any, status: any) {
    if (status !== STATUS.HTTP_201_CREATED) return; // TODO: add error handling

    getDocuments(); // refresh documents for version select

    // clone doc
    const yDoc = doc?.id ? yjsDocMap.get(doc.id) : undefined;
    if (yDoc) {
      const update = Y.encodeStateAsUpdate(yDoc);
      // Store temporarily
      sessionStorage.setItem('pendingDocState', JSON.stringify({
        id: data.id,
        state: Array.from(update)
      }));
    }

    // send invite to reviewer

    // show a sonner

    // navigate
    if (status === STATUS.HTTP_201_CREATED && typeof data === 'object') {
      const document = data as any;
      setTimeout(() => {
        router.push(`/docs/${document.id}`);
      }, 1000);
    }
  }

  // if (!doc) return null;
  // bg-background sticky top-0 z-50 w-full
  return (
    <nav className="flex flex-col items-start my-5 mx-4">
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex flex-row gap-2.5 items-center">
          <Button
            variant="secondary"
            Icon={Files}
            hoverText="Documents"
            onClick={async () => router.push(`/docs`)}
          />
          {/* <GitCommitVertical />
          <GalleryVerticalEnd />
          <FileClock />
          <FolderClock /> */}
          <Input
            className="dark:bg-transparent w-55"
            value={title}
            onChange={(e: any) => {
              setTitle(e.target.value);
              // @ts-ignore
              updateDoc(doc?.id, {title: e.target.value});
            }}
          />
          { versionSelect }
          {/* <Button variant="ghost" Icon={Lock}></Button> */}
          {/* <Button variant="ghost"><History /></Button> */}
          <ImportPlugin />
          <DownloadPlugin />
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="flex gap-1">
            {activeUsers.map((activeUser: any) => {
              if (activeUser.email && activeUser.email !== user?.email) {
                return (
                  <HoverCard key={activeUser.email}>
                    <HoverCardTrigger>
                      <Avatar key={activeUser.id} user={activeUser} />
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <div>{''}</div>
                      <div>{activeUser.email}</div>
                    </HoverCardContent>
                  </HoverCard>
                )
              }
          })}
          </div>
          <Button
            Icon={Users}
            variant="secondary"
            // @ts-ignore
            onClick={async () => setDialog(<ShareDialog documentId={doc?.id} />)}
          >
            Share
          </Button>
          <Button
            Icon={FileLock2}
            variant="outline"
            onClick={async () => setDialog(
              <StartReviewDialog
                doc={doc}
                onSubmit={startReviewHandleSubmit}
              />
            )}
          >
            Start a Private Review
          </Button>
          <ModeToggle />
          <ProfileDropdown color={'green'} />
          {/* color={document.user.color} */}
        </div>
      </div>
    </nav>
  );
}