import api from './api';

export async function criarPagamento(addressId) {
  const response = await api.post('/pagamento/criar', { address_id: addressId });
  return response.data;
}
