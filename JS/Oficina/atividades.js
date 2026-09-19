// ==========================================================================
// ÁREA DA OFICINA — extraído de script.js na modularização
// ==========================================================================
// Navegação e conteúdo de uma área da Oficina aberta (Atividades,
// Materiais, Equipe, Procedimentos), a Fila da Ponte Rolante (painel
// próprio na barra lateral) e o checklist de Procedimentos Operacionais
// por área. Ficam juntos porque compartilham o mesmo estado de "área
// aberta agora" e "cache de atividades" (Core/estado.js).

import { resolverApiBase, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import {
    OPERADOR_LOGADO,
    OFICINA_AREA_ATUAL, setOficinaAreaAtual,
    OFICINA_ATIVIDADES_CACHE, setOficinaAtividadesCache,
    OFICINA_FILTRO_STATUS_ATUAL, setOficinaFiltroStatusAtual,
    OFICINA_TIPO_ATIVIDADE_ATUAL, setOficinaTipoAtividadeAtual,
    OFICINA_FOTO_BASE64, setOficinaFotoBase64,
    OFICINA_EDITANDO_ID, setOficinaEditandoId,
    OFICINA_EQUIPE_ATUAL, setOficinaEquipeAtual
} from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { executarSeguro, executarSeguroAsync, enviarComFilaOffline, atividadeEstaAtrasada, atividadeAindaNaoComecou } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ÁREA DA OFICINA — NAVEGAÇÃO POR ABAS (Atividades/Materiais/Equipe/
// Procedimentos/Notas) — antes tudo ficava num scroll único gigante.
// ==============================================================
window.trocarAbaAreaOficina = function(event, secao) {
    document.querySelectorAll('#area-oficina-tabs .folhao-tab').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    ['atividades', 'materiais', 'equipe', 'procedimentos', 'notas'].forEach(s => {
        const el = document.getElementById(`area-oficina-secao-${s}`);
        if (el) el.classList.toggle('hidden', s !== secao);
    });
};

// Formulário de "Nova Atividade" começa fechado — abre só quando o
// usuário realmente quer lançar algo, em vez de ocupar a tela toda.
window.alternarFormAtividadeOficina = function() {
    const card = document.getElementById('area-oficina-form-card');
    const textoBtn = document.getElementById('area-oficina-btn-toggle-form-texto');
    if (!card) return;
    const vaiAbrir = card.classList.contains('hidden');
    card.classList.toggle('hidden', !vaiAbrir);
    if (textoBtn) textoBtn.textContent = vaiAbrir ? 'Fechar Formulário' : 'Nova Atividade';
    if (vaiAbrir) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.abrirAreaOficina = async function(chave, abaInicial) {
    const area = AREAS_OFICINA.find(a => a.chave === chave);
    if (!area) return;

    // Agora é uma aba de verdade (não mais um modal por cima da tela) —
    // abrirAba() já cuida de esconder as outras abas e marcar esta como
    // ativa. Chamado com event=null porque pode vir de vários lugares
    // (card da grade, botão do painel administrativo, link direto do
    // menu lateral).
    window.abrirAba(null, 'aba-area-oficina');

    // ABAS MODULARES: cada área declara sua própria lista de abas em
    // dados.js (area.abas). Quem não declara usa o padrão de 5 abas.
    // Isso é o que permite, por exemplo, a Ferramentaria não ter
    // "Procedimentos" e chamar sua aba de materiais de "Ferramentas",
    // sem precisar de HTML/lógica duplicada por área.
    const abasDaArea = area.abas || ABAS_PADRAO_OFICINA;
    const tabsContainer = document.getElementById('area-oficina-tabs');
    if (tabsContainer) {
        // 🔧 CORREÇÃO CRÍTICA ("procedimento não aparece em NENHUMA
        // área"): esses botões são recriados do zero toda vez que uma
        // área é aberta, e não tinham "id" nenhum. renderProcedimentosArea()
        // procura o botão de Procedimentos por
        // getElementById('area-oficina-tab-btn-procedimentos') pra
        // decidir se mostra ou esconde a aba — como o id nunca existia
        // aqui, a busca sempre retornava null, e a função abortava ANTES
        // de preencher a lista (return antecipado por "!tabBtn"). Por
        // isso a aba Procedimentos sempre aparecia visível mas
        // completamente vazia, em toda área, mesmo quando havia
        // procedimento cadastrado. Agora cada botão leva um id previsível
        // (area-oficina-tab-btn-<chave>), então a busca funciona de novo.
        // Se abaInicial foi pedida e existe nessa área, ela entra ativa
        // no lugar da 1ª aba padrão (usada pelo atalho "Ver Equipe da
        // Área" do Painel do Técnico, por exemplo).
        const abaAtiva = (abaInicial && abasDaArea.some(ab => ab.chave === abaInicial)) ? abaInicial : abasDaArea[0].chave;

        tabsContainer.innerHTML = abasDaArea.map((aba) => `
            <button class="folhao-tab ${aba.chave === abaAtiva ? 'active' : ''}" id="area-oficina-tab-btn-${aba.chave}" onclick="window.trocarAbaAreaOficina(event,'${aba.chave}')">
                <i class="fas ${aba.icone}"></i> ${aba.label}
            </button>
        `).join('');
    }
    // Esconde as seções que essa área não usa; mostra a aba ativa.
    const abaAtivaSecao = (abaInicial && abasDaArea.some(ab => ab.chave === abaInicial)) ? abaInicial : abasDaArea[0].chave;
    ['atividades', 'materiais', 'equipe', 'procedimentos', 'notas'].forEach(s => {
        const usaEssaAba = abasDaArea.some(ab => ab.chave === s);
        document.getElementById(`area-oficina-secao-${s}`)?.classList.toggle('hidden', !(usaEssaAba && s === abaAtivaSecao));
    });
    // Renomeia labels dentro da própria seção "Materiais" quando a área
    // usa outro nome pra ela (ex: "Ferramentas"), sem duplicar seção.
    const abaMateriais = abasDaArea.find(ab => ab.chave === 'materiais');
    const tituloMateriais = document.getElementById('area-oficina-materiais-titulo-label');
    if (tituloMateriais) tituloMateriais.textContent = abaMateriais ? abaMateriais.label : 'Materiais';

    document.getElementById('area-oficina-form-card')?.classList.add('hidden');
    const textoBtn = document.getElementById('area-oficina-btn-toggle-form-texto');
    if (textoBtn) textoBtn.textContent = 'Nova Atividade';

    setOficinaAreaAtual(chave);
    if (typeof window.carregarOsDaArea === 'function') window.carregarOsDaArea();
    if (typeof window.atualizarBadgeChatAreaAdm === 'function') window.atualizarBadgeChatAreaAdm();
    if (typeof window.iniciarPollingRapidoArea === 'function') window.iniciarPollingRapidoArea();
    setOficinaFiltroStatusAtual('');
    setOficinaTipoAtividadeAtual('equipamento');
    setOficinaEquipeAtual([]);
    window.cancelarEdicaoAtividadeOficina(); // garante que não fica "preso" numa edição de outra área

    document.getElementById('area-oficina-nome').textContent = area.nome;
    const icone = document.getElementById('area-oficina-icone');
    icone.className = `fas ${area.icone}`;
    // 🔧 REDESIGN: não seta mais --area-color (cor fixa por área) --
    // os fallbacks das regras que usam essa variável (aba ativa, hover
    // de material, avatar de equipe) já assumem neutro/dourado sozinhos.

    // Status calculado a partir das atividades em aberto (mesma lógica
    // da Central de Áreas) + timestamp de quando essa tela carregou.
    const s = window.calcularStatusArea(chave);
    const badge = document.getElementById('area-oficina-status-badge');
    if (badge) { badge.textContent = `${s.emoji} ${s.label}`; badge.style.color = s.cor; }
    const ts = document.getElementById('area-oficina-timestamp');
    if (ts) ts.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const respEl = document.getElementById('area-oficina-responsavel-turno');
    if (respEl) respEl.textContent = 'Sem responsável definido'; // atualizado depois que a equipe carrega

    document.querySelectorAll('#area-oficina-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    document.querySelector('#area-oficina-filtros .btn-filter-mcc[data-status=""]')?.classList.add('active');

    document.getElementById('area-oficina-descricao').value = '';
    document.getElementById('area-oficina-responsavel-select').value = '';
    document.getElementById('area-oficina-responsavel-outro').value = '';
    document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
    document.getElementById('area-oficina-prioridade').value = 'Normal';
    document.getElementById('area-oficina-prazo').value = '';
    document.getElementById('area-oficina-data-inicio').value = '';
    window.removerFotoAtividadeOficina();
    window.alternarTipoAtividadeOficina('equipamento');

    const select = document.getElementById('area-oficina-equipamento');
    if (select) {
        let disponiveis = [...BANCO_ATIVOS];
        if (typeof area.filtro === 'function') {
            disponiveis = disponiveis.filter(area.filtro);
        }
        disponiveis.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

        if (disponiveis.length === 0) {
            select.innerHTML = `<option value="">Nenhum equipamento desse tipo cadastrado</option>`;
        } else {
            select.innerHTML = `<option value="">Selecione...</option>` +
                disponiveis.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
        }
    }

    // Atualiza o cache de atividades antes de renderizar — necessário
    // porque agora essa tela pode ser aberta direto (link do menu, ou
    // botão "Lançar Atividade" de um painel administrativo), sem
    // necessariamente ter passado pela grade da aba "Oficina" antes
    // (que normalmente é quem carrega esse cache).
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        setOficinaAtividadesCache(Array.isArray(todas) ? todas : []);
    } catch (e) {
        console.error('⚠️ Não consegui atualizar as atividades da oficina:', e);
    }

    renderizarAtividadesArea();
    carregarNotaAreaOficina(chave);
    carregarEquipeAreaOficina(chave);
    carregarMateriaisAreaOficina(chave);
    renderProcedimentosArea(chave);
};

// 🔧 AJUSTADO: clicar no logo "OMS Mobile" do cabeçalho mobile agora
// sempre volta pra aba Técnico, independente do perfil logado (antes
// ADM/visitante caíam no Painel Geral).
window.voltarAoPainelOuTecnico = function() {
    window.abrirAba(null, 'aba-tecnico');
};

window.fecharAreaOficina = function() {
    setOficinaAreaAtual(null);
    // 🔧 CORREÇÃO ("técnico fechava a área e caía na Central de Áreas,
    // uma visão de ADM com todas as áreas da fábrica"): técnico
    // restrito (não-ADM, com área fixa) volta pro Painel do Técnico —
    // só ADM/visitante continuam caindo na grade completa.
    const restrito = !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && !OPERADOR_LOGADO.isAdm && OPERADOR_LOGADO.area);
    window.abrirAba(null, restrito ? 'aba-tecnico' : 'aba-oficina');
};

// --------------------------------------------------------------
// TOGGLE: atividade vinculada a equipamento x tarefa avulsa
// --------------------------------------------------------------
window.alternarTipoAtividadeOficina = function(tipo) {
    setOficinaTipoAtividadeAtual(tipo);
    document.getElementById('area-oficina-tipo-equip').classList.toggle('active', tipo === 'equipamento');
    document.getElementById('area-oficina-tipo-avulsa').classList.toggle('active', tipo === 'avulsa');
    const wrap = document.getElementById('area-oficina-select-equip-wrap');
    if (wrap) wrap.classList.toggle('hidden', tipo !== 'equipamento');
};

// --------------------------------------------------------------
// FILTRO DE STATUS (dentro do modal da área)
// --------------------------------------------------------------
window.filtrarAtividadesArea = function(status, botaoClicado) {
    setOficinaFiltroStatusAtual(status);
    document.querySelectorAll('#area-oficina-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    renderizarAtividadesArea();
};

// --------------------------------------------------------------
// RENDERIZA A LISTA DE ATIVIDADES DA ÁREA ABERTA (usa o cache local)
// --------------------------------------------------------------
// 🆕 OS marcadas com a área atual (pedido do usuário: uma OS pode
// envolver várias áreas, e cada uma marcada deve VER a OS no próprio
// quadro de trabalho — a peça continua fisicamente na máquina, isto
// aqui só dá visibilidade de que existe uma OS em aberto envolvendo
// esta área). Só traz "Em Andamento" — Concluída/Não Executada some
// do quadro sozinha, igual atividade concluída some da lista "ativas"
// em renderizarAtividadesArea.
let OS_DA_AREA_CACHE = [];

window.carregarOsDaArea = async function() {
    if (!OFICINA_AREA_ATUAL) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico?area=${encodeURIComponent(OFICINA_AREA_ATUAL)}&status=${encodeURIComponent('Em Andamento')}&limite=50`, { cache: 'no-store' });
        OS_DA_AREA_CACHE = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Erro ao carregar OS da área:', e);
        OS_DA_AREA_CACHE = [];
    }
    renderizarOsDaArea();
};

function renderizarOsDaArea() {
    const container = document.getElementById('area-oficina-os-container');
    if (!container) return;
    if (!OS_DA_AREA_CACHE.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <h4 style="font-size:12px; color:var(--text-accent); text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">
            <i class="fas fa-file-invoice"></i> OS envolvendo esta área (${OS_DA_AREA_CACHE.length})
        </h4>
        ${OS_DA_AREA_CACHE.map(os => `
            <div class="atividade-card" style="--card-accent:var(--warning, #f59e0b); cursor:pointer;" onclick="window.irParaOsEspecifica('${os.numero_os || ('#' + os.id)}')">
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
                        <span class="font-code" style="font-weight:700; color:var(--text-heading);">${os.numero_os ? `OS ${os.numero_os}` : `OS #${os.id}`}</span>
                        ${os.maquina ? `<span class="ind-card-tag bg-tag">${os.maquina}</span>` : ''}
                    </div>
                    <div style="font-size:13px; color:var(--text-body);">${os.descricao || '(sem descrição)'}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${os.criado_por ? `${os.criado_por} · ` : ''}${os.criado_em || ''}</div>
                </div>
            </div>
        `).join('')}
    `;
}

function renderizarAtividadesArea() {
    const container = document.getElementById('area-oficina-lista');
    if (!container || !OFICINA_AREA_ATUAL) return;

    // 🆕 CORRIGIDO ("pedi uma Atividade Extra pra outra área e ela some
    // do meu quadro"): antes só entrava aqui quem EXECUTA (x.area). Quem
    // PEDIU (solicitante_area, vindo do backend — ver /api/oficina/
    // atividades) continua vendo a atividade no PRÓPRIO quadro mesmo
    // sendo executada por outra área — só que ela chega marcada como
    // "pedida por mim" no card (ver renderização abaixo), pra não
    // confundir com uma tarefa da própria área.
    const todasDaArea = OFICINA_ATIVIDADES_CACHE.filter(x => x.area === OFICINA_AREA_ATUAL || x.solicitante_area === OFICINA_AREA_ATUAL);

    // 🆕 Separa quem já pode aparecer como "pra fazer" de quem ainda
    // está programado pra uma data futura (data_inicio no futuro).
    const ativas = todasDaArea.filter(x => !atividadeAindaNaoComecou(x));
    const futuras = todasDaArea.filter(x => atividadeAindaNaoComecou(x))
        .sort((a, b) => (a.data_inicio || '').localeCompare(b.data_inicio || ''));

    let itens = ativas;
    if (OFICINA_FILTRO_STATUS_ATUAL) {
        itens = itens.filter(x => x.status === OFICINA_FILTRO_STATUS_ATUAL);
    }

    const qtdPendente = ativas.filter(x => x.status === 'Pendente').length;
    const qtdAndamento = ativas.filter(x => x.status === 'Em Andamento').length;
    const qtdAtrasada = ativas.filter(x => atividadeEstaAtrasada(x)).length;

    const statsHtml = `
        <div class="area-oficina-stats">
            <div class="area-oficina-stat"><strong style="color:var(--warning);">${qtdPendente}</strong><span>Pendentes</span></div>
            <div class="area-oficina-stat"><strong style="color:var(--info);">${qtdAndamento}</strong><span>Em Andamento</span></div>
            <div class="area-oficina-stat"><strong style="color:${qtdAtrasada > 0 ? 'var(--danger)' : 'var(--success)'};">${qtdAtrasada}</strong><span>Atrasadas</span></div>
        </div>
    `;

    // 🆕 Bloco de "Programadas" — atividades com início futuro, fora da
    // contagem principal, cada uma mostrando a data em que vai "virar"
    // Pendente sozinha.
    const futurasHtml = futuras.length === 0 ? '' : `
        <div class="area-oficina-programadas">
            <h4 style="font-size:12px; color:var(--text-accent); text-transform:uppercase; letter-spacing:0.5px; margin:16px 0 8px;">
                <i class="fas fa-calendar-plus"></i> Programadas (ainda não começaram)
            </h4>
            ${futuras.map(x => {
                const inicioFormatado = x.data_inicio.split('-').reverse().join('/');
                return `
                <div class="atividade-card" style="--card-accent:var(--text-accent, #3b82f6); opacity:0.85;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
                            ${x.equipamento_id
                                ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span>`
                                : `<span class="ind-card-tag bg-tag">Tarefa avulsa</span>`}
                            <span style="font-size:10px; background:var(--text-accent, #3b82f6); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700;">COMEÇA ${inicioFormatado}</span>
                        </div>
                        <div style="font-size:13px; color:var(--text-body);">${limparMarcadorTecnicoDescricao(x.descricao)}</div>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${x.responsavel ? `${x.responsavel} · ` : ''}${x.criado_em || ''}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                        <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.editarAtividadeOficina(${x.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirAtividadeOficina(${x.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    if (itens.length === 0) {
        container.innerHTML = statsHtml + `
            <div class="area-oficina-vazio">
                <i class="fas fa-clipboard-check"></i>
                <p>Nenhuma atividade encontrada${OFICINA_FILTRO_STATUS_ATUAL ? ' com esse filtro' : ' nesta área ainda'}.</p>
            </div>
        ` + futurasHtml;
        return;
    }

    // 🆕 "Aguardando" (travou depois de já ter começado, ex: esperando
    // material chegar) e "Recusado" (nem chegou a iniciar, ex: pediram
    // e não forneceram material) — ambos SEMPRE vêm com motivo (ver
    // mudarStatusAtividadeOficina), e avisam quem pediu a atividade.
    const corStatus = { 'Pendente': 'var(--warning)', 'Em Andamento': 'var(--info)', 'Concluído': 'var(--success)', 'Aguardando': '#f97316', 'Recusado': 'var(--danger)' };
    const iconePrioridade = { 'Alta': '🔴', 'Baixa': '🔵' };

    container.innerHTML = statsHtml + itens.map(x => {
        const atrasada = atividadeEstaAtrasada(x);
        const prazoFormatado = x.prazo ? x.prazo.split('-').reverse().join('/') : null;
        const corBorda = atrasada ? 'var(--danger)' : (corStatus[x.status] || 'var(--text-muted)');

        // Botões de ação variam por status — sempre um jeito de avançar
        // (ou pausar/recusar com motivo), nunca "passar por cima" sem
        // justificar.
        // 🆕 Bugfix: quando a área ATUAL só PEDIU a atividade (x.area é
        // outra área, x.solicitante_area === OFICINA_AREA_ATUAL) ela está
        // vendo o card só por transparência — quem de fato EXECUTA é que
        // decide Iniciar/Recusar/Concluir/Aguardando. Sem essa checagem o
        // solicitante conseguia mexer no status de um trabalho que nem é
        // dele.
        const estaNoQuadroExecutor = x.area === OFICINA_AREA_ATUAL;
        let botoesAcao = '';
        if (estaNoQuadroExecutor) {
            if (x.status === 'Pendente') {
                botoesAcao = `
                    <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Em Andamento')">Iniciar</button>
                    <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Recusado')">Recusar</button>
                `;
            } else if (x.status === 'Em Andamento') {
                botoesAcao = `
                    <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Concluído')">Concluir</button>
                    <button class="btn-premium" style="padding:4px 10px; font-size:11px; background:#f97316; border-color:#f97316;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Aguardando')">Aguardando</button>
                `;
            } else if (x.status === 'Aguardando') {
                botoesAcao = `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Em Andamento')"><i class="fas fa-play"></i> Retomar</button>`;
            } else if (x.status === 'Recusado') {
                botoesAcao = `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Pendente')"><i class="fas fa-rotate-left"></i> Reabrir</button>`;
            }
        }
        // 🆕 Reabrir uma atividade CONCLUÍDA é exceção à regra acima
        // (estaNoQuadroExecutor): tanto quem pediu quanto quem executou
        // (e ADM, nos dois quadros) pode reabrir — diferente de
        // Iniciar/Recusar/Concluir, que são só de quem executa. Por
        // isso fica fora do "if (estaNoQuadroExecutor)".
        if (x.status === 'Concluído') {
            botoesAcao += `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.reabrirAtividadeOficina(${x.id})"><i class="fas fa-rotate-left"></i> Reabrir</button>`;
        }

        return `
        <div class="atividade-card" id="atividade-card-${x.id}" style="--card-accent:${corBorda};">
            ${x.foto_base64 ? `
                <img src="${x.foto_base64}"
                     style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; flex-shrink:0;"
                     onclick="window.abrirFotoAmpliada('${x.foto_base64}', '${(x.criado_por || 'Sistema').replace(/'/g, "\\'")} — ${x.criado_em || ''}')"
                     title="${x.criado_por || 'Sistema'} — ${x.criado_em || ''}">
            ` : ''}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
                    ${x.equipamento_id
                        ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span>`
                        : `<span class="ind-card-tag bg-tag">Tarefa avulsa</span>`}
                    <span class="status-text-pill" style="--sev-color:${corStatus[x.status] || 'var(--text-muted)'};">${x.status}</span>
                    ${iconePrioridade[x.prioridade] ? `<span title="Prioridade ${x.prioridade}">${iconePrioridade[x.prioridade]}</span>` : ''}
                    ${atrasada ? `<span style="font-size:10px; background:var(--danger); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700;">ATRASADA</span>` : ''}
                    ${x.reaberturas_count > 0 ? `<span style="font-size:10px; background:#f97316; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="window.verHistoricoReaberturasAtividade(${x.id})" title="Ver histórico de reaberturas"><i class="fas fa-rotate-left"></i> Reaberta ${x.reaberturas_count}x</span>` : ''}
                </div>
                <div style="font-size:13px; color:var(--text-body);">${limparMarcadorTecnicoDescricao(x.descricao)}</div>
                ${x.motivo_status ? `<div style="font-size:11.5px; color:${corStatus[x.status]}; margin-top:4px;"><i class="fas fa-circle-info"></i> ${x.motivo_status}</div>` : ''}
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                    ${
                        // 🔧 CORREÇÃO ("iniciei, selecionei quem está fazendo, mas
                        // não mostra quem tá fazendo"): "Iniciar" salva quem vai
                        // executar num campo separado (executado_por, ver
                        // mudarStatusAtividadeOficina/routers/oficina.py) — não
                        // sobrescreve `responsavel`, que só existe se foi
                        // preenchido na CRIAÇÃO da atividade. O card só mostrava
                        // `responsavel`, então uma atividade sem responsável
                        // definido na criação ficava sem exibir ninguém, mesmo
                        // depois de alguém ter sido escolhido ao iniciar.
                        // Prioriza executado_por (mais recente/real) e cai pra
                        // responsavel só se não tiver execução ainda.
                        x.executado_por
                            ? `<i class="fas fa-user-gear"></i> ${x.executado_por} · `
                            : (x.responsavel ? `${x.responsavel} · ` : '')
                    }${x.criado_por ? `Criado por ${x.criado_por} · ` : ''}${x.criado_em || ''}
                    ${x.data_inicio ? ` · <span style="color:var(--text-accent, #3b82f6);">Início salvo: ${x.data_inicio.split('-').reverse().join('/')}</span>` : ''}
                    ${prazoFormatado ? ` · Prazo: <span style="color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${atrasada ? '700' : '400'};">${prazoFormatado}</span>` : ''}
                </div>
                ${(() => {
                    // 🆕 Item 5: quem PEDIU a atividade extra continua vendo
                    // ela no PRÓPRIO quadro mesmo sendo executada por outra
                    // área (ver filtro em renderizarAtividadesArea) — esse
                    // aviso deixa claro que não é uma tarefa da área atual,
                    // e quando alguém já pegou o serviço (executado_por),
                    // mostra o NOME de quem tá executando, não só a área.
                    if (x.area === OFICINA_AREA_ATUAL) return '';
                    const areaExecInfo = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : (window.AREAS_OFICINA || [])).find(a => a.chave === x.area);
                    const nomeAreaExec = (areaExecInfo && areaExecInfo.nome) || x.area;
                    const quem = x.executado_por ? ` — <strong>${x.executado_por}</strong>` : '';
                    return `<div style="font-size:11px; color:var(--text-accent, #3b82f6); margin-top:4px;"><i class="fas fa-people-arrows"></i> Pedido por esta área, executando em ${nomeAreaExec}${quem}</div>`;
                })()}
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${botoesAcao}
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.abrirConversaAtividade(${x.id})" title="Conversa">
                    <i class="fas fa-comments"></i>
                </button>
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.editarAtividadeOficina(${x.id})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirAtividadeOficina(${x.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('') + futurasHtml;
}

// --------------------------------------------------------------
// CRIAR ATIVIDADE (vinculada a equipamento OU avulsa)
// --------------------------------------------------------------
window.confirmarAtividadeOficina = async function() {
    if (!verificarAcesso()) return;
    if (!OFICINA_AREA_ATUAL) return;

    const descricao = document.getElementById('area-oficina-descricao')?.value.trim();
    const responsavel = lerResponsavelFormOficina();
    const prioridade = document.getElementById('area-oficina-prioridade')?.value || 'Normal';
    const prazo = document.getElementById('area-oficina-prazo')?.value || null;
    const dataInicio = document.getElementById('area-oficina-data-inicio')?.value || null;
    const equipamentoId = OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento'
        ? document.getElementById('area-oficina-equipamento')?.value
        : null;

    if (OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento' && !equipamentoId) {
        return alert('Selecione o equipamento, ou troque para "Tarefa Avulsa".');
    }
    if (!descricao) return alert('Descreva a atividade.');
    // 🆕 Início não pode ser depois do prazo — evita programar algo
    // pra "começar" numa data que já é depois do "terminar".
    if (dataInicio && prazo && dataInicio > prazo) {
        return alert('A Data de Início não pode ser depois do Prazo.');
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    const editando = OFICINA_EDITANDO_ID !== null;

    try {
        const apiBase = await resolverApiBase();
        const url = editando ? `${apiBase}/api/oficina/atividade/editar` : `${apiBase}/api/oficina/atividade`;
        const corpo = editando
            ? {
                id: OFICINA_EDITANDO_ID,
                equipamento_id: equipamentoId || null,
                descricao,
                responsavel: responsavel || null,
                prioridade,
                prazo,
                data_inicio: dataInicio,
                foto_base64: OFICINA_FOTO_BASE64 || null,
                operador
              }
            : {
                area: OFICINA_AREA_ATUAL,
                equipamento_id: equipamentoId || null,
                descricao,
                responsavel: responsavel || null,
                prioridade,
                prazo,
                data_inicio: dataInicio,
                foto_base64: OFICINA_FOTO_BASE64 || null,
                operador
              };

        let resp, enfileirado = false;
        if (editando) {
            // Edição não entra na fila offline — reenviar uma edição
            // sozinho depois, sem o usuário ver o resultado na hora, é
            // arriscado demais (pode já ter mudado de novo nesse meio
            // tempo). Só cria-nova-atividade é seguro de enfileirar.
            resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            });
        } else {
            const resultado = await enviarComFilaOffline(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            }, `Atividade da Oficina — ${descricao}`);
            resp = resultado.resp;
            enfileirado = resultado.enfileirado;
        }

        if (enfileirado) {
            document.getElementById('area-oficina-descricao').value = '';
            document.getElementById('area-oficina-responsavel-select').value = '';
            document.getElementById('area-oficina-responsavel-outro').value = '';
            document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
            document.getElementById('area-oficina-prazo').value = '';
            document.getElementById('area-oficina-data-inicio').value = '';
            window.removerFotoAtividadeOficina();
            alert('📴 Sem internet agora — a atividade foi guardada e será enviada sozinha assim que a conexão voltar.');
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || `Não foi possível ${editando ? 'salvar a edição' : 'salvar a atividade'}.`);
            return;
        }

        if (!editando && typeof window.registrarHistorico === 'function') {
            const areaInfo = AREAS_OFICINA.find(a => a.chave === OFICINA_AREA_ATUAL);
            const nomeArea = areaInfo ? areaInfo.nome : OFICINA_AREA_ATUAL;
            window.registrarHistorico(
                equipamentoId || `OFICINA-${OFICINA_AREA_ATUAL.toUpperCase()}`,
                `🧰 [${nomeArea}] ${descricao}`
            );
        }

        document.getElementById('area-oficina-descricao').value = '';
        document.getElementById('area-oficina-responsavel-select').value = '';
        document.getElementById('area-oficina-responsavel-outro').value = '';
        document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
        document.getElementById('area-oficina-prazo').value = '';
        document.getElementById('area-oficina-data-inicio').value = '';
        window.removerFotoAtividadeOficina();
        window.cancelarEdicaoAtividadeOficina();

        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao salvar atividade da oficina:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// --------------------------------------------------------------
