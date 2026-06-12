// =========================================================================
// TOPO CORRIGIDO DO script.js
// =========================================================================

import { 
    MOTIVOS_RETIRO, 
    CHECKLIST_RECEBIMENTO, 
    CHECKLIST_REVISAO, 
    CHECKLIST_HIDRAULICA, 
    CHECKLIST_FINAL 
} from './dados.js';

import { carregarTema, toggleTheme } from './tema.js';
import { abrirFolhaoMCC4 } from './folhao.js';

import { 
    BANCO_ATIVOS, 
    HISTORICO_ACOES, 
    BANCO_ROLOS, 
    BANCO_MATERIAIS, 
    EM_EMERGENCIA, 
    OPERADOR_LOGADO,
    VEIO_SELECIONADO_PAINEL,
    CADASTRO_MATRICULAS,
    setOperador,           
    setEmergencia,         
    setVeioSelecionado
} from './banco.js';

// IMPORT DO UI.JS CORRIGIDO E COMPLETO COM TODAS AS 9 FUNÇÕES!
import { 
    renderPainelVeios, 
    renderAtivos, 
    renderReparos, 
    renderReservas, 
    renderRolos, 
    renderMateriais,
    toggleSidebar,
    aplicarFiltrosMCC,      // <-- ESSENCIAL PARA OS GRÁFICOS
    renderizarGraficosMCC   // <-- ESSENCIAL PARA OS GRÁFICOS
} from './ui.js';

let MODO_MODAL_RELATORIO = {};
let ID_REPARO_ATUAL = null;
let ID_HISTORICO_ATUAL = null; 
// ==========================================
// AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================
function processarAutenticacaoHome() {
    const nomeInput = document.getElementById("login-nome").value.trim();
    const matriculaInput = document.getElementById("login-matricula").value.trim();

    if (!nomeInput || !matriculaInput) return alert("Preencha todos os campos.");

    if (CADASTRO_MATRICULAS[matriculaInput]) {
        // Usando a chave de acesso em vez do sinal de igual!
        setOperador({ matricula: matriculaInput, nome: `${nomeInput} [${CADASTRO_MATRICULAS[matriculaInput]}]` });
        localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
        
        document.getElementById("tela-login-home").style.display = "none";
        document.getElementById("container-sistema-oms").style.display = "flex";

        atualizarInterfaceUsuario();
        registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
        calcularKpisGlobais();
        renderPainelVeios();
        renderAtivos();
        renderReparos();
        renderReservas();
        renderRolos();
        renderMateriais(); 
    } else {
        alert("Falha: Matrícula não localizada.");
    }
}

function fazerLogout() {
    if (confirm("Encerrar o turno?")) {
        registrarHistorico("SISTEMA", "Turno encerrado.");
        setOperador(null); // <-- Chave de acesso!
        localStorage.removeItem("oms_operador_v32_local");
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
    }
}

function verificarAcesso() {
    if (!OPERADOR_LOGADO) {
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
        return false;
    }
    return true;
}

function abrirAba(event, idAba) {
    if (event) event.preventDefault();

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    if (event) {
        document.getElementById(event.currentTarget.id).classList.add("active");
    }
    document.getElementById(idAba).classList.add("active");

    if (idAba === "aba-mcc2") renderizarGraficosMCC(2);
    if (idAba === "aba-mcc3") renderizarGraficosMCC(3);
    if (idAba === "aba-mcc4") renderizarGraficosMCC(4);
    if (idAba === "aba-reparos") renderReparos();
    if (idAba === "aba-reservas") renderReservas();
    if (idAba === "aba-rolos") renderRolos();
    if (idAba === "aba-almoxarifado") renderMateriais(); 
    if (idAba === "aba-historico") renderHistorico();

    const selVeios = document.getElementById("seletor-veios-container");
    if (idAba === "aba-fluxo" || idAba === "aba-ativos") {
        selVeios.classList.remove("hidden");
    } else {
        selVeios.classList.add("hidden");
    }

    if (window.innerWidth <= 992) {
        document.getElementById('sidebar-menu').classList.remove('open');
    }
}

