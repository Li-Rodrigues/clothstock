# Controle de permissões — ClothStock

Este documento existe para responder a uma pergunta simples: **a restrição
de acesso do OPERATOR está no servidor ou só na interface?**

A resposta é: **no servidor**. A interface esconde os botões que o
OPERATOR não pode usar, mas isso é apenas conveniência. Toda requisição é
conferida de novo no backend, e um chamador que desabilite o JavaScript,
edite o DOM ou use `curl` recebe `403` exatamente igual.

---

## 1. Resumo

| Camada | Arquivo | Papel |
|---|---|---|
| Matriz de permissões | `src/config/permissions.js` | Fonte única de verdade. Declara ações, roles e a tabela de rotas. |
| Gate da API | `src/app.js` (`apiAuthorizationGate`) | Nega por padrão. Registrado **antes de qualquer rota**. |
| Middleware de rota | `src/middlewares/authMiddleware.js` (`requireRole`) | Segunda barreira, já existente. |
| Controller | `src/controllers/*.js` (`forbidUnless`) | Terceira barreira, dentro da própria função de escrita. |
| Interface | `public/js/rbac.js` + `public/css/rbac.css` | Espelha a matriz para esconder controles. **Não é segurança.** |

A regra de ouro: **ocultar um botão não é autorização**. A API precisa
repetir a validação, e ela repete em três camadas independentes.

---

## 2. A matriz

`src/config/permissions.js` é a única fonte de verdade. Toda rota precisa
casar com uma regra e ter a ação daquela regra concedida à sua role.

| Recurso / ação | ADMIN | OPERATOR | VIEWER |
|---|---|---|---|
| `dashboard.read` | Sim | Sim | Sim |
| `products.read` | Sim | Sim | Sim |
| `categories.read` | Sim | Sim | Sim |
| `brands.read` | Sim | Sim | Sim |
| `suppliers.read` | Sim | Sim | Sim |
| `movements.read` | Sim | Sim | Sim |
| `movements.create` | Sim | Sim | **Não** |
| `products.create` | Sim | **Não** | **Não** |
| `products.update` | Sim | **Não** | **Não** |
| `products.delete` | Sim | **Não** | **Não** |
| `categories.create` / `.update` / `.delete` | Sim | **Não** | **Não** |
| `brands.create` / `.update` / `.delete` | Sim | **Não** | **Não** |
| `suppliers.create` / `.update` / `.delete` | Sim | **Não** | **Não** |

Resumo dos três perfis:

- **ADMIN** — acesso completo. Cria, edita, exclui e movimenta estoque.
- **OPERATOR** — lê o catálogo e o dashboard, consulta e registra
  movimentações. Não mexe em cadastros.
- **VIEWER** — **somente leitura**. Navega por todas as páginas e consulta
  tudo, mas não possui nenhuma ação de escrita: não cria, não edita, não
  exclui, não registra entrada, não registra saída e não altera estoque.
  É o perfil da conta de demonstração dos avaliadores.

A lista do VIEWER em `ROLE_ACTIONS` não contém nenhuma ação que não
termine em `.read`, e `npm run verify:matrix` reprova se alguém
acrescentar uma. Essa é a regra que impede o perfil de perder a
propriedade de somente leitura por descuido em uma alteração futura.

`/api/auth` fica fora da matriz de propósito: `login` e `register` têm
regras próprias (ver seção 5), e `logout`, `me` e `permissions` exigem
apenas autenticação.

O servidor expõe a decisão para o próprio usuário em
`GET /api/auth/permissions`, derivado da mesma matriz. Isso serve para
depuração e para a interface — mas não decide nada, já que a interface
não é a autoridade.

---

## 3. Por que "negar por padrão" e não apenas "permitir por padrão"

O gate (`apiAuthorizationGate`) é registrado em `src/app.js` **antes de
qualquer rota**, e não junto da seção de rotas da API.

A ordem importa. O Express resolve middlewares na sequência em que foram
registrados. Se o gate estivesse montado mais abaixo, apenas as rotas
declaradas depois dele passariam por ele, e uma rota nova acrescentada
acima do gate ficaria **sem nenhuma verificação de permissão**. Foi
exatamente o que aconteceu durante o desenvolvimento deste trabalho: uma
rota de teste montada antes do gate respondia `200` para qualquer usuário
autenticado. Mover o gate para o topo eliminou a classe inteira do
problema.

Consequência: não existe posição no arquivo onde uma rota de `/api` possa
ser registrada sem ser barrada pela matriz. Uma rota nova sem entrada na
matriz simplesmente responde `404`.

