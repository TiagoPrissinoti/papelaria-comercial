import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const initialForm = { name: '', description: '', price: '', costPrice: '', stock: '', categoryId: '', image: null, images: [] };
const pageSize = 6;
const statusLabel = { pendente: 'pendente', pago: 'finalizado', enviado: 'enviado', entregue: 'entregue' };

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_dark_mode') === '1');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    totals: { users: 0, products: 0, orders: 0, revenue: 0, cost: 0, profit: 0 },
    salesByStatus: {},
    recentOrders: []
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [editCategoryNames, setEditCategoryNames] = useState({});

  function notify(type, message) {
    setToast({ type, message });
    window.clearTimeout(window.__adminToastTimer);
    window.__adminToastTimer = window.setTimeout(() => setToast(null), 2600);
  }

  async function loadData() {
    setLoading(true);
    try {
      const [p, c, o, u, s] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/orders'),
        api.get('/admin/users'),
        api.get('/admin/reports/summary')
      ]);
      setProducts(p.data);
      setCategories(c.data);
      setOrders(o.data);
      setUsers(u.data);
      setSummary(s.data);
      setEditCategoryNames((prev) => {
        const next = { ...prev };
        for (const category of c.data) {
          if (!next[category.id]) next[category.id] = category.name;
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    localStorage.setItem('admin_dark_mode', darkMode ? '1' : '0');
  }, [darkMode]);

  const filteredUsers = useMemo(() => users.filter((item) => {
    const term = searchUser.trim().toLowerCase();
    const matchesTerm = !term || item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
    const matchesRole = !filterRole || item.role === filterRole;
    return matchesTerm && matchesRole;
  }), [users, searchUser, filterRole]);

  const pagedUsers = useMemo(() => filteredUsers.slice((userPage - 1) * pageSize, userPage * pageSize), [filteredUsers, userPage]);
  const userPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  async function createProduct(event) {
    event.preventDefault();
    const data = new FormData();
    data.append('name', form.name);
    data.append('description', form.description);
    data.append('price', form.price);
    data.append('costPrice', form.costPrice || 0);
    data.append('stock', form.stock);
    data.append('categoryId', form.categoryId);
    if (form.image) data.append('image', form.image);
    for (const file of form.images) data.append('images', file);
    await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    setModalOpen(false);
    setPreview([]);
    setForm(initialForm);
    notify('success', 'Produto criado com sucesso.');
    await loadData();
  }

  async function deleteProduct(id) {
    await api.delete(`/products/${id}`);
    notify('success', 'Produto removido.');
    await loadData();
  }

  async function createCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await api.post('/categories', { name: categoryName.trim() });
    setCategoryName('');
    notify('success', 'Categoria criada com sucesso.');
    await loadData();
  }

  async function renameCategory(categoryId) {
    const nextName = (editCategoryNames[categoryId] || '').trim();
    if (!nextName) return;
    await api.put(`/categories/${categoryId}`, { name: nextName });
    notify('success', 'Categoria atualizada.');
    await loadData();
  }

  async function updateUserRole(id, role) {
    await api.put(`/admin/users/${id}`, { role });
    notify('success', 'Permissao atualizada.');
    await loadData();
  }

  async function deleteUser(id) {
    await api.delete(`/admin/users/${id}`);
    notify('success', 'Usuario excluido.');
    await loadData();
  }

  function buildExportUrl(kind) {
    const params = new URLSearchParams();
    params.set('kind', kind);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    return `${api.defaults.baseURL}/admin/reports/export.csv?${params.toString()}`;
  }

  function printReport() {
    const content = orders
      .map((o) => `<tr><td>#${o.id}</td><td>${o.user_name}</td><td>${statusLabel[o.status] || o.status}</td><td>R$ ${Number(o.total).toFixed(2)}</td></tr>`)
      .join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Relatorio</title></head><body><h1>Relatorio de vendas</h1><table border="1" cellpadding="8" cellspacing="0"><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Total</th></tr>${content}</table></body></html>`);
    win.document.close();
    win.print();
  }

  const statusBars = Object.entries(summary.salesByStatus || {});

  return (
    <section className={`admin-shell ${menuOpen ? 'menu-open' : ''} ${darkMode ? 'dark-theme' : ''}`}>
      {menuOpen && <button className="sidebar-backdrop" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <h2>Painel</h2>
        {['dashboard', 'usuarios', 'produtos', 'relatorios', 'config'].map((item) => (
          <button
            key={item}
            className={`side-item ${tab === item ? 'active' : ''}`}
            onClick={() => {
              setTab(item);
              setMenuOpen(false);
            }}
          >
            <span>{item[0].toUpperCase() + item.slice(1)}</span>
          </button>
        ))}
      </aside>

      <div className="admin-main">
        <header className="admin-navbar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <strong>Area Administrativa</strong>
            <p>Gestao segura e centralizada</p>
          </div>
          <div className="admin-nav-actions">
            <Link to="/" className="btn btn-secondary">Voltar para loja</Link>
            <span className="notif">3</span>
            <div className="admin-user-pill">
              <div className="avatar">{(user?.name || 'A')[0]}</div>
              <div>
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
              </div>
            </div>
            <Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        </header>

        {loading ? <div className="admin-loading">Carregando painel...</div> : (
          <>
            {tab === 'dashboard' && (
              <>
                <div className="admin-kpis">
                  <article><h3>{summary.totals.users}</h3><p>Total de usuarios</p></article>
                  <article><h3>{summary.totals.orders}</h3><p>Total de vendas</p></article>
                  <article><h3>{summary.totals.products}</h3><p>Produtos cadastrados</p></article>
                  <article><h3>R$ {Number(summary.totals.revenue).toFixed(2)}</h3><p>Receita total</p></article>
                  <article><h3>R$ {Number(summary.totals.cost).toFixed(2)}</h3><p>Custo total</p></article>
                  <article><h3>R$ {Number(summary.totals.profit).toFixed(2)}</h3><p>Lucro real</p></article>
                </div>
                <div className="admin-grid-2">
                  <section className="admin-panel-block">
                    <h3>Grafico de status</h3>
                    <div className="status-bars">
                      {statusBars.length ? statusBars.map(([name, value]) => (
                        <div key={name}>
                          <div className="bar-head">
                            <span className={`status-chip ${name}`}>{statusLabel[name] || name}</span>
                            <strong className="status-value">{value}</strong>
                          </div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(8, (value / summary.totals.orders) * 100)}%` }} /></div>
                        </div>
                      )) : <p>Sem dados de vendas.</p>}
                    </div>
                  </section>
                  <section className="admin-panel-block">
                    <h3>Atividades recentes</h3>
                    <div className="activity-list">
                      {summary.recentOrders.map((item) => (
                        <div key={item.id} className="activity-row">
                          <span>Pedido #{item.id} de {item.user_name}</span>
                          <strong>R$ {Number(item.total).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )}

            {tab === 'usuarios' && (
              <section className="admin-panel-block">
                <div className="section-head section-head-action">
                  <h2>Gerenciamento de usuarios</h2>
                  <div className="admin-filters">
                    <Input placeholder="Buscar por nome ou email" value={searchUser} onChange={(e) => { setSearchUser(e.target.value); setUserPage(1); }} />
                    <select className="input" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="admin">Admin</option>
                      <option value="client">Cliente</option>
                    </select>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Acoes</th></tr></thead>
                    <tbody>
                      {pagedUsers.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <select className="input" value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}>
                              <option value="client">Cliente</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td><Button variant="secondary" onClick={() => deleteUser(u.id)}>Excluir</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <Button variant="secondary" onClick={() => setUserPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <span>Pagina {userPage} de {userPages}</span>
                  <Button variant="secondary" onClick={() => setUserPage((p) => Math.min(userPages, p + 1))}>Proxima</Button>
                </div>
              </section>
            )}

            {tab === 'produtos' && (
              <section className="admin-panel-block">
                <div className="section-head section-head-action">
                  <h2>Gerenciamento de produtos</h2>
                  <Button onClick={() => setModalOpen(true)}>Novo produto</Button>
                </div>
                <form className="admin-inline-form" onSubmit={createCategory}>
                  <Input
                    placeholder="Nome da nova categoria"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required
                  />
                  <Button type="submit" variant="secondary">Criar categoria</Button>
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
                {products.map((product) => (
                  <div key={product.id} className="cart-row">
                    <span>{product.name}</span>
                    <span>R$ {Number(product.price).toFixed(2)}</span>
                    <span>Custo: R$ {Number(product.cost_price || 0).toFixed(2)}</span>
                    <span>Estoque: {product.stock}</span>
                    <span>{product.category_name || 'Sem categoria'}</span>
                    <Button variant="secondary" onClick={() => deleteProduct(product.id)}>Excluir</Button>
                  </div>
                ))}
              </section>
            )}

            {tab === 'relatorios' && (
              <section className="admin-panel-block">
                <h2>Relatorios</h2>
                <div className="admin-filters">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  <a className="btn btn-secondary" href={buildExportUrl('sales')}>Exportar vendas (Excel/CSV)</a>
                  <a className="btn btn-secondary" href={buildExportUrl('users')}>Exportar usuarios (Excel/CSV)</a>
                  <Button variant="secondary" onClick={printReport}>Exportar PDF</Button>
                </div>
                {orders.map((o) => (
                  <div key={o.id} className="cart-row">
                    <span>#{o.id} - {o.user_name}</span>
                    <span>{statusLabel[o.status] || o.status}</span>
                    <span>R$ {Number(o.total).toFixed(2)}</span>
                    <span>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </section>
            )}

            {tab === 'config' && (
              <section className="admin-panel-block">
                <h2>Configuracoes</h2>
                <div className="config-row">
                  <div>
                    <strong>Modo escuro</strong>
                    <p>Ative um tema escuro premium para o painel administrativo.</p>
                  </div>
                  <button
                    type="button"
                    className={`theme-switch ${darkMode ? 'active' : ''}`}
                    onClick={() => setDarkMode((value) => !value)}
                    aria-label="Alternar modo escuro"
                  >
                    <span />
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Modal title="Novo produto" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="admin-form" onSubmit={createProduct}>
          <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input placeholder="Preco" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input placeholder="Custo de compra" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
          <Input placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">Selecione a categoria</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <label>Imagem principal</label>
          <Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
          <label>Galeria</label>
          <Input type="file" multiple accept=".jpg,.jpeg,.png" onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setForm({ ...form, images: files });
            setPreview(files.map((file) => URL.createObjectURL(file)));
          }} />
          <div className="thumbs">{preview.map((src) => <img key={src} src={src} alt="preview" />)}</div>
          <Button type="submit">Salvar produto</Button>
        </form>
      </Modal>

      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </section>
  );
}
