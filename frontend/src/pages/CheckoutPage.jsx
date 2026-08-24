import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../hooks/useCart';

const statusMessage = {
  approved: 'Pagamento aprovado',
  pending: 'Pagamento em analise',
  rejected: 'Pagamento recusado',
  cancelled: 'Pagamento cancelado',
  refunded: 'Pagamento reembolsado'
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const pedidoId = searchParams.get('pedido_id');
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const returnHint = searchParams.get('payment_status');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(Boolean(pedidoId));
  const [error, setError] = useState('');
  const { refreshCart } = useCart();

  useEffect(() => {
    if (!pedidoId || !/^\d+$/.test(pedidoId)) {
      setChecking(false);
      return undefined;
    }

    let cancelled = false;
    let timer;
    let attempts = 0;

    async function checkOrder() {
      try {
        const { data } = attempts === 0 && paymentId && /^\d+$/.test(paymentId)
          ? await api.post(`/pagamento/pedidos/${pedidoId}/reconciliar`, { payment_id: paymentId })
          : await api.get(`/pagamento/pedidos/${pedidoId}`);
        if (cancelled) return;
        setStatus(data.payment_status);
        setError(data.fulfillment_error || '');
        attempts += 1;

        if (data.payment_status === 'approved') {
          await refreshCart();
          setChecking(false);
          return;
        }
        if (['rejected', 'cancelled', 'refunded'].includes(data.payment_status) || attempts >= 10) {
          setChecking(false);
          return;
        }
        timer = window.setTimeout(checkOrder, 2000);
      } catch (requestError) {
        if (cancelled) return;
        attempts += 1;
        const statusCode = requestError?.response?.status;
        const permanentFailure = [400, 403, 409, 422].includes(statusCode);
        if (!permanentFailure && attempts < 10) {
          timer = window.setTimeout(checkOrder, 2000);
          return;
        }
        setError(requestError?.response?.data?.message
          || 'Nao foi possivel confirmar o pedido agora. Consulte Meus pedidos em instantes.');
        setChecking(false);
      }
    }

    checkOrder();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pedidoId, paymentId]);

  const effectiveStatus = status || (checking ? 'pending' : null);
  const message = statusMessage[effectiveStatus] || 'Pagamento em andamento';

  return (
    <section className="checkout-shell">
      <article className="empty-checkout">
        <p className="hero-kicker">Retorno do pagamento</p>
        {checking && <div className="loading-spinner" aria-hidden="true" />}
        <h1>{checking ? 'Confirmando pagamento...' : message}</h1>
        <p>
          {pedidoId ? `Pedido #${pedidoId}. ` : ''}
          {checking
            ? 'Estamos aguardando a confirmacao segura enviada pelo Mercado Pago.'
            : status
              ? 'Este status foi consultado diretamente no servidor da loja.'
              : `O retorno informou ${returnHint || 'um pagamento em andamento'}, mas a confirmacao final depende do webhook.`}
        </p>
        {error && <p className="error-message">{error}</p>}
        <div className="checkout-result-actions">
          <Link className="btn btn-primary" to="/meus-pedidos">Ver meus pedidos</Link>
          <Link className="btn btn-secondary" to="/">Voltar para a loja</Link>
        </div>
      </article>
    </section>
  );
}
