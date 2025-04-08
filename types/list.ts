import { ListMessage } from './message';

export interface ShoppingList {
  id: string;
  share_code: string;
  creator_username: string;
  recipient_username: string;
  status: 'new' | 'opened' | 'completed';
  created_at: string;
  updated_at: string;
  items?: ListItem[];
  messages?: ListMessage[];
}

export interface ListItem {
  id: string;
  list_id: string;
  name: string;
  category: string;
  purchased: boolean;
  purchased_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListWithDetails extends ShoppingList {
  items: ListItem[];
  creator_profile?: {
    name: string;
    avatar_url?: string;
  };
  recipient_profile?: {
    name: string;
    avatar_url?: string;
  };
} 