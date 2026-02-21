'use client';
import React, { use, useState, useEffect, useRef, useCallback } from "react"

import { ChatInput } from 'components/chat-input';
import Message from "../message";

import { useUser } from "../../context/user";
import { useChats } from "../../context/chats";

// import { Journey } from "../../types/journey";
import { UserProfile } from "../../types/user";
import { Message as IMessage } from "../../types/chat";
// import { Message as IMessage } from "lib/types/message";

import { createWebSocket, getSocketToken } from "../../lib/utils/socket";
import { makeRequest, STATUS } from "../../lib/utils/request";
import { BACKEND_URL } from "../../lib/constants";

import Action from "../message/action";
// import OfferCard from "../offer-card";
import { useWebSockets } from "../../context/web-sockets";
import { useSidebar } from "../../context/sidebar";

import { getCookie } from "../../lib/utils/request";


export function Chat({ name }: { name: string }) {
  const journey = null; // const { journey } = useSidebar();
  const { user }: { user: UserProfile | null } = useUser();
  const { chats, selectedChat } = useChats();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const { chatSocket, setChatSocket } = useWebSockets();
  const [input, setInput] = useState("");
  const [archived, setArchived] = useState(false); // indicates whether chat is archived

  const messagesRef = useRef(messages);
  const messagesEndRef = React.createRef() as React.RefObject<HTMLDivElement | null>;
  const chatSocketRef = useRef<WebSocket | null>(null); // used for cleanup

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messagesEndRef]);

  const createWebSocketHandler = useCallback(() => {
    return (e: any) => {
      const data = JSON.parse(e.data);
      setMessages(messages => [...messages, data as IMessage]);
    }
  }, []);

  const getMessages = useCallback(async (name: string) => {
    // change message back to its format before replacing spaces with underscores
    name = name.replace(/_/g, " ");

    // get recipient id
    const chat = chats?.find(chat => (chat.sender.full_name === name || chat.recipient.full_name === name));
    if (!chat) return;
    
    let recipient_id = chat.recipient.id;
    let recipient_journey_id = chat.recipient_journey_id;
    if (user?.id === chat.recipient.id) {
      recipient_id = chat.sender.id;
      recipient_journey_id = chat.sender_journey_id;
    }

    let url = `${BACKEND_URL}/messaging/recipient_messages/?recipient_id=${recipient_id}&user_profile_id=${user?.id}`;
    if (journey) {
      // url += `&journey_id=${journey.id}`;
    }
    if (recipient_journey_id) {
      url += `&recipient_journey_id=${recipient_journey_id}`;
    }
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && Array.isArray(data)) {
      const messages = data as IMessage[];
      setMessages(messages);
    }
  }, [user, journey, chats]);

  // Use refs to avoid stale closures resulting from ws callback: https://github.com/facebook/react/issues/16975#issuecomment-537178823
  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    getMessages(name);
  }, [name, journey, chats, getMessages]);

  useEffect(() => {
    if (!selectedChat) return;

    // initialize websocket connection
    async function initWebSocket() {
      const token = await getSocketToken();
      if (!token) {
        console.log('Failed to get socket token');
        return;
      }

      if (!selectedChat) return;

      // smallest id first
      let first = selectedChat.sender.id;
      let second = selectedChat.recipient.id;
      if (first > second) {
        [first, second] = [second, first];
      }
      let chatName = `${first}_${second}`;

      const newWebSocket = createWebSocket(chatName);

      // authenticate user
      // Note: since we send the initial ws handshake http request
      // to the heroku backend url directly (ws requests cannot be rerouted in next.js rewrites), 
      // it doesn't pass the sessionid and csrftoken cookies that are set for www.withkoya.com
      // so we need to authenticate the user by sending a custom token for establishing the ws connection
      
      // Hopefully, next.js will support ws rewrites in the future so we won't have to do this
      // since the request will be on the same domain and the cookies will carry over
      // Otherwise, research more about setting up an nginx reverse proxy as a solution in the future
      newWebSocket.onopen = () => {
        const message = { token };
        newWebSocket.send(JSON.stringify(message));
      };

      newWebSocket.onmessage = createWebSocketHandler();
      // reconnect on timeout
      newWebSocket.onclose = function(e) {
        console.log('Chat socket closed unexpectedly!!');
        reconnectTimeoutId = window.setTimeout(() => initWebSocket(), 5000); // try to reconnect
      };
      setChatSocket(newWebSocket);
      chatSocketRef.current = newWebSocket; // used for cleanup
    }

    let reconnectTimeoutId: number | undefined = undefined;
    initWebSocket();

    // cleanup
    return () => {
      // close websocket connection when component unmounts
      if (chatSocketRef.current) {
        chatSocketRef.current.onclose = null; // remove onclose handler first
        if (chatSocketRef.current.readyState === WebSocket.OPEN) {
          chatSocketRef.current.close();
        }
      }
      setChatSocket(null);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    };
  }, [selectedChat, setChatSocket, createWebSocketHandler]);

  const handleSubmit = (e: any) => {
    // e.preventDefault();
    if (!chatSocket || !journey) {
      // TODO: show error
      return;
    }

    // send message to ws server
    const message = { content: input };
    chatSocket.send(JSON.stringify(message));

    // clear input
    setInput("");
  }

  const getMessageContent = (content: any) => {
    if (typeof content === 'string') return content;
    switch(content.data.element) {
      case 'text':
        return content.data.text;
      case 'action':
        return <Action data={content.data} customCSS={''}/>
      case 'offer':
        return (
        <>
          <Action data={content.data} customCSS={'mb-4'}/>
          {/* <OfferCard offer={content.data.offer} includeStatus={false} /> */}
        </>
        )
    }
  }

  // TODO: look into combining this with the chat component
  return (
    <div className={`flex flex-col flex-1 justify-end my-5 ml-7`}>
      <div className={`overflow-y-scroll pr-7 pt-5`}>
        { 
          messages?.map(msg => (
            <Message
              content={getMessageContent(msg.content)} 
              type={user?.id === msg.sender.id ? 'sent' : 'received'} 
              timestamp={msg.timestamp}
              key={msg.timestamp}
            />
          ))
        }
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        placeholder={!archived ? "Type a message..." : "This chat is archived"}
        disabled={archived}
        value={input}
        onChange={(e: any) => setInput(e.target.value)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}