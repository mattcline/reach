import 'client-only' // since makeRequest() requires reading cookies from the browser

import { Response } from 'types/request';

export interface RequestError extends Error {
  status?: number;
  errorCode?: string;
  retryAfter?: number;
  data?: any;
}

// important to note that this function must be called from a client component
export const makeRequest = async <T>({
  url,
  method,
  body,
  contentType = 'application/json',
  accept,
  customHeaders,
  timeout = 30000 // 30 second timeout
}: {
  url: string,
  method: string, 
  body?: any, 
  contentType?: string,
  accept?: string,
  customHeaders?: object,
  timeout?: number
}): Promise<Response<T>> => {
  // important to note that this function must be called from a client component
  const csrfToken = getCookie('csrftoken');

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      ...(body && { body: contentType === 'application/json' ? JSON.stringify(body) : body }),
      headers: {
        ...(body && {'Content-Type': contentType}),
        ...(accept && { 'accept': accept }),
        'X-CSRFToken': `${csrfToken}`,
        ...customHeaders
      },
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let data = null;
    const text = await response.text();
    
    if (accept === 'application/json' && text) {
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        // Keep as text if JSON parsing fails
        data = text;
      }
    } else {
      data = text;
    }

    // For non-2xx responses, create a detailed error
    if (!response.ok) {
      const error = new Error(data?.error || `Request failed with status ${response.status}`) as RequestError;
      error.status = response.status;
      error.data = data;
      
      // Extract error details from response
      if (data && typeof data === 'object') {
        error.errorCode = data.error_code;
        error.retryAfter = data.retry_after;
      }
      
      throw error;
    }

    return { data, status: response.status };

  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle different types of errors
    if (error instanceof Error) {
      const requestError = error as RequestError;
      
      // Network errors
      if (error.name === 'AbortError') {
        requestError.message = 'Request timed out. Please check your connection and try again.';
        requestError.errorCode = 'TIMEOUT_ERROR';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        requestError.message = 'Network error. Please check your connection and try again.';
        requestError.errorCode = 'NETWORK_ERROR';
      }
      
      throw requestError;
    }
    
    throw error;
  }
}

/**
 * Enhanced request function with automatic retry logic
 */
export const makeRequestWithRetry = async <T>(
  requestConfig: Parameters<typeof makeRequest>[0],
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response<T>> => {
  let lastError: RequestError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest(requestConfig);
    } catch (error) {
      lastError = error as RequestError;
      
      // Don't retry for certain error types
      if (lastError.status && [400, 401, 403, 404, 422].includes(lastError.status)) {
        throw lastError;
      }
      
      // Don't retry 500 errors for authentication endpoints
      // These are typically data issues that won't be resolved by retrying
      if (lastError.status === 500 && requestConfig.url.includes('/auth/')) {
        throw lastError;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
};

export const getCookie = (name: string) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          // Does this cookie string begin with the name we want?
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
  return cookieValue;
} 

// These are the status codes that are returned by the server
// These were taken from rest_framework.status.py so make sure to update
// if DRF is updated on the backend
export const STATUS = {
  HTTP_100_CONTINUE: 100,
  HTTP_101_SWITCHING_PROTOCOLS: 101,
  HTTP_102_PROCESSING: 102,
  HTTP_103_EARLY_HINTS: 103,
  HTTP_200_OK: 200,
  HTTP_201_CREATED: 201,
  HTTP_202_ACCEPTED: 202,
  HTTP_203_NON_AUTHORITATIVE_INFORMATION: 203,
  HTTP_204_NO_CONTENT: 204,
  HTTP_205_RESET_CONTENT: 205,
  HTTP_206_PARTIAL_CONTENT: 206,
  HTTP_207_MULTI_STATUS: 207,
  HTTP_208_ALREADY_REPORTED: 208,
  HTTP_226_IM_USED: 226,
  HTTP_300_MULTIPLE_CHOICES: 300,
  HTTP_301_MOVED_PERMANENTLY: 301,
  HTTP_302_FOUND: 302,
  HTTP_303_SEE_OTHER: 303,
  HTTP_304_NOT_MODIFIED: 304,
  HTTP_305_USE_PROXY: 305,
  HTTP_306_RESERVED: 306,
  HTTP_307_TEMPORARY_REDIRECT: 307,
  HTTP_308_PERMANENT_REDIRECT: 308,
  HTTP_400_BAD_REQUEST: 400,
  HTTP_401_UNAUTHORIZED: 401,
  HTTP_402_PAYMENT_REQUIRED: 402,
  HTTP_403_FORBIDDEN: 403,
  HTTP_404_NOT_FOUND: 404,
  HTTP_405_METHOD_NOT_ALLOWED: 405,
  HTTP_406_NOT_ACCEPTABLE: 406,
  HTTP_407_PROXY_AUTHENTICATION_REQUIRED: 407,
  HTTP_408_REQUEST_TIMEOUT: 408,
  HTTP_409_CONFLICT: 409,
  HTTP_410_GONE: 410,
  HTTP_411_LENGTH_REQUIRED: 411,
  HTTP_412_PRECONDITION_FAILED: 412,
  HTTP_413_REQUEST_ENTITY_TOO_LARGE: 413,
  HTTP_414_REQUEST_URI_TOO_LONG: 414,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE: 415,
  HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  HTTP_417_EXPECTATION_FAILED: 417,
  HTTP_418_IM_A_TEAPOT: 418,
  HTTP_421_MISDIRECTED_REQUEST: 421,
  HTTP_422_UNPROCESSABLE_ENTITY: 422,
  HTTP_423_LOCKED: 423,
  HTTP_424_FAILED_DEPENDENCY: 424,
  HTTP_425_TOO_EARLY: 425,
  HTTP_426_UPGRADE_REQUIRED: 426,
  HTTP_428_PRECONDITION_REQUIRED: 428,
  HTTP_429_TOO_MANY_REQUESTS: 429,
  HTTP_431_REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  HTTP_500_INTERNAL_SERVER_ERROR: 500,
  HTTP_501_NOT_IMPLEMENTED: 501,
  HTTP_502_BAD_GATEWAY: 502,
  HTTP_503_SERVICE_UNAVAILABLE: 503,
  HTTP_504_GATEWAY_TIMEOUT: 504,
  HTTP_505_HTTP_VERSION_NOT_SUPPORTED: 505,
  HTTP_506_VARIANT_ALSO_NEGOTIATES: 506,
  HTTP_507_INSUFFICIENT_STORAGE: 507,
  HTTP_508_LOOP_DETECTED: 508,
  HTTP_509_BANDWIDTH_LIMIT_EXCEEDED: 509,
  HTTP_510_NOT_EXTENDED: 510,
  HTTP_511_NETWORK_AUTHENTICATION_REQUIRED: 511
}
