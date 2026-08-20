import type { RouteObject } from 'react-router-dom';
import { BrandedLayout } from './layouts/branded';
import { CallbackPage } from './pages/callback-page';
import { ChangePasswordPage } from './pages/change-password-page';
import { ResetPasswordPage } from './pages/reset-password-page';
import { SignInPage } from './pages/signin-page';

export const authRoutes: RouteObject[] = [
  {
    path: '',
    element: <BrandedLayout />,
    children: [
      { path: 'signin', element: <SignInPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'change-password', element: <ChangePasswordPage /> },
    ],
  },
  {
    path: 'callback',
    element: <CallbackPage />,
  },
];
