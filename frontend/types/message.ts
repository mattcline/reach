
// TODO: instead of having two different fields 'type' and 'sender_id' for different types of messages (i.e. messages between user + bot and messages between user + user), 
//   we could separate it into two message types
export interface Message {
  content: any; // could be a str or an obj
  type?: string; // used for bot messages either 'human' or 'ai'
  sender_id?: string; // used for direct messages to determine if message has type 'sent' or 'received'
  timestamp?: string;
  requires_response?: boolean; // used for bot messages to determine if message requires a response via input field
  justification?: string; // plain-text explanation shown in the callout
  diffState?: string; // serialized LexicalComposer editor state for the diff preview
  pendingChanges?: string; // raw JSON from backend; cleared after Accept/Reject
}