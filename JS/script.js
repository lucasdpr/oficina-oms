// ==========================================
// SCRIPT.JS - COMPLETO E CORRIGIDO 
// ==========================================

import {
    MOTIVOS_RETIRO,
    CHECKLIST_RECEBIMENTO,
    CHECKLIST_REVISAO,
    CHECKLIST_HIDRAULICA,
    CHECKLIST_FINAL,
    BIBLIOTECA_CHECKLISTS,
    AREAS_OFICINA,
    ABAS_PADRAO_OFICINA,
    CATEGORIAS_ACHADO_QUALIDADE
} from './Core/dados.js';

import {
    BANCO_ATIVOS,
    sincronizarAtivosReaisMCC4,
    salvarPecaNoPython,
    salvarHistoricoNoPython,
    sincronizarRolosReais,
    salvarAjusteRoloNoPython,
    sincronizarHidraulicaReal,
    salvarAjusteHidraulicaNoPython,
    resolverApiBase,
    setOperador as setOperadorBanco
} from './Core/banco.js?v=5';

import {
    HISTORICO_ACOES,
    BANCO_ROLOS,
    BANCO_HIDRAULICA,
    BANCO_MATERIAIS,
    setBancoMateriais,
    OPERADOR_LOGADO,
    setOperadorLogado,
    RASCUNHOS_IDS_ATIVOS,
    setRascunhosIdsAtivos,
    recarregarRolosEHidraulicaLocal,
    MATRICULAS_ADM,
    MATRICULAS_TESTE_FOLHOES,
    MATRICULAS_AUDITORIA,
    OFICINA_AREA_ATUAL,
    setOficinaAreaAtual,
    OFICINA_ATIVIDADES_CACHE,
    setOficinaAtividadesCache,
    OFICINA_FILTRO_STATUS_ATUAL,
    setOficinaFiltroStatusAtual,
    OFICINA_TIPO_ATIVIDADE_ATUAL,
    setOficinaTipoAtividadeAtual,
    OFICINA_FOTO_BASE64,
    setOficinaFotoBase64,
    OFICINA_EDITANDO_ID,
    setOficinaEditandoId,
    OFICINA_EQUIPE_ATUAL,
    setOficinaEquipeAtual
} from './Core/estado.js';

import {
    executarSeguro,
    executarSeguroAsync,
    headersAdmin,
    filtrarPorAreaTecnico,
    rotuloDesgaste,
    getOrdemPadrao,
    calcularDias,
    fetchComRetry,
    animarNumero,
    enviarComFilaOffline,
    mostrarToastDesfazer,
    atividadeEstaAtrasada,
    atividadeAindaNaoComecou
} from './Core/utils.js';

import {
    verificarAcesso,
    ativarAuditoriaSeAutorizado,
    operadorEhAdmDeSistema,
    operadorTecnicoComArea,
    operadorPodeVerNotificacoes,
    ativarCentralNotificacoesSeAutorizado,
    ativarPainelSupervisorSeAutorizado,
    ativarPainelAdmSeAutorizado,
    ativarPainelDevSeAutorizado,
    aplicarRestricaoNavTecnico
} from './Core/permissoes.js';

import {
    atualizarInterfaceUsuario,
    abrirAba
} from './Core/navegacao.js';

import {
    processarAutenticacaoHome,
    entrarComoVisitante
} from './Core/auth.js';

let VEIO_SELECIONADO_PAINEL = "C";
let FILTRO_CRITICOS = false;

let MODO_MODAL_RELATORIO = {};
let ID_HISTORICO_ATUAL = null;

// Busca a lista de rascunhos ativos no back-end, atualiza o cache
// local (RASCUNHOS_IDS_ATIVOS) e re-renderiza "Iniciar Reparo" pra
// esconder quem já foi iniciado. Chamada toda vez que a aba de Reparo
// (ou o atalho do Painel do Técnico) é aberta.
async function atualizarRascunhosAtivos() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/folhao/rascunhos/todos`, { cache: 'no-store' });
        if (!resp.ok) throw new Error("Falha ao buscar rascunhos.");
        const rascunhos = await resp.json();
        setRascunhosIdsAtivos(new Set(rascunhos.map(r => r.equipamento_id)));
    } catch (e) {
        console.error('⚠️ Não consegui atualizar rascunhos ativos (lista "Iniciar Reparo" pode mostrar item já em andamento):', e);
    }
    // 🆕 Reparo pode ter sido "iniciado" só pelo Checklist de Execução,
    // sem nenhum Folhão salvo ainda — sem carregar isso também, esse
    // equipamento continuaria aparecendo em "Iniciar Reparo".
    if (typeof window.carregarExecucoesChecklistAtivas === 'function') {
        await window.carregarExecucoesChecklistAtivas();
    }
    if (typeof renderReparos === 'function') renderReparos();
}
window.atualizarRascunhosAtivos = atualizarRascunhosAtivos;

// (Tema claro/escuro removido do sistema — o botão de troca de tema
// foi retirado da interface e toda a lógica associada [carregarTema,
// toggleTheme, JS/tema.js] foi removida junto. O app roda só no tema
// escuro padrão. toggleSidebar real fica mais abaixo, como
// window.toggleSidebar.)

// (Login, definir senha, finalizar login e modo Visitante agora vêm de
// Core/auth.js)
// ==========================================
// ABRIR ABA - CORRIGIDA E BLINDADA
// ==========================================
// ==========================================
// HISTÓRICO E AUDITORIA
// ==========================================
// 🔧 CORREÇÃO CRÍTICA ("evento de instalação não aparece no Prontuário,
// mesmo com tudo mais certo — Data de Entrada ok, Localização ok"):
// esta função é chamada de forma síncrona, e o envio pro banco
// (salvarHistoricoNoPython) sempre rodou em "fire-and-forget" — chama e
// não espera terminar. Isso é ok na maioria dos casos, mas o Swap
// (iniciarSwapAlocacao) chama registrarHistorico() e, logo em seguida,
// mostra um alert() de sucesso e permite o técnico seguir pra próxima
// tela. Se a internet estiver lenta ou o servidor (Render) estiver
// "acordando" de um período parado (comum no plano free, pode levar uns
// bons segundos), e o técnico trocar de aba/tela rápido demais depois
// do alert, o navegador pode abandonar essa chamada ANTES dela terminar
// — o Swap em si fica salvo certinho (isso já é aguardado com "await"
// em outro lugar), mas o REGISTRO do evento no histórico se perde,
// mesmo aparecendo local na hora (por isso parecia "funcionar" até
// reabrir o Prontuário depois).
//
// Agora registrarHistorico() devolve a Promise do salvamento no banco,
// pra quem chama poder (opcionalmente) usar "await" antes de avisar o
// técnico que terminou — ver iniciarSwapAlocacao() mais abaixo, que
// agora faz exatamente isso nos pontos críticos (entrar/sair de um
// slot). Chamadas antigas que não usam "await" continuam funcionando
// exatamente igual — retornar uma Promise não quebra nada pra quem
// ignora o retorno.
async function registrarHistorico(tag, acao) {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');

    const evento = {
        data: data,
        tag: tag,
        acao: acao,
        responsavel: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema"
    };

    HISTORICO_ACOES.unshift(evento);

    if (HISTORICO_ACOES.length > 2000) {
        HISTORICO_ACOES.pop();
    }

    localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
    renderHistorico();
    if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();

    // 🔧 Antes, o histórico só ficava salvo no localStorage do navegador
    // de cada colaborador — cada um via um histórico diferente, e não
    // dava pra consultar nada pela API. Agora, toda ação registrada aqui
    // também é enviada pro Neon (tabela log_eventos), disponível em
    // GET /api/historico_eventos (com filtro por peca_id).
    if (typeof salvarHistoricoNoPython === 'function') {
        await salvarHistoricoNoPython(evento);
    }
}
window.registrarHistorico = registrarHistorico;

// 🆕 Classifica um evento da Auditoria numa categoria — usada pelos
// botões de filtro (Acessos, Atividades da Oficina, Movimentação de
// Peças, Folhões e Laudos, Estoque e Materiais). Usa a `categoria` que
// o backend já grava quando existe (só "Atividade Oficina" hoje, a
// única confiável de verdade, vinda de registrar_evento_atividade_
// oficina) e padrões de texto pros eventos que nunca tiveram categoria
// própria no banco (login, swap de peça, folhão/laudo, estoque).
// `chave === ''` (ou qualquer chave não reconhecida) = "Todos os
// eventos", sempre true.
function eventoAuditoriaEhDaCategoria(item, chave) {
    switch (chave) {
        case 'acesso':
            return (item.tag || '').toUpperCase() === 'AUTENTICAÇÃO';
        case 'atividade-oficina':
            return item.categoria === 'Atividade Oficina';
        case 'movimentacao-peca':
            return /entrou no slot|saiu do slot|sacad[oa] (do|da|de)|substitu[ií]/i.test(item.acao || '');
        case 'folhao-laudo':
            return item.tipo === 'laudo' || /procedimento conclu[ií]do|laudo pdf/i.test(item.acao || '');
        case 'estoque':
            return /material\s*\[|estoque/i.test(item.acao || '');
        default:
            return true;
    }
}

// Monta o HTML das linhas da tabela de Auditoria a partir de uma lista
// já pronta de "ações" (no formato {data, tag, acao, responsavel,
// dataTimestamp}) + laudos. Extraído de renderHistorico() pra poder ser
// reaproveitado tanto no render instantâneo (local) quanto depois que a
// busca no servidor voltar — ver atualizarHistoricoGlobalComServidor().
//
// `filtroCategoria` (Acessos/Atividades da Oficina/Movimentação de
// Peças/Folhões e Laudos/Estoque, ver botões em app.html) filtra ANTES
// de agrupar por dia — assim só aparecem os dias que de fato tiveram
// aquele tipo de evento, em vez de mostrar todo dia com tudo escondido
// dentro. Clicar no cabeçalho de um dia abre só os eventos daquele dia
// que já passaram pelo filtro.
function montarLinhasHistorico(acoes, laudos, filtroData, filtroCategoria) {
    let todos = [
        ...acoes.map(h => ({
            ...h,
            tipo: 'acao',
            dataTimestamp: h.dataTimestamp !== undefined ? h.dataTimestamp : (() => {
                try {
                    const partes = h.data.split(' ');
                    const dataPartes = partes[0].split('/');
                    const dataStr = dataPartes[2] + '-' + dataPartes[1] + '-' + dataPartes[0];
                    return new Date(dataStr + 'T' + partes[1]).getTime();
                } catch (e) { return 0; }
            })()
        })),
        ...laudos.map(l => ({
            data: l.data,
            tag: l.tag,
            acao: `<i class="fas fa-file-pdf" style="color:var(--danger);"></i> Laudo PDF: ${l.tipo}`,
            responsavel: 'Sistema',
            tipo: 'laudo',
            id: l.id,
            html: l.html,
            dataTimestamp: l.timestamp
        }))
    ];

    todos.sort((a, b) => (b.dataTimestamp || 0) - (a.dataTimestamp || 0));

    if (filtroData) {
        // 🔧 CORREÇÃO ("filtro de 09/09 mostrava registros de 08/09"):
        // `new Date("YYYY-MM-DD")` (o formato que <input type="date">
        // devolve) é interpretado como MEIA-NOITE EM UTC, não no fuso
        // local — em qualquer fuso atrás de UTC (Brasil, UTC-3), isso
        // "vira o dia" pra trás na hora de ler getFullYear/getMonth/
        // getDate de volta. Parseia ano/mês/dia manualmente da string e
        // monta a data direto no fuso local, sem passar pelo UTC.
        const [ano, mes, dia] = filtroData.split('-').map(Number);
        const inicioDia = new Date(ano, mes - 1, dia).getTime();
        const fimDia = inicioDia + 24 * 60 * 60 * 1000;
        todos = todos.filter(item => {
            const ts = item.dataTimestamp || 0;
            return ts >= inicioDia && ts < fimDia;
        });
    }

    // Filtra ANTES de agrupar por dia — só sobram os dias que de fato
    // tiveram algum evento da categoria escolhida (ou tudo, se
    // filtroCategoria for vazio/"todos os eventos").
    if (filtroCategoria) {
        todos = todos.filter(item => eventoAuditoriaEhDaCategoria(item, filtroCategoria));
    }

    if (todos.length === 0) {
        return `<tr><td colspan="4" class="text-center text-muted">Nenhum registro encontrado${filtroCategoria ? ' nessa categoria' : ''}.</td></tr>`;
    }

    // 🆕 Agrupado por dia/sessão e retrátil — só o dia mais recente abre
    // sozinho, o resto começa fechado. Clicar no cabeçalho abre/fecha só
    // aquele dia. Numa lista com meses de histórico, isso evita ter que
    // rolar por semanas de eventos só pra achar um específico.
    const formatarCabecalhoDia = (ts) => {
        if (!ts) return 'Data desconhecida';
        const d = new Date(ts);
        const hoje = new Date();
        const ehHoje = d.toDateString() === hoje.toDateString();
        const rotulo = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        return ehHoje ? `Hoje — ${rotulo}` : rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
    };

    const contagemPorDia = {};
    todos.forEach(item => {
        const chave = item.dataTimestamp ? new Date(item.dataTimestamp).toDateString() : 'desconhecido';
        contagemPorDia[chave] = (contagemPorDia[chave] || 0) + 1;
    });

    const linhas = [];
    let diaAtual = null;
    let contadorDia = 0;
    let grupoIndice = -1;

    todos.forEach(item => {
        const chaveDia = item.dataTimestamp ? new Date(item.dataTimestamp).toDateString() : 'desconhecido';
        if (chaveDia !== diaAtual) {
            diaAtual = chaveDia;
            contadorDia = contagemPorDia[chaveDia] || 0;
            grupoIndice++;
            const abertoPorPadrao = grupoIndice === 0;
            linhas.push(`
                <tr class="linha-cabecalho-dia-auditoria" style="cursor:pointer;" onclick="window.toggleGrupoDiaAuditoria(${grupoIndice}, this)">
                    <td colspan="4" style="background:var(--bg-td); font-weight:700; color:var(--text-accent); padding:8px 12px; border-top:2px solid var(--border);">
                        <i class="fas fa-chevron-${abertoPorPadrao ? 'down' : 'right'}" data-seta-grupo-dia="${grupoIndice}" style="width:12px; display:inline-block;"></i>
                        <i class="fas fa-calendar-day"></i> ${formatarCabecalhoDia(item.dataTimestamp)}
                        <span class="text-muted" style="font-weight:400; font-size:11px;"> — ${contadorDia} evento${contadorDia === 1 ? '' : 's'}</span>
                    </td>
                </tr>
            `);
        }

        const escondida = grupoIndice > 0 ? ' hidden' : '';
        if (item.tipo === 'laudo') {
            linhas.push(`
                <tr data-grupo-dia="${grupoIndice}" class="${escondida.trim()}">
                    <td><small class="text-muted">${item.data}</small></td>
                    <td><span class="ind-card-tag bg-tag">${item.tag}</span></td>
                    <td style="color: var(--text-main);">
                        ${item.acao}
                        <button class="btn-xs-primary" onclick="window.visualizarLaudo('${item.id}')" style="margin-left:8px; color:var(--text-accent);">
                            <i class="fas fa-eye"></i> Ver PDF
                        </button>
                        <button class="btn-xs-primary" onclick="window.excluirLaudo('${item.id}')" style="color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                    <td><small class="text-muted">${item.responsavel}</small></td>
                </tr>
            `);
        } else {
            linhas.push(`
                <tr data-grupo-dia="${grupoIndice}" class="${escondida.trim()}">
                    <td><small class="text-muted">${item.data}</small></td>
                    <td><span class="ind-card-tag bg-tag">${item.tag}</span></td>
                    <td style="color: var(--text-main);">${item.acao}</td>
                    <td><small class="text-muted">${item.responsavel}</small></td>
                </tr>
            `);
        }
    });

    return linhas.join("");
}

// Abre/fecha um dia dentro de uma seção da Auditoria (ver
// montarLinhasHistorico) — todo <tr data-grupo-dia="N"> daquele grupo
// mostra/esconde junto, e a seta do cabeçalho vira pra indicar o estado.
window.toggleGrupoDiaAuditoria = function(grupoIndice, linhaCabecalho) {
    const linhas = document.querySelectorAll(`#historico-table-body tr[data-grupo-dia="${grupoIndice}"]`);
    if (!linhas.length) return;
    const abrindo = linhas[0].classList.contains('hidden');
    linhas.forEach(tr => tr.classList.toggle('hidden', !abrindo));
    const seta = linhaCabecalho ? linhaCabecalho.querySelector(`[data-seta-grupo-dia="${grupoIndice}"]`) : null;
    if (seta) {
        seta.classList.toggle('fa-chevron-down', abrindo);
        seta.classList.toggle('fa-chevron-right', !abrindo);
    }
};

function renderHistorico() {
    const tbody = document.getElementById("historico-table-body");
    if (!tbody) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    if (!MATRICULAS_AUDITORIA.includes(matricula)) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Acesso restrito.</td></tr>`;
        return;
    }

    const filtroData = document.getElementById("filtro-data-historico")?.value || '';

    // Mostra na hora o que já tem local (resposta instantânea, cobre o
    // caso sem internet) — a lista completa e oficial vem logo em
    // seguida do servidor, ver abaixo.
    tbody.innerHTML = montarLinhasHistorico(HISTORICO_ACOES, getLaudosSalvos(), filtroData, FILTRO_CATEGORIA_AUDITORIA);

    // 🔧 CORREÇÃO CRÍTICA ("preciso que apareça TUDO pros dois
    // moderadores, incluindo visitante"): esta função só usava
    // HISTORICO_ACOES — um array que vive no localStorage DE CADA
    // APARELHO. Um moderador abrindo a Auditoria no celular dele só via
    // as ações feitas NAQUELE MESMO aparelho/sessão — qualquer coisa
    // feita por um técnico (ou por um Visitante, que também já registra
    // o nome digitado via registrarHistorico) em OUTRO aparelho nunca
    // aparecia, mesmo estando salva certinho no banco. Agora busca a
    // lista oficial e completa do servidor (mesma rota que o Prontuário
    // individual e o Sinótico 3D já usam) e substitui a tabela por ela.
    atualizarHistoricoGlobalComServidor(filtroData);
}

// Ver correção grande em renderHistorico() logo acima.
async function atualizarHistoricoGlobalComServidor(filtroData) {
    const tbody = document.getElementById("historico-table-body");
    if (!tbody) return;
    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    if (!MATRICULAS_AUDITORIA.includes(matricula)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?limite=500`, { cache: 'no-store' });
        if (!resp.ok) return;
        const eventosServidor = await resp.json();
        if (!Array.isArray(eventosServidor)) return;

        // Enquanto buscava, o moderador pode ter trocado o filtro de
        // data — usa o valor mais atual do campo, não o que foi passado
        // no início da busca.
        const filtroAtual = document.getElementById("filtro-data-historico")?.value || '';

        let acoesDoServidor = eventosServidor.map(e => ({
            data: e.data_hora || '',
            tag: e.peca_id || 'AUTENTICAÇÃO',
            acao: e.acao || '',
            responsavel: e.operador || 'Sistema',
            dataTimestamp: e.data_hora ? new Date(e.data_hora.replace(' ', 'T')).getTime() : 0,
            // 🆕 O backend já grava uma categoria pra alguns eventos (ex:
            // "Atividade Oficina") — antes esse dado chegava e era jogado
            // fora aqui. Repassa pra eventoAuditoriaEhDaCategoria() poder
            // usar o dado real em vez de só adivinhar pelo texto.
            categoria: e.categoria || null
        }));

        // 🔍 Filtro por categoria (Acessos, Atividades da Oficina,
        // Movimentação de Peças, Folhões e Laudos, Estoque) — aplicado
        // dentro de montarLinhasHistorico, ANTES de agrupar por dia, pra
        // só sobrar na tela o dia que de fato teve evento daquele tipo.
        const categoriaAtual = typeof FILTRO_CATEGORIA_AUDITORIA !== 'undefined' ? FILTRO_CATEGORIA_AUDITORIA : '';

        // 🔧 CORREÇÃO ("laudos sumiam da Auditoria assim que a busca do
        // servidor terminava"): esta função sempre substituiu a tabela
        // passando um array VAZIO de laudos pro montarLinhasHistorico —
        // então mesmo quando os laudos eram só locais, eles apareciam só
        // por um instante (na primeira renderização, antes desta busca
        // terminar) e depois somiam. Agora busca os laudos oficiais do
        // servidor também, do mesmo jeito que já faz com os eventos.
        let laudosDoServidor = [];
        try {
            const respLaudos = await fetch(`${apiBase}/api/laudos?limite=200`, { cache: 'no-store' });
            if (respLaudos.ok) {
                const laudosBrutos = await respLaudos.json();
                if (Array.isArray(laudosBrutos)) {
                    laudosDoServidor = laudosBrutos.map(l => ({
                        id: l.id,
                        tag: l.peca_id,
                        tipo: l.tipo,
                        data: l.criado_em || '',
                        responsavel: l.criado_por || 'Sistema',
                        html: l.html,
                        timestamp: l.criado_em ? new Date(l.criado_em.replace(' ', 'T')).getTime() : 0
                    }));
                }
            }
        } catch (eLaudos) {
            console.error('⚠️ Não consegui buscar os laudos do servidor:', eLaudos);
        }

        tbody.innerHTML = montarLinhasHistorico(acoesDoServidor, laudosDoServidor, filtroAtual, categoriaAtual);
    } catch (e) {
        console.error('⚠️ Não consegui buscar a Auditoria completa do servidor (mantendo só o que tinha local):', e);
    }
}


// ==========================================
// PAINEL DE TESTE DE FOLHÕES — só CBK3574 e CSP1869 podem ver
// ==========================================
// 🔒 Restrição fica no JS, não só escondendo com CSS: a tabela de
// equipamentos só é montada (innerHTML preenchido) se a matrícula
// logada bater com uma das autorizadas. Pra qualquer outro colaborador,
// o link do menu nem aparece e a aba fica vazia mesmo se a pessoa tentar
// abrir na unha pelo console.
// (MATRICULAS_TESTE_FOLHOES e MATRICULAS_AUDITORIA agora vêm de Core/estado.js)

