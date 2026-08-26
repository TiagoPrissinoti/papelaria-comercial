import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { getUploadsBaseUrl } from '../services/api';
import { criarPagamento } from '../services/pagamentoService';
import { listarEnderecos, salvarEndereco } from '../services/addressService';

const fallback = 'https://via.placeholder.com/120x120?text=Sem+Imagem';
const emptyAddress = {
  label: 'Casa', recipient_name: '', phone: '', postal_code: '', street: '', number: '',
  complement: '', neighborhood: '', city: '', state: '', is_default: true
};

function formatCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

function AddressForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial || emptyAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      setSaving(true);
      onSaved(await salvarEndereco(form, initial?.id));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Nao foi possivel salvar o endereco.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="address-form" onSubmit={submit}>
      <div className="address-form-heading"><div><h3>{initial ? 'Editar endereço' : 'Novo endereço'}</h3><p>Informe quem vai receber o pedido.</p></div></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="address-fields">
        <label className="field-wide">Nome do destinatário*<input required maxLength="100" autoComplete="name" value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} /></label>
        <label>Telefone com DDD*<input required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label>Identificação<input maxLength="30" placeholder="Casa, trabalho..." value={form.label} onChange={(e) => set('label', e.target.value)} /></label>
        <label>CEP*<input required inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={formatCep(form.postal_code)} onChange={(e) => set('postal_code', e.target.value)} /></label>
        <label className="field-wide">Rua / Avenida*<input required maxLength="120" autoComplete="address-line1" value={form.street} onChange={(e) => set('street', e.target.value)} /></label>
        <label>Número*<input required maxLength="20" value={form.number} onChange={(e) => set('number', e.target.value)} /></label>
        <label>Complemento<input maxLength="100" autoComplete="address-line2" placeholder="Apto, bloco..." value={form.complement || ''} onChange={(e) => set('complement', e.target.value)} /></label>
        <label>Bairro*<input required maxLength="80" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></label>
        <label>Cidade*<input required maxLength="80" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
        <label>Estado (UF)*<input required maxLength="2" autoComplete="address-level1" placeholder="SP" value={form.state} onChange={(e) => set('state', e.target.value.toUpperCase())} /></label>
      </div>
      <label className="default-address-check"><input type="checkbox" checked={Boolean(form.is_default)} onChange={(e) => set('is_default', e.target.checked)} /> Usar como meu endereço principal</label>
      <div className="address-form-actions"><button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar endereço'}</button></div>
    </form>
  );
}

