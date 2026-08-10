// src/middlewares/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Erro interno do servidor';

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

module.exports = errorHandler; // ou { errorHandler } dependendo de como foi importado no app.js