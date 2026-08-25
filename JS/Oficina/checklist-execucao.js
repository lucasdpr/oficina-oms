// ==========================================================================
// CHECKLIST DE EXECUÇÃO — módulo próprio (extraído do script.js).
// ==========================================================================
// Este arquivo cuida só do "Checklist de Execução": passo a passo real
// do reparo, por equipamento, dividido em seções (mecânica, elétrica,
// hidráulica, caldeiraria, usinagem, tubulação, jato). Diferente do
// "Procedimento" oficial (que já existe, em procedimentosOficina.js,
// mas não é o jeito que os técnicos fazem de verdade).
//
// Tudo aqui é anexado a `window.*` de propósito — o app.html chama
// essas funções direto nos onclick="" dos botões
// (window.abrirChecklistExecucao, window.renderizarBotaoChecklistExecucao
// etc.), igual o resto do sistema já faz com outras telas (folhões,
// procedimentos...).
// ==========================================================================

import { resolverApiBase, OPERADOR_LOGADO } from '../Core/banco.js?v=5';
import { CHECKLIST_EXECUCAO_SECOES } from '../Core/dados.js';
import { MATRICULAS_ADM, OFICINA_EQUIPE_ATUAL, verificarAcesso, renderReparos } from '../script.js';

// ==========================================================================
// 🆕 CHECKLIST DE EXECUÇÃO — passo a passo real do reparo, por
// equipamento, dividido em seções (mecânica, elétrica, hidráulica,
// caldeiraria, usinagem, tubulação, jato). Diferente do "Procedimento"
// oficial (que já existe mas não é o jeito que os técnicos fazem de
// verdade). Só as 3 matrículas em MATRICULAS_ADM podem cadastrar/editar
// /reordenar/excluir etapas — qualquer técnico logado pode marcar.
// ==========================================================================

// Cache em memória: { [equipamentoId]: { total, marcadas, percentual,
// completo, folhaoSalvo, carregando } } — usado pra desenhar os botões
// da tabela de Reparo sem precisar esperar fetch toda hora que a tabela
// é redesenhada (ex: filtro, busca).
window.CHECKLIST_EXECUCAO_STATUS_CACHE = window.CHECKLIST_EXECUCAO_STATUS_CACHE || {};

let CHECKLIST_EXECUCAO_CARREGANDO_IDS = new Set();

