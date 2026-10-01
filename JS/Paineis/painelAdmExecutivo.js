// ==========================================================================
// PAINEL EXECUTIVO ADM — extraído de script.js na modularização
// ==========================================================================
// Orquestra o carregamento da aba-painel-adm: comunicados/avisos do
// sistema (criar, arquivar, excluir), badge de comunicados ativos e
// saudação. Mensagens das áreas/colaboradores/eventos recentes dessa
// mesma aba ainda são preenchidos por funções que moram noutro lugar
// (chamadas via window.X, não fazem parte deste arquivo).

import { resolverApiBase } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO } from '../Core/estado.js';
import { fetchComRetry, headersAdmin } from '../Core/utils.js';


// --------------------------------------------------------------
// 🆕 PAINEL ADM — orquestra o carregamento de tudo que aparece na aba
// aba-painel-adm: comunicados (reaproveita renderizarListaAvisosAdm,
// já existia), mensagens das áreas, colaboradores e eventos recentes.
// --------------------------------------------------------------
window.renderPainelAdmExecutivo = async function() {
    const saudacaoEl = document.getElementById('painel-adm-saudacao');
    if (saudacaoEl) {
        const nomeAdm = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || '').replace(/\s*\[.+?\]/, '').trim() : '';
        saudacaoEl.textContent = nomeAdm ? `Olá, ${nomeAdm}!` : 'Olá!';
    }

    if (typeof window.renderizarListaAvisosAdm === 'function') window.renderizarListaAvisosAdm();

    const apiBase = await resolverApiBase();

    // Comunicados ativos (badge do hero) — mesma fonte da lista abaixo.
    (async () => {
        const badge = document.getElementById('painel-adm-badge-comunicados');
        try {
            const resp = await fetch(`${apiBase}/api/avisos/todos`, { cache: 'no-store' });
            const avisos = resp.ok ? await resp.json() : [];
            const ativos = Array.isArray(avisos) ? avisos.filter(a => a.ativo).length : 0;
            if (badge) badge.innerHTML = `<i class="fas fa-bullhorn"></i> ${ativos} <span>Comunicados ativos</span>`;
        } catch (e) {
            if (badge) badge.innerHTML = `<i class="fas fa-bullhorn"></i> – <span>Comunicados ativos</span>`;
        }
    })();

    // Mensagens das áreas — resumo por área (canal supervisão) + badge de não lidas.
    (async () => {
        const container = document.getElementById('painel-adm-mensagens-areas');
        const badge = document.getElementById('painel-adm-badge-mensagens');
        try {
            const resp = await fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store', headers: headersAdmin() });
            const resumo = resp.ok ? await resp.json() : [];
            const totalNaoLidas = Array.isArray(resumo) ? resumo.reduce((s, r) => s + (Number(r.nao_lidas) || 0), 0) : 0;
            if (badge) badge.innerHTML = `<i class="fas fa-comments"></i> ${totalNaoLidas} <span>Mensagens não lidas</span>`;

            if (container) {
                const comConversa = Array.isArray(resumo) ? resumo.slice().sort((a, b) => (Number(b.nao_lidas) || 0) - (Number(a.nao_lidas) || 0)) : [];
                container.innerHTML = comConversa.length
                    ? comConversa.slice(0, 8).map(r => `
                        <div class="flex-between" style="padding:8px 0; border-top:1px solid var(--border-color); cursor:pointer;" onclick="window.abrirAba(event,'aba-chats'); window.chatsSelecionarConversa && window.chatsSelecionarConversa('${r.area}', true);">
                            <span style="font-size:0.85rem; color:var(--text-body);">${r.nome_area || r.area}</span>
                            ${Number(r.nao_lidas) > 0 ? `<span style="background:var(--danger); color:#fff; font-size:11px; font-weight:700; padding:1px 8px; border-radius:10px;">${r.nao_lidas}</span>` : `<span class="text-muted" style="font-size:11px;">em dia</span>`}
                        </div>`).join('')
                    : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma conversa ainda.</div>`;
            }
        } catch (e) {
            if (container) container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
        }
    })();

    // Colaboradores — ativos/inativos, por cargo.
    (async () => {
        const container = document.getElementById('painel-adm-colaboradores-resumo');
        const badge = document.getElementById('painel-adm-badge-colaboradores');
        try {
            const resp = await fetch(`${apiBase}/api/colaboradores/todos`, { cache: 'no-store', headers: headersAdmin() });
            const colaboradores = resp.ok ? await resp.json() : [];
            const ativos = Array.isArray(colaboradores) ? colaboradores.filter(c => c.ativo) : [];
            if (badge) badge.innerHTML = `<i class="fas fa-users"></i> ${ativos.length} <span>Colaboradores ativos</span>`;

            if (container) {
                const porCargo = {};
                ativos.forEach(c => { const cargo = c.cargo || 'Sem cargo'; porCargo[cargo] = (porCargo[cargo] || 0) + 1; });
                const inativos = Array.isArray(colaboradores) ? colaboradores.length - ativos.length : 0;
                const linhas = Object.entries(porCargo).sort((a, b) => b[1] - a[1]);
                container.innerHTML = `
                    ${linhas.map(([cargo, qtd]) => `
                        <div class="flex-between" style="padding:6px 0; border-top:1px solid var(--border-color);">
                            <span style="font-size:0.85rem; color:var(--text-body);">${cargo}</span>
                            <span style="font-size:0.85rem; font-weight:600; color:var(--text-heading);">${qtd}</span>
                        </div>`).join('')}
                    ${inativos > 0 ? `<div class="flex-between" style="padding:6px 0; border-top:1px solid var(--border-color);">
                        <span class="text-muted" style="font-size:0.8rem;">Inativos</span>
                        <span class="text-muted" style="font-size:0.8rem;">${inativos}</span>
                    </div>` : ''}
                `;
            }
        } catch (e) {
            if (container) container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
        }
    })();

    // Últimos eventos do sistema (mesma fonte da Auditoria Global).
    (async () => {
        const container = document.getElementById('painel-adm-eventos-recentes');
        if (!container) return;
        try {
            const resp = await fetchComRetry(`${apiBase}/api/historico_eventos?limite=10`);
            const eventos = resp.ok ? await resp.json() : [];
            container.innerHTML = Array.isArray(eventos) && eventos.length
                ? eventos.slice(0, 10).map(e => {
                    // data_hora já vem em horário de Brasília (agora_brasil no backend) — antes somava 'Z' e mostrava 3h a menos
                    const hora = e.data_hora ? new Date(e.data_hora.replace(' ', 'T').slice(0, 19)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '–';
                    return `
                    <div style="display:flex; gap:12px; padding:8px 0; border-top:1px solid var(--border-color);">
                        <span class="text-muted" style="font-size:0.72rem; font-family:var(--font-mono); flex-shrink:0; white-space:nowrap;">${hora}</span>
                        <span style="font-size:0.8rem; color:var(--text-body);">${window.formatarAcaoEvento(e.acao || e.peca_id || 'Evento registrado')}</span>
                    </div>`;
                }).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum evento recente.</div>`;
        } catch (e) {
            container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar.</div>`;
        }
    })();
};

// --------------------------------------------------------------
// 🆕 AVISOS DO SISTEMA — gestão (ADM) + leitura obrigatória (todo mundo)
// --------------------------------------------------------------
// Lista todos os avisos (ativos e arquivados) com progresso de leitura,
// no painel executivo do ADM.
window.renderizarListaAvisosAdm = async function() {
    const container = document.getElementById('adm-exec-avisos-lista');
    if (!container) return;
    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/avisos/todos`, { cache: 'no-store' });
        const avisos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(avisos) || avisos.length === 0) {
            container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum aviso criado ainda.</div>`;
            return;
        }

        container.innerHTML = avisos.map(a => {
            const total = Number(a.total_colaboradores) || 0;
            const leram = Number(a.total_leram) || 0;
            const pct = total > 0 ? Math.round((leram / total) * 100) : 0;
            return `
                <div style="padding:14px 0; border-bottom:1px solid var(--border); ${a.ativo ? '' : 'opacity:0.55;'}">
                    <div class="flex-between" style="gap:10px;">
                        <div style="min-width:0;">
                            <strong style="color:var(--text-heading);">${a.titulo}</strong>
                            ${!a.ativo ? '<span class="text-muted" style="font-size:11px; margin-left:6px;">(arquivado)</span>' : ''}
                            <div class="text-muted" style="font-size:12px; margin-top:4px; white-space:pre-wrap;">${a.mensagem}</div>
                            <div class="text-muted" style="font-size:11px; margin-top:6px;">${a.criado_por || 'Sistema'} · ${a.criado_em || ''}</div>
                        </div>
                        <div style="display:flex; gap:6px; flex-shrink:0;">
                            ${a.ativo ? `<button class="btn-xs-primary" onclick="window.arquivarAvisoAdm(${a.id})" title="Arquivar"><i class="fas fa-box-archive"></i></button>` : ''}
                            <button class="btn-xs-primary" style="color:var(--danger);" onclick="window.excluirAvisoAdm(${a.id})" title="Excluir definitivamente"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div style="margin-top:10px; display:flex; align-items:center; gap:10px;">
                        <div style="flex:1; background:var(--bg-td); border-radius:6px; height:8px; overflow:hidden;">
                            <div style="background:var(--success); height:100%; width:${Math.max(pct, total ? 2 : 0)}%; border-radius:6px;"></div>
                        </div>
                        <span class="text-muted" style="font-size:11px; white-space:nowrap;">${leram} de ${total} leram (${pct}%)</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar a lista de avisos no painel do ADM:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

window.abrirModalCriarAviso = function() {
    const modal = document.getElementById('modal-criar-aviso');
    if (modal) modal.classList.remove('hidden');
    const titulo = document.getElementById('aviso-novo-titulo');
    const mensagem = document.getElementById('aviso-novo-mensagem');
    if (titulo) titulo.value = '';
    if (mensagem) mensagem.value = '';
};

window.fecharModalCriarAviso = function() {
    const modal = document.getElementById('modal-criar-aviso');
    if (modal) modal.classList.add('hidden');
};

window.salvarNovoAviso = async function() {
    const titulo = document.getElementById('aviso-novo-titulo')?.value.trim();
    const mensagem = document.getElementById('aviso-novo-mensagem')?.value.trim();
    if (!titulo) return alert('Escreva um título pro aviso.');
    if (!mensagem) return alert('Escreva a mensagem do aviso.');

    try {
        const apiBase = await resolverApiBase();
        const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'ADM') : 'ADM';
        const resp = await fetch(`${apiBase}/api/avisos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, mensagem, criado_por: operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível salvar o aviso.');
            return;
        }
        window.fecharModalCriarAviso();
        if (typeof window.renderizarListaAvisosAdm === 'function') window.renderizarListaAvisosAdm();
    } catch (e) {
        console.error('⚠️ Erro ao criar aviso:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.arquivarAvisoAdm = async function(id) {
    if (!confirm('Arquivar este aviso? Quem ainda não leu deixa de ver — quem já leu continua registrado.')) return;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/avisos/arquivar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (typeof window.renderizarListaAvisosAdm === 'function') window.renderizarListaAvisosAdm();
    } catch (e) {
        console.error('⚠️ Erro ao arquivar aviso:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.excluirAvisoAdm = async function(id) {
    if (!confirm('Excluir este aviso definitivamente? Não dá pra desfazer.')) return;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/avisos/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (typeof window.renderizarListaAvisosAdm === 'function') window.renderizarListaAvisosAdm();
    } catch (e) {
        console.error('⚠️ Erro ao excluir aviso:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// (Leitura obrigatória dos avisos pendentes no login — verificarAvisosPendentes,
// mostrarProximoAvisoPendente, confirmarLeituraAvisoPendente — mora em
// Paineis/chats.js, junto com os outros avisos/notificações de sistema.)

// ==========================================================================
// 🆕 PAINEL ADM — PONTOS DE ATENÇÃO, PLANTA, SAÚDE, USO E EXPORTAÇÃO
// ==========================================================================
// Tudo com os dados que o servidor já entrega (nenhuma rota nova). Cada
// "ponto de atenção" só aparece quando tem algo pra resolver e já traz o
// botão de ação.

const escAdm = (t) => (typeof window.escapeHtmlNotif === 'function' ? window.escapeHtmlNotif(String(t ?? '')) : String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const dataAdm = (txt) => { if (!txt) return null; const d = new Date(String(txt).replace(' ', 'T')); return isNaN(d) ? null : d; };
const diasDesdeAdm = (txt) => { const d = dataAdm(txt); return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null; };
const REGEX_LOCAL_PADRAO = /^(MCC [234] - Veio [A-Z]|Oficina \/ (Reparo|Reserva)|Máquina \/ Reserva)$/;

async function buscarJsonAdm(apiBase, caminho) {
    try {
        const resp = await fetch(`${apiBase}${caminho}`, { cache: 'no-store', headers: headersAdmin() });
        return resp.ok ? await resp.json() : null;
    } catch (e) { return null; }
}

function cartaoAtencao({ nivel = '', num, titulo, desc, lista = [], acoes = '' }) {
    return `<div class="adm-alerta ${nivel}">
        <div class="adm-alerta-topo"><span class="adm-alerta-num">${num}</span><span class="adm-alerta-titulo">${titulo}</span></div>
        <div class="adm-alerta-desc">${desc}</div>
        ${lista.length ? `<div class="adm-alerta-lista">${lista.join('')}</div>` : ''}
        ${acoes ? `<div class="adm-alerta-acoes">${acoes}</div>` : ''}
    </div>`;
}

async function renderizarAtencaoAdm(apiBase) {
    const el = document.getElementById('adm-atencao');
    if (!el) return;
    const [colabs, execucoes, rascunhos, logistica, os, qualidade, padroes, reabertas] = await Promise.all([
        buscarJsonAdm(apiBase, '/api/colaboradores/todos'),
        buscarJsonAdm(apiBase, '/api/checklist-execucao/execucoes/todas'),
        buscarJsonAdm(apiBase, '/api/folhao/rascunhos/todos'),
        buscarJsonAdm(apiBase, '/api/oficina/atividades?area=logistica'),
        buscarJsonAdm(apiBase, '/api/ordens_servico'),
        buscarJsonAdm(apiBase, '/api/qualidade'),
        buscarJsonAdm(apiBase, '/api/qualidade/achados/padroes'),
        buscarJsonAdm(apiBase, '/api/oficina/atividades/mais_reabertas?limite=5'),
    ]);
    const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : [];
    const pecaPorId = new Map(ativos.map(a => [a.id, a]));
    const cartoes = [];

    // 1. Senha padrão (primeiro acesso nunca feito = senha é a matrícula)
    const senhaPadrao = (colabs || []).filter(c => c.ativo && c.primeiro_acesso);
    if (senhaPadrao.length) cartoes.push(cartaoAtencao({
        nivel: 'critico', num: senhaPadrao.length, titulo: 'Ainda com a senha inicial',
        desc: 'Nunca trocaram a senha do primeiro acesso, que é a própria matrícula — quem souber a matrícula entra como essa pessoa.',
        lista: senhaPadrao.map(c => `<div><span>${escAdm(c.nome)}</span><span class="text-muted">${escAdm(c.matricula)}</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-admin-colaboradores')">Abrir Administração</button>`
    }));

    // 2. Checklist aberto de peça que nem está em reparo (órfão)
    const execs = Array.isArray(execucoes) ? execucoes : [];
    const orfaos = execs.filter(e => { const p = pecaPorId.get(e.equipamento_id); return p && p.local !== 'Oficina / Reparo'; });
    if (orfaos.length) cartoes.push(cartaoAtencao({
        nivel: 'critico', num: orfaos.length, titulo: 'Checklist aberto fora do reparo',
        desc: 'A peça já saiu da oficina mas o checklist ficou aberto — no próximo reparo dela ele voltaria já marcado. Fechar resolve.',
        lista: orfaos.map(e => `<div><span><b>${escAdm(e.equipamento_id)}</b> · ${escAdm(pecaPorId.get(e.equipamento_id)?.local)}</span><button class="btn-outline-danger" onclick="window.fecharChecklistOrfaoAdm(${Number(e.id)}, '${escAdm(e.equipamento_id)}')">Fechar</button></div>`)
    }));

    // 3. Reparos parados há mais de 7 dias
    const parados = execs.map(e => ({ ...e, dias: diasDesdeAdm(e.iniciada_em) }))
        .filter(e => e.dias !== null && e.dias > 7 && pecaPorId.get(e.equipamento_id)?.local === 'Oficina / Reparo')
        .sort((a, b) => b.dias - a.dias);
    if (parados.length) cartoes.push(cartaoAtencao({
        num: parados.length, titulo: 'Reparos há mais de 7 dias',
        desc: 'Checklist iniciado há mais de uma semana e a peça continua em reparo.',
        lista: parados.map(e => `<div><span><b>${escAdm(e.equipamento_id)}</b> · ${escAdm(e.tecnico_nome || '')}</span><span>${e.dias} dias</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-reparos')">Ver reparos</button>`
    }));

    // 4. Reserva da Oficina sem pedido pra Logística
    const logAbertas = (Array.isArray(logistica) ? logistica : []).filter(a => a.status !== 'Concluído' && a.status !== 'Recusado');
    const comPedido = new Set(logAbertas.map(a => ((a.descricao || '').match(/\[REABASTECER_RESERVA:([^\]]+)\]/) || [])[1]).filter(Boolean));
    const semPedido = ativos.filter(a => a.local === 'Oficina / Reserva' && !comPedido.has(a.id));
    if (semPedido.length) cartoes.push(cartaoAtencao({
        num: semPedido.length, titulo: 'Na Reserva da Oficina sem pedido',
        desc: 'Peça pronta parada na oficina sem nenhum pedido aberto pra Logística levar pra Reserva da Máquina.',
        lista: semPedido.map(a => `<div><span><b>${escAdm(a.id)}</b> · ${escAdm(a.tipo)}</span><button class="btn-outline-neutral" onclick="window.enviarReservaParaMaquina('${escAdm(a.id)}')">Pedir</button></div>`)
    }));

    // 5. Logística com pedido parado
    const logAtrasadas = logAbertas.map(a => ({ ...a, dias: diasDesdeAdm(a.criado_em) })).filter(a => a.dias !== null && a.dias >= 2).sort((a, b) => b.dias - a.dias);
    if (logAtrasadas.length) cartoes.push(cartaoAtencao({
        num: logAtrasadas.length, titulo: 'Logística: pedidos há 2+ dias',
        desc: 'Transportes pedidos e ainda não concluídos.',
        lista: logAtrasadas.map(a => `<div><span>${escAdm((a.descricao || '').replace(/\[[^\]]+\]\s*/g, '').slice(0, 60))}</span><span>${a.dias} d</span></div>`)
    }));

    // 6. Folhão em rascunho sem mexer há 3+ dias
    const rascParados = (Array.isArray(rascunhos) ? rascunhos : []).map(r => ({ ...r, dias: diasDesdeAdm(r.atualizado_em) }))
        .filter(r => r.dias !== null && r.dias >= 3 && pecaPorId.get(r.equipamento_id)?.local === 'Oficina / Reparo').sort((a, b) => b.dias - a.dias);
    if (rascParados.length) cartoes.push(cartaoAtencao({
        nivel: 'info', num: rascParados.length, titulo: 'Folhões parados',
        desc: 'Folhão começado e sem nenhuma alteração há 3 dias ou mais.',
        lista: rascParados.map(r => `<div><span><b>${escAdm(r.equipamento_id)}</b> · ${escAdm(r.tipo_folhao || '')}</span><span>${r.dias} d</span></div>`)
    }));

    // 7. OS e Qualidade em aberto
    const osAbertas = (Array.isArray(os) ? os : []).filter(o => o.status !== 'Concluído' && o.status !== 'Encerrada');
    if (osAbertas.length) cartoes.push(cartaoAtencao({
        nivel: 'info', num: osAbertas.length, titulo: 'Ordens de Serviço abertas', desc: 'OS ainda não concluídas.',
        lista: osAbertas.slice(0, 8).map(o => `<div><span>OS ${escAdm(o.numero_os)} · ${escAdm(o.maquina || '')}</span><span>${escAdm(o.status)}</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-ordens-servico')">Abrir OS</button>`
    }));
    const qualAbertos = (Array.isArray(qualidade) ? qualidade : []).filter(q => q.status && q.status !== 'Concluído');
    if (qualAbertos.length) cartoes.push(cartaoAtencao({
        nivel: 'info', num: qualAbertos.length, titulo: 'Qualidade aguardando', desc: 'Inspeções de entrada/saída ainda não concluídas.',
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-qualidade')">Abrir Qualidade</button>`
    }));

    // 8. Defeito que se repete em vários equipamentos
    const padroesRelevantes = (Array.isArray(padroes) ? padroes : []).filter(p => Number(p.total_equipamentos) >= 2);
    if (padroesRelevantes.length) cartoes.push(cartaoAtencao({
        num: padroesRelevantes.length, titulo: 'Defeito repetido',
        desc: 'Mesma categoria de defeito aparecendo em vários equipamentos — pode ser causa comum.',
        lista: padroesRelevantes.slice(0, 6).map(p => `<div><span>${escAdm(p.categoria)}</span><span>${Number(p.total_equipamentos)} equip.</span></div>`)
    }));

    // 9. Retrabalho (atividades reabertas)
    const retrab = Array.isArray(reabertas) ? reabertas : [];
    if (retrab.length) cartoes.push(cartaoAtencao({
        nivel: 'info', num: retrab.reduce((s, r) => s + (Number(r.reaberturas_count) || 0), 0), titulo: 'Retrabalho',
        desc: 'Atividades que foram concluídas e precisaram ser reabertas.',
        lista: retrab.map(r => `<div><span>${escAdm((r.descricao || '').replace(/\[[^\]]+\]\s*/g, '').slice(0, 50))} · ${escAdm(r.area)}</span><span>${Number(r.reaberturas_count)}x</span></div>`)
    }));

    // 10. Local gravado fora do padrão
    const foraPadrao = ativos.filter(a => a.local && !REGEX_LOCAL_PADRAO.test(a.local));
    if (foraPadrao.length) {
        const porLocal = {};
        foraPadrao.forEach(a => { porLocal[a.local] = (porLocal[a.local] || 0) + 1; });
        cartoes.push(cartaoAtencao({
            nivel: 'info', num: foraPadrao.length, titulo: 'Local fora do padrão',
            desc: 'Peças com o local gravado de um jeito diferente do resto (ex: "MCC 2/3 - Veio C" em vez de "MCC 2 - Veio C") — podem não aparecer em alguma tela.',
            lista: Object.entries(porLocal).sort((a, b) => b[1] - a[1]).map(([l, n]) => `<div><span>${escAdm(l)}</span><span>${n}</span></div>`)
        }));
    }

    el.innerHTML = cartoes.length ? cartoes.join('') : cartaoAtencao({ nivel: 'ok', num: '✓', titulo: 'Tudo em dia', desc: 'Nenhum ponto de atenção no momento.' });
}

// Fecha um checklist que ficou aberto com a peça já fora da oficina.
window.fecharChecklistOrfaoAdm = async function(execucaoId, equipamentoId) {
    if (!confirm(`Fechar o checklist aberto de ${equipamentoId}?\n\nA peça não está mais em reparo. Fechar evita que o próximo reparo dela comece já marcado. As marcações continuam guardadas no histórico.`)) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/execucoes/finalizar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ execucao_id: execucaoId })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        if (window.registrarHistorico) await window.registrarHistorico(equipamentoId, '🔒 Checklist de execução que tinha ficado aberto foi fechado pelo ADM (peça já fora do reparo).');
        renderizarAtencaoAdm(apiBase);
    } catch (e) {
        alert('Não consegui fechar o checklist: ' + e.message);
    }
};

