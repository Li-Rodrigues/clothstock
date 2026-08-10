// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importação das rotas
const authRoutes = require('./routes/authRoutes');
const brandRoutes = require('./routes/brandRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');

// Importação dos middlewares
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// 1. Middlewares globais de parsing e CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Servir arquivos estáticos do Frontend (HTML, CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, '../public')));

// 3. Definição das rotas da API REST
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// 4. Rota fallback para páginas do Frontend (SPA / Navegação direta)
app.get('*', (req, res, next) => {
  // Se a requisição for para uma rota de API que não existe, passa para o próximo middleware (404/erro)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Rota de API não encontrada.' });
  }
  // Para requisições de página, serve o index.html da pasta public
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 5. Middleware global de tratamento de erros
app.use(errorMiddleware);

module.exports = app;