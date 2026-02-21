import { Message as IMessage } from 'types/message';

export default function Message({ content, type, timestamp }: IMessage) {
  const sent = type === 'sent'
  const sentClass = `bg-accent/50 px-4 py-3 rounded-xl self-end`;
  if (!content) return null;
  return (
    <div className={`my-1.5 wrap-anywhere ${sent ? sentClass : 'flex-1 self-start'} ${content === '...' && 'text-purple-500'}`}>
      {content}
      {/* {timestamp && <div className={`text-slate-400 text-xs mt-1.5`}>{getDateAndTimeStr(timestamp)}</div>} */}
    </div>
  )
}