function mudarVeioVisualizado(veioNome) {
    setVeioSelecionado(veioNome); // <-- Chave de acesso!
    document.querySelectorAll(".btn-veio-tab").forEach(btn => {
        if (btn.getAttribute("onclick").includes(`'${veioNome}'`)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    renderPainelVeios();
    renderAtivos();
}

// ==========================================
// HISTÓRICO E AUDITORIA
// ==========================================
function registrarHistorico(tag, acao) {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');

    HISTORICO_ACOES.unshift({
        data: data,
        tag: tag,
        acao: acao,
        responsavel: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema"
    });

    if (HISTORICO_ACOES.length > 2000) {
        HISTORICO_ACOES.pop();
    }

    localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
    renderHistorico();
}

function renderHistorico() {
    const tbody = document.getElementById("historico-table-body");
    if (!tbody) return;

    tbody.innerHTML = HISTORICO_ACOES.map(h => `
        <tr>
            <td><small class="text-muted">${h.data}</small></td>
            <td><span class="ind-card-tag bg-tag">${h.tag}</span></td>
            <td style="color: var(--text-main);">${h.acao}</td>
            <td><small class="text-muted">${h.responsavel}</small></td>
        </tr>
    `).join("");
}

function atualizarInterfaceUsuario() {
    document.getElementById("nome-operador-logado").innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
    renderHistorico();
}

function calcularKpisGlobais() {
    let criticos = 0, reparo = 0, reserva = 0;

    BANCO_ATIVOS.forEach(a => {
        const pct = (a.ton / a.meta) * 100;
        if (pct >= 80 && !a.local.includes("Oficina")) {
            criticos++;
        }
        if (a.local === "Oficina / Reparo") {
            reparo++;
        }
        if (a.local === "Oficina / Reserva") {
            reserva++;
        }
    });

    document.getElementById("kpi-criticos").innerText = criticos;
    document.getElementById("kpi-reparo").innerText = reparo;
    document.getElementById("kpi-reserva").innerText = reserva;
}

// ==========================================
// INTEGRAÇÃO COM O FOLHÃO MCC4 (NOVO!)
// ==========================================
function registrarConclusaoFolhaoMCC4(id, motivo) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    // Como passou pelo Folhão Oficial, zera a tonelagem e move para Reserva
    item.ton = 0;
    item.dias = 0;
    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    // Cria um botão injetado no texto do histórico para reabrir o PDF
    let btnPDF = `<button onclick="imprimirLaudoSalvo('${id}', '${motivo}')" class="btn-outline-danger" style="padding: 2px 8px; font-size: 10px; margin-left: 10px; cursor: pointer;"><i class="fas fa-file-pdf"></i> Visualizar Folhão</button>`;
    
    // Registra a ação no prontuário da peça e no histórico geral
    registrarHistorico(id, `Laudo Oficial (Folhão MCC4) concluído. Motivo: ${motivo}. <br><div style="margin-top: 5px;">${btnPDF}</div>`);
    
    renderReparos();
    renderReservas();
    renderAtivos();
    calcularKpisGlobais();
}

// ==========================================
// RENDERIZAÇÃO DE DADOS VEIOS E ATIVOS
// ==========================================
function fazerCelulaEditavel(celula, id, campo) {
    if (!verificarAcesso() || celula.querySelector("input")) {
        return;
    }
    
    const original = celula.innerText.trim();
    const input = document.createElement("input");
    input.type = campo === 'id' ? "text" : "number";
    input.value = original.replace(/\./g, "");
    input.className = "edit-input";
    
    celula.innerHTML = "";
    celula.appendChild(input);
    input.focus();

    input.addEventListener("blur", () => {
        let val = campo === 'id' ? input.value.trim().toUpperCase() : parseFloat(input.value) || 0;
        let item = BANCO_ATIVOS.find(a => a.id === id);
        
        if (item && val !== "") {
            let ant = item[campo];
            item[campo] = val;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
            registrarHistorico(id, `Editou ${campo} de ${ant} p/ ${val}`);
        }
        
        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
        renderReparos();
        renderReservas();
    });
}

// ==========================================
// PRONTUÁRIO INDIVIDUAL (MODAL)
// ==========================================
function abrirHistoricoIndividual(id) {
    ID_HISTORICO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    document.getElementById("hist-tag-nome").innerText = item.id;
    document.getElementById("hist-tag-local").innerText = item.local;
    
    renderizarTabelaHistoricoIndividual(id);
    document.getElementById("modal-historico-ativo").classList.remove("hidden");
}   

function fecharModalHistorico() {
    document.getElementById("modal-historico-ativo").classList.add("hidden");
    ID_HISTORICO_ATUAL = null;
    document.getElementById("input-nota-manual").value = "";
}

function renderizarTabelaHistoricoIndividual(id) {
    let tbody = document.getElementById("tabela-historico-individual");
    let historicoFiltrado = HISTORICO_ACOES.filter(h => h.tag === id || h.acao.includes(id));

    if (historicoFiltrado.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = historicoFiltrado.map(h => `
        <tr>
            <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${h.data}</td>
            <td style="font-size: 13px; color: var(--text-main);">${h.acao}</td>
            <td style="font-size: 11px; color: var(--text-accent);">${h.responsavel}</td>
        </tr>
    `).join("");
}

function salvarRegistroManual() {
    if (!verificarAcesso() || !ID_HISTORICO_ATUAL) return;

    const nota = document.getElementById("input-nota-manual").value.trim();
    if (!nota) {
        return alert("Escreva algo para registrar.");
    }

    registrarHistorico(ID_HISTORICO_ATUAL, `<span style="color:var(--text-accent);">[REGISTRO MANUAL]</span> ${nota}`);
    document.getElementById("input-nota-manual").value = "";
    renderizarTabelaHistoricoIndividual(ID_HISTORICO_ATUAL);
}

// ==========================================
// SAQUE, REPARO E SWAP (FLUXO PRINCIPAL)
// ==========================================
function abrirModalRelatorio(item) {
    document.getElementById('modal-tag').innerText = item.id;
    
    let select = document.getElementById('modal-motivo');
    let motivos = MOTIVOS_RETIRO[item.tipo] || MOTIVOS_RETIRO["Outros"];
    select.innerHTML = motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('modal-condicao').value = '';
    document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() {
    document.getElementById('modal-relatorio').classList.add('hidden');
    MODO_MODAL_RELATORIO = {};
}

function iniciarSaque(id) {
    if (!verificarAcesso()) return;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    MODO_MODAL_RELATORIO = { tipoAcao: 'SAQUE', idSacado: id };
    abrirModalRelatorio(item);
}

function confirmarRelatorio() {
    let motivo = document.getElementById('modal-motivo').value;
    let condicao = document.getElementById('modal-condicao').value.trim();

    if (!condicao) {
        return alert("Por favor, descreva como o equipamento chegou na oficina (Laudo Visual).");
    }

    let textoLaudo = `<br><span style="color:var(--warning); font-size:12px;"><strong>Motivo:</strong> ${motivo} | <strong>Condição:</strong> ${condicao}</span>`;

    if (MODO_MODAL_RELATORIO.tipoAcao === 'SAQUE') {
        executarSaqueFinal(MODO_MODAL_RELATORIO.idSacado, textoLaudo);
    } else if (MODO_MODAL_RELATORIO.tipoAcao === 'SWAP') {
        executarSwapFinal(MODO_MODAL_RELATORIO.idReserva, MODO_MODAL_RELATORIO.idSacado, MODO_MODAL_RELATORIO.localDestino, textoLaudo);
    }

    fecharModalRelatorio();
}

function executarSaqueFinal(id, laudo) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
        let loc = item.local;
        item.local = "Oficina / Reparo";
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        registrarHistorico(id, `Sacado da linha (${loc}) p/ Reparo. ${laudo}`);
        
        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
        renderReparos();
        renderReservas();
    }
}
function iniciarSwapAlocacao(idReserva) {
    if (!verificarAcesso()) return;

    const novoLocal = document.getElementById(`alocar-veio-${idReserva}`).value;
    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);

    if (pecaReserva) {
        let pecaAntiga = BANCO_ATIVOS.find(a => a.local === novoLocal && a.tipo === pecaReserva.tipo);
        if (pecaAntiga) {
            if (confirm(`A peça ${pecaAntiga.id} será SACADA do ${novoLocal} para dar lugar à ${pecaReserva.id}. Precisamos do relatório de retirada.`)) {
                MODO_MODAL_RELATORIO = { tipoAcao: 'SWAP', idSacado: pecaAntiga.id, idReserva: pecaReserva.id, localDestino: novoLocal };
                abrirModalRelatorio(pecaAntiga);
            }
        } else {
            if (confirm(`Instalar a reserva ${pecaReserva.id} no ${novoLocal}?`)) {
                pecaReserva.local = novoLocal;
                pecaReserva.pos = "Componente Instalado";
                pecaReserva.ordem = getOrdemPadrao(pecaReserva.tipo);

                localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
                registrarHistorico(pecaReserva.id, `Alocado no ${novoLocal}.`);

                renderReparos();
                renderReservas();
                renderAtivos();
                renderPainelVeios();
                calcularKpisGlobais();
            }
        }
    }
}

function executarSwapFinal(idReserva, idAntiga, novoLocal, laudo) {
    let pecaAntiga = BANCO_ATIVOS.find(a => a.id === idAntiga);
    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);

    if (pecaAntiga && pecaReserva) {
        pecaAntiga.local = "Oficina / Reparo";
        registrarHistorico(pecaAntiga.id, `Sacado do ${novoLocal} (Substituição). ${laudo}`);

        pecaReserva.local = novoLocal;
        pecaReserva.pos = pecaAntiga.pos;
        pecaReserva.ordem = pecaAntiga.ordem;

        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        registrarHistorico(pecaReserva.id, `Alocado no ${novoLocal} substituindo ${pecaAntiga.id}.`);

        renderReparos();
        renderReservas();
        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
    }
}

