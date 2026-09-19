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
    carregarFotosNoProntuario(id);
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
        atualizarPainelCompleto();
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
            atualizarPainelCompleto();
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

// ==========================================
// PAINEL DO TÉCNICO — visão simplificada e direta ao ponto
// ==========================================
// Pensado pra abrir sozinho no celular do técnico assim que ele loga,
// juntando num só lugar as 3 ações que ele mais faz no dia a dia:
// abrir folhão de equipamento em reparo, sacar/trocar (swap) uma peça
// reserva, e ver os equipamentos críticos — sem precisar navegar pelo
// menu lateral procurando cada coisa em aba separada.
function renderPainelTecnico() {
    const listaCriticos = document.getElementById("tecnico-lista-criticos");
    const listaReservas = document.getElementById("tecnico-lista-reservas");
    if (!listaCriticos || !listaReservas) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;

    // 🆕 Aviso de "sem área" no topo do painel (ADM não é afetado).
    const avisoArea = document.getElementById("tecnico-aviso-sem-area");
    const { isAdm, semArea } = filtrarPorAreaTecnico([]);
    if (avisoArea) avisoArea.classList.toggle("hidden", isAdm || !semArea);

    // 🆕 Atividades (Pendente/Em Andamento, incluindo as programadas
    // pra data futura) da área do técnico.
    if (typeof window.carregarAtividadesPainelTecnico === 'function') window.carregarAtividadesPainelTecnico();

    // 🆕 Todos os equipamentos "no veio" (instalados) da área do
    // técnico — não só os críticos. ADM continua vendo tudo.
    const equipamentosVeioArea = filtrarPorAreaTecnico(
        BANCO_ATIVOS.filter(a => a.local && a.local.includes("Veio") && !a.local.includes("Oficina"))
    ).lista;

    // 🆕 Lista completa por área, ordenada do mais desgastado pro
    // menos — pedido pra o técnico acompanhar tudo da área dele, não
    // só quem já bateu 80%.
    const listaEquipArea = document.getElementById("tecnico-lista-equipamentos-area");
    if (listaEquipArea) {
        if (semArea && !isAdm) {
            listaEquipArea.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        } else if (equipamentosVeioArea.length === 0) {
            listaEquipArea.innerHTML = linhaVazia("Nenhum equipamento da sua área instalado no veio.");
        } else {
            const todosOrdenados = equipamentosVeioArea
                .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct);
            listaEquipArea.innerHTML = `<div class="tecnico-cards-grid">`
                + todosOrdenados.map(a => `
                <div class="tecnico-card-item ${a.pct >= 80 ? 'tecnico-card-critico' : 'tecnico-card-normal'}" onclick="window.abrirHistoricoIndividual('${a.id}')">
                    <div class="tecnico-card-topo">
                        <span class="font-code tecnico-card-id">${a.id}</span>
                        <span class="ind-card-tag bg-tag">${a.tipo}</span>
                    </div>
                    <div class="tecnico-card-pct" style="color:${a.pct >= 80 ? 'var(--danger)' : 'var(--text-heading)'};">${a.pct.toFixed(1)}%</div>
                </div>`).join("")
                + `</div>`;
        }
    }

    // 🔧 CORREÇÃO ("equipamento crítico no painel do técnico MUITO
    // GRANDE"): antes mostrava TODOS os equipamentos ≥80%, sem limite —
    // com muitos críticos ao mesmo tempo, a lista esticava a tela toda.
    // Agora segue o mesmo padrão do Painel Geral (renderizarTopCriticos):
    // mostra só os 5 mais críticos aqui, com um botão pra abrir a lista
    // completa no modal que já existe (abrirCriticos()).
    // 🆕 Também passa pelo mesmo filtro de área usado no resto do
    // sistema — técnico só vê os críticos da própria área; ADM vê tudo.
    const criticosTodos = equipamentosVeioArea
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .filter(a => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct);

    const criticos = criticosTodos.slice(0, 5);

    if (semArea && !isAdm) {
        listaCriticos.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
    } else if (criticos.length === 0) {
        listaCriticos.innerHTML = linhaVazia("Nenhum equipamento crítico no momento. ✅");
    } else {
        listaCriticos.innerHTML = `<div class="tecnico-cards-grid">`
            + criticos.map(a => `
            <div class="tecnico-card-item tecnico-card-critico" onclick="window.abrirHistoricoIndividual('${a.id}')">
                <div class="tecnico-card-topo">
                    <span class="font-code tecnico-card-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="tecnico-card-pct">${a.pct.toFixed(1)}%</div>
            </div>`).join("")
            + `</div>`
            + (criticosTodos.length > 5
                ? `<div class="tecnico-ver-todos" onclick="window.abrirCriticos()">
                        Ver todos os ${criticosTodos.length} críticos <i class="fas fa-arrow-right" style="margin-left:6px;"></i>
                   </div>`
                : '');
    }

    // ---- RESERVAS PRONTAS PRA SWAP ----
    // 🆕 Também filtrado pela área do técnico (ADM continua vendo tudo).
    // 🆕 Agora cobre as DUAS reservas físicas (Oficina e Máquina) —
    // renderizadas em dois grupos separados, pra deixar claro pro
    // técnico se a peça já está pronta pra swap na hora (Máquina) ou se
    // ainda depende de transporte da Logística (Oficina).
    const reservasOficina = filtrarPorAreaTecnico(
        BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva")
    ).lista;
    const reservasMaquina = filtrarPorAreaTecnico(
        BANCO_ATIVOS.filter(a => a.local === "Máquina / Reserva")
    ).lista;

    const cardReserva = a => `
            <div class="tecnico-card-item tecnico-card-reserva" onclick="window.abrirAba(null,'aba-reservas')">
                <div class="tecnico-card-topo">
                    <span class="font-code tecnico-card-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <i class="fas fa-check-circle" style="color:#22c55e;"></i>
            </div>`;

    if (semArea && !isAdm) {
        listaReservas.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
    } else if (reservasOficina.length === 0 && reservasMaquina.length === 0) {
        listaReservas.innerHTML = linhaVazia("Nenhuma peça em estoque reserva.");
    } else {
        listaReservas.innerHTML = `
            <h3 style="font-size:13px; color:var(--text-muted); margin:0 0 8px;"><i class="fas fa-industry"></i> Reserva na Máquina (pronta pra swap)</h3>
            ${reservasMaquina.length
                ? `<div class="tecnico-cards-grid">${reservasMaquina.map(cardReserva).join("")}</div>`
                : linhaVazia("Nenhuma peça pronta na máquina.")}
            <h3 style="font-size:13px; color:var(--text-muted); margin:16px 0 8px;"><i class="fas fa-warehouse"></i> Reserva na Oficina (aguarda transporte)</h3>
            ${reservasOficina.length
                ? `<div class="tecnico-cards-grid">${reservasOficina.map(cardReserva).join("")}</div>`
                : linhaVazia("Nenhuma peça na oficina.")}
        `;
    }
}
window.renderPainelTecnico = renderPainelTecnico;

// Atalho "Área" do Painel do Técnico — abre a própria área do técnico
// já direto na sub-aba "Atividades" (sem passar pela grade de cards
// da Central de Áreas primeiro).
window.irParaAreaTecnico = function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;
    if (!isAdm && !area) {
        alert("Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        window.abrirAba(null, 'aba-oficina'); // ADM sem área fixa: manda pra grade de áreas
        return;
    }
    window.abrirAreaOficina(area, 'atividades');
};

// Atalho "Criar Atividade" do Painel do Técnico — abre a própria área
// já na sub-aba Atividades e destrava o formulário de nova atividade
// (o mesmo formulário da Central de Áreas, com campo de Prazo — é ele
// que permite programar uma atividade pra uma data futura: ela fica
// "Pendente" até lá).
window.irCriarAtividadeTecnico = function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;
    if (!isAdm && !area) {
        alert("Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        window.abrirAba(null, 'aba-oficina');
        return;
    }
    window.abrirAreaOficina(area, 'atividades');
    // Pequeno delay pra garantir que o DOM da área já renderizou antes
    // de abrir o formulário (abrirAreaOficina faz fetches assíncronos).
    setTimeout(() => {
        const card = document.getElementById('area-oficina-form-card');
        if (card && card.classList.contains('hidden') && typeof window.alternarFormAtividadeOficina === 'function') {
            window.alternarFormAtividadeOficina();
        }
    }, 350);
};

