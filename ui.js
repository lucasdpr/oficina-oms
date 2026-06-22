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

    let f = BANCO_ATIVOS.filter(a => (a.local || "").includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
    
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

        let btnAcao = (a.local || "").includes("Veio")
            ? `<button class="btn-outline-danger" onclick="window.iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="window.abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;
        
        let btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="window.excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                <td class="font-code text-muted">${a.local || "Não Alocado"}</td>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias || 0}</td>
                <td class="editavel font-code" onclick="window.fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton || 0).toLocaleString()}</td>
                <td class="font-code text-muted">${(a.meta || 0).toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pctFixed}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist} ${btnExcluir}</div></td>
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
        repBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
    } else {
        repBody.innerHTML = reparos.map(a => {
            const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
            const pctFixed = pct.toFixed(1);
            const btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="window.excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>`;
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
                            ${btnExcluir}
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }
}

// ==============================================================
// 4. RENDERIZAÇÃO DE RESERVAS - VERSÃO CORRIGIDA E TESTADA
// ==============================================================
export function renderReservas() {
    console.log("🔄 renderReservas() iniciado...");
    
    const resBody = document.getElementById("estoque-table-body");
    if (!resBody) {
        console.error("❌ Elemento #estoque-table-body não encontrado!");
        return;
    }

    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva" || a.status === "Oficina / Reserva");
    console.log(`📦 Total de reservas: ${reservas.length}`);

    if (reservas.length === 0) {
        resBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Estoque vazio. Nenhuma peça reserva disponível.</td></tr>`;
        return;
    }

    let htmlFinal = "";

    reservas.forEach((a) => {
        const isZerado = (a.ton || 0) === 0 ? `✅ Zerado` : `🔄 Parcial (${a.ton}t)`;
        const mcc = a.mcc_compat || "2/3";
        const familia = a.tipo || "";
        const familiaUpper = familia.toUpperCase();
        const mccCompat = a.mcc_compat || "";
        
        // CONSTRÓI AS OPÇÕES DE VEIOS
        let optionsVeios = `<option value="">Selecione...</option>`;
        
        if (mcc === "2/3") {
            optionsVeios += `
                <option value="C">Veio C (MCC 2)</option>
                <option value="D">Veio D (MCC 2)</option>
                <option value="E">Veio E (MCC 3)</option>
                <option value="F">Veio F (MCC 3)</option>
            `;
        } else if (mcc === "4") {
            optionsVeios += `
                <option value="H">Veio H (MCC 4)</option>
                <option value="G">Veio G (MCC 4)</option>
            `;
        }

        // ==========================================
        // POSIÇÃO - SEMPRE UM INPUT
        // ==========================================
        let posicaoHTML = "";
        const isBow = familiaUpper.includes("BOW");
        const isHorizontal = familiaUpper.includes("HORIZONTAL");
        const isCadeiraSup = familiaUpper.includes("CADEIRA SUPERIOR");
        const isCadeiraInf = familiaUpper.includes("CADEIRA INFERIOR");
        const isSegmento = familiaUpper.includes("SEGMENTO") || familiaUpper.includes("SEGUIMENTO");
        
        let placeholder = "Pos";
        let min = 1;
        let max = 99;
        
        if (isBow && mccCompat === "4") {
            placeholder = "1-5";
            min = 1;
            max = 5;
        } else if (isHorizontal && mccCompat === "4") {
            placeholder = "8-17";
            min = 8;
            max = 17;
        } else if ((isCadeiraSup || isCadeiraInf) && mccCompat === "2/3") {
            placeholder = "43-79";
            min = 43;
            max = 79;
        } else if (isSegmento && mccCompat === "2/3") {
            placeholder = "1-6";
            min = 1;
            max = 6;
        }
        
        // SEMPRE CRIA UM INPUT
        posicaoHTML = `
            <input type="number" id="pos-${a.id}" placeholder="${placeholder}" 
                   style="width:55px; padding:4px 6px; font-size:14px; border-radius:4px; border:3px solid #10b981; background:#0f172a; color:#ffffff; text-align:center;"
                   min="${min}" max="${max}" step="1">
        `;

        // BOTÃO DE EXCLUIR
        const btnExcluir = `
            <button onclick="window.excluirEquipamento('${a.id}')" style="padding:3px 8px; font-size:11px; background:transparent; border:1px solid #ef4444; color:#ef4444; border-radius:3px; cursor:pointer;" title="Excluir">
                🗑️
            </button>
        `;

        htmlFinal += `
            <tr>
                <td style="font-family: monospace; font-weight:600; font-size:0.85rem; padding:6px 8px; color:#e0e0e0;">${a.id}</td>
                <td style="padding:6px 8px;"><span style="background:rgba(56,189,248,0.15); padding:2px 10px; border-radius:4px; font-size:0.7rem; color:#38bdf8;">${a.tipo} (MCC ${a.mcc_compat})</span></td>
                <td style="padding:6px 8px;"><span style="padding:2px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.25);">${isZerado}</span></td>
                <td style="padding:6px 8px;">
                    <select id="swap-veio-${a.id}" style="width:120px; padding:4px 6px; font-size:12px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#e0e0e0;">
                        ${optionsVeios}
                    </select>
                </td>
                <td style="padding:6px 8px; text-align:center;">${posicaoHTML}</td>
                <td style="padding:6px 8px;">
                    <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center;">
                        <button onclick="window.efetuarSwapDireto('${a.id}')" style="padding:4px 12px; font-size:0.7rem; background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#10b981; border-radius:4px; cursor:pointer;">
                            🔄 Swap
                        </button>
                        <button onclick="window.abrirHistoricoIndividual('${a.id}')" style="padding:4px 8px; font-size:0.7rem; background:transparent; border:1px solid #38bdf8; color:#38bdf8; border-radius:4px; cursor:pointer;" title="Prontuário">
                            📖
                        </button>
                        ${btnExcluir}
                    </div>
                </td>
            </tr>
        `;
    });

    resBody.innerHTML = htmlFinal;
    console.log("✅ renderReservas() executado. Total de reservas:", reservas.length);
}

// ==============================================================
// 5. SWAP DIRETO (INTELIGENTE E BLINDADO)
// ==============================================================
function efetuarSwapDireto(tagNova) {
    if (typeof BANCO_ATIVOS === 'undefined') {
        alert("Erro: Banco de dados não carregado.");
        return;
    }

    console.log("🔍 Iniciando SWAP para peça:", tagNova);

    // 1. Busca os dados informados na tela
    const indexNovo = BANCO_ATIVOS.findIndex(a => a.id === tagNova);
    if (indexNovo === -1) {
        alert("Erro: Peça não encontrada no estoque.");
        return;
    }
    
    const itemNovo = BANCO_ATIVOS[indexNovo];
    console.log("📦 Peça nova:", itemNovo.id, "Tipo:", itemNovo.tipo);
    
    // 2. Captura o VEIO de destino
    const veioEl = document.getElementById(`swap-veio-${tagNova}`);
    const veioDestino = veioEl ? veioEl.value : "";
    
    if (!veioDestino) {
        alert("Por favor, selecione o Veio de destino.");
        return;
    }
    console.log("🎯 Veio destino:", veioDestino);

    // 3. Captura a POSIÇÃO de destino
    const posEl = document.getElementById(`pos-${tagNova}`);
    let posicaoDigitada = "";
    
    if (posEl) {
        if (posEl.tagName === "INPUT") {
            posicaoDigitada = posEl.value.trim();
            console.log("📋 INPUT value:", posicaoDigitada);
        } else if (posEl.tagName === "SELECT") {
            posicaoDigitada = posEl.value || "";
            console.log("📋 SELECT value:", posicaoDigitada);
        } else {
            posicaoDigitada = posEl.textContent.trim();
            console.log("📋 TEXT value:", posicaoDigitada);
        }
    }
    
    // Se ainda estiver vazio, tenta buscar pelo id com fallback
    if (!posicaoDigitada) {
        const row = posEl ? posEl.closest('tr') : null;
        if (row) {
            const inputs = row.querySelectorAll('input[type="number"]');
            inputs.forEach(inp => {
                if (inp.id && inp.id.includes('pos-')) {
                    posicaoDigitada = inp.value.trim();
                }
            });
        }
    }
    
    if (!posicaoDigitada || posicaoDigitada === "") {
        alert("⚠️ Digite a Posição de destino no campo (ex: 1, 2, 3...).");
        return;
    }
    console.log("📍 Posição final:", posicaoDigitada);

    // 4. Converte a posição para o formato do chassi (SLOT)
    const tipoUpper = (itemNovo.tipo || "").toUpperCase();
    let slotChassi = "";

    if (tipoUpper.includes("BOW")) {
        slotChassi = `BOW-${posicaoDigitada}`;
    } else if (tipoUpper.includes("HORIZONTAL")) {
        slotChassi = `HOR-${posicaoDigitada}`;
    } else if (tipoUpper.includes("STRAIGHTENER R1") || tipoUpper.includes("R1")) {
        slotChassi = "STR-1";
    } else if (tipoUpper.includes("STRAIGHTENER R2") || tipoUpper.includes("R2")) {
        slotChassi = "STR-2";
    } else if (tipoUpper.includes("MOLDE")) {
        slotChassi = "MOLDE";
    } else if (tipoUpper.includes("BENDER")) {
        slotChassi = "BENDER";
    } else if (tipoUpper.includes("CADEIRA SUPERIOR")) {
        slotChassi = `CAD-SUP-${posicaoDigitada}`;
    } else if (tipoUpper.includes("CADEIRA INFERIOR")) {
        slotChassi = `CAD-INF-${posicaoDigitada}`;
    } else if (tipoUpper.includes("SEGMENTO ZERO") || tipoUpper.includes("SEGUIMENTO ZERO")) {
        slotChassi = "SEG-ZERO";
    } else if (tipoUpper.includes("MESA OSCILADORA")) {
        slotChassi = "OSCILADORA";
    } else if (tipoUpper.includes("SEGMENTO") || tipoUpper.includes("SEG-")) {
        slotChassi = `SEG-${posicaoDigitada}`;
    } else {
        slotChassi = posicaoDigitada;
    }
    console.log("🏷️ Slot Chassi:", slotChassi);

    // 5. Confirmar a Ação
    if (!confirm(`Confirmar instalação da peça [${itemNovo.id}] na gaveta [${slotChassi}] do Veio ${veioDestino}?`)) {
        return;
    }

    // ==========================================
    // 6. O CAÇADOR - Varre a máquina e expulsa a peça velha
    // ==========================================
    
    let pecaExpulsa = false;
    let pecaExpulsaId = "";

    console.log("🔎 Procurando peça antiga na gaveta", slotChassi, "do Veio", veioDestino);

    let config = null;
    if (typeof window.getConfiguracaoPorVeio === 'function') {
        config = window.getConfiguracaoPorVeio(veioDestino);
    }

    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        const p = BANCO_ATIVOS[i];
        
        const taNoVeio = (p.veio === veioDestino && p.status === "Instalado") || 
                       (p.local && p.local.includes(`Veio ${veioDestino}`) && !p.local.includes("Oficina"));
        
        if (!taNoVeio || p.id === tagNova) continue;
        
        let ehVelha = false;
        
        if (p.posicaoFixa && p.posicaoFixa === slotChassi) {
            ehVelha = true;
        } else if (!p.posicaoFixa && config && config.mapearSlotLegado) {
            const slotMapeado = config.mapearSlotLegado(p);
            if (slotMapeado === slotChassi) {
                ehVelha = true;
            }
        }

        if (ehVelha) {
            console.log(`💥 EXPULSANDO peça velha: ${p.id}`);
            
            BANCO_ATIVOS[i].status = "Oficina / Reparo";
            BANCO_ATIVOS[i].local = "Oficina / Reparo";
            BANCO_ATIVOS[i].veio = "";
            BANCO_ATIVOS[i].posicaoFixa = "";
            BANCO_ATIVOS[i].pos = "";
            
            pecaExpulsa = true;
            pecaExpulsaId = p.id;
            
            if (window.registrarHistorico) {
                window.registrarHistorico(p.id, `Sacado automaticamente da gaveta ${slotChassi} (Veio ${veioDestino}) via SWAP.`);
            }
            
            alert(`⚠️ ATENÇÃO (SWAP):\nA peça velha [${pecaExpulsaId}] foi expulsa da máquina e enviada para REPARO.`);
            break;
        }
    }

    if (!pecaExpulsa) {
        console.log("ℹ️ Nenhuma peça encontrada na gaveta", slotChassi, "- instalação direta.");
    }

    // ==========================================
    // 7. INSTALA A NOVA PEÇA
    // ==========================================
    
    console.log(`📥 Instalando peça ${itemNovo.id} na gaveta ${slotChassi} do Veio ${veioDestino}`);
    
    const mcc = itemNovo.mcc_compat || "4";
    BANCO_ATIVOS[indexNovo].local = `MCC ${mcc} - Veio ${veioDestino}`;
    BANCO_ATIVOS[indexNovo].veio = veioDestino;
    BANCO_ATIVOS[indexNovo].posicaoFixa = slotChassi;
    BANCO_ATIVOS[indexNovo].pos = slotChassi;
    BANCO_ATIVOS[indexNovo].status = "Instalado";

    if (window.registrarHistorico) {
        window.registrarHistorico(itemNovo.id, `Instalada no Veio ${veioDestino} (${slotChassi}) via Estoque.`);
    }

    // ==========================================
    // 8. SALVAR E RENDERIZAR
    // ==========================================
    
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    console.log("💾 Dados salvos no LocalStorage");
    
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
    
    if (typeof window.mudarVeioVisualizado === 'function') {
        window.mudarVeioVisualizado(veioDestino);
    }
    
    console.log("✅ SWAP concluído com sucesso!");
    alert(`✅ Sucesso! A peça [${itemNovo.id}] assumiu a gaveta ${slotChassi} do Veio ${veioDestino}.`);
}

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
// 9. EXCLUIR EQUIPAMENTO
// ==============================================================
function excluirEquipamento(id) {
    if (typeof window.verificarAcesso === 'function') {
        if (!window.verificarAcesso()) {
            return;
        }
    }
    
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        alert("Equipamento não encontrado.");
        return;
    }
    
    if (!confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja EXCLUIR permanentemente o equipamento [${id}]?\n\nTipo: ${item.tipo}\nLocal: ${item.local || "Não alocado"}\n\nEsta ação NÃO pode ser desfeita!`)) {
        return;
    }
    
    // Remove do array
    const index = BANCO_ATIVOS.findIndex(a => a.id === id);
    if (index !== -1) {
        BANCO_ATIVOS.splice(index, 1);
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        
        if (window.registrarHistorico) {
            window.registrarHistorico(id, `🚨 Equipamento [${id}] foi EXCLUÍDO permanentemente do sistema.`);
        }
        
        // Atualiza a interface
        if (typeof renderAtivos === 'function') renderAtivos();
        if (typeof renderReparos === 'function') renderReparos();
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof renderPainelVeios === 'function') renderPainelVeios();
        if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
        
        alert(`✅ Equipamento [${id}] foi excluído com sucesso!`);
    }
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
window.efetuarSwapDireto = efetuarSwapDireto;
window.excluirEquipamento = excluirEquipamento;

// Alias para compatibilidade com código antigo
window.iniciarSwapAlocacao = efetuarSwapDireto;

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
    renderizarGraficosMCC,
    efetuarSwapDireto,
    excluirEquipamento
};