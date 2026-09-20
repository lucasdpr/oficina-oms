// ==========================================================================
// ESTOQUE (Rolos/Hidráulica/Materiais) e Cadastro de Peças — extraído
// de script.js na modularização
// ==========================================================================
// Cadastro de novas peças/rolos, Estoque Hidráulico, Almoxarifado de
// Materiais Gerais, edição inline de células da tabela de Ativos, abas
// do Segmento Zero e o processamento de cadastro de nova peça.

import { resolverApiBase, salvarAjusteRoloNoPython, salvarAjusteHidraulicaNoPython, sincronizarRolosReais, sincronizarHidraulicaReal, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, BANCO_ROLOS, BANCO_HIDRAULICA, BANCO_MATERIAIS, setBancoMateriais, recarregarRolosEHidraulicaLocal } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { fetchComRetry, calcularDias, rotuloDesgaste, getOrdemPadrao } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ==========================================
// CADASTRO DE NOVAS PEÇAS E ROLOS
// ==========================================
// (toggleFormAdicionar real fica definida mais abaixo, como
// window.toggleFormAdicionar — ver correção do bug do abrirAba()
// duplicado.)

window.atualizarPosicoesCadastro = function() {
    const tipo = document.getElementById("add-tipo").value;
    const selectPos = document.getElementById("add-posicao");
    const inputMeta = document.getElementById("add-meta");

    if (!selectPos || !inputMeta) return;
    selectPos.innerHTML = "";

    // 🆕 Data de Entrada default = hoje (só preenche se ainda estiver
    // vazio, pra não sobrescrever o que o técnico já digitou).
    const inputDataEntrada = document.getElementById("add-data-entrada");
    if (inputDataEntrada && !inputDataEntrada.value) {
        inputDataEntrada.value = new Date().toISOString().slice(0, 10);
    }

    if (!tipo) {
        selectPos.innerHTML = `<option value="">Selecione um tipo primeiro...</option>`;
        inputMeta.value = "";
        window.atualizarVeiosCadastro();
        return;
    }

    const familia = tipo.split("|")[0] || "";
    const mcc = tipo.split("|")[1] || "";

    window.atualizarVeiosCadastro();

    // 1. AUTO-PREENCHER A META
    const metas = {
        "Bender": 1100000,
        "Bow": 1900000,
        "Straightener R1": 1700000,
        "Straightener R2": 1700000,
        "Horizontal": 3300000,
        "Segmento Zero": 450000,
        "Segmento Grupo 1": 1100000,
        "Segmento Grupo 2": 1650000,
        "Segmento Grupo 3": 1900000,
        "Cadeira Superior": 2000000,
        "Cadeira Inferior": 2500000,
        // 🆕 Oscilador/Mesa Osciladora — vida útil medida em DIAS (não
        // toneladas/corridas, ver campo "meta" reaproveitado pra isso):
        // 730 = 2 anos, 1095 = 3 anos, conforme a área informou.
        "Oscilador": 730,
        "Mesa Osciladora": 1095
    };

    if (familia.includes("Molde")) {
        // 🔥 AQUI ESTÁ A MÁGICA DOS MOLDES AUTOMÁTICOS 🔥
        // Molde MCC 2/3 = 900.000 | Molde MCC 4 = 1.100.000
        inputMeta.value = (mcc === "4") ? 1100000 : 900000;
        inputMeta.readOnly = false;
    } else {
        inputMeta.value = metas[familia] || 1000000;
    }

    // 2. TRAVAR AS POSIÇÕES CORRETAS
    if (mcc === "4") {
        if (familia === "Molde") selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        else if (familia === "Bender") selectPos.innerHTML = `<option value="BENDER">Bender (Única posição)</option>`;
        else if (familia === "Bow") {
            for (let i = 1; i <= 5; i++) selectPos.innerHTML += `<option value="${i}">Bow Posição #${i}</option>`;
        } else if (familia === "Straightener R1") selectPos.innerHTML = `<option value="STR-1">Straightener R1 (Única)</option>`;
        else if (familia === "Straightener R2") selectPos.innerHTML = `<option value="STR-2">Straightener R2 (Única)</option>`;
        else if (familia === "Oscilador") {
            selectPos.innerHTML = `<option value="N">Oscilador Norte</option><option value="S">Oscilador Sul</option>`;
        }
        else if (familia === "Horizontal") {
            for (let i = 8; i <= 17; i++) selectPos.innerHTML += `<option value="${i}">Horizontal Posição #${i}</option>`;
        } else selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    } 
    else if (mcc === "2/3") {
        if (familia === "Molde") selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        else if (familia === "Segmento Zero") selectPos.innerHTML = `<option value="SEG-ZERO">Segmento Zero (Única)</option>`;
        else if (familia === "Mesa Osciladora") selectPos.innerHTML = `<option value="MESA-OSC">Mesa Osciladora (Única posição)</option>`;

        // 🔥 AQUI ESTÃO OS GRUPOS 1, 2 E 3 TRAVADOS NAS POSIÇÕES CORRETAS 🔥
        else if (familia === "Segmento Grupo 1") selectPos.innerHTML = `<option value="1">Segmento #1</option>`;
        else if (familia === "Segmento Grupo 2") {
            selectPos.innerHTML = `<option value="2">Segmento #2</option><option value="3">Segmento #3</option>`;
        }
        else if (familia === "Segmento Grupo 3") {
            selectPos.innerHTML = `<option value="4">Segmento #4</option><option value="5">Segmento #5</option><option value="6">Segmento #6</option>`;
        }
        
        else if (familia === "Cadeira Superior") {
            for (let i = 43; i <= 79; i++) selectPos.innerHTML += `<option value="${i}">Cadeira Superior #${i}</option>`;
        } else if (familia === "Cadeira Inferior") {
            for (let i = 43; i <= 79; i++) selectPos.innerHTML += `<option value="${i}">Cadeira Inferior #${i}</option>`;
        } else selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    } else {
        selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    }
};
// ⚠️ A implementação de verdade do cadastro fica em
// window.processarCadastroPeca, mais abaixo neste arquivo — é ela que
// o botão "Confirmar Cadastro" chama (onclick="window.processarCadastroPeca()").

