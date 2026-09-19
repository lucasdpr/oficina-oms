// ==========================================================================
// PAINÉIS ADMINISTRATIVOS — extraído de script.js na modularização
// ==========================================================================
// As 3 áreas "administrativas" (Almoxarifado, Ponte Rolante, Logística)
// e o Painel Executivo genérico do ADM abrem um modal/aba comum em vez
// do fluxo de "12 áreas técnicas" da Oficina — conteúdo diferente por
// área, mas o mesmo container.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { AREAS_OFICINA } from '../Core/dados.js';

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


