import { createBrowserRouter, redirect } from 'react-router';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import AdminSelectCompany from './pages/AdminSelectCompany';

export const router = createBrowserRouter([
  {
    path: '/',
    loader: () => redirect('/admin/login'),
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
    path: '*',
    loader: () => redirect('/admin/login'),
  },
]);
