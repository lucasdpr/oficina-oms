// ==========================================================================
// PAINEL DO SUPERVISOR — organização em sub-abas + "Precisa de você agora"
// ==========================================================================
// A aba tinha ~16 telas de rolagem, com o que precisa de ação misturado a
// estatística. Aqui:
// - "Precisa de você agora" no topo: só o que pede decisão/ação do
//   supervisor, cada item com o botão pra agir;
// - o resto vai pra sub-abas (Visão geral / Oficina / Máquinas / Equipe /
//   Qualidade / Tendências). As seções continuam sendo desenhadas pelo
//   renderPainelSupervisor de sempre (script.js) — este arquivo só MOVE os
//   blocos já existentes pra dentro das sub-abas, uma vez.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { headersAdmin, atividadeEstaAtrasada } from '../Core/utils.js';

const SUBABAS = [
    { chave: 'geral',      rotulo: 'Visão geral', icone: 'fa-gauge-high',
      blocos: ['.painel-sup-graficos', '#painel-supervisor-ranking-veios', '#painel-supervisor-atividades-recentes', '.painel-geral-linha4'] },
    { chave: 'oficina',    rotulo: 'Oficina',     icone: 'fa-screwdriver-wrench', blocos: ['.painel-sup-secao-saude', '.painel-sup-secao-estoque'] },
    { chave: 'maquinas',   rotulo: 'Máquinas',    icone: 'fa-industry',
      blocos: ['.painel-fila-inspecao', '.painel-sup-secao-sinotico', '.painel-sup-secao-previsoes', '.painel-sup-secao-historico'] },
    { chave: 'equipe',     rotulo: 'Equipe',      icone: 'fa-users', blocos: ['.painel-sup-secao-produtividade', '.painel-sup-secao-efetivo'] },
    { chave: 'qualidade',  rotulo: 'Qualidade',   icone: 'fa-magnifying-glass', blocos: ['.painel-sup-secao-qualidade'] },
    { chave: 'tendencias', rotulo: 'Tendências',  icone: 'fa-chart-line', blocos: ['.painel-sup-secao-tendencia'] },
];
const CHAVE_SUBABA = 'oms_sup_subaba';

function blocoRaiz(aba, seletor) {
    // sobe até o filho direto da <section> (o bloco inteiro, com título)
    let el = aba.querySelector(seletor);
    while (el && el.parentElement && el.parentElement !== aba) el = el.parentElement;
    return el && el.parentElement === aba ? el : null;
}

function organizarSubabas() {
    const aba = document.getElementById('aba-painel-supervisor');
    if (!aba || aba.dataset.subabas === '1') return;
    const ancora = document.getElementById('painel-supervisor-hero');
    if (!ancora) return;
    aba.dataset.subabas = '1';

    // "Precisa de ajuda?" só abria um alert — sai do painel.
    aba.querySelectorAll('.painel-ajuda-card').forEach(el => el.remove());

    const atencao = document.createElement('div');
    atencao.className = 'adm-bloco sup-atencao';
    atencao.innerHTML = `<div class="adm-bloco-titulo"><i class="fas fa-bell"></i> Precisa de você agora <small>o que está esperando uma decisão ou ação</small></div>
        <div id="sup-atencao" class="adm-atencao-grid"><div class="text-muted" style="padding:16px;">Verificando...</div></div>`;

    const barra = document.createElement('div');
    barra.className = 'sup-subabas';
    barra.setAttribute('role', 'tablist');
    const paineis = document.createElement('div');
    paineis.className = 'sup-subabas-conteudo';

    SUBABAS.forEach(cfg => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sup-subaba';
        btn.dataset.chave = cfg.chave;
        btn.setAttribute('role', 'tab');
        btn.innerHTML = `<i class="fas ${cfg.icone}"></i> ${cfg.rotulo}`;
        btn.addEventListener('click', () => mostrarSubaba(cfg.chave));
        barra.appendChild(btn);

        const painel = document.createElement('div');
        painel.className = 'sup-subaba-painel';
        painel.dataset.chave = cfg.chave;
        cfg.blocos.forEach(sel => { const b = blocoRaiz(aba, sel); if (b) painel.appendChild(b); });
        paineis.appendChild(painel);
    });

    ancora.after(atencao, barra, paineis);
    let inicial = 'geral';
    try { inicial = localStorage.getItem(CHAVE_SUBABA) || 'geral'; } catch (e) { /* sem storage */ }
    mostrarSubaba(SUBABAS.some(s => s.chave === inicial) ? inicial : 'geral');
}