Para manter essa propriedade auditável, `npm run verify:matrix` compara a
matriz com as rotas realmente montadas e falha se houver rota sem regra
ou regra sem rota.

---

## 4. A role vem do banco, não do token

`authenticate` (`src/middlewares/authMiddleware.js`) decodifica o JWT para
sair com o `id` do usuário e **recarrega a linha da tabela `users` a cada
requisição**. A decisão de autorização usa `req.user.role`, que veio do
banco. A claim `role` presente no JWT é ignorada.

Isso tem duas consequências verificáveis:

- **Rebaixar um usuário tem efeito imediato.** Não é preciso esperar o
  token de 8 horas expirar.
- **Um token forjado não concede nada.** Um token assinado com o
  `JWT_SECRET` correto, carregando o `id` do OPERATOR mas com
  `role: "ADMIN"` na claim, continua sendo recusado com `403`. É a
  checagem `DELETE /api/brands/1 com token forjado` do script de
  verificação, e é a prova mais direta de que a restrição não está no
  cliente.

---

## 5. Usuário de teste

O projeto traz um usuário com acesso restrito, pronto para a verificação.

| Campo | Valor |
|---|---|
| E-mail | `operador@clothstock.com` |
| Senha | `Avaliador#2026` |
| Role | `OPERATOR` |
| Nome | `Operador de Teste (acesso restrito)` |

A senha atende à política oficial (`src/utils/passwordPolicy.js`): 12+
caracteres, maiúscula, minúscula, dígito e caractere especial.

Para criar ou redefinir a conta:

```bash
npm run test-user:create
```

O script é idempotente: pode rodar quantas vezes quiser e sempre deixa a
conta no estado documentado. Ele **força** `role = 'OPERATOR'` e
`is_active = TRUE`, de modo que o cenário seja reproduzível mesmo que
alguém tenha mexido na conta.

Para remover a conta depois da avaliação:

```bash
npm run test-user:remove
```

> O script se recusa a rodar em produção sem `--force`, porque uma senha
> conhecida em produção é uma porta de entrada, não um recurso. Se for
> mesmo necessário, use `--force` e remova a conta em seguida.

A senha pode ser trocada pela variável `TEST_USER_PASSWORD`, desde que
respeite a política de senhas.

### 5.2 Conta de demonstração dos avaliadores (VIEWER)

| Campo | Valor |
|---|---|
| E-mail | `avaliador@clothstock.com` |
| Role | `VIEWER` |
| Nome | `Avaliador (somente leitura)` |
| Senha | **definida por você** — ver abaixo |

> **Não há senha padrão para esta conta, em lugar nenhum.** Nem no código,
> nem no Git, nem nesta documentação. A senha precisa ser escolhida por
> quem provisiona a conta.

Para provisionar, escolha **uma** das três formas:

```bash
# 1. Gerar uma senha aleatória forte (recomendado).
#    O script imprime a senha UMA vez no terminal e não grava em arquivo.
npm run viewer:create:generate

# 2. Definir por variável de ambiente.
VIEWER_ACCOUNT_PASSWORD='<senha forte>' npm run viewer:create

# 3. Executar em um terminal e digitar a senha em modo oculto.
npm run viewer:create
```

Todas as formas aplicam a mesma política de senha do resto do sistema
(12+ caracteres, maiúscula, minúscula, dígito e símbolo) e gravam apenas
o hash bcrypt. O script **não** altera as contas `ADMIN` nem `OPERATOR`:
ele toca somente o e-mail de demonstração.

Para remover a conta:

```bash
npm run viewer:remove
```

Antes de gravar, o script confere se o `CHECK` de `role` no banco aceita
`VIEWER`. Se a migração da seção 5.3 não tiver sido aplicada, ele avisa
em vez de falhar com um erro de banco incompreensível.

### 5.3 Migração do perfil VIEWER no banco

A tabela `users` foi criada com
`CHECK (role IN ('ADMIN', 'OPERATOR'))`. Como o `CREATE TABLE` usa
`IF NOT EXISTS`, **reexecutar `database/schema.sql` não altera a tabela
já existente** — o `CHECK` antigo continuaria lá e qualquer inserção de
`VIEWER` seria recusada pelo PostgreSQL com `SQLSTATE 23514`.

`database/schema.sql` já vem corrigido para instalações novas. Para um
banco que já existe, rode a migração:

```bash
psql "$DATABASE_URL" -f database/migrations/001-viewer-role.sql
```

A migração é **não destrutiva**: não cria nem altera tabela alguma, não
apaga nem recria linha alguma, e não toca em produto, fornecedor,
categoria, marca ou movimentação. Ela apenas amplia a definição do
`CHECK` para incluir `VIEWER`. É idempotente: rodar de novo não faz
nada.

