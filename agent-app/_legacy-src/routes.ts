/**
 * Agent mobil ilova marshrutlari (admin paneldan ajratilgan)
 * Asl fayl: src/app/routes.ts
 */

import { createBrowserRouter } from 'react-router';
import Dashboard from '../src/app/pages/Dashboard';
import Products from '../src/app/pages/Products';
import ClientsList from '../src/app/pages/ClientsList';
import ClientDetail from '../src/app/pages/ClientDetail';
import Visit from '../src/app/pages/Visit';
import CategoryDetail from '../src/app/pages/CategoryDetail';
import ProductDetail from '../src/app/pages/ProductDetail';
import Plan from '../src/app/pages/Plan';
import Messages from '../src/app/pages/Messages';
import Chat from '../src/app/pages/Chat';
import Profile from '../src/app/pages/Profile';
import OrderSummary from '../src/app/pages/OrderSummary';
import Sverka from '../src/app/pages/Sverka';
import Liniya from '../src/app/pages/Liniya';
import Sotrudniki from '../src/app/pages/Sotrudniki';
import LocatsiyaPage from '../src/app/pages/LocatsiyaPage';

export const agentRouter = createBrowserRouter([
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
