// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS (VERSÃO v32 - 100% CORRIGIDO E EXPANDIDO)
// ==========================================================================
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v32_local"));
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));

const MOTIVOS_RETIRO = {
    "Molde": ["Desgaste de placa", "Ranhura de placa", "Falha no cilindro", "Fim de vida", "Trava da bender", "Alarme de B.O", "B.O", "Rolete travado", "Outros"],
    "Segmento Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Bow": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Straightener": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Bender": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Seguimento Zero": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Cadeira Superior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
    "Cadeira Inferior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
    "Mesa Osciladora": ["Desgaste", "Falha mecânica", "Fim de vida", "Outros"],
    "Outros": ["Fim de vida", "Quebra", "Manutenção Preventiva", "Outros"]
};

// Define a ordem visual das peças no veio
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

// INICIALIZAÇÃO DO BANCO DE ATIVOS
if (!BANCO_ATIVOS || BANCO_ATIVOS.length < 150) {
    BANCO_ATIVOS = [];
    const veiosMcc23 = [{ mcc: 2, veio: "C" }, { mcc: 2, veio: "D" }, { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }];

    veiosMcc23.forEach(m => {
        const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
        BANCO_ATIVOS.push({ id: `MLD-2${m.veio}`, tipo: "Molde", local: vNome, pos: `Molde Veio ${m.veio}`, dias: 14, ton: 1000000, meta: 1200000, ordem: 10, mcc_compat: "2/3" });
        BANCO_ATIVOS.push({ id: `OSC-2${m.veio}`, tipo: "Mesa Osciladora", local: vNome, pos: `Osciladora ${m.veio}`, dias: 65, ton: 610000, meta: 1800000, ordem: 20, mcc_compat: "2/3" });
        BANCO_ATIVOS.push({ id: `SEG-0-2${m.veio}`, tipo: "Seguimento Zero", local: vNome, pos: "Segmento Zero", dias: 38, ton: 142100, meta: 450000, ordem: 30, mcc_compat: "2/3" });

        for (let c = 43; c <= 79; c++) {
            let isTracionada = [45, 48, 52, 56, 60, 64, 68, 72, 76, 79].includes(c);
            BANCO_ATIVOS.push({ id: `CAD-SUP-${c}-2${m.veio}`, tipo: "Cadeira Superior", local: vNome, pos: `Cad Sup ${c}`, dias: 45, ton: c === 43 ? 1438977 : 943444, meta: 2000000, ordem: 100 + c, mcc_compat: "2/3" });
            BANCO_ATIVOS.push({ id: `CAD-INF-${c}-2${m.veio}`, tipo: "Cadeira Inferior", local: vNome, pos: `Cad Inf ${c} ${isTracionada ? '(⚡)' : ''}`, dias: 50, ton: c === 43 ? 1348264 : 1414185, meta: 2500000, ordem: 200 + c, mcc_compat: "2/3" });
        }
    });

    const veiosMcc4 = ["H", "G"];
    veiosMcc4.forEach(veio => {
        const vNome = `MCC 4 - Veio ${veio}`;
        BANCO_ATIVOS.push({ id: `MLD-4${veio}`, tipo: "Molde", local: vNome, pos: "Molde Alta Perf.", dias: 12, ton: 180000, meta: 1000000, ordem: 10, mcc_compat: "4" });
        BANCO_ATIVOS.push({ id: `BND-4${veio}`, tipo: "Bender", local: vNome, pos: "Dobrador (Bender)", dias: 45, ton: 520000, meta: 1500000, ordem: 40, mcc_compat: "4" });
        for (let b = 1; b <= 5; b++) BANCO_ATIVOS.push({ id: `BOW-${b}-4${veio}`, tipo: "Bow", local: vNome, pos: `Curvo Bow #0${b}`, dias: 60, ton: 650000, meta: 1600000, ordem: 300 + b, mcc_compat: "4" });
        for (let s = 1; s <= 2; s++) BANCO_ATIVOS.push({ id: `STR-${s}-4${veio}`, tipo: "Straightener", local: vNome, pos: `Endireitador #0${s}`, dias: 88, ton: 910000, meta: 1800000, ordem: 400 + s, mcc_compat: "4" });
        for (let h = 1; h <= 10; h++) BANCO_ATIVOS.push({ id: `HOR-${h}-4${veio}`, tipo: "Horizontal", local: vNome, pos: `Horizontal #0${h}`, dias: 102, ton: 430000, meta: 2000000, ordem: 500 + h, mcc_compat: "4" });
    });

    BANCO_ATIVOS.push({ id: `MLD-RES-01`, tipo: "Molde", local: "Oficina / Reserva", pos: "Estoque Central", dias: 0, ton: 0, meta: 1200000, ordem: 10, mcc_compat: "2/3" });
    BANCO_ATIVOS.push({ id: `BOW-REP-04`, tipo: "Bow", local: "Oficina / Reparo", pos: "Bancada", dias: 65, ton: 1550000, meta: 1600000, ordem: 301, mcc_compat: "4" });

    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
}

