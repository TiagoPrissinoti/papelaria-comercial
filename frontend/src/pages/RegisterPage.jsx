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
    <section className="auth-page">
      <form onSubmit={handleSubmit} className="auth-card">
        <h1>Criar conta</h1>
        {error && <p className="error">{error}</p>}
        <Input placeholder="Nome" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Senha (minimo de 8 caracteres)" type="password" minLength="8" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit">Cadastrar</Button>
        <div className="auth-switch">
          <span>Já tem uma conta?</span>
          <Link to="/login">Entrar</Link>
        </div>
      </form>
    </section>
  );
}