// 🆕 Lista de atividades (Pendente/Em Andamento) da área do técnico,
// direto no Painel do Técnico — sem precisar entrar na área pra ver o
// que já está rolando ou o que foi programado pra frente.
window.carregarAtividadesPainelTecnico = async function() {
    const container = document.getElementById("tecnico-lista-atividades");
    if (!container) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;

    if (!isAdm && !area) {
        container.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        container.innerHTML = linhaVazia("Você é ADM sem área fixa — abra a Central de Áreas pra ver atividades.");
        return;
    }

    container.innerHTML = linhaVazia("Carregando...");
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades?area=${encodeURIComponent(area)}`, { cache: 'no-store' });
        const atividades = resp.ok ? await resp.json() : [];

        // 🆕 Agora as futuras (data_inicio no futuro) continuam
        // aparecendo na lista — só que sinalizadas com um selo
        // "PROGRAMADA", em vez de sumirem sem explicação. Ficam por
        // último, depois das que já podem ser feitas.
        const abertas = atividades
            .filter(a => a.status !== 'Concluído')
            .sort((a, b) => {
                const aFutura = atividadeAindaNaoComecou(a) ? 1 : 0;
                const bFutura = atividadeAindaNaoComecou(b) ? 1 : 0;
                if (aFutura !== bFutura) return aFutura - bFutura;
                return (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1);
            });

        if (abertas.length === 0) {
            container.innerHTML = linhaVazia("Nenhuma atividade pendente ou em andamento. ✅");
            return;
        }

        const corStatus = { 'Pendente': 'var(--warning)', 'Em Andamento': 'var(--info)' };
        container.innerHTML = abertas.map(x => {
            const prazoFormatado = x.prazo ? x.prazo.split('-').reverse().join('/') : null;
            const inicioFormatado = x.data_inicio ? x.data_inicio.split('-').reverse().join('/') : null;
            const futura = atividadeAindaNaoComecou(x);
            const atrasada = !futura && typeof atividadeEstaAtrasada === 'function' && atividadeEstaAtrasada(x);
            return `
                <div class="tecnico-item-linha" onclick="window.irParaAreaTecnico()" style="${futura ? 'opacity:0.8;' : ''}">
                    <div>
                        ${x.equipamento_id ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span> · ` : ''}
                        <span style="font-size:13px; color:var(--text-body);">${limparMarcadorTecnicoDescricao(x.descricao)}</span>
                        ${futura ? `<span style="font-size:10px; background:var(--text-accent, #3b82f6); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">PROGRAMADA</span>` : ''}
                        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                            ${futura
                                ? `<span style="color:var(--text-accent, #3b82f6); font-weight:700;">Começa ${inicioFormatado}</span>`
                                : `<span style="color:${corStatus[x.status] || 'var(--text-muted)'}; font-weight:700;">${x.status}</span>`}
                            ${x.responsavel ? ` · <i class="fas fa-user"></i> ${x.responsavel}` : ' · <span style="font-style:italic;">Sem responsável</span>'}
                            ${prazoFormatado ? ` · Prazo: <span style="color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${atrasada ? '700' : '400'};">${prazoFormatado}</span>` : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar atividades do painel técnico:', e);
        container.innerHTML = linhaVazia("Não foi possível carregar as atividades agora.");
    }
};

// ==========================================
// ABA REPARO — abas "Iniciar Reparo" x "Reparo em Andamento"
// ==========================================
window.trocarAbaReparo = function(evento, idAlvo) {
    const abas = ["reparo-sub-iniciar", "reparo-sub-andamento"];
    abas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === idAlvo) ? "block" : "none";
    });
    if (evento && evento.currentTarget) {
        const container = evento.currentTarget.closest(".folhao-tabs");
        if (container) container.querySelectorAll(".folhao-tab").forEach(btn => btn.classList.remove("active"));
        evento.currentTarget.classList.add("active");
    } else {
        const container = document.querySelector('#aba-reparos .folhao-tabs');
        if (container) {
            container.querySelectorAll(".folhao-tab").forEach(btn => btn.classList.remove("active"));
            const idx = abas.indexOf(idAlvo);
            const btns = container.querySelectorAll(".folhao-tab");
            if (btns[idx]) btns[idx].classList.add("active");
        }
    }
    if (idAlvo === "reparo-sub-andamento" && typeof window.carregarReparosAndamento === "function") {
        window.carregarReparosAndamento();
    }
};

// Navega direto pra aba de Reparo, já abrindo a sub-aba certa
// ("iniciar" ou "andamento") — usado pelos atalhos do Painel do Técnico.
window.abrirAbaReparo = function(subaba) {
    window.abrirAba(null, "aba-reparos");
    const idAlvo = subaba === "andamento" ? "reparo-sub-andamento" : "reparo-sub-iniciar";
    window.trocarAbaReparo(null, idAlvo);
};

// ==========================================
// "EM ANDAMENTO": folhões com rascunho salvo na nuvem (equipamento com
// progresso salvo em folhoes_rascunho, ver /api/folhao/rascunhos/todos
// no back-end), filtrado pela área do técnico igual à lista "Iniciar
// Novo". Qualquer técnico da mesma área (ou ADM) pode continuar de
// onde outro parou — o rascunho é salvo por equipamento, não por
// pessoa, então não existe "travar pra um só técnico".
// ==========================================
window.carregarReparosAndamento = async function() {
    const listaAndamento = document.getElementById("reparos-lista-andamento");
    if (!listaAndamento) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;
    listaAndamento.innerHTML = linhaVazia("Carregando...");

    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const areaTecnico = OPERADOR_LOGADO && OPERADOR_LOGADO.area;

    if (!isAdm && !areaTecnico) {
        listaAndamento.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }

    try {
        const apiBase = await resolverApiBase();
        // 🆕 Busca as duas fontes de "reparo iniciado" em paralelo:
        // rascunho de Folhão (folhoes_rascunho) E execução de Checklist
        // (checklist_execucao_execucoes) — um técnico pode ter começado
        // só por um dos dois lados, e os dois contam como "em andamento".
        const [respRascunhos, respExecucoes] = await Promise.all([
            fetch(`${apiBase}/api/folhao/rascunhos/todos`),
            fetch(`${apiBase}/api/checklist-execucao/execucoes/todas`)
        ]);
        if (!respRascunhos.ok) throw new Error("Falha ao buscar rascunhos.");
        const rascunhos = await respRascunhos.json();
        const execucoes = respExecucoes.ok ? await respExecucoes.json() : [];

        // Reaproveita esses fetches pra manter RASCUNHOS_IDS_ATIVOS e
        // EXECUCOES_CHECKLIST_IDS_ATIVAS em dia (usados por renderReparos()
        // na sub-aba "Iniciar Reparo").
        RASCUNHOS_IDS_ATIVOS = new Set(rascunhos.map(r => r.equipamento_id));
        window.EXECUCOES_CHECKLIST_IDS_ATIVAS = new Set(execucoes.map(e => e.equipamento_id));
        if (typeof renderReparos === 'function') renderReparos();

        // Junta as duas listas por equipamento_id — um mesmo equipamento
        // pode ter as duas coisas (rascunho E execução); nesse caso, só
        // guarda uma entrada só, preferindo a data mais recente pra
        // exibir em "Atualizado".
        const porEquipamento = new Map();
        rascunhos.forEach(r => porEquipamento.set(r.equipamento_id, { rascunho: r, execucao: null }));
        execucoes.forEach(e => {
            const atual = porEquipamento.get(e.equipamento_id) || { rascunho: null, execucao: null };
            atual.execucao = e;
            porEquipamento.set(e.equipamento_id, atual);
        });

        // Cruza cada equipamento_id com o cadastro (BANCO_ATIVOS) pra
        // saber o tipo dele e poder aplicar o filtro de área.
        const equipamentosEmAndamento = [...porEquipamento.keys()]
            .map(id => BANCO_ATIVOS.find(a => a.id === id))
            .filter(Boolean);
        const { lista: equipamentosFiltrados } = filtrarPorAreaTecnico(equipamentosEmAndamento);
        const idsPermitidos = new Set(equipamentosFiltrados.map(e => e.id));

        let itens = [...porEquipamento.entries()]
            .map(([id, dados]) => {
                const equipamento = BANCO_ATIVOS.find(a => a.id === id);
                return equipamento ? { ...dados, equipamento } : null;
            })
            .filter(Boolean)
            .filter(x => idsPermitidos.has(x.equipamento.id));

        if (itens.length === 0) {
            listaAndamento.innerHTML = linhaVazia("Nenhum reparo em andamento no momento.");
            return;
        }

        // 🆕 Agrupa por MCC → Tipo, igual a sub-aba "Iniciar Reparo"
        // (renderReparos). O técnico já só vê a área dele aqui — quem
        // sente falta do agrupamento é o ADM, que vê tudo junto e sem
        // essa separação a lista fica uma bagunça de máquinas diferentes
        // misturadas.
        const coresMCC = { "2": "#3b82f6", "3": "#8b5cf6", "4": "#ec4899" };
        const grupos = {};
        itens.forEach(item => {
            const mcc = item.equipamento.mcc_compat || "2/3";
            if (!grupos[mcc]) grupos[mcc] = [];
            grupos[mcc].push(item);
        });

        const linhaItem = ({ rascunho, execucao, equipamento }) => {
            const dataRef = rascunho?.atualizado_em || execucao?.iniciada_em;
            const atualizado = dataRef ? new Date(dataRef).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
            return `
                <div class="tecnico-item-linha" style="flex-direction:column; align-items:stretch; gap:10px; cursor:default; margin-left:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="font-code" style="font-weight:700; color:var(--text-heading);">${equipamento.id}</span>
                            <span class="ind-card-tag bg-tag" style="margin-left:6px;">${equipamento.tipo}</span>
                        </div>
                        <span style="color:var(--text-accent); font-weight:600; font-size:11px;">Atualizado ${atualizado}</span>
                    </div>
                    <div class="flex-align-center gap-10" style="flex-wrap:wrap;">
                        <button class="btn-premium btn-warning" onclick="window.abrirFolhaoPorTipo('${equipamento.id}')"><i class="fas fa-file-alt"></i> Folhão</button>
                        ${window.renderizarBotaoChecklistExecucao(equipamento.id)}
                        ${window.renderizarBotaoConcluirReparo(equipamento.id)}
                    </div>
                </div>`;
        };

        listaAndamento.innerHTML = Object.keys(grupos).sort().map(mcc => {
            const porTipo = {};
            grupos[mcc].forEach(item => {
                const tipo = item.equipamento.tipo || "Outros";
                if (!porTipo[tipo]) porTipo[tipo] = [];
                porTipo[tipo].push(item);
            });

            const blocoTipos = Object.keys(porTipo).sort().map(tipo => `
                <div style="font-weight:600; color:var(--text-muted); font-size:13px; margin:10px 0 8px 6px;">
                    <i class="fas fa-tag"></i> ${tipo}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${porTipo[tipo].map(linhaItem).join("")}
                </div>
            `).join("");

            return `
                <div style="margin-bottom:18px;">
                    <div style="padding:10px 12px; font-weight:700; color:var(--text-heading); font-size:15px; background:${coresMCC[mcc] || '#f59e0b'}20; border-top:3px solid ${coresMCC[mcc] || '#f59e0b'}; border-radius:6px 6px 0 0;">
                        <i class="fas fa-server"></i> MCC ${mcc}
                    </div>
                    ${blocoTipos}
                </div>
            `;
        }).join("");

        // 🆕 Igual acontece na sub-aba "Iniciar Reparo": busca em segundo
        // plano o % do Checklist de Execução e se o Folhão já foi salvo,
        // pra cada equipamento aqui listado, e redesenha quando chegar.
        window.carregarStatusChecklistExecucaoReparo(itens.map(x => x.equipamento.id));
    } catch (e) {
        console.error("Erro ao carregar folhões em andamento:", e);
        listaAndamento.innerHTML = linhaVazia("❌ Não foi possível carregar. Verifique sua conexão.");
    }
};

// ==========================================
// 🔧 CORREÇÃO CRÍTICA: abrirCriticos() chamava abrirAba(null, 'aba-ativos'),
// mas esse HTML NUNCA teve uma aba com id="aba-ativos" — a "Matriz
// Operacional Geral" ficou de fora quando o app.html foi remontado.
// Por isso o botão "Críticos" (no Painel Geral e no Painel do Técnico)
// não levava a lugar nenhum: o clique disparava, mas não existia
// destino pra navegar. Agora ele abre um modal com a lista de
// equipamentos críticos de verdade, sem depender de nenhuma aba.
// ==========================================
function abrirCriticos() {
    const criticos = BANCO_ATIVOS
        .filter(a => a.local && a.local.includes("Veio") && !a.local.includes("Oficina"))
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .filter(a => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct);

    const lista = document.getElementById("modal-criticos-lista");
    if (lista) {
        lista.innerHTML = criticos.length === 0
            ? `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum equipamento crítico no momento. ✅</div>`
            : criticos.map(a => `
                <div class="tecnico-item-linha" onclick="window.fecharModalCriticos(); window.abrirHistoricoIndividual('${a.id}')">
                    <div>
                        <span class="font-code" style="font-weight:700; color:var(--text-heading);">${a.id}</span>
                        <span class="ind-card-tag bg-tag" style="margin-left:6px;">${a.tipo}</span>
                        <div class="text-muted" style="font-size:11px; margin-top:2px;">${a.local || ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:var(--danger); font-weight:700; font-size:14px;">${a.pct.toFixed(1)}%</span>
                        <i class="fas fa-chevron-right" style="margin-left:8px; color:var(--text-muted);"></i>
                    </div>
                </div>`).join("");
    }

    const modal = document.getElementById("modal-criticos");
    if (modal) modal.classList.remove("hidden");
}
window.fecharModalCriticos = function() {
    const modal = document.getElementById("modal-criticos");
    if (modal) modal.classList.add("hidden");
};

// ==========================================
// REGISTRAR INTERVENÇÃO RÁPIDA (sem precisar abrir o Folhão completo)
// ==========================================

// Guarda a foto escolhida (em base64) entre o momento que o técnico
// tira/anexa e o momento que ele aperta "Salvar".
let FOTO_INTERVENCAO_BASE64 = null;

window.abrirModalIntervencao = function() {
    if (!verificarAcesso()) return;
    const select = document.getElementById("intervencao-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    const textoEl = document.getElementById("intervencao-texto");
    if (textoEl) textoEl.value = "";
    const categoriaEl = document.getElementById("intervencao-categoria");
    if (categoriaEl) categoriaEl.value = "Intervenção";
    window.removerFotoIntervencao(); // limpa qualquer foto de uma abertura anterior
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.remove("hidden");
};

window.fecharModalIntervencao = function() {
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.add("hidden");
};

// --------------------------------------------------------------
// Lê o arquivo escolhido (câmera ou galeria), comprime pra não pesar
// no banco/rede, e mostra o preview.
// --------------------------------------------------------------
window.processarFotoIntervencao = function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        alert('Por favor, escolha um arquivo de imagem.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const MAX_LADO = 1280;
            let largura = img.width;
            let altura = img.height;

            if (largura > altura && largura > MAX_LADO) {
                altura = Math.round((altura * MAX_LADO) / largura);
                largura = MAX_LADO;
            } else if (altura > MAX_LADO) {
                largura = Math.round((largura * MAX_LADO) / altura);
                altura = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, largura, altura);

            FOTO_INTERVENCAO_BASE64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('intervencao-foto-preview');
            const container = document.getElementById('intervencao-foto-preview-container');
            if (preview) preview.src = FOTO_INTERVENCAO_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoIntervencao = function() {
    FOTO_INTERVENCAO_BASE64 = null;
    const preview = document.getElementById('intervencao-foto-preview');
    const container = document.getElementById('intervencao-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

// --------------------------------------------------------------
// Salva o registro (categoria + texto + foto opcional) direto no
// backend, já no formato que aparece no Prontuário do equipamento.
// --------------------------------------------------------------
window.confirmarIntervencao = async function() {
    const equipamentoId = document.getElementById("intervencao-equipamento")?.value;
    const texto = document.getElementById("intervencao-texto")?.value.trim();
    const categoria = document.getElementById("intervencao-categoria")?.value || "Intervenção";

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (!texto) return alert("Descreva o que foi feito.");

    const iconePorCategoria = {
        "Intervenção": "🔧",
        "Melhoria": "✨",
        "Comentário": "💬",
        "Atividade Pendente": "⏳"
    };
    const icone = iconePorCategoria[categoria] || "🔧";
    const acaoFormatada = `${icone} <span style="color:#eab308;">[${categoria.toUpperCase()}]</span> ${texto}`;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/registro_com_foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                acao: acaoFormatada,
                operador: operador,
                categoria: categoria,
                foto_base64: FOTO_INTERVENCAO_BASE64 || null
            })
        });

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível salvar o registro.");
            return;
        }

        if (typeof registrarHistorico === 'function') {
            const evento = {
                data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR'),
                tag: equipamentoId,
                acao: acaoFormatada,
                responsavel: operador
            };
            HISTORICO_ACOES.unshift(evento);
            localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
            if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();
        }

        window.fecharModalIntervencao();
        alert(`✅ ${categoria} registrada em [${equipamentoId}]${FOTO_INTERVENCAO_BASE64 ? ' com foto' : ''}.`);
    } catch (e) {
        console.error('⚠️ Erro ao salvar registro com foto:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// --------------------------------------------------------------
// 🔧 CORREÇÃO ("fotos anexadas não abrem, e não tem como saber quem
// anexou"): as fotos são guardadas como data URL (base64), e o clique
// nelas fazia window.open(dataUrl, '_blank'). A maioria dos navegadores
// modernos (Chrome/Safari no celular principalmente) BLOQUEIA abrir uma
// data: URL direto numa aba nova por segurança — o clique simplesmente
// não fazia nada, sem erro nenhum visível. Além disso, quem tirou a
// foto só aparecia no atributo "title" (tooltip) — que não existe no
// toque do celular, só no hover do mouse no desktop.
//
// Esta função abre um lightbox (modal simples, criado na hora) com a
// foto em tamanho grande e a legenda (data/operador) sempre visível
// como texto, funcionando igual em desktop e celular.
// --------------------------------------------------------------
window.abrirFotoAmpliada = function(fotoBase64, legenda) {
    let overlay = document.getElementById('lightbox-foto-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-foto-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10100';
        overlay.innerHTML = `
            <div style="max-width:95vw; max-height:92vh; display:flex; flex-direction:column; align-items:center; gap:10px;" onclick="event.stopPropagation()">
                <img id="lightbox-foto-img" src="" style="max-width:95vw; max-height:80vh; border-radius:10px; object-fit:contain; box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                <div id="lightbox-foto-legenda" style="color:#fff; font-size:13px; text-align:center; background:rgba(0,0,0,0.55); padding:6px 14px; border-radius:20px;"></div>
                <button class="btn-premium" style="padding:6px 16px;" onclick="window.fecharFotoAmpliada()"><i class="fas fa-times"></i> Fechar</button>
            </div>
        `;
        overlay.addEventListener('click', window.fecharFotoAmpliada ? window.fecharFotoAmpliada : () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }
    document.getElementById('lightbox-foto-img').src = fotoBase64;
    document.getElementById('lightbox-foto-legenda').innerText = legenda || '';
    overlay.classList.remove('hidden');
};

window.fecharFotoAmpliada = function() {
    const overlay = document.getElementById('lightbox-foto-overlay');
    if (overlay) overlay.classList.add('hidden');
};

// --------------------------------------------------------------
// Busca as fotos do equipamento e monta a mini-galeria no Prontuário.
// --------------------------------------------------------------
async function carregarFotosNoProntuario(id) {
    const container = document.getElementById("hist-galeria-fotos");
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/fotos/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!resp.ok) { container.innerHTML = ''; return; }
        const fotos = await resp.json();

        if (!Array.isArray(fotos) || fotos.length === 0) {
            container.innerHTML = '';
            return;
        }

        // 🔧 CORREÇÃO ("a foto não fala qual comentário ela pertence"):
        // a API /api/fotos/{id} já manda o texto do comentário/registro
        // (campo "acao", ex: "teste 2") junto de cada foto — mas essa
        // função nunca usava esse campo, só mostrava data e operador.
        // Agora cada foto ganha uma legenda com o texto do registro
        // logo abaixo da miniatura (sem precisar clicar pra ver), e o
        // texto completo também aparece na foto ampliada.
        //
        // "acao" pode vir com tags HTML (ex: '<span style="...">[CATEGORIA]</span>
        // texto'), usadas pra colorir a categoria no Prontuário — remove
        // essas tags aqui porque o atributo "title" e o rodapé da miniatura
        // não interpretam HTML (apareceria a tag escrita, igual o bug
        // corrigido antes nas notificações push).
        const textoSemHtml = (texto) => String(texto || '').replace(/<[^>]+>/g, '').trim();

        container.innerHTML = `
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
                <i class="fas fa-images"></i> Fotos anexadas (${fotos.length})
            </div>
            <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:8px;">
                ${fotos.map(f => {
                    const legendaCompleta = `${textoSemHtml(f.acao) || 'Sem descrição'} — ${f.operador || 'Sistema'} — ${f.data_hora || ''}`;
                    const legendaCurta = textoSemHtml(f.acao) || 'Sem descrição';
                    return `
                    <div style="flex-shrink:0; width:90px;">
                        <img src="${f.foto_base64}"
                             style="width:90px; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; display:block;"
                             onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${legendaCompleta.replace(/'/g, "\\'")}')"
                             title="${legendaCompleta}">
                        <div class="text-muted" style="font-size:10px; margin-top:3px; line-height:1.3; max-height:2.6em; overflow:hidden; text-overflow:ellipsis;" title="${legendaCompleta}">${legendaCurta}</div>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos do Prontuário:', e);
        container.innerHTML = '';
    }
}

// ==========================================
// RELATÓRIO DIÁRIO DO TÉCNICO (o que foi feito no turno)
// ==========================================
window.abrirModalRelatorioDiario = function() {
    if (!verificarAcesso()) return;
    const textoEl = document.getElementById("relatorio-diario-texto");
    if (textoEl) textoEl.value = "";
    const modal = document.getElementById("modal-relatorio-diario");
    if (modal) modal.classList.remove("hidden");
};
window.fecharModalRelatorioDiario = function() {
    const modal = document.getElementById("modal-relatorio-diario");
    if (modal) modal.classList.add("hidden");
};
window.confirmarRelatorioDiario = function() {
    const texto = document.getElementById("relatorio-diario-texto")?.value.trim();
    if (!texto) return alert("Escreva o que você fez hoje antes de enviar.");

    const hoje = new Date().toLocaleDateString('pt-BR');
    // Usa o próprio operador como "tag" — assim cada relatório fica
    // agrupado por quem o escreveu na Auditoria (aba-historico), e dá
    // pra filtrar por data ali também.
    const nomeOperador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico").replace(/\s*\[.+?\]/, "") : "Técnico";
    registrarHistorico("RELATÓRIO DIÁRIO", `📋 <strong>${nomeOperador}</strong> (${hoje}): ${texto}`);
    window.fecharModalRelatorioDiario();
    alert("✅ Relatório diário enviado com sucesso!");
};

function atualizarNovosKPIs() {
    // 🔧 CORREÇÃO: nenhuma linha abaixo tinha guarda `if (el)` — diferente
    // do padrão usado em atualizarKPIsAvancados() e no resto do arquivo.
    // Se qualquer um desses IDs não existir no HTML, `.innerText = ...`
    // em `null` lança TypeError e aborta a função na hora, deixando os
    // KPIs seguintes (das linhas de baixo) sem atualizar — silenciosamente,
    // já que quem chama isto (atualizarPainelCompleto) embrulha tudo em
    // executarSeguro() e só loga um aviso no console.
    const totalEl = document.getElementById('kpi-total');
    if (totalEl) totalEl.innerText = BANCO_ATIVOS.length;

    const moldesReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo' && a.tipo === 'Molde').length;
    const moldesReparoEl = document.getElementById('kpi-moldes-reparo');
    if (moldesReparoEl) moldesReparoEl.innerText = moldesReparo;

    const segmentosReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo' && a.tipo !== 'Molde').length;
    const segmentosReparoEl = document.getElementById('kpi-segmentos-reparo');
    if (segmentosReparoEl) segmentosReparoEl.innerText = segmentosReparo;

    let totalRolos = 0;
    if (BANCO_ROLOS && Array.isArray(BANCO_ROLOS)) {
        totalRolos = BANCO_ROLOS.reduce((acc, r) => acc + (r.qtd || 0), 0);
    }
    const totalRolosEl = document.getElementById('kpi-total-rolos');
    if (totalRolosEl) totalRolosEl.innerText = totalRolos;
}

function atualizarPainelCompleto() {
    // 🆕 Hora do card de status do hero (referência mandada pelo usuário).
    const horaHero = document.getElementById('painel-hero-hora-atualizacao');
    if (horaHero) horaHero.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 🔧 Cada pedaço do Painel Geral roda isolado — se um card específico
    // falhar, os outros continuam aparecendo normalmente.
    if (typeof calcularKpisGlobais === 'function') {
        executarSeguro(() => calcularKpisGlobais(), 'calcularKpisGlobais (painel)');
    }
    executarSeguro(() => atualizarNovosKPIs(), 'atualizarNovosKPIs');
    executarSeguro(() => atualizarKPIsAvancados(), 'atualizarKPIsAvancados');
    executarSeguro(() => renderizarTopCriticos(), 'renderizarTopCriticos');
    executarSeguro(() => window.atualizarStatusMaquinas(), 'atualizarStatusMaquinas');
    // 🔧 CORREÇÃO ("várias coisas bugando" — vários fetches duplicados,
    // console cheio de erro de rede, cards de gráfico piscando):
    // JS/painelGeralExtra.js JÁ preenche estes mesmos cards (donuts,
    // ranking de veios, atrasadas, produção lançada, tonelagem) desde
    // antes desta sessão — eu não tinha visto esse arquivo quando
    // "corrigi" esses cards achando que estavam mortos, e criei uma
    // SEGUNDA implementação aqui rodando em paralelo com a primeira,
    // ambas escrevendo nos mesmos elementos e disparando os mesmos
    // fetches em dobro (piorando exatamente o problema de cold-start
    // do Render que já tínhamos identificado). Chamada removida — quem
    // cuida desses cards é window.renderPainelGeralExtra() (chamado em
    // app.html). As funções construirHtmlDonutRisco/Status/RankingVeios
    // e buscarDadosApontamentos7dias/construirHtmlTonelagemSvg/
    // construirHtmlProducaoLancada continuam existindo pois o Painel do
    // Supervisor (mais abaixo) as reaproveita pros cards dele.
}

// 🆕 Peças reutilizáveis dos "gráficos padrão" do sistema (donut de
// risco dos ativos, donut de status das atividades, ranking de
// desgaste por veio) — usadas tanto no Painel Geral quanto no Painel
// do Supervisor, pra não duplicar a mesma conta de duas formas
// diferentes (o mesmo erro que já causou bug de severidade divergente
// entre Central de Áreas e Central de Notificações antes).
function construirHtmlDonutRisco(ativos) {
    const instalados = ativos.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina'));
    const comPct = instalados.map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }));
    const critico = comPct.filter(a => a.pct >= 80).length;
    const atencao = comPct.filter(a => a.pct >= 50 && a.pct < 80).length;
    const normal = comPct.length - critico - atencao;
    const total = comPct.length || 1;
    const pctCritico = (critico / total) * 100;
    const pctAtencao = (atencao / total) * 100;
    return `
        <div class="painel-donut-corpo">
            <div class="painel-donut-anel" style="background:conic-gradient(var(--danger) 0% ${pctCritico}%, var(--warning) ${pctCritico}% ${pctCritico + pctAtencao}%, var(--success) ${pctCritico + pctAtencao}% 100%);">
                <div class="painel-donut-centro"><strong>${comPct.length}</strong><span>Ativos</span></div>
            </div>
            <div class="painel-donut-legenda">
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--danger);"></span>Crítico</span><strong>${critico} (${pctCritico.toFixed(0)}%)</strong></div>
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--warning);"></span>Atenção</span><strong>${atencao} (${pctAtencao.toFixed(0)}%)</strong></div>
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--success);"></span>Normal</span><strong>${normal} (${(100 - pctCritico - pctAtencao).toFixed(0)}%)</strong></div>
            </div>
        </div>`;
}

function construirHtmlDonutStatus(atividades) {
    const pendente = atividades.filter(x => x.status === 'Pendente').length;
    const andamento = atividades.filter(x => x.status === 'Em Andamento').length;
    const concluido = atividades.filter(x => x.status === 'Concluído').length;
    const total = (pendente + andamento + concluido) || 1;
    const pctPendente = (pendente / total) * 100;
    const pctAndamento = (andamento / total) * 100;
    return `
        <div class="painel-donut-corpo">
            <div class="painel-donut-anel" style="background:conic-gradient(var(--warning) 0% ${pctPendente}%, var(--info) ${pctPendente}% ${pctPendente + pctAndamento}%, var(--success) ${pctPendente + pctAndamento}% 100%);">
                <div class="painel-donut-centro"><strong>${pendente + andamento + concluido}</strong><span>Atividades</span></div>
            </div>
            <div class="painel-donut-legenda">
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--warning);"></span>Pendente</span><strong>${pendente} (${pctPendente.toFixed(0)}%)</strong></div>
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--info);"></span>Em Andamento</span><strong>${andamento} (${pctAndamento.toFixed(0)}%)</strong></div>
                <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--success);"></span>Concluído</span><strong>${concluido} (${(100 - pctPendente - pctAndamento).toFixed(0)}%)</strong></div>
            </div>
        </div>`;
}

function construirHtmlRankingVeios(ativos) {
    const instalados = ativos.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina'));
    const porVeio = {};
    instalados.forEach(a => {
        const match = (a.local || '').match(/Veio\s*([A-Z])/i);
        const veio = match ? match[1].toUpperCase() : '—';
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
        if (!porVeio[veio]) porVeio[veio] = { soma: 0, qtd: 0 };
        porVeio[veio].soma += pct;
        porVeio[veio].qtd += 1;
    });
    const ranking = Object.entries(porVeio)
        .map(([veio, v]) => ({ veio, media: v.soma / v.qtd, qtd: v.qtd }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 6);
    return ranking.length
        ? ranking.map(r => {
            const cor = r.media >= 80 ? 'var(--danger)' : (r.media >= 50 ? 'var(--warning)' : 'var(--success)');
            return `
            <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
                    <span style="color:var(--text-body);">Veio ${r.veio}</span>
                    <span style="color:${cor}; font-weight:700;">${r.media.toFixed(1)}% méd.</span>
                </div>
                <div style="height:6px; background:var(--bg-input); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${Math.min(100, r.media).toFixed(1)}%; background:${cor}; border-radius:4px;"></div>
                </div>
            </div>`;
        }).join('')
        : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum equipamento instalado no veio.</div>`;
}

// 🆕 Busca + agrega os apontamentos reais (geral + moldes) dos últimos
// 7 dias — extraído do Painel Geral pra ser reaproveitado também no
// Painel do Supervisor (mesmo dado, uma só fonte de verdade).
async function buscarDadosApontamentos7dias() {
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
    const totalPorMcc = { mcc2: 0, mcc3: 0, mcc4: 0 };
    const hoje = new Date().toISOString().slice(0, 10);
    let totalHoje = 0;
    logs.forEach(l => {
        const dataChave = (l.data_hora || '').slice(0, 10);
        const soma = (Number(l.qtd_mcc2) || 0) + (Number(l.qtd_mcc3) || 0) + (Number(l.qtd_mcc4) || 0);
        if (dataChave in totalPorDia) totalPorDia[dataChave] += soma;
        if (dataChave === hoje) totalHoje += soma;
        totalPorMcc.mcc2 += Number(l.qtd_mcc2) || 0;
        totalPorMcc.mcc3 += Number(l.qtd_mcc3) || 0;
        totalPorMcc.mcc4 += Number(l.qtd_mcc4) || 0;
    });
    return { dias, totalPorDia, totalPorMcc, totalHoje };
}

function construirHtmlTonelagemSvg(dados) {
    const { dias, totalPorDia } = dados;
    const valores = dias.map(d => totalPorDia[d]);
    const max = Math.max(1, ...valores);
    const largura = 600, altura = 160, passo = largura / (dias.length - 1);
    const pontos = valores.map((v, i) => `${(i * passo).toFixed(1)},${(altura - (v / max) * (altura - 20) - 4).toFixed(1)}`).join(' ');
    const labels = dias.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
    return `
        <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:140px; overflow:visible;">
            <polyline points="${pontos}" fill="none" stroke="var(--info)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
            ${valores.map((v, i) => `<circle cx="${(i * passo).toFixed(1)}" cy="${(altura - (v / max) * (altura - 20) - 4).toFixed(1)}" r="3.5" fill="var(--info)"></circle>`).join('')}
        </svg>
        <div style="display:flex; justify-content:space-between; margin-top:6px;">
            ${labels.map(l => `<span style="font-size:0.65rem; color:var(--text-muted); text-transform:capitalize;">${l}</span>`).join('')}
        </div>`;
}

function construirHtmlProducaoLancada(dados) {
    const { totalPorDia, totalPorMcc, totalHoje } = dados;
    const totalSemana = Object.values(totalPorDia).reduce((s, v) => s + v, 0);
    return `
        <div style="display:flex; justify-content:space-between; margin-bottom:14px;">
            <div><div style="font-size:1.4rem; font-weight:800; color:var(--text-heading); font-family:var(--font-mono);">${totalHoje}</div><div style="font-size:0.7rem; color:var(--text-muted);">Hoje</div></div>
            <div style="text-align:right;"><div style="font-size:1.4rem; font-weight:800; color:var(--text-heading); font-family:var(--font-mono);">${totalSemana}</div><div style="font-size:0.7rem; color:var(--text-muted);">Últimos 7 dias</div></div>
        </div>
        ${['mcc2', 'mcc3', 'mcc4'].map(m => `
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; padding:4px 0; border-top:1px solid var(--border-color);">
                <span style="color:var(--text-body); text-transform:uppercase;">${m}</span>
                <strong style="color:var(--text-heading); font-family:var(--font-mono);">${totalPorMcc[m]}</strong>
            </div>`).join('')}`;
}

