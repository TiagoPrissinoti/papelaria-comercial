import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../hooks/useCart';

export default function CheckoutPage() {
  const { refreshCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function handleCheckout() {
    try {
      setLoading(true);
      const { data: order } = await api.post('/orders/checkout');
      await api.post(`/orders/${order.id}/pay`);
      await refreshCart();
      setMessage(`Pedido #${order.id} pago com sucesso.`);
      setTimeout(() => navigate('/meus-pedidos'), 800);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro no checkout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1>Checkout</h1>
      <p>Resumo pronto para pagamento simulado.</p>
      <button className="btn btn-primary" onClick={handleCheckout} disabled={loading}>{loading ? 'Processando...' : 'Pagar agora'}</button>
      {message && <p className="toast">{message}</p>}
    </section>
  );
}
