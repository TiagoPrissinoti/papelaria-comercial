import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro no login');
    }
  }

  return (
    <section className="auth-page auth-page-login">
      <aside className="auth-visual">
        <Link to="/vitrine" className="auth-brand"><span>P</span><strong>Papelaria Comercial</strong></Link>
        <div className="auth-visual-copy">
          <p className="section-eyebrow">Bem-vindo de volta</p>
          <h2>Tudo para suas ideias, em um só lugar.</h2>
          <p>Entre para acompanhar pedidos, organizar seu carrinho e continuar suas compras com segurança.</p>
        </div>
        <div className="auth-proof"><span>✓</span><p><strong>Compra protegida</strong><small>Sua sessão e seus dados ficam seguros.</small></p></div>
      </aside>
      <div className="login-card-shell auth-form-side">
        <form onSubmit={handleSubmit} className="auth-card">
          <div className="auth-card-head"><p className="section-eyebrow">Acesse sua conta</p><h1>Entrar</h1><p>Use seu e-mail e senha para continuar.</p></div>
          {error && <p className="error" role="alert">{error}</p>}
          <label className="field-label">E-mail<Input placeholder="voce@exemplo.com" type="email" autoComplete="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field-label">Senha<Input placeholder="Digite sua senha" type="password" autoComplete="current-password" required onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <Button type="submit">Entrar</Button>
          <Link to="/vitrine" className="login-showcase-link btn btn-secondary">Explorar vitrine</Link>
          <div className="auth-switch"><span>Ainda não tem conta?</span><Link to="/cadastro">Criar conta</Link></div>
        </form>
      </div>
    </section>
  );
}
