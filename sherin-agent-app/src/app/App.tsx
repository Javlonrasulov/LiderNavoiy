import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeContext';
import { CartProvider } from './components/CartContext';
import { LangProvider } from './components/LangContext';

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <LangProvider>
          <RouterProvider router={router} />
        </LangProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
