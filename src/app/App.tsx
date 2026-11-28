import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { AdminAuthProvider } from './components/AdminAuthContext';
import { AppLockProvider } from './components/AppLockContext';
import { LangProvider } from './components/LangContext';
import { CompaniesProvider } from './components/CompaniesContext';
import { SessionExpiredOverlay } from './components/SessionExpiredOverlay';
import { AppLockGate } from './components/AppLockGate';

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AppLockProvider>
          <LangProvider>
            <CompaniesProvider>
              <RouterProvider router={router} />
              <SessionExpiredOverlay />
              <AppLockGate />
            </CompaniesProvider>
          </LangProvider>
        </AppLockProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
