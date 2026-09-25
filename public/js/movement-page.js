const movementType = String(
  document.body.dataset.movementType || ''
).toUpperCase();

const isInflow = movementType === 'INFLOW';

const PRODUCTS_API_URL = '/api/products';
const MOVEMENTS_API_URL = '/api/movements';

const ITEMS_PER_PAGE = 10;

let productsCache = [];
let movementItems = [];
let historyRows = [];
let nextItemId = 1;
let currentPage = 1;
let movementSubmitting = false;


/* ============================================================
   FORMATAÇÃO
============================================================ */

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}


function dateTime(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('pt-BR');
}


function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ============================================================
   TEMA
============================================================ */

function updateThemeButton() {
  const darkMode =
    document.body.classList.contains('dark-mode');

  const themeText =
    document.querySelector('#theme-text');

  const themeIcon =
    document.querySelector('#theme-icon');

  if (themeText) {
    themeText.textContent =
      darkMode ? 'Modo Claro' : 'Modo Escuro';
  }

  if (themeIcon) {
    themeIcon.setAttribute(
      'data-feather',
      darkMode ? 'sun' : 'moon'
    );
  }

  if (window.feather) {
    window.feather.replace();
  }
}


function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');

  localStorage.setItem(
    'clothstock-theme',
    document.body.classList.contains('dark-mode')
      ? 'dark'
      : 'light'
  );

  updateThemeButton();
}


/* ============================================================
   ALERTAS
============================================================ */

function alertMessage(
  message,
  type = 'success'
) {
  const container =
    document.querySelector('#alert-container');

  if (!container) return;

  container.innerHTML = `
    <div
      class="alert alert-${type} alert-dismissible fade show"
      role="alert">

      ${escapeHtml(message)}

      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="alert">
      </button>

    </div>
  `;
}


/* ============================================================
   PRODUTOS
============================================================ */

async function loadProducts() {
  const response =
    await fetch(PRODUCTS_API_URL);

  const result =
    await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
      'Não foi possível carregar os produtos.'
    );
  }

  productsCache =
    Array.isArray(result.data)
      ? result.data
      : [];

  renderProductsCount();
  renderMovementProductOptions();
}


function renderProductsCount() {
  const element =
    document.querySelector('#products-count');

  if (element) {
    element.textContent =
      productsCache.length;
  }
}


function getProductOptions(
  selectedProductId = ''
) {
  let html = `
    <option value="">
      Selecione um produto...
    </option>
  `;

  productsCache.forEach(product => {
    const stock =
      Number(product.quantity_in_stock || 0);

    /*
     * Entrada usa o custo.
     * Saída usa o preço de venda.
     */
    const price = isInflow
      ? Number(product.cost_price || 0)
      : Number(product.selling_price || 0);

    const selected =
      Number(selectedProductId) ===
      Number(product.id)
        ? 'selected'
        : '';

    html += `
      <option
        value="${product.id}"
        data-price="${price}"
        data-stock="${stock}"
        ${selected}>

        ${escapeHtml(product.title)}
        — disponível: ${stock}

      </option>
    `;
  });

  return html;
}


function renderMovementProductOptions() {
  document
    .querySelectorAll('.movement-product')
    .forEach(select => {
      select.innerHTML =
        getProductOptions(select.value);
    });
}


/* ============================================================
   ITENS DA MOVIMENTAÇÃO
============================================================ */

function addMovementItem() {
  const container =
    document.querySelector(
      '#movement-products-container'
    );

  if (!container) return;

  movementItems.push({
    id: nextItemId++,
    product_id: '',
    quantity: 1,
    unit_price: 0
  });

  renderMovementItems();

  setTimeout(() => {
    const rows =
      document.querySelectorAll(
        '.movement-item-row'
      );

    const lastRow =
      rows[rows.length - 1];

    const select =
      lastRow?.querySelector(
        '.movement-product'
      );

    if (select) {
      select.focus();
    }
  }, 50);
}


