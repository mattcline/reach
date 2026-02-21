import Image from 'next/image';

import { Input } from 'components/ui/input';

interface ChatInputProps {
  placeholder: string;
  value: string;
  onChange: (e: any) => void;
  onSubmit: (e: any) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  placeholder,
  value,
  onChange,
  onSubmit,
  disabled = false,
  className
}: ChatInputProps) {

  const handleChange = (e: any) => {
    onChange(e);
  }

  // TODO: look for another approach
  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      onSubmit(e);
    }
  }

  const sendBtn = (
    <div className={`min-w-[50px] group`} onClick={e => onSubmit(e)}>
      <Image
        height={48}
        width={48}
        src={`/send.png`}
        alt={'Send'}
        className={`p-2 focus:outline-hidden group-hover:hidden hover:cursor-pointer`}
      />
      <Image
        height={48}
        width={48}
        src={`/send_hover.png`}
        alt={'Send'}
        className={`p-2 focus:outline-hidden hidden group-hover:block hover:cursor-pointer`}
      />
    </div>
  );

  // TODO: sanitize input
  return (
    <div className="flex">
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`p-5 ${className}`}
      />
    </div>
  )
}