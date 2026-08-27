// ==============================================================
// folhaoPersistencia.js
// ==============================================================
// Módulo único e genérico de "salvar progresso" do folhão, usado por
// TODOS os equipamentos (Molde4, Molde23, Bow, Horizontal, R2,
// Straightener R1, Segmento Zero, Bender, Desempenadeira).
//
// Problema que resolve: antes, se o técnico preenchia a CHEGADA e
// fechava o folhão, os dados sumiam. Agora, a cada alteração no
// formulário o progresso é salvo automaticamente no banco (Neon via
// API), vinculado ao ID do equipamento. Quando o folhão for reaberto
// (no mesmo PC ou em outro), os campos já vêm preenchidos, faltando só
// completar a etapa de SAÍDA. O rascunho só é apagado quando o folhão
// é finalizado/impresso (window.finalizarRascunhoFolhao).
// ==============================================================

import { resolverApiBase } from '../Core/banco.js?v=5';

// --------------------------------------------------------------
// COLETA GENÉRICA DE TODOS OS CAMPOS DENTRO DE UM MODAL
// --------------------------------------------------------------
// 🆕 Agora também coleta QUAIS campos foram editados manualmente pelo
// técnico (data-editado-manual="1", marcado por ativarAutoSalvamentoFolhao
// sempre que o próprio usuário mexe num campo — nunca quando é o script
// que preenche via .value=). Isso é o que permite ao Checklist de
// Execução respeitar uma correção manual feita direto no Folhão, em vez
// de sempre sobrescrever na próxima abertura.
export function coletarDadosModal(modalId) {
    const modal = document.getElementById(modalId);
    const dados = { campos: {}, radios: {}, editadosManualmente: {} };
    if (!modal) return dados;

    modal.querySelectorAll('input, textarea, select').forEach(el => {
        if (!el.id) return;
        if (el.type === 'radio') return; // radios são tratados abaixo, por name
        if (el.type === 'checkbox') {
            dados.campos[el.id] = el.checked;
        } else {
            dados.campos[el.id] = el.value;
        }
        if (el.dataset.editadoManual === '1') dados.editadosManualmente[el.id] = true;
    });

    const nomesRadio = new Set();
    modal.querySelectorAll('input[type="radio"][name]').forEach(el => nomesRadio.add(el.name));
    nomesRadio.forEach(nome => {
        const marcado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`);
        if (marcado) dados.radios[nome] = marcado.value;
        const algumEditado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"][data-editado-manual="1"]`);
        if (algumEditado) dados.editadosManualmente[`radio:${nome}`] = true;
    });

    return dados;
}

// --------------------------------------------------------------
// MARCA VISUALMENTE UM CAMPO/GRUPO COMO "EDITADO MANUALMENTE NO
// FOLHÃO" — cor diferente da que o Checklist de Execução usa (azul, em
// vez do verde/vermelho do preenchimento automático), pra ficar claro
// que essa resposta foi conferida/corrigida na mão e não vem mais do
// Checklist.
// --------------------------------------------------------------
function marcarEditadoManual(el) {
    if (!el) return;
    el.dataset.editadoManual = '1';
    el.style.background = 'rgba(56, 189, 248, 0.14)';
    el.style.borderColor = 'var(--primary, #38bdf8)';
    el.title = '✍️ Editado manualmente no Folhão — não será mais sobrescrito pelo Checklist de Execução';
}