function renderMovementItems() {
  const container =
    document.querySelector(
      '#movement-products-container'
    );

  if (!container) return;

  const emptyProducts =
    document.querySelector(
      '#empty-products'
    );

  if (movementItems.length === 0) {

    container.innerHTML = '';

    if (emptyProducts) {
      emptyProducts.style.display = '';
    }

    updateMovementSummary();

    if (window.feather) {
      window.feather.replace();
    }

    return;
  }

  if (emptyProducts) {
    emptyProducts.style.display = 'none';
  }

  container.innerHTML =
    movementItems.map(item => {

      const product =
        productsCache.find(
          product =>
            Number(product.id) ===
            Number(item.product_id)
        );

      const stock =
        product
          ? Number(
              product.quantity_in_stock || 0
            )
          : 0;

      const price =
        Number(item.unit_price || 0);

      const quantity =
        Number(item.quantity || 0);

      const total =
        quantity * price;

      return `
        <div
          class="movement-item-row border rounded p-3 mb-2"
          data-item-id="${item.id}">

          <div class="row g-2 align-items-end">

            <div class="col-md-5">

              <label class="form-label">
                Produto
              </label>

              <select
                class="form-select form-select-sm movement-product"
                data-item-id="${item.id}">

                ${getProductOptions(
                  item.product_id
                )}

              </select>

              ${
                product
                  ? `
                    <div class="stock-info">
                      Estoque disponível:
                      <strong>${stock}</strong>
                    </div>
                  `
                  : ''
              }

            </div>


            <div class="col-md-2">

              <label class="form-label">
                Quantidade
              </label>

              <input
                type="number"
                class="form-control form-control-sm movement-quantity"
                data-item-id="${item.id}"
                min="1"
                step="1"
                value="${quantity}">

            </div>


            <div class="col-md-2">

              <label class="form-label">
                ${
                  isInflow
                    ? 'Custo Unitário'
                    : 'Preço Unitário'
                }
              </label>

              <input
                type="number"
                class="form-control form-control-sm movement-unit-price"
                data-item-id="${item.id}"
                min="0"
                step="0.01"
                value="${price.toFixed(2)}">

            </div>


            <div class="col-md-2">

              <label class="form-label">
                Total
              </label>

              <input
                type="text"
                class="form-control form-control-sm movement-item-total"
                value="${currency(total)}"
                disabled>

            </div>


            <div class="col-md-1">

              <button
                type="button"
                class="btn btn-outline-danger btn-sm remove-movement-item"
                data-item-id="${item.id}"
                title="Remover produto">

                <i data-feather="trash-2"></i>

              </button>

            </div>

          </div>

        </div>
      `;
    }).join('');

  updateMovementSummary();

  if (window.feather) {
    window.feather.replace();
  }
}


function findItem(itemId) {
  return movementItems.find(
    item =>
      Number(item.id) ===
      Number(itemId)
  );
}


function handleProductChange(event) {
  const select =
    event.target;

  const item =
    findItem(select.dataset.itemId);

  if (!item) return;

  const selectedOption =
    select.options[
      select.selectedIndex
    ];

  item.product_id =
    select.value;

  if (selectedOption) {

    const price =
      Number(
        selectedOption.dataset.price || 0
      );

    item.unit_price =
      price;
  }

  renderMovementItems();
}


function handleQuantityChange(event) {
  const input =
    event.target;

  const item =
    findItem(input.dataset.itemId);

  if (!item) return;

  let quantity =
    Number(input.value || 0);

  if (
    !Number.isFinite(quantity) ||
    quantity < 1
  ) {
    quantity = 1;
  }

  item.quantity =
    Math.floor(quantity);

  updateItemTotalDisplay(
    item.id
  );

  updateMovementSummary();
}


function handlePriceChange(event) {
  const input =
    event.target;

  const item =
    findItem(input.dataset.itemId);

  if (!item) return;

  let price =
    Number(input.value || 0);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    price = 0;
  }

  item.unit_price =
    price;

  updateItemTotalDisplay(
    item.id
  );

  updateMovementSummary();
}


function updateItemTotalDisplay(itemId) {
  const item =
    findItem(itemId);

  if (!item) return;

  const total =
    Number(item.quantity || 0) *
    Number(item.unit_price || 0);

  const row =
    document.querySelector(
      `.movement-item-row[data-item-id="${itemId}"]`
    );

  if (!row) return;

  const totalInput =
    row.querySelector(
      '.movement-item-total'
    );

  if (totalInput) {
    totalInput.value =
      currency(total);
  }
}


function removeMovementItem(itemId) {
  movementItems =
    movementItems.filter(
      item =>
        Number(item.id) !==
        Number(itemId)
    );

  renderMovementItems();
}


