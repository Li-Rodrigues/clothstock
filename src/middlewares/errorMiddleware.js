// src/middlewares/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode >= 500
    ? 'Não foi possível concluir a operação.'
    : (err.message || 'Não foi possível concluir a operação.');

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message
    }
  });
};

module.exports = errorHandler;