function renderPainelDevTeste() {
    const tbody = document.getElementById("dev-teste-table-body");
    if (!tbody) return;

    if (!BANCO_ATIVOS || BANCO_ATIVOS.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento cadastrado.</td></tr>`;
        return;
    }

    const linhas = [...BANCO_ATIVOS]
        .sort((a, b) => (a.tipo || "").localeCompare(b.tipo || "") || (a.id || "").localeCompare(b.id || ""))
        .map(item => `
            <tr>
                <td class="font-code">${item.id}</td>
                <td>${item.tipo || "-"}</td>
                <td>${item.local || "-"}</td>
                <td style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn-outline-neutral" style="padding:4px 12px; font-size:12px;" onclick="window.abrirFolhaoPorTipo('${item.id}')">
                        <i class="fas fa-file-alt"></i> Abrir Folhão
                    </button>
                    <button class="btn-outline-neutral" style="padding:4px 12px; font-size:12px;" onclick="window.previsualizarFolhaoDoReparo('${item.id}')" title="Ver como o Folhão está ficando, sem precisar completar o Checklist de Execução">
                        <i class="fas fa-eye"></i> Pré-visualizar
                    </button>
                </td>
            </tr>
        `).join("");

    tbody.innerHTML = linhas;
}

window.renderPainelDevTeste = renderPainelDevTeste;

// 🆕 Mostra/esconde o botão manual "Ativar Notificações" — só aparece
// quando faz sentido (navegador suporta, ainda não foi concedido, tem
// alguém logado e não é visitante). Some sozinho depois que a pessoa
// concede (ou nega) a permissão.
function atualizarBotaoAtivarNotificacoes() {
    const btn = document.getElementById("btn-ativar-notificacoes");
    if (!btn) return;
    const suportado = ("Notification" in window) && ("serviceWorker" in navigator) && ("PushManager" in window);
    const jaDecidido = suportado && Notification.permission !== "default";
    const visitante = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.visitante);
    const mostrar = suportado && !jaDecidido && !visitante && !!OPERADOR_LOGADO;
    btn.classList.toggle("hidden", !mostrar);
}
window.atualizarBotaoAtivarNotificacoes = atualizarBotaoAtivarNotificacoes;

// (atualizarInterfaceUsuario e aplicarRestricaoNavTecnico agora vêm de
// Core/navegacao.js e Core/permissoes.js)

function calcularKpisGlobais() {
    let criticos = 0, reparo = 0, reserva = 0;

    BANCO_ATIVOS.forEach(a => {
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
        if (pct >= 80 && !a.local.includes("Oficina")) {
            criticos++;
        }
        if (a.local === "Oficina / Reparo") {
            reparo++;
        }
        if (a.local === "Oficina / Reserva" || a.local === "Máquina / Reserva") {
            reserva++;
        }
    });

    animarNumero("kpi-criticos", criticos);
    animarNumero("kpi-reparo", reparo);
    animarNumero("kpi-reserva", reserva);
}
window.calcularKpisGlobais = calcularKpisGlobais;

// (animarNumero agora vem de Core/utils.js)
window.animarNumero = animarNumero;

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================

// FUNÇÃO AUXILIAR PARA GERAR SLOTS MCC 2/3
function gerarSlotsMCC23() {
    const slots = [
        { id: "MOLDE", nome: "Molde Convencional", tipo: "Molde" },
        // 🆕 Mesa Osciladora — provisório, equipamento ainda não existe
        // fisicamente em nenhum veio (ver conversa de cadastro): 1 vaga
        // fixa por veio, ensanduichada entre Molde e Segmento Zero.
        { id: "MESA-OSC", nome: "Mesa Osciladora", tipo: "Mesa Osciladora" },
        { id: "SEG-ZERO", nome: "Segmento Zero", tipo: "Segmento Zero" }
    ];
    for (let i = 1; i <= 6; i++) {
        slots.push({ id: `SEG-${i}`, nome: `Segmento #${i}`, tipo: "Segmento" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-SUP-${i}`, nome: `Cadeira Superior ${i}`, tipo: "Cadeira Superior" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-INF-${i}`, nome: `Cadeira Inferior ${i}`, tipo: "Cadeira Inferior" });
    }
    return slots;
}

// FUNÇÃO AUXILIAR PARA MAPEAR SLOTS LEGADO MCC 2/3
function mapearSlotLegadoMCC23(peca) {
    const tipo = (peca.tipo || "").toUpperCase();
    const id = (peca.id || "").toUpperCase();
    
    if (tipo.includes("MOLDE")) return "MOLDE";
    if (tipo.includes("MESA OSCILADORA")) return "MESA-OSC";
    if (tipo.includes("ZERO") || tipo.includes("SEG-0")) return "SEG-ZERO";

    if (tipo.includes("SEGMENTO") || tipo.includes("SEGMENTO")) {
        const match = id.match(/SEG-?(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 6) return `SEG-${num}`;
        }
    }
    if (tipo.includes("CADEIRA SUPERIOR") || tipo.includes("CAD-SUP")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-SUP-${num}`;
        }
    }
    if (tipo.includes("CADEIRA INFERIOR") || tipo.includes("CAD-INF")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-INF-${num}`;
        }
    }
    return null;
}

// FUNÇÃO PARA GERAR SLOTS MCC 4
function gerarSlotsMCC4() {
    return [
        { id: "MOLDE", nome: "Molde Alta Perf.", tipo: "Molde" },
        // 🆕 Oscilador — provisório, equipamento ainda não existe
        // fisicamente em nenhum veio: pool de 6 unidades (OS1..OS6, 4
        // ativas + 2 reserva) que ocupam estas 2 vagas fixas (Norte/Sul)
        // via Swap, igual as 5 vagas do Bow logo abaixo.
        { id: "OSC-N", nome: "Oscilador Norte", tipo: "Oscilador" },
        { id: "OSC-S", nome: "Oscilador Sul", tipo: "Oscilador" },
        { id: "BENDER", nome: "Dobrador (Bender)", tipo: "Bender" },
        { id: "BOW-1", nome: "Curvo Bow #01", tipo: "Bow" },
        { id: "BOW-2", nome: "Curvo Bow #02", tipo: "Bow" },
        { id: "BOW-3", nome: "Curvo Bow #03", tipo: "Bow" },
        { id: "BOW-4", nome: "Curvo Bow #04", tipo: "Bow" },
        { id: "BOW-5", nome: "Curvo Bow #05", tipo: "Bow" },
        { id: "STR-1", nome: "Endireitador R1", tipo: "Straightener" },
        { id: "STR-2", nome: "Endireitador R2", tipo: "Straightener" },
        { id: "HOR-8", nome: "Segmento Horizontal #08", tipo: "Horizontal" },
        { id: "HOR-9", nome: "Segmento Horizontal #09", tipo: "Horizontal" },
        { id: "HOR-10", nome: "Segmento Horizontal #10", tipo: "Horizontal" },
        { id: "HOR-11", nome: "Segmento Horizontal #11", tipo: "Horizontal" },
        { id: "HOR-12", nome: "Segmento Horizontal #12", tipo: "Horizontal" },
        { id: "HOR-13", nome: "Segmento Horizontal #13", tipo: "Horizontal" },
        { id: "HOR-14", nome: "Segmento Horizontal #14", tipo: "Horizontal" },
        { id: "HOR-15", nome: "Segmento Horizontal #15", tipo: "Horizontal" },
        { id: "HOR-16", nome: "Segmento Horizontal #16", tipo: "Horizontal" },
        { id: "HOR-17", nome: "Segmento Horizontal #17", tipo: "Horizontal" }
    ];
}

// ==========================================================================
// CORREÇÃO DO MAPEAMENTO DE GAVETAS
// ==========================================================================
function mapearSlotLegadoMCC4(peca) {
    const tipoUpper = (peca.tipo || "").toUpperCase();
    const idUpper = (peca.id || "").toUpperCase();
    
    if (tipoUpper.includes("MOLDE")) return "MOLDE";
    if (tipoUpper.includes("BENDER")) return "BENDER";

    if (tipoUpper.includes("OSCILADOR")) {
        if (idUpper.includes("-S") || idUpper.includes("SUL")) return "OSC-S";
        return "OSC-N"; // padrão Norte se não der pra identificar o lado pelo ID
    }

    if (tipoUpper.includes("BOW")) {
        const match = idUpper.match(/BOW-(\d)/);
        if (match) return `BOW-${match[1]}`;
    }
    
    if (tipoUpper.includes("STRAIGHTENER")) {
        if (idUpper.includes("STR-1") || idUpper.includes("R1")) return "STR-1";
        if (idUpper.includes("STR-2") || idUpper.includes("R2")) return "STR-2";
    }
    
    if (tipoUpper.includes("HORIZONTAL")) {
        const match = idUpper.match(/HOR-(\d+)/);
        if (match) return `HOR-${match[1]}`;
    }
    return null;
}

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================
const CONFIGURACOES_MAQUINAS = {
    "C": {
        id: "MCC2_C",
        nome: "Máquina 2 - Veio C",
        mcc: "2",
        veio: "C",
        veioDisplay: "C",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "D": {
        id: "MCC2_D",
        nome: "Máquina 2 - Veio D",
        mcc: "2",
        veio: "D",
        veioDisplay: "D",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "E": {
        id: "MCC3_E",
        nome: "Máquina 3 - Veio E",
        mcc: "3",
        veio: "E",
        veioDisplay: "E",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "F": {
        id: "MCC3_F",
        nome: "Máquina 3 - Veio F",
        mcc: "3",
        veio: "F",
        veioDisplay: "F",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "H": {
        id: "MCC4_H",
        nome: "Máquina 4 - Veio H",
        mcc: "4",
        veio: "H",
        veioDisplay: "H",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    },
    "G": {
        id: "MCC4_G",
        nome: "Máquina 4 - Veio G",
        mcc: "4",
        veio: "G",
        veioDisplay: "G",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    }
};

function getConfiguracaoPorVeio(veio) {
    return CONFIGURACOES_MAQUINAS[veio] || null;
}

let ultimoVeioVisualizado = null;

function mudarVeioVisualizado(veio) {
    VEIO_SELECIONADO_PAINEL = veio;
    document.querySelectorAll('.btn-veio-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.btn-veio-tab').forEach(b => {
        if (b.textContent.includes(`Veio ${veio}`)) {
            b.classList.add('active');
        }
    });
    renderPainelVeios();
    const abaFluxo = document.getElementById('aba-fluxo');
    if (abaFluxo && !abaFluxo.classList.contains('active')) {
        abrirAba(null, 'aba-fluxo');
    }
}

// ==========================================
// RENDERIZAÇÃO DE DADOS VEIOS E ATIVOS
// ==========================================
function renderPainelVeios() {
    const container = document.getElementById("container-fluxo-horizontal-scroll");
    const titulo = document.getElementById("titulo-veio-focado");
    if (!container || !titulo) {
        console.warn("⚠️ Elementos da aba fluxo não encontrados.");
        return;
    }

    const config = getConfiguracaoPorVeio(VEIO_SELECIONADO_PAINEL);
    if (!config) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Configuração não encontrada para o Veio ${VEIO_SELECIONADO_PAINEL}</h3>
                <p>Verifique se a máquina está configurada.</p>
            </div>
        `;
        return;
    }

    titulo.innerHTML = `Sequenciamento Estrutural: <span style="color: var(--text-accent);">${config.nome}</span>`;

    const pecasInstaladas = BANCO_ATIVOS.filter(p => 
        (p.veio === VEIO_SELECIONADO_PAINEL && p.status === "Instalado") || 
        (p.local && p.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) && !p.local.includes("Oficina"))
    );

    const slots = config.slots || [];
    if (slots.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Estrutura da Máquina ${config.nome} em Construção</h3>
                <p>Os slots serão configurados em breve.</p>
            </div>
        `;
        return;
    }

    let htmlSlots = "";

    slots.forEach(slot => {
        let pecaEncontrada = null;

        for (const p of pecasInstaladas) {
            if (p.posicaoFixa && p.posicaoFixa === slot.id) {
                pecaEncontrada = p;
                break;
            }
            if (!p.posicaoFixa && config.mapearSlotLegado) {
                const slotMapeado = config.mapearSlotLegado(p);
                if (slotMapeado === slot.id) {
                    pecaEncontrada = p;
                    break;
                }
            }
        }

        if (pecaEncontrada) {
            const pct = pecaEncontrada.meta > 0 ? (pecaEncontrada.ton / pecaEncontrada.meta) * 100 : 0;
            const corClass = pct >= 80 ? "danger" : pct >= 50 ? "warning" : "success";
            const pctDisplay = pct.toFixed(1);
            const dias = calcularDias(pecaEncontrada);

            // 🆕 Selo de ocorrência de mancal: se a peça tem QUALQUER
            // mancal marcado (quebra de rolamento / vazamento de graxa
            // ou água — gravado em "mancais_ocorrencias", ver
            // Sinotico3d.html), mostra um aviso vermelho piscando no
            // card, pra dar pra ver de longe que tem algo errado sem
            // precisar abrir a peça uma por uma.
            let temOcorrenciaMancal = false;
            try {
                const mapaOcorrencias = JSON.parse(pecaEncontrada.mancais_ocorrencias || '{}');
                temOcorrenciaMancal = Object.values(mapaOcorrencias).some(v => !!v);
            } catch (e) { /* campo vazio/inválido — trata como sem ocorrência */ }

            htmlSlots += `
                <div class="ind-card" style="border-top: 3px solid var(--${corClass}); min-width: 260px; max-width: 300px; background: var(--bg-td); border-radius: var(--radius-md); padding: 16px 18px; transition: all var(--transition-base); ${temOcorrenciaMancal ? 'box-shadow: 0 0 0 2px var(--danger);' : ''}">
                    <div class="flex-between" style="margin-bottom: 4px;">
                        <span class="font-code" style="font-size: 0.9rem; font-weight: 700; color: var(--text-heading);">${pecaEncontrada.id}</span>
                        <span class="bg-tag" style="font-size: 0.55rem;">${pecaEncontrada.tipo}</span>
                    </div>
                    ${temOcorrenciaMancal ? `
                    <div style="display:flex; align-items:center; gap:5px; background: var(--danger-bg); color: var(--danger); border-radius: 4px; padding: 4px 8px; font-size: 0.65rem; font-weight: 700; margin-bottom: 8px;">
                        <i class="fas fa-triangle-exclamation"></i> Ocorrência em mancal — ver Prontuário
                    </div>` : ''}
                    <div class="flex-between" style="margin-bottom: 8px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fas fa-layer-group"></i> ${slot.nome}</span>
                        <span style="font-weight: 700; font-family: var(--font-mono); font-size: 1.1rem; color: var(--${corClass});">${pctDisplay}%</span>
                    </div>
                    <div class="progress-container" style="margin: 4px 0 10px 0;">
                        <div class="progress-bar bg-${corClass}" style="width: ${Math.min(pct, 100)}%; height: 6px; border-radius: 10px;"></div>
                    </div>
                    <div class="flex-between" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 12px;">
                        <span>${rotuloDesgaste(pecaEncontrada.tipo)}: <strong class="font-code" style="color: var(--text-heading);">${Number(pecaEncontrada.ton || 0).toLocaleString('pt-BR')}</strong></span>
                        <span>Lim: <strong class="font-code" style="color: var(--text-heading);">${Number(pecaEncontrada.meta || 0).toLocaleString('pt-BR')}</strong></span>
                        ${pecaEncontrada.tipo === "Oscilador" || pecaEncontrada.tipo === "Mesa Osciladora" ? '' : `<span>Dias: <strong class="font-code" style="color: var(--text-heading);">${dias}</strong></span>`}
                    </div>
                    <div class="flex-between gap-10" style="gap: 8px;">
                        <button class="btn-xs-primary" style="flex: 1; padding: 6px; font-size: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);" onclick="window.abrirHistoricoIndividual('${pecaEncontrada.id}')">
                            <i class="fas fa-book"></i> Prontuário
                        </button>
                        <button class="btn-outline-danger" style="flex: 1; padding: 6px; font-size: 0.65rem; border-radius: var(--radius-sm);" onclick="window.iniciarSaque('${pecaEncontrada.id}')">
                            <i class="fas fa-exchange-alt"></i> Sacar
                        </button>
                    </div>
                </div>
            `;
        } else {
            htmlSlots += `
                <div class="ind-card" style="border: 2px dashed var(--danger); background: var(--danger-bg); min-width: 260px; max-width: 300px; border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 140px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 28px; color: var(--danger); margin-bottom: 8px; opacity: 0.6;"></i>
                    <h4 style="color: var(--danger); font-size: 0.85rem; margin: 0;">${slot.nome}</h4>
                    <p style="color: var(--danger); font-size: 0.65rem; margin: 4px 0 12px 0; opacity: 0.7;">GAVETA VAZIA</p>
                    <button class="btn-premium btn-success" style="padding: 6px 16px; font-size: 0.7rem;" onclick="window.abrirAba(null, 'aba-reservas')">
                        <i class="fas fa-plus"></i> Alocar
                    </button>
                </div>
            `;
        }
    });

    container.innerHTML = htmlSlots;
}

function gerarCardGraficoHTML(a) {
    const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
    const pctFixed = pct.toFixed(1);
    let cor = pct >= 80 ? "var(--danger)" : (pct >= 50 ? "var(--warning)" : "var(--success)");
    const dias = calcularDias(a);

    return `
        <div class="mcc-grafico-card premium-shadow" style="border-top: 3px solid ${cor};">
            <div class="mcc-grafico-header">
                <div class="mcc-grafico-info">
                    <span class="mcc-tag-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="mcc-grafico-porcentagem" style="color:${cor};">${pctFixed}%</div>
            </div>
            <div class="mcc-grafico-pos text-muted">${a.pos || a.posicao || "Única"}</div>
            <div class="ind-gauge-bar premium-bar">
                <div class="ind-gauge-fill" style="width:${Math.min(pct, 100)}%; background:${cor};"></div>
            </div>
            <div class="grafico-legenda" style="margin-bottom: 10px;">
                <span>${rotuloDesgaste(a.tipo)}: <strong>${Math.round(a.ton || 0).toLocaleString()}</strong></span>
                <span>Lim: ${(a.meta || 0).toLocaleString()}</span>
                ${a.tipo === "Oscilador" || a.tipo === "Mesa Osciladora" ? '' : `<span>Dias: <strong>${dias}</strong></span>`}
            </div>
            <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(56,189,248,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="abrirHistoricoIndividual('${a.id}')">
                <i class="fas fa-book-open"></i> Ver Prontuário
            </button>
        </div>`;
}

// ==========================================
// RENDER ATIVOS (COM FILTRO DE CRÍTICOS)
// ==========================================
function renderAtivos() {
    const tbody = document.getElementById("ativos-table-body");
    const filtroEl = document.getElementById("filtro-tipo-ativo");
    if (!tbody || !filtroEl) return;

    // 🔧 MIGRAÇÃO: equipamentos que já estavam instalados num veio antes
    // dessa atualização não tinham "dataEntradaVeio". Pra não zerar a
    // contagem de dias deles, plantamos a data retroativa com base no
    // valor de "dias" que já existia — a partir daqui, o contador passa
    // a andar sozinho, todo santo dia, sem precisar editar nada.
    let precisaSalvarMigracao = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local && a.local.includes("Veio") && !a.local.includes("Oficina") && !a.dataEntradaVeio) {
            const diasAtuais = a.dias || 0;
            a.dataEntradaVeio = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvarMigracao = true;
        }
    });
    if (precisaSalvarMigracao) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    let f = BANCO_ATIVOS.filter(a => (a.local || "").includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
    
    if (FILTRO_CRITICOS) {
        f = f.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            return pct >= 80 && !a.local.includes("Oficina");
        });
        FILTRO_CRITICOS = false;
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> Equipamentos Críticos (≥80%)`;
    } else {
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-cubes"></i> Matriz Operacional Geral`;
    }

    if (filtroEl.value === "Oficina / Reparo") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    } else if (filtroEl.value === "Oficina / Reserva") {
        // 🆕 O filtro "Reserva" agora cobre as DUAS localizações físicas
        // de reserva (Oficina e Máquina) — a coluna "Local" (abaixo)
        // continua mostrando qual das duas é cada peça.
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva" || a.local === "Máquina / Reserva");
    } else if (filtroEl.value !== "TODOS") {
        f = f.filter(a => a.tipo === filtroEl.value);
    }

    f.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    tbody.innerHTML = f.map(a => {
        const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
        const pctFixed = pct.toFixed(1);
        let classe = pct >= 80 ? "reparo" : "operação";
        if (a.local === "Oficina / Reserva" || a.local === "Máquina / Reserva") classe = "reserva";
        else if (a.local === "Oficina / Reparo") classe = "reparo";

        let btnAcao = (a.local || "").includes("Veio")
            ? `<button class="btn-outline-danger" onclick="iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;
        let btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                <td class="font-code text-muted">${a.local || "Não Alocado"}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${calcularDias(a)}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton || 0).toLocaleString()}</td>
                <td class="font-code text-muted">${(a.meta || 0).toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pctFixed}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist} ${btnExcluir}</div></td>
            </tr>`;
    }).join("");
}

// ==========================================
// RENDER REPAROS (AGRUPADO POR MCC E TIPO)
// ==========================================
export function renderReparos() {
    const repBody = document.getElementById("reparos-table-body");
    if (!repBody) return;

    let precisaSalvar = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local === "Oficina / Reparo" && !a.dataReparo) {
            const diasAtuais = a.dias || 0;
            a.dataReparo = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvar = true;
        }
    });
    if (precisaSalvar) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // 🔧 CORREÇÃO ("reparo já iniciado continuava aparecendo em 'Iniciar
    // Reparo'"): equipamento com rascunho salvo (RASCUNHOS_IDS_ATIVOS,
    // atualizado por atualizarRascunhosAtivos()) já está "em andamento"
    // — não faz sentido continuar oferecendo "Iniciar" pra ele também.
    // Agora esses IDs são excluídos daqui e só aparecem na sub-aba
    // "Reparo em Andamento".
    const execucoesAtivas = window.EXECUCOES_CHECKLIST_IDS_ATIVAS || new Set();
    const reparosBrutos = BANCO_ATIVOS.filter(a =>
        a.local === "Oficina / Reparo" && !RASCUNHOS_IDS_ATIVOS.has(a.id) && !execucoesAtivas.has(a.id)
    );
    const { lista: reparos, semArea } = filtrarPorAreaTecnico(reparosBrutos);

    if (semArea) {
        repBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.</td></tr>`;
        return;
    }
    if (reparos.length === 0) {
        repBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
        return;
    }

    const grupos = {};
    reparos.forEach(a => {
        const mcc = a.mcc_compat || "2/3";
        if (!grupos[mcc]) grupos[mcc] = [];
        grupos[mcc].push(a);
    });

    let htmlFinal = "";
    const coresMCC = { "2": "#3b82f6", "3": "#8b5cf6", "4": "#ec4899" };

    Object.keys(grupos).sort().forEach(mcc => {
        const itens = grupos[mcc];
        const tipos = {};
        itens.forEach(a => {
            const tipo = a.tipo || "Outros";
            if (!tipos[tipo]) tipos[tipo] = [];
            tipos[tipo].push(a);
        });

        htmlFinal += `
            <tr style="background: ${coresMCC[mcc] || '#f59e0b'}20; border-top: 3px solid ${coresMCC[mcc] || '#f59e0b'};">
                <td colspan="5" style="padding: 10px 16px; font-weight: 700; color: var(--text-heading); font-size: 15px;">
                    <i class="fas fa-server"></i> MCC ${mcc}
                </td>
            </tr>
        `;

        Object.keys(tipos).sort().forEach(tipo => {
            const lista = tipos[tipo];
            htmlFinal += `
                <tr style="background: var(--bg-th);">
                    <td colspan="5" style="padding: 6px 16px; font-weight: 600; color: var(--text-muted); font-size: 13px; padding-left: 30px;">
                        <i class="fas fa-tag"></i> ${tipo}
                    </td>
                </tr>
            `;
            lista.forEach(a => {
                const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
                const pctFixed = pct.toFixed(1);
                const dias = calcularDias(a);
                htmlFinal += `
                    <tr>
                        <td class="font-code" data-label="TAG" style="padding-left: 45px;">${a.id}</td>
                        <td data-label="Tipo"><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
                        <td data-label="Desgaste">
                            <div class="flex-align-center gap-10">
                                <span class="font-code bold w-40" style="color: var(--text-heading);">${pctFixed}%</span>
                                <div class="ind-gauge-bar premium-bar w-100px">
                                    <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
                                </div>
                            </div>
                        </td>
                        <td data-label="Dias em Reparo" style="font-weight:bold; color:var(--warning);">${dias} dias</td>
                        <td data-label="Ações">
                            <div class="flex-align-center gap-10 action-buttons-mobile" style="flex-wrap:wrap;">
                                <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                                <button class="btn-premium btn-success" onclick="window.iniciarReparoEAbrirChecklist('${a.id}')"><i class="fas fa-play"></i> Iniciar Reparo</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });
    });

    repBody.innerHTML = htmlFinal;

    // 🆕 Dispara em segundo plano a busca do status do Checklist de
    // Execução (% concluído) e se o Folhão já foi salvo, pra cada
    // equipamento visível — os botões já renderizados acima usam o
    // cache; quando a busca voltar, a tabela é redesenhada com o
    // estado real (ver carregarStatusChecklistExecucaoReparo).
    window.carregarStatusChecklistExecucaoReparo(reparos.map(a => a.id));
}

// Checklist de Execução: módulo separado (extraído pra oficina/checklist-execucao.js).
import './Oficina/checklist-execucao.js';