// 🗑️ Removida a aba "Registro Recente" (e as funções
// renderizarFeedAtividadeRecente/renderRegistroRecenteCompleto que só
// serviam a ela) — era exatamente a mesma coisa que a Auditoria Global:
// mesma fonte (/api/historico_eventos), mesmas 2 matrículas autorizadas
// (MATRICULAS_TESTE_FOLHOES tinha o mesmo valor de MATRICULAS_AUDITORIA),
// só que mais simples (sem filtro de data/acessos, limitada a 50 linhas
// em vez de 500). Os pontos que chamavam renderizarFeedAtividadeRecente()
// continuam de pé, protegidos por `typeof ... === 'function'` — viram
// no-op sozinhos, sem precisar caçar cada chamada.

// ==========================================
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

// ==========================================
// PAINÉIS ADMINISTRATIVOS (ADM, Almoxarifado, Ponte Rolante, Logística)
// ==========================================
// Ao contrário das 12 áreas técnicas (que abrem o modal genérico de
// atividades vinculado a equipamento), essas 4 áreas não têm
// equipamentos — só equipe e atividades soltas (e, no caso do
// Almoxarifado, o estoque geral de materiais). Por isso ganham um
// painel próprio, no estilo do Painel Geral, em vez do modal.
//
// Configuração de cada painel: nome de exibição, cor, ícone e se deve
// (ou não) mostrar o resumo do estoque de materiais.
const PAINEL_AREA_CONFIG = {
    'adm':            { nome: 'ADM',            estoque: false },
    'almoxarifado':   { nome: 'Almoxarifado',   estoque: true  },
    'ponte-rolante':  { nome: 'Ponte Rolante',  estoque: false },
    'logistica':      { nome: 'Logística',      estoque: false },
};

// Limite abaixo do qual um material é considerado "saldo baixo" no
// resumo do painel do Almoxarifado. Ajustável aqui sem mexer no resto.
const PAINEL_ALMOXARIFADO_LIMITE_BAIXO = 5;

window.renderPainelAreaAdministrativa = async function(chave) {
    const cfg = PAINEL_AREA_CONFIG[chave];
    const container = document.getElementById(`painel-${chave}-container`);
    if (!cfg || !container) return;

    // 🆕 ADM não tem "equipamento próprio" nem só a equipe dela pra
    // acompanhar — quem está em ADM já vê o sistema inteiro (MATRICULAS_ADM).
    // O template genérico abaixo (equipe + atividades só da própria área)
    // desperdiçava isso. ADM ganha um painel executivo cross-área em vez
    // do template genérico das outras 3 (Almoxarifado/Ponte/Logística).
    if (chave === 'adm') {
        return window.renderPainelExecutivoAdm(container);
    }

    // Esqueleto fixo do painel — os números/listas são preenchidos
    // depois, conforme cada chamada de API vai respondendo (não trava
    // a tela esperando tudo de uma vez).
    container.innerHTML = `
        <div class="kpi-container" style="margin-bottom:20px;">
            <div class="kpi-card">
                <div class="kpi-icon"><i class="fas fa-users"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-equipe">–</h4><p>Equipe Ativa</p></div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-icon glow-warning"><i class="fas fa-hourglass-half"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-pendentes">–</h4><p>Atividades Pendentes</p></div>
            </div>
            <div class="kpi-card danger">
                <div class="kpi-icon glow-danger"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-atrasadas">–</h4><p>Atrasadas</p></div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-icon glow-success"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-concluidas">–</h4><p>Concluídas (7 dias)</p></div>
            </div>
        </div>

        ${cfg.estoque ? `
        <div class="glass-panel" style="padding:24px; margin-bottom:20px;">
            <div class="flex-between" style="margin-bottom:12px;">
                <h3 style="color:var(--text-heading); font-size:1rem;"><i class="fas fa-boxes-stacked"></i> Resumo do Estoque</h3>
                <button class="btn-xs-primary" onclick="window.abrirAba(null,'aba-almoxarifado')" style="color:var(--brand); background:var(--brand-bg);">
                    Ver Almoxarifado Completo <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="kpi-container" style="margin-bottom:16px;">
                <div class="kpi-card"><div class="kpi-data"><h4 id="painel-${chave}-kpi-itens-estoque">–</h4><p>Itens Cadastrados</p></div></div>
                <div class="kpi-card danger"><div class="kpi-data"><h4 id="painel-${chave}-kpi-estoque-baixo">–</h4><p>Saldo Baixo (≤ ${PAINEL_ALMOXARIFADO_LIMITE_BAIXO})</p></div></div>
            </div>
            <div id="painel-${chave}-estoque-lista"></div>
        </div>
        ` : ''}

        <div class="dashboard-main-grid">
            <div class="glass-panel" style="padding:24px;">
                <div class="flex-between" style="margin-bottom:16px;">
                    <h3 style="color:var(--text-heading); font-size:1rem;"><i class="fas fa-list"></i> Atividades Recentes</h3>
                    <button class="btn-xs-primary" onclick="window.abrirAreaOficina('${chave}')" style="color:var(--brand); background:var(--brand-bg);">
                        <i class="fas fa-plus"></i> Lançar Atividade
                    </button>
                </div>
                <div id="painel-${chave}-atividades-lista"></div>
            </div>

            <div class="glass-panel" style="padding:24px;">
                <h3 style="color:var(--text-heading); font-size:1rem; margin-bottom:16px;"><i class="fas fa-user-hard-hat"></i> Equipe da Área</h3>
                <div id="painel-${chave}-equipe-lista"></div>
            </div>
        </div>
    `;

    // ---- EQUIPE ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const equipe = resp.ok ? await resp.json() : [];

        const kpiEquipe = document.getElementById(`painel-${chave}-kpi-equipe`);
        if (kpiEquipe) kpiEquipe.textContent = equipe.length;

        const listaEquipe = document.getElementById(`painel-${chave}-equipe-lista`);
        if (listaEquipe) {
            listaEquipe.innerHTML = equipe.length
                ? equipe.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                        <span style="color:var(--text-body);">${p.nome}</span>
                        <span class="text-muted" style="font-size:12px;">${p.cargo || ''}</span>
                    </div>
                `).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum colaborador cadastrado nesta área ainda.</div>`;
        }
    } catch (e) {
        console.error(`⚠️ Não consegui carregar a equipe do painel [${chave}]:`, e);
    }

    // ---- ATIVIDADES ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades?area=${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const atividades = resp.ok ? await resp.json() : [];

        const pendentes = atividades.filter(a => a.status === 'Pendente').length;
        const atrasadas = atividades.filter(a => atividadeEstaAtrasada(a)).length;
        const dataLimite7dias = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d.toISOString().slice(0, 10);
        })();
        const concluidasRecentes = atividades.filter(a =>
            a.status === 'Concluído' && a.concluido_em && a.concluido_em.slice(0, 10) >= dataLimite7dias
        ).length;

        const definir = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
        definir(`painel-${chave}-kpi-pendentes`, pendentes);
        definir(`painel-${chave}-kpi-atrasadas`, atrasadas);
        definir(`painel-${chave}-kpi-concluidas`, concluidasRecentes);

        const listaAtividades = document.getElementById(`painel-${chave}-atividades-lista`);
        if (listaAtividades) {
            const recentes = [...atividades].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 10);
            listaAtividades.innerHTML = recentes.length
                ? recentes.map(a => {
                    const atrasada = atividadeEstaAtrasada(a);
                    const corStatus = a.status === 'Concluído' ? 'var(--success)' : (atrasada ? 'var(--danger)' : 'var(--warning)');
                    return `
                        <div style="padding:10px 0; border-bottom:1px solid var(--border);">
                            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                                <span style="color:var(--text-body); font-size:13px;">${a.descricao || 'Sem descrição'}</span>
                                <span class="status-text-pill" style="--sev-color:${corStatus};">${atrasada ? 'ATRASADA' : (a.status || '').toUpperCase()}</span>
                            </div>
                            <div class="text-muted" style="font-size:11px; margin-top:2px;">
                                ${
                                    // 🔧 CORREÇÃO (mesmo bug já achado no card de área — "quem
                                    // iniciou o transporte? quem que concluiu?"): esse resumo só
                                    // mostrava `responsavel` (só existe se preenchido na CRIAÇÃO,
                                    // quase nunca é) — nunca `criado_por` (quem lançou) nem
                                    // `executado_por` (quem pegou pra executar, preenchido ao
                                    // clicar "Iniciar"). Mostra os dois que existem de verdade.
                                    [
                                        a.criado_por ? `Criado por ${a.criado_por}` : null,
                                        a.executado_por ? `${a.status === 'Concluído' ? 'Executado por' : 'Executando'}: ${a.executado_por}` : (a.responsavel || null)
                                    ].filter(Boolean).join(' · ') || 'Sem responsável'
                                }${a.prazo ? ' · prazo ' + a.prazo.split('-').reverse().join('/') : ''}
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma atividade registrada nesta área ainda.</div>`;
        }
    } catch (e) {
        console.error(`⚠️ Não consegui carregar as atividades do painel [${chave}]:`, e);
    }

    // ---- ESTOQUE (só Almoxarifado) ----
    if (cfg.estoque) {
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/materiais`, { cache: 'no-store' });
            const materiais = resp.ok ? await resp.json() : [];
            const baixoEstoque = materiais.filter(m => Number(m.qtd) <= PAINEL_ALMOXARIFADO_LIMITE_BAIXO);

            const definir = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
            definir(`painel-${chave}-kpi-itens-estoque`, materiais.length);
            definir(`painel-${chave}-kpi-estoque-baixo`, baixoEstoque.length);

            const listaEstoque = document.getElementById(`painel-${chave}-estoque-lista`);
            if (listaEstoque) {
                listaEstoque.innerHTML = baixoEstoque.length
                    ? `<div class="text-muted" style="font-size:12px; margin-bottom:8px;">Itens com saldo baixo (≤ ${PAINEL_ALMOXARIFADO_LIMITE_BAIXO}):</div>` +
                      baixoEstoque.slice(0, 10).map(m => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-body); font-size:13px;">${m.descricao}</span>
                            <span style="color:var(--danger); font-weight:700; font-size:13px;">${m.qtd}</span>
                        </div>
                    `).join('')
                    : `<div class="text-muted" style="text-align:center; padding:12px 0;">Nenhum item com saldo baixo no momento ✅</div>`;
            }
        } catch (e) {
            console.error('⚠️ Não consegui carregar o resumo do estoque no painel do Almoxarifado:', e);
        }
    }
};

// --------------------------------------------------------------
// 🆕 PAINEL EXECUTIVO — ADM
// --------------------------------------------------------------
// Visão de comando pra quem já vê o sistema inteiro (as 3 matrículas
// MATRICULAS_ADM): não é "a equipe da área X", é "onde está o problema
// AGORA, em qualquer área". Ranking de atraso por área, retrabalho
// (atividades mais reabertas — endpoint já existia na API, pronto,
// mas nunca tinha sido consumido por nenhuma tela) e equipamentos em
// estado crítico de desgaste, que hoje só apareciam espalhados nos
// gráficos de cada MCC, sem um "top da fábrica" num lugar só.
window.renderPainelExecutivoAdm = async function(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="kpi-container" style="margin-bottom:20px;">
            <div class="kpi-card">
                <div class="kpi-icon glow-brand"><i class="fas fa-list-check"></i></div>
                <div class="kpi-data"><h4 id="adm-exec-kpi-abertas">–</h4><p>Atividades Abertas (todas as áreas)</p></div>
            </div>
            <div class="kpi-card danger">
                <div class="kpi-icon glow-danger"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="kpi-data"><h4 id="adm-exec-kpi-atrasadas">–</h4><p>Atrasadas (todas as áreas)</p></div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-icon glow-success"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-data"><h4 id="adm-exec-kpi-concluidas">–</h4><p>Concluídas (7 dias)</p></div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-icon glow-warning"><i class="fas fa-rotate-left"></i></div>
                <div class="kpi-data"><h4 id="adm-exec-kpi-retrabalho">–</h4><p>Atividades com Retrabalho</p></div>
            </div>
        </div>

        <!-- 🆕 Visão Geral do Sistema — colaboradores, OS, Qualidade e
             Checklist de Execução, tudo cross-área, num lugar só. Antes
             cada uma dessas coisas só dava pra ver abrindo a aba
             específica; ADM precisa do resumo sem entrar em cada uma. -->
        <div class="glass-panel" style="padding:24px; margin-bottom:20px;">
            <h3 style="color:var(--text-heading); font-size:1rem; margin-bottom:4px;"><i class="fas fa-chart-simple"></i> Visão Geral do Sistema</h3>
            <p class="text-muted" style="font-size:12px; margin-bottom:16px;">Colaboradores, Ordens de Serviço, Qualidade e Checklist de Execução — tudo num lugar só.</p>
            <div class="kpi-container">
                <div class="kpi-card">
                    <div class="kpi-icon glow-brand"><i class="fas fa-users"></i></div>
                    <div class="kpi-data"><h4 id="adm-exec-kpi-colaboradores">–</h4><p>Colaboradores Ativos</p></div>
                </div>
                <div class="kpi-card warning">
                    <div class="kpi-icon glow-warning"><i class="fas fa-key"></i></div>
                    <div class="kpi-data"><h4 id="adm-exec-kpi-primeiro-acesso">–</h4><p>Aguardando 1º Acesso</p></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon glow-brand"><i class="fas fa-file-invoice"></i></div>
                    <div class="kpi-data"><h4 id="adm-exec-kpi-os-abertas">–</h4><p>OS em Aberto</p></div>
                </div>
                <div class="kpi-card danger">
                    <div class="kpi-icon glow-danger"><i class="fas fa-magnifying-glass"></i></div>
                    <div class="kpi-data"><h4 id="adm-exec-kpi-achados-qualidade">–</h4><p>Achados de Qualidade Pendentes</p></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon glow-brand"><i class="fas fa-list-check"></i></div>
                    <div class="kpi-data"><h4 id="adm-exec-kpi-checklist-andamento">–</h4><p>Checklists de Execução em Andamento</p></div>
                </div>
            </div>
        </div>

        <div class="dashboard-main-grid">
            <div class="glass-panel" style="padding:24px;">
                <h3 style="color:var(--text-heading); font-size:1rem; margin-bottom:4px;"><i class="fas fa-ranking-star"></i> Áreas com Mais Atraso</h3>
                <p class="text-muted" style="font-size:12px; margin-bottom:16px;">Quantas atividades atrasadas cada área tem agora — onde apertar primeiro.</p>
                <div id="adm-exec-ranking-areas"></div>
            </div>

            <div class="glass-panel" style="padding:24px;">
                <h3 style="color:var(--text-heading); font-size:1rem; margin-bottom:4px;"><i class="fas fa-rotate-left"></i> Retrabalho (Atividades Mais Reabertas)</h3>
                <p class="text-muted" style="font-size:12px; margin-bottom:16px;">O mesmo problema voltando — vale investigar a causa raiz, não só reabrir de novo.</p>
                <div id="adm-exec-retrabalho"></div>
            </div>
        </div>

        <!-- 🆕 AVISOS DO SISTEMA — comunicado que todo colaborador precisa
             confirmar leitura ao entrar (ver window.verificarAvisosPendentes,
             chamado em finalizarLogin). Gerenciado aqui: criar, ver
             progresso de leitura e arquivar. -->
        <div class="glass-panel" style="padding:24px; margin-top:20px;">
            <div class="flex-between" style="margin-bottom:4px;">
                <h3 style="color:var(--text-heading); font-size:1rem;"><i class="fas fa-bullhorn"></i> Avisos do Sistema</h3>
                <button class="btn-premium btn-success" style="padding:6px 14px;" onclick="window.abrirModalCriarAviso()">
                    <i class="fas fa-plus"></i> Novo Aviso
                </button>
            </div>
            <p class="text-muted" style="font-size:12px; margin-bottom:16px;">Todo colaborador vê e precisa confirmar leitura ao entrar no sistema — igual "treinamento disponível", "novo procedimento", etc.</p>
            <div id="adm-exec-avisos-lista"></div>
        </div>
    `;

    const definir = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };

    // ---- ATIVIDADES: KPIs globais + ranking de atraso por área ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const atividades = resp.ok ? await resp.json() : [];

        const abertas = atividades.filter(a => a.status !== 'Concluído').length;
        const atrasadas = atividades.filter(a => atividadeEstaAtrasada(a));
        const dataLimite7dias = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d.toISOString().slice(0, 10);
        })();
        const concluidasRecentes = atividades.filter(a =>
            a.status === 'Concluído' && a.concluido_em && a.concluido_em.slice(0, 10) >= dataLimite7dias
        ).length;

        definir('adm-exec-kpi-abertas', abertas);
        definir('adm-exec-kpi-atrasadas', atrasadas.length);
        definir('adm-exec-kpi-concluidas', concluidasRecentes);

        const contagemPorArea = {};
        atrasadas.forEach(a => {
            const chaveArea = a.area || 'sem-area';
            contagemPorArea[chaveArea] = (contagemPorArea[chaveArea] || 0) + 1;
        });
        const rankingAreas = Object.entries(contagemPorArea)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const elRanking = document.getElementById('adm-exec-ranking-areas');
        if (elRanking) {
            if (rankingAreas.length === 0) {
                elRanking.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma atividade atrasada em nenhuma área agora ✅</div>`;
            } else {
                const maiorContagem = rankingAreas[0][1];
                elRanking.innerHTML = rankingAreas.map(([chaveArea, qtd]) => {
                    const info = AREAS_OFICINA.find(a => a.chave === chaveArea);
                    const nome = info ? info.nome : chaveArea;
                    const pctBarra = Math.max(8, Math.round((qtd / maiorContagem) * 100));
                    return `
                        <div style="margin-bottom:12px; cursor:pointer;" onclick="window.abrirAreaOficina('${chaveArea}')" title="Abrir ${nome}">
                            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                                <span style="color:var(--text-body);">${nome}</span>
                                <span style="color:var(--danger); font-weight:700;">${qtd}</span>
                            </div>
                            <div style="background:var(--bg-td); border-radius:6px; height:8px; overflow:hidden;">
                                <div style="background:var(--danger); height:100%; width:${pctBarra}%; border-radius:6px;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.error('⚠️ Não consegui carregar as atividades no painel executivo do ADM:', e);
    }

    // ---- RETRABALHO (atividades mais reabertas) ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades/mais_reabertas?limite=5`, { cache: 'no-store' });
        const reabertas = resp.ok ? await resp.json() : [];

        definir('adm-exec-kpi-retrabalho', reabertas.length);

        const elRetrabalho = document.getElementById('adm-exec-retrabalho');
        if (elRetrabalho) {
            elRetrabalho.innerHTML = reabertas.length
                ? reabertas.map(a => {
                    const info = AREAS_OFICINA.find(ar => ar.chave === a.area);
                    const nomeArea = info ? info.nome : (a.area || 'Sem área');
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding:10px 0; border-bottom:1px solid var(--border);">
                            <div style="min-width:0;">
                                <div style="color:var(--text-body); font-size:13px;">${a.descricao || 'Sem descrição'}</div>
                                <div class="text-muted" style="font-size:11px; margin-top:2px;">${nomeArea}${a.equipamento_id ? ' · ' + a.equipamento_id : ''}</div>
                            </div>
                            <span style="flex-shrink:0; font-weight:700; color:var(--warning); font-size:13px;"><i class="fas fa-rotate-left"></i> ${a.reaberturas_count}x</span>
                        </div>
                    `;
                }).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma atividade foi reaberta ainda — sem retrabalho registrado 👍</div>`;
        }
    } catch (e) {
        console.error('⚠️ Não consegui carregar o ranking de retrabalho no painel executivo do ADM:', e);
    }

    // ---- VISÃO GERAL DO SISTEMA (colaboradores, OS, Qualidade, Checklist) ----
    try {
        const apiBase = await resolverApiBase();

        try {
            const resp = await fetch(`${apiBase}/api/colaboradores/todos`, { cache: 'no-store' });
            const colaboradores = resp.ok ? await resp.json() : [];
            const ativos = colaboradores.filter(c => c.ativo);
            definir('adm-exec-kpi-colaboradores', ativos.length);
            definir('adm-exec-kpi-primeiro-acesso', ativos.filter(c => c.primeiro_acesso).length);
        } catch (e) {
            console.error('⚠️ Não consegui carregar colaboradores no painel executivo do ADM:', e);
        }

        try {
            const resp = await fetch(`${apiBase}/api/ordens_servico?limite=500`, { cache: 'no-store' });
            const os = resp.ok ? await resp.json() : [];
            definir('adm-exec-kpi-os-abertas', os.filter(o => o.status !== 'Concluído').length);
        } catch (e) {
            console.error('⚠️ Não consegui carregar OS no painel executivo do ADM:', e);
        }

        try {
            const resp = await fetch(`${apiBase}/api/qualidade?limite=500`, { cache: 'no-store' });
            const registros = resp.ok ? await resp.json() : [];
            // `achados_pendentes` já vem calculado por registro (ver
            // routers/qualidade.py) — soma tudo pra um total geral.
            const totalPendentes = registros.reduce((soma, r) => soma + (Number(r.achados_pendentes) || 0), 0);
            definir('adm-exec-kpi-achados-qualidade', totalPendentes);
        } catch (e) {
            console.error('⚠️ Não consegui carregar Qualidade no painel executivo do ADM:', e);
        }

        try {
            const resp = await fetch(`${apiBase}/api/checklist-execucao/execucoes/todas`, { cache: 'no-store' });
            const execucoes = resp.ok ? await resp.json() : [];
            definir('adm-exec-kpi-checklist-andamento', Array.isArray(execucoes) ? execucoes.length : 0);
        } catch (e) {
            console.error('⚠️ Não consegui carregar Checklist de Execução no painel executivo do ADM:', e);
        }
    } catch (e) {
        console.error('⚠️ Falha geral montando a Visão Geral do Sistema no painel executivo do ADM:', e);
    }

    // ---- AVISOS DO SISTEMA ----
    if (typeof window.renderizarListaAvisosAdm === 'function') window.renderizarListaAvisosAdm();
};

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
    if (elSupDonutRisco) elSupDonutRisco.innerHTML = construirHtmlDonutRisco(ativos);
    if (elSupDonutStatus) elSupDonutStatus.innerHTML = construirHtmlDonutStatus(atividades);
    if (elSupRankingVeios) elSupRankingVeios.innerHTML = construirHtmlRankingVeios(ativos);

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
        buscarDadosApontamentos7dias()
            .then(dados => { elSupProducao.innerHTML = construirHtmlProducaoLancada(dados); })
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
// FUNÇÃO PARA ABRIR O FOLHÃO CORRETO POR TIPO (CORRIGIDA)
// ==========================================
window.abrirFolhaoPorTipo = function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        alert('Equipamento não encontrado.');
        return;
    }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ==========================================
    // 1. MAPEAMENTO COMPLETO DE FOLHÕES
    // ==========================================

    // ---- MOLDES ----
    if (tipo === 'Molde') {
        if (mcc === '2/3') {
            if (typeof window.abrirFolhaoMolde23 === 'function') {
                window.abrirFolhaoMolde23(id);
                return;
            }
        } else {
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        // Fallback: se a função não existir, abre o folhão genérico
        if (typeof window.abrirFolhaoGenerico === 'function') {
            window.abrirFolhaoGenerico(id);
            return;
        }
        console.warn(`Folhão para Molde (MCC ${mcc}) não implementado.`);
        return;
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.abrirFolhaoMCC4 === 'function') {
            window.abrirFolhaoMCC4(id);
            return;
        }
        console.warn('Folhão Bender não implementado.');
        return;
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.abrirFolhaoBow === 'function') {
            window.abrirFolhaoBow(id);
            return;
        }
        console.warn('Folhão Bow não implementado.');
        return;
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.abrirFolhaoHorizontal === 'function') {
            window.abrirFolhaoHorizontal(id);
            return;
        }
        console.warn('Folhão Horizontal não implementado.');
        return;
    }

    // ---- STRAIGHTENER (R1 e R2) ----
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.abrirFolhaoR1 === 'function') {
                window.abrirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.abrirFolhaoR2 === 'function') {
                window.abrirFolhaoR2(id);
                return;
            }
        } else {
            // Fallback: se não identificar R1/R2, tenta o folhão MCC4
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        console.warn('Folhão para Straightener não implementado.');
        return;
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.abrirFolhaoDesempenadeira === 'function') {
            window.abrirFolhaoDesempenadeira(id);
            return;
        }
        console.warn('Folhão Desempenadeira não implementado.');
        return;
    }

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    // 🔧 CORREÇÃO: antes esses tipos caíam no fallback genérico e abriam
    // o folhão MCC4 (Molde/Bender) por engano — checklist errado. Os 3
    // grupos usam o mesmo checklist entre si (documento oficial), só
    // muda a tolerância de GAP e a lista de materiais.
    //
    // 🔧 CORREÇÃO 2 (o "Concluir" não tirava a peça da Oficina/Reparo,
    // mesmo pra peças de Grupo já reconhecidas aqui): o cadastro manual
    // no Estoque Reserva usa o tipo "Segmento Grupo 1/2/3" (com a
    // palavra "Segmento" na frente — ver as <option> em app.html), mas
    // esta checagem só reconhecia "Grupo 1/2/3" (sem "Segmento"), que é
    // como as peças ORIGINAIS da planilha ficam depois de traduzidas
    // (traduzirTipo, em banco.js). Uma peça de Grupo cadastrada pelo
    // técnico (e não importada da planilha original) nunca batia aqui,
    // caía no fallback genérico (folhão de Molde/Bender, sem noção
    // nenhuma de "concluir e voltar pra reserva" desse tipo de peça) —
    // por isso o "Concluir" parecia não fazer nada.
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.abrirFolhaoSegmentoGrupo === 'function') {
            window.abrirFolhaoSegmentoGrupo(id);
            return;
        }
        console.warn('Folhão Segmento Grupo não implementado.');
        return;
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.abrirFolhaoSegmentoZero === 'function') {
            window.abrirFolhaoSegmentoZero(id);
            return;
        }
        console.warn('Folhão Segmento Zero não implementado.');
        return;
    }

    // ---- OUTROS TIPOS (FALLBACK) ----
    // Se chegar aqui, tenta abrir o folhão genérico (se existir)
    if (typeof window.abrirFolhaoGenerico === 'function') {
        window.abrirFolhaoGenerico(id);
        return;
    }

    // Último recurso: abre o folhão do Bender como fallback
    if (typeof window.abrirFolhaoMCC4 === 'function') {
        console.warn(`Tipo ${tipo} sem folhão específico. Usando MCC4 como fallback.`);
        window.abrirFolhaoMCC4(id);
        return;
    }

    // Se nada funcionar, exibe uma mensagem amigável (sem alert)
    console.warn(`Nenhum folhão disponível para o tipo: ${tipo}`);
};

