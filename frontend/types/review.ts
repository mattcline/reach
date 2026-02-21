import { UserProfile } from './user';
import { Document } from './document';

export interface Review {
  id: string;
  reviewer: UserProfile;
  reviewee: UserProfile;
  original_document: Document;
  document?: Document;
  created_at: string;
  status: 'pending' | 'accepted' | 'completed';
}

export interface IReviewContext {
  review: Review | null;
}