// ==========================================
// INTERCEPTAÇÃO: REPARO SIMPLES VS FOLHÃO MCC4
// ==========================================
function abrirModalConcluirReparo(id) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    // Agora qualquer equipamento da família 4 vai abrir o Folhão inteligente!
    if (item.mcc_compat.includes("4")) {
        abrirFolhaoMCC4(id); 
    } else {
        ID_REPARO_ATUAL = id;
        document.getElementById("modal-reparo-tag").innerText = item.id;
        document.getElementById("modal-tipo-reparo").value = "GERAL";
        document.getElementById("modal-reparo-ton").value = Math.round(item.ton);
        document.getElementById("modal-reparo-dias").value = item.dias;
        
        toggleCamposReparoParcial();
        document.getElementById("modal-concluir-reparo").classList.remove("hidden");
    }
}

function fecharModalConcluirReparo() {
    document.getElementById("modal-concluir-reparo").classList.add("hidden");
    ID_REPARO_ATUAL = null;
}

function toggleCamposReparoParcial() {
    const tipo = document.getElementById("modal-tipo-reparo").value;
    const divCampos = document.getElementById("campos-reparo-parcial");
    
    if (tipo === "PARCIAL") {
        divCampos.classList.remove("hidden");
    } else {
        divCampos.classList.add("hidden");
    }
}

