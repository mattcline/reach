'use client';

import React, { useEffect } from 'react';
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from 'components/ui/input-otp';
import { Button } from 'components/ui/button';

interface MagicCodeInputProps {
  onComplete: (code: string) => void;
  onResend?: () => void;
  isLoading?: boolean;
  error?: string;
  resendCooldown?: number;
  email?: string;
}

export function MagicCodeInput({ 
  onComplete, 
  onResend, 
  isLoading = false, 
  error,
  resendCooldown = 0,
  email
}: MagicCodeInputProps) {
  const [value, setValue] = React.useState("");
  
  useEffect(() => {
    if (value.length === 6 && !isLoading) {
      onComplete(value);
    }
  }, [value, onComplete, isLoading]);
  
  return (
    <div className="flex flex-col space-y-4 items-center">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-600">
          Enter the 6-digit code sent to {email ? <span className="font-medium">{email}</span> : 'your email'}
        </p>
      </div>
      
      <InputOTP
        maxLength={6}
        value={value}
        onChange={setValue}
        disabled={isLoading}
      >
        <InputOTPGroup className="flex justify-center">
          <InputOTPSlot index={0} className="w-10 h-12" />
          <InputOTPSlot index={1} className="w-10 h-12" />
          <InputOTPSlot index={2} className="w-10 h-12" />
          <InputOTPSlot index={3} className="w-10 h-12" />
          <InputOTPSlot index={4} className="w-10 h-12" />
          <InputOTPSlot index={5} className="w-10 h-12" />
        </InputOTPGroup>
      </InputOTP>
      
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      
      {onResend && (
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResend}
            disabled={isLoading || resendCooldown > 0}
            className="text-sm"
          >
            {resendCooldown > 0 
              ? `Resend code in ${resendCooldown}s` 
              : 'Resend code'}
          </Button>
        </div>
      )}
    </div>
  );
}