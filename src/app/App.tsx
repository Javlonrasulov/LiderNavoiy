import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { AdminAuthProvider } from './components/AdminAuthContext';
import { LangProvider } from './components/LangContext';
import { CompaniesProvider } from './components/CompaniesContext';
import { SessionExpiredOverlay } from './components/SessionExpiredOverlay';

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <LangProvider>
          <CompaniesProvider>
            <RouterProvider router={router} />
            <SessionExpiredOverlay />
          </CompaniesProvider>
        </LangProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
