import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const initialForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  image: null,
  images: []
};

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [categoryName, setCategoryName] = useState('');
  const [editCategoryNames, setEditCategoryNames] = useState({});

  async function loadData() {
    setLoading(true);
    const [p, c, o] = await Promise.all([api.get('/products'), api.get('/categories'), api.get('/orders')]);
    setProducts(p.data);
    setCategories(c.data);
    setOrders(o.data);
    setEditCategoryNames((prev) => {
      const next = { ...prev };
      for (const category of c.data) {
        if (!next[category.id]) next[category.id] = category.name;
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await api.post('/categories', { name: categoryName.trim() });
    setCategoryName('');
    await loadData();
  }

  async function renameCategory(categoryId) {
    const nextName = (editCategoryNames[categoryId] || '').trim();
    if (!nextName) return;
    await api.put(`/categories/${categoryId}`, { name: nextName });
    await loadData();
  }

  async function assignCategory(productId, nextCategoryId) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      categoryId: Number(nextCategoryId)
    };

    await api.put(`/products/${productId}`, payload);
    await loadData();
  }

  async function createProduct(event) {
    event.preventDefault();
    const data = new FormData();
    data.append('name', form.name);
    data.append('description', form.description);
    data.append('price', form.price);
    data.append('stock', form.stock);
    data.append('categoryId', form.categoryId);
    if (form.image) data.append('image', form.image);
    for (const file of form.images) data.append('images', file);

    await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    setModalOpen(false);
    setPreview([]);
    setForm(initialForm);
    await loadData();
  }

  async function deleteProduct(id) {
    await api.delete(`/products/${id}`);
    await loadData();
  }

  const totalRevenue = useMemo(() => orders.reduce((acc, item) => acc + Number(item.total), 0), [orders]);

  return (
    <section>
      <div className="admin-top">
        <h1>Painel Admin</h1>
      </div>

      <div className="kpis">
        <article><h3>{products.length}</h3><p>Produtos</p></article>
        <article><h3>{categories.length}</h3><p>Categorias</p></article>
        <article><h3>{orders.length}</h3><p>Pedidos</p></article>
        <article><h3>R$ {totalRevenue.toFixed(2)}</h3><p>Volume vendido</p></article>
      </div>

      {loading ? <p>Carregando dashboard...</p> : (
        <>
          <section className="admin-panel-block">
            <div className="section-head">
              <h2>Categorias principais</h2>
            </div>
            <form className="admin-inline-form" onSubmit={createCategory}>
              <Input
                placeholder="Nome da nova categoria"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                required
              />
              <Button type="submit">Criar categoria</Button>
            </form>

            <div className="admin-category-list">
              {categories.map((category) => (
                <form
                  key={category.id}
                  className="admin-category-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameCategory(category.id);
                  }}
                >
                  <Input
                    value={editCategoryNames[category.id] || ''}
                    onChange={(event) => setEditCategoryNames((prev) => ({ ...prev, [category.id]: event.target.value }))}
                    required
                  />
                  <Button type="submit" variant="secondary">Renomear</Button>
                </form>
              ))}
            </div>
          </section>

          <section className="admin-panel-block">
            <div className="section-head section-head-action">
              <h2>Produtos</h2>
              <Button onClick={() => setModalOpen(true)}>Novo produto</Button>
            </div>
            {products.map((product) => (
              <div key={product.id} className="cart-row">
                <span>{product.name}</span>
                <span>R$ {Number(product.price).toFixed(2)}</span>
                <span>Estoque: {product.stock}</span>
                <select
                  className="input"
                  value={product.category_id || ''}
                  onChange={(event) => assignCategory(product.id, event.target.value)}
                >
                  <option value="" disabled>Selecione categoria</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <Button variant="secondary" onClick={() => deleteProduct(product.id)}>Excluir</Button>
              </div>
            ))}
          </section>

          <section className="admin-panel-block">
            <div className="section-head">
              <h2>Pedidos</h2>
            </div>
            {orders.map((o) => (
              <div key={o.id} className="cart-row">
                <span>#{o.id} - {o.user_name}</span>
                <span>{o.status}</span>
                <span>R$ {Number(o.total).toFixed(2)}</span>
              </div>
            ))}
          </section>
        </>
      )}

      <Modal title="Novo produto" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="admin-form" onSubmit={createProduct}>
          <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input placeholder="Preco" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />

          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">Selecione a categoria</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>

          <label>Imagem principal</label>
          <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />

          <label>Galeria (multiplas)</label>
          <Input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setForm({ ...form, images: files });
              setPreview(files.map((file) => URL.createObjectURL(file)));
            }}
          />

          <div className="thumbs">
            {preview.map((src) => <img key={src} src={src} alt="preview" />)}
          </div>

          <Button type="submit">Salvar produto</Button>
        </form>
      </Modal>
    </section>
  );
}
