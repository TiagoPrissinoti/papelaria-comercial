import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';
import AccessDeniedPage from './pages/AccessDeniedPage';

export default function App() {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/cadastro';
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      {!isAdminRoute && <Navbar />}
      <main className={`container page-content ${isAuthRoute ? 'auth-main' : ''}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/cadastro" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/produto/:id" element={<ProductPage />} />
          <Route path="/carrinho" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/meus-pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/acesso-negado" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      {!isAuthRoute && !isAdminRoute && <Footer />}
    </div>
  );
}
