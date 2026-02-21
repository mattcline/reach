import {
  Avatar as UIAvatar,
  AvatarFallback,
  AvatarImage
} from 'components/ui/avatar';

export function Avatar({ user }: { user: any }) {
  return (
    <UIAvatar>
      <AvatarImage src={user.photo_url} alt="@shadcn" />
      <AvatarFallback
        className={`${user.twColor} border-2`}
      >
        { user.first_name?.length > 0 ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase() }
      </AvatarFallback>
    </UIAvatar>
  )
}