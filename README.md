# ClothStock — Gestão de Estoque

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-Express-blue)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791)](https://www.postgresql.org/)

Aplicação web full-stack para gerenciamento de estoque de uma loja de roupas. O ClothStock permite cadastrar produtos, categorias, marcas e fornecedores, registrar entradas e saídas, acompanhar indicadores operacionais e manter o histórico de movimentações.

O projeto utiliza HTML5, CSS3, JavaScript Vanilla, Node.js, Express, PostgreSQL e API REST, conforme definido no [PRD](./PRD.md).

---

## Contexto do desafio

Este projeto foi desenvolvido como cumprimento do **Desafio 3 da Softex_Workover**, denominado **Connect Hub**.

O desafio propunha o desenvolvimento de uma aplicação full-stack com:

- backend funcional;
- integração com frontend;
- banco de dados relacional;
- autenticação segura;
- persistência real das informações;
- organização do código em módulos reutilizáveis;
- documentação para instalação e execução.

A solução foi implementada com Node.js, Express, PostgreSQL, API REST, JWT, `bcryptjs`, cookies `HttpOnly` e JavaScript Vanilla, preservando a arquitetura e o Design System definidos no projeto.

## English summary

ClothStock is a full-stack inventory management application for a clothing store. It provides a web dashboard and REST API to manage products, categories, brands, suppliers, stock inflows, and stock outflows.

The application uses HTML5, CSS3, vanilla JavaScript, Node.js, Express, PostgreSQL, JWT authentication, and `bcryptjs` password hashing. The frontend includes responsive layouts, light/dark mode, filters, pagination, forms, modals, and a shared navigation sidebar.

### Main features

- Secure login and role-based access control (`ADMIN` and `OPERATOR`);
- Product, category, brand, and supplier management;
- Stock inflow and outflow registration;
- Transactional stock updates with negative-stock protection;
- Inventory dashboard with operational metrics;
- Search filters and pagination with 10 records per page;
- PostgreSQL persistence through a REST API;
- Responsive and accessible user interface.

### Run locally

```bash
git clone https://github.com/Li-Rodrigues/clothstock.git
cd clothstock
npm install
cp .env.example .env
npm run dev
```

After configuring PostgreSQL and running `database/schema.sql`, open:

```text
http://localhost:3000/login.html
```

For complete setup instructions, API documentation, deployment guidance, and security notes, continue reading the Portuguese documentation below.

---

## Links do projeto

- **Repositório GitHub:** [github.com/Li-Rodrigues/clothstock](https://github.com/Li-Rodrigues/clothstock)
- **Aplicação local:** [http://localhost:3000/login.html](http://localhost:3000/login.html)
- **Documentação funcional:** [PRD.md](./PRD.md)
- **Produção:** [clothstockconnecthub.vercel.app/login.html](https://clothstockconnecthub.vercel.app/login.html)

> **Indexação em mecanismos de busca:** o repositório e o endereço de produção são públicos, e a aplicação **não** bloqueia rastreamento hoje — não existe `robots.txt`, e o Express responde `200` com `index.html` para caminhos inexistentes (`app.get('*')` em `src/app.js`). Nenhum conteúdo de negócio é exposto: todas as telas operacionais exigem sessão e todos os endpoints da API respondem `401` sem cookie válido. Para que a aplicação deixe de ser indexada, adicione `public/robots.txt` com `User-agent: *` e `Disallow: /`, além da meta tag `noindex` nas páginas.

---

## Visão geral

O fluxo principal da aplicação é:

```text
Browser
  ↓
HTML/CSS/JavaScript
  ↓
API REST
  ↓
Express + middlewares
  ↓
Controllers
  ↓
PostgreSQL
  ↓
Resposta da API
  ↓
Atualização da interface
```

O frontend é servido pelo Express e utiliza Bootstrap 5 e Feather Icons. O backend é uma API REST com autenticação JWT armazenada em cookie `HttpOnly`.

---

## Funcionalidades

### Autenticação e autorização

- Login com e-mail e senha.
- Cadastro público de usuários operacionais.
- Usuários administrativos protegidos por perfil `ADMIN`.
- Senhas armazenadas com `bcryptjs`.
- JWT em cookie `HttpOnly`.
- Cookie com `SameSite=Lax` e `Secure` em produção.
- Sessão com validade de 8 horas.
- Logout e consulta do usuário autenticado.
- Redirecionamento de páginas sem sessão para a tela de login.
- Controle de acesso no backend por perfil.
- Três perfis: **ADMIN** (completo), **OPERATOR** (operação de estoque,
  sem mexer em cadastros) e **VIEWER** (somente leitura, para
  avaliadores).
- Matriz de permissões declarativa e **negar por padrão** em
  `src/config/permissions.js`, aplicada por um gate registrado antes de
  qualquer rota.
- A role é relida do banco a cada requisição, então rebaixar um usuário
  corta o acesso imediatamente e um token forjado com `role=ADMIN` não
  concede nada.
- **Cadastro público desligado em produção**: `POST /api/auth/register`
  responde `403 REGISTRATION_DISABLED` quando `NODE_ENV=production` ou
  há `VERCEL`. Em desenvolvimento ele continua aberto e sempre cria
  `OPERATOR`.
- Usuário de demonstração `VIEWER` e scripts para verificar as
  permissões pela API. Ver [PERMISSOES.md](PERMISSOES.md).

### Dashboard

- Quantidade de produtos em estoque.
- Custo total do estoque.
- Valor de venda do estoque.
- Indicadores de saídas e vendas.
- Produtos vendidos.
- Valor das vendas.
- Margem operacional calculada a partir dos dados disponíveis.
- Atualização dos indicadores via API.

> A nomenclatura de “vendas” no dashboard representa saídas de estoque. Vendas/POS, pagamento e e-commerce não fazem parte do escopo atual.

### Produtos

- Cadastro de produto.
- Edição de produto.
- Consulta de detalhes.
- Exclusão/desativação conforme a política da API.
- SKU único.
- Categoria e marca relacionadas.
- Tamanho e cor.
- Preço de custo.
- Preço de venda.
- Quantidade em estoque.
- Filtro textual.
- Paginação de 10 registros por página.

### Categorias

- CRUD de categorias.
- Nome e descrição.
- Filtro textual.
- Proteção contra exclusão de categoria vinculada.
- Paginação de 10 registros por página.
- Feedback de carregamento, erro e lista vazia.

### Marcas

- CRUD de marcas.
- Nome e descrição.
- Filtro textual.
- Proteção contra exclusão de marca vinculada.
- Paginação de 10 registros por página.
- Feedback de carregamento, erro e lista vazia.

### Fornecedores

- CRUD de fornecedores.
- Razão social e nome fantasia.
- CNPJ/CPF.
- E-mail, telefone e endereço.
- Cidade e UF.
- Observações.
- Associação com entradas de estoque.
- Filtro textual.
- Paginação de 10 registros por página.

### Entradas de estoque

- Registro de uma ou mais peças.
- Associação com fornecedor.
- Número da nota fiscal.
- Observação.
- Custo unitário.
- Atualização transacional do estoque.
- Histórico de entrada.
- Filtro por texto.
- Paginação de 10 registros por página.

### Saídas de estoque

- Registro de uma ou mais peças.
- Motivo da saída.
- Observação.
- Preço unitário.
- Validação de estoque disponível.
- Atualização transacional do estoque.
- Histórico de saída.
- Filtro por texto.
- Paginação de 10 registros por página.

### Interface

- Sidebar compartilhada.
- Dashboard canônico em `/dashboard.html`.
- Modo claro e escuro.
- Footer com o texto institucional do PRD.
- Layout responsivo.
- Tabelas com container horizontal em telas pequenas.
- Modais Bootstrap.
- Estados de loading, erro e lista vazia.
- Filtros e paginação padronizados.

---

## Requisitos funcionais

| ID | Requisito | Implementação |
|---|---|---|
| RF-01 | Autenticar usuário com e-mail e senha | Implementado |
| RF-02 | Manter sessão autenticada | Implementado com JWT em cookie `HttpOnly` |
| RF-03 | Encerrar sessão | Implementado |
| RF-04 | Permitir cadastro público sem autoatribuição de ADMIN | Implementado |
| RF-05 | Restringir operações administrativas a ADMIN | Implementado |
| RF-06 | Exibir dashboard com indicadores de estoque | Implementado |
| RF-07 | Cadastrar, consultar, editar e excluir produtos | Implementado |
| RF-08 | Gerenciar categorias | Implementado |
| RF-09 | Gerenciar marcas | Implementado |
| RF-10 | Gerenciar fornecedores | Implementado |
| RF-11 | Registrar entradas de estoque | Implementado |
| RF-12 | Registrar saídas de estoque | Implementado |
| RF-13 | Impedir saída maior que o estoque disponível | Implementado |
| RF-14 | Manter histórico de movimentações | Implementado |
| RF-15 | Filtrar produtos, cadastros e movimentações | Implementado |
| RF-16 | Exibir 10 registros por página | Implementado |
| RF-17 | Reiniciar a paginação ao alterar um filtro | Implementado |
| RF-18 | Exibir estados de carregamento, erro e vazio | Implementado |
| RF-19 | Adicionar footer institucional | Implementado |
| RF-20 | Adaptar o layout para desktop, tablet e smartphone | Implementado |
| RF-21 | Gerenciar usuários pela interface | Pendente para uma próxima fase |
| RF-22 | Testes automatizados end-to-end e de integração | Pendente para uma próxima fase |

---

## Requisitos não funcionais

### Segurança

- Senhas nunca devem ser armazenadas em texto puro.
- Hashes de senha são gerados com `bcryptjs`.
- Tokens JWT são transmitidos em cookie `HttpOnly`.
- O token não deve ser armazenado em `localStorage`.
- Consultas SQL devem utilizar parâmetros.
- Autorização deve ser validada no backend.
- A API deve retornar `401` para usuário não autenticado.
- A API deve retornar `403` para usuário sem permissão.
- Credenciais, senhas e hashes não devem ser commitados no Git.
- O frontend não é autoridade para autorização.

### Consistência e integridade

- Dados de negócio devem permanecer no PostgreSQL.
- Estoque não pode ficar negativo.
- Entradas e saídas devem ser executadas dentro de transação.
- Falhas durante uma movimentação devem gerar rollback.
- Produtos devem ser bloqueados durante operações concorrentes de estoque.
- Valores unitários devem ser registrados no histórico da movimentação.
- O estoque deve ser alterado por movimentações, não por edição arbitrária do produto.

### Performance

- Listagens devem oferecer paginação.
- O limite visual padrão é 10 registros por página.
- Filtros devem utilizar consultas parametrizadas.
- O backend deve oferecer suporte a `page`, `limit` e `search`.
- O payload da API deve ser consumido diretamente pela interface.
- Evitar carga de dados de negócio em arrays mockados ou JSON estático.

### Usabilidade e acessibilidade

- A aplicação deve funcionar em modo claro e escuro.
- Campos de formulário devem ter labels associados.
- Botões de ícone devem ter nome acessível.
- Estados de erro devem ser visíveis.
- A navegação deve funcionar por teclado.
- Tabelas devem permanecer utilizáveis em telas pequenas.
- Modais devem funcionar dentro da viewport.
- O footer não pode cobrir o conteúdo.
- O botão de tema deve permanecer no lado direito do header.

### Manutenibilidade

- Manter a stack definida no PRD.
- Não introduzir React, Vue, Angular, Next.js, TypeScript ou Tailwind sem decisão arquitetural.
- Preservar o Design System existente.
- Manter controllers, rotas, middlewares e scripts separados por responsabilidade.
- Documentar alterações de banco e contratos de API.
- Não inserir credenciais ou dados sensíveis em scripts de desenvolvimento.

### Compatibilidade e deploy

- Node.js compatível com a versão instalada no ambiente.
- PostgreSQL compatível com o schema do projeto.
- Configuração por variáveis de ambiente.
- Deploy preparado para Vercel.
- O servidor Express deve continuar exportando a aplicação para functioning serverless.
- O frontend e a API devem ser servidos pelo mesmo domínio ou por origens explicitamente autorizadas.

---

## Arquitetura do projeto

### Estrutura principal

```text
.
├── api/
│   └── server.js
├── database/
│   ├── schema.sql
│   └── seeds.sql
├── public/
│   ├── dashboard.html
│   ├── login.html
│   ├── register.html
│   ├── index.html
│   ├── sidebar.html
│   ├── products.html
│   ├── categories.html
│   ├── brands.html
│   ├── suppliers.html
│   ├── inflows.html
│   ├── outflows.html
│   ├── assets/
│   ├── css/
│   └── js/
├── scripts/
│   ├── admin-create.js
│   ├── admin-reset-password.js
│   └── lib/
│       ├── prompt.js
│       └── validators.js
├── src/
│   ├── app.js
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── utils/
│       ├── pagination.js
│       └── passwordPolicy.js
├── templates/
│   └── base.html
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── PRD.md
├── README.md
└── vercel.json
```

### Backend

- `api/server.js`: ponto de entrada local e serverless.
- `src/app.js`: configuração do Express, CORS, arquivos estáticos e rotas.
- `src/routes`: definição dos endpoints.
- `src/controllers`: regras de negócio e respostas HTTP.
- `src/middlewares`: autenticação, autorização e tratamento de erros.
- `src/config/database.js`: pool de conexões PostgreSQL.
- `src/utils`: utilitários compartilhados, como paginação.

### Frontend

- Páginas HTML independentes por módulo.
- Bootstrap 5 para layout, tabelas, formulários e modais.
- Feather Icons para ícones.
- JavaScript Vanilla para integração com a API.
- `public/js/app-shell.js`: sessão, logout, footer, tema e componentes compartilhados de listagem.
- `public/js/sidebar.js`: carregamento da navegação compartilhada.
- `public/js/movement-page.js`: entradas e saídas.

### Banco de dados

Principais entidades:

```text
users
brands
categories
products
suppliers
inflows
inflow_items
outflows
outflow_items
```

Relacionamentos principais:

```text
categories 1 ─── N products
brands     1 ─── N products
inflows    1 ─── N inflow_items
outflows   1 ─── N outflow_items
products   1 ─── N movement items
users      1 ─── N movimentações
suppliers  1 ─── N inflows
```

---

## Requisitos de ambiente

### Tecnologias

- Node.js 18 ou superior recomendado.
- npm.
- PostgreSQL 14 ou superior recomendado.
- Git para clonar o projeto.

Para otimizar o processo de desenvolvimento e direcionar maior atenção à arquitetura e à implementação do código, foram utilizadas ferramentas de Inteligência Artificial Generativa como apoio na estruturação e no refinamento do documento de requisitos do projeto ([PRD.md](./PRD.md)).

O uso dessas ferramentas auxiliou na organização dos requisitos, na definição do escopo e no planejamento das funcionalidades, contribuindo para a estruturação final do projeto. As decisões de arquitetura, implementação, integração e validação permaneceram sob responsabilidade da autora.

### Variáveis de ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Variáveis importantes:

| Variável | Finalidade |
|---|---|
| `PORT` | Porta local da aplicação |
| `NODE_ENV` | Ambiente de execução |
| `JWT_SECRET` | Chave de assinatura dos tokens |
| `FRONTEND_ORIGIN` | Origem autorizada para CORS |
| `DATABASE_URL` | Conexão PostgreSQL em formato URL |
| `DB_HOST` | Host PostgreSQL |
| `DB_PORT` | Porta PostgreSQL |
| `DB_USER` | Usuário PostgreSQL |
| `DB_PASSWORD` | Senha PostgreSQL |
| `DB_NAME` | Nome do banco PostgreSQL |

Use `DATABASE_URL` ou o conjunto `DB_*`, conforme a infraestrutura disponível.

> Nunca publique `.env`, senhas, hashes, tokens ou dados de conexão em arquivos versionados.

---

## Executando localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/Li-Rodrigues/clothstock.git
cd clothstock
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o ambiente

```bash
cp .env.example .env
```

Edite o `.env` com os dados do PostgreSQL e defina um `JWT_SECRET` forte.

### 4. Criar o banco

Execute o schema no banco desejado:

```bash
psql -U <usuario> -d <banco> -f database/schema.sql
```

Em desenvolvimento, o seed pode ser executado para criar dados iniciais:

```bash
psql -U <usuario> -d <banco> -f database/seeds.sql
```

> O `seeds.sql` é um recurso de desenvolvimento. Não use seeds com credenciais administrativas como estratégia de inicialização em produção.

#### Banco que já existe: migração do perfil VIEWER

A tabela `users` já instalada tem `CHECK (role IN ('ADMIN', 'OPERATOR'))`.
Como o `CREATE TABLE` do `schema.sql` usa `IF NOT EXISTS`, reexecutar o
`schema.sql` **não** atualiza a tabela existente, e a criação da conta
VIEWER seria recusada pelo banco. Rode a migração:

```bash
psql "$DATABASE_URL" -f database/migrations/001-viewer-role.sql
```

Ela é não destrutiva e idempotente: não cria nem altera tabela alguma, não
apaga nem recria linha alguma, e apenas amplia o `CHECK` para aceitar
`VIEWER`.

Depois, crie a conta de demonstração dos avaliadores:

```bash
npm run viewer:create:generate   # senha aleatória, exibida uma vez
```

> A senha da conta VIEWER **não** existe em nenhum arquivo versionado.
> Escolha-a no momento da criação. Detalhes em
> [PERMISSOES.md](PERMISSOES.md).

### 5. Iniciar em desenvolvimento

```bash
npm run dev
```

O servidor utilize a porta definida em `PORT`, normalmente:

```text
http://localhost:3000
```

### 6. Acessar a aplicação

Abra:

```text
http://localhost:3000/login.html
```

A tela administrativa oficial é:

```text
http://localhost:3000/dashboard.html
```

### 7. Parar a aplicação

Pressione:

```text
Ctrl + C
```

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor em modo normal |
| `npm run dev` | Inicia o servidor com `nodemon` |
| `npm run admin:create` | Cria o primeiro usuário ADMIN (somente se nenhum existir) |
| `npm run admin:reset-password` | Redefine a senha de um ADMIN existente |
| `npm run test-user:create` | Cria/redefine o OPERATOR de teste com acesso restrito |
| `npm run test-user:remove` | Remove o OPERATOR de teste |
| `npm run viewer:create` | Cria a conta de demonstração VIEWER (senha por env var ou digitada) |
| `npm run viewer:create:generate` | Cria a conta VIEWER com senha aleatória, exibida uma vez |
| `npm run viewer:remove` | Remove a conta de demonstração VIEWER |
| `npm run verify:matrix` | Confere se a matriz cobre todas as rotas e se o VIEWER é somente leitura |
| `npm run verify:permissions` | Prova as permissões via HTTP, sem passar pela interface |

> O perfil VIEWER, as migrações e o cadastro público estão detalhados em
> [PERMISSOES.md](PERMISSOES.md).

### Criar o primeiro usuário ADMIN

Em um terminal interativo, com a `DATABASE_URL` do banco de produção (Neon) definida
**apenas na sessão atual do shell**:

```bash
npm run admin:create
```

O script:

- exige `DATABASE_URL` na variável de ambiente (nunca embutida no código);
- solicita nome, e-mail, senha e confirmação da senha;
- oculta a senha durante a digitação (modo raw, sem eco);
- valida o formato do e-mail e exige senha forte (mín. 12 caracteres, maiúscula,
  minúscula, dígito, caractere especial e no máximo 72 bytes para não ser truncada
  pelo bcrypt);
- consulta se já existe algum usuário com `role = 'ADMIN'` e **aborta sem alterar o
  banco** caso positivo;
- cria o usuário com `role = 'ADMIN'` e `is_active = TRUE` dentro de uma transação;
- grava apenas o `password_hash` gerado com `bcryptjs` (12 rounds);
- não imprime `DATABASE_URL`, senha, `password_hash` ou `JWT_SECRET`.

> Não execute este script em pipeline, CI ou com a senha em argumento da linha de
> comando: o script recusa ambientes sem terminal interativo.

### Recuperar a senha do ADMIN

Em um terminal interativo:

```bash
npm run admin:reset-password
```

O script:

- solicita o e-mail do administrador;
- oculta a nova senha;
- solicita a confirmação;
- exige pelo menos 12 caracteres;
- verifica se o usuário é um ADMIN ativo;
- gera hash com `bcryptjs`;
- altera somente `password_hash` e `updated_at`;
- não cria usuários;
- não imprime credenciais.

---

## API principal

As rotas de negócio exigem autenticação.

### Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Cadastro público de usuário operacional |
| `POST` | `/api/auth/login` | Autenticação |
| `POST` | `/api/auth/logout` | Encerramento de sessão |
| `GET` | `/api/auth/me` | Dados do usuário autenticado |
| `GET` | `/api/auth/permissions` | Ações que o servidor autoriza para o usuário atual |
| `GET` | `/api/auth/health` | Verificação da rota de autenticação |

### Produtos

| Método | Endpoint | Perfil |
|---|---|---|
| `GET` | `/api/products` | ADMIN/OPERATOR |
| `GET` | `/api/products/:id` | ADMIN/OPERATOR |
| `POST` | `/api/products` | ADMIN |
| `PUT/PATCH` | `/api/products/:id` | ADMIN |
| `DELETE` | `/api/products/:id` | ADMIN |

### Cadastros

| Recurso | Listagem | Operações administrativas |
|---|---|---|
| Categorias | `/api/categories` | `/api/categories/:id` |
| Marcas | `/api/brands` | `/api/brands/:id` |
| Fornecedores | `/api/suppliers` | `/api/suppliers/:id` |

### Movimentações

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/movements` | Histórico |
| `POST` | `/api/movements/inflows` | Registrar entrada |
| `POST` | `/api/movements/outflows` | Registrar saída |
| `POST` | `/api/movements` | Rota compatível com o frontend atual |

### Dashboard

```text
GET /api/dashboard
```

---

## Paginação e filtros

As APIs principais aceitam:

```text
page
limit
search
```

Exemplos:

```text
GET /api/products?page=1&limit=10&search=camisa
GET /api/categories?page=1&limit=10&search=camiseta
GET /api/brands?page=1&limit=10&search=nike
GET /api/suppliers?page=1&limit=10&search=silva
GET /api/movements?type=INFLOW&page=1&limit=10&search=fornecedor
```

Formato de resposta com paginação:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

A interface exibe 10 registros por página e utiliza o padrão:

```text
Anterior | 1 | 2 | ... | Próxima
```

---

## Tratamento de erros

Formato recomendado para erros:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Não foi possível concluir a operação.",
    "details": []
  }
}
```

Códigos HTTP utilizados:

- `200` leitura ou atualização;
- `201` criação ou movimentação registrada;
- `204` operação sem corpo;
- `400` requisição inválida;
- `401` usuário não autenticado;
- `403` usuário sem permissão;
- `404` recurso não encontrado;
- `409` conflito;
- `500` erro interno sem exposição de detalhes sensíveis.

---

## Deploy na Vercel

O repositório possui configuração em `vercel.json`.

### Checklist de deploy

1. Criar um projeto PostgreSQL gerenciado ou disponibilizar um banco acessível pela Vercel.
2. Executar `database/schema.sql` no banco de produção.
3. Configurar as variáveis de ambiente no painel da Vercel:
   - `NODE_ENV=production`;
   - `PORT`;
   - `DATABASE_URL`;
   - `JWT_SECRET`;
   - `FRONTEND_ORIGIN`.
4. Importar o repositório na Vercel.
5. Confirmar o entrypoint:

```text
api/server.js
```

6. Fazer o deploy.
7. Testar a tela de login.
8. Testar a API `/api/auth/health`.
9. Cadastrar o primeiro usuário operacional.
10. Provisionar o ADMIN por processo controlado.

Não execute `database/seeds.sql` em produção sem revisar e substituir a estratégia de credenciais.

---

## Segurança operacional

 Checklist para ambiente compartilhado:

- [ ] `.env` está fora do versionamento.
- [ ] `JWT_SECRET` é forte e exclusivo do ambiente.
- [ ] O banco exige conexão segura em produção.
- [ ] CORS está limitado à origem autorizada.
- [ ] O cookie de sessão está protegido.
- [ ] Nenhuma senha é exibida em logs.
- [ ] Nenhum hash é exibido na interface.
- [ ] A senha do ADMIN inicial é definida por processo controlado.
- [ ] O banco é fazer backup periodicamente.
- [ ] Seeds são executados apenas em desenvolvimento.
- [ ] O dashboard não apresenta dados estáticos como dados reais.

---

## Estado atual e próximos passos

### Implementado

- autenticação JWT com cookie;
- perfis ADMIN e OPERATOR;
- CRUDs principais;
- entradas e saídas transacionais;
- dashboard conectado à API;
- filtros;
- paginação visual de 10 registros;
- footer;
- modo escuro;
- layout responsivo;
- script seguro para redefinição de senha ADMIN.

### Próximas evoluções recomendadas

- página de gestão de usuários;
- suíte de testes automatizados;
- testes de concorrência e rollback;
- migrações versionadas de banco;
- CSRF explícito ou estratégia finalizada para cookie;
- documentação de fórmulas financeiras do dashboard;
- cálculo de margem histórica com snapshot de custo;
- URL pública de produção registrada neste README;
- observabilidade e logs estruturados.

---

## Sugestão principal de melhoria da apresentação final

A principal sugestão é transformar a etapa de setup em um checklist automatizado de entrada para novos desenvolvedores e equipes.

O README agora documenta o `.env`, o schema, o seed de desenvolvimento, os comandos, as rotas, a autenticação e o deploy. A melhoria de maior impacto para a apresentação final seria adicionar:

1. um comando único de verificação de ambiente;
2. um script de smoke test para login e endpoints protegidos;
3. um arquivo de exemplo de configuração de produção sem valores sensíveis;
4. a URL pública do deploy validada;
5. um diagrama visual da arquitetura e do fluxo de uma movimentação.

Isso permitiria que uma pessoa nova entendesse, configurasse e validasse o projeto sem depender de conhecimento anterior da equipe.

---

## Licença

O projeto está preparado para uso acadêmico e administrativo. A licença deve ser definida pelo responsável do produto antes de uma publicação pública.
