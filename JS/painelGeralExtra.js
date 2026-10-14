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

    // 🔧 CORREÇÃO ("cards espremidos com grande área vazia"): antes cada
    // linha era só texto solto + uma barrinha fina, sem fundo nem borda —
    // ficava "leve" demais comparado ao card vizinho ("Atividades
    // Atrasadas", que já usa linhas com fundo/borda lateral). Mesma
    // caixa/densidade visual agora nos dois, então o conjunto de cards
    // da coluna lateral fica com peso consistente em vez de alternar
    // "cheio"/"vazio" dependendo de qual card é.
    container.innerHTML = linhas.map(l => {
        const corBarra = l.media >= 80 ? 'var(--danger)' : (l.media >= 50 ? 'var(--warning)' : 'var(--success)');
        const larguraPct = Math.min(100, (l.media / maiorMedia) * 100);
        return `
            <div style="padding:10px 12px; background:var(--bg-th); border-radius:6px; border-left:3px solid ${corBarra}; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:13px; margin-bottom:6px;">
                    <span style="font-weight:600; color:var(--text-heading);">${l.chave}</span>
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="color:${corBarra}; font-weight:700;">${l.media.toFixed(1)}% méd.</span>
                        ${l.criticos > 0 ? `<span style="font-size:11px; font-weight:700; color:var(--danger); background:var(--danger-bg); padding:2px 8px; border-radius:12px;">${l.criticos} crítico${l.criticos > 1 ? 's' : ''}</span>` : ''}
                    </span>
                </div>
                <div style="background:var(--bg-card); border-radius:6px; height:8px; overflow:hidden;">
                    <div style="width:${larguraPct}%; height:100%; background:${corBarra};"></div>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${l.qtd} ativo${l.qtd > 1 ? 's' : ''} nesse veio</div>
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
                <div class="pg-tudo-em-dia"><strong>Em dia</strong><span>Nenhuma atividade com prazo vencido.</span></div>
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
            <div style="display:flex; align-items:baseline; gap:10px; margin:6px 0 8px;">
                <strong style="font:700 2rem/1 var(--ds-fonte-titulo); letter-spacing:-.04em; color:var(--ds-perigo);">${atrasadas.length}</strong>
                <span class="cc-rotulo">com prazo vencido</span>
            </div>
            <table class="cc-tabela"><tbody>
                ${rankingAreas.map(([area, qtd]) => `<tr><td>${area}</td><td class="cc-num-perigo">${qtd}</td></tr>`).join('')}
            </tbody></table>
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
            // data_hora já vem em horário de Brasília (agora_brasil no backend) — antes somava 'Z' e mostrava 3h a menos
            const dataUTC = new Date(log.data_hora.replace(' ', 'T').slice(0, 19));
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
            return `<span class="pg-chip ${positivo ? 'pg-chip-ok' : 'pg-chip-perigo'}">${seta} ${Math.abs(variacao).toFixed(0)}% VS MÉDIA/DIA</span>`;
        };

        // 🎨 Padrão "centro de controle": tabela técnica por MCC.
        const totalDe = d => d.mcc2 + d.mcc3 + d.mcc4;
        const linhaMcc = (nome, k) => `<tr><td>${nome}</td><td class="cc-num-forte">${totaisTon.hoje[k].toLocaleString('pt-BR')}</td><td>${totaisTon.semana[k].toLocaleString('pt-BR')}</td><td class="cc-num-forte">${totaisPanelas.hoje[k].toLocaleString('pt-BR')}</td><td>${totaisPanelas.semana[k].toLocaleString('pt-BR')}</td></tr>`;
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin:6px 0 14px; flex-wrap:wrap;">
                <div><strong style="font:700 2rem/1 var(--ds-fonte-titulo); letter-spacing:-.04em; color:var(--ds-texto);">${totalDe(totaisTon.hoje).toLocaleString('pt-BR')}</strong> <span class="cc-rotulo">ton hoje</span></div>
                <div>${tagVariacao(totaisTon.hoje, totaisTon.semana)}</div>
            </div>
            <table class="cc-tabela cc-compacta">
                <thead><tr><th></th><th>Ton hoje</th><th>Ton 7d</th><th>Panelas hoje</th><th>Panelas 7d</th></tr></thead>
                <tbody>${linhaMcc('MCC 2', 'mcc2')}${linhaMcc('MCC 3', 'mcc3')}${linhaMcc('MCC 4', 'mcc4')}
                <tr><td class="cc-rotulo" style="padding-top:12px">Total</td><td class="cc-num-forte">${totalDe(totaisTon.hoje).toLocaleString('pt-BR')}</td><td class="cc-num-forte">${totalDe(totaisTon.semana).toLocaleString('pt-BR')}</td><td class="cc-num-forte">${totalDe(totaisPanelas.hoje).toLocaleString('pt-BR')}</td><td class="cc-num-forte">${totalDe(totaisPanelas.semana).toLocaleString('pt-BR')}</td></tr></tbody>
            </table>`;
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
// 🎨 Padrão novo: distribuição em barra 100% empilhada + linhas com
// número e % (substitui os donuts "pizza" — pedido do usuário: infantil).
function htmlDistribuicao(total, rotuloTotal, itens) {
    const visiveis = itens.filter(i => i.qtd > 0);
    return `
        <div class="ds-dist">
            <div class="ds-dist-total"><strong>${total.toLocaleString('pt-BR')}</strong><span>${rotuloTotal}</span></div>
            <div class="ds-dist-barra">${visiveis.map(i => `<i style="flex:${i.qtd};background:${i.cor}" title="${i.nome}: ${i.qtd}"></i>`).join('')}</div>
            <div class="ds-dist-linhas">
                ${itens.map(i => `
                    <div class="ds-dist-linha" style="--c:${i.cor}">
                        <span class="ds-dist-nome">${i.nome}${i.dica ? ` <small>${i.dica}</small>` : ''}</span>
                        <b>${i.qtd.toLocaleString('pt-BR')}</b>
                        <em>${total ? Math.round((i.qtd / total) * 100) : 0}%</em>
                    </div>`).join('')}
            </div>
        </div>`;
}

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

    container.innerHTML = htmlDistribuicao(total, 'peças fora da oficina', [
        { nome: 'Crítico', dica: '≥ 80% da meta', qtd: critico, cor: 'var(--pg-c3)' },
        { nome: 'Atenção', dica: '50–80%', qtd: atencao, cor: 'var(--pg-c1)' },
        { nome: 'Normal', dica: '< 50%', qtd: normal, cor: 'var(--pg-c0)' },
    ]);
    // críticas por MCC (letra do veio), pra saber ONDE está o risco
    const porMcc = { '2': 0, '3': 0, '4': 0 };
    ativosInstalados().forEach(a => { if (pctDe(a) >= 80) porMcc[MCC_POR_VEIO[a.veio]]++; });
    const maiorMcc = Math.max(1, ...Object.values(porMcc));
    container.innerHTML += `
        <div class="pg-divisor"></div>
        <div class="pg-mini-titulo">Críticas por MCC</div>
        ${Object.entries(porMcc).map(([m, q]) => `
            <div class="pg-mcc-barra">
                <span>MCC ${m}</span>
                <span class="pg-mcc-barra-trilho"><i style="width:${(q / maiorMcc) * 100}%"></i></span>
                <b>${q}</b>
            </div>`).join('')}`;
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
            { chave: 'Pendente', cor: 'var(--ds-alerta)' },
            { chave: 'Em Andamento', cor: 'var(--ds-info)' },
            { chave: 'Concluído', cor: 'var(--ds-ok)' },
            { chave: 'Aguardando', cor: 'var(--limit)' },
            { chave: 'Recusado', cor: 'var(--ds-perigo)' },
        ].map(c => ({ ...c, qtd: lista.filter(a => a.status === c.chave).length }));

        const total = categorias.reduce((soma, c) => soma + c.qtd, 0);
        if (total === 0) {
            container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Nenhuma atividade registrada no momento.</div></div>`;
            return;
        }

        container.innerHTML = htmlDistribuicao(total, 'atividades registradas', categorias
            .filter(c => c.qtd > 0 || ['Pendente', 'Em Andamento', 'Concluído'].includes(c.chave))
            .map(c => ({ nome: c.chave, qtd: c.qtd, cor: c.cor })));
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
            // data_hora já vem em horário de Brasília (agora_brasil no backend) — antes somava 'Z' e mostrava 3h a menos
            const dataUTC = new Date(log.data_hora.replace(' ', 'T').slice(0, 19));
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
        // 🎨 Padrão novo: colunas âmbar (HTML/CSS — o SVG antigo usava
        // preserveAspectRatio="none" e esticava pontos e textos), linha
        // tracejada da média e o dia de hoje destacado.
        const hoje = baldes[baldes.length - 1].total;
        const media = somaTotal / baldes.length;
        const maior = Math.max(...valores, 1);
        const variacao = media > 0 ? ((hoje - media) / media) * 100 : 0;
        const chip = media > 0 ? `<span class="pg-chip ${variacao >= 0 ? 'pg-chip-ok' : 'pg-chip-perigo'}">${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toFixed(0)}% vs média</span>` : '';
        container.innerHTML = `
            <div class="pg-ton-topo">
                <div><strong class="pg-ton-num">${hoje.toLocaleString('pt-BR')}</strong><span class="pg-ton-un">ton hoje</span></div>
                <div class="pg-ton-lado">${chip}<span>média ${Math.round(media).toLocaleString('pt-BR')} · total ${somaTotal.toLocaleString('pt-BR')} ton</span></div>
            </div>
            <div class="pg-colunas">
                <span class="pg-colunas-media" style="bottom:calc(${(media / maior) * 100}% * .82 + 22px)"><em>média</em></span>
                ${baldes.map((b, i) => `
                    <div class="pg-coluna${i === baldes.length - 1 ? ' hoje' : ''}">
                        <span class="pg-coluna-val">${b.total.toLocaleString('pt-BR')}</span>
                        <span class="pg-coluna-barra" style="height:${Math.max(2, (b.total / maior) * 82)}%; animation-delay:${i * 60}ms"></span>
                        <span class="pg-coluna-dia">${i === baldes.length - 1 ? 'Hoje' : b.label}</span>
                    </div>`).join('')}
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar a tonelagem por dia:', e);
        container.innerHTML = `<div class="painel-donut-corpo"><div class="painel-donut-vazio">Não foi possível carregar.</div></div>`;
    }
}

