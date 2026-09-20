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
    setOficinaEquipeAtual,
    FILTRO_CATEGORIA_AUDITORIA,
    setFiltroCategoriaAuditoria
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

// (VEIO_SELECIONADO_PAINEL, FILTRO_CRITICOS, MODO_MODAL_RELATORIO e
// ID_HISTORICO_ATUAL agora vivem em Oficina/veiosAtivos.js — só usadas ali)

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
    if (typeof window.renderReparos === 'function') window.renderReparos();
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
window.atualizarHistoricoGlobalComServidor = atualizarHistoricoGlobalComServidor;


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

// (Veios, Ativos, Reparos, Prontuário e Saque/Swap agora vivem em
// Oficina/veiosAtivos.js)
// (Cadastro de Peças, Estoque de Rolos/Hidráulica/Materiais, edição de
// células e Segmento Zero agora vivem em Oficina/estoque.js)
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
    if (idAtivo === 'aba-ativos' && typeof window.renderAtivos === 'function') window.renderAtivos();
    if (idAtivo === 'aba-reparos' && typeof window.renderReparos === 'function') window.renderReparos();
    if (idAtivo === 'aba-fluxo' && typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
    if (typeof window.atualizarKPIsAvancados === 'function') window.atualizarKPIsAvancados();
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
    if (typeof window.carregarMateriaisDoBackend === 'function') window.carregarMateriaisDoBackend();

    // 🔧 Rolos e Hidráulica agora vivem no Neon (antes só no localStorage
    // de cada colaborador). Sincroniza e já deixa a tela pronta se o
    // técnico for direto pra uma dessas abas.
    if (typeof sincronizarRolosReais === 'function') {
        await sincronizarRolosReais();
        recarregarRolosEHidraulicaLocal();
        if (typeof window.renderRolos === 'function') window.renderRolos();
    }
    if (typeof sincronizarHidraulicaReal === 'function') {
        await sincronizarHidraulicaReal();
        recarregarRolosEHidraulicaLocal();
        if (typeof window.renderHidraulica === 'function') window.renderHidraulica();
    }

    if (atualizou) {
        if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        if (typeof window.renderAtivos === 'function') window.renderAtivos();
        if (typeof window.renderReparos === 'function') window.renderReparos();
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