// ==========================================================================
// 🆕 PRÉ-VISUALIZAR — chamado direto do painel "Teste de Folhões"
// (renderPainelDevTeste), não de dentro do Folhão nem da tela do
// Checklist de Execução. Pedido do técnico: antes só dava pra
// conferir o documento final abrindo o Folhão na mão e clicando num
// botão lá dentro — queria isso junto do "Abrir Folhão" já existente
// nesse painel de teste.
//
// Abre o Folhão certo pro tipo do equipamento (populado com o rascunho
// + o que já foi preenchido no Checklist de Execução, igual o botão
// "Folhão" já faz) e, assim que terminar de carregar, dispara a
// pré-visualização sozinho — sem precisar clicar em mais nada.
window.previsualizarFolhaoDoReparo = async function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) { alert('Equipamento não encontrado.'); return; }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // Molde MCC4, Molde MCC2/3 e Horizontal têm pré-visualização própria.
    // Os outros folhões ainda não têm uma função previsualizarFolhaoX
    // equivalente — adicionar aqui conforme cada área ganhar a sua.
    if (tipo === 'Molde' && mcc !== '2/3' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoMolde4 === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoMolde4();
        return;
    }
    if (tipo === 'Molde' && mcc === '2/3' && typeof window.abrirFolhaoMolde23 === 'function' && typeof window.previsualizarFolhaoMolde23 === 'function') {
        await window.abrirFolhaoMolde23(id);
        window.previsualizarFolhaoMolde23();
        return;
    }
    if (tipo === 'Horizontal' && typeof window.abrirFolhaoHorizontal === 'function' && typeof window.previsualizarFolhaoHorizontal === 'function') {
        await window.abrirFolhaoHorizontal(id);
        window.previsualizarFolhaoHorizontal();
        return;
    }
    if (tipo === 'Bow' && typeof window.abrirFolhaoBow === 'function' && typeof window.previsualizarFolhaoBow === 'function') {
        await window.abrirFolhaoBow(id);
        window.previsualizarFolhaoBow();
        return;
    }
    // 🆕 Bender — mesmo gap que existia pro Straightener (ver abaixo):
    // abrirFolhaoMCC4 + previsualizarFolhaoBender já existem, só faltava
    // o caso aqui pra Pré-visualizar não cair no alert genérico.
    if (tipo === 'Bender' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoBender === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoBender();
        return;
    }
    // 🆕 Segmento Zero — mesmo gap do Bender/Straightener.
    if (tipo === 'Segmento Zero' && typeof window.abrirFolhaoSegmentoZero === 'function' && typeof window.previsualizarFolhaoSegZero === 'function') {
        await window.abrirFolhaoSegmentoZero(id);
        window.previsualizarFolhaoSegZero();
        return;
    }
    // 🆕 Cadeira Superior/Inferior (Desempenadeira) — mesmo gap.
    if ((tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') && typeof window.abrirFolhaoDesempenadeira === 'function' && typeof window.previsualizarFolhaoDesemp === 'function') {
        await window.abrirFolhaoDesempenadeira(id);
        window.previsualizarFolhaoDesemp();
        return;
    }
    // 🆕 Segmento Grupo 1/2/3 — mesmo gap.
    if (/^(Grupo|Segmento Grupo) [123]$/.test(tipo) && typeof window.abrirFolhaoSegmentoGrupo === 'function' && typeof window.previsualizarFolhaoSegGrupo === 'function') {
        await window.abrirFolhaoSegmentoGrupo(id);
        window.previsualizarFolhaoSegGrupo();
        return;
    }
    // 🆕 Straightener (R1 e R2) — mesma regra de identificação usada em
    // abrirFolhaoPorTipo (por id, já que os dois compartilham o tipo
    // canônico "Straightener").
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if ((tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) && typeof window.abrirFolhaoR1 === 'function' && typeof window.previsualizarFolhaoR1 === 'function') {
            await window.abrirFolhaoR1(id);
            window.previsualizarFolhaoR1();
            return;
        }
        if ((tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) && typeof window.abrirFolhaoR2 === 'function' && typeof window.previsualizarFolhaoR2 === 'function') {
            await window.abrirFolhaoR2(id);
            window.previsualizarFolhaoR2();
            return;
        }
    }

    alert('Pré-visualização ainda não disponível pra esse tipo de equipamento — use o botão "Folhão" pra conferir manualmente.');
};

// ==========================================================================
// 🆕 CONCLUIR E IMPRIMIR — POR TIPO. Chamado pelo botão "Concluir" do
// Checklist de Execução (renderizarBotaoConcluirReparo, em
// checklist-execucao.js), que ANTES chamava window.concluirEImprimirFolhaoMolde4
// direto, fixo — funcionava só pro Molde, ia quebrar (ou imprimir o
// Folhão errado) assim que outra área fosse cadastrada. Agora decide
// pelo tipo do equipamento, igual window.abrirFolhaoPorTipo já faz pro
// Folhão: se a área tiver uma função de conclusão própria, usa ela; se
// não tiver ainda, cai na genérica (window.concluirEImprimirFolhaoGenerico,
// em folhaoMolde4.js) até que uma específica seja implementada.
// ==========================================================================
window.concluirEImprimirFolhaoPorTipo = function(id) {
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        console.warn(`Concluir: equipamento ${id} não encontrado no BANCO_ATIVOS.`);
        return;
    }
    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ---- MOLDE MCC4 (e Molde sem MCC 2/3) ----
    if (tipo === 'Molde' && mcc !== '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde4 === 'function') {
            window.concluirEImprimirFolhaoMolde4(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.concluirEImprimirFolhaoBow === 'function') {
            window.concluirEImprimirFolhaoBow(id);
            return;
        }
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.concluirEImprimirFolhaoHorizontal === 'function') {
            window.concluirEImprimirFolhaoHorizontal(id);
            return;
        }
    }

    // ---- STRAIGHTENER (R1 e R2) — mesma regra de identificação do
    // abrirFolhaoPorTipo, pra Concluir abrir o mesmo laudo que foi salvo.
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.concluirEImprimirFolhaoR1 === 'function') {
                window.concluirEImprimirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.concluirEImprimirFolhaoR2 === 'function') {
                window.concluirEImprimirFolhaoR2(id);
                return;
            }
        }
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.concluirEImprimirFolhaoDesemp === 'function') {
            window.concluirEImprimirFolhaoDesemp(id);
            return;
        }
    }

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.concluirEImprimirFolhaoSegmentoGrupo === 'function') {
            window.concluirEImprimirFolhaoSegmentoGrupo(id);
            return;
        }
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.concluirEImprimirFolhaoSegmentoZero === 'function') {
            window.concluirEImprimirFolhaoSegmentoZero(id);
            return;
        }
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.concluirEImprimirFolhaoBender === 'function') {
            window.concluirEImprimirFolhaoBender(id);
            return;
        }
    }

    // ---- QUALQUER OUTRO TIPO (e o que faltar implementar) ----
    // Ainda sem função de conclusão própria — usa a genérica, que faz a
    // mesma coisa (busca o laudo salvo, manda pra Reserva, imprime) sem
    // nada fixo de Molde. Quando uma área precisar de regra diferente,
    // cria window.concluirEImprimirFolhaoX e adiciona um bloco aqui, no
    // mesmo padrão dos blocos de cima.
    if (typeof window.concluirEImprimirFolhaoGenerico === 'function') {
        window.concluirEImprimirFolhaoGenerico(id);
        return;
    }

    console.warn(`Concluir: nenhuma função de conclusão disponível para o tipo "${tipo}".`);
};
// ==========================================================================
// MÓDULO INTELIGENTE: APONTAMENTO DIÁRIO E DESCONTO DE VIDA ÚTIL EM LOTE
// ==========================================================================

window.abrirModalProducao = function() {
    document.getElementById("prod-mcc2").value = "";
    document.getElementById("prod-mcc3").value = "";
    document.getElementById("prod-mcc4").value = "";
    document.getElementById("modal-producao-diaria").classList.remove("hidden");
};

window.fecharModalProducao = function() {
    document.getElementById("modal-producao-diaria").classList.add("hidden");
};

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

// ==============================================================
// 2. CONEXÃO COM O PYTHON 
// ==============================================================
window.carregarAtivosDoPython = async function() {
 
    console.log("🔄 Conectando ao Banco de Dados Python...");
    const atualizou = await sincronizarAtivosReaisMCC4();
    if (atualizou) {
        console.log(`✨ Tela atualizada! ${BANCO_ATIVOS.length} peças carregadas.`);
    } else {
        console.warn("⚠️ Python Offline. Usando dados locais.");
    }
    return atualizou;
};

// ==============================================================
// 3. APONTAMENTO DE PRODUÇÃO GERAL E MOLDES
// ==============================================================
window.processarProducaoDiaria = async function() {
    if (!window.verificarAcesso()) return;

    const prodMcc2 = parseFloat(document.getElementById("prod-mcc2").value) || 0;
    const prodMcc3 = parseFloat(document.getElementById("prod-mcc3").value) || 0;
    const prodMcc4 = parseFloat(document.getElementById("prod-mcc4").value) || 0;

    if (prodMcc2 === 0 && prodMcc3 === 0 && prodMcc4 === 0) return alert("⚠️ Digite a produção de pelo menos uma máquina.");

    const btn = document.querySelector("#aba-producao .btn-success");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> ATUALIZANDO...";

    let pecasAtualizadas = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        // 🔧 CORREÇÃO ("osciladores contabilizando tonelagem"): Oscilador e
        // Mesa Osciladora reaproveitam o campo `ton` pra guardar DIAS de
        // vida (não toneladas — ver rotuloDesgaste, comentário mais acima
        // neste arquivo), então precisam ficar de fora do incremento de
        // produção igual Molde já fica. Sem este filtro, cada lançamento
        // somava tonelagem lingotada em cima do que devia ser uma
        // contagem de dias, inflando o desgaste desses itens à toa — a
        // contagem de dias de verdade já é calculada à parte, a partir de
        // dataEntradaVeio (calcularDias), e não é afetada por isto aqui.
        if (p.status === "Instalado" && p.tipo && !p.tipo.toUpperCase().includes("MOLDE") && p.tipo !== "Oscilador" && p.tipo !== "Mesa Osciladora") {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && prodMcc2 > 0) { p.ton = (p.ton || 0) + prodMcc2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && prodMcc3 > 0) { p.ton = (p.ton || 0) + prodMcc3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && prodMcc4 > 0) { p.ton = (p.ton || 0) + prodMcc4; sofreuDesgaste = true; }
            if (sofreuDesgaste) pecasAtualizadas++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchComRetry(`${apiBase}/api/apontar_producao_geral`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: prodMcc2, qtd_mcc3: prodMcc3, qtd_mcc4: prodMcc4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("prod-mcc2").value = ""; document.getElementById("prod-mcc3").value = ""; document.getElementById("prod-mcc4").value = "";
            
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ Sucesso Absoluto!\n${pecasAtualizadas} equipamentos gerais foram atualizados.`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com a API."); }

    btn.disabled = false; btn.innerHTML = textoOriginal;
};

window.salvarApontamentoMoldes = async function(event) {
    if (!window.verificarAcesso()) return;

    const m2 = parseInt(document.getElementById("molde-prod-mcc2").value) || 0;
    const m3 = parseInt(document.getElementById("molde-prod-mcc3").value) || 0;
    const m4 = parseInt(document.getElementById("molde-prod-mcc4").value) || 0;

    if (m2 === 0 && m3 === 0 && m4 === 0) return alert("Digite a quantidade de panelas.");

    const btn = event.currentTarget;
    const txtOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> Processando...";

    let moldesAtualizados = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        if (p.status === "Instalado" && p.tipo && p.tipo.toUpperCase().includes("MOLDE")) {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && m2 > 0) { p.ton = (p.ton || 0) + m2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && m3 > 0) { p.ton = (p.ton || 0) + m3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && m4 > 0) { p.ton = (p.ton || 0) + m4; sofreuDesgaste = true; }
            if (sofreuDesgaste) moldesAtualizados++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchComRetry(`${apiBase}/api/apontar_moldes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: m2, qtd_mcc3: m3, qtd_mcc4: m4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("molde-prod-mcc2").value = ""; document.getElementById("molde-prod-mcc3").value = ""; document.getElementById("molde-prod-mcc4").value = "";
            
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ ${moldesAtualizados} Moldes foram atualizados com sucesso!`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com o Python."); }
    
    btn.disabled = false; btn.innerHTML = txtOriginal;
};

window.carregarHistoricoApontamentoGeral = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_geral`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-geral");
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // 🔥 Conversão de UTC para Horário Local (Brasília)
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T') + 'Z')
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1 
                    ? `<span style="color:var(--danger); font-weight:bold; font-size:10px;"><i class="fas fa-ban"></i> DESFEITO</span>` 
                    : `<button class="btn-outline-danger" style="padding: 2px 6px; font-size: 10px;" onclick="window.desfazerApontamentoGeral(${log.id})"><i class="fas fa-undo"></i></button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc2 > 0 ? '+'+log.qtd_mcc2 : '-'}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc3 > 0 ? '+'+log.qtd_mcc3 : '-'}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc4 > 0 ? '+'+log.qtd_mcc4 : '-'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6'>Nenhum lançamento.</td></tr>"; }
    } catch (e) { console.log(e); }
};


window.carregarHistoricoApontamentoMoldes = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_moldes`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-moldes");
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // 🔥 Conversão de UTC para Horário Local (Brasília)
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T') + 'Z')
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1 
                    ? `<span style="color:var(--danger); font-weight:bold; font-size:10px;"><i class="fas fa-ban"></i> DESFEITO</span>` 
                    : `<button class="btn-outline-danger" style="padding: 2px 6px; font-size: 10px;" onclick="window.desfazerApontamentoMolde(${log.id})"><i class="fas fa-undo"></i></button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc2 > 0 ? '+'+log.qtd_mcc2 : '-'}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc3 > 0 ? '+'+log.qtd_mcc3 : '-'}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc4 > 0 ? '+'+log.qtd_mcc4 : '-'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6'>Nenhum lançamento.</td></tr>"; }
    } catch (e) { console.log(e); }
};

// 🔧 "AÇÃO RESTRITA: senha master dev123" removido — era decoração
// (senha em texto puro no JS, sem checagem nenhuma no servidor; ver
// revisão de segurança). A proteção de verdade agora é o servidor
// exigir um token de admin (ver headersAdmin() acima e exigir_admin()
// no backend) — o confirm() abaixo continua só pra evitar clique
// acidental, não é mais a "segurança" da ação.
window.desfazerApontamentoGeral = async function(id_log) {
    if (!confirm("Tem certeza? A tonelagem será RETIRADA de todas as peças instaladas.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_geral`, {
            method: "POST", headers: headersAdmin(),
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();

        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};

window.desfazerApontamentoMolde = async function(id_log) {
    if (!confirm("Tem certeza? As corridas serão RETIRADAS dos moldes na linha.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_moldes`, {
            method: "POST", headers: headersAdmin(),
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();
        
        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};



// ==============================================================
// 4. HISTÓRICO DE LAUDOS E SWAP
// ==============================================================
// 🔧 CORREÇÃO ("laudos só existiam no localStorage de quem gerava"):
// antes, o PDF do folhão ficava só no navegador de quem finalizava —
// sumia se limpasse os dados, e nunca aparecia pra outro técnico em
// outro aparelho, nem pra outro moderador na Auditoria. Agora persiste
// no Neon (tabela "laudos"), igual todo o resto do histórico.
window.salvarLaudoNoHistorico = async function(tag, tipo, htmlPDF) {
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peca_id: tag, tipo, html: htmlPDF, operador })
        });
        if (!resp.ok) throw new Error('A API não confirmou o salvamento do laudo.');
        const resultado = await resp.json();
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
        return resultado.id;
    } catch (e) {
        console.error('⚠️ Não consegui salvar o laudo no servidor:', e);
        return null;
    }
};

