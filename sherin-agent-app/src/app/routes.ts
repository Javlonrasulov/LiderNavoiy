import { createBrowserRouter } from 'react-router';
import Dashboard from './pages/home';
import Products from './pages/products';
import ClientsList from './pages/clients';
import ClientDetail from './pages/clients/detail';
import Visit from './pages/visit';
import CategoryDetail from './pages/visit/category-detail';
import ProductDetail from './pages/visit/product-detail';
import Plan from './pages/plan';
import Messages from './pages/messages';
import Chat from './pages/messages/chat';
import Profile from './pages/profile';
import OrderSummary from './pages/order-summary';
import Sverka from './pages/clients/sverka';
import Liniya from './pages/liniya';
import Sotrudniki from './pages/sotrudniki';
import LocatsiyaPage from './pages/locatsiya';

export const router = createBrowserRouter([
  { path: '/', Component: Dashboard },
  { path: '/home', Component: Dashboard },
  { path: '/products', Component: Products },
  { path: '/clients', Component: ClientsList },
  { path: '/clients/:clientId', Component: ClientDetail },
  { path: '/client/:clientId', Component: ClientDetail },
  { path: '/sverka/:clientId', Component: Sverka },
  { path: '/visit', Component: Visit },
  { path: '/visit/category/:categoryId', Component: CategoryDetail },
  { path: '/visit/product/:productId', Component: ProductDetail },
  { path: '/order-summary', Component: OrderSummary },
  { path: '/plan', Component: Plan },
  { path: '/messages', Component: Messages },
  { path: '/messages/:chatId', Component: Chat },
  { path: '/profile', Component: Profile },
  { path: '/liniya', Component: Liniya },
  { path: '/sotrudniki', Component: Sotrudniki },
  { path: '/locatsiya', Component: LocatsiyaPage },
  { path: '*', Component: Dashboard },
]);
