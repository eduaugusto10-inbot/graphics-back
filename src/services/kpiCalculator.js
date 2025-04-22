// src/services/kpiCalculator.js
const fs = require("fs").promises; // Usando a versão baseada em Promises
const path = require("path");
const { processFlowData } = require("./formulas");

// Caminho para o arquivo JSON (relativo à raiz do projeto)
const dataFilePath = path.join(__dirname, "..", "..", "data", "kpiData.json");

// --- Funções Auxiliares (reutilizadas do frontend, agora no backend) ---

function findValueInJornadas(jornadasArray, stepName) {
  if (!jornadasArray || !jornadasArray[0]) return 0;
  const step = jornadasArray[0].find((item) => item.name === stepName);
  return step ? step.value : 0;
}

function processDetailsForPieChart(
  detailsArray,
  detailName,
  positiveValueName,
  negativeValueName
) {
  const detail = detailsArray.find((d) => d.name === detailName);
  let positiveCount = 0;
  let negativeCount = 0;
  let otherCount = 0;

  if (detail && detail.values) {
    detail.values.forEach((item) => {
      const itemNameLower = item.name.trim().toLowerCase();
      if (itemNameLower === positiveValueName.toLowerCase()) {
        positiveCount += item.value;
      } else if (itemNameLower === negativeValueName.toLowerCase()) {
        negativeCount += item.value;
      } else {
        // Agrupa outras respostas/cliques (pode precisar de refinamento)
        otherCount += item.value;
      }
    });
  }
  return { positiveCount, negativeCount, otherCount };
}

function processDetailsForCategoryChart(detailsArray, detailName, topN = 8) {
  const detail = detailsArray.find((d) => d.name === detailName);
  const counts = {};
  // Melhorar a robustez: categorias conhecidas e filtro de ruído
  const knownCategories = [
    "dor",
    "implante",
    "estética",
    "ortodontia",
    "não desejo informar",
    "prótese",
    "checkup",
    "emergência",
  ];
  const noise = [
    "fraude de abertura",
    "sim!",
    "alterar",
    "início",
    "agendar uma avaliação",
    "api_unidade1",
  ]; // Exemplo de ruído a ignorar

  if (detail && detail.values) {
    detail.values.forEach((item) => {
      const nameLower = item.name.trim().toLowerCase();
      // Verifica se é uma categoria conhecida E não é ruído
      if (
        knownCategories.includes(nameLower) &&
        !noise.some((n) => nameLower.includes(n)) &&
        item.value > 0
      ) {
        const cleanName =
          nameLower.charAt(0).toUpperCase() + nameLower.slice(1);
        counts[cleanName] = (counts[cleanName] || 0) + item.value;
      }
      // Poderia adicionar lógica para agrupar "Outros" se necessário
    });
  }

  const sortedEntries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const topEntries = sortedEntries.slice(0, topN);

  return {
    labels: topEntries.map((entry) => entry[0]),
    values: topEntries.map((entry) => entry[1]),
  };
}

// --- Funções de Cálculo Principais ---

function calculateMainMetrics(rawData) {
  const totalInteracoes = findValueInJornadas(
    rawData.jornadas,
    "inicio_de_jornada"
  );
  const leadsCapturados = findValueInJornadas(rawData.jornadas, "api_lead");
  const agendamentosRealizados = findValueInJornadas(
    rawData.jornadas,
    "agendamento_realizado"
  );

  const taxaCapturaLead =
    totalInteracoes > 0
      ? parseFloat(((leadsCapturados / totalInteracoes) * 100).toFixed(1))
      : 0;
  const taxaConversaoFinal =
    totalInteracoes > 0
      ? parseFloat(
          ((agendamentosRealizados / totalInteracoes) * 100).toFixed(1)
        )
      : 0;

  return {
    title: "Resumo Geral",
    description: "Visão rápida dos principais indicadores de desempenho.",
    values: {
      totalInteracoes: {
        title: "Total Interações",
        value: totalInteracoes,
        icon: "👥",
      },
      leadsCapturados: {
        title: "Leads Capturados",
        value: leadsCapturados,
        icon: "📋",
        percentual: `${taxaCapturaLead}% do total`,
      },
      agendamentosRealizados: {
        title: "Agendamentos",
        value: agendamentosRealizados,
        icon: "📅",
      },
      taxaConversaoFinal: {
        title: "Conversão Final",
        value: `${taxaConversaoFinal}%`,
        icon: "🎯",
      },
      // Adicionar mais métricas se possível calcular a partir dos dados
    },
  };
}

