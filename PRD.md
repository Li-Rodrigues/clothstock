# ClothStock -- Product Requirements Document

**Produto:** ClothStock -- Gestão de Estoque\
**Tipo:** Aplicação Web Full-Stack\
**Versão do PRD:** 1.0\
**Status:** Especificação para auditoria e implementação\
**Stack-alvo:** HTML5, CSS3, JavaScript Vanilla, Node.js, Express,
PostgreSQL, API REST\
**Deploy-alvo:** Vercel

> **Regra de interpretação deste documento:** o repositório completo da
> aplicação não foi disponibilizado junto à solicitação de geração deste
> PRD. Portanto, nenhum arquivo, endpoint, tabela ou comportamento não
> demonstrado pela especificação de origem é declarado como existente.
> Itens que dependem de inspeção do código são marcados como **AUDITORIA
> PENDENTE**. A Fase 0 deve converter esses itens em **EXISTENTE E
> MANTER**, **EXISTENTE E AJUSTAR**, **NOVO E IMPLEMENTAR** ou **NÃO
> APLICÁVEL** antes de qualquer alteração estrutural.

------------------------------------------------------------------------

## 1. Visão Geral

ClothStock é uma aplicação web Full-Stack para gerenciamento de estoque
de uma loja de roupas. O produto deve oferecer persistência real de
dados, autenticação de usuários, autorização baseada em perfis, gestão
das entidades do estoque, registro rastreável de entradas e saídas,
dashboard e integração completa entre frontend, API, backend e
PostgreSQL.

O sistema deve demonstrar o fluxo completo:

**Frontend → API REST → Backend → Autenticação/Autorização → PostgreSQL
→ Resposta da API → Atualização da Interface.**

O frontend deve permanecer baseado em HTML5, CSS3 e JavaScript Vanilla.
O backend deve preservar a stack Node.js/Express/PostgreSQL indicada
pelo projeto e somente poderá ser reorganizado após auditoria técnica
que demonstre necessidade.

O Design System existente nos HTML/CSS do projeto é a fonte de verdade
visual e não poderá ser substituído por um novo sistema visual.

------------------------------------------------------------------------

## 2. Contexto do Produto

O ClothStock atende ao domínio de controle de estoque de uma loja de
roupas. Os módulos esperados são:

-   autenticação e cadastro;
-   dashboard;
-   usuários;
-   produtos;
-   categorias;
-   marcas;
-   fornecedores;
-   entradas de estoque;
-   saídas de estoque;
-   filtros e busca;
-   paginação;
-   controle de acesso;
-   persistência relacional;
-   tratamento consistente de erros.

A aplicação não pode depender de `localStorage`, `sessionStorage`,
arrays, JSON estático ou dados mockados como fonte final de dados de
negócio. Esses mecanismos não substituem a persistência no PostgreSQL.

------------------------------------------------------------------------

## 3. Objetivos

1.  Fornecer gestão persistente e consistente do estoque.
2.  Garantir autenticação real e autorização no backend.
3.  Permitir múltiplos usuários autorizados na mesma plataforma.
4.  Preservar histórico e rastreabilidade das movimentações.
5.  Evitar estoque negativo e inconsistências concorrentes.
6.  Padronizar filtros e paginação.
7.  Manter integralmente a identidade visual existente.
8.  Garantir integração real entre páginas e API.
9.  Preparar arquitetura compatível com deploy na Vercel.
10. Criar requisitos objetivos e testáveis para implementação posterior.

------------------------------------------------------------------------

## 4. Não Objetivos

Não fazem parte desta entrega do PRD:

-   migrar o frontend para React, Vue, Angular, Next.js ou outra SPA;
-   introduzir TypeScript ou Tailwind;
-   criar um novo Design System;
-   substituir componentes visuais já adequados;
-   implementar código-fonte completo;
-   recriar funcionalidades existentes sem auditoria;
-   utilizar CRUD apenas no frontend;
-   transformar movimentações de estoque em exclusões arbitrárias de
    histórico;
-   priorizar SEO de páginas privadas;
-   expor secrets, credenciais ou senhas;
-   permitir autoatribuição de perfil ADMIN.

Funcionalidades comerciais não especificadas --- por exemplo vendas/POS,
emissão fiscal, e-commerce, pagamento, multi-loja e contabilidade ---
permanecem fora do escopo até decisão explícita.

------------------------------------------------------------------------

## 5. Escopo

### 5.1 Escopo funcional obrigatório

O produto deve contemplar autenticação, RBAC, usuários, produtos,
categorias, marcas, fornecedores, entradas, saídas, dashboard, filtros,
paginação, footer, responsividade, acessibilidade, segurança, API,
banco, testes e deploy.

### 5.2 Regra de classificação do estado

Durante a auditoria, cada requisito deverá receber um dos estados:

  -----------------------------------------------------------------------
  Estado                              Definição
  ----------------------------------- -----------------------------------
  EXISTENTE E MANTER                  Implementação atual atende ao
                                      requisito e deve ser preservada.

  EXISTENTE E AJUSTAR                 Existe implementação, mas requer
                                      correção ou complementação.

  NOVO E IMPLEMENTAR                  Não existe implementação
                                      suficiente.

  NÃO APLICÁVEL                       Requisito não se aplica após
                                      análise fundamentada.

  AUDITORIA PENDENTE                  Estado temporário usado neste PRD
                                      até inspeção do repositório.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 6. Estado Atual da Aplicação

**Status geral: AUDITORIA PENDENTE.**

A especificação informa que o projeto possui ou pode possuir
páginas/módulos de Produtos, Categorias, Marcas, Fornecedores, Entradas,
Saídas, sidebar, dashboard, paginação, filtros, modo escuro, backend,
rotas, controllers e banco. Entretanto, sem o repositório não é possível
confirmar a implementação de cada item.

