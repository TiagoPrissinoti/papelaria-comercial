# Papelaria Comercial

E-commerce full stack para papelaria, com catálogo, carrinho, Checkout Pro do Mercado Pago, avaliações de produtos e painel administrativo.

**Produção no Railway:** [papelaria-comercial-production.up.railway.app](https://papelaria-comercial-production.up.railway.app)

## Arquitetura atual

O projeto é publicado como um único serviço no Railway:

```text
Navegador
   │
   ▼
Railway / HTTPS
   │
   ├── React + Vite (arquivos estáticos)
   ├── API Node.js + Express (/api)
   ├── Uploads (/uploads)
   └── SQLite + imagens no volume persistente /data
```

- Frontend: React 18, React Router, Axios e Vite.
- Backend: Node.js 20, Express, JWT, bcrypt e Multer.
- Banco de dados: SQLite, acessado exclusivamente pelo backend.
- Pagamentos: Mercado Pago Checkout Pro e webhook assinado.
- Deploy: Docker multi-stage controlado por `railway.toml`.

## Funcionalidades

### Loja e cliente

- Cadastro, login e logout.
- Vitrine pública e catálogo por categoria.
- Busca e filtro de produtos.
- Página de produto com imagem principal e galeria.
- Carrinho separado por usuário.
- Checkout pelo Mercado Pago.
- Histórico e acompanhamento de pedidos.
- Remoção de pedidos entregues do histórico do cliente.
- Avaliações permitidas apenas para clientes que compraram o produto.
- Nota, comentário e até quatro imagens por avaliação.
- Curtidas, denúncias, edição e exclusão de avaliações.
- Páginas institucionais, política de privacidade, termos, ajuda, trocas e prazos.

### Administração

As operações administrativas exigem um usuário com `role=admin` e são validadas novamente no backend.

- Resumo de usuários, produtos, pedidos, receita, custo e lucro.
- Pedidos recentes e gráfico por status.
- Gestão de usuários e perfis.
- Cadastro, edição e desativação de produtos.
- Gestão de categorias, estoque, preço e custo.
- Atualização do andamento dos pedidos pagos.
- Respostas da loja às avaliações.
- Exportação CSV de usuários e vendas.
- Relatório para impressão ou exportação em PDF pelo navegador.
- Modo escuro salvo localmente no navegador.

## Pedidos e pagamentos

O status operacional do pedido pode ser:

- `pendente`
- `pago`
- `em_andamento`
- `enviado`
- `entregue`

O pagamento possui estado independente: `pending`, `approved`, `rejected`, `cancelled` ou `refunded`.

Ao criar o checkout, o backend:

1. lê os itens e preços diretamente do banco;
2. cria um pedido pendente com identificador seguro;
3. envia a preferência ao Mercado Pago;
4. valida assinatura, pedido, preferência, moeda e valor no retorno;
5. baixa o estoque somente na primeira aprovação;
6. mantém o processamento idempotente caso o webhook seja repetido.

O custo do produto é congelado em `order_items.cost_price`. Assim, o lucro histórico continua correto mesmo que o custo atual seja alterado.

## Segurança

- Senhas armazenadas somente como hash bcrypt.
- JWT mantido em cookie `HttpOnly` e `SameSite=Lax`.
- Cookie de sessão marcado como `Secure` em produção.
- JWT não é devolvido no JSON nem salvo em `localStorage` ou `sessionStorage`.
- O token contém apenas o ID; usuário e perfil são recarregados do banco em cada requisição protegida.
- Rotas administrativas protegidas por autenticação e autorização no servidor.
- Carrinho, pedidos e avaliações aplicam controle por proprietário.
- Segredos JWT e Mercado Pago ficam somente nas variáveis do backend.
- Arquivos `.env`, banco local e uploads não são versionados.
- CORS de produção aceita apenas a origem configurada.
- O número completo e o código de segurança do cartão não são armazenados pela aplicação.

SQLite não oferece RLS e não é acessado diretamente pelo navegador. O isolamento de dados é aplicado na API com `user_id` e regras de perfil.

## Estrutura

```text
papelaria-comercial/
├── backend/
│   ├── config/            # Mercado Pago
│   ├── controllers/       # Checkout e webhook
│   ├── services/          # Integração de pagamento
│   └── src/
│       ├── controllers/
│       ├── database/      # conexão, schema e inicialização SQLite
│       ├── middlewares/   # autenticação, erros e uploads
│       ├── models/
│       ├── routes/
│       └── services/
├── frontend/
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       └── services/
├── Dockerfile
└── railway.toml
```

## Execução local

### Pré-requisitos

- Node.js 20 recomendado; Node.js 18 ou superior é compatível.
- npm 9 ou superior.

### Instalação

```bash
npm install
npm run install:all
```

Crie `backend/.env` a partir de `backend/.env.example` e preencha somente valores locais ou de teste:

```ini
PORT=3333
NODE_ENV=development
JWT_SECRET=UMA_CHAVE_LOCAL_LONGA_E_ALEATORIA
ADMIN_EMAIL=admin@papelaria.com
ADMIN_PASSWORD=UMA_SENHA_LOCAL_FORTE
DB_CLIENT=sqlite
DATA_DIR=./src/database
UPLOAD_DIR=./uploads
FRONTEND_URL=https://URL-PUBLICA-DO-FRONTEND
BACKEND_URL=https://URL-PUBLICA-DO-BACKEND
MERCADO_PAGO_ACCESS_TOKEN=SEU_TOKEN_DE_TESTE
MERCADO_PAGO_WEBHOOK_SECRET=SEU_SEGREDO_DE_TESTE
MERCADO_PAGO_ENVIRONMENT=test
```

Inicie frontend e backend:

```bash
npm run dev
```

- Loja local: `http://localhost:5173`
- API local: `http://localhost:3333/api`
- Saúde da API: `http://localhost:3333/api/health`
- Uploads: `http://localhost:3333/uploads/<arquivo>`

O Vite encaminha `/api` e `/uploads` para o backend local. `frontend/.env` é opcional; quando usado, `VITE_API_URL=/api` mantém esse comportamento.

### Checkout local com ngrok

O Mercado Pago exige URLs HTTPS públicas para os retornos e o webhook. Para testar o checkout localmente:

1. inicie backend e frontend;
2. exponha as portas `3333` e `5173` com dois túneis ngrok;
3. informe as URLs HTTPS em `BACKEND_URL` e `FRONTEND_URL`;
4. configure `https://URL-DO-BACKEND/api/webhook` no painel do Mercado Pago;
5. reinicie o backend após alterar o `.env`.

As URLs gratuitas do ngrok podem mudar após uma reinicialização.

## Scripts

| Local | Comando | Descrição |
|---|---|---|
| raiz | `npm run dev` | inicia frontend e backend |
| raiz | `npm run dev:backend` | inicia somente o backend |
| raiz | `npm run dev:frontend` | inicia somente o frontend |
| raiz | `npm run install:all` | instala dependências dos dois projetos |
| backend | `npm run dev` | inicia com nodemon |
| backend | `npm start` | inicia em modo normal/produção |
| backend | `npm run db:init` | inicializa o schema SQLite |
| backend | `npm test` | executa os testes com Node Test Runner |
| frontend | `npm run build` | gera `frontend/dist` |
| frontend | `npm run preview` | abre uma prévia da build |

Para executar a partir da raiz:

```bash
npm test --prefix backend
npm run build --prefix frontend
```

## Uploads

- Formatos aceitos: JPG, JPEG, PNG, WEBP, GIF, AVIF e BMP.
- Limite: 5 MB por imagem.
- Produto: uma imagem principal e até cinco imagens de galeria.
- Avaliação: até quatro imagens.
- Em produção, os arquivos ficam em `/data/uploads` no volume Railway.

## API

Todas as rotas abaixo usam o prefixo `/api`.

### Públicas

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /products`
- `GET /products/:id`
- `GET /categories`
- `GET /reviews/products/:productId`
- `POST /webhook` — webhook assinado do Mercado Pago

### Sessão autenticada

- `GET /auth/me`
- `POST /auth/logout`
- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/:productId`
- `GET /orders/my`
- `DELETE /orders/:id/history`
- `POST /pagamento/criar`
- `GET /pagamento/pedidos/:id`
- `POST /pagamento/pedidos/:id/reconciliar`
- `POST /reviews/products/:productId`
- `PUT /reviews/:id`
- `DELETE /reviews/:id`
- `POST /reviews/:id/like`
- `POST /reviews/:id/report`

### Administração

- `GET /orders`
- `PATCH /orders/:id/status`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `POST /reviews/:id/reply`
- `GET /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/reports/summary`
- `GET /admin/reports/export.csv`
- `DELETE /admin/reset-store-data`

## Deploy atual no Railway

O deploy usa [uma única URL HTTPS](https://papelaria-comercial-production.up.railway.app) para frontend, API e uploads. O `Dockerfile` compila o React e copia `frontend/dist` para a imagem final do backend. O Express serve a SPA e a API na mesma instância.

O Railway usa:

- build pelo `Dockerfile`;
- healthcheck em `/api/health`;
- reinício em caso de falha, com até dez tentativas;
- volume persistente montado em `/data`.

### Variáveis do serviço

As variáveis de produção devem permanecer no painel do Railway, nunca no repositório:

```ini
NODE_ENV=production
JWT_SECRET=UMA_CHAVE_LONGA_E_ALEATORIA
ADMIN_EMAIL=SEU_EMAIL_ADMIN
ADMIN_PASSWORD=UMA_SENHA_FORTE_COM_12_OU_MAIS_CARACTERES
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
FRONTEND_URL=https://papelaria-comercial-production.up.railway.app
BACKEND_URL=https://papelaria-comercial-production.up.railway.app
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET
MERCADO_PAGO_ENVIRONMENT=test
```

Não defina `PORT`: o Railway fornece essa variável. Para pagamentos reais, troque conjuntamente as credenciais e `MERCADO_PAGO_ENVIRONMENT` para `production`.

### Persistência

O volume deve continuar montado em `/data`. Sem ele, um novo deploy pode perder o SQLite e as imagens enviadas. A configuração esperada é:

```text
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
```

Esta arquitetura deve operar com uma única réplica. Escalar horizontalmente exige migrar o banco e os uploads para serviços compartilhados.

### Atualização do deploy

Quando o repositório conectado recebe um novo commit, o Railway reconstrói a imagem e publica a nova versão. Depois do deploy:

1. confira o healthcheck `/api/health`;
2. valide login, logout e restauração da sessão;
3. confirme que produtos e imagens persistiram;
4. faça uma compra de teste e confira o webhook;
5. consulte os logs do Railway se o serviço reiniciar ou responder com erro.

### Mercado Pago no Railway

O webhook configurado no painel do Mercado Pago deve ser:

```text
https://papelaria-comercial-production.up.railway.app/api/webhook
```

Use as credenciais de teste com `MERCADO_PAGO_ENVIRONMENT=test`. Para ativar pagamentos reais, configure as credenciais produtivas, o segredo do webhook produtivo e `MERCADO_PAGO_ENVIRONMENT=production` na mesma publicação. Não reutilize preferências criadas no ambiente de teste.

## Banco e migrações

- O schema inicial fica em `backend/src/database/schema.sql`.
- A aplicação cria as tabelas e executa migrações compatíveis ao iniciar.
- O banco local padrão fica em `backend/src/database/database.sqlite` e é ignorado pelo Git.
- O banco de produção fica no volume definido por `DATA_DIR`.
- Backups do volume devem ser planejados antes de mudanças estruturais ou exclusões administrativas.

## Administrador inicial

O schema contém uma conta seed apenas para desenvolvimento local. Em produção, se a senha seed ainda estiver presente, a inicialização exige `ADMIN_PASSWORD` com pelo menos 12 caracteres e substitui e-mail e senha pelos valores de `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

Nunca use a senha seed em produção nem publique credenciais administrativas no README.
