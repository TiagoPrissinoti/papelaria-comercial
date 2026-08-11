import api from './api';

export async function criarPagamento() {
  const response = await api.post('/pagamento/criar');
  return response.data;
}
