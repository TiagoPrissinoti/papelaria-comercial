import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

function Icon({ name }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    cart: <><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H7" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    orders: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6z" />,
    logout: <><path d="M10 5H5v14h5" /><path d="m14 8 4 4-4 4M18 12H9" /></>
  };
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/cadastro';

  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (isAuthRoute) return undefined;
    setSearchTerm(searchParams.get('q') || '');
  }, [isAuthRoute, searchParams]);

  useEffect(() => {
    if (isAuthRoute) return undefined;
    const currentQuery = searchParams.get('q') || '';
    if (searchTerm === currentQuery) return undefined;
    const timeoutId = setTimeout(() => {
      const term = searchTerm.trim();
      const nextParams = new URLSearchParams(location.search);
      if (term) nextParams.set('q', term);
      else nextParams.delete('q');
      navigate({ pathname: '/', search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace: true });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [isAuthRoute, location.search, navigate, searchParams, searchTerm]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  function handleSearch(event) {
    event.preventDefault();
    const term = searchTerm.trim();
    const nextParams = new URLSearchParams(location.search);
    if (term) nextParams.set('q', term);
    else nextParams.delete('q');
    navigate({ pathname: '/', search: nextParams.toString() ? `?${nextParams.toString()}` : '' }, { replace: true });
  }

  if (isAuthRoute) return null;

  return (
    <header className="header">
      <div className="header-utility">
        <div className="container header-utility-inner">
          <span>Compra protegida e pagamento seguro</span>
          <span>Atendimento de segunda a sexta, 8h às 18h</span>
        </div>
      </div>
      <div className="container nav">
        <div className="header-brand-row">
          <Link to="/" className="logo" aria-label="Papelaria Comercial — início">
            <span className="logo-mark" aria-hidden="true">P</span>
            <span className="logo-copy"><strong>Papelaria</strong><small>Comercial</small></span>
          </Link>
          <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="store-navigation" onClick={() => setMenuOpen((current) => !current)}>
            <span /><span /><span />
          </button>
        </div>
        <form className="header-search" onSubmit={handleSearch} role="search">
          <Icon name="search" />
          <input className="header-search-input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="O que você está procurando?" aria-label="Pesquisar produtos" />
          <button type="submit" className="search-submit">Buscar</button>
        </form>
        <nav id="store-navigation" className={menuOpen ? 'mobile-open' : ''} aria-label="Navegação principal">
          <Link to="/" className="nav-link">Produtos</Link>
          {user && <Link to="/meus-pedidos" className="nav-icon-link"><Icon name="orders" /><span>Pedidos</span></Link>}
          {user?.role === 'admin' && <Link to="/admin" className="nav-icon-link"><Icon name="shield" /><span>Admin</span></Link>}
          <Link to="/carrinho" className="nav-icon-link nav-cart"><Icon name="cart" /><span>Carrinho</span>{count > 0 && <b>{count}</b>}</Link>
          {!user && <Link to="/login" className="nav-icon-link"><Icon name="user" /><span>Entrar</span></Link>}
          {user && (
            <button type="button" className="nav-user" onClick={handleLogout} title="Sair da conta">
              <span className="nav-avatar">{(user.name || 'U')[0].toUpperCase()}</span>
              <span className="nav-user-copy"><small>Olá,</small><strong>{user.name?.split(' ')[0]}</strong></span>
              <Icon name="logout" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
