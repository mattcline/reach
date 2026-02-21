import { UserProfile } from './user';

// TODO: reconcile this with the message type in message.ts
export interface Message {
  id: string;
  sender: UserProfile;
  recipient: UserProfile;
  sender_journey_id: string;
  recipient_journey_id: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// a chat is represented as the latest message between two users
export interface ChatsContext {
  chats: Message[] | null;
  setChats: (chats: Message[]) => void;
  selectedChat: Message | null;
  setSelectedChat: (chat: Message) => void;
}