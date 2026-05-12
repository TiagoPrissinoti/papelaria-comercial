import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="header">
      <div className="container nav">
        <Link to="/" className="logo">Papelaria Pro</Link>
        <nav>
          <Link to="/">Home</Link>
          {user && <Link to="/meus-pedidos">Meus Pedidos</Link>}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <Link to="/carrinho">Carrinho ({count})</Link>
          {!user && <Link to="/login">Login</Link>}
          {!user && <Link to="/cadastro">Cadastro</Link>}
          {user && <button onClick={handleLogout}>Sair</button>}
        </nav>
      </div>
    </header>
  );
}