// ==========================================
// FILTRO POR CATEGORIA NA AUDITORIA
// ==========================================
// '' = "Todos os eventos". Qualquer outra chave (ver
// eventoAuditoriaEhDaCategoria) filtra ANTES de agrupar por dia — só o
// dia que teve evento daquela categoria aparece na tela.
let FILTRO_CATEGORIA_AUDITORIA = '';

window.filtrarHistoricoCategoria = function(chaveCategoria, botaoClicado) {
    FILTRO_CATEGORIA_AUDITORIA = chaveCategoria || '';
    document.querySelectorAll('#historico-filtro-acessos .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    const filtroData = document.getElementById("filtro-data-historico")?.value || '';
    atualizarHistoricoGlobalComServidor(filtroData);
};

// ==========================================
// FILTROS MCC
// ==========================================
function renderizarGraficosMCC(mccNumero) {
    const container = document.getElementById(`graficos-mcc${mccNumero}`);
    if (!container) return;

    const divFiltroVeio = document.getElementById(`filtros-veio-mcc${mccNumero}`);
    const veioAtivo = divFiltroVeio ? divFiltroVeio.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    const divFiltroStatus = document.getElementById(`filtros-status-mcc${mccNumero}`);
    const statusAtivo = divFiltroStatus ? divFiltroStatus.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    let filtrados = BANCO_ATIVOS.filter(a => a.local && a.local.includes(`MCC ${mccNumero}`));

    if (veioAtivo && veioAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => a.local && a.local.includes(`Veio ${veioAtivo}`));
    }

    if (statusAtivo && statusAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            if (statusAtivo === 'VERMELHO') return pct >= 80;
            if (statusAtivo === 'AMARELO') return pct >= 50 && pct < 80;
            if (statusAtivo === 'VERDE') return pct < 50;
            return true;
        });
    }

    filtrados.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum equipamento encontrado com a combinação de filtros.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(gerarCardGraficoHTML).join("");
}

// ==========================================
// PRONTUÁRIO INDIVIDUAL (MODAL)
// ==========================================
function abrirHistoricoIndividual(id) {
    ID_HISTORICO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    const tagNome = document.getElementById("hist-tag-nome");
    const tagLocal = document.getElementById("hist-tag-local");
    if (tagNome) tagNome.innerText = item.id;
    if (tagLocal) tagLocal.innerText = item.local || "Não alocado";

    renderizarResumoHistoricoIndividual(item);
    renderizarTabelaHistoricoIndividual(id);
    const modal = document.getElementById("modal-historico-ativo");
    if (modal) modal.classList.remove("hidden");

    // 🔧 Ver correção "PRONTUÁRIO NÃO MOSTRA QUANDO A PEÇA FOI
    // INSTALADA" logo abaixo, em atualizarTabelaHistoricoComServidor().
    // Não usa "await" de propósito: o modal já abre na hora com o que
    // tinha local, e a tabela é substituída assim que o servidor
    // responder, sem travar a abertura do modal.
    atualizarTabelaHistoricoComServidor(id);
    window.carregarFotosNoProntuario(id);
}

// ==============================================================
// RESUMO RÁPIDO DO PRONTUÁRIO (entrada atual, dias, folhões feitos)
// ==============================================================
function renderizarResumoHistoricoIndividual(item) {
    const container = document.getElementById("hist-resumo-cards");
    if (!container) return;

    const formatarData = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR') : "--";

    let cardEntrada, cardDias, iconeDias, corDias;

    if (item.local === "Oficina / Reparo" && item.dataReparo) {
        cardEntrada = formatarData(item.dataReparo);
        iconeDias = "fa-tools";
        corDias = "var(--danger)";
    } else if (item.dataEntradaVeio && item.local && !item.local.includes("Oficina")) {
        // 🔧 Ver correção "Prontuário sem Data de Entrada" em
        // sincronizarAtivosReaisMCC4() (banco.js): quando não existe um
        // registro real (peça antiga, anterior a esse controle), a data
        // mostrada é uma ESTIMATIVA calculada a partir dos dias já
        // acumulados — marca com "~" pra deixar isso claro, em vez de
        // fingir ser uma data exata.
        cardEntrada = (item.dataEntradaEstimada ? "~" : "") + formatarData(item.dataEntradaVeio);
        iconeDias = "fa-industry";
        corDias = "var(--success)";
    } else {
        cardEntrada = "--";
        iconeDias = "fa-question";
        corDias = "var(--text-muted)";
    }

    const dias = typeof calcularDias === 'function' ? calcularDias(item) : (item.dias || 0);
    const statusLabel = item.local === "Oficina / Reparo" ? "Dias em Reparo" : "Dias na Máquina";

    // Conta quantos folhões (laudos de manutenção) já foram feitos nesse
    // equipamento, olhando o histórico global por menções de finalização.
    const historicoItem = HISTORICO_ACOES.filter(h => h.tag === item.id);
    const folhoesFeitos = historicoItem.filter(h => (h.acao || "").toLowerCase().includes("folhão") || (h.acao || "").toLowerCase().includes("laudo")).length;

    // 🔧 REFINAMENTO (Fase R2): chip sólido -- neutro (corDias ==
    // var(--text-muted)) fica com fundo neutro, qualquer cor de status
    // real vira preenchimento sólido com ícone claro por cima.
    const neutro = corDias === 'var(--text-muted)';
    const estiloChip = neutro ? '' : `background:${corDias}; color:#fff;`;

    container.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="${estiloChip}"><i class="fas ${iconeDias}"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${cardEntrada}</h4><p>${item.local === "Oficina / Reparo" ? "Saiu do Veio em" : (item.dataEntradaEstimada ? "Data de Entrada (estimada)" : "Data de Entrada Atual")}</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="${estiloChip}"><i class="fas fa-calendar-day"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${dias}</h4><p>${statusLabel}</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><i class="fas fa-clipboard-check"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${folhoesFeitos}</h4><p>Folhões Concluídos</p></div>
        </div>
    `;

    // 🔁 Quando a peça está em reparo por causa de um Swap (não um saque
    // manual), mostra quem entrou no lugar dela — antes essa informação
    // só existia dentro do texto livre da linha do tempo, difícil de
    // achar rápido.
    const avisoSubstituicao = document.getElementById("hist-aviso-substituicao");
    if (avisoSubstituicao) {
        if (item.local === "Oficina / Reparo" && item.substituidoPor) {
            avisoSubstituicao.innerHTML = `<i class="fas fa-right-left"></i> Substituída por <strong class="font-code">${item.substituidoPor}</strong>`;
            avisoSubstituicao.classList.remove("hidden");
        } else {
            avisoSubstituicao.classList.add("hidden");
        }
    }
}

function fecharModalHistorico() {
    document.getElementById("modal-historico-ativo").classList.add("hidden");
    ID_HISTORICO_ATUAL = null;
    document.getElementById("input-nota-manual").value = "";
}

function renderizarTabelaHistoricoIndividual(id) {
    let tbody = document.getElementById("tabela-historico-individual");
    let historicoFiltrado = HISTORICO_ACOES.filter(h => h.tag === id || h.acao.includes(id));

    if (historicoFiltrado.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
        return;
    }

    const iconePorEvento = (acao) => {
        const a = (acao || "").toLowerCase();
        if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
        if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
        if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
        if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#38bdf8" };
        if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#a855f7" };
        return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
    };

    tbody.innerHTML = historicoFiltrado.map(h => {
        const { icone, cor } = iconePorEvento(h.acao);
        return `
        <tr>
            <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${h.data}</td>
            <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${h.acao}</td>
            <td style="font-size: 11px; color: var(--text-accent);">${h.responsavel || 'Sistema'}</td>
        </tr>`;
    }).join("");
}

// ==============================================================
// 🔧 CORREÇÃO CRÍTICA ("não aparece no Prontuário quando foi
// instalado na máquina"): renderizarTabelaHistoricoIndividual() (acima)
// só lê de HISTORICO_ACOES — um array que vive no localStorage DE CADA
// APARELHO/NAVEGADOR. Toda ação (troca, saque, cadastro...) já era
// enviada certinho pro banco (registrarHistorico -> salvarHistoricoNoPython
// -> tabela log_eventos no Neon), mas o Prontuário nunca ia buscar isso
// de volta — só mostrava o que aquele navegador específico acumulou na
// própria sessão. Resultado: um Swap feito e visto na hora (mesma
// sessão) parecia registrar certo, mas abrir o Prontuário dessa peça
// depois — em outro aparelho, outra sessão, ou depois de limpar o
// site — não mostrava o evento de instalação, só o que sobrou local
// (nesse caso, só o cadastro inicial). A própria aba do Sinótico 3D
// (que roda isolada, sem acesso a esse localStorage) já resolvia isso
// buscando direto do servidor — a correção abaixo faz o Prontuário do
// app principal fazer a mesma coisa.
//
// Fluxo: mostra o que já tem local na hora (resposta instantânea, feito
// em abrirHistoricoIndividual), depois busca a lista oficial do
// servidor e SUBSTITUI a tabela por ela. Se a busca falhar (sem
// internet), mantém o que já estava mostrando em vez de esvaziar.
// ==============================================================
async function atualizarTabelaHistoricoComServidor(id) {
    const tbody = document.getElementById("tabela-historico-individual");
    if (!tbody) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?peca_id=${encodeURIComponent(id)}&limite=200`, { cache: 'no-store' });
        if (!resp.ok) return;
        const eventos = await resp.json();
        if (!Array.isArray(eventos)) return;

        // Enquanto a busca rodava, o técnico pode ter fechado o
        // Prontuário ou aberto o de outra peça — não sobrescreve com um
        // resultado que já não é mais o que está na tela.
        if (ID_HISTORICO_ATUAL !== id) return;

        if (eventos.length === 0) {
            // 🔧 Mensagem mais clara pra peças antigas (da importação
            // original da planilha) que nunca passaram por uma ação
            // registrada pelo sistema (Swap, Saque, cadastro...): em vez
            // de parecer que "faltou registrar algo", explica que o
            // histórico do sistema só começa a partir de quando essa peça
            // passou a ser controlada por aqui.
            const itemAtual = BANCO_ATIVOS.find(a => a.id === id);
            const antigaJaInstalada = itemAtual && itemAtual.local && !itemAtual.local.includes("Oficina") && (itemAtual.dias || 0) > 0;
            tbody.innerHTML = antigaJaInstalada
                ? `<tr><td colspan="3" class="text-center text-muted">Sem eventos registrados pelo sistema — esta peça já estava instalada quando o controle digital começou (histórico anterior não é rastreado).</td></tr>`
                : `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
            return;
        }

        const iconePorEvento = (acao) => {
            const a = (acao || "").toLowerCase();
            if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
            if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
            if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
            if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#38bdf8" };
            if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#a855f7" };
            return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
        };

        // 🔧 CORREÇÃO ("registrei uma Atividade Pendente e não tem como
        // concluir ela no Prontuário"): uma "Atividade Pendente" criada
        // pelo modal de Intervenção vira só uma LINHA de texto no
        // histórico (log_eventos) — diferente das atividades da aba
        // Oficina, que têm status (Pendente/Em Andamento/Concluído) numa
        // tabela própria. Aqui não dá pra adicionar um campo de status
        // sem mudar o banco, então a solução é: quando o evento é da
        // categoria "Atividade Pendente" e ainda não tem uma marcação de
        // conclusão referenciando ele (procurando "(ref #ID)" nos outros
        // eventos dessa peça), mostra um botão "Concluir" que registra um
        // novo evento de conclusão, referenciando o id do original.
        const idsConcluidos = new Set();
        eventos.forEach(ev => {
            const m = (ev.acao || '').match(/\(ref #(\d+)\)/);
            if (m) idsConcluidos.add(Number(m[1]));
        });

        // A API já devolve mais recente primeiro (ORDER BY id DESC),
        // igual à ordem que a tabela local usa (unshift a cada evento novo).
        tbody.innerHTML = eventos.map(e => {
            const { icone, cor } = iconePorEvento(e.acao);
            const ehAtividadePendente = e.categoria === 'Atividade Pendente';
            const jaConcluida = idsConcluidos.has(e.id);
            let marcadorPendencia = '';
            if (ehAtividadePendente) {
                marcadorPendencia = jaConcluida
                    ? `<span style="font-size:10px; color:#22c55e; font-weight:700; margin-left:8px; white-space:nowrap;"><i class="fas fa-check-circle"></i> Concluída</span>`
                    : `<button class="btn-outline-neutral" style="padding:2px 8px; font-size:10px; margin-left:8px; white-space:nowrap;" onclick="window.concluirAtividadePendenteProntuario(${e.id}, '${id}')"><i class="fas fa-check"></i> Concluir</button>`;
            }
            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${e.data_hora || '—'}</td>
                <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${e.acao || ''}${marcadorPendencia}</td>
                <td style="font-size: 11px; color: var(--text-accent);">${e.operador || 'Sistema'}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do servidor pro Prontuário (mantendo o que tinha local):', e);
    }
}

// --------------------------------------------------------------
// Marca uma "Atividade Pendente" (registrada via modal de Intervenção)
// como concluída, direto no Prontuário do equipamento.
// --------------------------------------------------------------
window.concluirAtividadePendenteProntuario = async function(eventoId, equipamentoId) {
    if (!verificarAcesso()) return;
    if (!confirm('Marcar esta atividade pendente como concluída?')) return;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    await registrarHistorico(
        equipamentoId,
        `✅ <span style="color:#22c55e;">[ATIVIDADE CONCLUÍDA]</span> (ref #${eventoId})`
    );

    if (ID_HISTORICO_ATUAL === equipamentoId) {
        atualizarTabelaHistoricoComServidor(equipamentoId);
    }
};

function salvarRegistroManual() {
    if (!verificarAcesso() || !ID_HISTORICO_ATUAL) return;

    const nota = document.getElementById("input-nota-manual").value.trim();
    if (!nota) {
        return alert("Escreva algo para registrar.");
    }

    registrarHistorico(ID_HISTORICO_ATUAL, `<span style="color:var(--text-accent);">[REGISTRO MANUAL]</span> ${nota}`);
    document.getElementById("input-nota-manual").value = "";
    renderizarTabelaHistoricoIndividual(ID_HISTORICO_ATUAL);
    const itemAtual = BANCO_ATIVOS.find(a => a.id === ID_HISTORICO_ATUAL);
    if (itemAtual) renderizarResumoHistoricoIndividual(itemAtual);
}

// ==========================================
// SAQUE, REPARO E SWAP (FLUXO PRINCIPAL)
// ==========================================
function abrirModalRelatorio(item) {
    document.getElementById('modal-tag').innerText = item.id;
    
    let select = document.getElementById('modal-motivo');
    let motivos = MOTIVOS_RETIRO[item.tipo] || MOTIVOS_RETIRO["Outros"];
    select.innerHTML = motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('modal-condicao').value = '';
    document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() {
    document.getElementById('modal-relatorio').classList.add('hidden');
    MODO_MODAL_RELATORIO = {};
}

function iniciarSaque(id) {
    if (!verificarAcesso()) return;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    MODO_MODAL_RELATORIO = { tipoAcao: 'SAQUE', idSacado: id };
    abrirModalRelatorio(item);
}

function confirmarRelatorio() {
    let motivo = document.getElementById('modal-motivo').value;
    let condicao = document.getElementById('modal-condicao').value.trim();

    if (!condicao) {
        return alert("Por favor, descreva como o equipamento chegou na oficina (Laudo Visual).");
    }

    let textoLaudo = `<br><span style="color:var(--warning); font-size:12px;"><strong>Motivo:</strong> ${motivo} | <strong>Condição:</strong> ${condicao}</span>`;

    if (MODO_MODAL_RELATORIO.tipoAcao === 'SAQUE') {
        executarSaqueFinal(MODO_MODAL_RELATORIO.idSacado, textoLaudo);
    } else if (MODO_MODAL_RELATORIO.tipoAcao === 'SWAP') {
        if (typeof executarSwapFinal === 'function') {
            executarSwapFinal(MODO_MODAL_RELATORIO.idReserva, MODO_MODAL_RELATORIO.idSacado, MODO_MODAL_RELATORIO.localDestino, textoLaudo);
        } else {
            console.warn("⚠️ executarSwapFinal não está definida — esse fluxo (tipoAcao SWAP) está incompleto.");
        }
    }

    fecharModalRelatorio();
}

async function executarSaqueFinal(id, laudo) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
        let loc = item.local;
        item.local = "Oficina / Reparo";
        item.status = "Oficina / Reparo";
        item.dataReparo = Date.now();
        item.dias = 0;
        item.dataEntradaVeio = null;
        // 🔧 Ver correção "DATA DE ENTRADA não é salva" em
        // salvarPecaNoPython() (banco.js): sem isso, o "data_entrada"
        // (string) antigo ficava esquecido no objeto e voltava a ser
        // reenviado pro banco mesmo a peça já tendo saído do veio.
        item.data_entrada = null;
        item.substituidoPor = null;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        const agora = new Date().toLocaleDateString('pt-BR');
        // 🔧 Ver correção em registrarHistorico() — espera terminar de
        // salvar antes de seguir (evita perder o evento se o técnico
        // trocar de tela rápido demais logo depois do Saque).
        await registrarHistorico(id, `Sacado da linha (${loc}) em ${agora} p/ Reparo. ${laudo}`);

        // Persiste no banco Postgres — sem isso, o saque some assim que a
        // tela sincronizar de novo com o servidor (sincronizarAtivosReaisMCC4
        // reconstrói tudo a partir do banco, que nunca teria recebido a mudança).
        if (typeof salvarPecaNoPython === 'function') {
            await salvarPecaNoPython(item);
        }

        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
        renderReparos();
        renderReservas();
        window.atualizarPainelCompleto();
    }
}

// ==========================================
// CADASTRO DE NOVAS PEÇAS E ROLOS
// ==========================================
// (toggleFormAdicionar real fica definida mais abaixo, como
// window.toggleFormAdicionar — ver correção do bug do abrirAba()
// duplicado.)

window.atualizarPosicoesCadastro = function() {
    const tipo = document.getElementById("add-tipo").value;
    const selectPos = document.getElementById("add-posicao");
    const inputMeta = document.getElementById("add-meta");

    if (!selectPos || !inputMeta) return;
    selectPos.innerHTML = "";

    // 🆕 Data de Entrada default = hoje (só preenche se ainda estiver
    // vazio, pra não sobrescrever o que o técnico já digitou).
    const inputDataEntrada = document.getElementById("add-data-entrada");
    if (inputDataEntrada && !inputDataEntrada.value) {
        inputDataEntrada.value = new Date().toISOString().slice(0, 10);
    }

    if (!tipo) {
        selectPos.innerHTML = `<option value="">Selecione um tipo primeiro...</option>`;
        inputMeta.value = "";
        window.atualizarVeiosCadastro();
        return;
    }

    const familia = tipo.split("|")[0] || "";
    const mcc = tipo.split("|")[1] || "";

    window.atualizarVeiosCadastro();

    // 1. AUTO-PREENCHER A META
    const metas = {
        "Bender": 1100000,
        "Bow": 1900000,
        "Straightener R1": 1700000,
        "Straightener R2": 1700000,
        "Horizontal": 3300000,
        "Segmento Zero": 450000,
        "Segmento Grupo 1": 1100000,
        "Segmento Grupo 2": 1650000,
        "Segmento Grupo 3": 1900000,
        "Cadeira Superior": 2000000,
        "Cadeira Inferior": 2500000,
        // 🆕 Oscilador/Mesa Osciladora — vida útil medida em DIAS (não
        // toneladas/corridas, ver campo "meta" reaproveitado pra isso):
        // 730 = 2 anos, 1095 = 3 anos, conforme a área informou.
        "Oscilador": 730,
        "Mesa Osciladora": 1095
    };

    if (familia.includes("Molde")) {
        // 🔥 AQUI ESTÁ A MÁGICA DOS MOLDES AUTOMÁTICOS 🔥
        // Molde MCC 2/3 = 900.000 | Molde MCC 4 = 1.100.000
        inputMeta.value = (mcc === "4") ? 1100000 : 900000;
        inputMeta.readOnly = false;
    } else {
        inputMeta.value = metas[familia] || 1000000;
    }

    // 2. TRAVAR AS POSIÇÕES CORRETAS
    if (mcc === "4") {
        if (familia === "Molde") selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        else if (familia === "Bender") selectPos.innerHTML = `<option value="BENDER">Bender (Única posição)</option>`;
        else if (familia === "Bow") {
            for (let i = 1; i <= 5; i++) selectPos.innerHTML += `<option value="${i}">Bow Posição #${i}</option>`;
        } else if (familia === "Straightener R1") selectPos.innerHTML = `<option value="STR-1">Straightener R1 (Única)</option>`;
        else if (familia === "Straightener R2") selectPos.innerHTML = `<option value="STR-2">Straightener R2 (Única)</option>`;
        else if (familia === "Oscilador") {
            selectPos.innerHTML = `<option value="N">Oscilador Norte</option><option value="S">Oscilador Sul</option>`;
        }
        else if (familia === "Horizontal") {
            for (let i = 8; i <= 17; i++) selectPos.innerHTML += `<option value="${i}">Horizontal Posição #${i}</option>`;
        } else selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    } 
    else if (mcc === "2/3") {
        if (familia === "Molde") selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        else if (familia === "Segmento Zero") selectPos.innerHTML = `<option value="SEG-ZERO">Segmento Zero (Única)</option>`;
        else if (familia === "Mesa Osciladora") selectPos.innerHTML = `<option value="MESA-OSC">Mesa Osciladora (Única posição)</option>`;

        // 🔥 AQUI ESTÃO OS GRUPOS 1, 2 E 3 TRAVADOS NAS POSIÇÕES CORRETAS 🔥
        else if (familia === "Segmento Grupo 1") selectPos.innerHTML = `<option value="1">Segmento #1</option>`;
        else if (familia === "Segmento Grupo 2") {
            selectPos.innerHTML = `<option value="2">Segmento #2</option><option value="3">Segmento #3</option>`;
        }
        else if (familia === "Segmento Grupo 3") {
            selectPos.innerHTML = `<option value="4">Segmento #4</option><option value="5">Segmento #5</option><option value="6">Segmento #6</option>`;
        }
        
        else if (familia === "Cadeira Superior") {
            for (let i = 43; i <= 79; i++) selectPos.innerHTML += `<option value="${i}">Cadeira Superior #${i}</option>`;
        } else if (familia === "Cadeira Inferior") {
            for (let i = 43; i <= 79; i++) selectPos.innerHTML += `<option value="${i}">Cadeira Inferior #${i}</option>`;
        } else selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    } else {
        selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    }
};
// ⚠️ A implementação de verdade do cadastro fica em
// window.processarCadastroPeca, mais abaixo neste arquivo — é ela que
// o botão "Confirmar Cadastro" chama (onclick="window.processarCadastroPeca()").

// 🆕 Monta as opções de Veio do bloco "já está instalada", de acordo
// com o MCC do tipo escolhido — Veios C/D são MCC 2, E/F são MCC 3
// (por isso entram nos dois quando o tipo é "2/3", já que a peça pode
// estar em qualquer um), G/H são MCC 4 (ver botões de
// mudarVeioVisualizado no Sequenciamento de Veios, no app.html).
window.atualizarVeiosCadastro = function() {
    const tipo = document.getElementById("add-tipo")?.value || "";
    const selectVeio = document.getElementById("add-veio-instalacao");
    if (!selectVeio) return;

    const mcc = tipo.split("|")[1] || "";
    let opcoes = [];
    if (mcc === "4") opcoes = [["G", "Veio G (MCC 4)"], ["H", "Veio H (MCC 4)"]];
    else if (mcc === "2/3") opcoes = [["C", "Veio C (MCC 2)"], ["D", "Veio D (MCC 2)"], ["E", "Veio E (MCC 3)"], ["F", "Veio F (MCC 3)"]];

    selectVeio.innerHTML = opcoes.length
        ? `<option value="">Selecionar veio...</option>` + opcoes.map(([v, label]) => `<option value="${v}">${label}</option>`).join("")
        : `<option value="">Selecione um tipo primeiro...</option>`;
};

