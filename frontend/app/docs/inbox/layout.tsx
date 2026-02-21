import { ChatsProvider } from 'context/chats';
import { InboxSidebar } from 'components/inbox-sidebar';

export default async function MessagesLayout(
  props: {
    children: React.ReactNode
  }
) {
  const {
    children
  } = props;

  return (
    <ChatsProvider>
      <div className="flex flex-row flex-1 overflow-hidden">
        <InboxSidebar />
        {children}
      </div>
    </ChatsProvider>
  )
}