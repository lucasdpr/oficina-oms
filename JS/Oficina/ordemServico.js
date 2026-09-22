// ==========================================================================
// REGISTRO DE OS (Ordem de Serviço) — extraído de script.js na modularização
// ==========================================================================
// A OS real da CSN vem em várias páginas (cabeçalho, EPIs/ferramentas/
// operações, confirmação), então o registro aceita várias fotos por OS,
// uma por página. comprimirFotoParaBase64() mora aqui (é onde essa
// técnica de compressão nasceu) e é reaproveitada por Qualidade e
// Chats via window.comprimirFotoParaBase64.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { executarSeguro, enviarComFilaOffline, fetchComRetry } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ==========================================
// 🆕 REGISTRO DE OS (Ordem de Serviço) — a OS real da CSN vem em várias
// páginas (cabeçalho, EPIs/ferramentas/operações, confirmação — ver
// exemplo real com 3 páginas), então o registro aceita VÁRIAS fotos por
// OS, uma por página. Cada foto passa pela mesma técnica de compressão
// que a antiga aba de Ocorrência usava (removida — ver comentário perto
// de onde ela vivia, mais acima neste arquivo).
// ==========================================
let FOTOS_OS_BASE64 = []; // array de fotos (páginas) da OS sendo cadastrada
let FILTRO_OS_ATUAL = '';
let BUSCA_OS_ATUAL = '';
let OS_CACHE = [];

function renderPreviewFotosOs() {
    const container = document.getElementById('os-fotos-preview-container');
    if (!container) return;

    if (FOTOS_OS_BASE64.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = FOTOS_OS_BASE64.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <span style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:1px 5px; border-radius:4px;">Pág. ${i + 1}</span>
            <button type="button" onclick="window.removerFotoOs(${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:11px; line-height:1;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Comprime UM arquivo de imagem e devolve o data URL via Promise —
// extraído pra poder ser usado em loop (várias fotos escolhidas de
// uma vez, ex: múltiplas páginas selecionadas juntas na galeria).
function comprimirFotoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        if (!arquivo.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const MAX_LADO = 1280;
                let largura = img.width;
                let altura = img.height;

                if (largura > altura && largura > MAX_LADO) {
                    altura = Math.round((altura * MAX_LADO) / largura);
                    largura = MAX_LADO;
                } else if (altura > MAX_LADO) {
                    largura = Math.round((largura * MAX_LADO) / altura);
                    altura = MAX_LADO;
                }

                const canvas = document.createElement('canvas');
                canvas.width = largura;
                canvas.height = altura;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, largura, altura);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject(new Error('Não consegui ler a imagem.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
        reader.readAsDataURL(arquivo);
    });
}

window.comprimirFotoParaBase64 = comprimirFotoParaBase64;

window.processarFotoOs = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;

    for (const arquivo of arquivos) {
        try {
            const base64 = await comprimirFotoParaBase64(arquivo);
            FOTOS_OS_BASE64.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto da OS:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}). Pulei ela.`);
        }
    }

    renderPreviewFotosOs();
    event.target.value = '';
};

window.removerFotoOs = function(indice) {
    if (typeof indice === 'number') {
        FOTOS_OS_BASE64.splice(indice, 1);
    } else {
        FOTOS_OS_BASE64 = [];
    }
    renderPreviewFotosOs();
};

// 🆕 Status por MCC (card "Sistema Online" do Painel Geral) — deriva de
// GET /api/maquinas/status: enquanto houver uma OS "Em Andamento" com
// aquela máquina marcada, ela aparece como "Manutenção".
window.atualizarStatusMaquinas = async function() {
    const idPorMaquina = { 'MCC 2': 'status-maquina-mcc2', 'MCC 3': 'status-maquina-mcc3', 'MCC 4': 'status-maquina-mcc4' };
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/maquinas/status`, { cache: 'no-store' });
        if (!resp.ok) return;
        const lista = await resp.json();
        (lista || []).forEach(item => {
            const el = document.getElementById(idPorMaquina[item.maquina]);
            if (!el) return;
            el.textContent = item.status;
            el.classList.toggle('status-manutencao', item.status === 'Manutenção');
        });
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status das máquinas:', e);
    }
};

