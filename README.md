# Papelaria Comercial

Aplicacao full stack de e-commerce para papelaria com autenticacao JWT, area do cliente e dashboard administrativo moderno.

## Stack
- Frontend: React 18, React Router, Axios, Vite
- Backend: Node.js, Express, JWT, Bcrypt, Multer
- Banco de dados: SQLite

## Estrutura do projeto
```text
papelaria-comercial/
  backend/    # API REST (Node + Express + SQLite)
  frontend/   # SPA (React + Vite)
```

## Funcionalidades atuais

### Cliente
- Login e cadastro
- Home com busca e filtro por categoria
- Detalhe de produto com galeria de imagens
- Carrinho de compras
- Checkout
- Meus pedidos

### Administrativo (apenas `role=admin`)
- Dashboard moderno e responsivo
- Sidebar retratil
- Navbar administrativa com atalho para voltar para a loja
- Modo escuro (toggle na aba Config, com persistencia em `localStorage`)
- Indicadores:
  - Total de usuarios
  - Total de vendas
  - Produtos cadastrados
  - Receita total
  - Custo total
  - Lucro real
- Grafico de status de pedidos
- Atividades recentes
- Gerenciamento de usuarios:
  - Listagem
  - Busca e filtro por perfil
  - Alteracao de permissao
  - Exclusao
  - Paginacao
- Gerenciamento de produtos:
  - Cadastro com upload (imagem principal + galeria)
  - Exclusao
  - Exibicao de custo por produto
- Relatorios:
  - Filtro por data
  - Exportacao CSV de vendas
  - Exportacao CSV de usuarios
  - Exportacao PDF via impressao do navegador

## Seguranca e controle de acesso
- JWT no backend
- Senhas com hash via Bcrypt
- Middleware de autenticacao: `authMiddleware`
- Middleware de autorizacao admin: `isAdmin`
- Rotas protegidas no frontend:
  - `ProtectedRoute`
  - `AdminRoute`
  - Redirecionamento para `/acesso-negado` quando usuario comum tenta acessar `/admin`
- Validacao de permissao no backend para endpoints administrativos

## Regras de status de pedido
- Status internos no backend: `pendente`, `pago`, `enviado`, `entregue`
- No frontend, `pago` e exibido como `finalizado`

## Custo e lucro real
- Produto possui `cost_price` (custo de compra)
- No checkout, o custo e congelado em `order_items.cost_price`
- Isso garante lucro historico correto mesmo se o custo do produto mudar depois
- Lucro real = `unit_price - cost_price` por item vendido

## Pre-requisitos
- Node.js 18+ (recomendado)
- npm 9+

## Como executar localmente
1. Instale dependencias da raiz:
```bash
npm install
```

2. Instale dependencias de frontend e backend:
```bash
npm run install:all
```

3. (Opcional) Rode init de banco manual:
```bash
npm run db:init --prefix backend
```

4. Suba frontend e backend juntos:
```bash
npm run dev
```

## URLs locais
- Frontend: `http://localhost:5173`
- Backend (API): `http://localhost:3333/api`
- Uploads: `http://localhost:3333/uploads/<arquivo>`

## Mercado Pago em dev com ngrok
O Checkout Pro do Mercado Pago exige URLs públicas `https` para `back_urls` e `notification_url`. Em desenvolvimento, use o ngrok para expor frontend e backend.

### 1) Inicie os servidores locais
```bash
npm run dev:backend
npm run dev:frontend
```

### 2) Abra dois túneis ngrok
Em dois terminais separados:
```bash
ngrok http 3333
ngrok http 5173
```

### 3) Copie as URLs `https`
Exemplo:
- Backend: `https://abc123.ngrok-free.app`
- Frontend: `https://xyz456.ngrok-free.app`

### 4) Atualize `backend/.env`
```ini
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET=SEU_SEGREDO_DE_TESTE
MERCADO_PAGO_ENVIRONMENT=test
FRONTEND_URL=https://xyz456.ngrok-free.app
BACKEND_URL=https://abc123.ngrok-free.app
```

### 5) Reinicie o backend
Depois de alterar o `.env`, reinicie o backend para ele ler as novas URLs.

### Observação importante
- No plano gratuito do ngrok, as URLs podem mudar sempre que você reiniciar os túneis.
- Sempre atualize `FRONTEND_URL` e `BACKEND_URL` se isso acontecer.
- Se o Mercado Pago reclamar de URL inválida, confira se as duas URLs começam com `https://`.

## Scripts principais

### Raiz
- `npm run dev`: inicia backend + frontend em paralelo
- `npm run dev:backend`: inicia apenas backend
- `npm run dev:frontend`: inicia apenas frontend
- `npm run install:all`: instala dependencias de backend e frontend

### Backend (`backend/package.json`)
- `npm run dev`: inicia com nodemon
- `npm run start`: inicia em modo producao
- `npm run db:init`: inicializa/atualiza estrutura de banco

### Frontend (`frontend/package.json`)
- `npm run dev`: inicia Vite
- `npm run build`: gera build de producao
- `npm run preview`: preview local da build

