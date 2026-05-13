import { useEffect, useState } from 'react';
import api, { getUploadsBaseUrl } from '../services/api';

const fallback = 'https://via.placeholder.com/80x80?text=Sem+Img';
const statusLabel = {
  pendente: 'pendente',
  pago: 'finalizado',
  em_andamento: 'em andamento',
  enviado: 'saiu para entrega',
  entregue: 'entregue'
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

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/my').then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando pedidos...</p>;

  return (
    <section>
      <h1>Meus pedidos</h1>
      {orders.map((order, index) => (
        <article key={order.id} className="order-card">
          <div className="order-head">
            <h3>Pedido #{index + 1}</h3>
            <span>{statusLabel[order.status] || order.status}</span>
          </div>
          <p>Total: R$ {Number(order.total).toFixed(2)} | Rastreio: GFL-{order.id}</p>

          <div className="order-actions-row">
            <button type="button" className="btn btn-secondary">Rastreio detalhado</button>
            <button type="button" className="btn btn-primary">Gerenciar pedido</button>
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
    </section>
  );
}
