import api from './api';

export async function criarPagamento(produtos) {
  const response = await api.post('/pagamento/criar', { produtos });
  return response.data;
}
