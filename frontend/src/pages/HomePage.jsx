import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
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
      .then(([p, c]) => {
        setProducts(p.data);
        setCategories(c.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
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
      const itemCategory = normalizeText(item.category_name);
      const itemName = normalizeText(item.name);
      const matchesQuery = !normalizedQuery || itemName.includes(normalizedQuery);
      const matchesCategory = !category || itemCategory === category;
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

    return Array.from(map.entries())
      .filter(([, items]) => items.length)
      .sort(([a], [b]) => a.localeCompare(b));
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

  return (
    <section className="marketplace-home">
      <div className="hero hero-home">
        <div>
          <p className="hero-kicker">Papelaria Comercial</p>
          <h1>Qualidade, variedade e preco justo para o seu dia a dia</h1>
          <p>Encontre cadernos, materiais de escrita e itens de organizacao com atendimento de confianca, compra segura e entrega rapida.</p>
        </div>
        <div className="hero-badges">
          <span>Produtos selecionados</span>
          <span>Compra segura</span>
          <span>Entrega rapida</span>
        </div>
      </div>

      <div className="home-filters" ref={filterRef}>
        <button className="btn btn-secondary" onClick={() => setIsFilterOpen((prev) => !prev)}>
          Filtrar por categorias
        </button>
        {selectedCategory && <span className="filter-pill">Categoria: {selectedCategory}</span>}
        {query && <span className="filter-pill">Busca: {query} <button className="filter-clear" onClick={clearSearch}>Limpar</button></span>}
        {isFilterOpen && (
          <div className="filter-dropdown">
            <button className="filter-option" onClick={() => applyCategoryFilter('')}>Todas as categorias</button>
            {categories.map((category) => (
              <button key={category.id} className="filter-option" onClick={() => applyCategoryFilter(category.name)}>
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p>Carregando produtos...</p>}

      {!loading && !filtered.length && (
        <p>Nenhum produto encontrado{query ? ` para "${query}"` : ''} nos filtros atuais.</p>
      )}

      {!loading && !selectedCategory && (
        <div className="products-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!loading && selectedCategory && groupedProducts.map(([categoryName, items]) => (
        <section key={categoryName} className="category-block">
          <div className="section-head split-head">
            <h2>{categoryName}</h2>
            <small>{items.length} produtos</small>
          </div>
          <div className="products-grid">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
