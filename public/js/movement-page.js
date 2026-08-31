const movementType = String(document.body.dataset.movementType || '').toUpperCase();
const isInflow = movementType === 'INFLOW';
const PRODUCTS_API_URL = '/api/products';
const MOVEMENTS_API_URL = '/api/movements';

let productsCache = [];
let movementItems = [];
let historyRows = [];
let nextItemId = 1;

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateThemeButton() {
  const darkMode = document.body.classList.contains('dark-mode');
  const themeText = document.querySelector('#theme-text');
  const themeIcon = document.querySelector('#theme-icon');

  if (themeText) themeText.textContent = darkMode ? 'Modo Claro' : 'Modo Escuro';
  if (themeIcon) themeIcon.setAttribute('data-feather', darkMode ? 'sun' : 'moon');
  if (window.feather) window.feather.replace();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem(
    'clothstock-theme',
    document.body.classList.contains('dark-mode') ? 'dark' : 'light'
  );
  updateThemeButton();
}

function alertMessage(message, type = 'success') {
  const container = document.querySelector('#alert-container');
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

async function loadProducts() {
  const response = await fetch(PRODUCTS_API_URL);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Não foi possível carregar os produtos.');
  }

  productsCache = Array.isArray(result.data) ? result.data : [];
  renderProductsCount();
  renderMovementProductOptions();
}

function renderProductsCount() {
  const element = document.querySelector('#products-count');
  if (element) element.textContent = productsCache.length;
}

function getProductOptions(selectedProductId = '') {
  let html = '<option value="">Selecione um produto...</option>';

  productsCache.forEach(product => {
    const stock = Number(product.quantity_in_stock || 0);
    const price = isInflow
      ? Number(product.cost_price || 0)
      : Number(product.selling_price || 0);
    const selected = Number(selectedProductId) === Number(product.id) ? 'selected' : '';

    html += `
      <option value="${product.id}" data-price="${price}" data-stock="${stock}" ${selected}>
        ${escapeHtml(product.title)} — disponível: ${stock}
      </option>
    `;
  });

  return html;
}

function renderMovementProductOptions() {
  document.querySelectorAll('.movement-product').forEach(select => {
    select.innerHTML = getProductOptions(select.value);
  });
}

function addMovementItem() {
  const container = document.querySelector('#movement-products-container');
  if (!container) return;

  movementItems.push({
    id: nextItemId++,
    product_id: '',
    quantity: 1,
    unit_price: 0
  });

  renderMovementItems();

  setTimeout(() => {
    const rows = document.querySelectorAll('.movement-item-row');
    const lastRow = rows[rows.length - 1];
    const select = lastRow?.querySelector('.movement-product');
    if (select) select.focus();
  }, 50);
}

