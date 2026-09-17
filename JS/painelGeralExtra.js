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
        const corBarra = l.media >= 80 ? 'var(--danger)' : (l.media >= 50 ? 'var(--warning)' : 'var(--success)');
        const larguraPct = Math.min(100, (l.media / maiorMedia) * 100);
        return `
            <div style="margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:13px; margin-bottom:4px;">
                    <span style="font-weight:600; color:var(--text-heading);">${l.chave}</span>
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="color:${corBarra}; font-weight:700;">${l.media.toFixed(1)}% méd.</span>
                        ${l.criticos > 0 ? `<span style="font-size:11px; font-weight:700; color:var(--danger); background:var(--danger-bg); padding:2px 8px; border-radius:12px;">${l.criticos} crítico${l.criticos > 1 ? 's' : ''}</span>` : ''}
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

        // 🆕 Tag de variação percentual (pedido do usuário, referência
        // "John Hardward") — só aqui, onde já existe dado histórico real
        // (hoje x últimos 7 dias, já buscado acima). Compara o total de
        // hoje com a MÉDIA DIÁRIA da semana (soma da semana ÷ 7), não
        // com a soma da semana inteira — senão "hoje" (1 dia) nunca
        // ganharia de "semana" (7 dias) e a variação seria sempre
        // negativa sem dizer nada de real. Não fabrica número: se não
        // houver dado suficiente (semana zerada), simplesmente não
        // mostra a tag, em vez de inventar um percentual.
        const tagVariacao = (dadosHoje, dadosSemana) => {
            const totalHoje = dadosHoje.mcc2 + dadosHoje.mcc3 + dadosHoje.mcc4;
            const totalSemana = dadosSemana.mcc2 + dadosSemana.mcc3 + dadosSemana.mcc4;
            const mediaDiaria = totalSemana / 7;
            if (mediaDiaria <= 0) return '';
            const variacao = ((totalHoje - mediaDiaria) / mediaDiaria) * 100;
            const positivo = variacao >= 0;
            const cor = positivo ? 'var(--success)' : 'var(--danger)';
            const bg = positivo ? 'var(--success-bg)' : 'var(--danger-bg)';
            const seta = positivo ? '▲' : '▼';
            return `<span style="font-size:10.5px; font-weight:700; color:${cor}; background:${bg}; padding:2px 7px; border-radius:999px; margin-left:6px;">${seta} ${Math.abs(variacao).toFixed(0)}% vs média/dia</span>`;
        };

        const linha = (label, cor, dados, unidade, variacaoHtml) => `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding:8px 10px; background:var(--bg-th); border-radius:6px; border-left:3px solid ${cor}; margin-bottom:6px;">
                <span style="font-size:12px; font-weight:600;">${label}${variacaoHtml || ''}</span>
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
            ${linha('Hoje', '#3b82f6', totaisTon.hoje, 'ton', tagVariacao(totaisTon.hoje, totaisTon.semana))}
            ${linha('Últimos 7 dias', '#8b5cf6', totaisTon.semana, 'ton')}
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin:14px 0 6px 0;">Panelas de Molde</div>
            ${linha('Hoje', '#f97316', totaisPanelas.hoje, 'panelas', tagVariacao(totaisPanelas.hoje, totaisPanelas.semana))}
            ${linha('Últimos 7 dias', '#eab308', totaisPanelas.semana, 'panelas')}
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar a produção lançada:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
    }
}

