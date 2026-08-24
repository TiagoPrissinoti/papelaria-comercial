import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

function normalizeText(text) {
  return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function ProductSkeleton() {
  return <div className="product-skeleton" aria-hidden="true"><span /><div><i /><i /><i /></div></div>;
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/products'), api.get('/categories')])
      .then(([p, c]) => { setProducts(p.data); setCategories(c.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = searchParams.get('categoria') || '';
  const query = searchParams.get('q') || '';
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const category = normalizeText(selectedCategory);
    return products.filter((item) => {
      const matchesQuery = !normalizedQuery || normalizeText(item.name).includes(normalizedQuery);
      const matchesCategory = !category || normalizeText(item.category_name) === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, selectedCategory]);

  const groupedProducts = useMemo(() => {
    if (!selectedCategory) return [];
    const map = new Map();
    for (const product of filtered) {
      const categoryName = product.category_name || 'Sem categoria';
      if (!map.has(categoryName)) map.set(categoryName, []);
      map.get(categoryName).push(product);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, selectedCategory]);

  function applyCategoryFilter(categoryName) {
    const next = new URLSearchParams(searchParams);
    if (!categoryName) next.delete('categoria');
    else next.set('categoria', categoryName);
    setSearchParams(next);
    setIsFilterOpen(false);
  }

  function clearSearch() {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next);
  }

  function clearAllFilters() {
    setSearchParams(new URLSearchParams());
    setIsFilterOpen(false);
  }

  return (
    <section className="marketplace-home">
      <section className="hero hero-home" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="hero-kicker">Sua rotina começa no papel</p>
          <h1 id="home-title">Materiais que organizam ideias e acompanham conquistas.</h1>
          <p>Uma seleção cuidadosa para estudo, trabalho e criatividade — com compra simples, segura e sem complicação.</p>
          <div className="hero-actions">
            <a className="btn btn-primary hero-primary" href="#catalogo">Explorar produtos</a>
            <a className="btn btn-quiet" href="#categorias">Ver categorias</a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-note note-one"><span>✦</span><strong>Escolhas inteligentes</strong><small>para todos os dias</small></div>
          <div className="hero-note note-two"><b>100%</b><span>compra protegida</span></div>
          <div className="hero-shape hero-shape-one" />
          <div className="hero-shape hero-shape-two" />
        </div>
      </section>

      <section className="benefit-strip" aria-label="Benefícios da loja">
        <div><span aria-hidden="true">✓</span><p><strong>Compra segura</strong><small>Pagamento protegido</small></p></div>
        <div><span aria-hidden="true">↗</span><p><strong>Envio acompanhado</strong><small>Veja cada etapa do pedido</small></p></div>
        <div><span aria-hidden="true">♡</span><p><strong>Seleção de qualidade</strong><small>Produtos para sua rotina</small></p></div>
        <div><span aria-hidden="true">?</span><p><strong>Atendimento próximo</strong><small>Ajuda quando precisar</small></p></div>
      </section>

      <section id="categorias" className="category-showcase" aria-labelledby="category-title">
        <div className="section-head split-head">
          <div><p className="section-eyebrow">Encontre mais rápido</p><h2 id="category-title">Compre por categoria</h2></div>
          <small>{categories.length} categorias disponíveis</small>
        </div>
        <div className="category-quick-list">
          <button className={!selectedCategory ? 'active' : ''} onClick={() => applyCategoryFilter('')}><span>✦</span>Todos</button>
          {categories.slice(0, 8).map((category, index) => (
            <button key={category.id} className={selectedCategory === category.name ? 'active' : ''} onClick={() => applyCategoryFilter(category.name)}>
              <span>{['A', 'B', 'C', 'D'][index % 4]}</span>{category.name}
            </button>
          ))}
        </div>
      </section>

      <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-toolbar" ref={filterRef}>
          <div className="section-head"><p className="section-eyebrow">Nossa seleção</p><h2 id="catalog-title">{selectedCategory || (query ? 'Resultados da busca' : 'Produtos em destaque')}</h2></div>
          <div className="home-filters">
            <button className="btn btn-secondary filter-trigger" onClick={() => setIsFilterOpen((prev) => !prev)} aria-expanded={isFilterOpen}>Filtrar por categoria</button>
            {isFilterOpen && (
              <div className="filter-dropdown">
                <button className="filter-option" onClick={() => applyCategoryFilter('')}>Todas as categorias</button>
                {categories.map((category) => <button key={category.id} className="filter-option" onClick={() => applyCategoryFilter(category.name)}>{category.name}</button>)}
              </div>
            )}
          </div>
        </div>

        {(selectedCategory || query) && (
          <div className="active-filters">
            {selectedCategory && <span className="filter-pill">Categoria: {selectedCategory}<button aria-label="Remover filtro de categoria" onClick={() => applyCategoryFilter('')}>×</button></span>}
            {query && <span className="filter-pill">Busca: {query}<button aria-label="Limpar busca" onClick={clearSearch}>×</button></span>}
            <small>{filtered.length} produto(s) encontrado(s)</small>
          </div>
        )}

        {loading && <div className="products-grid" aria-label="Carregando produtos">{Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}</div>}
        {!loading && !filtered.length && (
          <div className="empty-state"><span aria-hidden="true">⌕</span><h3>Nenhum produto encontrado</h3><p>Tente limpar os filtros ou buscar por outro termo.</p><button className="btn btn-secondary" onClick={clearAllFilters}>Limpar filtros</button></div>
        )}
        {!loading && !selectedCategory && <div className="products-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        {!loading && selectedCategory && groupedProducts.map(([categoryName, items]) => (
          <section key={categoryName} className="category-block"><div className="section-head split-head"><h2>{categoryName}</h2><small>{items.length} produtos</small></div><div className="products-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
        ))}
      </section>

      <section className="promo-banner"><div><p className="section-eyebrow">Papelaria para fazer acontecer</p><h2>Do primeiro rascunho ao projeto final.</h2><p>Encontre os materiais certos para transformar planos em resultados.</p></div><a className="btn btn-primary" href="#catalogo">Conhecer produtos</a></section>
    </section>
  );
}
