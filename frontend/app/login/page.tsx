'use client'

import React, { useEffect } from 'react';
import {
  useRouter,
  useSearchParams
} from 'next/navigation';

import { getFollowingPathStr } from 'lib/utils/url';
import { useUser } from 'context/user';
import { AuthMagicCode } from 'components/auth-magic-code';
import { UserProfile } from 'types/user';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = getFollowingPathStr(searchParams, 'next=');
  const router = useRouter();
  const { user, setUser, loading } = useUser();

  useEffect(() => {
    if (user && !loading) {
      const defaultPath = '/docs';
      nextPath ? router.push(nextPath) : router.push(defaultPath);
    }
  }, [user, loading, nextPath, router]);

  const handleAuthSuccess = (userProfile: UserProfile) => {
    setUser(userProfile);
    
    if (nextPath) {
      router.push(nextPath);
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  // Only show login form if not authenticated
  if (user) return null;
  
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md px-4">
        <AuthMagicCode
          action="login"
          onSuccess={handleAuthSuccess}
          onError={handleAuthError}
        />
      </div>
    </div>
  );
}