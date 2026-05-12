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
          <a href="#">Sobre nos</a>
          <a href="#">Politica de privacidade</a>
          <a href="#">Termos de uso</a>
        </section>

        <section>
          <h4>Atendimento</h4>
          <a href="#">Central de ajuda</a>
          <a href="#">Trocas e devolucoes</a>
          <a href="#">Prazos de entrega</a>
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
