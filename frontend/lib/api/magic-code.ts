import { BACKEND_URL } from 'lib/constants';
import { makeRequest, makeRequestWithRetry, STATUS, RequestError } from 'lib/utils/request';
import { 
  AuthenticationResponse, 
  MagicCodeRequest,
  MagicCodeVerifyRequest
} from 'types/auth';

/**
 * Enhanced error handling for auth API calls
 */
function handleAuthError(error: RequestError): AuthenticationResponse {
  return {
    success: false,
    method: 'magic_code',
    error: error.message,
    error_code: error.errorCode,
    retry_after: error.retryAfter
  };
}

/**
 * Request a magic code for authentication with enhanced error handling
 */
export async function requestMagicCode(request: MagicCodeRequest): Promise<AuthenticationResponse> {
  try {
    const { data, status } = await makeRequest({
      url: `${BACKEND_URL}/auth/magic-code/request/`,
      method: 'POST',
      body: request,
      accept: 'application/json'
    });

    return {
      ...(data as Partial<AuthenticationResponse> || {}),
      success: status === STATUS.HTTP_200_OK
    } as AuthenticationResponse;
  } catch (error) {
    return handleAuthError(error as RequestError);
  }
}

/**
 * Verify a magic code with enhanced error handling
 */
export async function verifyMagicCode(request: MagicCodeVerifyRequest): Promise<AuthenticationResponse> {
  try {
    const { data, status } = await makeRequestWithRetry({
      url: `${BACKEND_URL}/auth/magic-code/verify/`,
      method: 'POST',
      body: request,
      accept: 'application/json'
    }, 2, 1000); // 2 retries with 1 second delay

    return {
      ...(data as Partial<AuthenticationResponse> || {}),
      success: status === STATUS.HTTP_200_OK
    } as AuthenticationResponse;
  } catch (error) {
    return handleAuthError(error as RequestError);
  }
}

/**
 * Resend a magic code for an email address with enhanced error handling
 */
export async function resendMagicCode(email: string): Promise<AuthenticationResponse> {
  try {
    const { data, status } = await makeRequest({
      url: `${BACKEND_URL}/auth/magic-code/resend/`,
      method: 'POST',
      body: { email },
      accept: 'application/json'
    });

    return {
      ...(data as Partial<AuthenticationResponse> || {}),
      success: status === STATUS.HTTP_200_OK
    } as AuthenticationResponse;
  } catch (error) {
    return handleAuthError(error as RequestError);
  }
}