import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getUploadsBaseUrl } from '../services/api';
import { useCart } from '../hooks/useCart';

const fallback = 'https://via.placeholder.com/600x400?text=Sem+Imagem';
const reviewFallback = 'https://via.placeholder.com/360x260?text=Foto+cliente';

function StarRow({ value, onChange, interactive = false }) {
  return (
    <div className={`review-stars ${interactive ? 'interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? 'on' : ''}`}
          onClick={() => interactive && onChange?.(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const { upsertItem } = useCart();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState('');
  const [reviewsData, setReviewsData] = useState({
    stats: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, photoGallery: [] },
    items: [],
    pagination: { hasMore: false },
    canReview: false,
    ownReview: null
  });
  const [reviewFilter, setReviewFilter] = useState('');
  const [reviewSort, setReviewSort] = useState('recent');
  const [reviewPage, setReviewPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const isAuthenticated = Boolean(sessionStorage.getItem('token'));

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => {
      setProduct(res.data);
      setActiveImage(res.data.image || '');
    });
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (reviewFilter) params.set('rating', reviewFilter);
    params.set('sort', reviewSort);
    params.set('page', String(reviewPage));
    params.set('pageSize', '6');
    api.get(`/reviews/products/${id}?${params.toString()}`).then((res) => {
      setReviewsData((prev) => (reviewPage === 1 ? res.data : { ...res.data, items: [...prev.items, ...res.data.items] }));
    });
  }, [id, reviewFilter, reviewSort, reviewPage]);

  if (!product) return <p>Carregando...</p>;

  const gallery = [product.image, ...(product.images || [])].filter(Boolean);
  const distributionRows = useMemo(
    () => [5, 4, 3, 2, 1].map((n) => ({ star: n, qty: reviewsData.stats.distribution?.[n] || 0 })),
    [reviewsData.stats.distribution]
  );

  useEffect(() => {
    if (!reviewsData.ownReview) return;
    setRating(reviewsData.ownReview.rating);
    setComment(reviewsData.ownReview.comment || '');
  }, [reviewsData.ownReview]);

  async function refreshReviews() {
    const params = new URLSearchParams();
    if (reviewFilter) params.set('rating', reviewFilter);
    params.set('sort', reviewSort);
    params.set('page', '1');
    params.set('pageSize', '6');
    const res = await api.get(`/reviews/products/${id}?${params.toString()}`);
    setReviewsData(res.data);
    setReviewPage(1);
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!isAuthenticated) {
      setMessage('Faca login para enviar sua avaliacao.');
      return;
    }
    if (!comment.trim()) {
      setMessage('Escreva um comentario para enviar sua avaliacao.');
      return;
    }
    const data = new FormData();
    data.append('rating', String(rating));
    data.append('comment', comment.trim());
    images.forEach((file) => data.append('images', file));
    setSubmitting(true);
    try {
      const endpoint = reviewsData.ownReview ? `/reviews/${reviewsData.ownReview.id}` : `/reviews/products/${id}`;
      const method = reviewsData.ownReview ? 'put' : 'post';
      await api[method](endpoint, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(reviewsData.ownReview ? 'Avaliacao atualizada com sucesso.' : 'Avaliacao enviada com sucesso.');
      setComment('');
      setImages([]);
      setPreview([]);
      await refreshReviews();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao enviar avaliacao');
    } finally {
      setSubmitting(false);
    }
  }

  async function likeReview(reviewId) {
    if (!isAuthenticated) {
      setMessage('Faca login para curtir avaliacoes.');
      return;
    }
    await api.post(`/reviews/${reviewId}/like`);
    await refreshReviews();
  }

  async function reportReview(reviewId) {
    if (!isAuthenticated) {
      setMessage('Faca login para denunciar comentarios.');
      return;
    }
    await api.post(`/reviews/${reviewId}/report`, { reason: 'Conteudo inadequado' });
    setMessage('Denuncia enviada. Obrigado por ajudar na moderacao.');
  }

  return (
    <section className="reviews-page">
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

      <section className="reviews-summary">
        <div className="summary-left">
          <h2>Avaliacoes do produto</h2>
          <div className="average-line">
            <strong>{reviewsData.stats.average.toFixed(1)}</strong>
            <StarRow value={Math.round(reviewsData.stats.average)} />
            <span>{reviewsData.stats.total} avaliacao(oes)</span>
          </div>
          <div className="distribution">
            {distributionRows.map((row) => (
              <div key={row.star} className="dist-row">
                <span>{row.star}★</span>
                <div className="dist-track"><div className="dist-fill" style={{ width: `${reviewsData.stats.total ? (row.qty / reviewsData.stats.total) * 100 : 0}%` }} /></div>
                <small>{row.qty}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="summary-right">
          <h3>Fotos dos clientes</h3>
          <div className="review-photo-grid">
            {reviewsData.stats.photoGallery?.length ? reviewsData.stats.photoGallery.map((path) => (
              <img key={path} src={`${getUploadsBaseUrl()}${path}`} loading="lazy" alt="Foto de cliente" onError={(event) => { event.currentTarget.src = reviewFallback; }} />
            )) : <p>Sem fotos ainda.</p>}
          </div>
        </div>
      </section>

      <section className="review-form-block">
        <h3>{reviewsData.ownReview ? 'Editar sua avaliacao' : 'Escreva sua avaliacao'}</h3>
        {!reviewsData.canReview && !reviewsData.ownReview && <p className="muted">Somente clientes que compraram este produto podem avaliar.</p>}
        {(reviewsData.canReview || reviewsData.ownReview) && (
          <form className="review-form" onSubmit={submitReview}>
            <StarRow value={rating} onChange={setRating} interactive />
            <textarea className="input" rows={4} placeholder="Conte como foi sua experiencia com o produto" value={comment} onChange={(e) => setComment(e.target.value)} required />
            <input
              className="input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setImages(files);
                setPreview(files.map((file) => URL.createObjectURL(file)));
              }}
            />
            <div className="review-preview-row">
              {preview.map((src) => <img key={src} src={src} alt="preview avaliacao" />)}
            </div>
            <button className="btn btn-primary" disabled={submitting} type="submit">{submitting ? 'Enviando...' : reviewsData.ownReview ? 'Salvar alteracoes' : 'Publicar avaliacao'}</button>
          </form>
        )}
        {message && <p className="toast">{message}</p>}
      </section>

      <section className="review-list-block">
        <div className="review-list-head">
          <h3>Comentarios publicos</h3>
          <div className="review-list-filters">
            <select className="input" value={reviewFilter} onChange={(e) => { setReviewFilter(e.target.value); setReviewPage(1); }}>
              <option value="">Todas as notas</option>
              <option value="5">5 estrelas</option>
              <option value="4">4 estrelas</option>
              <option value="3">3 estrelas</option>
              <option value="2">2 estrelas</option>
              <option value="1">1 estrela</option>
            </select>
            <select className="input" value={reviewSort} onChange={(e) => { setReviewSort(e.target.value); setReviewPage(1); }}>
              <option value="recent">Mais recentes</option>
              <option value="highest">Melhor avaliacao</option>
              <option value="lowest">Pior avaliacao</option>
            </select>
          </div>
        </div>

        <div className="review-cards">
          {reviewsData.items.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-card-top">
                <div>
                  <strong>{review.user_name}</strong>
                  <small>{new Date(review.created_at).toLocaleDateString('pt-BR')}</small>
                </div>
                <StarRow value={review.rating} />
              </div>
              <p>{review.comment}</p>
              <div className="review-images">
                {review.images.map((path) => (
                  <img key={path} src={`${getUploadsBaseUrl()}${path}`} loading="lazy" alt="Foto da avaliacao" onError={(event) => { event.currentTarget.src = reviewFallback; }} />
                ))}
              </div>
              {review.store_reply && <div className="store-reply"><strong>Resposta da loja:</strong> {review.store_reply}</div>}
              <div className="review-actions">
                <button type="button" className="btn btn-secondary" onClick={() => likeReview(review.id)}>Curtir ({review.likes_count})</button>
                <button type="button" className="btn btn-secondary" onClick={() => reportReview(review.id)}>Denunciar</button>
                <span className="verified-chip">Compra verificada</span>
              </div>
            </article>
          ))}
        </div>

        {reviewsData.pagination.hasMore && (
          <button className="btn btn-secondary" type="button" onClick={() => setReviewPage((p) => p + 1)}>Carregar mais</button>
        )}
      </section>
    </section>
  );
}
