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

import { resolverApiBase } from './banco.js?v=2';

// --------------------------------------------------------------
// COLETA GENÉRICA DE TODOS OS CAMPOS DENTRO DE UM MODAL
// --------------------------------------------------------------
export function coletarDadosModal(modalId) {
    const modal = document.getElementById(modalId);
    const dados = { campos: {}, radios: {} };
    if (!modal) return dados;

    modal.querySelectorAll('input, textarea, select').forEach(el => {
        if (!el.id) return;
        if (el.type === 'radio') return; // radios são tratados abaixo, por name
        if (el.type === 'checkbox') {
            dados.campos[el.id] = el.checked;
        } else {
            dados.campos[el.id] = el.value;
        }
    });

    const nomesRadio = new Set();
    modal.querySelectorAll('input[type="radio"][name]').forEach(el => nomesRadio.add(el.name));
    nomesRadio.forEach(nome => {
        const marcado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`);
        if (marcado) dados.radios[nome] = marcado.value;
    });

    return dados;
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
}

// --------------------------------------------------------------
// API: SALVAR / CARREGAR / FINALIZAR RASCUNHO
// --------------------------------------------------------------
export async function salvarRascunhoFolhao(equipamentoId, tipoFolhao, dados, etapa = null) {
    if (!equipamentoId) return;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/folhao/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                equipamento_id: equipamentoId,
                tipo_folhao: tipoFolhao,
                dados: JSON.stringify(dados),
                etapa
            })
        });
    } catch (e) {
        console.error('⚠️ Não foi possível salvar o progresso do folhão:', e);
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

export async function finalizarRascunhoFolhao(equipamentoId) {
    if (!equipamentoId) return;
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
