import { Navigate, Route, Routes } from 'react-router-dom';
import { authRoutes } from './auth-routes';

export function AuthRouting() {
  return (
    <Routes>
      <Route index element={<Navigate to="signin" replace />} />
      {authRoutes.map((route) => {
        const basePath = route.path?.replace(/^auth\//, '') || '';
        return (
          <Route key={route.path || 'layout'} path={basePath} element={route.element}>
            {route.children?.map((childRoute) => (
              <Route
                key={childRoute.path}
                path={childRoute.path}
                element={childRoute.element}
              />
            ))}
          </Route>
        );
      })}
    </Routes>
  );
}
