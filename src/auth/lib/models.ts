import type { AppPermission, AppRole } from './roles';

export type UUID = string;

export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

export type UserStatus = 'active' | 'inactive' | 'invited';

export interface UserModel {
  id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name: string;
  fullname?: string;
  email_verified?: boolean;
  phone?: string;
  pic?: string;
  language?: LanguageCode;
  role: AppRole;
  status: UserStatus;
  permissions: AppPermission[];
  is_admin: boolean;
}