function renderizarPlantaAdm() {
    const el = document.getElementById('adm-planta');
    if (!el) return;
    const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : [];
    const categoria = (a) => a.local === 'Oficina / Reparo' ? 'reparo' : a.local === 'Oficina / Reserva' ? 'resOf' : a.local === 'Máquina / Reserva' ? 'resMaq' : (a.local || '').startsWith('MCC') ? 'maquina' : 'outros';
    const total = { maquina: 0, reparo: 0, resOf: 0, resMaq: 0, outros: 0 };
    const porMcc = {};
    ativos.forEach(a => {
        const c = categoria(a); total[c]++;
        const mcc = a.mcc_compat ? `MCC ${a.mcc_compat}` : 'Sem MCC';
        porMcc[mcc] = porMcc[mcc] || { maquina: 0, reparo: 0, resOf: 0, resMaq: 0, outros: 0 };
        porMcc[mcc][c]++;
    });
    const n = ativos.length || 1;
    const cores = { maquina: 'var(--success)', reparo: 'var(--danger)', resOf: 'var(--warning, #f59e0b)', resMaq: 'var(--info, #38bdf8)' };
    el.innerHTML = `
        <div class="adm-kpis">
            <div class="adm-kpi" onclick="window.abrirAba(event,'aba-painel')"><b style="color:${cores.maquina}">${total.maquina}</b><span>Na máquina</span></div>
            <div class="adm-kpi" onclick="window.abrirAba(event,'aba-reparos')"><b style="color:${cores.reparo}">${total.reparo}</b><span>Em reparo</span></div>
            <div class="adm-kpi" onclick="window.abrirAba(event,'aba-reservas')"><b style="color:${cores.resOf}">${total.resOf}</b><span>Reserva oficina</span></div>
            <div class="adm-kpi" onclick="window.abrirAba(event,'aba-reservas')"><b style="color:${cores.resMaq}">${total.resMaq}</b><span>Reserva máquina</span></div>
        </div>
        <div class="adm-barra">${['maquina', 'reparo', 'resOf', 'resMaq'].map(k => `<i style="width:${(total[k] / n * 100).toFixed(1)}%; background:${cores[k]}"></i>`).join('')}</div>
        <table class="adm-tabela"><thead><tr><th></th><th style="text-align:right">Máquina</th><th style="text-align:right">Reparo</th><th style="text-align:right">Res. oficina</th><th style="text-align:right">Res. máquina</th></tr></thead>
        <tbody>${Object.keys(porMcc).sort().map(m => `<tr><td>${escAdm(m)}</td><td class="n">${porMcc[m].maquina}</td><td class="n">${porMcc[m].reparo}</td><td class="n">${porMcc[m].resOf}</td><td class="n">${porMcc[m].resMaq}</td></tr>`).join('')}</tbody></table>
        ${total.outros ? `<p class="text-muted" style="font-size:0.72rem; margin-top:8px;">${total.outros} peça(s) com local não reconhecido.</p>` : ''}`;
}

