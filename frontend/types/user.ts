export interface UserProfile {
  id: string;
  email: string;
  is_superuser: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  photo_url: string;
  is_attorney: boolean;
  preferences: Preferences;
}

export interface UserProfileAbbreviated {
  id: string;
  full_name: string;
  photo_url: string;
}

interface Preferences {
  user_profile_id: string;

  // email preferences
  product_news: boolean;
  resources: boolean;
}