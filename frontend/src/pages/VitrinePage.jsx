import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import api from '../services/api';

export default function VitrinePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    let active = true;

    api.get('/products')
      .then((response) => {
        if (!active) return;
        setProducts((response.data || []).slice(0, 8));
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!products.length) return undefined;

    const intervalId = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (!carousel) return;

      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      const nextScrollLeft = carousel.scrollLeft + 260;
      const shouldWrap = nextScrollLeft >= maxScrollLeft - 4;

      carousel.scrollTo({
        left: shouldWrap ? 0 : nextScrollLeft,
        behavior: 'smooth',
      });
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [products]);

  function scrollCarousel(distance) {
    carouselRef.current?.scrollBy({ left: distance, behavior: 'smooth' });
  }

  return (
    <section className="showcase-page">
      <div className="showcase-hero">
        <div>
          <p className="hero-kicker">Papelaria Pro</p>
          <h1>Conheça alguns produtos antes de entrar</h1>
          <p>
            Explore a vitrine pública e clique em qualquer produto para ver os detalhes.
            Se ainda não estiver logado, o sistema vai te levar para o login.
          </p>
        </div>
        <div className="showcase-actions">
          <Link to="/login" className="btn btn-primary">Ir para login</Link>
          <Link to="/cadastro" className="btn btn-secondary">Criar conta</Link>
        </div>
      </div>

      <div className="showcase-panel">
        <div className="login-preview-head">
          <div>
            <h2>Vitrine de produtos</h2>
            <small>Use as setas para navegar pela coleção</small>
          </div>
          <div className="carousel-controls">
            <button type="button" className="carousel-btn" onClick={() => scrollCarousel(-320)} aria-label="Voltar produtos">
              ‹
            </button>
            <button type="button" className="carousel-btn" onClick={() => scrollCarousel(320)} aria-label="Avançar produtos">
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <p className="preview-loading">Carregando produtos...</p>
        ) : (
          <div className="showcase-carousel" ref={carouselRef}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
