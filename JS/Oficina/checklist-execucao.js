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

import { resolverApiBase, OPERADOR_LOGADO, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { CHECKLIST_EXECUCAO_SECOES } from '../Core/dados.js';
import { MATRICULAS_ADM, OFICINA_EQUIPE_ATUAL, verificarAcesso, renderReparos } from '../script.js';

// ==========================================================================
// 🆕 TIPO DE EQUIPAMENTO — as etapas agora são cadastradas por TIPO (ex:
// "molde-mcc4"), não mais por tag específica (ex: "M4-12"). Essa função
// resolve o tipo a partir da tag, usando o que já existe no BANCO_ATIVOS
// (a.tipo + a.mcc_compat). Se um dia mudar a nomenclatura do tipo no
// cadastro, só precisa ajustar aqui — o resto do arquivo não muda.
// ==========================================================================
function resolverTipoEquipamento(equipamentoId) {
    const item = BANCO_ATIVOS.find(a => a.id === equipamentoId);
    if (!item) return null;
    const tipoSlug = (item.tipo || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acento
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const mcc = (item.mcc_compat || '').replace('/', '-'); // "2/3" -> "2-3"
    return mcc ? `${tipoSlug}-mcc${mcc}` : tipoSlug;
}

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

// ==========================================================================
// 🆕 EXECUÇÕES ATIVAS — igual RASCUNHOS_IDS_ATIVOS (folhão) faz pro
// script.js saber quem já tem rascunho salvo, isso aqui é o equivalente
// pro Checklist de Execução: quais equipamentos já têm uma execução
// 'em_andamento' (mesmo que o Folhão nunca tenha sido aberto/salvo).
// Sem isso, "Iniciar Reparo" e "Reparo em Andamento" não conseguem se
// falar sobre reparo iniciado só pelo checklist.
// ==========================================================================
window.EXECUCOES_CHECKLIST_IDS_ATIVAS = window.EXECUCOES_CHECKLIST_IDS_ATIVAS || new Set();

window.carregarExecucoesChecklistAtivas = async function() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/execucoes/todas`, { cache: 'no-store' });
        const execucoes = resp.ok ? await resp.json() : [];
        window.EXECUCOES_CHECKLIST_IDS_ATIVAS = new Set(execucoes.map(e => e.equipamento_id));
    } catch (e) {
        console.error('⚠️ Não consegui carregar as execuções de checklist ativas:', e);
    }
    return window.EXECUCOES_CHECKLIST_IDS_ATIVAS;
};

// ==========================================================================
// 🆕 BOTÃO "INICIAR REPARO" — usado só na sub-aba "Iniciar Reparo".
// Diferente de abrirChecklistExecucao (que também é chamado de dentro
// de "Reparo em Andamento" pra CONTINUAR um reparo já iniciado), esta
// função marca o começo do reparo: cria/abre a execução do checklist e,
// assim que ela existe, já marca o equipamento como "ativo" localmente
// (sem esperar um novo fetch) pra sumir na hora de "Iniciar Reparo" e
// aparecer em "Reparo em Andamento".
// ==========================================================================
window.iniciarReparoEAbrirChecklist = async function(equipamentoId) {
    window.EXECUCOES_CHECKLIST_IDS_ATIVAS.add(equipamentoId);
    if (typeof renderReparos === 'function') renderReparos();

    await window.abrirChecklistExecucao(equipamentoId);

    // Se algo deu errado ao criar/abrir a execução (ex: tipo não
    // identificado), desfaz a marcação otimista acima pra não sumir o
    // equipamento de "Iniciar Reparo" à toa.
    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        window.EXECUCOES_CHECKLIST_IDS_ATIVAS.delete(equipamentoId);
        if (typeof renderReparos === 'function') renderReparos();
        return;
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
let CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = null; // tag específica, ex: "M4-12"
let CHECKLIST_EXECUCAO_TIPO_ATUAL = null;        // tipo, ex: "molde-mcc4" — dono das etapas
let CHECKLIST_EXECUCAO_EXECUCAO_ATUAL = null;    // 🆕 id do reparo (execução) em andamento
let CHECKLIST_EXECUCAO_ETAPAS_ATUAIS = [];

window.abrirChecklistExecucao = async function(equipamentoId) {
    CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = equipamentoId;
    CHECKLIST_EXECUCAO_TIPO_ATUAL = resolverTipoEquipamento(equipamentoId);
    const modal = document.getElementById('modal-checklist-execucao');
    const titulo = document.getElementById('checklist-execucao-titulo');
    if (titulo) titulo.textContent = `Checklist de Execução — ${equipamentoId}`;
    if (modal) modal.classList.remove('hidden');

    const container = document.getElementById('checklist-execucao-secoes');
    if (container) container.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">Carregando...</p>`;

    if (!CHECKLIST_EXECUCAO_TIPO_ATUAL) {
        if (container) container.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">Não consegui identificar o tipo desse equipamento — confira o cadastro dele.</p>`;
        return;
    }

    // 🆕 Resolve ou cria a EXECUÇÃO (o reparo em si) antes de buscar as
    // etapas — sem isso não tem como saber o que já foi marcado NESSE
    // reparo específico (etapas agora são compartilhadas entre todo
    // equipamento do mesmo tipo).
    const apiBase = await resolverApiBase();
    try {
        const respStatus = await fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(equipamentoId)}`, { cache: 'no-store' });
        const status = respStatus.ok ? await respStatus.json() : null;

        if (status && status.execucao_id) {
            // Já existe um reparo em andamento pra essa tag — reaproveita.
            CHECKLIST_EXECUCAO_EXECUCAO_ATUAL = status.execucao_id;
        } else {
            // Nenhum reparo em andamento ainda — pergunta Geral ou Parcial
            // e abre um novo.
            const tipoExecucao = confirm('Esse reparo é GERAL?\n\nOK = Geral\nCancelar = Parcial') ? 'geral' : 'parcial';
            const tecnico = OPERADOR_LOGADO || {};
            const respIniciar = await fetch(`${apiBase}/api/checklist-execucao/execucoes/iniciar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipamento_id: equipamentoId,
                    tipo_equipamento: CHECKLIST_EXECUCAO_TIPO_ATUAL,
                    tipo_execucao: tipoExecucao,
                    tecnico_matricula: tecnico.matricula || null,
                    tecnico_nome: tecnico.nome || 'Técnico'
                })
            });
            const resultadoIniciar = respIniciar.ok ? await respIniciar.json() : null;
            CHECKLIST_EXECUCAO_EXECUCAO_ATUAL = resultadoIniciar ? resultadoIniciar.execucao_id : null;
        }
    } catch (e) {
        console.error('⚠️ Erro ao resolver a execução do Checklist de Execução:', e);
        if (container) container.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">Não consegui conectar ao servidor pra abrir esse reparo.</p>`;
        return;
    }

    await window.recarregarChecklistExecucao();
};

