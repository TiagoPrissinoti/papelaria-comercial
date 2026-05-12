import { Link } from 'react-router-dom';
import { getUploadsBaseUrl } from '../services/api';

const fallback = 'https://via.placeholder.com/460x300?text=Sem+Imagem';

export default function ProductCard({ product }) {
  const image = product.image ? `${getUploadsBaseUrl()}${product.image}` : fallback;

  return (
    <Link to={`/produto/${product.id}`} className="product-card-link" aria-label={`Ver produto ${product.name}`}>
      <article className="product-card">
        <img src={image} alt={product.name} onError={(event) => { event.currentTarget.src = fallback; }} />
        <div className="product-card-body">
          <h3>{product.name}</h3>
          <p className="product-description">{product.description || 'Produto de papelaria premium.'}</p>
          <div className="product-row">
            <strong>R$ {Number(product.price).toFixed(2)}</strong>
            <span className="stock-badge">{product.stock} un.</span>
          </div>
          <span className="product-cta">Ver produto</span>
        </div>
      </article>
    </Link>
  );
}
