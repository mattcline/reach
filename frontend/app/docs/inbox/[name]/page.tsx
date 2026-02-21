'use client';

import { useEffect, use } from 'react';

import { useChats } from 'context/chats';
import { Chat } from 'components/chat';

export default function ChatPage(props: {
  params: Promise<{ id: string, name: string }>
}) {
  const params = use(props.params);

  // const { id, name } = params;
  const { chats, selectedChat, setSelectedChat } = useChats();

  useEffect(() => {
    if (selectedChat) return;

    // set selected chat name param in url
    // this is when user navigates directly to a chat in the url
    const name = params.name.replace(/_/g, " ");
    const chat = chats?.find(chat => (chat.sender.full_name === name || chat.recipient.full_name === name));
    if (chat) {
      setSelectedChat(chat);
    }
    
  }, [chats, params.name, selectedChat, setSelectedChat]);

  return <Chat name={params.name} />;
}