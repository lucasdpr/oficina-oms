// ==========================================================================
// QUALIDADE (Entrada/Saída) — extraído de script.js na modularização
// ==========================================================================
// O responsável pela Qualidade registra como o equipamento chegou na
// oficina (fotos + observação) e depois, quando o serviço termina,
// registra como ele está saindo. Inclui achados (problemas encontrados)
// por registro e a detecção de padrões entre equipamentos.

import { resolverApiBase, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { enviarComFilaOffline, fetchComRetry, mostrarToastDesfazer } from '../Core/utils.js';
import { CATEGORIAS_ACHADO_QUALIDADE } from '../Core/dados.js';

// ==========================================
// 🆕 QUALIDADE (Entrada/Saída) — o responsável pela Qualidade registra
// como o equipamento chegou na oficina (fotos + observação) e depois,
// quando o serviço termina, registra como ele está saindo. Reaproveita
// comprimirFotoParaBase64() já usada em OS/Ocorrência.
// ==========================================
let QUALIDADE_FOTOS_ENTRADA_BASE64 = [];
let QUALIDADE_FOTOS_SAIDA_BASE64 = [];
let FILTRO_QUALIDADE_ATUAL = '';
let BUSCA_QUALIDADE_ATUAL = '';
let QUALIDADE_CACHE = [];
let QUALIDADE_ACHADO_FOTOS_NOVAS = []; // 🆕 fotos (pode ter mais de 1) do achado sendo digitado no formulário de entrada
let QUALIDADE_ACHADOS_LISTA = []; // achados já adicionados, aguardando o "Registrar Entrada"

window.processarFotoAchadoNovo = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;
    for (const arquivo of arquivos) {
        try {
            const base64 = await window.comprimirFotoParaBase64(arquivo);
            QUALIDADE_ACHADO_FOTOS_NOVAS.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto do achado:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}).`);
        }
    }
    renderPreviewFotosAchadoNovo();
    event.target.value = '';
};

function renderPreviewFotosAchadoNovo() {
    const preview = document.getElementById('qualidade-achado-novo-foto-preview');
    if (!preview) return;
    if (QUALIDADE_ACHADO_FOTOS_NOVAS.length === 0) { preview.classList.add('hidden'); preview.innerHTML = ''; return; }

    preview.classList.remove('hidden');
    preview.style.display = 'flex';
    preview.style.gap = '6px';
    preview.style.flexWrap = 'wrap';
    preview.innerHTML = QUALIDADE_ACHADO_FOTOS_NOVAS.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <button type="button" onclick="window.removerFotoAchadoNovo(${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; line-height:1;"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

window.removerFotoAchadoNovo = function(indice) {
    if (typeof indice === 'number') QUALIDADE_ACHADO_FOTOS_NOVAS.splice(indice, 1);
    else QUALIDADE_ACHADO_FOTOS_NOVAS = [];
    renderPreviewFotosAchadoNovo();
};

// 🆕 Opções do <select> de categoria do achado — mesma lista em todo
// lugar que precisa dela (formulário de entrada + modal), pra nunca
// desincronizar. "" (Categoria opcional) sempre primeiro.
function opcoesCategoriaAchadoHTML(selecionado = '') {
    return `<option value="">Categoria (opcional)</option>` +
        CATEGORIAS_ACHADO_QUALIDADE.map(c => `<option value="${c}" ${c === selecionado ? 'selected' : ''}>${c}</option>`).join('');
}

// Preenche o <select> estático do formulário de ENTRADA (app.html) —
// os outros achados (modal) geram o próprio <select> na hora, direto
// no template (ver window.abrirModalAchadosQualidade).
(function preencherSelectCategoriaAchadoEntrada() {
    const select = document.getElementById('qualidade-achado-categoria');
    if (select) select.innerHTML = opcoesCategoriaAchadoHTML();
})();

window.adicionarAchadoNaLista = function() {
    const campo = document.getElementById('qualidade-achado-descricao');
    const descricao = campo?.value.trim();
    if (!descricao) return alert('Descreva o achado antes de adicionar.');
    const categoria = document.getElementById('qualidade-achado-categoria')?.value || null;

    QUALIDADE_ACHADOS_LISTA.push({ descricao, categoria, fotos_base64: [...QUALIDADE_ACHADO_FOTOS_NOVAS] });
    campo.value = '';
    document.getElementById('qualidade-achado-categoria').value = '';
    window.removerFotoAchadoNovo();
    renderAchadosPendentesLista();
};

window.removerAchadoDaLista = function(indice) {
    QUALIDADE_ACHADOS_LISTA.splice(indice, 1);
    renderAchadosPendentesLista();
};

function renderAchadosPendentesLista() {
    const container = document.getElementById('qualidade-achados-pendentes-lista');
    if (!container) return;
    if (QUALIDADE_ACHADOS_LISTA.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = QUALIDADE_ACHADOS_LISTA.map((a, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--border);">
            ${a.fotos_base64 && a.fotos_base64[0] ? `<img src="${a.fotos_base64[0]}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;">` : `<div style="width:36px; height:36px; flex-shrink:0;"></div>`}
            <span style="flex:1; font-size:12px; color:var(--text-body);">${a.categoria ? `<span style="color:var(--brand); font-weight:700;">[${a.categoria}]</span> ` : ''}${a.descricao}${a.fotos_base64 && a.fotos_base64.length > 1 ? ` <span style="color:var(--text-muted);">(${a.fotos_base64.length} fotos)</span>` : ''}</span>
            <button type="button" onclick="window.removerAchadoDaLista(${i})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px;"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

window.renderAbaQualidade = function() {
    const select = document.getElementById("qualidade-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    window.carregarListaQualidade();
};

function renderPreviewFotosQualidade(etapa) {
    const lista = etapa === 'entrada' ? QUALIDADE_FOTOS_ENTRADA_BASE64 : QUALIDADE_FOTOS_SAIDA_BASE64;
    const container = document.getElementById(etapa === 'entrada' ? 'qualidade-fotos-entrada-preview' : 'qualidade-fotos-saida-preview');
    if (!container) return;

    if (lista.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = lista.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <button type="button" onclick="window.removerFotoQualidade('${etapa}', ${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:11px; line-height:1;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

window.processarFotoQualidade = async function(event, etapa) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;

    for (const arquivo of arquivos) {
        try {
            const base64 = await window.comprimirFotoParaBase64(arquivo);
            if (etapa === 'entrada') QUALIDADE_FOTOS_ENTRADA_BASE64.push(base64);
            else QUALIDADE_FOTOS_SAIDA_BASE64.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto de qualidade:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}). Pulei ela.`);
        }
    }

    renderPreviewFotosQualidade(etapa);
    event.target.value = '';
};