// MUDAR STATUS (Pendente -> Em Andamento -> Concluído)
// --------------------------------------------------------------
// ==============================================================
// FILA DA PONTE ROLANTE (221/146) — painel próprio na barra lateral,
// separado da Central de Áreas: qualquer área solicita as pontes aqui
// (fila única, compartilhada entre as duas), com prioridade
// Urgente/Normal/Rápida, duração estimada, previsão de tempo de espera
// antes de pedir, e reordenação manual (técnico da própria área da
// ponte ou ADM podem passar um pedido pra frente).
// ==============================================================
const FILA_PONTE_CORES_PRIORIDADE = { Urgente: '#ef4444', Normal: '#94a3b8', 'Rápida': '#eab308' };

window.renderFilaPonteRolante = async function() {
    const lista = document.getElementById('fila-ponte-lista');
    if (!lista) return;
    lista.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando fila...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const [respAtividades, respEspera] = await Promise.all([
            fetch(`${apiBase}/api/oficina/atividades?area=ponte-rolante`, { cache: 'no-store' }),
            fetch(`${apiBase}/api/oficina/ponte_rolante/tempo_espera`, { cache: 'no-store' }),
        ]);
        const atividades = respAtividades.ok ? await respAtividades.json() : [];
        const espera = respEspera.ok ? await respEspera.json() : { atividades_na_fila: 0, minutos_estimados: 0 };

        document.getElementById('fila-ponte-kpi-fila').textContent = espera.atividades_na_fila;
        const horas = Math.floor(espera.minutos_estimados / 60);
        const minutos = espera.minutos_estimados % 60;
        document.getElementById('fila-ponte-kpi-espera').textContent = espera.atividades_na_fila
            ? (horas > 0 ? `${horas}h${minutos ? ` ${minutos}min` : ''}` : `${minutos}min`)
            : '—';

        const emAberto = atividades
            .filter(a => a.status === 'Pendente' || a.status === 'Em Andamento')
            .sort((a, b) => (a.ordem_fila ?? a.id) - (b.ordem_fila ?? b.id));
        const finalizadas = atividades
            .filter(a => a.status !== 'Pendente' && a.status !== 'Em Andamento')
            .sort((a, b) => b.id - a.id)
            .slice(0, 100);

        // 🆕 Reordenar e Iniciar/Concluir só fazem sentido pra quem
        // atende a fila (técnico da área ponte-rolante) ou ADM — outras
        // áreas só pedem, não decidem a ordem nem executam o serviço.
        const podeAtender = !!(OPERADOR_LOGADO && (OPERADOR_LOGADO.isAdm || OPERADOR_LOGADO.area === 'ponte-rolante'));
        // 🆕 Excluir: quem atende a fila, OU quem criou o próprio pedido
        // (pode desistir do que pediu) — outras áreas não excluem pedido
        // alheio.
        const podeExcluir = (x) => podeAtender || (OPERADOR_LOGADO && x.solicitante_matricula && x.solicitante_matricula === OPERADOR_LOGADO.matricula);

        if (!emAberto.length) {
            lista.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma solicitação na fila agora.</div>`;
        } else {
            lista.innerHTML = emAberto.map((x, i) => {
                const cor = FILA_PONTE_CORES_PRIORIDADE[x.prioridade] || '#94a3b8';
                return `
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px 12px; padding:12px 0; border-bottom:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                        ${podeAtender ? `
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <button class="btn-xs-primary" style="padding:2px 6px;" title="Subir na fila" ${i === 0 ? 'disabled' : ''} onclick="window.moverFilaPonteRolante(${x.id}, -1)"><i class="fas fa-caret-up"></i></button>
                            <button class="btn-xs-primary" style="padding:2px 6px;" title="Descer na fila" ${i === emAberto.length - 1 ? 'disabled' : ''} onclick="window.moverFilaPonteRolante(${x.id}, 1)"><i class="fas fa-caret-down"></i></button>
                        </div>` : ''}
                        <span style="font-weight:700; color:${cor}; font-size:12px; min-width:60px;">${x.prioridade || 'Normal'}</span>
                        <div style="min-width:0;">
                            <div style="color:var(--text-body); word-break:break-word;">${x.descricao}</div>
                            <div class="text-muted" style="font-size:11px;">${x.solicitante_area ? `Solicitado por: ${AREAS_OFICINA.find(a => a.chave === x.solicitante_area)?.nome || x.solicitante_area} — ` : ''}${x.duracao_estimada_min ? `~${x.duracao_estimada_min}min — ` : ''}${x.equipamento_id ? `Ponte ${x.equipamento_id} — ` : ''}${x.acessorios_ponte ? `${x.acessorios_ponte} — ` : ''}${x.status}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.abrirConversaAtividade(${x.id})" title="Conversa"><i class="fas fa-comments"></i></button>
                        ${podeAtender && x.status === 'Pendente' ? `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusFilaPonteRolante(${x.id}, 'Em Andamento')">Iniciar</button>` : ''}
                        ${podeAtender && x.status === 'Em Andamento' ? `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusFilaPonteRolante(${x.id}, 'Concluído')">Concluir</button>` : ''}
                        ${podeExcluir(x) ? `<button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirSolicitacaoFilaPonteRolante(${x.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        // 🆕 Arquivo separado por dia (concluído/recusado/etc) — em vez
        // de uma lista plana das últimas 10, agrupa por data (concluido_em
        // quando tem, senão criado_em) pra achar "o que rolou no dia X"
        // sem precisar caçar item por item numa lista única.
        if (finalizadas.length) {
            const porDia = new Map();
            finalizadas.forEach(x => {
                const dia = (x.concluido_em || x.criado_em || '').slice(0, 10);
                if (!porDia.has(dia)) porDia.set(dia, []);
                porDia.get(dia).push(x);
            });
            const diasOrdenados = [...porDia.keys()].sort((a, b) => b.localeCompare(a));
            lista.innerHTML += `
                <details style="margin-top:16px;">
                    <summary class="text-muted" style="cursor:pointer; font-size:12px;">Arquivo — atendimentos por dia</summary>
                    ${diasOrdenados.map(dia => `
                        <div style="margin-top:10px;">
                            <div style="font-weight:700; font-size:12px; color:var(--text-heading); margin-bottom:4px;">${dia ? new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</div>
                            ${porDia.get(dia).map(x => `
                                <div style="padding:8px 0; border-bottom:1px solid var(--border); font-size:12px;" class="text-muted">
                                    ${x.descricao} — ${x.status}${x.equipamento_id ? ` — Ponte ${x.equipamento_id}` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </details>`;
        }
    } catch (e) {
        console.error('⚠️ Não consegui carregar a fila da Ponte Rolante:', e);
        lista.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar a fila agora.</div>`;
    }
};

window.criarSolicitacaoFilaPonteRolante = async function() {
    if (!verificarAcesso()) return;
    const descricao = document.getElementById('fila-ponte-descricao')?.value.trim();
    if (!descricao) return alert('Descreva o que precisa da ponte.');
    const prioridade = document.getElementById('fila-ponte-prioridade')?.value || 'Normal';
    const duracaoStr = document.getElementById('fila-ponte-duracao')?.value;
    const duracaoEstimadaMin = duracaoStr ? parseInt(duracaoStr, 10) : null;
    const acessorios = [...document.querySelectorAll('#fila-ponte-form-card .fila-ponte-acessorio-check:checked')].map(c => c.value);
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: 'ponte-rolante',
                descricao,
                prioridade,
                duracao_estimada_min: duracaoEstimadaMin,
                acessorios_ponte: acessorios.join(', ') || null,
                operador,
                solicitante_matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null,
            })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível criar a solicitação.');
            return;
        }
        document.getElementById('fila-ponte-descricao').value = '';
        document.getElementById('fila-ponte-duracao').value = '';
        document.getElementById('fila-ponte-prioridade').value = 'Normal';
        document.querySelectorAll('#fila-ponte-form-card .fila-ponte-acessorio-check').forEach(c => c.checked = false);
        document.getElementById('fila-ponte-form-card').classList.add('hidden');
        await window.renderFilaPonteRolante();
    } catch (e) {
        console.error('⚠️ Erro ao solicitar a Ponte Rolante:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Guarda o id da atividade sendo iniciada enquanto o modal (ponte +
// acessórios de içamento) está aberto — ver abrirModalIniciarPonte.
let FILA_PONTE_ID_INICIANDO = null;

window.mudarStatusFilaPonteRolante = async function(id, novoStatus) {
    if (!verificarAcesso()) return;
    // 🆕 Ao Iniciar, precisa dizer qual ponte física (221 ou 146) vai
    // atender essa demanda e quais acessórios de içamento vão ser
    // usados (cabo 4 pontas, gig, cinta...) — fila é única, mas o
    // atendimento não é. Isso abre um modal em vez de seguir direto;
    // o resto do fluxo (Concluir, etc.) continua sem modal.
    if (novoStatus === 'Em Andamento') {
        const atividade = (await window.buscarAtividadesFilaPonteRolante()).find(a => a.id === id);
        window.abrirModalIniciarPonte(id, atividade?.acessorios_ponte);
        return;
    }
    await window.enviarStatusFilaPonteRolante(id, novoStatus, {});
};

window.enviarStatusFilaPonteRolante = async function(id, novoStatus, extras) {
    const motivo = novoStatus === 'Concluído' ? (prompt('Observação ao concluir (opcional):') || null) : null;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus, motivo, operador, ...extras })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível atualizar o status.');
            return;
        }
        await window.renderFilaPonteRolante();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status da fila da Ponte Rolante:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Operador atual de cada ponte física, por dia — guardado localmente
// (chave: número da ponte) pra não precisar perguntar de novo o dia
// inteiro e pra detectar troca de operador comparando com o último
// nome salvo. Zera sozinho quando muda a data.
const CHAVE_OPERADOR_PONTE = 'oms_operador_ponte_v1';

function obterOperadorSalvoPonte(ponte) {
    try {
        const todos = JSON.parse(localStorage.getItem(CHAVE_OPERADOR_PONTE) || '{}');
        const registro = todos[ponte];
        const hoje = new Date().toISOString().slice(0, 10);
        if (registro && registro.data === hoje) return registro.nome;
        return null;
    } catch (e) {
        return null;
    }
}

function salvarOperadorPonte(ponte, nome) {
    try {
        const todos = JSON.parse(localStorage.getItem(CHAVE_OPERADOR_PONTE) || '{}');
        todos[ponte] = { nome, data: new Date().toISOString().slice(0, 10) };
        localStorage.setItem(CHAVE_OPERADOR_PONTE, JSON.stringify(todos));
    } catch (e) { /* localStorage indisponível — segue sem persistir */ }
}

// 🆕 Recarrega a lista de operadores (equipe da Ponte Rolante) e marca
// o operador salvo do dia, se houver, comparando com a ponte escolhida
// no rádio. Chamado ao abrir o modal e sempre que a ponte é trocada.
async function atualizarOperadoresModalIniciarPonte() {
    const ponte = document.querySelector('input[name="modal-iniciar-ponte-radio"]:checked')?.value || '221';
    const container = document.getElementById('modal-iniciar-ponte-operadores');
    const operadorSalvo = obterOperadorSalvoPonte(ponte);

    let equipe = [];
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/equipe/ponte-rolante`, { cache: 'no-store' });
        equipe = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Não consegui buscar a equipe da Ponte Rolante:', e);
    }
    const nomes = Array.isArray(equipe) ? equipe.map(p => p.nome).filter(Boolean) : [];
    if (operadorSalvo && !nomes.some(n => n.toLowerCase() === operadorSalvo.toLowerCase())) {
        nomes.unshift(operadorSalvo);
    }

    if (container) {
        container.innerHTML = nomes.length
            ? nomes.map(nome => `
                <label class="chip-select">
                    <input type="radio" name="modal-iniciar-ponte-operador-radio" value="${nome.replace(/"/g, '&quot;')}" ${nome === operadorSalvo ? 'checked' : ''}>
                    ${nome}${nome === operadorSalvo ? ' <span class="text-muted" style="font-size:11px;">(atual)</span>' : ''}
                </label>
            `).join('')
            : `<span class="text-muted" style="font-size:12px;">Nenhuma equipe cadastrada na Ponte Rolante — digite o nome abaixo.</span>`;
    }
    const inputOutro = document.getElementById('modal-iniciar-ponte-operador-outro');
    if (inputOutro) inputOutro.value = '';
    atualizarAvisoTrocaOperadorPonte();
}

// 🆕 Liga/desliga o aviso de troca comparando a escolha atual (rádio ou
// campo livre) com o operador salvo daquela ponte. É só um aviso —
// não bloqueia o Iniciar.
function atualizarAvisoTrocaOperadorPonte() {
    const ponte = document.querySelector('input[name="modal-iniciar-ponte-radio"]:checked')?.value || '221';
    const operadorSalvo = obterOperadorSalvoPonte(ponte);
    const escolhido = obterOperadorEscolhidoModalIniciarPonte();
    const aviso = document.getElementById('modal-iniciar-ponte-operador-aviso');
    if (aviso) aviso.classList.toggle('hidden', !operadorSalvo || !escolhido || escolhido.toLowerCase() === operadorSalvo.toLowerCase());
}

function obterOperadorEscolhidoModalIniciarPonte() {
    const outro = document.getElementById('modal-iniciar-ponte-operador-outro')?.value.trim();
    if (outro) return outro;
    return document.querySelector('input[name="modal-iniciar-ponte-operador-radio"]:checked')?.value || '';
}

window.abrirModalIniciarPonte = function(id, acessoriosSugeridos) {
    FILA_PONTE_ID_INICIANDO = id;
    // 🆕 Pré-marca o que já foi sugerido na criação — o técnico só
    // confirma ou ajusta, não precisa marcar tudo de novo do zero.
    const sugeridos = (acessoriosSugeridos || '').split(',').map(s => s.trim()).filter(Boolean);
    document.querySelectorAll('#modal-iniciar-ponte-acessorios .modal-iniciar-ponte-check').forEach(c => {
        c.checked = sugeridos.includes(c.value);
    });
    document.querySelectorAll('input[name="modal-iniciar-ponte-radio"]').forEach(r => {
        r.checked = r.value === '221';
        r.onchange = atualizarOperadoresModalIniciarPonte;
    });
    const inputOutro = document.getElementById('modal-iniciar-ponte-operador-outro');
    if (inputOutro) inputOutro.oninput = atualizarAvisoTrocaOperadorPonte;
    document.getElementById('modal-iniciar-ponte')?.classList.remove('hidden');
    atualizarOperadoresModalIniciarPonte();
};

window.fecharModalIniciarPonte = function() {
    FILA_PONTE_ID_INICIANDO = null;
    document.getElementById('modal-iniciar-ponte')?.classList.add('hidden');
};

window.confirmarIniciarPonte = async function() {
    if (!FILA_PONTE_ID_INICIANDO) return;
    const ponteUtilizada = document.querySelector('input[name="modal-iniciar-ponte-radio"]:checked')?.value || '221';
    const acessorios = [...document.querySelectorAll('#modal-iniciar-ponte-acessorios .modal-iniciar-ponte-check:checked')].map(c => c.value);
    const operadorPonte = obterOperadorEscolhidoModalIniciarPonte();
    if (!operadorPonte) {
        alert('Selecione ou digite quem está operando a ponte.');
        return;
    }
    const operadorAnterior = obterOperadorSalvoPonte(ponteUtilizada);
    const trocaOperador = !!operadorAnterior && operadorAnterior.toLowerCase() !== operadorPonte.toLowerCase();
    const id = FILA_PONTE_ID_INICIANDO;
    window.fecharModalIniciarPonte();
    await window.enviarStatusFilaPonteRolante(id, 'Em Andamento', {
        ponte_utilizada: ponteUtilizada,
        acessorios_ponte: acessorios.join(', ') || null,
        operador_ponte: operadorPonte,
        troca_operador: trocaOperador,
    });
    salvarOperadorPonte(ponteUtilizada, operadorPonte);
};

// 🆕 Compartilhado entre moverFilaPonteRolante e mudarStatusFilaPonteRolante
// (pré-preencher acessórios sugeridos ao abrir o modal de Iniciar).
window.buscarAtividadesFilaPonteRolante = async function() {
    const apiBase = await resolverApiBase();
    const resp = await fetch(`${apiBase}/api/oficina/atividades?area=ponte-rolante`, { cache: 'no-store' });
    return resp.ok ? await resp.json() : [];
};

window.excluirSolicitacaoFilaPonteRolante = async function(id) {
    if (!verificarAcesso()) return;
    const motivo = (prompt('Por que está excluindo essa solicitação da fila?') || '').trim();
    if (!motivo) { alert('É preciso informar o motivo da exclusão.'); return; }
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, operador, motivo })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível excluir a solicitação.');
            return;
        }
        await window.renderFilaPonteRolante();
    } catch (e) {
        console.error('⚠️ Erro ao excluir solicitação da fila da Ponte Rolante:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.moverFilaPonteRolante = async function(id, direcao) {
    const lista = document.getElementById('fila-ponte-lista');
    if (!lista) return;
    try {
        const apiBase = await resolverApiBase();
        const atividades = await window.buscarAtividadesFilaPonteRolante();
        const emAberto = atividades
            .filter(a => a.status === 'Pendente' || a.status === 'Em Andamento')
            .sort((a, b) => (a.ordem_fila ?? a.id) - (b.ordem_fila ?? b.id));
        const indice = emAberto.findIndex(a => a.id === id);
        const novoIndice = indice + direcao;
        if (indice < 0 || novoIndice < 0 || novoIndice >= emAberto.length) return;
        [emAberto[indice], emAberto[novoIndice]] = [emAberto[novoIndice], emAberto[indice]];

        const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
        await fetch(`${apiBase}/api/oficina/ponte_rolante/reordenar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: 'ponte-rolante', ids_em_ordem: emAberto.map(a => a.id), operador })
        });
        await window.renderFilaPonteRolante();
    } catch (e) {
        console.error('⚠️ Erro ao reordenar a fila da Ponte Rolante:', e);
    }
};

