'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { makeRequest, STATUS } from 'lib/utils/request';
import { BACKEND_URL } from 'lib/constants';
import { useSubscription } from 'lib/hooks/useSubscription';

import { Terms } from 'components/terms';

import { UserProfile } from 'types/user';
import { Subscription } from 'lib/types/billing';

interface Agreement {
  id: string;
  terms: Terms;
  user_profile: object;
  document?: string;
  date_signed: string;
}

interface UserContext {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  fetchUser: () => void;
  loading: boolean;
  agreements: Agreement[];
  getAgreements: () => void;
  agreementsLoaded: boolean;
  setAgreementsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  subscription: {
    data: Subscription | null;
    error: Error | null;
    loading: boolean;
    refresh: () => Promise<void>;
  };
  imitatedUser: UserProfile | null;
  setImitatedUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  clearUser: () => void;
}

const UserContext = React.createContext<UserContext | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const subscription = useSubscription();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  // in components that consume agreements, we need to hard-refresh the agreements
  // before taking any action so that we can perform any action on those agreements 
  // just once on the most updated data instead of taking duplicate actions 
  // (before and after agreements have been updated) when listening for agreements using useEffect().
  // agreementsLoaded is used to indicate when the agreements have been refreshed.
  const [agreementsLoaded, setAgreementsLoaded] = useState<boolean>(false);

  // used by a superuser to imitate a user 
  const [imitatedUser, setImitatedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  // user has just been set
  useEffect(() => {
    if (!user && !imitatedUser) return;
    getAgreements();
    subscription.refresh();
  }, [user, imitatedUser]);

  async function fetchUser() {
    if (!user || Object.keys(user).length === 0) {
      const url = `${BACKEND_URL}/users/`;
      try {
        const { data, status } = await makeRequest({
          url,
          method: 'GET',
          accept: 'application/json'
        });
        if (status === STATUS.HTTP_200_OK && data && typeof data === 'object') {
          const user = (data as { user_profile: object }).user_profile as UserProfile;
          setUser(user);
        }
      } catch (error) {
        // if there is not an authenticated user, a 401 response will be returned so ignore the error
      }
      setLoading(false);
    }
  }

  const clearUser = useCallback(() => {
    setUser(() => null);
    setAgreements(() => []);
    setAgreementsLoaded(() => false);
    setImitatedUser(() => null);
    subscription.clear();
  }, []);

  // updates the context with the user's agreements
  const getAgreements = async () => {
    const url = `${BACKEND_URL}/agreements/`;
    const { data, status } = await makeRequest({
      url,
      method: 'GET',
      accept: 'application/json'
    });
    if (status === STATUS.HTTP_200_OK && Array.isArray(data)) {
      const agreements = data as Agreement[];
      setAgreements(agreements);
    }
    setAgreementsLoaded(true);
  }
  
  return (
    <UserContext.Provider value={
      {
        user,
        setUser,
        fetchUser,
        loading,
        agreements,
        getAgreements,
        agreementsLoaded,
        setAgreementsLoaded,
        subscription,
        imitatedUser,
        setImitatedUser,
        clearUser
      }
    }>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}