// --------------------------------------------------------------
// PREENCHE O MODAL COM UM RASCUNHO CARREGADO DO BANCO
// --------------------------------------------------------------
export function preencherDadosModal(modalId, dados) {
    if (!dados) return;
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const campos = dados.campos || {};
    Object.keys(campos).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!campos[id];
        else el.value = campos[id];
    });

    const radios = dados.radios || {};
    Object.keys(radios).forEach(nome => {
        const valor = radios[nome];
        const el = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"][value="${CSS.escape(String(valor))}"]`);
        if (el) el.checked = true;
    });

    // 🆕 Reaplica a marca de "editado manualmente" salva no rascunho —
    // sem isso, ao recarregar a página essa informação existia só no
    // banco (dentro de "dados"), mas os elementos <input> recém-criados
    // nasciam sem o data-editado-manual, e o Checklist voltava a poder
    // sobrescrever um campo que o técnico já tinha corrigido na mão.
    const editados = dados.editadosManualmente || {};
    Object.keys(editados).forEach(chave => {
        if (chave.startsWith('radio:')) {
            const nome = chave.slice('radio:'.length);
            modal.querySelectorAll(`input[type="radio"][name="${CSS.escape(nome)}"]`).forEach(r => {
                r.dataset.editadoManual = '1';
            });
            const marcado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`);
            marcarEditadoManual(marcado?.closest('.sim-nao-card') || marcado?.closest('tr') || marcado?.closest('label'));
        } else {
            marcarEditadoManual(document.getElementById(chave));
        }
    });
}

// --------------------------------------------------------------
// API: SALVAR / CARREGAR / FINALIZAR RASCUNHO
// --------------------------------------------------------------
export async function salvarRascunhoFolhao(equipamentoId, tipoFolhao, dados, etapa = null) {
    if (!equipamentoId) return false;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/folhao/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipamento_id: equipamentoId,
                tipo_folhao: tipoFolhao,
                dados: JSON.stringify(dados),
                etapa
            })
        });
        // 🐛 CORRIGIDO: antes essa função nunca contava pra quem chamou
        // se o salvamento deu certo ou não — mesmo com a API retornando
        // erro (500, offline, etc.), o "catch" só fazia console.error e
        // a função terminava normal, sem sinalizar nada. Isso deixava
        // quem chama (ex: o botão "Salvar" do Folhão) sem saber que
        // precisava avisar o técnico. Agora devolve true/false de verdade.
        return resp.ok;
    } catch (e) {
        console.error('⚠️ Não foi possível salvar o progresso do folhão:', e);
        return false;
    }
}

export async function carregarRascunhoFolhao(equipamentoId) {
    if (!equipamentoId) return null;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/folhao/${encodeURIComponent(equipamentoId)}`);
        if (!resp.ok) return null; // 404 = não tem rascunho ainda, é normal
        const json = await resp.json();
        if (!json || !json.dados) return null;
        return { ...JSON.parse(json.dados), etapa: json.etapa, tipo_folhao: json.tipo_folhao };
    } catch (e) {
        console.error('⚠️ Não foi possível carregar o progresso salvo do folhão:', e);
        return null;
    }
}

export async function finalizarRascunhoFolhao(equipamentoId, tipoFolhao = null) {
    if (!equipamentoId) return;

    // 📋 Registra no histórico individual do equipamento que um folhão foi
    // concluído — é isso que faz o card "Folhões Concluídos" do Prontuário
    // (e a linha do tempo) contarem certo. Fica centralizado aqui porque
    // TODOS os folhões (Molde4, Molde23, Bow, Horizontal, R2, Straightener
    // R1, Segmento Zero, Segmento de Grupo, Desempenadeira) chamam essa
    // mesma função no momento de salvar/imprimir.
    if (typeof window.registrarHistorico === 'function') {
        const rotulo = tipoFolhao ? ` (${tipoFolhao})` : '';
        window.registrarHistorico(equipamentoId, `📋 Folhão de manutenção${rotulo} finalizado e salvo.`);
    }

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/folhao/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipamento_id: equipamentoId })
        });
    } catch (e) {
        console.error('⚠️ Não foi possível limpar o rascunho do folhão finalizado:', e);
    }
}

