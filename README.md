# Graphics-Back

API Backend para visualização de dados e métricas de atendimento.

## Requisitos

- Node.js 14+
- npm ou yarn

## Instalação

```bash
# Instalar dependências
npm install
```

## Desenvolvimento

Para executar em ambiente de desenvolvimento com hot-reload:

```bash
npm run dev
```

O servidor será iniciado em http://localhost:3000

## Build e Produção

Para criar um build do projeto:

```bash
npm run build
```

Isso criará uma pasta `dist` com os arquivos necessários para execução.

Para executar em produção:

```bash
# Na raiz do projeto
npm start

# Ou na pasta dist após o build
cd dist
npm install --only=production
npm start
```

## Endpoints

- **GET /api/dashboard-data**: Retorna dados formatados para o dashboard
  - Parâmetros: `startDate`, `endDate`, `botId`, `flowName`, `server`
- **GET /api/flow**: Endpoint para buscar dados de fluxo com filtros
  - Parâmetros: `startDate`, `endDate`, `botId`, `flowName`, `server`

## Variáveis de Ambiente

- `PORT`: Porta onde o servidor será executado (padrão: 3000)
