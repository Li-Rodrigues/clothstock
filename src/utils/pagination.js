const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function getPagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const requestedLimit = Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
  const offset = (page - 1) * limit;
  const hasPaging = req.query.page !== undefined || req.query.limit !== undefined;

  return { page, limit, offset, hasPaging };
}

function paginationResponse(page, limit, totalItems, data) {
  return {
    success: true,
    count: data.length,
    totalItems: Number(totalItems),
    data,
    pagination: {
      page,
      limit,
      totalItems: Number(totalItems),
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit)
    }
  };
}

module.exports = { DEFAULT_LIMIT, getPagination, paginationResponse };
