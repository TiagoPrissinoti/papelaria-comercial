import api from './api';

export async function listarEnderecos() {
  const { data } = await api.get('/addresses');
  return data;
}

export async function salvarEndereco(payload, id) {
  const { data } = id
    ? await api.put(`/addresses/${id}`, payload)
    : await api.post('/addresses', payload);
  return data;
}