window.excluirLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir o laudo.');
            return;
        }
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
    } catch (e) {
        console.error('⚠️ Erro ao excluir laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.visualizarLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/${id}`, { cache: 'no-store' });
        if (!resp.ok) return alert('Laudo não encontrado.');
        const laudo = await resp.json();
        const win = window.open('', '_blank', 'width=1100,height=800');
        if (win) { win.document.write(laudo.html); win.document.close(); }
        else { const p = document.getElementById('print-content'); if (p) { p.innerHTML = laudo.html; window.print(); } }
    } catch (e) {
        console.error('⚠️ Erro ao carregar laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};


// 🆕 TRANSPORTE FÍSICO (Logística) — o swap de peça (abaixo) muda o
// STATUS no sistema na hora ("Instalado"/"Oficina / Reparo"), mas isso
// é só o registro — a peça continua fisicamente onde estava até
// alguém de verdade carregar ela na carreta. Sem isso, "Oficina" no
// sistema não significa "chegou na oficina" de verdade, e ninguém
// ficava sabendo que precisava buscar/levar um equipamento.
// Decisão explícita: NÃO mexe no status nem na lógica do swap (que já
// funciona e é usada em vários lugares) — só cria uma atividade
// normal pra área "logistica", reaproveitando 100% a infraestrutura
// que já existe (POST /api/oficina/atividade — mesma rota do botão
// "+ Lançar Atividade" que a Logística já usa). A Logística vê na
// própria fila de Atividades Pendentes, anexa foto do documento de
// retirada ao editar (já suportado) e marca Concluído quando entregar
// de verdade — sem criar nenhum sistema novo.
async function notificarLogisticaTransporte(descricao, equipamentoId, destino) {
    // 🔧 CORREÇÃO ("prontuário deve mostrar toda logística finalizada e
    // pra onde"): até aqui, essa atividade só existia na fila da
    // Logística — quando ela marcava "Concluído", nada era escrito no
    // Prontuário da peça (só o fluxo de reabastecimento, marcador
    // [REABASTECER_RESERVA:<id>], fechava esse loop). Mesmo padrão de
    // marcador em texto na descrição (sem mudar schema do backend), pra
    // processarMarcadorAtividadeConcluida saber qual peça e destino
    // registrar no histórico quando a entrega de verdade for confirmada.
    const descricaoComMarcador = (equipamentoId && destino)
        ? `[TRANSPORTE:${equipamentoId}:${destino}] ${descricao}`
        : descricao;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/atividade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: 'logistica',
                equipamento_id: equipamentoId || null,
                descricao: descricaoComMarcador,
                responsavel: null,
                prioridade: 'Alta',
                operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema',
                foto_base64: null,
                prazo: null,
                data_inicio: null,
                solicitante_matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null
            })
        });
    } catch (e) {
        // Nunca pode travar o swap por causa disso — a troca de peça já
        // foi aplicada e salva; se a notificação falhar, só avisa no
        // console (mesmo padrão de robustez usado em todo o sistema).
        console.error('⚠️ Não consegui avisar a Logística sobre o transporte:', e);
    }
}
window.notificarLogisticaTransporte = notificarLogisticaTransporte;

// 🆕 REABASTECIMENTO DA RESERVA NA MÁQUINA: quando um reparo termina, a
// peça vira "Oficina / Reserva" (parada na oficina central), mas o
// estoque volante de verdade fica perto da máquina ("Máquina /
// Reserva"), pronto pra swap instantâneo sem acionar a Logística de
// novo. Essa função pede o transporte oficina→máquina pra repor esse
// estoque, reaproveitando a mesma rota/infra de notificarLogisticaTransporte.
// A descrição carrega o marcador [REABASTECER_RESERVA:<ID>] — é o jeito
// simples de linkar essa atividade de volta à peça quando a Logística
// concluir (ver parsing em mudarStatusAtividadeOficina), sem precisar
// mudar o schema do backend.
window.notificarLogisticaReabastecimento = async function(peca) {
    if (!peca || !peca.id) return;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/atividade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: 'logistica',
                equipamento_id: peca.id,
                descricao: `[REABASTECER_RESERVA:${peca.id}] Levar ${peca.id} (${peca.tipo}) da Oficina para Reserva na Máquina.`,
                responsavel: null,
                prioridade: 'Normal',
                operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema',
                foto_base64: null,
                prazo: null,
                data_inicio: null,
                solicitante_matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null
            })
        });
    } catch (e) {
        // Fire-and-forget — igual a notificarLogisticaTransporte, nunca
        // pode travar a conclusão do reparo por causa disso.
        console.error('⚠️ Não consegui avisar a Logística sobre o reabastecimento da reserva:', e);
    }
};

// 🆕 Botão "Mandar pra Máquina" da seção Reserva na Oficina (ver
// JS/ui.js, montarSecaoPorLocal): peça ainda na oficina não tem veio
// nem posição pra escolher — só faz sentido pedir o transporte.
// Reaproveita a mesma notificarLogisticaReabastecimento() que já roda
// sozinha quando um reparo termina; esse botão serve pra reenviar o
// pedido manualmente (ex: peça antiga que nunca teve o pedido
// disparado, ou pedido perdido) sem precisar esperar outro reparo.
window.enviarReservaParaMaquina = async function(idPeca) {
    if (!window.verificarAcesso()) return;
    const peca = BANCO_ATIVOS.find(a => a.id === idPeca);
    if (!peca) return alert('Peça não encontrada.');
    if (peca.local !== "Oficina / Reserva") return alert('Essa peça não está na Reserva da Oficina.');

    if (!confirm(`Pedir pra Logística levar ${peca.id} da Oficina pra Reserva na Máquina?`)) return;

    await window.notificarLogisticaReabastecimento(peca);
    alert(`🚚 Pedido enviado! ${peca.id} vai aparecer em "Reserva na Máquina" assim que a Logística confirmar a entrega.`);
};

window.iniciarSwapAlocacao = async function(idReserva) {
    if (!window.verificarAcesso()) return;
    const veioSelect = document.getElementById(`alocar-veio-${idReserva}`);
    const posElement = document.getElementById(`alocar-pos-${idReserva}`);
    if (!veioSelect) return alert('Erro: campo de veio não encontrado.');

    const veio = veioSelect.value;
    let posicao = posElement ? posElement.value : '';
    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
    
    if (!pecaReserva) return alert('Peça reserva não encontrada.');
    if (!veio) return alert('Selecione o Veio de destino.');

    const tipoUpper = (pecaReserva.tipo || '').toUpperCase();
    const mcc = pecaReserva.mcc_compat || '4';
    
    let slotChassi = posicao;
    if (mcc === '4') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('BENDER')) slotChassi = 'BENDER';
        else if (tipoUpper.includes('STR-1') || tipoUpper.includes('STRAIGHTENER R1')) slotChassi = 'STR-1';
        else if (tipoUpper.includes('STR-2') || tipoUpper.includes('STRAIGHTENER R2')) slotChassi = 'STR-2';
        else if (tipoUpper.includes('BOW')) slotChassi = `BOW-${posicao}`;
        else if (tipoUpper.includes('HORIZONTAL')) slotChassi = `HOR-${posicao}`;
        // 🔧 CORREÇÃO ("Oscilador entra na posição Sul ou Norte, mas o
        // select de posição do Swap fica vazio"): faltava esse caso —
        // mesma trava "OSC-N"/"OSC-S" que o Cadastro já usa (ver
        // "posicaoFixa = 'OSC-' + posicao" mais abaixo), só que o Swap
        // nunca replicava.
        else if (tipoUpper.includes('OSCILADOR')) slotChassi = `OSC-${posicao}`;
    } else if (mcc === '2/3') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('ZERO') || tipoUpper.includes('SEGMENTO ZERO')) slotChassi = 'SEG-ZERO';
        else if (tipoUpper.includes('CADEIRA SUPERIOR')) slotChassi = `CAD-SUP-${posicao}`;
        else if (tipoUpper.includes('CADEIRA INFERIOR')) slotChassi = `CAD-INF-${posicao}`;
        else if (tipoUpper.includes('SEGMENTO')) slotChassi = `SEG-${posicao}`;
    }

    if (!slotChassi || slotChassi === "") return alert('Selecione a Posição de destino para este equipamento.');

    // 🔧 CORREÇÃO CRÍTICA ("coloquei o Bow e ele expulsou o Molde que
    // tinha acabado de instalar"): a busca pela peça que já ocupa o
    // slot usava DOIS critérios — `p.posicaoFixa === slotChassi` OU
    // `p.id.includes(slotChassi)`. O segundo critério (substring no ID)
    // era uma tentativa antiga de cobrir peças sem posicaoFixa
    // confiável — mas hoje toda peça instalada TEM posicaoFixa
    // confiável (essa é literalmente a correção que fizemos nas últimas
    // rodadas). Esse segundo critério agora só serve pra gerar falso
    // positivo: como as peças de Estoque Reserva podem ter QUALQUER tag
    // digitada pelo técnico, era só o ID de alguma peça já instalada
    // (ex: o Molde) conter, por coincidência, os mesmos caracteres do
    // slotChassi sendo procurado (ex: "BOW-1") pra ela ser encontrada
    // por engano e expulsa do lugar certo dela.
    let pecaAntiga = null;
    for (const p of BANCO_ATIVOS) {
        if ((p.veio === veio && p.status === "Instalado") || (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"))) {
            if (p.posicaoFixa === slotChassi) { pecaAntiga = p; break; }
        }
    }

    // 🆕 "Máquina / Reserva" = peça já entregue fisicamente perto da
    // máquina, pronta pra swap instantâneo. "Oficina / Reserva" = peça
    // ainda parada na oficina central, que primeiro precisa passar pelo
    // botão "Mandar pra Máquina" (aba Reserva) e só aparece aqui depois
    // que a Logística confirmar a entrega.
    //
    // O Swap só é oferecido na UI pra peças que já
    // estão em "Máquina / Reserva" (ver JS/ui.js, montarSecaoPorLocal —
    // a seção "Reserva na Oficina" não tem mais select de veio/posição
    // nem botão Swap, só o botão "Mandar pra Máquina", que aciona
    // window.enviarReservaParaMaquina). Então, na prática, uma peça
    // chegando aqui SEMPRE está fisicamente na máquina — instala na
    // hora, sem estado "pendente de transporte" (aquele fluxo chegou a
    // existir numa versão anterior, mas guardava o destino em campos
    // que o backend nem persiste de verdade — Pydantic descarta campo
    // desconhecido silenciosamente — então foi removido).
    if (pecaReserva.local !== "Máquina / Reserva") {
        return alert('Essa peça ainda está na Reserva da Oficina — use "Mandar pra Máquina" primeiro (aba Reserva) e espere a Logística confirmar a entrega antes de instalar.');
    }

    if (pecaAntiga) {
        if (confirm(`A peça ${pecaAntiga.id} será SACADA do slot ${slotChassi} (Veio ${veio}) para dar lugar à ${pecaReserva.id}.`)) {
            pecaAntiga.status = "Oficina / Reparo"; pecaAntiga.local = "Oficina / Reparo";
            pecaAntiga.veio = ""; pecaAntiga.posicaoFixa = ""; pecaAntiga.pos = ""; pecaAntiga.dataReparo = Date.now(); pecaAntiga.dias = 0; pecaAntiga.dataEntradaVeio = null;
            pecaAntiga.substituidoPor = pecaReserva.id;

            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`; pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            // Persiste as duas peças no banco Postgres (a que saiu e a que entrou)
            if (typeof salvarPecaNoPython === 'function') {
                const okAntiga = await salvarPecaNoPython(pecaAntiga);
                const okReserva = await salvarPecaNoPython(pecaReserva);
                // 🔧 CORREÇÃO: salvarPecaNoPython() agora retorna true/false — antes,
                // se a gravação no Postgres falhasse (rede instável, Neon "acordando"),
                // a tela já mostrava o swap como concluído (alert de sucesso mais
                // abaixo) e o operador nunca ficava sabendo que o servidor não
                // recebeu a mudança, até ela "desfazer sozinha" no próximo sync.
                if (!okAntiga || !okReserva) {
                    alert(`⚠️ O swap foi aplicado na tela, mas houve falha ao salvar no servidor (${!okAntiga ? pecaAntiga.id : pecaReserva.id}). Verifique a conexão e tente sincronizar de novo antes de sair da tela, ou a mudança pode ser perdida.`);
                }
            }

            if (window.registrarHistorico) {
                const agora = new Date().toLocaleDateString('pt-BR');
                // 🔧 CORREÇÃO ("evento de instalação não aparece no
                // Prontuário"): ver nota grande em registrarHistorico()
                // — agora espera o registro terminar de salvar no banco
                // ANTES de liberar o alert() de sucesso, pra evitar que o
                // técnico troque de tela rápido demais e a chamada seja
                // abandonada antes de terminar.
                await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} em ${agora} (substituiu ${pecaAntiga.id}). Contagem de dias na máquina reiniciada.`);
                await window.registrarHistorico(pecaAntiga.id, `📤 Saiu do slot ${slotChassi} do Veio ${veio} em ${agora}, substituída por ${pecaReserva.id}. Foi para reparo — contagem de dias em reparo reiniciada.`);
            }
            if (typeof renderReparos === 'function') renderReparos(); if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos(); if (typeof renderPainelVeios === 'function') renderPainelVeios();
            notificarLogisticaTransporte(
                `Transportar: retirar ${pecaAntiga.id} do Veio ${veio} (slot ${slotChassi}) e levar pra Oficina`,
                pecaAntiga.id,
                'Oficina'
            );
            alert(`✅ Swap realizado! ${pecaReserva.id} instalado.`);
        }
    } else {
        if (confirm(`Instalar a reserva ${pecaReserva.id} no slot ${slotChassi} do Veio ${veio}?`)) {
            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`; pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            if (typeof salvarPecaNoPython === 'function') {
                const okReserva = await salvarPecaNoPython(pecaReserva);
                if (!okReserva) {
                    alert(`⚠️ A instalação foi aplicada na tela, mas houve falha ao salvar ${pecaReserva.id} no servidor. Verifique a conexão e tente sincronizar de novo antes de sair da tela, ou a mudança pode ser perdida.`);
                }
            }

            // 🔧 Ver correção em registrarHistorico(): espera terminar de
            // salvar antes do alert() de sucesso liberar o técnico.
            if (window.registrarHistorico) {
                await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} (gaveta vazia). Contagem de dias na máquina reiniciada.`);
            }

            if (typeof renderReparos === 'function') renderReparos(); if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos(); if (typeof renderPainelVeios === 'function') renderPainelVeios();
            // Já estava fisicamente na máquina — não precisa acionar
            // transporte de novo, é só uma instalação local.
            alert(`✅ ${pecaReserva.id} instalado com sucesso!`);
        }
    }
};

window.forcarCamposPosicao = function() {
    const rows = document.querySelectorAll('#estoque-table-body tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const posCell = cells[4]; const tagId = cells[0]?.textContent?.trim();
            if (tagId && !posCell.querySelector('input') && !posCell.querySelector('select')) {
                const input = document.createElement('input'); input.type = 'number'; input.id = `pos-${tagId}`; input.placeholder = 'Pos'; input.min = 1; input.max = 99;
                input.style.cssText = 'width:55px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#1a1a2e; color:#fff; text-align:center;';
                posCell.innerHTML = ''; posCell.appendChild(input);
            }
        }
    });
};

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

// Nome legível de uma área (chave -> nome de AREAS_OFICINA ou das
// extras acima), com fallback pra própria chave se não achar — usado
// nos registros de Ocorrência/OS (campo "area" opcional) e na Central
// de Notificações.
function nomeAreaOficina(chave) {
    const a = AREAS_OFICINA.find(x => x.chave === chave) || AREAS_NOTIFICACAO_EXTRAS.find(x => x.chave === chave);
    return a ? a.nome : chave;
}

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
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
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
// 🆕 CENTRAL DE NOTIFICAÇÕES — só supervisor/ADM (visibilidade decidida
// em ativarCentralNotificacoesSeAutorizado, mais abaixo). Não é uma
// aba de cadastro nova: só AGREGA o que já existe em outras abas
// (Central de Áreas, Ocorrência, OS) num feed único, lendo as mesmas
// APIs — não duplica lógica nenhuma de negócio.
// ==========================================
// 🔧 Voltou pra 30s (chegou a ir pra 10s por um instante): o banco é
// Neon plano free, com auto-suspend e CU-hrs limitados — 3x mais
// polling é 3x mais chance de manter o compute acordado à toa. 30s já
// é rápido o bastante pra área subir na lista logo depois de notificar,
// sem gastar cota de graça.
const INTERVALO_POLLING_NOTIFICACOES_MS = 30000;
let TIMER_POLLING_NOTIFICACOES = null;

// Enquanto a aba estiver aberta, atualiza sozinha a cada 30s. Se a
// pessoa sair da aba (ou trocar de operador), o próprio timer se
// desarma sozinho no próximo tick — não fica batendo no servidor à toa
// com a aba em segundo plano.
window.iniciarPollingCentralNotificacoes = function() {
    window.pararPollingCentralNotificacoes();
    TIMER_POLLING_NOTIFICACOES = setInterval(() => {
        const aba = document.getElementById('aba-notificacoes');
        if (!aba || !aba.classList.contains('active')) {
            window.pararPollingCentralNotificacoes();
            return;
        }
        window.carregarCentralNotificacoes();
    }, INTERVALO_POLLING_NOTIFICACOES_MS);
};

window.pararPollingCentralNotificacoes = function() {
    if (TIMER_POLLING_NOTIFICACOES) {
        clearInterval(TIMER_POLLING_NOTIFICACOES);
        TIMER_POLLING_NOTIFICACOES = null;
    }
};

// 🆕 PRESENÇA REAL DO COLABORADOR — heartbeat periódico enquanto o app
// está aberto e logado (com matrícula real, visitante fica de fora).
// Mesmo padrão de polling autodesarmável já usado no resto do arquivo:
// se OPERADOR_LOGADO sumir (logout recarrega a página, então isso é
// mais defensivo que necessário), o próprio timer se desliga.
const INTERVALO_HEARTBEAT_COLABORADOR_MS = 60000;
let TIMER_HEARTBEAT_COLABORADOR = null;

window.iniciarHeartbeatColaborador = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return; // visitante não tem matrícula pra reportar
    window.pararHeartbeatColaborador();

    const enviarHeartbeat = () => executarSeguroAsync(async () => {
        if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) { window.pararHeartbeatColaborador(); return; }
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/colaboradores/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula: OPERADOR_LOGADO.matricula })
        });
    }, 'heartbeatColaborador');

    enviarHeartbeat(); // primeiro sinal na hora, sem esperar o 1º intervalo
    TIMER_HEARTBEAT_COLABORADOR = setInterval(enviarHeartbeat, INTERVALO_HEARTBEAT_COLABORADOR_MS);
};

window.pararHeartbeatColaborador = function() {
    if (TIMER_HEARTBEAT_COLABORADOR) {
        clearInterval(TIMER_HEARTBEAT_COLABORADOR);
        TIMER_HEARTBEAT_COLABORADOR = null;
    }
};