### 5.4 Cadastro público: desligado em produção

`POST /api/auth/register` se comporta assim:

| Ambiente | Comportamento |
|---|---|
| **Desenvolvimento** (`NODE_ENV` diferente de `production` e sem `VERCEL`) | Cadastro **aberto**. Cria sempre um `OPERATOR`; pedir `role: ADMIN` ou `role: VIEWER` recebe `403`. |
| **Produção** (`NODE_ENV=production` ou presence de `VERCEL`) | Cadastro **fechado**. Qualquer chamada, com ou sem `role`, recebe `403 REGISTRATION_DISABLED`. |

A condição é avaliada a cada requisição, então a decisão acompanha o
ambiente em que a aplicação está rodando. `GET /api/auth/health` expõe
`registrationEnabled`, e a tela de login usa esse sinal para trocar o
link "Cadastre-se" por um aviso, evitando levar o usuário a uma página
que só pode falhar. Isso é UX: quem bloqueia é o backend.

Em produção, as contas passam a ser provisionadas por script
(`viewer:create`, `admin:create`) ou por um administrador do banco. Não
existe hoje uma tela de gestão de usuários (RF-21 continua pendente), e
nenhum sistema de gerenciamento foi criado para isso: a solução mínima
foi fechar a rota pública.

Se um ambiente específico precisar reabrir o cadastro em produção:

```bash
ALLOW_PUBLIC_REGISTRATION=true
```

---

## 6. Como verificar

### 6.1 Verificação automática (recomendado)

```bash
npm start                    # em um terminal
npm run test-user:create     # em outro terminal
npm run verify:permissions
```

O script fala HTTP direto com a API, sem passar pela interface. Sai com
código `1` se qualquer checagem falhar.

O que ele prova:

1. **Sem credencial** — `GET /api/products`, `GET /api/dashboard` e
   `DELETE /api/products/1` respondem `401`.
2. **OPERATOR lê o que a matriz permite** — as quatro listagens, o
   dashboard e as movimentações respondem `200`.
3. **OPERATOR é barrado em toda escrita de catálogo** — `POST`, `PUT`,
   `PATCH` e `DELETE` em produtos, categorias, marcas e fornecedores
   respondem todos `403`. São 16 requisições, nenhuma passando pelo HTML.
4. **As escritas negadas não tiveram efeito** — o script tira a
   **impressão digital de todas as tabelas de negócio** (contagem de
   linhas mais um hash do conteúdo de `brands`, `categories`, `products`,
   `suppliers`, `inflows`, `inflow_items`, `outflows` e `outflow_items`)
   antes e depois das tentativas, e exige que sejam idênticas. Isso prova
   que o `403` impediu a gravação, e não que a gravação ocorreu e o erro
   foi devolvido depois.
5. **Movimentações continuam permitidas** — `POST /api/movements/inflows`
   e `/outflows` não são barrados por permissão. O script envia um corpo
   vazio de propósito: um `400` ali prova que a operação foi *autorizada*
   e só recusada por validação, sem alterar o estoque real.
6. **Escalada de privilégio não funciona** — token forjado com
   `role=ADMIN` recebe `403`; token adulterado recebe `401`; cadastro
   público pedindo `ADMIN` recebe `403`; método fora da matriz recebe
   `403`.
7. **Negar por padrão** — rota inexistente e recurso do PRD ainda não
   implementado (`/api/relatorios`) respondem `404`.
8. **ADMIN consegue as mesmas escritas** — opcional, protege contra a
   hipótese de que os `403` sejam apenas endpoints quebrados. Exige as
   credenciais do ADMIN:

   ```bash
   TEST_ADMIN_EMAIL=admin@clothstock.com TEST_ADMIN_PASSWORD='...' npm run verify:permissions
   ```

   Sem essas variáveis, essa parte aparece como `SKIP` e não reprova a
   execução.

E, para o VIEWER (grupos 9 a 15), quando `VIEWER_ACCOUNT_PASSWORD` está
definida:

9. **Login confirma a role `VIEWER`.**
10. **Leituras respondem `200`** — as quatro listagens, o dashboard, as
    movimentações (incluindo os filtros `?type=INFLOW` e `?type=OUTFLOW`),
    `/api/auth/me` e as sete páginas do sistema.
11. **Escritas de catálogo respondem `403`** — `POST`, `PUT`, `PATCH` e
    `DELETE` em produtos, categorias, marcas e fornecedores. Aqui os
    corpos são **válidos e completos**, tirados do próprio banco. É o
    teste mais forte: se a ordem entre autorização e validação se
    invertesse, o `403` desapareceria e o registro entraria.
