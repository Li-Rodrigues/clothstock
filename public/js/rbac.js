/* ============================================================
   CLOTHSTOCK -- Sessão + RBAC compartilhado
   ============================================================

   Este módulo centraliza o acesso ao usuário autenticado e o controle
   visual das ações administrativas. Ele é carregado uma única vez por
   página (antes do app-shell.js) para que nenhuma página precise chamar
   /api/auth/me por conta própria.

   Responsabilidades:
   1. Buscar o usuário autenticado (GET /api/auth/me) uma única vez;
   2. Redirecionar para /login.html quando não há sessão válida;
   3. Expor a role do usuário (ClothstockRbac.getRole / isAdmin /
      whenReady);
   4. Revelar os elementos marcados com [data-admin-only] quando -- e
      somente quando -- o usuário for ADMIN.

   A autorização real NÃO é feita aqui: o backend continua exigindo
   authenticate + requireRole('ADMIN') e respondendo 403 para OPERATOR
   em qualquer chamada direta às rotas administrativas.
   ============================================================ */

(function (global) {
    'use strict';

    const ADMIN_ROLE = 'ADMIN';
    const ADMIN_ONLY_ATTRIBUTE = 'data-admin-only';
    const ROLE_ATTRIBUTE = 'data-role';
    const PUBLIC_PAGES = /^(login|register)\.html$/;

    const session = {
        user: null,
        role: null,
        resolved: false
    };

    let pendingRequest = null;
    let observer = null;

    /* --------------------------------------------------------
       CONTROLE DE VISIBILIDADE DOS ELEMENTOS ADMIN-ONLY
    -------------------------------------------------------- */

    function isAdmin() {
        return session.role === ADMIN_ROLE;
    }

    function currentPage() {
        return window.location.pathname.split('/').pop() || '';
    }

    function isPublicPage() {
        return PUBLIC_PAGES.test(currentPage());
    }

    function applyRoleToBody() {
        if (!document.body) return;
        if (session.role) {
            document.body.setAttribute(ROLE_ATTRIBUTE, session.role);
        } else {
            document.body.removeAttribute(ROLE_ATTRIBUTE);
        }
    }

    /*
     * O CSS (/css/rbac.css) oculta qualquer [data-admin-only] enquanto o
     * body não estiver marcado como ADMIN. Para o ADMIN basta remover o
     * atributo: o elemento volta a aparecer exatamente como estava no
     * design system, sem precisar recriar estilos.
     */
    function revealAdminOnly(root) {
        const scope = root || document;
        if (!scope || typeof scope.querySelectorAll !== 'function') return;

        scope
            .querySelectorAll('[' + ADMIN_ONLY_ATTRIBUTE + ']')
            .forEach(function (element) {
                element.removeAttribute(ADMIN_ONLY_ATTRIBUTE);
            });
    }

    /*
     * As linhas das tabelas são renderizadas por JavaScript depois do
     * carregamento da sessão. O observer garante que o atributo também seja
     * removido nesse conteúdo dinâmico para o ADMIN.
     */
    function watchDynamicContent() {
        if (observer || !document.body || typeof MutationObserver === 'undefined') return;

        observer = new MutationObserver(function (mutations) {
            for (let index = 0; index < mutations.length; index += 1) {
                const added = mutations[index].addedNodes;
                for (let position = 0; position < added.length; position += 1) {
                    if (added[position] && added[position].nodeType === 1) {
                        revealAdminOnly(added[position]);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function applyRole() {
        applyRoleToBody();
        if (isAdmin()) {
            revealAdminOnly();
            watchDynamicContent();
        }
    }

    /* --------------------------------------------------------
       SESSÃO
    -------------------------------------------------------- */

    function loadSession() {
        if (pendingRequest) return pendingRequest;

        pendingRequest = fetch('/api/auth/me', {
            credentials: 'include',
            headers: { Accept: 'application/json' }
        })
            .then(function (response) {
                if (!response.ok) return null;
                return response.json().catch(function () {
                    return null;
                });
            })
            .catch(function () {
                return null;
            })
            .then(function (result) {
                const user = result && result.data ? result.data.user : null;

                if (user && user.role) {
                    session.user = user;
                    session.role = String(user.role).toUpperCase();
                }

                session.resolved = true;

                if (!session.user && !isPublicPage()) {
                    window.location.replace('/login.html');
                    return null;
                }

                applyRole();

                return session.user;
            });

        return pendingRequest;
    }

    function whenReady(callback) {
        if (typeof callback !== 'function') return loadSession();

        if (session.resolved) {
            callback(session.user, session.role);
            return Promise.resolve(session.user);
        }

        return loadSession().then(function () {
            callback(session.user, session.role);
            return session.user;
        });
    }

    global.ClothstockRbac = {
        whenReady: whenReady,
        loadSession: loadSession,
        isAdmin: isAdmin,
        getRole: function () {
            return session.role;
        },
        getUser: function () {
            return session.user;
        }
    };

    if (document.body) {
        loadSession();
    } else {
        document.addEventListener('DOMContentLoaded', loadSession, { once: true });
    }
}(window));
