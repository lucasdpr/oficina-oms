// ui.js - Versão harmonizada + reexportações para compatibilidade com folhões

import { BANCO_ATIVOS, BANCO_ROLOS, BANCO_MATERIAIS, VEIO_SELECIONADO_PAINEL } from './banco.js';

// ==============================================================
// FUNÇÃO AUXILIAR PARA CALCULAR DIAS EM REPARO
// ==============================================================
function calcularDias(item) {
    if (item.local === "Oficina / Reparo" && item.dataReparo) {
        const agora = Date.now();
        const diffMs = agora - item.dataReparo;
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDias;
    }
    return item.dias || 0;
}

// ==============================================================
// RENDER RESERVAS (com selects de posição e swap)
// ==============================================================
function renderReservas() {
    console.log("🔄 renderReservas() executando...");
    
    const resBody = document.getElementById("estoque-table-body");
    if (!resBody) {
        console.error("❌ Elemento #estoque-table-body não encontrado!");
        return;
    }

    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva" || a.status === "Oficina / Reserva");
    console.log(`📦 Total de reservas: ${reservas.length}`);

    if (reservas.length === 0) {
        resBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Estoque vazio.</td></tr>`;
        return;
    }

    // Agrupa por MCC
    const grupos = {};
    reservas.forEach(a => {
        const mcc = a.mcc_compat || "2/3";
        if (!grupos[mcc]) grupos[mcc] = [];
        grupos[mcc].push(a);
    });

    let htmlFinal = "";
    const coresMCC = { "2": "#3b82f6", "3": "#8b5cf6", "4": "#ec4899" };

    Object.keys(grupos).sort().forEach(mcc => {
        const itens = grupos[mcc];
        const tipos = {};
        itens.forEach(a => {
            const tipo = a.tipo || "Outros";
            if (!tipos[tipo]) tipos[tipo] = [];
            tipos[tipo].push(a);
        });

        htmlFinal += `
            <tr style="background: ${coresMCC[mcc] || '#f59e0b'}20; border-top: 3px solid ${coresMCC[mcc] || '#f59e0b'};">
                <td colspan="7" style="padding: 10px 16px; font-weight: 700; color: var(--text-heading); font-size: 15px;">
                    <i class="fas fa-server"></i> MCC ${mcc}
                </td>
            </tr>
        `;

        Object.keys(tipos).sort().forEach(tipo => {
            const lista = tipos[tipo];
            htmlFinal += `
                <tr style="background: var(--bg-th);">
                    <td colspan="7" style="padding: 6px 16px; font-weight: 600; color: var(--text-muted); font-size: 13px; padding-left: 30px;">
                        <i class="fas fa-tag"></i> ${tipo}
                    </td>
                </tr>
            `;

            lista.forEach((a) => {
                const isZerado = (a.ton || 0) === 0 ? `✅ Zerado` : `🔄 Parcial (${a.ton}t)`;
                const mccCompat = a.mcc_compat || "";
                const familia = a.tipo || "";
                const familiaUpper = familia.toUpperCase();

                let optionsVeios = `<option value="">Selecione...</option>`;
                if (mcc === "2/3") {
                    optionsVeios += `<option value="C">Veio C (MCC 2)</option><option value="D">Veio D (MCC 2)</option><option value="E">Veio E (MCC 3)</option><option value="F">Veio F (MCC 3)</option>`;
                } else if (mcc === "4") {
                    optionsVeios += `<option value="H">Veio H (MCC 4)</option><option value="G">Veio G (MCC 4)</option>`;
                }

                let posicaoHTML = "";
                const isBow = familiaUpper === "BOW" || familiaUpper.includes("BOW");
                const isHorizontal = familiaUpper === "HORIZONTAL" || familiaUpper.includes("HORIZONTAL");
                const isCadeiraSup = familiaUpper === "CADEIRA SUPERIOR" || familiaUpper.includes("CADEIRA SUPERIOR");
                const isCadeiraInf = familiaUpper === "CADEIRA INFERIOR" || familiaUpper.includes("CADEIRA INFERIOR");
                const isSegmento = familiaUpper === "SEGMENTO" || familiaUpper.includes("SEGMENTO") || familiaUpper === "SEGUIMENTO ZERO";
                const isMolde = familiaUpper === "MOLDE" || familiaUpper.includes("MOLDE");
                const isBender = familiaUpper === "BENDER" || familiaUpper.includes("BENDER");
                const isStraightener = familiaUpper === "STRAIGHTENER" || familiaUpper.includes("STRAIGHTENER");
                const isOsciladora = familiaUpper === "MESA OSCILADORA" || familiaUpper.includes("MESA OSCILADORA");

                if (isBow && mccCompat === "4") {
                    let opts = '<option value="">Bow</option>';
                    for (let i = 1; i <= 5; i++) opts += `<option value="${i}">#${i}</option>`;
                    posicaoHTML = `<select id="pos-${a.id}" style="width:65px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#0f172a; color:#e0e0e0;">${opts}</select>`;
                }
                else if (isHorizontal && mccCompat === "4") {
                    let opts = '<option value="">Horiz</option>';
                    for (let i = 8; i <= 17; i++) opts += `<option value="${i}">#${i}</option>`;
                    posicaoHTML = `<select id="pos-${a.id}" style="width:65px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#0f172a; color:#e0e0e0;">${opts}</select>`;
                }
                else if (isCadeiraSup && mccCompat === "2/3") {
                    let opts = '<option value="">Sup</option>';
                    for (let i = 43; i <= 79; i++) opts += `<option value="${i}">#${i}</option>`;
                    posicaoHTML = `<select id="pos-${a.id}" style="width:65px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#0f172a; color:#e0e0e0;">${opts}</select>`;
                }
                else if (isCadeiraInf && mccCompat === "2/3") {
                    let opts = '<option value="">Inf</option>';
                    for (let i = 43; i <= 79; i++) opts += `<option value="${i}">#${i}</option>`;
                    posicaoHTML = `<select id="pos-${a.id}" style="width:65px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#0f172a; color:#e0e0e0;">${opts}</select>`;
                }
                else if (isSegmento && mccCompat === "2/3") {
                    let opts = '<option value="">Seg</option>';
                    for (let i = 1; i <= 6; i++) opts += `<option value="${i}">#${i}</option>`;
                    posicaoHTML = `<select id="pos-${a.id}" style="width:60px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#0f172a; color:#e0e0e0;">${opts}</select>`;
                }
                else if (isMolde || isBender || isStraightener || isOsciladora) {
                    posicaoHTML = `<span style="font-size:12px; color:#888;">Única</span>`;
                }
                else {
                    posicaoHTML = `<span style="font-size:12px; color:#888;">Única</span>`;
                }

                const btnExcluir = `
                    <button onclick="window.excluirEquipamento('${a.id}')" style="padding:3px 8px; font-size:11px; background:transparent; border:1px solid #ef4444; color:#ef4444; border-radius:3px; cursor:pointer;" title="Excluir">
                        🗑️
                    </button>
                `;

                htmlFinal += `
                    <tr>
                        <td style="font-family: monospace; font-weight:600; font-size:0.85rem; padding:6px 8px; color:#e0e0e0; padding-left: 45px;">${a.id}</td>
                        <td style="padding:6px 8px;"><span style="background:rgba(56,189,248,0.15); padding:2px 10px; border-radius:4px; font-size:0.7rem; color:#38bdf8;">${a.tipo}</span></td>
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
        });
    });

    resBody.innerHTML = htmlFinal;
    console.log("✅ renderReservas() executado. Total:", reservas.length);
}

// ==============================================================
// SWAP DIRETO (completo, com registro na planilha e histórico)
// ==============================================================
function efetuarSwapDireto(tagNova) {
    if (typeof BANCO_ATIVOS === 'undefined') {
        alert("Erro: Banco de dados não carregado.");
        return;
    }

    console.log("🔍 Iniciando SWAP para peça:", tagNova);

    const indexNovo = BANCO_ATIVOS.findIndex(a => a.id === tagNova);
    if (indexNovo === -1) {
        alert("Erro: Peça não encontrada no estoque.");
        return;
    }
    
    const itemNovo = BANCO_ATIVOS[indexNovo];
    console.log("📦 Peça nova:", itemNovo.id, "Tipo:", itemNovo.tipo);
    
    const veioEl = document.getElementById(`swap-veio-${tagNova}`);
    const veioDestino = veioEl ? veioEl.value : "";
    
    if (!veioDestino) {
        alert("Por favor, selecione o Veio de destino.");
        return;
    }
    console.log("🎯 Veio destino:", veioDestino);

    const posEl = document.getElementById(`pos-${tagNova}`);
    let posicaoDigitada = "";
    
    if (posEl) {
        if (posEl.tagName === "SELECT") {
            posicaoDigitada = posEl.options[posEl.selectedIndex]?.value || "";
        } else if (posEl.tagName === "INPUT" && posEl.type !== "hidden") {
            posicaoDigitada = posEl.value.trim();
        } else if (posEl.tagName === "INPUT" && posEl.type === "hidden") {
            posicaoDigitada = posEl.value;
        } else {
            posicaoDigitada = posEl.textContent.trim();
        }
    }
    
    if (!posicaoDigitada || posicaoDigitada === "") {
        alert("⚠️ Selecione a Posição de destino.");
        return;
    }
    console.log("📍 Posição final:", posicaoDigitada);

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

    if (!confirm(`Confirmar instalação da peça [${itemNovo.id}] na gaveta [${slotChassi}] do Veio ${veioDestino}?`)) {
        return;
    }

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

    const mcc = itemNovo.mcc_compat || "4";
    const nomeMaquina = `MCC ${mcc}`;
    const nomeOperador = window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Operador Desconhecido";
    const pecaAntigaId = pecaExpulsa ? pecaExpulsaId : "Gaveta Vazia";

    if (typeof window.registrarSwapNaPlanilha === 'function') {
        window.registrarSwapNaPlanilha(
            nomeMaquina,
            veioDestino,
            slotChassi,
            itemNovo.id,
            pecaAntigaId,
            nomeOperador
        );
    }

    console.log(`📥 Instalando peça ${itemNovo.id} na gaveta ${slotChassi} do Veio ${veioDestino}`);
    
    BANCO_ATIVOS[indexNovo].local = `MCC ${mcc} - Veio ${veioDestino}`;
    BANCO_ATIVOS[indexNovo].veio = veioDestino;
    BANCO_ATIVOS[indexNovo].posicaoFixa = slotChassi;
    BANCO_ATIVOS[indexNovo].pos = slotChassi;
    BANCO_ATIVOS[indexNovo].status = "Instalado";

    if (window.registrarHistorico) {
        window.registrarHistorico(itemNovo.id, `Instalada no Veio ${veioDestino} (${slotChassi}) via Estoque.`);
    }

    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    console.log("💾 Dados salvos no LocalStorage");

    alert(`✅ Sucesso! A peça [${itemNovo.id}] assumiu a gaveta ${slotChassi} do Veio ${veioDestino}.`);

    setTimeout(() => {
        console.log("🔄 Atualizando interface em segundo plano...");
        if (typeof renderAtivos === 'function') renderAtivos();
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof renderReparos === 'function') renderReparos();
        if (typeof renderPainelVeios === 'function') renderPainelVeios();
        if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
        console.log(`🔄 Atualizando visualização do Veio ${veioDestino}...`);
        if (typeof window.mudarVeioVisualizado === 'function') {
            window.mudarVeioVisualizado(veioDestino);
        }
        console.log("✅ Interface atualizada com sucesso!");
    }, 80);

    console.log("✅ SWAP concluído com sucesso!");
}

// ==============================================================
// RESETAR DIAS EM REPARO
// ==============================================================
function resetarDiasReparo() {
    if (!confirm("⚠️ Isso vai zerar a contagem de dias de TODOS os equipamentos em reparo. Deseja continuar?")) return;

    BANCO_ATIVOS.forEach(a => {
        if (a.local === "Oficina / Reparo") {
            a.dias = 0;
            a.dataReparo = Date.now();
        }
    });
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    if (typeof window.renderReparos === 'function') window.renderReparos();
    alert("✅ Contagem de dias resetada para todos os equipamentos em reparo!");
}

// ==============================================================
// EXCLUIR EQUIPAMENTO
// ==============================================================
function excluirEquipamento(id) {
    if (typeof window.verificarAcesso === 'function') {
        if (!window.verificarAcesso()) return;
    }
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        alert("Equipamento não encontrado.");
        return;
    }
    if (!confirm(`⚠️ EXCLUIR permanentemente [${id}]?\n\nTipo: ${item.tipo}\nLocal: ${item.local}\n\nEsta ação NÃO pode ser desfeita!`)) {
        return;
    }
    const index = BANCO_ATIVOS.findIndex(a => a.id === id);
    if (index !== -1) {
        BANCO_ATIVOS.splice(index, 1);
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        if (window.registrarHistorico) {
            window.registrarHistorico(id, `🚨 Equipamento [${id}] foi EXCLUÍDO.`);
        }
        if (typeof window.renderAtivos === 'function') window.renderAtivos();
        if (typeof window.renderReparos === 'function') window.renderReparos();
        if (typeof window.renderReservas === 'function') window.renderReservas();
        if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
        alert(`✅ [${id}] excluído.`);
    }
}

// ==============================================================
// EXPOSIÇÃO GLOBAL (apenas o essencial)
// ==============================================================
window.renderReservas = renderReservas;
window.efetuarSwapDireto = efetuarSwapDireto;
window.excluirEquipamento = excluirEquipamento;
window.resetarDiasReparo = resetarDiasReparo;
window.calcularDias = calcularDias;

// ==============================================================
// REEXPORTAÇÕES PARA COMPATIBILIDADE COM OS FOLHÕES
// (Obtidas do window, definidas pelo script.js)
// ==============================================================
const renderAtivos = window.renderAtivos;
const renderPainelVeios = window.renderPainelVeios;
const renderReparos = window.renderReparos;
const renderRolos = window.renderRolos;
const renderMateriais = window.renderMateriais;
const renderHistorico = window.renderHistorico;
const gerarCardGraficoHTML = window.gerarCardGraficoHTML;
const aplicarFiltrosMCC = window.aplicarFiltrosMCC;
const renderizarGraficosMCC = window.renderizarGraficosMCC;

export {
    calcularDias,
    renderReservas,
    efetuarSwapDireto,
    excluirEquipamento,
    resetarDiasReparo,
    renderAtivos,
    renderPainelVeios,
    renderReparos,
    renderRolos,
    renderMateriais,
    renderHistorico,
    gerarCardGraficoHTML,
    aplicarFiltrosMCC,
    renderizarGraficosMCC
};

console.log("✅ ui.js carregado – sem conflitos e com reexportações para folhões.");