// --------------------------------------------------------------
// CARREGA O RASCUNHO (se existir) E JÁ PREENCHE O MODAL
// Chamar no FINAL da função "abrir" de cada folhão, depois que todo o
// HTML do formulário já foi renderizado na tela.
// --------------------------------------------------------------
export async function restaurarRascunhoNoModal(modalId, equipamentoId) {
    const dados = await carregarRascunhoFolhao(equipamentoId);
    if (dados) {
        preencherDadosModal(modalId, dados);
        const aviso = document.getElementById('aviso-rascunho-folhao');
        if (aviso) {
            aviso.textContent = '📋 Progresso anterior restaurado — continue de onde parou.';
            aviso.classList.remove('hidden');
        }
    }
    return dados;
}

// --------------------------------------------------------------
// LIGA O AUTO-SALVAMENTO NO MODAL (debounce, sem precisar de botão)
// Chamar uma vez no final da função "abrir" de cada folhão.
// --------------------------------------------------------------
export function ativarAutoSalvamentoFolhao(modalId, equipamentoId, tipoFolhao) {
    const modal = document.getElementById(modalId);
    if (!modal || modal.dataset.autoSaveFolhao === '1') return;
    modal.dataset.autoSaveFolhao = '1';

    let timer = null;
    const salvarAgora = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const dados = coletarDadosModal(modalId);
            salvarRascunhoFolhao(equipamentoId, tipoFolhao, dados);
        }, 800);
    };

    // 🆕 CORRIGIDO ("editei a mão e o Checklist apagou minha resposta"):
    // esse listener roda só quando o EVENTO input/change dispara de
    // verdade — ou seja, só quando é o dedo do técnico mexendo no campo.
    // Quando o Checklist de Execução preenche um campo via JS
    // (elemento.value = ... / elemento.checked = ...), isso NUNCA
    // dispara input/change sozinho — então só marca como "editado
    // manualmente" o que o técnico realmente tocou, nunca o que veio
    // do preenchimento automático.
    const marcarComoEditado = (e) => {
        const el = e.target;
        if (!el || !(el.matches('input, textarea, select'))) return;
        if (el.type === 'radio' && el.name) {
            modal.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`).forEach(r => {
                r.dataset.editadoManual = '1';
            });
            marcarEditadoManual(el.closest('.sim-nao-card') || el.closest('tr') || el.closest('label'));
            // 🆕 Avisa quem estiver ouvindo (ex: folhaoMolde4.js) que esse
            // campo foi corrigido na mão, pra dar a chance de espelhar a
            // correção de volta pro Checklist de Execução — sem isso, a
            // correção só existia dentro do Folhão, e o Checklist
            // continuava mostrando a resposta antiga como se nada tivesse
            // mudado (sem saber quem corrigiu, nem quando).
            modal.dispatchEvent(new CustomEvent('folhao:campo-editado-manualmente', {
                detail: { modalId, campo: `radio:${el.name}`, valor: el.value },
                bubbles: true
            }));
        } else if (el.id) {
            marcarEditadoManual(el);
            modal.dispatchEvent(new CustomEvent('folhao:campo-editado-manualmente', {
                detail: { modalId, campo: el.id, valor: el.type === 'checkbox' ? el.checked : el.value },
                bubbles: true
            }));
        }
    };

    modal.addEventListener('input', marcarComoEditado);
    modal.addEventListener('change', marcarComoEditado);
    modal.addEventListener('input', salvarAgora);
    modal.addEventListener('change', salvarAgora);
}

window.coletarDadosModal = coletarDadosModal;
window.preencherDadosModal = preencherDadosModal;
window.salvarRascunhoFolhao = salvarRascunhoFolhao;
window.carregarRascunhoFolhao = carregarRascunhoFolhao;
window.finalizarRascunhoFolhao = finalizarRascunhoFolhao;
window.restaurarRascunhoNoModal = restaurarRascunhoNoModal;
window.ativarAutoSalvamentoFolhao = ativarAutoSalvamentoFolhao;

console.log("✅ folhaoPersistencia.js carregado – progresso de folhão agora persiste no banco.");