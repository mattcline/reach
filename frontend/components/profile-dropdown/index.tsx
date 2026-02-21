'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { capitalizeFirstLetter } from 'lib/utils/text';
import { useUser } from 'context/user';
import { Button } from 'components/ui/button';
import { BACKEND_URL } from 'lib/constants';
import { makeRequest } from 'lib/utils/request';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'components/ui/dropdown-menu';
import { Avatar } from 'components/avatar';

export function ProfileDropdown({ color }: { color?: string }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const { user, clearUser, loading: userLoading } = useUser();

  const handleLogout = async () => {
    try {
      await makeRequest({
        url: `${BACKEND_URL}/logout/`,
        method: 'POST',
        accept: 'application/json'
      });
      clearUser();
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  function getItem(name: string, url: string) {
    return (
      <DropdownMenuItem key={name} asChild>
        <Link href={url}>{capitalizeFirstLetter(name)}</Link>
      </DropdownMenuItem>
    )
  }

  if (!user) {
    if (userLoading) return null;
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push('/login')}
        >
          Continue with email
          <ArrowRight />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-row">
      {/* <AppGrid /> */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-1">
            <Avatar
              user={{
                first_name: user.first_name,
                email: user.email,
                last_name: user.last_name,
                color
              }}
              // user={document.users.find(user => user.id === user.id)}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {getItem('account', '/account')}
          <DropdownMenuItem onClick={handleLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}