import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { CartProvider } from './components/CartContext';
import { AdminAuthProvider } from './components/AdminAuthContext';
import { LangProvider } from './components/LangContext';

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <AdminAuthProvider>
          <LangProvider>
            <RouterProvider router={router} />
          </LangProvider>
        </AdminAuthProvider>
      </CartProvider>
    </ThemeProvider>
  );
}