window.carregarStatusChecklistExecucaoReparo = async function(idsEquipamentos, forcar = false) {
    const apiBase = await resolverApiBase();
    // 🔧 CORREÇÃO CRÍTICA (tela travando/reparo não abrindo): antes, essa
    // função só evitava buscar de novo enquanto o fetch estava "em voo"
    // (CARREGANDO_IDS) — assim que terminava, o id saía do set e virava
    // "pendente" de novo na próxima vez que renderReparos() rodasse. Só
    // que ao final ELA MESMA chama renderReparos(), que chama ela de
    // novo — um laço infinito de fetch → render → fetch → render, sem
    // parar nunca, travando a aba inteira (e explica o Folhão/Prontuário
    // não abrindo: o navegador ficava ocupado nesse loop). Agora só
    // busca de novo se ainda não tiver status em cache (ou se "forcar"
    // for passado explicitamente, ex: depois de marcar uma etapa).
    const pendentes = idsEquipamentos.filter(id =>
        !CHECKLIST_EXECUCAO_CARREGANDO_IDS.has(id) && (forcar || !window.CHECKLIST_EXECUCAO_STATUS_CACHE[id])
    );
    if (pendentes.length === 0) return;
    pendentes.forEach(id => CHECKLIST_EXECUCAO_CARREGANDO_IDS.add(id));

    await Promise.all(pendentes.map(async (id) => {
        try {
            const [respStatus, respLaudos] = await Promise.all([
                fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(id)}`, { cache: 'no-store' }),
                fetch(`${apiBase}/api/laudos?peca_id=${encodeURIComponent(id)}&limite=1`, { cache: 'no-store' })
            ]);
            const status = respStatus.ok ? await respStatus.json() : { total: 0, marcadas: 0, percentual: 0, completo: false };
            const laudos = respLaudos.ok ? await respLaudos.json() : [];
            window.CHECKLIST_EXECUCAO_STATUS_CACHE[id] = {
                ...status,
                folhaoSalvo: Array.isArray(laudos) && laudos.length > 0
            };
        } catch (e) {
            console.error(`⚠️ Não consegui buscar status do Checklist de Execução (${id}):`, e);
            // Mesmo com erro, marca algo em cache pra não ficar tentando de
            // novo pra sempre em loop — só tenta de novo se "forcar".
            window.CHECKLIST_EXECUCAO_STATUS_CACHE[id] = window.CHECKLIST_EXECUCAO_STATUS_CACHE[id] || { total: 0, marcadas: 0, percentual: 0, completo: false, folhaoSalvo: false };
        } finally {
            CHECKLIST_EXECUCAO_CARREGANDO_IDS.delete(id);
        }
    }));

    // Redesenha a tabela de Reparo ("Iniciar Reparo") E a lista de
    // "Reparo em Andamento" (se estiverem na tela) pra refletir o status
    // recém-carregado — cada função já lida com não estar montada.
    if (document.getElementById('reparos-table-body') && typeof renderReparos === 'function') {
        renderReparos();
    }
    if (document.getElementById('reparos-lista-andamento') && typeof window.carregarReparosAndamento === 'function') {
        window.carregarReparosAndamento();
    }
};

window.renderizarBotaoChecklistExecucao = function(equipamentoId) {
    const status = window.CHECKLIST_EXECUCAO_STATUS_CACHE[equipamentoId];
    const label = status ? `${status.percentual}%` : '...';
    const cor = status && status.completo ? 'var(--success)' : 'var(--text-accent)';
    return `<button class="btn-premium" style="background:transparent; border-color:${cor}; color:${cor};" onclick="window.abrirChecklistExecucao('${equipamentoId}')">
        <i class="fas fa-list-check"></i> Checklist de Execução (${label})
    </button>`;
};

window.renderizarBotaoConcluirReparo = function(equipamentoId) {
    const status = window.CHECKLIST_EXECUCAO_STATUS_CACHE[equipamentoId];
    const pronto = !!(status && status.completo && status.folhaoSalvo);
    if (pronto) {
        return `<button class="btn-premium btn-success" onclick="window.abrirFolhaoPorTipo('${equipamentoId}')" title="Checklist 100% e Folhão salvos">
            <i class="fas fa-check-double"></i> Concluir
        </button>`;
    }
    let motivo = 'Aguardando: ';
    const faltando = [];
    if (!status || !status.completo) faltando.push('Checklist de Execução 100%');
    if (!status || !status.folhaoSalvo) faltando.push('Folhão salvo');
    motivo += faltando.join(' e ');
    return `<button class="btn-premium" disabled style="opacity:0.5; cursor:not-allowed; background:var(--bg-td); color:var(--text-muted); border-color:var(--text-muted);" title="${motivo}">
        <i class="fas fa-lock"></i> Concluir
    </button>`;
};

// --------------------------------------------------------------
// ESTADO DO MODAL
// --------------------------------------------------------------
let CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = null;
let CHECKLIST_EXECUCAO_ETAPAS_ATUAIS = [];

window.abrirChecklistExecucao = async function(equipamentoId) {
    CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = equipamentoId;
    const modal = document.getElementById('modal-checklist-execucao');
    const titulo = document.getElementById('checklist-execucao-titulo');
    if (titulo) titulo.textContent = `Checklist de Execução — ${equipamentoId}`;
    if (modal) modal.classList.remove('hidden');

    const container = document.getElementById('checklist-execucao-secoes');
    if (container) container.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">Carregando...</p>`;

    await window.recarregarChecklistExecucao();
};

window.recarregarChecklistExecucao = async function() {
    if (!CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas/${encodeURIComponent(CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL)}`, { cache: 'no-store' });
        CHECKLIST_EXECUCAO_ETAPAS_ATUAIS = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Erro ao carregar etapas do Checklist de Execução:', e);
        CHECKLIST_EXECUCAO_ETAPAS_ATUAIS = [];
    }
    window.renderizarChecklistExecucao();
    // Atualiza também o cache/botões da tabela de Reparo por trás do modal
    // (forçado, porque o status realmente mudou).
    window.carregarStatusChecklistExecucaoReparo([CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL], true);
};

window.fecharModalChecklistExecucao = function() {
    const modal = document.getElementById('modal-checklist-execucao');
    if (modal) modal.classList.add('hidden');
    CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = null;
    CHECKLIST_EXECUCAO_ETAPAS_ATUAIS = [];
};

function ehAdminChecklistExecucao() {
    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || '').toUpperCase();
    return MATRICULAS_ADM.includes(matricula);
}

window.renderizarChecklistExecucao = function() {
    const container = document.getElementById('checklist-execucao-secoes');
    if (!container) return;

    const total = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.length;
    const marcadas = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.filter(e => e.marcado).length;
    const pct = total > 0 ? Math.round((marcadas / total) * 100) : 0;

    const progressoEl = document.getElementById('checklist-execucao-progresso');
    if (progressoEl) progressoEl.textContent = `${marcadas} / ${total} (${pct}%)`;
    const barraEl = document.getElementById('checklist-execucao-barra-fill');
    if (barraEl) barraEl.style.width = `${pct}%`;

    const isAdmin = ehAdminChecklistExecucao();
    const equipe = Array.isArray(OFICINA_EQUIPE_ATUAL) ? OFICINA_EQUIPE_ATUAL : [];

    let html = '';
    CHECKLIST_EXECUCAO_SECOES.forEach(secao => {
        const etapasDaSecao = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.filter(e => e.area === secao.chave);
        if (etapasDaSecao.length === 0 && !isAdmin) return; // técnico não vê seção vazia

        html += `
            <div class="glass-panel" style="padding:12px; margin-bottom:12px; border-left:4px solid ${secao.cor};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700; color:${secao.cor}; font-size:13px;">
                        <i class="fas ${secao.icone}"></i> ${secao.nome}
                    </div>
                    ${isAdmin ? `<button class="btn-premium" style="padding:3px 8px; font-size:11px;" onclick="window.formNovaEtapaChecklistExecucao('${secao.chave}')"><i class="fas fa-plus"></i> Etapa</button>` : ''}
                </div>
                ${etapasDaSecao.length === 0 ? `<div class="text-muted" style="font-size:11.5px;">Nenhuma etapa cadastrada ainda nesta seção.</div>` : ''}
                ${etapasDaSecao.map((e, idx) => `
                    <div style="display:flex; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${e.marcado ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
                        <input type="checkbox" ${e.marcado ? 'checked' : ''} style="margin-top:3px; width:18px; height:18px; flex-shrink:0;" onchange="window.marcarEtapaChecklistExecucao(${e.id}, this.checked)">
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:13px; color:var(--text-heading);">${e.texto}</div>
                            ${e.marcado ? `<div class="text-muted" style="font-size:11px; margin-top:2px;"><i class="fas fa-user"></i> ${e.colaborador || '—'} · marcado por ${e.tecnico_nome || '—'} em ${e.data_hora ? new Date(e.data_hora).toLocaleString('pt-BR') : ''}</div>` : ''}
                        </div>
                        ${isAdmin ? `
                            <div style="display:flex; flex-direction:column; gap:3px;">
                                <button class="btn-premium" style="padding:2px 6px; font-size:10px;" title="Mover pra cima" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', -1)"><i class="fas fa-arrow-up"></i></button>
                                <button class="btn-premium" style="padding:2px 6px; font-size:10px;" title="Mover pra baixo" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', 1)"><i class="fas fa-arrow-down"></i></button>
                                <button class="btn-outline-danger" style="padding:2px 6px; font-size:10px;" title="Excluir etapa" onclick="window.excluirEtapaChecklistExecucao(${e.id})"><i class="fas fa-trash"></i></button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    });

    if (!html) {
        html = `<p class="text-muted" style="text-align:center; padding:20px;">
            Nenhuma etapa cadastrada ainda pra este equipamento.
            ${isAdmin ? 'Use os botões "+ Etapa" acima assim que houver alguma seção, ou adicione pela primeira vez abaixo.' : 'Fale com um responsável pelo Checklist de Execução.'}
        </p>`;
        if (isAdmin) {
            html += `<div style="display:flex; gap:8px; flex-wrap:wrap;">${CHECKLIST_EXECUCAO_SECOES.map(s => `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.formNovaEtapaChecklistExecucao('${s.chave}')"><i class="fas ${s.icone}"></i> ${s.nome}</button>`).join('')}</div>`;
        }
    }

    container.innerHTML = html;
};

// --------------------------------------------------------------
// MARCAR ETAPA (qualquer técnico logado)
// --------------------------------------------------------------
window.marcarEtapaChecklistExecucao = async function(etapaId, marcado) {
    if (!verificarAcesso()) { window.recarregarChecklistExecucao(); return; }

    let colaborador = null;
    if (marcado) {
        const equipe = Array.isArray(OFICINA_EQUIPE_ATUAL) ? OFICINA_EQUIPE_ATUAL : [];
        const nomes = equipe.map(p => p.nome).join(', ');
        colaborador = prompt(`Quem da equipe executou essa etapa?${nomes ? `\n(Equipe: ${nomes})` : ''}`);
        if (colaborador === null) { window.recarregarChecklistExecucao(); return; } // cancelou
        colaborador = colaborador.trim();
        if (!colaborador) { alert('Informe o nome de quem executou a etapa.'); window.recarregarChecklistExecucao(); return; }
    } else {
        if (!confirm('Desmarcar essa etapa? Isso registra retrabalho (ela vai precisar ser refeita).')) {
            window.recarregarChecklistExecucao();
            return;
        }
    }

    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/marcar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                etapa_id: etapaId,
                equipamento_id: CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL,
                marcado,
                colaborador,
                tecnico_matricula: tecnico.matricula || null,
                tecnico_nome: tecnico.nome || 'Técnico'
            })
        });
        if (!resp.ok) alert('Não foi possível salvar essa marcação.');
    } catch (e) {
        console.error('⚠️ Erro ao marcar etapa do Checklist de Execução:', e);
        alert('Não foi possível conectar ao servidor.');
    }
    window.recarregarChecklistExecucao();
};

// --------------------------------------------------------------
// ADMIN (só MATRICULAS_ADM): cadastrar / editar / excluir / reordenar
// --------------------------------------------------------------
window.formNovaEtapaChecklistExecucao = async function(areaChave) {
    if (!ehAdminChecklistExecucao()) { alert('Só as matrículas autorizadas podem cadastrar etapas.'); return; }
    const texto = prompt('Texto da nova etapa:');
    if (!texto || !texto.trim()) return;

    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipamento_id: CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL,
                area: areaChave,
                texto: texto.trim(),
                operador: tecnico.matricula || ''
            })
        });
        if (!resp.ok) alert('Não foi possível cadastrar a etapa (verifique se sua matrícula tem permissão).');
    } catch (e) {
        console.error('⚠️ Erro ao cadastrar etapa do Checklist de Execução:', e);
        alert('Não foi possível conectar ao servidor.');
    }
    window.recarregarChecklistExecucao();
};

