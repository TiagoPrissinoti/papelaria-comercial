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
  - `POST /api/orders/checkout`
  - `GET /api/orders/my`
  - `POST /api/orders/:id/pay`
  - `GET /api/orders` (admin)
  - `PATCH /api/orders/:id/status` (admin)
- Admin:
  - `GET /api/admin/users`
  - `PUT /api/admin/users/:id`
  - `DELETE /api/admin/users/:id`
  - `GET /api/admin/reports/summary`
  - `GET /api/admin/reports/export.csv`

## Observacoes
- O backend aplica migracoes simples automaticamente na inicializacao para colunas novas em `products` e `order_items`.
- O arquivo `backend/src/database/database.sqlite` e banco local de desenvolvimento.