// 🆕 CORREÇÃO ("mando mensagem e fico na tela, só chega se eu sair e
// voltar" — depois confirmado pelo usuário que o mesmo problema vale
// pra qualquer aba, não só o Chat): até aqui, cada aba só recarregava
// os dados dela quando a pessoa clicava pra abri-la — sair e voltar era
// o único "refresh" que existia. Registro único de auto-refresh por
// aba, plugado em window.abrirAba (o trocador de aba central do app):
// ao entrar numa aba com refresh conhecido, dispara um setInterval que
// chama a MESMA função que já roda ao abrir a aba; ao sair da aba (ou
// abrir outra), o timer da aba anterior é desarmado. Só cobre abas cuja
// função de recarregar é uma lista/painel somente-leitura (idempotente
// re-renderizar) — abas de formulário (cadastro, lançamento) não têm
// entrada aqui de propósito, pra não apagar o que a pessoa tá digitando
// no meio de um polling.
const INTERVALO_AUTO_REFRESH_ABA_MS = 15000;
// 🔧 Todas as entradas também chamam atualizarBadgeChatAreaAdm — antes o
// badge de "mensagens não lidas" (nav Chats / Central de Áreas) só
// atualizava em raras ações pontuais (login, enviar mensagem); ficar
// em qualquer outra aba não avisava que uma mensagem nova chegou no
// canal Entre Técnicos (ver correção em GET /api/mensagens_area/
// nao_lidas, que também deixou de ignorar esse canal).
const REFRESH_POR_ABA = {
    'aba-painel': () => { atualizarPainelCompleto(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-painel-supervisor': () => { atualizarPainelCompleto(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-tecnico': () => { window.carregarAtividadesPainelTecnico(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-oficina': () => { window.atualizarOficinaSilencioso(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-reparos': () => window.carregarReparosAndamento(),
    'aba-ordens-servico': () => window.carregarListaOrdensServico(),
    'aba-qualidade': () => window.carregarListaQualidade(),
    'aba-notificacoes': () => window.carregarCentralNotificacoes(),
    'aba-chats': () => { window.chatsCarregarMensagens(); window.atualizarBadgeChatAreaAdm?.(); }, // no-op sozinho se nenhuma conversa estiver aberta
    'aba-admin-colaboradores': () => window.carregarAdminColaboradores(), // mantém "Online agora"/"Offline há Xh" atualizando sozinho
    'aba-area-oficina': () => window.atualizarBadgeChatAreaAdm?.(), // atividades/OS da área já ficam cobertas pelo polling rápido de 4s (window.iniciarPollingRapidoArea)
};
let TIMER_AUTO_REFRESH_ABA = null;

window.pararAutoRefreshAba = function() {
    if (TIMER_AUTO_REFRESH_ABA) {
        clearInterval(TIMER_AUTO_REFRESH_ABA);
        TIMER_AUTO_REFRESH_ABA = null;
    }
};

window.iniciarAutoRefreshAba = function(idAba) {
    window.pararAutoRefreshAba();
    const refresh = REFRESH_POR_ABA[idAba];
    if (!refresh) return; // aba sem refresh automático mapeado
    TIMER_AUTO_REFRESH_ABA = setInterval(() => {
        const aba = document.getElementById(idAba);
        if (!aba || !aba.classList.contains('active')) {
            window.pararAutoRefreshAba();
            return;
        }
        executarSeguro(refresh, `auto-refresh ${idAba}`);
    }, INTERVALO_AUTO_REFRESH_ABA_MS);
};

// 🆕 Feed unificado (evento de Auditoria + OS em aberto + achado de
// Qualidade pendente), com lido/não-lido POR MATRÍCULA vindo pronto do
// backend (/api/notificacoes/feed) — nada de "lido" calculado no
// cliente, senão cada aba/dispositivo teria sua própria ideia do que
// já foi visto.
// 🐛 CORREÇÃO: essa função sempre devolveu `[]` tanto pra "busquei e não
// tem notificação nenhuma" quanto pra "o servidor falhou" (resp não-ok,
// exceção de rede) — exatamente o mesmo bug de "cadê as áreas, tirou
// tudo" já corrigido pro `/api/oficina/atividades`, só que nunca tinha
// sido corrigido aqui: um 500 (ex: pool de conexão esgotado, já
// aconteceu em produção) fazia a Central e o sininho mostrarem "nenhuma
// notificação" bem na hora que tinha alguma sem conseguir avisar.
// `null` = falhou; `[]` = buscou certinho e realmente não tem nada.
window.carregarFeedNotificacoes = async function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return [];
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/notificacoes/feed?matricula=${encodeURIComponent(OPERADOR_LOGADO.matricula)}&limite=30`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const feed = await resp.json();
        return Array.isArray(feed) ? feed : null;
    } catch (e) {
        console.error('⚠️ Erro ao carregar feed de notificações:', e);
        return null;
    }
};

// Atualiza o número no sininho do menu lateral — chamado depois do
// login, pelo timer global de 2 min (mesmo com a Central fechada), e
// agora também toda vez que a própria Central busca o feed (ver
// carregarCentralNotificacoes) ou marca algo como lido (ver
// abrirItemNotificacao/marcarTodasLidasDaArea) — 🐛 CORREÇÃO: antes só
// o timer de 2 min mexia nele, então ler tudo dentro da Central e
// fechar a aba deixava o número errado (alto) piscando na barra lateral
// por até 2 minutos.
// `feedPronto` é opcional: quando quem chama já tem o feed em mãos (a
// Central acabou de buscar), evita um fetch duplicado — passe undefined
// pra buscar do zero (uso original, fora da Central).
window.atualizarBadgeNotificacoesNaoLidas = async function(feedPronto) {
    const badge = document.getElementById('badge-notificacoes-nao-lidas');
    if (!badge) return;
    if (!operadorPodeVerNotificacoes()) { badge.classList.add('hidden'); return; }
    const feed = feedPronto !== undefined ? feedPronto : await window.carregarFeedNotificacoes();
    // `null` = a busca falhou — mantém o sino como já estava (não dá
    // pra saber se tem novidade ou não) em vez de escondê-lo como se
    // tivesse zero, e sem quebrar num "null.filter".
    if (feed === null) return;
    // 🆕 Técnico só conta o que é da própria área — senão o sino dele
    // mostraria não-lidas de áreas que ele nem enxerga na Central.
    const feedDoOperador = operadorTecnicoComArea()
        ? feed.filter(item => item.area === OPERADOR_LOGADO.area)
        : feed;
    const naoLidas = feedDoOperador.filter(item => !item.lida).length;
    // 🆕 Espelha no sino do header do Painel Geral (mesmo número, mesmo
    // critério de exibir/esconder) — ver header-topo-sino-badge em
    // app.html. Não é uma segunda fonte de verdade, só outro elemento
    // mostrando o mesmo estado.
    const badgeHeader = document.getElementById('header-topo-sino-badge');
    if (naoLidas > 0) {
        const texto = naoLidas > 99 ? '99+' : String(naoLidas);
        badge.innerText = texto;
        badge.classList.remove('hidden');
        if (badgeHeader) { badgeHeader.innerText = texto; badgeHeader.classList.remove('hidden'); }
    } else {
        badge.classList.add('hidden');
        if (badgeHeader) badgeHeader.classList.add('hidden');
    }
};

// Estado da navegação estilo Central de Áreas: null = mostrando a
// grade de todas as áreas; com valor = mostrando só as notificações
// daquela área (ver abrirDetalheAreaNotificacao/fecharDetalhe...).
let NOTIF_AREA_SELECIONADA = null;
let NOTIF_FEED_CACHE = [];
// 🔧 CORREÇÃO ("criei atividade, área ficou em Atenção mas o detalhe
// não mostra nada"): o status do card (Crítico/Restrição/Atenção) vem
// das ATIVIDADES em aberto da área (igual à Central de Áreas), mas o
// detalhe só listava o feed de NOTIFICAÇÕES (Ocorrência/OS/Achado/
// Estoque/Sinótico) — uma atividade nova não é nada disso, então o
// card acendia "Atenção" e o detalhe abria vazio. Guarda as atividades
// também pra poder mostrar as em aberto no detalhe.
let NOTIF_ATIVIDADES_CACHE = [];
// 🆕 Busca + filtro por status na grade — mesma UX da Central de Áreas
// (ver renderizarGridCentralAreas), só que aqui filtrando os CARDS de
// notificação, não os de atividade.
let NOTIF_GRADE_BUSCA = '';
let NOTIF_GRADE_FILTRO_STATUS = '';
// 🐛 CORREÇÃO: digitar na busca ou clicar num filtro depois de uma falha
// no servidor chamava renderizarGradeNotificacoes(NOTIF_ATIVIDADES_CACHE, …)
// — que é sempre um array (nunca null) — apagando o aviso de "não
// consegui verificar as áreas" e mostrando uma grade normal (vazia ou
// desatualizada) por cima, exatamente a falsa sensação de "tá tudo bem"
// que a distinção null/[] foi feita pra evitar.
let NOTIF_ULTIMO_FETCH_FALHOU = false;

window.carregarCentralNotificacoes = async function() {
    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO ("cadê as áreas, você tirou tudo"): uma falha real
        // no servidor (ex: pool de conexão do banco esgotado por um
        // instante) fazia essa busca cair no `[]` do catch — e uma lista
        // vazia de atividades é EXATAMENTE o mesmo formato de "nenhuma
        // área crítica agora", então a tela mostrava "tudo certo ✅" bem
        // na hora que os dados não tinham nem chegado. `null` marca "não
        // consegui buscar" separado de "busquei e não tem nada".
        const [atividades, feed] = await Promise.all([
            fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' })
                .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
                .catch(e => { console.error('⚠️ Não consegui buscar atividades da oficina:', e); return null; }),
            window.carregarFeedNotificacoes(),
        ]);

        // 🐛 CORREÇÃO: `feed` também pode vir `null` agora (falha do
        // servidor) — antes disso, NOTIF_FEED_CACHE virava `[]` numa
        // falha, e como esse cache alimenta a contagem de notificações
        // por área E o cálculo do resumo do topo, um 500 no meio do
        // caminho fazia tudo parecer "zero notificação" em vez de "não
        // consegui verificar". Mantém o último feed bom em cache em vez
        // de apagar com uma falha.
        if (Array.isArray(feed)) NOTIF_FEED_CACHE = feed;
        NOTIF_ATIVIDADES_CACHE = Array.isArray(atividades) ? atividades : [];
        // 🐛 CORREÇÃO (severidade saindo sempre "Normal"/"Novo" na lista de
        // notificações): severidadeNotificacaoItem() reaproveita
        // calcularStatusArea(), que lê de OFICINA_ATIVIDADES_CACHE — uma
        // variável de módulo DIFERENTE, preenchida só pela Central de
        // Áreas (window.carregarOficina). Quem entra direto na Central de
        // Notificações sem nunca ter aberto a Central de Áreas nessa
        // sessão via essa variável vazia, e toda área calculava "Normal"
        // mesmo tendo pendência/atrasada de verdade. Os dois caches vêm
        // do MESMO endpoint (/api/oficina/atividades) — sincroniza aqui
        // também, só quando a busca deu certo (não sobrescreve o cache
        // bom da Central de Áreas com [] numa falha de rede só desta
        // busca).
        if (Array.isArray(atividades)) OFICINA_ATIVIDADES_CACHE = atividades;
        NOTIF_ULTIMO_FETCH_FALHOU = !Array.isArray(atividades) || !Array.isArray(feed);
        renderizarNotificacoesFlat(Array.isArray(feed) ? feed : null);
        // 🐛 CORREÇÃO: mantém o sino da barra lateral em dia sempre que a
        // Central busca o feed (reaproveita o que já veio, sem outro
        // fetch) — antes só o timer global de 2 min mexia nele, então
        // marcar tudo como lido aqui dentro deixava o número errado
        // piscando lá fora por um tempo.
        if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas(Array.isArray(feed) ? feed : null);
        // Se a pessoa já estiver dentro do detalhe de uma área, atualiza
        // ele também — sem isso, o polling de 30s só atualizaria a grade
        // por trás, e a lista de itens ficaria parada até voltar/entrar
        // de novo.
        if (NOTIF_AREA_SELECIONADA) renderizarDetalheAreaNotificacao(NOTIF_AREA_SELECIONADA);

        const marcador = document.getElementById('notificacoes-ultima-atualizacao');
        if (marcador) marcador.innerText = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
    } catch (e) {
        console.error('⚠️ Erro ao carregar a Central de Notificações:', e);
    } finally {
        window.iniciarPollingCentralNotificacoes();
    }
};

window.irParaAreaOficinaViaNotificacao = function(chave, atividadeId) {
    // 🔧 REVERTIDO ("essa tela [o painel resumo] não é a que funciona de
    // vdd, vc tirou"): a correção anterior mandava notificação de área
    // administrativa (Logística etc.) pro painel resumo (abaDestino) —
    // mas esse painel é só leitura (KPIs + lista), SEM os botões
    // Iniciar/Recusar/Concluir. Quem clica numa notificação de
    // atividade quer AGIR nela, e isso só existe no quadro genérico
    // (window.abrirAreaOficina) — que é pra onde esta função sempre
    // mandou. Volta a ir direto pro quadro pra todo mundo, sem
    // distinguir tipo de área.
    window.abrirAba(null, 'aba-oficina');
    document.getElementById('nav-oficina')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    if (typeof window.abrirAreaOficina === 'function') window.abrirAreaOficina(chave);
    // 🆕 Notificação de status/criação/edição (ver abrirItemNotificacao)
    // não abre mais a Conversa — cai aqui, no quadro da área. Sem
    // atividadeId não tem card pra destacar (ex: notificação de
    // exclusão, a atividade já não existe mais).
    if (atividadeId) window.destacarAtividadeNoQuadro(atividadeId);
};

// 🆕 Rola até o card da atividade e pisca a borda dele por alguns
// segundos — dá o mesmo efeito de "chegar direto na atividade" que uma
// tela de detalhe dedicada daria, sem precisar criar uma view nova só
// pra isso. abrirAreaOficina() busca a lista de forma assíncrona, então
// espera o card aparecer no DOM (tenta por até ~3s) antes de desistir.
window.destacarAtividadeNoQuadro = function(atividadeId, tentativas) {
    tentativas = tentativas || 0;
    const card = document.getElementById(`atividade-card-${atividadeId}`);
    if (!card) {
        if (tentativas < 15) setTimeout(() => window.destacarAtividadeNoQuadro(atividadeId, tentativas + 1), 200);
        return;
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('atividade-card-destacada');
    setTimeout(() => card.classList.remove('atividade-card-destacada'), 2600);
};

// 🔧 CORREÇÃO (aba "Registro de Ocorrência" removida — redundante com
// "Criar Atividade" na Central de Áreas): notificações do tipo 'evento'
// (Intervenção/Melhoria/Comentário/Atividade Pendente antigas, ainda no
// banco) clicavam aqui pra abrir aquela aba e filtrar pela peça. Como a
// tela não existe mais, mas o mesmo evento sempre foi gravado com
// peca_id (e /api/historico_eventos lê por peca_id sem filtrar
// categoria), o destino equivalente — e mais completo — é abrir direto
// o Prontuário da peça, que já mostra essa mesma linha do tempo.
window.irParaOcorrenciaEspecifica = function(pecaId) {
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    if (pecaId && typeof abrirHistoricoIndividual === 'function' && BANCO_ATIVOS.find(a => a.id === pecaId)) {
        abrirHistoricoIndividual(pecaId);
    } else {
        alert('Esse registro é de um equipamento que não está mais cadastrado. Veja a Auditoria Global pra conferir o histórico completo.');
    }
};

// Mesma ideia pra OS — filtra pelo número (ou, se a OS não tiver
// número, por um trecho da descrição) assim que a lista carregar.
window.irParaOsEspecifica = async function(termoBusca) {
    window.abrirAba(null, 'aba-ordens-servico');
    document.getElementById('nav-ordens-servico')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    window.popularCheckboxAreasOs();
    await window.carregarListaOrdensServico();
    const input = document.getElementById('os-busca');
    if (input) input.value = termoBusca || '';
    if (typeof window.buscarOrdensServico === 'function') window.buscarOrdensServico(termoBusca || '');
};

// Mesma ideia pra Achado de Qualidade — a lista de Qualidade é por
// equipamento (não por achado individual), então filtra pela peça do
// registro que tem o achado; a pessoa acha ele dentro do card.
window.irParaAchadoEspecifico = async function(pecaId) {
    window.abrirAba(null, 'aba-qualidade');
    document.getElementById('nav-qualidade')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    await window.carregarListaQualidade();
    const input = document.getElementById('qualidade-busca');
    if (input) input.value = pecaId || '';
    if (typeof window.buscarQualidade === 'function') window.buscarQualidade(pecaId || '');
};

// ==============================================================
// 🆕 LISTA ÚNICA DE NOTIFICAÇÕES (referência mandada pelo usuário) —
// substitui o modelo "grade de área -> clica -> detalhe" por um feed
// só, com todas as notificações de todas as áreas juntas, abas de
// filtro por contagem, busca, ordenação e uma coluna lateral de
// contexto (resumo, atalhos, dica). As funções antigas de
// grade/detalhe por área continuam no arquivo (não removidas), só não
// são mais chamadas — os ids de elemento delas não existem mais no
// HTML, então ficam inertes.
// ==============================================================
let NOTIF_FLAT_FILTRO = 'todas'; // 'todas' | 'criticas' | 'atencao' | 'nao-vistas'
let NOTIF_FLAT_BUSCA = '';
let NOTIF_FLAT_ORDEM = 'recentes'; // 'recentes' | 'nao-lidas' | 'severidade'

// Severidade de UM item de notificação: reaproveita o status calculado
// da ÁREA dele (mesmo cálculo que já colore os cards da Central de
// Áreas) — não é um dado novo por notificação, é herdado da área.
// "Novo" (azul) só aparece quando a área está Normal mas o item ainda
// não foi visto; áreas Crítico/Atenção mantêm a cor delas mesmo lidas,
// porque a urgência é da área, não de ter sido vista ou não.
function severidadeNotificacaoItem(item) {
    const areaStatus = item.area ? window.calcularStatusArea(item.area) : null;
    if (areaStatus && areaStatus.label === 'Crítico') return { label: 'Crítico', cor: 'var(--danger)', emoji: '🔴' };
    if (areaStatus && (areaStatus.label === 'Restrição' || areaStatus.label === 'Atenção')) return { label: 'Atenção', cor: 'var(--warning)', emoji: '🟡' };
    if (!item.lida) return { label: 'Novo', cor: 'var(--text-accent)', emoji: '🔵' };
    return { label: 'Normal', cor: 'var(--success)', emoji: '🟢' };
}

window.buscarFeedNotificacoesFlat = function(valor) {
    NOTIF_FLAT_BUSCA = (valor || '').toLowerCase().trim();
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.ordenarFeedNotificacoesFlat = function(valor) {
    NOTIF_FLAT_ORDEM = valor;
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.filtrarFeedNotificacoesFlat = function(filtro) {
    NOTIF_FLAT_FILTRO = filtro;
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.limparFiltrosNotificacoesFlat = function() {
    NOTIF_FLAT_FILTRO = 'todas';
    NOTIF_FLAT_BUSCA = '';
    NOTIF_FLAT_ORDEM = 'area';
    const busca = document.getElementById('notificacoes-busca-flat');
    if (busca) busca.value = '';
    const ordenar = document.getElementById('notificacoes-ordenar');
    if (ordenar) ordenar.value = 'area';
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

// 🆕 "Limpar" na Central de Notificações: o usuário esperava que isso
// LIMPASSE as notificações (marcasse tudo como visto), não só resetasse
// o filtro/busca — antes o botão só fazia a segunda coisa, então na
// prática parecia "não funcionar" (a lista continuava do mesmo jeito).
// Agora marca todas como lidas (mesmo endpoint usado item a item) e
// também reseta o filtro/busca, num botão só.
window.limparTudoNotificacoesFlat = async function(event) {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) {
        window.limparFiltrosNotificacoesFlat();
        return;
    }

    const restritoAPropriaArea = operadorTecnicoComArea();
    const base = restritoAPropriaArea
        ? NOTIF_FEED_CACHE.filter(item => item.area === OPERADOR_LOGADO.area)
        : NOTIF_FEED_CACHE;
    const naoLidas = base.filter(item => !item.lida);

    const botao = event ? event.currentTarget : null;
    const htmlOriginal = botao ? botao.innerHTML : null;
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Limpando...'; }

    try {
        if (naoLidas.length > 0) {
            const apiBase = await resolverApiBase();
            await Promise.all(naoLidas.map(item => fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: item.tipo, evento_id: String(item.evento_id), matricula: OPERADOR_LOGADO.matricula })
            })));
        }
    } catch (e) {
        console.error('⚠️ Erro ao limpar notificações:', e);
    } finally {
        if (botao) { botao.disabled = false; botao.innerHTML = htmlOriginal; }
        window.limparFiltrosNotificacoesFlat();
        if (typeof window.carregarCentralNotificacoes === 'function') window.carregarCentralNotificacoes();
    }
};

function renderizarNotificacoesFlat(feedBruto) {
    const container = document.getElementById('notificacoes-feed-flat');
    if (!container) return;

    if (feedBruto === null) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0; color:var(--warning);">⚠️ Não foi possível verificar as notificações agora. Toque em "Atualizar" pra tentar de novo.</div>`;
        return;
    }

    const restritoAPropriaArea = operadorTecnicoComArea();
    let itens = (restritoAPropriaArea
        ? feedBruto.filter(item => item.area === OPERADOR_LOGADO.area)
        : feedBruto
    ).map(item => ({ item, sev: severidadeNotificacaoItem(item) }));

    // Pills do topo + abas de filtro sempre refletem TODAS as
    // notificações (antes do filtro de busca/aba atual) — mesmo
    // princípio já usado no resumo da Central de Áreas: filtrar pra
    // focar não devia esconder a contagem real lá em cima.
    const totalGeral = itens.length;
    const criticasGeral = itens.filter(x => x.sev.label === 'Crítico').length;
    const atencaoGeral = itens.filter(x => x.sev.label === 'Atenção').length;
    const naoVistasGeral = itens.filter(x => !x.item.lida).length;

    const resumoTopo = document.getElementById('notificacoes-resumo-topo');
    if (resumoTopo) {
        resumoTopo.innerHTML = `
            <div class="notif-pill-resumo" style="--pill-cor:var(--danger);"><i class="fas fa-triangle-exclamation"></i><div><strong>${criticasGeral}</strong><span>Crítica${criticasGeral === 1 ? '' : 's'}</span></div></div>
            <div class="notif-pill-resumo" style="--pill-cor:var(--warning);"><i class="fas fa-circle-exclamation"></i><div><strong>${atencaoGeral}</strong><span>Atenção</span></div></div>
            <div class="notif-pill-resumo" style="--pill-cor:var(--text-accent);"><i class="fas fa-bell"></i><div><strong>${naoVistasGeral}</strong><span>Não vistas</span></div></div>
        `;
    }

    const abas = document.getElementById('notificacoes-abas-filtro');
    if (abas) {
        const btn = (valor, label, qtd) => `<button class="btn-filter-mcc ${NOTIF_FLAT_FILTRO === valor ? 'active' : ''}" onclick="window.filtrarFeedNotificacoesFlat('${valor}')">${label} (${qtd})</button>`;
        abas.innerHTML = btn('todas', 'Todas', totalGeral) + btn('criticas', '🔴 Críticas', criticasGeral) + btn('atencao', '🟡 Atenção', atencaoGeral) + btn('nao-vistas', '🔵 Não vistas', naoVistasGeral);
    }

    // Donut de resumo (mesmo padrão conic-gradient já usado em outros
    // donuts do sistema, ex: painel-donut-anel no Painel Geral).
    const donut = document.getElementById('notificacoes-resumo-donut');
    if (donut) {
        const normaisGeral = Math.max(0, totalGeral - criticasGeral - atencaoGeral);
        if (totalGeral === 0) {
            donut.innerHTML = `<div class="text-muted" style="text-align:center; padding:10px 0; font-size:12px;">Sem notificações.</div>`;
        } else {
            const pctCrit = (criticasGeral / totalGeral) * 100;
            const pctAtn = (atencaoGeral / totalGeral) * 100;
            donut.innerHTML = `
                <div style="display:flex; align-items:center; gap:16px;">
                    <div class="painel-donut-anel" style="background:conic-gradient(var(--danger) 0% ${pctCrit}%, var(--warning) ${pctCrit}% ${pctCrit + pctAtn}%, var(--success) ${pctCrit + pctAtn}% 100%); width:84px; height:84px; flex-shrink:0;">
                        <div class="painel-donut-centro" style="inset:12px;"><strong style="font-size:1rem;">${totalGeral}</strong><span>Total</span></div>
                    </div>
                    <div class="painel-donut-legenda" style="flex:1;">
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--danger);"></span>Críticas</span><strong>${criticasGeral} (${Math.round(pctCrit)}%)</strong></div>
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--warning);"></span>Atenção</span><strong>${atencaoGeral} (${Math.round(pctAtn)}%)</strong></div>
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--text-accent);"></span>Não vistas</span><strong>${naoVistasGeral}</strong></div>
                    </div>
                </div>
            `;
        }
    }

    const rapidos = document.getElementById('notificacoes-filtros-rapidos');
    if (rapidos && !restritoAPropriaArea) {
        rapidos.innerHTML = `
            <button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('criticas')"><i class="fas fa-triangle-exclamation" style="color:var(--danger);"></i> Apenas críticas <i class="fas fa-chevron-right"></i></button>
            <button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('nao-vistas')"><i class="fas fa-bell" style="color:var(--text-accent);"></i> Apenas não vistas <i class="fas fa-chevron-right"></i></button>
        `;
    } else if (rapidos) {
        rapidos.innerHTML = `<button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('nao-vistas')"><i class="fas fa-bell" style="color:var(--text-accent);"></i> Apenas não vistas <i class="fas fa-chevron-right"></i></button>`;
    }

    // Filtro de aba + busca (área, referência, descrição).
    if (NOTIF_FLAT_FILTRO === 'criticas') itens = itens.filter(x => x.sev.label === 'Crítico');
    else if (NOTIF_FLAT_FILTRO === 'atencao') itens = itens.filter(x => x.sev.label === 'Atenção');
    else if (NOTIF_FLAT_FILTRO === 'nao-vistas') itens = itens.filter(x => !x.item.lida);

    if (NOTIF_FLAT_BUSCA) {
        itens = itens.filter(({ item }) => {
            const alvo = `${nomeAreaOficina(item.area) || ''} ${item.referencia || ''} ${item.descricao || ''}`.toLowerCase();
            return alvo.includes(NOTIF_FLAT_BUSCA);
        });
    }

    if (NOTIF_FLAT_ORDEM === 'nao-lidas') {
        itens.sort((a, b) => (a.item.lida === b.item.lida) ? 0 : (a.item.lida ? 1 : -1));
    } else if (NOTIF_FLAT_ORDEM === 'severidade') {
        const ORDEM = { 'Crítico': 0, 'Atenção': 1, 'Novo': 2, 'Normal': 3 };
        itens.sort((a, b) => ORDEM[a.sev.label] - ORDEM[b.sev.label]);
    }
    // 'recentes' é a ordem que o feed já vem do backend (mais novo primeiro).

    if (itens.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;"><i class="fas fa-magnifying-glass"></i> Nenhuma notificação encontrada com esse filtro/busca.</div>`;
        return;
    }

    container.innerHTML = itens.map(({ item, sev }) => {
        const referencia = item.referencia;
        return `
        <div class="notificacoes-item" style="--item-cor:${sev.cor}; ${!item.lida ? 'background:color-mix(in srgb, var(--text-accent) 5%, var(--bg-card));' : ''}"
             onclick="window.abrirItemNotificacao('${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}', '${escapeAtributoNotif(referencia)}', '${escapeAtributoNotif(item.area)}', ${item.atividade_id != null ? Number(item.atividade_id) : 'null'}, '${escapeAtributoNotif(item.tipo_evento || 'status')}')">
            <span class="notificacoes-item-dot ${!item.lida ? 'nao-lida' : ''}" title="${!item.lida ? 'Não vista' : 'Vista'}"></span>
            <div class="notificacoes-item-icone" style="color:${sev.cor}; background:color-mix(in srgb, ${sev.cor} 15%, transparent);">${ICONE_POR_TIPO_NOTIFICACAO[item.tipo] || '📋'}</div>
            <div class="notificacoes-item-corpo">
                <div class="notificacoes-item-topo">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${escapeHtmlNotif(referencia) || '-'}</span>
                    <span class="notif-linha-status" style="color:${sev.cor}; background:color-mix(in srgb, ${sev.cor} 15%, transparent);">${sev.emoji} ${sev.label}</span>
                </div>
                <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(item.descricao))}</div>
                <div class="notif-item-meta">
                    ${item.area ? `<span>Área: ${escapeHtmlNotif(nomeAreaOficina(item.area))}</span>` : ''}
                    <span>${escapeHtmlNotif(item.data_hora)}</span>
                </div>
            </div>
            ${!item.lida ? `
            <button type="button" class="notificacoes-item-marcar-lida" title="Marcar como vista"
                    onclick="window.marcarNotificacaoLidaRapido(event, '${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}')">
                <i class="fas fa-check"></i>
            </button>
            ` : ''}
        </div>
        `;
    }).join('');
}

// 🆕 Grade única com TODAS as áreas (oficina + administrativo + estoque
// de Rolos/Hidráulica) — mesmo modelo de navegação da Central de Áreas.
// Cada card mostra status (quando é área de reparo, com atividades) e
// quantas notificações tem (total/não lidas); clicar abre o detalhe só
// daquela área (ver abrirDetalheAreaNotificacao). Substitui a antiga
// lista "Atividade Recente" com tudo misturado.
// 🗑️ NÃO É MAIS CHAMADA (ver renderizarNotificacoesFlat acima) — os ids
// de elemento que ela procura não existem mais no HTML, então fica
// inerte. Mantida sem remover pra não perder a lógica de agrupamento
// por área caso precise voltar a esse modelo.
function renderizarGradeNotificacoes(atividades, feed) {
    const container = document.getElementById('notificacoes-grade-container');
    if (!container) return;

    // `null` = a busca no servidor falhou (ver carregarCentralNotificacoes)
    // — bem diferente de "busquei certinho e não tem nenhuma área crítica".
    // Mostrar isso como erro em vez de "tudo certo" evita o susto de achar
    // que perdeu dado que nunca chegou a sumir de verdade. Vale tanto pra
    // atividades quanto pro feed (🐛 CORREÇÃO: feed === null nunca foi
    // tratado aqui — um feed que falhou renderizava normal com 0
    // notificação em toda área, escondendo justamente o que a pessoa
    // mais precisava ver numa instabilidade do servidor).
    if (atividades === null || feed === null) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0; color:var(--warning);">⚠️ Não foi possível verificar as áreas agora (falha ao consultar o servidor). Toque em "Atualizar" pra tentar de novo.</div>`;
        const resumoErro = document.getElementById('notificacoes-resumo');
        if (resumoErro) resumoErro.innerHTML = '';
        return;
    }

    const contagemPorArea = new Map(); // chave (ou '__sem_area__') -> {total, naoLidas, ultimoTs}
    for (const item of feed) {
        const chave = item.area || '__sem_area__';
        if (!contagemPorArea.has(chave)) contagemPorArea.set(chave, { total: 0, naoLidas: 0, ultimoTs: 0 });
        const c = contagemPorArea.get(chave);
        c.total++;
        if (!item.lida) c.naoLidas++;
        // 🆕 Guarda o horário da notificação mais recente da área — é isso
        // que decide a ordem agora (chegou novidade, sobe na lista), não
        // mais uma categoria fixa de severidade.
        const ts = item.data_hora ? new Date(item.data_hora.replace(' ', 'T')).getTime() : 0;
        if (ts > c.ultimoTs) c.ultimoTs = ts;
    }

    // 🆕 Técnico comum só vê a própria área — ADM/Supervisor continuam
    // vendo a Oficina inteira, sem mudança nenhuma pra eles.
    const restritoAPropriaArea = operadorTecnicoComArea();
    const titulo = document.getElementById('notificacoes-grade-titulo');
    const toolbar = document.getElementById('notificacoes-grade-toolbar');
    if (titulo) titulo.innerHTML = restritoAPropriaArea
        ? '<i class="fas fa-bell"></i> Minhas Notificações'
        : '<i class="fas fa-industry"></i> Áreas';
    if (toolbar) toolbar.classList.toggle('hidden', restritoAPropriaArea);

    const todasAreas = restritoAPropriaArea
        ? [...AREAS_OFICINA, ...AREAS_NOTIFICACAO_EXTRAS].filter(a => a.chave === OPERADOR_LOGADO.area)
        : [
            ...AREAS_OFICINA.filter(a => a.tipo === 'oficina' || a.tipo === 'administrativo'),
            ...AREAS_NOTIFICACAO_EXTRAS,
        ];

    const PESO_STATUS = { 'Crítico': 0, 'Restrição': 1, 'Atenção': 2, 'Novo': 3, 'Normal': 4, 'Sem novidade': 5 };

    const cards = todasAreas.map(a => {
        // 🐛 CORREÇÃO: sem excluir "ainda não começou" aqui, uma atividade
        // com data de início futura contava como Pendente/em aberto no
        // card (podendo acender Atenção/Restrição), mas o detalhe (ver
        // renderizarDetalheAreaNotificacao) já excluía ela de propósito
        // — reproduzindo o mesmo bug já corrigido antes (card avisa,
        // detalhe abre vazio), só que pra esse caso específico.
        // 🆕 Item 5: conta também atividades PEDIDAS por essa área mesmo
        // sendo executadas por outra (solicitante_area) — senão o card
        // de quem pediu nunca acendia "Atenção"/"Novo" pra algo que só
        // aparece pra ele no quadro (ver renderizarAtividadesArea).
        const doArea = atividades.filter(x => (x.area === a.chave || x.solicitante_area === a.chave) && !atividadeAindaNaoComecou(x));
        const pendentes = doArea.filter(x => x.status === 'Pendente').length;
        const andamento = doArea.filter(x => x.status === 'Em Andamento').length;
        const atrasadas = doArea.filter(x => atividadeEstaAtrasada(x)).length;
        const emAberto = pendentes + andamento;
        const contagem = contagemPorArea.get(a.chave) || { total: 0, naoLidas: 0, ultimoTs: 0 };

        let status;
        if (atrasadas > 0) status = { emoji: '🔴', label: 'Crítico', cor: 'var(--danger)' };
        else if (emAberto >= 5) status = { emoji: '🟠', label: 'Restrição', cor: 'var(--limit)' };
        else if (emAberto >= 1) status = { emoji: '🟡', label: 'Atenção', cor: 'var(--warning)' };
        else if (contagem.naoLidas > 0) status = { emoji: '🔵', label: 'Novo', cor: 'var(--text-accent)' };
        else status = { emoji: '🟢', label: 'Normal', cor: 'var(--success)' };

        return { area: a, status, contagem };
    });

    // "Outros" — item sem área nenhuma (achado, ou ocorrência/OS sem a
    // área escolhida no formulário). Só entra na grade se tiver alguma
    // notificação; sempre por último. Técnico restrito à própria área
    // não vê isso — "Outros" é ruído de fora da área dele.
    const semArea = !restritoAPropriaArea && contagemPorArea.get('__sem_area__');
    if (semArea && semArea.total > 0) {
        cards.push({
            area: { chave: '__sem_area__', nome: 'Outros', icone: 'fa-ellipsis', cor: '#8a97ab' },
            status: semArea.naoLidas > 0 ? { emoji: '🔵', label: 'Novo', cor: 'var(--text-accent)' } : { emoji: '⚪', label: 'Sem novidade', cor: 'var(--text-muted)' },
            contagem: semArea,
        });
    }

    // 🆕 Ordem por atividade recente, não por categoria fixa: quem tem
    // notificação não lida vem primeiro (mais não lidas primeiro), e
    // dentro disso quem recebeu algo mais recentemente. Sem novidade
    // nenhuma, cai pro final na ordem que já tinha (cadastro das áreas).
    cards.sort((x, y) => {
        const naoLidasDiff = y.contagem.naoLidas - x.contagem.naoLidas;
        if (naoLidasDiff !== 0) return naoLidasDiff;
        return (y.contagem.ultimoTs || 0) - (x.contagem.ultimoTs || 0);
    });

    // 🆕 Resumo sempre reflete TODAS as áreas (mesmo com busca/filtro
    // ativos na grade) — senão o gerente filtra "Crítico" pra focar e o
    // resumo no topo muda de número junto, o que confunde mais do que
    // ajuda.
    atualizarResumoNotificacoes(cards);

    let visiveis = cards;
    if (NOTIF_GRADE_BUSCA) visiveis = visiveis.filter(({ area: a }) => a.nome.toLowerCase().includes(NOTIF_GRADE_BUSCA));
    if (NOTIF_GRADE_FILTRO_STATUS) visiveis = visiveis.filter(({ status: s }) => s.label === NOTIF_GRADE_FILTRO_STATUS);

    if (visiveis.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;"><i class="fas fa-magnifying-glass"></i> Nenhuma área encontrada com esse filtro/busca.</div>`;
        return;
    }

    // 🆕 Lista única ordenada por novidade (sem seção fixa de Crítico/
    // Restrição/Atenção) — chegou notificação, a área sobe. O status
    // continua visível, só que como etiqueta discreta na linha, não como
    // divisor que reordena tudo de novo.
    // 🔧 CORREÇÃO ("muito simples", print real): o quadrado do ícone era
    // cinza apagado (var(--text-muted), 14px) sobre um fundo quase
    // idêntico ao card — na prática ilegível/invisível numa tela real,
    // por isso toda a lista parecia "vazia"/genérica. Cada área já tem
    // sua PRÓPRIA cor cadastrada (a.cor, usada em Central de Áreas) que
    // não estava sendo aproveitada aqui — virou o fundo/ícone do chip,
    // igual ao padrão de ícone colorido já usado nos KPIs. Isso NÃO é a
    // mesma coisa que "cor de identidade fixa por item" (a regra que
    // proíbe amarelo repetido): aqui são cores DIFERENTES por área
    // (várias cores, não uma só reaproveitada em todo item), só pra dar
    // variedade visual de lista — a gravidade real continua exclusivamente
    // na etiqueta de status (s.cor), sem mudar.
    const linhasHtml = visiveis.map(({ area: a, status: s, contagem }) => `
        <div class="notif-linha" style="--sev-color:${s.cor};" onclick="window.abrirDetalheAreaNotificacao('${a.chave}')">
            <div class="notif-linha-icone" style="background:color-mix(in srgb, ${a.cor || 'var(--text-muted)'} 18%, transparent); color:${a.cor || 'var(--text-muted)'};"><i class="fas ${a.icone}"></i></div>
            <div class="notif-linha-corpo">
                <div class="notif-linha-titulo">
                    ${a.nome}
                    ${contagem.naoLidas > 0 ? `<span class="notif-ponto-novo" title="Tem novidade não vista"></span>` : ''}
                    <span class="notif-linha-status" style="color:${s.cor};">${s.emoji} ${s.label}</span>
                </div>
                <div class="notif-linha-meta">
                    <i class="fas fa-bell"></i> ${contagem.total} notificaç${contagem.total === 1 ? 'ão' : 'ões'}
                    ${contagem.naoLidas > 0 ? `<span class="notif-nao-lidas">${contagem.naoLidas} não lida${contagem.naoLidas > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <i class="fas fa-chevron-right notif-linha-seta"></i>
        </div>
    `).join('');

    container.innerHTML = `<div class="notif-lista">${linhasHtml}</div>`;
}

window.buscarGradeNotificacoes = function(valor) {
    NOTIF_GRADE_BUSCA = (valor || '').toLowerCase().trim();
    renderizarGradeNotificacoes(NOTIF_ULTIMO_FETCH_FALHOU ? null : NOTIF_ATIVIDADES_CACHE, NOTIF_FEED_CACHE);
};

window.filtrarGradeNotificacoes = function(statusLabel, botao) {
    NOTIF_GRADE_FILTRO_STATUS = statusLabel;
    document.querySelectorAll('#notificacoes-grade-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botao) botao.classList.add('active');
    renderizarGradeNotificacoes(NOTIF_ULTIMO_FETCH_FALHOU ? null : NOTIF_ATIVIDADES_CACHE, NOTIF_FEED_CACHE);
};

// Resumo no topo — visão de supervisor/ADM sem contar card por card:
// quantas áreas em cada status, e total de notificações não vistas (por
// qualquer matrícula ADM, já que a marcação é pessoal). Sempre calculado
// com TODOS os cards, mesmo com busca/filtro ativos na grade.
function atualizarResumoNotificacoes(cards) {
    const resumoEl = document.getElementById('notificacoes-resumo');
    if (!resumoEl) return;
    const porStatus = { 'Crítico': 0, 'Restrição': 0, 'Atenção': 0 };
    let naoLidasTotal = 0;
    for (const { status: s, contagem } of cards) {
        if (s.label in porStatus) porStatus[s.label]++;
        naoLidasTotal += contagem.naoLidas;
    }
    const pill = (emoji, label, valor, cor) => valor > 0
        ? `<span style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; background:${cor}22; color:${cor}; font-size:12px; font-weight:600;">${emoji} ${valor} ${label}</span>`
        : '';
    resumoEl.innerHTML = [
        pill('🔴', porStatus['Crítico'] === 1 ? 'área crítica' : 'áreas críticas', porStatus['Crítico'], 'var(--danger)'),
        pill('🟠', 'em restrição', porStatus['Restrição'], 'var(--limit)'),
        pill('🟡', 'em atenção', porStatus['Atenção'], 'var(--warning)'),
        pill('🔵', naoLidasTotal === 1 ? 'notificação não vista' : 'notificações não vistas', naoLidasTotal, 'var(--text-accent)'),
    ].join('') || `<span class="text-muted" style="font-size:12px;">🟢 Tudo normal — nenhuma área precisa de atenção agora.</span>`;
}

// Abre o "detalhe" de uma área — some com a grade, mostra só as
// notificações dessa área (mesmo padrão de abrirAreaOficina/
// fecharAreaOficina já usado na Central de Áreas de verdade).
window.abrirDetalheAreaNotificacao = function(chave) {
    NOTIF_AREA_SELECIONADA = chave;
    document.getElementById('notificacoes-grade-painel')?.classList.add('hidden');
    document.getElementById('notificacoes-detalhe-painel')?.classList.remove('hidden');
    const a = AREAS_OFICINA.find(x => x.chave === chave) || AREAS_NOTIFICACAO_EXTRAS.find(x => x.chave === chave);
    const titulo = document.getElementById('notificacoes-detalhe-titulo');
    if (titulo) titulo.innerHTML = `<i class="fas ${a ? a.icone : 'fa-ellipsis'}"></i> ${chave === '__sem_area__' ? 'Outros' : (a ? a.nome : chave)}`;
    document.getElementById('notificacoes-detalhe-acessar')?.classList.toggle('hidden', chave === '__sem_area__');
    renderizarDetalheAreaNotificacao(chave);
};

window.fecharDetalheAreaNotificacao = function() {
    NOTIF_AREA_SELECIONADA = null;
    document.getElementById('notificacoes-detalhe-painel')?.classList.add('hidden');
    document.getElementById('notificacoes-grade-painel')?.classList.remove('hidden');
};

// Botão "Acessar Área" do detalhe — leva pra tela de verdade daquela
// área (Central de Áreas, painel administrativo, ou o estoque de
// Rolos/Hidráulica), não só pras notificações dela. Sem parâmetro de
// propósito: lê NOTIF_AREA_SELECIONADA direto (variável de módulo, não
// dá pra referenciar num onclick inline do HTML).
window.irParaTelaDaAreaNotificacao = function() {
    const chave = NOTIF_AREA_SELECIONADA;
    if (!chave || chave === '__sem_area__') return;
    const a = AREAS_OFICINA.find(x => x.chave === chave);
    // 🔧 CORREÇÃO ("já aceitei, já atualizou e não mudou nada" — o
    // "Acessar Área" continuava mandando pro painel resumo mesmo
    // depois da PR #136, porque aquela correção só tinha mexido no
    // clique direto numa notificação, não nesse botão aqui, que é um
    // caminho SEPARADO até a mesma área). Mesmo motivo da #136: o
    // painel resumo (abaDestino) não tem Iniciar/Recusar/Concluir —
    // só o quadro (irParaAreaOficinaViaNotificacao) tem. "Acessar
    // Área" agora manda pro quadro pra área administrativa também,
    // igual já fazia pra área de oficina normal logo abaixo.
    if ((a && a.tipo === 'administrativo') || (a && a.tipo === 'oficina')) {
        window.irParaAreaOficinaViaNotificacao(chave);
        return;
    }
    if (chave === 'rolos') {
        window.abrirAba(null, 'aba-rolos');
        document.getElementById('nav-rolos')?.classList.add('active');
        return;
    }
    if (chave === 'hidraulica-estoque') {
        window.abrirAba(null, 'aba-hidraulica');
        document.getElementById('nav-hidraulica')?.classList.add('active');
        return;
    }
    if (chave === 'qualidade') {
        window.abrirAba(null, 'aba-qualidade');
        document.getElementById('nav-qualidade')?.classList.add('active');
        return;
    }
    if (chave === 'sinotico-3d') {
        // Sinótico 3D é uma página própria (não uma aba interna) — abre
        // em nova guia, igual ao link da sidebar.
        window.open('Sinotico3d.html', '_blank');
    }
};

// Ícone por tipo de item do feed unificado — tipo='evento' cobre tanto
// Ocorrência (categoria Intervenção/Melhoria/...) quanto Auditoria geral
// (ex: rolo travado no Sinótico 3D), que antes nunca aparecia aqui.
const ICONE_POR_TIPO_NOTIFICACAO = { os: '📄', achado: '🔍', evento: '📋', estoque: '📦', sinotico: '🧊', atividade: '🧰', mensagem_area: '💬', padrao_qualidade: '🚨' };

// 🔧 CORREÇÃO ("mostra os antigos, não quero isso"): não lido aparece
// sempre (é exatamente o que a pessoa ainda não viu, não importa a
// idade); já lido só aparece se for recente — assim a lista não fica
// eternamente entulhada de coisa antiga só porque ninguém marcou como
// vista, mas também não esconde nada novo.
const DIAS_RECENCIA_NOTIFICACOES = 3;
const MAX_ITENS_NOTIFICACOES = 10;

function dataDentroDaJanelaRecente(dataHoraStr) {
    if (!dataHoraStr) return false;
    const data = new Date(String(dataHoraStr).replace(' ', 'T'));
    if (isNaN(data.getTime())) return false;
    const diffMs = Date.now() - data.getTime();
    return diffMs >= 0 && diffMs <= DIAS_RECENCIA_NOTIFICACOES * 24 * 60 * 60 * 1000;
}

// 🆕 Destino de UMA notificação de Atividade da Oficina — extraído pra
// função própria porque agora tem DOIS chamadores: o clique dentro da
// Central (abrirItemNotificacao, abaixo) e o clique numa notificação
// PUSH do sistema operacional (ver notificationclick em
// service-worker.js -> mensagem 'abrir-destino-atividade' tratada em
// processarParametrosNotificacaoPush). Mesma regra dos dois: só
// 'mensagem' abre a Conversa; 'status'/'criacao'/'edicao' abre a
// Atividade destacada no quadro da área.
window.abrirDestinoAtividadeNotificacao = function(area, atividadeId, tipoEvento) {
    if (tipoEvento === 'mensagem' && atividadeId && typeof window.abrirConversaAtividade === 'function') {
        window.abrirConversaAtividade(atividadeId);
    } else if (atividadeId) {
        window.irParaAreaOficinaViaNotificacao(area, atividadeId);
    } else {
        window.irParaAreaOficinaViaNotificacao(area);
    }
};

// Clique num item do feed: marca como lido PRA ESSA MATRÍCULA (não
// afeta o que outras pessoas já viram) e leva pra tela de onde aquilo
// veio — cada tipo tem sua própria rota.
window.abrirItemNotificacao = async function(tipo, eventoId, referencia, area, atividadeId, tipoEvento) {
    try {
        if (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula) {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, evento_id: String(eventoId), matricula: OPERADOR_LOGADO.matricula })
            });
        }
    } catch (e) {
        console.error('⚠️ Erro ao marcar notificação como lida:', e);
    }

    // 🐛 CORREÇÃO: pros tipos abaixo que navegam pra FORA da Central
    // (os/evento/achado/sinotico/estoque), carregarCentralNotificacoes()
    // nunca era chamado de novo — então o sino da barra lateral só
    // refletia essa leitura no próximo tick do timer de 2 min. Dispara
    // sem esperar (a navegação não deve travar por isso).
    if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas();

    if (tipo === 'os') {
        window.irParaOsEspecifica(referencia);
    } else if (tipo === 'evento') {
        window.irParaOcorrenciaEspecifica(referencia);
    } else if (tipo === 'atividade') {
        // 🆕 Ação numa atividade da Oficina (criar/status/editar/
        // excluir/mensagem). Desde a PR #57 TODA notificação de
        // atividade abria a "Conversa da Atividade" — mas quem clica
        // num "iniciou"/"concluiu"/"criou"/"editou" quer VER a
        // atividade (status, prazo, responsável), não abrir um chat
        // vazio. Só notificação de MENSAGEM de verdade deve abrir a
        // Conversa; o resto abre a Atividade em si.
        // 🆕 Não existe uma tela de "detalhe da atividade" separada do
        // quadro da área (só o card dentro da lista) — criar uma view
        // nova só pra isso seria over-engineering pra este ajuste.
        // Decisão: pra 'status'/'criacao'/'edicao' vai pro quadro da
        // área (irParaAreaOficinaViaNotificacao) e usa
        // destacarAtividadeNoQuadro pra rolar até o card certo e
        // piscar ele — o técnico chega direto na atividade em questão,
        // sem abrir um chat.
        window.abrirDestinoAtividadeNotificacao(area, atividadeId, tipoEvento);
    } else if (tipo === 'mensagem_area') {
        // 🆕 Mensagem do chat Área <-> ADM (ver mensagens_area_adm no
        // backend) — antes só virava push e sumia se a pessoa não visse
        // na hora; agora clicar aqui abre a conversa de verdade. ADM abre
        // direto a conversa daquela área (sem precisar estar na aba
        // Painel ADM); técnico é levado pro próprio quadro da área e a
        // conversa abre por cima.
        const éAdm = OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm;
        if (éAdm && typeof window.abrirChatAdmArea === 'function') {
            window.abrirChatAdmArea(area);
        } else if (typeof window.abrirAreaOficina === 'function') {
            window.abrirAreaOficina(area).then(() => {
                if (typeof window.abrirChatAreaAdm === 'function') window.abrirChatAreaAdm();
            });
        }
    } else if (tipo === 'achado') {
        window.irParaAchadoEspecifico(referencia);
    } else if (tipo === 'padrao_qualidade') {
        // 🆕 Padrão detectado entre achados (mesma categoria em vários
        // equipamentos diferentes) — não é um achado específico, é o
        // painel de padrões no topo da aba Qualidade que mostra isso.
        window.abrirAba(null, 'aba-qualidade');
        document.getElementById('nav-qualidade')?.classList.add('active');
        setTimeout(() => {
            document.getElementById('qualidade-padroes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    } else if (tipo === 'sinotico') {
        window.open('Sinotico3d.html', '_blank');
    } else if (tipo === 'estoque') {
        // referencia é "ESTOQUE-ROLOS" ou "ESTOQUE-HIDRAULICA".
        if (referencia === 'ESTOQUE-ROLOS') {
            window.abrirAba(null, 'aba-rolos');
            document.getElementById('nav-rolos')?.classList.add('active');
        } else {
            window.abrirAba(null, 'aba-hidraulica');
            document.getElementById('nav-hidraulica')?.classList.add('active');
        }
    } else {
        window.carregarCentralNotificacoes();
    }
};

// 🆕 PUSH -> ROTEAMENTO: quando a notificação chega como PUSH de
// verdade do sistema operacional (fora do app, barra de notificações
// do celular) e o usuário TOCA nela, quem trata o clique é o Service
// Worker (notificationclick em service-worker.js) — ele roda num
// contexto separado e não enxerga essas funções direto. Em vez de
// duplicar a lógica de "pra onde vai", o SW só repassa os dados
// (tipo_evento/atividade_id/area, que agora vêm no payload do push —
// ver dados_extra no backend) e a gente reaproveita o MESMO destino já
// usado pelo clique dentro da Central (abrirDestinoAtividadeNotificacao,
// acima). Dois jeitos do SW entregar isso, tratados aqui:
//   - Janela NOVA (app fechado): o SW abre a URL com querystring
//     (?abrir_atividade=ID&area=X&tipo_evento=Y) — lida no
//     DOMContentLoaded abaixo.
//   - Janela JÁ ABERTA: o SW usa postMessage (focar não recarrega a
//     página, então não dava pra usar querystring) — ouvido logo abaixo.
function processarDestinoNotificacaoPush(dados) {
    if (!dados) return;
    const atividadeId = dados.atividade_id != null && dados.atividade_id !== '' ? Number(dados.atividade_id) : null;
    const area = dados.area || null;
    const tipoEvento = dados.tipo_evento || 'status';
    if (!atividadeId && !area) return;
    // Espera o app estar logado e com a tela principal pronta antes de
    // navegar — se o toque na notificação abriu o app do zero, o login
    // e o carregamento inicial ainda podem estar em andamento.
    const tentar = (restantes) => {
        if (OPERADOR_LOGADO && typeof window.abrirDestinoAtividadeNotificacao === 'function' && typeof window.abrirAba === 'function') {
            window.abrirDestinoAtividadeNotificacao(area, atividadeId, tipoEvento);
        } else if (restantes > 0) {
            setTimeout(() => tentar(restantes - 1), 300);
        }
        // Sem OPERADOR_LOGADO depois de ~6s: usuário provavelmente caiu
        // na tela de login — não dá pra rotear sem ele decidir entrar,
        // desiste silenciosamente (a notificação continua na Central).
    };
    tentar(20);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const idConversa = params.get('abrir_conversa_atividade');
        const idAtividade = params.get('abrir_atividade');
        if (idConversa || idAtividade) {
            processarDestinoNotificacaoPush({
                atividade_id: idConversa || idAtividade,
                area: params.get('area'),
                tipo_evento: idConversa ? 'mensagem' : (params.get('tipo_evento') || 'status')
            });
            // Limpa a querystring pra um refresh depois não reabrir a
            // mesma atividade de novo sozinho.
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
    } catch (e) {
        console.warn('⚠️ Erro ao processar parâmetros de notificação push:', e);
    }
});

if (window.navigator && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.tipo === 'abrir-destino-atividade') {
            processarDestinoNotificacaoPush(event.data);
        }
    });
}

