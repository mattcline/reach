import { UserProfile } from './user';

export interface AuthenticationResponse {
  success: boolean;
  method: string;
  user_profile?: UserProfile;
  action?: 'login' | 'signup';
  error?: string;
  error_code?: string;
  message?: string;
  expires_in?: number;
  retry_after?: number;
  needs_profile_completion?: boolean;
}

export interface AuthMethodsResponse {
  success: boolean;
  available_methods: string[];
  recommended_method: string;
  user_exists: boolean;
}

export type AuthAction = 'login' | 'signup';

export interface MagicCodeRequest {
  email: string;
  action: AuthAction;
}

export interface MagicCodeVerifyRequest {
  email: string;
  code: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthErrorCodes {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED';
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED';
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND';
  INVALID_LINK: 'INVALID_LINK';
  VERIFICATION_FAILED: 'VERIFICATION_FAILED';
  RATE_LIMITED: 'RATE_LIMITED';
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED';
}