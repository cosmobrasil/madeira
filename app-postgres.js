// Aplicativo do Questionário de Circularidade 2.0 - 2026
// Versão com conexão PostgreSQL Railway e Google Drive silencioso
(() => {
    'use strict';

    // ── Utilitários de resiliência ──────────────────────────────────
    const FETCH_TIMEOUT_MS = 15000;
    const RETRY_MAX = 2;
    const RETRY_DELAY_MS = 1000;

    function fetchComTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }

    async function fetchComRetry(url, options = {}, maxRetries = RETRY_MAX) {
        for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
            try {
                const response = await fetchComTimeout(url, options);
                if (response.ok) return response;
                if (tentativa < maxRetries && response.status >= 500) {
                    console.warn(`⚠️ Tentativa ${tentativa + 1}/${maxRetries + 1} falhou (${response.status}), reenviando...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (tentativa + 1)));
                    continue;
                }
                return response;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Tempo limite excedido. Verifique sua conexão.');
                }
                if (tentativa < maxRetries) {
                    console.warn(`⚠️ Tentativa ${tentativa + 1}/${maxRetries + 1} falhou: ${error.message}, reenviando...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (tentativa + 1)));
                    continue;
                }
                throw new Error(`Falha de conexão: ${error.message}`);
            }
        }
    }

    // Carregar configuração PostgreSQL
    const PG_CONFIG = window.POSTGRES_CONFIG || {};
    const DATABASE_CONFIG = PG_CONFIG.DATABASE_CONFIG || {};
    const REPORT_EMAIL = PG_CONFIG.REPORT_EMAIL || 'ti@cosmobrasil.app';

    const CONFIG = window.QUESTIONARIO_CONFIG || {};
    const LOCAL_API_URL = 'http://localhost:3000';
    const PRODUCTION_API_URL = 'https://backend-production-878b.up.railway.app';

    // Fallbacks defensivos caso config.js não carregue em produção
    const MAP_DEFAULT = {
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
    };

    const MET_DEFAULT = {
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
        PESOS: {
            INPUT: 3 / 24,
            RESIDUOS: 2 / 24,
            OUTPUT: 7 / 24,
            VIDA: 6 / 24,
            MONITORAMENTO: 6 / 24
        }
    };

    const QUESTÕES = Array.isArray(CONFIG.QUESTÕES) ? CONFIG.QUESTÕES : [];

    const elementos = {
        termosScreen: document.getElementById('termosScreen'),
        identificacaoScreen: document.getElementById('identificacaoScreen'),
        questionarioScreen: document.getElementById('questionarioScreen'),
        confirmacaoScreen: document.getElementById('confirmacaoScreen'),
        relatorioScreen: document.getElementById('relatorioScreen'),
        aceitarTermos: document.getElementById('aceitarTermos'),
        btnContinuar: document.getElementById('btnContinuar'),
        btnVoltarTermos: document.getElementById('btnVoltarTermos'),
        formIdentificacao: document.getElementById('formIdentificacao')
    };

    const dados = {
        empresa: {},
        respostas: {},
        questaoAtual: 0
    };

    // Event Listeners
    elementos.aceitarTermos.addEventListener('change', function () {
        elementos.btnContinuar.disabled = !this.checked;
    });

    elementos.btnContinuar.addEventListener('click', () => {
        elementos.termosScreen.classList.add('hidden');
        elementos.identificacaoScreen.classList.remove('hidden');
    });

    elementos.btnVoltarTermos.addEventListener('click', () => {
        elementos.identificacaoScreen.classList.add('hidden');
        elementos.termosScreen.classList.remove('hidden');
    });

    function normalizarCNPJ(valor) {
        return (valor || '').replace(/\D/g, '').slice(0, 14);
    }

    elementos.formIdentificacao.addEventListener('submit', function (e) {
        e.preventDefault();

        const cnpjNormalizado = normalizarCNPJ(document.getElementById('cnpj').value);
        document.getElementById('cnpj').value = cnpjNormalizado;

        dados.empresa = {
            nomeEmpresa: document.getElementById('nomeEmpresa').value || 'não identificado',
            cnpj: cnpjNormalizado,
            nomeResponsavel: document.getElementById('nomeResponsavel').value || 'não identificado',
            cidade: document.getElementById('cidade').value || 'NÃO INFORMADO',
            uf: dados.empresaUf || '',
            celular: document.getElementById('celular').value || '',
            email: document.getElementById('email').value || 'sem-email@cosmobrasil.app',
            setorEconomico: document.getElementById('setorEconomico').value || '',
            produtoAvaliado: document.getElementById('produtoAvaliado').value || 'Não Informado'
        };

        iniciarQuestionario();
    });

    // CNPJ é opcional e não é consultado em nenhuma API externa.
    const inputCNPJ = document.getElementById('cnpj');

    if (inputCNPJ) {
        inputCNPJ.addEventListener('input', () => {
            inputCNPJ.value = normalizarCNPJ(inputCNPJ.value);
        });
    }

    function iniciarQuestionario() {
        elementos.identificacaoScreen.classList.add('hidden');
        elementos.questionarioScreen.classList.remove('hidden');

        dados.questaoAtual = 0;
        renderizarQuestao();
    }

    function renderizarQuestao() {
        const questao = QUESTÕES[dados.questaoAtual];
        const html = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-4xl mx-auto">
                <div class="mb-6">
                    <div class="text-sm text-orange-600 font-semibold mb-2">${questao.categoria}</div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Questão ${questao.id} de ${QUESTÕES.length}</h2>
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-800">${questao.pergunta}</h3>
                    ${questao.subtitulo ? `<p class="text-sm text-gray-600">${questao.subtitulo}</p>` : ''}
                    
                    <form id="formQuestao" class="space-y-3">
                        ${questao.opcoes.map(opcao => `
                            <label class="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer group">
                                <input type="radio" name="resposta" value="${opcao.valor}" required class="mt-1 accent-orange-600">
                                <span class="text-gray-700 group-hover:text-gray-900">${opcao.label}</span>
                            </label>
                        `).join('')}
                    </form>
                    
                    <div class="flex justify-between mt-8 pt-6 border-t border-gray-200">
                        <button id="btnAnterior" class="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors">
                            ← Anterior
                        </button>
                        <button id="btnProximo" form="formQuestao" type="submit" class="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                            ${dados.questaoAtual === QUESTÕES.length - 1 ? 'Finalizar' : 'Próximo →'}
                        </button>
                    </div>
                    
                    <div class="mt-4">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-orange-600 h-2 rounded-full" style="width: ${((dados.questaoAtual + 1) / QUESTÕES.length) * 100}%"></div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 text-center">${dados.questaoAtual + 1} de ${QUESTÕES.length}</p>
                    </div>
                </div>
            </div>
        `;

        elementos.questionarioScreen.innerHTML = html;

        // Event listeners para o formulário
        const formQuestao = document.getElementById('formQuestao');
        formQuestao.addEventListener('submit', function (e) {
            e.preventDefault();
            const resposta = formQuestao.querySelector('input[name="resposta"]:checked').value;
            dados.respostas[questao.id] = parseInt(resposta);
            proximaQuestao();
        });

        const btnAnterior = document.getElementById('btnAnterior');
        if (dados.questaoAtual > 0) {
            btnAnterior.addEventListener('click', questaoAnterior);
        } else {
            btnAnterior.style.display = 'none';
        }
    }

    function proximaQuestao() {
        if (dados.questaoAtual < QUESTÕES.length - 1) {
            dados.questaoAtual++;
            renderizarQuestao();
        } else {
            finalizarQuestionario();
        }
    }

    function questaoAnterior() {
        if (dados.questaoAtual > 0) {
            dados.questaoAtual--;
            renderizarQuestao();
        }
    }

    // Função para conectar ao PostgreSQL e salvar dados VIA API BACKEND
    async function salvarDadosNoPostgreSQL() {
        try {
            console.log('🔄 Enviando dados para o Backend API...');

            // Validar configuração
            const apiUrl = CONFIG.API_URL || PRODUCTION_API_URL;

            // Calcular índices
            const { pontos, totalPossivel, percentual, maturidade, grupos } = calcularPontuacao();
            const perfilCircularidadeMateriais = calcularPerfilCircularidadeMateriais(dados.respostas);

            // Preparar dados do questionário
            const respostasMapeadas = Object.entries(CONFIG.MAPEAMENTO_RESPOSTAS || MAP_DEFAULT).reduce((acc, [id, coluna]) => {
                acc[coluna] = dados.respostas[parseInt(id, 10)] || null;
                return acc;
            }, {});

            // Gerar relatório HTML para envio
            const estagio = classificarEstagio(percentual);
            const recs = gerarRecomendacoes(dados.respostas);
            const potencial = 100 - percentual;
            const dataStr = new Date().toLocaleString('pt-BR');
            const idRelatorio = Math.floor(Math.random() * 1000) + 1;

            const htmlEmail = construirHtmlEmailRelatorio({
                empresa: dados.empresa,
                percentual,
                perfilCircularidadeMateriais,
                estagio,
                grupos,
                recs,
                dataStr,
                idRelatorio,
                pontos,
                totalPossivel,
                potencial
            });

            // Dados completos para o backend
            const payload = {
                empresa: dados.empresa,
                respostas: respostasMapeadas,
                pontuacao: {
                    pontos,
                    percentual,
                    maturidade: perfilCircularidadeMateriais.indice,
                    perfilCircularidadeMateriais: perfilCircularidadeMateriais.indice
                },
                relatorioHtml: htmlEmail
            };

            console.log('📋 Payload preparado:', {
                empresa: payload.empresa.nomeEmpresa,
                apiUrl
            });

            // Envio real para o backend com retry em caso de falha
            const response = await fetchComRetry(`${apiUrl}/api/questionario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                let errorMsg;
                try {
                    errorMsg = JSON.parse(text).error;
                } catch {
                    errorMsg = text || `Erro na API: ${response.status}`;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            console.log('✅ Dados salvos com sucesso via API:', result);

            return {
                success: true,
                driveSaved: result.driveSaved,
                driveUrl: result.driveUrl,
                empresaId: result.empresaId
            };

        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            throw error;
        }
    }

    async function finalizarQuestionario() {
        // Mostrar loading enquanto salva
        mostrarLoading();
        try {
            // Salvar dados via API (PostgreSQL + Drive no backend)
            const result = await salvarDadosNoPostgreSQL();

            if (!result.success) {
                throw new Error('Falha ao salvar dados no backend');
            }

            console.log('Processo de salvamento concluído.');

            if (result.driveSaved) {
                console.log('💾 Relatório salvo no Drive:', result.driveUrl);
            } else {
                console.warn('⚠️ Relatório foi salvo no banco, mas não no Drive (verifique o backend).');
            }

            mostrarConfirmacao(result);

        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            mostrarErro(error.message);
        }
    }

    function mostrarLoading() {
        elementos.questionarioScreen.classList.remove('hidden');
        elementos.confirmacaoScreen.classList.add('hidden');
        elementos.questionarioScreen.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl mx-auto">
                <div class="flex flex-col items-center text-center">
                    <div class="loading-spinner mb-4"></div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Salvando dados...</h2>
                    <p class="text-gray-600">Por favor, aguarde enquanto processamos suas informações.</p>
                </div>
            </div>
        `;
    }

    function mostrarErro(mensagem) {
        elementos.confirmacaoScreen.classList.remove('hidden');
        elementos.confirmacaoScreen.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl mx-auto">
                <div class="text-center">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h2 class="text-3xl font-bold text-red-600 mb-4">Erro ao Salvar</h2>
                    <p class="text-gray-600 mb-6">Ocorreu um erro ao salvar seus dados.</p>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <p class="text-sm text-red-800">${mensagem}</p>
                    </div>
                    <button onclick="window.location.href='index.html'" class="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    function calcularPontuacao() {
        const MET = CONFIG.METODOLOGIA || MET_DEFAULT;
        const r = dados.respostas;
        let pontos = 0;
        let totalPossivel = 0;

        for (let i = 1; i <= 12; i++) {
            const mapa = MET.PONTOS[i] || MET.PONTOS.default;
            const max = Math.max(...Object.values(mapa));
            totalPossivel += max;
            const val = r[i];
            if (val != null && mapa[val] != null) {
                pontos += mapa[val];
            }
        }

        const percentual = totalPossivel > 0 ? Math.round((pontos / totalPossivel) * 100) : 0;

        // Cálculo por grupos para consolidar a leitura do perfil por dimensão
        const grupos = {};
        let somaPesos = 0;
        let somaPonderada = 0;
        for (const [nomeGrupo, ids] of Object.entries(MET.GRUPOS)) {
            const peso = MET.PESOS[nomeGrupo] || 1;
            let ptsGrupo = 0;
            let maxGrupo = 0;
            ids.forEach((qid) => {
                const mapa = MET.PONTOS[qid] || MET.PONTOS.default;
                const max = Math.max(...Object.values(mapa));
                maxGrupo += max;
                const val = r[qid];
                if (val != null && mapa[val] != null) ptsGrupo += mapa[val];
            });
            const percGrupo = maxGrupo > 0 ? Math.round((ptsGrupo / maxGrupo) * 100) : 0;
            grupos[nomeGrupo] = percGrupo;
            somaPesos += peso;
            somaPonderada += percGrupo * peso;
        }
        const maturidade = somaPesos > 0 ? Math.round(somaPonderada / somaPesos) : percentual;

        return { pontos, totalPossivel, percentual, grupos, maturidade };
    }

    function calcularPerfilCircularidadeMateriais(respostas) {
        const MET = CONFIG.METODOLOGIA || MET_DEFAULT;
        const ids = [1, 2, 3, 4, 5, 6, 9];
        let pontos = 0;
        let totalPossivel = 0;

        const scorePergunta = (qid) => {
            const mapa = MET.PONTOS[qid] || {};
            const valor = Number(respostas[qid]);
            if (!Number.isFinite(valor) || mapa[valor] == null) return 0;
            return Number(mapa[valor]);
        };

        const componentes = {};
        ids.forEach((qid) => {
            const mapa = MET.PONTOS[qid] || {};
            const max = Math.max(...Object.values(mapa));
            const pontosQuestao = scorePergunta(qid);
            pontos += pontosQuestao;
            totalPossivel += max;
            componentes[qid] = max > 0 ? Math.round((pontosQuestao / max) * 100) : 0;
        });

        const indice = totalPossivel > 0 ? Math.round((pontos / totalPossivel) * 100) : 0;

        return { indice, componentes };
    }

    function classificarEstagio(percentual) {
        if (percentual >= 75) return 'Alto';
        if (percentual >= 60) return 'Médio/Alto';
        if (percentual >= 45) return 'Médio';
        if (percentual >= 30) return 'Baixo/Médio';
        return 'Baixo';
    }

    function gerarRecomendacoes(r) {
        const rec = {
            INPUT: [], RESIDUOS: [], OUTPUT: [], VIDA: [], MONITORAMENTO: []
        };
        const gruposPorQuestao = {
            1: 'INPUT', 2: 'RESIDUOS', 3: 'OUTPUT', 4: 'OUTPUT', 5: 'OUTPUT', 6: 'OUTPUT',
            7: 'VIDA', 8: 'VIDA', 9: 'VIDA', 10: 'MONITORAMENTO', 11: 'MONITORAMENTO', 12: 'MONITORAMENTO'
        };
        const regras = CONFIG.RECOMENDACOES || {};

        Object.keys(gruposPorQuestao).forEach((qid) => {
            const regra = regras[qid] && regras[qid][r[qid]];
            if (!regra) return;
            const grupo = gruposPorQuestao[qid];
            rec[grupo].push(`[${regra.prioridade}] ${regra.texto}`);
        });

        return rec;
    }

    function formatarNomeGrupo(chave) {
        const nomes = {
            INPUT: 'INPUT',
            RESIDUOS: 'RESÍDUOS',
            OUTPUT: 'OUTPUT',
            VIDA: 'VIDA',
            MONITORAMENTO: 'MONITORAMENTO'
        };
        return nomes[chave] || chave;
    }

    function obterGruposOrdenados(grupos) {
        const ordem = ['INPUT', 'RESIDUOS', 'OUTPUT', 'VIDA', 'MONITORAMENTO'];
        const fonte = grupos || {};
        return ordem
            .filter((chave) => Object.prototype.hasOwnProperty.call(fonte, chave))
            .map((chave) => [chave, fonte[chave]]);
    }

    function gerarSvgIndiceCircularidade(percentual, size = 320) {
        const valor = Math.max(0, Math.min(100, Number(percentual) || 0));
        const centro = size / 2;
        const raio = size * 0.34;
        const espessura = Math.max(14, size * 0.11);
        const circunferencia = 2 * Math.PI * raio;
        const preenchido = (circunferencia * valor) / 100;
        const restante = circunferencia - preenchido;

        return `
            <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Índice de Circularidade">
                <circle cx="${centro}" cy="${centro}" r="${raio}" fill="none" stroke="#dcfce7" stroke-width="${espessura}"></circle>
                <circle
                    cx="${centro}"
                    cy="${centro}"
                    r="${raio}"
                    fill="none"
                    stroke="#c85a16"
                    stroke-width="${espessura}"
                    stroke-linecap="round"
                    stroke-dasharray="${preenchido.toFixed(2)} ${restante.toFixed(2)}"
                    transform="rotate(-90 ${centro} ${centro})"
                ></circle>
                <circle cx="${centro}" cy="${centro}" r="${raio - (espessura * 0.72)}" fill="#ffffff"></circle>
                <text x="${centro}" y="${centro - 6}" text-anchor="middle" font-size="${Math.round(size * 0.13)}" font-weight="700" font-family="Arial, sans-serif" fill="#7c2d12">${valor}%</text>
                <text x="${centro}" y="${centro + 18}" text-anchor="middle" font-size="${Math.round(size * 0.045)}" font-family="Arial, sans-serif" fill="#7c2d12">Índice de Circularidade</text>
            </svg>
        `;
    }

    function construirHtmlEmailRelatorio({ empresa, percentual, perfilCircularidadeMateriais, estagio, grupos, recs, dataStr, idRelatorio, pontos, totalPossivel, potencial }) {
        const gruposOrdenados = obterGruposOrdenados(grupos);
        const graficoSvg = gerarSvgIndiceCircularidade(percentual, 320);
        const pcm = perfilCircularidadeMateriais || { indice: 0, componentes: {} };
        const lista = (arr) => Array.isArray(arr) ? arr.map(i => `<li>${i}</li>`).join('') : '';
        return `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Relatório de Circularidade</title>
          <style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#ffffff;margin:0;padding:24px;}
            .container{max-width:720px;margin:0 auto;}
            h1{font-size:22px;margin:0 0 8px;color:#111827}
            h2{font-size:18px;margin:16px 0 8px;color:#111827}
            p,li{font-size:14px;line-height:1.5;color:#374151}
            .card{border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-top:10px}
            .grid{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px}
            .diag{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center}
            .radar{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:8px}
            .cats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
            .cat{background:#ffffff;border:1px solid #fed7aa;border-radius:8px;padding:8px}
            .cat .name{font-size:11px;color:#9a3412;font-weight:600}
            .cat .val{font-size:18px;color:#9a3412;font-weight:700}
            .badge{display:inline-block;padding:4px 8px;border-radius:6px;background:#fff7ed;color:#9a3412;font-weight:600;font-size:12px}
            .small{font-size:12px;color:#6b7280}
            .footer{margin-top:24px;font-size:12px;color:#9ca3af}
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Relatório de Circularidade</h1>
            <p class="small">ID #${idRelatorio} · Gerado em ${dataStr}</p>
            <div class="card">
              <h2>Empresa</h2>
              <p><strong>Nome:</strong> ${empresa.nomeEmpresa || '-'}<br/>
              <strong>Cidade:</strong> ${empresa.cidade || '-'}<br/>
              <strong>Celular:</strong> ${empresa.celular || '-'}<br/>
              <strong>CNPJ:</strong> ${empresa.cnpj || '-'}<br/>
              <strong>Responsável:</strong> ${empresa.nomeResponsavel || '-'}<br/>
              <strong>E-mail:</strong> ${empresa.email || '-'}<br/>
              <strong>Setor:</strong> ${empresa.setorEconomico || '-'}<br/>
              <strong>Produto:</strong> ${empresa.produtoAvaliado || '-'}</p>
            </div>
            <div class="card">
              <h2>Resultado</h2>
              <p><span class="badge">Índice Global: ${percentual}%</span> · <span class="badge">Perfil de Circularidade de Materiais: ${pcm.indice}%</span> · <span class="badge">Estágio: ${estagio}</span></p>
              <p>Pontuação: ${pontos} de ${totalPossivel} · Potencial de melhoria: ${potencial}%</p>
              <div class="diag">
                <div class="radar">${graficoSvg}</div>
                <div class="cats">
                  ${gruposOrdenados.map(([nome, perc]) => `
                    <div class="cat">
                      <div class="name">${formatarNomeGrupo(nome)}</div>
                      <div class="val">${perc}%</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb;">
                <p style="font-size:12px; margin-bottom:8px; line-height:1.4;"><strong>O que é o Índice Global de Circularidade?</strong><br/>É a pontuação principal que mede o quanto a sua empresa e o seu produto avaliado já incorporam os princípios da Economia Circular na prática. Ele reflete a sua eficiência no uso de matérias-primas renováveis, no prolongamento da vida útil dos produtos e na gestão correta dos resíduos (como reuso ou reciclagem) em todo o ciclo de produção.</p>
                <p style="font-size:12px; margin-bottom:0; line-height:1.4;"><strong>O que é o Perfil de Circularidade de Materiais?</strong><br/>É a síntese da circularidade dos materiais do produto avaliado, combinando a origem da matéria-prima, a gestão de resíduos e os desfechos de fim de vida mais relevantes. O cálculo usa as respostas das questões Q1, Q2, Q3, Q4, Q5, Q6 e Q9 para transformar o questionário em um indicador único, de leitura mais direta para o usuário.</p>
              </div>
            </div>
            <div class="card">
              <h2>Recomendações</h2>
              <p><strong>Entradas</strong></p>
              <ul>${lista(recs.INPUT)}</ul>
              <p><strong>Resíduos</strong></p>
              <ul>${lista(recs.RESIDUOS)}</ul>
              <p><strong>Saídas</strong></p>
              <ul>${lista(recs.OUTPUT)}</ul>
              <p><strong>Vida Útil & Pós-venda</strong></p>
              <ul>${lista(recs.VIDA)}</ul>
              <p><strong>Monitoramento</strong></p>
              <ul>${lista(recs.MONITORAMENTO)}</ul>
            </div>
            <p class="footer">Este relatório foi gerado automaticamente pelo CosmoBrasil 2.1 - Pré-Diagnóstico de Circularidade 2026 - Madeira - Moda - Náutica.</p>
          </div>
        </body>
        </html>`;
    }

    function mostrarConfirmacao(driveResult = null) {
        elementos.questionarioScreen.classList.add('hidden');
        elementos.confirmacaoScreen.classList.remove('hidden');

        elementos.confirmacaoScreen.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-3xl mx-auto">
                <div class="text-center">
                    <div class="text-6xl mb-4">✅</div>
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Questionário Concluído!</h2>
                    <p class="text-gray-600 mb-6">Obrigado por participar do pré-diagnóstico de circularidade.</p>
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6 text-left">
                        <h3 class="font-bold text-orange-900 mb-3">Próximos Passos:</h3>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Os dados foram salvos com sucesso no banco PostgreSQL</li>
                            <li>• Relatório gerado e processado</li>
                            <li>• Dashboard de análise estará disponível em breve</li>
                        </ul>
                    </div>
                    <div class="flex justify-center gap-3">
                        <button id="btnVerRelatorio" class="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                            Ver Relatório
                        </button>
                        <button onclick="window.location.href='index.html'" class="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        `;

        const btnVerRelatorio = document.getElementById('btnVerRelatorio');
        if (btnVerRelatorio) {
            btnVerRelatorio.addEventListener('click', mostrarRelatorio);
        }
    }

    async function mostrarRelatorio() {
        elementos.confirmacaoScreen.classList.add('hidden');
        elementos.relatorioScreen.classList.remove('hidden');
        const { pontos, totalPossivel, percentual, grupos } = calcularPontuacao();
        const perfilCircularidadeMateriais = calcularPerfilCircularidadeMateriais(dados.respostas);
        const potencial = 100 - percentual;
        const empresa = dados.empresa || {};
        const data = new Date();
        const dataStr = data.toLocaleString('pt-BR');
        const idRelatorio = Math.floor(Math.random() * 1000) + 1;
        const estagio = classificarEstagio(percentual);
        const recs = gerarRecomendacoes(dados.respostas);
        const gruposOrdenados = obterGruposOrdenados(grupos);
        const graficoIndiceSvg = gerarSvgIndiceCircularidade(percentual, 360);

        elementos.relatorioScreen.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-8 max-w-4xl mx-auto">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-900">Relatório Completo de Circularidade 2.0</h2>
                    <p class="text-sm text-gray-500">ID do Relatório: <span class="font-mono">#${idRelatorio}</span> · Gerado em ${dataStr}</p>
                </div>
                <div class="grid md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 class="font-semibold text-slate-900 mb-2">Empresa</h3>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Nome:</span> ${empresa.nomeEmpresa || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Cidade:</span> ${empresa.cidade || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Celular:</span> ${empresa.celular || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">CNPJ:</span> ${empresa.cnpj || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Responsável:</span> ${empresa.nomeResponsavel || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">E-mail:</span> ${empresa.email || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Setor:</span> ${empresa.setorEconomico || '-'} </p>
                        <p class="text-sm text-slate-700"><span class="font-semibold">Produto:</span> ${empresa.produtoAvaliado || '-'} </p>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h3 class="font-semibold text-emerald-900 mb-2">Resultado do Diagnóstico</h3>
                        <p class="text-sm text-emerald-800">Pontuação Total: <span class="font-bold">${pontos}</span> de ${totalPossivel} pontos</p>
                        <p class="text-sm text-emerald-800">Índice de Circularidade: <span class="font-bold">${percentual}%</span></p>
                        <p class="text-sm text-emerald-800">Perfil de Circularidade de Materiais: <span class="font-bold">${perfilCircularidadeMateriais.indice}%</span></p>
                        <p class="text-sm text-emerald-800">Estágio: <span class="font-bold">${estagio}</span></p>
                        <div class="mt-4 grid md:grid-cols-2 gap-4 items-center">
                            <div class="bg-white border border-emerald-200 rounded-lg p-2">
                                ${graficoIndiceSvg}
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${gruposOrdenados.map(([nome, perc]) => `
                                    <div class="text-center bg-white border border-emerald-200 rounded-lg p-2">
                                        <div class="text-xs text-emerald-700 font-semibold">${formatarNomeGrupo(nome)}</div>
                                        <div class="text-xl font-bold text-emerald-700">${perc}%</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <p class="text-xs text-emerald-700 mt-3 text-center">Circularidade alcançada: ${percentual}% · Potencial de melhoria: ${potencial}%</p>
                        
                        <div class="mt-4 pt-4 border-t border-emerald-200">
                            <h4 class="text-sm font-bold text-emerald-900 mb-1">O que é o Índice Global de Circularidade?</h4>
                            <p class="text-xs text-emerald-800 mb-3">É a pontuação principal que mede o quanto a sua empresa e o seu produto avaliado já incorporam os princípios da Economia Circular na prática. Ele reflete a sua eficiência no uso de matérias-primas renováveis, no prolongamento da vida útil dos produtos e na gestão correta dos resíduos (como reuso ou reciclagem) em todo o ciclo de produção.</p>
                            
                            <h4 class="text-sm font-bold text-emerald-900 mb-1">O que é o Perfil de Circularidade de Materiais?</h4>
                            <p class="text-xs text-emerald-800">É a síntese da circularidade dos materiais do produto avaliado, combinando a origem da matéria-prima, a gestão de resíduos e os desfechos de fim de vida mais relevantes. O cálculo usa as respostas das questões Q1, Q2, Q3, Q4, Q5, Q6 e Q9 para transformar o questionário em um indicador único, de leitura mais direta para o usuário.</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-6">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">Recomendações Personalizadas</h3>
                        <div class="mt-3 grid md:grid-cols-2 gap-4">
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 class="font-semibold text-blue-900 mb-2">Entradas</h4>
                                <ul class="text-sm text-blue-800 space-y-1">
                                    ${recs.INPUT.map(item => `<li>• ${item}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 class="font-semibold text-orange-900 mb-2">Resíduos</h4>
                                <ul class="text-sm text-orange-800 space-y-1">
                                    ${recs.RESIDUOS.map(item => `<li>• ${item}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <h4 class="font-semibold text-indigo-900 mb-2">Saídas</h4>
                                <ul class="text-sm text-indigo-800 space-y-1">
                                    ${recs.OUTPUT.map(item => `<li>• ${item}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                <h4 class="font-semibold text-teal-900 mb-2">Vida Útil & Pós-venda</h4>
                                <ul class="text-sm text-teal-800 space-y-1">
                                    ${recs.VIDA.map(item => `<li>• ${item}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 md:col-span-2">
                                <h4 class="font-semibold text-slate-900 mb-2">Monitoramento</h4>
                                <ul class="text-sm text-slate-800 space-y-1">
                                    ${recs.MONITORAMENTO.map(item => `<li>• ${item}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-gray-900">Observações Técnicas</h3>
                        <p class="text-sm text-gray-700">Este relatório é gerado automaticamente com base nas respostas fornecidas no pré-diagnóstico. Recomenda-se validação técnica para decisões estratégicas.</p>
                    </div>
                </div>
                <div class="mt-8 flex justify-between">
                    <button id="btnVoltarConfirmacao" class="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400">← Voltar</button>
                    <div class="flex gap-2">
                        <button id="btnExportarPDF" class="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">Exportar PDF</button>
                        <button id="btnBaixarHTML" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Baixar HTML</button>
                    </div>
                </div>
            </div>
        `;

        const btnVoltar = document.getElementById('btnVoltarConfirmacao');
        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                elementos.relatorioScreen.classList.add('hidden');
                elementos.confirmacaoScreen.classList.remove('hidden');
            });
        }

        const btnPDF = document.getElementById('btnExportarPDF');
        if (btnPDF) {
            btnPDF.addEventListener('click', exportarRelatorioPDF);
        }
        const btnHTML = document.getElementById('btnBaixarHTML');
        if (btnHTML) {
            btnHTML.addEventListener('click', baixarRelatorioHTML);
        }
    }

    function exportarRelatorioPDF() {
        const html = elementos.relatorioScreen.innerHTML;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Circularidade</title><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="style.css"><style>@page{size:A4;margin:20mm;} body{background:#fff;} .no-print{display:none !important;} @media print{button,a{display:none !important;}}</style></head><body class="p-8">${html}</body></html>`);
        win.document.close();
        win.onload = () => {
            win.focus();
            win.print();
        };
    }

    function baixarRelatorioHTML() {
        const htmlConteudo = elementos.relatorioScreen.innerHTML;
        const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Circularidade</title><link rel="stylesheet" href="style.css"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;padding:2rem;max-width:900px;margin:auto;} h2{margin:0 0 0.5rem;} .card{border:1px solid #e5e7eb;border-radius:0.5rem;padding:1rem;margin-bottom:1rem;} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;} .badge{display:inline-block;padding:0.25rem 0.5rem;border-radius:0.375rem;background:#f1f5f9;color:#0f172a;font-weight:600;font-size:0.75rem;} ul{margin:0;padding-left:1rem;} li{margin:0.25rem 0;}</style></head><body>${htmlConteudo}</body></html>`;
        const blob = new Blob([doc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorio-circularidade.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Inicialização
    console.log('Aplicativo do Questionário 2.0 - 2026 carregado');
    console.log('Total de questões:', QUESTÕES.length);

})();