// ==============================================================
// 4) DONUT — RISCO DOS ATIVOS (Crítico/Atenção/Normal)
//    Mesma população e limiares já usados no KPI "Ativos Críticos"
//    (calcularKpisGlobais, script.js): só ativos fora da Oficina
//    (>= 80% = Crítico), pra bater com o número que já aparece ali.
// ==============================================================
function renderDonutRiscoAtivos() {
    const container = document.getElementById('painel-donut-risco');
    if (!container) return;

    let critico = 0, atencao = 0, normal = 0;
    BANCO_ATIVOS.forEach(a => {
        if (a.local && a.local.includes('Oficina')) return;
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
        if (pct >= 80) critico++;
        else if (pct >= 50) atencao++;
        else normal++;
    });

    const total = critico + atencao + normal;
    if (total === 0) {
        container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Sem ativos instalados no momento.</div></div>`;
        return;
    }

    const pctCritico = (critico / total) * 100;
    const pctAtencao = (atencao / total) * 100;
    // Fatia "Normal" pega o resto até 100%, evitando sobra/falta por
    // arredondamento nas duas primeiras.
    const anelCss = `conic-gradient(
        var(--danger) 0% ${pctCritico}%,
        var(--warning) ${pctCritico}% ${pctCritico + pctAtencao}%,
        var(--success) ${pctCritico + pctAtencao}% 100%
    )`;

    container.innerHTML = `
        <div class="painel-donut-corpo">
            <div class="painel-donut-anel" style="background:${anelCss};">
                <div class="painel-donut-centro">
                    <strong>${total}</strong>
                    <span>Ativos</span>
                </div>
            </div>
            <div class="painel-donut-legenda">
                <div class="painel-donut-legenda-item">
                    <span><span class="painel-donut-legenda-dot" style="background:var(--danger);"></span>Crítico</span>
                    <strong>${critico}</strong>
                </div>
                <div class="painel-donut-legenda-item">
                    <span><span class="painel-donut-legenda-dot" style="background:var(--warning);"></span>Atenção</span>
                    <strong>${atencao}</strong>
                </div>
                <div class="painel-donut-legenda-item">
                    <span><span class="painel-donut-legenda-dot" style="background:var(--success);"></span>Normal</span>
                    <strong>${normal}</strong>
                </div>
            </div>
        </div>
    `;
}

// ==============================================================
// 5) DONUT — STATUS DAS ATIVIDADES (todas as áreas da Oficina)
//    🆕 Busca própria (mesmo endpoint de renderAtrasadasGlobais acima),
//    em vez de ler OFICINA_ATIVIDADES_CACHE: esse cache só é
//    preenchido quando a aba Central de Áreas chega a carregar — se a
//    pessoa for direto pro Painel Geral, ficaria vazio sem motivo
//    aparente. Mesmas cores já usadas pra status de atividade em
//    outras telas do sistema (Pendente=warning, Em Andamento=info,
//    Concluído=success, Aguardando=laranja, Recusado=danger).
// ==============================================================
async function renderDonutStatusAtividades() {
    const container = document.getElementById('painel-donut-status');
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        const lista = Array.isArray(todas) ? todas : [];

        const categorias = [
            { chave: 'Pendente', cor: 'var(--warning)' },
            { chave: 'Em Andamento', cor: 'var(--info)' },
            { chave: 'Concluído', cor: 'var(--success)' },
            { chave: 'Aguardando', cor: 'var(--limit)' },
            { chave: 'Recusado', cor: 'var(--danger)' },
        ].map(c => ({ ...c, qtd: lista.filter(a => a.status === c.chave).length }));

        const total = categorias.reduce((soma, c) => soma + c.qtd, 0);
        if (total === 0) {
            container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Nenhuma atividade registrada no momento.</div></div>`;
            return;
        }

        let acumulado = 0;
        const fatias = categorias
            .filter(c => c.qtd > 0)
            .map(c => {
                const inicio = acumulado;
                acumulado += (c.qtd / total) * 100;
                return `${c.cor} ${inicio}% ${acumulado}%`;
            });
        const anelCss = `conic-gradient(${fatias.join(', ')})`;

        const legenda = categorias
            .filter(c => c.qtd > 0)
            .map(c => `
                <div class="painel-donut-legenda-item">
                    <span><span class="painel-donut-legenda-dot" style="background:${c.cor};"></span>${c.chave}</span>
                    <strong>${c.qtd}</strong>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="painel-donut-corpo">
                <div class="painel-donut-anel" style="background:${anelCss};">
                    <div class="painel-donut-centro">
                        <strong>${total}</strong>
                        <span>Atividades</span>
                    </div>
                </div>
                <div class="painel-donut-legenda">${legenda}</div>
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar o status das atividades:', e);
        container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Não foi possível carregar.</div></div>`;
    }
}

