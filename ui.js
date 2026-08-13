// ui.js - Versão final corrigida (R1/R2, botão excluir, sem duplicatas)

import { BANCO_ATIVOS, resolverApiBase } from './banco.js?v=5';

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
// RENDER RESERVAS (com selects de veio, posição e botão excluir)
// ==============================================================
function renderReservas() {
    const tbody = document.getElementById("estoque-table-body");
    if (!tbody) return;

    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
    if (reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhuma peça em estoque.</td></tr>`;
        return;
    }

    // ==========================================
    // FUNÇÕES AUXILIARES INTERNAS (não usam window)
    // ==========================================
    function getSlotFixo(tipo, id, mcc) {
        const t = tipo.toUpperCase();
        const idUpper = (id || '').toUpperCase();
        // MCC 4
        if (mcc === '4') {
            // Mapeamento por tipo
            if (t.includes('MOLDE')) return 'MOLDE';
            if (t.includes('BENDER')) return 'BENDER';
            
            // Straightener R1: pelo tipo OU pelo ID contendo R1 ou STR-1
            if (t.includes('STRAIGHTENER R1') || idUpper.includes('R1') || idUpper.includes('STR-1')) {
                return 'STR-1';
            }
            // Straightener R2: pelo tipo OU pelo ID contendo R2 ou STR-2
            if (t.includes('STRAIGHTENER R2') || idUpper.includes('R2') || idUpper.includes('STR-2')) {
                return 'STR-2';
            }
            // Fallback para Straightener genérico (caso alguém cadastre só "Straightener")
            if (t.includes('STRAIGHTENER')) {
                if (idUpper.includes('R1') || idUpper.includes('STR-1')) return 'STR-1';
                if (idUpper.includes('R2') || idUpper.includes('STR-2')) return 'STR-2';
                // Se não conseguir identificar, retorna vazio (vai mostrar o tipo como fallback)
                return '';
            }
        }
        // MCC 2/3
        else if (mcc === '2/3') {
            if (t.includes('SEGMENTO ZERO') || t.includes('SEGUIMENTO ZERO')) return 'SEG-ZERO';
            if (t.includes('MOLDE')) return 'MOLDE';
        }
        return '';
    }

    // 🔧 CORREÇÃO ("B-20 ocupa a mesma posição de outra peça, e o Sinótico
    // 3D nunca mostra ele"): antes, qualquer peça "Segmento" (Grupo 1, 2
    // ou 3) via as MESMAS opções de posição (1 a 6), sem diferenciar qual
    // Grupo era. Isso permitia escolher um número que não bate com a
    // vaga física real do Grupo daquela peça (ex: uma peça "Segmento
    // Grupo 3" sendo instalada na posição "1", que na verdade pertence
    // ao Grupo 1) — causando colisão com outra peça que já ocupa aquele
    // número, ou "órfãos" que nunca aparecem no Sinótico 3D (porque não
    // existe vaga física pro número escolhido).
    //
    // O formulário de Cadastro já fazia essa trava direito (ver "AQUI
    // ESTÃO OS GRUPOS 1, 2 E 3 TRAVADOS NAS POSIÇÕES CORRETAS", mais
    // abaixo em script.js) — Grupo 1 = posição 1, Grupo 2 = posições 2/3,
    // Grupo 3 = posições 4/5/6. Agora o Swap usa a MESMA trava.
    function getOpcoesPosicao(tipo, mcc) {
        const t = tipo.toUpperCase();
        let opcoes = '';
        if (mcc === '4') {
            if (t.includes('BOW')) {
                for (let i = 1; i <= 5; i++) opcoes += `<option value="${i}">#${i}</option>`;
            } else if (t.includes('HORIZONTAL')) {
                for (let i = 8; i <= 17; i++) opcoes += `<option value="${i}">#${i}</option>`;
            }
        } else if (mcc === '2/3') {
            if (t.includes('CADEIRA SUPERIOR')) {
                for (let i = 43; i <= 79; i++) opcoes += `<option value="${i}">#${i}</option>`;
            } else if (t.includes('CADEIRA INFERIOR')) {
                for (let i = 43; i <= 79; i++) opcoes += `<option value="${i}">#${i}</option>`;
            } else if (t.includes('SEGMENTO GRUPO 1')) {
                opcoes += `<option value="1">Segmento #1</option>`;
            } else if (t.includes('SEGMENTO GRUPO 2')) {
                opcoes += `<option value="2">Segmento #2</option><option value="3">Segmento #3</option>`;
            } else if (t.includes('SEGMENTO GRUPO 3')) {
                opcoes += `<option value="4">Segmento #4</option><option value="5">Segmento #5</option><option value="6">Segmento #6</option>`;
            } else if (t.includes('SEGMENTO') && !t.includes('ZERO')) {
                // Fallback pra peças "Segmento" sem o número do Grupo no
                // tipo (ex: importadas de um jeito diferente) — mantém o
                // comportamento antigo (mostra tudo) em vez de esconder a
                // peça do dropdown por completo.
                for (let i = 1; i <= 6; i++) opcoes += `<option value="${i}">#${i}</option>`;
            }
        }
        return opcoes;
    }


    // ==========================================
    // AGRUPAMENTO POR MCC
    // ==========================================
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
                <td colspan="6" style="padding: 10px 16px; font-weight: 700; color: var(--text-heading); font-size: 15px;">
                    <i class="fas fa-server"></i> MCC ${mcc}
                </td>
            </tr>
        `;

        // Define os veios disponíveis para este MCC
        let veiosDisponiveis = [];
        if (mcc === "4") {
            veiosDisponiveis = ['G', 'H'];
        } else if (mcc === "2") {
            veiosDisponiveis = ['C', 'D'];
        } else if (mcc === "3") {
            veiosDisponiveis = ['E', 'F'];
        } else {
            veiosDisponiveis = ['C', 'D', 'E', 'F'];
        }

        Object.keys(tipos).sort().forEach(tipo => {
            const lista = tipos[tipo];
            htmlFinal += `
                <tr style="background: var(--bg-th);">
                    <td colspan="6" style="padding: 6px 16px; font-weight: 600; color: var(--text-muted); font-size: 13px; padding-left: 30px;">
                        <i class="fas fa-tag"></i> ${tipo}
                    </td>
                </tr>
            `;

            lista.forEach(a => {
                const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
                const pctFixed = pct.toFixed(1);
                let statusClass = 'reserva';
                if (pct >= 80) statusClass = 'reparo';
                else if (pct >= 50) statusClass = 'warning';

                const tipoUpper = (a.tipo || '').toUpperCase();
                // Lista de tipos fixos (agora incluindo R1/R2)
                const tiposFixos = ['MOLDE', 'BENDER', 'STRAIGHTENER'];
                const isFixo = tiposFixos.some(f => tipoUpper.includes(f));

                // Select de veio
                const veioSelect = `
                    <select id="alocar-veio-${a.id}" class="premium-select" style="width:80px;">
                        <option value="">Veio</option>
                        ${veiosDisponiveis.map(v => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                `;

                let posSelect = '';
                if (isFixo) {
                    // Usa a função melhorada, passando o ID também
                    const slotFixo = getSlotFixo(a.tipo, a.id, a.mcc_compat);
                    // Se o slotFixo estiver vazio, usa o tipo como fallback (mas não deve acontecer para R1/R2)
                    const valorExibido = slotFixo || a.tipo;
                    posSelect = `<input type="text" id="alocar-pos-${a.id}" value="${valorExibido}" readonly style="width:80px; background:var(--bg-input); color:var(--text-muted); border:1px solid var(--border); border-radius:4px; padding:4px; text-align:center;">`;
                } else {
                    const opcoes = getOpcoesPosicao(a.tipo, a.mcc_compat);
                    posSelect = `
                        <select id="alocar-pos-${a.id}" class="premium-select" style="width:80px;">
                            <option value="">Pos</option>
                            ${opcoes}
                        </select>
                    `;
                }

                htmlFinal += `
                    <tr>
                        <td class="font-code">${a.id}</td>
                        <td><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
                        <td><span class="status-pill ${statusClass}">${pctFixed}%</span></td>
                        <td>${veioSelect}</td>
                        <td>${posSelect}</td>
                        <td>
                            <button class="btn-premium btn-success" style="padding:4px 12px; font-size:12px;" onclick="window.iniciarSwapAlocacao('${a.id}')">
                                <i class="fas fa-exchange-alt"></i> Swap
                            </button>
                            <button class="btn-outline-danger" style="padding:4px 12px; font-size:12px; margin-left:5px;" onclick="window.excluirEquipamento('${a.id}')">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
    });

    tbody.innerHTML = htmlFinal;
}