// 🆕 Monta as opções de Veio do bloco "já está instalada", de acordo
// com o MCC do tipo escolhido — Veios C/D são MCC 2, E/F são MCC 3
// (por isso entram nos dois quando o tipo é "2/3", já que a peça pode
// estar em qualquer um), G/H são MCC 4 (ver botões de
// mudarVeioVisualizado no Sequenciamento de Veios, no app.html).
window.atualizarVeiosCadastro = function() {
    const tipo = document.getElementById("add-tipo")?.value || "";
    const selectVeio = document.getElementById("add-veio-instalacao");
    if (!selectVeio) return;

    const mcc = tipo.split("|")[1] || "";
    let opcoes = [];
    if (mcc === "4") opcoes = [["G", "Veio G (MCC 4)"], ["H", "Veio H (MCC 4)"]];
    else if (mcc === "2/3") opcoes = [["C", "Veio C (MCC 2)"], ["D", "Veio D (MCC 2)"], ["E", "Veio E (MCC 3)"], ["F", "Veio F (MCC 3)"]];

    selectVeio.innerHTML = opcoes.length
        ? `<option value="">Selecionar veio...</option>` + opcoes.map(([v, label]) => `<option value="${v}">${label}</option>`).join("")
        : `<option value="">Selecione um tipo primeiro...</option>`;
};

// 🆕 Mostra/esconde o bloco de Veio quando o técnico marca "peça já
// está instalada" — não faz sentido pedir Veio pra quem vai mandar pro
// Estoque Reserva normalmente.
window.toggleCadastroJaInstalada = function() {
    const checkbox = document.getElementById("add-ja-instalada");
    const bloco = document.getElementById("bloco-add-veio-instalacao");
    if (!checkbox || !bloco) return;
    bloco.classList.toggle("hidden", !checkbox.checked);
    if (checkbox.checked) window.atualizarVeiosCadastro();
};

function renderRolos() {
    const tbody = document.getElementById("rolos-table-body");
    if (!tbody) return;
    let htmlFinal = "";
    const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

    equipamentosDiferentes.forEach(equipamento => {
        htmlFinal += `
            <tr style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--text-accent);">
                <td colspan="5" style="padding: 12px 16px; color: var(--text-accent); font-weight: 700; text-transform: uppercase; font-size: 14px;"><i class="fas fa-layer-group"></i> Equipamento: ${equipamento}</td>
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
                    <td><div style="display:inline-flex; gap:5px;"><button class="btn-premium btn-success" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', 1)"><i class="fas fa-plus"></i></button><button class="btn-premium btn-warning" style="padding:4px 10px;" onclick="alterarSaldoRolo('${r.id}', -1)"><i class="fas fa-minus"></i></button></div></td>
                </tr>
            `;
        });
    });
    tbody.innerHTML = htmlFinal;
}
window.renderRolos = renderRolos;