function mostrarSubaba(chave) {
    document.querySelectorAll('#aba-painel-supervisor .sup-subaba').forEach(b => {
        const ativo = b.dataset.chave === chave;
        b.classList.toggle('active', ativo);
        b.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    document.querySelectorAll('#aba-painel-supervisor .sup-subaba-painel').forEach(p => p.classList.toggle('hidden', p.dataset.chave !== chave));
    try { localStorage.setItem(CHAVE_SUBABA, chave); } catch (e) { /* sem storage */ }
}
window.mostrarSubabaSupervisor = mostrarSubaba;

// --------------------------------------------------------------
// "PRECISA DE VOCÊ AGORA"
// --------------------------------------------------------------
const esc = (t) => (typeof window.escapeHtmlNotif === 'function' ? window.escapeHtmlNotif(String(t ?? '')) : String(t ?? ''));
const diasDesde = (txt) => { if (!txt) return null; const d = new Date(String(txt).replace(' ', 'T').slice(0, 19)); return isNaN(d) ? null : Math.floor((Date.now() - d) / 864e5); };
const semMarcador = (t) => String(t || '').replace(/\[[^\]]+\]\s*/g, '').replace(/<[^>]+>/g, '');
async function json(apiBase, caminho, comAuth = false) {
    try { const r = await fetch(`${apiBase}${caminho}`, { cache: 'no-store', headers: comAuth ? headersAdmin() : {} }); return r.ok ? await r.json() : null; }
    catch (e) { return null; }
}
function cartao({ nivel = '', num, titulo, desc, lista = [], acoes = '' }) {
    return `<div class="adm-alerta ${nivel}">
        <div class="adm-alerta-topo"><span class="adm-alerta-num">${num}</span><span class="adm-alerta-titulo">${titulo}</span></div>
        <div class="adm-alerta-desc">${desc}</div>
        ${lista.length ? `<div class="adm-alerta-lista">${lista.join('')}</div>` : ''}
        ${acoes ? `<div class="adm-alerta-acoes">${acoes}</div>` : ''}
    </div>`;
}

async function renderizarAtencaoSupervisor() {
    const el = document.getElementById('sup-atencao');
    if (!el) return;
    const apiBase = await resolverApiBase();
    const [atividades, progresso, qualidade, mensagens] = await Promise.all([
        json(apiBase, '/api/oficina/atividades?limite=1000'),
        json(apiBase, '/api/checklist-execucao/progresso'),
        json(apiBase, '/api/qualidade'),
        json(apiBase, '/api/mensagens_area/resumo', true),
    ]);
    const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : [];
    const peca = new Map(ativos.map(a => [a.id, a]));
    const atv = Array.isArray(atividades) ? atividades : [];
    const prog = Array.isArray(progresso) ? progresso : [];
    const c = [];

    // 1. Atividades atrasadas (prazo vencido)
    const atrasadas = atv.filter(a => a.status !== 'Recusado' && atividadeEstaAtrasada(a)).map(a => ({ ...a, dias: diasDesde(a.prazo) })).sort((a, b) => (b.dias || 0) - (a.dias || 0));
    if (atrasadas.length) c.push(cartao({ nivel: 'critico', num: atrasadas.length, titulo: 'Atividades atrasadas',
        desc: 'Prazo vencido e ainda não concluídas.',
        lista: atrasadas.slice(0, 8).map(a => `<div><span><b>${esc(a.area)}</b> · ${esc(semMarcador(a.descricao).slice(0, 48))}</span><span>${a.dias ?? '?'} d</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-area-oficina')">Central de Áreas</button>` }));

    // 2. Pronto pra concluir (checklist 100% + folhão salvo)
    const prontos = prog.filter(p => p.completo && p.folhao_salvo);
    if (prontos.length) c.push(cartao({ nivel: 'ok', num: prontos.length, titulo: 'Prontos pra concluir',
        desc: 'Checklist 100% e folhão salvo — só falta clicar em Concluir pra ir pra Reserva e avisar a Logística.',
        lista: prontos.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><button class="btn-outline-neutral" onclick="window.abrirChecklistExecucao('${esc(p.equipamento_id)}')">Abrir</button></div>`) }));

    // 3. Checklist 100% mas sem folhão
    const semFolhao = prog.filter(p => p.completo && !p.folhao_salvo);
    if (semFolhao.length) c.push(cartao({ num: semFolhao.length, titulo: 'Checklist pronto, falta o folhão',
        desc: 'Todas as etapas marcadas, mas o folhão desse reparo ainda não foi salvo.',
        lista: semFolhao.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><button class="btn-outline-neutral" onclick="window.abrirFolhaoPorTipo('${esc(p.equipamento_id)}')">Folhão</button></div>`) }));

    // 4. Reparo que não tem como terminar (checklist sem etapas)
    const travados = prog.filter(p => Number(p.total) === 0 && peca.get(p.equipamento_id)?.local === 'Oficina / Reparo');
    if (travados.length) c.push(cartao({ nivel: 'critico', num: travados.length, titulo: 'Reparo travado (checklist vazio)',
        desc: 'O checklist desse reparo não tem nenhuma etapa, então nunca chega a 100% e o Concluir nunca libera. Fale com o ADM do sistema.',
        lista: travados.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><span class="text-muted">${esc(p.tipo_equipamento)}</span></div>`) }));

    // 5. Reparos parados (> 7 dias, abaixo de 50%)
    const parados = prog.map(p => ({ ...p, dias: diasDesde(p.iniciada_em) }))
        .filter(p => Number(p.total) > 0 && p.dias > 7 && Number(p.percentual) < 50 && peca.get(p.equipamento_id)?.local === 'Oficina / Reparo')
        .sort((a, b) => b.dias - a.dias);
    if (parados.length) c.push(cartao({ num: parados.length, titulo: 'Reparos andando devagar',
        desc: 'Começaram há mais de 7 dias e estão abaixo de 50% do checklist.',
        lista: parados.map(p => `<div><span><b>${esc(p.equipamento_id)}</b> · ${Math.round(Number(p.percentual))}%</span><span>${p.dias} d</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-reparos')">Ver reparos</button>` }));

    // 6. Na máquina acima da meta de desgaste
    const acima = ativos.filter(a => (a.local || '').startsWith('MCC') && a.meta > 0 && a.ton >= a.meta).sort((a, b) => (b.ton / b.meta) - (a.ton / a.meta));
    if (acima.length) c.push(cartao({ nivel: 'critico', num: acima.length, titulo: 'Na máquina acima da meta',
        desc: 'Já passaram da tonelagem/meta de vida útil e continuam instaladas — candidatas à próxima troca.',
        lista: acima.slice(0, 8).map(a => `<div><span><b>${esc(window.rotuloEquipamento(a))}</b> · ${esc(a.local)}</span><span>${Math.round(a.ton / a.meta * 100)}%</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.mostrarSubabaSupervisor('maquinas')">Ver fila de inspeção</button>` }));

    // 7. Reserva da Oficina sem pedido pra Logística
    const logAbertas = atv.filter(a => a.area === 'logistica' && a.status !== 'Concluído' && a.status !== 'Recusado');
    const comPedido = new Set(logAbertas.map(a => ((a.descricao || '').match(/\[REABASTECER_RESERVA:([^\]]+)\]/) || [])[1]).filter(Boolean));
    const semPedido = ativos.filter(a => a.local === 'Oficina / Reserva' && !comPedido.has(a.id));
    if (semPedido.length) c.push(cartao({ num: semPedido.length, titulo: 'Reserva parada na oficina',
        desc: 'Peça pronta sem pedido pra Logística levar pra Reserva da Máquina.',
        lista: semPedido.map(a => `<div><span><b>${esc(window.rotuloEquipamento(a))}</b> · ${esc(a.tipo)}</span><button class="btn-outline-neutral" onclick="window.enviarReservaParaMaquina('${esc(a.id)}')">Pedir</button></div>`) }));

    // 8. Logística atrasada
    const logAtras = logAbertas.map(a => ({ ...a, dias: diasDesde(a.criado_em) })).filter(a => a.dias >= 2).sort((a, b) => b.dias - a.dias);
    if (logAtras.length) c.push(cartao({ num: logAtras.length, titulo: 'Logística com pedido parado',
        desc: 'Transportes pedidos há 2 dias ou mais e ainda não feitos.',
        lista: logAtras.map(a => `<div><span>${esc(semMarcador(a.descricao).slice(0, 52))}</span><span>${a.dias} d</span></div>`) }));

    // 9. Qualidade aguardando
    const qual = (Array.isArray(qualidade) ? qualidade : []).filter(q => q.status && q.status !== 'Concluído');
    if (qual.length) c.push(cartao({ nivel: 'info', num: qual.length, titulo: 'Qualidade aguardando',
        desc: 'Inspeções de entrada/saída ainda abertas' + (qual.some(q => Number(q.achados_pendentes) > 0) ? ', algumas com achado pendente.' : '.'),
        lista: qual.slice(0, 6).map(q => `<div><span><b>${esc(q.peca_id)}</b> · ${esc(q.status)}</span><span>${Number(q.achados_pendentes) || 0} achado(s)</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-qualidade')">Abrir Qualidade</button>` }));

    // 10. Mensagens das áreas sem resposta
    const msgs = (Array.isArray(mensagens) ? mensagens : []).filter(m => Number(m.nao_lidas) > 0);
    if (msgs.length) c.push(cartao({ nivel: 'info', num: msgs.reduce((s, m) => s + Number(m.nao_lidas), 0), titulo: 'Mensagens das áreas',
        desc: 'Mensagens das áreas ainda não lidas.',
        lista: msgs.map(m => `<div><span>${esc(m.nome_area || m.area)}</span><span>${Number(m.nao_lidas)}</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-chats')">Abrir conversas</button>` }));

    el.innerHTML = c.length ? c.join('') : cartao({ nivel: 'ok', num: '✓', titulo: 'Nada esperando por você', desc: 'Sem atraso, sem reparo travado e sem pendência de logística ou qualidade agora.' });
}

// Liga no carregamento do painel (renderPainelSupervisor fica em script.js)
function ligar() {
    const original = window.renderPainelSupervisor;
    if (typeof original !== 'function' || original.__comSubabas) return false;
    const novo = async function () {
        organizarSubabas();
        const r = original.apply(this, arguments);
        renderizarAtencaoSupervisor();
        return r;
    };
    novo.__comSubabas = true;
    window.renderPainelSupervisor = novo;
    return true;
}
if (!ligar()) {
    // script.js pode carregar depois deste módulo
    const t = setInterval(() => { if (ligar()) clearInterval(t); }, 200);
    setTimeout(() => clearInterval(t), 15000);
}
