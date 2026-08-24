import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro no cadastro');
    }
  }

  return (
    <section className="auth-page auth-page-login">
      <aside className="auth-visual auth-visual-register">
        <Link to="/vitrine" className="auth-brand"><span>P</span><strong>Papelaria Comercial</strong></Link>
        <div className="auth-visual-copy"><p className="section-eyebrow">Comece agora</p><h2>Sua próxima ideia merece bons materiais.</h2><p>Crie sua conta para montar o carrinho, comprar com segurança e acompanhar cada pedido.</p></div>
        <div className="auth-proof"><span>✓</span><p><strong>Cadastro simples</strong><small>Leva menos de um minuto.</small></p></div>
      </aside>
      <div className="login-card-shell auth-form-side">
        <form onSubmit={handleSubmit} className="auth-card">
          <div className="auth-card-head"><p className="section-eyebrow">Nova conta</p><h1>Criar conta</h1><p>Preencha seus dados para começar.</p></div>
          {error && <p className="error" role="alert">{error}</p>}
          <label className="field-label">Nome completo<Input placeholder="Como podemos chamar você?" autoComplete="name" required onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field-label">E-mail<Input placeholder="voce@exemplo.com" type="email" autoComplete="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field-label">Senha<Input placeholder="Mínimo de 8 caracteres" type="password" autoComplete="new-password" minLength="8" required onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <Button type="submit">Criar minha conta</Button>
          <div className="auth-switch"><span>Já tem uma conta?</span><Link to="/login">Entrar</Link></div>
        </form>
      </div>
    </section>
  );
}