async function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    if (rolo) {
        if (rolo.qtd + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        // 🔧 Log de auditoria + notificação agora é feito pelo próprio
        // backend (POST /api/rolos/ajustar), com a matrícula certa — o
        // registro daqui duplicava sem a tag certa pra aparecer na
        // Central de Notificações (ver enviar_push_para_area em
        // ajustar_rolo, main.py).
        renderRolos();

        // Persiste no Neon — sem isso, o ajuste sumia assim que a página
        // sincronizasse de novo com o servidor.
        if (typeof salvarAjusteRoloNoPython === 'function') {
            await salvarAjusteRoloNoPython(id, fator);
        }
    }
}
window.alterarSaldoRolo = alterarSaldoRolo;

// ==========================================
// ESTOQUE HIDRÁULICO (Aplicado na Máquina x Reserva na Oficina)
// ==========================================
function renderHidraulica() {
    const tbody = document.getElementById("hidraulica-table-body");
    if (!tbody) return;
    let htmlFinal = "";
    const gruposMcc = [...new Set(BANCO_HIDRAULICA.map(h => h.mcc_compat))].sort();

    gruposMcc.forEach(mcc => {
        htmlFinal += `
            <tr style="background: rgba(249, 115, 22, 0.08); border-left: 4px solid #f97316;">
                <td colspan="6" style="padding: 12px 16px; color: #f97316; font-weight: 700; text-transform: uppercase; font-size: 14px;"><i class="fas fa-server"></i> MCC ${mcc}</td>
            </tr>
        `;
        const itensDoGrupo = BANCO_HIDRAULICA.filter(h => h.mcc_compat === mcc);
        itensDoGrupo.forEach(h => {
            const aplicado = h.qtd_aplicado || 0;
            const reserva = h.qtd_reserva || 0;
            htmlFinal += `
                <tr>
                    <td class="font-code" style="color:var(--text-heading); padding-left: 25px;"><strong>${h.nome}</strong></td>
                    <td><span class="ind-card-tag bg-tag">${h.conjunto}</span></td>
                    <td><code>MCC ${h.mcc_compat}</code></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="font-code bold" id="saldo-hidraulica-aplicado-${h.id}" style="font-size:15px; color:#22c55e;"><i class="fas fa-industry" style="font-size:11px;"></i> ${aplicado}</span>
                            <div style="display:inline-flex; gap:4px;">
                                <button class="btn-premium btn-success" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'aplicado', 1)"><i class="fas fa-plus"></i></button>
                                <button class="btn-premium btn-warning" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'aplicado', -1)"><i class="fas fa-minus"></i></button>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="font-code bold" id="saldo-hidraulica-reserva-${h.id}" style="font-size:15px; color:var(--text-accent);"><i class="fas fa-warehouse" style="font-size:11px;"></i> ${reserva}</span>
                            <div style="display:inline-flex; gap:4px;">
                                <button class="btn-premium btn-success" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'reserva', 1)"><i class="fas fa-plus"></i></button>
                                <button class="btn-premium btn-warning" style="padding:3px 8px;" onclick="alterarSaldoHidraulica('${h.id}', 'reserva', -1)"><i class="fas fa-minus"></i></button>
                            </div>
                        </div>
                    </td>
                    <td><span class="font-code text-muted" style="font-size:12px;">Total: ${aplicado + reserva}</span></td>
                </tr>
            `;
        });
    });
    tbody.innerHTML = htmlFinal;
}
window.renderHidraulica = renderHidraulica;

