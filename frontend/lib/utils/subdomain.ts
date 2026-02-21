import { prod } from '@/lib/constants';

export function getSubdomainUrl(productId: string): string {
  
  if (prod) {
    return `https://${productId}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  } else {
    // For local development, use localhost with port
    return `http://localhost:3000/${productId}`;
  }
}