// 🆕 Mostra/esconde o bloco de Veio quando o técnico marca "peça já
// está instalada" — não faz sentido pedir Veio pra quem vai mandar pro
// Estoque Reserva normalmente.
window.toggleCadastroJaInstalada = function() {
    const checkbox = document.getElementById("add-ja-instalada");
    const bloco = document.getElementById("bloco-add-veio-instalacao");
    if (!checkbox || !bloco) return;
    bloco.classList.toggle("hidden", !checkbox.checked);
    if (checkbox.checked) window.atualizarVeiosCadastro();
};

function renderRolos() {
    const tbody = document.getElementById("rolos-table-body");
    if (!tbody) return;
    let htmlFinal = "";
    const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

    equipamentosDiferentes.forEach(equipamento => {
        htmlFinal += `
            <tr style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--text-accent);">
                <td colspan="5" style="padding: 12px 16px; color: var(--text-accent); font-weight: 700; text-transform: uppercase; font-size: 14px;"><i class="fas fa-layer-group"></i> Equipamento: ${equipamento}</td>
            </tr>
        `;
        const rolosDesteEquipamento = BANCO_ROLOS.filter(r => r.conjunto === equipamento);
        rolosDesteEquipamento.forEach(r => {
            htmlFinal += `
                <tr>
                    <td class="font-code" style="color:var(--text-heading); padding-left: 25px;"><strong>${r.nome}</strong></td>
                    <td><span class="ind-card-tag bg-tag">${r.conjunto}</span></td>
                    <td><code>MCC ${r.mcc_compat}</code></td>
                    <td><span class="font-code bold" id="saldo-rolo-${r.id}" style="font-size:16px; color:var(--text-accent); margin-right:15px;">${r.qtd} Pçs</span></td>
                    <td><div style="display:inline-flex; gap:5px;"><button class="btn-premium btn-success" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', 1)"><i class="fas fa-plus"></i></button><button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', -1)"><i class="fas fa-minus"></i></button></div></td>
                </tr>
            `;
        });
    });
    tbody.innerHTML = htmlFinal;
}
window.renderRolos = renderRolos;

async function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    if (rolo) {
        if (rolo.qtd + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        // 🔧 Log de auditoria + notificação agora é feito pelo próprio
        // backend (POST /api/rolos/ajustar), com a matrícula certa — o
        // registro daqui duplicava sem a tag certa pra aparecer na
        // Central de Notificações (ver enviar_push_para_area em
        // ajustar_rolo, main.py).
        renderRolos();

        // Persiste no Neon — sem isso, o ajuste sumia assim que a página
        // sincronizasse de novo com o servidor.
        if (typeof salvarAjusteRoloNoPython === 'function') {
            await salvarAjusteRoloNoPython(id, fator);
        }
    }
}

// ==========================================
// ESTOQUE HIDRÁULICO (Aplicado na Máquina x Reserva na Oficina)
// ==========================================
function renderHidraulica() {
    const tbody = document.getElementById("hidraulica-table-body");
    if (!tbody) return;
    let htmlFinal = "";
    const gruposMcc = [...new Set(BANCO_HIDRAULICA.map(h => h.mcc_compat))].sort();

    gruposMcc.forEach(mcc => {
        htmlFinal += `
            <tr style="background: rgba(249, 115, 22, 0.08); border-left: 4px solid #f97316;">
                <td colspan="6" style="padding: 12px 16px; color: #f97316; font-weight: 700; text-transform: uppercase; font-size: 14px;"><i class="fas fa-server"></i> MCC ${mcc}</td>
            </tr>
        `;
        const itensDoGrupo = BANCO_HIDRAULICA.filter(h => h.mcc_compat === mcc);
        itensDoGrupo.forEach(h => {
            const aplicado = h.qtd_aplicado || 0;
            const reserva = h.qtd_reserva || 0;
            htmlFinal += `
                <tr>
                    <td class="font-code" style="color:var(--text-heading); padding-left: 25px;"><strong>${h.nome}</strong></td>
                    <td><span class="ind-card-tag bg-tag">${h.conjunto}</span></td>
                    <td><code>MCC ${h.mcc_compat}</code></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="font-code bold" id="saldo-hidraulica-aplicado-${h.id}" style="font-size:15px; color:#22c55e;"><i class="fas fa-industry" style="font-size:11px;"></i> ${aplicado}</span>
                            <div style="display:inline-flex; gap:4px;">
                                <button class="btn-premium btn-success" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'aplicado', 1)"><i class="fas fa-plus"></i></button>
                                <button class="btn-premium btn-warning" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'aplicado', -1)"><i class="fas fa-minus"></i></button>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="font-code bold" id="saldo-hidraulica-reserva-${h.id}" style="font-size:15px; color:var(--text-accent);"><i class="fas fa-warehouse" style="font-size:11px;"></i> ${reserva}</span>
                            <div style="display:inline-flex; gap:4px;">
                                <button class="btn-premium btn-success" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'reserva', 1)"><i class="fas fa-plus"></i></button>
                                <button class="btn-premium btn-warning" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'reserva', -1)"><i class="fas fa-minus"></i></button>
                            </div>
                        </div>
                    </td>
                    <td><span class="font-code text-muted" style="font-size:12px;">Total: ${aplicado + reserva}</span></td>
                </tr>
            `;
        });
    });
    tbody.innerHTML = htmlFinal;
}

