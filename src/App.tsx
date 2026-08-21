import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/auth';
import { I18nProvider } from './providers/i18n-provider';
import { ModulesProvider } from './providers/modules-provider';
import { QueryProvider } from './providers/query-provider';

const { BASE_URL } = import.meta.env;

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="vite-theme"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <I18nProvider>
        <HelmetProvider>
          <QueryProvider>
            <LoadingBarContainer>
              <BrowserRouter basename={BASE_URL}>
                <AuthProvider>
                  <Toaster />
                  <ModulesProvider />
                </AuthProvider>
              </BrowserRouter>
            </LoadingBarContainer>
          </QueryProvider>
        </HelmetProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