// 🆕 Checkboxes de área da OS (mesmo padrão de "Programar Atividade em
// Massa") — uma OS pode envolver várias áreas ao mesmo tempo, e cada
// uma marcada faz a OS aparecer no quadro de trabalho DAQUELA área
// (ver renderizarAtividadesArea).
window.popularCheckboxAreasOs = function() {
    const areasOficina = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : []).filter(a => a.tipo === 'oficina');
    const lista = document.getElementById('os-lista-areas');
    if (!lista) return;
    lista.innerHTML = areasOficina.map(a => `
        <label style="display:flex; align-items:center; gap:8px; padding:6px 2px; cursor:pointer;">
            <input type="checkbox" class="os-area-checkbox" value="${a.chave}">
            <span>${a.nome}</span>
        </label>
    `).join('');
    const todasEl = document.getElementById('os-todas-areas');
    if (todasEl) todasEl.checked = false;
};

window.alternarTodasAreasOs = function(marcado) {
    document.querySelectorAll('.os-area-checkbox').forEach(cb => { cb.checked = marcado; });
};

window.confirmarOrdemServico = async function() {
    if (!verificarAcesso()) return;

    const numero = document.getElementById('os-numero')?.value.trim();
    const descricao = document.getElementById('os-descricao')?.value.trim();
    const areas = Array.from(document.querySelectorAll('.os-area-checkbox:checked')).map(cb => cb.value);
    const maquina = document.getElementById('os-maquina')?.value || null;

    // 🔧 CORREÇÃO (pedido do usuário: "tire o opcional de tudo pq todos
    // os campos são obrigatório") — antes só a foto era exigida.
    if (!numero) return alert('Informe o número da OS.');
    if (!maquina) return alert('Selecione a máquina afetada.');
    if (!descricao) return alert('Informe a descrição.');
    if (areas.length === 0) return alert('Selecione pelo menos uma área envolvida.');
    if (FOTOS_OS_BASE64.length === 0) return alert('Tire ou anexe pelo menos 1 foto da OS antes de registrar.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const { resp, enfileirado } = await enviarComFilaOffline(`${apiBase}/api/ordens_servico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numero_os: numero || null,
                descricao: descricao || null,
                fotos_base64: FOTOS_OS_BASE64,
                operador,
                areas,
                maquina
            })
        }, `OS ${numero || '(sem número)'}`);

        if (enfileirado) {
            document.getElementById('os-numero').value = '';
            document.getElementById('os-descricao').value = '';
            window.removerFotoOs();
            window.popularCheckboxAreasOs();
            alert('📴 Sem internet agora — a OS foi guardada e será enviada sozinha assim que a conexão voltar.');
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível registrar a OS.');
            return;
        }

        document.getElementById('os-numero').value = '';
        document.getElementById('os-descricao').value = '';
        window.removerFotoOs();
        window.popularCheckboxAreasOs();
        alert('✅ OS registrada com sucesso.');
        await window.carregarListaOrdensServico();
        executarSeguro(() => window.atualizarStatusMaquinas(), 'atualizarStatusMaquinas');
    } catch (e) {
        console.error('⚠️ Erro ao registrar OS:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.filtrarOrdensServico = function(status, botaoClicado) {
    FILTRO_OS_ATUAL = status;
    document.querySelectorAll('#os-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaOrdensServico();
};

window.carregarListaOrdensServico = async function() {
    const container = document.getElementById('os-lista-container');
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_OS_ATUAL ? `?status=${encodeURIComponent(FILTRO_OS_ATUAL)}` : '';
        // 🔧 CORREÇÃO: fetchComRetry tenta de novo sozinho e cai no cache
        // salvo (com aviso de "dado desatualizado") em falha real de
        // rede, em vez de ir direto pra tela de erro na primeira falha.
        const resp = await fetchComRetry(`${apiBase}/api/ordens_servico${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        OS_CACHE = await resp.json();
        window.renderizarListaOrdensServico();

        // 🆕 Badges do hero (referência de estilo do usuário) — só
        // atualiza com contagem confiável quando não há filtro de status
        // ativo (OS_CACHE já vem filtrado do servidor pelo status
        // escolhido; com filtro ativo, o total deixaria de bater).
        if (!FILTRO_OS_ATUAL && Array.isArray(OS_CACHE)) {
            const badgeTotal = document.getElementById('os-badge-total');
            if (badgeTotal) badgeTotal.textContent = OS_CACHE.length;
            const badgeAndamento = document.getElementById('os-badge-andamento');
            if (badgeAndamento) badgeAndamento.textContent = OS_CACHE.filter(os => os.status === 'Em Andamento').length;
            const badgeConcluido = document.getElementById('os-badge-concluido');
            if (badgeConcluido) badgeConcluido.textContent = OS_CACHE.filter(os => os.status === 'Concluído').length;
        }
    } catch (e) {
        console.error('⚠️ Erro ao carregar OS:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

// 🆕 Busca por número/descrição — filtra o que já foi carregado (não
// faz nova chamada à API), funciona instantâneo enquanto digita.
window.buscarOrdensServico = function(texto) {
    BUSCA_OS_ATUAL = (texto || '').trim().toLowerCase();
    window.renderizarListaOrdensServico();
};

window.renderizarListaOrdensServico = function() {
    const container = document.getElementById('os-lista-container');
    if (!container) return;

    const lista = BUSCA_OS_ATUAL
        ? OS_CACHE.filter(os =>
            (os.numero_os || '').toLowerCase().includes(BUSCA_OS_ATUAL) ||
            (os.descricao || '').toLowerCase().includes(BUSCA_OS_ATUAL))
        : OS_CACHE;

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhuma OS encontrada${BUSCA_OS_ATUAL ? ' pra essa busca' : (FILTRO_OS_ATUAL ? ' com esse filtro' : ' ainda')}.</div>`;
        return;
    }

    container.innerHTML = lista.map(os => {
        const concluida = os.status === 'Concluído';
        const naoExecutada = os.status === 'Não Executada';
        let corStatus = 'var(--warning)';
        let iconeStatus = '🔧';
        if (concluida) { corStatus = 'var(--success)'; iconeStatus = '✅'; }
        else if (naoExecutada) { corStatus = 'var(--danger)'; iconeStatus = '🚫'; }
        const totalFotos = os.total_fotos || 0;
        return `
        <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
            ${os.foto_capa ? `
                <div style="position:relative; flex-shrink:0; cursor:pointer;" onclick="window.abrirGaleriaOs(${os.id}, '${window.escapeAtributoNotif(os.numero_os ? `OS ${os.numero_os}` : `OS #${os.id}`)}')">
                    <img src="${os.foto_capa}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                    ${totalFotos > 1 ? `<span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:1px 6px; border-radius:10px;"><i class="fas fa-images"></i> ${totalFotos}</span>` : ''}
                </div>
            ` : `
                <div style="width:70px; height:70px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-muted);">
                    <i class="fas fa-file-invoice" style="font-size:20px; opacity:0.4;"></i>
                </div>
            `}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${os.numero_os ? `OS ${window.escapeHtmlNotif(os.numero_os)}` : `#${os.id}`}</span>
                    <span class="status-text-pill" style="--sev-color:${corStatus};">${iconeStatus} ${os.status}</span>
                </div>
                ${os.descricao ? `<div style="font-size:13px; color:var(--text-body); margin-bottom:4px;">${window.escapeHtmlNotif(os.descricao)}</div>` : ''}
                ${naoExecutada && os.motivo_nao_executada ? `
                    <div style="font-size:12px; color:var(--danger); background:rgba(239,68,68,0.08); border-left:3px solid var(--danger); padding:5px 8px; border-radius:4px; margin-bottom:4px;">
                        <strong>Motivo:</strong> ${window.escapeHtmlNotif(os.motivo_nao_executada)}
                    </div>
                ` : ''}
                <div style="font-size:11px; color:var(--text-accent);">
                    ${window.escapeHtmlNotif(os.criado_por || 'Sistema')} · ${os.criado_em || ''}${(os.areas && os.areas.length) ? ` · ${os.areas.map(window.nomeAreaOficina).join(', ')}` : (os.area ? ` · ${window.nomeAreaOficina(os.area)}` : '')}
                    ${concluida && os.concluido_por ? `<br>Concluída por ${window.escapeHtmlNotif(os.concluido_por)} · ${os.concluido_em || ''}` : ''}
                    ${naoExecutada && os.encerrado_por ? `<br>Encerrada por ${window.escapeHtmlNotif(os.encerrado_por)} · ${os.encerrado_em || ''}` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${!concluida ? `<button class="btn-premium btn-success" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusOrdemServico(${os.id}, 'Concluído')">Concluir</button>` : ''}
                ${!naoExecutada ? `<button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.marcarOsNaoExecutada(${os.id})">Não Executada</button>` : ''}
                ${(concluida || naoExecutada) ? `<button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusOrdemServico(${os.id}, 'Em Andamento')">Reabrir</button>` : ''}
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirOrdemServico(${os.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// --------------------------------------------------------------
// Galeria de páginas de UMA OS — busca todas as fotos dela na hora do
// clique (a lista principal só traz a foto de capa, pra não pesar) e
// mostra num mini-visualizador com miniaturas; clicar numa miniatura
// abre ela ampliada (reaproveita window.abrirFotoAmpliada).
// --------------------------------------------------------------
window.abrirGaleriaOs = async function(osId, titulo) {
    let overlay = document.getElementById('lightbox-galeria-os-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-os-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10090';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="galeria-os-titulo"><i class="fas fa-file-invoice"></i> OS</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-os-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-os-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('galeria-os-titulo').innerHTML = `<i class="fas fa-file-invoice"></i> ${titulo}`;
    const corpo = document.getElementById('galeria-os-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando páginas...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/${osId}/fotos`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <div style="position:relative;">
                <img src="${f.foto_base64}"
                     style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                     onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${titulo.replace(/'/g, "\\'")} — Página ${i + 1}')">
                <span style="position:absolute; bottom:4px; left:4px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:1px 6px; border-radius:10px;">Pág. ${i + 1}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as páginas da OS:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

window.mudarStatusOrdemServico = async function(id, novoStatus, motivo) {
    if (!verificarAcesso()) return;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus, operador, motivo: motivo || null })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível atualizar o status da OS.');
            return;
        }
        await window.carregarListaOrdensServico();
        executarSeguro(() => window.atualizarStatusMaquinas(), 'atualizarStatusMaquinas');
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status da OS:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 "Não Executada" (bate com o campo do papel da OS real) — pede o
// motivo/justificativa ANTES de marcar, porque o backend exige esse
// campo preenchido pra esse status.
window.marcarOsNaoExecutada = function(id) {
    if (!verificarAcesso()) return;
    const motivo = prompt('Motivo / Justificativa da OS não ter sido executada:');
    if (motivo === null) return; // cancelou
    if (!motivo.trim()) return alert('É preciso informar o motivo.');
    window.mudarStatusOrdemServico(id, 'Não Executada', motivo.trim());
};


window.excluirOrdemServico = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir esta OS registrada? Essa ação não pode ser desfeita.')) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema' })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir a OS.');
            return;
        }
        await window.carregarListaOrdensServico();
        executarSeguro(() => window.atualizarStatusMaquinas(), 'atualizarStatusMaquinas');
    } catch (e) {
        console.error('⚠️ Erro ao excluir OS:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};


