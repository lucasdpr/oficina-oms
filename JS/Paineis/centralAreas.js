// ==========================================================================
// CENTRAL DE ÁREAS — extraído de script.js na modularização
// ==========================================================================
// Grid único com o status de cada área (Oficina + Administrativo),
// calculado a partir das atividades em aberto. Inclui a Atividade em
// Massa (só ADM) e o polling rápido que mantém a grade atualizada.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, OFICINA_AREA_ATUAL, OFICINA_ATIVIDADES_CACHE, setOficinaAtividadesCache } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { executarSeguroAsync, atividadeEstaAtrasada, atividadeAindaNaoComecou } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// CENTRAL DE ÁREAS — Grid único (Oficina + Administrativo)
// ==========================================
// Calcula o status operacional de uma área de Oficina a partir das
// atividades em aberto (não existe sensor real — é a melhor proxy que
// temos hoje a partir do que já é lançado no sistema).
//   🔴 Crítico   -> tem atividade atrasada
//   🟠 Restrição -> 5+ atividades pendentes/andamento (fila grande)
//   🟡 Atenção   -> 1 a 4 pendentes/andamento
//   🟢 Normal    -> tudo concluído / nada pendente
function calcularStatusArea(chave) {
    // 🐛 CORRIGIDO: só contava x.area === chave, sem incluir atividades
    // onde essa área é só SOLICITANTE (executada por outra área) — a
    // mesma atividade aparece no card "Pedido por esta área..." da
    // lista logo abaixo (ver todasDaArea, linha ~4790), mas o badge de
    // status no topo da tela e no card da Central de Áreas ficava
    // "🟢 Normal" mesmo com uma atividade pendente/atrasada pedida por
    // essa área e sendo feita em outro lugar.
    const doArea = OFICINA_ATIVIDADES_CACHE.filter(x => x.area === chave || x.solicitante_area === chave);
    const pendentes = doArea.filter(x => x.status === 'Pendente').length;
    const andamento = doArea.filter(x => x.status === 'Em Andamento').length;
    const atrasadas = doArea.filter(x => atividadeEstaAtrasada(x)).length;
    const emAberto = pendentes + andamento;

    let status;
    if (atrasadas > 0) status = { emoji: '🔴', label: 'Crítico', cor: 'var(--danger)' };
    else if (emAberto >= 5) status = { emoji: '🟠', label: 'Restrição', cor: 'var(--limit)' };
    else if (emAberto >= 1) status = { emoji: '🟡', label: 'Atenção', cor: 'var(--warning)' };
    else status = { emoji: '🟢', label: 'Normal', cor: 'var(--success)' };

    return { ...status, pendentes, andamento, atrasadas, emAberto };
}
window.calcularStatusArea = calcularStatusArea;

let CENTRAL_AREAS_FILTRO_STATUS = '';
let CENTRAL_AREAS_BUSCA = '';
let CENTRAL_AREAS_ORDEM = 'prioridade'; // 🆕 'prioridade' (padrão, já existia) | 'nome'

