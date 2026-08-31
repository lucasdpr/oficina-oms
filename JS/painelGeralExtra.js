// painelGeralExtra.js
// Reforço do Painel Geral OMS, pensado pra supervisor/gerente:
// 1) Ranking de risco por Veio/MCC (a partir de BANCO_ATIVOS, já existente)
// 2) Atividades atrasadas em toda a Oficina (mesma regra de /api/oficina/atividades)
// 3) Produção lançada por MCC hoje e nos últimos 7 dias (/api/historico_apontamentos_geral)
//
// Nenhum campo novo de banco foi criado — tudo aqui é agregação de dado
// que o sistema já registra e persiste.

import { BANCO_ATIVOS, resolverApiBase } from './Core/banco.js?v=5';

// ==============================================================
// 1) RANKING DE RISCO POR VEIO
// ==============================================================
function renderRankingVeios() {
    const container = document.getElementById('painel-ranking-veios');
    if (!container) return;

    const grupos = {};
    BANCO_ATIVOS.forEach(a => {
        if (!a.veio) return; // só peças de fato instaladas num veio
        const mcc = a.mcc_compat || '?';
        const chave = `MCC ${mcc} · Veio ${a.veio}`;
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
        if (!grupos[chave]) grupos[chave] = { soma: 0, qtd: 0, criticos: 0 };
        grupos[chave].soma += pct;
        grupos[chave].qtd += 1;
        if (pct >= 80) grupos[chave].criticos += 1;
    });

    const linhas = Object.entries(grupos)
        .map(([chave, g]) => ({ chave, media: g.soma / g.qtd, qtd: g.qtd, criticos: g.criticos }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 6);

    if (linhas.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Sem ativos instalados em veios no momento.</div>`;
        return;
    }

    const maiorMedia = Math.max(...linhas.map(l => l.media), 1);

    container.innerHTML = linhas.map(l => {
        const corBarra = l.media >= 80 ? '#ef4444' : (l.media >= 50 ? '#f59e0b' : '#22c55e');
        const larguraPct = Math.min(100, (l.media / maiorMedia) * 100);
        return `
            <div style="margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px; font-size:13px; margin-bottom:4px;">
                    <span style="font-weight:600; color:var(--text-heading);">${l.chave}</span>
                    <span style="color:${corBarra}; font-weight:700;">
                        ${l.media.toFixed(1)}% méd.
                        ${l.criticos > 0 ? ` · ${l.criticos} crítico${l.criticos > 1 ? 's' : ''}` : ''}
                    </span>
                </div>
                <div style="background:var(--bg-th); border-radius:6px; height:8px; overflow:hidden;">
                    <div style="width:${larguraPct}%; height:100%; background:${corBarra};"></div>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${l.qtd} ativo${l.qtd > 1 ? 's' : ''} nesse veio</div>
            </div>
        `;
    }).join('');
}

// ==============================================================
// 2) ATIVIDADES ATRASADAS EM TODA A OFICINA
// ==============================================================
function atividadeEstaAtrasadaLocal(x) {
    if (x.status === 'Concluído' || !x.prazo) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.prazo < hoje;
}

async function renderAtrasadasGlobais() {
    const container = document.getElementById('painel-atrasadas-globais');
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        const lista = Array.isArray(todas) ? todas : [];

        const atrasadas = lista.filter(atividadeEstaAtrasadaLocal);

        if (atrasadas.length === 0) {
            container.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; color:var(--success);">
                    <i class="fas fa-check-circle" style="font-size:1.4rem;"></i>
                    <span>Nenhuma atividade atrasada em nenhuma área.</span>
                </div>
            `;
            return;
        }

        // Agrupa por área pra facilitar cobrança do gerente
        const porArea = {};
        atrasadas.forEach(a => {
            const area = a.area || a.chave || 'Área não identificada';
            porArea[area] = (porArea[area] || 0) + 1;
        });
        const rankingAreas = Object.entries(porArea).sort((a, b) => b[1] - a[1]).slice(0, 5);

        container.innerHTML = `
            <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px;">
                <span style="font-size:2rem; font-weight:800; color:var(--danger);">${atrasadas.length}</span>
                <span style="color:var(--text-muted); font-size:13px;">atividade${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''} no total</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                ${rankingAreas.map(([area, qtd]) => `
                    <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 10px; background:var(--bg-th); border-radius:6px; border-left:3px solid var(--danger);">
                        <span>${area}</span>
                        <span style="font-weight:700; color:var(--danger);">${qtd}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar atividades atrasadas:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
    }
}

