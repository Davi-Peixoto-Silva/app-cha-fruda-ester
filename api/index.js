// api/index.js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend rodando na Vercel!');
});

// Rota para receber os dados do sorteio
app.post('/api/salvar', (req, res) => {
  const { nome, item, mensagem } = req.body;

  // AQUI ENTRARIA O CÓDIGO DO BANCO DE DADOS
  // Por enquanto, vamos apenas confirmar que recebemos
  console.log(`Recebido: ${nome}, ${item}, ${mensagem}`);

  res.json({ status: 'Sucesso', dados: { nome, item } });
});

// Para a Vercel, precisamos exportar o app
module.exports = app;