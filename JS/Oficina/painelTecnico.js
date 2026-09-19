// ==========================================================================
// PAINEL DO TÉCNICO — extraído de script.js na modularização
// ==========================================================================
// Visão simplificada pro celular do técnico: atalhos do dia a dia
// (Iniciar Reparo/Em Andamento, Ativos Críticos, Intervenção Rápida,
// Relatório Diário) e os KPIs/gráficos do Painel Geral (donuts,
// ranking de veios, produção lançada) — reaproveitados também pelo
// Painel do Supervisor via window.X.

import { resolverApiBase, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, HISTORICO_ACOES, RASCUNHOS_IDS_ATIVOS } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { filtrarPorAreaTecnico } from '../Core/utils.js';
import { executarSeguro, fetchComRetry } from '../Core/utils.js';

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
                        <span style="font-size:13px; color:var(--text-body);">${window.limparMarcadorTecnicoDescricao(x.descricao)}</span>
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
window.abrirCriticos = abrirCriticos;
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

        if (typeof window.registrarHistorico === 'function') {
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
window.carregarFotosNoProntuario = carregarFotosNoProntuario;

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
    window.registrarHistorico("RELATÓRIO DIÁRIO", `📋 <strong>${nomeOperador}</strong> (${hoje}): ${texto}`);
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
window.atualizarPainelCompleto = atualizarPainelCompleto;

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
window.construirHtmlDonutRisco = construirHtmlDonutRisco;

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
window.construirHtmlDonutStatus = construirHtmlDonutStatus;

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
window.construirHtmlRankingVeios = construirHtmlRankingVeios;

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
window.buscarDadosApontamentos7dias = buscarDadosApontamentos7dias;

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
window.construirHtmlProducaoLancada = construirHtmlProducaoLancada;

// 🗑️ Removida a aba "Registro Recente" (e as funções
// renderizarFeedAtividadeRecente/renderRegistroRecenteCompleto que só
// serviam a ela) — era exatamente a mesma coisa que a Auditoria Global:
// mesma fonte (/api/historico_eventos), mesmas 2 matrículas autorizadas
// (MATRICULAS_TESTE_FOLHOES tinha o mesmo valor de MATRICULAS_AUDITORIA),
// só que mais simples (sem filtro de data/acessos, limitada a 50 linhas
// em vez de 500). Os pontos que chamavam renderizarFeedAtividadeRecente()
// continuam de pé, protegidos por `typeof ... === 'function'` — viram
// no-op sozinhos, sem precisar caçar cada chamada.