// ==============================================================
// 🔧 CORREÇÃO CRÍTICA: window.renderReservas nunca existia de verdade.
// Esse arquivo define a função renderReservas() (a que monta a tabela
// de Estoque Reserva de verdade, com selects de veio/posição), mas ela
// só era usada via `export` do módulo — nunca virava uma propriedade
// em `window`. Como o app.html importa este arquivo só por efeito
// colateral (sem capturar os exports), TODO lugar do sistema que
// chamava `window.renderReservas()` (cadastro de peça nova, saque,
// swap, exclusão...) executava um "if" que nunca era verdadeiro, e a
// tabela de reserva só atualizava quando a página era recarregada do
// zero. Agora a função real fica exposta corretamente.
// ==============================================================
window.renderReservas = renderReservas;

// ==============================================================
// EXCLUIR EQUIPAMENTO (definido globalmente)
// ==============================================================
window.excluirEquipamento = async function(id) {
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

    // 🔧 CORREÇÃO: antes isso só tirava a peça do localStorage — sumia da
    // tela e dava a mensagem de sucesso, mas nunca chegava a mexer no
    // Postgres. Ao recarregar a página, a sincronização com o banco
    // trazia a peça de volta, porque ela nunca tinha sido excluída de
    // verdade. Agora a exclusão só é confirmada na tela depois que a API
    // confirma que apagou no banco.
    let apiConfirmou = false;
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetch(`${apiBase}/api/excluir_peca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const resultado = await resposta.json();
        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.detail || 'A API não confirmou a exclusão.');
        }
        apiConfirmou = true;
    } catch (erro) {
        console.error('❌ Erro ao excluir peça no banco:', erro);
        alert(`❌ Não consegui excluir [${id}] no banco de dados.\n\nMotivo: ${erro.message}\n\nA peça NÃO foi removida — tente de novo, ou confira sua conexão.`);
        return;
    }

    if (!apiConfirmou) return;

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
};



// ==============================================================
// REEXPORTAÇÕES PARA COMPATIBILIDADE COM OS FOLHÕES
// ==============================================================
const renderAtivos = window.renderAtivos;
const renderPainelVeios = window.renderPainelVeios;
const renderReparos = window.renderReparos;
const renderRolos = window.renderRolos;
const renderMateriais = window.renderMateriais;
const renderHistorico = window.renderHistorico;
const gerarCardGraficoHTML = window.gerarCardGraficoHTML;
const renderizarGraficosMCC = window.renderizarGraficosMCC;

export {
    calcularDias,
    renderReservas,
    renderAtivos,
    renderPainelVeios,
    renderReparos,
    renderRolos,
    renderMateriais,
    renderHistorico,
    gerarCardGraficoHTML,
    renderizarGraficosMCC
};