// ==============================================================
// 6) CENTRO DE CONTROLE — análise, briefing, linha de lingotamento,
//    previsão de trocas e reserva × demanda
// ==============================================================
// Tudo síncrono, só lê BANCO_ATIVOS — roda em window.renderPainelSincrono(),
// chamado de atualizarPainelCompleto() sempre que os dados chegam (antes
// o donut/ranking ficavam com o cache velho: card 113 × donut 4).
//
// Previsão: todas as peças de um veio recebem a mesma tonelagem por dia
// (o aço passa por todas), então o ritmo do veio é a MEDIANA de
// tonelagem ÷ dias em máquina das próprias peças dele (≥ 30 dias, pra não
// pegar peça recém-instalada). Dias até a meta = (meta − ton) ÷ ritmo.
// No banco real isso dá 1.200–2.000 t/dia por veio.

const MCC_POR_VEIO = { C: '2', D: '2', E: '3', F: '3', G: '4', H: '4' };
const VEIOS_POR_MCC = { '2': ['C', 'D'], '3': ['E', 'F'], '4': ['G', 'H'] };
let mapaFiltro = 'todos';
let mapaSelecionado = null;
let mapaVista = (() => { try { return localStorage.getItem('oms_pg_vista') || 'arco'; } catch (e) { return 'arco'; } })();
let ANALISE = null;

