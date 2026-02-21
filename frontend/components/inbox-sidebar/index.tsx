'use client';

import Link from 'next/link';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarInput,
} from "../ui/sidebar"
import { Label } from "../ui/label"
import { Button } from "../ui/button"

import { useChats } from '../../context/chats';
import { Message as IMessage } from "../../types/chat";
import { useUser } from '../../context/user';

import { getDateAndTimeStr } from '../../lib/utils/date';
import { useRouter } from 'next/navigation';

import { useState } from 'react';

import { makeRequest, STATUS } from '../../lib/utils/request';
import { BACKEND_URL } from '../../lib/constants';
import { useSidebar } from '../../context/sidebar';


// TODO: might want to refactor this to a component called 'SecondarySidebar' or something
export function InboxSidebar() {
  const { chats, setChats, selectedChat, setSelectedChat } = useChats();
  const { user } = useUser();
  const router = useRouter();
  // @ts-ignore
  // const { journey } = useSidebar();

  function getRecipientName(chat: IMessage) {
    // get recipient because the logged in user 
    // could be either the sender or recipient
    let name = chat.recipient.full_name;
    if (user?.id === chat.recipient.id) {
      name = chat.sender.full_name;
    }
    return name;
  }

  function selectChat(chat: IMessage) {
    if (!chats) return;

    setSelectedChat(chat);

    // mark chat as read and call setChats to update the state
    // of the chats context
    if (!chat.read && user?.id === chat.recipient.id) {
      chat.read = true;

      // replace chat with updated chat
      const updatedChats = chats?.map((c: IMessage) => {
        if (c.id === chat.id) {
          return chat;
        }
        return c;
      });

      setChats(updatedChats);

      markAsRead(chat); // mark as read in the db
    }

    const recipientName = getRecipientName(chat);
    router.push(`/inbox/${recipientName.replace(/ /g,"_")}`);
  }

  async function markAsRead(chat: IMessage) {
    const url = `${BACKEND_URL}/messaging/${chat.id}/`;
    const { data, status } = await makeRequest({
      url: url,
      method: 'PATCH',
      body: { read: true },
      accept: 'application/json'
    });
    // if (status === STATUS.HTTP_200_OK) {
    //   // console.log(`Marked chat ${chat.id} as read`);
    // }
  }

  function getChatLink(chat: IMessage) {
    const recipientName = getRecipientName(chat);
    return (
      <div 
        className={`${selectedChat?.id === chat.id && 'bg-sidebar-accent text-sidebar-accent-foreground'} flex flex-row items-center relative`}
        key={recipientName}
      >
        {(!chat.read && user?.id === chat.recipient.id) && <div className="w-2 h-2 ml-1.5 bg-blue-500 rounded-full absolute left-0"></div>}
        <div
          className="flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 pl-5 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground overflow-clip hover:cursor-pointer"
          onClick={() => selectChat(chat)}
        >
          <div className="flex w-full items-center gap-2">
            <span>{recipientName}</span>{" "}
            {/* <span className="ml-auto text-xs">{getDateAndTimeStr(chat.timestamp)}</span> */}
          </div>
          <span className="font-medium">{chat.content}</span>
          <span className="line-clamp-2 w-[260px] whitespace-break-spaces text-xs">
            {getDateAndTimeStr(chat.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="gap-3.5 border-b p-4">
        {/* <div className="flex w-full items-center justify-between">
          <div className="text-base font-medium text-foreground">
            {'activeItem.title'}
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <span>Unreads</span>
            <Switch className="shadow-none" />
          </Label>
        </div> */}
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {chats?.map((chat: IMessage) => getChatLink(chat))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