async function alterarSaldoHidraulica(id, local, fator) {
    if (!verificarAcesso()) return;
    let peca = BANCO_HIDRAULICA.find(h => h.id === id);
    if (!peca) return;

    const campo = local === 'aplicado' ? 'qtd_aplicado' : 'qtd_reserva';

    if ((peca[campo] || 0) + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
    peca[campo] = (peca[campo] || 0) + fator;
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
    // 🔧 Log de auditoria + notificação agora é feito pelo próprio
    // backend (POST /api/hidraulica/ajustar) — ver comentário equivalente
    // em alterarSaldoRolo.
    renderHidraulica();

    // Persiste no Neon — sem isso, o ajuste sumia assim que a página
    // sincronizasse de novo com o servidor.
    if (typeof salvarAjusteHidraulicaNoPython === 'function') {
        await salvarAjusteHidraulicaNoPython(id, local, fator);
    }
}

// ==========================================
// ALMOXARIFADO DE MATERIAIS GERAIS
// ==========================================
function renderMateriais() {
    const tbody = document.getElementById("materiais-table-body");
    const busca = document.getElementById("busca-material") ? document.getElementById("busca-material").value.toLowerCase() : "";
    if (!tbody) return;

    let filtrados = BANCO_MATERIAIS;
    if (busca) {
        filtrados = BANCO_MATERIAIS.filter(m => m.codigo.toLowerCase().includes(busca) || m.descricao.toLowerCase().includes(busca));
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum material encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(m => {
        let statusHtml = "";
        if (m.qtd > 10) statusHtml = `<span class="status-pill operação"><i class="fas fa-check-circle"></i> Normal</span>`;
        else if (m.qtd > 0) statusHtml = `<span class="status-pill" style="background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.25);"><i class="fas fa-exclamation-triangle"></i> Baixo</span>`;
        else statusHtml = `<span class="status-pill reparo"><i class="fas fa-times-circle"></i> Zerado</span>`;
        
        return `
            <tr>
                <td class="font-code" style="color: var(--text-heading); font-size: 15px;">${m.codigo}</td>
                <td style="color: var(--text-main); font-weight: 500; font-size: 13px; max-width: 350px; overflow: hidden; text-overflow: ellipsis;">${m.descricao}</td>
                <td><span class="font-code bold" style="font-size:16px; color: #a855f7;">${m.qtd.toLocaleString()} UN</span></td>
                <td>${statusHtml}</td>
                <td>
                    <div style="display:inline-flex; gap:5px;">
                        <button class="btn-premium btn-success" style="padding:4px 10px;" onclick="ajustarSaldoMaterial('${m.codigo}', 1)" title="Adicionar"><i class="fas fa-plus"></i></button>
                        <button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="ajustarSaldoMaterial('${m.codigo}', -1)" title="Baixar"><i class="fas fa-minus"></i></button>
                        <button class="btn-outline-danger" style="padding:4px 10px;" onclick="removerMaterial('${m.codigo}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function toggleFormMaterial() {
    let form = document.getElementById("form-novo-material");
    if (form) form.classList.toggle("hidden");
}

// ==========================================
// CARREGA O ALMOXARIFADO DO NEON (compartilhado entre todos)
// ==========================================
async function carregarMateriaisDoBackend() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setBancoMateriais(await resp.json());
        renderMateriais();
    } catch (e) {
        console.error('❌ Não foi possível carregar o almoxarifado do Neon:', e);
    }
}

async function salvarEntradaMaterial() {
    if (!verificarAcesso()) return;
    const codigo = document.getElementById("mat-codigo").value.trim().toUpperCase();
    const descricao = document.getElementById("mat-descricao").value.trim().toUpperCase();
    const qtd = parseInt(document.getElementById("mat-qtd").value) || 0;

    if (!codigo || !descricao || qtd <= 0) {
        return alert("Por favor, preencha o código, a descrição correta e uma quantidade maior que zero.");
    }

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, descricao, qtd })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível salvar. Tente novamente.');
            return;
        }

        if (resultado.ja_existia) {
            registrarHistorico("ALMOXARIFADO", `Adição no material [${codigo}]. +${qtd} UN. Saldo atual: ${resultado.material.qtd} UN.`);
            alert(`SUCESSO!\nO código ${codigo} já existe no sistema.\nSomamos a quantidade de ${qtd} UN ao saldo atual.`);
        } else {
            registrarHistorico("ALMOXARIFADO", `Material [${codigo}] cadastrado. Entrada: ${qtd} UN.`);
            alert(`NOVO MATERIAL CADASTRADO!\nCódigo ${codigo} adicionado com saldo de ${qtd} UN.`);
        }

        document.getElementById("mat-codigo").value = "";
        document.getElementById("mat-descricao").value = "";
        document.getElementById("mat-qtd").value = "";
        toggleFormMaterial();
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao salvar material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}

async function ajustarSaldoMaterial(codigo, fator) {
    if (!verificarAcesso()) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/ajustar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, fator })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível ajustar o estoque.');
            return;
        }
        let acao = fator > 0 ? "Entrada" : "Saída";
        registrarHistorico("ALMOXARIFADO", `Ajuste manual (${acao}) no material [${codigo}]. Novo saldo: ${resultado.material.qtd} UN.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao ajustar material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}

async function removerMaterial(codigo) {
    if (!verificarAcesso()) return;
    if (!confirm(`Atenção!\nTem certeza que deseja apagar o registro do material [${codigo}] do sistema?`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/remover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível excluir o material.');
            return;
        }
        registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao remover material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}

// ==========================================
// FUNÇÃO DE EDIÇÃO DE CÉLULAS DA TABELA
// ==========================================
function fazerCelulaEditavel(elemento, id, campo) {
    if (elemento.querySelector('input')) return;
    
    const valorAtual = elemento.innerText.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = valorAtual;
    input.className = 'edit-input';
    input.style.width = '100%';
    input.style.background = 'var(--bg-input)';
    input.style.color = 'var(--text-heading)';
    input.style.border = '1px solid var(--text-accent)';
    input.style.borderRadius = '4px';
    input.style.padding = '4px';
    
    elemento.innerHTML = '';
    elemento.appendChild(input);
    input.focus();
    input.select();
    
    const salvarEdicao = () => {
        const novoValor = input.value.trim();
        const item = BANCO_ATIVOS.find(a => a.id === id);
        if (item && novoValor) {
            if (campo === 'id') {
                const existe = BANCO_ATIVOS.some(a => a.id === novoValor && a.id !== id);
                if (existe) {
                    alert('Este ID já existe no sistema!');
                    elemento.innerText = valorAtual;
                    return;
                }
                item.id = novoValor;
            } else if (campo === 'dias') {
                const novoDiasNum = parseFloat(novoValor) || 0;
                const dataBase = Date.now() - (novoDiasNum * 24 * 60 * 60 * 1000);
                if (item.local === "Oficina / Reparo") {
                    item.dataReparo = dataBase;
                } else if (item.local && !item.local.includes("Oficina")) {
                    item.dataEntradaVeio = dataBase;
                }
                item.dias = novoDiasNum;
            } else if (campo === 'ton') {
                item.ton = parseFloat(novoValor) || 0;
            }
            
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
            registrarHistorico(id, `Campo "${campo}" alterado para: ${novoValor}`);
            
            if (campo === 'dias' || campo === 'ton') {
                elemento.innerText = parseFloat(novoValor).toLocaleString() || '0';
            } else {
                elemento.innerText = novoValor;
            }
            window.atualizarPainelCompleto();
        } else {
            elemento.innerText = valorAtual;
        }
    };
    
    const cancelarEdicao = () => {
        elemento.innerText = valorAtual;
    };
    
    input.addEventListener('blur', salvarEdicao);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
        if (e.key === 'Escape') {
            cancelarEdicao();
        }
    });
}

// ==========================================
// CONTROLE DE ABAS DO SEGMENTO ZERO
// ==========================================
function trocarAbaSegZero(event, idAba) {
    const container = document.getElementById("modal-folhao-segmento-zero");
    if (!container) return;
    
    container.querySelectorAll('.folhao-content').forEach(content => {
        content.style.display = 'none';
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    container.querySelectorAll('.folhao-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        abaAlvo.classList.remove('hidden');
        abaAlvo.classList.add('active');
    }
    event.currentTarget.classList.add('active');
}

// ==============================================================
// PROCESSAR CADASTRO DE NOVA PEÇA
// ==============================================================
window.processarCadastroPeca = async function() {
    // Validação de acesso (modo visitante)
    if (typeof window.verificarAcesso === 'function' && !window.verificarAcesso()) return;

    const tagInput = document.getElementById('add-tag');
    const tipoSelect = document.getElementById('add-tipo');
    const metaInput = document.getElementById('add-meta');
    const tonInput = document.getElementById('add-ton-atual');
    const posicaoSelect = document.getElementById('add-posicao');
    // 🆕 Data de Entrada + instalação retroativa: cobre o caso da peça já
    // estar fisicamente no Veio há alguns dias sem o sistema ter sido
    // atualizado ainda.
    const dataEntradaInput = document.getElementById('add-data-entrada');
    const jaInstaladaCheckbox = document.getElementById('add-ja-instalada');
    const veioInstalacaoSelect = document.getElementById('add-veio-instalacao');

    if (!tagInput || !tipoSelect || !metaInput) {
        alert("Erro: Elementos do formulário não encontrados no HTML.");
        return;
    }

    const id = tagInput.value.trim().toUpperCase();
    const tipoCompleto = tipoSelect.value; // Ex: "Molde|2/3"
    const meta = parseFloat(metaInput.value) || 0;
    const tonAtual = parseFloat(tonInput?.value) || 0; // 0 = peça nova, sem desgaste
    const posicao = posicaoSelect ? posicaoSelect.value : "";
    const jaInstalada = !!(jaInstaladaCheckbox && jaInstaladaCheckbox.checked);
    const veioInstalacao = veioInstalacaoSelect ? veioInstalacaoSelect.value : "";

    if (!id || !tipoCompleto) {
        alert("Por favor, preencha a TAG e selecione o Tipo de Família.");
        return;
    }

    if (jaInstalada && !veioInstalacao) {
        alert("Selecione em qual Veio a peça já está instalada, ou desmarque a opção 'já instalada'.");
        return;
    }

    // Data de Entrada: se o técnico não preencheu, assume hoje. Vira o
    // timestamp usado por calcularDias() pra calcular "dias em operação"
    // — se for uma data passada (ex: peça já entrou há 5 dias), os dias
    // aparecem certos na hora, sem precisar esperar o tempo passar de
    // fato.
    const dataEntradaStr = dataEntradaInput?.value || "";
    const dataEntradaMs = dataEntradaStr ? new Date(`${dataEntradaStr}T00:00:00`).getTime() : Date.now();
    if (dataEntradaStr && dataEntradaMs > Date.now()) {
        alert("A Data de Entrada não pode ser no futuro.");
        return;
    }

    // Separa o tipo da compatibilidade de MCC (ex: "Molde|2/3" -> tipo: "Molde", mcc: "2/3")
    let tipo = tipoCompleto;
    let mcc_compat = "2/3";
    if (tipoCompleto.includes('|')) {
        const partes = tipoCompleto.split('|');
        tipo = partes[0];
        mcc_compat = partes[1];
    }

    // Valida se a TAG já existe
    if (typeof BANCO_ATIVOS !== 'undefined') {
        const existente = BANCO_ATIVOS.find(a => a.id === id);
        if (existente) {
            alert(`⚠️ Já existe um equipamento cadastrado com a TAG [${id}]!`);
            return;
        }
    }

    // Monta a posição/gaveta específica dessa peça (ex: BOW-3, CAD-SUP-45,
    // SEG-2, HOR-10, ou o valor fixo já vindo do select pros tipos de
    // posição única — MOLDE, BENDER, STR-1, STR-2, SEG-ZERO). Isso é só
    // uma referência de qual vaga a peça foi pensada pra ocupar; o Swap
    // Automático confirma tudo de novo na hora de instalar de verdade.
    const tipoUpper = tipo.toUpperCase();
    let posicaoFixa = posicao;
    if (mcc_compat === "4") {
        if (tipoUpper.includes("BOW") && posicao) posicaoFixa = `BOW-${posicao}`;
        else if (tipoUpper.includes("HORIZONTAL") && posicao) posicaoFixa = `HOR-${posicao}`;
        // 🆕 Oscilador: select já manda "N"/"S" — vira "OSC-N"/"OSC-S",
        // batendo com os slots fixos de gerarSlotsMCC4().
        else if (tipoUpper === "OSCILADOR" && posicao) posicaoFixa = `OSC-${posicao}`;
    } else if (mcc_compat === "2/3") {
        if (tipoUpper.includes("CADEIRA SUPERIOR") && posicao) posicaoFixa = `CAD-SUP-${posicao}`;
        else if (tipoUpper.includes("CADEIRA INFERIOR") && posicao) posicaoFixa = `CAD-INF-${posicao}`;
        else if (tipoUpper.includes("SEGMENTO") && !tipoUpper.includes("ZERO") && posicao) posicaoFixa = `SEG-${posicao}`;
    }

    // 🆕 Se marcado como "já instalada", checa se esse slot (veio +
    // posição) já está ocupado por outro equipamento. Se estiver, saca
    // o equipamento antigo pra "Oficina / Reparo" — igual o Swap
    // Automático (iniciarSwapAlocacao) já faz — em vez de simplesmente
    // bloquear o cadastro. Vale pra qualquer tipo de equipamento (Molde,
    // Bow, Segmento, Cadeira etc.), não só um caso específico.
    let pecaSacada = null;
    if (jaInstalada && posicaoFixa) {
        pecaSacada = BANCO_ATIVOS.find(a =>
            a.status === "Instalado" && a.veio === veioInstalacao && a.posicaoFixa === posicaoFixa
        );
        if (pecaSacada) {
            const confirmar = confirm(
                `⚠️ O slot ${posicaoFixa} do Veio ${veioInstalacao} já está ocupado por ${pecaSacada.id}.\n\n` +
                `Ao confirmar, ${pecaSacada.id} será SACADO desse slot e movido pra Oficina / Reparo, e ${id} entra no lugar dele.\n\nContinuar?`
            );
            if (!confirmar) return;
        }
    }

    if (pecaSacada) {
        pecaSacada.status = "Oficina / Reparo";
        pecaSacada.local = "Oficina / Reparo";
        pecaSacada.veio = "";
        pecaSacada.posicaoFixa = "";
        pecaSacada.pos = "";
        pecaSacada.dataReparo = Date.now();
        pecaSacada.dias = 0;
        pecaSacada.dataEntradaVeio = null;
        pecaSacada.substituidoPor = id;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        if (typeof window.salvarPecaNoPython === 'function') {
            await window.salvarPecaNoPython(pecaSacada);
        }
        if (typeof registrarHistorico === 'function') {
            registrarHistorico(pecaSacada.id, `🔻 Sacado do Veio ${veioInstalacao} (slot ${posicaoFixa}) — substituído por ${id} no cadastro retroativo.`);
        }
    }

    const novoItem = jaInstalada ? {
        id: id,
        tipo: tipo,
        mcc_compat: mcc_compat,
        meta: meta,
        ton: tonAtual,
        local: `MCC ${mcc_compat} - Veio ${veioInstalacao}`,
        veio: veioInstalacao,
        posicaoFixa: posicaoFixa,
        pos: posicaoFixa || "GERAL",
        status: "Instalado",
        dias: 0, // calcularDias() recalcula pela dataEntradaVeio
        ordem: typeof getOrdemPadrao === 'function' ? getOrdemPadrao(tipo) : 999,
        dataReparo: null,
        dataEntradaVeio: dataEntradaMs,
        substituidoPor: null
    } : {
        id: id,
        tipo: tipo,
        mcc_compat: mcc_compat,
        meta: meta,
        ton: tonAtual,
        local: "Oficina / Reserva",
        veio: "",
        posicaoFixa: posicaoFixa,
        pos: posicaoFixa || "Estoque",
        dias: 0,
        ordem: typeof getOrdemPadrao === 'function' ? getOrdemPadrao(tipo) : 999,
        dataReparo: null,
        dataEntradaVeio: null
    };

    // Adiciona ao array global de ativos
    if (typeof BANCO_ATIVOS !== 'undefined') {
        BANCO_ATIVOS.push(novoItem);
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // Sincroniza com o backend Python (se a função existir)
    if (typeof window.salvarPecaNoPython === 'function') {
        await window.salvarPecaNoPython(novoItem);
    }

    if (typeof registrarHistorico === 'function') {
        const rotuloDesgaste = tonAtual > 0 ? ` (cadastrada já com ${tonAtual.toLocaleString('pt-BR')} de desgaste)` : ' (peça nova, sem uso)';
        const dataFormatada = new Date(dataEntradaMs).toLocaleDateString('pt-BR');
        const rotuloSacada = pecaSacada ? ` — ${pecaSacada.id} foi sacado do slot pra Oficina / Reparo` : '';
        const rotuloLocal = jaInstalada
            ? `📦 Peça cadastrada já Instalada no Veio ${veioInstalacao} (entrada em ${dataFormatada})${rotuloDesgaste}${rotuloSacada}.`
            : `📦 Peça cadastrada no Estoque Reserva${rotuloDesgaste}.`;
        registrarHistorico(id, rotuloLocal);
    }

    // Atualiza as telas do sistema
    if (typeof window.renderAtivos === 'function') window.renderAtivos();
    if (typeof window.renderReservas === 'function') window.renderReservas();
    if (typeof window.renderReparos === 'function') window.renderReparos();
    if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();

    // Limpa os campos e fecha o formulário
    tagInput.value = '';
    metaInput.value = '';
    if (tonInput) tonInput.value = '';
    tipoSelect.value = '';
    if (dataEntradaInput) dataEntradaInput.value = '';
    if (jaInstaladaCheckbox) jaInstaladaCheckbox.checked = false;
    if (veioInstalacaoSelect) veioInstalacaoSelect.innerHTML = '<option value="">Selecionar veio...</option>';
    if (typeof window.toggleCadastroJaInstalada === 'function') window.toggleCadastroJaInstalada();
    if (typeof window.toggleFormAdicionar === 'function') {
        window.toggleFormAdicionar();
    }

    alert(jaInstalada
        ? `✅ Equipamento [${id}] cadastrado já Instalado no Veio ${veioInstalacao} (entrada retroativa em ${new Date(dataEntradaMs).toLocaleDateString('pt-BR')})!` + (pecaSacada ? `\n\n${pecaSacada.id} foi sacado desse slot e movido pra Oficina / Reparo.` : '')
        : `✅ Equipamento [${id}] cadastrado com sucesso no Estoque Reserva!`);
};

// 🔧 CORREÇÃO CRÍTICA: aqui embaixo existia uma SEGUNDA definição de
// `window.atualizarPosicoesCadastro`, vazia (só um comentário, sem
// código nenhum). Como esse arquivo carrega de cima pra baixo, essa
// segunda definição SOBRESCREVIA a de verdade (lá em cima, perto da
// linha 1582), que é a que auto-preenche a Meta e trava o Veio/Posição
// certos pro tipo escolhido. Na prática, isso zerava TODAS as correções
// feitas ali — o formulário de cadastro nunca rodava essa lógica,
// porque a versão vazia sempre ganhava. Removida.

// ==========================================
// FUNÇÕES PARA O PAINEL TURBINADO (NOVAS)
// ==========================================

function renderizarTopCriticos() {
    const container = document.getElementById('top-criticos-container');
    if (!container) return;
    
    const ativos = BANCO_ATIVOS.filter(a => 
        a.local && a.local.includes('Veio') && !a.local.includes('Oficina')
    );
    
    const ordenados = ativos
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5);
    
    if (ordenados.length === 0) {
        container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px 0;">Nenhum equipamento crítico.</div>';
        return;
    }
    
    container.innerHTML = ordenados.map(a => {
        let mccAba = 'aba-mcc2';
        if (a.mcc_compat === '3') mccAba = 'aba-mcc3';
        else if (a.mcc_compat === '4') mccAba = 'aba-mcc4';
        let veio = 'C';
        const match = a.local?.match(/Veio\s*([A-Z])/i);
        if (match) veio = match[1].toUpperCase();
        const onclick = `window.abrirAba(null, '${mccAba}'); setTimeout(() => { window.mudarVeioVisualizado('${veio}'); }, 200);`;
        
        return `
            <div class="top-critico-item" style="cursor: pointer;" onclick="${onclick}">
                <span class="tag">${a.id}</span>
                <span class="tipo">${a.tipo}</span>
                <span class="porcentagem">${a.pct.toFixed(1)}%</span>
                <span style="font-size: 10px; color: var(--text-muted);">🔗 ${a.mcc_compat ? 'MCC '+a.mcc_compat : ''} · Veio ${veio}</span>
            </div>
        `;
    }).join('');
}

function atualizarKPIsAvancados() {
    const total = BANCO_ATIVOS.length;
    const totalEl = document.getElementById('kpi-total');
    if (totalEl) totalEl.innerText = total;
    
    const instalados = BANCO_ATIVOS.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina'));
    if (instalados.length > 0) {
        const soma = instalados.reduce((acc, a) => acc + (a.meta > 0 ? (a.ton / a.meta) * 100 : 0), 0);
        const media = (soma / instalados.length);
        const mediaEl = document.getElementById('kpi-media-desgaste');
        if (mediaEl) mediaEl.innerText = media.toFixed(1) + '%';
    } else {
        const mediaEl = document.getElementById('kpi-media-desgaste');
        if (mediaEl) mediaEl.innerText = '0%';
    }
    
    const mediaReparoEl = document.getElementById('kpi-media-reparo');
    const emReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo');
    if (emReparo.length > 0) {
        const somaDias = emReparo.reduce((acc, a) => {
            const dias = calcularDias(a);
            return acc + dias;
        }, 0);
        const mediaDias = Math.round(somaDias / emReparo.length);
        if (mediaReparoEl) mediaReparoEl.innerText = mediaDias + ' dias';
    } else {
        if (mediaReparoEl) mediaReparoEl.innerText = '0 dias';
    }

    const dispEl = document.getElementById('kpi-disponibilidade');
    if (dispEl) {
        const totalAtivos = BANCO_ATIVOS.length;
        const emReparoCount = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo').length;
        const disponibilidade = totalAtivos > 0 ? ((totalAtivos - emReparoCount) / totalAtivos) * 100 : 0;
        dispEl.innerText = disponibilidade.toFixed(1) + '%';
    }
}
// (Painel do Técnico agora vive em Oficina/painelTecnico.js)
// (Administração de Colaboradores agora vive em Paineis/colaboradores.js)
// ==========================================
// OFICINA — CATÁLOGO GERAL DE MATERIAIS (todas as áreas juntas)
// ==========================================
let CATALOGO_MATERIAIS_OFICINA_CACHE = [];

async function carregarCatalogoMateriaisOficina() {
    const container = document.getElementById('catalogo-materiais-oficina-lista');
    if (!container) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais_todos`, { cache: 'no-store' });
        CATALOGO_MATERIAIS_OFICINA_CACHE = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Não consegui carregar o catálogo de materiais:', e);
        CATALOGO_MATERIAIS_OFICINA_CACHE = [];
    }
    window.renderCatalogoMateriaisOficina();
}
window.carregarCatalogoMateriaisOficina = carregarCatalogoMateriaisOficina;

window.renderCatalogoMateriaisOficina = function() {
    const container = document.getElementById('catalogo-materiais-oficina-lista');
    if (!container) return;

    const busca = (document.getElementById('busca-material-oficina')?.value || '').toLowerCase().trim();

    let itens = CATALOGO_MATERIAIS_OFICINA_CACHE;
    if (busca) {
        itens = itens.filter(m => {
            const info = AREAS_OFICINA.find(a => a.chave === m.area);
            const nomeArea = info ? info.nome.toLowerCase() : m.area.toLowerCase();
            return (m.codigo || '').toLowerCase().includes(busca)
                || (m.descricao || '').toLowerCase().includes(busca)
                || nomeArea.includes(busca);
        });
    }

    if (itens.length === 0) {
        container.innerHTML = `<div class="text-muted" style="font-size:12px; padding:12px 0;">Nenhum material encontrado.</div>`;
        return;
    }

    container.innerHTML = itens.map(m => {
        const info = AREAS_OFICINA.find(a => a.chave === m.area);
        const nomeArea = info ? info.nome : m.area;
        const corArea = info ? info.cor : 'var(--text-muted)';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 4px; border-bottom:1px solid var(--border-color);">
                <div style="min-width:0; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading); font-size:12px;">${m.codigo}</span>
                    <span style="font-size:12.5px; color:var(--text-body);">${m.descricao}</span>
                </div>
                <span style="flex-shrink:0; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; color:${corArea}; background:color-mix(in srgb, ${corArea} 16%, transparent);">${nomeArea}</span>
            </div>
        `;
    }).join('');
};

// ==========================================
// (Central de Áreas — grid, Atividade em Massa — agora vive em Paineis/centralAreas.js)

// (OFICINA_ATIVIDADES_CACHE, OFICINA_AREA_ATUAL, OFICINA_FILTRO_STATUS_ATUAL,
// OFICINA_TIPO_ATIVIDADE_ATUAL, OFICINA_FOTO_BASE64, OFICINA_EDITANDO_ID e
// OFICINA_EQUIPE_ATUAL agora vêm de Core/estado.js — lidas/escritas por
// mais de uma área: Central de Áreas, Área da Oficina, Ponte Rolante e
// Painel do Supervisor.)

// (Painéis Administrativos agora vivem em Paineis/painelAreaAdministrativa.js)
// ==========================================================
// 🆕 PAINEL DO SUPERVISOR — visão executiva de cima da oficina inteira
// ==========================================================
// Diferente do Painel Executivo do ADM (acima, dentro da Central de
// Áreas > ADM), esta é uma aba própria, direto no menu, que junta as 4
// coisas que o supervisor precisa ver de uma vez: saúde da oficina
// agora, produtividade da equipe, estoque/logística e tendência.
// Tudo montado a partir de dados que o app já carrega no cliente
// (BANCO_ATIVOS, OFICINA_ATIVIDADES_CACHE, BANCO_MATERIAIS) — só o
// contador de OS abertas/fechadas e o sparkline de OS por dia batem a
// API de Ordens de Serviço, que já é consumida em outro lugar do app.
const PAINEL_SUP_LIMITE_ESTOQUE_BAIXO = 10; // mesmo corte usado em renderMateriais()

function painelSupBarraHtml(nome, valor, max, cor, onclick) {
    const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;
    return `
        <div class="sup-barra-linha${onclick ? ' sup-lista-linha-clicavel' : ''}" ${onclick ? `onclick="${onclick}"` : ''}>
            <span class="sup-barra-nome" title="${nome}">${nome}</span>
            <span class="sup-barra-trilho"><span class="sup-barra-preenchimento" style="width:${valor > 0 ? pct : 0}%; background:${cor};"></span></span>
            <span class="sup-barra-valor">${valor}</span>
        </div>
    `;
}

// 🆕 Drill-down do Painel Supervisor: os cards de "Saúde da Oficina
// Agora" eram só números/barras estáticas — clicar não fazia nada. Os
// dados já existem em memória (atividades/ativos já carregados pro
// resto do painel), só faltava um jeito de mostrar a lista por trás de
// cada número. Como onclick="" é uma string HTML, não dá pra passar o
// array de itens direto — guarda no cache por índice e o clique só
// manda o índice.
let SUP_DETALHE_CACHE = [];
function registrarDetalheSupervisor(titulo, itens, tipo) {
    SUP_DETALHE_CACHE.push({ titulo, itens: itens || [], tipo });
    return SUP_DETALHE_CACHE.length - 1;
}

window.abrirDetalheSupervisorPorIndice = function(idx) {
    const d = SUP_DETALHE_CACHE[idx];
    if (!d) return;
    const modal = document.getElementById('modal-supervisor-detalhe');
    const tituloEl = document.getElementById('modal-supervisor-detalhe-titulo');
    const cont = document.getElementById('modal-supervisor-detalhe-lista');
    if (!modal || !cont) return;
    if (tituloEl) tituloEl.textContent = `${d.titulo} (${d.itens.length})`;

    if (!d.itens.length) {
        cont.innerHTML = `<div class="sup-vazio">Nada aqui agora 👍</div>`;
    } else if (d.tipo === 'os') {
        cont.innerHTML = d.itens.map(os => `
            <div class="sup-lista-linha sup-lista-linha-clicavel" style="flex-direction:column; align-items:stretch;" onclick="window.fecharModalSupervisorDetalhe(); window.abrirGaleriaOs(${os.id}, '${os.numero_os ? `OS ${os.numero_os}` : `OS #${os.id}`}')">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <strong style="color:var(--text-heading);">${os.numero_os ? `OS ${os.numero_os}` : `#${os.id}`}</strong>
                    <span class="text-muted">${os.status || '—'}</span>
                </div>
                <div class="text-muted" style="font-size:11.5px;">${os.criado_por || 'Sistema'} · ${os.criado_em || ''}${(os.areas && os.areas.length) ? ` · ${os.areas.join(', ')}` : (os.area ? ` · ${os.area}` : '')}</div>
                ${os.descricao ? `<div style="font-size:12.5px; margin-top:4px; color:var(--text-body);">${os.descricao}</div>` : ''}
            </div>
        `).join('');
    } else if (d.tipo === 'ativo') {
        cont.innerHTML = d.itens.map(a => {
            const pct = a.meta > 0 ? Math.round((a.ton / a.meta) * 100) : null;
            return `
                <div class="sup-lista-linha sup-lista-linha-clicavel" style="flex-direction:column; align-items:stretch;" onclick="window.fecharModalSupervisorDetalhe(); window.abrirHistoricoIndividual('${a.id}')">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                        <strong style="color:var(--text-heading);">${a.id}</strong>
                        <span class="text-muted">${a.tipo || '—'}</span>
                    </div>
                    <div class="text-muted" style="font-size:11.5px;">Local: ${a.local || '—'}${pct !== null ? ` · Desgaste: ${pct}%` : ''}</div>
                </div>
            `;
        }).join('');
    } else {
        cont.innerHTML = d.itens.map(x => `
            <div class="sup-lista-linha" style="flex-direction:column; align-items:stretch;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <strong style="color:var(--text-heading);">${x.equipamento_id || x.id || '—'}</strong>
                    <span class="text-muted">${x.status || '—'}</span>
                </div>
                <div class="text-muted" style="font-size:11.5px;">
                    Área: ${x.area || x.solicitante_area || '—'}${x.tipo ? ` · Tipo: ${x.tipo}` : ''}${x.responsavel ? ` · Responsável: ${x.responsavel}` : ''}${x.executado_por ? ` · Executado por: ${x.executado_por}` : ''}
                </div>
                ${x.descricao ? `<div style="font-size:12.5px; margin-top:4px; color:var(--text-body);">${x.descricao}</div>` : ''}
                ${x.motivo ? `<div style="font-size:11.5px; margin-top:2px; color:var(--text-muted);">Obs: ${x.motivo}</div>` : ''}
            </div>
        `).join('');
    }
    modal.classList.remove('hidden');
};

window.fecharModalSupervisorDetalhe = function() {
    document.getElementById('modal-supervisor-detalhe')?.classList.add('hidden');
};

function painelSupSparklineHtml(valores, cor) {
    const max = Math.max(1, ...valores.map(v => v.valor));
    return `
        <div class="sup-sparkline">
            ${valores.map(v => `<div class="sup-sparkline-bar" style="height:${Math.max(6, Math.round((v.valor / max) * 100))}%; --sup-cor:${cor};" title="${v.label}: ${v.valor}"></div>`).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:10px; color:var(--text-muted);">
            <span>${valores[0] ? valores[0].label : ''}</span>
            <span>${valores[valores.length - 1] ? valores[valores.length - 1].label : ''}</span>
        </div>
    `;
}

window.renderPainelSupervisor = async function() {
    const heroEl = document.getElementById('painel-supervisor-hero');
    const saudeEl = document.getElementById('painel-supervisor-saude');
    const produtividadeEl = document.getElementById('painel-supervisor-produtividade');
    const efetivoEl = document.getElementById('painel-supervisor-efetivo');
    const estoqueEl = document.getElementById('painel-supervisor-estoque');
    const sinoticoEl = document.getElementById('painel-supervisor-sinotico');
    const anomaliasEl = document.getElementById('painel-supervisor-anomalias');
    const historicoTrocasEl = document.getElementById('painel-supervisor-historico-trocas');
    const previsoesEl = document.getElementById('painel-supervisor-previsoes');
    const qualidadeEl = document.getElementById('painel-supervisor-qualidade');
    const tendenciaEl = document.getElementById('painel-supervisor-tendencia');
    if (!heroEl) return; // aba nem existe nesta sessão (ex: HTML antigo em cache)

    SUP_DETALHE_CACHE = []; // reseta a cada render — índices só valem pra esta tela atual

    const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : (typeof BANCO_ATIVOS !== 'undefined' ? BANCO_ATIVOS : []);
    const atividades = Array.isArray(window.OFICINA_ATIVIDADES_CACHE) ? window.OFICINA_ATIVIDADES_CACHE : (typeof OFICINA_ATIVIDADES_CACHE !== 'undefined' ? OFICINA_ATIVIDADES_CACHE : []);
    const materiais = Array.isArray(window.BANCO_MATERIAIS) ? window.BANCO_MATERIAIS : (typeof BANCO_MATERIAIS !== 'undefined' ? BANCO_MATERIAIS : []);

    // ---------------------------------------------------------
    // SAÚDE DA OFICINA AGORA
    // ---------------------------------------------------------
    const emReparo = ativos.filter(a => a.local === 'Oficina / Reparo');
    const reservaOficina = ativos.filter(a => a.local === 'Oficina / Reserva');
    const reservaMaquina = ativos.filter(a => a.local === 'Máquina / Reserva');
    const criticos = ativos.filter(a => {
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
        return pct >= 80 && !(a.local || '').includes('Oficina');
    });

    const atividadesAtivas = atividades.filter(x => !atividadeAindaNaoComecou(x) && x.status !== 'Concluído' && x.status !== 'Recusado');
    const atividadesAtrasadas = atividadesAtivas.filter(x => atividadeEstaAtrasada(x));
    const atividadesPendentes = atividadesAtivas.filter(x => x.status === 'Pendente');

    // Ranking de peças em reparo há mais tempo (dias) — o que está
    // "empacado" na bancada, não só o total.
    // 🔧 CORREÇÃO ("tabela mostrava 0 dias mesmo com peça há tempo em
    // reparo"): `a.dias` é o campo CRU salvo no banco — fica travado em
    // 0 desde o Saque (ver executarSaqueFinal), porque o dia-a-dia real
    // nunca é escrito de volta no objeto; quem calcula "quantos dias
    // faz" de verdade é window.calcularDias(item), na hora, a partir de
    // `dataReparo` (mesma função usada em toda a tela de Peças em
    // Reparo — ver JS/script.js linha ~255). Usar `a.dias` direto aqui
    // dava sempre 0.
    const reparoMaisAntigos = [...emReparo]
        .map(a => ({ ...a, diasReais: window.calcularDias(a) }))
        .sort((a, b) => b.diasReais - a.diasReais)
        .slice(0, 5);

    // Ranking de áreas por nº de atividades atrasadas — onde apertar.
    const atrasadasPorArea = {};
    atividadesAtrasadas.forEach(x => {
        const chave = x.area || x.solicitante_area || '—';
        atrasadasPorArea[chave] = (atrasadasPorArea[chave] || 0) + 1;
    });
    const rankingAtrasoAreas = Object.entries(atrasadasPorArea).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxAtrasoArea = Math.max(1, ...rankingAtrasoAreas.map(([, v]) => v));

    // ---------------------------------------------------------
    // PRODUTIVIDADE DA EQUIPE
    // ---------------------------------------------------------
    const dataLimite7dias = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
    const concluidas7dias = atividades.filter(x => x.status === 'Concluído' && x.concluido_em && x.concluido_em.slice(0, 10) >= dataLimite7dias);

    // Produtividade por área (só as áreas de tipo "oficina", que têm
    // atividades no mesmo modelo de dados) — pendentes/em andamento x
    // concluídas(7d) x atrasadas.
    const areasOficinaCfg = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : []).filter(a => a.tipo === 'oficina' || a.tipo === 'administrativo');
    const produtividadePorArea = areasOficinaCfg.map(cfg => {
        const doArea = atividades.filter(x => (x.area === cfg.chave || x.solicitante_area === cfg.chave));
        const ativasArea = doArea.filter(x => !atividadeAindaNaoComecou(x) && x.status !== 'Concluído' && x.status !== 'Recusado');
        return {
            chave: cfg.chave,
            nome: cfg.nome,
            cor: cfg.cor || 'var(--text-accent)',
            emAberto: ativasArea.length,
            atrasadas: ativasArea.filter(x => atividadeEstaAtrasada(x)).length,
            concluidas7d: doArea.filter(x => x.status === 'Concluído' && x.concluido_em && x.concluido_em.slice(0, 10) >= dataLimite7dias).length,
        };
    }).filter(a => a.emAberto > 0 || a.concluidas7d > 0)
      .sort((a, b) => (b.emAberto + b.concluidas7d) - (a.emAberto + a.concluidas7d))
      .slice(0, 8);
    const maxProdutividadeArea = Math.max(1, ...produtividadePorArea.map(a => a.emAberto));

    // Ranking de técnicos por atividades concluídas (7 dias) — usa
    // executado_por, preenchido quando alguém clica "Iniciar"/"Concluir".
    const porTecnico = {};
    concluidas7dias.forEach(x => {
        const nome = x.executado_por || x.responsavel;
        if (!nome) return;
        porTecnico[nome] = (porTecnico[nome] || 0) + 1;
    });
    const rankingTecnicos = Object.entries(porTecnico).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxTecnico = Math.max(1, ...rankingTecnicos.map(([, v]) => v));

    // Tempo médio de reparo (dias) — só entre as peças em reparo agora
    // (não temos histórico de "quanto tempo levou" pra peças já
    // devolvidas, então isso é honestamente "tempo médio ATÉ AGORA das
    // peças que estão na bancada", não um tempo médio de ciclo fechado).
    // Mesma correção de reparoMaisAntigos acima: usa window.calcularDias()
    // em vez do campo cru `dias` (que fica travado em 0).
    const diasValidos = emReparo.map(a => window.calcularDias(a)).filter(d => d > 0);
    const tempoMedioReparo = diasValidos.length ? Math.round(diasValidos.reduce((s, d) => s + d, 0) / diasValidos.length) : 0;

    // ---------------------------------------------------------
    // ESTOQUE E LOGÍSTICA
    // ---------------------------------------------------------
    const materiaisZerados = materiais.filter(m => Number(m.qtd) === 0);
    const materiaisBaixo = materiais.filter(m => Number(m.qtd) > 0 && Number(m.qtd) <= PAINEL_SUP_LIMITE_ESTOQUE_BAIXO);
    const transportePendente = atividades.filter(x =>
        (x.area === 'logistica' || x.solicitante_area === 'logistica') &&
        x.status !== 'Concluído' && x.status !== 'Recusado' && !atividadeAindaNaoComecou(x)
    );

    // Reserva Oficina x Máquina agrupada por tipo — o conceito separado
    // nos PRs #140-142 (reserva pronta na oficina vs reserva já alocada
    // fisicamente na máquina/pátio).
    const agruparPorTipo = (lista) => {
        const mapa = {};
        lista.forEach(a => { const t = a.tipo || 'Outro'; mapa[t] = (mapa[t] || 0) + 1; });
        return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
    };
    const reservaOficinaPorTipo = agruparPorTipo(reservaOficina).slice(0, 6);
    const reservaMaquinaPorTipo = agruparPorTipo(reservaMaquina).slice(0, 6);
    const maxReserva = Math.max(1, ...reservaOficinaPorTipo.map(([, v]) => v), ...reservaMaquinaPorTipo.map(([, v]) => v));

    // ---------------------------------------------------------
    // HERO — os 4 números mais críticos, bem grandes
    // ---------------------------------------------------------
    heroEl.innerHTML = `
        <div class="painel-sup-hero-card" style="--sup-cor:#ef4444;" onclick="window.abrirAba(null,'aba-oficina')">
            <div class="sup-hero-label"><i class="fas fa-triangle-exclamation"></i> Atividades Atrasadas</div>
            <div class="sup-hero-num">${atividadesAtrasadas.length}</div>
            <div class="sup-hero-sub">em ${new Set(atividadesAtrasadas.map(x => x.area || x.solicitante_area)).size} área(s) — clique para ir à Central de Áreas</div>
        </div>
        <div class="painel-sup-hero-card" style="--sup-cor:#f59e0b;" onclick="window.abrirAba(null,'aba-reparos')">
            <div class="sup-hero-label"><i class="fas fa-wrench"></i> Peças em Reparo</div>
            <div class="sup-hero-num">${emReparo.length}</div>
            <div class="sup-hero-sub">tempo médio na bancada: ${tempoMedioReparo} dia(s)</div>
        </div>
        <div class="painel-sup-hero-card" style="--sup-cor:#eab308;" onclick="window.abrirAba(null,'aba-fluxo')">
            <div class="sup-hero-label"><i class="fas fa-fire"></i> Equipamentos Críticos</div>
            <div class="sup-hero-num">${criticos.length}</div>
            <div class="sup-hero-sub">desgaste ≥ 80% já instalados no veio</div>
        </div>
        <div class="painel-sup-hero-card" style="--sup-cor:#22c55e;" onclick="window.abrirAba(null,'aba-reservas')">
            <div class="sup-hero-label"><i class="fas fa-boxes"></i> Peças Reserva</div>
            <div class="sup-hero-num">${reservaOficina.length + reservaMaquina.length}</div>
            <div class="sup-hero-sub">${reservaOficina.length} na oficina · ${reservaMaquina.length} na máquina</div>
        </div>
    `;
    document.querySelectorAll('#painel-supervisor-hero .painel-sup-hero-card').forEach(card => {
        // onclick já resolve a navegação (abrirAba aceita event=null); só
        // deixa claro visualmente que é clicável.
        card.style.cursor = 'pointer';
    });

    // ---------------------------------------------------------
    // 🆕 FAIXA DE KPIS (referência) — Áreas Críticas/Em Atenção (mesma
    // conta de calcularStatusArea usada na Central de Áreas) + Não
    // Vistas (mesmo NOTIF_FEED_CACHE usado na Central de Notificações).
    // ---------------------------------------------------------
    const badgesEl = document.getElementById('painel-supervisor-kpi-badges');
    const chavesArea = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : []).map(a => a.chave);
    let areasCriticas = 0, areasAtencao = 0;
    chavesArea.forEach(chave => {
        const st = window.calcularStatusArea(chave);
        if (st.label === 'Crítico') areasCriticas++;
        else if (st.label === 'Restrição' || st.label === 'Atenção') areasAtencao++;
    });
    const naoVistas = (typeof NOTIF_FEED_CACHE !== 'undefined' ? NOTIF_FEED_CACHE : []).filter(item => !item.lida).length;
    if (badgesEl) {
        badgesEl.innerHTML = `
            <div class="sup-kpi-badge" style="--sup-cor:#ef4444;" onclick="window.abrirAba(null,'aba-oficina')"><i class="fas fa-triangle-exclamation"></i> ${areasCriticas} Áreas Críticas</div>
            <div class="sup-kpi-badge" style="--sup-cor:#eab308;" onclick="window.abrirAba(null,'aba-oficina')"><i class="fas fa-circle-exclamation"></i> ${areasAtencao} Em Atenção</div>
            <div class="sup-kpi-badge" style="--sup-cor:#3b82f6;" onclick="window.abrirAba(null,'aba-notificacoes')"><i class="fas fa-bell"></i> ${naoVistas} Não Vistas</div>
        `;
    }

    // ---------------------------------------------------------
    // 🆕 Tendência (7 dias) + donuts (reaproveita as mesmas peças do
    // Painel Geral — mesma função, mesmo dado, nenhum cálculo novo).
    // ---------------------------------------------------------
    const elSupDonutRisco = document.getElementById('painel-supervisor-donut-risco');
    const elSupDonutStatus = document.getElementById('painel-supervisor-donut-status');
    const elSupRankingVeios = document.getElementById('painel-supervisor-ranking-veios');
    if (elSupDonutRisco) elSupDonutRisco.innerHTML = window.construirHtmlDonutRisco(ativos);
    if (elSupDonutStatus) elSupDonutStatus.innerHTML = window.construirHtmlDonutStatus(atividades);
    if (elSupRankingVeios) elSupRankingVeios.innerHTML = window.construirHtmlRankingVeios(ativos);

    const elSupTonelagem = document.getElementById('painel-supervisor-tonelagem');
    if (elSupTonelagem) {
        (async () => {
            try {
                const apiBase = await resolverApiBase();
                const [resGeral, resMoldes] = await Promise.all([
                    fetchComRetry(`${apiBase}/api/historico_apontamentos_geral`),
                    fetchComRetry(`${apiBase}/api/historico_apontamentos_moldes`)
                ]);
                const logsGeral = resGeral.ok ? await resGeral.json() : [];
                const logsMoldes = resMoldes.ok ? await resMoldes.json() : [];
                const logs = [...(Array.isArray(logsGeral) ? logsGeral : []), ...(Array.isArray(logsMoldes) ? logsMoldes : [])]
                    .filter(l => l.desfeito !== 1);
                const dias = [];
                for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.push(d.toISOString().slice(0, 10)); }
                const totalPorDia = {};
                dias.forEach(d => totalPorDia[d] = 0);
                logs.forEach(l => {
                    const dataChave = (l.data_hora || '').slice(0, 10);
                    const soma = (Number(l.qtd_mcc2) || 0) + (Number(l.qtd_mcc3) || 0) + (Number(l.qtd_mcc4) || 0);
                    if (dataChave in totalPorDia) totalPorDia[dataChave] += soma;
                });
                const valores = dias.map(d => totalPorDia[d]);
                const max = Math.max(1, ...valores);
                const largura = 600, altura = 160, passo = largura / (dias.length - 1);
                const pontos = valores.map((v, i) => `${(i * passo).toFixed(1)},${(altura - (v / max) * (altura - 20) - 4).toFixed(1)}`).join(' ');
                const labels = dias.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
                elSupTonelagem.innerHTML = `
                    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:140px; overflow:visible;">
                        <polyline points="${pontos}" fill="none" stroke="var(--info)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
                        ${valores.map((v, i) => `<circle cx="${(i * passo).toFixed(1)}" cy="${(altura - (v / max) * (altura - 20) - 4).toFixed(1)}" r="3.5" fill="var(--info)"></circle>`).join('')}
                    </svg>
                    <div style="display:flex; justify-content:space-between; margin-top:6px;">
                        ${labels.map(l => `<span style="font-size:0.65rem; color:var(--text-muted); text-transform:capitalize;">${l}</span>`).join('')}
                    </div>`;
            } catch (e) {
                elSupTonelagem.innerHTML = `<div class="text-muted" style="text-align:center; margin:auto;">Não foi possível carregar.</div>`;
            }
        })();
    }

    // ---------------------------------------------------------
    // 🆕 Fila de Inspeção Prioritária (tabela) — mesmo critério de
    // ordenação por desgaste já usado em renderizarTopCriticos().
    // ---------------------------------------------------------
    const elSupFila = document.getElementById('painel-supervisor-fila-inspecao');
    if (elSupFila) {
        const instaladosFila = ativos.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina'));
        const filaOrdenada = instaladosFila
            .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 8);
        elSupFila.innerHTML = filaOrdenada.length
            ? filaOrdenada.map(a => {
                const cor = a.pct >= 80 ? 'var(--danger)' : (a.pct >= 50 ? 'var(--warning)' : 'var(--success)');
                const statusLabel = a.pct >= 80 ? 'Crítico' : (a.pct >= 50 ? 'Atenção' : 'Normal');
                const match = (a.local || '').match(/Veio\s*([A-Z])/i);
                return `<tr>
                    <td style="text-align:left;"><strong>${a.id}</strong><br><span class="text-muted" style="font-size:0.72rem;">${a.tipo || ''}</span></td>
                    <td>${a.mcc_compat ? 'MCC ' + a.mcc_compat : '—'}</td>
                    <td><span style="color:${cor}; font-weight:700;">${statusLabel}</span></td>
                    <td style="color:${cor}; font-weight:700;">${a.pct.toFixed(1)}%</td>
                </tr>`;
            }).join('')
            : `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento instalado no veio.</td></tr>`;
    }

    // ---------------------------------------------------------
    // 🆕 RESUMO DA SUPERVISÃO — reaproveita as mesmas contagens da
    // faixa de KPIs + concluídas (7 dias), sem calcular nada de novo.
    // ---------------------------------------------------------
    const elSupResumo = document.getElementById('painel-supervisor-resumo');
    if (elSupResumo) {
        const linha = (label, valor, cor) => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding:6px 0; border-top:1px solid var(--border-color);">
                <span style="color:var(--text-body);"><i class="fas fa-circle" style="color:${cor}; font-size:6px; margin-right:8px;"></i>${label}</span>
                <strong style="color:var(--text-heading); font-family:var(--font-mono);">${valor}</strong>
            </div>`;
        elSupResumo.innerHTML =
            linha('Críticas', areasCriticas, 'var(--danger)') +
            linha('Atenção', areasAtencao, 'var(--warning)') +
            linha('Não vistas', naoVistas, 'var(--info)') +
            linha('Concluídas (7d)', concluidas7dias.length, 'var(--success)');
    }

    // ---------------------------------------------------------
    // 🆕 PRODUÇÃO LANÇADA — mesmo dado real do Painel Geral.
    // ---------------------------------------------------------
    const elSupProducao = document.getElementById('painel-supervisor-producao-lancada');
    if (elSupProducao) {
        window.buscarDadosApontamentos7dias()
            .then(dados => { elSupProducao.innerHTML = window.construirHtmlProducaoLancada(dados); })
            .catch(() => { elSupProducao.innerHTML = `<div class="text-muted" style="text-align:center;">Não foi possível carregar.</div>`; });
    }

    // ---------------------------------------------------------
    // 🆕 ATIVIDADES RECENTES — últimos eventos globais do sistema
    // (mesma fonte da Auditoria, /api/historico_eventos).
    // ---------------------------------------------------------
    const elSupRecentes = document.getElementById('painel-supervisor-atividades-recentes');
    if (elSupRecentes) {
        (async () => {
            try {
                const apiBase = await resolverApiBase();
                const resp = await fetchComRetry(`${apiBase}/api/historico_eventos?limite=6`);
                const eventos = resp.ok ? await resp.json() : [];
                elSupRecentes.innerHTML = Array.isArray(eventos) && eventos.length
                    ? eventos.slice(0, 6).map(e => {
                        const hora = e.data_hora ? new Date(e.data_hora.replace(' ', 'T') + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--';
                        return `
                        <div style="display:flex; gap:10px; padding:8px 0; border-top:1px solid var(--border-color);">
                            <span class="text-muted" style="font-size:0.72rem; font-family:var(--font-mono); flex-shrink:0;">${hora}</span>
                            <span style="font-size:0.8rem; color:var(--text-body);">${e.acao || e.peca_id || 'Evento registrado'}</span>
                        </div>`;
                    }).join('')
                    : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum evento recente.</div>`;
            } catch (e) {
                elSupRecentes.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
            }
        })();
    }

    // ---------------------------------------------------------
    // SEÇÃO 1 — SAÚDE
    // ---------------------------------------------------------
    if (saudeEl) {
        saudeEl.innerHTML = `
            <div class="sup-card" style="--sup-cor:#ef4444;">
                <div class="sup-card-titulo"><span><i class="fas fa-fire"></i> Atraso por Área</span></div>
                ${rankingAtrasoAreas.length
                    ? rankingAtrasoAreas.map(([nome, v]) => painelSupBarraHtml(
                        nome, v, maxAtrasoArea, '#ef4444',
                        `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor(
                            `Atrasadas — ${nome}`,
                            atividadesAtrasadas.filter(x => (x.area || x.solicitante_area) === nome),
                            'atividade'
                        )})`
                    )).join('')
                    : `<div class="sup-vazio">Nenhuma atividade atrasada agora 👍</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#f59e0b;">
                <div class="sup-card-titulo"><span><i class="fas fa-hourglass-half"></i> Peças Há Mais Tempo em Reparo</span></div>
                ${reparoMaisAntigos.length
                    ? reparoMaisAntigos.map(a => `
                        <div class="sup-lista-linha sup-lista-linha-clicavel" onclick="window.abrirHistoricoIndividual('${a.id}')">
                            <span style="color:var(--text-body);">${a.id} <span class="text-muted">(${a.tipo || '—'})</span></span>
                            <span style="font-weight:700; color:${a.diasReais > 15 ? '#ef4444' : '#f59e0b'};">${a.diasReais}d</span>
                        </div>
                    `).join('')
                    : `<div class="sup-vazio">Nenhuma peça em reparo no momento.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#eab308;">
                <div class="sup-card-titulo"><span><i class="fas fa-clipboard-list"></i> Pendentes vs Críticos Agora</span></div>
                ${painelSupBarraHtml('Pendentes (não iniciadas)', atividadesPendentes.length, Math.max(atividadesPendentes.length, atividadesAtrasadas.length, 1), '#eab308',
                    `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Pendentes (não iniciadas)', atividadesPendentes, 'atividade')})`)}
                ${painelSupBarraHtml('Atrasadas', atividadesAtrasadas.length, Math.max(atividadesPendentes.length, atividadesAtrasadas.length, 1), '#ef4444',
                    `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Atrasadas', atividadesAtrasadas, 'atividade')})`)}
                ${painelSupBarraHtml('Equip. críticos (desgaste ≥80%)', criticos.length, Math.max(criticos.length, 1), '#f97316',
                    `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Equipamentos Críticos (desgaste ≥80%)', criticos, 'ativo')})`)}
            </div>
            <div class="sup-card" style="--sup-cor:#06b6d4; grid-column: 1 / -1;">
                <div class="sup-card-titulo"><span><i class="fas fa-list-check"></i> Progresso dos Checklists de Execução em Andamento</span></div>
                <div id="painel-sup-checklist-progresso"><div class="sup-vazio">Carregando…</div></div>
            </div>
        `;
    }

    // ---------------------------------------------------------
    // SEÇÃO 2 — PRODUTIVIDADE
    // ---------------------------------------------------------
    if (produtividadeEl) {
        produtividadeEl.innerHTML = `
            <div class="sup-card" style="--sup-cor:#3b82f6;">
                <div class="sup-card-titulo"><span><i class="fas fa-industry"></i> Em Aberto por Área</span></div>
                ${produtividadePorArea.length
                    ? produtividadePorArea.map(a => painelSupBarraHtml(a.nome, a.emAberto, maxProdutividadeArea, a.cor)).join('')
                    : `<div class="sup-vazio">Sem atividades em aberto registradas.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#22c55e;">
                <div class="sup-card-titulo"><span><i class="fas fa-medal"></i> Top Técnicos (concluídas, 7 dias)</span></div>
                ${rankingTecnicos.length
                    ? rankingTecnicos.map(([nome, v]) => painelSupBarraHtml(nome, v, maxTecnico, '#22c55e')).join('')
                    : `<div class="sup-vazio">Ainda sem dado suficiente — atividades concluídas nos últimos 7 dias não têm responsável/executor registrado.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#38bdf8;">
                <div class="sup-card-titulo"><span><i class="fas fa-gauge-high"></i> Resumo Geral (7 dias)</span></div>
                ${painelSupBarraHtml('Concluídas', concluidas7dias.length, Math.max(concluidas7dias.length, atividadesPendentes.length, 1), '#22c55e')}
                ${painelSupBarraHtml('Pendentes agora', atividadesPendentes.length, Math.max(concluidas7dias.length, atividadesPendentes.length, 1), '#eab308')}
                ${painelSupBarraHtml('Atrasadas agora', atividadesAtrasadas.length, Math.max(concluidas7dias.length, atividadesPendentes.length, 1), '#ef4444')}
            </div>
        `;
    }

    // ---------------------------------------------------------
    // SEÇÃO 3 — ESTOQUE E LOGÍSTICA
    // ---------------------------------------------------------
    if (estoqueEl) {
        estoqueEl.innerHTML = `
            <div class="sup-card" style="--sup-cor:#22c55e;">
                <div class="sup-card-titulo"><span><i class="fas fa-warehouse"></i> Reserva na Oficina</span></div>
                ${reservaOficinaPorTipo.length
                    ? reservaOficinaPorTipo.map(([nome, v]) => painelSupBarraHtml(nome, v, maxReserva, '#22c55e')).join('')
                    : `<div class="sup-vazio">Nenhuma peça reserva na oficina agora.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#a855f7;">
                <div class="sup-card-titulo"><span><i class="fas fa-truck-ramp-box"></i> Reserva na Máquina</span></div>
                ${reservaMaquinaPorTipo.length
                    ? reservaMaquinaPorTipo.map(([nome, v]) => painelSupBarraHtml(nome, v, maxReserva, '#a855f7')).join('')
                    : `<div class="sup-vazio">Nenhuma peça reserva alocada em máquina agora.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#ef4444;">
                <div class="sup-card-titulo">
                    <span><i class="fas fa-boxes-packing"></i> Materiais em Falta</span>
                    <button class="btn-xs-primary" onclick="window.abrirAba(null,'aba-almoxarifado')" style="color:var(--brand); background:var(--brand-bg);">Ver Almoxarifado <i class="fas fa-arrow-right"></i></button>
                </div>
                ${painelSupBarraHtml('Zerados', materiaisZerados.length, Math.max(materiaisZerados.length, materiaisBaixo.length, 1), '#ef4444')}
                ${painelSupBarraHtml(`Saldo baixo (≤${PAINEL_SUP_LIMITE_ESTOQUE_BAIXO})`, materiaisBaixo.length, Math.max(materiaisZerados.length, materiaisBaixo.length, 1), '#f59e0b')}
                ${materiaisZerados.length
                    ? materiaisZerados.slice(0, 4).map(m => `<div class="sup-lista-linha"><span class="text-muted" style="font-size:11.5px;">${m.descricao}</span><span style="color:#ef4444; font-weight:700;">0</span></div>`).join('')
                    : ''}
            </div>
            <div class="sup-card" style="--sup-cor:#eab308;">
                <div class="sup-card-titulo"><span><i class="fas fa-truck"></i> Transporte Pendente (Logística)</span></div>
                ${transportePendente.length
                    ? transportePendente.slice(0, 6).map(x => `
                        <div class="sup-lista-linha">
                            <span style="color:var(--text-body);">${x.descricao || 'Sem descrição'}</span>
                            <span style="font-weight:700; color:${atividadeEstaAtrasada(x) ? '#ef4444' : '#eab308'};">${(x.status || '').toUpperCase()}</span>
                        </div>
                    `).join('')
                    : `<div class="sup-vazio">Nenhum transporte pendente na Logística agora.</div>`}
            </div>
        `;
    }

    // ---------------------------------------------------------
    // SEÇÃO — OCUPAÇÃO DOS VEIOS (SINÓTICO): quantos equipamentos estão
    // de fato instalados por MCC agora, e em que condição (mesmo corte
    // verde <50% / amarelo 50-79% / vermelho ≥80% usado em
    // renderizarGraficosMCC/painel de veios) — um resumo do que o
    // Sinótico 3D mostra em 3D, aqui em números.
    // ---------------------------------------------------------
    if (sinoticoEl) {
        const corPctDesgaste = (a) => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            if (pct >= 80) return 'vermelho';
            if (pct >= 50) return 'amarelo';
            return 'verde';
        };
        const mccsSinotico = ['4', '2', '3'].map((mcc) => {
            const instalados = ativos.filter(a => a.status === 'Instalado' && (a.local || '').includes(`MCC ${mcc}`));
            return {
                mcc,
                total: instalados.length,
                verde: instalados.filter(a => corPctDesgaste(a) === 'verde').length,
                amarelo: instalados.filter(a => corPctDesgaste(a) === 'amarelo').length,
                vermelho: instalados.filter(a => corPctDesgaste(a) === 'vermelho').length,
            };
        });
        const totalInstaladosGeral = mccsSinotico.reduce((s, l) => s + l.total, 0);

        sinoticoEl.innerHTML = totalInstaladosGeral > 0
            ? mccsSinotico.map(l => `
                <div class="sup-card">
                    <div class="sup-card-titulo"><span><i class="fas fa-server"></i> MCC ${l.mcc}</span><span style="font-weight:800; color:var(--text-heading);">${l.total} instalado${l.total === 1 ? '' : 's'}</span></div>
                    ${l.total > 0
                        ? painelSupBarraHtml('🟢 Verde (<50% desgaste)', l.verde, l.total, 'var(--success)')
                            + painelSupBarraHtml('🟡 Amarelo (50-79%)', l.amarelo, l.total, 'var(--warning)')
                            + painelSupBarraHtml('🔴 Vermelho (≥80%)', l.vermelho, l.total, 'var(--danger)')
                        : `<div class="sup-vazio">Nenhum equipamento instalado nesse MCC agora.</div>`}
                </div>
            `).join('')
            : `<div class="sup-vazio">Sem equipamentos instalados em nenhum veio agora.</div>`;
    }

    // ---------------------------------------------------------
    // ANOMALIAS DE ROLO / MANCAL / HIDRÁULICA (dentro da seção Sinótico):
    // esses 3 campos (rolos_travados, mancais_ocorrencias,
    // barra_transversal) só existem no Sinótico 3D — BANCO_ATIVOS (o
    // banco compartilhado do resto do app) só carrega rolos_travados,
    // os outros dois nunca são mapeados nele. Por isso busca direto em
    // /api/pecas (SELECT * — todas as colunas cruas da peça), replicando
    // o MESMO parsing que o Sinótico 3D usa (parseRolosTravados/
    // parseMancais/parseBarraTransversal, ver Sinotico3d.html) em vez de
    // inventar uma lógica nova.
    // ---------------------------------------------------------
    if (anomaliasEl) {
        anomaliasEl.innerHTML = `<div class="sup-vazio">Carregando…</div>`;
        try {
            const apiBase = await resolverApiBase();
            const respPecas = await fetch(`${apiBase}/api/pecas`, { cache: 'no-store' });
            const pecasCruas = respPecas.ok ? await respPecas.json() : [];

            const comRoloTravado = [];
            const comMancalOcorrencia = [];
            const comHidraulicaRuim = [];

            (Array.isArray(pecasCruas) ? pecasCruas : []).forEach(p => {
                // Rolos travados: JSON array de ids de rolo travado.
                let rolos = [];
                try { rolos = JSON.parse(p.rolos_travados || '[]'); } catch (e) { rolos = []; }
                if (Array.isArray(rolos) && rolos.length > 0) comRoloTravado.push({ id: p.id, qtd: rolos.length });

                // Mancais: JSON objeto { posição: tipo_ocorrência }.
                let mancais = {};
                try { mancais = JSON.parse(p.mancais_ocorrencias || '{}'); } catch (e) { mancais = {}; }
                const chavesMancal = mancais && typeof mancais === 'object' ? Object.keys(mancais) : [];
                if (chavesMancal.length > 0) comMancalOcorrencia.push({ id: p.id, qtd: chavesMancal.length });

                // Sistema hidráulico (barra transversal/cilindros/porcas):
                // JSON objeto { componente: { ocorrencia, obs? } } — conta
                // qualquer componente com ocorrência registrada e diferente
                // de "ok" (mesmo padrão do Sinótico, só sem resolver a cor
                // exata de severidade — aqui é só "tem ou não tem").
                let barra = {};
                try { barra = JSON.parse(p.barra_transversal || '{}'); } catch (e) { barra = {}; }
                const componentesComOcorrencia = barra && typeof barra === 'object'
                    ? Object.values(barra).filter(r => r && r.ocorrencia && r.ocorrencia !== 'ok').length
                    : 0;
                if (componentesComOcorrencia > 0) comHidraulicaRuim.push({ id: p.id, qtd: componentesComOcorrencia });
            });

            // 🆕 Cada linha agora abre o Sinótico 3D já direto na peça
            // (Sinotico3d.html?tag=<id> — ver abrirPecaPorTagNaURL lá),
            // nova aba, em vez de ser só texto — clicar leva pra
            // ocorrência de verdade, não só informa que ela existe.
            const cardAnomalia = (titulo, icone, cor, lista, unidade) => `
                <div class="sup-card" style="--sup-cor:${cor};">
                    <div class="sup-card-titulo"><span><i class="fas ${icone}"></i> ${titulo}</span><span style="font-weight:800; color:${cor};">${lista.length}</span></div>
                    ${lista.length
                        ? lista.slice(0, 6).map(x => `
                            <a class="sup-lista-linha sup-lista-linha-clicavel" href="Sinotico3d.html?tag=${encodeURIComponent(x.id)}" target="_blank" title="Abrir ${x.id} no Sinótico 3D">
                                <span style="color:var(--text-body);">${x.id} <i class="fas fa-arrow-up-right-from-square" style="font-size:9px; color:var(--text-muted);"></i></span>
                                <span class="text-muted" style="font-size:11px;">${x.qtd} ${unidade}${x.qtd === 1 ? '' : 's'}</span>
                            </a>
                        `).join('')
                        : `<div class="sup-vazio">Nenhuma ocorrência registrada 👍</div>`}
                </div>
            `;

            anomaliasEl.innerHTML =
                cardAnomalia('Rolo Travado', 'fa-lock', '#ef4444', comRoloTravado, 'rolo')
                + cardAnomalia('Mancal com Ocorrência', 'fa-gear', '#f59e0b', comMancalOcorrencia, 'mancal')
                + cardAnomalia('Hidráulica com Anomalia', 'fa-droplet', '#eab308', comHidraulicaRuim, 'componente');
        } catch (e) {
            console.error('⚠️ Não consegui carregar anomalias (rolo/mancal/hidráulica) no Painel do Supervisor:', e);
            anomaliasEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // HISTÓRICO DE TROCA NA MÁQUINA: cada Swap/instalação já grava 2
    // linhas no histórico de auditoria (registrarHistorico → log_eventos,
    // ver iniciarSwapAlocacao em JS/script.js — "📥 Entrou no slot..." /
    // "📤 Saiu do slot..."). /api/registros_ocorrencia NÃO devolve esses
    // eventos (filtra "categoria IS NOT NULL", e esses vão sem
    // categoria) — por isso usa /api/historico_eventos (histórico
    // completo, sem esse filtro) e separa só os de troca/instalação.
    // ---------------------------------------------------------
    if (historicoTrocasEl) {
        historicoTrocasEl.innerHTML = `<div class="sup-vazio">Carregando…</div>`;
        try {
            const apiBase = await resolverApiBase();
            const respHistorico = await fetch(`${apiBase}/api/historico_eventos?limite=400`, { cache: 'no-store' });
            const eventos = respHistorico.ok ? await respHistorico.json() : [];

            const trocas = (Array.isArray(eventos) ? eventos : [])
                .filter(e => (e.acao || '').includes('Entrou no slot'))
                .slice(0, 12);

            historicoTrocasEl.innerHTML = trocas.length
                ? `<div class="sup-card" style="--sup-cor:#6366f1; grid-column: 1 / -1;">` + trocas.map(e => `
                    <div class="sup-lista-linha">
                        <span style="color:var(--text-body);"><span class="font-code" style="font-weight:700; color:var(--text-heading);">${e.peca_id}</span> — ${e.acao}</span>
                        <span class="text-muted" style="font-size:11px; white-space:nowrap; margin-left:10px;">${e.operador || 'Sistema'} · ${(e.data_hora || '').slice(0, 16).replace('T', ' ')}</span>
                    </div>
                `).join('') + `</div>`
                : `<div class="sup-vazio">Nenhuma troca/instalação registrada ainda.</div>`;
        } catch (e) {
            console.error('⚠️ Não consegui carregar o histórico de trocas no Painel do Supervisor:', e);
            historicoTrocasEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // SEÇÃO — EFETIVO POR ÁREA: todo o pessoal cadastrado na planilha do
    // efetivo (ver /api/oficina/equipe/{area}, já usada no modal "Equipe
    // da Área"), agora somado e separado por área numa visão só. Busca
    // em paralelo (Promise.all) pra não fazer o supervisor esperar N
    // chamadas em sequência — é só leitura, sem endpoint novo.
    // ---------------------------------------------------------
    if (efetivoEl) {
        efetivoEl.innerHTML = `<div class="sup-vazio">Carregando efetivo…</div>`;
        try {
            const apiBase = await resolverApiBase();
            const areasComEquipe = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : []).filter(a => a.tipo === 'oficina' || a.tipo === 'administrativo');
            const resultadosEfetivo = await Promise.all(areasComEquipe.map(async cfg => {
                try {
                    const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(cfg.chave)}`, { cache: 'no-store' });
                    const lista = resp.ok ? await resp.json() : [];
                    return { cfg, lista: Array.isArray(lista) ? lista : [] };
                } catch (e) {
                    return { cfg, lista: [] };
                }
            }));
            const areasComGente = resultadosEfetivo.filter(r => r.lista.length > 0).sort((a, b) => b.lista.length - a.lista.length);
            const totalEfetivo = resultadosEfetivo.reduce((s, r) => s + r.lista.length, 0);

            const tituloEfetivoEl = document.getElementById('painel-sup-efetivo-titulo');
            if (tituloEfetivoEl) {
                tituloEfetivoEl.innerHTML = `Efetivo da Oficina <span style="color:var(--brand);">(${totalEfetivo})</span><small>todo mundo, separado por área</small>`;
            }

            efetivoEl.innerHTML = areasComGente.length
                ? `<div class="sup-efetivo-grid">` + areasComGente.map(({ cfg, lista }) => `
                    <div class="sup-efetivo-chip" onclick="window.abrirAreaOficina('${cfg.chave}', 'equipe')" title="${lista.map(p => `${p.nome} — ${p.cargo || 'sem cargo'}`).join('\n')}">
                        <span class="sup-efetivo-chip-num">${lista.length}</span>
                        <span class="sup-efetivo-chip-nome">${cfg.nome}<small>${lista.length === 1 ? '1 pessoa' : lista.length + ' pessoas'}</small></span>
                    </div>
                `).join('') + `</div>`
                : `<div class="sup-vazio">Nenhuma área com efetivo cadastrado ainda.</div>`;
        } catch (e) {
            console.error('⚠️ Não consegui carregar o efetivo por área no Painel do Supervisor:', e);
            efetivoEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar o efetivo agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // PROGRESSO DOS CHECKLISTS DE EXECUÇÃO EM ANDAMENTO (dentro da seção
    // Saúde): usa a mesma rota que a sub-aba "Reparo em Andamento" já
    // consome (/api/checklist-execucao/execucoes/todas) pra saber QUAIS
    // reparos estão rolando agora.
    //
    // 🔧 CORREÇÃO ("tudo aparecia 0%, mas tinha reparo mais avançado"): a
    // primeira versão fazia fetch avulso em /status/{id} pra cada um, por
    // conta própria. Em vez disso, reaproveita
    // window.carregarStatusChecklistExecucaoReparo() + o cache
    // window.CHECKLIST_EXECUCAO_STATUS_CACHE (JS/Oficina/checklist-
    // execucao.js) — é o MESMO carregador que já alimenta os botões de
    // "Reparo em Andamento" (testado em produção); reimplementar o fetch
    // na mão aqui só criava chance de divergir. `forcar=true` pra sempre
    // pegar o número mais recente ao abrir o painel, não um cache velho
    // de outra tela.
    // ---------------------------------------------------------
    const progressoChecklistEl = document.getElementById('painel-sup-checklist-progresso');
    if (progressoChecklistEl) {
        try {
            const apiBase = await resolverApiBase();
            const respExecucoes = await fetch(`${apiBase}/api/checklist-execucao/execucoes/todas`, { cache: 'no-store' });
            const execucoes = respExecucoes.ok ? await respExecucoes.json() : [];

            if (!Array.isArray(execucoes) || execucoes.length === 0) {
                progressoChecklistEl.innerHTML = `<div class="sup-vazio">Nenhum checklist de execução em andamento agora.</div>`;
            } else {
                if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
                    await window.carregarStatusChecklistExecucaoReparo(execucoes.map(ex => ex.equipamento_id), true);
                }
                const cacheStatus = window.CHECKLIST_EXECUCAO_STATUS_CACHE || {};
                const comProgresso = execucoes.map(ex => {
                    const status = cacheStatus[ex.equipamento_id];
                    return { ...ex, percentual: status ? Number(status.percentual) || 0 : 0, total: status ? status.total : 0 };
                });
                comProgresso.sort((a, b) => a.percentual - b.percentual); // menor % primeiro — o que mais precisa de atenção

                const mediaGeral = Math.round(comProgresso.reduce((s, e) => s + e.percentual, 0) / comProgresso.length);
                const corPct = (p) => p >= 70 ? '#22c55e' : (p >= 35 ? '#eab308' : '#ef4444');

                // 🔧 A pedido do usuário: em vez de uma lista corrida só
                // com os 8 "piores" (escondendo o resto atrás de "+N
                // outros"), separa TODOS os reparos em andamento por MCC
                // — mesmo agrupamento usado no resto do painel (Sinótico,
                // Estoque) — pra dar uma visão completa de uma vez.
                const porMcc = {};
                comProgresso.forEach(ex => {
                    const peca = ativos.find(a => a.id === ex.equipamento_id);
                    const mcc = (peca && peca.mcc_compat) || '—';
                    if (!porMcc[mcc]) porMcc[mcc] = [];
                    porMcc[mcc].push(ex);
                });
                const ordemMcc = ['4', '2', '3', '2/3', '—'];
                const mccsOrdenados = Object.keys(porMcc).sort((a, b) => {
                    const ia = ordemMcc.indexOf(a), ib = ordemMcc.indexOf(b);
                    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                });

                progressoChecklistEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
                        <div style="font-size:1.8rem; font-weight:800; color:${corPct(mediaGeral)};">${mediaGeral}%</div>
                        <div style="font-size:11.5px; color:var(--text-muted);">média de conclusão entre os ${comProgresso.length} reparo(s) com checklist em andamento agora</div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px;">
                    ${mccsOrdenados.map(mcc => `
                        <div>
                            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin-bottom:6px;">
                                <i class="fas fa-server"></i> ${mcc === '—' ? 'Sem MCC identificado' : `MCC ${mcc}`} (${porMcc[mcc].length})
                            </div>
                            ${porMcc[mcc].map(ex => `
                                <div class="sup-barra-linha">
                                    <span class="sup-barra-nome" title="${ex.equipamento_id} — ${ex.tecnico_nome || 'sem técnico'}">${ex.equipamento_id}</span>
                                    <span class="sup-barra-trilho"><span class="sup-barra-preenchimento" style="width:${Math.max(4, ex.percentual)}%; background:${corPct(ex.percentual)};"></span></span>
                                    <span class="sup-barra-valor">${ex.percentual}%</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                    </div>
                `;
            }
        } catch (e) {
            console.error('⚠️ Não consegui carregar o progresso dos checklists no Painel do Supervisor:', e);
            progressoChecklistEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // SEÇÃO — QUALIDADE E COMUNICAÇÃO: 6 fontes já existentes no
    // sistema, cada uma com rota EM LOTE própria (sem precisar de N
    // chamadas por área) — padrões de defeito recorrentes, mensagens
    // Área↔ADM não lidas, avisos ainda sem confirmação de leitura de
    // todo mundo, ocorrências mais recentes, laudos gerados recentemente
    // e o ranking de retrabalho (atividades reabertas) por tipo de
    // equipamento — o "o que mais trava" que dá pra medir hoje, já que
    // o Checklist de Execução não guarda histórico por etapa individual
    // (só o total/marcadas da execução em andamento).
    // ---------------------------------------------------------
    if (qualidadeEl) {
        qualidadeEl.innerHTML = `<div class="sup-vazio">Carregando…</div>`;
        try {
            const apiBase = await resolverApiBase();
            const [respPadroes, respMensagens, respAvisos, respOcorrencias, respLaudos, respReabertas] = await Promise.all([
                fetch(`${apiBase}/api/qualidade/achados/padroes`, { cache: 'no-store' }).catch(() => null),
                fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store' }).catch(() => null),
                fetch(`${apiBase}/api/avisos/todos`, { cache: 'no-store' }).catch(() => null),
                fetch(`${apiBase}/api/registros_ocorrencia?limite=6`, { cache: 'no-store' }).catch(() => null),
                fetch(`${apiBase}/api/laudos?limite=100`, { cache: 'no-store' }).catch(() => null),
                fetch(`${apiBase}/api/oficina/atividades/mais_reabertas?limite=20`, { cache: 'no-store' }).catch(() => null),
            ]);
            const padroes = respPadroes && respPadroes.ok ? await respPadroes.json() : [];
            const mensagensResumo = respMensagens && respMensagens.ok ? await respMensagens.json() : [];
            const avisosTodos = respAvisos && respAvisos.ok ? await respAvisos.json() : [];
            const ocorrencias = respOcorrencias && respOcorrencias.ok ? await respOcorrencias.json() : [];
            const laudos = respLaudos && respLaudos.ok ? await respLaudos.json() : [];
            const reabertas = respReabertas && respReabertas.ok ? await respReabertas.json() : [];

            const mensagensNaoLidas = (Array.isArray(mensagensResumo) ? mensagensResumo : []).filter(m => Number(m.nao_lidas) > 0);
            const avisosAtivosPendentes = (Array.isArray(avisosTodos) ? avisosTodos : [])
                .filter(a => a.ativo && Number(a.total_leram) < Number(a.total_colaboradores))
                .sort((a, b) => (a.total_leram / (a.total_colaboradores || 1)) - (b.total_leram / (b.total_colaboradores || 1)));

            // Laudos dos últimos 7 dias (criado_em vem como texto tipo
            // "2026-09-15..." — mesmo corte de data usado em todo o resto
            // do painel).
            const laudos7dias = (Array.isArray(laudos) ? laudos : []).filter(l => l.criado_em && l.criado_em.slice(0, 10) >= dataLimite7dias);

            // Retrabalho por TIPO de equipamento (não só por tag) — cruza
            // equipamento_id de cada atividade reaberta com BANCO_ATIVOS
            // pra somar por tipo (ex: "3x Molde reabriram", não só "M4-12
            // reabriu 3x").
            const reaberturasPorTipo = {};
            (Array.isArray(reabertas) ? reabertas : []).forEach(r => {
                const peca = ativos.find(a => a.id === r.equipamento_id);
                const chave = peca ? peca.tipo : (r.equipamento_id || 'Tarefa avulsa');
                reaberturasPorTipo[chave] = (reaberturasPorTipo[chave] || 0) + (Number(r.reaberturas_count) || 1);
            });
            const rankingReaberturas = Object.entries(reaberturasPorTipo).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const maxReaberturas = Math.max(1, ...rankingReaberturas.map(([, v]) => v));

            qualidadeEl.innerHTML = `
                <div class="sup-card" style="--sup-cor:#a855f7;">
                    <div class="sup-card-titulo"><span><i class="fas fa-magnifying-glass"></i> Defeitos Recorrentes (Qualidade)</span></div>
                    ${Array.isArray(padroes) && padroes.length
                        ? padroes.slice(0, 5).map(p => `
                            <div class="sup-lista-linha">
                                <span style="color:var(--text-body);">${p.categoria}</span>
                                <span style="font-weight:700; color:#a855f7;">${p.total_equipamentos} equip.</span>
                            </div>
                        `).join('')
                        : `<div class="sup-vazio">Nenhum padrão de defeito recorrente nos últimos dias 👍</div>`}
                </div>
                <div class="sup-card" style="--sup-cor:#ec4899;">
                    <div class="sup-card-titulo">
                        <span><i class="fas fa-comment-dots"></i> Mensagens Área ↔ ADM Não Lidas</span>
                        <button class="btn-xs-primary" onclick="window.abrirAba(null,'aba-oficina')" style="color:var(--brand); background:var(--brand-bg);">Ver <i class="fas fa-arrow-right"></i></button>
                    </div>
                    ${mensagensNaoLidas.length
                        ? mensagensNaoLidas.slice(0, 6).map(m => `
                            <div class="sup-lista-linha sup-lista-linha-clicavel" onclick="window.abrirChatAdmArea('${m.area}')">
                                <span style="color:var(--text-body);">${m.nome_area || m.area}</span>
                                <span style="font-weight:700; color:#ec4899;">${m.nao_lidas}</span>
                            </div>
                        `).join('')
                        : `<div class="sup-vazio">Nenhuma mensagem pendente 👍</div>`}
                </div>
                <div class="sup-card" style="--sup-cor:#f59e0b;">
                    <div class="sup-card-titulo"><span><i class="fas fa-bullhorn"></i> Avisos Ainda Sem Confirmação de Todos</span></div>
                    ${avisosAtivosPendentes.length
                        ? avisosAtivosPendentes.slice(0, 5).map(a => `
                            <div class="sup-lista-linha">
                                <span style="color:var(--text-body);" title="${a.titulo}">${(a.titulo || 'Sem título').length > 34 ? a.titulo.slice(0, 34) + '…' : (a.titulo || 'Sem título')}</span>
                                <span style="font-weight:700; color:#f59e0b;">${a.total_leram}/${a.total_colaboradores}</span>
                            </div>
                        `).join('')
                        : `<div class="sup-vazio">Nenhum aviso ativo pendente de leitura 👍</div>`}
                </div>
                <div class="sup-card" style="--sup-cor:#38bdf8;">
                    <div class="sup-card-titulo"><span><i class="fas fa-triangle-exclamation"></i> Ocorrências Mais Recentes</span></div>
                    ${Array.isArray(ocorrencias) && ocorrencias.length
                        ? ocorrencias.slice(0, 6).map(o => `
                            <div class="sup-lista-linha${o.peca_id ? ' sup-lista-linha-clicavel' : ''}" ${o.peca_id ? `onclick="window.abrirHistoricoIndividual('${o.peca_id}')"` : ''}>
                                <span style="color:var(--text-body);">${o.peca_id ? o.peca_id + ' — ' : ''}${o.categoria || o.acao || 'Registro'}</span>
                                <span class="text-muted" style="font-size:11px;">${(o.data_hora || '').slice(0, 10).split('-').reverse().join('/')}</span>
                            </div>
                        `).join('')
                        : `<div class="sup-vazio">Nenhuma ocorrência registrada recentemente.</div>`}
                </div>
                <div class="sup-card" style="--sup-cor:#22c55e;">
                    <div class="sup-card-titulo"><span><i class="fas fa-file-circle-check"></i> Laudos Gerados (7 dias)</span></div>
                    <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:${laudos7dias.length ? '10px' : '0'};">
                        <div style="font-size:1.6rem; font-weight:700; color:#22c55e;">${laudos7dias.length}</div>
                        <div style="font-size:11px; color:var(--text-muted);">reparo(s) formalmente encerrado(s) nos últimos 7 dias</div>
                    </div>
                    ${laudos7dias.length
                        ? laudos7dias.slice(0, 5).map(l => `
                            <div class="sup-lista-linha${l.peca_id ? ' sup-lista-linha-clicavel' : ''}" ${l.peca_id ? `onclick="window.abrirHistoricoIndividual('${l.peca_id}')"` : ''}>
                                <span style="color:var(--text-body);">${l.peca_id}<span class="text-muted"> — ${l.tipo || ''}</span></span>
                                <span class="text-muted" style="font-size:11px;">${(l.criado_em || '').slice(0, 10).split('-').reverse().join('/')}</span>
                            </div>
                        `).join('')
                        : `<div class="sup-vazio">Nenhum laudo gerado nos últimos 7 dias.</div>`}
                </div>
                <div class="sup-card" style="--sup-cor:#f97316; grid-column: 1 / -1;">
                    <div class="sup-card-titulo"><span><i class="fas fa-arrows-rotate"></i> Retrabalho — Tipos Que Mais Reabrem (travam o fluxo)</span></div>
                    ${rankingReaberturas.length
                        ? rankingReaberturas.map(([nome, v]) => painelSupBarraHtml(
                            nome, v, maxReaberturas, '#f97316',
                            `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor(
                                `Retrabalho — ${nome}`,
                                reabertas.filter(r => {
                                    const peca = ativos.find(a => a.id === r.equipamento_id);
                                    const chave = peca ? peca.tipo : (r.equipamento_id || 'Tarefa avulsa');
                                    return chave === nome;
                                }),
                                'atividade'
                            )})`
                        )).join('')
                        : `<div class="sup-vazio">Nenhuma atividade reaberta registrada 👍 — sem retrabalho até agora.</div>`}
                </div>
            `;
        } catch (e) {
            console.error('⚠️ Não consegui carregar Qualidade e Comunicação no Painel do Supervisor:', e);
            qualidadeEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // SEÇÃO 4 — HISTÓRICO E TENDÊNCIA
    // ---------------------------------------------------------
    if (tendenciaEl) {
        // Concluídas por dia (últimos 14 dias) — derivado de
        // OFICINA_ATIVIDADES_CACHE (concluido_em), sem endpoint novo.
        const dias14 = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dias14.push(d.toISOString().slice(0, 10));
        }
        const concluidasPorDia = dias14.map(dia => ({
            label: dia.slice(8, 10) + '/' + dia.slice(5, 7),
            valor: atividades.filter(x => x.status === 'Concluído' && x.concluido_em && x.concluido_em.slice(0, 10) === dia).length
        }));
        const totalConcluidas14 = concluidasPorDia.reduce((s, v) => s + v.valor, 0);

        tendenciaEl.innerHTML = `
            <div class="sup-card" style="--sup-cor:#f59e0b;">
                <div class="sup-card-titulo"><span><i class="fas fa-chart-column"></i> Atividades Concluídas por Dia (14 dias)</span></div>
                ${totalConcluidas14 > 0
                    ? painelSupSparklineHtml(concluidasPorDia, '#f59e0b')
                    : `<div class="sup-vazio">Ainda sem dado suficiente de conclusões nos últimos 14 dias.</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:#3b82f6;">
                <div class="sup-card-titulo"><span><i class="fas fa-file-invoice"></i> Ordens de Serviço por Status</span></div>
                <div id="painel-sup-os-trend"><div class="sup-vazio">Carregando…</div></div>
            </div>
            <div class="sup-card" style="--sup-cor:#a855f7;">
                <div class="sup-card-titulo"><span><i class="fas fa-file-invoice"></i> OS Registradas por Dia (14 dias)</span></div>
                <div id="painel-sup-os-sparkline"><div class="sup-vazio">Carregando…</div></div>
            </div>
        `;

        // Busca as OS já é a mesma rota usada em outras telas — sem
        // endpoint novo, só reaproveitando o que o app já consome.
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/ordens_servico?limite=500`, { cache: 'no-store' });
            const listaOs = resp.ok ? await resp.json() : [];
            if (Array.isArray(listaOs)) {
                // 🔧 Status real de OS é "Em Andamento" | "Concluído" | "Não
                // Executada" (ver routers/ordens_servico.py) — antes isso
                // só separava em "abertas" (tudo que não é Concluído,
                // misturando Em Andamento com Não Executada) x "fechadas".
                // Agora mostra os 3 status reais separados.
                const emAndamentoOs = listaOs.filter(o => o.status === 'Em Andamento').length;
                const concluidasOs = listaOs.filter(o => o.status === 'Concluído').length;
                const naoExecutadasOs = listaOs.filter(o => o.status === 'Não Executada').length;
                const maxOs = Math.max(emAndamentoOs, concluidasOs, naoExecutadasOs, 1);
                const trendEl = document.getElementById('painel-sup-os-trend');
                if (trendEl) {
                    trendEl.innerHTML = (emAndamentoOs + concluidasOs + naoExecutadasOs) > 0
                        ? painelSupBarraHtml('Em Andamento', emAndamentoOs, maxOs, '#eab308',
                            `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('OS Em Andamento', listaOs.filter(o => o.status === 'Em Andamento'), 'os')})`)
                            + painelSupBarraHtml('Concluídas', concluidasOs, maxOs, '#22c55e',
                                `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('OS Concluídas', listaOs.filter(o => o.status === 'Concluído'), 'os')})`)
                            + (naoExecutadasOs > 0 ? painelSupBarraHtml('Não Executadas', naoExecutadasOs, maxOs, '#ef4444',
                                `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('OS Não Executadas', listaOs.filter(o => o.status === 'Não Executada'), 'os')})`) : '')
                        : `<div class="sup-vazio">Nenhuma OS registrada ainda.</div>`;
                }

                const osPorDia = dias14.map(dia => ({
                    label: dia.slice(8, 10) + '/' + dia.slice(5, 7),
                    valor: listaOs.filter(o => (o.criado_em || '').slice(0, 10) === dia).length
                }));
                const totalOs14 = osPorDia.reduce((s, v) => s + v.valor, 0);
                const sparkEl = document.getElementById('painel-sup-os-sparkline');
                if (sparkEl) {
                    sparkEl.innerHTML = totalOs14 > 0
                        ? painelSupSparklineHtml(osPorDia, '#a855f7')
                        : `<div class="sup-vazio">Ainda sem dado suficiente de OS registradas nos últimos 14 dias.</div>`;
                }
            }
        } catch (e) {
            console.error('⚠️ Não consegui carregar a tendência de OS no Painel do Supervisor:', e);
            const trendEl = document.getElementById('painel-sup-os-trend');
            const sparkEl = document.getElementById('painel-sup-os-sparkline');
            if (trendEl) trendEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
            if (sparkEl) sparkEl.innerHTML = `<div class="sup-vazio">Não foi possível carregar agora.</div>`;
        }
    }

    // ---------------------------------------------------------
    // SEÇÃO — PREVISÕES: só entram aqui projeções calculadas em cima de
    // dado real que o sistema já tem, nunca um chute. Duas contas
    // simples e honestas (ambas deixam claro na UI que são "no ritmo
    // atual", não garantia):
    //
    // 1) Previsão de desgaste: cada peça instalada tem `ton` (acumulado)
    //    e `dataEntradaVeio` (desde quando está lá) — dá pra calcular a
    //    taxa diária (ton/dias) e projetar quantos dias faltam pra
    //    bater a `meta`. Não fazemos previsão de QUEBRA (não existe
    //    histórico de falha no sistema pra basear isso).
    // 2) Tendência do backlog: atividades criadas x concluídas por dia
    //    nos últimos 14 dias — mostra se a fila está crescendo ou
    //    encolhendo, sem forçar um número de "vai zerar em X dias".
    // ---------------------------------------------------------
    if (previsoesEl) {
        // --- 1) Previsão de desgaste ---
        const instaladosComRitmo = ativos
            .filter(a => a.status === 'Instalado' && a.meta > 0 && a.ton > 0 && a.dataEntradaVeio)
            .map(a => {
                const diasInstalada = Math.max(1, Math.floor((Date.now() - a.dataEntradaVeio) / (1000 * 60 * 60 * 24)));
                const taxaDiaria = a.ton / diasInstalada;
                const restante = a.meta - a.ton;
                const diasParaMeta = taxaDiaria > 0 ? Math.round(restante / taxaDiaria) : null;
                return { ...a, diasParaMeta };
            })
            .filter(a => a.diasParaMeta !== null && a.diasParaMeta >= 0)
            .sort((a, b) => a.diasParaMeta - b.diasParaMeta)
            .slice(0, 6);

        const corPrevisao = (d) => d <= 7 ? '#ef4444' : (d <= 20 ? '#eab308' : '#22c55e');

        // --- 2) Tendência do backlog (criadas x concluídas, 14 dias) ---
        const dias14Backlog = [];
        for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias14Backlog.push(d.toISOString().slice(0, 10)); }
        const meiaJanela = dias14Backlog.slice(0, 7);
        const janelaRecente = dias14Backlog.slice(7);
        const contarNoIntervalo = (campoData, dias) => atividades.filter(x => x[campoData] && dias.includes(x[campoData].slice(0, 10))).length;
        const criadasAntes = contarNoIntervalo('criado_em', meiaJanela);
        const criadasDepois = contarNoIntervalo('criado_em', janelaRecente);
        const concluidasAntes = contarNoIntervalo('concluido_em', meiaJanela);
        const concluidasDepois = contarNoIntervalo('concluido_em', janelaRecente);
        const saldoAntes = criadasAntes - concluidasAntes;
        const saldoDepois = criadasDepois - concluidasDepois;
        const temDadoBacklog = (criadasAntes + criadasDepois + concluidasAntes + concluidasDepois) > 0;
        const pioraOuMelhora = saldoDepois > saldoAntes ? 'piorando' : (saldoDepois < saldoAntes ? 'melhorando' : 'estável');
        const corBacklog = pioraOuMelhora === 'piorando' ? '#ef4444' : (pioraOuMelhora === 'melhorando' ? '#22c55e' : '#eab308');

        previsoesEl.innerHTML = `
            <div class="sup-card" style="--sup-cor:#0ea5e9;">
                <div class="sup-card-titulo"><span><i class="fas fa-gauge-high"></i> Próximas a Bater a Meta de Desgaste</span></div>
                ${instaladosComRitmo.length
                    ? instaladosComRitmo.map(a => `
                        <div class="sup-lista-linha sup-lista-linha-clicavel" onclick="window.abrirHistoricoIndividual('${a.id}')">
                            <span style="color:var(--text-body);">${a.id} <span class="text-muted">(${a.tipo || '—'})</span></span>
                            <span style="font-weight:700; color:${corPrevisao(a.diasParaMeta)};">~${a.diasParaMeta}d</span>
                        </div>
                    `).join('') + `<div style="font-size:10.5px; color:var(--text-muted); margin-top:10px;">Projeção no ritmo médio de uso desde a instalação — não é garantia, só um alerta antecipado.</div>`
                    : `<div class="sup-vazio">Sem dado suficiente pra projetar (precisa de meta, toneladas e data de entrada preenchidas).</div>`}
            </div>
            <div class="sup-card" style="--sup-cor:${corBacklog};">
                <div class="sup-card-titulo"><span><i class="fas fa-scale-balanced"></i> Tendência do Backlog de Atividades</span></div>
                ${temDadoBacklog ? `
                    <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px;">
                        <div style="font-size:1.4rem; font-weight:800; color:${corBacklog};">${pioraOuMelhora === 'piorando' ? '📈' : (pioraOuMelhora === 'melhorando' ? '📉' : '➖')} ${pioraOuMelhora}</div>
                    </div>
                    ${painelSupBarraHtml('Criadas (antes)', criadasAntes, Math.max(criadasAntes, criadasDepois, concluidasAntes, concluidasDepois, 1), '#94a3b8',
                        `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Criadas (7 dias anteriores)', atividades.filter(x => x.criado_em && meiaJanela.includes(x.criado_em.slice(0, 10))), 'atividade')})`)}
                    ${painelSupBarraHtml('Concl. (antes)', concluidasAntes, Math.max(criadasAntes, criadasDepois, concluidasAntes, concluidasDepois, 1), '#64748b',
                        `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Concluídas (7 dias anteriores)', atividades.filter(x => x.concluido_em && meiaJanela.includes(x.concluido_em.slice(0, 10))), 'atividade')})`)}
                    ${painelSupBarraHtml('Criadas (agora)', criadasDepois, Math.max(criadasAntes, criadasDepois, concluidasAntes, concluidasDepois, 1), '#eab308',
                        `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Criadas (últimos 7 dias)', atividades.filter(x => x.criado_em && janelaRecente.includes(x.criado_em.slice(0, 10))), 'atividade')})`)}
                    ${painelSupBarraHtml('Concl. (agora)', concluidasDepois, Math.max(criadasAntes, criadasDepois, concluidasAntes, concluidasDepois, 1), '#22c55e',
                        `window.abrirDetalheSupervisorPorIndice(${registrarDetalheSupervisor('Concluídas (últimos 7 dias)', atividades.filter(x => x.concluido_em && janelaRecente.includes(x.concluido_em.slice(0, 10))), 'atividade')})`)}
                    <div style="font-size:10.5px; color:var(--text-muted); margin-top:6px;">Compara os 7 dias mais recentes com os 7 anteriores — mostra direção, não um prazo exato.</div>
                ` : `<div class="sup-vazio">Sem dado suficiente nos últimos 14 dias pra calcular tendência.</div>`}
            </div>
        `;
    }

    const tsEl = document.getElementById('painel-supervisor-ultima-atualizacao');
    if (tsEl) tsEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const saudacaoEl = document.getElementById('painel-supervisor-saudacao');
    if (saudacaoEl) {
        const nomeSup = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || '').replace(/\s*\[.+?\]/, '').trim() : '';
        saudacaoEl.textContent = nomeSup ? `Olá, ${nomeSup}!` : 'Olá!';
    }
};

// (Painel Executivo ADM agora vive em Paineis/painelAdmExecutivo.js)
// (Área da Oficina, Fila da Ponte Rolante e Procedimentos Operacionais
// agora vivem em Oficina/atividades.js)
// (Abrir/pré-visualizar/concluir Folhão por tipo agora vive em Oficina/folhoesPonte.js)
// MÓDULO INTELIGENTE: APONTAMENTO DIÁRIO E DESCONTO DE VIDA ÚTIL EM LOTE
// ==========================================================================

// (abrirModalProducao/fecharModalProducao agora vivem em Oficina/apontamento.js)

// ==============================================================
// 1. FUNÇÕES VISUAIS E NAVEGAÇÃO DA INTERFACE
// ==============================================================
// 🆕 Busca do header do Painel Geral — funcionalmente simples de
// propósito (filtra os itens já carregados no menu lateral pelo texto
// visível), já que não existe ainda um endpoint de busca unificada por
// ativo/veio no backend. Abre a sidebar sozinha se estiver fechada no
// mobile, pra quem digitar já ver o resultado sem precisar abrir o
// menu manualmente antes.
window.filtrarMenuHeader = function(valor) {
    const termo = (valor || "").trim().toLowerCase();
    const links = document.querySelectorAll("#sidebar-menu .nav-link");
    links.forEach(link => {
        const texto = link.innerText.trim().toLowerCase();
        const bate = !termo || texto.includes(termo);
        link.classList.toggle("header-busca-oculto", !bate);
    });
    if (termo && window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar-menu');
        if (sidebar && !sidebar.classList.contains('open')) sidebar.classList.add('open');
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) sidebar.classList.toggle('open');
};

// 🆕 Sidebar icon-rail (Opção A) — só afeta desktop (a regra CSS que dá
// efeito ao '.collapsed' só existe em @media (min-width:769px); no
// mobile a classe fica no elemento sem efeito nenhum, então não precisa
// checar largura de tela aqui). Recolhida por padrão, lembrada entre
// sessões via localStorage — sem isso, toda vez que o usuário abrisse
// o app de novo o menu voltaria expandido, mesmo tendo escolhido
// recolher da última vez.
const CHAVE_SIDEBAR_COLAPSADA = 'oms_sidebar_colapsada_v1';
window.toggleSidebarColapsada = function() {
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;
    const colapsada = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, colapsada ? '1' : '0'); } catch (e) { /* localStorage pode falhar em modo privado — não é crítico */ }
};
(function aplicarEstadoInicialSidebarRail() {
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;
    let salvo;
    try { salvo = localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA); } catch (e) { salvo = null; }
    // Sem preferência salva ainda: começa recolhida (só ícone), como
    // pedido — "sidebar estreita, só com ícones por padrão".
    const colapsada = salvo === null ? true : salvo === '1';
    sidebar.classList.toggle('collapsed', colapsada);
})();

window.fazerLogout = function() {
    // Visitante não tem "turno" — some sem perguntar, é só um "voltar".
    const ehVisitante = OPERADOR_LOGADO && OPERADOR_LOGADO.visitante;
    const mensagem = ehVisitante ? null : "Tem certeza que deseja encerrar o turno?";

    if (ehVisitante || confirm(mensagem)) {
        // 🔧 Resgatado de uma versão duplicada/morta desta função (ver
        // correção do bug do abrirAba() duplicado, no mesmo commit) —
        // registra o encerramento de turno na Auditoria, igual sempre
        // deveria ter feito.
        if (!ehVisitante && typeof registrarHistorico === 'function') {
            registrarHistorico("SISTEMA", "Turno encerrado.");
        }
        localStorage.removeItem("oms_operador_v32_local");
        window.location.reload();
    }
};

// (abrirAba agora vem de Core/navegacao.js)
// (Conexão com o Python, Apontamento de Produção, Histórico de Laudos
// e Saque/Swap/Reserva agora vivem em Oficina/apontamento.js)
// ==============================================================
// 5. LAUDOS EM PDF E PONTES GLOBAIS (Conecta o HTML ao JS)
// ==============================================================
function getLaudosSalvos() {
    return JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
}
window.getLaudosSalvos = getLaudosSalvos;

// Reconectando as funções principais da tela (A Ponte)
if (typeof mudarVeioVisualizado !== 'undefined') window.mudarVeioVisualizado = mudarVeioVisualizado;
if (typeof renderHistorico !== 'undefined') window.renderHistorico = renderHistorico;
if (typeof carregarOficina !== 'undefined') window.carregarOficina = carregarOficina;
if (typeof renderizarGraficosMCC !== 'undefined') window.renderizarGraficosMCC = renderizarGraficosMCC;
if (typeof atualizarPainelCompleto !== 'undefined') window.atualizarPainelCompleto = atualizarPainelCompleto;
// 🔧 CORREÇÃO: renderAtivos, renderReparos e renderPainelVeios eram
// definidos aqui em cima, mas nunca chegavam a virar window.X —
// diferente de calcularKpisGlobais (linha abaixo), que já tinha essa
// atribuição. Como o resto do sistema todo chama essas 3 funções via
// "if (typeof window.renderX === 'function') window.renderX()" (em
// mais de 10 lugares, incluindo depois de excluir peça, cadastrar,
// saque, swap...), essa checagem sempre dava falso e a tela de
// Ativos/Reparos/Painel de Veios nunca era re-renderizada sozinha
// depois dessas ações — só atualizava se a página fosse recarregada
// na mão. Agora ficam expostas certinho, igual as outras.
if (typeof renderAtivos !== 'undefined') window.renderAtivos = renderAtivos;
if (typeof renderReparos !== 'undefined') window.renderReparos = renderReparos;
if (typeof renderPainelVeios !== 'undefined') window.renderPainelVeios = renderPainelVeios;
if (typeof verificarAcesso !== 'undefined') window.verificarAcesso = verificarAcesso;
// 🔧 CORREÇÃO CRÍTICA (checklist voltava pro login sozinho): o
// checklist-execucao.js importa este script.js SEM o "?v=27" que o
// app.html usa — pro navegador isso é uma URL diferente, então ele
// carrega uma SEGUNDA CÓPIA inteira deste arquivo, com seu próprio
// OPERADOR_LOGADO isolado, que o login de verdade nunca atualiza.
// Qualquer coisa importada via "import { X } from '../script.js'" por
// outro arquivo pode estar pegando essa cópia fantasma. A correção é
// nunca depender de um import direto pra essas informações — sempre
// ler de window.*, que sempre aponta pra cópia real (a que de fato
// roda os cliques da tela), não importa quantas cópias fantasmas
// existam por aí.
window.MATRICULAS_ADM = MATRICULAS_ADM;
window.getOficinaEquipeAtual = function() { return OFICINA_EQUIPE_ATUAL; };
if (typeof entrarComoVisitante !== 'undefined') window.entrarComoVisitante = entrarComoVisitante;
if (typeof processarAutenticacaoHome !== 'undefined') window.processarAutenticacaoHome = processarAutenticacaoHome;
window.setOperadorLogado = function(op) {
    // 🔧 CORREÇÃO: banco.js tem sua PRÓPRIA cópia de OPERADOR_LOGADO,
    // separada dessa aqui (Core/estado.js) — checklist-execucao.js,
    // folhaoMolde4.js e a ponte com o Folhão importam a cópia de lá, não
    // essa. Sem essa linha, um login feito NESSA sessão (sem recarregar
    // a página) nunca chegava na cópia do banco.js, e por isso, por
    // exemplo, ehAdminChecklistExecucao() sempre via a pessoa como "não
    // ADM" (matrícula vazia/null), escondendo os botões de mover/editar/
    // excluir etapa mesmo pra quem realmente é ADM.
    setOperadorLogado(op);
    setOperadorBanco(op);
};
window.getOperadorLogado = function() { return OPERADOR_LOGADO; };
if (typeof abrirCriticos !== 'undefined') window.abrirCriticos = abrirCriticos;
if (typeof abrirHistoricoIndividual !== 'undefined') window.abrirHistoricoIndividual = abrirHistoricoIndividual;
if (typeof fecharModalHistorico !== 'undefined') window.fecharModalHistorico = fecharModalHistorico;
if (typeof salvarRegistroManual !== 'undefined') window.salvarRegistroManual = salvarRegistroManual;
if (typeof iniciarSaque !== 'undefined') window.iniciarSaque = iniciarSaque;
if (typeof confirmarRelatorio !== 'undefined') window.confirmarRelatorio = confirmarRelatorio;
if (typeof fecharModalRelatorio !== 'undefined') window.fecharModalRelatorio = fecharModalRelatorio;
if (typeof fazerCelulaEditavel !== 'undefined') window.fazerCelulaEditavel = fazerCelulaEditavel;
if (typeof alterarSaldoRolo !== 'undefined') window.alterarSaldoRolo = alterarSaldoRolo;
if (typeof renderHidraulica !== 'undefined') window.renderHidraulica = renderHidraulica;
if (typeof alterarSaldoHidraulica !== 'undefined') window.alterarSaldoHidraulica = alterarSaldoHidraulica;
if (typeof ajustarSaldoMaterial !== 'undefined') window.ajustarSaldoMaterial = ajustarSaldoMaterial;
if (typeof removerMaterial !== 'undefined') window.removerMaterial = removerMaterial;
if (typeof toggleFormMaterial !== 'undefined') window.toggleFormMaterial = toggleFormMaterial;
if (typeof salvarEntradaMaterial !== 'undefined') window.salvarEntradaMaterial = salvarEntradaMaterial;
if (typeof renderMateriais !== 'undefined') window.renderMateriais = renderMateriais;
if (typeof carregarMateriaisDoBackend !== 'undefined') window.carregarMateriaisDoBackend = carregarMateriaisDoBackend;

// ==============================================================
// 5. INICIALIZAÇÃO DA PÁGINA (START - LIVRE DE GOOGLE SHEETS)
// ==============================================================

// ==============================================================
// AUTO-REFRESH DOS CONTADORES DE DIAS
// ==============================================================
// Como "dias" agora é sempre calculado na hora (a partir de
// dataEntradaVeio / dataReparo), basta re-renderizar as telas que
// mostram esse número de tempos em tempos pra ele ficar sempre em dia
// mesmo se o técnico deixar a aba aberta passando da meia-noite.
setInterval(() => {
    const abaAtiva = document.querySelector('.tab-content.active');
    const idAtivo = abaAtiva ? abaAtiva.id : null;
    if (idAtivo === 'aba-ativos' && typeof renderAtivos === 'function') renderAtivos();
    if (idAtivo === 'aba-reparos' && typeof renderReparos === 'function') renderReparos();
    if (idAtivo === 'aba-fluxo' && typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof atualizarKPIsAvancados === 'function') atualizarKPIsAvancados();
}, 15 * 60 * 1000); // a cada 15 minutos

// (Efeito ripple agora vem de Core/navegacao.js;
// Fila Offline e mostrarToastDesfazer vêm de Core/utils.js)


// ==========================================
// ABA "REGISTRO DE OCORRÊNCIA"
// ==========================================
// 🆕 Preenche um <select> de área (TODAS as áreas de AREAS_OFICINA —
// oficina + administrativo, igual a Central de Áreas mostra as duas) —
// usado nos formulários de Ocorrência e OS, pra dar contexto de área
// nesses registros (sem isso a Central de Notificações não tem como
// saber onde a ocorrência/OS aconteceu). 🔧 CORREÇÃO: antes filtrava só
// tipo 'oficina', deixando de fora Almoxarifado/Ponte Rolante/ADM/
// Logística — uma ocorrência pode acontecer em qualquer uma delas.
function popularSelectAreaOficina(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select || select.dataset.preenchido) return;
    const grupos = [
        { label: 'Oficina', itens: AREAS_OFICINA.filter(a => a.tipo === 'oficina') },
        { label: 'Administrativo', itens: AREAS_OFICINA.filter(a => a.tipo === 'administrativo') },
    ];
    select.innerHTML = `<option value="">Não informar</option>` +
        grupos.map(g => `<optgroup label="${g.label}">${
            g.itens.map(a => `<option value="${a.chave}">${a.nome}</option>`).join("")
        }</optgroup>`).join("");
    select.dataset.preenchido = "1";
}
window.popularSelectAreaOficina = popularSelectAreaOficina;

// (🗑️ Removida a aba "Registro de Ocorrência" inteira — junto com
// renderAbaOcorrencia/processarFotoOcorrencia/removerFotoOcorrencia/
// confirmarOcorrencia/filtrarOcorrencias/carregarListaOcorrencias/
// buscarOcorrencias/renderizarListaOcorrencias que viviam aqui. Era
// redundante com "Criar Atividade" na Central de Áreas, que já cobre
// equipamento + descrição + foto + fica salvo no Prontuário do
// equipamento [via registrar_evento_atividade_oficina, mesma tabela
// log_eventos que /api/historico_eventos lê por peca_id] — com prazo,
// prioridade e responsável a mais, que a Ocorrência nunca teve.
// Confirmado antes de apagar: nada do que só existia aqui se perde.

// 🆕 Áreas "sintéticas" só pra Central de Notificações — Estoque de
// Rolos e Hidráulica (estoque) não são áreas de reparo (não estão em
// AREAS_OFICINA, não têm atividade/status), mas ajuste nelas agora gera
// notificação (ver ajustar_rolo/ajustar_hidraulica no backend) e
// precisam aparecer como área própria na grade, do jeito que o usuário
// pediu. "hidraulica-estoque" (não "hidraulica") pra não colidir com a
// área de reparo Hidráulica de AREAS_OFICINA — são coisas diferentes.
const AREAS_NOTIFICACAO_EXTRAS = [
    { chave: 'rolos', nome: 'Estoque de Rolos', icone: 'fa-scroll', cor: '#22d3ee' },
    { chave: 'hidraulica-estoque', nome: 'Hidráulica (Estoque)', icone: 'fa-oil-can', cor: '#0ea5e9' },
    // 🆕 Sinótico 3D (ocorrência em mancal) e Qualidade (achado
    // pendente) — geram notificação mas não são área de reparo da
    // Central de Áreas, então entram aqui pra não caírem em "Outros".
    { chave: 'sinotico-3d', nome: 'Sinótico 3D', icone: 'fa-cube', cor: '#22d3ee' },
    { chave: 'qualidade', nome: 'Qualidade', icone: 'fa-magnifying-glass', cor: '#a78bfa' },
];
window.AREAS_NOTIFICACAO_EXTRAS = AREAS_NOTIFICACAO_EXTRAS;

// Nome legível de uma área (chave -> nome de AREAS_OFICINA ou das
// extras acima), com fallback pra própria chave se não achar — usado
// nos registros de Ocorrência/OS (campo "area" opcional) e na Central
// de Notificações.
function nomeAreaOficina(chave) {
    const a = AREAS_OFICINA.find(x => x.chave === chave) || AREAS_NOTIFICACAO_EXTRAS.find(x => x.chave === chave);
    return a ? a.nome : chave;
}
window.nomeAreaOficina = nomeAreaOficina;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Iniciando Sistema...");

    const atualizou = await window.carregarAtivosDoPython();
    if (typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();

    // 🔧 Rolos e Hidráulica agora vivem no Neon (antes só no localStorage
    // de cada colaborador). Sincroniza e já deixa a tela pronta se o
    // técnico for direto pra uma dessas abas.
    if (typeof sincronizarRolosReais === 'function') {
        await sincronizarRolosReais();
        recarregarRolosEHidraulicaLocal();
        if (typeof renderRolos === 'function') renderRolos();
    }
    if (typeof sincronizarHidraulicaReal === 'function') {
        await sincronizarHidraulicaReal();
        recarregarRolosEHidraulicaLocal();
        if (typeof renderHidraulica === 'function') renderHidraulica();
    }

    if (atualizou) {
        if (typeof renderPainelVeios === 'function') renderPainelVeios();
        if (typeof renderAtivos === 'function') renderAtivos();
        if (typeof renderReparos === 'function') renderReparos();
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
    } else {
        console.warn("⚠️ Python Offline ou Sem Dados. As abas podem estar vazias.");
    }

    // 🆕 Verifica se alguma atividade da Oficina passou do prazo sem
    // ser concluída e dispara notificação (sem travar o carregamento
    // do resto do app — roda em segundo plano). Cada atividade
    // atrasada só notifica 1 vez (controlado no backend).
    (async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/oficina/verificar_atrasos`, { method: 'POST' });
        } catch (e) {
            console.warn('⚠️ Não consegui verificar atividades atrasadas:', e);
        }
    })();
});
// ==============================================================
// CONTROLE DO FORMULÁRIO DE CADASTRO DE PEÇAS
// ==============================================================
window.toggleFormAdicionar = function() {
    // Busca o formulário que acabamos de criar no app.html
    const form = document.getElementById('form-novo-equipamento');
    
    if (form) {
        // Alterna entre mostrar e esconder (tira ou coloca a classe 'hidden')
        form.classList.toggle('hidden');
    } else {
        console.error("Formulário 'form-novo-equipamento' não encontrado no HTML!");
    }
};
// (Registro de OS agora vive em Oficina/ordemServico.js)
// (Central de Notificações — polling, heartbeat, auto-refresh por aba,
// e a Lista Única de Notificações — agora vivem em Paineis/notificacoes.js)