// ==============================================================
// 3) PRODUÇÃO LANÇADA POR MCC (hoje e últimos 7 dias)
//    Tonelagem (equipamentos gerais) + Panelas de Molde (corridas),
//    que são dois fluxos de apontamento separados no sistema.
// ==============================================================
async function renderProducaoLancada() {
    const container = document.getElementById('painel-producao-lancada');
    if (!container) return;

    function somarPeriodo(logs) {
        const hojeStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const totais = { hoje: { mcc2: 0, mcc3: 0, mcc4: 0 }, semana: { mcc2: 0, mcc3: 0, mcc4: 0 } };

        logs.filter(l => l.desfeito !== 1).forEach(log => {
            if (!log.data_hora) return;
            const dataUTC = new Date(log.data_hora.replace(' ', 'T') + 'Z');
            const dataLocalStr = dataUTC.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            if (dataUTC.getTime() >= seteDiasAtras) {
                totais.semana.mcc2 += log.qtd_mcc2 || 0;
                totais.semana.mcc3 += log.qtd_mcc3 || 0;
                totais.semana.mcc4 += log.qtd_mcc4 || 0;
            }
            if (dataLocalStr === hojeStr) {
                totais.hoje.mcc2 += log.qtd_mcc2 || 0;
                totais.hoje.mcc3 += log.qtd_mcc3 || 0;
                totais.hoje.mcc4 += log.qtd_mcc4 || 0;
            }
        });
        return totais;
    }

    try {
        const apiBase = await resolverApiBase();
        const [respGeral, respMoldes] = await Promise.all([
            fetch(`${apiBase}/api/historico_apontamentos_geral`, { cache: 'no-store' }),
            fetch(`${apiBase}/api/historico_apontamentos_moldes`, { cache: 'no-store' })
        ]);
        const logsGeral = respGeral.ok ? await respGeral.json() : [];
        const logsMoldes = respMoldes.ok ? await respMoldes.json() : [];

        const totaisTon = somarPeriodo(Array.isArray(logsGeral) ? logsGeral : []);
        const totaisPanelas = somarPeriodo(Array.isArray(logsMoldes) ? logsMoldes : []);

        const linha = (label, cor, dados, unidade) => `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding:8px 10px; background:var(--bg-th); border-radius:6px; border-left:3px solid ${cor}; margin-bottom:6px;">
                <span style="font-size:12px; font-weight:600;">${label}</span>
                <span style="font-family:var(--font-mono, monospace); font-size:12px; line-height:1.6;">
                    <b>${dados.mcc2.toLocaleString('pt-BR')}</b> MCC2 ·
                    <b>${dados.mcc3.toLocaleString('pt-BR')}</b> MCC3 ·
                    <b>${dados.mcc4.toLocaleString('pt-BR')}</b> MCC4
                    <span style="color:var(--text-muted);"> ${unidade}</span>
                </span>
            </div>
        `;

        container.innerHTML = `
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Tonelagem</div>
            ${linha('Hoje', '#3b82f6', totaisTon.hoje, 'ton')}
            ${linha('Últimos 7 dias', '#8b5cf6', totaisTon.semana, 'ton')}
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin:14px 0 6px 0;">Panelas de Molde</div>
            ${linha('Hoje', '#f97316', totaisPanelas.hoje, 'panelas')}
            ${linha('Últimos 7 dias', '#eab308', totaisPanelas.semana, 'panelas')}
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar a produção lançada:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
    }
}

// ==============================================================
// ORQUESTRADOR — chamado junto com o resto do Painel Geral
// ==============================================================
window.renderPainelGeralExtra = function() {
    renderRankingVeios();
    renderAtrasadasGlobais();
    renderProducaoLancada();
};

export { renderRankingVeios, renderAtrasadasGlobais, renderProducaoLancada };