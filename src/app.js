// src/app.js
const express = require("express");
const cors = require("cors");
const dashboardRoutes = require("./routes/dashboardRoutes"); // Importa as rotas
const flowRoutes = require("./routes/flowRoutes"); // Importa as rotas de flow

const app = express();
const PORT = process.env.PORT || 3000; // Usa a porta do ambiente ou 3000

// --- Middlewares ---
// Habilita CORS para permitir requisições de qualquer origem
app.use(
  cors({
    origin: "*", // Permite qualquer origem
    methods: ["GET", "POST"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization", "X-InAuth-Token"], // Headers permitidos
    credentials: true, // Permite credenciais
  })
);

// Middleware para parsear JSON (se você precisar de POST requests no futuro)
app.use(express.json());

// --- Rotas ---
app.use("/api/dashboard-data", dashboardRoutes); // Monta as rotas do dashboard no prefixo /api/dashboard-data
app.use("/api", flowRoutes); // Monta as rotas de flow no prefixo /api

// --- Rota de Teste (Opcional) ---
app.get("/", (req, res) => {
  res.send("Servidor do Dashboard está rodando!");
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  console.log(`API disponível em http://localhost:${PORT}/api/dashboard-data`);
  console.log(`API de Flow disponível em http://localhost:${PORT}/api/flow`);
});
