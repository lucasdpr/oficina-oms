import { 
    MOTIVOS_RETIRO, 
    CHECKLIST_RECEBIMENTO, 
    CHECKLIST_REVISAO, 
    CHECKLIST_HIDRAULICA, 
    CHECKLIST_FINAL 
} from './dados.js';

import { carregarTema, toggleTheme } from './tema.js';

import { 
    BANCO_ATIVOS, 
    HISTORICO_ACOES, 
    BANCO_ROLOS, 
    BANCO_MATERIAIS, 
    EM_EMERGENCIA, 
    OPERADOR_LOGADO,
    VEIO_SELECIONADO_PAINEL,
    CADASTRO_MATRICULAS 
} from './banco.js';

let MODO_MODAL_RELATORIO = {};
let ID_REPARO_ATUAL = null;
let ID_HISTORICO_ATUAL = null;
let ID_FOLHAO_ATUAL = null;
let DADOS_FOLGA_ARESTA = {};

// ==========================================
// AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================
function processarAutenticacaoHome() {
    const nomeInput = document.getElementById("login-nome").value.trim();
    const matriculaInput = document.getElementById("login-matricula").value.trim();

    if (!nomeInput || !matriculaInput) {
        return alert("Preencha todos os campos.");
    }

    if (CADASTRO_MATRICULAS[matriculaInput]) {
        OPERADOR_LOGADO = { matricula: matriculaInput, nome: `${nomeInput} [${CADASTRO_MATRICULAS[matriculaInput]}]` };
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
        OPERADOR_LOGADO = null;
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
    VEIO_SELECIONADO_PAINEL = veioNome;
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
// FILTROS MCC
// ==========================================
function aplicarFiltrosMCC(mccNumero, btnElement) {
    const grupo = btnElement.parentElement;
    grupo.querySelectorAll('.btn-filter-mcc').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    renderizarGraficosMCC(mccNumero);
}

function renderizarGraficosMCC(mccNumero) {
    const container = document.getElementById(`graficos-mcc${mccNumero}`);
    if (!container) return;

    const divFiltroVeio = document.getElementById(`filtros-veio-mcc${mccNumero}`);
    const veioAtivo = divFiltroVeio ? divFiltroVeio.querySelector('.active').getAttribute('data-valor') : 'TODOS';

    const divFiltroStatus = document.getElementById(`filtros-status-mcc${mccNumero}`);
    const statusAtivo = divFiltroStatus ? divFiltroStatus.querySelector('.active').getAttribute('data-valor') : 'TODOS';

    let filtrados = BANCO_ATIVOS.filter(a => a.local.includes(`MCC ${mccNumero}`));

    if (veioAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => a.local.includes(`Veio ${veioAtivo}`));
    }

    if (statusAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => {
            const pct = (a.ton / a.meta) * 100;
            if (statusAtivo === 'VERMELHO') return pct >= 80;
            if (statusAtivo === 'AMARELO') return pct >= 50 && pct < 80;
            if (statusAtivo === 'VERDE') return pct < 50;
            return true;
        });
    }

    filtrados.sort((a, b) => a.ordem - b.ordem);

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum equipamento encontrado com a combinação de filtros.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(gerarCardGraficoHTML).join("");
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

    if (item.tipo === "Molde" && item.mcc_compat.includes("4")) {
        abrirFolhaoMCC4(id); // <- CHAMA O NOVO SISTEMA!
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

function confirmarConclusaoReparo() {
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
    
    fecharModalConcluirReparo();
    renderReparos();
    renderReservas();
    renderAtivos();
    calcularKpisGlobais();
}

// ==========================================
// SISTEMA AVANÇADO DO FOLHÃO DE MANUTENÇÃO MCC4
// ==========================================

// FUNÇÕES DA MEMÓRIA DE FOLGA DE ARESTAS
function carregarMedidaAresta() {
    let largura = document.getElementById("folga-largura").value;
    
    // Se não existir dados salvos para essa largura, cria um objeto vazio.
    let dados = DADOS_FOLGA_ARESTA[largura] || {
        ec: "", em: "", ei: "", ech: "", 
        dc: "", dm: "", di: "", dch: ""
    };

    document.getElementById("fa-esq-cima").value = dados.ec;
    document.getElementById("fa-esq-meio").value = dados.em;
    document.getElementById("fa-esq-inf").value = dados.ei;
    document.getElementById("fa-esq-chav").value = dados.ech;

    document.getElementById("fa-dir-cima").value = dados.dc;
    document.getElementById("fa-dir-meio").value = dados.dm;
    document.getElementById("fa-dir-inf").value = dados.di;
    document.getElementById("fa-dir-chav").value = dados.dch;
}

function salvarMedidaAresta() {
    let largura = document.getElementById("folga-largura").value;
    
    DADOS_FOLGA_ARESTA[largura] = {
        ec: document.getElementById("fa-esq-cima").value,
        em: document.getElementById("fa-esq-meio").value,
        ei: document.getElementById("fa-esq-inf").value,
        ech: document.getElementById("fa-esq-chav").value,
        dc: document.getElementById("fa-dir-cima").value,
        dm: document.getElementById("fa-dir-meio").value,
        di: document.getElementById("fa-dir-inf").value,
        dch: document.getElementById("fa-dir-chav").value
    };
}

function injetarAbasFaltantes() {
    // Para não pedir para o utilizador alterar o HTML, o JavaScript constrói as abas em falta!
    if(!document.getElementById('tab-peritagem-mcc4')) {
        let tabsContainer = document.querySelector('.folhao-tabs');
        let bodyContainer = document.querySelector('.folhao-body');
        
        if(tabsContainer && bodyContainer) {
            tabsContainer.innerHTML += `
                <button id="tab-peritagem-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-peritagem')">6. Folgas de Aresta</button>
                <button id="tab-eletrica-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-eletrica')">7. Elétrica e Termopares</button>
                <button id="tab-materiais-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-materiais')">8. Materiais</button>
            `;
            
            // CONSTRÓI OS CAMPOS DA ELÉTRICA - TERMOPARES PLACA FIXA E MOVEL (1 a 12 + Positivos)
            let inputsTermoFixa = "";
            let inputsTermoMovel = "";
            for(let i=1; i<=12; i++) {
                inputsTermoFixa += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-fix-${i}"></div>`;
                inputsTermoMovel += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-mov-${i}"></div>`;
            }
            inputsTermoFixa += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-fix-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-fix-p2"></div>`;
            inputsTermoMovel += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-mov-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-mov-p2"></div>`;

            // CONSTRÓI OS CAMPOS DA ELÉTRICA - TERMOPARES ESTREITAS (1 a 3 + Positivos)
            let inputsTermoEsq = "";
            let inputsTermoDir = "";
            for(let i=1; i<=3; i++) {
                inputsTermoEsq += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-esq-${i}"></div>`;
                inputsTermoDir += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-dir-${i}"></div>`;
            }
            inputsTermoEsq += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-esq-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-esq-p2"></div>`;
            inputsTermoDir += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-dir-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-dir-p2"></div>`;

            // Injeta o conteúdo dinâmico
            bodyContainer.innerHTML += `
                <div id="folhao-aba-peritagem" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading);">Folga de Aresta - Medição Multi-Largura</h3>
                    <p class="text-warning" style="font-size: 12px; margin-bottom: 15px;"><i class="fas fa-info-circle"></i> Selecione a largura, digite os valores e mude para a próxima. O sistema salva automaticamente!</p>
                    
                    <div class="input-group" style="max-width: 300px; margin-bottom: 20px;">
                        <label>LARGURA DA FACE DE REFERÊNCIA</label>
                        <select id="folga-largura" class="premium-select" onchange="carregarMedidaAresta()">
                            <option value="830">LARGURA 830</option>
                            <option value="870">LARGURA 870</option>
                            <option value="950">LARGURA 950</option>
                            <option value="1030">LARGURA 1030</option>
                            <option value="1100">LARGURA 1100</option>
                            <option value="1180">LARGURA 1180</option>
                            <option value="1230">LARGURA 1230</option>
                            <option value="1300">LARGURA 1300</option>
                            <option value="1380">LARGURA 1380</option>
                            <option value="1460">LARGURA 1460</option>
                            <option value="1500">LARGURA 1500</option>
                            <option value="1530">LARGURA 1530</option>
                            <option value="1550">LARGURA 1550</option>
                            <option value="1580">LARGURA 1580</option>
                            <option value="1620">LARGURA 1620</option>
                        </select>
                    </div>

                    <div class="form-grid-2-mobile" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: var(--bg-th); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 15px; color: var(--text-heading); text-align: center;">PLACA ESQUERDA</h4>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Cima (O/M)</label><input type="text" id="fa-esq-cima" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Meio (V)</label><input type="text" id="fa-esq-meio" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Inferior (E/L)</label><input type="text" id="fa-esq-inf" onkeyup="salvarMedidaAresta()"></div>
                            <hr style="border: 1px solid var(--border-color); margin: 15px 0;">
                            <div class="input-group"><label style="color:var(--warning)">Folga da Chaveta Esq.</label><input type="text" id="fa-esq-chav" onkeyup="salvarMedidaAresta()"></div>
                        </div>
                        
                        <div style="background: var(--bg-th); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 15px; color: var(--text-heading); text-align: center;">PLACA DIREITA</h4>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Cima (O/M)</label><input type="text" id="fa-dir-cima" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Meio (V)</label><input type="text" id="fa-dir-meio" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Inferior (E/L)</label><input type="text" id="fa-dir-inf" onkeyup="salvarMedidaAresta()"></div>
                            <hr style="border: 1px solid var(--border-color); margin: 15px 0;">
                            <div class="input-group"><label style="color:var(--warning)">Folga da Chaveta Dir.</label><input type="text" id="fa-dir-chav" onkeyup="salvarMedidaAresta()"></div>
                        </div>
                    </div>
                </div>

                <div id="folhao-aba-eletrica" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading); border-bottom: 1px solid var(--text-accent); padding-bottom: 5px;">Isolamento dos Sensores de Nível do Molde (>10 MΩ)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 30px;">
                        <div class="input-group"><label>Pinos 5 e 6</label><input type="text" id="iso-5-6"></div>
                        <div class="input-group"><label>Pinos 5 e 8</label><input type="text" id="iso-5-8"></div>
                        <div class="input-group"><label>Pinos 5 e 10</label><input type="text" id="iso-5-10"></div>
                        <div class="input-group"><label>Pinos 5 e 15</label><input type="text" id="iso-5-15"></div>
                        <div class="input-group"><label>Pinos 6 e 8</label><input type="text" id="iso-6-8"></div>
                        <div class="input-group"><label>Pinos 6 e 10</label><input type="text" id="iso-6-10"></div>
                        <div class="input-group"><label>Pinos 6 e 15</label><input type="text" id="iso-6-15"></div>
                        <div class="input-group"><label>Pinos 8 e 10</label><input type="text" id="iso-8-10"></div>
                        <div class="input-group"><label>Pinos 8 e 15</label><input type="text" id="iso-8-15"></div>
                        <div class="input-group"><label>Pinos 10 e 15</label><input type="text" id="iso-10-15"></div>
                    </div>

                    <h3 style="margin-bottom: 15px; color: var(--text-heading); border-bottom: 1px solid var(--text-accent); padding-bottom: 5px;">Teste de Resistência: Placas LARGAS</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;">
                            <h4 style="text-align: center; margin-bottom: 10px;">PLACA FIXA</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">${inputsTermoFixa}</div>
                        </div>
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;">
                            <h4 style="text-align: center; margin-bottom: 10px;">PLACA MÓVEL</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">${inputsTermoMovel}</div>
                        </div>
                    </div>

                    <h3 style="margin-bottom: 15px; color: var(--text-heading); border-bottom: 1px solid var(--text-accent); padding-bottom: 5px;">Teste de Resistência: Placas ESTREITAS</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;">
                            <h4 style="text-align: center; margin-bottom: 10px;">ESTREITA ESQUERDA</h4>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">${inputsTermoEsq}</div>
                        </div>
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;">
                            <h4 style="text-align: center; margin-bottom: 10px;">ESTREITA DIREITA</h4>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">${inputsTermoDir}</div>
                        </div>
                    </div>
                </div>

                <div id="folhao-aba-materiais" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading);">Relatório de Materiais Utilizados</h3>
                    <textarea id="materiais-utilizados-texto" class="premium-textarea" rows="10" placeholder="Liste as quantidades e materiais utilizados. Ex:\n4 Parafusos sextavados M24x140\n8 Arruelas Pressão\nMassa de calafetar\n..."></textarea>
                </div>
            `;
        }
    }
}

function abrirFolhaoMCC4(id) {
    injetarAbasFaltantes();
    
    ID_FOLHAO_ATUAL = id;
    DADOS_FOLGA_ARESTA = {}; // Reinicia a memória de arestas para um novo laudo!
    
    document.getElementById("mcc4-tag-name").innerText = id;
    document.getElementById("mcc4-data-inicio").valueAsDate = new Date();
    document.getElementById("mcc4-data-fim").valueAsDate = new Date();

    renderizarChecklist(CHECKLIST_RECEBIMENTO, "container-check-recebimento", "rec");
    renderizarChecklist(CHECKLIST_REVISAO, "container-check-revisao", "rev");
    renderizarChecklist(CHECKLIST_HIDRAULICA, "container-check-hidraulica", "hid");
    renderizarChecklist(CHECKLIST_FINAL, "container-check-final", "fin");

    document.querySelectorAll('.folhao-tab')[0].click();
    carregarMedidaAresta(); // Carrega a primeira largura padrão da Dropdown
    document.getElementById("modal-folhao-mcc4").classList.remove("hidden");
}

function fecharFolhaoMCC4() {
    document.getElementById("modal-folhao-mcc4").classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

function trocarAbaFolhao(event, idAba) {
    document.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(idAba).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function renderizarChecklist(arrayPerguntas, containerId, prefix) {
    const container = document.getElementById(containerId);
    let html = "";
    arrayPerguntas.forEach((pergunta, index) => {
        let name = `${prefix}-q${index}`;
        html += `
        <div class="check-item">
            <p>${index + 1}. ${pergunta}</p>
            <div class="check-options">
                <label><input type="radio" name="${name}" value="SIM" checked> SIM</label>
                <label><input type="radio" name="${name}" value="NÃO"> NÃO</label>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// Helper para ler as opções de rádio do checklist na hora do PDF
function gerarLinhasChecklistPDF(arrayPerguntas, prefix) {
    let html = "";
    arrayPerguntas.forEach((pergunta, index) => {
        let name = `${prefix}-q${index}`;
        let radios = document.getElementsByName(name);
        let valorSelecionado = "N/A";
        
        for(let i=0; i<radios.length; i++){
            if(radios[i].checked) {
                valorSelecionado = radios[i].value;
                break;
            }
        }
        
        html += `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${pergunta}</td>
                <td style="text-align:center; font-weight:bold;">${valorSelecionado}</td>
            </tr>`;
    });
    return html;
}

function salvarEImprimirFolhaoMCC4() {
    if (!verificarAcesso() || !ID_FOLHAO_ATUAL) return;
    
    let item = BANCO_ATIVOS.find(a => a.id === ID_FOLHAO_ATUAL);
    if (!item) return;

    let tipoExecucao = document.getElementById("mcc4-tipo-execucao").value;
    let motivo = document.getElementById("mcc4-motivo").value || "Manutenção Padrão";
    
    if(tipoExecucao === "GERAL") {
        item.ton = 0;
        item.dias = 0;
    }
    
    item.local = "Oficina / Reserva";
    
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    
    let linkImprimir = `<button class='btn-xs-primary' style='margin-left:10px; cursor:pointer; color:var(--text-accent)' onclick='imprimirLaudoSalvo("${ID_FOLHAO_ATUAL}", "${motivo}")'><i class='fas fa-print'></i> Imprimir Folhão</button>`;
    
    registrarHistorico(item.id, `Folhão MCC4 assinado. Execução: ${tipoExecucao}. Motivo: ${motivo}. ${linkImprimir}`);
    
    fecharFolhaoMCC4();
    renderReparos();
    renderReservas();
    renderAtivos();
    calcularKpisGlobais();
    
    imprimirLaudoSalvo(ID_FOLHAO_ATUAL, motivo);
}

// Helper rápido para pegar valores sem quebrar se o elemento não existir
function getV(id) {
    let el = document.getElementById(id);
    return el && el.value ? el.value : ' - ';
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
    EM_EMERGENCIA = `⚠️ ALERTA PANICO - INTERVENÇÃO FORÇADA`;
    localStorage.setItem("oms_emergencia_v32_local", JSON.stringify(EM_EMERGENCIA));
    registrarHistorico("ALERTA", "Botão de Pânico acionado.");
    exibirBarraEmergencia();
}

function encerrarEmergencia() {
    EM_EMERGENCIA = null;
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
window.toggleTheme = toggleTheme;
window.processarAutenticacaoHome = processarAutenticacaoHome;
window.fazerLogout = fazerLogout;
window.abrirAba = abrirAba;
window.mudarVeioVisualizado = mudarVeioVisualizado;
window.toggleSidebar = toggleSidebar;