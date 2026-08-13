import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <section>
          <h3 className="footer-brand">Papelaria Comercial</h3>
          <p>Qualidade, variedade e praticidade para estudar, trabalhar e organizar seu dia.</p>
        </section>

        <section>
          <h4>Institucional</h4>
          <Link to="/sobre-nos">Sobre nós</Link>
          <Link to="/politica-de-privacidade">Política de privacidade</Link>
          <Link to="/termos-de-uso">Termos de uso</Link>
        </section>

        <section>
          <h4>Atendimento</h4>
          <Link to="/central-de-ajuda">Central de ajuda</Link>
          <Link to="/trocas-e-devolucoes">Trocas e devoluções</Link>
          <Link to="/prazos-de-entrega">Prazos de entrega</Link>
        </section>

        <section>
          <h4>Contato</h4>
          <p>contato@papelariacomercial.com</p>
          <p>(11) 4000-0000</p>
          <p>Seg a Sex, 8h as 18h</p>
        </section>
      </div>

      <div className="footer-bottom">
        <div className="container footer-inner">
          <p>© {year} Papelaria Comercial. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