## Credenciais admin seed
- Email: `admin@papelaria.com`
- Senha: `admin123`

## Upload de imagens de produtos
- Campo principal: `image` (1 arquivo)
- Galeria: `images` (multiplos arquivos)
- Tipos permitidos: `.jpg`, `.jpeg`, `.png`
- Limite por arquivo: `5MB`

## Endpoints principais (resumo)
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Produtos:
  - `GET /api/products`
  - `GET /api/products/:id`
  - `POST /api/products` (admin + token + multipart)
  - `PUT /api/products/:id` (admin + token + multipart)
  - `DELETE /api/products/:id` (admin)
- Categorias:
  - `GET /api/categories`
  - `POST /api/categories` (admin)
  - `PUT /api/categories/:id` (admin)
  - `DELETE /api/categories/:id` (admin)
- Carrinho:
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `DELETE /api/cart/items/:productId`
- Pedidos:
  - `GET /api/orders/my`
  - `GET /api/orders` (admin)
  - `PATCH /api/orders/:id/status` (admin)
- Pagamento:
  - `POST /api/pagamento/criar`
  - `GET /api/pagamento/pedidos/:id`
  - `POST /api/webhook` (Mercado Pago, com assinatura obrigatoria)
- Admin:
  - `GET /api/admin/users`
  - `PUT /api/admin/users/:id`
  - `DELETE /api/admin/users/:id`
  - `GET /api/admin/reports/summary`
  - `GET /api/admin/reports/export.csv`

## Observacoes
- O backend aplica migracoes simples automaticamente na inicializacao para colunas novas em `products` e `order_items`.
- O arquivo `backend/src/database/database.sqlite` e banco local de desenvolvimento.

## Deploy economico no Railway

O projeto esta configurado para publicar frontend e backend no mesmo servico. Isso reduz o custo, evita configuracao de CORS entre dominios e fornece uma unica URL HTTPS para a loja e para a API.

### 1. Publique o repositorio

Envie este projeto para um repositorio privado no GitHub. Nao inclua arquivos `.env`, credenciais ou o banco local.

Se o banco local ou uploads ja tiverem sido versionados anteriormente, remova-os apenas do indice do Git, preservando os arquivos locais:

```bash
git rm -r --cached backend/src/database/*.sqlite backend/uploads
```

Revise tambem o historico do repositorio antes de torna-lo publico.

### 2. Crie o servico

No Railway, escolha **New Project > Deploy from GitHub repo** e selecione o repositorio. O arquivo `railway.toml` faz o Railway construir a imagem descrita no `Dockerfile` e verificar `/api/health`.

### 3. Crie o volume persistente

No servico, abra **Volumes**, crie um volume e monte-o em:

```text
/data
```

Sem esse volume, o banco SQLite e as imagens podem ser perdidos em um novo deploy.

### 4. Gere o dominio HTTPS

Abra **Settings > Networking > Generate Domain**. Copie a URL gerada, por exemplo `https://papelaria-production.up.railway.app`.

### 5. Configure as variaveis

Em **Variables**, adicione:

```ini
NODE_ENV=production
JWT_SECRET=UMA_CHAVE_LONGA_ALEATORIA
ADMIN_EMAIL=SEU_EMAIL_DE_ADMINISTRADOR
ADMIN_PASSWORD=UMA_SENHA_FORTE_COM_12_OU_MAIS_CARACTERES
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
FRONTEND_URL=https://SEU-DOMINIO.up.railway.app
BACKEND_URL=https://SEU-DOMINIO.up.railway.app
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET=SEU_WEBHOOK_SECRET
MERCADO_PAGO_ENVIRONMENT=test
```

Nao defina `PORT`: o Railway fornece essa variavel automaticamente. `ADMIN_PASSWORD` substitui a senha publica do seed na primeira inicializacao do banco de producao. O Access Token e o segredo do webhook sao privados e nunca devem usar o prefixo `VITE_`.

### 6. Configure o Mercado Pago

Em **Suas integracoes**, abra a aplicacao e configure, primeiro na aba de testes:

```text
https://SEU-DOMINIO.up.railway.app/api/webhook
```

Selecione o evento **Pagamentos** e copie a assinatura secreta gerada para `MERCADO_PAGO_WEBHOOK_SECRET`. Valide uma compra completa com credenciais de teste antes de ativar as credenciais de producao.

Para entrar em producao, ative as credenciais de producao no painel do Mercado Pago e faca a troca em uma unica publicacao no Railway:

```ini
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_DE_PRODUCAO
MERCADO_PAGO_WEBHOOK_SECRET=SEU_SEGREDO_DE_WEBHOOK_PRODUTIVO
MERCADO_PAGO_ENVIRONMENT=production
```

Configure a URL na aba **Modo produtivo** dos webhooks e mantenha o evento **Pagamentos** selecionado. Nao reutilize preferencias criadas com credenciais de teste depois da troca. O backend valida assinatura, valor, moeda, preferencia e `live_mode` antes de aprovar o pedido, e o estoque e baixado de forma idempotente na primeira aprovacao.
