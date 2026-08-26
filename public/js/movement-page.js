const movementType = document.body.dataset.movementType;
const isInflow = movementType === 'INFLOW';
const currency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = value => new Date(value).toLocaleString('pt-BR');
let historyRows = [];

function updateThemeButton() {
  const darkMode = document.body.classList.contains('dark-mode');
  document.querySelector('#theme-text').textContent = darkMode ? 'Modo Claro' : 'Modo Escuro';
  document.querySelector('#theme-icon').setAttribute('data-feather', darkMode ? 'sun' : 'moon');
  if (window.feather) window.feather.replace();
}
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('clothstock-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  updateThemeButton();
}

function alertMessage(message, type = 'success') {
  document.querySelector('#alert-container').innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
}

async function loadProducts() {
  const response = await fetch('/api/products');
  const result = await response.json();
  const select = document.querySelector('#product_id');
  if (!result.success) throw new Error(result.error || 'Não foi possível carregar os produtos.');
  select.innerHTML = '<option value="">Selecione um produto...</option>' + result.data.map(product => `<option value="${product.id}" data-price="${isInflow ? product.cost_price : product.selling_price}">${product.title} — disponível: ${product.quantity_in_stock}</option>`).join('');
}

async function loadHistory() {
  const body = document.querySelector('#movements-body');
  const response = await fetch(`/api/movements?type=${movementType}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Não foi possível carregar o histórico.');
  historyRows = result.data;
  body.innerHTML = result.data.length ? result.data.map((row, index) => `<tr><td>#${row.id}</td><td>${dateTime(row.created_at)}</td><td>${row.product_name}</td><td><span class="badge text-bg-${isInflow ? 'success' : 'danger'}">${isInflow ? '+' : '-'}${row.quantity}</span></td><td>${currency(row.unit_price)}</td><td>${row.notes || '—'}</td><td><div class="action-buttons"><button class="btn btn-sm btn-outline-info movement-details" data-index="${index}" title="Ver detalhes"><i data-feather="eye"></i></button></div></td></tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">Nenhuma movimentação registrada.</td></tr>';
  if (window.feather) window.feather.replace();
}

document.addEventListener('click', event => {
  const button = event.target.closest('.movement-details');
  if (!button) return;
  const row = historyRows[button.dataset.index];
  document.querySelector('#movement-detail-title').textContent = `${isInflow ? 'Entrada' : 'Saída'} #${row.id}`;
  document.querySelector('#movement-detail-content').textContent = `Produto: ${row.product_name} | Quantidade: ${row.quantity} | Valor unitário: ${currency(row.unit_price)} | Data: ${dateTime(row.created_at)} | Observação: ${row.notes || 'Não informada.'}`;
  new bootstrap.Modal(document.querySelector('#movement-detail-modal')).show();
});

document.querySelector('#product_id').addEventListener('change', event => { document.querySelector('#unit_price').value = event.target.selectedOptions[0]?.dataset.price || ''; });
document.querySelector('#movement-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const response = await fetch('/api/movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: document.querySelector('#product_id').value, type: movementType, quantity: document.querySelector('#quantity').value, unit_price: document.querySelector('#unit_price').value, notes: document.querySelector('#notes').value.trim() }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível registrar a movimentação.');
    event.target.reset();
    bootstrap.Modal.getInstance(document.querySelector('#movement-modal'))?.hide();
    alertMessage(`${isInflow ? 'Entrada' : 'Saída'} registrada. Estoque atual: ${result.newStockQuantity} un.`);
    await Promise.all([loadProducts(), loadHistory()]);
  } catch (error) { alertMessage(error.message, 'danger'); } finally { submit.disabled = false; }
});

if (localStorage.getItem('clothstock-theme') === 'dark') document.body.classList.add('dark-mode');
document.querySelector('#theme-toggle').addEventListener('click', toggleDarkMode);
updateThemeButton();
Promise.all([loadProducts(), loadHistory()]).catch(error => alertMessage(error.message, 'danger'));