async function alterarSaldoHidraulica(id, local, fator) {
    if (!verificarAcesso()) return;
    let peca = BANCO_HIDRAULICA.find(h => h.id === id);
    if (!peca) return;

    const campo = local === 'aplicado' ? 'qtd_aplicado' : 'qtd_reserva';

    if ((peca[campo] || 0) + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
    peca[campo] = (peca[campo] || 0) + fator;
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
    // 🔧 Log de auditoria + notificação agora é feito pelo próprio
    // backend (POST /api/hidraulica/ajustar) — ver comentário equivalente
    // em alterarSaldoRolo.
    renderHidraulica();

    // Persiste no Neon — sem isso, o ajuste sumia assim que a página
    // sincronizasse de novo com o servidor.
    if (typeof salvarAjusteHidraulicaNoPython === 'function') {
        await salvarAjusteHidraulicaNoPython(id, local, fator);
    }
}
window.alterarSaldoHidraulica = alterarSaldoHidraulica;

// ==========================================
// ALMOXARIFADO DE MATERIAIS GERAIS
// ==========================================
function renderMateriais() {
    const tbody = document.getElementById("materiais-table-body");
    const busca = document.getElementById("busca-material") ? document.getElementById("busca-material").value.toLowerCase() : "";
    if (!tbody) return;

    let filtrados = BANCO_MATERIAIS;
    if (busca) {
        filtrados = BANCO_MATERIAIS.filter(m => m.codigo.toLowerCase().includes(busca) || m.descricao.toLowerCase().includes(busca));
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum material encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(m => {
        let statusHtml = "";
        if (m.qtd > 10) statusHtml = `<span class="status-pill operação"><i class="fas fa-check-circle"></i> Normal</span>`;
        else if (m.qtd > 0) statusHtml = `<span class="status-pill" style="background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.25);"><i class="fas fa-exclamation-triangle"></i> Baixo</span>`;
        else statusHtml = `<span class="status-pill reparo"><i class="fas fa-times-circle"></i> Zerado</span>`;
        
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
window.renderMateriais = renderMateriais;

function toggleFormMaterial() {
    let form = document.getElementById("form-novo-material");
    if (form) form.classList.toggle("hidden");
}
window.toggleFormMaterial = toggleFormMaterial;

// ==========================================
// CARREGA O ALMOXARIFADO DO NEON (compartilhado entre todos)
// ==========================================
async function carregarMateriaisDoBackend() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setBancoMateriais(await resp.json());
        renderMateriais();
    } catch (e) {
        console.error('❌ Não foi possível carregar o almoxarifado do Neon:', e);
    }
}
window.carregarMateriaisDoBackend = carregarMateriaisDoBackend;

async function salvarEntradaMaterial() {
    if (!verificarAcesso()) return;
    const codigo = document.getElementById("mat-codigo").value.trim().toUpperCase();
    const descricao = document.getElementById("mat-descricao").value.trim().toUpperCase();
    const qtd = parseInt(document.getElementById("mat-qtd").value) || 0;

    if (!codigo || !descricao || qtd <= 0) {
        return alert("Por favor, preencha o código, a descrição correta e uma quantidade maior que zero.");
    }

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, descricao, qtd })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível salvar. Tente novamente.');
            return;
        }

        if (resultado.ja_existia) {
            window.registrarHistorico("ALMOXARIFADO", `Adição no material [${codigo}]. +${qtd} UN. Saldo atual: ${resultado.material.qtd} UN.`);
            alert(`SUCESSO!\nO código ${codigo} já existe no sistema.\nSomamos a quantidade de ${qtd} UN ao saldo atual.`);
        } else {
            window.registrarHistorico("ALMOXARIFADO", `Material [${codigo}] cadastrado. Entrada: ${qtd} UN.`);
            alert(`NOVO MATERIAL CADASTRADO!\nCódigo ${codigo} adicionado com saldo de ${qtd} UN.`);
        }

        document.getElementById("mat-codigo").value = "";
        document.getElementById("mat-descricao").value = "";
        document.getElementById("mat-qtd").value = "";
        toggleFormMaterial();
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao salvar material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}
window.salvarEntradaMaterial = salvarEntradaMaterial;

