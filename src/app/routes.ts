import { createBrowserRouter } from 'react-router';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ClientsList from './pages/ClientsList';
import ClientDetail from './pages/ClientDetail';
import Visit from './pages/Visit';
import CategoryDetail from './pages/CategoryDetail';
import ProductDetail from './pages/ProductDetail';
import Plan from './pages/Plan';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import OrderSummary from './pages/OrderSummary';
import Sverka from './pages/Sverka';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import AdminSelectCompany from './pages/AdminSelectCompany';
import Liniya from './pages/Liniya';
import Sotrudniki from './pages/Sotrudniki';
import LocatsiyaPage from './pages/LocatsiyaPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/home',
    Component: Dashboard,
  },
  {
    path: '/products',
    Component: Products,
  },
  {
    path: '/clients',
    Component: ClientsList,
  },
  {
    path: '/clients/:clientId',
    Component: ClientDetail,
  },
  {
    path: '/client/:clientId',
    Component: ClientDetail,
  },
  {
    path: '/sverka/:clientId',
    Component: Sverka,
  },
  {
    path: '/visit',
    Component: Visit,
  },
  {
    path: '/visit/category/:categoryId',
    Component: CategoryDetail,
  },
  {
    path: '/visit/product/:productId',
    Component: ProductDetail,
  },
  {
    path: '/order-summary',
    Component: OrderSummary,
  },
  {
    path: '/plan',
    Component: Plan,
  },
  {
    path: '/messages',
    Component: Messages,
  },
  {
    path: '/messages/:chatId',
    Component: Chat,
  },
  {
    path: '/profile',
    Component: Profile,
  },
  {
    path: '/admin/login',
    Component: AdminLogin,
  },
  {
    path: '/admin/select',
    Component: AdminSelectCompany,
  },
  {
    path: '/admin',
    Component: AdminPanel,
  },
  {
    path: '/liniya',
    Component: Liniya,
  },
  {
    path: '/sotrudniki',
    Component: Sotrudniki,
  },
  {
    path: '/locatsiya',
    Component: LocatsiyaPage,
  },
  {
    path: '*',
    Component: Dashboard,
  },
]);