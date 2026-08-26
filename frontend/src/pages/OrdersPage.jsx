import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getUploadsBaseUrl } from '../services/api';
import Modal from '../components/ui/Modal';

const fallback = 'https://via.placeholder.com/80x80?text=Sem+Img';
const statusLabel = {
  pendente: 'pendente',
  pago: 'finalizado',
  em_andamento: 'em andamento',
  enviado: 'saiu para entrega',
  entregue: 'entregue',
  cancelado: 'cancelado',
  reembolsado: 'reembolsado'
};
const paymentStatusLabel = {
  pending: 'aguardando pagamento',
  approved: 'pagamento aprovado',
  rejected: 'pagamento recusado',
  cancelled: 'pagamento cancelado',
  refunded: 'pagamento reembolsado'
};
const flowSteps = [
  { key: 'pendente', title: 'Pedido recebido' },
  { key: 'pago', title: 'Pagamento aprovado' },
  { key: 'em_andamento', title: 'Em separacao' },
  { key: 'enviado', title: 'Em transito' },
  { key: 'entregue', title: 'Pedido entregue' }
];

function formatDateTime(value) {
  if (!value) return '--/--/---- --:--';
  const date = new Date(value);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function getShippingAddress(order) {
  try {
    return order?.shipping_address_json ? JSON.parse(order.shipping_address_json) : null;
  } catch {
    return null;
  }
}

function ShippingAddress({ order }) {
  const address = getShippingAddress(order);
  if (!address) return null;
  const cep = String(address.postal_code || '').replace(/(\d{5})(\d{3})/, '$1-$2');
  return (
    <div className="order-delivery-address">
      <strong>Endereço de entrega</strong>
      <span>{address.recipient_name}</span>
      <span>{address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''}</span>
      <span>{address.neighborhood} · {address.city}/{address.state} · CEP {cep}</span>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [manageOrder, setManageOrder] = useState(null);

  useEffect(() => {
    api.get('/orders/my').then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  async function removeDeliveredOrder(orderId) {
    if (!window.confirm('Remover este pedido entregue do seu historico?')) return;
    await api.delete(`/orders/${orderId}/history`);
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    if (trackingOrder?.id === orderId) setTrackingOrder(null);
    if (manageOrder?.id === orderId) setManageOrder(null);
  }

  if (loading) return <div className="orders-loading"><div className="loading-spinner" /><p>Carregando seus pedidos...</p></div>;

  return (
    <section className="orders-page">
      <header className="page-heading"><div><p className="section-eyebrow">Sua conta</p><h1>Meus pedidos</h1><p>Acompanhe o pagamento, a separação e a entrega de cada compra.</p></div></header>
      {!orders.length && <div className="empty-state"><span aria-hidden="true">□</span><h3>Você ainda não tem pedidos</h3><p>Quando fizer sua primeira compra, ela aparecerá aqui.</p><Link className="btn btn-primary" to="/">Explorar produtos</Link></div>}
      {orders.map((order) => (
        <article key={order.id} className="order-card">
          <div className="order-head">
            <div><small>Pedido realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}</small><h3>Pedido #{order.id}</h3></div>
            <span className={`order-status-badge ${order.status}`}>{statusLabel[order.status] || order.status}</span>
          </div>
          <p>Total: R$ {Number(order.total).toFixed(2)} | Rastreio: GFL-{order.id}</p>
          <p><strong>Pagamento:</strong> {paymentStatusLabel[order.payment_status] || order.payment_status}</p>
          {order.fulfillment_error && <p className="error-message">{order.fulfillment_error}</p>}

          <div className="order-actions-row">
            <button type="button" className="btn btn-secondary" onClick={() => setTrackingOrder(order)}>
              Rastreio detalhado
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setManageOrder(order)}>
              Gerenciar pedido
            </button>
            {order.status === 'entregue' && (
              <button type="button" className="btn btn-secondary danger-btn" onClick={() => removeDeliveredOrder(order.id)}>
                Remover do historico
              </button>
            )}
          </div>

          <div className="order-flow">
            {flowSteps.map((step, stepIndex) => {
              const currentIndex = flowSteps.findIndex((item) => item.key === order.status);
              const isDone = stepIndex <= (currentIndex < 0 ? 0 : currentIndex);
              return (
                <div key={step.key} className={`flow-step ${isDone ? 'done' : ''}`}>
                  <div className="flow-dot" />
                  <div className="flow-copy">
                    <strong>{step.title}</strong>
                    <small>{isDone ? formatDateTime(order.created_at) : '--/--/---- --:--'}</small>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="order-items-list">
            {order.items?.map((item) => (
              <div key={item.id} className="order-item-row">
                <img
                  className="order-item-image"
                  src={item.image ? `${getUploadsBaseUrl()}${item.image}` : fallback}
                  alt={item.name}
                  onError={(event) => { event.currentTarget.src = fallback; }}
                />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.quantity}x - R$ {Number(item.unit_price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}

      <Modal
        title={trackingOrder ? `Rastreio do pedido #${trackingOrder.id}` : 'Rastreio do pedido'}
        open={Boolean(trackingOrder)}
        onClose={() => setTrackingOrder(null)}
      >
        {trackingOrder && (
          <div className="order-modal-body">
            <p><strong>Codigo de rastreio:</strong> GFL-{trackingOrder.id}</p>
            <p><strong>Status atual:</strong> {statusLabel[trackingOrder.status] || trackingOrder.status}</p>
            <p><strong>Ultima atualizacao:</strong> {formatDateTime(trackingOrder.created_at)}</p>
            <ShippingAddress order={trackingOrder} />
            <div className="order-flow compact">
              {flowSteps.map((step, stepIndex) => {
                const currentIndex = flowSteps.findIndex((item) => item.key === trackingOrder.status);
                const isDone = stepIndex <= (currentIndex < 0 ? 0 : currentIndex);
                return (
                  <div key={step.key} className={`flow-step ${isDone ? 'done' : ''}`}>
                    <div className="flow-dot" />
                    <div className="flow-copy">
                      <strong>{step.title}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={manageOrder ? `Gerenciar pedido #${manageOrder.id}` : 'Gerenciar pedido'}
        open={Boolean(manageOrder)}
        onClose={() => setManageOrder(null)}
      >
        {manageOrder && (
          <div className="order-modal-body">
            <p><strong>Status:</strong> {statusLabel[manageOrder.status] || manageOrder.status}</p>
            <p><strong>Total:</strong> R$ {Number(manageOrder.total).toFixed(2)}</p>
            <p><strong>Data:</strong> {formatDateTime(manageOrder.created_at)}</p>
            <ShippingAddress order={manageOrder} />
            <ul className="order-manage-list">
              <li>Para ajustes ou cancelamento, entre em contato com o suporte informando o numero do pedido.</li>
              <li>Assim que o pedido for preparado, o status muda para "em andamento".</li>
              <li>Quando sair para entrega, o status muda para "saiu para entrega".</li>
            </ul>
          </div>
        )}
      </Modal>
    </section>
  );
}
