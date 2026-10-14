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
                <div class="pg-tudo-em-dia"><i class="fas fa-check"></i><div><strong>Nada atrasado</strong><span>Nenhuma atividade com prazo vencido em nenhuma área.</span></div></div>
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
                <span style="font:600 2.2rem/1 var(--ds-fonte-titulo); letter-spacing:-.03em; color:var(--ds-perigo);">${atrasadas.length}</span>
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
            return `<span style="font-size:10.5px; font-weight:700; color:${cor}; background:${bg}; padding:2px 7px; border-radius:999px; margin-left:6px;">${seta} ${Math.abs(variacao).toFixed(0)}% vs média/dia</span>`;
        };

        // 🎨 Padrão novo: número grande de hoje + chip de variação, e
        // barras por MCC dos últimos 7 dias (antes: texto mono em linha).
        const bloco = (titulo, unidade, t) => {
            const totalHoje = t.hoje.mcc2 + t.hoje.mcc3 + t.hoje.mcc4;
            const maior = Math.max(1, t.semana.mcc2, t.semana.mcc3, t.semana.mcc4);
            const barra = (nome, chave) => `
                <div style="display:grid; grid-template-columns:52px 1fr auto; align-items:center; gap:10px; font-size:.78rem; margin-top:8px;">
                    <span style="color:var(--ds-texto-2); font-weight:500;">${nome}</span>
                    <span style="height:8px; border-radius:8px; background:var(--ds-elevado-2); overflow:hidden;"><i style="display:block; height:100%; width:${(t.semana[chave] / maior) * 100}%; border-radius:8px; background:linear-gradient(90deg, var(--ds-ambar), var(--ds-ambar-hot));"></i></span>
                    <span style="font-variant-numeric:tabular-nums; color:var(--ds-texto);"><b>${t.semana[chave].toLocaleString('pt-BR')}</b> <span style="color:var(--ds-texto-3);">· hoje ${t.hoje[chave].toLocaleString('pt-BR')}</span></span>
                </div>`;
            return `
                <div style="padding:14px 16px; border-radius:var(--ds-raio-md); background:var(--ds-elevado); margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; flex-wrap:wrap;">
                        <span style="font-size:.72rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ds-texto-3);">${titulo}</span>
                        ${tagVariacao(t.hoje, t.semana)}
                    </div>
                    <div style="font:600 1.8rem/1.1 var(--ds-fonte-titulo); letter-spacing:-.02em; color:var(--ds-texto); margin:6px 0 2px;">${totalHoje.toLocaleString('pt-BR')} <span style="font:500 .8rem var(--ds-fonte); color:var(--ds-texto-3);">${unidade} hoje</span></div>
                    <div style="font-size:.72rem; color:var(--ds-texto-3);">Últimos 7 dias por MCC</div>
                    ${barra('MCC 2', 'mcc2')}${barra('MCC 3', 'mcc3')}${barra('MCC 4', 'mcc4')}
                </div>`;
        };

        container.innerHTML = bloco('Tonelagem', 'ton', totaisTon) + bloco('Panelas de molde', 'panelas', totaisPanelas);
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
// 6) MAPA DOS VEIOS + TOPO "COMANDO" (redesign do Painel Geral)
// ==============================================================
// Tudo aqui é síncrono e só lê BANCO_ATIVOS — por isso roda também em
// window.renderPainelSincrono(), chamado de atualizarPainelCompleto()
// toda vez que os dados chegam do servidor. Antes, o donut de risco e o
// ranking só eram desenhados uma vez na abertura (com o cache local
// ainda velho) e ficavam desatualizados: o card de cima dizia 113
// críticos e o donut, 4.

const MCC_POR_VEIO = { C: '2', D: '2', E: '3', F: '3', G: '4', H: '4' };
const VEIOS_POR_MCC = { '2': ['C', 'D'], '3': ['E', 'F'], '4': ['G', 'H'] };
let mapaFiltro = 'todos';
let mapaSelecionado = null;