export default function CartPage() {
  const { items, total, upsertItem, removeItem } = useCart();
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(undefined);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState('');
  const itemCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  useEffect(() => {
    listarEnderecos()
      .then((data) => {
        setAddresses(data);
        setSelectedAddressId((data.find((address) => address.is_default) || data[0])?.id || null);
        if (!data.length) setEditingAddress(null);
      })
      .catch(() => setAddressError('Nao foi possivel carregar seus enderecos.'))
      .finally(() => setLoadingAddresses(false));
  }, []);

  function handleSaved(saved) {
    setAddresses((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : (saved.is_default ? { ...item, is_default: 0 } : item))
      : [saved, ...current.map((item) => saved.is_default ? { ...item, is_default: 0 } : item)]);
    setSelectedAddressId(saved.id);
    setEditingAddress(undefined);
    setAddressError('');
  }

  async function handleCheckout() {
    if (!selectedAddressId) {
      setAddressError('Cadastre e selecione um endereço de entrega antes de continuar.');
      setEditingAddress(null);
      return;
    }
    try {
      setLoadingPayment(true);
      const response = await criarPagamento(selectedAddressId);
      window.location.href = response.init_point;
    } catch (error) {
      const message = error?.response?.data?.message || 'Nao foi possivel iniciar o pagamento.';
      const guidedMessage = message.includes('MERCADO_PAGO_ACCESS_TOKEN')
        ? import.meta.env.PROD ? `${message} Configure essa variavel secreta no servico de hospedagem e publique um novo deploy.` : `${message} Abra o arquivo backend/.env, preencha MERCADO_PAGO_ACCESS_TOKEN com o token do Mercado Pago e reinicie o backend.`
        : message.includes('SDK mercadopago') ? `${message} Rode npm install dentro da pasta backend e reinicie o servidor.` : message;
      window.alert(guidedMessage);
    } finally { setLoadingPayment(false); }
  }

  return (
    <section className="checkout-shell cart-page">
      <div className="checkout-hero">
        <div><p className="hero-kicker">Resumo da compra</p><h1>Carrinho</h1><p className="muted">Revise seus itens, escolha onde receber e siga para o pagamento.</p></div>
        <div className="checkout-stepper"><span className="checkout-step done">1. Carrinho</span><span className="checkout-step active">2. Entrega</span><span className="checkout-step">3. Pagamento</span><span className="checkout-step">4. Confirmação</span></div>
      </div>

      {!items.length ? <article className="empty-checkout"><h2>Seu carrinho está vazio</h2><p>Escolha alguns produtos na vitrine para começar sua compra.</p><Link className="btn btn-primary" to="/">Voltar para a loja</Link></article> : (
        <div className="checkout-grid">
          <div className="checkout-main-column">
            <section className="checkout-panel delivery-panel" aria-labelledby="delivery-title">
              <div className="section-head split-head"><div><p className="panel-step">Entrega</p><h2 id="delivery-title">Onde você quer receber?</h2></div>{addresses.length > 0 && editingAddress === undefined && <button className="btn btn-secondary" onClick={() => setEditingAddress(null)}>+ Novo endereço</button>}</div>
              {addressError && <p className="error-message" role="alert">{addressError}</p>}
              {loadingAddresses ? <p className="muted">Carregando endereços...</p> : editingAddress !== undefined ? <AddressForm initial={editingAddress} onCancel={() => setEditingAddress(addresses.length ? undefined : null)} onSaved={handleSaved} /> : (
                <div className="address-list">{addresses.map((address) => <label key={address.id} className={`address-option ${selectedAddressId === address.id ? 'selected' : ''}`}><input type="radio" name="delivery-address" checked={selectedAddressId === address.id} onChange={() => { setSelectedAddressId(address.id); setAddressError(''); }} /><span className="address-pin" aria-hidden="true">⌖</span><span className="address-copy"><strong>{address.label} {address.is_default ? <small>Principal</small> : null}</strong><span>{address.recipient_name} · {address.phone}</span><span>{address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''}</span><span>{address.neighborhood} · {address.city}/{address.state} · CEP {formatCep(address.postal_code)}</span></span><button type="button" className="address-edit" onClick={(event) => { event.preventDefault(); setEditingAddress(address); }}>Editar</button></label>)}</div>
              )}
            </section>

            <section className="checkout-panel">
              <div className="section-head split-head"><h2>Itens selecionados</h2><small>{itemCount} item(ns)</small></div>
              <div className="checkout-list">{items.map((item) => {
                const image = item.image ? `${getUploadsBaseUrl()}${item.image}` : fallback;
                const subtotal = Number(item.price) * Number(item.quantity);
                return <article key={item.product_id} className="checkout-item"><img className="checkout-thumb" src={image} alt={item.name} onError={(event) => { event.currentTarget.src = fallback; }} /><div className="checkout-item-copy"><strong>{item.name}</strong><span>R$ {Number(item.price).toFixed(2)} por unidade</span><small>Subtotal do item: R$ {subtotal.toFixed(2)}</small></div><div className="checkout-item-controls"><label>Quantidade<input type="number" min="1" value={item.quantity} onChange={(e) => upsertItem(item.product_id, Number(e.target.value))} /></label><button className="btn btn-secondary" onClick={() => removeItem(item.product_id)}>Remover</button></div></article>;
              })}</div>
            </section>
          </div>

          <aside className="checkout-panel checkout-summary"><h2>Resumo</h2><div className="summary-box"><div><span>Itens</span><strong>{itemCount}</strong></div><div><span>Subtotal</span><strong>R$ {Number(total).toFixed(2)}</strong></div><div><span>Entrega</span><strong>A combinar</strong></div></div><div className="summary-total"><span>Total</span><strong>R$ {Number(total).toFixed(2)}</strong></div>{selectedAddress ? <div className="summary-address"><small>ENTREGA EM</small><strong>{selectedAddress.street}, {selectedAddress.number}</strong><span>{selectedAddress.city}/{selectedAddress.state} · {formatCep(selectedAddress.postal_code)}</span></div> : <p className="address-required">Selecione um endereço para continuar</p>}<p className="muted">Você revisará o pagamento no ambiente seguro do Mercado Pago.</p><div className="checkout-security-note"><span aria-hidden="true">✓</span><p><strong>Pagamento protegido</strong><small>Seus dados de entrega ficam vinculados ao pedido.</small></p></div><button className="btn btn-primary checkout-cta" onClick={handleCheckout} disabled={loadingPayment || !selectedAddressId}>{loadingPayment ? 'Preparando...' : 'Continuar para o pagamento'}</button></aside>
        </div>
      )}
    </section>
  );
}
