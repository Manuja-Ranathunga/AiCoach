import { apiClient } from './client';
import type { User } from '../types';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function signup(payload: { email: string; password: string; display_name: string }) {
  const { data } = await apiClient.post<TokenResponse>('/auth/signup', payload);
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

/** Used right after signup/login, before the token has been persisted to the auth store. */
export async function fetchMeWithToken(token: string) {
  const { data } = await apiClient.get<User>('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  return data;
}
