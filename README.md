# ClothStock API - Sistema de Gestão de Estoque

API REST desenvolvida em Node.js com banco de dados PostgreSQL para gerenciamento de estoque de vestuário.

## 🚀 Tecnologias Utilizadas
- **Node.js**
- **Express**
- **PostgreSQL (`pg`)**
- **JWT (JSON Web Token)**
- **Dotenv**

## 🛠️ Configuração do Ambiente
1. Clone o repositório.
2. Instale as dependências com `npm install`.
3. Configure o arquivo `.env` com base nas variáveis do banco PostgreSQL.
4. Execute `database/schema.sql` e, em desenvolvimento, `database/seeds.sql` no PostgreSQL.
5. Inicie a aplicação com `npm run dev` ou `npm start`.
6. Acesse `http://localhost:3000/login.html`.

## Autenticação

A aplicação usa JWT em cookie `HttpOnly`, com validade de 8 horas. O endpoint `POST /api/auth/register` cria somente usuários operacionais; o perfil ADMIN deve ser criado por processo controlado. As rotas de negócio exigem autenticação e as operações administrativas exigem perfil ADMIN.

### Recuperação local da senha ADMIN

Execute `npm run admin:reset-password` em um terminal interativo. O script solicita o e-mail do administrador, oculta a nova senha e sua confirmação, verifica se o usuário é um ADMIN ativo, gera um novo hash com `bcryptjs` e atualiza somente `password_hash` e `updated_at`. O script não cria usuários, não recebe role por parâmetro e não imprime senhas, hashes ou tokens.

## Paginação e filtros

As listagens aceitam `page`, `limit` e `search`. A paginação visual padrão exibe 10 registros por página. Exemplos:

```text
GET /api/products?page=1&limit=10&search=camisa
GET /api/categories?page=1&limit=10&search=camiseta
GET /api/movements?type=INFLOW&page=1&limit=10&search=fornecedor
```

A resposta inclui `data` e `pagination` com `page`, `limit`, `totalItems` e `totalPages`.