// 🆕 Marca de uma vez todas as notificações não lidas da área aberta —
// só pra essa matrícula (a marcação sempre foi individual, ver
// /api/notificacoes/marcar_lido). Não mexe nas atividades em aberto
// (aquilo se resolve na área de verdade, não aqui).
window.marcarTodasLidasDaArea = async function() {
    const chave = NOTIF_AREA_SELECIONADA;
    if (!chave || !OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;

    const naoLidas = NOTIF_FEED_CACHE.filter(item =>
        (chave === '__sem_area__' ? !item.area : item.area === chave) && !item.lida
    );
    if (naoLidas.length === 0) return;

    const botao = document.getElementById('notificacoes-detalhe-marcar-todas');
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marcando...'; }

    try {
        const apiBase = await resolverApiBase();
        await Promise.all(naoLidas.map(item => fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: item.tipo, evento_id: String(item.evento_id), matricula: OPERADOR_LOGADO.matricula })
        })));
    } catch (e) {
        console.error('⚠️ Erro ao marcar todas como lidas:', e);
    } finally {
        if (botao) { botao.disabled = false; botao.innerHTML = '<i class="fas fa-check-double"></i> Marcar todas como lidas'; }
        window.carregarCentralNotificacoes();
    }
};

// 🆕 Proposta A (Central de Notificações — "está horrível"): antes só
// dava pra marcar como lida abrindo o item (que também navega pra
// fora da Central) ou marcando TODAS de uma área de uma vez. Essa aqui
// marca só UM item, sem sair da lista — o botão fica dentro da linha,
// visível só quando a notificação está não lida (ver renderItemNotificacao).
// event.stopPropagation() é essencial: a linha inteira (.notificacoes-item)
// já tem onclick pra abrir/navegar — sem isso, clicar no botão também
// dispararia a navegação por cima.
window.marcarNotificacaoLidaRapido = async function(event, tipo, eventoId) {
    event.stopPropagation();
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;

    const botao = event.currentTarget;
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, evento_id: String(eventoId), matricula: OPERADOR_LOGADO.matricula })
        });
    } catch (e) {
        console.error('⚠️ Erro ao marcar notificação como lida:', e);
    } finally {
        window.carregarCentralNotificacoes();
    }
};

