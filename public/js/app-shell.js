/* Shell compartilhado: sessão, rodapé e paginação das listagens simples. */
(function () {
  'use strict';

  const FOOTER_TEXT = '© 2026 ClothStock -- Gestão de Estoque. Todos os direitos reservados.';
  const PER_PAGE = 10;

  function ensureStyles() {
    if (document.getElementById('clothstock-shell-styles')) return;
    const style = document.createElement('style');
    style.id = 'clothstock-shell-styles';
    style.textContent = `
      .nxl-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .nxl-header > :first-child { margin-right: auto; }
      .clothstock-footer { margin-top: 28px; padding: 18px 0 6px; border-top: 1px solid var(--border-color, #e2e8f0); color: #64748b; font-size: .85rem; text-align: center; }
      body.dark-mode .clothstock-footer { color: #94a3b8; border-color: #334155; }
      .movement-page .nxl-container { min-height: 100vh; display: flex; flex-direction: column; }
      .movement-page .nxl-container > .clothstock-footer { margin-top: auto; }
      .clothstock-list-search { position: relative; margin-left: 0; width: min(100%, 260px); }
      .clothstock-list-search input { padding-left: 2rem; }
      .clothstock-list-search::before { content: '⌕'; position: absolute; margin: .25rem 0 0 .65rem; color: #64748b; }
      .clothstock-pagination { color: #64748b; }
      body.dark-mode .clothstock-pagination { color: #94a3b8; }
      .clothstock-list-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
      .clothstock-list-header > .btn { margin-left: auto; }
      @media (max-width: 768px) { .clothstock-list-search { margin: 10px 0 0; width: 100%; } .clothstock-list-header > .btn { margin-left: 0; } .clothstock-pagination { align-items: flex-start !important; } }
    `;
    document.head.appendChild(style);
  }

  function isLoginPage() {
    return /login\.html$/.test(window.location.pathname);
  }

  async function checkSession() {
    if (isLoginPage()) return true;

    // A sessão e a role vêm do módulo compartilhado /js/rbac.js, que já
    // chamou GET /api/auth/me uma única vez e redireciona para /login.html
    // quando não há usuário autenticado. Nenhuma chamada duplicada aqui.
    if (window.ClothstockRbac) {
      return Boolean(await window.ClothstockRbac.whenReady());
    }

    // Fallback: só ocorre se /js/rbac.js não estiver disponível na página.
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        window.location.replace('/login.html');
        return false;
      }
      return true;
    } catch (error) {
      window.location.replace('/login.html');
      return false;
    }
  }

  function addLogout() {
    if (isLoginPage()) return;
    const header = document.querySelector('.nxl-header');
    if (!header || header.querySelector('.clothstock-logout')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-secondary btn-sm clothstock-logout ms-2';
    button.setAttribute('aria-label', 'Sair da conta');
    button.innerHTML = '<i data-feather="log-out" aria-hidden="true"></i><span class="ms-1">Sair</span>';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } finally {
        window.location.replace('/login.html');
      }
    });
    const themeButton = header.querySelector('#theme-toggle, #btn-theme-toggle');
    if (themeButton) {
      themeButton.insertAdjacentElement('afterend', button);
    } else {
      header.appendChild(button);
    }
    if (window.feather) window.feather.replace();
  }

  function addFooter() {
    if (isLoginPage() || document.querySelector('.clothstock-footer')) return;
    const container = document.querySelector('.nxl-container');
    if (!container) return;

    const footer = document.createElement('footer');
    footer.className = 'clothstock-footer';
    footer.innerHTML = `<div class="container-fluid"><span>${FOOTER_TEXT}</span></div>`;
    container.appendChild(footer);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getConfig() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const resources = {
      'categories.html': { body: '#categories-table-body', label: 'categorias', render: 'renderCategoriesTable' },
      'brands.html': { body: '#brands-table-body', label: 'marcas', render: 'renderBrandsTable' },
      'suppliers.html': { body: '#suppliers-table-body', label: 'fornecedores', render: 'renderSuppliersTable' }
    };
    return resources[page] || null;
  }

  function addSearch(config) {
    const body = document.querySelector(config.body);
    if (!body) return null;
    const card = body.closest('.card');
    const header = card && card.querySelector('.card-header');
    if (!header || header.querySelector('.clothstock-list-search')) return null;
    header.classList.add('clothstock-list-header');

    const wrapper = document.createElement('div');
    wrapper.className = 'clothstock-list-search';
    wrapper.innerHTML = `
      <label class="visually-hidden" for="clothstock-list-search">Filtrar ${config.label}</label>
      <input id="clothstock-list-search" class="form-control form-control-sm" type="search" placeholder="Filtrar ${config.label}..." autocomplete="off">
    `;
    const actionButton = header.querySelector(':scope > button');
    if (actionButton) {
      header.insertBefore(wrapper, actionButton);
    } else {
      header.appendChild(wrapper);
    }
    return wrapper.querySelector('input');
  }

  function pageButtons(page, totalPages) {
    let html = `<button type="button" class="btn btn-sm btn-outline-secondary clothstock-page" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Anterior</button>`;
    for (let number = 1; number <= totalPages; number += 1) {
      html += `<button type="button" class="btn btn-sm ${number === page ? 'btn-primary' : 'btn-outline-secondary'} clothstock-page" data-page="${number}" ${number === page ? 'aria-current="page"' : ''}>${number}</button>`;
    }
    html += `<button type="button" class="btn btn-sm btn-outline-secondary clothstock-page" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Próxima</button>`;
    return html;
  }

  function initListPagination() {
    const config = getConfig();
    if (!config) return;

    const tbody = document.querySelector(config.body);
    if (!tbody) return;
    const search = addSearch(config);
    const card = tbody.closest('.card');
    const cardBody = card && card.querySelector('.card-body');
    if (!cardBody) return;

    let pagination = cardBody.querySelector('.clothstock-pagination');
    if (!pagination) {
      pagination = document.createElement('div');
      pagination.className = 'clothstock-pagination d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top';
      cardBody.appendChild(pagination);
    }

    let allRows = [];
    let filteredRows = [];
    let currentPage = 1;
    let renderingPage = false;
    let ignoreMutation = false;

    function snapshotRows() {
      const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
      if (!rows.length) return;
      const text = tbody.textContent || '';
      if (/carregando|nenhum|não encontrada|não cadastrad/i.test(text) && rows.length <= 1) {
        allRows = [];
        filteredRows = [];
        render();
        return;
      }
      if (renderingPage) return;
      allRows = rows.map(row => row.outerHTML);
      filteredRows = allRows.slice();
      currentPage = 1;
      render();
    }

    function render() {
      const total = filteredRows.length;
      const totalPages = Math.ceil(total / PER_PAGE);
      if (!total) {
        pagination.innerHTML = '<span class="small text-muted">Nenhum registro encontrado.</span>';
        return;
      }
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * PER_PAGE;
      const end = Math.min(start + PER_PAGE, total);
      renderingPage = true;
      ignoreMutation = true;
      tbody.innerHTML = filteredRows.slice(start, end).join('');
      renderingPage = false;
      pagination.innerHTML = `
        <small class="text-muted">Mostrando <strong>${start + 1}</strong>–<strong>${end}</strong> de <strong>${total}</strong> ${config.label}</small>
        <nav aria-label="Paginação de ${config.label}"><div class="btn-group flex-wrap">${pageButtons(currentPage, totalPages)}</div></nav>
      `;
      if (window.feather) window.feather.replace();
    }

    function filterRows() {
      const term = (search ? search.value : '').trim().toLowerCase();
      filteredRows = allRows.filter(row => !term || row.toLowerCase().includes(term));
      currentPage = 1;
      render();
    }

    if (search) search.addEventListener('input', filterRows);
    pagination.addEventListener('click', event => {
      const button = event.target.closest('.clothstock-page');
      if (!button || button.disabled) return;
      currentPage = Number(button.dataset.page);
      render();
    });

    const observer = new MutationObserver(() => {
      if (ignoreMutation) {
        ignoreMutation = false;
        return;
      }
      window.setTimeout(snapshotRows, 0);
    });
    observer.observe(tbody, { childList: true });
    window.setTimeout(snapshotRows, 50);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    ensureStyles();
    addFooter();
    const authenticated = await checkSession();
    if (authenticated) {
      addLogout();
      initListPagination();
    }
  });
}());
