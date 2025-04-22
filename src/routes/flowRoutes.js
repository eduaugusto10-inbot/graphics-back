const express = require("express");
const router = express.Router();

/**
 * @route GET /api/flow
 * @description Endpoint para buscar dados de fluxo com filtros
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @param {string} botId - ID do bot
 * @param {string} flowName - Nome do fluxo
 * @param {string} server - Servidor
 */
router.get("/flow", async (req, res) => {
  try {
    const { startDate, endDate, botId, flowName, server } = req.query;

    // Validação dos parâmetros obrigatórios
    if (!startDate || !endDate || !botId || !flowName || !server) {
      return res.status(400).json({
        error:
          "Todos os parâmetros são obrigatórios: startDate, endDate, botId, flowName e server",
      });
    }

    // Validação do formato das datas
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        error: "Formato de data inválido. Use YYYY-MM-DD",
      });
    }

    // Aqui você pode implementar a lógica de negócio para buscar os dados
    // Por exemplo, chamar um serviço que busca no banco de dados

    // Exemplo de resposta
    const response = {
      startDate,
      endDate,
      botId,
      flowName,
      server,
      data: [], // Aqui virão os dados reais
    };
    console.log(response);
    res.json(response);
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

module.exports = router;