12. **Não registra entrada nem saída** — `POST /api/movements/inflows`,
    `/outflows` e `/api/movements` respondem `403` com uma movimentação
    estruturalmente correta. Um OPERATOR receberia `201` com o mesmo
    corpo.
13. **Nada foi gravado** — a impressão digital do banco é comparada antes
    e depois de todas as tentativas de escrita, incluindo
    `quantity_in_stock`.
14. **Escalada de privilégio não funciona** — token forjado com
    `role=ADMIN` continua sendo recusado em `POST /api/products`,
    `POST /api/movements/inflows` e `DELETE /api/brands/1`.
15. **`/api/auth/permissions` não concede nenhuma escrita** — as 6 ações
    do VIEWER são todas `*.read`.

Resultado esperado: `79/80 checagens passaram, 1 opcional ignorada`
(sem as credenciais do ADMIN) ou `80/80` com elas.

### 6.2 Verificação manual

Para conferir no navegador:

- **`operador@clothstock.com`** — os botões **Novo**, **Editar** e
  **Excluir** não aparecem; as telas de entrada e saída de estoque
  continuam disponíveis.
- **`avaliador@clothstock.com`** (VIEWER) — navega por todas as páginas e
  consulta todos os dados, mas **nenhum** botão de escrita aparece: nem
  Novo/Editar/Excluir, nem **Nova Entrada**, nem **Nova Saída**. O botão
  "Ver detalhes" das movimentações continua, porque é leitura.

Para provar que a interface não é a responsável pela restrição, abra o
DevTools na aba **Network** e tente a operação de qualquer outra forma —
descartando o atributo `data-write-only`/`data-admin-only` no elemento,
chamando `deleteProduct(1)` no console, ou usando o próprio `curl`:

```bash
curl -i -X DELETE http://localhost:3000/api/brands/1 \
  -H "Cookie: clothstock_token=<token-do-operator>"
```

A resposta é `403`, com o corpo:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Você não tem permissão para esta operação."
  }
}
```

O mesmo vale para `POST`, `PUT` e `PATCH` nos quatro recursos de catálogo,
e para o VIEWER em qualquer rota de escrita, **inclusive**
`POST /api/movements/inflows` e `POST /api/movements/outflows`.

### 6.3 Auditoria da matriz

```bash
npm run verify:matrix
```

Compara a matriz com as rotas montadas e falha se houver rota sem regra
ou regra órfã. Também falha se o perfil VIEWER receber alguma ação que
não termine em `.read`, ou se ficar sem nenhuma permissão. Não precisa de
banco nem de servidor no ar. É o que impede o "negar por padrão" — e a
propriedade "VIEWER é somente leitura" — de se degradar em silêncio com
o tempo.

---

## 7. O que um OPERATOR ou VIEWER não consegue fazer, e onde isso é barrado

Para `DELETE /api/brands/1` feito por um OPERATOR, a requisição é recusada
na **primeira** camada que a encontra:

| # | Camada | Resultado |
|---|---|---|
| 1 | `apiAuthorizationGate` em `src/app.js` | `403` — a ação `brands.delete` não está em `ROLE_ACTIONS.OPERATOR` |
| 2 | `requireRole('ADMIN')` em `src/routes/brandRoutes.js` | `403` — `OPERATOR` não está na lista |
| 3 | `forbidUnless(res, req, ACTIONS.BRANDS_DELETE)` em `src/controllers/brandController.js` | `403` — repetição dentro do controller |

Para o VIEWER, a camada 1 já recusa: `brands.delete` não está na lista
dele. A camada 2 também recusa, porque `requireRole('ADMIN')` não inclui
`VIEWER`. E a camada 3, dentro do controller, recusa uma terceira vez.

As três precisam liberar. A terceira existe para que uma escrita
destrutiva nunca dependa apenas da montagem da rota: se alguém registrar
`deleteBrand` em um router sem os dois middlewares, a operação continua
sendo recusada dentro do próprio controller.

---

## 8. Ao acrescentar uma rota nova

1. Declare a ação em `ACTIONS` e a regra em `ROUTE_RULES`, escolhendo
   conscientemente as roles que podem usá-la.
2. Conceda a ação em `ROLE_ACTIONS` para as roles esperadas.
3. Rode `npm run verify:matrix`. Ele falha enquanto a rota não estiver
   mapeada, e falha se o VIEWER receber uma ação de escrita.
4. Se a rota escrever dados, adicione `forbidUnless(...)` no controller.
5. Se a interface precisar esconder o controle, marque o elemento com
   `data-admin-only` (somente ADMIN) ou `data-write-only` (ADMIN e
   OPERATOR, nunca VIEWER) para espelhar a regra.

Enquanto o passo 1 não for feito, a rota responde `404` para todo mundo,
inclusive ADMIN. É o comportamento pretendido do "negar por padrão": o
acesso só é concedido quando a permissão foi declarada.

### Atenção ao `requireRole` de montagem

Em `src/app.js`, os `requireRole(...)` dos `app.use` decidem **quem pode
entrar no recurso**, incluindo as leituras — não o que pode ser feito
dentro dele. Um `requireRole('ADMIN', 'OPERATOR')` nesse ponto bloquearia
o VIEWER até em um `GET`. Por isso as rotas de leitura usam a constante
`READER_ROLES`, que hoje vale `['ADMIN', 'OPERATOR', 'VIEWER']`. Ao
adicionar um perfil novo, essa lista precisa ser revista junto.

---

## 9. Scripts

| Comando | Descrição |
|---|---|
| `npm run test-user:create` | Cria ou redefine o OPERATOR de teste |
| `npm run test-user:remove` | Remove o OPERATOR de teste |
| `npm run verify:matrix` | Confere matriz × rotas montadas (sem banco nem servidor) |
| `npm run verify:permissions` | Prova as permissões via HTTP (servidor no ar) |

Variáveis de ambiente opcionais:

| Variável | Padrão | Uso |
|---|---|---|
| `TEST_USER_EMAIL` | `operador@clothstock.com` | E-mail do usuário de teste |
| `TEST_USER_PASSWORD` | `Avaliador#2026` | Senha do usuário de teste OPERATOR |
| `VIEWER_ACCOUNT_EMAIL` | `avaliador@clothstock.com` | E-mail da conta de demonstração |
| `VIEWER_ACCOUNT_PASSWORD` | vazio | Habilita os grupos 9-15 da verificação |
| `TEST_ADMIN_EMAIL` | vazio | Habilita a checagem 8 |
| `TEST_ADMIN_PASSWORD` | vazio | Habilita a checagem 8 |
| `ALLOW_PUBLIC_REGISTRATION` | vazio | `true` reabre o cadastro público em produção |
| `BASE_URL` | `http://localhost:$PORT` | API alvo da verificação |

