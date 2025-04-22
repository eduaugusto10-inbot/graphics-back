// src/routes/dashboardRoutes.js
const express = require("express");
const { calculateDashboardData } = require("../services/kpiCalculator");
const axios = require("axios");

const router = express.Router();

// Define a rota GET para /api/dashboard-data/
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, botId, flowName, server } = req.query;

    // Validação dos parâmetros obrigatórios
    if (!startDate || !endDate || !botId || !flowName || !server) {
      return res.status(400).json({
        error:
          "Todos os parâmetros são obrigatórios: startDate, endDate, botId, flowName e server",
      });
    }

    // Faz a chamada para o endpoint do InBot
    const inbotResponse = await axios.post(
      "https://in.bot/inbot-admin",
      {
        action: "user_variables",
        bot_id: parseInt(botId),
        db_user_bot_server_type: server,
        date1: startDate,
        date2: endDate,
        flow_name: flowName,
        is_ajax: 1,
      },
      {
        headers: {
          "X-InAuth-Token": "inauth-gateway-do-edu",
          "Content-Type": "application/json",
        },
      }
    );

    // Processa os dados recebidos usando as funções do kpiCalculator
    const dashboardData = await calculateDashboardData(inbotResponse.data);

    // Retorna os dados calculados como JSON
    res.json(dashboardData);
  } catch (error) {
    // Em caso de erro no cálculo ou leitura do arquivo
    console.error("Erro na rota /api/dashboard-data:", error);
    res.status(500).json({
      message: "Erro interno do servidor ao buscar dados do dashboard.",
      error: error.message,
    });
  }
});

module.exports = router;
