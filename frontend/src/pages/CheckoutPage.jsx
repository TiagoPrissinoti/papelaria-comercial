import { Link, useSearchParams } from 'react-router-dom';

function getStatusMessage(status) {
  if (status === 'approved') return 'Pagamento aprovado';
  if (status === 'pending') return 'Pagamento em análise';
  if (status === 'rejected' || status === 'cancelled' || status === 'refunded') return 'Pagamento recusado';
  return '';
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('payment_status');
  const pedidoId = searchParams.get('pedido_id');
  const message = getStatusMessage(status);

  return (
    <section className="checkout-shell">
      <article className="empty-checkout">
        <p className="hero-kicker">{message ? 'Retorno do pagamento' : 'Checkout Pro'}</p>
        <h1>{message || 'Pagamento em andamento'}</h1>
        <p>
          {message
            ? `${pedidoId ? `Pedido #${pedidoId}. ` : ''}O status final é confirmado pelo webhook do Mercado Pago em segundo plano.`
            : 'Você será redirecionado de volta para esta tela após a confirmação do pagamento.'}
        </p>
        <div className="checkout-result-actions">
          <Link className="btn btn-primary" to="/meus-pedidos">Ver meus pedidos</Link>
          <Link className="btn btn-secondary" to="/">Voltar para a loja</Link>
        </div>
      </article>
    </section>
  );
}