window.filtrarCentralAreas = function(statusLabel, botao) {
    CENTRAL_AREAS_FILTRO_STATUS = statusLabel;
    document.querySelectorAll('#central-areas-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botao) botao.classList.add('active');
    renderizarGridCentralAreas();
};

window.buscarCentralAreas = function(valor) {
    CENTRAL_AREAS_BUSCA = (valor || '').toLowerCase().trim();
    renderizarGridCentralAreas();
};

window.ordenarCentralAreas = function(valor) {
    CENTRAL_AREAS_ORDEM = valor;
    renderizarGridCentralAreas();
};

// 🆕 "Prioridades agora" (referência mandada pelo usuário) — ranking
// das áreas mais urgentes, sem precisar escanear a grade inteira. Não
// é dado novo: mesma severidade/pendências que já colorem os cards,
// só ordenado e resumido numa lista curta. Só entra quem tem pelo
// menos 1 pendência em aberto (Normal com 0 não é "prioridade").
function renderizarPrioridadesAgora(todasComStatus) {
    const container = document.getElementById('oficina-prioridades-lista');
    if (!container) return;

    const ORDEM_SEVERIDADE = { 'Crítico': 0, 'Atenção': 1, 'Normal': 2 };
    const prioridades = todasComStatus
        .filter(v => v.status.emAberto > 0)
        .sort((a, b) => {
            const diff = ORDEM_SEVERIDADE[a.status.label] - ORDEM_SEVERIDADE[b.status.label];
            return diff !== 0 ? diff : b.status.emAberto - a.status.emAberto;
        })
        .slice(0, 5);

    if (prioridades.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:16px 0; font-size:13px;"><i class="fas fa-circle-check" style="color:var(--success);"></i> Nenhuma pendência em aberto agora.</div>`;
        return;
    }

    container.innerHTML = prioridades.map((v, i) => `
        <div class="oficina-prioridade-item" onclick="window.abrirAreaOficina('${v.area.chave}')">
            <span class="oficina-prioridade-num" style="background:${v.status.cor};">${i + 1}</span>
            <span class="oficina-prioridade-nome">${v.area.nome}</span>
            <span class="oficina-prioridade-qtd" style="color:${v.status.cor};">${v.status.emAberto} pendênc${v.status.emAberto > 1 ? 'ias' : 'ia'}</span>
        </div>
    `).join('');
}

function renderizarGridCentralAreas() {
    const grid = document.getElementById('oficina-grade-areas');
    if (!grid) return;

    const areasOficina = AREAS_OFICINA.filter(a => a.tipo === 'oficina');
    const areasAdmin = AREAS_OFICINA.filter(a => a.tipo === 'administrativo');

    // 🔧 CORREÇÃO (referência mandada pelo usuário): a referência só tem
    // 3 níveis de severidade (Crítica/Atenção/Normal), não 4 — o cálculo
    // em calcularStatusArea() continua com a granularidade original
    // (Restrição = 5+ itens em aberto, mais grave que Atenção = 1-4) pra
    // não perder informação nos outros lugares que usam essa função
    // (quadro da própria área, etc.); só AQUI, na Central de Áreas, o
    // rótulo exibido funde Restrição dentro de Atenção — mesmo balde
    // visual da referência.
    const todasComStatus = areasOficina.map(a => {
        const status = calcularStatusArea(a.chave);
        if (status.label === 'Restrição') {
            status.label = 'Atenção';
            status.cor = 'var(--warning)';
            status.emoji = '🟡';
        }
        return { area: a, status };
    });

    // 🆕 "Prioridades agora" sempre reflete TODAS as áreas, mesmo com
    // busca/filtro ativos na grade — mesmo princípio já usado no resumo
    // da Central de Notificações (ver atualizarResumoNotificacoes):
    // filtrar pra focar não devia esconder o que é urgente lá fora.
    renderizarPrioridadesAgora(todasComStatus);

    let visiveis = todasComStatus;
    if (CENTRAL_AREAS_BUSCA) {
        visiveis = visiveis.filter(v => v.area.nome.toLowerCase().includes(CENTRAL_AREAS_BUSCA));
    }
    if (CENTRAL_AREAS_FILTRO_STATUS) {
        visiveis = visiveis.filter(v => v.status.label === CENTRAL_AREAS_FILTRO_STATUS);
    }

    // 🆕 Proposta A (Central de Áreas — "está esquisita"): antes todo card
    // tinha o mesmo peso visual, sem nada guiando o olho pro que precisa
    // de atenção primeiro. Ordena por severidade (Crítico > Restrição >
    // Atenção > Normal, empate por mais itens em aberto) — não muda o
    // formato de grid, só a hierarquia de leitura.
    // 🆕 "Ordenar por" (referência mandada pelo usuário): "Prioridade" é
    // a ordenação por severidade que já existia (agora com opção pra
    // trocar, antes era fixa); "Nome" é nova, alfabética simples.
    if (CENTRAL_AREAS_ORDEM === 'nome') {
        visiveis.sort((a, b) => a.area.nome.localeCompare(b.area.nome, 'pt-BR'));
    } else {
        const ORDEM_SEVERIDADE = { 'Crítico': 0, 'Atenção': 1, 'Normal': 2 };
        visiveis.sort((a, b) => {
            const diff = ORDEM_SEVERIDADE[a.status.label] - ORDEM_SEVERIDADE[b.status.label];
            return diff !== 0 ? diff : b.status.emAberto - a.status.emAberto;
        });
    }

    // 🆕 Peso visual real pro card crítico (não só a cor da faixa de
    // topo): elevação/sombra mais forte + fundo levemente saturado na
    // cor de severidade. De propósito SEM reduzir opacidade dos card
    // normais — passaria a impressão de "desabilitado/com problema"
    // pra quem escaneia rápido, quando o normal é exatamente "tudo
    // certo por aqui". Só Crítico ganha o destaque; Restrição/Atenção
    // continuam só com a faixa de cor (já é hierarquia suficiente pra
    // eles, o crítico é o que precisa saltar aos olhos).
    // 🆕 Barra de progresso por card (referência mandada pelo usuário):
    // % do trabalho em aberto que já está em andamento (não só parado
    // pendente) — sem nada em aberto, conta como 100% (nada travado).
    // Não é um dado novo, só uma leitura visual do que a.status já
    // calcula (pendentes/andamento/emAberto).
    const cardsOficina = visiveis.map(({ area: a, status: s }) => {
        const progresso = s.emAberto > 0 ? Math.round((s.andamento / s.emAberto) * 100) : 100;
        return `
        <div class="oficina-area-card ${s.label === 'Crítico' ? 'oficina-area-card-critico' : ''}" style="--area-severidade-cor:${s.cor};" onclick="window.abrirAreaOficina('${a.chave}')">
            <div class="oficina-area-topo">
                <div class="oficina-area-icone"><i class="fas ${a.icone}"></i></div>
                <span class="oficina-area-status-badge" style="color:${s.cor};">${s.emoji} ${s.label}</span>
            </div>
            <h4>${a.nome}</h4>
            <div class="oficina-area-resumo">
                <span title="Pendentes"><i class="fas fa-hourglass-half"></i> ${s.pendentes} pendente${s.pendentes === 1 ? '' : 's'}</span>
                <span title="Em andamento"><i class="fas fa-person-running"></i> ${s.andamento} em andamento</span>
                ${s.atrasadas > 0 ? `<span title="Atrasadas" style="color:var(--danger);"><i class="fas fa-triangle-exclamation"></i> ${s.atrasadas} atrasada${s.atrasadas === 1 ? '' : 's'}</span>` : ''}
            </div>
            <div class="oficina-area-progresso" title="${progresso}% do trabalho em aberto já em andamento">
                <div class="oficina-area-progresso-trilha">
                    <div class="oficina-area-progresso-barra" style="width:${progresso}%; background:${s.cor};"></div>
                </div>
                <span class="oficina-area-progresso-texto">${progresso}%</span>
            </div>
            <button class="oficina-area-acessar">Acessar Área <i class="fas fa-arrow-right"></i></button>
        </div>
    `;
    }).join('');

    let cardsAdmin = '';
    if (!CENTRAL_AREAS_FILTRO_STATUS) {
        let admVisiveis = areasAdmin;
        if (CENTRAL_AREAS_BUSCA) admVisiveis = admVisiveis.filter(a => a.nome.toLowerCase().includes(CENTRAL_AREAS_BUSCA));
        if (admVisiveis.length > 0) {
            cardsAdmin = `
                <div class="central-areas-secao-titulo">Painéis Administrativos</div>
                <div id="oficina-grade-areas-admin" class="oficina-grade">
                    ${admVisiveis.map(a => `
                        <div class="oficina-area-card oficina-area-card-admin" onclick="window.abrirAreaOficina('${a.chave}')">
                            <div class="oficina-area-topo">
                                <div class="oficina-area-icone"><i class="fas ${a.icone}"></i></div>
                            </div>
                            <h4>${a.nome}</h4>
                            <button class="oficina-area-acessar">Acessar Área <i class="fas fa-arrow-right"></i></button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    if (visiveis.length === 0 && !cardsAdmin) {
        grid.outerHTML = `<div id="oficina-grade-areas" class="area-oficina-vazio" style="padding:40px 0;">
            <i class="fas fa-magnifying-glass"></i>
            <p>Nenhuma área encontrada com esse filtro/busca.</p>
        </div>`;
        return;
    }

    grid.outerHTML = `<div id="oficina-grade-areas" class="oficina-grade">${cardsOficina}</div>${cardsAdmin}`;
}

window.carregarOficina = async function() {
    const container = document.getElementById('oficina-container');
    if (!container) return;

    container.innerHTML = `
        <div class="central-areas-toolbar">
            <div class="login-input-wrapper" style="position:relative; flex:1; min-width:200px;">
                <input type="text" id="central-areas-busca" placeholder="Buscar área..." oninput="window.buscarCentralAreas(this.value)" style="height:38px; border-radius:6px; padding-left:38px; width:100%;">
                <i class="fas fa-search login-input-icon" style="top:10px; font-size:13px; color:#a855f7;"></i>
            </div>
            <div class="mcc-filter-group" id="central-areas-filtros">
                <button class="btn-filter-mcc active" onclick="window.filtrarCentralAreas('', this)">Todas</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Crítico', this)">🔴 Crítica</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Atenção', this)">🟡 Atenção</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Normal', this)">🟢 Normal</button>
            </div>
            <!-- 🆕 Ordenar por (referência mandada pelo usuário): "Prioridade"
                 é a ordenação por severidade que já existia (sem opção antes
                 de mudar); "Nome (A-Z)" é nova. -->
            <select id="central-areas-ordenar" class="premium-select" style="height:38px; width:auto;" onchange="window.ordenarCentralAreas(this.value)">
                <option value="prioridade">Ordenar por: Prioridade</option>
                <option value="nome">Ordenar por: Nome (A-Z)</option>
            </select>
            ${OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm ? `
                <button class="btn-outline-neutral" onclick="window.abrirModalAtividadeMassa()">
                    <i class="fas fa-layer-group"></i> Atividade em Massa
                </button>
            ` : ''}
        </div>
        <div class="oficina-areas-layout">
            <!-- 🔧 wrapper próprio (não o grid de 2 colunas direto): o JS
                 troca #oficina-grade-areas por "grade + Painéis
                 Administrativos" junto (outerHTML com 2 nós de uma vez) —
                 sem esse wrapper, o segundo nó (Painéis Administrativos)
                 vira irmão direto dentro do grid de 2 colunas da direita,
                 empurrando o painel de prioridades pra linha de baixo. -->
            <div class="oficina-areas-principal">
                <div id="oficina-grade-areas" class="oficina-grade"></div>
            </div>
            <!-- 🆕 "Prioridades agora" (referência mandada pelo usuário):
                 ranking das áreas mais urgentes, pra não precisar escanear
                 a grade inteira procurando o que precisa de atenção
                 primeiro. Não é dado novo — mesmo cálculo de severidade/
                 pendências que já colore os cards, só resumido em lista. -->
            <div class="oficina-prioridades-painel">
                <h3><i class="fas fa-list-ol" style="color:var(--danger);"></i> Prioridades agora</h3>
                <div id="oficina-prioridades-lista"></div>
            </div>
        </div>
    `;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        setOficinaAtividadesCache(Array.isArray(todas) ? todas : []);
    } catch (e) {
        console.error('⚠️ Não consegui carregar as atividades da oficina:', e);
        setOficinaAtividadesCache([]);
    }

    CENTRAL_AREAS_FILTRO_STATUS = '';
    CENTRAL_AREAS_BUSCA = '';
    renderizarGridCentralAreas();
    atualizarKpisOficina();

    if (OFICINA_AREA_ATUAL) window.renderizarAtividadesArea();
};

// 🔧 CORREÇÃO ("tela fica piscando, parece que tá recarregando sozinha"):
// o auto-refresh de 15s (REFRESH_POR_ABA) chamava window.carregarOficina()
// direto, que reconstrói a toolbar inteira do zero (innerHTML) e ZERA
// CENTRAL_AREAS_BUSCA/FILTRO_STATUS a cada chamada — na prática, a cada
// 15s o campo de busca esvaziava, o filtro voltava pra "Todas" e a
// ordenação voltava pra "Prioridade", mesmo que a pessoa tivesse acabado
// de mexer neles um segundo antes. Esta versão só busca dado novo e
// redesenha a GRADE (preservando busca/filtro/ordenação já escolhidos),
// sem tocar na toolbar — é o que o auto-refresh deveria ter chamado
// desde o início.
// 🆕 CORREÇÃO ("se um técnico atualizar algo tem que atualizar todos
// envolvidos na atividade"): o auto-refresh geral (REFRESH_POR_ABA) já
// cobria a tela de área, mas só a cada 15s — rápido demais pra sentir
// "sincronizado igual chat" quando duas pessoas de áreas diferentes
// (ex: Molde pedindo, Caldeiraria executando) estão olhando a MESMA
// atividade ao mesmo tempo e uma delas muda o status. Mesmo espírito
// do polling rápido do chat: um timer À PARTE, só enquanto a tela de
// uma área está de fato aberta, que se autodesarma sozinho ao sair.
const INTERVALO_POLLING_RAPIDO_AREA_MS = 4000;
let TIMER_POLLING_RAPIDO_AREA = null;

window.iniciarPollingRapidoArea = function() {
    window.pararPollingRapidoArea();
    TIMER_POLLING_RAPIDO_AREA = setInterval(() => {
        const aba = document.getElementById('aba-area-oficina');
        if (!aba || !aba.classList.contains('active') || !OFICINA_AREA_ATUAL) {
            window.pararPollingRapidoArea();
            return;
        }
        executarSeguroAsync(async () => {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
            const todas = resp.ok ? await resp.json() : [];
            setOficinaAtividadesCache(Array.isArray(todas) ? todas : []);
            window.renderizarAtividadesArea();
            if (typeof window.carregarOsDaArea === 'function') await window.carregarOsDaArea();
        }, 'pollingRapidoArea');
    }, INTERVALO_POLLING_RAPIDO_AREA_MS);
};

window.pararPollingRapidoArea = function() {
    if (TIMER_POLLING_RAPIDO_AREA) {
        clearInterval(TIMER_POLLING_RAPIDO_AREA);
        TIMER_POLLING_RAPIDO_AREA = null;
    }
};

window.atualizarOficinaSilencioso = async function() {
    if (!document.getElementById('oficina-grade-areas')) {
        // Toolbar ainda nem foi montada (1ª vez nesta sessão) — só a
        // versão completa constrói o HTML da tela.
        return window.carregarOficina();
    }
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        setOficinaAtividadesCache(Array.isArray(todas) ? todas : []);
    } catch (e) {
        console.error('⚠️ Não consegui atualizar as atividades da oficina (mantendo a lista anterior):', e);
        return;
    }
    renderizarGridCentralAreas();
    atualizarKpisOficina();
    if (OFICINA_AREA_ATUAL) window.renderizarAtividadesArea();
};

// ==========================================
// 🆕 ATIVIDADE EM MASSA (só ADM) — cria a mesma atividade em várias
// áreas de uma vez, ou em todas, reaproveitando o mesmo endpoint que
// já existe pra criar 1 atividade (POST /api/oficina/atividade), só
// que chamado uma vez por área selecionada.
// ==========================================
window.abrirModalAtividadeMassa = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.isAdm) return;

    const descEl = document.getElementById('massa-descricao');
    const prioEl = document.getElementById('massa-prioridade');
    const inicioEl = document.getElementById('massa-data-inicio');
    const prazoEl = document.getElementById('massa-prazo');
    const respEl = document.getElementById('massa-responsavel');
    const todasEl = document.getElementById('massa-todas-areas');
    if (descEl) descEl.value = '';
    if (prioEl) prioEl.value = 'Normal';
    if (inicioEl) inicioEl.value = '';
    if (prazoEl) prazoEl.value = '';
    if (respEl) respEl.value = '';
    if (todasEl) todasEl.checked = false;

    const areasOficina = AREAS_OFICINA.filter(a => a.tipo === 'oficina');
    const lista = document.getElementById('massa-lista-areas');
    if (lista) {
        lista.innerHTML = areasOficina.map(a => `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 2px; cursor:pointer;">
                <input type="checkbox" class="massa-area-checkbox" value="${a.chave}">
                <span>${a.nome}</span>
            </label>
        `).join('');
    }
    document.getElementById('modal-atividade-massa')?.classList.remove('hidden');
};

