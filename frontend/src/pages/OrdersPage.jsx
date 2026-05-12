import { useEffect, useState } from 'react';
import api, { getUploadsBaseUrl } from '../services/api';

const fallback = 'https://via.placeholder.com/80x80?text=Sem+Img';
const statusLabel = { pendente: 'pendente', pago: 'finalizado', enviado: 'enviado', entregue: 'entregue' };

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
          <p>Total: R$ {Number(order.total).toFixed(2)}</p>

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