window.confirmarConclusaoReparo = function() {
    if (!verificarAcesso() || !ID_REPARO_ATUAL) return;
    let item = BANCO_ATIVOS.find(a => a.id === ID_REPARO_ATUAL);
    if (!item) return;

    const tipo = document.getElementById("modal-tipo-reparo").value;
    let msgHistorico = "";

    if (tipo === "GERAL") {
        item.ton = 0;
        item.dias = 0;
        msgHistorico = "Reparo GERAL finalizado. Tonelagem zerada.";
    } else {
        let novaTon = parseFloat(document.getElementById("modal-reparo-ton").value) || 0;
        let novosDias = parseFloat(document.getElementById("modal-reparo-dias").value) || 0;
        item.ton = novaTon;
        item.dias = novosDias;
        msgHistorico = `Reparo PARCIAL finalizado. Retorna com ${novaTon}t e ${novosDias} dias.`;
    }

    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    registrarHistorico(item.id, msgHistorico);
    
    // Fecha o modal de conclusão
    fecharModalConcluirReparo();
    renderReparos();
    renderReservas();
    renderAtivos();
    calcularKpisGlobais();

    // ==========================================
    // ABRE O LAUDO GIGANTE CORRETO AUTOMATICAMENTE
    // ==========================================
    let tagEmReparo = item.id.toUpperCase();

    // Esconde os modais anteriores
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

    if (tagEmReparo.includes("HOR") || tagEmReparo.includes("SEG")) {
        // Se for o Horizontal, atualiza o nome e abre o Folhão Horizontal
        document.getElementById('horizontal-tag-name').innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoHorizontal === "function") abrirFolhaoHorizontal();
        
    } else if (tagEmReparo.includes("R2") || tagEmReparo.includes("STR")) {
        // Se for o R2, atualiza o nome e abre o Folhão do R2
        document.getElementById('r2-tag-name').innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoR2 === "function") abrirFolhaoR2();
        
    } else if (tagEmReparo.includes("MOLDE") || tagEmReparo.includes("MLD")) {
        // Se for o Molde, atualiza o nome e abre o Folhão do Molde
        document.getElementById('mcc4-tag-name').innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoMCC4 === "function") abrirFolhaoMCC4();
    }
}

