import { getData, removeData, setData } from '@/lib/storage';
import type { AuthModel } from './models';

const AUTH_LOCAL_STORAGE_KEY = `stocklane-auth-v1`;

export const getAuth = (): AuthModel | undefined => {
  try {
    return getData(AUTH_LOCAL_STORAGE_KEY) as AuthModel | undefined;
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error);
    return undefined;
  }
};

export const setAuth = (auth: AuthModel) => {
  setData(AUTH_LOCAL_STORAGE_KEY, auth);
};

export const removeAuth = () => {
  removeData(AUTH_LOCAL_STORAGE_KEY);
};

export { AUTH_LOCAL_STORAGE_KEY };