function calculateFunnelSteps(rawData) {
  const funnelStepsRaw =
    rawData.jornadas && rawData.jornadas[0] ? rawData.jornadas[0] : [];
  const total = findValueInJornadas(rawData.jornadas, "inicio_de_jornada");

  // Mapeamento de nomes técnicos para nomes amigáveis
  const friendlyNames = {
    inicio_de_jornada: "Início",
    maior_de_idade: "Confirmou Maioridade",
    nome_agendamento: "Forneceu Nome",
    "Pergunta se é cliente": "Informou se é Cliente",
    telefone_agendamento: "Forneceu Telefone",
    unidade_nome_e_id: "Selecionou Unidade", // Ajuste conforme o real significado
    api_lead: "Lead Capturado (API)",
    "Passo 11 - Agendamentos - Seleciona Queixa": "Selecionou Queixa",
    "Agendamento - Horário Encontrado": "Recebeu Horário",
    "Passo 13 - Agendamento - Resumo do Agendamento": "Viu Resumo Agend.",
    agendamento_realizado: "Agendou com Sucesso",
    final_de_jornada: "Fim da Jornada",
  };

  const stepOrder = [
    "inicio_de_jornada",
    "maior_de_idade",
    "nome_agendamento",
    "Pergunta se é cliente",
    "telefone_agendamento",
    "unidade_nome_e_id",
    "api_lead",
    "Passo 11 - Agendamentos - Seleciona Queixa",
    "Agendamento - Horário Encontrado",
    "Passo 13 - Agendamento - Resumo do Agendamento",
    "agendamento_realizado",
  ];

  // Filtrar, mapear e ordenar
  const steps = funnelStepsRaw
    .filter((step) => stepOrder.includes(step.name)) // Apenas etapas relevantes
    .map((step) => ({
      name: step.name,
      friendlyName: friendlyNames[step.name] || step.name, // Usa nome amigável ou o original
      value: step.value,
      percentage:
        total > 0 ? parseFloat(((step.value / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => stepOrder.indexOf(a.name) - stepOrder.indexOf(b.name)); // Garante a ordem correta

  return {
    title: "Funil de Conversão",
    description:
      "Acompanhe a jornada do cliente, desde o contato inicial até a conversão.",
    chartTitle: "Funil Detalhado",
    steps: steps,
  };
}

function calculateAgeDistribution(rawData) {
  const { positiveCount, negativeCount, otherCount } =
    processDetailsForPieChart(rawData.details, "maior_de_idade", "Sim", "Não");
  return {
    title: "Perfil por Idade",
    description:
      "Distribuição dos usuários que confirmaram ser maiores ou menores de idade.",
    chartTitle: "Maioridade Declarada",
    values: {
      labels: [
        "Maior de Idade",
        "Menor de Idade",
        "Outras Interações/Não resp.",
      ],
      data: [positiveCount, negativeCount, otherCount],
    },
  };
}

function calculateClientTypeDistribution(rawData) {
  const { positiveCount, negativeCount, otherCount } =
    processDetailsForPieChart(
      rawData.details,
      "Pergunta se é cliente",
      "Sim",
      "Não"
    );
  return {
    title: "Perfil por Tipo de Cliente",
    description:
      "Distribuição dos usuários que se identificaram como clientes existentes ou novos.",
    chartTitle: "Cliente Existente vs Novo",
    values: {
      labels: ["Já é Cliente", "Não é Cliente", "Outras Interações/Não resp."],
      data: [positiveCount, negativeCount, otherCount],
    },
  };
}

function calculateComplaintDistribution(rawData) {
  const { labels, values } = processDetailsForCategoryChart(
    rawData.details,
    "Passo 11 - Agendamentos - Seleciona Queixa",
    8
  );
  return {
    title: "Distribuição de Queixas",
    description:
      "Principais motivos relatados pelos usuários que buscaram agendamento.",
    chartTitle: "Top 8 Queixas Declaradas",
    values: {
      labels: labels,
      data: values,
    },
  };
}

// --- Funções Placeholder (Dados não disponíveis no JSON atual) ---

function calculateTopUnits(rawData) {
  // Lógica seria: Processar dados brutos (não presentes no JSON) para contar agendamentos por unidade.
  console.warn(
    "Dados de unidades não podem ser calculados a partir do JSON fornecido."
  );
  return {
    title: "Top Unidades (Agendamentos)",
    description:
      "Unidades com maior número de agendamentos confirmados (Dados Indisponíveis).",
    chartTitle: "Top Unidades",
    values: { labels: [], data: [] }, // Retorna vazio
    unavailable: true, // Flag indicando indisponibilidade
  };
}

function calculateTimeDistribution(rawData) {
  // Lógica seria: Processar dados brutos com timestamp de agendamento.
  console.warn(
    "Dados de horário de agendamento não podem ser calculados a partir do JSON fornecido."
  );
  return {
    title: "Horários de Agendamento",
    description:
      "Distribuição dos agendamentos por faixa de horário (Dados Indisponíveis).",
    chartTitle: "Agendamentos por Horário",
    values: { labels: [], data: [] },
    unavailable: true,
  };
}

function calculateDayDistribution(rawData) {
  // Lógica seria: Processar dados brutos com timestamp de agendamento ou interação.
  console.warn(
    "Dados de dia da semana não podem ser calculados a partir do JSON fornecido."
  );
  return {
    title: "Dias de Maior Movimento",
    description:
      "Distribuição de agendamentos ou interações por dia da semana (Dados Indisponíveis).",
    chartTitle: "Movimento por Dia da Semana",
    values: {
      labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      data: [0, 0, 0, 0, 0, 0, 0],
    }, // Exemplo com zeros
    unavailable: true,
  };
}

// --- Função Principal de Orquestração ---

async function calculateDashboardData(flowData) {
  try {
    // Se não receber dados do flow, tenta ler do arquivo (mantendo compatibilidade)
    let rawData = flowData;
    if (!flowData) {
      const fileContent = await fs.readFile(dataFilePath, "utf8");
      rawData = JSON.parse(fileContent);
    }

    // Processa os dados do flow usando as funções do formulas.js
    const processedData = processFlowData(rawData);

    // Calcula todas as métricas usando os dados processados
    const mainMetrics = calculateMainMetrics(processedData);
    const funnelSteps = calculateFunnelSteps(processedData);
    const ageDistribution = calculateAgeDistribution(processedData);
    const clientTypeDistribution =
      calculateClientTypeDistribution(processedData);
    const complaintDistribution = calculateComplaintDistribution(processedData);
    const topUnits = calculateTopUnits(processedData);
    const timeDistribution = calculateTimeDistribution(processedData);
    const dayDistribution = calculateDayDistribution(processedData);

    // Converter os dados para o novo formato solicitado
    const cards = [
      {
        titulo: "Total Interações",
        rowStart: 1,
        colStart: 1,
        rowEnd: 2,
        colEnd: 3,
        tipoCalculo: "soma",
        colunasCalculo: ["Interacoes"],
        formato: "inteiro",
        valor: mainMetrics.values.totalInteracoes.value,
        icone: mainMetrics.values.totalInteracoes.icon,
      },
      {
        titulo: "Leads Capturados",
        rowStart: 1,
        colStart: 3,
        rowEnd: 2,
        colEnd: 5,
        tipoCalculo: "soma",
        colunasCalculo: ["Leads"],
        formato: "inteiro",
        valor: mainMetrics.values.leadsCapturados.value,
        icone: mainMetrics.values.leadsCapturados.icon,
        percentual: mainMetrics.values.leadsCapturados.percentual,
      },
      {
        titulo: "Agendamentos",
        rowStart: 1,
        colStart: 5,
        rowEnd: 2,
        colEnd: 7,
        tipoCalculo: "soma",
        colunasCalculo: ["Agendamentos"],
        formato: "inteiro",
        valor: mainMetrics.values.agendamentosRealizados.value,
        icone: mainMetrics.values.agendamentosRealizados.icon,
      },
      {
        titulo: "Conversão Final",
        rowStart: 1,
        colStart: 7,
        rowEnd: 2,
        colEnd: 9,
        tipoCalculo: "percentual",
        colunasCalculo: ["ConversaoFinal"],
        formato: "percentual",
        valor: mainMetrics.values.taxaConversaoFinal.value,
        icone: mainMetrics.values.taxaConversaoFinal.icon,
      },
    ];

    // Preparar o funil de conversão como um gráfico
    const funnelDatasets = [
      {
        label: "Jornada de Conversão",
        data: funnelSteps.steps.map((step) => step.value),
        backgroundColor: generateColors(
          funnelSteps.steps.length,
          "rgba(106, 27, 154, 0.7)"
        ),
      },
    ];

    // Preparar dados de idade
    const ageDatasets = [
      {
        label: "Perfil por Idade",
        data: ageDistribution.values.data,
        backgroundColor: [
          "rgba(106, 27, 154, 0.7)",
          "rgba(255, 152, 0, 0.7)",
          "rgba(158, 158, 158, 0.7)",
        ],
      },
    ];

    // Preparar dados de tipo de cliente
    const clientTypeDatasets = [
      {
        label: "Tipo de Cliente",
        data: clientTypeDistribution.values.data,
        backgroundColor: [
          "rgba(25, 118, 210, 0.7)",
          "rgba(106, 27, 154, 0.7)",
          "rgba(158, 158, 158, 0.7)",
        ],
      },
    ];

    // Preparar dados de queixas
    const complaintsDatasets = [
      {
        label: "Queixas",
        data: complaintDistribution.values.data,
        backgroundColor: generateColors(
          complaintDistribution.values.labels.length,
          "rgba(106, 27, 154, 0.7)"
        ),
      },
    ];

    // Montar as sessões com seus gráficos
    const sessoes = [
      {
        titulo1: "Funil de Conversão",
        titulo2: funnelSteps.title,
        descricao: funnelSteps.description,
        graficos: [
          {
            chartId: "funnelChart",
            titulo: funnelSteps.chartTitle,
            rowStart: 2,
            colStart: 1,
            rowEnd: 4,
            colEnd: 9,
            type: "bar",
            data: {
              labels: funnelSteps.steps.map((step) => step.friendlyName),
              datasets: funnelDatasets,
            },
            options: {
              indexAxis: "y",
              scales: {
                x: { beginAtZero: true, grid: { display: false } },
                y: { grid: { display: false } },
              },
            },
          },
        ],
      },
      {
        titulo1: "Visão Geral do Atendimento",
        titulo2: "Perfil dos Usuários",
        descricao:
          "Entenda o perfil e as necessidades dos clientes que interagem.",
        graficos: [
          {
            chartId: "ageChart",
            titulo: ageDistribution.chartTitle,
            rowStart: 4,
            colStart: 1,
            rowEnd: 6,
            colEnd: 4,
            type: "pie",
            data: {
              labels: ageDistribution.values.labels,
              datasets: ageDatasets,
            },
            options: {},
          },
          {
            chartId: "clientTypeChart",
            titulo: clientTypeDistribution.chartTitle,
            rowStart: 4,
            colStart: 4,
            rowEnd: 6,
            colEnd: 7,
            type: "pie",
            data: {
              labels: clientTypeDistribution.values.labels,
              datasets: clientTypeDatasets,
            },
            options: {},
          },
          {
            chartId: "complaintsChart",
            titulo: complaintDistribution.chartTitle,
            rowStart: 6,
            colStart: 1,
            rowEnd: 8,
            colEnd: 9,
            type: "doughnut",
            data: {
              labels: complaintDistribution.values.labels,
              datasets: complaintsDatasets,
            },
            options: {
              plugins: {
                legend: {
                  position: "right",
                },
              },
            },
          },
        ],
      },
    ];

    // Retornar no novo formato
    return {
      cards: cards,
      sessoes: sessoes,
    };
  } catch (error) {
    console.error("Erro ao calcular dados do dashboard:", error);
    throw error;
  }
}

// Função auxiliar para gerar cores (degradê)
function generateColors(count, baseColor) {
  // Retorna um array de cores com opacidade variável baseado na cor base
  const colors = [];
  const baseOpacity = 0.7;

  for (let i = 0; i < count; i++) {
    // Extrair os componentes da cor base (assumindo formato rgba)
    const match = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (match) {
      const r = match[1];
      const g = match[2];
      const b = match[3];
      // Varia a opacidade com base no índice
      const opacity = baseOpacity - i * 0.05;
      colors.push(`rgba(${r}, ${g}, ${b}, ${opacity > 0.3 ? opacity : 0.3})`);
    } else {
      // Cor padrão se o formato não for reconhecido
      colors.push(baseColor);
    }
  }

  return colors;
}

module.exports = {
  calculateDashboardData,
};
