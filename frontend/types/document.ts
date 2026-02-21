import { UserProfile } from 'types/user';
// import { PropertyAddress } from 'types/property';

export interface Action {
  id: string;
  type: string; // TODO: enumerate the types
  from_user: UserProfile;
  to_user: UserProfile;
  timestamp: string;
}

export interface Document {
  id: string;
  title: string;
  root: string;
  actions: Action[];
  property_address?: any; // PropertyAddress;
}

export interface DocumentHead {
  document: Document;
  recipient_name: string | null;
  available_actions: string[];
  history: Document[];
  expanded?: boolean; // data table field
}

export interface DocumentText {
  id: string;
  content: string;
  type: string;

  // useful for select and multi-checkbox inputs
  field_type?: string;
  choices?: object[];

  indent?: number;
  order?: string;
}