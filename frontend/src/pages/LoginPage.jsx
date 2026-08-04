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
    <section className="auth-page auth-page-login login-surface">
      <div className="login-orb login-orb-left" aria-hidden="true" />
      <div className="login-orb login-orb-right" aria-hidden="true" />
      <div className="login-brand-floating">
        <span className="login-brand-name">Papelaria Pro</span>
        <p>Materiais escolares, escritório e organização em um só lugar.</p>
      </div>

      <div className="login-card-shell">
        <form onSubmit={handleSubmit} className="auth-card">
          <h1>Entrar</h1>
          {error && <p className="error">{error}</p>}
          <Input
            placeholder="Email"
            type="email"
            required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Senha"
            type="password"
            required
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit">Entrar</Button>
          <Link to="/vitrine" className="login-showcase-link btn btn-secondary">
            Ver vitrine
          </Link>
          <div className="auth-switch">
            <span>Não tem cadastro ainda?</span>
            <Link to="/cadastro">Criar conta</Link>
          </div>
        </form>
      </div>
    </section>
  );
}