// INICIALIZAÇÃO DO BANCO DE ROLOS
if (!BANCO_ROLOS) {
    BANCO_ROLOS = [
        { id: "R-S5", nome: "Rolo de Cadeira 450", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 14 },
        { id: "R-S5P", nome: "Rolo de Cadeira 450 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 8 },
        { id: "R-S4", nome: "Rolo de Cadeira 400", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 12 },
        { id: "R-S4P", nome: "Rolo de Cadeira 400 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 6 },
        { id: "R-S1", nome: "Segmento de Grupo 1", conjunto: "Segmento", mcc_compat: "2/3", qtd: 24 },
        { id: "R-S1P", nome: "Segmento de Grupo 1 Puxador", conjunto: "Segmento", mcc_compat: "2/3", qtd: 12 },
        { id: "R-S2", nome: "Segmento de Grupo 2", conjunto: "Segmento", mcc_compat: "2/3", qtd: 20 },
        { id: "R-S2P", nome: "Segmento de Grupo 2 Puxador", conjunto: "Segmento", mcc_compat: "2/3", qtd: 10 },
        { id: "R-S3", nome: "Segmento de Grupo 3", conjunto: "Segmento", mcc_compat: "2/3", qtd: 16 },
        { id: "R-S3P", nome: "Segmento de Grupo 3 Puxador", conjunto: "Segmento", mcc_compat: "2/3", qtd: 8 },
        { id: "R-728", nome: "Rolo 728 (Bow)", conjunto: "Segmento", mcc_compat: "4", qtd: 10 },
        { id: "R-955", nome: "Rolo 955 (Bow)", conjunto: "Segmento", mcc_compat: "4", qtd: 10 },
        { id: "R-H300", nome: "Rolo Horizontal 300", conjunto: "Segmento", mcc_compat: "4", qtd: 15 },
        { id: "R-H300A", nome: "Rolo Horizontal de 300 Acionado", conjunto: "Segmento", mcc_compat: "4", qtd: 6 },
        { id: "R-BA", nome: "Bow Acionado", conjunto: "Segmento", mcc_compat: "4", qtd: 4 },
        { id: "R-200", nome: "Rolo 200", conjunto: "Seguimento Zero", mcc_compat: "2/3/4", qtd: 8 },
        { id: "R-140", nome: "Rolo 140", conjunto: "Seguimento Zero", mcc_compat: "2/3/4", qtd: 12 },
        { id: "R-FR23", nome: "Foot Roll", conjunto: "Molde", mcc_compat: "2/3", qtd: 4 },
        { id: "R-FR4", nome: "Foot Roll", conjunto: "Molde", mcc_compat: "4", qtd: 2 },
        { id: "R-ER4", nome: "Edg Roll", conjunto: "Molde", mcc_compat: "4", qtd: 2 }
    ];
    localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
}

// ==========================================================================
// ATUALIZADOR AUTOMÁTICO DE NOMES PARA QUEM JÁ TEM O CACHE SALVO
// Isso garante que você não perca as quantidades cadastradas no navegador!
// ==========================================================================
const NOVOS_NOMES_ROLOS = {
    "R-S5": "Rolo de Cadeira 450",
    "R-S5P": "Rolo de Cadeira 450 Puxador",
    "R-S4": "Rolo de Cadeira 400",
    "R-S4P": "Rolo de Cadeira 400 Puxador",
    "R-S1": "Segmento de Grupo 1",
    "R-S1P": "Segmento de Grupo 1 Puxador",
    "R-S2": "Segmento de Grupo 2",
    "R-S2P": "Segmento de Grupo 2 Puxador",
    "R-S3": "Segmento de Grupo 3",
    "R-S3P": "Segmento de Grupo 3 Puxador",
    "R-H300A": "Rolo Horizontal de 300 Acionado"
};

if (BANCO_ROLOS) {
    let atualizouNomes = false;
    BANCO_ROLOS.forEach(rolo => {
        if (NOVOS_NOMES_ROLOS[rolo.id] && rolo.nome !== NOVOS_NOMES_ROLOS[rolo.id]) {
            rolo.nome = NOVOS_NOMES_ROLOS[rolo.id];
            atualizouNomes = true;
        }
    });
    if (atualizouNomes) {
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
    }
}
// ==========================================================================

let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v32_local")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

const CADASTRO_MATRICULAS = {
    "40090430": "Filipe (Líder)",
    "40075827": "Denilson (Líder)",
    "40080751": "Valmir (Líder)",
    "40090851": "Samuel (Líder)",
    "1011": "Supervisor"
};

let MODO_MODAL_RELATORIO = {};
let ID_REPARO_ATUAL = null;
let ID_HISTORICO_ATUAL = null;

// ==========================================
// TEMA E UI GLOBAL
// ==========================================
function carregarTema() {
    const temaSalvo = localStorage.getItem("oms_theme_local");
    const body = document.body;
    const icon = document.getElementById("theme-icon");
    const text = document.getElementById("theme-text");

    if (temaSalvo === "light") {
        body.classList.add("light-mode");
        if (icon) icon.className = "fas fa-moon";
        if (text) text.innerText = "Modo Escuro";
    } else {
        body.classList.remove("light-mode");
        if (icon) icon.className = "fas fa-sun";
        if (text) text.innerText = "Modo Claro";
    }
}

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById("theme-icon");
    const text = document.getElementById("theme-text");

    body.classList.toggle("light-mode");

    if (body.classList.contains("light-mode")) {
        localStorage.setItem("oms_theme_local", "light");
        if (icon) icon.className = "fas fa-moon";
        if (text) text.innerText = "Modo Escuro";
    } else {
        localStorage.setItem("oms_theme_local", "dark");
        if (icon) icon.className = "fas fa-sun";
        if (text) text.innerText = "Modo Claro";
    }
}

function toggleSidebar() {
    document.getElementById('sidebar-menu').classList.toggle('open');
}

// ==========================================
// AUTENTICAÇÃO E LOGIN
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

// ==========================================
// NAVEGAÇÃO ENTRE ABAS
// ==========================================
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
        if (pct >= 80 && !a.local.includes("Oficina")) criticos++;
        if (a.local === "Oficina / Reparo") reparo++;
        if (a.local === "Oficina / Reserva") reserva++;
    });

    document.getElementById("kpi-criticos").innerText = criticos;
    document.getElementById("kpi-reparo").innerText = reparo;
    document.getElementById("kpi-reserva").innerText = reserva;
}

