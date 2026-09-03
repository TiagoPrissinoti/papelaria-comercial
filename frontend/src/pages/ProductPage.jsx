import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getUploadsBaseUrl } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

const fallback =
  'https://via.placeholder.com/600x400?text=Sem+Imagem';

const reviewFallback =
  'https://via.placeholder.com/360x260?text=Foto+cliente';

function StarRow({
  value,
  onChange,
  interactive = false
}) {
  return (
    <div
      className={`review-stars ${
        interactive ? 'interactive' : ''
      }`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? 'on' : ''}`}
          onClick={() =>
            interactive && onChange?.(n)
          }
          aria-label={`${n} estrela${
            n > 1 ? 's' : ''
          }`}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const { token } = useAuth();
  const { id } = useParams();

  const { upsertItem } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  const [activeImage, setActiveImage] =
    useState('');

  const [reviewsData, setReviewsData] =
    useState({
      stats: {
        average: 0,
        total: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        },
        photoGallery: []
      },
      items: [],
      pagination: {
        hasMore: false
      },
      canReview: false,
      ownReview: null
    });

  const [reviewFilter, setReviewFilter] =
    useState('');

  const [reviewSort, setReviewSort] =
    useState('recent');

  const [reviewPage, setReviewPage] =
    useState(1);

  const [rating, setRating] = useState(5);

  const [comment, setComment] = useState('');

  const [images, setImages] = useState([]);

  const [preview, setPreview] = useState([]);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] = useState('');

  const isAuthenticated = token;

  // =========================
  // MEMOS
  // =========================

  const gallery = product
    ? [product.image, ...(product.images || [])].filter(
        Boolean
      )
    : [];

  const distributionRows = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((n) => ({
        star: n,
        qty:
          reviewsData.stats.distribution?.[n] || 0
      })),
    [reviewsData.stats.distribution]
  );

  // =========================
  // EFFECTS
  // =========================

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await api.get(
          `/products/${id}`
        );

        setProduct(res.data);
        setSelectedColor(res.data.colors?.length === 1 ? res.data.colors[0] : '');
        setCartMessage('');

        setActiveImage(res.data.image || '');
      } catch (error) {
        console.error(
          'Erro ao carregar produto:',
          error
        );
      }
    }

    loadProduct();
  }, [id]);

  useEffect(() => {
    async function loadReviews() {
      try {
        const params = new URLSearchParams();

        if (reviewFilter) {
          params.set('rating', reviewFilter);
        }

        params.set('sort', reviewSort);

        params.set('page', String(reviewPage));

        params.set('pageSize', '6');

        const res = await api.get(
          `/reviews/products/${id}?${params.toString()}`
        );

        setReviewsData((prev) =>
          reviewPage === 1
            ? res.data
            : {
                ...res.data,
                items: [
                  ...prev.items,
                  ...res.data.items
                ]
              }
        );
      } catch (error) {
        console.error(
          'Erro ao carregar avaliações:',
          error
        );
      }
    }

    loadReviews();
  }, [
    id,
    reviewFilter,
    reviewSort,
    reviewPage,
    token
  ]);

  useEffect(() => {
    if (!reviewsData.ownReview) return;

    setRating(reviewsData.ownReview.rating);

    setComment(
      reviewsData.ownReview.comment || ''
    );
  }, [reviewsData.ownReview]);

  useEffect(() => {
    if (!images.length) {
      setPreview([]);
      return;
    }

    const objectUrls = images.map((file) =>
      URL.createObjectURL(file)
    );

    setPreview(objectUrls);

    return () => {
      objectUrls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [images]);

  // =========================
  // FUNCTIONS
  // =========================

  async function refreshReviews() {
    try {
      const params = new URLSearchParams();

      if (reviewFilter) {
        params.set('rating', reviewFilter);
      }

      params.set('sort', reviewSort);

      params.set('page', '1');

      params.set('pageSize', '6');

      const res = await api.get(
        `/reviews/products/${id}?${params.toString()}`
      );

      setReviewsData(res.data);

      setReviewPage(1);
    } catch (error) {
      console.error(error);
    }
  }

  async function addProductToCart() {
    if (!isAuthenticated) {
      setCartMessage('Faça login para adicionar o produto ao carrinho.');
      return;
    }
    if (product.colors?.length && !selectedColor) {
      setCartMessage('Escolha uma cor antes de adicionar ao carrinho.');
      return;
    }

    setAddingToCart(true);
    setCartMessage('');
    try {
      await upsertItem(product.id, 1, selectedColor);
      setCartMessage(`Produto adicionado ao carrinho${selectedColor ? ` na cor ${selectedColor}` : ''}.`);
    } catch (error) {
      setCartMessage(error.response?.data?.message || 'Não foi possível adicionar o produto ao carrinho.');
    } finally {
      setAddingToCart(false);
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      setMessage(
        'Faça login para enviar sua avaliação.'
      );

      return;
    }

    if (!comment.trim()) {
      setMessage(
        'Escreva um comentário para enviar sua avaliação.'
      );

      return;
    }

    const data = new FormData();

    data.append('rating', String(rating));

    data.append('comment', comment.trim());

    images.forEach((file) => {
      data.append('images', file);
    });

    setSubmitting(true);

    try {
      const endpoint = reviewsData.ownReview
        ? `/reviews/${reviewsData.ownReview.id}`
        : `/reviews/products/${id}`;

      const method = reviewsData.ownReview
        ? 'put'
        : 'post';

      await api[method](endpoint, data, {
        headers: {
          'Content-Type':
            'multipart/form-data'
        }
      });

      setMessage(
        reviewsData.ownReview
          ? 'Avaliação atualizada com sucesso.'
          : 'Avaliação enviada com sucesso.'
      );

      setComment('');

      setImages([]);

      setPreview([]);

      await refreshReviews();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Erro ao enviar avaliação.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function likeReview(reviewId) {
    if (!isAuthenticated) {
      setMessage(
        'Faça login para curtir avaliações.'
      );

      return;
    }

    try {
      await api.post(
        `/reviews/${reviewId}/like`
      );

      await refreshReviews();
    } catch (error) {
      console.error(error);
    }
  }

  async function reportReview(reviewId) {
    if (!isAuthenticated) {
      setMessage(
        'Faça login para denunciar comentários.'
      );

      return;
    }

    try {
      await api.post(
        `/reviews/${reviewId}/report`,
        {
          reason: 'Conteúdo inadequado'
        }
      );

      setMessage(
        'Denúncia enviada com sucesso.'
      );
    } catch (error) {
      console.error(error);
    }
  }

  // =========================
  // LOADING
  // =========================

  if (!product) {
    return <div className="product-page-loading"><div className="loading-spinner" /><p>Carregando produto...</p></div>;
  }

  // =========================
  // JSX
  // =========================

  return (
    <section className="reviews-page">

      <nav className="product-breadcrumb" aria-label="Navegação estrutural">
        <Link to="/">Início</Link><span aria-hidden="true">/</span>
        <span>{product.category_name || 'Produtos'}</span><span aria-hidden="true">/</span>
        <strong>{product.name}</strong>
      </nav>

      <section className="product-layout">

        <div className="gallery-wrap">

          <img
            className="main-image"
            src={
              activeImage
                ? `${getUploadsBaseUrl()}${activeImage}`
                : fallback
            }
            alt={product.name}
            onError={(event) => {
              event.currentTarget.src = fallback;
            }}
          />

          <div className="thumbs">

            {gallery.map((image) => (
              <button key={image} type="button" className={`thumb-button ${activeImage === image ? 'active' : ''}`} onClick={() => setActiveImage(image)} aria-label="Selecionar imagem do produto">
                <img src={`${getUploadsBaseUrl()}${image}`} alt="" onError={(event) => { event.currentTarget.src = fallback; }} />
              </button>
            ))}

          </div>

        </div>

        <div className="product-info">
          <p className="product-detail-category">{product.category_name || 'Papelaria Comercial'}</p>
          <h1>{product.name}</h1>
          <div className="product-detail-rating">
            <StarRow value={Math.round(reviewsData.stats.average)} />
            <a href="#avaliacoes">{reviewsData.stats.total} avaliação(ões)</a>
          </div>
          <strong className="product-price">
            R$ {Number(product.price).toFixed(2)}
          </strong>
          <p className="payment-hint">Pagamento seguro pelo Mercado Pago</p>
          <div className={`product-stock ${Number(product.stock) > 0 ? 'available' : 'unavailable'}`}>
            <span aria-hidden="true">{Number(product.stock) > 0 ? '✓' : '×'}</span>
            {Number(product.stock) > 0 ? `${product.stock} unidade(s) em estoque` : 'Produto indisponível'}
          </div>
          {product.colors?.length > 0 && (
            <fieldset className="product-color-picker">
              <legend>Escolha a cor <span aria-hidden="true">*</span></legend>
              <div className="product-color-options">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`product-color-option ${selectedColor === color ? 'selected' : ''}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => {
                      setSelectedColor(color);
                      setCartMessage('');
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="product-short-description">
            <h2>Sobre este produto</h2>
            <p>{product.description || 'Produto selecionado para acompanhar sua rotina com qualidade e praticidade.'}</p>
          </div>
          <button
            className="btn btn-primary product-add-button"
            onClick={addProductToCart}
            disabled={addingToCart || Number(product.stock) <= 0}
          >
            {addingToCart ? 'Adicionando...' : 'Adicionar ao carrinho'}
          </button>
          {cartMessage && <p className="product-cart-message" role="status">{cartMessage}</p>}
          <div className="product-assurances">
            <div><span aria-hidden="true">✓</span><p><strong>Compra protegida</strong><small>Ambiente seguro</small></p></div>
            <div><span aria-hidden="true">↗</span><p><strong>Pedido acompanhado</strong><small>Veja cada etapa</small></p></div>
          </div>
        </div>

      </section>

      <section id="avaliacoes" className="reviews-summary">

        <div className="summary-left">

          <h2>Avaliações do produto</h2>

          <div className="average-line">

            <strong>
              {reviewsData.stats.average.toFixed(
                1
              )}
            </strong>

            <StarRow
              value={Math.round(
                reviewsData.stats.average
              )}
            />

            <span>
              {reviewsData.stats.total}{' '}
              avaliação(ões)
            </span>

          </div>

          <div className="distribution">

            {distributionRows.map((row) => (
              <div
                key={row.star}
                className="dist-row"
              >

                <span>{row.star}★</span>

                <div className="dist-track">

                  <div
                    className="dist-fill"
                    style={{
                      width: `${
                        reviewsData.stats.total
                          ? (row.qty /
                              reviewsData.stats
                                .total) *
                            100
                          : 0
                      }%`
                    }}
                  />

                </div>

                <small>{row.qty}</small>

              </div>
            ))}

          </div>

        </div>

        <div className="summary-right">

          <h3>Fotos dos clientes</h3>

          <div className="review-photo-grid">

            {reviewsData.stats.photoGallery
              ?.length ? (
              reviewsData.stats.photoGallery.map(
                (path) => (
                  <img
                    key={path}
                    src={`${getUploadsBaseUrl()}${path}`}
                    loading="lazy"
                    alt="Foto de cliente"
                    onError={(event) => {
                      event.currentTarget.src =
                        reviewFallback;
                    }}
                  />
                )
              )
            ) : (
              <p>Sem fotos ainda.</p>
            )}

          </div>

        </div>

      </section>

      <section className="reviews-content">

        <div className="review-controls">
          <label>Ordenar avaliações
          <select
            value={reviewSort}
            onChange={(e) => {
              setReviewPage(1);

              setReviewSort(e.target.value);
            }}
          >
            <option value="recent">
              Mais recentes
            </option>

            <option value="highest">
              Maior nota
            </option>

            <option value="lowest">
              Menor nota
            </option>
          </select>
          </label>
          <label>Filtrar por nota
          <select
            value={reviewFilter}
            onChange={(e) => {
              setReviewPage(1);

              setReviewFilter(
                e.target.value
              );
            }}
          >
            <option value="">
              Todas as notas
            </option>

            <option value="5">
              5 estrelas
            </option>

            <option value="4">
              4 estrelas
            </option>

            <option value="3">
              3 estrelas
            </option>

            <option value="2">
              2 estrelas
            </option>

            <option value="1">
              1 estrela
            </option>
          </select>
          </label>

        </div>

        {isAuthenticated ? (

          <form
            className="review-form"
            onSubmit={submitReview}
          >

            <h3>
              {reviewsData.ownReview
                ? 'Editar avaliação'
                : 'Deixe sua avaliação'}
            </h3>

            <StarRow
              value={rating}
              onChange={setRating}
              interactive
            />

            <label className="field-label">Seu comentário
              <textarea
                placeholder="Conte como foi sua experiência com o produto"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
              />
            </label>

            <label className="field-label review-file-field">Fotos da avaliação <small>Selecione as imagens que deseja publicar.</small>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files))}
              />
            </label>

            {preview.length > 0 && (

              <div className="preview-grid">

                {preview.map((img) => (
                  <img
                    key={img}
                    src={img}
                    alt="preview"
                  />
                ))}

              </div>

            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? 'Enviando...'
                : reviewsData.ownReview
                ? 'Atualizar avaliação'
                : 'Enviar avaliação'}
            </button>

          </form>

        ) : (

          <p>
            Faça login para avaliar este
            produto.
          </p>

        )}

        {message && (
          <p className="review-message">
            {message}
          </p>
        )}

        <div className="reviews-list">

          {reviewsData.items.length === 0 ? (

            <p>Nenhuma avaliação ainda.</p>

          ) : (

            reviewsData.items.map((review) => (

              <article
                key={review.id}
                className="review-card"
              >

                <div className="review-header">
                  <div className="review-author">
                    <span className="review-avatar" aria-hidden="true">{(review.user_name || 'C')[0].toUpperCase()}</span>
                    <div><strong>{review.user_name}</strong><small>{review.created_at ? new Date(review.created_at).toLocaleDateString('pt-BR') : 'Cliente da loja'}</small></div>
                  </div>
                  <StarRow
                    value={review.rating}
                  />
                </div>

                <p className="review-comment">
                  {review.comment}
                </p>

                {review.images?.length >
                  0 && (

                  <div className="review-images">

                    {review.images.map(
                      (img) => (
                        <img
                          key={img}
                          src={`${getUploadsBaseUrl()}${img}`}
                          alt={`Foto publicada por ${review.user_name || 'cliente'}`}
                          onError={(
                            event
                          ) => {
                            event.currentTarget.src =
                              reviewFallback;
                          }}
                        />
                      )
                    )}

                  </div>

                )}

                <div className="review-actions">

                  <button
                    onClick={() =>
                      likeReview(review.id)
                    }
                  >
                    Curtir (
                    {review.likes_count ||
                      0}
                    )
                  </button>

                  <button
                    onClick={() =>
                      reportReview(review.id)
                    }
                  >
                    Denunciar
                  </button>

                </div>

                {review.store_reply && (

                  <div className="store-reply">

                    <strong>
                      Resposta da loja:
                    </strong>

                    <p>
                      {review.store_reply}
                    </p>

                  </div>

                )}

              </article>

            ))

          )}

        </div>

        {reviewsData.pagination
          ?.hasMore && (

          <button
            className="btn btn-secondary"
            onClick={() =>
              setReviewPage(
                (prev) => prev + 1
              )
            }
          >
            Carregar mais
          </button>

        )}

      </section>

    </section>
  );
}
