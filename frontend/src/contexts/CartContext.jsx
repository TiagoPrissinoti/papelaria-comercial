import { createContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  async function refreshCart() {
    if (!token) {
      setItems([]);
      setTotal(0);
      return;
    }
    const { data } = await api.get('/cart');
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    refreshCart();
  }, [token]);

  async function upsertItem(productId, quantity) {
    if (!token) return;
    const { data } = await api.post('/cart/items', { productId, quantity });
    setItems(data.items);
    setTotal(data.total);
  }

  async function removeItem(productId) {
    if (!token) return;
    const { data } = await api.delete(`/cart/items/${productId}`);
    setItems(data.items);
    setTotal(data.total);
  }

  const count = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  return <CartContext.Provider value={{ items, total, count, refreshCart, upsertItem, removeItem }}>{children}</CartContext.Provider>;
}
