import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthRouting, RequireAuth } from '@/auth';
import { ScreenLoader } from '@/components/screen-loader';

const LazyCrmModule = lazy(() => import('@/crm'));
const LazyStoreInventoryModule = lazy(() => import('@/store-inventory'));
const LazyMailModule = lazy(() => import('@/mail'));
const LazyCalendarModule = lazy(() => import('@/calendar'));
const LazyAIModule = lazy(() => import('@/ai'));
const LazyTodoModule = lazy(() => import('@/todo'));
const LazyRealEstateModule = lazy(() => import('@/real-estate'));

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

  const isCrm = path.startsWith('/crm');
  const isMail = path.startsWith('/mail');
  const isStoreInventory = path.startsWith('/store-inventory');
  const isCalendar = path.startsWith('/calendar');
  const isAI = path.startsWith('/ai');
  const isTodo = path.startsWith('/todo');
  const isRealEstate = path.startsWith('/real-estate');

  if (isCrm) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/crm/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyCrmModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  if (isStoreInventory) {
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

  if (isMail) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/mail/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyMailModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  if (isCalendar) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/calendar/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyCalendarModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  if (isAI) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/ai/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyAIModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  if (isTodo) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/todo/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyTodoModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  if (isRealEstate) {
    return (
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/real-estate/*"
            element={
              <Suspense fallback={<ScreenLoader />}>
                <LazyRealEstateModule />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    );
  }

  return <Navigate to="/store-inventory" replace />;
}