// ==========================================
// RENDERIZAÇÃO DE DADOS E TABELAS
// ==========================================
function renderPainelVeios() {
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

function gerarCardGraficoHTML(a) {
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

function renderAtivos() {
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
        if (a.local === "Oficina / Reserva") classe = "reserva";
        else if (a.local === "Oficina / Reparo") classe = "reparo";

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

function fazerCelulaEditavel(celula, id, campo) {
    if (!verificarAcesso() || celula.querySelector("input")) return;
    
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
// RETIRADA E REPARO (MÓDULOS DE FLUXO)
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

function renderReparos() {
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

function abrirModalConcluirReparo(id) {
    ID_REPARO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    document.getElementById("modal-reparo-tag").innerText = item.id;
    document.getElementById("modal-tipo-reparo").value = "GERAL";
    document.getElementById("modal-reparo-ton").value = Math.round(item.ton);
    document.getElementById("modal-reparo-dias").value = item.dias;

    toggleCamposReparoParcial();
    document.getElementById("modal-concluir-reparo").classList.remove("hidden");
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
// RESERVAS E SWAP
// ==========================================
function renderReservas() {
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

function toggleFormAdicionar() {
    document.getElementById("form-novo-equipamento").classList.toggle("hidden");
}

function salvarNovoEquipamento() {
    if (!verificarAcesso()) return;
    const tag = document.getElementById("add-tag").value.trim().toUpperCase();
    const valorCompleto = document.getElementById("add-tipo").value;
    const meta = parseFloat(document.getElementById("add-meta").value);

    if (!tag || !meta) return alert("Preencha TAG e Meta.");
    if (BANCO_ATIVOS.find(a => a.id === tag)) return alert("TAG já cadastrada.");

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

// ==========================================
// ESTOQUE DE ROLOS (ALMOXARIFADO)
// ==========================================
function renderRolos() {
    const tbody = document.getElementById("rolos-table-body");
    if (!tbody) return;

    let htmlFinal = "";

    // Extrai e ordena os nomes únicos de todos os conjuntos/equipamentos do banco
    const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

    // Loop para cada equipamento para criar a categoria
    equipamentosDiferentes.forEach(equipamento => {
        // Linha de Cabeçalho do Grupo
        htmlFinal += `
            <tr style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid var(--text-accent);">
                <td colspan="5" style="padding: 12px 16px; color: var(--text-accent); font-weight: 700; text-transform: uppercase; font-size: 14px;">
                    <i class="fas fa-layer-group"></i> Equipamento: ${equipamento}
                </td>
            </tr>
        `;

        // Pega só os rolos desse equipamento específico
        const rolosDesteEquipamento = BANCO_ROLOS.filter(r => r.conjunto === equipamento);

        // Preenche a tabela com os rolos abaixo do cabeçalho
        rolosDesteEquipamento.forEach(r => {
            htmlFinal += `
                <tr>
                    <td class="font-code" style="color:var(--text-heading); padding-left: 25px;"><strong>${r.nome}</strong></td>
                    <td><span class="ind-card-tag bg-tag">${r.conjunto}</span></td>
                    <td><code>MCC ${r.mcc_compat}</code></td>
                    <td>
                        <span class="font-code bold" id="saldo-rolo-${r.id}" style="font-size:16px; color:var(--text-accent); margin-right:15px;">${r.qtd} Pçs</span>
                    </td>
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

    // Insere no HTML
    tbody.innerHTML = htmlFinal;
}

function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    if (rolo) {
        if (rolo.qtd + fator < 0) return alert("O saldo em estoque não pode ser negativo.");
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));

        registrarHistorico("ALMOXARIFADO", `Ajuste de estoque do rolo [${rolo.nome}]. Novo saldo: ${rolo.qtd} Pçs.`);
        renderRolos();
    }
}

// Funções mantidas conforme solicitado
function toggleFormRolos() {
    let form = document.getElementById("form-novo-rolo");
    if(form) form.classList.toggle("hidden");
}

function atualizarModelosSugeridos() {
    // Função mantida
}

function salvarNovoRolo() {
    if (!verificarAcesso()) return;
    const nome = document.getElementById("add-rolo-nome").value.trim();
    const valorConjunto = document.getElementById("add-rolo-conjunto").value;
    const qtd = parseInt(document.getElementById("add-rolo-qtd").value) || 0;

    if (!nome || qtd <= 0) return alert("Especifique o modelo e insira uma quantidade.");

    const [conjunto, mcc_compat] = valorConjunto.split("|");
    const idGerado = `R-${nome.toUpperCase().replace(/\s+/g, '-')}-${mcc_compat.replace(/\//g, '')}`;

    let roloExistente = BANCO_ROLOS.find(r => r.id === idGerado);
    if (roloExistente) {
        roloExistente.qtd += qtd;
        registrarHistorico("ALMOXARIFADO", `Lote de [${nome}] adicionado ao estoque. +${qtd} Pçs.`);
    } else {
        BANCO_ROLOS.push({ id: idGerado, nome: nome, conjunto: conjunto, mcc_compat: mcc_compat, qtd: qtd });
        registrarHistorico("ALMOXARIFADO", `Novo rolo [${nome}] cadastrado. Saldo inicial: ${qtd} Pçs.`);
    }

    localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
    
    if(document.getElementById("add-rolo-nome")) document.getElementById("add-rolo-nome").value = "";
    if(document.getElementById("add-rolo-qtd")) document.getElementById("add-rolo-qtd").value = "0";

    toggleFormRolos();
    renderRolos();
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
    }
});