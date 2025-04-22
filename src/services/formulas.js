/**
 * Conta as ocorrências de cada valor único da propriedade 'user_variable_key_name'
 * em um array de objetos e retorna o resultado como um array de objetos {name, value}.
 *
 * @param {Array<Object>} dataArray O array de objetos de dados.
 * @returns {Array<Object>} Um array de objetos, onde cada objeto tem a forma { name: string, value: number }.
 *                           'name' é o 'user_variable_key_name' único e 'value' é a sua contagem total.
 *                           Retorna um array vazio se a entrada for inválida ou vazia.
 */
function countOccurrencesByKeyNameAsArray(dataArray) {
  // Verifica se a entrada é um array
  if (!Array.isArray(dataArray)) {
    console.error("Erro: A entrada fornecida não é um array.");
    return []; // Retorna um array vazio em caso de erro
  }

  // 1. Usa reduce para construir o objeto de contagens intermediário
  const countsObject = dataArray.reduce((accumulator, currentItem) => {
    // Verifica se o item atual é um objeto e possui a chave esperada
    if (
      currentItem &&
      typeof currentItem === "object" &&
      currentItem.hasOwnProperty("user_variable_key_name")
    ) {
      const keyName = currentItem.user_variable_key_name; // Pega o nome da chave

      // Incrementa a contagem para essa keyName no acumulador.
      accumulator[keyName] = (accumulator[keyName] || 0) + 1;
    }
    // Itens inválidos ou sem a chave são simplesmente ignorados

    // Retorna o acumulador atualizado
    return accumulator;
  }, {}); // Começa com um objeto vazio

  // 2. Transformar o objeto de contagens em um array de {name, value}
  const resultArray = Object.entries(countsObject).map(([name, value]) => {
    return { name: name, value: value };
  });

  return resultArray;
}

/**
 * Calcula a contagem de cada valor para uma chave específica no array de dados
 * e retorna o resultado como um array de objetos {name, value}.
 * Equivalente à lógica: "count(user_variable_key_value) group by user_variable_key_value where user_variable_key_name == 'targetKeyName'"
 *
 * @param {Array<Object>} dataArray O array de objetos de dados.
 * @param {string} targetKeyName O valor de 'user_variable_key_name' para filtrar (ex: 'possui_av').
 * @returns {Array<Object>} Um array de objetos, onde cada objeto tem a forma { name: string, value: number }.
 *                           'name' é o 'user_variable_key_value' e 'value' é a sua contagem.
 *                           Retorna um array vazio se não houver dados correspondentes.
 */
function calculateGroupedCountsAsArray(dataArray, targetKeyName) {
  // Verifica se a entrada é um array
  if (!Array.isArray(dataArray)) {
    console.error("Erro: A entrada fornecida não é um array.");
    return []; // Retorna um array vazio em caso de erro
  }

  // 1. Filtrar: Pega apenas os itens onde user_variable_key_name é o desejado
  const filteredData = dataArray.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      item.user_variable_key_name === targetKeyName
  );

  // 2. Agrupar e Contar: Usa reduce para criar um objeto de contagens intermediário
  const countsObject = filteredData.reduce((accumulator, currentItem) => {
    // Garante que currentItem e a propriedade existem antes de acessar
    if (currentItem && currentItem.hasOwnProperty("user_variable_key_value")) {
      const value = currentItem.user_variable_key_value; // O valor a ser contado (ex: 'sim', 'nao')

      // Incrementa a contagem para esse valor no acumulador.
      accumulator[value] = (accumulator[value] || 0) + 1;
    }
    return accumulator; // Retorna o acumulador atualizado
  }, {}); // Começa com um objeto vazio

  // 3. Transformar o objeto de contagens em um array de {name, value}
  const resultArray = Object.entries(countsObject).map(([name, value]) => {
    return { name: name, value: value };
  });

  return resultArray;
}

/**
 * Processa os dados do flow e retorna um objeto estruturado com jornadas e detalhes
 * @param {Array<Object>} flowData - Dados recebidos do endpoint de flow
 * @returns {Object} Objeto contendo jornadas e detalhes processados
 */
function processFlowData(flowData) {
  const data = {
    jornadas: [],
    details: [],
  };

  // Processa as jornadas
  const jornadas = countOccurrencesByKeyNameAsArray(flowData);
  data.jornadas.push(jornadas);

  // Processa os detalhes de cada jornada
  jornadas.forEach((jornada) => {
    const valores = calculateGroupedCountsAsArray(flowData, jornada.name);
    if (valores.length < 50) {
      // Limita a quantidade de detalhes para evitar sobrecarga
      data.details.push({ name: jornada.name, values: valores });
    }
  });

  return data;
}

module.exports = {
  countOccurrencesByKeyNameAsArray,
  calculateGroupedCountsAsArray,
  processFlowData,
};