window.removerFotoQualidade = function(etapa, indice) {
    const lista = etapa === 'entrada' ? QUALIDADE_FOTOS_ENTRADA_BASE64 : QUALIDADE_FOTOS_SAIDA_BASE64;
    if (typeof indice === 'number') lista.splice(indice, 1);
    else lista.length = 0;
    renderPreviewFotosQualidade(etapa);
};

window.confirmarEntradaQualidade = async function() {
    if (!verificarAcesso()) return;

    const equipamentoId = document.getElementById("qualidade-equipamento")?.value;
    const observacao = document.getElementById("qualidade-obs-entrada")?.value.trim();

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (QUALIDADE_FOTOS_ENTRADA_BASE64.length === 0) return alert("Tire ou anexe pelo menos 1 foto de entrada.");

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const { resp, enfileirado } = await enviarComFilaOffline(`${apiBase}/api/qualidade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                observacao_entrada: observacao || null,
                fotos_entrada_base64: QUALIDADE_FOTOS_ENTRADA_BASE64,
                achados: QUALIDADE_ACHADOS_LISTA,
                operador
            })
        }, `Entrada de Qualidade em ${equipamentoId}`);

        if (enfileirado) {
            document.getElementById("qualidade-obs-entrada").value = "";
            window.removerFotoQualidade('entrada');
            QUALIDADE_ACHADOS_LISTA = [];
            renderAchadosPendentesLista();
            window.removerFotoAchadoNovo();
            alert(`📴 Sem internet agora — a entrada de [${equipamentoId}] foi guardada e será enviada sozinha assim que a conexão voltar.`);
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível registrar a entrada.");
            return;
        }

        document.getElementById("qualidade-obs-entrada").value = "";
        window.removerFotoQualidade('entrada');
        QUALIDADE_ACHADOS_LISTA = [];
        renderAchadosPendentesLista();
        window.removerFotoAchadoNovo();
        alert(`✅ Entrada registrada em [${equipamentoId}].`);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao registrar entrada de qualidade:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.filtrarQualidade = function(status, botaoClicado) {
    FILTRO_QUALIDADE_ATUAL = status;
    document.querySelectorAll('#qualidade-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaQualidade();
};

window.carregarListaQualidade = async function() {
    const container = document.getElementById("qualidade-lista-container");
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_QUALIDADE_ATUAL ? `?status=${encodeURIComponent(FILTRO_QUALIDADE_ATUAL)}` : '';
        // 🔧 CORREÇÃO: fetchComRetry tenta de novo sozinho antes de
        // desistir, e cai no cache salvo (com aviso visível de "dado
        // desatualizado") em falha real de rede — antes de mostrar de
        // vez a tela de erro genérica logo na primeira falha.
        const resp = await fetchComRetry(`${apiBase}/api/qualidade${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        QUALIDADE_CACHE = await resp.json();
        window.renderizarListaQualidade();

        // 🆕 KPIs sempre olham TUDO (sem o filtro de status ativo na
        // tela), senão "Concluído" zeraria ao filtrar só "Aguardando
        // Saída" por exemplo. Só busca de novo se o filtro atual não
        // já for "todas" (senão reaproveita o que acabou de vir).
        if (!FILTRO_QUALIDADE_ATUAL) {
            window.renderizarKpisQualidade(QUALIDADE_CACHE);
        } else {
            const respTudo = await fetchComRetry(`${apiBase}/api/qualidade`, { cache: 'no-store' });
            if (respTudo.ok) window.renderizarKpisQualidade(await respTudo.json());
        }

        window.carregarPadroesQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao carregar registros de qualidade:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

// 🆕 Padrões detectados — mesma categoria de achado em vários
// equipamentos diferentes num curto espaço de tempo (ver
// GET /api/qualidade/achados/padroes, verificar_padrao_achados no
// backend). Painel some sozinho quando não tem padrão ativo — não é
// pra virar "mais uma caixa vazia" na tela o tempo todo.
window.carregarPadroesQualidade = async function() {
    const container = document.getElementById('qualidade-padroes');
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/padroes`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar padrões');
        const padroes = await resp.json();

        if (!Array.isArray(padroes) || padroes.length === 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="glass-panel" style="padding:18px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.35);">
                <h3 style="color:var(--danger); font-size:0.95rem; margin:0 0 12px 0;">
                    <i class="fas fa-triangle-exclamation"></i> Padrão detectado — mesmo defeito em vários equipamentos
                </h3>
                ${padroes.map(p => `
                    <div style="padding:10px 0; border-top:1px solid rgba(239,68,68,0.2);">
                        <div style="font-weight:700; color:var(--text-heading);">${p.categoria} — ${p.total_equipamentos} equipamentos</div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                            ${(p.equipamentos || []).join(', ')}
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                            De ${p.primeira_ocorrencia} até ${p.ultima_ocorrencia}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Erro ao carregar padrões de achados de qualidade:', e);
        // Falha silenciosa — não é crítico o bastante pra travar a tela
        // de Qualidade inteira por causa disso; o painel só some.
        container.classList.add('hidden');
        container.innerHTML = '';
    }
};

// 🆕 Resumo/dashboard rápido da aba Qualidade — calculado em cima da
// lista já carregada (até o limite de 100 mais recentes do backend),
// sem gastar outra chamada além da que já busca "todas" quando
// necessário.
window.renderizarKpisQualidade = function(lista) {
    const container = document.getElementById('qualidade-kpis');
    if (!container) return;
    if (!Array.isArray(lista)) lista = [];

    const aguardando = lista.filter(r => r.status !== 'Concluído').length;
    const concluidos = lista.filter(r => r.status === 'Concluído').length;
    const achadosPendentes = lista.reduce((soma, r) => soma + (Number(r.achados_pendentes) || 0), 0);
    const achadosTotal = lista.reduce((soma, r) => soma + (Number(r.achados_total) || 0), 0);

    container.innerHTML = `
        <div class="kpi-card warning">
            <div class="kpi-icon glow-warning"><i class="fas fa-hourglass-half"></i></div>
            <div class="kpi-data"><h4>${aguardando}</h4><p>Aguardando Saída</p></div>
        </div>
        <div class="kpi-card success">
            <div class="kpi-icon glow-success"><i class="fas fa-check"></i></div>
            <div class="kpi-data"><h4>${concluidos}</h4><p>Concluídos</p></div>
        </div>
        <div class="kpi-card ${achadosPendentes > 0 ? 'danger' : ''}">
            <div class="kpi-icon ${achadosPendentes > 0 ? 'glow-danger' : ''}"><i class="fas fa-triangle-exclamation"></i></div>
            <div class="kpi-data"><h4>${achadosPendentes}</h4><p>Achados Pendentes</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon glow-brand"><i class="fas fa-list-check"></i></div>
            <div class="kpi-data"><h4>${achadosTotal}</h4><p>Achados no Total</p></div>
        </div>
    `;
};

// 🆕 Busca por equipamento — filtra o que já foi carregado (não faz
// nova chamada à API), funciona instantâneo enquanto digita.
window.buscarQualidade = function(texto) {
    BUSCA_QUALIDADE_ATUAL = (texto || '').trim().toLowerCase();
    window.renderizarListaQualidade();
};

window.renderizarListaQualidade = function() {
    const container = document.getElementById("qualidade-lista-container");
    if (!container) return;

    const lista = BUSCA_QUALIDADE_ATUAL
        ? QUALIDADE_CACHE.filter(r => (r.peca_id || '').toLowerCase().includes(BUSCA_QUALIDADE_ATUAL))
        : QUALIDADE_CACHE;

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum registro encontrado${BUSCA_QUALIDADE_ATUAL ? ' pra essa busca' : (FILTRO_QUALIDADE_ATUAL ? ' com esse filtro' : '')}.</div>`;
        return;
    }

    container.innerHTML = lista.map(r => {
        const concluido = r.status === 'Concluído';
        const corStatus = concluido ? 'var(--success)' : 'var(--warning)';
        const iconeStatus = concluido ? '✅' : '⏳';
        const fotoCapaEntrada = r.foto_entrada_capa;
        const fotoCapaSaida = r.foto_saida_capa;
        return `
        <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <div style="position:relative; cursor:pointer;" title="Fotos de Entrada" onclick="window.abrirGaleriaQualidade(${r.id}, 'entrada', '${r.peca_id}')">
                    ${fotoCapaEntrada ? `
                        <img src="${fotoCapaEntrada}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid var(--info);">
                        <span style="position:absolute; bottom:-6px; left:2px; background:var(--info); color:#04121c; font-size:9px; font-weight:800; padding:1px 5px; border-radius:8px;">ENTRADA</span>
                    ` : `<div style="width:64px; height:64px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; color:var(--text-muted);"><i class="fas fa-image" style="font-size:18px; opacity:0.4;"></i></div>`}
                </div>
                <div style="position:relative; cursor:${fotoCapaSaida ? 'pointer' : 'default'};" title="Fotos de Saída" ${fotoCapaSaida ? `onclick="window.abrirGaleriaQualidade(${r.id}, 'saida', '${r.peca_id}')"` : ''}>
                    ${fotoCapaSaida ? `
                        <img src="${fotoCapaSaida}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid var(--brand);">
                        <span style="position:absolute; bottom:-6px; left:2px; background:var(--brand); color:var(--text-on-primary); font-size:9px; font-weight:800; padding:1px 5px; border-radius:8px;">SAÍDA</span>
                    ` : `<div style="width:64px; height:64px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; color:var(--text-muted); border:1px dashed var(--border);"><i class="fas fa-hourglass-half" style="font-size:16px; opacity:0.4;"></i></div>`}
                </div>
            </div>
            <div style="flex:1; min-width:180px;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${r.peca_id}</span>
                    <span class="status-text-pill" style="--sev-color:${corStatus};">${iconeStatus} ${r.status}</span>
                </div>
                ${r.observacao_entrada ? `<div style="font-size:12px; color:var(--text-body); margin-bottom:2px;"><strong style="color:var(--info);">Entrada:</strong> ${r.observacao_entrada}</div>` : ''}
                ${r.observacao_saida ? `<div style="font-size:12px; color:var(--text-body); margin-bottom:2px;"><strong style="color:var(--brand);">Saída:</strong> ${r.observacao_saida}</div>` : ''}
                ${Number(r.achados_total) > 0 ? `
                    <div style="margin:6px 0;">
                        <button type="button" onclick="window.abrirModalAchadosQualidade(${r.id}, '${r.peca_id}', ${!concluido})" style="background:${Number(r.achados_pendentes) > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}; color:${Number(r.achados_pendentes) > 0 ? 'var(--danger)' : 'var(--success)'}; border:1px solid currentColor; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="fas fa-triangle-exclamation"></i> ${r.achados_pendentes > 0 ? `${r.achados_pendentes} de ${r.achados_total} pendente(s)` : `${r.achados_total} achado(s) resolvido(s)`}
                        </button>
                    </div>
                ` : ''}
                <div style="font-size:11px; color:var(--text-accent);">
                    Entrada: ${r.criado_por || 'Sistema'} · ${r.criado_em || ''}
                    ${concluido && r.concluido_por ? `<br>Saída: ${r.concluido_por} · ${r.concluido_em || ''}` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${!concluido ? `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.abrirModalAchadosQualidade(${r.id}, '${r.peca_id}', true)"><i class="fas fa-plus"></i> Achado</button>` : ''}
                ${!concluido ? `<button class="btn-premium btn-success" style="padding:4px 10px; font-size:11px;" onclick="window.abrirModalSaidaQualidade(${r.id}, '${r.peca_id}')"><i class="fas fa-right-from-bracket"></i> Registrar Saída</button>` : ''}
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirQualidade(${r.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// Galeria de fotos (entrada OU saída) de UM registro de qualidade —
// reaproveita o mesmo padrão da galeria de OS.
window.abrirGaleriaQualidade = async function(registroId, etapa, pecaId) {
    let overlay = document.getElementById('lightbox-galeria-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10090';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="galeria-qualidade-titulo"><i class="fas fa-magnifying-glass"></i> Qualidade</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-qualidade-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    const rotulo = etapa === 'entrada' ? 'Entrada' : 'Saída';
    document.getElementById('galeria-qualidade-titulo').innerHTML = `<i class="fas fa-magnifying-glass"></i> ${pecaId} — Fotos de ${rotulo}`;
    const corpo = document.getElementById('galeria-qualidade-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando fotos...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/fotos?etapa=${etapa}`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <div style="position:relative;">
                <img src="${f.foto_base64}"
                     style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                     onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${pecaId} — ${rotulo} ${i + 1}')">
            </div>
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos de qualidade:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

// Modal de Registro de Saída — abre um formulário simples (fotos +
// observação) pro registro que já está "Aguardando Saída".
window.abrirModalSaidaQualidade = function(registroId, pecaId) {
    if (!verificarAcesso()) return;
    QUALIDADE_FOTOS_SAIDA_BASE64 = [];

    let overlay = document.getElementById('modal-saida-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-saida-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10095';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:480px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="modal-saida-qualidade-titulo"><i class="fas fa-right-from-bracket"></i> Registrar Saída</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('modal-saida-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="input-group" style="margin-bottom:14px;">
                        <label>Observação da Saída (o que foi feito, estado final...)</label>
                        <textarea id="qualidade-obs-saida" class="premium-textarea" rows="2" placeholder="Ex: Rolo #3 trocado, testado e liberado..."></textarea>
                    </div>
                    <div class="input-group" style="margin-bottom:16px;">
                        <label>Fotos de Saída <span style="color:var(--danger);">*</span></label>
                        <input type="file" id="qualidade-foto-saida-input" accept="image/*" multiple style="display:none;" onchange="window.processarFotoQualidade(event, 'saida')">
                        <button type="button" class="btn-premium" onclick="document.getElementById('qualidade-foto-saida-input').click()">
                            <i class="fas fa-camera"></i> Tirar Foto / Anexar
                        </button>
                        <div id="qualidade-fotos-saida-preview" class="hidden" style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;"></div>
                    </div>
                    <button class="btn-premium" id="btn-abrir-checklist-qualidade" style="width:100%; margin-bottom:10px;">
                        <i class="fas fa-clipboard-check"></i> Preencher Checklist de Saída
                    </button>
                    <button class="btn-premium btn-success w-100" id="btn-confirmar-saida-qualidade">
                        <i class="fas fa-check"></i> Confirmar Saída
                    </button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('modal-saida-qualidade-titulo').innerHTML = `<i class="fas fa-right-from-bracket"></i> Registrar Saída — ${pecaId}`;
    document.getElementById('qualidade-obs-saida').value = '';
    renderPreviewFotosQualidade('saida');
    document.getElementById('btn-confirmar-saida-qualidade').onclick = () => window.confirmarSaidaQualidade(registroId);
    document.getElementById('btn-abrir-checklist-qualidade').onclick = () => window.abrirChecklistQualidadeSaida(registroId, pecaId);
    overlay.classList.remove('hidden');
};

window.confirmarSaidaQualidade = async function(registroId) {
    if (!verificarAcesso()) return;
    const observacao = document.getElementById("qualidade-obs-saida")?.value.trim();

    if (QUALIDADE_FOTOS_SAIDA_BASE64.length === 0) return alert("Tire ou anexe pelo menos 1 foto de saída.");

    const registro = QUALIDADE_CACHE.find(r => r.id === registroId);
    if (registro && Number(registro.achados_pendentes) > 0) {
        if (!confirm(`⚠️ Ainda tem ${registro.achados_pendentes} achado(s) pendente(s) nesse equipamento. Registrar a saída mesmo assim?`)) return;
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/saida`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                observacao_saida: observacao || null,
                fotos_saida_base64: QUALIDADE_FOTOS_SAIDA_BASE64,
                operador
            })
        });

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível registrar a saída.");
            return;
        }

        document.getElementById('modal-saida-qualidade-overlay').classList.add('hidden');
        window.removerFotoQualidade('saida');
        alert('✅ Saída registrada com sucesso.');
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao registrar saída de qualidade:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// Modal de Achados — lista os problemas encontrados pela Qualidade num
// registro específico. Se "podeEditar" for true (registro ainda
// "Aguardando Saída"), permite adicionar novo achado e marcar/desmarcar
// como resolvido. Se já estiver "Concluído", fica só como consulta.
let QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = []; // 🆕 fotos (pode ter mais de 1) do achado sendo adicionado no modal

window.abrirModalAchadosQualidade = async function(registroId, pecaId, podeEditar) {
    QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = [];

    let overlay = document.getElementById('modal-achados-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-achados-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10096';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="modal-achados-qualidade-titulo"><i class="fas fa-triangle-exclamation"></i> Achados</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('modal-achados-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="modal-achados-qualidade-form" style="margin-bottom:14px;"></div>
                    <div id="modal-achados-qualidade-lista"></div>
                </div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('modal-achados-qualidade-titulo').innerHTML = `<i class="fas fa-triangle-exclamation"></i> Achados — ${pecaId}`;

    const formContainer = document.getElementById('modal-achados-qualidade-form');
    formContainer.innerHTML = podeEditar ? `
        <div class="glass-panel" style="padding:12px; background:rgba(167,139,250,0.05); border:1px solid rgba(167,139,250,0.2);">
            <div class="form-grid-4" style="margin-bottom:8px;">
                <div class="input-group" style="grid-column: span 3;">
                    <textarea id="modal-achado-nova-descricao" class="premium-textarea" rows="1" placeholder="Descreva o novo achado..."></textarea>
                </div>
                <div class="input-group">
                    <input type="file" id="modal-achado-nova-foto-input" accept="image/*" multiple style="display:none;" onchange="window.processarFotoAchadoModal(event)">
                    <button type="button" class="btn-premium w-100 btn-icon-only" onclick="document.getElementById('modal-achado-nova-foto-input').click()"><i class="fas fa-camera"></i></button>
                </div>
            </div>
            <select id="modal-achado-categoria" class="premium-input" style="margin-bottom:8px; width:100%;">${opcoesCategoriaAchadoHTML()}</select>
            <div id="modal-achado-nova-foto-preview" class="hidden" style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;"></div>
            <button type="button" class="btn-premium" style="font-size:12px; padding:6px 14px;" onclick="window.salvarNovoAchadoModal(${registroId}, '${pecaId}')">
                <i class="fas fa-plus"></i> Adicionar
            </button>
        </div>
    ` : '';

    const corpo = document.getElementById('modal-achados-qualidade-lista');
    corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Carregando...</div>`;
    overlay.classList.remove('hidden');

    await window.recarregarAchadosModal(registroId, pecaId, podeEditar);
};

window.processarFotoAchadoModal = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;
    for (const arquivo of arquivos) {
        try {
            const base64 = await window.comprimirFotoParaBase64(arquivo);
            QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}).`);
        }
    }
    const preview = document.getElementById('modal-achado-nova-foto-preview');
    if (preview) {
        if (QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.length === 0) {
            preview.classList.add('hidden'); preview.innerHTML = '';
        } else {
            preview.classList.remove('hidden');
            preview.innerHTML = QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.map((foto, i) => `
                <div style="position:relative; display:inline-block;">
                    <img src="${foto}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                    <button type="button" onclick="QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.splice(${i},1); document.getElementById('modal-achado-nova-foto-input').dispatchEvent(new Event('change'))" style="display:none;"></button>
                </div>
            `).join('');
        }
    }
    event.target.value = '';
};

window.salvarNovoAchadoModal = async function(registroId, pecaId) {
    if (!verificarAcesso()) return;
    const descricao = document.getElementById('modal-achado-nova-descricao')?.value.trim();
    if (!descricao) return alert('Descreva o achado.');
    const categoria = document.getElementById('modal-achado-categoria')?.value || null;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registro_id: registroId, descricao, categoria, fotos_base64: QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS, operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível adicionar o achado.');
            return;
        }
        document.getElementById('modal-achado-nova-descricao').value = '';
        document.getElementById('modal-achado-categoria').value = '';
        QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = [];
        const preview = document.getElementById('modal-achado-nova-foto-preview');
        if (preview) { preview.classList.add('hidden'); preview.innerHTML = ''; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao adicionar achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Editar a descrição de um achado já criado.
window.editarAchadoQualidade = async function(achadoId, registroId, pecaId, descricaoAtual) {
    if (!verificarAcesso()) return;
    const novaDescricao = prompt('Editar descrição do achado:', descricaoAtual || '');
    if (novaDescricao === null) return; // cancelou
    if (!novaDescricao.trim()) return alert('A descrição não pode ficar vazia.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/editar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId, descricao: novaDescricao.trim(), operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível editar o achado.');
            return;
        }
        await window.recarregarAchadosModal(registroId, pecaId, true);
    } catch (e) {
        console.error('⚠️ Erro ao editar achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Excluir achado COM desfazer — a exclusão de verdade só acontece
// depois de alguns segundos, dando tempo de cancelar caso tenha
// apertado sem querer (ver mostrarToastDesfazer, definido junto com o
// resto das funções utilitárias de Qualidade).
window.excluirAchadoQualidade = function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;

    // Some da tela na hora (otimista) — se a pessoa desfizer, a linha
    // volta a aparecer.
    const el = document.getElementById(`achado-linha-${achadoId}`);
    if (el) el.style.display = 'none';

    mostrarToastDesfazer('Achado excluído.', async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/qualidade/achados/excluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: achadoId, operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema' })
            });
            await window.carregarListaQualidade();
        } catch (e) {
            console.error('⚠️ Erro ao excluir achado:', e);
        }
    }, () => window.recarregarAchadosModal(registroId, pecaId, true));
};

window.recarregarAchadosModal = async function(registroId, pecaId, podeEditar) {
    const corpo = document.getElementById('modal-achados-qualidade-lista');
    if (!corpo) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/achados`, { cache: 'no-store' });
        const achados = resp.ok ? await resp.json() : [];

        if (!Array.isArray(achados) || achados.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Nenhum achado registrado ainda.</div>`;
            return;
        }

        corpo.innerHTML = achados.map(a => {
            const resolvido = a.status === 'Resolvido';
            const totalFotos = Number(a.total_fotos) || 0;
            const descricaoEscapada = (a.descricao || '').replace(/'/g, "\\'");
            return `
            <div id="achado-linha-${a.id}" style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
                ${a.foto_capa ? `
                    <div style="position:relative; flex-shrink:0; cursor:pointer;" onclick="window.abrirGaleriaAchadoQualidade(${a.id}, '${pecaId}')">
                        <img src="${a.foto_capa}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                        ${totalFotos > 1 ? `<span style="position:absolute; bottom:-4px; right:-4px; background:rgba(0,0,0,0.75); color:#fff; font-size:9px; padding:1px 5px; border-radius:8px;"><i class="fas fa-images"></i> ${totalFotos}</span>` : ''}
                    </div>
                ` : `<div style="width:50px; height:50px; flex-shrink:0;"></div>`}
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; color:var(--text-body); ${resolvido ? 'text-decoration:line-through; opacity:0.6;' : ''}">${a.descricao}</div>
                    <div style="font-size:10px; color:var(--text-accent);">
                        ${a.criado_por || 'Sistema'} · ${a.criado_em || ''}
                        ${resolvido ? `<br>✅ Resolvido por ${a.resolvido_por || ''} · ${a.resolvido_em || ''}` : ''}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0; align-items:flex-end;">
                    ${podeEditar ? `
                        <button type="button" onclick="window.${resolvido ? 'reabrirAchadoQualidade' : 'resolverAchadoQualidade'}(${a.id}, ${registroId}, '${pecaId}')" style="padding:4px 8px; font-size:10px; border-radius:6px; border:1px solid currentColor; background:${resolvido ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)'}; color:${resolvido ? 'var(--warning)' : 'var(--success)'}; cursor:pointer;">
                            ${resolvido ? '<i class="fas fa-rotate-left"></i> Reabrir' : '<i class="fas fa-check"></i> Resolver'}
                        </button>
                        <div style="display:flex; gap:4px;">
                            <button type="button" title="Editar" onclick="window.editarAchadoQualidade(${a.id}, ${registroId}, '${pecaId}', '${descricaoEscapada}')" style="padding:3px 7px; font-size:10px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--text-muted); cursor:pointer;"><i class="fas fa-pen"></i></button>
                            <button type="button" title="Excluir" onclick="window.excluirAchadoQualidade(${a.id}, ${registroId}, '${pecaId}')" style="padding:3px 7px; font-size:10px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--danger); cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </div>
                    ` : `<span style="font-size:10px; font-weight:700; color:${resolvido ? 'var(--success)' : 'var(--warning)'};">${resolvido ? '✅' : '⏳'}</span>`}
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error('⚠️ Erro ao carregar achados:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Não foi possível carregar.</div>`;
    }
};

// Galeria de fotos de UM achado (quando tem mais de 1) — reaproveita o
// mesmo padrão da galeria de OS/entrada-saída.
window.abrirGaleriaAchadoQualidade = async function(achadoId, pecaId) {
    let overlay = document.getElementById('lightbox-galeria-achado-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-achado-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10097';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:480px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-triangle-exclamation"></i> Fotos do achado</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-achado-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-achado-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    const corpo = document.getElementById('galeria-achado-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/${achadoId}/fotos`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <img src="${f.foto_base64}"
                 style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                 onclick="window.abrirFotoAmpliada('${f.foto_base64}', 'Achado — ${pecaId} ${i + 1}')">
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos do achado:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

window.resolverAchadoQualidade = async function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/resolver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId, foto_base64: null, operador })
        });
        if (!resp.ok) { alert('Não foi possível marcar como resolvido.'); return; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao resolver achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.reabrirAchadoQualidade = async function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/reabrir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId })
        });
        if (!resp.ok) { alert('Não foi possível reabrir o achado.'); return; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao reabrir achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.excluirQualidade = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir este registro de qualidade?')) return;

    // 🆕 Desfazer exclusão: some da lista na hora (sem recarregar do
    // servidor, que ainda tem o registro) e só chama a API de verdade
    // depois de alguns segundos — dá tempo de desfazer se apertou errado.
    QUALIDADE_CACHE = QUALIDADE_CACHE.filter(r => r.id !== id);
    window.renderizarListaQualidade();

    mostrarToastDesfazer('Registro de Qualidade excluído.', async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/qualidade/excluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema' })
            });
        } catch (e) {
            console.error('⚠️ Erro ao excluir registro de qualidade:', e);
        }
    }, () => window.carregarListaQualidade());
};