window.fecharModalAtividadeMassa = function() {
    document.getElementById('modal-atividade-massa')?.classList.add('hidden');
};

window.alternarTodasAreasMassa = function(marcado) {
    document.querySelectorAll('.massa-area-checkbox').forEach(cb => { cb.checked = marcado; });
};

window.confirmarAtividadeMassa = async function() {
    if (!verificarAcesso()) return;

    const descricao = document.getElementById('massa-descricao')?.value.trim();
    if (!descricao) return alert('Descreva a atividade.');

    const prioridade = document.getElementById('massa-prioridade')?.value || 'Normal';
    const prazo = document.getElementById('massa-prazo')?.value || null;
    const dataInicio = document.getElementById('massa-data-inicio')?.value || null;
    const responsavel = document.getElementById('massa-responsavel')?.value.trim() || null;
    const areasSelecionadas = Array.from(document.querySelectorAll('.massa-area-checkbox:checked')).map(cb => cb.value);

    if (areasSelecionadas.length === 0) return alert('Selecione pelo menos uma área (ou marque "Selecionar todas").');
    if (dataInicio && prazo && dataInicio > prazo) {
        return alert('A Data de Início não pode ser depois do Prazo.');
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'ADM') : 'Sistema';
    let sucesso = 0, falha = 0;

    try {
        const apiBase = await resolverApiBase();
        for (const chave of areasSelecionadas) {
            try {
                const resp = await fetch(`${apiBase}/api/oficina/atividade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        area: chave,
                        equipamento_id: null,
                        descricao,
                        responsavel,
                        prioridade,
                        prazo,
                        data_inicio: dataInicio,
                        foto_base64: null,
                        operador
                    })
                });
                if (resp.ok) sucesso++; else falha++;
            } catch (e) {
                falha++;
            }
        }
    } catch (e) {
        console.error('⚠️ Erro ao resolver a API base pra atividade em massa:', e);
        alert('Não foi possível conectar ao servidor.');
        return;
    }

    alert(`✅ Atividade criada em ${sucesso} área(s).${falha > 0 ? ` ⚠️ Não foi possível criar em ${falha} área(s).` : ''}`);
    window.fecharModalAtividadeMassa();
    if (typeof window.carregarOficina === 'function') window.carregarOficina();
};

// (atividadeEstaAtrasada e atividadeAindaNaoComecou agora vêm de Core/utils.js)

// --------------------------------------------------------------
// KPIs GLOBAIS DA OFICINA (topo da aba, acima da grade de áreas)
// --------------------------------------------------------------
// 🔧 CORREÇÃO (referência mandada pelo usuário): resumo virou por ÁREA
// (quantas estão Crítico/Restrição+Atenção/Normal), não mais por
// atividade solta — mesma classificação que já colore a faixa de topo
// de cada card (calcularStatusArea), só somada aqui. "Em Andamento"
// continua sendo atividade (não faz sentido contar área "em andamento").
function atualizarKpisOficina() {
    const emAndamento = OFICINA_ATIVIDADES_CACHE.filter(x => x.status === 'Em Andamento').length;

    const areas = AREAS_OFICINA.filter(a => a.tipo === 'oficina');
    let criticas = 0, atencao = 0, normais = 0;
    areas.forEach(a => {
        const s = calcularStatusArea(a.chave);
        if (s.label === 'Crítico') criticas++;
        else if (s.label === 'Restrição' || s.label === 'Atenção') atencao++;
        else normais++;
    });

    const definirTexto = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };
    definirTexto('oficina-kpi-criticas', criticas);
    definirTexto('oficina-kpi-atencao', atencao);
    definirTexto('oficina-kpi-normais', normais);
    definirTexto('oficina-kpi-andamento', emAndamento);
}

