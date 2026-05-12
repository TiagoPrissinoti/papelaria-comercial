import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <section className="admin-panel-block">
      <h1>Acesso Negado</h1>
      <p>Somente administradores podem acessar esta area.</p>
      <Link to="/" className="btn btn-primary">Voltar para inicio</Link>
    </section>
  );
}
