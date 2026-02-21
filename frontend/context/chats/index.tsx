'use client';
import React, { useEffect, useState } from 'react';
import { BACKEND_URL } from '../../lib/constants';
import { makeRequest, STATUS } from '../../lib/utils/request';
import { Message as IMessage, ChatsContext as IMessagesContext } from '../../types/chat';
import { useSidebar } from '../sidebar';
import { useUser } from '../user';

// Context ref: https://nextjs.org/docs/getting-started/react-essentials#using-context-in-client-components
const ChatsContext = React.createContext<IMessagesContext | undefined>(undefined);

export function ChatsProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<IMessage[] | null>(null);
  const [selectedChat, setSelectedChat] = useState<IMessage | null>(null);
  // @ts-ignore
  // const { journey } = useSidebar();
  const { user } = useUser();

  useEffect(() => {
    if (!user || !user.is_attorney) {
      return;
    }
    getChats();
  }, [user]);

  const getChats = async () => {
    let url = `${BACKEND_URL}/messaging/recipients_latest_message/?user_profile_id=${user?.id}`;
    // TODO: Add journey filtering when implemented
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && Array.isArray(data)) {
      const chats = data as IMessage[];
      setChats(chats);
    }
  }

  return (
    <ChatsContext.Provider value={{ chats, setChats, selectedChat, setSelectedChat }}>
      {children}
    </ChatsContext.Provider>
  );
}

export function useChats() {
  const context = React.useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
}