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
import { CHECKLIST_EXECUCAO_SECOES, obterSecoesChecklistExecucao } from '../Core/dados.js';
import { resolverTipoEquipamento } from '../Core/checklistFolhaoPonte.js';
// 🔧 CORREÇÃO CRÍTICA: NÃO importar MATRICULAS_ADM/OFICINA_EQUIPE_ATUAL/
// verificarAcesso/renderReparos de '../script.js' aqui. O app.html
// carrega o script.js como './JS/script.js?v=27' — uma URL diferente
// de '../script.js' (sem versão). Pro navegador, isso são DOIS módulos
// diferentes: importar daqui pegava uma SEGUNDA CÓPIA fantasma do
// script.js inteiro, com seu próprio OPERADOR_LOGADO que o login nunca
// atualiza (era por isso que marcar uma etapa do checklist às vezes
// jogava pra tela de login do nada). Em vez de importar, usamos
// window.verificarAcesso(), window.MATRICULAS_ADM, window.renderReparos
// e window.getOficinaEquipeAtual() — que sempre apontam pra instância
// real do script.js (a que realmente roda os cliques da tela), não
// importa quantas cópias fantasmas existam.

// ==========================================================================
// 🆕 TIPO DE EQUIPAMENTO — as etapas agora são cadastradas por TIPO (ex:
// "molde-mcc4"), não mais por tag específica (ex: "M4-12"). O cálculo
// do slug vive em '../Core/checklistFolhaoPonte.js' (resolverTipoEquipamento,
// importado acima) — ANTES esse cálculo estava copiado e colado aqui E
// dentro do folhaoMolde4.js; se um mudasse sem o outro, o Checklist e o
// Folhão passavam a calcular tipos diferentes pro mesmo equipamento, e
// a ponte de autopreenchimento parava de achar nada, silenciosamente.
// Agora é uma função só, usada nos dois lugares.
// ==========================================================================

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
    if (document.getElementById('reparos-table-body') && typeof window.renderReparos === 'function') {
        window.renderReparos();
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
    if (typeof window.renderReparos === 'function') window.renderReparos();

    await window.abrirChecklistExecucao(equipamentoId);

    // Se algo deu errado ao criar/abrir a execução (ex: tipo não
    // identificado), desfaz a marcação otimista acima pra não sumir o
    // equipamento de "Iniciar Reparo" à toa.
    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        window.EXECUCOES_CHECKLIST_IDS_ATIVAS.delete(equipamentoId);
        if (typeof window.renderReparos === 'function') window.renderReparos();
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
        // 🔧 CORRIGIDO: antes o "Concluir" só reabria o Folhão
        // (abrirFolhaoPorTipo) — não imprimia nada, e reabrir de novo
        // depois de já ter salvo não fazia sentido. Agora ele busca o
        // laudo que já foi salvo no Folhão e manda direto pra
        // impressão — a impressão só acontece aqui, no fim do processo,
        // nunca antes.
        // 🔧 CORRIGIDO: antes chamava window.concluirEImprimirFolhaoMolde4
        // direto — fixo pro Molde. Agora passa pelo dispatcher
        // (window.concluirEImprimirFolhaoPorTipo, em script.js) que decide
        // a função certa pelo tipo do equipamento, com fallback genérico
        // pra qualquer área que ainda não tenha função própria.
        return `<button class="btn-premium btn-success" onclick="window.concluirEImprimirFolhaoPorTipo('${equipamentoId}')" title="Checklist 100% e Folhão salvos">
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

// ==========================================================================
// 🆕 MODAL "TIPO DE EXECUÇÃO" — substitui o confirm() nativo do
// navegador (que ficava tosco: "OK = Geral, Cancelar = Parcial") por um
// modal de verdade com dois botões claros, no mesmo estilo visual do
// resto do sistema. Criado dinamicamente na primeira vez que é usado —
// não precisa mexer no app.html.
// ==========================================================================
// ==========================================================================
// 🆕 MODAL "SIM OU NÃO" — antes, marcar uma etapa sim/não só sabia
// dizer "feito" (sempre virava SIM lá no Folhão). Agora, ao marcar,
// pergunta a resposta de verdade primeiro — importante porque a
// resposta real pode ser NÃO (ex: "os flexíveis estão danificados?" —
// marcar a etapa como "revisada" não significa que a resposta seja
// SIM).
// ==========================================================================
function garantirModalSimNaoEtapa() {
    if (document.getElementById('modal-sim-nao-etapa')) return;
    const div = document.createElement('div');
    div.id = 'modal-sim-nao-etapa';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '10000';
    div.innerHTML = `
        <div class="modal-content" style="max-width:440px; text-align:center;">
            <h2 style="color:var(--text-heading); margin-bottom:6px;">
                <i class="fas fa-circle-question"></i> Qual a resposta?
            </h2>
            <p id="modal-sim-nao-etapa-texto" class="text-muted" style="margin-bottom:22px; font-size:13px;"></p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-premium btn-success" style="flex:1; min-width:120px; padding:16px 10px; font-size:14px;" id="btn-sim-nao-etapa-sim">
                    <i class="fas fa-check" style="font-size:18px; display:block; margin-bottom:6px;"></i>SIM
                </button>
                <button class="btn-premium" style="flex:1; min-width:120px; padding:16px 10px; font-size:14px; background:transparent; border-color:var(--danger); color:var(--danger);" id="btn-sim-nao-etapa-nao">
                    <i class="fas fa-xmark" style="font-size:18px; display:block; margin-bottom:6px;"></i>NÃO
                </button>
            </div>
            <button class="btn-outline-danger" style="margin-top:16px; padding:6px 14px; font-size:12px;" id="btn-sim-nao-etapa-cancelar">Cancelar</button>
        </div>
    `;
    document.body.appendChild(div);
}

// Retorna uma Promise que resolve pra 'SIM', 'NÃO' ou null (cancelou).
window.escolherSimNaoEtapa = function(textoEtapa) {
    garantirModalSimNaoEtapa();
    const modal = document.getElementById('modal-sim-nao-etapa');
    document.getElementById('modal-sim-nao-etapa-texto').textContent = textoEtapa || '';
    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        const btnSim = document.getElementById('btn-sim-nao-etapa-sim');
        const btnNao = document.getElementById('btn-sim-nao-etapa-nao');
        const btnCancelar = document.getElementById('btn-sim-nao-etapa-cancelar');

        const finalizar = (valor) => {
            modal.classList.add('hidden');
            btnSim.onclick = null;
            btnNao.onclick = null;
            btnCancelar.onclick = null;
            resolve(valor);
        };

        btnSim.onclick = () => finalizar('SIM');
        btnNao.onclick = () => finalizar('NÃO');
        btnCancelar.onclick = () => finalizar(null);
    });
};

function garantirModalTipoExecucao() {
    if (document.getElementById('modal-tipo-execucao')) return;
    const div = document.createElement('div');
    div.id = 'modal-tipo-execucao';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '10000';
    div.innerHTML = `
        <div class="modal-content" style="max-width:440px; text-align:center;">
            <h2 style="color:var(--text-heading); margin-bottom:6px;">
                <i class="fas fa-clipboard-list"></i> Tipo de Execução
            </h2>
            <p class="text-muted" style="margin-bottom:22px; font-size:13px;">
                Esse reparo vai ser uma revisão <strong>Geral</strong> (todos os itens) ou <strong>Parcial</strong> (só alguns itens)?
            </p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-premium btn-success" style="flex:1; min-width:150px; padding:16px 10px; font-size:14px;" id="btn-tipo-execucao-geral">
                    <i class="fas fa-list-check" style="font-size:18px; display:block; margin-bottom:6px;"></i>GERAL
                </button>
                <button class="btn-premium" style="flex:1; min-width:150px; padding:16px 10px; font-size:14px; background:transparent; border-color:var(--text-accent); color:var(--text-accent);" id="btn-tipo-execucao-parcial">
                    <i class="fas fa-list" style="font-size:18px; display:block; margin-bottom:6px;"></i>PARCIAL
                </button>
            </div>
            <button class="btn-outline-danger" style="margin-top:16px; padding:6px 14px; font-size:12px;" id="btn-tipo-execucao-cancelar">Cancelar</button>
        </div>
    `;
    document.body.appendChild(div);
}

// Retorna uma Promise que resolve pra 'geral', 'parcial' ou null (se o
// técnico cancelar sem escolher).
window.escolherTipoExecucaoChecklist = function() {
    garantirModalTipoExecucao();
    const modal = document.getElementById('modal-tipo-execucao');
    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        const btnGeral = document.getElementById('btn-tipo-execucao-geral');
        const btnParcial = document.getElementById('btn-tipo-execucao-parcial');
        const btnCancelar = document.getElementById('btn-tipo-execucao-cancelar');

        const finalizar = (valor) => {
            modal.classList.add('hidden');
            btnGeral.onclick = null;
            btnParcial.onclick = null;
            btnCancelar.onclick = null;
            resolve(valor);
        };

        btnGeral.onclick = () => finalizar('geral');
        btnParcial.onclick = () => finalizar('parcial');
        btnCancelar.onclick = () => finalizar(null);
    });
};

window.abrirChecklistExecucao = async function(equipamentoId) {
    CHECKLIST_EXECUCAO_EQUIPAMENTO_ATUAL = equipamentoId;
    CHECKLIST_EXECUCAO_TIPO_ATUAL = resolverTipoEquipamento(BANCO_ATIVOS.find(a => a.id === equipamentoId));
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
            // (modal próprio, ver escolherTipoExecucaoChecklist) e abre um novo.
            const tipoExecucao = await window.escolherTipoExecucaoChecklist();
            if (!tipoExecucao) {
                // Técnico cancelou a escolha — fecha o checklist sem criar
                // execução nenhuma, como se nunca tivesse clicado.
                window.fecharModalChecklistExecucao();
                return;
            }
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
    return window.MATRICULAS_ADM.includes(matricula);
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
    const equipe = Array.isArray(window.getOficinaEquipeAtual()) ? window.getOficinaEquipeAtual() : [];
    const secoesDoTipo = obterSecoesChecklistExecucao(CHECKLIST_EXECUCAO_TIPO_ATUAL);

    let html = '';
    secoesDoTipo.forEach(secao => {
        const etapasDaSecao = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.filter(e => e.area === secao.chave);
        if (etapasDaSecao.length === 0 && !isAdmin) return; // técnico não vê seção vazia

        html += `
            <div class="glass-panel" style="padding:12px; margin-bottom:12px; border-left:4px solid ${secao.cor};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                    <div style="font-weight:700; color:${secao.cor}; font-size:13px;">
                        <i class="fas ${secao.icone}"></i> ${secao.nome}
                    </div>
                    ${isAdmin ? `<button class="btn-premium" style="padding:5px 10px; font-size:11px;" onclick="window.formNovaEtapaChecklistExecucao('${secao.chave}')"><i class="fas fa-plus"></i> Etapa</button>` : ''}
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
            html += `<div style="display:flex; gap:8px; flex-wrap:wrap;">${secoesDoTipo.map(s => `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.formNovaEtapaChecklistExecucao('${s.chave}')"><i class="fas ${s.icone}"></i> ${s.nome}</button>`).join('')}</div>`;
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
        <div style="display:flex; flex-wrap:wrap; gap:4px; flex-shrink:0;">
            <button class="btn-premium" style="padding:6px 8px; font-size:11px;" title="Editar (texto e mapeamento com o Folhão)" onclick='window.editarEtapaChecklistExecucao(${e.id})'><i class="fas fa-pen"></i></button>
            <button class="btn-premium" style="padding:6px 8px; font-size:11px;" title="Mover pra cima" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', -1)"><i class="fas fa-arrow-up"></i></button>
            <button class="btn-premium" style="padding:6px 8px; font-size:11px;" title="Mover pra baixo" onclick="window.moverEtapaChecklistExecucao(${e.id}, '${secao.chave}', 1)"><i class="fas fa-arrow-down"></i></button>
            <button class="btn-outline-danger" style="padding:6px 8px; font-size:11px;" title="Excluir etapa" onclick="window.excluirEtapaChecklistExecucao(${e.id})"><i class="fas fa-trash"></i></button>
        </div>
    ` : '';

    if (tipoResposta === 'medicao') {
        const preenchida = !!(e.valor && e.valor.trim());
        return `
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${preenchida ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
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
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${completo ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px;">
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
    // 🆕 Cor de fundo agora reflete a resposta de verdade: verde só
    // quando a resposta foi SIM. Se foi marcada mas a resposta é NÃO,
    // fica laranja/vermelho — chamando atenção, em vez de parecer que
    // "está tudo certo" igual antes (quando qualquer marcação virava
    // verde, sem distinguir SIM de NÃO).
    const respondidaComNao = e.marcado && e.valor === 'NÃO';
    const corFundo = respondidaComNao ? 'rgba(239, 68, 68, 0.12)' : (e.marcado ? 'var(--success-bg)' : 'var(--bg-td)');
    const badgeResposta = e.marcado && e.valor
        ? `<span style="font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px; background:${e.valor === 'SIM' ? 'var(--success)' : 'var(--danger)'}; color:#fff;">${e.valor}</span>`
        : '';
    // 🆕 Se a correção veio do Folhão (colaborador termina com "(via
    // Folhão)"), mostra um selo azul junto — fica visível de relance,
    // sem precisar ler o texto todo do colaborador.
    const veioDoFolhao = e.marcado && (e.colaborador || '').includes('(via Folhão)');
    const badgeOrigem = veioDoFolhao
        ? `<span style="font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px; margin-left:6px; background:var(--primary, #38bdf8); color:#04202e;"><i class="fas fa-file-signature"></i> via Folhão</span>`
        : '';
    return `
        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-start; padding:8px; border-radius:8px; background:${corFundo}; margin-bottom:6px;">
            <input type="checkbox" ${e.marcado ? 'checked' : ''} style="margin-top:3px; width:18px; height:18px; flex-shrink:0;" onchange="window.marcarEtapaChecklistExecucao(${e.id}, this.checked)">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; color:var(--text-heading);">${e.texto}${badgeResposta}${badgeOrigem}</div>
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

// ==========================================================================
// 🆕 MODAL "QUEM EXECUTOU" — substitui o prompt() de texto livre (que só
// deixava digitar 1 nome por vez, sem nem sugerir a equipe direito) por
// um modal com checkbox de cada colaborador da equipe (incluindo o
// próprio técnico logado), opção de marcar todos de uma vez, e um campo
// de texto livre pra alguém de FORA da equipe que também ajudou.
// ==========================================================================
function garantirModalColaboradoresEtapa() {
    if (document.getElementById('modal-colaboradores-etapa')) return;
    const div = document.createElement('div');
    div.id = 'modal-colaboradores-etapa';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '10000';
    div.innerHTML = `
        <div class="modal-content" style="max-width:460px;">
            <h2 style="color:var(--text-heading); margin-bottom:4px;">
                <i class="fas fa-users"></i> Quem executou essa etapa?
            </h2>
            <p class="text-muted" style="margin-bottom:14px; font-size:12px;">
                Marque um, vários, ou todos da equipe.
            </p>
            <div id="colaboradores-etapa-lista" style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-bottom:12px; border:1px solid var(--border-color); border-radius:8px; padding:10px;"></div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
                <input type="checkbox" id="colaboradores-etapa-todos" style="width:16px; height:16px;">
                <label for="colaboradores-etapa-todos" style="margin:0; font-size:12px; cursor:pointer;">Selecionar todos</label>
            </div>
            <div class="input-group" style="margin-bottom:18px; text-align:left;">
                <label style="font-size:12px;">Alguém de outra equipe ajudou? (opcional)</label>
                <input type="text" id="colaboradores-etapa-outro" class="premium-input" placeholder="Ex: João (Elétrica)">
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                <button class="btn-outline-danger" style="padding:8px 14px;" id="colaboradores-etapa-cancelar">Cancelar</button>
                <button class="btn-premium btn-success" style="padding:8px 16px;" id="colaboradores-etapa-confirmar"><i class="fas fa-check"></i> Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// Retorna uma Promise que resolve pro texto final (nomes separados por
// vírgula) ou null se o técnico cancelar.
// `areaChave` (opcional) é a área do equipamento (ex: "molde-mcc4",
// "bow", "segmento-grupo" — o mesmo valor de resolverTipoEquipamento())
// — usada pra buscar a equipe certa direto do servidor. Funciona pra
// QUALQUER tipo de equipamento, não só um caso específico, porque usa
// a mesma área que já resolve as etapas do Checklist.
window.escolherColaboradoresChecklist = async function(areaChave) {
    garantirModalColaboradoresEtapa();
    const modal = document.getElementById('modal-colaboradores-etapa');
    const lista = document.getElementById('colaboradores-etapa-lista');
    const inputOutro = document.getElementById('colaboradores-etapa-outro');
    const checkTodos = document.getElementById('colaboradores-etapa-todos');
    inputOutro.value = '';
    checkTodos.checked = false;
    lista.innerHTML = `<p class="text-muted" style="font-size:12px; margin:0;">Carregando equipe...</p>`;
    modal.classList.remove('hidden');

    // 🆕 CORREÇÃO ("só aparecia eu na lista"): antes usava só o cache
    // window.getOficinaEquipeAtual(), que só é preenchido quando o
    // técnico visita a tela da área na aba Oficina antes de abrir o
    // Checklist — se ele abrir o Checklist direto (o caminho normal, via
    // "Iniciar Reparo"), esse cache vem vazio. Agora busca a equipe
    // direto do servidor, pela área do equipamento, toda vez que o modal
    // abre — não depende de já ter passado por nenhuma outra tela antes.
    let nomesEquipe = [];
    if (areaChave) {
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(areaChave)}`, { cache: 'no-store' });
            const equipe = resp.ok ? await resp.json() : [];
            nomesEquipe = Array.isArray(equipe) ? equipe.map(p => p.nome).filter(Boolean) : [];
        } catch (e) {
            console.error('⚠️ Não consegui buscar a equipe da área pra esse checklist:', e);
        }
    }
    // Fallback: se não veio nada do servidor (área não encontrada, sem
    // conexão, ou não foi passada nenhuma área), tenta o cache local.
    if (nomesEquipe.length === 0) {
        const equipeCache = Array.isArray(window.getOficinaEquipeAtual()) ? window.getOficinaEquipeAtual() : [];
        nomesEquipe = equipeCache.map(p => p.nome).filter(Boolean);
    }

    // O próprio técnico logado sempre aparece também (marcado como
    // "você"), mesmo que não esteja cadastrado formalmente na equipe.
    const operador = (typeof window.getOperadorLogado === 'function') ? window.getOperadorLogado() : null;
    const nomeOperador = operador && operador.nome ? operador.nome.replace(/\s*\[.+?\]/, '').trim() : null;

    let nomes = [...nomesEquipe];
    if (nomeOperador && !nomes.some(n => n.toLowerCase() === nomeOperador.toLowerCase())) {
        nomes.unshift(nomeOperador);
    }

    lista.innerHTML = nomes.length
        ? nomes.map(nome => `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; margin:0;">
                <input type="checkbox" class="colaboradores-etapa-checkbox" value="${nome.replace(/"/g, '&quot;')}" style="width:16px; height:16px; flex-shrink:0;">
                <span>${nome}${nomeOperador && nome === nomeOperador ? ' <span style="color:var(--text-accent); font-size:11px;">(você)</span>' : ''}</span>
            </label>
        `).join('')
        : `<p class="text-muted" style="font-size:12px; margin:0;">Nenhuma equipe cadastrada pra essa área ainda — use o campo abaixo.</p>`;

    return new Promise((resolve) => {
        const btnConfirmar = document.getElementById('colaboradores-etapa-confirmar');
        const btnCancelar = document.getElementById('colaboradores-etapa-cancelar');

        checkTodos.onchange = () => {
            document.querySelectorAll('.colaboradores-etapa-checkbox').forEach(cb => { cb.checked = checkTodos.checked; });
        };

        const finalizar = (valor) => {
            modal.classList.add('hidden');
            checkTodos.onchange = null;
            btnConfirmar.onclick = null;
            btnCancelar.onclick = null;
            resolve(valor);
        };

        btnConfirmar.onclick = () => {
            const marcados = Array.from(document.querySelectorAll('.colaboradores-etapa-checkbox:checked')).map(cb => cb.value);
            const outro = inputOutro.value.trim();
            const todosNomes = [...marcados];
            if (outro) todosNomes.push(outro);
            if (todosNomes.length === 0) {
                alert('Marque pelo menos uma pessoa, ou preencha o campo de outra equipe.');
                return;
            }
            finalizar(todosNomes.join(', '));
        };

        btnCancelar.onclick = () => finalizar(null);
    });
};

// --------------------------------------------------------------
// MARCAR ETAPA (qualquer técnico logado) — checkboxes sim/não
// --------------------------------------------------------------
window.marcarEtapaChecklistExecucao = async function(etapaId, marcado) {
    if (!window.verificarAcesso()) {
        // 🐛 CORRIGIDO ("conclui uma etapa e a janela inteira fecha"):
        // verificarAcesso() retorna false por 2 motivos bem diferentes —
        // sessao realmente expirada (aí sim precisa fechar tudo e voltar
        // pro login) ou Modo Visitante (que já mostra o próprio aviso de
        // "somente leitura" e não deveria fechar nada, só bloquear a
        // ação). Antes os dois casos fechavam o Checklist igual; agora só
        // fecha quando realmente não tem ninguém logado.
        if (!OPERADOR_LOGADO) window.fecharModalChecklistExecucao();
        return;
    }

    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        alert('Não foi possível identificar o reparo em andamento. Feche e abra o checklist de novo.');
        window.recarregarChecklistExecucao();
        return;
    }

    let colaborador = null;
    let respostaSimNao = null;
    if (marcado) {
        // 🆕 Pergunta a resposta de verdade ANTES de perguntar quem fez —
        // antes, marcar essa etapa só significava "feito", e sempre virava
        // SIM lá no Folhão, mesmo quando a resposta correta era NÃO (ex:
        // "os flexíveis estão danificados?").
        const etapa = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.find(e => e.id === etapaId);
        respostaSimNao = await window.escolherSimNaoEtapa(etapa ? etapa.texto : '');
        if (respostaSimNao === null) { window.recarregarChecklistExecucao(); return; } // cancelou

        colaborador = await window.escolherColaboradoresChecklist(CHECKLIST_EXECUCAO_TIPO_ATUAL);
        if (colaborador === null) { window.recarregarChecklistExecucao(); return; } // cancelou
    } else {
        if (!confirm('Desmarcar essa etapa? Isso registra retrabalho (ela vai precisar ser refeita).')) {
            window.recarregarChecklistExecucao();
            return;
        }
    }

    await enviarMarcacaoChecklistExecucao(etapaId, { marcado, colaborador, valor: respostaSimNao });
};

// --------------------------------------------------------------
// 🆕 MEDIÇÃO ÚNICA (tipo_resposta = "medicao") — ex: "Qual a situação
// do molde / Observação". Pede o valor e quem preencheu, num prompt
// simples (não precisa de modal pra 1 campo só).
// --------------------------------------------------------------
window.responderMedicaoChecklistExecucao = async function(etapaId, valorAtual) {
    if (!window.verificarAcesso()) {
        // 🐛 CORRIGIDO ("conclui uma etapa e a janela inteira fecha"):
        // verificarAcesso() retorna false por 2 motivos bem diferentes —
        // sessao realmente expirada (aí sim precisa fechar tudo e voltar
        // pro login) ou Modo Visitante (que já mostra o próprio aviso de
        // "somente leitura" e não deveria fechar nada, só bloquear a
        // ação). Antes os dois casos fechavam o Checklist igual; agora só
        // fecha quando realmente não tem ninguém logado.
        if (!OPERADOR_LOGADO) window.fecharModalChecklistExecucao();
        return;
    }
    if (!CHECKLIST_EXECUCAO_EXECUCAO_ATUAL) {
        alert('Não foi possível identificar o reparo em andamento. Feche e abra o checklist de novo.');
        return;
    }

    const valor = prompt('Valor / observação:', valorAtual || '');
    if (valor === null) return; // cancelou
    if (!valor.trim()) { alert('Informe um valor.'); return; }

    const colaborador = await window.escolherColaboradoresChecklist(CHECKLIST_EXECUCAO_TIPO_ATUAL);
    if (colaborador === null) return;

    await enviarMarcacaoChecklistExecucao(etapaId, { marcado: true, valor: valor.trim(), colaborador: colaborador || null });
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
    if (!window.verificarAcesso()) {
        // 🐛 CORRIGIDO ("conclui uma etapa e a janela inteira fecha"):
        // verificarAcesso() retorna false por 2 motivos bem diferentes —
        // sessao realmente expirada (aí sim precisa fechar tudo e voltar
        // pro login) ou Modo Visitante (que já mostra o próprio aviso de
        // "somente leitura" e não deveria fechar nada, só bloquear a
        // ação). Antes os dois casos fechavam o Checklist igual; agora só
        // fecha quando realmente não tem ninguém logado.
        if (!OPERADOR_LOGADO) window.fecharModalChecklistExecucao();
        return;
    }
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
                ${chaves.map(chave => {
                    // 🆕 RESTRIÇÃO NA ORIGEM: se a chave termina com "(OK/NOK)",
                    // esse valor SÓ pode ser OK ou NOK — mostra um select
                    // travado em vez de texto livre. Sem isso, um técnico
                    // podia digitar "qq", "q", qualquer coisa, e o valor só
                    // ia falhar silenciosamente (ou com aviso confuso) lá no
                    // Folhão, sem ninguém no Checklist saber que tinha erro.
                    const ehOkNok = /\(OK\/NOK\)\s*$/i.test(chave);
                    const rotulo = ehOkNok ? chave.replace(/\s*\(OK\/NOK\)\s*$/i, '') : chave;
                    const valorSalvo = valoresAtuais[chave] || '';
                    const campoHtml = ehOkNok
                        ? `<select data-chave-medicao="${chave}" class="premium-select" style="width:100%; padding:4px 6px; font-size:12px;">
                               <option value="" ${!valorSalvo ? 'selected' : ''}>—</option>
                               <option value="OK" ${valorSalvo === 'OK' ? 'selected' : ''}>OK</option>
                               <option value="NOK" ${valorSalvo === 'NOK' ? 'selected' : ''}>NOK</option>
                           </select>`
                        : `<input type="text" data-chave-medicao="${chave}" value="${valorSalvo}" class="premium-select" style="width:100%; padding:4px 6px; font-size:12px;">`;
                    return `
                    <div>
                        <label style="font-size:10.5px; color:var(--text-muted); display:block; margin-bottom:2px;">${rotulo}</label>
                        ${campoHtml}
                    </div>
                `;}).join('')}
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

    const colaborador = await window.escolherColaboradoresChecklist(CHECKLIST_EXECUCAO_TIPO_ATUAL);
    if (colaborador === null) return;

    modal.remove();
    await enviarMarcacaoChecklistExecucao(etapaId, { marcado: true, valor: JSON.stringify(valores), colaborador: colaborador || null });
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

// ==========================================================================
// 🆕 MODAL "EDITAR ETAPA" — permite corrigir o texto E o mapeamento com
// o Folhão (folhao_campo / tipo_resposta) de uma etapa já cadastrada,
// sem precisar apagar e recriar (o que perderia o histórico de quem já
// marcou essa etapa em reparos em andamento). Foi criado especificamente
// pra corrigir casos como "a etapa preenche 57 medições, mas nenhuma
// aparece no Folhão" — geralmente um folhao_campo apontando pro nome
// errado do campo.
// ==========================================================================
function garantirModalEditarEtapa() {
    if (document.getElementById('modal-editar-etapa-checklist')) return;
    const div = document.createElement('div');
    div.id = 'modal-editar-etapa-checklist';
    div.className = 'modal-overlay hidden';
    div.style.zIndex = '10000';
    div.innerHTML = `
        <div class="modal-content" style="max-width:640px; text-align:left;">
            <h2 style="color:var(--text-heading); margin-bottom:14px;"><i class="fas fa-pen"></i> Editar Etapa</h2>

            <div class="input-group" style="margin-bottom:12px;">
                <label>Texto da etapa</label>
                <input type="text" id="editar-etapa-texto" class="premium-input">
            </div>

            <div class="input-group" style="margin-bottom:12px;">
                <label>Área / Bloco</label>
                <select id="editar-etapa-area" class="premium-select"></select>
            </div>

            <div class="input-group" style="margin-bottom:12px;">
                <label>Tipo de resposta</label>
                <select id="editar-etapa-tipo-resposta" class="premium-select" onchange="window.atualizarAjudaFolhaoCampoEtapa()">
                    <option value="sim_nao">Sim / Não</option>
                    <option value="medicao">Medição única (1 valor)</option>
                    <option value="medicao_multipla">Medição múltipla (vários valores)</option>
                </select>
            </div>

            <div class="input-group" style="margin-bottom:6px;">
                <label>Mapeamento com o Folhão (folhao_campo) — deixe em branco pra não jogar em nenhum campo</label>
                <textarea id="editar-etapa-folhao-campo" class="premium-input" style="width:100%; min-height:90px; font-family:monospace; font-size:12px;" placeholder='Ex: "m4-aj-tfr" (sim/não ou medição única) ou {"1000-inf":"m4-fa-1000-ei", "1000-meio":"m4-fa-1000-em"} (medição múltipla)'></textarea>
            </div>
            <p id="editar-etapa-ajuda" class="text-muted" style="font-size:11px; margin-bottom:16px;"></p>

            <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                <button class="btn-outline-danger" style="padding:8px 14px;" id="editar-etapa-cancelar">Cancelar</button>
                <button class="btn-premium btn-success" style="padding:8px 16px;" id="editar-etapa-salvar"><i class="fas fa-save"></i> Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// Atualiza o texto de ajuda embaixo do campo, de acordo com o tipo de
// resposta escolhido — pra quem for corrigir o mapeamento não precisar
// adivinhar o formato certo do JSON.
window.atualizarAjudaFolhaoCampoEtapa = function() {
    const tipo = document.getElementById('editar-etapa-tipo-resposta')?.value;
    const ajuda = document.getElementById('editar-etapa-ajuda');
    if (!ajuda) return;
    if (tipo === 'medicao_multipla') {
        ajuda.innerHTML = 'Formato: <code>{"nome_mostrado_no_checklist": "id_real_do_input_no_folhão", ...}</code> — o lado esquerdo é só o rótulo que aparece pro técnico preencher; o lado direito TEM que ser o <code>id</code> exato do campo no HTML do Folhão (ex: <code>m4-fa-1000-ei</code>), senão o valor não aparece lá.';
    } else {
        ajuda.innerHTML = 'Formato: o <code>id</code> exato de UM campo do Folhão (texto simples, sem chaves), ex: <code>m4-aj-tfr</code>. Deixe vazio se essa etapa não deve preencher nada no Folhão sozinha.';
    }
};

window.editarEtapaChecklistExecucao = function(etapaId) {
    if (!ehAdminChecklistExecucao()) { alert('Só as matrículas autorizadas podem editar etapas do checklist.'); return; }
    const etapa = CHECKLIST_EXECUCAO_ETAPAS_ATUAIS.find(e => e.id === etapaId);
    if (!etapa) { alert('Não achei essa etapa — feche e abra o checklist de novo.'); return; }

    garantirModalEditarEtapa();
    const modal = document.getElementById('modal-editar-etapa-checklist');
    document.getElementById('editar-etapa-texto').value = etapa.texto || '';
    document.getElementById('editar-etapa-tipo-resposta').value = etapa.tipo_resposta || 'sim_nao';

    // 🆕 Popula o select de Área com as seções do TIPO desse equipamento
    // (ex: Chegada/Manutenção/Saída pro Molde MCC4, ou as seções
    // genéricas de sempre pra qualquer outro tipo) — assim dá pra mover
    // uma etapa antiga (ex: "mecanica") pro bloco novo.
    const selectArea = document.getElementById('editar-etapa-area');
    const secoesDesteTipo = obterSecoesChecklistExecucao(CHECKLIST_EXECUCAO_TIPO_ATUAL);
    selectArea.innerHTML = secoesDesteTipo.map(s => `<option value="${s.chave}">${s.nome}</option>`).join('');
    // Se a área atual da etapa não existir mais nessa lista (ex: uma
    // etapa antiga com area="mecanica" que ainda não foi migrada pro
    // bloco novo), adiciona ela mesmo assim como opção, marcada — pra
    // não sumir/trocar de área sem querer só de abrir o "Editar".
    if (etapa.area && !secoesDesteTipo.some(s => s.chave === etapa.area)) {
        selectArea.innerHTML += `<option value="${etapa.area}">${etapa.area} (área antiga, fora da lista atual)</option>`;
    }
    selectArea.value = etapa.area || (secoesDesteTipo[0] && secoesDesteTipo[0].chave) || '';

    // Mostra o folhao_campo já formatado (com identação), pra quem for
    // consertar um JSON de medição múltipla conseguir ler/editar direito
    // em vez de uma linha só ilegível.
    let folhaoCampoFormatado = etapa.folhao_campo || '';
    if ((etapa.tipo_resposta || '') === 'medicao_multipla' && folhaoCampoFormatado) {
        try { folhaoCampoFormatado = JSON.stringify(JSON.parse(folhaoCampoFormatado), null, 2); } catch (e) { /* deixa como veio, se não for JSON válido */ }
    }
    document.getElementById('editar-etapa-folhao-campo').value = folhaoCampoFormatado;
    window.atualizarAjudaFolhaoCampoEtapa();

    modal.classList.remove('hidden');

    const btnSalvar = document.getElementById('editar-etapa-salvar');
    const btnCancelar = document.getElementById('editar-etapa-cancelar');

    const fechar = () => {
        modal.classList.add('hidden');
        btnSalvar.onclick = null;
        btnCancelar.onclick = null;
    };

    btnCancelar.onclick = fechar;

    btnSalvar.onclick = async () => {
        const texto = document.getElementById('editar-etapa-texto').value.trim();
        if (!texto) { alert('O texto da etapa não pode ficar vazio.'); return; }
        const area = document.getElementById('editar-etapa-area').value;
        const tipoResposta = document.getElementById('editar-etapa-tipo-resposta').value;
        // Comprime de volta pra 1 linha só antes de mandar pro servidor
        // (a identação bonitinha é só pra facilitar a leitura na hora de
        // editar; o formato salvo no banco não precisa disso).
        let folhaoCampo = document.getElementById('editar-etapa-folhao-campo').value.trim();
        if (tipoResposta === 'medicao_multipla' && folhaoCampo) {
            try { folhaoCampo = JSON.stringify(JSON.parse(folhaoCampo)); }
            catch (e) { alert('O mapeamento não é um JSON válido. Confira as chaves/aspas/vírgulas e tente de novo.'); return; }
        }

        const tecnico = OPERADOR_LOGADO || {};
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/checklist-execucao/etapas/editar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: etapaId,
                    texto,
                    area,
                    operador: tecnico.matricula || '',
                    folhao_campo: folhaoCampo,
                    tipo_resposta: tipoResposta
                })
            });
            if (!resp.ok) {
                const erro = await resp.json().catch(() => null);
                alert(erro?.detail || 'Não foi possível salvar as alterações.');
                return;
            }
        } catch (e) {
            console.error('⚠️ Erro ao editar etapa do Checklist de Execução:', e);
            alert('Não foi possível conectar ao servidor.');
            return;
        }

        fechar();
        window.recarregarChecklistExecucao();
    };
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