window.mudarStatusAtividadeOficina = async function(id, novoStatus) {
    if (!verificarAcesso()) return;

    // 🆕 "Recusado" e "Aguardando" exigem motivo — o backend também
    // valida isso (não dá pra contornar só chamando a API direto), mas
    // pedir aqui já evita a ida e volta com erro pro técnico.
    // Iniciar/Concluir agora também aceitam uma observação — opcional
    // (cancelar o prompt não bloqueia a ação, diferente de
    // Recusado/Aguardando) — dá pra deixar uma nota tipo "trocado o
    // parafuso X" que chega pro solicitante junto do aviso.
    let motivo = null;
    if (novoStatus === 'Recusado' || novoStatus === 'Aguardando') {
        const rotulo = novoStatus === 'Recusado' ? 'Por que está recusando essa atividade?' : 'Por que está pausando essa atividade? (ex: aguardando material)';
        motivo = prompt(rotulo);
        if (!motivo || !motivo.trim()) { alert('É preciso informar um motivo.'); return; }
    } else if (novoStatus === 'Concluído') {
        // Iniciar dispara notificação automática sem interromper o
        // técnico com um prompt — só Concluir pede observação (e
        // mesmo assim é opcional: cancelar/deixar em branco conclui
        // sem nota).
        motivo = prompt('Observação ao concluir (opcional):') || null;
    }

    // 🆕 Ao iniciar a atividade, pergunta quem da equipe vai executar —
    // mesmo modal já usado no Checklist de Execução, evita duplicar UI.
    // Cancelar o modal aborta a mudança de status (não chama o backend,
    // não fecha nem atualiza nada), igual ao cancelar já faz lá.
    let colaboradores = null;
    if (novoStatus === 'Em Andamento' && typeof window.escolherColaboradoresChecklist === 'function') {
        colaboradores = await window.escolherColaboradoresChecklist(OFICINA_AREA_ATUAL, 'Quem vai executar essa atividade?');
        if (colaboradores === null) return; // cancelou
    }

    try {
        const apiBase = await resolverApiBase();
        const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
        const resp = await fetch(`${apiBase}/api/oficina/atividade/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus, motivo, operador, colaboradores })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => null);
            alert(erro?.detail || 'Não foi possível atualizar o status.');
            return;
        }

        // 🆕 Fecha o loop Oficina→Logística→Reserva: a atividade
        // concluída pode carregar o marcador [REABASTECER_RESERVA:<ID>]
        // na própria descrição, linkando ela a uma peça em BANCO_ATIVOS.
        // É um parsing simples em texto — não muda o schema do backend —
        // só pra saber, quando a Logística marca "Concluído", que peça
        // acabou de chegar na Reserva na Máquina.
        if (novoStatus === 'Concluído') {
            const atividadeConcluida = OFICINA_ATIVIDADES_CACHE.find(x => x.id === id);
            await window.processarMarcadorAtividadeConcluida(atividadeConcluida ? atividadeConcluida.descricao : '');
        }

        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status da atividade:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Ver comentário acima (em mudarStatusAtividadeOficina) sobre o
// porquê do link atividade↔peça via marcador em texto na descrição.
window.processarMarcadorAtividadeConcluida = async function(descricao) {
    if (!descricao) return;
    try {
        const matchReabastecer = descricao.match(/\[REABASTECER_RESERVA:([^\]]+)\]/);
        if (matchReabastecer) {
            const idPeca = matchReabastecer[1];
            const peca = BANCO_ATIVOS.find(a => a.id === idPeca);
            if (peca && peca.local === "Oficina / Reserva") {
                peca.local = "Máquina / Reserva";
                localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
                if (typeof salvarPecaNoPython === 'function') await salvarPecaNoPython(peca);
                if (window.registrarHistorico) await window.registrarHistorico(peca.id, `🚚 Transporte confirmado pela Logística — peça agora em Reserva na Máquina.`);
                if (typeof renderReservas === 'function') renderReservas();
                if (typeof renderAtivos === 'function') renderAtivos();
            }
        }

        // 🆕 Fecha o loop de QUALQUER transporte genérico da Logística
        // (marcador [TRANSPORTE:<id>:<destino>], ver notificarLogisticaTransporte)
        // — sem isso, a peça não tinha nenhum registro de "chegou de
        // verdade" no Prontuário, só o pedido inicial. Diferente do
        // REABASTECER_RESERVA acima, esse marcador não muda status/local
        // (a peça já foi movida na hora do swap) — só confirma no
        // histórico que a entrega física aconteceu, e pra onde.
        const matchTransporte = descricao.match(/\[TRANSPORTE:([^:\]]+):([^\]]+)\]/);
        if (matchTransporte) {
            const [, idPeca, destino] = matchTransporte;
            if (window.registrarHistorico) {
                await window.registrarHistorico(idPeca, `🚚 Logística finalizada — ${idPeca} entregue em ${destino}.`);
            }
        }
    } catch (e) {
        // Nunca deixa isso travar a conclusão normal da atividade.
        console.error('⚠️ Erro ao processar marcador de atividade concluída:', e);
    }
};

// --------------------------------------------------------------
// 🆕 REABRIR ATIVIDADE CONCLUÍDA — volta pra "Em Andamento" (não
// "Pendente": o usuário já validou o serviço, então é retrabalho, vai
// direto pra produção de novo até concluir de novo). Motivo é
// OBRIGATÓRIO (por que reabrir?) e quem vai refazer é escolhido no
// mesmo modal de colaboradores usado ao Iniciar — sem isso o
// executado_por ficaria "preso" em quem tinha feito da vez anterior.
// Aparece nos dois quadros (solicitante e executor): qualquer
// envolvido pode reabrir, diferente de Iniciar/Recusar/Concluir.
// --------------------------------------------------------------
// 🆕 Mostra o histórico completo de reaberturas de uma atividade — sem
// modal dedicado por enquanto (ver comentário do endpoint no backend),
// só o dado acessível de forma simples num alert formatado.
window.verHistoricoReaberturasAtividade = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/${id}/reaberturas`);
        if (!resp.ok) { alert('Não foi possível carregar o histórico.'); return; }
        const historico = await resp.json();
        if (!Array.isArray(historico) || !historico.length) {
            alert('Sem histórico de reaberturas registrado.');
            return;
        }
        const texto = historico.map((h, i) => {
            const n = historico.length - i;
            return `#${n} — reaberta em ${h.data_reabertura || '?'} por ${h.reaberto_por || 'Sistema'}\n`
                 + `Motivo da reabertura: ${h.motivo_reabertura || '-'}\n`
                 + `Conclusão anterior: ${h.concluido_em_anterior || '-'} (${h.motivo_conclusao_anterior || 'sem observação'})\n`
                 + `Executado por (antes): ${h.executado_por_anterior || '-'}`;
        }).join('\n\n');
        alert(`Histórico de reaberturas (${historico.length}x):\n\n${texto}`);
    } catch (e) {
        console.error('⚠️ Erro ao buscar histórico de reaberturas:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.reabrirAtividadeOficina = async function(id) {
    if (!verificarAcesso()) return;

    // 🆕 RETRABALHO — se essa atividade já foi reaberta antes, um
    // "Reabrir" a mais pode ser sintoma de um problema que não foi
    // resolvido de verdade. Confirmação extra (além do motivo
    // obrigatório abaixo) só aparece quando já existe pelo menos 1
    // reabertura anterior — cancelar aqui aborta sem chamar a API.
    const atividadeAtual = OFICINA_ATIVIDADES_CACHE.find(x => x.id === id);
    const jaReabertaCount = (atividadeAtual && atividadeAtual.reaberturas_count) || 0;
    if (jaReabertaCount >= 1) {
        const confirmou = confirm(`Essa atividade já foi reaberta ${jaReabertaCount} vez(es) antes. Tem certeza que quer reabrir de novo?`);
        if (!confirmou) return;
    }

    const motivo = prompt('Descreva o motivo da reabertura:');
    if (!motivo || !motivo.trim()) { alert('Descreva o motivo da reabertura.'); return; }

    // 🐛 CORRIGIDO: Reabrir aparece nos dois quadros (solicitante e
    // executor) — ao contrário de Iniciar, que só existe no quadro de
    // quem executa (onde OFICINA_AREA_ATUAL == área de execução). Se o
    // SOLICITANTE reabrir pela própria tela, OFICINA_AREA_ATUAL é a
    // área DELE, não de quem vai refazer o serviço — passar isso pro
    // modal listaria a equipe errada (ex: Molde reabrindo um pedido pra
    // Caldeiraria veria a equipe do Molde no modal). Usa sempre a área
    // de EXECUÇÃO da própria atividade (x.area), não a do quadro aberto.
    const atividade = OFICINA_ATIVIDADES_CACHE.find(x => x.id === id);
    const areaExecucao = atividade ? atividade.area : OFICINA_AREA_ATUAL;

    let colaboradores = null;
    if (typeof window.escolherColaboradoresChecklist === 'function') {
        colaboradores = await window.escolherColaboradoresChecklist(areaExecucao, 'Quem vai refazer essa atividade?');
        if (colaboradores === null) return; // cancelou
    }

    try {
        const apiBase = await resolverApiBase();
        const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
        const resp = await fetch(`${apiBase}/api/oficina/atividade/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'Em Andamento', motivo, operador, colaboradores, reabertura: true })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => null);
            alert(erro?.detail || 'Não foi possível reabrir a atividade.');
            return;
        }
        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao reabrir atividade da oficina:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// EXCLUIR ATIVIDADE
// --------------------------------------------------------------
window.excluirAtividadeOficina = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir esta atividade?')) return;
    try {
        const apiBase = await resolverApiBase();
        const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
        const resp = await fetch(`${apiBase}/api/oficina/atividade/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, operador })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir.');
            return;
        }
        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao excluir atividade da oficina:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// 🆕 "Conversa" de uma atividade — pedido do usuário: existiam DOIS
// chats pro mesmo assunto (o modal "Conversa da Atividade", com sua
// própria tabela/endpoint, e o espelho dessa mesma mensagem no canal
// "Entre Técnicos" do chat da área). Confuso e redundante. Agora só
// existe 1 chat: clicar em "Conversa" numa atividade abre direto a
// aba Chats, no canal Entre Técnicos da área certa, com a referência
// da atividade pendurada — a próxima mensagem já sai marcada
// "Respondendo: equipamento — descrição", sem modal e sem endpoint
// separado (window.chatsEnviarMensagem manda tudo pro mesmo lugar).
// --------------------------------------------------------------
window.abrirConversaAtividade = async function(atividadeId) {
    const atividade = (typeof OFICINA_ATIVIDADES_CACHE !== 'undefined')
        ? OFICINA_ATIVIDADES_CACHE.find(a => a.id === atividadeId)
        : null;
    if (!atividade || !atividade.area) {
        alert('Não consegui identificar a área dessa atividade.');
        return;
    }

    const referencia = [atividade.equipamento_id, atividade.descricao].filter(Boolean).join(' — ').slice(0, 80) || `Atividade #${atividadeId}`;

    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    window.abrirAba(null, 'aba-chats');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('nav-chats')?.classList.add('active');

    await window.chatsSelecionarConversa(atividade.area, isAdm);
    window.chatsTrocarCanal('tecnicos');
    // 🆕 Canal 'tecnicos' agora é área-a-área — se a atividade tem uma
    // área SOLICITANTE diferente da área executante, já escolhe ela
    // como destino (é quase certo que a conversa é com quem pediu);
    // senão deixa o seletor de área aparecer normalmente.
    if (atividade.solicitante_area && atividade.solicitante_area !== atividade.area) {
        await window.chatsEscolherAreaTecnicos(atividade.solicitante_area);
    }
    // 🔧 Setada só AQUI, depois de trocar conversa/canal — os dois passos
    // acima limpam CHAT_ATIVIDADE_PENDENTE_REFERENCIA de propósito (evita
    // ficar "grudada" se a pessoa trocar de conversa manualmente depois).
    window.setChatAtividadePendenteReferencia(referencia);

    const preview = document.getElementById('chat-thread-atividade-preview');
    const previewTexto = document.getElementById('chat-thread-atividade-preview-texto');
    if (previewTexto) previewTexto.textContent = `Respondendo: ${referencia}`;
    if (preview) preview.classList.remove('hidden');

    document.getElementById('chat-thread-input')?.focus();
};

// --------------------------------------------------------------
// FOTO DA ATIVIDADE (mesma lógica de compressão de Intervenção/Ocorrência)
// --------------------------------------------------------------
window.processarFotoAtividadeOficina = function(event) {
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

            setOficinaFotoBase64(canvas.toDataURL('image/jpeg', 0.7));

            const preview = document.getElementById('area-oficina-foto-preview');
            const container = document.getElementById('area-oficina-foto-preview-container');
            if (preview) preview.src = OFICINA_FOTO_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoAtividadeOficina = function() {
    setOficinaFotoBase64(null);
    const preview = document.getElementById('area-oficina-foto-preview');
    const container = document.getElementById('area-oficina-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

// 🔧 Remove acentos pra comparar cargo sem depender de a planilha ter
// escrito "TÉCNICO" com acento — usado por carregarEquipeAreaOficina()
// pra achar o líder de qualquer área, sem exceção.
function normalizarTextoSemAcento(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

// Regra única de "quem é o líder da equipe da área", reaproveitada
// tanto pro badge do topo (área-oficina-responsavel-turno) quanto pra
// estrelinha na lista de Equipe — pra nunca ficar divergente entre os
// dois lugares:
//   1) Se só tem 1 pessoa na área, ela É a líder (não tem mais ninguém
//      pra escolher — ex: Paula, sozinha na Ferramentaria).
//   2) Senão, é quem tiver "TECNICO" no cargo (ignorando acento).
//   3) Se ninguém bater nenhuma das duas regras, não tem líder definido
//      (quem chama decide o fallback, ex: primeiro da lista).
function encontrarLiderEquipe(equipe) {
    if (!Array.isArray(equipe) || equipe.length === 0) return null;
    if (equipe.length === 1) return equipe[0];
    return equipe.find(p => normalizarTextoSemAcento(p.cargo).includes('TECNICO')) || null;
}

// --------------------------------------------------------------
// EQUIPE DA ÁREA (dados reais, vindos da planilha do efetivo)
// --------------------------------------------------------------
async function carregarEquipeAreaOficina(chave) {
    const container = document.getElementById('area-oficina-equipe-lista');
    const selectResp = document.getElementById('area-oficina-responsavel-select');
    if (!container) return;
    container.innerHTML = `<div class="text-muted" style="font-size:12px;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const equipe = resp.ok ? await resp.json() : [];
        setOficinaEquipeAtual(Array.isArray(equipe) ? equipe : []);

        // 🔧 CORREÇÃO ("técnico da área ser o líder da equipe" — vale
        // pra TODAS as áreas, não só uma): antes o "responsável" mostrado
        // no topo da tela era simplesmente o PRIMEIRO nome em ordem
        // alfabética da lista (a API devolve a equipe com ORDER BY
        // nome) — um pick totalmente arbitrário, sem relação nenhuma
        // com quem lidera a equipe de verdade. Agora procura primeiro
        // alguém cujo cargo (vindo da planilha do efetivo) contenha a
        // palavra "TECNICO" — que é quem exerce a liderança da equipe
        // da área — e só cai pro primeiro da lista se ninguém tiver esse
        // cargo cadastrado.
        //
        // A comparação ignora acento (normalizarTextoSemAcento) porque
        // a planilha tem cargos como "TECNICO DE MANUTENCAO MECANICA"
        // (sem acento) — comparar só com "TÉCNICO" (acentuado, cargo
        // exato) nunca batia com esses cargos reais, e a busca sempre
        // caía no fallback alfabético mesmo tendo um técnico na equipe.
        //
        // 🆕 Se a área tem só 1 pessoa cadastrada (ex: Paula, sozinha na
        // Ferramentaria), essa pessoa É a líder por padrão — não faz
        // sentido exigir o cargo "Técnico" quando não tem mais ninguém
        // pra escolher.
        const respTurno = document.getElementById('area-oficina-responsavel-turno');
        if (respTurno) {
            const lider = encontrarLiderEquipe(OFICINA_EQUIPE_ATUAL);
            const responsavel = lider || OFICINA_EQUIPE_ATUAL[0];
            respTurno.textContent = responsavel
                ? `${responsavel.nome}${lider ? ' (Líder)' : ''}`
                : 'Sem responsável definido';
        }

        // Seletor de Responsável (no formulário de atividade) — lista a
        // equipe real da área + opção "Outro" pra digitar um nome que
        // não está no roster (ex: um supervisor, ou área ainda sem
        // gente cadastrada na planilha do efetivo).
        if (selectResp) {
            selectResp.innerHTML = `<option value="">Selecione...</option>` +
                OFICINA_EQUIPE_ATUAL.map(p => `<option value="${p.nome}">${p.nome}${p.cargo ? ` — ${p.cargo}` : ''}</option>`).join('') +
                `<option value="__outro__">Outro (digitar nome)</option>`;
        }

        if (OFICINA_EQUIPE_ATUAL.length === 0) {
            container.innerHTML = `
                <div class="area-oficina-vazio">
                    <i class="fas fa-users"></i>
                    <p>Nenhum colaborador cadastrado nesta área ainda.</p>
                </div>
            `;
            return;
        }

        const liderDaArea = encontrarLiderEquipe(OFICINA_EQUIPE_ATUAL);
        container.innerHTML = OFICINA_EQUIPE_ATUAL.map(p => {
            const iniciais = p.nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
            const ehLider = !!liderDaArea && liderDaArea.matricula === p.matricula;
            return `
            <div class="equipe-card" style="${ehLider ? 'border-color:var(--area-color, var(--text-accent));' : ''}">
                <div class="equipe-avatar">${iniciais}</div>
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text-heading); font-size:13px;">${p.nome} ${ehLider ? '<i class="fas fa-star" style="color:var(--warning); font-size:10px;" title="Líder da equipe"></i>' : ''}</div>
                    ${p.cargo ? `<div class="text-muted" style="font-size:11px;">${p.cargo}</div>` : ''}
                </div>
            </div>
        `;
        }).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar a equipe da área:', e);
        container.innerHTML = `<div class="text-muted" style="font-size:12px;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
}

// --------------------------------------------------------------
// ANOTAÇÕES DA ÁREA (materiais/procedimento — provisório, texto livre)
// --------------------------------------------------------------
// --------------------------------------------------------------
// TOGGLE do seletor de Responsável: mostra o campo de texto livre só
// quando "Outro" é escolhido.
// --------------------------------------------------------------
window.alternarResponsavelOficina = function() {
    const select = document.getElementById('area-oficina-responsavel-select');
    const outro = document.getElementById('area-oficina-responsavel-outro');
    if (!select || !outro) return;
    outro.classList.toggle('hidden', select.value !== '__outro__');
    if (select.value === '__outro__') outro.focus();
};

function lerResponsavelFormOficina() {
    const select = document.getElementById('area-oficina-responsavel-select')?.value || '';
    if (select === '__outro__') {
        return document.getElementById('area-oficina-responsavel-outro')?.value.trim() || null;
    }
    return select || null;
}

// --------------------------------------------------------------
// MATERIAIS TÉCNICOS DA ÁREA
// --------------------------------------------------------------
let MATERIAIS_AREA_OFICINA_CACHE = [];

async function carregarMateriaisAreaOficina(chave) {
    const container = document.getElementById('area-oficina-materiais-lista');
    if (!container) return;
    container.innerHTML = `<div class="text-muted" style="font-size:12px;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        MATERIAIS_AREA_OFICINA_CACHE = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Não consegui carregar os materiais da área:', e);
        MATERIAIS_AREA_OFICINA_CACHE = [];
        container.innerHTML = `<div class="text-muted" style="font-size:12px;">Não foi possível carregar. Verifique sua internet.</div>`;
        return;
    }
    const busca = document.getElementById('area-oficina-busca-material');
    if (busca) busca.value = '';
    window.filtrarMateriaisAreaOficina();
}

window.filtrarMateriaisAreaOficina = function() {
    const container = document.getElementById('area-oficina-materiais-lista');
    if (!container) return;

    const termo = (document.getElementById('area-oficina-busca-material')?.value || '').toLowerCase().trim();
    let materiais = MATERIAIS_AREA_OFICINA_CACHE;
    if (termo) {
        materiais = materiais.filter(m =>
            (m.codigo || '').toLowerCase().includes(termo) ||
            (m.descricao || '').toLowerCase().includes(termo)
        );
    }

    const tabBtn = document.querySelector('#area-oficina-tabs .folhao-tab:nth-child(2)');
    if (tabBtn) tabBtn.innerHTML = `<i class="fas fa-boxes-stacked"></i> Materiais${MATERIAIS_AREA_OFICINA_CACHE.length ? ` (${MATERIAIS_AREA_OFICINA_CACHE.length})` : ''}`;

    if (materiais.length === 0) {
        container.innerHTML = `
            <div class="area-oficina-vazio">
                <i class="fas fa-boxes-stacked"></i>
                <p>${termo ? 'Nenhum material encontrado.' : 'Nenhum material cadastrado nesta área ainda — use o campo abaixo pra começar a lista.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="max-height:320px; overflow-y:auto;">
            ${materiais.map(m => `
                <div class="material-chip">
                    <div style="min-width:0; display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-cube" style="color:var(--area-color, var(--text-accent)); font-size:13px; flex-shrink:0;"></i>
                        <div style="min-width:0;">
                            <span class="font-code" style="font-weight:700; color:var(--text-heading); font-size:12px;">${m.codigo}</span>
                            <span style="font-size:12px; color:var(--text-body); margin-left:6px;">${m.descricao}</span>
                        </div>
                    </div>
                    <button class="btn-outline-danger" style="padding:3px 8px; font-size:11px; flex-shrink:0;" onclick="window.excluirMaterialAreaOficina(${m.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

window.adicionarMaterialAreaOficina = async function() {
    if (!verificarAcesso()) return;
    if (!OFICINA_AREA_ATUAL) return;

    const codigoEl = document.getElementById('area-oficina-material-codigo');
    const descricaoEl = document.getElementById('area-oficina-material-descricao');
    const codigo = codigoEl?.value.trim();
    const descricao = descricaoEl?.value.trim();

    if (!codigo || !descricao) return alert('Preencha código e descrição do material.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: OFICINA_AREA_ATUAL, codigo, descricao, operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível salvar o material.');
            return;
        }
        codigoEl.value = '';
        descricaoEl.value = '';
        await carregarMateriaisAreaOficina(OFICINA_AREA_ATUAL);
    } catch (e) {
        console.error('⚠️ Erro ao adicionar material:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.excluirMaterialAreaOficina = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir este material da lista da área?')) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir.');
            return;
        }
        await carregarMateriaisAreaOficina(OFICINA_AREA_ATUAL);
    } catch (e) {
        console.error('⚠️ Erro ao excluir material:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// ==============================================================
// PROCEDIMENTOS OPERACIONAIS (checklist de etapas por área)
// ==============================================================
// Conteúdo dos procedimentos (passo a passo, EPIs, ferramentas) vem de
// PROCEDIMENTOS_POR_AREA, definido em procedimentosOficina.js — este
// arquivo só cuida de MOSTRAR isso e registrar cada execução no banco.
let PROCEDIMENTO_ATUAL = null; // objeto do procedimento aberto no modal
let PROCEDIMENTO_ETAPAS_MARCADAS = new Set(); // ids das etapas marcadas na execução atual

// Lista, dentro da tela da área, quais procedimentos existem pra ela
// (card só aparece se houver pelo menos 1 cadastrado).
function renderProcedimentosArea(chave) {
    const tabBtn = document.getElementById('area-oficina-tab-btn-procedimentos');
    const lista = document.getElementById('area-oficina-procedimentos-lista');
    if (!tabBtn || !lista) return;

    const procedimentos = (window.PROCEDIMENTOS_POR_AREA && window.PROCEDIMENTOS_POR_AREA[chave]) || [];
    if (procedimentos.length === 0) {
        tabBtn.classList.add('hidden');
        return;
    }

    tabBtn.classList.remove('hidden');
    lista.innerHTML = procedimentos.map(p => `
        <div class="procedimento-card">
            <div style="min-width:0; display:flex; align-items:center; gap:10px;">
                <i class="fas fa-file-shield" style="color:var(--area-color, var(--text-accent)); font-size:14px; flex-shrink:0;"></i>
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text-heading); font-size:13px;">${p.nome}</div>
                    <div class="text-muted" style="font-size:11px;">Nº ${p.id} · Rev. ${p.revisao || '-'} · ${p.frequencia || ''}</div>
                </div>
            </div>
            <button class="btn-outline-neutral" style="flex-shrink:0; padding:6px 12px; font-size:11.5px;" onclick="window.abrirProcedimento('${chave}','${p.id}')">
                <i class="fas fa-clipboard-check"></i> Abrir
            </button>
        </div>
    `).join('');
}
window.renderProcedimentosArea = renderProcedimentosArea;

// Abre o modal com o procedimento completo (EPIs, ferramentas, checklist
// de etapas). Também busca a última execução registrada, só pra mostrar
// "última vez feito por Fulano em tal data" como referência.
window.abrirProcedimento = async function(chave, procedimentoId) {
    const procedimentos = (window.PROCEDIMENTOS_POR_AREA && window.PROCEDIMENTOS_POR_AREA[chave]) || [];
    const procedimento = procedimentos.find(p => p.id === procedimentoId);
    if (!procedimento) return;

    PROCEDIMENTO_ATUAL = { ...procedimento, area: chave };
    PROCEDIMENTO_ETAPAS_MARCADAS = new Set();

    document.getElementById('procedimento-titulo').textContent = procedimento.nome;
    document.getElementById('procedimento-meta').textContent =
        `Nº ${procedimento.id} · Revisão ${procedimento.revisao || '-'} (${procedimento.dataRevisao || ''}) · Frequência: ${procedimento.frequencia || '-'}`;

    const info = document.getElementById('procedimento-info');
    info.innerHTML = `
        ${procedimento.objetivo ? `<p style="margin-bottom:10px;"><strong>Objetivo:</strong> ${procedimento.objetivo}</p>` : ''}
        ${procedimento.responsavel ? `<p style="margin-bottom:10px;"><strong>Responsável:</strong> ${procedimento.responsavel}</p>` : ''}
        ${(procedimento.seguranca || []).length ? `<p style="margin-bottom:6px;"><strong>EPIs:</strong> ${procedimento.seguranca.join(', ')}</p>` : ''}
        ${(procedimento.ferramentas || []).length ? `<p style="margin-bottom:6px;"><strong>Ferramentas:</strong> ${procedimento.ferramentas.join(', ')}</p>` : ''}
        ${(procedimento.recomendacoes || []).length ? `<p style="margin-top:10px; color:var(--warning);"><strong><i class="fas fa-triangle-exclamation"></i> Recomendações de segurança:</strong><br>${procedimento.recomendacoes.join('<br>')}</p>` : ''}
        ${(procedimento.atencao || []).length ? `
            <div style="margin-top:14px; padding:12px; border-radius:8px; background:var(--danger-bg); border:1px solid var(--danger);">
                <strong style="color:var(--danger);"><i class="fas fa-ban"></i> O que NÃO deve ser feito:</strong>
                <ul style="margin:8px 0 0 18px; padding:0;">
                    ${procedimento.atencao.map(a => `<li style="margin-bottom:6px; color:var(--text-body);">${a}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;

    // 📏 Tabela de referência anexa (ex: valores de aferição de
    // Pass-Line por rolo) — só renderiza se o procedimento tiver uma.
    const containerTabela = document.getElementById('procedimento-tabela-referencia');
    if (containerTabela) {
        const tabela = procedimento.tabelaReferencia;
        if (tabela) {
            containerTabela.classList.remove('hidden');
            containerTabela.innerHTML = `
                <div style="font-weight:700; color:var(--text-accent); font-size:12px; margin-bottom:6px;">
                    <i class="fas fa-ruler"></i> ${tabela.titulo}
                </div>
                ${tabela.diametroApoios ? `<div class="text-muted" style="font-size:11.5px; margin-bottom:8px;">${tabela.diametroApoios}</div>` : ''}
                <div class="table-responsive">
                    <table class="premium-table" style="font-size:11.5px;">
                        <thead><tr>${tabela.colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${tabela.linhas.map(linha => `<tr>${linha.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            containerTabela.classList.add('hidden');
            containerTabela.innerHTML = '';
        }
    }

    renderizarEtapasProcedimento();

    const modal = document.getElementById('modal-procedimento');
    if (modal) modal.classList.remove('hidden');

    // Busca a última execução — só informativo, não bloqueia nada.
    const statusEl = document.getElementById('procedimento-ultima-execucao');
    if (statusEl) statusEl.textContent = '';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/procedimento/historico/${encodeURIComponent(chave)}?procedimento_id=${encodeURIComponent(procedimentoId)}&limite=1`, { cache: 'no-store' });
        const listaExec = resp.ok ? await resp.json() : [];
        if (statusEl && Array.isArray(listaExec) && listaExec.length > 0) {
            const ultima = listaExec[0];
            statusEl.textContent = ultima.concluido
                ? `Última execução concluída por ${ultima.operador || 'alguém'} em ${ultima.data_hora}`
                : `Última execução (parcial) por ${ultima.operador || 'alguém'} em ${ultima.data_hora}`;
        }
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do procedimento:', e);
    }
};

function renderizarEtapasProcedimento() {
    const container = document.getElementById('procedimento-etapas-lista');
    if (!container || !PROCEDIMENTO_ATUAL) return;

    const etapasReais = PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao);
    container.innerHTML = PROCEDIMENTO_ATUAL.etapas.map(e => {
        if (e.secao) {
            return `<div style="font-weight:700; color:var(--text-accent); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0;">${e.titulo}</div>`;
        }
        const marcada = PROCEDIMENTO_ETAPAS_MARCADAS.has(e.id);
        return `
            <label style="display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:8px; background:${marcada ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px; cursor:pointer; transition:background 0.15s;">
                <input type="checkbox" ${marcada ? 'checked' : ''} onchange="window.marcarEtapaProcedimento('${e.id}', this.checked)" style="margin-top:3px; width:18px; height:18px; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; color:var(--text-heading); font-weight:600;">${e.id} — ${e.texto}</div>
                    ${e.pontosChave ? `<div class="text-muted" style="font-size:11.5px; margin-top:3px;"><i class="fas fa-wrench" style="opacity:0.6;"></i> ${e.pontosChave}</div>` : ''}
                    ${e.seguranca ? `<div style="font-size:11.5px; margin-top:3px; color:var(--warning);"><i class="fas fa-triangle-exclamation"></i> ${e.seguranca}</div>` : ''}
                </div>
            </label>
        `;
    }).join('');

    atualizarProgressoProcedimento(etapasReais.length);
}

function atualizarProgressoProcedimento(totalEtapas) {
    const el = document.getElementById('procedimento-progresso');
    if (el) el.textContent = `${PROCEDIMENTO_ETAPAS_MARCADAS.size} / ${totalEtapas}`;
}

window.marcarEtapaProcedimento = function(etapaId, marcada) {
    if (marcada) PROCEDIMENTO_ETAPAS_MARCADAS.add(etapaId);
    else PROCEDIMENTO_ETAPAS_MARCADAS.delete(etapaId);
    const totalEtapas = PROCEDIMENTO_ATUAL ? PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao).length : 0;
    atualizarProgressoProcedimento(totalEtapas);
};

window.fecharModalProcedimento = function() {
    const modal = document.getElementById('modal-procedimento');
    if (modal) modal.classList.add('hidden');
    PROCEDIMENTO_ATUAL = null;
    PROCEDIMENTO_ETAPAS_MARCADAS = new Set();
};

window.concluirProcedimento = async function() {
    if (!verificarAcesso()) return;
    if (!PROCEDIMENTO_ATUAL) return;

    const etapasReais = PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao);
    const totalEtapas = etapasReais.length;
    const marcadas = PROCEDIMENTO_ETAPAS_MARCADAS.size;

    if (marcadas < totalEtapas) {
        const continuar = confirm(`Só ${marcadas} de ${totalEtapas} etapas foram marcadas. Concluir mesmo assim?`);
        if (!continuar) return;
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/procedimento/executar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: PROCEDIMENTO_ATUAL.area,
                procedimento_id: PROCEDIMENTO_ATUAL.id,
                procedimento_nome: PROCEDIMENTO_ATUAL.nome,
                etapas_marcadas: Array.from(PROCEDIMENTO_ETAPAS_MARCADAS),
                total_etapas: totalEtapas,
                concluido: true,
                operador
            })
        });

        if (!resp.ok) {
            alert('Não foi possível registrar a conclusão do procedimento.');
            return;
        }

        if (typeof window.registrarHistorico === 'function') {
            window.registrarHistorico(`OFICINA-${PROCEDIMENTO_ATUAL.area.toUpperCase()}`, `📋 Procedimento concluído: ${PROCEDIMENTO_ATUAL.nome} (${marcadas}/${totalEtapas} etapas).`);
        }

        alert(`✅ Procedimento "${PROCEDIMENTO_ATUAL.nome}" concluído!`);
        window.fecharModalProcedimento();
    } catch (e) {
        console.error('⚠️ Erro ao registrar conclusão do procedimento:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// EDITAR ATIVIDADE — reaproveita o formulário de "Nova Atividade".
// Ao clicar em editar, o formulário é preenchido com os dados atuais
// e o botão vira "Salvar Edição" até confirmar ou cancelar.
// --------------------------------------------------------------
window.editarAtividadeOficina = function(id) {
    const atividade = OFICINA_ATIVIDADES_CACHE.find(x => x.id === id);
    if (!atividade) return;

    setOficinaEditandoId(id);

    // Tipo (equipamento x avulsa) + equipamento selecionado
    window.alternarTipoAtividadeOficina(atividade.equipamento_id ? 'equipamento' : 'avulsa');
    const selectEquip = document.getElementById('area-oficina-equipamento');
    if (selectEquip && atividade.equipamento_id) selectEquip.value = atividade.equipamento_id;

    document.getElementById('area-oficina-descricao').value = atividade.descricao || '';
    document.getElementById('area-oficina-prioridade').value = atividade.prioridade || 'Normal';
    document.getElementById('area-oficina-prazo').value = atividade.prazo || '';
    document.getElementById('area-oficina-data-inicio').value = atividade.data_inicio || '';

    // Responsável: tenta achar na equipe carregada; se não achar
    // (pessoa não está no roster, ou já não existe mais), cai pro
    // campo "Outro" com o nome tal como estava salvo.
    const selectResp = document.getElementById('area-oficina-responsavel-select');
    const respExiste = atividade.responsavel && OFICINA_EQUIPE_ATUAL.some(p => p.nome === atividade.responsavel);
    if (selectResp) {
        if (respExiste) {
            selectResp.value = atividade.responsavel;
            window.alternarResponsavelOficina();
        } else if (atividade.responsavel) {
            selectResp.value = '__outro__';
            window.alternarResponsavelOficina();
            document.getElementById('area-oficina-responsavel-outro').value = atividade.responsavel;
        } else {
            selectResp.value = '';
            window.alternarResponsavelOficina();
        }
    }

    // 🔧 Foto não vem mais na listagem (ver comentário em
    // listar_atividades_oficina no backend — evitar baixar a foto de
    // TODA atividade só pra montar a grade). Se essa atividade tem foto
    // (`tem_foto`), busca sob demanda agora, só porque alguém abriu
    // pra editar. Sem tem_foto, nem tenta.
    setOficinaFotoBase64(null);
    const preview = document.getElementById('area-oficina-foto-preview');
    const previewContainer = document.getElementById('area-oficina-foto-preview-container');
    if (preview) preview.src = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (atividade.tem_foto) {
        (async () => {
            try {
                const apiBase = await resolverApiBase();
                const resp = await fetch(`${apiBase}/api/oficina/atividades/${id}/foto`);
                const dados = resp.ok ? await resp.json() : null;
                if (dados && dados.foto_base64 && OFICINA_EDITANDO_ID === id) {
                    setOficinaFotoBase64(dados.foto_base64);
                    if (preview) preview.src = OFICINA_FOTO_BASE64;
                    if (previewContainer) previewContainer.classList.remove('hidden');
                }
            } catch (e) {
                console.error('⚠️ Erro ao buscar foto da atividade:', e);
            }
        })();
    }

    // Muda a cara do formulário pra deixar claro que é uma edição
    document.getElementById('area-oficina-form-titulo').textContent = 'Editar Atividade';
    document.getElementById('area-oficina-form-icone').className = 'fas fa-pen';
    document.getElementById('area-oficina-btn-texto').textContent = 'Salvar Edição';
    document.getElementById('area-oficina-btn-icone').className = 'fas fa-save';
    document.getElementById('area-oficina-btn-cancelar').classList.remove('hidden');

    document.getElementById('area-oficina-descricao')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelarEdicaoAtividadeOficina = function() {
    setOficinaEditandoId(null);
    document.getElementById('area-oficina-form-titulo').textContent = 'Nova Atividade';
    document.getElementById('area-oficina-form-icone').className = 'fas fa-plus';
    document.getElementById('area-oficina-btn-texto').textContent = 'Lançar Atividade';
    document.getElementById('area-oficina-btn-icone').className = 'fas fa-check';
    document.getElementById('area-oficina-btn-cancelar').classList.add('hidden');
};

async function carregarNotaAreaOficina(chave) {
    const textarea = document.getElementById('area-oficina-notas');
    const statusEl = document.getElementById('area-oficina-notas-status');
    if (!textarea) return;
    textarea.value = '';
    if (statusEl) statusEl.textContent = '';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/nota/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        if (!resp.ok) return;
        const nota = await resp.json();
        textarea.value = nota?.texto || '';
        if (statusEl && nota?.atualizado_em) statusEl.textContent = `Última atualização: ${nota.atualizado_em}`;
    } catch (e) {
        console.error('⚠️ Não consegui carregar as anotações da área:', e);
    }
}

window.salvarNotaAreaOficina = async function() {
    if (!OFICINA_AREA_ATUAL) return;
    const textarea = document.getElementById('area-oficina-notas');
    const statusEl = document.getElementById('area-oficina-notas-status');
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/nota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: OFICINA_AREA_ATUAL, texto: textarea.value, operador })
        });
        if (statusEl) statusEl.textContent = `Salvo agora (${new Date().toLocaleTimeString('pt-BR')})`;
    } catch (e) {
        console.error('⚠️ Não consegui salvar as anotações da área:', e);
        if (statusEl) statusEl.textContent = '⚠️ Não foi possível salvar — verifique sua internet.';
    }
};

// ==========================================