A auditoria obrigatória deve inventariar:

-   árvore de diretórios;
-   todos os HTML;
-   CSS globais e específicos;
-   JavaScript global e específico;
-   sidebar e componentes reutilizados;
-   dashboard;
-   páginas de domínio;
-   rotas e controllers;
-   middleware;
-   conexão PostgreSQL;
-   schema/migrations/scripts SQL;
-   autenticação e autorização;
-   endpoints;
-   filtros;
-   paginação;
-   dark mode;
-   tratamento de erros;
-   dependências do `package.json`;
-   configuração de deploy.

**Gate obrigatório:** nenhuma mudança arquitetural deve começar antes da
conclusão dessa auditoria.

------------------------------------------------------------------------

## 7. Stack Tecnológica

### Frontend

-   HTML5;
-   CSS3;
-   JavaScript Vanilla;
-   bibliotecas já existentes somente quando necessárias ao Design
    System atual.

### Backend

-   Node.js;
-   Express;
-   PostgreSQL;
-   API REST;
-   JWT;
-   bcrypt ou bcryptjs;
-   variáveis de ambiente.

### Restrições

Não introduzir React, Vue, Angular, Next.js, TypeScript, Tailwind ou
bibliotecas SPA. Não migrar a stack sem necessidade técnica comprovada.

------------------------------------------------------------------------

## 8. Arquitetura do Sistema

Arquitetura lógica:

``` text
Browser
  |
  | HTTPS
  v
Frontend HTML/CSS/JS
  |
  | fetch() / REST
  v
Express API
  |
  +--> Authentication Middleware
  |
  +--> Authorization / RBAC Middleware
  |
  +--> Controllers / Services
  |
  +--> Data Access
  |
  v
PostgreSQL
```

### Princípios

-   frontend nunca é autoridade para autorização;
-   validação ocorre no frontend para UX e no backend para segurança;
-   regras críticas de estoque pertencem ao backend/banco;
-   queries devem ser parametrizadas;
-   operações de movimentação devem ser transacionais;
-   respostas de API devem seguir formato consistente;
-   páginas privadas devem exigir autenticação;
-   recursos administrativos devem exigir autorização explícita.

------------------------------------------------------------------------

## 9. Estrutura de Diretórios

A estrutura real deve ser preservada quando adequada. A seguinte
estrutura é apenas **referência**, não declaração do estado atual:

``` text
/
├── index.html
├── login.html
├── register.html
├── products.html
├── categories.html
├── brands.html
├── suppliers.html
├── inflows.html
├── outflows.html
├── css/
├── js/
└── backend/
    ├── controllers/
    ├── routes/
    ├── middleware/
    ├── services/
    ├── repositories/ ou models/
    ├── config/
    ├── utils/
    ├── app.js
    └── server.js
```

A Fase 0 deve comparar essa referência com a árvore real e documentar
diferenças.

------------------------------------------------------------------------

## 10. Perfis de Usuário

### ADMIN

Representa o proprietário ou administrador autorizado da loja. Pode
receber permissões administrativas e operacionais.

### USER

Representa usuário comum autorizado. Suas permissões devem ser limitadas
e explicitamente definidas.

A expressão "admin de escola" presente no requisito original é
inconsistente com o domínio e não deve ser incorporada ao ClothStock. O
domínio normalizado é **administração da loja**.

------------------------------------------------------------------------

## 11. Matriz de Permissões

A política é **negar por padrão**.

A matriz abaixo é a baseline do PRD e deve ser validada com o
responsável pelo produto antes da implementação final:

  Recurso/Ação                                                ADMIN                                  USER
  --------------------------- ------------------------------------- -------------------------------------
  Dashboard operacional                                         Sim            Sim, limitado ao permitido
  Visualizar produtos                                           Sim                                   Sim
  Criar produto                                                 Sim                        Não por padrão
  Editar produto                                                Sim                        Não por padrão
  Excluir/desativar produto                                     Sim                                   Não
  Visualizar categorias                                         Sim                                   Sim
  Gerenciar categorias                                          Sim                                   Não
  Visualizar marcas                                             Sim                                   Sim
  Gerenciar marcas                                              Sim                                   Não
  Visualizar fornecedores                                       Sim                  Conforme necessidade
  Gerenciar fornecedores                                        Sim                                   Não
  Consultar movimentações                                       Sim                  Sim, conforme escopo
  Registrar entrada                                             Sim   Sim, se autorizado operacionalmente
  Registrar saída                                               Sim   Sim, se autorizado operacionalmente
  Gerenciar usuários                                            Sim                                   Não
  Atribuir ADMIN                Somente fluxo administrativo seguro                                   Não
  Recursos administrativos                                      Sim                                   Não

**Questão em aberto:** confirmar se USER pode registrar entradas e
saídas ou apenas consultá-las.

Ocultar controles no frontend deve refletir a permissão, mas a API deve
repetir a validação de autorização.

------------------------------------------------------------------------

## 12. Autenticação

### Fluxo

``` text
Cadastro
→ validação
→ normalização
→ hash da senha
→ persistência
→ login
→ validação das credenciais
→ autenticação válida
→ identificação do usuário e role
→ autorização
→ acesso ao recurso
```

### Requisitos

-   senha nunca em texto puro;
-   hash com bcrypt/bcryptjs;
-   mensagens de login não devem facilitar enumeração de usuários;
-   token inválido/adulterado deve ser rejeitado;
-   token expirado deve encerrar a sessão no cliente;
-   endpoint protegido sem autenticação retorna `401`;
-   usuário autenticado sem permissão recebe `403`;
-   logout deve invalidar a sessão do ponto de vista do cliente e,
    conforme estratégia escolhida, do servidor.

### Armazenamento do JWT