function imprimirLaudoSalvo(tag, motivo) {
    const printDiv = document.getElementById("print-content");
    let materiais = document.getElementById("materiais-utilizados-texto") ? document.getElementById("materiais-utilizados-texto").value : "";
    
    // Constrói HTML Multi-Largura para Folga de Aresta
    let htmlFolgas = "";
    let largurasPreenchidas = Object.keys(DADOS_FOLGA_ARESTA);
    
    if(largurasPreenchidas.length === 0) {
        htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida de folga registrada.</td></tr>";
    } else {
        largurasPreenchidas.forEach(larg => {
            let d = DADOS_FOLGA_ARESTA[larg];
            // Só imprime se pelo menos um campo tiver sido preenchido
            if(d.ec || d.em || d.ei || d.ech || d.dc || d.dm || d.di || d.dch) {
                htmlFolgas += `
                    <tr style="background:#ddd; font-weight:bold;">
                        <td colspan="3" style="text-align:center; padding: 4px;">LARGURA ${larg}</td>
                    </tr>
                    <tr><td>Superior (Cima)</td><td>${d.ec || '-'}</td><td>${d.dc || '-'}</td></tr>
                    <tr><td>Central (Meio)</td><td>${d.em || '-'}</td><td>${d.dm || '-'}</td></tr>
                    <tr><td>Inferior</td><td>${d.ei || '-'}</td><td>${d.di || '-'}</td></tr>
                    <tr><td>Ajuste Chavetas</td><td>${d.ech || '-'}</td><td>${d.dch || '-'}</td></tr>
                `;
            }
        });
        if(htmlFolgas === "") {
            htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida preenchida.</td></tr>";
        }
    }

    // Geração da Tabela de Termopares LARGAS
    let tableTermoLargas = "";
    for(let i=1; i<=12; i++) {
        tableTermoLargas += `<tr><td>Termopar ${i} (10-20 Ω)</td><td>${getV(`t-fix-${i}`)}</td><td>${getV(`t-mov-${i}`)}</td></tr>`;
    }
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV(`t-fix-p1`)}</td><td>${getV(`t-mov-p1`)}</td></tr>`;
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 2</td><td>${getV(`t-fix-p2`)}</td><td>${getV(`t-mov-p2`)}</td></tr>`;

    // Geração da Tabela de Termopares ESTREITAS
    let tableTermoEstreitas = "";
    for(let i=1; i<=3; i++) {
        tableTermoEstreitas += `<tr><td>Termopar ${i} (5-15 Ω)</td><td>${getV(`t-esq-${i}`)}</td><td>${getV(`t-dir-${i}`)}</td></tr>`;
    }
    tableTermoEstreitas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV(`t-esq-p1`)}</td><td>${getV(`t-dir-p1`)}</td></tr>`;
    tableTermoEstreitas += `<tr style="background:#eee"><td>Positivo 2</td><td>${getV(`t-esq-p2`)}</td><td>${getV(`t-dir-p2`)}</td></tr>`;

    // O CABEÇALHO OFICIAL DA CSN E TODAS AS TABELAS
    let html = `
        <div style="border: 3px solid #000; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif;">
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 2px;">CSN</div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 5px;">FOLHA DE LIBERAÇÃO DE MOLDE (MCC4)</div>
                <div style="font-size: 14px;">Laudo Oficial de Manutenção e Peritagem</div>
            </div>
            <div style="font-size: 13px; text-align: right; line-height: 1.5;">
                <div><strong>DATA INÍCIO:</strong> ${getV('mcc4-data-inicio') || new Date().toLocaleDateString('pt-BR')}</div>
                <div><strong>DATA FIM:</strong> ${getV('mcc4-data-fim') || new Date().toLocaleDateString('pt-BR')}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 20px; font-family: Arial, sans-serif;">
            <div style="padding: 5px; border-right: 1px solid #000; border-bottom: 1px solid #000;"><strong>MOLDE:</strong> ${tag}</div>
            <div style="padding: 5px; border-bottom: 1px solid #000;"><strong>MOTIVO:</strong> ${motivo}</div>
            <div style="padding: 5px; border-right: 1px solid #000;"><strong>TIPO EXECUÇÃO:</strong> ${getV('mcc4-tipo-execucao')}</div>
            <div style="padding: 5px;"><strong>LÍDER/RESPONSÁVEL:</strong> ${OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : ''}</div>
        </div>

        <div class="print-section-title">1. Relatório de Folgas de Aresta</div>
        <table class="print-table">
            <thead>
                <tr><th>Posição de Medição</th><th>Placa Esquerda (Tol: 0.25)</th><th>Placa Direita (Tol: 0.25)</th></tr>
            </thead>
            <tbody>
                ${htmlFolgas}
            </tbody>
        </table>

        <div class="print-section-title" style="page-break-before: always;">2. Isolamento dos Sensores de Nível (>10 MΩ)</div>
        <table class="print-table">
            <thead>
                <tr><th>Pinos Conectores</th><th>Valor Lido</th><th>Pinos Conectores</th><th>Valor Lido</th></tr>
            </thead>
            <tbody>
                <tr><td>5 e 6</td><td>${getV('iso-5-6')}</td><td>6 e 10</td><td>${getV('iso-6-10')}</td></tr>
                <tr><td>5 e 8</td><td>${getV('iso-5-8')}</td><td>6 e 15</td><td>${getV('iso-6-15')}</td></tr>
                <tr><td>5 e 10</td><td>${getV('iso-5-10')}</td><td>8 e 10</td><td>${getV('iso-8-10')}</td></tr>
                <tr><td>5 e 15</td><td>${getV('iso-5-15')}</td><td>8 e 15</td><td>${getV('iso-8-15')}</td></tr>
                <tr><td>6 e 8</td><td>${getV('iso-6-8')}</td><td>10 e 15</td><td>${getV('iso-10-15')}</td></tr>
            </tbody>
        </table>

        <div class="print-section-title">3. Resistência Placas LARGAS</div>
        <table class="print-table">
            <thead>
                <tr><th>Elemento</th><th>Fixa (Ω)</th><th>Móvel (Ω)</th></tr>
            </thead>
            <tbody>
                ${tableTermoLargas}
            </tbody>
        </table>

        <div class="print-section-title">4. Resistência Placas ESTREITAS</div>
        <table class="print-table">
            <thead>
                <tr><th>Elemento</th><th>Esquerda (Ω)</th><th>Direita (Ω)</th></tr>
            </thead>
            <tbody>
                ${tableTermoEstreitas}
            </tbody>
        </table>

        <div class="print-section-title" style="page-break-before: always;">5. Checklists de Inspeção Oficial</div>
        
        <table class="print-table">
            <thead>
                <tr><th colspan="3" style="background:#ddd">INSPEÇÃO DE RECEBIMENTO MECÂNICA/ELÉTRICA</th></tr>
                <tr><th>Item</th><th>Descrição do Serviço</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${gerarLinhasChecklistPDF(CHECKLIST_RECEBIMENTO, "rec")}
            </tbody>
        </table>

        <table class="print-table">
            <thead>
                <tr><th colspan="3" style="background:#ddd">REVISÃO DOS COMPONENTES DO MOLDE</th></tr>
                <tr><th>Item</th><th>Descrição do Serviço</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${gerarLinhasChecklistPDF(CHECKLIST_REVISAO, "rev")}
            </tbody>
        </table>

        <table class="print-table">
            <thead>
                <tr><th colspan="3" style="background:#ddd">CHECK LIST HIDRÁULICO</th></tr>
                <tr><th>Item</th><th>Descrição do Serviço</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${gerarLinhasChecklistPDF(CHECKLIST_HIDRAULICA, "hid")}
            </tbody>
        </table>

        <table class="print-table" style="page-break-before: always;">
            <thead>
                <tr><th colspan="3" style="background:#ddd">INSPEÇÃO FINAL DE LIBERAÇÃO</th></tr>
                <tr><th>Item</th><th>Descrição do Serviço</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${gerarLinhasChecklistPDF(CHECKLIST_FINAL, "fin")}
            </tbody>
        </table>

        <div class="print-section-title">6. Relação de Materiais Utilizados</div>
        <div style="border: 1px solid #000; padding: 10px; font-size: 12px; min-height: 80px;">
            ${materiais ? materiais.replace(/\n/g, "<br>") : 'Nenhum material listado.'}
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center;">
            <div>
                <p>___________________________________</p>
                <p>Líder Responsável / Operador</p>
            </div>
            <div>
                <p>___________________________________</p>
                <p>Inspetor de Qualidade</p>
            </div>
        </div>
    `;
    
    printDiv.innerHTML = html;
    window.print();
}

// ==========================================
// CADASTRO DE NOVAS PEÇAS (ESTOQUE)
// ==========================================
function toggleFormAdicionar() {
    document.getElementById("form-novo-equipamento").classList.toggle("hidden");
}

function salvarNovoEquipamento() {
    if (!verificarAcesso()) return;
    
    const tag = document.getElementById("add-tag").value.trim().toUpperCase();
    const valorCompleto = document.getElementById("add-tipo").value;
    const meta = parseFloat(document.getElementById("add-meta").value);

    if (!tag || !meta) {
        return alert("Preencha TAG e Meta.");
    }
    
    if (BANCO_ATIVOS.find(a => a.id === tag)) {
        return alert("TAG já cadastrada.");
    }

    const [tipo, mcc_compat] = valorCompleto.split("|");
    
    BANCO_ATIVOS.push({
        id: tag,
        tipo: tipo,
        local: "Oficina / Reserva",
        pos: "Estoque",
        dias: 0,
        ton: 0,
        meta: meta,
        ordem: getOrdemPadrao(tipo),
        mcc_compat: mcc_compat
    });

    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    registrarHistorico(tag, `Peça nova (${tipo} MCC ${mcc_compat}) cadastrada.`);

    document.getElementById("add-tag").value = "";
    document.getElementById("add-meta").value = "";
    
    toggleFormAdicionar();
    renderReservas();
    calcularKpisGlobais();
    renderAtivos();
}

function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    
    if (rolo) {
        if (rolo.qtd + fator < 0) {
            return alert("O saldo em estoque não pode ser negativo.");
        }
        
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        
        registrarHistorico("ALMOXARIFADO", `Ajuste de estoque do rolo [${rolo.nome}]. Novo saldo: ${rolo.qtd} Pçs.`);
        renderRolos();
    }
}

function ajustarSaldoMaterial(codigo, fator) {
    if (!verificarAcesso()) return;
    
    let material = BANCO_MATERIAIS.find(m => m.codigo === codigo);
    
    if (material) {
        if (material.qtd + fator < 0) {
            return alert("O estoque não pode ficar negativo.");
        }
        
        material.qtd += fator;
        localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
        
        let acao = fator > 0 ? "Entrada" : "Saída";
        registrarHistorico("ALMOXARIFADO", `Ajuste manual (${acao}) no material [${codigo}]. Novo saldo: ${material.qtd} UN.`);
        renderMateriais();
    }
}

function toggleFormMaterial() {
    document.getElementById("form-novo-material").classList.toggle("hidden");
}

function salvarEntradaMaterial() {
    if (!verificarAcesso()) return;
    
    const codigo = document.getElementById("mat-codigo").value.trim().toUpperCase();
    const descricao = document.getElementById("mat-descricao").value.trim().toUpperCase();
    const qtd = parseInt(document.getElementById("mat-qtd").value);

    if (!codigo || !descricao || isNaN(qtd) || qtd <= 0) {
        return alert("Preencha todos os campos corretamente com uma quantidade válida.");
    }

    let materialExistente = BANCO_MATERIAIS.find(m => m.codigo === codigo);

    if (materialExistente) {
        materialExistente.qtd += qtd;
        registrarHistorico("ALMOXARIFADO", `Adicionadas ${qtd} UN ao material existente [${codigo}].`);
    } else {
        BANCO_MATERIAIS.push({ codigo: codigo, descricao: descricao, qtd: qtd });
        registrarHistorico("ALMOXARIFADO", `Novo material [${codigo}] cadastrado com ${qtd} UN.`);
    }

    localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
    
    document.getElementById("mat-codigo").value = "";
    document.getElementById("mat-descricao").value = "";
    document.getElementById("mat-qtd").value = "";
    
    toggleFormMaterial();
    renderMateriais();
}

function removerMaterial(codigo) {
    if (!verificarAcesso()) return;
    
    if (confirm(`Atenção!\nTem certeza que deseja apagar o registro do material [${codigo}] do sistema?`)) {
        // Encontra a posição do material e remove diretamente da lista compartilhada
        const index = BANCO_MATERIAIS.findIndex(m => m.codigo === codigo);
        if (index !== -1) {
            BANCO_MATERIAIS.splice(index, 1);
        }
        
        localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
        
        registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`);
        renderMateriais();
    }
}

