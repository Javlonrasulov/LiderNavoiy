import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { AdminAuthProvider } from './components/AdminAuthContext';
import { LangProvider } from './components/LangContext';

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <LangProvider>
          <RouterProvider router={router} />
        </LangProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
