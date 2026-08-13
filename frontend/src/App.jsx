import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VitrinePage from './pages/VitrinePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import InformationPage from './pages/InformationPage';

export default function App() {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/cadastro';
  const isStandaloneRoute = isAuthRoute || location.pathname === '/vitrine';
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      {!isAdminRoute && !isStandaloneRoute && <Header />}
      <main className={`${isAuthRoute ? 'page-content auth-main' : 'container page-content'}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/cadastro" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/vitrine" element={<VitrinePage />} />
          <Route path="/produto/:id" element={<ProductPage />} />
          <Route path="/carrinho" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/meus-pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/acesso-negado" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />
          <Route path="/sobre-nos" element={<InformationPage page="about" />} />
          <Route path="/politica-de-privacidade" element={<InformationPage page="privacy" />} />
          <Route path="/termos-de-uso" element={<InformationPage page="terms" />} />
          <Route path="/central-de-ajuda" element={<InformationPage page="help" />} />
          <Route path="/trocas-e-devolucoes" element={<InformationPage page="returns" />} />
          <Route path="/prazos-de-entrega" element={<InformationPage page="delivery" />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      {!isAdminRoute && !isStandaloneRoute && <Footer />}
    </div>
  );
}