// ==========================================
// SEGURANÇA (PÂNICO) E INICIALIZAÇÃO
// ==========================================
function dispararEmergencia() {
    setEmergencia(`⚠️ ALERTA PANICO - INTERVENÇÃO FORÇADA`); // <-- Chave de acesso!
    localStorage.setItem("oms_emergencia_v32_local", JSON.stringify(EM_EMERGENCIA));
    registrarHistorico("ALERTA", "Botão de Pânico acionado.");
    exibirBarraEmergencia();
}

function encerrarEmergencia() {
    setEmergencia(null); // <-- Chave de acesso!
    localStorage.removeItem("oms_emergencia_v32_local");
    document.getElementById("barra-emergencia").style.display = "none";
    registrarHistorico("ALERTA", "Alarme resetado.");
}

function exibirBarraEmergencia() {
    if (EM_EMERGENCIA) {
        document.getElementById("texto-emergencia").innerText = EM_EMERGENCIA;
        document.getElementById("barra-emergencia").style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarTema();
    exibirBarraEmergencia();
    
    if (OPERADOR_LOGADO) {
        document.getElementById("tela-login-home").style.display = "none";
        document.getElementById("container-sistema-oms").style.display = "flex";
        
        atualizarInterfaceUsuario();
        calcularKpisGlobais();
        renderPainelVeios();
        renderAtivos();
        renderReparos();
        renderReservas();
        renderRolos();
        renderMateriais(); 
    }
});

