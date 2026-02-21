'use client';

import React, { useState } from 'react';

interface IWebSocketsContext {
  chatSocket: WebSocket | null;
  setChatSocket: React.Dispatch<React.SetStateAction<WebSocket | null>>;
  agentSocket: WebSocket | null;
  setAgentSocket: React.Dispatch<React.SetStateAction<WebSocket | null>>;
  propertySearchSocket: WebSocket | null;
  setPropertySearchSocket: React.Dispatch<React.SetStateAction<WebSocket | null>>;
}

const WebSocketsContext = React.createContext<IWebSocketsContext | undefined>(undefined);

export function WebSocketsProvider({ children }: { children: React.ReactNode }) {
  const [agentSocket, setAgentSocket] = useState<WebSocket | null>(null); // used for agent messages
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null); // used for chat messages
  const [propertySearchSocket, setPropertySearchSocket] = useState<WebSocket | null>(null); // used for property searches

  return (
    <WebSocketsContext.Provider value={{ agentSocket, setAgentSocket, chatSocket, setChatSocket, propertySearchSocket, setPropertySearchSocket }}>
      {children}
    </WebSocketsContext.Provider>
  );
}

export function useWebSockets() {
  const context = React.useContext(WebSocketsContext);
  if (context === undefined) {
    throw new Error('useWebSockets must be used within a WebSocketsProvider');
  }
  return context;
}