/* ============================================================
   RESUMO DA MOVIMENTAÇÃO
============================================================ */

function updateMovementSummary() {
  const totalItems =
    movementItems.length;

  const totalQuantity =
    movementItems.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0),
      0
    );

  const totalAmount =
    movementItems.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) *
        Number(item.unit_price || 0),
      0
    );

  /*
   * IDs corretos do seu inflows.html:
   *
   * summary-items
   * summary-quantity
   * summary-total
   */

  const itemsElement =
    document.querySelector(
      '#summary-items'
    );

  const quantityElement =
    document.querySelector(
      '#summary-quantity'
    );

  const totalElement =
    document.querySelector(
      '#summary-total'
    );

  if (itemsElement) {
    itemsElement.textContent =
      totalItems;
  }

  if (quantityElement) {
    quantityElement.textContent =
      `${totalQuantity} un.`;
  }

  if (totalElement) {
    totalElement.textContent =
      currency(totalAmount);
  }
}


/* ============================================================
   FORNECEDORES
============================================================ */

async function loadSuppliers() {
  if (!isInflow) return;

  const select =
    document.querySelector(
      '#movement-supplier'
    );

  if (!select) return;

  try {

    const response =
      await fetch('/api/suppliers');

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      return;
    }

    const suppliers =
      Array.isArray(result.data)
        ? result.data
        : [];

    select.innerHTML = `
      <option value="">
        Selecione um fornecedor...
      </option>
    `;

    suppliers.forEach(
      supplier => {

        select.innerHTML += `
          <option value="${supplier.id}">
            ${escapeHtml(
              supplier.name
            )}
          </option>
        `;

      }
    );

  } catch (error) {

    console.warn(
      'Não foi possível carregar fornecedores:',
      error
    );

  }
}


/* ============================================================
   HISTÓRICO
============================================================ */

async function loadHistory() {
  const body =
    document.querySelector(
      '#movements-body'
    );

  if (!body) return;

  const searchInput =
    document.querySelector(
      '#history-search'
    );

  const search =
    searchInput
      ? searchInput.value.trim()
      : '';

  const url =
    new URL(
      MOVEMENTS_API_URL,
      window.location.origin
    );

  url.searchParams.set(
    'type',
    movementType
  );

  if (search) {
    url.searchParams.set(
      'search',
      search
    );
  }

  const response =
    await fetch(
      url.toString()
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.error ||
      'Não foi possível carregar o histórico.'
    );
  }

  historyRows =
    Array.isArray(result.data)
      ? result.data
      : [];

  const totalPages =
    Math.ceil(
      historyRows.length /
      ITEMS_PER_PAGE
    );

  if (
    totalPages > 0 &&
    currentPage > totalPages
  ) {
    currentPage =
      totalPages;
  }

  if (totalPages === 0) {
    currentPage = 1;
  }

  renderHistory();
  renderMovementCount();
}


/* ============================================================
   CONTADOR
============================================================ */

function renderMovementCount() {
  const element =
    document.querySelector(
      '#movements-count'
    );

  if (element) {
    element.textContent =
      historyRows.length;
  }
}


/* ============================================================
   RESUMO DOS PRODUTOS
============================================================ */

function getProductsSummary(row) {
  const items =
    Array.isArray(row.items)
      ? row.items
      : [];

  if (items.length === 0) {
    return 'Nenhum produto';
  }

  const names =
    items.map(
      item =>
        escapeHtml(
          item.product_name
        )
    );

  if (names.length <= 2) {
    return names.join(', ');
  }

  return `
    ${names.slice(0, 2).join(', ')}
    <span class="text-muted">
      +${names.length - 2}
    </span>
  `;
}


function reasonLabel(reason) {
  const reasons = {
    SALE: 'Venda',
    DAMAGE: 'Avaria / Perda',
    ADJUSTMENT: 'Ajuste',
    RETURN: 'Devolução',
    OTHER: 'Outro'
  };

  return (
    reasons[reason] ||
    reason
  );
}


/* ============================================================
   RENDERIZAÇÃO DO HISTÓRICO
============================================================ */