// 🆕 Detalhe de UMA área — chamado ao clicar num card da grade (ou de
// novo pelo polling, se a pessoa já estiver dentro do detalhe). Não
// agrupa mais por área (já é uma área só aqui); a separação por área
// agora é a própria navegação da grade -> detalhe.
function renderizarDetalheAreaNotificacao(chave) {
    const container = document.getElementById('notificacoes-feed-container');
    const contagemEl = document.getElementById('notificacoes-contagem-nao-lidas');
    if (!container) return;

    const itensArea = NOTIF_FEED_CACHE.filter(item => chave === '__sem_area__' ? !item.area : item.area === chave);
    const naoLidas = itensArea.filter(item => !item.lida).length;
    if (contagemEl) contagemEl.innerText = naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'tudo em dia ✅';
    document.getElementById('notificacoes-detalhe-marcar-todas')?.classList.toggle('hidden', naoLidas === 0);

    const visiveis = itensArea
        .filter(item => !item.lida || dataDentroDaJanelaRecente(item.data_hora))
        .slice(0, MAX_ITENS_NOTIFICACOES);

    // 🔧 Atividades em aberto da área (Pendente/Em Andamento) — é o que
    // realmente define o status do card na grade (Crítico/Restrição/
    // Atenção), então precisam aparecer aqui, senão o detalhe fica vazio
    // mesmo quando o card avisou que tinha algo pra ver.
    const atividadesAreaTodas = NOTIF_ATIVIDADES_CACHE
        .filter(x => (x.area === chave || x.solicitante_area === chave) && x.status !== 'Concluído' && x.status !== 'Recusado' && !atividadeAindaNaoComecou(x));
    // 🐛 CORREÇÃO: o cabeçalho mostrava o tamanho da lista já cortada em
    // MAX_ITENS_NOTIFICACOES, então uma área com, digamos, 15 atividades
    // em aberto anunciava "(10)" — a pessoa lia um número errado antes
    // de rolar a lista.
    const atividadesArea = atividadesAreaTodas.slice(0, MAX_ITENS_NOTIFICACOES);

    if (visiveis.length === 0 && atividadesArea.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">✅ Nada de novo nessa área nos últimos ${DIAS_RECENCIA_NOTIFICACOES} dias.</div>`;
        return;
    }

    const blocoAtividades = atividadesArea.length === 0 ? '' : `
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin:2px 0 8px;">
            <i class="fas fa-clipboard-list"></i> Atividades em aberto (${atividadesAreaTodas.length})
        </div>
        ${atividadesArea.map(x => renderItemAtividadeNotificacao(x, chave)).join('')}
        ${visiveis.length > 0 ? `<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin:16px 0 8px;"><i class="fas fa-bell"></i> Notificações</div>` : ''}
    `;

    container.innerHTML = blocoAtividades + visiveis.map(renderItemNotificacao).join('');
}

// 🐛 CORREÇÃO: descrição/autor/responsável/referência são texto livre
// (o operador digita), mas iam direto pro innerHTML sem escapar — um
// simples "<" ou aspas na descrição de uma Ocorrência/OS quebrava o
// cartão (ou pior, injetava HTML). escapeHtmlNotif() é pro texto
// exibido; escapeAtributoNotif() é pra valor indo dentro de um
// onclick="...('...')" — sem isso, uma aspas dupla no meio do valor
// fecha o atributo antes da hora.
function escapeHtmlNotif(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
window.escapeHtmlNotif = escapeHtmlNotif;
function escapeAtributoNotif(s) {
    return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 🔧 CORREÇÃO ("descrição da notificação enorme e cortada"): os
// marcadores [REABASTECER_RESERVA:<id>] e [FINALIZAR_INSTALACAO:<id>]
// (ver notificarLogisticaReabastecimento/iniciarSwapAlocacao) são só
// pra linkar a atividade de volta a uma peça quando a Logística
// conclui (ver processarMarcadorAtividadeConcluida) — não deveriam
// aparecer pro usuário, e deixavam a descrição bem mais comprida do
// que precisava. Limpa só na hora de EXIBIR; o texto salvo/usado pro
// parsing continua intacto.
function limparMarcadorTecnicoDescricao(descricao) {
    // 🔧 No feed de notificações o texto vem como "concluiu: [MARCADOR:id]
    // resto..." (backend monta "<ação>: <descrição original>") — o
    // marcador não fica sempre no início da string, por isso sem "^" no
    // regex.
    return (descricao || '').replace(/\[(REABASTECER_RESERVA|FINALIZAR_INSTALACAO|TRANSPORTE):[^\]]*\]\s*/, '');
}
window.limparMarcadorTecnicoDescricao = limparMarcadorTecnicoDescricao;

// Mesmo cartão visual do feed, mas pra uma atividade em aberto (não tem
// tipo/evento_id/lida — vem de /api/oficina/atividades, não do feed
// unificado). Clicar leva direto pra área de verdade, onde dá pra ver
// e agir na atividade (a Central de Notificações não edita atividade).
function renderItemAtividadeNotificacao(x, chave) {
    const atrasada = atividadeEstaAtrasada(x);
    const cor = atrasada ? 'var(--danger)' : (x.status === 'Em Andamento' ? 'var(--text-accent)' : 'var(--warning)');
    return `
    <div class="notificacoes-item" style="--item-cor:${cor};" onclick="window.irParaAreaOficinaViaNotificacao('${escapeAtributoNotif(chave)}')">
        <div class="notificacoes-item-icone" style="color:${cor};">${atrasada ? '⏰' : '🔧'}</div>
        <div class="notificacoes-item-corpo">
            <div class="notificacoes-item-topo">
                <span class="font-code" style="font-weight:700; color:var(--text-heading);">
                    ${escapeHtmlNotif(x.equipamento_id) || '-'}
                </span>
                <span style="font-size:10.5px; color:${cor};">${atrasada ? 'Atrasada' : x.status}</span>
            </div>
            <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(x.descricao))}</div>
            <div style="font-size:10.5px; color:var(--text-accent);">${escapeHtmlNotif(x.responsavel) || 'Sem responsável'}</div>
        </div>
    </div>
    `;
}

function renderItemNotificacao(item) {
    const naoLida = !item.lida;
    const icone = ICONE_POR_TIPO_NOTIFICACAO[item.tipo] || '📋';
    const cor = naoLida ? 'var(--danger)' : 'var(--border-color)';
    const referencia = item.referencia;
    // 🆕 Proposta A (Central de Notificações): o ponto de "não lida" era
    // um "●" pequeno solto no meio do texto, fácil de não notar numa
    // lista comprida — virou um indicador dedicado (.notificacoes-item-dot),
    // com o mesmo tamanho sempre (lida ou não), só a cor/preenchimento
    // muda, pra não pular o layout da linha. E o botão de marcar como
    // lida direto na linha evita ter que abrir cada item (que também
    // navega pra fora da Central) só pra limpar o "não lida".
    return `
    <div class="notificacoes-item" style="--item-cor:${cor}; ${naoLida ? 'background:color-mix(in srgb, var(--danger) 6%, var(--bg-card));' : ''}"
         onclick="window.abrirItemNotificacao('${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}', '${escapeAtributoNotif(referencia)}', '${escapeAtributoNotif(item.area)}', ${item.atividade_id != null ? Number(item.atividade_id) : 'null'}, '${escapeAtributoNotif(item.tipo_evento || 'status')}')">
        <span class="notificacoes-item-dot ${naoLida ? 'nao-lida' : ''}" title="${naoLida ? 'Não lida' : 'Lida'}"></span>
        <div class="notificacoes-item-icone" style="${naoLida ? 'color:var(--danger);' : ''}">${icone}</div>
        <div class="notificacoes-item-corpo">
            <div class="notificacoes-item-topo">
                <span class="font-code" style="font-weight:700; color:var(--text-heading);">
                    ${escapeHtmlNotif(item.referencia) || '-'}
                </span>
                <span style="font-size:10.5px; color:var(--text-muted);">${escapeHtmlNotif(item.data_hora)}</span>
            </div>
            <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(item.descricao))}</div>
            <div style="font-size:10.5px; color:var(--text-accent);">${escapeHtmlNotif(item.autor) || 'Sistema'}</div>
        </div>
        ${naoLida ? `
        <button type="button" class="notificacoes-item-marcar-lida" title="Marcar como lida"
                onclick="window.marcarNotificacaoLidaRapido(event, '${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}')">
            <i class="fas fa-check"></i>
        </button>
        ` : ''}
    </div>
    `;
}

// (Qualidade — Entrada/Saída — agora vive em Oficina/qualidade.js)