async function ajustarSaldoMaterial(codigo, fator) {
    if (!verificarAcesso()) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/ajustar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, fator })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível ajustar o estoque.');
            return;
        }
        let acao = fator > 0 ? "Entrada" : "Saída";
        window.registrarHistorico("ALMOXARIFADO", `Ajuste manual (${acao}) no material [${codigo}]. Novo saldo: ${resultado.material.qtd} UN.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao ajustar material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}
window.ajustarSaldoMaterial = ajustarSaldoMaterial;

async function removerMaterial(codigo) {
    if (!verificarAcesso()) return;
    if (!confirm(`Atenção!\nTem certeza que deseja apagar o registro do material [${codigo}] do sistema?`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais/remover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo })
        });
        const resultado = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            alert(resultado.detail || 'Não foi possível excluir o material.');
            return;
        }
        window.registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao remover material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}
window.removerMaterial = removerMaterial;

// ==========================================
// FUNÇÃO DE EDIÇÃO DE CÉLULAS DA TABELA
// ==========================================
function fazerCelulaEditavel(elemento, id, campo) {
    if (elemento.querySelector('input')) return;
    
    const valorAtual = elemento.innerText.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = valorAtual;
    input.className = 'edit-input';
    input.style.width = '100%';
    input.style.background = 'var(--bg-input)';
    input.style.color = 'var(--text-heading)';
    input.style.border = '1px solid var(--text-accent)';
    input.style.borderRadius = '4px';
    input.style.padding = '4px';
    
    elemento.innerHTML = '';
    elemento.appendChild(input);
    input.focus();
    input.select();
    
    const salvarEdicao = () => {
        const novoValor = input.value.trim();
        const item = BANCO_ATIVOS.find(a => a.id === id);
        if (item && novoValor) {
            if (campo === 'id') {
                const existe = BANCO_ATIVOS.some(a => a.id === novoValor && a.id !== id);
                if (existe) {
                    alert('Este ID já existe no sistema!');
                    elemento.innerText = valorAtual;
                    return;
                }
                item.id = novoValor;
            } else if (campo === 'dias') {
                const novoDiasNum = parseFloat(novoValor) || 0;
                const dataBase = Date.now() - (novoDiasNum * 24 * 60 * 60 * 1000);
                if (item.local === "Oficina / Reparo") {
                    item.dataReparo = dataBase;
                } else if (item.local && !item.local.includes("Oficina")) {
                    item.dataEntradaVeio = dataBase;
                }
                item.dias = novoDiasNum;
            } else if (campo === 'ton') {
                item.ton = parseFloat(novoValor) || 0;
            }
            
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
            window.registrarHistorico(id, `Campo "${campo}" alterado para: ${novoValor}`);
            
            if (campo === 'dias' || campo === 'ton') {
                elemento.innerText = parseFloat(novoValor).toLocaleString() || '0';
            } else {
                elemento.innerText = novoValor;
            }
            window.atualizarPainelCompleto();
        } else {
            elemento.innerText = valorAtual;
        }
    };
    
    const cancelarEdicao = () => {
        elemento.innerText = valorAtual;
    };
    
    input.addEventListener('blur', salvarEdicao);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
        if (e.key === 'Escape') {
            cancelarEdicao();
        }
    });
}
window.fazerCelulaEditavel = fazerCelulaEditavel;

// ==========================================
// CONTROLE DE ABAS DO SEGMENTO ZERO
// ==========================================
function trocarAbaSegZero(event, idAba) {
    const container = document.getElementById("modal-folhao-segmento-zero");
    if (!container) return;
    
    container.querySelectorAll('.folhao-content').forEach(content => {
        content.style.display = 'none';
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    container.querySelectorAll('.folhao-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        abaAlvo.classList.remove('hidden');
        abaAlvo.classList.add('active');
    }
    event.currentTarget.classList.add('active');
}

// ==============================================================
// PROCESSAR CADASTRO DE NOVA PEÇA
// ==============================================================
window.processarCadastroPeca = async function() {
    // Validação de acesso (modo visitante)
    if (typeof window.verificarAcesso === 'function' && !window.verificarAcesso()) return;

    const tagInput = document.getElementById('add-tag');
    const tipoSelect = document.getElementById('add-tipo');
    const metaInput = document.getElementById('add-meta');
    const tonInput = document.getElementById('add-ton-atual');
    const posicaoSelect = document.getElementById('add-posicao');
    // 🆕 Data de Entrada + instalação retroativa: cobre o caso da peça já
    // estar fisicamente no Veio há alguns dias sem o sistema ter sido
    // atualizado ainda.
    const dataEntradaInput = document.getElementById('add-data-entrada');
    const jaInstaladaCheckbox = document.getElementById('add-ja-instalada');
    const veioInstalacaoSelect = document.getElementById('add-veio-instalacao');

    if (!tagInput || !tipoSelect || !metaInput) {
        alert("Erro: Elementos do formulário não encontrados no HTML.");
        return;
    }

    const id = tagInput.value.trim().toUpperCase();
    const tipoCompleto = tipoSelect.value; // Ex: "Molde|2/3"
    const meta = parseFloat(metaInput.value) || 0;
    const tonAtual = parseFloat(tonInput?.value) || 0; // 0 = peça nova, sem desgaste
    const posicao = posicaoSelect ? posicaoSelect.value : "";
    const jaInstalada = !!(jaInstaladaCheckbox && jaInstaladaCheckbox.checked);
    const veioInstalacao = veioInstalacaoSelect ? veioInstalacaoSelect.value : "";

    if (!id || !tipoCompleto) {
        alert("Por favor, preencha a TAG e selecione o Tipo de Família.");
        return;
    }

    if (jaInstalada && !veioInstalacao) {
        alert("Selecione em qual Veio a peça já está instalada, ou desmarque a opção 'já instalada'.");
        return;
    }

    // Data de Entrada: se o técnico não preencheu, assume hoje. Vira o
    // timestamp usado por calcularDias() pra calcular "dias em operação"
    // — se for uma data passada (ex: peça já entrou há 5 dias), os dias
    // aparecem certos na hora, sem precisar esperar o tempo passar de
    // fato.
    const dataEntradaStr = dataEntradaInput?.value || "";
    const dataEntradaMs = dataEntradaStr ? new Date(`${dataEntradaStr}T00:00:00`).getTime() : Date.now();
    if (dataEntradaStr && dataEntradaMs > Date.now()) {
        alert("A Data de Entrada não pode ser no futuro.");
        return;
    }

    // Separa o tipo da compatibilidade de MCC (ex: "Molde|2/3" -> tipo: "Molde", mcc: "2/3")
    let tipo = tipoCompleto;
    let mcc_compat = "2/3";
    if (tipoCompleto.includes('|')) {
        const partes = tipoCompleto.split('|');
        tipo = partes[0];
        mcc_compat = partes[1];
    }

    // Valida se a TAG já existe
    if (typeof BANCO_ATIVOS !== 'undefined') {
        const existente = BANCO_ATIVOS.find(a => a.id === id);
        if (existente) {
            alert(`⚠️ Já existe um equipamento cadastrado com a TAG [${id}]!`);
            return;
        }
    }

    // Monta a posição/gaveta específica dessa peça (ex: BOW-3, CAD-SUP-45,
    // SEG-2, HOR-10, ou o valor fixo já vindo do select pros tipos de
    // posição única — MOLDE, BENDER, STR-1, STR-2, SEG-ZERO). Isso é só
    // uma referência de qual vaga a peça foi pensada pra ocupar; o Swap
    // Automático confirma tudo de novo na hora de instalar de verdade.
    const tipoUpper = tipo.toUpperCase();
    let posicaoFixa = posicao;
    if (mcc_compat === "4") {
        if (tipoUpper.includes("BOW") && posicao) posicaoFixa = `BOW-${posicao}`;
        else if (tipoUpper.includes("HORIZONTAL") && posicao) posicaoFixa = `HOR-${posicao}`;
        // 🆕 Oscilador: select já manda "N"/"S" — vira "OSC-N"/"OSC-S",
        // batendo com os slots fixos de gerarSlotsMCC4().
        else if (tipoUpper === "OSCILADOR" && posicao) posicaoFixa = `OSC-${posicao}`;
    } else if (mcc_compat === "2/3") {
        if (tipoUpper.includes("CADEIRA SUPERIOR") && posicao) posicaoFixa = `CAD-SUP-${posicao}`;
        else if (tipoUpper.includes("CADEIRA INFERIOR") && posicao) posicaoFixa = `CAD-INF-${posicao}`;
        else if (tipoUpper.includes("SEGMENTO") && !tipoUpper.includes("ZERO") && posicao) posicaoFixa = `SEG-${posicao}`;
    }

    // 🆕 Se marcado como "já instalada", checa se esse slot (veio +
    // posição) já está ocupado por outro equipamento. Se estiver, saca
    // o equipamento antigo pra "Oficina / Reparo" — igual o Swap
    // Automático (iniciarSwapAlocacao) já faz — em vez de simplesmente
    // bloquear o cadastro. Vale pra qualquer tipo de equipamento (Molde,
    // Bow, Segmento, Cadeira etc.), não só um caso específico.
    let pecaSacada = null;
    if (jaInstalada && posicaoFixa) {
        pecaSacada = BANCO_ATIVOS.find(a =>
            a.status === "Instalado" && a.veio === veioInstalacao && a.posicaoFixa === posicaoFixa
        );
        if (pecaSacada) {
            const confirmar = confirm(
                `⚠️ O slot ${posicaoFixa} do Veio ${veioInstalacao} já está ocupado por ${pecaSacada.id}.\n\n` +
                `Ao confirmar, ${pecaSacada.id} será SACADO desse slot e movido pra Oficina / Reparo, e ${id} entra no lugar dele.\n\nContinuar?`
            );
            if (!confirmar) return;
        }
    }

    if (pecaSacada) {
        pecaSacada.status = "Oficina / Reparo";
        pecaSacada.local = "Oficina / Reparo";
        pecaSacada.veio = "";
        pecaSacada.posicaoFixa = "";
        pecaSacada.pos = "";
        pecaSacada.dataReparo = Date.now();
        pecaSacada.dias = 0;
        pecaSacada.dataEntradaVeio = null;
        pecaSacada.substituidoPor = id;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        if (typeof window.salvarPecaNoPython === 'function') {
            await window.salvarPecaNoPython(pecaSacada);
        }
        if (typeof window.registrarHistorico === 'function') {
            window.registrarHistorico(pecaSacada.id, `🔻 Sacado do Veio ${veioInstalacao} (slot ${posicaoFixa}) — substituído por ${id} no cadastro retroativo.`);
        }
    }

    const novoItem = jaInstalada ? {
        id: id,
        tipo: tipo,
        mcc_compat: mcc_compat,
        meta: meta,
        ton: tonAtual,
        local: `MCC ${mcc_compat} - Veio ${veioInstalacao}`,
        veio: veioInstalacao,
        posicaoFixa: posicaoFixa,
        pos: posicaoFixa || "GERAL",
        status: "Instalado",
        dias: 0, // calcularDias() recalcula pela dataEntradaVeio
        ordem: typeof getOrdemPadrao === 'function' ? getOrdemPadrao(tipo) : 999,
        dataReparo: null,
        dataEntradaVeio: dataEntradaMs,
        substituidoPor: null
    } : {
        id: id,
        tipo: tipo,
        mcc_compat: mcc_compat,
        meta: meta,
        ton: tonAtual,
        local: "Oficina / Reserva",
        veio: "",
        posicaoFixa: posicaoFixa,
        pos: posicaoFixa || "Estoque",
        dias: 0,
        ordem: typeof getOrdemPadrao === 'function' ? getOrdemPadrao(tipo) : 999,
        dataReparo: null,
        dataEntradaVeio: null
    };

    // Adiciona ao array global de ativos
    if (typeof BANCO_ATIVOS !== 'undefined') {
        BANCO_ATIVOS.push(novoItem);
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // Sincroniza com o backend Python (se a função existir)
    if (typeof window.salvarPecaNoPython === 'function') {
        await window.salvarPecaNoPython(novoItem);
    }

    if (typeof window.registrarHistorico === 'function') {
        const rotuloDesgaste = tonAtual > 0 ? ` (cadastrada já com ${tonAtual.toLocaleString('pt-BR')} de desgaste)` : ' (peça nova, sem uso)';
        const dataFormatada = new Date(dataEntradaMs).toLocaleDateString('pt-BR');
        const rotuloSacada = pecaSacada ? ` — ${pecaSacada.id} foi sacado do slot pra Oficina / Reparo` : '';
        const rotuloLocal = jaInstalada
            ? `📦 Peça cadastrada já Instalada no Veio ${veioInstalacao} (entrada em ${dataFormatada})${rotuloDesgaste}${rotuloSacada}.`
            : `📦 Peça cadastrada no Estoque Reserva${rotuloDesgaste}.`;
        window.registrarHistorico(id, rotuloLocal);
    }

    // Atualiza as telas do sistema
    if (typeof window.renderAtivos === 'function') window.renderAtivos();
    if (typeof window.renderReservas === 'function') window.renderReservas();
    if (typeof window.renderReparos === 'function') window.renderReparos();
    if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();

    // Limpa os campos e fecha o formulário
    tagInput.value = '';
    metaInput.value = '';
    if (tonInput) tonInput.value = '';
    tipoSelect.value = '';
    if (dataEntradaInput) dataEntradaInput.value = '';
    if (jaInstaladaCheckbox) jaInstaladaCheckbox.checked = false;
    if (veioInstalacaoSelect) veioInstalacaoSelect.innerHTML = '<option value="">Selecionar veio...</option>';
    if (typeof window.toggleCadastroJaInstalada === 'function') window.toggleCadastroJaInstalada();
    if (typeof window.toggleFormAdicionar === 'function') {
        window.toggleFormAdicionar();
    }

    alert(jaInstalada
        ? `✅ Equipamento [${id}] cadastrado já Instalado no Veio ${veioInstalacao} (entrada retroativa em ${new Date(dataEntradaMs).toLocaleDateString('pt-BR')})!` + (pecaSacada ? `\n\n${pecaSacada.id} foi sacado desse slot e movido pra Oficina / Reparo.` : '')
        : `✅ Equipamento [${id}] cadastrado com sucesso no Estoque Reserva!`);
};

// 🔧 CORREÇÃO CRÍTICA: aqui embaixo existia uma SEGUNDA definição de
// `window.atualizarPosicoesCadastro`, vazia (só um comentário, sem
// código nenhum). Como esse arquivo carrega de cima pra baixo, essa
// segunda definição SOBRESCREVIA a de verdade (lá em cima, perto da
// linha 1582), que é a que auto-preenche a Meta e trava o Veio/Posição
// certos pro tipo escolhido. Na prática, isso zerava TODAS as correções
// feitas ali — o formulário de cadastro nunca rodava essa lógica,
// porque a versão vazia sempre ganhava. Removida.

// ==========================================
// FUNÇÕES PARA O PAINEL TURBINADO (NOVAS)
// ==========================================

function renderizarTopCriticos() {
    const container = document.getElementById('top-criticos-container');
    if (!container) return;
    
    const ativos = BANCO_ATIVOS.filter(a => 
        a.local && a.local.includes('Veio') && !a.local.includes('Oficina')
    );
    
    const ordenados = ativos
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5);
    
    if (ordenados.length === 0) {
        container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px 0;">Nenhum equipamento crítico.</div>';
        return;
    }
    
    container.innerHTML = ordenados.map(a => {
        let mccAba = 'aba-mcc2';
        if (a.mcc_compat === '3') mccAba = 'aba-mcc3';
        else if (a.mcc_compat === '4') mccAba = 'aba-mcc4';
        let veio = 'C';
        const match = a.local?.match(/Veio\s*([A-Z])/i);
        if (match) veio = match[1].toUpperCase();
        const onclick = `window.abrirAba(null, '${mccAba}'); setTimeout(() => { window.mudarVeioVisualizado('${veio}'); }, 200);`;
        
        return `
            <div class="top-critico-item" style="cursor: pointer;" onclick="${onclick}">
                <span class="tag">${a.id}</span>
                <span class="tipo">${a.tipo}</span>
                <span class="porcentagem">${a.pct.toFixed(1)}%</span>
                <span style="font-size: 10px; color: var(--text-muted);">🔗 ${a.mcc_compat ? 'MCC '+a.mcc_compat : ''} · Veio ${veio}</span>
            </div>
        `;
    }).join('');
}
window.renderizarTopCriticos = renderizarTopCriticos;

function atualizarKPIsAvancados() {
    const total = BANCO_ATIVOS.length;
    const totalEl = document.getElementById('kpi-total');
    if (totalEl) totalEl.innerText = total;
    
    const instalados = BANCO_ATIVOS.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina'));
    if (instalados.length > 0) {
        const soma = instalados.reduce((acc, a) => acc + (a.meta > 0 ? (a.ton / a.meta) * 100 : 0), 0);
        const media = (soma / instalados.length);
        const mediaEl = document.getElementById('kpi-media-desgaste');
        if (mediaEl) mediaEl.innerText = media.toFixed(1) + '%';
    } else {
        const mediaEl = document.getElementById('kpi-media-desgaste');
        if (mediaEl) mediaEl.innerText = '0%';
    }
    
    const mediaReparoEl = document.getElementById('kpi-media-reparo');
    const emReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo');
    if (emReparo.length > 0) {
        const somaDias = emReparo.reduce((acc, a) => {
            const dias = calcularDias(a);
            return acc + dias;
        }, 0);
        const mediaDias = Math.round(somaDias / emReparo.length);
        if (mediaReparoEl) mediaReparoEl.innerText = mediaDias + ' dias';
    } else {
        if (mediaReparoEl) mediaReparoEl.innerText = '0 dias';
    }

    const dispEl = document.getElementById('kpi-disponibilidade');
    if (dispEl) {
        const totalAtivos = BANCO_ATIVOS.length;
        const emReparoCount = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo').length;
        const disponibilidade = totalAtivos > 0 ? ((totalAtivos - emReparoCount) / totalAtivos) * 100 : 0;
        dispEl.innerText = disponibilidade.toFixed(1) + '%';
    }
}
window.atualizarKPIsAvancados = atualizarKPIsAvancados;
// (Painel do Técnico agora vive em Oficina/painelTecnico.js)
// (Administração de Colaboradores agora vive em Paineis/colaboradores.js)