const pctDe = a => (a.meta > 0 ? (a.ton / a.meta) * 100 : 0);
const classeDesgaste = pct => (pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : '');
const corDesgaste = pct => `var(--pg-${pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : 'c0'})`;
const escapar = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTon = n => (n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' mi' : Math.round(n / 1000).toLocaleString('pt-BR') + ' mil');
const rotulo = a => (typeof window.rotuloEquipamento === 'function' ? window.rotuloEquipamento(a) : a.id);

function ativosInstalados() {
    return BANCO_ATIVOS.filter(a => a.veio && MCC_POR_VEIO[a.veio] && a.local && !String(a.local).includes('Oficina'));
}

function ordenarNaMaquina(lista) {
    return lista.slice().sort((a, b) =>
        (a.ordem ?? 999) - (b.ordem ?? 999) ||
        String(a.posicaoFixa ?? a.pos ?? '').localeCompare(String(b.posicaoFixa ?? b.pos ?? ''), 'pt-BR', { numeric: true }) ||
        String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }));
}

function passaFiltro(a) {
    if (mapaFiltro === 'todos') return true;
    if (mapaFiltro === 'criticos') return pctDe(a) >= 80;
    return a.tipo === mapaFiltro;
}

function htmlDetalhe(a) {
    if (!a) return `<span><i class="fas fa-hand-pointer" style="color:var(--ds-ambar)"></i>&nbsp; Passe o mouse ou toque numa barra para ver a peça.</span>`;
    const pct = pctDe(a);
    return `
        <div><strong>${escapar(rotulo(a))}</strong><div style="font-size:.76rem;color:var(--ds-texto-3)">${escapar(a.tipo)} · ${escapar(a.local)}${a.pos ? ' · ' + escapar(a.pos) : ''}</div></div>
        <div><span class="pg-det-pct" style="color:${corDesgaste(pct)}">${pct.toFixed(1).replace('.', ',')}%</span><div style="font-size:.74rem;color:var(--ds-texto-3)">${fmtTon(a.ton)} de ${fmtTon(a.meta)} t</div></div>
        <div><span class="pg-det-pct" style="color:var(--ds-texto)">${a.dias || 0}</span><div style="font-size:.74rem;color:var(--ds-texto-3)">dias na máquina</div></div>
        <button type="button" class="ds-pill ds-pill-mini ds-pill-cheia" onclick="window.abrirHistoricoIndividual && window.abrirHistoricoIndividual('${escapar(a.id)}')">Abrir prontuário <i class="fas fa-arrow-right"></i></button>`;
}

