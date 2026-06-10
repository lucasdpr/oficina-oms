// ui.js - O Arquivo responsável por "Desenhar" na tela (A Visão)

import { BANCO_ATIVOS, BANCO_ROLOS, BANCO_MATERIAIS, VEIO_SELECIONADO_PAINEL } from './banco.js';

export function renderPainelVeios() {
    const container = document.getElementById("container-fluxo-horizontal-scroll");
    const titulo = document.getElementById("titulo-veio-focado");
    if (!container || !titulo) return;

    titulo.innerHTML = `Sequenciamento Dinâmico: <span style="color:var(--text-accent)">Veio ${VEIO_SELECIONADO_PAINEL}</span>`;

    let ativos = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`));
    ativos.sort((a, b) => a.ordem - b.ordem);

    if (ativos.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum componente instalado no Veio ${VEIO_SELECIONADO_PAINEL}.</div>`;
        return;
    }

    container.innerHTML = ativos.map(gerarCardGraficoHTML).join("");
}

export function gerarCardGraficoHTML(a) {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let cor = pct >= 80 ? "var(--danger)" : (pct >= 50 ? "var(--warning)" : "var(--success)");

    return `
        <div class="mcc-grafico-card premium-shadow" style="border-top: 3px solid ${cor};">
            <div class="mcc-grafico-header">
                <div class="mcc-grafico-info">
                    <span class="mcc-tag-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="mcc-grafico-porcentagem" style="color:${cor};">${pct}%</div>
            </div>
            <div class="mcc-grafico-pos text-muted">${a.pos}</div>
            <div class="ind-gauge-bar premium-bar">
                <div class="ind-gauge-fill" style="width:${Math.min(pct, 100)}%; background:${cor};"></div>
            </div>
            <div class="grafico-legenda" style="margin-bottom: 10px;">
                <span>Ton: <strong>${Math.round(a.ton).toLocaleString()}</strong></span>
                <span>Lim: ${a.meta.toLocaleString()}</span>
            </div>
            <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(56,189,248,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="abrirHistoricoIndividual('${a.id}')">
                <i class="fas fa-book-open"></i> Ver Prontuário
            </button>
        </div>`;
}

export function renderAtivos() {
    const tbody = document.getElementById("ativos-table-body");
    const filtroEl = document.getElementById("filtro-tipo-ativo");
    if (!tbody || !filtroEl) return;

    let f = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
    
    if (filtroEl.value === "Oficina / Reparo") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    } else if (filtroEl.value === "Oficina / Reserva") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
    } else if (filtroEl.value !== "TODOS") {
        f = f.filter(a => a.tipo === filtroEl.value);
    }

    f.sort((a, b) => a.ordem - b.ordem);

    tbody.innerHTML = f.map(a => {
        const pct = ((a.ton / a.meta) * 100).toFixed(1);
        let classe = pct >= 80 ? "reparo" : "operação";
        if (a.local === "Oficina / Reserva") {
            classe = "reserva";
        } else if (a.local === "Oficina / Reparo") {
            classe = "reparo";
        }

        let btnAcao = a.local.includes("Veio")
            ? `<button class="btn-outline-danger" onclick="iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;

        return `
            <tr>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat})</span></span></td>
                <td class="font-code text-muted">${a.local}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton).toLocaleString()}</td>
                <td class="font-code text-muted">${a.meta.toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pct}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist}</div></td>
            </tr>`;
    }).join("");
}

export function renderReparos() {
    const repBody = document.getElementById("reparos-table-body");
    if (!repBody) return;

    const reparos = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");

    if (reparos.length === 0) {
        repBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
    } else {
        repBody.innerHTML = reparos.map(a => {
            const pct = ((a.ton / a.meta) * 100).toFixed(1);
            return `
                <tr>
                    <td class="font-code">${a.id}</td>
                    <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat})</span></span></td>
                    <td>
                        <div class="flex-align-center gap-10">
                            <span class="font-code bold w-40" style="color: var(--text-heading);">${pct}%</span>
                            <div class="ind-gauge-bar premium-bar w-100px">
                                <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="flex-align-center gap-10 action-buttons-mobile">
                            <button class="btn-premium btn-warning" onclick="abrirModalConcluirReparo('${a.id}')"><i class="fas fa-hammer"></i> Concluir</button>
                            <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }
}

export function renderReservas() {
    const resBody = document.getElementById("estoque-table-body");
    if (!resBody) return;

    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");

    if (reservas.length === 0) {
        resBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Estoque vazio. Nenhuma peça reserva disponível.</td></tr>`;
    } else {
        resBody.innerHTML = reservas.map(a => {
            const isZerado = a.ton === 0 ? `<i class="fas fa-check"></i> Zerado` : `<i class="fas fa-adjust"></i> Parcial (${a.ton}t)`;

            let optionsVeios = "";
            if (a.mcc_compat === "2/3") {
                optionsVeios = `
                    <option value="MCC 2 - Veio C">Veio C (MCC 2)</option>
                    <option value="MCC 2 - Veio D">Veio D (MCC 2)</option>
                    <option value="MCC 3 - Veio E">Veio E (MCC 3)</option>
                    <option value="MCC 3 - Veio F">Veio F (MCC 3)</option>
                `;
            } else if (a.mcc_compat === "4") {
                optionsVeios = `
                    <option value="MCC 4 - Veio H">Veio H (MCC 4)</option>
                    <option value="MCC 4 - Veio G">Veio G (MCC 4)</option>
                `;
            }

            return `
                <tr>
                    <td class="font-code">${a.id}</td>
                    <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat})</span></span></td>
                    <td><span class="status-pill reserva">${isZerado}</span></td>
                    <td>
                        <div class="flex-align-center gap-10 action-buttons-mobile">
                            <select id="alocar-veio-${a.id}" class="premium-select select-sm">
                                ${optionsVeios}
                            </select>
                            <button class="btn-premium btn-success" onclick="iniciarSwapAlocacao('${a.id}')"><i class="fas fa-exchange-alt"></i> Swap</button>
                            <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }
}

export function renderRolos() {
    const tbody = document.getElementById("rolos-table-body");
    if (!tbody) return;

    let htmlFinal = "";
    const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

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
                            <button class="btn-premium btn-success" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', 1)"><i class="fas fa-plus"></i></button>
                            <button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', -1)"><i class="fas fa-minus"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
    
    tbody.innerHTML = htmlFinal;
}

export function renderMateriais() {
    const tbody = document.getElementById("materiais-table-body");
    const busca = document.getElementById("busca-material") ? document.getElementById("busca-material").value.toLowerCase() : "";
    if (!tbody) return;

    let filtrados = BANCO_MATERIAIS;
    
    if (busca) {
        filtrados = BANCO_MATERIAIS.filter(m => 
            m.codigo.toLowerCase().includes(busca) || 
            m.descricao.toLowerCase().includes(busca)
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
                        <button class="btn-premium btn-success" style="padding:4px 10px;" onclick="ajustarSaldoMaterial('${m.codigo}', 1)" title="Adicionar"><i class="fas fa-plus"></i></button>
                        <button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="ajustarSaldoMaterial('${m.codigo}', -1)" title="Baixar"><i class="fas fa-minus"></i></button>
                        <button class="btn-outline-danger" style="padding:4px 10px;" onclick="removerMaterial('${m.codigo}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}