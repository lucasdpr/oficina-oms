// ui.js - O Arquivo responsável por "Desenhar" na tela (A Visão)

import { BANCO_ATIVOS, BANCO_ROLOS, BANCO_MATERIAIS, VEIO_SELECIONADO_PAINEL } from './banco.js';

// Função auxiliar local para ordem padrão
function getOrdemPadrao(tipo) {
    if (tipo === "Molde") return 10;
    if (tipo === "Mesa Osciladora") return 20;
    if (tipo === "Seguimento Zero") return 30;
    if (tipo === "Bender") return 40;
    if (tipo === "Cadeira Superior") return 100;
    if (tipo === "Cadeira Inferior") return 200;
    if (tipo === "Bow") return 300;
    if (tipo === "Straightener") return 400;
    if (tipo === "Horizontal") return 500;
    return 999;
}

// ==============================================================
// 1. RENDERIZAÇÃO DO PAINEL DE VEIOS (CHASSI)
// ==============================================================
export function renderPainelVeios() {
    const container = document.getElementById("container-fluxo-horizontal-scroll");
    const titulo = document.getElementById("titulo-veio-focado");
    if (!container || !titulo) return;

    titulo.innerHTML = `Sequenciamento Dinâmico: <span style="color:var(--text-accent)">Veio ${VEIO_SELECIONADO_PAINEL}</span>`;

    let ativos = BANCO_ATIVOS.filter(a => a.local && a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`));
    ativos.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    if (ativos.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum componente instalado no Veio ${VEIO_SELECIONADO_PAINEL}.</div>`;
        return;
    }

    container.innerHTML = ativos.map(gerarCardGraficoHTML).join("");
}

export function gerarCardGraficoHTML(a) {
    const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
    const pctFixed = pct.toFixed(1);
    let cor = pct >= 80 ? "var(--danger)" : (pct >= 50 ? "var(--warning)" : "var(--success)");

    return `
        <div class="mcc-grafico-card premium-shadow" style="border-top: 3px solid ${cor};">
            <div class="mcc-grafico-header">
                <div class="mcc-grafico-info">
                    <span class="mcc-tag-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="mcc-grafico-porcentagem" style="color:${cor};">${pctFixed}%</div>
            </div>
            <div class="mcc-grafico-pos text-muted">${a.pos || a.posicao || "Única"}</div>
            <div class="ind-gauge-bar premium-bar">
                <div class="ind-gauge-fill" style="width:${Math.min(pct, 100)}%; background:${cor};"></div>
            </div>
            <div class="grafico-legenda" style="margin-bottom: 10px;">
                <span>Ton: <strong>${Math.round(a.ton || 0).toLocaleString()}</strong></span>
                <span>Lim: ${(a.meta || 0).toLocaleString()}</span>
            </div>
            <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(56,189,248,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="window.abrirHistoricoIndividual('${a.id}')">
                <i class="fas fa-book-open"></i> Ver Prontuário
            </button>
        </div>`;
}

// ==============================================================
// 2. RENDERIZAÇÃO DE ATIVOS (TABELA PRINCIPAL)
// ==============================================================
export function renderAtivos() {
    const tbody = document.getElementById("ativos-table-body");
    const filtroEl = document.getElementById("filtro-tipo-ativo");
    if (!tbody || !filtroEl) return;

    let f = BANCO_ATIVOS.filter(a => {
        const local = a.local || "";
        return local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina");
    });
    
    if (filtroEl.value === "Oficina / Reparo") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    } else if (filtroEl.value === "Oficina / Reserva") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
    } else if (filtroEl.value !== "TODOS") {
        f = f.filter(a => a.tipo === filtroEl.value);
    }

    f.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    tbody.innerHTML = f.map(a => {
        const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
        const pctFixed = pct.toFixed(1);
        let classe = pct >= 80 ? "reparo" : "operação";
        if (a.local === "Oficina / Reserva") {
            classe = "reserva";
        } else if (a.local === "Oficina / Reparo") {
            classe = "reparo";
        }

        const isInstalado = a.local && a.local.includes("Veio");
        let btnAcao = isInstalado
            ? `<button class="btn-outline-danger" onclick="window.iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="window.abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;

        let posFormatada = a.posicao || a.pos || "-";

        return `
            <tr>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                <td class="font-code text-muted">${a.local || "Não Alocado"} <span style="color:var(--text-accent)">[${posFormatada}]</span></td>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias || 0}</td>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton || 0).toLocaleString()}</td>
                <td class="font-code text-muted">${(a.meta || 0).toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pctFixed}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist}</div></td>
            </tr>`;
    }).join("");
}

// ==============================================================
// 3. RENDERIZAÇÃO DE REPAROS
// ==============================================================
export function renderReparos() {
    const repBody = document.getElementById("reparos-table-body");
    if (!repBody) return;

    const reparos = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");

    if (reparos.length === 0) {
        repBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
    } else {
        repBody.innerHTML = reparos.map(a => {
            const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
            const pctFixed = pct.toFixed(1);
            return `
                <tr>
                    <td class="font-code">${a.id}</td>
                    <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                    <td>
                        <div class="flex-align-center gap-10">
                            <span class="font-code bold w-40" style="color: var(--text-heading);">${pctFixed}%</span>
                            <div class="ind-gauge-bar premium-bar w-100px">
                                <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="flex-align-center gap-10 action-buttons-mobile">
                            <button class="btn-premium btn-warning" onclick="window.abrirModalConcluirReparo('${a.id}')"><i class="fas fa-hammer"></i> Concluir</button>
                            <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="window.abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }
}

