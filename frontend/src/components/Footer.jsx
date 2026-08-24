import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-main">
        <section className="footer-intro">
          <Link to="/" className="footer-logo"><span>P</span><strong>Papelaria Comercial</strong></Link>
          <p>Materiais para estudar, criar, organizar e realizar. Uma experiência de compra simples do início ao fim.</p>
          <div className="footer-security"><span aria-hidden="true">✓</span> Ambiente de compra protegido</div>
        </section>
        <div className="footer-grid">
          <section><h4>Institucional</h4><Link to="/sobre-nos">Sobre nós</Link><Link to="/politica-de-privacidade">Privacidade</Link><Link to="/termos-de-uso">Termos de uso</Link></section>
          <section><h4>Atendimento</h4><Link to="/central-de-ajuda">Central de ajuda</Link><Link to="/trocas-e-devolucoes">Trocas e devoluções</Link><Link to="/prazos-de-entrega">Prazos de entrega</Link></section>
          <section><h4>Fale conosco</h4><a href="mailto:contato@papelariacomercial.com">contato@papelariacomercial.com</a><a href="tel:+551140000000">(11) 4000-0000</a><small>Seg a Sex, 8h às 18h</small></section>
        </div>
      </div>
      <div className="footer-bottom"><div className="container footer-inner"><p>© {year} Papelaria Comercial. Todos os direitos reservados.</p><p>Feito para simplificar sua rotina.</p></div></div>
    </footer>
  );
}
