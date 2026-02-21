export interface Order {
  id: string;
  user_profile: number;
  product: number;
  status: string;
  remaining: number;
  session_id: string;
}