async function renderizarSaudeAdm(apiBase) {
    const el = document.getElementById('adm-saude');
    if (!el) return;
    const medir = async (caminho) => {
        const t0 = performance.now();
        try { const r = await fetch(`${apiBase}${caminho}`, { cache: 'no-store' }); return { ok: r.ok, ms: Math.round(performance.now() - t0) }; }
        catch (e) { return { ok: false, ms: null }; }
    };
    const [api, banco] = await Promise.all([medir('/'), medir('/api/ping_db')]);
    const pill = (r) => !r.ok ? `<span class="adm-pill erro">fora do ar</span>` : `<span class="adm-pill ${r.ms > 3000 ? 'lento' : 'ok'}">${r.ms > 3000 ? 'lento' : 'no ar'} · ${r.ms} ms</span>`;
    let versao = '—';
    try { const k = (await caches.keys()).filter(n => /^oms-v\d+/.test(n)).sort().pop(); if (k) versao = k.replace('oms-', ''); } catch (e) { /* sem cache */ }
    let fila = 0;
    try { fila = (JSON.parse(localStorage.getItem('oms_fila_offline_v1') || '[]') || []).length; } catch (e) { /* ignora */ }
    let sessao = '—';
    try {
        const token = OPERADOR_LOGADO && OPERADOR_LOGADO.token;
        const exp = token ? Number(atob(token.replace(/-/g, '+').replace(/_/g, '/')).split('.').slice(-2, -1)[0]) : 0;
        if (exp) sessao = 'válida até ' + new Date(exp * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { /* token em outro formato */ }
    el.innerHTML = `
        <div class="adm-saude-linha"><span>Servidor (API)</span>${pill(api)}</div>
        <div class="adm-saude-linha"><span>Banco de dados</span>${pill(banco)}</div>
        <div class="adm-saude-linha"><span>Versão do app neste aparelho</span><b>${escAdm(versao)}</b></div>
        <div class="adm-saude-linha"><span>Envios pendentes (sem internet)</span>${fila ? `<span class="adm-pill lento">${fila} na fila</span>` : '<span class="adm-pill ok">nenhum</span>'}</div>
        <div class="adm-saude-linha" style="border-bottom:0"><span>Sua sessão</span><span class="text-muted">${escAdm(sessao)}</span></div>
        ${banco.ok && banco.ms > 3000 ? '<p class="text-muted" style="font-size:0.72rem; margin-top:6px;">Banco lento na 1ª consulta costuma ser ele "acordando" depois de um tempo parado — normal no plano gratuito.</p>' : ''}`;
}

function renderizarUsoAdm(colabs) {
    const el = document.getElementById('adm-uso');
    if (!el) return;
    const ativos = (colabs || []).filter(c => c.ativo);
    const faixas = { hoje: [], semana: [], mes: [], antigo: [], nunca: [] };
    ativos.forEach(c => {
        const d = diasDesdeAdm(c.ultimo_acesso);
        if (d === null) faixas.nunca.push(c); else if (d < 1) faixas.hoje.push(c); else if (d <= 7) faixas.semana.push(c); else if (d <= 30) faixas.mes.push(c); else faixas.antigo.push(c);
    });
    const n = ativos.length || 1;
    const cor = { hoje: 'var(--success)', semana: '#84cc16', mes: 'var(--warning, #f59e0b)', antigo: 'var(--danger)', nunca: '#64748b' };
    const rot = { hoje: 'Hoje', semana: 'Últimos 7 dias', mes: '8 a 30 dias', antigo: 'Mais de 30 dias', nunca: 'Nunca acessou' };
    el.innerHTML = `
        <div class="adm-barra" style="height:12px">${Object.keys(faixas).map(k => `<i title="${rot[k]}: ${faixas[k].length}" style="width:${(faixas[k].length / n * 100).toFixed(1)}%; background:${cor[k]}"></i>`).join('')}</div>
        <table class="adm-tabela"><tbody>${Object.keys(faixas).map(k => `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${cor[k]};margin-right:8px"></span>${rot[k]}</td><td class="n">${faixas[k].length}</td></tr>`).join('')}</tbody></table>
        ${faixas.hoje.length ? `<p style="font-size:0.78rem; margin-top:10px; color:var(--text-body)"><b>Hoje:</b> ${faixas.hoje.map(c => escAdm((c.nome || '').split(' ')[0])).join(', ')}</p>` : ''}
        <p class="text-muted" style="font-size:0.72rem; margin-top:6px;">${ativos.length} colaboradores ativos. Quem não usa o app não registra o que faz — vale cobrar o uso.</p>`;
}

// --------------------------------------------------------------
// EXPORTAR CSV (abre no Excel: ";" como separador e BOM pra acentos)
// --------------------------------------------------------------
function baixarCsvAdm(nomeArquivo, cabecalho, linhas) {
    const cel = (v) => { const t = String(v ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const csv = '﻿' + [cabecalho, ...linhas].map(l => l.map(cel).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

window.exportarCsvAdm = async function(tipo) {
    const apiBase = await resolverApiBase();
    if (tipo === 'pecas') {
        const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : [];
        baixarCsvAdm('pecas', ['TAG', 'Tipo', 'MCC', 'Local', 'Posição', 'Dias', 'Tonelagem', 'Meta'],
            ativos.map(a => [a.id, a.tipo, a.mcc_compat, a.local, a.posicaoFixa || a.pos, a.dias, a.ton, a.meta]));
    } else if (tipo === 'colaboradores') {
        const c = await buscarJsonAdm(apiBase, '/api/colaboradores/todos');
        if (!c) return alert('Não consegui buscar os colaboradores.');
        baixarCsvAdm('colaboradores', ['Matrícula', 'Nome', 'Cargo', 'Área', 'Ativo', 'Senha inicial ainda', 'Último acesso'],
            c.map(x => [x.matricula, x.nome, x.cargo, x.area, x.ativo ? 'Sim' : 'Não', x.primeiro_acesso ? 'Sim' : 'Não', x.ultimo_acesso]));
    } else if (tipo === 'eventos') {
        const ev = await buscarJsonAdm(apiBase, '/api/historico_eventos?limite=2000');
        if (!ev) return alert('Não consegui buscar o histórico.');
        baixarCsvAdm('historico', ['Data/hora', 'Peça', 'Evento', 'Quem'], ev.map(e => [e.data_hora, e.peca_id, e.acao, e.operador]));
    } else if (tipo === 'reparos') {
        const ex = await buscarJsonAdm(apiBase, '/api/checklist-execucao/execucoes/todas');
        if (!ex) return alert('Não consegui buscar os reparos.');
        baixarCsvAdm('reparos_em_andamento', ['TAG', 'Tipo', 'Execução', 'Técnico', 'Iniciado em', 'Dias'],
            ex.map(e => [e.equipamento_id, e.tipo_equipamento, e.tipo_execucao, e.tecnico_nome, e.iniciada_em, diasDesdeAdm(e.iniciada_em)]));
    }
};

// Liga os blocos novos no carregamento do painel.
const _renderPainelAdmOriginal = window.renderPainelAdmExecutivo;
window.renderPainelAdmExecutivo = async function() {
    const pOriginal = _renderPainelAdmOriginal.apply(this, arguments);
    const apiBase = await resolverApiBase();
    renderizarPlantaAdm();
    renderizarAtencaoAdm(apiBase);
    renderizarSaudeAdm(apiBase);
    buscarJsonAdm(apiBase, '/api/colaboradores/todos').then(renderizarUsoAdm);
    return pOriginal;
};
