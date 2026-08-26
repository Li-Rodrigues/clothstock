async function loadSharedSidebar() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const existingSidebar = document.querySelector('.nxl-navigation');
  const fallback = `<nav class="nxl-navigation"><div class="sidebar-brand"><a href="index.html">ClothStock</a><span>Gestão de estoque</span></div><ul class="sidebar-menu"><li class="sidebar-caption">Visão geral</li><li><a href="index.html" data-page="index.html"><i data-feather="home"></i>Dashboard</a></li><li class="sidebar-caption">Cadastros</li><li><a href="products.html" data-page="products.html"><i data-feather="package"></i>Produtos</a></li><li><a href="categories.html" data-page="categories.html"><i data-feather="grid"></i>Categorias</a></li><li><a href="brands.html" data-page="brands.html"><i data-feather="tag"></i>Marcas</a></li><li><a href="suppliers.html" data-page="suppliers.html"><i data-feather="truck"></i>Fornecedores</a></li><li class="sidebar-caption">Movimentações</li><li><a href="inflows.html" data-page="inflows.html"><i data-feather="arrow-down-circle"></i>Entradas</a></li><li><a href="outflows.html" data-page="outflows.html"><i data-feather="arrow-up-circle"></i>Saídas</a></li></ul></nav>`;
  try {
    const response = await fetch('sidebar.html');
    if (!response.ok) throw new Error('Não foi possível carregar a navegação.');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = await response.text();
    const sidebar = wrapper.firstElementChild;
    const activeLink = sidebar.querySelector(`[data-page="${currentPage}"]`);
    if (activeLink) activeLink.classList.add('active');
    if (existingSidebar) existingSidebar.replaceWith(sidebar); else document.body.prepend(sidebar);
    if (window.feather) window.feather.replace();
  } catch (error) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = fallback;
    const sidebar = wrapper.firstElementChild;
    sidebar.querySelector(`[data-page="${currentPage}"]`)?.classList.add('active');
    if (existingSidebar) existingSidebar.replaceWith(sidebar); else document.body.prepend(sidebar);
  }
}

function addTableFilter() {
  const tableBody = document.querySelector('tbody[id$="-table-body"], #movements-body');
  if (!tableBody) return;
  const table = tableBody.closest('table');
  const card = table.closest('.card');
  const titleArea = card?.querySelector('.card-header, .card-body > .p-3');
  if (!titleArea || titleArea.querySelector('.table-filter')) return;
  titleArea.classList.add('d-flex', 'align-items-center', 'gap-2');
  const filter = document.createElement('div');
  filter.className = 'input-group input-group-sm table-filter ms-3 me-auto';
  filter.style.maxWidth = '260px';
  filter.innerHTML = '<span class="input-group-text"><i data-feather="search"></i></span><input class="form-control" type="search" placeholder="Filtrar lista..." aria-label="Filtrar lista">';
  const input = filter.querySelector('input');
  input.addEventListener('input', () => {
    const term = input.value.trim().toLocaleLowerCase('pt-BR');
    [...tableBody.rows].forEach(row => { row.style.display = !term || row.innerText.toLocaleLowerCase('pt-BR').includes(term) ? '' : 'none'; });
  });
  const primaryAction = titleArea.querySelector('.btn');
  if (primaryAction) titleArea.insertBefore(filter, primaryAction);
  else titleArea.append(filter);
  if (window.feather) window.feather.replace();
}

document.addEventListener('DOMContentLoaded', () => { loadSharedSidebar(); addTableFilter(); });
