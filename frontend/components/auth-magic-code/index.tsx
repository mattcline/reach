'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { 
  requestMagicCode, 
  verifyMagicCode, 
  resendMagicCode 
} from 'lib/api/magic-code';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { MagicCodeInput } from 'components/magic-code-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { 
  AuthAction, 
  AuthenticationResponse,
  MagicCodeRequest,
  MagicCodeVerifyRequest 
} from 'types/auth';
import { UserProfile } from 'types/user';

interface AuthMagicCodeProps {
  action: AuthAction;
  onSuccess?: (userProfile: UserProfile) => void;
  onError?: (error: string) => void;
}

type FormStep = 'email' | 'code' | 'profile';

interface EmailFormData {
  email: string;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
}

export function AuthMagicCode({ action, onSuccess, onError }: AuthMagicCodeProps) {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>('email');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { register, handleSubmit, formState: { errors } } = useForm<EmailFormData>();
  const profileForm = useForm<ProfileFormData>();

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const request: MagicCodeRequest = {
        email: data.email,
        action
      };
      
      const response = await requestMagicCode(request);
      
      if (response.success) {
        setEmail(data.email);
        setStep('code');
        setResendCooldown(30); // 30 second cooldown for resend
      } else {
        setError(response.error || 'Failed to send verification code');
        if (response.error_code && onError) {
          onError(response.error || 'Authentication failed');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeComplete = useCallback(async (code: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const request: MagicCodeVerifyRequest = {
        email,
        code
      };
      
      const response = await verifyMagicCode(request);
      
      if (response.success) {
        if (response.needs_profile_completion && action === 'signup') {
          // New user needs to complete profile
          setStep('profile');
        } else if (response.user_profile) {
          // Authentication successful
          if (onSuccess) {
            onSuccess(response.user_profile);
          }
        }
      } else {
        setError(response.error || 'Invalid or expired code');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, action, onSuccess]);

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await resendMagicCode(email);
      
      if (response.success) {
        setResendCooldown(30);
      } else {
        setError(response.error || 'Failed to resend code');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, resendCooldown]);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Submit profile data with the verified email
      const request: MagicCodeVerifyRequest = {
        email,
        code: '', // Code already verified
        first_name: data.first_name,
        last_name: data.last_name
      };
      
      const response = await verifyMagicCode(request);
      
      if (response.success && response.user_profile) {
        if (onSuccess) {
          onSuccess(response.user_profile);
        }
      } else {
        setError(response.error || 'Failed to complete profile');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSubmit(handleEmailSubmit)}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send verification code'}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center mt-6 px-2">
          By signing in, you agree to our{' '}
          <Link 
            href="/terms-of-service" 
            className="text-primary underline-offset-4 hover:underline transition-colors"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link 
            href="/privacy_policy" 
            className="text-primary underline-offset-4 hover:underline transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </CardContent>
    </form>
  );

  const renderCodeStep = () => (
    <CardContent className="space-y-4">
      <MagicCodeInput
        onComplete={handleCodeComplete}
        onResend={handleResendCode}
        isLoading={isSubmitting}
        error={error || undefined}
        resendCooldown={resendCooldown}
        email={email}
      />
      
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          setStep('email');
          setError(null);
        }}
        disabled={isSubmitting}
      >
        Use a different email
      </Button>
    </CardContent>
  );

  const renderProfileStep = () => (
    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            type="text"
            placeholder="John"
            {...profileForm.register('first_name', { 
              required: 'First name is required' 
            })}
            disabled={isSubmitting}
          />
          {profileForm.formState.errors.first_name && (
            <p className="text-sm text-red-600">
              {profileForm.formState.errors.first_name.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Doe"
            {...profileForm.register('last_name', { 
              required: 'Last name is required' 
            })}
            disabled={isSubmitting}
          />
          {profileForm.formState.errors.last_name && (
            <p className="text-sm text-red-600">
              {profileForm.formState.errors.last_name.message}
            </p>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Complete signup'}
        </Button>
      </CardContent>
    </form>
  );

  const getCardHeader = () => {
    if (step === 'email') {
      return {
        title: 'Sign in',
        description: action === 'login' 
          ? 'Enter your email to sign in to your account'
          : 'Enter your email to get started'
      };
    } else if (step === 'code') {
      return {
        title: 'Check your email',
        description: 'We sent a verification code to your email'
      };
    } else {
      return {
        title: 'Complete your profile',
        description: 'Just a few more details to set up your account'
      };
    }
  };

  const { title, description } = getCardHeader();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      {step === 'email' && renderEmailStep()}
      {step === 'code' && renderCodeStep()}
      {step === 'profile' && renderProfileStep()}
    </Card>
  );
}