// ==============================================================
// 6) LINHA — TONELAGEM POR DIA (últimos 7 dias)
//    SVG puro (sem lib), mesmo endpoint de renderProducaoLancada
//    (/api/historico_apontamentos_geral), só que aqui mantém a
//    granularidade diária em vez de agregar tudo em "hoje"/"semana".
// ==============================================================
async function renderLinhaTonelagem() {
    const container = document.getElementById('painel-linha-tonelagem');
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_apontamentos_geral`, { cache: 'no-store' });
        const logs = resp.ok ? await resp.json() : [];
        const lista = Array.isArray(logs) ? logs : [];

        // Monta os 7 baldes de dia (mais antigo → mais novo, hoje por
        // último), já com a data-chave (AAAA-MM-DD em horário local) e
        // o rótulo curto de dia da semana pro eixo X.
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const baldes = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const chave = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            baldes.push({ chave, label: diasSemana[d.getDay()], total: 0 });
        }
        const porChave = Object.fromEntries(baldes.map(b => [b.chave, b]));

        lista.filter(l => l.desfeito !== 1).forEach(log => {
            if (!log.data_hora) return;
            const dataUTC = new Date(log.data_hora.replace(' ', 'T') + 'Z');
            const chave = dataUTC.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const balde = porChave[chave];
            if (balde) balde.total += (log.qtd_mcc2 || 0) + (log.qtd_mcc3 || 0) + (log.qtd_mcc4 || 0);
        });

        const valores = baldes.map(b => b.total);
        const somaTotal = valores.reduce((a, b) => a + b, 0);
        if (somaTotal === 0) {
            container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Sem apontamentos nos últimos 7 dias.</div></div>`;
            return;
        }

        // Geometria do SVG: eixo Y de 0 até o maior valor (+10% de
        // folga pra o ponto mais alto não colar no topo do card).
        const larguraSvg = 560, alturaSvg = 160, margemBaixo = 24, margemLados = 12;
        const maiorValor = Math.max(...valores) * 1.1 || 1;
        const passoX = (larguraSvg - margemLados * 2) / (baldes.length - 1);
        const pontos = baldes.map((b, i) => {
            const x = margemLados + i * passoX;
            const y = (alturaSvg - margemBaixo) - (b.total / maiorValor) * (alturaSvg - margemBaixo);
            return { x, y, b };
        });

        const linhaPath = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const areaPath = `${linhaPath} L ${pontos[pontos.length - 1].x.toFixed(1)} ${alturaSvg - margemBaixo} L ${pontos[0].x.toFixed(1)} ${alturaSvg - margemBaixo} Z`;

        const circulos = pontos.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--info)" stroke="var(--bg-card)" stroke-width="1.5" />`).join('');
        const rotulos = pontos.map(p => `<text x="${p.x.toFixed(1)}" y="${alturaSvg - 6}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${p.b.label}</text>`).join('');

        const hoje = baldes[baldes.length - 1].total;
        container.innerHTML = `
            <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:8px; flex-shrink:0;">
                <strong style="font-size:1.4rem; font-weight:800; color:var(--text-heading); font-family:var(--font-mono);">${hoje.toLocaleString('pt-BR')}</strong>
                <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">ton hoje</span>
            </div>
            <svg viewBox="0 0 ${larguraSvg} ${alturaSvg}" style="width:100%; flex:1; min-height:0;" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="painelLinhaGradiente" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--info)" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="var(--info)" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#painelLinhaGradiente)" />
                <path d="${linhaPath}" fill="none" stroke="var(--info)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                ${circulos}
                ${rotulos}
            </svg>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar a tonelagem por dia:', e);
        container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Não foi possível carregar.</div></div>`;
    }
}

// ==============================================================
// ORQUESTRADOR — chamado junto com o resto do Painel Geral
// ==============================================================
window.renderPainelGeralExtra = function() {
    renderRankingVeios();
    renderAtrasadasGlobais();
    renderProducaoLancada();
    renderDonutRiscoAtivos();
    renderDonutStatusAtividades();
    renderLinhaTonelagem();
};

export { renderRankingVeios, renderAtrasadasGlobais, renderProducaoLancada };