Não usar `localStorage` automaticamente. A opção preferencial a ser
validada para esta arquitetura é **cookie `HttpOnly`, `Secure` em
produção e `SameSite` adequado**, porque reduz exposição do token a
JavaScript e, consequentemente, o impacto de XSS sobre roubo direto do
token.

Se autenticação baseada em cookie for adotada, o projeto deve tratar
CSRF de acordo com a arquitetura, origem do frontend/API e política
`SameSite`. CORS deve permitir somente origens autorizadas e credenciais
quando necessário.

A decisão final deve considerar a topologia real de deploy identificada
na Fase 0/13.

------------------------------------------------------------------------

## 13. Autorização

RBAC deve existir no backend.

Fluxo mínimo:

``` text
Request
→ autenticar identidade
→ obter role
→ verificar permissão do endpoint/ação
→ permitir ou negar
```

Regras:

-   negar por padrão;
-   não aceitar `role` enviada pelo cliente como autoridade;
-   não confiar em elementos ocultos na UI;
-   impedir escalada de privilégio;
-   separar `401 Unauthorized` de `403 Forbidden`;
-   ações administrativas devem possuir middleware/política explícita.

------------------------------------------------------------------------

## 14. Cadastro de Usuários

### Campos mínimos propostos

-   nome: obrigatório;
-   e-mail: obrigatório e único;
-   senha: obrigatória;
-   confirmação de senha: frontend;
-   role: **não atribuível livremente pelo usuário**.

### Regras

-   trim de strings;
-   e-mail normalizado;
-   validação de formato;
-   senha com política mínima definida pelo produto;
-   senha e confirmação devem coincidir no frontend;
-   backend ignora/rejeita tentativa de cadastro público com `ADMIN`;
-   duplicidade de e-mail retorna `409`;
-   hash realizado antes da persistência.

### Criação de ADMIN

Baseline recomendada: cadastro público cria somente `USER`. ADMIN
inicial deve ser criado por processo controlado (seed administrativo
seguro, migração/CLI protegida ou operação administrativa autorizada).
ADMIN existente pode criar/promover usuários somente se esse requisito
for aprovado e protegido.

------------------------------------------------------------------------

## 15. Dashboard

O dashboard deve preservar os cards e estrutura visual já existentes
após auditoria.

Indicadores mínimos esperados, sujeitos à confirmação do dashboard
atual:

-   total/valor de entradas;
-   total/valor de saídas;
-   lucro ou margem conforme regra de cálculo definida;
-   indicadores de estoque relevantes.

**Questão em aberto crítica:** definir fórmula e período do indicador
"Lucro". O sistema não deve apresentar um valor denominado lucro sem
regra financeira inequívoca.

Dados devem vir da API/banco, nunca de valores fixos no HTML.

------------------------------------------------------------------------

## 16. Produtos

Campos esperados:

-   identificador;
-   nome;
-   SKU;
-   categoria;
-   marca;
-   tamanho;
-   cor;
-   preço de custo;
-   preço de venda;
-   quantidade em estoque;
-   timestamps quando aplicável.

Requisitos:

-   SKU único quando essa regra for confirmada;
-   preços não negativos;
-   estoque não deve ser editado arbitrariamente se a política de
    rastreabilidade exigir movimentação;
-   categoria/marca devem respeitar integridade referencial;
-   listagem com filtro e paginação;
-   estados loading, success, empty e error;
-   exclusão física deve ser avaliada contra histórico; preferir
    desativação quando necessário preservar referências.

------------------------------------------------------------------------

## 17. Categorias

Requisitos:

-   CRUD persistido;
-   nome validado;
-   filtro seguindo visual de Produtos;
-   paginação de 10 registros;
-   tratamento de categoria vinculada a produtos;
-   não excluir de forma a quebrar integridade referencial;
-   feedback claro ao usuário.

------------------------------------------------------------------------

## 18. Marcas

Requisitos:

-   CRUD persistido;
-   filtro seguindo Produtos;
-   paginação de 10 registros;
-   validação de duplicidade conforme regra definida;
-   proteção de relacionamentos com produtos;
-   estados de UI padronizados.

------------------------------------------------------------------------

## 19. Fornecedores

Campos exatos devem ser confirmados no schema existente.

Requisitos mínimos:

-   CRUD persistido;
-   filtro seguindo Produtos;
-   paginação;
-   vínculo com entradas quando aplicável;
-   proteção de histórico;
-   não excluir fornecedor referenciado por movimentação se isso
    destruir rastreabilidade.

------------------------------------------------------------------------

## 20. Entradas de Estoque

Uma entrada deve:

1.  validar usuário e permissão;
2.  validar itens;
3.  validar produtos;
4.  iniciar transação;
5.  registrar `movement` de tipo `INFLOW`;
6.  registrar `movement_items`;
7.  incrementar estoque;
8.  utilizar custo unitário apropriado;
9.  associar fornecedor quando aplicável;
10. concluir transação;
11. retornar representação segura da operação.

Se qualquer etapa crítica falhar, deve ocorrer rollback.

O custo usado na entrada e a política de atualização de `cost_price`
precisam ser confirmados no código/regra do produto.

------------------------------------------------------------------------

## 21. Saídas de Estoque

Uma saída deve:

1.  autenticar e autorizar;
2.  validar itens;
3.  bloquear/obter estado consistente do produto;
4.  verificar estoque disponível;
5.  impedir quantidade superior ao estoque;
6.  registrar `OUTFLOW`;
7.  registrar itens;
8.  diminuir estoque;
9.  utilizar preço de venda apropriado;
10. concluir a transação.

Falha em qualquer item deve causar rollback.

Saídas históricas não devem mudar retroativamente porque o preço atual
do produto foi alterado. O item da movimentação deve preservar o valor
aplicado na operação.

