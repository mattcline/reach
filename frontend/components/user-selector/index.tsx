'use client';
import React, { useState, useEffect } from "react"
import { useUser } from "../../context/user";
import { UserProfile } from "../../types/user";
import { makeRequest, STATUS } from "../../lib/utils/request";
import { BACKEND_URL } from "../../lib/constants";

// selector for superusers to select and imitate a user
export function UserSelector() {
  const { user, imitatedUser, setImitatedUser } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const getUsers = async () => {
      if (!user || !user.is_superuser) return;
      const url = `${BACKEND_URL}/user_profiles/`;
      const { data, status } = await makeRequest({
        url,
        method: 'GET',
        accept: 'application/json'
      });
      if (status === STATUS.HTTP_200_OK && data && typeof data === 'object') {
        setUsers(data as UserProfile[]);
      }
    }
    
    getUsers();
  }, [user]);

  const handleClick = () => {
    setExpanded(!expanded);
  }

  const handleSelectUser = (user: UserProfile) => {
    setImitatedUser(user);
    setExpanded(false);
  }

  if (!user || !user.is_superuser) return null;
  return (
    <div className={`absolute bottom-10 right-10 items-end flex flex-col`}>
      { expanded && (
        <div className={`flex flex-col justify-center mb-3 overflow-y-scroll`}>
          {users.map((user: UserProfile) => (
            <div
              key={user.id}
              className={`flex flex-row mb-3`}
              onClick={() => handleSelectUser(user)}
            >
              {user.email}
            </div>
          ))}
        </div>
      )}
      <button onClick={handleClick}>
        {imitatedUser ? imitatedUser.email : user.email}
      </button>
    </div>
  )
}