// ==============================================================
// 4. RENDERIZAÇÃO DE RESERVAS (COM SWAP INTELIGENTE)
// ==============================================================
export function renderReservas() {
    const tbody = document.getElementById('estoque-table-body');
    if (!tbody) return;
    
    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
    
    if (reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Estoque vazio. Nenhuma peça reserva disponível.</td></tr>`;
        return;
    }

    tbody.innerHTML = reservas.map(ativo => {
        const tUpper = ativo.tipo ? ativo.tipo.toUpperCase() : "";
        const mcc = ativo.mcc_compat || "2/3";

        // Monta a caixinha de Veios
        let optionsVeio = '<option value="">Selecione o Veio...</option>';
        if (mcc.includes("2") || mcc.includes("3")) {
            optionsVeio += `<option value="MCC 2 - Veio C">Veio C (MCC 2)</option>
                           <option value="MCC 2 - Veio D">Veio D (MCC 2)</option>
                           <option value="MCC 3 - Veio E">Veio E (MCC 3)</option>
                           <option value="MCC 3 - Veio F">Veio F (MCC 3)</option>`;
        }
        if (mcc.includes("4")) {
            optionsVeio += `<option value="MCC 4 - Veio G">Veio G (MCC 4)</option>
                           <option value="MCC 4 - Veio H">Veio H (MCC 4)</option>`;
        }

        // Monta a caixinha de Posição
        let inputPosicao = '';
        if (tUpper.includes("CADEIRA")) {
            inputPosicao = `<input type="text" id="pos-${ativo.id}" class="premium-select" placeholder="Nº (Ex:70)" style="width: 85px; padding: 5px;">`;
        } 
        else if (tUpper.includes("BOW")) {
            let opts = '<option value="">Pos...</option>';
            for(let i=1; i<=5; i++) opts += `<option value="Posição ${i}">Pos ${i}</option>`;
            inputPosicao = `<select id="pos-${ativo.id}" class="premium-select" style="width: 85px; padding: 5px;">${opts}</select>`;
        } 
        else if (tUpper.includes("HORIZONTAL")) {
            let opts = '<option value="">Pos...</option>';
            for(let i=8; i<=17; i++) opts += `<option value="Posição ${i}">Pos ${i}</option>`;
            inputPosicao = `<select id="pos-${ativo.id}" class="premium-select" style="width: 85px; padding: 5px;">${opts}</select>`;
        } 
        else if (tUpper.includes("SEGMENTO") || tUpper.includes("SEGUIMENTO") || tUpper.includes("ZERO")) {
            let opts = '<option value="">Pos...</option>';
            for(let i=1; i<=6; i++) opts += `<option value="Posição ${i}">Pos ${i}</option>`;
            inputPosicao = `<select id="pos-${ativo.id}" class="premium-select" style="width: 85px; padding: 5px;">${opts}</select>`;
        } 
        else {
            inputPosicao = `<input type="hidden" id="pos-${ativo.id}" value="Única"><span class="text-muted" style="font-size:12px;">Única</span>`;
        }

        return `
            <tr>
                <td class="font-code" style="font-weight: bold;">${ativo.id}</td>
                <td><span class="ind-card-tag bg-tag">${ativo.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${mcc})</span></span></td>
                <td><span class="status-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 4px 10px; border-radius: 4px;"><i class="fas fa-check"></i> Pronto</span></td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <select id="veio-${ativo.id}" class="premium-select" style="width: 140px; padding: 5px;">
                            ${optionsVeio}
                        </select>
                        ${inputPosicao}
                        <button class="btn-premium btn-success" style="padding: 5px 12px; display:flex; align-items:center; gap:5px;" onclick="window.efetuarSwapDireto('${ativo.id}')">
                            <i class="fas fa-exchange-alt"></i> Swap
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// ==============================================================
// 5. SWAP DIRETO (INTELIGENTE)
// ==============================================================
window.efetuarSwapDireto = function(tagNova) {
    try {
        const itemNovo = BANCO_ATIVOS.find(a => a.id === tagNova);
        if (!itemNovo) {
            alert("Erro: Peça não encontrada.");
            return;
        }

        const veioEl = document.getElementById(`veio-${tagNova}`);
        const veio = veioEl ? veioEl.value : "";
        
        const posEl = document.getElementById(`pos-${tagNova}`);
        let posicao = posEl ? posEl.value.trim() : "";
        
        if (!veio) {
            alert("Por favor, selecione o Veio de destino.");
            return;
        }
        if (!posicao) {
            alert("Por favor, informe a Posição de destino.");
            return;
        }

        const tUpper = itemNovo.tipo ? itemNovo.tipo.toUpperCase() : "";
        if (tUpper.includes("CADEIRA") && posicao && !posicao.includes("Nº")) {
            posicao = `Nº ${posicao}`;
        }

        const pecaAntiga = BANCO_ATIVOS.find(a => 
            a.local === veio && 
            (a.posicao === posicao || a.pos === posicao) && 
            a.id !== itemNovo.id
        );

        let msg = `Instalar ${itemNovo.tipo} (${itemNovo.id}) no ${veio} na ${posicao}?\n\n`;
        if (pecaAntiga) {
            msg += `⚠️ ATENÇÃO (SWAP): A peça atual (${pecaAntiga.id}) será RETIRADA da máquina e enviada para a Oficina!`;
        }

        if (!confirm(msg)) return;

        if (pecaAntiga) {
            pecaAntiga.local = "Oficina / Reparo";
            pecaAntiga.posicao = "";
            pecaAntiga.pos = "";
            if (window.registrarHistorico) {
                window.registrarHistorico(pecaAntiga.id, `Retirada automática (SWAP) do ${veio} (${posicao}). Movida para Reparo.`);
            }
        }

        itemNovo.local = veio;
        itemNovo.posicao = posicao;
        itemNovo.pos = posicao;
        if (window.registrarHistorico) {
            window.registrarHistorico(itemNovo.id, `Instalada no ${veio} (${posicao}).`);
        }

        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        
        renderAtivos();
        renderReservas();
        renderReparos();
        renderPainelVeios();
        if (window.calcularKpisGlobais) window.calcularKpisGlobais();
        
        alert("✅ Swap realizado com sucesso!");
        
    } catch (error) {
        console.error("Erro no Swap:", error);
        alert("Erro ao realizar Swap: " + error.message);
    }
};

// ==============================================================
// 6. RENDERIZAÇÃO DE ROLOS
// ==============================================================
export function renderRolos() {
    const tbody = document.getElementById("rolos-table-body");
    if (!tbody) return;

    const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

    let htmlFinal = "";
    equipamentosDiferentes.forEach(equipamento => {
        htmlFinal += `
            <tr style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--text-accent);">
                <td colspan="5" style="padding: 12px 16px; color: var(--text-accent); font-weight: 700; text-transform: uppercase; font-size: 14px;">
                    <i class="fas fa-layer-group"></i> Equipamento: ${equipamento}
                </td>
            </tr>
        `;
        
        const rolosDesteEquipamento = BANCO_ROLOS.filter(r => r.conjunto === equipamento);
        
        rolosDesteEquipamento.forEach(r => {
            htmlFinal += `
                <tr>
                    <td class="font-code" style="color:var(--text-heading); padding-left: 25px;"><strong>${r.nome}</strong></td>
                    <td><span class="ind-card-tag bg-tag">${r.conjunto}</span></td>
                    <td><code>MCC ${r.mcc_compat}</code></td>
                    <td><span class="font-code bold" id="saldo-rolo-${r.id}" style="font-size:16px; color:var(--text-accent); margin-right:15px;">${r.qtd} Pçs</span></td>
                    <td>
                        <div style="display:inline-flex; gap:5px;">
                            <button class="btn-premium btn-success" style="padding:4px 10px;" onclick="window.alterarSaldoRolo('${r.id}', 1)"><i class="fas fa-plus"></i></button>
                            <button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="window.alterarSaldoRolo('${r.id}', -1)"><i class="fas fa-minus"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
    
    tbody.innerHTML = htmlFinal;
}

// ==============================================================
// 7. RENDERIZAÇÃO DE MATERIAIS
// ==============================================================
export function renderMateriais() {
    const tbody = document.getElementById("materiais-table-body");
    const busca = document.getElementById("busca-material");
    if (!tbody) return;

    const buscaText = busca ? busca.value.toLowerCase() : "";
    let filtrados = BANCO_MATERIAIS;
    
    if (buscaText) {
        filtrados = BANCO_MATERIAIS.filter(m => 
            m.codigo.toLowerCase().includes(buscaText) || 
            m.descricao.toLowerCase().includes(buscaText)
        );
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum material encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(m => {
        let statusHtml = "";
        if (m.qtd > 10) {
            statusHtml = `<span class="status-pill operação" style="color: var(--success); border-color: var(--success);"><i class="fas fa-check-circle"></i> Normal</span>`;
        } else if (m.qtd > 0) {
            statusHtml = `<span class="status-pill reserva" style="color: var(--warning); border-color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Baixo</span>`;
        } else {
            statusHtml = `<span class="status-pill reparo" style="color: var(--danger); border-color: var(--danger);"><i class="fas fa-times-circle"></i> Zerado</span>`;
        }
        
        return `
            <tr>
                <td class="font-code" style="color: var(--text-heading); font-size: 15px;">${m.codigo}</td>
                <td style="color: var(--text-main); font-weight: 500; font-size: 13px; max-width: 350px; overflow: hidden; text-overflow: ellipsis;">${m.descricao}</td>
                <td><span class="font-code bold" style="font-size:16px; color: #a855f7;">${m.qtd.toLocaleString()} UN</span></td>
                <td>${statusHtml}</td>
                <td>
                    <div style="display:inline-flex; gap:5px;">
                        <button class="btn-premium btn-success" style="padding:4px 10px;" onclick="window.ajustarSaldoMaterial('${m.codigo}', 1)" title="Adicionar"><i class="fas fa-plus"></i></button>
                        <button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="window.ajustarSaldoMaterial('${m.codigo}', -1)" title="Baixar"><i class="fas fa-minus"></i></button>
                        <button class="btn-outline-danger" style="padding:4px 10px;" onclick="window.removerMaterial('${m.codigo}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// ==============================================================
// 8. FUNÇÕES DE FILTRO E GRÁFICOS
// ==============================================================
export function aplicarFiltrosMCC(mccNumero, btnElement) {
    const grupo = btnElement.parentElement;
    grupo.querySelectorAll('.btn-filter-mcc').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    renderizarGraficosMCC(mccNumero);
}

export function renderizarGraficosMCC(mccNumero) {
    const container = document.getElementById(`graficos-mcc${mccNumero}`);
    if (!container) return;

    const divFiltroVeio = document.getElementById(`filtros-veio-mcc${mccNumero}`);
    const veioAtivo = divFiltroVeio ? divFiltroVeio.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    const divFiltroStatus = document.getElementById(`filtros-status-mcc${mccNumero}`);
    const statusAtivo = divFiltroStatus ? divFiltroStatus.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    let filtrados = BANCO_ATIVOS.filter(a => a.local && a.local.includes(`MCC ${mccNumero}`));

    if (veioAtivo && veioAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => a.local && a.local.includes(`Veio ${veioAtivo}`));
    }

    if (statusAtivo && statusAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            if (statusAtivo === 'VERMELHO') return pct >= 80;
            if (statusAtivo === 'AMARELO') return pct >= 50 && pct < 80;
            if (statusAtivo === 'VERDE') return pct < 50;
            return true;
        });
    }

    filtrados.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum equipamento encontrado com a combinação de filtros.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(gerarCardGraficoHTML).join("");
}

// ==============================================================
// EXPOSIÇÃO GLOBAL - FUNÇÕES DISPONÍVEIS NO WINDOW
// ==============================================================
window.renderPainelVeios = renderPainelVeios;
window.gerarCardGraficoHTML = gerarCardGraficoHTML;
window.renderAtivos = renderAtivos;
window.renderReparos = renderReparos;
window.renderReservas = renderReservas;
window.renderRolos = renderRolos;
window.renderMateriais = renderMateriais;
window.aplicarFiltrosMCC = aplicarFiltrosMCC;
window.renderizarGraficosMCC = renderizarGraficosMCC;
window.efetuarSwapDireto = window.efetuarSwapDireto;

// Exporta para módulos
export default {
    renderPainelVeios,
    gerarCardGraficoHTML,
    renderAtivos,
    renderReparos,
    renderReservas,
    renderRolos,
    renderMateriais,
    aplicarFiltrosMCC,
    renderizarGraficosMCC
};