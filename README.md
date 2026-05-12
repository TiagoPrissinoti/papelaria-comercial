# Papelaria Comercial

Aplicacao full stack de e-commerce para papelaria, com frontend em React (Vite) e backend em Node.js/Express usando SQLite.

## Stack
- Frontend: React 18, React Router, Axios, Vite
- Backend: Node.js, Express, JWT, Bcrypt, Multer
- Banco de dados: SQLite

## Estrutura do projeto
```text
papelaria-comercial/
  backend/    # API REST (Node + Express)
  frontend/   # SPA (React + Vite)
```

## Pre-requisitos
- Node.js 18+ (recomendado)
- npm 9+

## Como executar localmente
1. Instale as dependencias da raiz:
```bash
npm install
```

2. Instale as dependencias do frontend e backend:
```bash
npm run install:all
```

3. (Opcional) Inicialize o banco:
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
- `npm run dev`: inicia frontend + backend em paralelo
- `npm run dev:frontend`: inicia apenas o frontend
- `npm run dev:backend`: inicia apenas o backend
- `npm run install:all`: instala dependencias de `frontend` e `backend`

### Backend (`backend/package.json`)
- `npm run dev`: inicia com nodemon
- `npm run start`: inicia em modo producao
- `npm run db:init`: cria/atualiza estrutura inicial do banco

### Frontend (`frontend/package.json`)
- `npm run dev`: inicia Vite em desenvolvimento
- `npm run build`: gera build de producao
- `npm run preview`: visualiza build localmente

## Credencial admin seed
- Email: `admin@papelaria.com`
- Senha: `admin123`

## Upload de imagens de produtos
- Campo principal: `image` (1 arquivo)
- Galeria: `images` (ate 5 arquivos)
- Tipos permitidos: `.jpg`, `.jpeg`, `.png`
- Limite por arquivo: `5MB`
- Endpoints:
  - `POST /api/products`
  - `PUT /api/products/:id`

## Endpoints principais (exemplos)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products` (admin + bearer token + multipart/form-data)
- `GET /api/categories`
- `POST /api/cart/items` (usuario autenticado)
- `POST /api/orders/checkout`
- `POST /api/orders/:id/pay`
- `PATCH /api/orders/:id/status` (admin)

## Arquitetura (resumo)
- Controllers enxutos para entrada/saida HTTP
- Services com regras de negocio
- Upload isolado em middleware
- Conexao com banco separada em `backend/src/database/connection.js`