function renderMapaVeios() {
    const container = document.getElementById('painel-mapa-veios');
    if (!container) return;
    const instalados = ativosInstalados();
    if (instalados.length === 0) {
        container.innerHTML = `<div class="text-muted" style="grid-column:1/-1;text-align:center;padding:30px 0;">Nenhuma peça instalada nos veios no momento.</div>`;
        return;
    }
    const porVeio = {};
    instalados.forEach(a => (porVeio[a.veio] ||= []).push(a));

    // filtros: todos, críticos e os tipos mais comuns
    const contagemTipo = {};
    instalados.forEach(a => { contagemTipo[a.tipo] = (contagemTipo[a.tipo] || 0) + 1; });
    const tipos = Object.entries(contagemTipo).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([t]) => t);
    if (mapaFiltro !== 'todos' && mapaFiltro !== 'criticos' && !tipos.includes(mapaFiltro)) mapaFiltro = 'todos';
    const filtroBtn = (v, txt) => `<button type="button" class="pg-filtro${mapaFiltro === v ? ' on' : ''}" data-filtro="${escapar(v)}">${escapar(txt)}</button>`;

    let atraso = 0;
    const blocoVeio = veio => {
        const lista = ordenarNaMaquina(porVeio[veio] || []);
        if (!lista.length) return `<div><div class="pg-veio-topo"><span>Veio <b>${veio}</b></span></div><div class="pg-veio-vazio">Sem peças registradas.</div></div>`;
        const media = lista.reduce((s, a) => s + pctDe(a), 0) / lista.length;
        const crit = lista.filter(a => pctDe(a) >= 80).length;
        // 🎨 Perfil de desgaste: uma barra fina por peça, do molde à
        // saída do veio; altura = % da meta (teto visual 125%), linhas de
        // referência em 80% e 100%. (Antes: quadradinhos coloridos — o
        // usuário achou infantil.)
        const TETO = 125;
        let tipoAnterior = null;
        const barras = lista.map(a => {
            const sep = tipoAnterior !== null && a.tipo !== tipoAnterior ? ' sep' : '';
            tipoAnterior = a.tipo;
            const pct = pctDe(a);
            const destaque = mapaFiltro !== 'todos' && passaFiltro(a) ? ' destaque' : '';
            const ativa = mapaSelecionado === a.id ? ' ativa' : '';
            const d = Math.min(atraso++ * 3, 500);
            return `<button type="button" class="pg-b ${classeDesgaste(pct)}${sep}${destaque}${ativa}" data-id="${escapar(a.id)}" aria-label="${escapar(rotulo(a))}, ${pct.toFixed(0)} por cento"><i style="height:${Math.max(4, Math.min(pct, TETO) / TETO * 100)}%;animation-delay:${d}ms"></i></button>`;
        }).join('');
        return `<div class="pg-veio">
            <div class="pg-veio-topo"><span>Veio <b>${veio}</b> · ${lista.length} peças</span><span>${crit ? `<span class="pg-veio-crit">${crit} crítica${crit > 1 ? 's' : ''}</span> · ` : ''}méd. <b style="color:${corDesgaste(media)}">${media.toFixed(0)}%</b></span></div>
            <div class="pg-perfil">
                <span class="pg-ref" style="bottom:${80 / TETO * 100}%"><em>80%</em></span>
                <span class="pg-ref pg-ref-meta" style="bottom:${100 / TETO * 100}%"><em>meta</em></span>
                ${barras}
            </div>
            <div class="pg-perfil-eixo"><span>molde</span><span>saída</span></div>
        </div>`;
    };

    const blocosMcc = Object.entries(VEIOS_POR_MCC).map(([mcc, veios]) => {
        const lista = veios.flatMap(v => porVeio[v] || []);
        const media = lista.length ? lista.reduce((s, a) => s + pctDe(a), 0) / lista.length : 0;
        return `<div class="pg-mcc">
            <div class="pg-mcc-topo"><span class="pg-mcc-nome">MCC ${mcc}</span><span class="pg-mcc-media">desgaste médio <b style="color:${corDesgaste(media)}">${media.toFixed(0)}%</b></span></div>
            ${veios.map(blocoVeio).join('')}
        </div>`;
    }).join('');

    const sel = mapaSelecionado && instalados.find(a => a.id === mapaSelecionado);
    container.classList.toggle('filtrando', mapaFiltro !== 'todos');
    container.innerHTML = `
        <div class="pg-mapa-filtros" style="grid-column:1/-1">${filtroBtn('todos', 'Todas')}${filtroBtn('criticos', 'Só críticas ≥ 80%')}${tipos.map(t => filtroBtn(t, t)).join('')}</div>
        ${blocosMcc}
        <div class="pg-mapa-detalhe" id="pg-mapa-detalhe">${htmlDetalhe(sel)}</div>`;

    if (!container.__pgLigado) {
        container.__pgLigado = true;
        container.addEventListener('click', ev => {
            const f = ev.target.closest('.pg-filtro');
            if (f) { mapaFiltro = f.dataset.filtro; renderMapaVeios(); return; }
            const c = ev.target.closest('.pg-b');
            if (!c) return;
            mapaSelecionado = c.dataset.id;
            container.querySelectorAll('.pg-b.ativa').forEach(x => x.classList.remove('ativa'));
            c.classList.add('ativa');
            const det = document.getElementById('pg-mapa-detalhe');
            if (det) det.innerHTML = htmlDetalhe(ativosInstalados().find(a => a.id === mapaSelecionado));
        });
        // mouse (ou dedo arrastando) "varre" o perfil e mostra a peça na hora
        container.addEventListener('pointermove', ev => {
            if (ev.pointerType !== 'mouse' && !ev.buttons) return;
            const alvo = document.elementFromPoint(ev.clientX, ev.clientY);
            const c = alvo && alvo.closest && alvo.closest('.pg-b');
            if (!c || c.dataset.id === mapaSelecionado) return;
            c.click();
        });
    }
}

