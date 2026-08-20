import { createContext, useContext } from 'react';
import type { AuthModel, UserModel } from '@/auth/lib/models';
import type { AppRole } from '@/auth/lib/roles';

export type AuthContextValue = {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  auth?: AuthModel;
  saveAuth: (auth: AuthModel | undefined) => void;
  user?: UserModel;
  setUser: React.Dispatch<React.SetStateAction<UserModel | undefined>>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (password: string, password_confirmation: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  getUser: () => Promise<UserModel | null>;
  updateProfile: (userData: Partial<UserModel>) => Promise<UserModel>;
  logout: () => Promise<void>;
  verify: () => Promise<void>;
  isAdmin: boolean;
  role: AppRole | null;
  hasPermission: (permission: import('@/auth/lib/roles').AppPermission) => boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  loading: false,
  setLoading: () => {},
  saveAuth: () => {},
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  resendVerificationEmail: async () => {},
  getUser: async () => null,
  updateProfile: async () => ({}) as UserModel,
  logout: async () => {},
  verify: async () => {},
  isAdmin: false,
  role: null,
  hasPermission: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}
