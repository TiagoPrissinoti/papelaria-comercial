import { useCart } from '../hooks/useCart';
import { Link } from 'react-router-dom';

export default function CartPage() {
  const { items, total, upsertItem, removeItem } = useCart();

  return (
    <section>
      <h1>Carrinho</h1>
      {!items.length && <p>Seu carrinho esta vazio.</p>}
      {items.map((item) => (
        <div key={item.product_id} className="cart-row">
          <strong>{item.name}</strong>
          <span>R$ {Number(item.price).toFixed(2)}</span>
          <input type="number" min="1" value={item.quantity} onChange={(e) => upsertItem(item.product_id, Number(e.target.value))} />
          <button className="btn btn-secondary" onClick={() => removeItem(item.product_id)}>Remover</button>
        </div>
      ))}
      <h3>Total: R$ {Number(total).toFixed(2)}</h3>
      <Link className="btn btn-primary" to="/checkout">Finalizar compra</Link>
    </section>
  );
}