// Função auxiliar para ordenar as peças corretamente no fluxo visual
function getOrdemPadrao(tipo) {
    const ordens = {
        "Molde": 10,
        "Mesa Osciladora": 20,
        "Seguimento Zero": 30,
        "Bender": 40,
        "Bow": 300,
        "Straightener": 400,
        "Horizontal": 500,
        "Cadeira Superior": 100,
        "Cadeira Inferior": 200
    };
    return ordens[tipo] || 999;
}

function excluirEquipamento(id) {
    if (!verificarAcesso()) return;

    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    // Bloqueio de segurança: impede apagar peça que está instalada na máquina
    if (item.local.includes("Veio")) {
        return alert("Bloqueado: Não é possível excluir uma peça que está rodando no Veio. Faça o saque dela para a Oficina primeiro.");
    }

    if (confirm(`ATENÇÃO!\nTem certeza que deseja EXCLUIR DEFINITIVAMENTE o equipamento [${id}] do sistema?`)) {
        // Encontra onde ele está na lista e corta ele fora
        const index = BANCO_ATIVOS.findIndex(a => a.id === id);
        if (index > -1) {
            BANCO_ATIVOS.splice(index, 1);
            
            // Salva a lista nova e registra a ação
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
            registrarHistorico("SISTEMA", `Equipamento [${id}] excluído do cadastro.`);
            
            // Atualiza as tabelas
            renderAtivos();
            renderReservas();
            renderReparos();
            calcularKpisGlobais();
        }
    }
}

