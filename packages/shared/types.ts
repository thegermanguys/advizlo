// Shared between web and mobile so both clients speak the same shape
// as the backend API. Copy or symlink this file into each app's source
// (see each app's lib/api.ts for how it's consumed).

export type Role = 'CLIENT' | 'CONSULTANT' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: Role;
  timezone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}