---

## 10. Limitações conhecidas e riscos em aberto

- **A senha do OPERATOR de teste é pública.** `Avaliador#2026` está no
  `scripts/seed-test-user.js` e nesta documentação, porque existe para
  ser reproduzível. Isso é aceitável em desenvolvimento e **não** deve ir
  para a Vercel: se a conta for criada em produção, trate a senha como
  comprometida. A conta do VIEWER não tem esse problema, justamente
  porque a senha nunca é versionada.
- **As contas de demonstração não têm expiração nem rotação.** O VIEWER e
  o OPERATOR ficam com acesso enquanto `is_active` for `true`. Em uma
  aplicação pública convém revogá-los ao fim da avaliação
  (`npm run viewer:remove` e `npm run test-user:remove`) ou adicionar
  expiração por data.
- **Não há `GET /api/users` nem gerenciamento de usuários pela interface**
  (RF-21 do README continua pendente). As roles são alteradas por script
  ou por SQL. Nenhum sistema de gerenciamento foi criado, conforme o
  escopo pedido.
- **Não existe suíte de testes automatizados geral** (RF-22 pendente). A
  verificação de permissões é o único harness automático e exige o
  servidor no ar. A auditoria da matriz (`verify:matrix`) roda sem banco
  nem servidor e é a única checagem que roda em CI sem infraestrutura.
- **`movements.create` é liberada ao OPERATOR** conforme a linha 322 do
  PRD ("se autorizado operacionalmente"). Como não existe escopo por
  usuário, a permissão é blanket: um OPERATOR dá baixa em estoque. Se a
  operação exigir segregação de funções, isso precisa virar um flag por
  usuário. O VIEWER não é afetado — não tem essa ação.
- **O token vive 8 horas no cookie.** Como a role é relida do banco a
  cada requisição, o corte de acesso é imediato; mas a *interface* só
  atualiza o `data-role` do body na próxima carga de página. Um
  OPERATOR rebaixado pode continuar vendo botões até recarregar, embora
  as chamadas já retornem `403`.
- **A tela de login depende de uma chamada extra** (`/api/auth/health`)
  para esconder o link de cadastro. Se essa chamada falhar, o link
  permanece visível — mas o backend continua recusando o cadastro, e a
  página de registro exibe a mensagem de recusa.