function renderHistory() {
  const body =
    document.querySelector(
      '#movements-body'
    );

  if (!body) return;

  /*
   * Nenhum resultado.
   */
  if (historyRows.length === 0) {

    body.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="text-center text-muted py-5">

          <i
            data-feather="inbox"
            style="width:32px;height:32px;">
          </i>

          <div class="mt-2">
            Nenhuma movimentação encontrada.
          </div>

        </td>

      </tr>
    `;

    renderPagination();

    if (window.feather) {
      window.feather.replace();
    }

    return;
  }


  /*
   * Calcula as páginas.
   */
  const totalPages =
    Math.ceil(
      historyRows.length /
      ITEMS_PER_PAGE
    );


  /*
   * Índice inicial da página.
   */
  const startIndex =
    (currentPage - 1) *
    ITEMS_PER_PAGE;


  /*
   * Índice final da página.
   */
  const endIndex =
    startIndex +
    ITEMS_PER_PAGE;


  /*
   * Registros que serão exibidos.
   */
  const pageRows =
    historyRows.slice(
      startIndex,
      endIndex
    );


  body.innerHTML =
    pageRows.map(
      (row, index) => {

        /*
         * Índice real dentro de historyRows.
         *
         * Isso é fundamental para que o botão
         * de detalhes funcione corretamente
         * em todas as páginas.
         */
        const realIndex =
          startIndex + index;

        const productsCount =
          Number(
            row.total_items || 0
          );

        const totalQuantity =
          Number(
            row.total_quantity || 0
          );

        const totalAmount =
          Number(
            row.total_amount || 0
          );

        let reasonText = '—';

        if (
          !isInflow &&
          row.reason
        ) {
          reasonText =
            reasonLabel(
              row.reason
            );
        }

        if (
          isInflow &&
          row.invoice_number
        ) {
          reasonText =
            `NF: ${escapeHtml(
              row.invoice_number
            )}`;
        }

        return `
          <tr>

            <td>
              #${escapeHtml(row.id)}
            </td>


            <td>
              ${escapeHtml(
                dateTime(
                  row.created_at
                )
              )}
            </td>


            <td>

              <div class="fw-semibold">
                ${productsCount}
                ${
                  productsCount === 1
                    ? 'produto'
                    : 'produtos'
                }
              </div>

              <div class="small text-muted">
                ${getProductsSummary(row)}
              </div>

            </td>


            <td>

              <span
                class="badge ${
                  isInflow
                    ? 'text-bg-success'
                    : 'text-bg-danger'
                }">

                ${
                  isInflow
                    ? '+'
                    : '-'
                }${totalQuantity}

              </span>

            </td>


            <td class="fw-semibold">
              ${currency(totalAmount)}
            </td>


            <td>

              ${reasonText}

              ${
                row.notes
                  ? `
                    <div class="small text-muted">
                      ${escapeHtml(
                        row.notes
                      )}
                    </div>
                  `
                  : ''
              }

            </td>


            <td>

              <div class="action-buttons">

                <button
                  type="button"
                  class="btn btn-sm btn-outline-info movement-details"
                  data-index="${realIndex}"
                  title="Ver detalhes">

                  <i data-feather="eye"></i>

                </button>

              </div>

            </td>

          </tr>
        `;
      }
    ).join('');


  renderPagination();

  if (window.feather) {
    window.feather.replace();
  }
}


/* ============================================================
   PAGINAÇÃO
============================================================ */

function renderPagination() {
  const table =
    document.querySelector(
      '#movements-body'
    )?.closest('table');

  if (!table) return;

  /*
   * Estrutura:
   *
   * card-body
   *   └── table-responsive
   *        └── table
   */

  const cardBody =
    table.parentElement?.parentElement;

  if (!cardBody) return;

  let paginationContainer =
    document.querySelector(
      '#movements-pagination'
    );


  /*
   * Cria o container apenas uma vez.
   */
  if (!paginationContainer) {

    paginationContainer =
      document.createElement('div');

    paginationContainer.id =
      'movements-pagination';

    paginationContainer.className =
      'd-flex flex-wrap justify-content-between align-items-center gap-3 p-3 border-top';

    cardBody.appendChild(
      paginationContainer
    );
  }


  const totalItems =
    historyRows.length;

  const totalPages =
    Math.ceil(
      totalItems /
      ITEMS_PER_PAGE
    );


  /*
   * Nenhum registro.
   */
  if (totalItems === 0) {

    paginationContainer.innerHTML = `
      <div class="small text-muted">
        Mostrando 0 de 0
      </div>
    `;

    return;
  }


  /*
   * Primeiro registro exibido.
   */
  const start =
    (currentPage - 1) *
    ITEMS_PER_PAGE +
    1;


  /*
   * Último registro exibido.
   */
  const end =
    Math.min(
      currentPage *
      ITEMS_PER_PAGE,
      totalItems
    );


  /*
   * Números das páginas.
   */
  let pageButtons = '';

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    pageButtons += `
      <button
        type="button"
        class="btn btn-sm ${
          page === currentPage
            ? 'btn-primary'
            : 'btn-outline-secondary'
        } pagination-btn"
        data-page="${page}">

        ${page}

      </button>
    `;
  }


  paginationContainer.innerHTML = `

    <div class="small text-muted">

      Mostrando
      <strong>${start}</strong>–<strong>${end}</strong>
      de
      <strong>${totalItems}</strong>

    </div>


    <div class="d-flex align-items-center gap-1">

      <!-- ANTERIOR -->

      <button
        type="button"
        class="btn btn-sm btn-outline-secondary pagination-btn"
        data-page="${currentPage - 1}"
        ${
          currentPage === 1
            ? 'disabled'
            : ''
        }>

        <i
          data-feather="chevron-left"
          style="width:16px;height:16px;">
        </i>

        Anterior

      </button>


      <!-- PÁGINAS -->

      ${pageButtons}


      <!-- PRÓXIMA -->

      <button
        type="button"
        class="btn btn-sm btn-outline-secondary pagination-btn"
        data-page="${currentPage + 1}"
        ${
          currentPage === totalPages
            ? 'disabled'
            : ''
        }>

        Próxima

        <i
          data-feather="chevron-right"
          style="width:16px;height:16px;">
        </i>

      </button>

    </div>

  `;

  if (window.feather) {
    window.feather.replace();
  }
}


/* ============================================================
   DETALHES DA MOVIMENTAÇÃO
============================================================ */

function showMovementDetails(index) {
  const row =
    historyRows[index];

  if (!row) return;

  const modalElement =
    document.querySelector(
      '#movement-detail-modal'
    );

  if (!modalElement) return;


  const items =
    Array.isArray(row.items)
      ? row.items
      : [];


  const totalQuantity =
    Number(
      row.total_quantity || 0
    );


  const totalAmount =
    Number(
      row.total_amount || 0
    );


  /*
   * ID CORRETO DO SEU inflows.html:
   *
   * movement-detail-content
   */
  const detailsBody =
    document.querySelector(
      '#movement-detail-content'
    );

  if (!detailsBody) return;


  const reasonText =
    !isInflow && row.reason
      ? reasonLabel(row.reason)
      : '—';


  const invoiceText =
    isInflow &&
    row.invoice_number
      ? escapeHtml(
          row.invoice_number
        )
      : '—';


  detailsBody.innerHTML = `

    <div class="row g-3">


      <div class="col-md-4">

        <div class="detail-label">
          ID
        </div>

        <div class="detail-value">
          #${escapeHtml(row.id)}
        </div>

      </div>


      <div class="col-md-4">

        <div class="detail-label">
          Data/Hora
        </div>

        <div class="detail-value">
          ${escapeHtml(
            dateTime(
              row.created_at
            )
          )}
        </div>

      </div>


      <div class="col-md-4">

        <div class="detail-label">
          Quantidade
        </div>

        <div class="detail-value">
          ${totalQuantity}
        </div>

      </div>


      ${
        isInflow
          ? `
            <div class="col-md-4">

              <div class="detail-label">
                Nota Fiscal
              </div>

              <div class="detail-value">
                ${invoiceText}
              </div>

            </div>
          `
          : `
            <div class="col-md-4">

              <div class="detail-label">
                Motivo
              </div>

              <div class="detail-value">
                ${escapeHtml(
                  reasonText
                )}
              </div>

            </div>
          `
      }


      <div class="col-md-4">

        <div class="detail-label">
          Valor Total
        </div>

        <div class="detail-value price-value">
          ${currency(totalAmount)}
        </div>

      </div>


      ${
        row.notes
          ? `
            <div class="col-12">

              <div class="detail-label">
                Observações
              </div>

              <div class="detail-value">
                ${escapeHtml(
                  row.notes
                )}
              </div>

            </div>
          `
          : ''
      }


      <div class="col-12">

        <hr>

        <h6 class="fw-bold mb-3">
          Produtos
        </h6>


        ${
          items.length > 0
            ? `
              <div class="table-responsive">

                <table class="table table-sm align-middle">

                  <thead>

                    <tr>

                      <th>
                        Produto
                      </th>

                      <th class="text-center">
                        Quantidade
                      </th>

                      <th class="text-end">
                        ${
                          isInflow
                            ? 'Custo Unitário'
                            : 'Preço Unitário'
                        }
                      </th>

                      <th class="text-end">
                        Total
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${items.map(item => {

                      const quantity =
                        Number(
                          item.quantity || 0
                        );

                      const unitPrice =
                        Number(
                          item.unit_price || 0
                        );

                      const itemTotal =
                        quantity *
                        unitPrice;

                      return `
                        <tr>

                          <td>
                            ${escapeHtml(
                              item.product_name
                            )}
                          </td>

                          <td class="text-center">
                            ${quantity}
                          </td>

                          <td class="text-end">
                            ${currency(
                              unitPrice
                            )}
                          </td>

                          <td class="text-end fw-semibold">
                            ${currency(
                              itemTotal
                            )}
                          </td>

                        </tr>
                      `;

                    }).join('')}

                  </tbody>

                </table>

              </div>
            `
            : `
              <div class="text-muted">
                Nenhum produto encontrado.
              </div>
            `
        }

      </div>

    </div>

  `;


  /*
   * Abre o modal de detalhes.
   */
  const modal =
    bootstrap.Modal.getOrCreateInstance(
      modalElement
    );

  modal.show();
}


/* ============================================================
   ENVIO DA MOVIMENTAÇÃO
============================================================ */

async function submitMovement(event) {
  event.preventDefault();

  if (movementSubmitting) return;
  movementSubmitting = true;
  const saveButton = document.querySelector('#save-movement-btn');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
  }

  if (movementItems.length === 0) {

    alertMessage(
      'Adicione pelo menos um produto.',
      'warning'
    );

    movementSubmitting = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
    return;
  }


  const invalidItem =
    movementItems.find(
      item =>
        !item.product_id ||
        Number(item.quantity) <= 0 ||
        Number(item.unit_price) < 0
    );


  if (invalidItem) {

    alertMessage(
      'Preencha corretamente os produtos, quantidades e preços.',
      'warning'
    );

    movementSubmitting = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
    return;
  }


  const form =
    event.target;


  const formData =
    new FormData(form);


  const payload = {

    type:
      movementType,

    items:
      movementItems.map(item => ({
        product_id:
          Number(item.product_id),

        quantity:
          Number(item.quantity),

        unit_price:
          Number(item.unit_price)
      })),

    notes:
      formData.get('notes') || '',

    invoice_number:
      formData.get('invoice_number') || '',

    supplier_id:
      formData.get('supplier_id')
        ? Number(
            formData.get(
              'supplier_id'
            )
          )
        : null,

    reason:
      formData.get('reason') || null

  };


  try {

    const response =
      await fetch(
        MOVEMENTS_API_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(payload)
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {

      throw new Error(
        result.error ||
        'Não foi possível registrar a movimentação.'
      );

    }


    alertMessage(
      isInflow
        ? 'Entrada registrada com sucesso.'
        : 'Saída registrada com sucesso.',
      'success'
    );


    const modalElement =
      document.querySelector(
        '#movement-modal'
      );


    if (modalElement) {

      const modal =
        bootstrap.Modal.getInstance(
          modalElement
        );

      if (modal) {
        modal.hide();
      }

    }


    movementItems = [];

    form.reset();

    currentPage = 1;


    await Promise.all([
      loadProducts(),
      loadHistory()
    ]);


    renderMovementItems();


  } catch (error) {

    console.error(
      'Erro ao registrar movimentação:',
      error
    );


    alertMessage(
      error.message ||
      'Erro ao registrar movimentação.',
      'danger'
    );

  } finally {
    movementSubmitting = false;
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
    }
  }
}


/* ============================================================
   EVENTOS DE CLIQUE
============================================================ */

document.addEventListener(
  'click',
  event => {

    /*
     * ADICIONAR PRODUTO
     */
    const addButton =
      event.target.closest(
        '#add-movement-item, #add-product-btn'
      );


    if (addButton) {

      event.preventDefault();

      addMovementItem();

      return;
    }


    /*
     * REMOVER PRODUTO
     */
    const removeButton =
      event.target.closest(
        '.remove-movement-item'
      );


    if (removeButton) {

      event.preventDefault();

      removeMovementItem(
        removeButton.dataset.itemId
      );

      return;
    }


    /*
     * VER DETALHES
     */
    const detailsButton =
      event.target.closest(
        '.movement-details'
      );


    if (detailsButton) {

      event.preventDefault();

      showMovementDetails(
        Number(
          detailsButton.dataset.index
        )
      );

      return;
    }


    /*
     * PAGINAÇÃO
     */
    const paginationButton =
      event.target.closest(
        '.pagination-btn'
      );


    if (paginationButton) {

      event.preventDefault();


      if (
        paginationButton.disabled
      ) {
        return;
      }


      const page =
        Number(
          paginationButton.dataset.page
        );


      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        return;
      }


      const totalPages =
        Math.ceil(
          historyRows.length /
          ITEMS_PER_PAGE
        );


      if (
        page > totalPages
      ) {
        return;
      }


      currentPage =
        page;


      renderHistory();


      /*
       * Volta para o início da tabela.
       */
      const table =
        document.querySelector(
          '#movements-body'
        )?.closest(
          '.table-responsive'
        );


      if (table) {

        table.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

      }

    }

  }
);


/* ============================================================
   EVENTOS DE CHANGE
============================================================ */

document.addEventListener(
  'change',
  event => {

    if (
      event.target.matches(
        '.movement-product'
      )
    ) {

      handleProductChange(
        event
      );

    }

  }
);


/* ============================================================
   EVENTOS DE INPUT
============================================================ */

document.addEventListener(
  'input',
  event => {

    if (
      event.target.matches(
        '.movement-quantity'
      )
    ) {

      handleQuantityChange(
        event
      );

    }


    if (
      event.target.matches(
        '.movement-unit-price'
      )
    ) {

      handlePriceChange(
        event
      );

    }

  }
);


/* ============================================================
   FORMULÁRIO
============================================================ */

const movementForm =
  document.querySelector(
    '#movement-form'
  );


if (movementForm) {

  movementForm.addEventListener(
    'submit',
    submitMovement
  );

}


/* ============================================================
   PESQUISA / FILTRO
============================================================ */

let searchTimeout = null;

const historySearch =
  document.querySelector(
    '#history-search'
  );


if (historySearch) {

  historySearch.addEventListener(
    'input',
    () => {

      clearTimeout(
        searchTimeout
      );


      /*
       * Ao pesquisar, sempre volta
       * para a primeira página.
       */
      currentPage = 1;


      searchTimeout =
        setTimeout(
          () => {

            loadHistory()
              .catch(error => {

                alertMessage(
                  error.message,
                  'danger'
                );

              });

          },
          350
        );

    }
  );

}


/* ============================================================
   MODAL DE NOVA MOVIMENTAÇÃO
============================================================ */

const movementModal =
  document.querySelector(
    '#movement-modal'
  );


if (movementModal) {

  movementModal.addEventListener(
    'show.bs.modal',
    () => {

      movementItems = [];

      renderMovementItems();


      const form =
        document.querySelector(
          '#movement-form'
        );


      if (form) {
        form.reset();
      }

    }
  );

}


/* ============================================================
   BOTÃO DO TEMA
============================================================ */

const themeToggle =
  document.querySelector(
    '#theme-toggle'
  );


if (themeToggle) {

  themeToggle.addEventListener(
    'click',
    toggleDarkMode
  );

}


/* ============================================================
   RESTAURAR TEMA
============================================================ */

if (
  localStorage.getItem(
    'clothstock-theme'
  ) === 'dark'
) {

  document.body.classList.add(
    'dark-mode'
  );

}


updateThemeButton();


/* ============================================================
   INICIALIZAÇÃO
============================================================ */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    try {

      await Promise.all([
        loadProducts(),
        loadHistory(),
        loadSuppliers()
      ]);


      renderMovementItems();


      if (window.feather) {
        window.feather.replace();
      }


    } catch (error) {

      console.error(
        'Erro ao inicializar página:',
        error
      );


      alertMessage(
        error.message ||
        'Erro ao carregar a página.',
        'danger'
      );

    }

  }
);