function renderPainelComando() {
    const agora = new Date();
    const elData = document.getElementById('pg-hero-data');
    if (!elData) return;
    elData.textContent = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const h = agora.getHours();
    document.getElementById('pg-hero-saudacao').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    let nome = '';
    try { nome = (JSON.parse(localStorage.getItem('oms_operador_v32_local') || 'null')?.nome || ''); } catch (e) { /* sem operador */ }
    nome = String(nome).replace(/\s*\[.*\]\s*$/, '').trim().split(/\s+/)[0] || '';
    document.getElementById('pg-hero-nome').textContent = nome ? ', ' + nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase() : '';

    // mesmas regras de calcularKpisGlobais (script.js), pra os números baterem
    let criticos = 0, acimaMeta = 0, reparo = 0, reserva = 0, foraOficina = 0;
    BANCO_ATIVOS.forEach(a => {
        const pct = pctDe(a);
        const local = String(a.local || '');
        if (!local.includes('Oficina')) { foraOficina++; if (pct >= 80) criticos++; if (pct >= 100) acimaMeta++; }
        if (local === 'Oficina / Reparo') reparo++;
        if (local === 'Oficina / Reserva' || local === 'Máquina / Reserva') reserva++;
    });
    const total = BANCO_ATIVOS.length;
    const instalados = ativosInstalados();
    const saudaveis = instalados.filter(a => pctDe(a) < 80).length;
    const saude = instalados.length ? Math.round((saudaveis / instalados.length) * 100) : 0;

    const anel = document.getElementById('pg-anel-valor');
    if (anel) {
        anel.setAttribute('stroke-dasharray', `${saude} 100`);
        anel.style.stroke = saude >= 70 ? 'var(--ds-ok)' : saude >= 45 ? 'var(--ds-ambar)' : 'var(--ds-perigo)';
    }
    const pctEl = document.getElementById('pg-saude-pct');
    if (pctEl) pctEl.textContent = instalados.length ? saude + '%' : '--';

    const resumo = document.getElementById('pg-hero-resumo');
    if (resumo) {
        resumo.innerHTML = total === 0
            ? 'Aguardando os dados dos veios…'
            : `<b class="pg-num-perigo">${criticos}</b> peça${criticos === 1 ? '' : 's'} acima de 80% da meta` +
              (acimaMeta ? ` — <b>${acimaMeta}</b> já passaram dela` : '') +
              `. <b>${reparo}</b> na oficina e <b>${reserva}</b> reserva${reserva === 1 ? '' : 's'} pronta${reserva === 1 ? '' : 's'} pra troca.`;
    }

    const sub = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    const barra = (id, frac) => { const e = document.getElementById(id); if (e) e.style.width = Math.max(0, Math.min(100, frac * 100)) + '%'; };
    const pctTxt = (n, d) => (d ? Math.round((n / d) * 100) : 0) + '%';
    sub('pg-kpi-sub-criticos', `${pctTxt(criticos, foraOficina)} das ${foraOficina} instaladas`);
    barra('pg-kpi-barra-criticos', foraOficina ? criticos / foraOficina : 0);
    sub('pg-kpi-sub-reparo', `${pctTxt(reparo, total)} da frota na oficina`);
    barra('pg-kpi-barra-reparo', total ? reparo / total : 0);
    sub('pg-kpi-sub-reserva', reparo ? `cobrem ${pctTxt(Math.min(reserva, reparo), reparo)} das peças em reparo` : 'prontas pra troca');
    barra('pg-kpi-barra-reserva', reparo ? Math.min(1, reserva / reparo) : 1);
    sub('pg-kpi-sub-total', `${instalados.length} nos veios · ${total - foraOficina} na oficina`);
    barra('pg-kpi-barra-total', total ? instalados.length / total : 0);
}

window.renderPainelSincrono = function() {
    try { renderPainelComando(); } catch (e) { console.error('⚠️ Painel (comando):', e); }
    try { renderMapaVeios(); } catch (e) { console.error('⚠️ Painel (mapa dos veios):', e); }
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