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
            const resp = await fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store' });
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
                    const hora = e.data_hora ? new Date(e.data_hora.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '–';
                    return `
                    <div style="display:flex; gap:12px; padding:8px 0; border-top:1px solid var(--border-color);">
                        <span class="text-muted" style="font-size:0.72rem; font-family:var(--font-mono); flex-shrink:0; white-space:nowrap;">${hora}</span>
                        <span style="font-size:0.8rem; color:var(--text-body);">${e.acao || e.peca_id || 'Evento registrado'}</span>
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