// ==========================================
// LIBERAÇÃO DE FUNÇÕES PARA O HTML (PERMISSÕES)
// ==========================================
// 1. Navegação e UI
window.toggleTheme = toggleTheme;
window.processarAutenticacaoHome = processarAutenticacaoHome;
window.fazerLogout = fazerLogout;
window.abrirAba = abrirAba;
window.mudarVeioVisualizado = mudarVeioVisualizado;
window.toggleSidebar = toggleSidebar;
window.aplicarFiltrosMCC = aplicarFiltrosMCC;

// 2. Ações de Edição, Saque e Reparo
window.fazerCelulaEditavel = fazerCelulaEditavel;
window.abrirHistoricoIndividual = abrirHistoricoIndividual;
window.fecharModalHistorico = fecharModalHistorico;
window.salvarRegistroManual = salvarRegistroManual;
window.iniciarSaque = iniciarSaque;
window.fecharModalRelatorio = fecharModalRelatorio;
window.confirmarRelatorio = confirmarRelatorio;
window.iniciarSwapAlocacao = iniciarSwapAlocacao;
window.abrirModalConcluirReparo = abrirModalConcluirReparo;
window.fecharModalConcluirReparo = fecharModalConcluirReparo;
window.toggleCamposReparoParcial = toggleCamposReparoParcial;
window.confirmarConclusaoReparo = confirmarConclusaoReparo;

// 3. Estoque e Almoxarifado
window.toggleFormAdicionar = toggleFormAdicionar;
window.salvarNovoEquipamento = salvarNovoEquipamento;
window.excluirEquipamento = excluirEquipamento;
window.alterarSaldoRolo = alterarSaldoRolo;
window.ajustarSaldoMaterial = ajustarSaldoMaterial;
window.removerMaterial = removerMaterial;

// 4. Segurança e Integrações
window.dispararEmergencia = dispararEmergencia;
window.encerrarEmergencia = encerrarEmergencia;
window.verificarAcesso = verificarAcesso;
window.registrarHistorico = registrarHistorico;
window.calcularKpisGlobais = calcularKpisGlobais;
window.toggleFormMaterial = toggleFormMaterial;
window.salvarEntradaMaterial = salvarEntradaMaterial;

// 5. Integração Folhão (NOVO)
window.registrarConclusaoFolhaoMCC4 = registrarConclusaoFolhaoMCC4;
// ==============================================================
// FUNÇÃO PARA CONCLUIR O REPARO E ABRIR O PDF AUTOMATICAMENTE
// ==============================================================
window.confirmarConclusaoReparo = function() {
    // 1. Verifica qual a peça que está a ser reparada
    if (!ID_REPARO_ATUAL) return;
    let item = BANCO_ATIVOS.find(a => a.id === ID_REPARO_ATUAL);
    if (!item) return;

    // 2. Fecha a janela pequena de conclusão imediatamente
    const modalPequeno = document.getElementById('modal-concluir-reparo');
    if (modalPequeno) modalPequeno.classList.add('hidden');

    // 3. Atualiza os dias e as toneladas
    const tipo = document.getElementById("modal-tipo-reparo").value;
    let msgHistorico = "";

    if (tipo === "GERAL") {
        item.ton = 0;
        item.dias = 0;
        msgHistorico = "Reparo GERAL finalizado.";
    } else {
        item.ton = parseFloat(document.getElementById("modal-reparo-ton").value) || 0;
        item.dias = parseFloat(document.getElementById("modal-reparo-dias").value) || 0;
        msgHistorico = "Reparo PARCIAL finalizado.";
    }

    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    if (typeof registrarHistorico === "function") registrarHistorico(item.id, msgHistorico);
    
    // 4. Atualiza as tabelas de fundo
    if (typeof renderReparos === "function") renderReparos();
    if (typeof renderReservas === "function") renderReservas();
    if (typeof renderAtivos === "function") renderAtivos();

    // ==========================================
    // 5. ABRE O LAUDO GIGANTE CORRETO 
    // ==========================================
    let tagEmReparo = item.id.toUpperCase();

    // Esconde qualquer outra janela para não encravar o ecrã
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

    // Verifica a TAG e abre a janela certa
    if (tagEmReparo.includes("HOR") || tagEmReparo.includes("SEG")) {
        // Abre o Horizontal
        let tituloHoriz = document.getElementById('horizontal-tag-name');
        if (tituloHoriz) tituloHoriz.innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoHorizontal === "function") abrirFolhaoHorizontal();
        
    } else if (tagEmReparo.includes("R2") || tagEmReparo.includes("STR")) {
        // Abre o R2
        let tituloR2 = document.getElementById('r2-tag-name');
        if (tituloR2) tituloR2.innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoR2 === "function") abrirFolhaoR2();
        
    } else {
        // Abre o Molde MCC4 Padrão
        let tituloMolde = document.getElementById('mcc4-tag-name');
        if (tituloMolde) tituloMolde.innerText = "TAG: " + tagEmReparo;
        if (typeof abrirFolhaoMCC4 === "function") abrirFolhaoMCC4();
    }
};