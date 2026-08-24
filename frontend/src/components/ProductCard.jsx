import { Link } from 'react-router-dom';
import { getUploadsBaseUrl } from '../services/api';

const fallback = 'https://via.placeholder.com/460x360?text=Sem+Imagem';
const formatPrice = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProductCard({ product }) {
  const image = product.image ? `${getUploadsBaseUrl()}${product.image}` : fallback;
  const available = Number(product.stock) > 0;

  return (
    <article className="product-card">
      <Link to={`/produto/${product.id}`} className="product-card-media" aria-label={`Ver detalhes de ${product.name}`}>
        <img src={image} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.src = fallback; }} />
        <span className={`availability-badge ${available ? '' : 'sold-out'}`}>{available ? 'Em estoque' : 'Indisponível'}</span>
      </Link>
      <div className="product-card-body">
        <p className="product-category">{product.category_name || 'Papelaria'}</p>
        <Link to={`/produto/${product.id}`} className="product-title-link"><h3>{product.name}</h3></Link>
        <p className="product-description">{product.description || 'Qualidade para acompanhar sua rotina.'}</p>
        <div className="product-rating-placeholder"><span aria-hidden="true">●</span><small>Consulte detalhes e avaliações</small></div>
        <div className="product-row">
          <div className="product-price-group"><small>Por</small><strong>{formatPrice(product.price)}</strong></div>
          <span className="stock-badge">{product.stock} un.</span>
        </div>
        <Link to={`/produto/${product.id}`} className="product-cta">Ver produto <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
