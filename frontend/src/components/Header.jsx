import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/cadastro';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

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

      navigate({
        pathname: '/',
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      }, { replace: true });
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

    navigate({
      pathname: '/',
      search: nextParams.toString() ? `?${nextParams.toString()}` : '',
    }, { replace: true });
  }

  if (isAuthRoute) return null;

  return (
    <header className="header">
      <div className="container nav">
        <div className="header-brand-row">
          <Link to="/" className="logo">Papelaria Pro</Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="store-navigation"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <form className="header-search" onSubmit={handleSearch}>
          <input
            className="header-search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar produtos por nome"
            aria-label="Pesquisar produtos por nome"
          />
          <span className="header-search-icon" aria-hidden="true" />
        </form>
        <nav id="store-navigation" className={menuOpen ? 'mobile-open' : ''}>
          <Link to="/">Home</Link>
          {user && <Link to="/meus-pedidos">Meus Pedidos</Link>}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <Link to="/carrinho">Carrinho ({count})</Link>
          {!user && <Link to="/login">Login</Link>}
          {user && <button onClick={handleLogout}>Sair</button>}
        </nav>
      </div>
    </header>
  );
}
