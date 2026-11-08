# Trip Planner

Planejador de viagens **100% local**: nada de servidor, banco de dados ou hospedagem paga. Os dados ficam salvos no navegador (localStorage) e você pode exportar e importar backups em JSON.

## Funcionalidades

- **Viagens**: crie, edite, duplique como modelo e exclua viagens (destino, datas, moeda, orçamento, ícone e cor).
- **Roteiro em quadro (estilo kanban)**: uma coluna por dia e mais um banco de **ideias** sem data.
  - Arraste e solte atividades entre os dias e reordene dentro do mesmo dia.
  - Adição rápida: digite `14h Museu do Prado` e o horário já é preenchido; a categoria é sugerida automaticamente.
  - Filtro por categoria, custo por dia, botão para organizar o dia por horário e link do local no Google Maps.
- **Visão geral**: contagem regressiva, progresso do planejamento, resumo dia a dia, próximos passos sugeridos e o que vem a seguir.
- **Passagens** (estilo Google Flights): informe de onde sai (o app lembra) e a busca começa sozinha ao abrir a aba.
  - **Calendário de preços**: o preço mais barato por pessoa em cada dia de ida (3 dias antes e depois); toque num dia para pesquisar de novo.
  - Resultados separados em **Voos**, **Ônibus**, **Carro e outros** e **Pacotes** (passagem + hotel de Decolar, CVC, Hurb, Azul Viagens…), com link e botão para levar ao roteiro ou aos gastos.
  - **Não sabe para onde ir?** Deixe o destino vazio e descreva a viagem em linguagem natural (ex.: "no carnaval, eu e minha namorada, praia tranquila"). A IA entende as datas e as pessoas e sugere destinos com como chegar de avião, ônibus ou carro.
  - Links prontos para pesquisar direto no Google Flights, Skyscanner, Kayak, Decolar, companhias e rodoviárias.
  - Usa a API gratuita do Gemini ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)); a chave fica só no navegador.
- **Gastos**: orçamento × gasto × previsto, divisão entre os viajantes, saldos e o **mínimo de transferências** para acertar as contas, além do gasto por categoria.
- **Checklist da mala**: grupos, itens básicos prontos e progresso.
- **Notas** com salvamento automático.
- **Desfazer** (`Ctrl+Z` ou o botão nas notificações), impressão do roteiro, tema claro/escuro automático e layout responsivo.
- **Backup**: exporte tudo ou uma única viagem em `.json` e importe depois.

## Como rodar

Pré-requisito: Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

O app abre em http://localhost:5173.

> ⚠️ Se a pasta estiver no Google Drive/OneDrive, o `npm install` pode falhar com `EBADF`. Copie o projeto para uma pasta local (ex.: `C:\dev\trip-planner`) para instalar e rodar.

### Versão para abrir sem servidor

```bash
cd frontend
npm run build
```

Depois é só abrir `frontend/dist/index.html` no navegador. Os dados ficam salvos por navegador e por endereço; use **Backup/Importar** para levar suas viagens para outro lugar.

## Stack

React 18 · TypeScript · Vite · React Router, com CSS próprio (sem bibliotecas de UI).

```
frontend/src/
├── store.ts          # estado, persistência local, desfazer e notificações
├── types.ts / utils.ts
├── pages/            # lista de viagens e página da viagem
├── tabs/             # Visão geral, Roteiro, Gastos, Checklist, Notas
└── components/       # modais e campos reutilizáveis
```