window.recarregarChecklistExecucao = async function() {
    if (!CHECKLIST_EXECUCAO_TIPO_ATUAL) return;
    try {
        const apiBase = await resolverApiBase();
        const qs = CHECKLIST_EXECUCAO_EXECUCAO_ATUAL ? `?execucao_id=${CHECKLIST_EXECUCAO_EXECUCAO_ATUAL}` : '';
        const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas/${encodeURIComponent(CHECKLIST_EXECUCAO_TIPO_ATUAL)}${qs}`, { cache: 'no-store' });
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
    CHECKLIST_EXECUCAO_TIPO_ATUAL = null;
    CHECKLIST_EXECUCAO_EXECUCAO_ATUAL = null;
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
                ${etapasDaSecao.map((e, idx) => renderizarLinhaEtapaChecklistExecucao(e, secao, isAdmin)).join('')}
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
// 🆕 Renderiza 1 linha de etapa, no formato certo pro tipo dela:
// - "sim_nao" (padrão): checkbox, igual sempre foi
// - "medicao": mostra o valor atual + botão pra registrar/editar
// - "medicao_multipla": mostra quantos campos já foram preenchidos
//   (ex: "23/57") + botão que abre o mini-formulário
// --------------------------------------------------------------
function renderizarLinhaEtapaChecklistExecucao(e, secao, isAdmin) {
    const tipoResposta = e.tipo_resposta || 'sim_nao';
    const botoesAdmin = isAdmin ? `
        <div style="display:flex; flex-direction:column; gap:3px;">
            <button class="btn-premium" style="padding:2px 6px; font-size:10px;" title="Mover pra cima" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', -1)"><i class="fas fa-arrow-up"></i></button>
            <button class="btn-premium" style="padding:2px 6px; font-size:10px;" title="Mover pra baixo" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', 1)"><i class="fas fa-arrow-down"></i></button>
            <button class="btn-outline-danger" style="padding:2px 6px; font-size:10px;" title="Excluir etapa" onclick="window.excluirEtapaChecklistExecucao(${e.id})"><i class="fas fa-trash"></i></button>
        </div>
    ` : '';

    if (tipoResposta === 'medicao') {
        const preenchida = !!(e.valor && e.valor.trim());
        return `
            <div style="display:flex; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${preenchida ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; color:var(--text-heading);">${e.texto}</div>
                    ${preenchida
                        ? `<div style="font-size:12px; color:var(--text-accent); margin-top:2px;"><i class="fas fa-ruler"></i> ${e.valor}</div>
                           <div class="text-muted" style="font-size:11px; margin-top:2px;"><i class="fas fa-user"></i> ${e.colaborador || '—'} · em ${e.data_hora ? new Date(e.data_hora).toLocaleString('pt-BR') : ''}</div>`
                        : `<div class="text-muted" style="font-size:11px; margin-top:2px;">Ainda sem valor registrado.</div>`}
                </div>
                <button class="btn-premium" style="padding:4px 10px; font-size:11px; flex-shrink:0;" onclick="window.responderMedicaoChecklistExecucao(${e.id}, '${(e.valor || '').replace(/'/g, "\\'")}')">
                    <i class="fas fa-pen"></i> ${preenchida ? 'Editar' : 'Registrar'}
                </button>
                ${botoesAdmin}
            </div>
        `;
    }

    if (tipoResposta === 'medicao_multipla') {
        let totalCampos = 0, preenchidos = 0;
        try {
            const mapaCampos = JSON.parse(e.folhao_campo || '{}');
            const valoresAtuais = JSON.parse(e.valor || '{}');
            totalCampos = Object.keys(mapaCampos).length;
            preenchidos = Object.keys(valoresAtuais).filter(k => valoresAtuais[k]).length;
        } catch (err) { /* mapa mal formado — mostra 0/0 */ }
        const completo = totalCampos > 0 && preenchidos === totalCampos;
        return `
            <div style="display:flex; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${completo ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; color:var(--text-heading);">${e.texto}</div>
                    <div class="text-muted" style="font-size:11px; margin-top:2px;"><i class="fas fa-ruler-combined"></i> ${preenchidos} / ${totalCampos} medições preenchidas</div>
                </div>
                <button class="btn-premium" style="padding:4px 10px; font-size:11px; flex-shrink:0;" onclick="window.abrirMedicaoMultiplaChecklistExecucao(${e.id})">
                    <i class="fas fa-ruler"></i> Preencher
                </button>
                ${botoesAdmin}
            </div>
        `;
    }

    // Padrão: checkbox sim/não (comportamento original)
    return `
        <div style="display:flex; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${e.marcado ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
            <input type="checkbox" ${e.marcado ? 'checked' : ''} style="margin-top:3px; width:18px; height:18px; flex-shrink:0;" onchange="window.marcarEtapaChecklistExecucao(${e.id}, this.checked)">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; color:var(--text-heading);">${e.texto}</div>
                ${e.marcado ? `<div class="text-muted" style="font-size:11px; margin-top:2px;"><i class="fas fa-user"></i> ${e.colaborador || '—'} · marcado por ${e.tecnico_nome || '—'} em ${e.data_hora ? new Date(e.data_hora).toLocaleString('pt-BR') : ''}</div>` : ''}
                ${e.descricao ? `<details style="margin-top:4px;"><summary style="font-size:11px; color:var(--text-accent); cursor:pointer;">Ver passo a passo</summary><div class="text-muted" style="font-size:11px; white-space:pre-line; margin-top:4px;">${e.descricao}</div></details>` : ''}
            </div>
            ${botoesAdmin}
        </div>
    `;
}

// --------------------------------------------------------------
// 🆕 ENVIO COMPARTILHADO — usado pelo checkbox (sim/não), pela
// medição única e pela medição múltipla. Centraliza o POST /marcar
// pra não repetir a mesma lógica 3 vezes.
// --------------------------------------------------------------
async function enviarMarcacaoChecklistExecucao(etapaId, { marcado, valor = null, colaborador = null, trocado = null }) {
    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/marcar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                etapa_id: etapaId,
                execucao_id: CHECKLIST_EXECUCAO_EXECUCAO_ATUAL,
                equipamento_id: CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL,
                marcado,
                colaborador,
                valor,
                trocado,
                tecnico_matricula: tecnico.matricula || null,
                tecnico_nome: tecnico.nome || 'Técnico'
            })
        });
        if (!resp.ok) alert('Não foi possível salvar essa resposta.');
    } catch (e) {
        console.error('⚠️ Erro ao salvar resposta do Checklist de Execução:', e);
        alert('Não foi possível conectar ao servidor.');
    }
    window.recarregarChecklistExecucao();
}

// --------------------------------------------------------------
// MARCAR ETAPA (qualquer técnico logado) — checkboxes sim/não
// --------------------------------------------------------------
window.marcarEtapaChecklistExecucao = async function(etapaId, marcado) {
    if (!verificarAcesso()) { window.recarregarChecklistExecucao(); return; }

    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        alert('Não foi possível identificar o reparo em andamento. Feche e abra o checklist de novo.');
        window.recarregarChecklistExecucao();
        return;
    }

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

    await enviarMarcacaoChecklistExecucao(etapaId, { marcado, colaborador });
};

// --------------------------------------------------------------
// 🆕 MEDIÇÃO ÚNICA (tipo_resposta = "medicao") — ex: "Qual a situação
// do molde / Observação". Pede o valor e quem preencheu, num prompt
// simples (não precisa de modal pra 1 campo só).
// --------------------------------------------------------------
window.responderMedicaoChecklistExecucao = async function(etapaId, valorAtual) {
    if (!verificarAcesso()) { window.recarregarChecklistExecucao(); return; }
    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        alert('Não foi possível identificar o reparo em andamento. Feche e abra o checklist de novo.');
        return;
    }

    const valor = prompt('Valor / observação:', valorAtual || '');
    if (valor === null) return; // cancelou
    if (!valor.trim()) { alert('Informe um valor.'); return; }

    const equipe = Array.isArray(OFICINA_EQUIPE_ATUAL) ? OFICINA_EQUIPE_ATUAL : [];
    const nomes = equipe.map(p => p.nome).join(', ');
    const colaborador = prompt(`Quem preencheu essa informação?${nomes ? `\n(Equipe: ${nomes})` : ''}`);
    if (colaborador === null) return;

    await enviarMarcacaoChecklistExecucao(etapaId, { marcado: true, valor: valor.trim(), colaborador: colaborador.trim() || null });
};

// --------------------------------------------------------------
// 🆕 MEDIÇÃO MÚLTIPLA (tipo_resposta = "medicao_multipla") — ex:
// "Verificar bitola/aresta — Esquerda", que precisa de dezenas de
// valores de uma vez. Abre um mini-formulário com 1 campo por medida,
// gerado a partir do `folhao_campo` (JSON) que veio da etapa — não tem
// nada fixo no código, então funciona pra qualquer etapa desse tipo,
// de qualquer equipamento.
// --------------------------------------------------------------
window.abrirMedicaoMultiplaChecklistExecucao = function(etapaId) {
    if (!verificarAcesso()) return;
    const etapa = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.find(e => e.id === etapaId);
    if (!etapa) return;

    let mapaCampos = {};
    let valoresAtuais = {};
    try { mapaCampos = JSON.parse(etapa.folhao_campo || '{}'); } catch (e) { mapaCampos = {}; }
    try { valoresAtuais = JSON.parse(etapa.valor || '{}'); } catch (e) { valoresAtuais = {}; }
    const chaves = Object.keys(mapaCampos).sort();

    if (chaves.length === 0) {
        alert('Essa etapa não tem nenhum campo de medição configurado ainda.');
        return;
    }

    // Remove um modal anterior, se sobrou algum aberto.
    const existente = document.getElementById('modal-medicao-multipla-dinamico');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-medicao-multipla-dinamico';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
    modal.innerHTML = `
        <div class="glass-panel" style="max-width:640px; width:100%; max-height:85vh; overflow-y:auto; padding:18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="margin:0; color:var(--text-heading);"><i class="fas fa-ruler"></i> ${etapa.texto}</h4>
                <button class="btn-outline-danger" style="padding:2px 10px;" onclick="document.getElementById('modal-medicao-multipla-dinamico').remove()"><i class="fas fa-times"></i></button>
            </div>
            <p class="text-muted" style="font-size:11.5px; margin-bottom:12px;">Preenche o que já mediu — não precisa fazer tudo de uma vez, dá pra voltar e completar depois.</p>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; margin-bottom:14px;">
                ${chaves.map(chave => `
                    <div>
                        <label style="font-size:10.5px; color:var(--text-muted); display:block; margin-bottom:2px;">${chave}</label>
                        <input type="text" data-chave-medicao="${chave}" value="${valoresAtuais[chave] || ''}" class="premium-select" style="width:100%; padding:4px 6px; font-size:12px;">
                    </div>
                `).join('')}
            </div>
            <button class="btn-premium btn-success" style="width:100%;" onclick="window.salvarMedicaoMultiplaChecklistExecucao(${etapaId})">
                <i class="fas fa-save"></i> Salvar medições
            </button>
        </div>
    `;
    document.body.appendChild(modal);
};

window.salvarMedicaoMultiplaChecklistExecucao = async function(etapaId) {
    const modal = document.getElementById('modal-medicao-multipla-dinamico');
    if (!modal) return;
    const inputs = modal.querySelectorAll('[data-chave-medicao]');
    const valores = {};
    let preenchidos = 0;
    inputs.forEach(inp => {
        const v = inp.value.trim();
        if (v) { valores[inp.dataset.chaveMedicao] = v; preenchidos++; }
    });
    if (preenchidos === 0) { alert('Preencha pelo menos uma medição antes de salvar.'); return; }

    const equipe = Array.isArray(OFICINA_EQUIPE_ATUAL) ? OFICINA_EQUIPE_ATUAL : [];
    const nomes = equipe.map(p => p.nome).join(', ');
    const colaborador = prompt(`Quem realizou essas medições?${nomes ? `\n(Equipe: ${nomes})` : ''}`);
    if (colaborador === null) return;

    modal.remove();
    await enviarMarcacaoChecklistExecucao(etapaId, { marcado: true, valor: JSON.stringify(valores), colaborador: colaborador.trim() || null });
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
                equipamento_id: CHECKLIST_EXECUCAO_TIPO_ATUAL, // 🆕 tipo, não a tag
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