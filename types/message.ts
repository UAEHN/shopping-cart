export interface ListMessage {
  id: string;
  list_id: string;
  sender_username: string;
  text: string;
  created_at: string;
  sender_profile?: {
    name: string;
    avatar_url?: string;
  };
} 