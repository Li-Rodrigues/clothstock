// api/server.js
const app = require('../src/app');

// Define a porta do ambiente ou padrão 3000
const PORT = process.env.PORT || 3000;

// Se não estiver no ambiente da Vercel (produção serverless), inicia o servidor HTTP local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [ClothStock Server] Rodando com sucesso na porta ${PORT}`);
    console.log(`🌐 Acesse o painel localmente em: http://localhost:${PORT}`);
  });
}

// Exporta a instância do Express para a Vercel gerenciar as requisições serverless
module.exports = app;