window.excluirEtapaChecklistExecucao = async function(etapaId) {
    if (!ehAdminChecklistExecucao()) { alert('Só as matrículas autorizadas podem excluir etapas.'); return; }
    if (!confirm('Excluir essa etapa? O histórico de quem já executou fica preservado, mas ela some da lista.')) return;

    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: etapaId, operador: tecnico.matricula || '' })
        });
        if (!resp.ok) alert('Não foi possível excluir a etapa.');
    } catch (e) {
        console.error('⚠️ Erro ao excluir etapa do Checklist de Execução:', e);
        alert('Não foi possível conectar ao servidor.');
    }
    window.recarregarChecklistExecucao();
};

window.moverEtapaChecklistExecucao = async function(etapaId, areaChave, direcao) {
    if (!ehAdminChecklistExecucao()) { alert('Só as matrículas autorizadas podem reordenar etapas.'); return; }

    const etapasDaSecao = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS
        .filter(e => e.area === areaChave)
        .sort((a, b) => a.ordem - b.ordem);
    const idx = etapasDaSecao.findIndex(e => e.id === etapaId);
    const novoIdx = idx + direcao;
    if (idx === -1 || novoIdx < 0 || novoIdx >= etapasDaSecao.length) return;

    // Troca a ordem entre os dois vizinhos.
    const itens = etapasDaSecao.map((e, i) => {
        if (i === idx) return { id: e.id, ordem: etapasDaSecao[novoIdx].ordem };
        if (i === novoIdx) return { id: e.id, ordem: etapasDaSecao[idx].ordem };
        return { id: e.id, ordem: e.ordem };
    });

    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas/reordenar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens, operador: tecnico.matricula || '' })
        });
        if (!resp.ok) alert('Não foi possível reordenar as etapas.');
    } catch (e) {
        console.error('⚠️ Erro ao reordenar etapas do Checklist de Execução:', e);
        alert('Não foi possível conectar ao servidor.');
    }
    window.recarregarChecklistExecucao();
};