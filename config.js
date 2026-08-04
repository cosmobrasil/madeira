// Configuração oficial do Questionário de Circularidade v6.
// Fonte metodológica: /Users/pvolkermini/Downloads/v6 - planilha.xlsx
const LOCAL_API_URL = 'http://localhost:3000';
const PRODUCTION_API_URL = 'https://backend-production-878b.up.railway.app';

const isLocalEnvironment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';

const recomendacao = (texto, prioridade) => ({ texto, prioridade });

window.QUESTIONARIO_CONFIG = {
    API_URL: isLocalEnvironment ? LOCAL_API_URL : PRODUCTION_API_URL,
    API_URLS: isLocalEnvironment ? [LOCAL_API_URL] : [PRODUCTION_API_URL, window.location.origin],

    // Perguntas e alternativas da aba "Perguntas" da planilha v6.
    QUESTÕES: [
        {
            id: 1,
            categoria: 'D1 · Origem e tipo de matéria-prima',
            pergunta: 'Qual é a origem e o tipo de matéria-prima adquirida pela empresa para a produção do produto indicado?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Matérias-primas virgens' },
                { valor: 2, label: 'Matérias-primas recicladas' },
                { valor: 3, label: 'Matérias-primas de aproveitamento de resíduos de outros processos' },
                { valor: 4, label: 'Matérias-primas de fontes renováveis' },
                { valor: 5, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 2,
            categoria: 'D2 · Gestão interna de resíduos',
            pergunta: 'Qual é a destinação dos resíduos gerados no processo produtivo do produto indicado?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Aterros sanitários' },
                { valor: 2, label: 'Reciclagem, reuso, reaproveitamento interno' },
                { valor: 3, label: 'Entregamos os resíduos a uma empresa especializada em gestão de resíduos ou geração de energia.' }
            ],
            obrigatoria: true
        },
        {
            id: 3,
            categoria: 'D3 · Fim de vida do produto',
            pergunta: 'Uma vez descartado pelo cliente final, os materiais que compõem o produto podem ser separados ou desmontados para facilitar a destinação adequada?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 4,
            categoria: 'D3 · Fim de vida do produto',
            pergunta: 'Uma vez descartados pelo cliente final, os materiais que compõem o produto podem ser encaminhados para processos de reciclagem?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 5,
            categoria: 'D3 · Fim de vida do produto',
            pergunta: 'Uma vez descartados pelo cliente final, os materiais que compõem o produto são destinados principalmente a aterros sanitários?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' }
            ],
            obrigatoria: true
        },
        {
            id: 6,
            categoria: 'D3 · Fim de vida do produto',
            pergunta: 'Uma vez descartados pelo cliente final, os materiais que compõem o produto podem ser destinados a processos de recuperação de energia?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 7,
            categoria: 'D4 · Vida útil do produto',
            pergunta: 'A empresa ou seus fornecedores testam o produto quanto à durabilidade?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 8,
            categoria: 'D4 · Vida útil do produto',
            pergunta: 'O produto é projetado para ser reparado ou consertado em caso de defeito ou desgaste durante o uso?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 9,
            categoria: 'D4 · Vida útil do produto',
            pergunta: 'Após o descarte pelo cliente final, o produto pode ser reaproveitado ou reutilizado em novos processos produtivos?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 10,
            categoria: 'D5 · Monitoramento e extensão do ciclo de vida do produto',
            pergunta: 'O ciclo de vida do produto é estendido por serviços pós-venda adicionais, como manutenção e orientação de uso?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 11,
            categoria: 'D5 · Monitoramento e extensão do ciclo de vida do produto',
            pergunta: 'O ciclo de vida do produto é rastreado no pós-venda, incluindo informações sobre desempenho ou destinação final?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        },
        {
            id: 12,
            categoria: 'D5 · Monitoramento e extensão do ciclo de vida do produto',
            pergunta: 'A documentação e as informações sobre o produto são acessíveis e fáceis de entender para o consumidor final?',
            tipo: 'radio',
            opcoes: [
                { valor: 1, label: 'Sim' },
                { valor: 2, label: 'Não' },
                { valor: 3, label: 'Não sei / Não se aplica' }
            ],
            obrigatoria: true
        }
    ],

    // Nomes das colunas já existentes no banco compartilhado.
    MAPEAMENTO_RESPOSTAS: {
        1: 'materia_prima',
        2: 'residuos',
        3: 'desmonte',
        4: 'descarte',
        5: 'recuperacao',
        6: 'reciclagem',
        7: 'durabilidade',
        8: 'reparavel',
        9: 'reaproveitavel',
        10: 'ciclo_estendido',
        11: 'ciclo_rastreado',
        12: 'documentacao'
    },

    // Pontos da coluna "Pontos" da matriz v6. Não sei/Não se aplica = 0.
    METODOLOGIA: {
        PONTOS: {
            1: { 1: 0, 2: 2, 3: 3, 4: 2, 5: 0 },
            2: { 1: 0, 2: 2, 3: 2 },
            3: { 1: 2, 2: 0, 3: 0 },
            4: { 1: 2, 2: 0, 3: 0 },
            5: { 1: 0, 2: 2 },
            6: { 1: 1, 2: 0, 3: 0 },
            7: { 1: 2, 2: 0, 3: 0 },
            8: { 1: 2, 2: 0, 3: 0 },
            9: { 1: 2, 2: 0, 3: 0 },
            10: { 1: 2, 2: 0, 3: 0 },
            11: { 1: 2, 2: 0, 3: 0 },
            12: { 1: 2, 2: 0, 3: 0 }
        },
        GRUPOS: {
            INPUT: [1],
            RESIDUOS: [2],
            OUTPUT: [3, 4, 5, 6],
            VIDA: [7, 8, 9],
            MONITORAMENTO: [10, 11, 12]
        },
        // Pesos proporcionais ao máximo de pontos de cada dimensão: 3/24, 2/24, 7/24, 6/24 e 6/24.
        PESOS: {
            INPUT: 3 / 24,
            RESIDUOS: 2 / 24,
            OUTPUT: 7 / 24,
            VIDA: 6 / 24,
            MONITORAMENTO: 6 / 24
        }
    },

    // Recomendação e prioridade por alternativa da matriz v6.
    RECOMENDACOES: {
        1: {
            1: recomendacao('Migrar para matérias-primas recicladas ou de fontes renováveis e mapear fornecedores.', 'Longo prazo'),
            2: recomendacao('Manter e ampliar o uso de matérias-primas de menor impacto.', 'Médio prazo'),
            3: recomendacao('Parabéns, você alcançou a pontuação máxima. Mantenha e amplie o uso de matérias-primas provenientes do aproveitamento de resíduos de outros processos.', 'Médio prazo'),
            4: recomendacao('Manter e ampliar o uso de matérias-primas de menor impacto.', 'Médio prazo'),
            5: recomendacao('Migrar para matérias-primas recicladas ou de fontes renováveis e mapear fornecedores.', 'Longo prazo')
        },
        2: {
            1: recomendacao('Redirecionar os resíduos para reciclagem e reuso.', 'Médio prazo'),
            2: recomendacao('Parabéns, você alcançou a pontuação máxima. Otimize a triagem, a documentação e a rastreabilidade.', 'Médio prazo'),
            3: recomendacao('Manter a destinação adequada dos resíduos e validar a rastreabilidade.', 'Médio prazo')
        },
        3: {
            1: recomendacao('Parabéns, você alcançou a pontuação máxima. Mantenha as práticas e valide a reciclabilidade.', 'Médio prazo'),
            2: recomendacao('Aplicar projeto para desmontagem e separação.', 'Longo prazo'),
            3: recomendacao('Aplicar projeto para desmontagem e separação.', 'Longo prazo')
        },
        4: {
            1: recomendacao('Parabéns, você alcançou a pontuação máxima. Mantenha as práticas e valide a reciclabilidade.', 'Médio prazo'),
            2: recomendacao('Aumentar a reciclabilidade e simplificar as composições.', 'Longo prazo'),
            3: recomendacao('Aumentar a reciclabilidade e simplificar as composições.', 'Longo prazo')
        },
        5: {
            1: recomendacao('Evitar o descarte e priorizar o reuso e a reciclagem.', 'Médio prazo'),
            2: recomendacao('Parabéns, você alcançou a pontuação máxima. Mantenha as práticas e valide a reciclabilidade.', 'Médio prazo')
        },
        6: {
            1: recomendacao('Avaliar alternativas com prioridade para a reciclagem.', 'Médio prazo'),
            2: recomendacao('Avaliar alternativas com prioridade para a reciclagem.', 'Médio prazo'),
            3: recomendacao('Avaliar alternativas com prioridade para a reciclagem.', 'Médio prazo')
        },
        7: {
            1: recomendacao('Reforçar a comunicação sobre durabilidade e reparabilidade.', 'Curto prazo'),
            2: recomendacao('Realizar testes e oferecer garantias de durabilidade.', 'Médio prazo'),
            3: recomendacao('Reforçar a comunicação sobre durabilidade, reparabilidade e conserto.', 'Médio prazo')
        },
        8: {
            1: recomendacao('Disponibilizar peças, guias e suporte técnico para reparo ou conserto.', 'Curto prazo'),
            2: recomendacao('Disponibilizar peças, guias e suporte técnico para reparo ou conserto.', 'Médio prazo'),
            3: recomendacao('Disponibilizar peças, guias e suporte técnico para reparo ou conserto.', 'Médio prazo')
        },
        9: {
            1: recomendacao('Parabéns, você alcançou a pontuação máxima. Reforçar a comunicação sobre durabilidade e reparabilidade.', 'Curto prazo'),
            2: recomendacao('Criar programas de reuso pós-uso.', 'Longo prazo'),
            3: recomendacao('Criar programas de reuso pós-uso.', 'Longo prazo')
        },
        10: {
            1: recomendacao('Parabéns, você alcançou a pontuação máxima. Manter as práticas e validar a reciclabilidade.', 'Médio prazo'),
            2: recomendacao('Implementar serviços pós-venda.', 'Médio prazo'),
            3: recomendacao('Implementar serviços pós-venda.', 'Médio prazo')
        },
        11: {
            1: recomendacao('Parabéns, você alcançou a pontuação máxima. Manter as práticas e validar a reciclabilidade.', 'Médio prazo'),
            2: recomendacao('Implementar QR Code, passaporte digital ou solução equivalente.', 'Médio prazo'),
            3: recomendacao('Implementar QR Code, passaporte digital ou solução equivalente.', 'Médio prazo')
        },
        12: {
            1: recomendacao('Manter as práticas e validar a reciclabilidade.', 'Médio prazo'),
            2: recomendacao('Disponibilizar comunicação técnica acessível ao consumidor.', 'Curto prazo'),
            3: recomendacao('Disponibilizar comunicação técnica acessível ao consumidor.', 'Curto prazo')
        }
    }
};
