import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import api from '../services/api';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!token) {
      setCategories([]);
      return;
    }

    api.get('/categories')
      .then((response) => setCategories(response.data || []))
      .catch(() => setCategories([]));
  }, [token]);

  return (
    <header className="navbar-wrap">
      <div className="navbar-utility">
        <div className="container navbar-utility-inner">
          <span>Compra segura e entrega rapida para todo o Brasil</span>
          <span>Atendimento: Seg a Sex, 8h as 18h</span>
        </div>
      </div>

      <div className="container navbar-top">
        <Link to={token ? '/' : '/login'} className="brand">Papelaria Comercial</Link>

        {token ? (
          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Busque por cadernos, canetas, organizacao..."
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  navigate(`/?q=${encodeURIComponent(event.currentTarget.value)}`);
                }
              }}
            />
          </div>
        ) : <div />}

        <nav className="nav-actions">
          {token && <Link to="/carrinho" className="cart-pill">Carrinho ({count})</Link>}
          {!user && <Link to="/login">Entrar</Link>}
          {!user && <Link to="/cadastro">Cadastrar</Link>}
          {user && <Link to="/meus-pedidos">Meus pedidos</Link>}
          {user?.role === 'admin' && <Link to="/admin">Painel admin</Link>}
          {user && <button className="ghost-btn" onClick={logout}>Sair</button>}
        </nav>
      </div>

      {token && (
        <div className="navbar-sub-wrap">
          <div className="container navbar-sub">
            <Link to="/">Inicio</Link>
            {categories.map((category) => (
              <Link key={category.id} to={`/?categoria=${encodeURIComponent(category.name)}`}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