------------------------------------------------------------------------

## 22. Regras de Negócio do Estoque

### RN-01

`quantity_in_stock` não pode ficar negativo.

### RN-02

Entrada incrementa estoque somente após validações e dentro de
transação.

### RN-03

Saída decrementa estoque somente se houver quantidade suficiente.

### RN-04

`movement` e `movement_items` devem ser atomicamente consistentes.

### RN-05

Valores unitários usados na movimentação devem ser registrados no
histórico.

### RN-06

Duas operações simultâneas sobre o mesmo estoque não podem causar lost
update.

### RN-07

A implementação deve utilizar estratégia de concorrência compatível com
PostgreSQL, por exemplo transação com bloqueio de linha
(`SELECT ... FOR UPDATE`) ou atualização atômica condicionada, conforme
arquitetura existente.

### RN-08

Double submit não pode gerar movimentação duplicada. A implementação
deve prevenir reenvio na UI e considerar idempotência/identificador de
operação quando necessário.

### RN-09

Movimentações consolidadas não devem ser excluídas como CRUD trivial.
Correções devem preservar trilha histórica, preferencialmente por
estorno/ajuste documentado se o produto exigir edição posterior.

### RN-10

Quantidade de movimentação deve ser maior que zero.

------------------------------------------------------------------------

## 23. Paginação

Aplicar 10 registros por página em:

-   Produtos;
-   Categorias;
-   Marcas;
-   Fornecedores;
-   Entradas;
-   Saídas;
-   outras listagens relevantes identificadas.

Padrão visual: exatamente o já utilizado em Entradas/Saídas após
auditoria.

Comportamento:

``` text
Anterior | 1 | 2 | ... | Posterior
```

-   primeira página: Anterior desabilitado;
-   última página: Posterior desabilitado;
-   página atual destacada;
-   filtro deve sobreviver à troca de página;
-   mudança de filtro volta para página 1;
-   resultado vazio deve ser tratado;
-   uma única página não deve produzir navegação incoerente.

### Decisão

Para dados persistidos, a baseline é **paginação server-side**,
combinada com filtros server-side, por escalabilidade e consistência.

Contrato sugerido:

``` text
GET /api/products?page=1&limit=10&search=camisa
```

Resposta padronizada sugerida:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

A nomenclatura final deve respeitar contratos existentes encontrados na
auditoria.

------------------------------------------------------------------------

## 24. Filtros e Busca

Adicionar/validar filtros em Categorias, Marcas e Fornecedores seguindo
o padrão visual de Produtos.

Campos pesquisáveis propostos:

  -----------------------------------------------------------------------
  Módulo                              Campos
  ----------------------------------- -----------------------------------
  Produtos                            nome, SKU, tamanho, cor, categoria,
                                      marca

  Categorias                          nome

  Marcas                              nome

  Fornecedores                        nome e demais identificadores
                                      textuais confirmados no schema

  Entradas                            identificador, produto/fornecedor e
                                      período quando suportado

  Saídas                              identificador, produto/motivo e
                                      período quando suportado
  -----------------------------------------------------------------------

A busca deve ser parametrizada e não concatenar entrada do usuário em
SQL.

------------------------------------------------------------------------

## 25. Footer

Texto obrigatório e exato:

**© 2026 ClothStock -- Gestão de Estoque. Todos os direitos
reservados.**

Deve:

-   seguir o Design System;
-   funcionar em claro/escuro;
-   ser responsivo;
-   não sobrepor conteúdo;
-   aparecer nas páginas aplicáveis;
-   ser reutilizado de forma compatível com a arquitetura atual.

A Fase 0 deve identificar o padrão existente de componentes
compartilhados antes de definir como evitar duplicação.

------------------------------------------------------------------------

## 26. Design System

**Prioridade crítica.**

Os HTML/CSS existentes são a fonte de verdade. Não criar outro Design
System.

Preservar:

-   sidebar;
-   cards;
-   tabelas;
-   botões;
-   modais;
-   formulários;
-   paginação;
-   filtros;
-   cabeçalhos;
-   dark mode;
-   espaçamento;
-   tipografia;
-   ícones;
-   organização visual.

Novas páginas de login/cadastro devem parecer nativas da aplicação.

------------------------------------------------------------------------

## 27. Responsividade

Critérios verificáveis:

-   desktop/notebook: layout sem sobreposição e tabelas utilizáveis;
-   tablet: sidebar e conteúdo não podem bloquear um ao outro;
-   smartphone: navegação acessível, formulários em largura útil e sem
    scroll horizontal desnecessário;
-   tabelas: usar comportamento responsivo já adotado ou container
    horizontal quando necessário;
-   cards: reorganizar conforme espaço disponível sem corte de conteúdo;
-   filtros: não ultrapassar viewport;
-   paginação: permanecer acionável em telas estreitas;
-   modais: caber na viewport e permitir rolagem interna quando
    necessário;
-   login/cadastro: formulário completamente acessível sem zoom
    obrigatório;
-   footer: não cobrir conteúdo.

Os breakpoints devem ser os existentes no projeto quando houver.

------------------------------------------------------------------------

## 28. Acessibilidade

Requisitos mínimos:

-   HTML semântico;
-   `label` associado a controles;
-   navegação por teclado;
-   foco visível;
-   contraste compatível com claro e escuro;
-   `aria-*` quando semântica nativa não for suficiente;
-   erros vinculados ao campo correspondente;
-   botões com nome acessível;
-   modais com foco e fechamento por teclado conforme componente
    existente;
-   ícones decorativos não devem ser a única fonte de significado.

------------------------------------------------------------------------

## 29. API REST

