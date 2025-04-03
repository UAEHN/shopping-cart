export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar_url?: string;
  push_token?: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    username: string;
  };
}

export interface Contact {
  id: string;
  user_id: string;
  contact_username: string;
  added_at: string;
}

export interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  created_at: string;
} 