function renderMovementItems() {
  const container = document.querySelector('#movement-products-container');
  const empty = document.querySelector('#empty-products');
  if (!container) return;

  if (movementItems.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'block';
    updateMovementSummary();
    return;
  }

  if (empty) empty.style.display = 'none';

  container.innerHTML = movementItems.map((item, index) => {
    const product = productsCache.find(p => Number(p.id) === Number(item.product_id));
    const stock = product ? Number(product.quantity_in_stock || 0) : 0;
    const total = Number(item.quantity || 0) * Number(item.unit_price || 0);

    return `
      <div class="movement-item-row border rounded p-3 mb-3" data-item-id="${item.id}" style="color: inherit !important;">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${isInflow ? 'text-bg-success' : 'text-bg-danger'}">${index + 1}</span>
            <strong class="fw-bold" style="color: inherit !important;">Produto ${index + 1}</strong>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger remove-movement-item" data-item-id="${item.id}" title="Remover produto">
            <i data-feather="trash-2"></i>
          </button>
        </div>
        <div class="row g-3">
          <div class="col-md-5">
            <label class="form-label fw-semibold" style="color: inherit !important;">Produto *</label>
            <select class="form-select movement-product" data-item-id="${item.id}" required>
              ${getProductOptions(item.product_id)}
            </select>
            <div class="stock-info opacity-75 small mt-1" style="color: inherit !important;">
              ${product ? `Estoque disponível: ${stock} un.` : 'Selecione um produto.'}
            </div>
          </div>
          <div class="col-md-2">
            <label class="form-label fw-semibold" style="color: inherit !important;">Quantidade *</label>
            <input type="number" class="form-control movement-quantity" data-item-id="${item.id}" min="1" step="1" value="${item.quantity}" required>
          </div>
          <div class="col-md-2">
            <label class="form-label fw-semibold" style="color: inherit !important;">${isInflow ? 'Custo Unitário *' : 'Preço Unitário *'}</label>
            <div class="input-group">
              <span class="input-group-text">R$</span>
              <input type="number" class="form-control movement-unit-price" data-item-id="${item.id}" min="0" step="0.01" value="${Number(item.unit_price || 0).toFixed(2)}" required>
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-semibold" style="color: inherit !important;">Total</label>
            <div class="form-control fw-bold movement-item-total border" style="color: inherit !important;">${currency(total)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  updateMovementSummary();
  if (window.feather) window.feather.replace();
}

function findItem(itemId) {
  return movementItems.find(current => Number(current.id) === Number(itemId));
}

function handleProductChange(event) {
  const select = event.target.closest('.movement-product');
  if (!select) return;

  const item = findItem(select.dataset.itemId);
  if (!item) return;

  const option = select.selectedOptions[0];
  item.product_id = option?.value ? Number(option.value) : '';
  if (option) item.unit_price = Number(option.dataset.price || 0);

  renderMovementItems();
}

function handleQuantityChange(event) {
  const input = event.target.closest('.movement-quantity');
  if (!input) return;

  const item = findItem(input.dataset.itemId);
  if (!item) return;

  item.quantity = Number.parseInt(input.value, 10) || 0;
  updateMovementSummary();
  updateItemTotalDisplay(item.id);
}

function handlePriceChange(event) {
  const input = event.target.closest('.movement-unit-price');
  if (!input) return;

  const item = findItem(input.dataset.itemId);
  if (!item) return;

  item.unit_price = Number.parseFloat(input.value) || 0;
  updateMovementSummary();
  updateItemTotalDisplay(item.id);
}

function updateItemTotalDisplay(itemId) {
  const item = findItem(itemId);
  if (!item) return;

  const row = document.querySelector(`.movement-item-row[data-item-id="${itemId}"]`);
  if (!row) return;

  const totalText = currency(Number(item.quantity || 0) * Number(item.unit_price || 0));
  const totalElement = row.querySelector('.movement-item-total');

  if (totalElement) totalElement.textContent = totalText;
}

function removeMovementItem(itemId) {
  movementItems = movementItems.filter(item => Number(item.id) !== Number(itemId));
  renderMovementItems();
}

function updateMovementSummary() {
  const totalItems = movementItems.length;
  const totalQuantity = movementItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = movementItems.reduce(
    (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
    0
  );

  const itemsElement = document.querySelector('#summary-items');
  const quantityElement = document.querySelector('#summary-quantity');
  const totalElement = document.querySelector('#summary-total');
  const oldQuantity = document.querySelector('#total-quantity');
  const oldAmount = document.querySelector('#total-amount');

  if (itemsElement) itemsElement.textContent = totalItems;
  if (quantityElement) quantityElement.textContent = `${totalQuantity} un.`;
  if (totalElement) totalElement.textContent = currency(totalAmount);
  if (oldQuantity) oldQuantity.textContent = `${totalQuantity} un.`;
  if (oldAmount) oldAmount.textContent = currency(totalAmount);
}

async function loadSuppliers() {
  if (!isInflow) return;

  const select = document.querySelector('#movement-supplier');
  if (!select) return;

  try {
    const response = await fetch('/api/suppliers');
    const result = await response.json();
    if (!response.ok || !result.success) return;

    const suppliers = Array.isArray(result.data) ? result.data : [];
    select.innerHTML = '<option value="">Selecione um fornecedor...</option>';

    suppliers.forEach(supplier => {
      select.innerHTML += `<option value="${supplier.id}">${escapeHtml(supplier.name)}</option>`;
    });
  } catch (error) {
    console.warn('Não foi possível carregar fornecedores:', error);
  }
}

async function loadHistory() {
  const body = document.querySelector('#movements-body');
  if (!body) return;

  const searchInput = document.querySelector('#history-search');
  const search = searchInput ? searchInput.value.trim() : '';
  const url = new URL(MOVEMENTS_API_URL, window.location.origin);

  url.searchParams.set('type', movementType);
  if (search) url.searchParams.set('search', search);

  const response = await fetch(url.toString());
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Não foi possível carregar o histórico.');
  }

  historyRows = Array.isArray(result.data) ? result.data : [];
  renderHistory();
  renderMovementCount();
}

function renderMovementCount() {
  const element = document.querySelector('#movements-count');
  if (element) element.textContent = historyRows.length;
}

function getProductsSummary(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  if (items.length === 0) return 'Nenhum produto';

  const names = items.map(item => escapeHtml(item.product_name));
  if (names.length <= 2) return names.join(', ');

  return `${names.slice(0, 2).join(', ')} <span class="text-muted">+${names.length - 2}</span>`;
}

function reasonLabel(reason) {
  const reasons = {
    SALE: 'Venda',
    DAMAGE: 'Avaria / Perda',
    ADJUSTMENT: 'Ajuste',
    RETURN: 'Devolução',
    OTHER: 'Outro'
  };
  return reasons[reason] || reason;
}

function renderHistory() {
  const body = document.querySelector('#movements-body');
  if (!body) return;

  if (historyRows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-5">
          <i data-feather="inbox" style="width:32px;height:32px;"></i>
          <div class="mt-2">Nenhuma movimentação encontrada.</div>
        </td>
      </tr>
    `;
    if (window.feather) window.feather.replace();
    return;
  }

  body.innerHTML = historyRows.map((row, index) => {
    const productsCount = Number(row.total_items || 0);
    const totalQuantity = Number(row.total_quantity || 0);
    const totalAmount = Number(row.total_amount || 0);
    let reasonText = '—';

    if (!isInflow && row.reason) reasonText = reasonLabel(row.reason);
    if (isInflow && row.invoice_number) reasonText = `NF: ${escapeHtml(row.invoice_number)}`;

    return `
      <tr>
        <td>#${escapeHtml(row.id)}</td>
        <td>${escapeHtml(dateTime(row.created_at))}</td>
        <td>
          <div class="fw-semibold">${productsCount} ${productsCount === 1 ? 'produto' : 'produtos'}</div>
          <div class="small text-muted">${getProductsSummary(row)}</div>
        </td>
        <td>
          <span class="badge ${isInflow ? 'text-bg-success' : 'text-bg-danger'}">
            ${isInflow ? '+' : '-'}${totalQuantity}
          </span>
        </td>
        <td class="fw-semibold">${currency(totalAmount)}</td>
        <td>
          ${reasonText}
          ${row.notes ? `<div class="small text-muted">${escapeHtml(row.notes)}</div>` : ''}
        </td>
        <td>
          <div class="action-buttons">
            <button type="button" class="btn btn-sm btn-outline-info movement-details" data-index="${index}" title="Ver detalhes">
              <i data-feather="eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.feather) window.feather.replace();
}

function showMovementDetails(index) {
  const row = historyRows[index];
  if (!row) return;

  const title = document.querySelector('#movement-detail-title');
  const content = document.querySelector('#movement-detail-content');

  if (title) title.textContent = `${isInflow ? 'Entrada' : 'Saída'} #${row.id}`;

  const items = Array.isArray(row.items) ? row.items : [];
  const productsHtml = items.length > 0
    ? `
      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Produto</th>
              <th class="text-center">Quantidade</th>
              <th class="text-end">Valor unitário</th>
              <th class="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td><strong>${escapeHtml(item.product_name)}</strong></td>
                <td class="text-center">${escapeHtml(item.quantity)}</td>
                <td class="text-end">${currency(item.unit_price)}</td>
                <td class="text-end fw-semibold">${currency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : '<p class="text-muted">Nenhum produto encontrado.</p>';

  const reason = !isInflow && row.reason
    ? reasonLabel(row.reason) === 'Ajuste' ? 'Ajuste de estoque' : reasonLabel(row.reason)
    : null;

  if (content) {
    content.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="detail-label">Data</div>
          <div class="detail-value">${escapeHtml(dateTime(row.created_at))}</div>
        </div>
        <div class="col-md-4">
          <div class="detail-label">Quantidade total</div>
          <div class="detail-value">${escapeHtml(row.total_quantity)} un.</div>
        </div>
        <div class="col-md-4">
          <div class="detail-label">Valor total</div>
          <div class="detail-value price-value">${currency(row.total_amount)}</div>
        </div>
        ${isInflow ? `
          <div class="col-md-6">
            <div class="detail-label">Fornecedor</div>
            <div class="detail-value">${escapeHtml(row.supplier_name || 'Não informado')}</div>
          </div>
          <div class="col-md-6">
            <div class="detail-label">Nota Fiscal</div>
            <div class="detail-value">${escapeHtml(row.invoice_number || 'Não informada')}</div>
          </div>
        ` : `
          <div class="col-md-6">
            <div class="detail-label">Motivo</div>
            <div class="detail-value">${escapeHtml(reason || 'Não informado')}</div>
          </div>
        `}
        <div class="col-md-12">
          <div class="detail-label">Observação</div>
          <div class="detail-value">${escapeHtml(row.notes || 'Não informada.')}</div>
        </div>
      </div>
      <hr>
      <h6 class="fw-bold mb-3">Produtos da movimentação</h6>
      ${productsHtml}
    `;
  }

  const modalElement = document.querySelector('#movement-detail-modal');
  if (modalElement && window.bootstrap) {
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
  }
}

async function submitMovement(event) {
  event.preventDefault();

  if (movementItems.length === 0) {
    alertMessage('Adicione pelo menos um produto à movimentação.', 'warning');
    return;
  }

  const usedProducts = new Set();

  for (const item of movementItems) {
    if (!item.product_id) {
      alertMessage('Selecione um produto em todos os itens.', 'warning');
      return;
    }

    if (usedProducts.has(Number(item.product_id))) {
      alertMessage('O mesmo produto não pode ser adicionado duas vezes. Ajuste a quantidade do item existente.', 'warning');
      return;
    }

    usedProducts.add(Number(item.product_id));

    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
      alertMessage('Todas as quantidades devem ser maiores que zero.', 'warning');
      return;
    }

    if (!Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) {
      alertMessage('Todos os valores unitários devem ser válidos.', 'warning');
      return;
    }

    if (!isInflow) {
      const product = productsCache.find(p => Number(p.id) === Number(item.product_id));
      const stock = Number(product?.quantity_in_stock || 0);

      if (Number(item.quantity) > stock) {
        alertMessage(`Estoque insuficiente para "${product?.title || 'produto'}". Disponível: ${stock} un.`, 'warning');
        return;
      }
    }
  }

  const submitButton = event.submitter || document.querySelector('#save-movement-btn, #movement-form button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    const notes = document.querySelector('#notes')?.value.trim() || '';
    const payload = {
      type: movementType,
      notes,
      items: movementItems.map(item => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price)
      }))
    };

    if (isInflow) {
      const supplier = document.querySelector('#movement-supplier');
      const invoice = document.querySelector('#invoice-number');
      if (supplier?.value) payload.supplier_id = Number(supplier.value);
      if (invoice?.value.trim()) payload.invoice_number = invoice.value.trim();
    } else {
      payload.reason = document.querySelector('#reason')?.value || 'SALE';
    }

    const response = await fetch(MOVEMENTS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Não foi possível registrar a movimentação.');
    }

    movementItems = [];
    renderMovementItems();

    const form = document.querySelector('#movement-form');
    if (form) form.reset();

    const modalElement = document.querySelector('#movement-modal');
    if (modalElement && window.bootstrap) {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }

    alertMessage(
      result.message || (isInflow ? 'Entrada registrada com sucesso.' : 'Saída registrada com sucesso.'),
      'success'
    );

    await Promise.all([loadProducts(), loadHistory()]);
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    alertMessage(error.message || 'Erro ao registrar movimentação.', 'danger');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

