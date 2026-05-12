import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getUploadsBaseUrl } from '../services/api';
import { useCart } from '../hooks/useCart';

const fallback = 'https://via.placeholder.com/600x400?text=Sem+Imagem';

export default function ProductPage() {
  const { id } = useParams();
  const { upsertItem } = useCart();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => {
      setProduct(res.data);
      setActiveImage(res.data.image || '');
    });
  }, [id]);

  if (!product) return <p>Carregando...</p>;

  const gallery = [product.image, ...(product.images || [])].filter(Boolean);

  return (
    <section className="product-layout">
      <div className="gallery-wrap">
        <img
          className="main-image"
          src={activeImage ? `${getUploadsBaseUrl()}${activeImage}` : fallback}
          alt={product.name}
          onError={(event) => { event.currentTarget.src = fallback; }}
        />
        <div className="thumbs">
          {gallery.map((image) => (
            <img
              key={image}
              src={`${getUploadsBaseUrl()}${image}`}
              alt="thumb"
              className={activeImage === image ? 'active' : ''}
              onClick={() => setActiveImage(image)}
              onError={(event) => { event.currentTarget.src = fallback; }}
            />
          ))}
        </div>
      </div>

      <div className="product-info">
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <strong className="product-price">R$ {Number(product.price).toFixed(2)}</strong>
        <p>Estoque: {product.stock}</p>
        <button className="btn btn-primary" onClick={() => upsertItem(product.id, 1)}>Adicionar ao carrinho</button>
      </div>
    </section>
  );
}
