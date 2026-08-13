import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const updatedAt = '13 de agosto de 2026';

const pages = {
  about: {
    eyebrow: 'Institucional', title: 'Sobre nós',
    intro: 'A Papelaria Comercial aproxima pessoas dos materiais que ajudam ideias, estudos e negócios a saírem do papel.',
    note: 'Uma loja feita para acompanhar sua rotina',
    sections: [
      { title: 'Nossa história', text: ['Nascemos com um objetivo simples: tornar a compra de materiais escolares, de escritório e de organização mais prática. Reunimos em um só lugar produtos úteis para estudantes, famílias, profissionais e empresas, com uma experiência de compra clara e segura.'] },
      { title: 'O que nos move', text: ['Acreditamos que bons materiais facilitam o aprendizado, estimulam a criatividade e deixam o trabalho mais eficiente. Por isso, buscamos combinar variedade, qualidade, preço justo e atendimento próximo em cada pedido.'], bullets: ['Seleção cuidadosa de produtos', 'Informações claras antes da compra', 'Atendimento humano e acessível', 'Compromisso com uma entrega bem acompanhada'] },
      { title: 'Nosso compromisso', text: ['Trabalhamos para oferecer uma jornada confiável do carrinho à entrega. Quando algo não acontece como esperado, nossa equipe orienta o cliente e busca uma solução com transparência, respeito e agilidade.'] },
    ],
  },
  privacy: {
    eyebrow: 'Transparência e segurança', title: 'Política de privacidade',
    intro: 'Saiba quais dados utilizamos, por que precisamos deles e como você pode exercer seus direitos.', note: `Última atualização: ${updatedAt}`,
    sections: [
      { title: '1. Quais dados coletamos', text: ['Podemos coletar dados informados por você, como nome, e-mail, telefone, endereço de entrega e informações do pedido. Também registramos dados técnicos necessários ao funcionamento e à segurança da loja, como endereço IP, dispositivo, navegador e registros de acesso.'] },
      { title: '2. Como usamos seus dados', text: ['Utilizamos os dados para criar e proteger sua conta, processar compras e pagamentos, entregar pedidos, prestar atendimento, prevenir fraudes, cumprir obrigações legais e melhorar a experiência na loja. Comunicações promocionais somente serão enviadas quando houver uma base legal aplicável, e você poderá cancelar o recebimento.'] },
      { title: '3. Compartilhamento', text: ['Compartilhamos apenas o necessário com prestadores que participam da operação, como meios de pagamento, transportadoras, hospedagem e serviços de segurança. Esses parceiros recebem somente os dados necessários para executar suas funções. Não comercializamos seus dados pessoais.'] },
      { title: '4. Pagamentos e segurança', text: ['Os pagamentos são processados por provedores especializados. A Papelaria Comercial não armazena o número completo do cartão nem o código de segurança. Adotamos medidas técnicas e administrativas para reduzir riscos de acesso não autorizado, perda ou uso indevido, embora nenhum ambiente digital seja totalmente isento de riscos.'] },
      { title: '5. Retenção, cookies e seus direitos', text: ['Mantemos os dados pelo tempo necessário para cumprir as finalidades descritas e as obrigações legais. Cookies essenciais podem ser usados para login, carrinho e segurança. Nos termos da LGPD, você pode solicitar confirmação do tratamento, acesso, correção, portabilidade quando aplicável, informação sobre compartilhamento, oposição ou exclusão de dados tratados com consentimento, respeitadas as hipóteses legais de conservação.'] },
      { title: '6. Como falar sobre privacidade', text: ['Envie sua solicitação para contato@papelariacomercial.com. Para proteger sua conta, poderemos pedir informações adicionais para confirmar sua identidade antes de atender ao pedido.'] },
    ],
  },
  terms: {
    eyebrow: 'Regras da loja', title: 'Termos de uso',
    intro: 'Estas condições organizam o uso da loja e a compra de produtos pela Papelaria Comercial.', note: `Última atualização: ${updatedAt}`,
    sections: [
      { title: '1. Aceitação e cadastro', text: ['Ao acessar a loja ou concluir uma compra, você concorda com estes termos e com a Política de Privacidade. Para comprar, informe dados verdadeiros, completos e atualizados. Você é responsável por manter a senha da conta em segurança e deve comunicar qualquer uso não autorizado.'] },
      { title: '2. Produtos, preços e disponibilidade', text: ['Apresentamos descrições e imagens com o máximo de fidelidade possível, mas cores podem variar conforme a tela. Preços, promoções e estoque podem ser alterados sem aviso prévio, preservadas as compras já confirmadas. Erros evidentes de cadastro serão informados antes de qualquer correção ou cancelamento.'] },
      { title: '3. Pedido e pagamento', text: ['O envio do pedido não garante sua aprovação. A compra é confirmada após a validação do pagamento e da disponibilidade dos itens. Em caso de recusa, indisponibilidade ou suspeita de fraude, entraremos em contato e, se necessário, cancelaremos a operação com o estorno dos valores pagos.'] },
      { title: '4. Entrega, trocas e cancelamentos', text: ['Prazos e custos são apresentados durante a compra e começam a contar conforme indicado na página de Prazos de entrega. Solicitações de troca, devolução e arrependimento seguem a legislação aplicável e as regras publicadas em Trocas e devoluções.'] },
      { title: '5. Uso adequado e propriedade intelectual', text: ['É proibido usar a loja para fraude, violação de direitos, tentativa de acesso indevido ou atividades ilegais. Textos, identidade visual, fotografias próprias e demais conteúdos da loja são protegidos e não podem ser reproduzidos comercialmente sem autorização. Marcas de terceiros pertencem aos seus respectivos titulares.'] },
      { title: '6. Atendimento e legislação', text: ['Estes termos são regidos pela legislação brasileira e não limitam direitos garantidos ao consumidor. Dúvidas podem ser enviadas para contato@papelariacomercial.com ou esclarecidas pelo telefone (11) 4000-0000, de segunda a sexta, das 8h às 18h.'] },
    ],
  },
  help: {
    eyebrow: 'Atendimento', title: 'Central de ajuda',
    intro: 'Respostas rápidas para acompanhar seu pedido, cuidar da sua conta e resolver imprevistos.', note: 'Atendimento de segunda a sexta, das 8h às 18h',
    sections: [
      { title: 'Como acompanho meu pedido?', text: ['Entre na sua conta e acesse “Meus Pedidos”. Lá você encontra o status atualizado de cada compra. Quando o pedido for enviado, as informações de rastreamento disponibilizadas pela transportadora serão associadas ao atendimento da compra.'] },
      { title: 'Posso alterar ou cancelar uma compra?', text: ['Fale conosco o quanto antes. Antes da separação, tentaremos alterar ou cancelar o pedido. Depois do envio, a solução dependerá da etapa logística e poderá seguir o processo de devolução.'] },
      { title: 'O pagamento não foi aprovado. O que fazer?', text: ['Confira os dados informados e o limite ou saldo disponível. Por segurança, a instituição de pagamento pode recusar a transação sem informar o motivo à loja. Você pode tentar novamente ou usar outro meio disponível no checkout.'] },
      { title: 'Meu pedido chegou com problema', text: ['Guarde a embalagem, fotografe o produto e entre em contato informando o número do pedido. Se houver avaria, item incorreto ou falta de produto, nossa equipe analisará o caso e orientará a reposição, troca ou reembolso adequado.'] },
      { title: 'Ainda precisa de ajuda?', text: ['Envie um e-mail para contato@papelariacomercial.com ou ligue para (11) 4000-0000. Tenha em mãos o número do pedido e o e-mail usado na compra para agilizar o atendimento.'] },
    ],
  },
  returns: {
    eyebrow: 'Compra tranquila', title: 'Trocas e devoluções',
    intro: 'Se algo não saiu como esperado, explicamos como solicitar troca, devolução ou reembolso.', note: 'Guarde o produto e a embalagem até a conclusão do atendimento',
    sections: [
      { title: 'Arrependimento da compra', text: ['Em compras feitas pela internet, você pode solicitar a devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor. O produto deve ser devolvido, sempre que possível, com embalagem, acessórios e demais itens recebidos.'] },
      { title: 'Produto com defeito', text: ['Se identificar defeito, entre em contato assim que possível e informe o número do pedido, a descrição do problema e, quando puder, envie fotos ou vídeo. A solicitação será tratada dentro dos prazos e garantias previstos na legislação, considerando a natureza do produto.'] },
      { title: 'Item avariado, incorreto ou faltando', text: ['Avise nossa equipe em até 7 dias corridos após o recebimento. Não descarte a embalagem e registre imagens da caixa, etiqueta e produto. Após a análise, providenciaremos a solução adequada sem custo adicional quando a falha for confirmada.'] },
      { title: 'Como solicitar', text: ['Envie um e-mail para contato@papelariacomercial.com com seu nome, número do pedido, item envolvido, motivo da solicitação e evidências disponíveis. Nossa equipe responderá com as instruções e, quando aplicável, o procedimento de postagem ou coleta. Não envie o produto sem orientação prévia.'] },
      { title: 'Reembolso', text: ['O reembolso é solicitado após o recebimento e a conferência do item devolvido, respeitados os direitos do consumidor. A devolução ocorre pelo mesmo meio de pagamento sempre que possível. O prazo para o valor aparecer depende da instituição financeira ou administradora do cartão.'] },
    ],
  },
  delivery: {
    eyebrow: 'Envio e recebimento', title: 'Prazos de entrega',
    intro: 'Entenda quando o prazo começa, como ele é calculado e o que fazer em caso de atraso.', note: 'O prazo exato e o valor do frete aparecem antes da conclusão da compra',
    sections: [
      { title: 'Como o prazo é calculado', text: ['O prazo varia conforme o CEP, a modalidade de envio, a disponibilidade dos produtos e a operação da transportadora. A estimativa exibida no checkout considera dias úteis e é apresentada antes do pagamento.'] },
      { title: 'Quando começa a contar', text: ['A contagem começa no primeiro dia útil após a confirmação do pagamento. Compras aprovadas em fins de semana ou feriados entram em processamento no próximo dia útil. O tempo de análise do pagamento não integra o prazo de transporte.'] },
      { title: 'Separação e envio', text: ['Depois da aprovação, o pedido passa por separação, conferência e embalagem. Quando houver produtos com disponibilidades diferentes, o prazo do pedido poderá considerar o item com maior tempo de preparação.'] },
      { title: 'Tentativas de entrega', text: ['Confira o endereço antes de finalizar a compra e garanta que uma pessoa autorizada possa receber o pacote. Reenvios causados por endereço incorreto, ausência recorrente ou recusa indevida podem gerar novo prazo e cobrança adicional de frete.'] },
      { title: 'Atrasos e ocorrências', text: ['Eventos excepcionais, como condições climáticas, restrições locais ou períodos de alta demanda, podem afetar a estimativa. Se o prazo informado terminar sem a entrega, fale conosco com o número do pedido para abrirmos a verificação e apresentarmos uma solução.'] },
    ],
  },
};