document.addEventListener('click', event => {
  const addButton = event.target.closest('#add-movement-item, #add-product-btn');
  if (addButton) {
    event.preventDefault();
    addMovementItem();
    return;
  }

  const removeButton = event.target.closest('.remove-movement-item');
  if (removeButton) {
    event.preventDefault();
    removeMovementItem(removeButton.dataset.itemId);
    return;
  }

  const detailsButton = event.target.closest('.movement-details');
  if (detailsButton) {
    event.preventDefault();
    showMovementDetails(Number(detailsButton.dataset.index));
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('.movement-product')) handleProductChange(event);
});

document.addEventListener('input', event => {
  if (event.target.matches('.movement-quantity')) handleQuantityChange(event);
  if (event.target.matches('.movement-unit-price')) handlePriceChange(event);
});

const movementForm = document.querySelector('#movement-form');
if (movementForm) movementForm.addEventListener('submit', submitMovement);

let searchTimeout = null;
const historySearch = document.querySelector('#history-search');
if (historySearch) {
  historySearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadHistory().catch(error => alertMessage(error.message, 'danger'));
    }, 350);
  });
}

const movementModal = document.querySelector('#movement-modal');
if (movementModal) {
  movementModal.addEventListener('show.bs.modal', () => {
    movementItems = [];
    renderMovementItems();
    const form = document.querySelector('#movement-form');
    if (form) form.reset();
  });
}

const themeToggle = document.querySelector('#theme-toggle');
if (themeToggle) themeToggle.addEventListener('click', toggleDarkMode);

if (localStorage.getItem('clothstock-theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

updateThemeButton();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([loadProducts(), loadHistory(), loadSuppliers()]);
    renderMovementItems();
    if (window.feather) window.feather.replace();
  } catch (error) {
    console.error('Erro ao inicializar página:', error);
    alertMessage(error.message || 'Erro ao carregar a página.', 'danger');
  }
});