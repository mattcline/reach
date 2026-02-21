import React from 'react';

interface AuthenticationRequiredProps {
  message?: string;
}

export function AuthenticationRequired({
  message = "Please log in to continue."
}: AuthenticationRequiredProps) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}