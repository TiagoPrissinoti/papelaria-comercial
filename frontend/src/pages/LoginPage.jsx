import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <section className="auth-page">
      <form onSubmit={handleSubmit} className="auth-card">
        <h1>Entrar</h1>
        {error && <p className="error">{error}</p>}
        <Input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Senha" type="password" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit">Entrar</Button>
      </form>
    </section>
  );
}