const pctDe = a => (a.meta > 0 ? (a.ton / a.meta) * 100 : 0);
const classeDesgaste = pct => (pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : '');
const corDesgaste = pct => `var(--pg-${pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : 'c0'})`;
const escapar = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = n => {
    const v = Math.abs(n);
    if (v >= 1e6) return (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi t';
    if (v >= 1e3) return Math.round(n / 1e3).toLocaleString('pt-BR') + ' mil t';
    return Math.round(n).toLocaleString('pt-BR') + ' t';
};
const rotulo = a => (typeof window.rotuloEquipamento === 'function' ? window.rotuloEquipamento(a) : a.id);
const mediana = arr => { if (!arr.length) return 0; const v = arr.slice().sort((x, y) => x - y); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const dataEm = dias => new Date(Date.now() + dias * 864e5).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function ativosInstalados() {
    return BANCO_ATIVOS.filter(a => a.veio && MCC_POR_VEIO[a.veio] && a.local && !String(a.local).includes('Oficina'));
}
const ehReserva = a => a.local === 'Oficina / Reserva' || a.local === 'Máquina / Reserva';
const ehReparo = a => a.local === 'Oficina / Reparo';

function analisar() {
    const instalados = ativosInstalados();
    const porVeio = {};
    instalados.forEach(a => (porVeio[a.veio] ||= []).push(a));

    const amostra = a => a.dias >= 30 && a.ton > 0;
    const global = mediana(instalados.filter(amostra).map(a => a.ton / a.dias)) || 0;
    const ritmo = {};
    Object.keys(MCC_POR_VEIO).forEach(v => {
        const lista = (porVeio[v] || []).filter(amostra).map(a => a.ton / a.dias);
        ritmo[v] = lista.length >= 3 ? mediana(lista) : global;
    });

    const diasParaMeta = a => (a.meta > 0 && ritmo[a.veio] > 0 ? (a.meta - a.ton) / ritmo[a.veio] : null);
    instalados.forEach(a => { a.__diasMeta = diasParaMeta(a); });

    const faixas = [
        { nome: 'Já além', sub: 'da meta', teste: d => d <= 0, cls: 'perigo' },
        { nome: '≤ 30 dias', sub: 'próximo mês', teste: d => d > 0 && d <= 30, cls: 'alerta' },
        { nome: '31–90', sub: 'dias', teste: d => d > 30 && d <= 90, cls: 'alerta' },
        { nome: '91–180', sub: 'dias', teste: d => d > 90 && d <= 180, cls: '' },
        { nome: '> 180', sub: 'dias', teste: d => d > 180, cls: '' },
    ].map(f => ({ ...f, qtd: instalados.filter(a => a.__diasMeta !== null && f.teste(a.__diasMeta)).length }));

    // reserva × demanda por tipo
    const tipos = {};
    const t = nome => (tipos[nome] ||= { tipo: nome, instaladas: 0, alem: 0, prox90: 0, reserva: 0, reparo: 0 });
    instalados.forEach(a => {
        const r = t(a.tipo); r.instaladas++;
        if (a.__diasMeta !== null && a.__diasMeta <= 0) r.alem++;
        else if (a.__diasMeta !== null && a.__diasMeta <= 90) r.prox90++;
    });
    BANCO_ATIVOS.forEach(a => {
        if (!a.tipo) return;
        if (ehReserva(a)) t(a.tipo).reserva++;
        if (ehReparo(a)) t(a.tipo).reparo++;
    });
    const porTipo = Object.values(tipos)
        .map(r => ({ ...r, demanda: r.alem + r.prox90, deficit: r.alem + r.prox90 - r.reserva }))
        .sort((x, y) => y.deficit - x.deficit || y.alem - x.alem || y.instaladas - x.instaladas);

    const veios = Object.keys(MCC_POR_VEIO).map(v => {
        const l = porVeio[v] || [];
        return { veio: v, mcc: MCC_POR_VEIO[v], qtd: l.length, crit: l.filter(a => pctDe(a) >= 80).length, alem: l.filter(a => pctDe(a) >= 100).length, media: l.length ? l.reduce((s, a) => s + pctDe(a), 0) / l.length : 0, ritmo: ritmo[v] };
    });

    ANALISE = { instalados, porVeio, ritmo, faixas, porTipo, veios };
    return ANALISE;
}

// ---------- 01 briefing + KPIs ----------
function renderBriefing(an) {
    const elData = document.getElementById('pg-hero-data');
    if (!elData) return;
    const agora = new Date();
    elData.textContent = agora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');
    const h = agora.getHours();
    document.getElementById('pg-hero-saudacao').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    let nome = '';
    try { nome = (JSON.parse(localStorage.getItem('oms_operador_v32_local') || 'null')?.nome || ''); } catch (e) { /* sem operador */ }
    nome = String(nome).replace(/\s*\[.*\]\s*$/, '').trim().split(/\s+/)[0] || '';
    document.getElementById('pg-hero-nome').textContent = nome ? ', ' + nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase() : '';

    const { instalados, porTipo, veios, faixas } = an;
    const total = BANCO_ATIVOS.length;
    const reparo = BANCO_ATIVOS.filter(ehReparo).length;
    const reserva = BANCO_ATIVOS.filter(ehReserva).length;
    const crit = instalados.filter(a => pctDe(a) >= 80).length;
    const alem = instalados.filter(a => pctDe(a) >= 100);
    const excesso = alem.reduce((s, a) => s + (a.ton - a.meta), 0);
    const em30 = faixas[1].qtd, em90 = faixas[1].qtd + faixas[2].qtd;
    const demanda90 = alem.length + em90;

    const manchete = document.getElementById('pg-briefing-manchete');
    const decisoes = document.getElementById('pg-briefing-decisoes');
    const gargalo = porTipo.find(r => r.deficit > 0 && r.alem > 0) || porTipo.find(r => r.deficit > 0);
    if (!instalados.length) {
        manchete.textContent = 'Aguardando os dados dos veios…';
        decisoes.innerHTML = '';
    } else {
        manchete.innerHTML = gargalo
            ? `<em>${escapar(gargalo.tipo)}</em> é o gargalo: ${gargalo.alem ? `${gargalo.alem} além da meta` : `${gargalo.prox90} vencendo em 90 dias`} e <span class="cc-perigo">${gargalo.reserva === 0 ? 'nenhuma' : gargalo.reserva}</span> na reserva.`
            : alem.length
                ? `${alem.length} peças operam além da meta, mas a reserva cobre a demanda.`
                : `Planta dentro da meta. <em>${crit}</em> peças acima de 80%.`;

        const itens = [];
        porTipo.filter(r => r.deficit > 0).slice(0, 2).forEach(r => {
            itens.push(`Repor <b>${escapar(r.tipo)}</b>: ${r.alem} além da meta + ${r.prox90} previstas em 90 dias contra <span class="cc-perigo">${r.reserva} na reserva</span>${r.reparo ? ` (${r.reparo} em reparo)` : ''} — déficit de <b>${r.deficit}</b>.`);
        });
        const pior = veios.filter(v => v.qtd).sort((x, y) => y.crit - x.crit || y.media - x.media)[0];
        if (pior && pior.crit) itens.push(`<b>Veio ${pior.veio} (MCC ${pior.mcc})</b> concentra ${pior.crit} peças ≥ 80% da meta${pior.alem ? `, ${pior.alem} já além` : ''} — desgaste médio de ${pior.media.toFixed(0)}%.`);
        itens.push(`<b>${em30}</b> peça${em30 === 1 ? '' : 's'} deve${em30 === 1 ? '' : 'm'} bater a meta nos próximos 30 dias e <b>${em90}</b> em 90, pelo ritmo atual dos veios.`);
        if (alem.length) itens.push(`${alem.length} peças rodando além da meta somam <b>${fmtT(excesso)}</b> acima do previsto — risco de falha sem reserva para troca.`);
        decisoes.innerHTML = itens.slice(0, 4).map(t => `<li><span>${t}</span></li>`).join('');
    }

    // KPIs
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
    set('pg-kpi-instaladas', instalados.length.toLocaleString('pt-BR'));
    set('pg-kpi-sub-total', `de <b>${total}</b> no sistema · ${total - instalados.length} fora dos veios`);
    set('pg-kpi-sub-criticos', `<b>${instalados.length ? Math.round(crit / instalados.length * 100) : 0}%</b> das instaladas`);
    set('pg-kpi-alem', alem.length.toLocaleString('pt-BR'));
    set('pg-kpi-sub-alem', alem.length ? `<b>+${fmtT(excesso)}</b> acima das metas` : 'nenhuma peça além');
    set('pg-kpi-sub-reparo', `<b>${total ? Math.round(reparo / total * 100) : 0}%</b> da frota na oficina`);
    set('pg-kpi-sub-reserva', `para <b>${demanda90}</b> trocas previstas em 90 dias`);

    const ritmoPlanta = Object.values(an.ritmo).reduce((x, y) => x + (y || 0), 0);
    set('pg-ritmo-planta', ritmoPlanta ? Math.round(ritmoPlanta).toLocaleString('pt-BR') : '--');
    set('pg-excesso', alem.length ? '+' + fmtT(excesso) : '0 t');
    const saudaveis = instalados.filter(a => pctDe(a) < 80).length;
    const saude = instalados.length ? Math.round(saudaveis / instalados.length * 100) : 0;
    set('pg-saude-pct', instalados.length ? saude + '%' : '--');
    const med = document.getElementById('pg-anel-valor');
    if (med) { med.style.width = saude + '%'; med.style.background = saude >= 70 ? 'var(--ds-texto)' : saude >= 45 ? 'var(--ds-ambar)' : 'var(--ds-perigo)'; }
}

// ---------- 02 linha de lingotamento ----------
// Ordem física: posição fixa vem do id (CAD-SUP-73 / CAD-INF-73 = par da
// posição 73). Superior e inferior do mesmo par ficam lado a lado.
function slotsDoVeio(lista) {
    const slots = new Map();
    lista.forEach(a => {
        const m = String(a.posicaoFixa || a.id).match(/^CAD-(SUP|INF)-(\d+)/i) || String(a.id).match(/^CAD-(SUP|INF)-(\d+)/i);
        const chave = m ? 'CAD-' + m[2] : (a.posicaoFixa || a.id);
        const ordem = m ? 100 + parseInt(m[2], 10) / 1000 : (a.ordem ?? 999);
        if (!slots.has(chave)) slots.set(chave, { chave, ordem, cad: !!m, sup: null, inf: null, pecas: [] });
        const s = slots.get(chave);
        if (m) { if (m[1].toUpperCase() === 'SUP') s.sup = a; else s.inf = a; } else s.pecas.push(a);
        s.ordem = Math.min(s.ordem, ordem);
    });
    return [...slots.values()].sort((x, y) => x.ordem - y.ordem || String(x.chave).localeCompare(String(y.chave), 'pt-BR', { numeric: true }));
}

function passaFiltro(a) {
    if (mapaFiltro === 'todos') return true;
    if (mapaFiltro === 'criticos') return pctDe(a) >= 80;
    if (mapaFiltro === 'alem') return pctDe(a) >= 100;
    return a.tipo === mapaFiltro;
}

function svgArco(mcc, an) {
    const W = 400, Y0 = 18, Y1 = 46;
    const geo = (x, R) => ({ x, R, d: `M ${x} ${Y0} L ${x} ${Y1} A ${R} ${R} 0 0 0 ${x + R} ${Y1 + R} L ${W - 6} ${Y1 + R}`, L: (Y1 - Y0) + Math.PI * R / 2 + (W - 6 - (x + R)) });
    const veios = VEIOS_POR_MCC[mcc];
    const bases = [geo(22, 158), geo(58, 122)];
    let html = '';
    const marcas = [];
    veios.forEach((v, k) => {
        const base = bases[k];
        const trilhoSup = geo(base.x - 5, base.R + 5), trilhoInf = geo(base.x + 5, base.R - 5);
        html += `<path class="trilho" d="${base.d}"/>`;
        const slots = slotsDoVeio(an.porVeio[v] || []);
        const n = slots.length || 1, gap = 1.2;
        const peca = (a, g, f0, f1, larg) => {
            const pct = pctDe(a);
            const ini = f0 * g.L, comp = Math.max(0.6, (f1 - f0) * g.L - gap);
            const cls = `peca${mapaFiltro !== 'todos' && passaFiltro(a) ? ' destaque' : ''}${mapaSelecionado === a.id ? ' ativa' : ''}`;
            return `<path class="${cls}" data-id="${escapar(a.id)}" d="${g.d}" stroke="${corDesgaste(pct)}" stroke-dasharray="${comp.toFixed(2)} ${(g.L + 20).toFixed(1)}" stroke-dashoffset="${(-ini).toFixed(2)}"${larg ? ` style="stroke-width:${larg}px"` : ''}><title>${escapar(rotulo(a))} · ${escapar(a.tipo)} · ${pct.toFixed(0)}%</title></path>`;
        };
        slots.forEach((s, i) => {
            const f0 = i / n, f1 = (i + 1) / n;
            if (s.cad) {
                if (s.sup) html += peca(s.sup, trilhoSup, f0, f1, 8);
                if (s.inf) html += peca(s.inf, trilhoInf, f0, f1, 8);
            } else {
                const m = s.pecas.length;
                s.pecas.forEach((a, j) => { html += peca(a, base, f0 + (f1 - f0) * j / m, f0 + (f1 - f0) * (j + 1) / m, 0); });
            }
        });
        html += `<text class="rot-veio" x="${base.x - 4}" y="10" text-anchor="middle">${v}</text>`;
        if (k === 0) {
            const cx = base.x + base.R, cy = Y1, ang = Math.PI * 0.75;
            marcas.push(`<text class="rot-zona" x="${base.x - 14}" y="${Y1 - 6}" text-anchor="end">molde</text>`);
            marcas.push(`<text class="rot-zona" x="${(cx + Math.cos(ang) * (base.R + 14)).toFixed(1)}" y="${(cy + Math.sin(ang) * (base.R + 14)).toFixed(1)}" text-anchor="end">zona curva</text>`);
            marcas.push(`<text class="rot-zona" x="${W - 6}" y="${Y1 + base.R + 22}" text-anchor="end">saída →</text>`);
        }
    });
    return `<svg viewBox="-34 0 ${W + 34} ${Y1 + 158 + 26}" role="img" aria-label="Linha de lingotamento da MCC ${mcc}">${html}${marcas.join('')}</svg>`;
}

function htmlDetalhe(a) {
    if (!a) return `<div>Passe o mouse ou toque numa peça da linha para ver a leitura completa.</div>`;
    const pct = pctDe(a);
    const d = a.__diasMeta;
    const prev = d === null || d === undefined ? '—'
        : d <= 0 ? `<span style="color:var(--ds-perigo)">além há ~${Math.round(-d)} d</span>`
        : `~${Math.round(d)} d · ${dataEm(d)}`;
    return `
        <div><span class="pg-det-nome">${escapar(rotulo(a))}</span><span class="pg-det-meta">${escapar(a.tipo)} · ${escapar(a.local)}</span></div>
        <div><span class="cc-rotulo">% da meta</span><span class="pg-det-num" style="color:${pct >= 100 ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${pct.toFixed(1).replace('.', ',')}%</span></div>
        <div><span class="cc-rotulo">Acumulado</span><span class="pg-det-num">${fmtT(a.ton)}</span><span class="pg-det-meta">meta ${fmtT(a.meta)}</span></div>
        <div><span class="cc-rotulo">Bate a meta</span><span class="pg-det-num" style="font-size:1rem">${prev}</span><span class="pg-det-meta">${a.dias || 0} dias em máquina</span></div>
        <div><button type="button" class="cc-btn cc-btn-cheio" onclick="window.abrirHistoricoIndividual && window.abrirHistoricoIndividual('${escapar(a.id)}')">Prontuário →</button></div>`;
}

function renderPerfil(an) {
    const TETO = 125;
    return `<div class="pg-mapa-grade${mapaFiltro !== 'todos' ? ' filtrando' : ''}">${Object.entries(VEIOS_POR_MCC).map(([mcc, veios]) => `
        <div class="pg-mcc">
            <div class="pg-mcc-topo"><span class="pg-mcc-nome">MCC ${mcc}</span></div>
            ${veios.map(v => {
                const lista = slotsDoVeio(an.porVeio[v] || []).flatMap(s => s.cad ? [s.sup, s.inf].filter(Boolean) : s.pecas);
                const info = an.veios.find(x => x.veio === v);
                let tipoAnt = null;
                const barras = lista.map(a => {
                    const sep = tipoAnt !== null && a.tipo !== tipoAnt ? ' sep' : ''; tipoAnt = a.tipo;
                    const pct = pctDe(a);
                    return `<button type="button" class="pg-b ${classeDesgaste(pct)}${sep}${mapaFiltro !== 'todos' && passaFiltro(a) ? ' destaque' : ''}${mapaSelecionado === a.id ? ' ativa' : ''}" data-id="${escapar(a.id)}" aria-label="${escapar(rotulo(a))}, ${pct.toFixed(0)}%"><i style="height:${Math.max(4, Math.min(pct, TETO) / TETO * 100)}%"></i></button>`;
                }).join('');
                return `<div>
                    <div class="pg-veio-topo"><span>Veio <b>${v}</b> · ${lista.length}</span><span>${info.crit ? `<span class="pg-veio-crit">${info.crit} ≥80%</span> · ` : ''}méd. <b>${info.media.toFixed(0)}%</b></span></div>
                    <div class="pg-perfil"><span class="pg-ref" style="bottom:${80 / TETO * 100}%"><em>80%</em></span><span class="pg-ref pg-ref-meta" style="bottom:${100 / TETO * 100}%"><em>meta</em></span>${barras || ''}</div>
                    <div class="pg-perfil-eixo"><span>molde</span><span>saída</span></div>
                </div>`;
            }).join('')}
        </div>`).join('')}</div>`;
}

function renderMapaVeios(an) {
    const container = document.getElementById('painel-mapa-veios');
    if (!container) return;
    if (!an.instalados.length) { container.innerHTML = `<div class="cc-carregando">Nenhuma peça instalada nos veios.</div>`; return; }

    const contagemTipo = {};
    an.instalados.forEach(a => { contagemTipo[a.tipo] = (contagemTipo[a.tipo] || 0) + 1; });
    const tipos = Object.entries(contagemTipo).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
    if (!['todos', 'criticos', 'alem', ...tipos].includes(mapaFiltro)) mapaFiltro = 'todos';
    const fb = (v, txt) => `<button type="button" class="pg-filtro${mapaFiltro === v ? ' on' : ''}" data-filtro="${escapar(v)}">${escapar(txt)}</button>`;

    const corpo = mapaVista === 'perfil' ? renderPerfil(an) : `<div class="pg-arcos">${Object.keys(VEIOS_POR_MCC).map(mcc => {
        const vs = an.veios.filter(v => v.mcc === mcc);
        const n = vs.reduce((s, v) => s + v.qtd, 0);
        const crit = vs.reduce((s, v) => s + v.crit, 0);
        const media = n ? vs.reduce((s, v) => s + v.media * v.qtd, 0) / n : 0;
        const ritmo = vs.reduce((s, v) => s + (v.ritmo || 0), 0);
        return `<div class="pg-arco${mapaFiltro !== 'todos' ? ' filtrando' : ''}">
            <div class="pg-arco-topo"><b>MCC ${mcc}</b><span class="cc-rotulo">${n} peças</span></div>
            ${svgArco(mcc, an)}
            <div class="pg-arco-rodape">
                <div>≥ 80% da meta<br><b style="color:${crit ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${crit}</b> · méd. <b>${media.toFixed(0)}%</b></div>
                <div>Ritmo da máquina<br><b>${Math.round(ritmo).toLocaleString('pt-BR')}</b> t/dia</div>
            </div>
        </div>`;
    }).join('')}</div>`;

    const sel = mapaSelecionado && an.instalados.find(a => a.id === mapaSelecionado);
    container.innerHTML = `
        <div class="pg-vista">
            <div class="pg-mapa-filtros">${fb('todos', 'Todas')}${fb('criticos', '≥ 80%')}${fb('alem', 'Além da meta')}${tipos.map(t => fb(t, t)).join('')}</div>
            <div class="pg-vista-botoes"><button type="button" class="cc-btn${mapaVista === 'arco' ? ' on' : ''}" data-vista="arco">Arco</button><button type="button" class="cc-btn${mapaVista === 'perfil' ? ' on' : ''}" data-vista="perfil">Perfil</button></div>
        </div>
        ${corpo}
        <div class="pg-mapa-detalhe${sel ? '' : ' vazio'}" id="pg-mapa-detalhe">${htmlDetalhe(sel)}</div>`;

    if (!container.__pgLigado) {
        container.__pgLigado = true;
        const selecionar = id => {
            if (!id || id === mapaSelecionado) return;
            mapaSelecionado = id;
            container.querySelectorAll('.ativa').forEach(x => x.classList.remove('ativa'));
            container.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(x => x.classList.add('ativa'));
            const det = document.getElementById('pg-mapa-detalhe');
            const a = ANALISE && ANALISE.instalados.find(x => x.id === id);
            if (det) { det.classList.toggle('vazio', !a); det.innerHTML = htmlDetalhe(a); }
        };
        container.addEventListener('click', ev => {
            const f = ev.target.closest('[data-filtro]');
            if (f) { mapaFiltro = f.dataset.filtro; renderMapaVeios(ANALISE); return; }
            const vb = ev.target.closest('[data-vista]');
            if (vb) { mapaVista = vb.dataset.vista; try { localStorage.setItem('oms_pg_vista', mapaVista); } catch (e) { /* ok */ } renderMapaVeios(ANALISE); return; }
            const c = ev.target.closest('[data-id]');
            if (c) selecionar(c.dataset.id);
        });
        container.addEventListener('pointermove', ev => {
            if (ev.pointerType !== 'mouse' && !ev.buttons) return;
            const alvo = document.elementFromPoint(ev.clientX, ev.clientY);
            const c = alvo && alvo.closest && alvo.closest('[data-id]');
            if (c && container.contains(c)) selecionar(c.dataset.id);
        });
    }
}

// ---------- 03 previsão ----------
function renderPrevisao(an) {
    const el = document.getElementById('pg-previsao');
    if (!el) return;
    if (!an.instalados.length) { el.innerHTML = `<div class="cc-carregando">Sem peças instaladas.</div>`; return; }
    const maior = Math.max(1, ...an.faixas.map(f => f.qtd));
    const proximas = an.instalados.filter(a => a.__diasMeta !== null && a.__diasMeta > 0).sort((x, y) => x.__diasMeta - y.__diasMeta).slice(0, 6);
    el.innerHTML = `
        <div class="pg-prev-colunas">
            ${an.faixas.map((f, i) => `
                <div class="pg-prev-col ${f.cls}">
                    <span class="cc-rotulo">${f.nome}<br>${f.sub}</span>
                    <div class="pg-prev-barra"><i style="height:${Math.max(2, f.qtd / maior * 100)}%;animation-delay:${i * 80}ms"></i></div>
                    <strong>${f.qtd}</strong>
                </div>`).join('')}
        </div>
        <div class="pg-prev-lista">
            <div class="cc-rotulo" style="margin-bottom:8px">Próximas a bater a meta</div>
            <table class="cc-tabela">
                <thead><tr><th>Peça</th><th class="cc-esconde-cel">Veio</th><th>% meta</th><th>Bate em</th></tr></thead>
                <tbody>${proximas.map(a => `
                    <tr class="cc-clicavel" onclick="window.abrirHistoricoIndividual && window.abrirHistoricoIndividual('${escapar(a.id)}')">
                        <td>${escapar(rotulo(a))}<div style="font-size:.72rem;color:var(--ds-texto-3);font-weight:400">${escapar(a.tipo)}</div></td>
                        <td class="cc-esconde-cel">${a.veio} · MCC ${MCC_POR_VEIO[a.veio]}</td>
                        <td class="cc-num-forte">${pctDe(a).toFixed(1).replace('.', ',')}%</td>
                        <td>${Math.round(a.__diasMeta)} d · ${dataEm(a.__diasMeta)}</td>
                    </tr>`).join('') || '<tr><td colspan="4">Nenhuma peça abaixo da meta.</td></tr>'}</tbody>
            </table>
        </div>`;
}

// ---------- 04 reserva × demanda ----------
function renderReserva(an) {
    const el = document.getElementById('pg-reserva-tabela');
    if (!el) return;
    const linhas = an.porTipo.filter(r => r.instaladas > 0 || r.reserva > 0).slice(0, 9);
    if (!linhas.length) { el.innerHTML = `<div class="cc-carregando">Sem dados.</div>`; return; }
    const totalDef = an.porTipo.reduce((s, r) => s + Math.max(0, r.deficit), 0);
    el.innerHTML = `
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px">
            <strong style="font:700 2.6rem/1 var(--ds-fonte-titulo);letter-spacing:-.04em;color:${totalDef ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${totalDef}</strong>
            <span class="cc-rotulo">peças de déficit nos próximos 90 dias</span>
        </div>
        <table class="cc-tabela">
            <thead><tr><th>Tipo</th><th class="cc-esconde-cel">Instal.</th><th>Além</th><th>≤ 90 d</th><th>Reserva</th><th class="cc-esconde-cel">Reparo</th><th>Déficit</th></tr></thead>
            <tbody>${linhas.map(r => `
                <tr>
                    <td>${escapar(r.tipo)}</td>
                    <td class="cc-esconde-cel">${r.instaladas}</td>
                    <td class="${r.alem ? 'cc-num-perigo' : 'cc-num-ok'}">${r.alem}</td>
                    <td class="${r.prox90 ? 'cc-num-forte' : 'cc-num-ok'}">${r.prox90}</td>
                    <td class="cc-num-forte">${r.reserva}</td>
                    <td class="cc-esconde-cel">${r.reparo}</td>
                    <td class="${r.deficit > 0 ? 'cc-num-perigo' : 'cc-num-ok'}">${r.deficit > 0 ? '−' + r.deficit : 'ok'}</td>
                </tr>`).join('')}</tbody>
        </table>`;
}

window.renderPainelSincrono = function() {
    let an;
    try { an = analisar(); } catch (e) { console.error('⚠️ Painel (análise):', e); return; }
    try { renderBriefing(an); } catch (e) { console.error('⚠️ Painel (briefing):', e); }
    try { renderMapaVeios(an); } catch (e) { console.error('⚠️ Painel (linha de lingotamento):', e); }
    try { renderPrevisao(an); } catch (e) { console.error('⚠️ Painel (previsão):', e); }
    try { renderReserva(an); } catch (e) { console.error('⚠️ Painel (reserva):', e); }
    try { renderDonutRiscoAtivos(); } catch (e) { console.error('⚠️ Painel (donut risco):', e); }
};

// ==============================================================
// ORQUESTRADOR — chamado junto com o resto do Painel Geral
// ==============================================================
window.renderPainelGeralExtra = function() {
    renderRankingVeios();
    renderAtrasadasGlobais();
    renderProducaoLancada();
    window.renderPainelSincrono();
    renderDonutStatusAtividades();
    renderLinhaTonelagem();
};

export { renderRankingVeios, renderAtrasadasGlobais, renderProducaoLancada };