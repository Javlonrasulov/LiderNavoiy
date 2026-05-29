import { RouterProvider } from 'react-router';
import { agentRouter } from '../routes.agent';
import { ThemeProvider } from './components/ThemeContext';
import { CartProvider } from './components/CartContext';

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <RouterProvider router={agentRouter} />
      </CartProvider>
    </ThemeProvider>
  );
}