export default function InformationPage({ page }) {
  const content = pages[page];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${content.title} | Papelaria Pro`;
  }, [content.title]);

  return (
    <div className="info-page">
      <nav className="info-breadcrumb" aria-label="Navegação estrutural">
        <Link to="/">Início</Link><span aria-hidden="true">›</span><span>{content.title}</span>
      </nav>

      <header className="info-hero">
        <p className="info-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="info-intro">{content.intro}</p>
        <p className="info-note">{content.note}</p>
      </header>

      <div className="info-layout">
        <aside className="info-index" aria-label="Nesta página">
          <strong>Nesta página</strong>
          <ol>
            {content.sections.map((section, index) => (
              <li key={section.title}><a href={`#secao-${index + 1}`}>{section.title.replace(/^\d+\.\s*/, '')}</a></li>
            ))}
          </ol>
        </aside>

        <article className="info-content">
          {content.sections.map((section, index) => (
            <section id={`secao-${index + 1}`} key={section.title}>
              <span className="info-section-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              </div>
            </section>
          ))}
        </article>
      </div>

      <section className="info-contact-card" aria-labelledby="info-contact-title">
        <div>
          <p className="info-eyebrow">Podemos ajudar?</p>
          <h2 id="info-contact-title">Fale com a nossa equipe</h2>
          <p>Atendimento de segunda a sexta, das 8h às 18h.</p>
        </div>
        <div className="info-contact-actions">
          <a className="btn btn-primary" href="mailto:contato@papelariacomercial.com">Enviar e-mail</a>
          <Link className="btn btn-secondary" to="/central-de-ajuda">Ver central de ajuda</Link>
        </div>
      </section>
    </div>
  );
}