Os endpoints abaixo são **contratos propostos**, não confirmação do
estado atual. A Fase 0 deve reconciliá-los com as rotas existentes.

  Método              Rota proposta               Finalidade          Auth                 Role
  ------------------- --------------------------- ------------------- -------------------- ---------------
  POST                `/api/auth/register`        Cadastro            Pública/controlada   ---
  POST                `/api/auth/login`           Login               Pública              ---
  POST                `/api/auth/logout`          Logout              Sim                  ADMIN/USER
  GET                 `/api/auth/me`              Usuário atual       Sim                  ADMIN/USER
  GET                 `/api/products`             Listar/filtrar      Sim                  ADMIN/USER
  POST                `/api/products`             Criar               Sim                  ADMIN
  GET                 `/api/products/:id`         Detalhar            Sim                  ADMIN/USER
  PATCH               `/api/products/:id`         Atualizar           Sim                  ADMIN
  DELETE              `/api/products/:id`         Excluir/desativar   Sim                  ADMIN
  GET                 `/api/categories`           Listar              Sim                  ADMIN/USER
  POST/PATCH/DELETE   `/api/categories/...`       Gerenciar           Sim                  ADMIN
  GET                 `/api/brands`               Listar              Sim                  ADMIN/USER
  POST/PATCH/DELETE   `/api/brands/...`           Gerenciar           Sim                  ADMIN
  GET                 `/api/suppliers`            Listar              Sim                  Conforme RBAC
  POST/PATCH/DELETE   `/api/suppliers/...`        Gerenciar           Sim                  ADMIN
  GET                 `/api/movements`            Histórico           Sim                  Conforme RBAC
  POST                `/api/movements/inflows`    Entrada             Sim                  Autorizado
  POST                `/api/movements/outflows`   Saída               Sim                  Autorizado
  GET                 `/api/dashboard`            Métricas            Sim                  Conforme RBAC
  GET                 `/api/users`                Listar usuários     Sim                  ADMIN
  PATCH               `/api/users/:id`            Gerenciar usuário   Sim                  ADMIN

### Formato de sucesso

``` json
{
  "data": {}
}
```

### Formato de erro

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Não foi possível concluir a operação.",
    "details": []
  }
}
```

### HTTP

-   `200` leitura/atualização;
-   `201` criação;
-   `204` operação sem corpo;
-   `400` requisição inválida;
-   `401` não autenticado;
-   `403` sem permissão;
-   `404` recurso inexistente;
-   `409` conflito;
-   `422` validação semântica quando adotada consistentemente;
-   `500` erro interno sem exposição de detalhes sensíveis.

------------------------------------------------------------------------

## 30. Banco de Dados

### Modelo lógico esperado

``` text
users
  1
  |
  | registra/é associado quando aplicável
  v
movements 1 ---- N movement_items N ---- 1 products
   |
   N
   |
   0..1 suppliers

