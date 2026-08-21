import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthRouting, RequireAuth } from '@/auth';
import { ScreenLoader } from '@/components/screen-loader';

const LazyStoreInventoryModule = lazy(() => import('@/store-inventory'));

export function ModulesProvider() {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith('/auth')) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <Routes>
          <Route path="/auth/*" element={<AuthRouting />} />
        </Routes>
      </Suspense>
    );
  }

  if (path.startsWith('/store-inventory')) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/store-inventory/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyStoreInventoryModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  return <Navigate to="/store-inventory" replace />;
}
