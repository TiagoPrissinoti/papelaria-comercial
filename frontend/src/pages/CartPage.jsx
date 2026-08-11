import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { getUploadsBaseUrl } from '../services/api';
import { criarPagamento } from '../services/pagamentoService';

const fallback = 'https://via.placeholder.com/120x120?text=Sem+Imagem';

export default function CartPage() {
  const { items, total, upsertItem, removeItem } = useCart();
  const [loadingPayment, setLoadingPayment] = useState(false);
  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  async function handleCheckout() {
    try {
      setLoadingPayment(true);
      const response = await criarPagamento();
      window.location.href = response.init_point;
    } catch (error) {
      const message = error?.response?.data?.message || 'Nao foi possivel iniciar o pagamento.';
      const guidedMessage = message.includes('MERCADO_PAGO_ACCESS_TOKEN')
        ? import.meta.env.PROD
          ? `${message} Configure essa variavel secreta no servico de hospedagem e publique um novo deploy.`
          : `${message} Abra o arquivo backend/.env, preencha MERCADO_PAGO_ACCESS_TOKEN com o token do Mercado Pago e reinicie o backend.`
        : message.includes('SDK mercadopago')
          ? `${message} Rode npm install dentro da pasta backend e reinicie o servidor.`
          : message;
      window.alert(guidedMessage);
    } finally {
      setLoadingPayment(false);
    }
  }

  return (
    <section className="checkout-shell cart-page">
      <div className="checkout-hero">
        <div>
          <p className="hero-kicker">Resumo da compra</p>
          <h1>Carrinho</h1>
          <p className="muted">Revise os itens, ajuste quantidades e siga para o pagamento em um fluxo mais elegante.</p>
        </div>
        <div className="checkout-stepper">
          <span className="checkout-step active">1. Carrinho</span>
          <span className="checkout-step">2. Pagamento</span>
          <span className="checkout-step">3. Confirmação</span>
        </div>
      </div>

      {!items.length ? (
        <article className="empty-checkout">
          <h2>Seu carrinho está vazio</h2>
          <p>Escolha alguns produtos na vitrine para começar sua compra.</p>
          <Link className="btn btn-primary" to="/">Voltar para a loja</Link>
        </article>
      ) : (
        <div className="checkout-grid">
          <div className="checkout-panel">
            <div className="section-head split-head">
              <h2>Itens selecionados</h2>
              <small>{itemCount} item(ns)</small>
            </div>

            <div className="checkout-list">
              {items.map((item) => {
                const image = item.image ? `${getUploadsBaseUrl()}${item.image}` : fallback;
                const subtotal = Number(item.price) * Number(item.quantity);

                return (
                  <article key={item.product_id} className="checkout-item">
                    <img
                      className="checkout-thumb"
                      src={image}
                      alt={item.name}
                      onError={(event) => { event.currentTarget.src = fallback; }}
                    />
                    <div className="checkout-item-copy">
                      <strong>{item.name}</strong>
                      <span>R$ {Number(item.price).toFixed(2)} por unidade</span>
                      <small>Subtotal do item: R$ {subtotal.toFixed(2)}</small>
                    </div>
                    <div className="checkout-item-controls">
                      <label>
                        Quantidade
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => upsertItem(item.product_id, Number(e.target.value))}
                        />
                      </label>
                      <button className="btn btn-secondary" onClick={() => removeItem(item.product_id)}>Remover</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="checkout-panel checkout-summary">
            <h2>Resumo</h2>
            <div className="summary-box">
              <div><span>Itens</span><strong>{itemCount}</strong></div>
              <div><span>Subtotal</span><strong>R$ {Number(total).toFixed(2)}</strong></div>
              <div><span>Entrega</span><strong>A combinar</strong></div>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>R$ {Number(total).toFixed(2)}</strong>
            </div>
            <p className="muted">A próxima etapa abre o Checkout Pro do Mercado Pago em uma nova experiência segura.</p>
            <button className="btn btn-primary checkout-cta" onClick={handleCheckout} disabled={loadingPayment}>
              {loadingPayment ? 'Preparando...' : 'Finalizar Compra'}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