categories 1 ---- N products
brands     1 ---- N products
```

### Tabelas esperadas

A existência e os campos reais devem ser auditados.

#### `users`

Campos mínimos conceituais: - id PK; - name; - email UNIQUE NOT NULL; -
password_hash NOT NULL; - role NOT NULL CHECK em valores permitidos; -
created_at; - updated_at.

#### `categories`

-   id PK;
-   name;
-   timestamps conforme padrão existente.

#### `brands`

-   id PK;
-   name;
-   timestamps.

#### `products`

-   id PK;
-   name;
-   sku;
-   category_id FK;
-   brand_id FK;
-   size;
-   color;
-   cost_price;
-   selling_price;
-   quantity_in_stock;
-   timestamps.

Constraints recomendadas: - preços \>= 0; - estoque \>= 0; - SKU UNIQUE
se confirmado como identificador único.

#### `suppliers`

Campos dependem do schema atual. Deve existir PK e atributos de
identificação necessários ao negócio.

#### `movements`

-   id PK;
-   type CHECK (`INFLOW`, `OUTFLOW`);
-   supplier_id nullable conforme tipo/regra;
-   reason quando aplicável;
-   user_id quando auditoria por usuário for adotada;
-   created_at.

#### `movement_items`

-   id PK;
-   movement_id FK NOT NULL;
-   product_id FK NOT NULL;
-   quantity CHECK \> 0;
-   unit_price/cost aplicado;
-   demais campos necessários para preservar histórico.

### Índices

Criar apenas após analisar consultas. Candidatos: - `products.sku`; -
FKs; - campos usados em busca; - `movements.created_at`; -
`movements.type`.

------------------------------------------------------------------------

## 31. Segurança

P0:

-   hash de senha;
-   JWT seguro;
-   RBAC;
-   endpoints protegidos;
-   validação de input;
-   queries parametrizadas;
-   prevenção de SQL Injection;
-   prevenção de XSS;
-   CORS restritivo;
-   secrets em ambiente;
-   `.env` fora do Git;
-   erros sem stack trace para cliente em produção;
-   menor privilégio;
-   prevenção de privilege escalation;
-   expiração de autenticação;
-   proteção de dados privados.

### XSS

Conteúdo vindo de usuário/API deve ser inserido no DOM com APIs seguras;
evitar `innerHTML` para conteúdo não confiável.

### SQL Injection

Nunca concatenar entrada do cliente em SQL. Usar placeholders/queries
parametrizadas.

### Secrets

Nunca incluir em Git: - `DATABASE_URL`; - `JWT_SECRET`; - senhas; -
tokens; - chaves privadas.

------------------------------------------------------------------------

## 32. Tratamento de Erros

A API deve possuir formato padronizado.

O frontend deve distinguir:

-   validação;
-   autenticação;
-   autorização;
-   conflito;
-   recurso não encontrado;
-   rede/API indisponível;
-   erro interno;
-   sessão expirada.

Estados obrigatórios:

**LOADING → SUCCESS / EMPTY / ERROR**

Em sessão expirada, limpar estado de autenticação aplicável, informar o
usuário de maneira adequada e redirecionar para login.

Logging interno deve registrar contexto técnico suficiente sem registrar
senha, token ou outros secrets.

------------------------------------------------------------------------

## 33. Performance

-   evitar requisições redundantes;
-   paginação server-side;
-   busca eficiente;
-   índices baseados em consultas reais;
-   evitar `SELECT *` quando desnecessário;
-   carregar JS adequadamente;
-   evitar renderização duplicada;
-   debounce de busca pode ser usado quando coerente com UX;
-   pool/conexão PostgreSQL deve considerar execução serverless;
-   dashboard deve evitar múltiplas consultas redundantes quando
    agregações puderem ser consolidadas com segurança.

------------------------------------------------------------------------

## 34. SEO

SEO é secundário em área autenticada.

Páginas públicas, se existirem: - `title`; - `meta description`; - HTML
semântico; - metadata coerente.

Páginas privadas: - não devem ser indexadas como estratégia de
aquisição; - proteção real deve ocorrer por autenticação/autorização,
não por `robots.txt`.

------------------------------------------------------------------------

## 35. Deploy na Vercel

A implementação deve validar compatibilidade com o modelo de execução da
Vercel.

Requisitos:

-   frontend servido corretamente;
-   endpoints adaptados à estrutura de deploy escolhida;
-   secrets configurados no ambiente da plataforma;
-   conexão PostgreSQL com SSL quando exigido pelo provedor;
-   estratégia de pool/conexões adequada a serverless;
-   CORS coerente com domínio do frontend/API;
-   tratamento de rotas;
-   diferenças de ambiente documentadas;
-   logs sem secrets.

A topologia final depende da estrutura real do projeto e do provedor
PostgreSQL.

------------------------------------------------------------------------

## 36. Variáveis de Ambiente

Exemplo conceitual, sem valores reais:

``` text
NODE_ENV=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
CORS_ORIGIN=
```

Outras variáveis somente se justificadas.

`.env` deve estar no `.gitignore`. Pode existir `.env.example` sem
valores secretos para documentar as chaves necessárias.

------------------------------------------------------------------------

## 37. Estratégia de Testes

### Autenticação

-   cadastro válido;
-   duplicidade;
-   login válido/inválido;
-   token ausente;
-   token expirado;
-   token adulterado;
-   logout.

### Autorização

-   ADMIN permitido;
-   USER permitido;
-   USER bloqueado em endpoint ADMIN;
-   manipulação de role rejeitada.

### CRUD

-   criação;
-   leitura;
-   edição;
-   exclusão/desativação;
-   validações;
-   integridade referencial.

### Estoque

-   entrada incrementa;
-   saída decrementa;
-   saída \> estoque falha;
-   rollback mantém consistência;
-   concorrência não gera estoque negativo;
-   histórico preserva valor da movimentação.

### Filtros/Paginação

-   10 por página;
-   filtros persistem;
-   filtro volta à página 1;
-   página inválida;
-   resultado vazio.

### Frontend/API

-   loading;
-   success;
-   empty;
-   error;
-   401;
-   403;
-   falha de rede.

### Regressão

Tudo classificado como EXISTENTE E MANTER deve possuir teste
manual/automatizado suficiente para detectar regressão após alterações.

------------------------------------------------------------------------

## 38. Critérios de Aceitação

### AC-01 Login válido

**Given** usuário ativo com credenciais válidas,\
**When** envia login,\
**Then** a API valida a senha, estabelece autenticação segura e o
frontend direciona para o dashboard permitido à role.

### AC-02 Login inválido

**Given** credenciais inválidas,\
**When** ocorre tentativa de login,\
**Then** a API rejeita sem revelar se o e-mail existe.

### AC-03 Proteção de rota

**Given** usuário não autenticado,\
**When** acessa recurso protegido,\
**Then** o acesso é bloqueado e a aplicação conduz ao login conforme
fluxo definido.

### AC-04 RBAC

**Given** USER autenticado sem permissão administrativa,\
**When** chama endpoint de administração,\
**Then** a API retorna `403` e não altera dados.

### AC-05 Escalada de privilégio

**Given** cadastro público,\
**When** o cliente envia `role=ADMIN`,\
**Then** o backend não cria conta administrativa por essa entrada.

### AC-06 Entrada

**Given** produto existente,\
**When** uma entrada válida de quantidade Q é concluída,\
**Then** estoque aumenta em Q e movimento + itens são persistidos
atomicamente.

### AC-07 Saída

**Given** estoque S,\
**When** saída válida Q ≤ S é concluída,\
**Then** estoque passa a S-Q e histórico é persistido.

### AC-08 Estoque insuficiente

**Given** estoque S,\
**When** saída Q \> S é solicitada,\
**Then** a operação falha e nenhum registro parcial é persistido.

### AC-09 Rollback

**Given** falha durante movimentação,\
**When** a transação não consegue concluir,\
**Then** estoque, movement e movement_items permanecem no estado
anterior.

### AC-10 Paginação

**Given** mais de 10 registros,\
**When** a listagem é aberta,\
**Then** no máximo 10 itens são retornados/exibidos por página e os
controles refletem corretamente os limites.

### AC-11 Filtro + paginação

**Given** página maior que 1,\
**When** o termo de busca muda,\
**Then** a consulta retorna à página 1 mantendo o novo filtro.

### AC-12 Dark mode

**Given** modo escuro ativo,\
**When** qualquer página/modal aplicável é exibido,\
**Then** textos, inputs, tabelas, totais, filtros e footer permanecem
legíveis segundo o Design System existente.

------------------------------------------------------------------------

## 39. Edge Cases

  -----------------------------------------------------------------------
  Caso                                Comportamento esperado
  ----------------------------------- -----------------------------------
  Login inválido                      Rejeitar sem enumeração de usuário.

  Token expirado                      `401`, encerrar sessão cliente e
                                      redirecionar.

  Token adulterado                    Rejeitar.

  Sem permissão                       `403`, sem alteração.

  `role=ADMIN` manual                 Ignorar/rejeitar conforme contrato.

  Registro duplicado                  `409`.

  Produto inexistente                 `404`; movimentação não criada.

  Categoria/marca em uso              Impedir exclusão destrutiva ou
                                      aplicar política segura.

  Fornecedor em uso                   Preservar histórico.

  Saída \> estoque                    Rejeitar e rollback.

  Duas saídas simultâneas             Serializar/proteger atualização;
                                      nunca estoque negativo.

  Falha na transação                  Rollback total.

  API indisponível                    Estado de erro e opção de nova
                                      tentativa quando apropriado.

  Banco indisponível                  Erro controlado; sem falsa
                                      confirmação.

  Filtro sem resultados               Empty state.

  Página inexistente                  Normalizar/rejeitar de forma
                                      consistente.

  Valor negativo                      `400/422`.

  Quantidade zero                     Rejeitar movimentação.

  Double submit                       Desabilitar ação durante envio e
                                      prevenir duplicidade.

  Refresh durante envio               Backend deve manter atomicidade; UI
                                      deve reconciliar estado ao
                                      recarregar.

  URL privada direta                  Validar autenticação antes de
                                      permitir operação/dados.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 40. Plano de Implementação

### FASE 0 --- Auditoria do projeto existente

**Objetivo:** transformar suposições em inventário real.\
**Módulos:** todo o repositório.\
**Dependências:** nenhuma.\
**Implementação:** nenhuma alteração funcional; mapear arquivos,
endpoints, schema, Design System e funcionalidades.\
**Risco:** modificar algo já funcional por diagnóstico incorreto.\
**Conclusão:** matriz completa EXISTENTE/MANTER/AJUSTAR/NOVO/N/A.

### FASE 1 --- Banco e infraestrutura

**Objetivo:** garantir schema, constraints, conexão e ambiente.\
**Dependência:** Fase 0.\
**Risco:** incompatibilidade com dados existentes.\
**Conclusão:** banco íntegro, configuração por ambiente e secrets
externos ao Git.

### FASE 2 --- Autenticação

Cadastro, login, logout, hash, identidade autenticada e expiração.

### FASE 3 --- Autorização/RBAC

Middleware/políticas, matriz de permissões e negação por padrão.

### FASE 4 --- Integração API/Frontend

Centralizar comportamento de requests conforme arquitetura existente e
padronizar loading/success/empty/error.

### FASE 5 --- CRUDs

Produtos, Categorias, Marcas, Fornecedores e Usuários conforme
permissões.

### FASE 6 --- Movimentações e estoque

Transações, concorrência, entrada, saída, histórico e prevenção de
estoque negativo.

### FASE 7 --- Dashboard

Conectar métricas reais e validar definição de lucro.

### FASE 8 --- Filtros e paginação

Server-side quando aplicável, 10 registros, filtros preservados e padrão
visual existente.

### FASE 9 --- Footer e consistência visual

Adicionar footer e corrigir divergências sem redesign.

### FASE 10 --- Responsividade e acessibilidade

Validar breakpoints existentes, teclado, foco, labels, modais e
contraste.

### FASE 11 --- Hardening de segurança

XSS, SQLi, CORS, cookies/token, CSRF quando aplicável, logs e secrets.

### FASE 12 --- Testes

Automatizados e manuais, incluindo regressão.

### FASE 13 --- Deploy Vercel

Configuração de produção, PostgreSQL, variáveis, CORS e smoke tests.

### FASE 14 --- Validação final

Executar Definition of Done e critérios de aceitação.

Cada fase deve gerar evidência de conclusão antes da seguinte quando
houver dependência crítica.

------------------------------------------------------------------------

## 41. Priorização

### P0 --- Crítico

-   persistência real;
-   banco íntegro;
-   autenticação;
-   autorização/RBAC;
-   senha com hash;
-   secrets protegidos;
-   movimentações transacionais;
-   prevenção de estoque negativo;
-   queries parametrizadas;
-   proteção de endpoints.

### P1 --- Obrigatório

-   CRUDs necessários;
-   dashboard com dados reais;
-   paginação;
-   filtros;
-   estados de UI;
-   footer;
-   deploy;
-   testes essenciais;
-   responsividade funcional.

### P2 --- Importante

-   acessibilidade ampliada;
-   otimizações de performance;
-   refinamento de logging;
-   melhorias adicionais de UX consistentes com o Design System.

### P3 --- Futuro

Somente melhorias aprovadas posteriormente que não sejam necessárias à
entrega atual.

------------------------------------------------------------------------

## 42. Definition of Done

Uma funcionalidade é concluída somente quando:

-   requisito implementado;
-   persistência real quando aplicável;
-   autorização backend validada;
-   validações frontend/backend implementadas;
-   tratamento de erro implementado;
-   estados loading/success/empty/error tratados;
-   Design System preservado;
-   claro/escuro testados;
-   responsividade testada;
-   critérios de aceitação aprovados;
-   sem secrets no repositório;
-   sem regressão conhecida;
-   documentação/contratos atualizados;
-   testes críticos aprovados.

O produto somente está pronto para entrega quando todos os P0 e P1
aplicáveis satisfizerem essa definição.

------------------------------------------------------------------------

## 43. Riscos Técnicos

1.  **Estado real desconhecido do repositório** --- mitigação: Fase 0
    obrigatória.
2.  **JWT armazenado de forma insegura** --- revisar estratégia atual
    antes de migrar.
3.  **Concorrência de estoque** --- usar transação/bloqueio ou operação
    atômica.
4.  **Exclusões quebrando histórico** --- definir política de
    desativação/estorno.
5.  **Conexões PostgreSQL em serverless** --- validar pool/provedor.
6.  **Divergência entre frontend e backend** --- contratos de API
    consistentes.
7.  **Duplicação de componentes HTML/JS** --- reutilizar padrão
    existente sem introduzir framework.
8.  **CORS/cookies mal configurados** --- validar topologia de produção.
9.  **Métrica de lucro ambígua** --- definir regra antes de exibir.
10. **Alteração visual acidental** --- Design System atual é gate de
    revisão.

------------------------------------------------------------------------

## 44. Decisões Arquiteturais

### DA-01 --- Frontend Vanilla

**Decisão:** manter HTML/CSS/JS.\
**Motivo:** requisito explícito e compatibilidade com projeto.

### DA-02 --- PostgreSQL como fonte de verdade

**Decisão:** dados de negócio persistidos no banco.\
**Motivo:** multiusuário, integridade e persistência.

### DA-03 --- Autorização no backend

**Decisão:** RBAC obrigatório na API.\
**Motivo:** UI não é barreira de segurança.

### DA-04 --- Movimentação transacional

**Decisão:** movement, items e estoque na mesma transação lógica.\
**Motivo:** atomicidade.

### DA-05 --- Paginação server-side

**Decisão:** baseline para listagens persistidas.\
**Motivo:** escalabilidade e filtros.

### DA-06 --- Design System existente

**Decisão:** nenhuma substituição.\
**Motivo:** fonte de verdade visual definida pelo produto.

### DA-07 --- JWT

**Decisão:** preferir cookie HttpOnly/Secure/SameSite, sujeito à
validação da topologia real.\
**Motivo:** reduzir exposição do token ao JavaScript.\
**Consequência:** avaliar CSRF e CORS cuidadosamente.

------------------------------------------------------------------------

## 45. Pendências e Questões em Aberto

### Críticas antes da implementação

1.  Disponibilizar e auditar o repositório completo do ClothStock.
2.  Confirmar árvore real de diretórios.
3.  Confirmar schema PostgreSQL atual.
4.  Confirmar endpoints/controllers existentes.
5.  Confirmar mecanismo de autenticação atual, se houver.
6.  Confirmar permissões exatas de USER para entradas e saídas.
7.  Definir estratégia administrativa para criação/promoção de ADMIN.
8.  Definir fórmula, período e significado de "Lucro" no dashboard.
9.  Confirmar política de custo em entradas e atualização de
    `cost_price`.
10. Confirmar política para correção/estorno de movimentações.
11. Confirmar se exclusão de produtos/categorias/marcas/fornecedores é
    física ou lógica.
12. Confirmar domínio(s) e topologia frontend/API em produção.
13. Confirmar provedor PostgreSQL e requisitos de SSL/pooling.
14. Confirmar campos reais de fornecedor.
15. Confirmar política de senha.
16. Confirmar se SKU é obrigatório e único.
17. Confirmar se auditoria por usuário (`user_id` em movimentações) já
    existe ou deve ser adicionada.

### Assunções não bloqueantes

-   PostgreSQL continuará sendo o banco principal.
-   O Design System existente será preservado.
-   A API será o único caminho normal para alterações persistentes
    feitas pelo frontend.
-   Listagens persistidas utilizarão limite padrão de 10 registros.
-   Valores monetários deverão usar tipo numérico apropriado no banco,
    nunca ponto flutuante impreciso para regras financeiras.

------------------------------------------------------------------------

# Anexo A --- Checklist de Auditoria da Fase 0

-   [ ] Gerar árvore de diretórios.
-   [ ] Mapear cada HTML.
-   [ ] Mapear CSS e tokens/variáveis visuais.
-   [ ] Mapear JS por página.
-   [ ] Identificar sidebar e forma de reutilização.
-   [ ] Identificar dark mode.
-   [ ] Identificar componentes de feedback.
-   [ ] Identificar filtros existentes.
-   [ ] Identificar paginações existentes.
-   [ ] Mapear `package.json`.
-   [ ] Mapear `app.js`/`server.js`.
-   [ ] Mapear rotas/controllers/middleware.
-   [ ] Mapear conexão PostgreSQL.
-   [ ] Ler schema/migrations.
-   [ ] Mapear endpoints e contratos atuais.
-   [ ] Mapear autenticação/autorização.
-   [ ] Verificar armazenamento atual de token.
-   [ ] Mapear variáveis de ambiente por nome, sem registrar valores.
-   [ ] Verificar `.gitignore`.
-   [ ] Mapear deploy atual.
-   [ ] Classificar cada requisito deste PRD.

------------------------------------------------------------------------

# Anexo B --- Gate de Qualidade

Antes de considerar o PRD reconciliado com o código, confirmar:

-   [ ] Design System preservado.
-   [ ] Frontend permanece HTML/CSS/JS.
-   [ ] Backend permanece Full-Stack.
-   [ ] Persistência é real.
-   [ ] Autenticação está definida.
-   [ ] RBAC está definido.
-   [ ] Paginação usa 10 registros.
-   [ ] Filtros seguem o padrão visual de Produtos.
-   [ ] Footer contém exatamente o texto requerido.
-   [ ] Movimentações preservam integridade.
-   [ ] API e banco estão documentados conforme implementação real.
-   [ ] Deploy Vercel foi validado.
-   [ ] Responsividade e acessibilidade possuem critérios testáveis.
-   [ ] Testes e edge cases estão cobertos.
-   [ ] Itens existentes e novos foram diferenciados.
-   [ ] Nenhuma ambiguidade crítica foi transformada em fato sem
    evidência.

------------------------------------------------------------------------

**Fim do PRD --- ClothStock**
