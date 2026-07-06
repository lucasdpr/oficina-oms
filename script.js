// ==========================================
// SCRIPT.JS - COMPLETO E CORRIGIDO 
// ==========================================

import { 
    MOTIVOS_RETIRO, 
    CHECKLIST_RECEBIMENTO, 
    CHECKLIST_REVISAO, 
    CHECKLIST_HIDRAULICA, 
    CHECKLIST_FINAL, 
    BIBLIOTECA_CHECKLISTS 
} from './dados.js';

import { BANCO_ATIVOS, sincronizarAtivosReaisMCC4, salvarPecaNoPython } from './banco.js';
// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS
// ==========================================================================
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
let BANCO_MATERIAIS = JSON.parse(localStorage.getItem("oms_materiais_v32_local"));
let ID_FOLHAO_ATUAL = null;
let DADOS_FOLGA_ARESTA = {};

let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v32_local")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";
let FILTRO_CRITICOS = false;

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
// FUNÇÃO AUXILIAR - ORDEM PADRÃO
// ==========================================
function getOrdemPadrao(tipo) {
    if (tipo === "Molde") return 10;
    if (tipo === "Mesa Osciladora") return 20;
    if (tipo === "Segmento Zero") return 30;
    if (tipo === "Bender") return 40;
    if (tipo === "Cadeira Superior") return 100;
    if (tipo === "Cadeira Inferior") return 200;
    if (tipo === "Bow") return 300;
    if (tipo === "Straightener") return 400;
    if (tipo === "Horizontal") return 500;
    return 999;
}

// ==========================================================================
// FUNÇÕES AUXILIARES PARA POSIÇÕES E SLOTS (DEFINIDAS UMA ÚNICA VEZ)
// ==========================================================================
function mapearSlotFixo(tipo, mcc) {
    const t = tipo.toUpperCase();
    if (mcc === '4') {
        if (t.includes('MOLDE')) return 'MOLDE';
        if (t.includes('BENDER')) return 'BENDER';
        if (t.includes('STRAIGHTENER R1')) return 'STR-1';
        if (t.includes('STRAIGHTENER R2')) return 'STR-2';
    } else if (mcc === '2/3') {
        if (t.includes('SEGMENTO ZERO') || t.includes('SEGUIMENTO ZERO')) return 'SEG-ZERO';
        if (t.includes('MESA OSCILADORA')) return 'OSCILADORA';
        if (t.includes('MOLDE')) return 'MOLDE';
    }
    return '';
}

function gerarOpcoesPosicao(tipo, mcc) {
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
        } else if (t.includes('SEGMENTO') && !t.includes('ZERO')) {
            for (let i = 1; i <= 6; i++) opcoes += `<option value="${i}">#${i}</option>`;
        }
    }
    return opcoes;
}

// ==========================================================================
// INICIALIZAÇÃO DOS BANCOS (se não existirem)
// ==========================================================================
if (!BANCO_ROLOS) {
    BANCO_ROLOS = [
        { id: "R-S5", nome: "Rolo de Cadeira 450", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 14 },
        { id: "R-S5P", nome: "Rolo de Cadeira 450 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 8 },
        { id: "R-S4", nome: "Rolo de Cadeira 400", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 12 },
        { id: "R-S4P", nome: "Rolo de Cadeira 400 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 6 },
        { id: "R-H300A", nome: "Rolo Horizontal de 300 Acionado", conjunto: "Segmento", mcc_compat: "4", qtd: 6 },
        { id: "R-200", nome: "Rolo 200", conjunto: "Segmento Zero", mcc_compat: "2/3/4", qtd: 8 },
        { id: "R-FR23", nome: "Foot Roll", conjunto: "Molde", mcc_compat: "2/3", qtd: 4 }
    ];
    localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
}

if (!BANCO_MATERIAIS) {
    BANCO_MATERIAIS = [
        { codigo: "1660669", descricao: "ABRACADEIRA BIPARTIDA PP 12,MM", qtd: 50 },
        { codigo: "1641056", descricao: "ABRACADEIRA BIPARTIDA PP 16,0MM", qtd: 25 },
        { codigo: "8008878", descricao: "ACOPLAMENTO DESENHO CSN DM-028275", qtd: 5 },
        { codigo: "1205526", descricao: "ARRUELA DE PRESSÃO M10", qtd: 2097 },
        { codigo: "8497231", descricao: "PARAF .CAB. SEXT. M12 X 30MM CL 8.8", qtd: 150 },
        { codigo: "1195469", descricao: "ARAME SOLDA ACO ER70S-6 1,20MM", qtd: 24 },
        { codigo: "8004825", descricao: "CADEADO DE LATAO 35MM PAPAIZ", qtd: 10 }
    ];
    localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
}

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

        if (typeof atualizarInterfaceUsuario === 'function') atualizarInterfaceUsuario();
        if (typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
        if (typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
        if (typeof renderPainelVeios === 'function') renderPainelVeios();
        if (typeof renderAtivos === 'function') renderAtivos();
        if (typeof renderReparos === 'function') renderReparos();
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof renderRolos === 'function') renderRolos();
        if (typeof renderMateriais === 'function') renderMateriais();
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
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
// ABRIR ABA - CORRIGIDA
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
    if (idAba === "aba-almoxarifado") renderMateriais();
    if (idAba === "aba-historico") renderHistorico();
    if (idAba === "aba-painel") {
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    }
    if (idAba === "aba-ativos") {
        renderAtivos();
    }
    if (idAba === "aba-fluxo") {
        renderPainelVeios();
    }
    if (idAba === "aba-oficina") {
        if (typeof carregarOficina === 'function') carregarOficina();
    }

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

    const filtroData = document.getElementById("filtro-data-historico")?.value || '';
    const laudos = getLaudosSalvos();

    let todos = [
        ...HISTORICO_ACOES.map(h => ({ 
            ...h, 
            tipo: 'acao',
            dataTimestamp: (() => {
                try {
                    const partes = h.data.split(' ');
                    const dataPartes = partes[0].split('/');
                    const dataStr = dataPartes[2] + '-' + dataPartes[1] + '-' + dataPartes[0];
                    return new Date(dataStr + 'T' + partes[1]).getTime();
                } catch(e) { return 0; }
            })()
        })),
        ...laudos.map(l => ({
            data: l.data,
            tag: l.tag,
            acao: `<i class="fas fa-file-pdf" style="color:var(--danger);"></i> Laudo PDF: ${l.tipo}`,
            responsavel: 'Sistema',
            tipo: 'laudo',
            id: l.id,
            html: l.html,
            dataTimestamp: l.timestamp
        }))
    ];

    todos.sort((a, b) => (b.dataTimestamp || 0) - (a.dataTimestamp || 0));

    if (filtroData) {
        const dataFiltro = new Date(filtroData);
        const inicioDia = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth(), dataFiltro.getDate()).getTime();
        const fimDia = inicioDia + 24 * 60 * 60 * 1000;
        todos = todos.filter(item => {
            const ts = item.dataTimestamp || 0;
            return ts >= inicioDia && ts < fimDia;
        });
    }

    if (todos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = todos.map(item => {
        if (item.tipo === 'laudo') {
            return `
                <tr>
                    <td><small class="text-muted">${item.data}</small></td>
                    <td><span class="ind-card-tag bg-tag">${item.tag}</span></td>
                    <td style="color: var(--text-main);">
                        ${item.acao}
                        <button class="btn-xs-primary" onclick="window.visualizarLaudo('${item.id}')" style="margin-left:8px; color:var(--text-accent);">
                            <i class="fas fa-eye"></i> Ver PDF
                        </button>
                        <button class="btn-xs-primary" onclick="window.excluirLaudo('${item.id}')" style="color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                    <td><small class="text-muted">${item.responsavel}</small></td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td><small class="text-muted">${item.data}</small></td>
                    <td><span class="ind-card-tag bg-tag">${item.tag}</span></td>
                    <td style="color: var(--text-main);">${item.acao}</td>
                    <td><small class="text-muted">${item.responsavel}</small></td>
                </tr>
            `;
        }
    }).join("");
}

function atualizarInterfaceUsuario() {
    document.getElementById("nome-operador-logado").innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
    renderHistorico();
}

function calcularKpisGlobais() {
    let criticos = 0, reparo = 0, reserva = 0;

    BANCO_ATIVOS.forEach(a => {
        const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
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
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================

// FUNÇÃO AUXILIAR PARA GERAR SLOTS MCC 2/3
function gerarSlotsMCC23() {
    const slots = [
        { id: "MOLDE", nome: "Molde Convencional", tipo: "Molde" },
        { id: "OSCILADORA", nome: "Mesa Osciladora", tipo: "Mesa Osciladora" },
        { id: "SEG-ZERO", nome: "Segmento Zero", tipo: "Segmento Zero" }
    ];
    for (let i = 1; i <= 6; i++) {
        slots.push({ id: `SEG-${i}`, nome: `Segmento #${i}`, tipo: "Segmento" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-SUP-${i}`, nome: `Cadeira Superior ${i}`, tipo: "Cadeira Superior" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-INF-${i}`, nome: `Cadeira Inferior ${i}`, tipo: "Cadeira Inferior" });
    }
    return slots;
}

// FUNÇÃO AUXILIAR PARA MAPEAR SLOTS LEGADO MCC 2/3
function mapearSlotLegadoMCC23(peca) {
    const tipo = (peca.tipo || "").toUpperCase();
    const id = (peca.id || "").toUpperCase();
    
    if (tipo.includes("MOLDE")) return "MOLDE";
    if (tipo.includes("OSCILADORA")) return "OSCILADORA";
    if (tipo.includes("ZERO") || tipo.includes("SEG-0")) return "SEG-ZERO";
    
    if (tipo.includes("SEGMENTO") || tipo.includes("SEGMENTO")) {
        const match = id.match(/SEG-?(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 6) return `SEG-${num}`;
        }
    }
    if (tipo.includes("CADEIRA SUPERIOR") || tipo.includes("CAD-SUP")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-SUP-${num}`;
        }
    }
    if (tipo.includes("CADEIRA INFERIOR") || tipo.includes("CAD-INF")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-INF-${num}`;
        }
    }
    return null;
}

// FUNÇÃO PARA GERAR SLOTS MCC 4
function gerarSlotsMCC4() {
    return [
        { id: "MOLDE", nome: "Molde Alta Perf.", tipo: "Molde" },
        { id: "BENDER", nome: "Dobrador (Bender)", tipo: "Bender" },
        { id: "BOW-1", nome: "Curvo Bow #01", tipo: "Bow" },
        { id: "BOW-2", nome: "Curvo Bow #02", tipo: "Bow" },
        { id: "BOW-3", nome: "Curvo Bow #03", tipo: "Bow" },
        { id: "BOW-4", nome: "Curvo Bow #04", tipo: "Bow" },
        { id: "BOW-5", nome: "Curvo Bow #05", tipo: "Bow" },
        { id: "STR-1", nome: "Endireitador R1", tipo: "Straightener" },
        { id: "STR-2", nome: "Endireitador R2", tipo: "Straightener" },
        { id: "HOR-8", nome: "Segmento Horizontal #08", tipo: "Horizontal" },
        { id: "HOR-9", nome: "Segmento Horizontal #09", tipo: "Horizontal" },
        { id: "HOR-10", nome: "Segmento Horizontal #10", tipo: "Horizontal" },
        { id: "HOR-11", nome: "Segmento Horizontal #11", tipo: "Horizontal" },
        { id: "HOR-12", nome: "Segmento Horizontal #12", tipo: "Horizontal" },
        { id: "HOR-13", nome: "Segmento Horizontal #13", tipo: "Horizontal" },
        { id: "HOR-14", nome: "Segmento Horizontal #14", tipo: "Horizontal" },
        { id: "HOR-15", nome: "Segmento Horizontal #15", tipo: "Horizontal" },
        { id: "HOR-16", nome: "Segmento Horizontal #16", tipo: "Horizontal" },
        { id: "HOR-17", nome: "Segmento Horizontal #17", tipo: "Horizontal" }
    ];
}

// ==========================================================================
// CORREÇÃO DO MAPEAMENTO DE GAVETAS
// ==========================================================================
function mapearSlotLegadoMCC4(peca) {
    const tipoUpper = (peca.tipo || "").toUpperCase();
    const idUpper = (peca.id || "").toUpperCase();
    
    if (tipoUpper.includes("MOLDE")) return "MOLDE";
    if (tipoUpper.includes("BENDER")) return "BENDER";
    
    if (tipoUpper.includes("BOW")) {
        const match = idUpper.match(/BOW-(\d)/);
        if (match) return `BOW-${match[1]}`;
    }
    
    if (tipoUpper.includes("STRAIGHTENER")) {
        if (idUpper.includes("STR-6") || idUpper.includes("R1")) return "STR-1";
        if (idUpper.includes("STR-7") || idUpper.includes("R2")) return "STR-2";
    }
    
    if (tipoUpper.includes("HORIZONTAL")) {
        const match = idUpper.match(/HOR-(\d+)/);
        if (match) return `HOR-${match[1]}`;
    }
    return null;
}

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================
const CONFIGURACOES_MAQUINAS = {
    "C": {
        id: "MCC2_C",
        nome: "Máquina 2 - Veio C",
        mcc: "2",
        veio: "C",
        veioDisplay: "C",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "D": {
        id: "MCC2_D",
        nome: "Máquina 2 - Veio D",
        mcc: "2",
        veio: "D",
        veioDisplay: "D",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "E": {
        id: "MCC3_E",
        nome: "Máquina 3 - Veio E",
        mcc: "3",
        veio: "E",
        veioDisplay: "E",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "F": {
        id: "MCC3_F",
        nome: "Máquina 3 - Veio F",
        mcc: "3",
        veio: "F",
        veioDisplay: "F",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "H": {
        id: "MCC4_H",
        nome: "Máquina 4 - Veio H",
        mcc: "4",
        veio: "H",
        veioDisplay: "H",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    },
    "G": {
        id: "MCC4_G",
        nome: "Máquina 4 - Veio G",
        mcc: "4",
        veio: "G",
        veioDisplay: "G",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    }
};

function getConfiguracaoPorVeio(veio) {
    return CONFIGURACOES_MAQUINAS[veio] || null;
}

function getSlotsPorVeio(veio) {
    const config = getConfiguracaoPorVeio(veio);
    return config ? config.slots : [];
}

let ultimoVeioVisualizado = null;

function mudarVeioVisualizado(veio) {
    VEIO_SELECIONADO_PAINEL = veio;
    document.querySelectorAll('.btn-veio-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.btn-veio-tab').forEach(b => {
        if (b.textContent.includes(`Veio ${veio}`)) {
            b.classList.add('active');
        }
    });
    renderPainelVeios();
    const abaFluxo = document.getElementById('aba-fluxo');
    if (abaFluxo && !abaFluxo.classList.contains('active')) {
        abrirAba(null, 'aba-fluxo');
    }
}

// ==========================================
// RENDERIZAÇÃO DE DADOS VEIOS E ATIVOS
// ==========================================
function renderPainelVeios() {
    const container = document.getElementById("container-fluxo-horizontal-scroll");
    const titulo = document.getElementById("titulo-veio-focado");
    if (!container || !titulo) {
        console.warn("⚠️ Elementos da aba fluxo não encontrados.");
        return;
    }

    const config = getConfiguracaoPorVeio(VEIO_SELECIONADO_PAINEL);
    if (!config) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Configuração não encontrada para o Veio ${VEIO_SELECIONADO_PAINEL}</h3>
                <p>Verifique se a máquina está configurada.</p>
            </div>
        `;
        return;
    }

    titulo.innerHTML = `Sequenciamento Estrutural: <span style="color: var(--text-accent);">${config.nome}</span>`;

    const pecasInstaladas = BANCO_ATIVOS.filter(p => 
        (p.veio === VEIO_SELECIONADO_PAINEL && p.status === "Instalado") || 
        (p.local && p.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) && !p.local.includes("Oficina"))
    );

    const slots = config.slots || [];
    if (slots.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Estrutura da Máquina ${config.nome} em Construção</h3>
                <p>Os slots serão configurados em breve.</p>
            </div>
        `;
        return;
    }

    let htmlSlots = "";

    slots.forEach(slot => {
        let pecaEncontrada = null;

        for (const p of pecasInstaladas) {
            if (p.posicaoFixa && p.posicaoFixa === slot.id) {
                pecaEncontrada = p;
                break;
            }
            if (!p.posicaoFixa && config.mapearSlotLegado) {
                const slotMapeado = config.mapearSlotLegado(p);
                if (slotMapeado === slot.id) {
                    pecaEncontrada = p;
                    break;
                }
            }
        }

        if (pecaEncontrada) {
            const pct = pecaEncontrada.meta > 0 ? (pecaEncontrada.ton / pecaEncontrada.meta) * 100 : 0;
            const corClass = pct >= 80 ? "danger" : pct >= 50 ? "warning" : "success";
            const pctDisplay = pct.toFixed(1);
            const dias = calcularDias(pecaEncontrada);

            htmlSlots += `
                <div class="ind-card" style="border-top: 3px solid var(--${corClass}); min-width: 260px; max-width: 300px; background: var(--bg-td); border-radius: var(--radius-md); padding: 16px 18px; transition: all var(--transition-base);">
                    <div class="flex-between" style="margin-bottom: 4px;">
                        <span class="font-code" style="font-size: 0.9rem; font-weight: 700; color: var(--text-heading);">${pecaEncontrada.id}</span>
                        <span class="bg-tag" style="font-size: 0.55rem;">${pecaEncontrada.tipo}</span>
                    </div>
                    <div class="flex-between" style="margin-bottom: 8px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fas fa-layer-group"></i> ${slot.nome}</span>
                        <span style="font-weight: 700; font-family: var(--font-mono); font-size: 1.1rem; color: var(--${corClass});">${pctDisplay}%</span>
                    </div>
                    <div class="progress-container" style="margin: 4px 0 10px 0;">
                        <div class="progress-bar bg-${corClass}" style="width: ${Math.min(pct, 100)}%; height: 6px; border-radius: 10px;"></div>
                    </div>
                    <div class="flex-between" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 12px;">
                        <span>Ton: <strong class="font-code" style="color: var(--text-heading);">${Number(pecaEncontrada.ton || 0).toLocaleString('pt-BR')}</strong></span>
                        <span>Lim: <strong class="font-code" style="color: var(--text-heading);">${Number(pecaEncontrada.meta || 0).toLocaleString('pt-BR')}</strong></span>
                        <span>Dias: <strong class="font-code" style="color: var(--text-heading);">${dias}</strong></span>
                    </div>
                    <div class="flex-between gap-10" style="gap: 8px;">
                        <button class="btn-xs-primary" style="flex: 1; padding: 6px; font-size: 0.65rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);" onclick="window.abrirHistoricoIndividual('${pecaEncontrada.id}')">
                            <i class="fas fa-book"></i> Prontuário
                        </button>
                        <button class="btn-outline-danger" style="flex: 1; padding: 6px; font-size: 0.65rem; border-radius: var(--radius-sm);" onclick="window.iniciarSaque('${pecaEncontrada.id}')">
                            <i class="fas fa-exchange-alt"></i> Sacar
                        </button>
                    </div>
                </div>
            `;
        } else {
            htmlSlots += `
                <div class="ind-card" style="border: 2px dashed var(--danger); background: var(--danger-bg); min-width: 260px; max-width: 300px; border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 140px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 28px; color: var(--danger); margin-bottom: 8px; opacity: 0.6;"></i>
                    <h4 style="color: var(--danger); font-size: 0.85rem; margin: 0;">${slot.nome}</h4>
                    <p style="color: var(--danger); font-size: 0.65rem; margin: 4px 0 12px 0; opacity: 0.7;">GAVETA VAZIA</p>
                    <button class="btn-premium btn-success" style="padding: 6px 16px; font-size: 0.7rem;" onclick="window.abrirAba(null, 'aba-reservas')">
                        <i class="fas fa-plus"></i> Alocar
                    </button>
                </div>
            `;
        }
    });

    container.innerHTML = htmlSlots;
}

function gerarCardGraficoHTML(a) {
    const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
    const pctFixed = pct.toFixed(1);
    let cor = pct >= 80 ? "var(--danger)" : (pct >= 50 ? "var(--warning)" : "var(--success)");
    const dias = a.dias || 0;

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
                <span>Dias: <strong>${dias}</strong></span>
            </div>
            <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(56,189,248,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="abrirHistoricoIndividual('${a.id}')">
                <i class="fas fa-book-open"></i> Ver Prontuário
            </button>
        </div>`;
}

// ==========================================
// RENDER ATIVOS (COM FILTRO DE CRÍTICOS)
// ==========================================
function renderAtivos() {
    const tbody = document.getElementById("ativos-table-body");
    const filtroEl = document.getElementById("filtro-tipo-ativo");
    if (!tbody || !filtroEl) return;

    let f = BANCO_ATIVOS.filter(a => (a.local || "").includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
    
    if (FILTRO_CRITICOS) {
        f = f.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            return pct >= 80 && !a.local.includes("Oficina");
        });
        FILTRO_CRITICOS = false;
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> Equipamentos Críticos (≥80%)`;
    } else {
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-cubes"></i> Matriz Operacional Geral`;
    }

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
        if (a.local === "Oficina / Reserva") classe = "reserva";
        else if (a.local === "Oficina / Reparo") classe = "reparo";

        let btnAcao = (a.local || "").includes("Veio")
            ? `<button class="btn-outline-danger" onclick="iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;
        let btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                <td class="font-code text-muted">${a.local || "Não Alocado"}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias || 0}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton || 0).toLocaleString()}</td>
                <td class="font-code text-muted">${(a.meta || 0).toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pctFixed}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist} ${btnExcluir}</div></td>
            </tr>`;
    }).join("");
}

// ==========================================
// RENDER REPAROS (AGRUPADO POR MCC E TIPO)
// ==========================================
function renderReparos() {
    const repBody = document.getElementById("reparos-table-body");
    if (!repBody) return;

    let precisaSalvar = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local === "Oficina / Reparo" && !a.dataReparo) {
            const diasAtuais = a.dias || 0;
            a.dataReparo = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvar = true;
        }
    });
    if (precisaSalvar) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    const reparos = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    if (reparos.length === 0) {
        repBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
        return;
    }

    const grupos = {};
    reparos.forEach(a => {
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
                <td colspan="5" style="padding: 10px 16px; font-weight: 700; color: var(--text-heading); font-size: 15px;">
                    <i class="fas fa-server"></i> MCC ${mcc}
                </td>
            </tr>
        `;

        Object.keys(tipos).sort().forEach(tipo => {
            const lista = tipos[tipo];
            htmlFinal += `
                <tr style="background: var(--bg-th);">
                    <td colspan="5" style="padding: 6px 16px; font-weight: 600; color: var(--text-muted); font-size: 13px; padding-left: 30px;">
                        <i class="fas fa-tag"></i> ${tipo}
                    </td>
                </tr>
            `;
            lista.forEach(a => {
                const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
                const pctFixed = pct.toFixed(1);
                const dias = a.dias || 0;
                const btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="excluirEquipamento('${a.id}')" title="Excluir"><i class="fas fa-trash"></i></button>`;
                htmlFinal += `
                    <tr>
                        <td class="font-code" style="padding-left: 45px;">${a.id}</td>
                        <td><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
                        <td>
                            <div class="flex-align-center gap-10">
                                <span class="font-code bold w-40" style="color: var(--text-heading);">${pctFixed}%</span>
                                <div class="ind-gauge-bar premium-bar w-100px">
                                    <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
                                </div>
                            </div>
                        </td>
                        <td style="font-weight:bold; color:var(--warning);">${dias} dias</td>
                        <td>
                            <div class="flex-align-center gap-10 action-buttons-mobile">
                                <button class="btn-premium btn-warning" onclick="window.abrirFolhaoPorTipo('${a.id}')"><i class="fas fa-hammer"></i> Concluir</button>
                                <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                                ${btnExcluir}
                            </div>
                        </td>
                    </tr>
                `;
            });
        });
    });

    repBody.innerHTML = htmlFinal;
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

// ==========================================
// PRONTUÁRIO INDIVIDUAL (MODAL)
// ==========================================
function abrirHistoricoIndividual(id) {
    ID_HISTORICO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    const tagNome = document.getElementById("hist-tag-nome");
    const tagLocal = document.getElementById("hist-tag-local");
    if (tagNome) tagNome.innerText = item.id;
    if (tagLocal) tagLocal.innerText = item.local;
    
    renderizarTabelaHistoricoIndividual(id);
    const modal = document.getElementById("modal-historico-ativo");
    if (modal) modal.classList.remove("hidden");
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
        item.dataReparo = Date.now();
        item.dias = 0;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        registrarHistorico(id, `Sacado da linha (${loc}) p/ Reparo. ${laudo}`);
        
        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
        renderReparos();
        renderReservas();
        atualizarPainelCompleto();
    }
}

// ==========================================
// MODAL CONCLUIR REPARO (AGORA DESATIVADO)
// ==========================================
function abrirModalConcluirReparo(id) {
    console.warn("abrirModalConcluirReparo foi substituído por abrirFolhaoPorTipo");
    if (typeof window.abrirFolhaoPorTipo === 'function') {
        window.abrirFolhaoPorTipo(id);
    } else {
        alert("Função de abertura de folhão não disponível.");
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
    item.dataReparo = null;
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    registrarHistorico(item.id, msgHistorico);
    
    fecharModalConcluirReparo();
    renderReparos();
    renderReservas();
    renderAtivos();
    renderPainelVeios();
    renderHistorico();
    calcularKpisGlobais();
    atualizarPainelCompleto();
    abrirAba(null, 'aba-reservas');
    setTimeout(() => {
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    }, 100);
}

// ==========================================
// SISTEMA AVANÇADO DO FOLHÃO DE MOLDES
// ==========================================
function injetarAbasFaltantes() {
    if (!document.getElementById('tab-peritagem-mcc4')) {
        let tabsContainer = document.querySelector('.folhao-tabs');
        let bodyContainer = document.querySelector('.folhao-body');
        
        if (tabsContainer && bodyContainer) {
            tabsContainer.innerHTML += `
                <button id="tab-peritagem-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-peritagem')">6. Folgas de Aresta</button>
                <button id="tab-eletrica-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-eletrica')">7. Elétrica e Termopares</button>
                <button id="tab-materiais-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-materiais')">8. Materiais</button>
            `;
            
            let inputsTermoFixa = "";
            let inputsTermoMovel = "";
            for (let i = 1; i <= 12; i++) {
                inputsTermoFixa += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-fix-${i}"></div>`;
                inputsTermoMovel += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-mov-${i}"></div>`;
            }
            inputsTermoFixa += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-fix-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-fix-p2"></div>`;
            inputsTermoMovel += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-mov-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-mov-p2"></div>`;

            let inputsTermoEsq = "";
            let inputsTermoDir = "";
            for (let i = 1; i <= 3; i++) {
                inputsTermoEsq += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-esq-${i}"></div>`;
                inputsTermoDir += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-dir-${i}"></div>`;
            }
            inputsTermoEsq += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-esq-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-esq-p2"></div>`;
            inputsTermoDir += `
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-dir-p1"></div>
                <div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-dir-p2"></div>`;

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
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
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
                    <h3 style="margin-bottom: 15px; color: var(--text-heading); border-bottom: 1px solid var(--text-accent); padding-bottom: 5px;">Isolamento dos Sensores de Nível do Molde (&gt;10 MΩ)</h3>
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

function carregarMedidaAresta() {
    let largura = document.getElementById("folga-largura").value;
    
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

function abrirFolhaoMolde(id) {
    injetarAbasFaltantes();
    
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    ID_FOLHAO_ATUAL = id;
    DADOS_FOLGA_ARESTA = {};
    
    const tituloPrincipal = document.querySelector("#modal-folhao-mcc4 h2");
    if (tituloPrincipal) {
        tituloPrincipal.innerHTML = `<i class="fas fa-clipboard-list"></i> Liberação Oficial - MOLDE (${item.mcc_compat})`;
    }

    document.getElementById("mcc4-tag-name").innerText = id;
    document.getElementById("mcc4-data-inicio").valueAsDate = new Date();
    document.getElementById("mcc4-data-fim").valueAsDate = new Date();

    renderizarChecklist(CHECKLIST_RECEBIMENTO, "container-check-recebimento", "rec");
    renderizarChecklist(CHECKLIST_REVISAO, "container-check-revisao", "rev");
    renderizarChecklist(CHECKLIST_HIDRAULICA, "container-check-hidraulica", "hid");
    renderizarChecklist(CHECKLIST_FINAL, "container-check-final", "fin");

    document.querySelectorAll('.folhao-tab')[0].click();
    carregarMedidaAresta();
    document.getElementById("modal-folhao-mcc4").classList.remove("hidden");
}

function fecharFolhaoMolde() {
    document.getElementById("modal-folhao-mcc4").classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

function fecharFolhaoMCC4() {
    fecharFolhaoMolde();
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

function gerarLinhasChecklistPDF(arrayPerguntas, prefix) {
    let html = "";
    arrayPerguntas.forEach((pergunta, index) => {
        let name = `${prefix}-q${index}`;
        let radios = document.getElementsByName(name);
        let valorSelecionado = "N/A";
        
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
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

function getV(id) {
    let el = document.getElementById(id);
    return el && el.value ? el.value : ' - ';
}

function imprimirLaudoSalvo(tag, motivo) {
    const printDiv = document.getElementById("print-content");
    let materiais = document.getElementById("materiais-utilizados-texto") ? document.getElementById("materiais-utilizados-texto").value : "";
    
    let itemData = BANCO_ATIVOS.find(a => a.id === tag);
    let familiaMolde = itemData ? itemData.mcc_compat : "2/3/4";

    let htmlFolgas = "";
    let largurasPreenchidas = Object.keys(DADOS_FOLGA_ARESTA);
    
    if (largurasPreenchidas.length === 0) {
        htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida de folga registrada.</td></tr>";
    } else {
        largurasPreenchidas.forEach(larg => {
            let d = DADOS_FOLGA_ARESTA[larg];
            if (d.ec || d.em || d.ei || d.ech || d.dc || d.dm || d.di || d.dch) {
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
        if (htmlFolgas === "") {
            htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida preenchida.</td></tr>";
        }
    }

    let tableTermoLargas = "";
    for (let i = 1; i <= 12; i++) {
        tableTermoLargas += `<tr><td>Termopar ${i} (10-20 Ω)</td><td>${getV('t-fix-' + i)}</td><td>${getV('t-mov-' + i)}</td></tr>`;
    }
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV('t-fix-p1')}</td><td>${getV('t-mov-p1')}</td></tr>`;
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 2</td><td>${getV('t-fix-p2')}</td><td>${getV('t-mov-p2')}</td></tr>`;

    let tableTermoEstreitas = "";
    for (let i = 1; i <= 3; i++) {
        tableTermoEstreitas += `<tr><td>Termopar ${i} (5-15 Ω)</td><td>${getV('t-esq-' + i)}</td><td>${getV('t-dir-' + i)}</td></tr>`;
    }
    tableTermoEstreitas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV('t-esq-p1')}</td><td>${getV('t-dir-p1')}</td></tr>`;
    tableTermoEstreitas += `<tr style="background:#eee"><td>Positivo 2</td><td>${getV('t-esq-p2')}</td><td>${getV('t-dir-p2')}</td></tr>`;

    let html = `
        <div style="border: 3px solid #000; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif;">
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 2px;">CSN</div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 5px;">FOLHA DE LIBERAÇÃO DE MOLDE (MCC ${familiaMolde})</div>
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
// CADASTRO DE NOVAS PEÇAS E ROLOS
// ==========================================
function toggleFormAdicionar() {
    const form = document.getElementById("form-novo-equipamento");
    if (form) form.classList.toggle("hidden");
}

function atualizarPosicoesCadastro() {
    const tipo = document.getElementById("add-tipo").value;
    const selectPos = document.getElementById("add-posicao");
    if (!selectPos) return;
    selectPos.innerHTML = "";

    if (!tipo) {
        selectPos.innerHTML = `<option value="">Selecione um tipo primeiro...</option>`;
        return;
    }

    const familia = tipo.split("|")[0] || "";
    const mcc = tipo.split("|")[1] || "";

    // MCC 4
    if (mcc === "4") {
        if (familia === "Molde") {
            selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        } else if (familia === "Bender") {
            selectPos.innerHTML = `<option value="BENDER">Bender (Única posição)</option>`;
        } else if (familia === "Bow") {
            let opts = "";
            for (let i = 1; i <= 5; i++) {
                opts += `<option value="${i}">Bow Posição #${i}</option>`;
            }
            selectPos.innerHTML = opts;
        } else if (familia === "Straightener R1") {
            selectPos.innerHTML = `<option value="STR-1">Straightener R1 (Única)</option>`;
        } else if (familia === "Straightener R2") {
            selectPos.innerHTML = `<option value="STR-2">Straightener R2 (Única)</option>`;
        } else if (familia === "Horizontal") {
            let opts = "";
            for (let i = 8; i <= 17; i++) {
                opts += `<option value="${i}">Horizontal Posição #${i}</option>`;
            }
            selectPos.innerHTML = opts;
        } else {
            selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
        }
    } 
    // MCC 2/3
    else if (mcc === "2/3") {
        if (familia === "Molde") {
            selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        } else if (familia === "Mesa Osciladora") {
            selectPos.innerHTML = `<option value="OSCILADORA">Mesa Osciladora (Única)</option>`;
        } else if (familia === "Seguimento Zero" || familia === "Segmento Zero") {
            selectPos.innerHTML = `<option value="SEG-ZERO">Segmento Zero (Única)</option>`;
        } else if (familia === "Cadeira Superior") {
            let opts = "";
            for (let i = 43; i <= 79; i++) {
                opts += `<option value="${i}">Cadeira Superior #${i}</option>`;
            }
            selectPos.innerHTML = opts;
        } else if (familia === "Cadeira Inferior") {
            let opts = "";
            for (let i = 43; i <= 79; i++) {
                opts += `<option value="${i}">Cadeira Inferior #${i}</option>`;
            }
            selectPos.innerHTML = opts;
        } else if (familia.includes("Segmento") && !familia.includes("Zero")) {
            let opts = "";
            for (let i = 1; i <= 6; i++) {
                opts += `<option value="${i}">Segmento #${i}</option>`;
            }
            selectPos.innerHTML = opts;
        } else {
            selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
        }
    } else {
        selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    }
}

function processarCadastroPeca() {
    const tag = document.getElementById("add-tag").value.trim() || `NOVA-PECA-${Math.floor(Math.random() * 1000)}`;
    const tipoValor = document.getElementById("add-tipo").value || "";
    const tipoSplit = tipoValor.split("|");
    const familia = tipoSplit[0] || "";
    const mccCompat = tipoSplit[1] || "4";

    const limite = parseFloat(document.getElementById("add-meta").value) || 1000000;
    const veio = document.getElementById("add-veio").value || "";
    const posicao = document.getElementById("add-posicao").value || "";
    const instalarDireto = document.getElementById("add-instalar-direto").checked;

    // --- Validações iniciais ---
    if (!familia) {
        alert("Selecione um tipo de peça.");
        return;
    }

    if (instalarDireto && !veio) {
        alert("Selecione o Veio de destino.");
        return;
    }

    // --- Determina o slot (posição fixa ou variável) ---
    const tipoUpper = familia.toUpperCase();
    let slotChassi = "";
    let posicaoObrigatoria = true; // por padrão, exige posição

    // ==========================================
    // MAPEAMENTO DE SLOTS (MCC 4)
    // ==========================================
    if (mccCompat === "4") {
        if (tipoUpper.includes("BOW")) {
            slotChassi = `BOW-${posicao}`;
        } else if (tipoUpper.includes("HORIZONTAL")) {
            slotChassi = `HOR-${posicao}`;
        } else if (tipoUpper.includes("STRAIGHTENER R1") || tipoUpper.includes("R1")) {
            slotChassi = "STR-1";
            posicaoObrigatoria = false;
        } else if (tipoUpper.includes("STRAIGHTENER R2") || tipoUpper.includes("R2")) {
            slotChassi = "STR-2";
            posicaoObrigatoria = false;
        } else if (tipoUpper.includes("MOLDE")) {
            slotChassi = "MOLDE";
            posicaoObrigatoria = false;
        } else if (tipoUpper.includes("BENDER")) {
            slotChassi = "BENDER";
            posicaoObrigatoria = false;
        } else {
            // Fallback: usa a posição digitada
            slotChassi = posicao;
        }
    }
    // ==========================================
    // MAPEAMENTO DE SLOTS (MCC 2/3)
    // ==========================================
    else if (mccCompat === "2/3") {
        if (tipoUpper.includes("CADEIRA SUPERIOR")) {
            slotChassi = `CAD-SUP-${posicao}`;
        } else if (tipoUpper.includes("CADEIRA INFERIOR")) {
            slotChassi = `CAD-INF-${posicao}`;
        } else if (tipoUpper.includes("SEGMENTO ZERO") || tipoUpper.includes("SEGUIMENTO ZERO")) {
            slotChassi = "SEG-ZERO";
            posicaoObrigatoria = false;
        } else if (tipoUpper.includes("MESA OSCILADORA")) {
            slotChassi = "OSCILADORA";
            posicaoObrigatoria = false;
        } else if (tipoUpper.includes("SEGMENTO") && !tipoUpper.includes("ZERO")) {
            slotChassi = `SEG-${posicao}`;
        } else if (tipoUpper.includes("MOLDE")) {
            slotChassi = "MOLDE";
            posicaoObrigatoria = false;
        } else {
            // Fallback
            slotChassi = posicao;
        }
    } else {
        // MCC desconhecido – usa posicao como fallback
        slotChassi = posicao;
    }

    // --- Validação de posição (apenas se obrigatória e se for instalação direta) ---
    if (instalarDireto && posicaoObrigatoria && !posicao) {
        alert("⚠️ Selecione a Posição de destino para este tipo de equipamento.");
        return;
    }

    // --- Se não for instalação direta, não exige posição ---
    if (!instalarDireto) {
        // Guarda como estoque, posição pode ficar vazia
        slotChassi = ""; // ou mantém o que foi mapeado, mas não usaremos
    }

    // --- Define status e local ---
    let statusFinal = instalarDireto ? "Instalado" : "Oficina / Reserva";
    let localFinal = instalarDireto ? `MCC ${mccCompat} - Veio ${veio}` : "Oficina / Reserva";

    // --- Se for instalação direta, faz a substituição da peça antiga ---
    if (instalarDireto && veio && slotChassi) {
        const config = getConfiguracaoPorVeio(veio);
        let pecaExpulsa = false;
        let pecaExpulsaId = "";

        for (let i = 0; i < BANCO_ATIVOS.length; i++) {
            const p = BANCO_ATIVOS[i];
            const taNoVeio = (p.veio === veio && p.status === "Instalado") ||
                             (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"));
            if (!taNoVeio) continue;

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
                BANCO_ATIVOS[i].status = "Oficina / Reparo";
                BANCO_ATIVOS[i].local = "Oficina / Reparo";
                BANCO_ATIVOS[i].veio = "";
                BANCO_ATIVOS[i].posicaoFixa = "";
                BANCO_ATIVOS[i].pos = "";
                BANCO_ATIVOS[i].dataReparo = Date.now();
                BANCO_ATIVOS[i].dias = 0;

                pecaExpulsa = true;
                pecaExpulsaId = p.id;

                if (window.registrarHistorico) {
                    window.registrarHistorico(p.id, `Sacado da gaveta ${slotChassi} do Veio ${veio} por substituição.`);
                }
                break;
            }
        }

        if (pecaExpulsa) {
            alert(`⚠️ A peça velha [${pecaExpulsaId}] foi removida da gaveta ${slotChassi} e enviada para REPARO.`);
        }
    }

    // --- Cria a nova peça ---
    const novaPeca = {
        id: tag,
        tipo: familia,
        veio: instalarDireto ? veio : "",
        local: localFinal,
        posicaoFixa: instalarDireto ? slotChassi : "",
        pos: instalarDireto ? posicao : "Estoque",
        status: statusFinal,
        ton: 0,
        dias: 0,
        meta: limite,
        mcc_compat: mccCompat,
        ordem: getOrdemPadrao(familia),
        dataReparo: null
    };

    BANCO_ATIVOS.push(novaPeca);
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    if (statusFinal === "Instalado") {
        alert(`✅ Sucesso! A nova peça [${tag}] assumiu o controle da gaveta ${slotChassi} do Veio ${veio}.`);
    } else {
        alert(`✅ Sucesso! Peça [${tag}] criada e guardada no Estoque Reserva.`);
    }

    // --- Limpa os campos do formulário ---
    document.getElementById("add-tag").value = "";
    document.getElementById("add-meta").value = "";
    document.getElementById("add-instalar-direto").checked = false;

    // --- Atualiza as telas ---
    renderReservas();
    renderAtivos();
    renderReparos();
    renderPainelVeios();
    calcularKpisGlobais();
    atualizarPainelCompleto();

    if (instalarDireto) mudarVeioVisualizado(veio);
}

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

function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    if (rolo) {
        if (rolo.qtd + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        registrarHistorico("ALMOXARIFADO", `Ajuste de estoque do rolo [${rolo.nome}]. Novo saldo: ${rolo.qtd} Pçs.`);
        renderRolos();
    }
}

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
        if (m.qtd > 10) statusHtml = `<span class="status-pill operação" style="color: var(--success); border-color: var(--success);"><i class="fas fa-check-circle"></i> Normal</span>`;
        else if (m.qtd > 0) statusHtml = `<span class="status-pill reserva" style="color: var(--warning); border-color: var(--warning);"><i class="fas fa-exclamation-triangle"></i> Baixo</span>`;
        else statusHtml = `<span class="status-pill reparo" style="color: var(--danger); border-color: var(--danger);"><i class="fas fa-times-circle"></i> Zerado</span>`;
        
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

function toggleFormMaterial() {
    let form = document.getElementById("form-novo-material");
    if (form) form.classList.toggle("hidden");
}

function salvarEntradaMaterial() {
    if (!verificarAcesso()) return;
    const codigo = document.getElementById("mat-codigo").value.trim().toUpperCase();
    const descricao = document.getElementById("mat-descricao").value.trim().toUpperCase();
    const qtd = parseInt(document.getElementById("mat-qtd").value) || 0;

    if (!codigo || !descricao || qtd <= 0) {
        return alert("Por favor, preencha o código, a descrição correta e uma quantidade maior que zero.");
    }

    let materialExistente = BANCO_MATERIAIS.find(m => m.codigo === codigo);
    if (materialExistente) {
        materialExistente.qtd += qtd;
        registrarHistorico("ALMOXARIFADO", `Adição no material [${codigo}]. +${qtd} UN. Saldo atual: ${materialExistente.qtd} UN.`);
        alert(`SUCESSO!\nO código ${codigo} já existe no sistema.\nSomamos a quantidade de ${qtd} UN ao saldo atual.`);
    } else {
        BANCO_MATERIAIS.unshift({ codigo: codigo, descricao: descricao, qtd: qtd });
        registrarHistorico("ALMOXARIFADO", `Material [${codigo}] cadastrado. Entrada: ${qtd} UN.`);
        alert(`NOVO MATERIAL CADASTRADO!\nCódigo ${codigo} adicionado com saldo de ${qtd} UN.`);
    }
    localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
    document.getElementById("mat-codigo").value = "";
    document.getElementById("mat-descricao").value = "";
    document.getElementById("mat-qtd").value = "";
    toggleFormMaterial();
    renderMateriais();
}

function ajustarSaldoMaterial(codigo, fator) {
    if (!verificarAcesso()) return;
    let material = BANCO_MATERIAIS.find(m => m.codigo === codigo);
    if (material) {
        if (material.qtd + fator < 0) { return alert("O estoque não pode ficar negativo."); }
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
        BANCO_MATERIAIS = BANCO_MATERIAIS.filter(m => m.codigo !== codigo);
        localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
        registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`);
        renderMateriais();
    }
}

// ==========================================
// SEGURANÇA E EMERGÊNCIA
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
                if (item.local === "Oficina / Reparo") {
                    item.dataReparo = Date.now();
                }
                item.dias = parseFloat(novoValor) || 0;
            } else if (campo === 'ton') {
                item.ton = parseFloat(novoValor) || 0;
            }
            
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
            registrarHistorico(id, `Campo "${campo}" alterado para: ${novoValor}`);
            
            if (campo === 'dias' || campo === 'ton') {
                elemento.innerText = parseFloat(novoValor).toLocaleString() || '0';
            } else {
                elemento.innerText = novoValor;
            }
            atualizarPainelCompleto();
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

// ==========================================
// CONEXÃO COM O GOOGLE SHEETS (API)
// ==========================================
const API_PLANILHA_URL = "https://script.google.com/macros/s/AKfycby_XSR5hrrvOgDEqlWhbKC2l7iPjthe6ht5YrabNliXsFlkNhzYGFU2BR8JUhzv8yY2/exec";

async function registrarSwapNaPlanilha(maquina, veio, slotId, pecaNova, pecaAntiga, nomeOperador) {
    const dadosSwap = {
        maquina: maquina,
        veio: veio,
        slotId: slotId,
        pecaInstalada: pecaNova,
        pecaRemovida: pecaAntiga || "Nenhuma (gaveta vazia)",
        operador: nomeOperador || "Operador Padrão",
        dataHora: new Date().toLocaleString('pt-BR')
    };

    console.log("⏳ Enviando dados para a planilha...", dadosSwap);

    try {
        const resposta = await fetch(API_PLANILHA_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dadosSwap)
        });

        console.log("✅ Dados enviados para a planilha (no-cors). Verifique a planilha!");

    } catch (erro) {
        console.error("❌ Erro ao enviar para a planilha:", erro);
    }
}

window.registrarSwapNaPlanilha = registrarSwapNaPlanilha;

// ==========================================
// FUNÇÕES PARA O PAINEL TURBINADO (NOVAS)
// ==========================================

function renderizarGraficoStatus() {
    const canvas = document.getElementById('grafico-status');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width || 180;
    const h = canvas.height || 180;
    canvas.width = w;
    canvas.height = h;
    
    const instalados = BANCO_ATIVOS.filter(a => a.local && a.local.includes('Veio') && !a.local.includes('Oficina')).length;
    const reparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo').length;
    const reserva = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reserva').length;
    const total = instalados + reparo + reserva;
    
    if (total === 0) {
        ctx.fillStyle = '#8a9bb5';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados', w/2, h/2);
        return;
    }
    
    const cores = ['#10b981', '#f59e0b', '#3b82f6'];
    const labels = ['Instalados', 'Em Reparo', 'Reserva'];
    const valores = [instalados, reparo, reserva];
    
    const cx = w/2, cy = h/2, raio = Math.min(w, h)/2 - 10;
    let startAngle = -Math.PI/2;
    
    valores.forEach((v, i) => {
        if (v === 0) return;
        const slice = (v / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, raio, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fillStyle = cores[i];
        ctx.fill();
        startAngle += slice;
    });
    
    const legendaContainer = document.getElementById('legenda-status');
    if (legendaContainer) {
        legendaContainer.innerHTML = valores.map((v, i) => `
            <div class="legenda-status-item">
                <div class="cor" style="background: ${cores[i]};"></div>
                <span class="label">${labels[i]}</span>
                <span class="count">${v}</span>
            </div>
        `).join('');
    }
}

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

function renderizarUltimasAtividades() {
    const container = document.getElementById('ultimas-atividades-container');
    if (!container) return;
    
    const historico = HISTORICO_ACOES.slice(0, 6);
    
    if (historico.length === 0) {
        container.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px 0;">Nenhuma atividade recente.</div>';
        return;
    }
    
    container.innerHTML = historico.map(h => `
        <div class="atividade-item">
            <span class="time">${h.data || '--'}</span>
            <span class="tag-badge">${h.tag || 'Sistema'}</span>
            <span class="desc">${h.acao || 'Ação registrada'}</span>
            <span class="usuario">${h.responsavel || 'Sistema'}</span>
        </div>
    `).join('');
}

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
    
    const emReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo');
    if (emReparo.length > 0) {
        const somaDias = emReparo.reduce((acc, a) => {
            const dias = a.dataReparo ? Math.floor((Date.now() - a.dataReparo) / (1000*60*60*24)) : (a.dias || 0);
            return acc + dias;
        }, 0);
        const mediaDias = Math.round(somaDias / emReparo.length);
        const mediaReparoEl = document.getElementById('kpi-media-reparo');
        if (mediaReparoEl) mediaReparoEl.innerText = mediaDias + ' dias';
    } else {
        const mediaReparoEl = document.getElementById('kpi-media-reparo');
        if (mediaReparoEl) mediaReparoEl.innerText = '0 dias';
    }
    
    const mulheresEl = document.getElementById('kpi-mulheres');
    if (mulheresEl) mulheresEl.innerText = '+30%';
}

function abrirCriticos() {
    FILTRO_CRITICOS = true;
    abrirAba(null, 'aba-ativos');
    if (typeof renderAtivos === 'function') {
        renderAtivos();
    }
}

function atualizarNovosKPIs() {
    const total = BANCO_ATIVOS.length;
    document.getElementById('kpi-total').innerText = total;
    
    const moldesReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo' && a.tipo === 'Molde').length;
    document.getElementById('kpi-moldes-reparo').innerText = moldesReparo;
    
    const segmentosReparo = BANCO_ATIVOS.filter(a => a.local === 'Oficina / Reparo' && a.tipo !== 'Molde').length;
    document.getElementById('kpi-segmentos-reparo').innerText = segmentosReparo;
    
    let totalRolos = 0;
    if (BANCO_ROLOS && Array.isArray(BANCO_ROLOS)) {
        totalRolos = BANCO_ROLOS.reduce((acc, r) => acc + (r.qtd || 0), 0);
    }
    document.getElementById('kpi-total-rolos').innerText = totalRolos;
}

function atualizarPainelCompleto() {
    if (typeof calcularKpisGlobais === 'function') {
        calcularKpisGlobais();
    }
    atualizarNovosKPIs();
    renderizarTopCriticos();
}

// ==========================================
// CARREGAR DADOS DA OFICINA VIA API
// ==========================================
async function carregarOficina() {
    const container = document.getElementById('oficina-container');
    if (!container) return;
    
    container.innerHTML = `<div class="text-muted" style="text-align:center;padding:40px 0;">
        <i class="fas fa-spinner fa-pulse" style="font-size:24px;"></i> Carregando dados...
    </div>`;
    
    try {
        const resposta = await fetch(`${API_PLANILHA_URL}?acao=getOficina`);
        const dados = await resposta.json();
        
        if (dados.erro) {
            container.innerHTML = `<div class="text-danger" style="text-align:center;padding:40px 0;">
                <i class="fas fa-exclamation-triangle" style="font-size:24px;"></i> ${dados.erro}
            </div>`;
            return;
        }
        
        if (dados.length === 0) {
            container.innerHTML = `<div class="text-muted" style="text-align:center;padding:40px 0;">
                Nenhuma atividade registrada na oficina.
            </div>`;
            return;
        }
        
        const areas = {};
        dados.forEach(item => {
            const area = item.ÁREA || 'Geral';
            if (!areas[area]) areas[area] = [];
            areas[area].push(item);
        });
        
        let html = '';
        Object.keys(areas).forEach(nomeArea => {
            const atividades = areas[nomeArea];
            html += `
                <div class="glass-panel" style="padding:16px;margin-bottom:16px;border-left:4px solid var(--text-accent);">
                    <h3 style="color:var(--text-heading);margin-bottom:10px;"><i class="fas fa-people-group"></i> ${nomeArea}</h3>
                    <div style="display:grid;grid-template-columns:1fr;gap:8px;">
            `;
            atividades.forEach(a => {
                const pct = parseFloat(a['% CONCLUSÃO']) || 0;
                const cor = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');
                html += `
                    <div style="background:var(--bg-td);padding:12px 16px;border-radius:8px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
                        <div>
                            <strong style="color:var(--text-heading);">${a.ATIVIDADE || 'Atividade'}</strong>
                            <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">${a.EQUIPAMENTO || ''}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="color:${cor};font-weight:bold;">${pct}%</span>
                            <div style="width:100px;height:6px;background:var(--bg-input);border-radius:10px;overflow:hidden;">
                                <div style="width:${Math.min(pct,100)}%;height:100%;background:${cor};border-radius:10px;"></div>
                            </div>
                            <span style="font-size:11px;color:var(--text-muted);">${a.DATA || ''}</span>
                            <span style="font-size:11px;color:var(--text-muted);">${a.RESPONSÁVEL || ''}</span>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        container.innerHTML = html;
        
    } catch (erro) {
        container.innerHTML = `<div class="text-danger" style="text-align:center;padding:40px 0;">
            <i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados: ${erro.message}
        </div>`;
    }
}

// ==========================================
// FUNÇÃO PARA ABRIR O FOLHÃO CORRETO POR TIPO (CORRIGIDA)
// ==========================================
window.abrirFolhaoPorTipo = function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        alert('Equipamento não encontrado.');
        return;
    }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ==========================================
    // 1. MAPEAMENTO COMPLETO DE FOLHÕES
    // ==========================================

    // ---- MOLDES ----
    if (tipo === 'Molde') {
        if (mcc === '2/3') {
            if (typeof window.abrirFolhaoMolde23 === 'function') {
                window.abrirFolhaoMolde23(id);
                return;
            }
        } else {
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        // Fallback: se a função não existir, abre o folhão genérico
        if (typeof window.abrirFolhaoGenerico === 'function') {
            window.abrirFolhaoGenerico(id);
            return;
        }
        console.warn(`Folhão para Molde (MCC ${mcc}) não implementado.`);
        return;
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.abrirFolhaoMCC4 === 'function') {
            window.abrirFolhaoMCC4(id);
            return;
        }
        console.warn('Folhão Bender não implementado.');
        return;
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.abrirFolhaoBow === 'function') {
            window.abrirFolhaoBow(id);
            return;
        }
        console.warn('Folhão Bow não implementado.');
        return;
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.abrirFolhaoHorizontal === 'function') {
            window.abrirFolhaoHorizontal(id);
            return;
        }
        console.warn('Folhão Horizontal não implementado.');
        return;
    }

    // ---- STRAIGHTENER (R1 e R2) ----
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.abrirFolhaoR1 === 'function') {
                window.abrirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.abrirFolhaoR2 === 'function') {
                window.abrirFolhaoR2(id);
                return;
            }
        } else {
            // Fallback: se não identificar R1/R2, tenta o folhão MCC4
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        console.warn('Folhão para Straightener não implementado.');
        return;
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.abrirFolhaoDesempenadeira === 'function') {
            window.abrirFolhaoDesempenadeira(id);
            return;
        }
        console.warn('Folhão Desempenadeira não implementado.');
        return;
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.abrirFolhaoSegmentoZero === 'function') {
            window.abrirFolhaoSegmentoZero(id);
            return;
        }
        console.warn('Folhão Segmento Zero não implementado.');
        return;
    }

    // ---- MESA OSCILADORA ----
    if (tipo === 'Mesa Osciladora') {
        // Se tiver um folhão específico, coloque aqui
        // Senão, abre o genérico
        if (typeof window.abrirFolhaoGenerico === 'function') {
            window.abrirFolhaoGenerico(id);
            return;
        }
        console.warn(`Folhão para ${tipo} não implementado.`);
        return;
    }

    // ---- OUTROS TIPOS (FALLBACK) ----
    // Se chegar aqui, tenta abrir o folhão genérico (se existir)
    if (typeof window.abrirFolhaoGenerico === 'function') {
        window.abrirFolhaoGenerico(id);
        return;
    }

    // Último recurso: abre o folhão do Bender como fallback
    if (typeof window.abrirFolhaoMCC4 === 'function') {
        console.warn(`Tipo ${tipo} sem folhão específico. Usando MCC4 como fallback.`);
        window.abrirFolhaoMCC4(id);
        return;
    }

    // Se nada funcionar, exibe uma mensagem amigável (sem alert)
    console.warn(`Nenhum folhão disponível para o tipo: ${tipo}`);
    // Opcional: mostra um toast ou notificação silenciosa
    // alert('Nenhum folhão disponível para este equipamento.'); // REMOVA ESSA LINHA
};
// ==========================================================================
// MÓDULO INTELIGENTE: APONTAMENTO DIÁRIO E DESCONTO DE VIDA ÚTIL EM LOTE
// ==========================================================================

window.abrirModalProducao = function() {
    // Zera os campos toda vez que abre a janela
    document.getElementById("prod-mcc2").value = "";
    document.getElementById("prod-mcc3").value = "";
    document.getElementById("prod-mcc4").value = "";
    document.getElementById("modal-producao-diaria").classList.remove("hidden");
};

window.fecharModalProducao = function() {
    document.getElementById("modal-producao-diaria").classList.add("hidden");
};

window.processarProducaoDiaria = async function() {
    if (!verificarAcesso()) return;

    // Pega os números digitados (se estiver vazio, considera ZERO)
    const prodMcc2 = parseFloat(document.getElementById("prod-mcc2").value) || 0;
    const prodMcc3 = parseFloat(document.getElementById("prod-mcc3").value) || 0;
    const prodMcc4 = parseFloat(document.getElementById("prod-mcc4").value) || 0;

    if (prodMcc2 === 0 && prodMcc3 === 0 && prodMcc4 === 0) {
        alert("⚠️ Digite a produção de pelo menos uma máquina para continuar.");
        return;
    }

    let pecasAtualizadas = 0;

    // A MÁGICA ACONTECE AQUI: O sistema varre todas as peças da fábrica
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let peca = BANCO_ATIVOS[i];

        // Regra de Ouro: Só desconta a vida de quem está INSTALADO na máquina (ignora peças na Oficina)
        if (peca.local && !peca.local.includes("Oficina")) {
            
            let sofreuDesgaste = false;

            // Se a peça está na MCC 2 e teve produção na MCC 2
            if (peca.local.includes("MCC 2") && prodMcc2 > 0) {
                peca.ton += prodMcc2;
                sofreuDesgaste = true;
            } 
            // Se a peça está na MCC 3 e teve produção na MCC 3
            else if (peca.local.includes("MCC 3") && prodMcc3 > 0) {
                peca.ton += prodMcc3;
                sofreuDesgaste = true;
            } 
            // Se a peça está na MCC 4 e teve produção na MCC 4
            else if (peca.local.includes("MCC 4") && prodMcc4 > 0) {
                peca.ton += prodMcc4;
                sofreuDesgaste = true;
            }

            // Se a peça trabalhou e sofreu desgaste, avisa o Python para salvar no Banco de Dados SQLite!
            if (sofreuDesgaste) {
                pecasAtualizadas++;
                if (typeof salvarPecaNoPython === 'function') {
                    await salvarPecaNoPython(peca); // Mão Dupla em ação!
                }
            }
        }
    }

    // Salva na memória rápida do navegador
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    
    // Registra a auditoria
    registrarHistorico("PRODUÇÃO", `Apontamento em Lote: MCC2 (+${prodMcc2}t), MCC3 (+${prodMcc3}t), MCC4 (+${prodMcc4}t)`);
    
    // Fecha a janela e atualiza todos os gráficos da tela
    fecharModalProducao();
    atualizarPainelCompleto();
    
    // Força o desenho das peças novamente para a barra de % crescer
    if (typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof renderAtivos === 'function') renderAtivos();
    
    alert(`✅ Sucesso Absoluto!\nO desgaste de ${pecasAtualizadas} peças ativas na fábrica foi atualizado simultaneamente.`);
};

// ==========================================
// HISTÓRICO DE LAUDOS SALVOS (PDF)
// ==========================================
function salvarLaudoNoHistorico(tag, tipo, htmlPDF) {
    const laudos = JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    laudos.unshift({
        id: id,
        tag: tag,
        tipo: tipo,
        data: dataStr,
        timestamp: agora.getTime(),
        html: htmlPDF
    });
    
    if (laudos.length > 200) laudos.pop();
    localStorage.setItem("oms_laudos_salvos", JSON.stringify(laudos));
    renderHistorico();
    return id;
}

function getLaudosSalvos() {
    return JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
}

function excluirLaudo(id) {
    let laudos = getLaudosSalvos();
    laudos = laudos.filter(l => l.id !== id);
    localStorage.setItem("oms_laudos_salvos", JSON.stringify(laudos));
    renderHistorico();
}

window.visualizarLaudo = function(id) {
    const laudos = getLaudosSalvos();
    const laudo = laudos.find(l => l.id === id);
    if (!laudo) {
        alert("Laudo não encontrado.");
        return;
    }
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
        win.document.write(laudo.html);
        win.document.close();
    } else {
        const printDiv = document.getElementById('print-content');
        if (printDiv) {
            printDiv.innerHTML = laudo.html;
            window.print();
        }
    }
};

window.salvarLaudoNoHistorico = salvarLaudoNoHistorico;
window.getLaudosSalvos = getLaudosSalvos;
window.excluirLaudo = excluirLaudo;

// ==========================================
// EXPOSIÇÃO GLOBAL - APENAS FUNÇÕES DO SCRIPT.JS
// ==========================================

// ===== FUNÇÕES DE NAVEGAÇÃO E UI =====
window.abrirAba = abrirAba;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.processarAutenticacaoHome = processarAutenticacaoHome;
window.fazerLogout = fazerLogout;
window.verificarAcesso = verificarAcesso;
window.getOrdemPadrao = getOrdemPadrao;

// ===== FUNÇÕES AUXILIARES PARA UI.JS =====
window.mapearSlotFixo = mapearSlotFixo;
window.gerarOpcoesPosicao = gerarOpcoesPosicao;

// ===== FUNÇÕES DE HISTÓRICO =====
window.registrarHistorico = registrarHistorico;
window.abrirHistoricoIndividual = abrirHistoricoIndividual;
window.fecharModalHistorico = fecharModalHistorico;
window.salvarRegistroManual = salvarRegistroManual;

// ===== FUNÇÕES DE MANUTENÇÃO =====
window.iniciarSaque = iniciarSaque;
window.confirmarRelatorio = confirmarRelatorio;
window.fecharModalRelatorio = fecharModalRelatorio;
window.abrirModalConcluirReparo = abrirModalConcluirReparo;
window.fecharModalConcluirReparo = fecharModalConcluirReparo;
window.confirmarConclusaoReparo = confirmarConclusaoReparo;
window.toggleCamposReparoParcial = toggleCamposReparoParcial;
window.abrirFolhaoPorTipo = window.abrirFolhaoPorTipo;

// ===== FUNÇÕES DE CADASTRO =====
window.toggleFormAdicionar = toggleFormAdicionar;
window.atualizarPosicoesCadastro = atualizarPosicoesCadastro;
window.processarCadastroPeca = processarCadastroPeca;
window.toggleFormMaterial = toggleFormMaterial;
window.salvarEntradaMaterial = salvarEntradaMaterial;
window.ajustarSaldoMaterial = ajustarSaldoMaterial;
window.removerMaterial = removerMaterial;
window.alterarSaldoRolo = alterarSaldoRolo;

// ===== FUNÇÕES DE EDIÇÃO E UTILITÁRIOS =====
window.fazerCelulaEditavel = fazerCelulaEditavel;
window.dispararEmergencia = dispararEmergencia;
window.encerrarEmergencia = encerrarEmergencia;

// ===== FUNÇÕES DO PAINEL =====
window.calcularKpisGlobais = calcularKpisGlobais;
window.atualizarInterfaceUsuario = atualizarInterfaceUsuario;
window.abrirCriticos = abrirCriticos;
window.renderizarTopCriticos = renderizarTopCriticos;
window.atualizarNovosKPIs = atualizarNovosKPIs;
window.atualizarPainelCompleto = atualizarPainelCompleto;
window.salvarPecaNoPython = salvarPecaNoPython;

// ===== FUNÇÕES DE CONFIGURAÇÃO DOS VEIOS =====
window.mudarVeioVisualizado = mudarVeioVisualizado;
window.getConfiguracaoPorVeio = getConfiguracaoPorVeio;
window.getSlotsPorVeio = getSlotsPorVeio;
window.CONFIGURACOES_MAQUINAS = CONFIGURACOES_MAQUINAS;

window.BANCO_ATIVOS = BANCO_ATIVOS;

// ==========================================
// FUNÇÃO DE SWAP (DEFINIDA DIRETAMENTE NO WINDOW)
// ==========================================
window.iniciarSwapAlocacao = function(idReserva) {
    if (!verificarAcesso()) return;

    console.log('🔄 Iniciando swap para:', idReserva);

    const veioSelect = document.getElementById(`alocar-veio-${idReserva}`);
    const posElement = document.getElementById(`alocar-pos-${idReserva}`);
    
    if (!veioSelect) {
        alert('Erro: campo de veio não encontrado.');
        return;
    }

    const veio = veioSelect.value;
    console.log('📍 Veio:', veio);

    let posicao = '';
    if (posElement) {
        posicao = posElement.value;
        console.log('📍 Posição:', posicao);
    }

    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
    if (!pecaReserva) {
        alert('Peça reserva não encontrada.');
        return;
    }
    console.log('📦 Peça:', pecaReserva.id, 'Tipo:', pecaReserva.tipo);

    // ==========================================
    // FUNÇÕES AUXILIARES EMBUTIDAS (LOCAIS)
    // ==========================================
    function getSlotFixoLocal(tipo, mcc) {
        const t = tipo.toUpperCase();
        if (mcc === '4') {
            if (t.includes('MOLDE')) return 'MOLDE';
            if (t.includes('BENDER')) return 'BENDER';
            if (t.includes('STRAIGHTENER R1')) return 'STR-1';
            if (t.includes('STRAIGHTENER R2')) return 'STR-2';
        } else if (mcc === '2/3') {
            if (t.includes('SEGMENTO ZERO') || t.includes('SEGUIMENTO ZERO')) return 'SEG-ZERO';
            if (t.includes('MESA OSCILADORA')) return 'OSCILADORA';
            if (t.includes('MOLDE')) return 'MOLDE';
        }
        return '';
    }

    function getSlotLocal(tipo, mcc, pos) {
        const t = tipo.toUpperCase();
        if (mcc === '4') {
            if (t.includes('BOW')) return `BOW-${pos}`;
            if (t.includes('HORIZONTAL')) return `HOR-${pos}`;
            if (t.includes('STRAIGHTENER R1') || t.includes('R1')) return 'STR-1';
            if (t.includes('STRAIGHTENER R2') || t.includes('R2')) return 'STR-2';
            if (t.includes('MOLDE')) return 'MOLDE';
            if (t.includes('BENDER')) return 'BENDER';
            return pos;
        } else if (mcc === '2/3') {
            if (t.includes('CADEIRA SUPERIOR')) return `CAD-SUP-${pos}`;
            if (t.includes('CADEIRA INFERIOR')) return `CAD-INF-${pos}`;
            if (t.includes('SEGMENTO ZERO') || t.includes('SEGUIMENTO ZERO')) return 'SEG-ZERO';
            if (t.includes('MESA OSCILADORA')) return 'OSCILADORA';
            if (t.includes('SEGMENTO') && !t.includes('ZERO')) return `SEG-${pos}`;
            if (t.includes('MOLDE')) return 'MOLDE';
            return pos;
        }
        return pos;
    }

    function getConfigVeio(v) {
        const configs = {
            'C': { mapearSlotLegado: mapearSlotLegadoMCC23 },
            'D': { mapearSlotLegado: mapearSlotLegadoMCC23 },
            'E': { mapearSlotLegado: mapearSlotLegadoMCC23 },
            'F': { mapearSlotLegado: mapearSlotLegadoMCC23 },
            'G': { mapearSlotLegado: mapearSlotLegadoMCC4 },
            'H': { mapearSlotLegado: mapearSlotLegadoMCC4 }
        };
        return configs[v] || null;
    }

    function mapearSlotLegadoMCC23(peca) {
        const t = (peca.tipo || '').toUpperCase();
        const id = (peca.id || '').toUpperCase();
        if (t.includes('MOLDE')) return 'MOLDE';
        if (t.includes('OSCILADORA')) return 'OSCILADORA';
        if (t.includes('ZERO') || t.includes('SEG-0')) return 'SEG-ZERO';
        if (t.includes('SEGMENTO')) {
            const match = id.match(/SEG-?(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num >= 1 && num <= 6) return `SEG-${num}`;
            }
        }
        if (t.includes('CADEIRA SUPERIOR') || t.includes('CAD-SUP')) {
            const match = id.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num >= 43 && num <= 79) return `CAD-SUP-${num}`;
            }
        }
        if (t.includes('CADEIRA INFERIOR') || t.includes('CAD-INF')) {
            const match = id.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num >= 43 && num <= 79) return `CAD-INF-${num}`;
            }
        }
        return null;
    }

    function mapearSlotLegadoMCC4(peca) {
        const t = (peca.tipo || '').toUpperCase();
        const id = (peca.id || '').toUpperCase();
        if (t.includes('MOLDE')) return 'MOLDE';
        if (t.includes('BENDER')) return 'BENDER';
        if (t.includes('BOW')) {
            const match = id.match(/BOW-(\d)/);
            if (match) return `BOW-${match[1]}`;
        }
        if (t.includes('STRAIGHTENER')) {
            if (id.includes('STR-6') || id.includes('R1')) return 'STR-1';
            if (id.includes('STR-7') || id.includes('R2')) return 'STR-2';
        }
        if (t.includes('HORIZONTAL')) {
            const match = id.match(/HOR-(\d+)/);
            if (match) return `HOR-${match[1]}`;
        }
        return null;
    }

    // ==========================================
    // LÓGICA PRINCIPAL
    // ==========================================
    const tipoUpper = (pecaReserva.tipo || '').toUpperCase();
    const tiposFixos = ['MOLDE', 'BENDER', 'STR-1', 'STR-2', 'SEG-ZERO', 'OSCILADORA'];
    const isFixo = tiposFixos.some(f => tipoUpper.includes(f) || tipoUpper === f);
    console.log('🔒 É fixo?', isFixo);

    if (!veio) {
        alert('Selecione o Veio de destino.');
        return;
    }

    const mcc = pecaReserva.mcc_compat || '4';
    if (isFixo) {
        posicao = getSlotFixoLocal(pecaReserva.tipo, mcc);
        if (!posicao) {
            alert('Não foi possível determinar a posição fixa para este equipamento.');
            return;
        }
        console.log('🔒 Posição fixa:', posicao);
    } else {
        if (!posicao || posicao === '') {
            alert('Selecione a Posição de destino para este tipo de equipamento.');
            return;
        }
    }

    const slotChassi = getSlotLocal(pecaReserva.tipo, mcc, posicao);
    console.log('🏷️ Slot:', slotChassi);
    if (!slotChassi) {
        alert('Não foi possível mapear o slot para este equipamento.');
        return;
    }

    // Busca peça antiga
    const config = getConfigVeio(veio);
    let pecaAntiga = null;

    for (const p of BANCO_ATIVOS) {
        const taNoVeio = (p.veio === veio && p.status === "Instalado") ||
                         (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"));
        if (!taNoVeio) continue;

        if (p.posicaoFixa && p.posicaoFixa === slotChassi) {
            pecaAntiga = p;
            break;
        }
        if (!p.posicaoFixa && config && config.mapearSlotLegado) {
            const slotMapeado = config.mapearSlotLegado(p);
            if (slotMapeado === slotChassi) {
                pecaAntiga = p;
                break;
            }
        }
    }

    console.log('🔎 Peça antiga:', pecaAntiga ? pecaAntiga.id : 'Nenhuma');

    if (pecaAntiga) {
        if (confirm(`A peça ${pecaAntiga.id} será SACADA do slot ${slotChassi} (Veio ${veio}) para dar lugar à ${pecaReserva.id}.`)) {
            pecaAntiga.status = "Oficina / Reparo";
            pecaAntiga.local = "Oficina / Reparo";
            pecaAntiga.veio = "";
            pecaAntiga.posicaoFixa = "";
            pecaAntiga.pos = "";
            pecaAntiga.dataReparo = Date.now();
            pecaAntiga.dias = 0;

            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`;
            pecaReserva.veio = veio;
            pecaReserva.posicaoFixa = slotChassi;
            pecaReserva.pos = posicao || slotChassi;
            pecaReserva.status = "Instalado";
            pecaReserva.ordem = getOrdemPadrao(pecaReserva.tipo);

            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            if (window.registrarHistorico) {
                window.registrarHistorico(pecaReserva.id, `Instalado no slot ${slotChassi} do Veio ${veio} (substituiu ${pecaAntiga.id}).`);
                window.registrarHistorico(pecaAntiga.id, `Sacado do slot ${slotChassi} do Veio ${veio} para reparo.`);
            }

            if (typeof renderReparos === 'function') renderReparos();
            if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos();
            if (typeof renderPainelVeios === 'function') renderPainelVeios();
            if (typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
            if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();

            alert(`✅ Swap realizado! ${pecaReserva.id} instalado.`);
        }
    } else {
        if (confirm(`Instalar a reserva ${pecaReserva.id} no slot ${slotChassi} do Veio ${veio}?`)) {
            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`;
            pecaReserva.veio = veio;
            pecaReserva.posicaoFixa = slotChassi;
            pecaReserva.pos = posicao || slotChassi;
            pecaReserva.status = "Instalado";
            pecaReserva.ordem = getOrdemPadrao(pecaReserva.tipo);

            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            if (window.registrarHistorico) {
                window.registrarHistorico(pecaReserva.id, `Instalado no slot ${slotChassi} do Veio ${veio} (gaveta vazia).`);
            }

            if (typeof renderReparos === 'function') renderReparos();
            if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos();
            if (typeof renderPainelVeios === 'function') renderPainelVeios();
            if (typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
            if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();

            alert(`✅ ${pecaReserva.id} instalado com sucesso!`);
        }
    }
};

// ==========================================
// FORÇAR RENDERIZAÇÃO DE RESERVAS E CAMPOS
// ==========================================
window.forcarRenderReservas = function() {
    console.log("🔄 Forçando renderização de reservas...");
    if (typeof renderReservas === 'function') {
        renderReservas();
        console.log("✅ renderReservas() chamada manualmente!");
    } else {
        console.error("❌ renderReservas não está disponível!");
    }
};

window.forcarCamposPosicao = function() {
    console.log("🔄 FORÇANDO CRIAÇÃO DOS CAMPOS DE POSIÇÃO (fallback)...");
    
    const rows = document.querySelectorAll('#estoque-table-body tr');
    let count = 0;
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const posCell = cells[4];
            const tagId = cells[0]?.textContent?.trim();
            
            if (tagId && !posCell.querySelector('input') && !posCell.querySelector('select')) {
                const input = document.createElement('input');
                input.type = 'number';
                input.id = `pos-${tagId}`;
                input.placeholder = 'Pos';
                input.min = 1;
                input.max = 99;
                input.step = 1;
                input.style.cssText = 'width:55px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#1a1a2e; color:#fff; text-align:center;';
                posCell.innerHTML = '';
                posCell.appendChild(input);
                count++;
                console.log(`✅ Campo criado para: ${tagId}`);
            }
        }
    });
    
    if (count > 0) {
        console.log(`✅ ${count} campos de posição foram criados!`);
    } else {
        console.log("ℹ️ Nenhum campo novo criado (já existem ou tabela vazia).");
    }
};

console.log("✅ Script.js carregado - todas as funções expostas globalmente");

// ==========================================
// INICIALIZAÇÃO E SINCRONIZAÇÃO COM A PLANILHA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    carregarTema();
    
    console.log("🔄 Buscando dados reais da Planilha Google...");
    
    const atualizou = await sincronizarAtivosReaisMCC4();
    
    if (atualizou) {
        const jaRecarregou = sessionStorage.getItem('oms_sincronizado_hoje');
        
        if (!jaRecarregou) {
            console.log("✨ Dados novos salvos no cache! Recarregando a tela para aplicar em todos os arquivos...");
            sessionStorage.setItem('oms_sincronizado_hoje', 'true');
            window.location.reload();
        } else {
            console.log("✨ Tela atualizada com os dados 100% reais da planilha!");
            sessionStorage.removeItem('oms_sincronizado_hoje');
           
            const dadosCache = JSON.parse(localStorage.getItem("oms_ativos_v32_local"));

            if (dadosCache && Array.isArray(dadosCache)) {
                BANCO_ATIVOS.length = 0;
                Array.prototype.push.apply(BANCO_ATIVOS, dadosCache);
            }

            window.BANCO_ATIVOS = BANCO_ATIVOS;
            
            if (typeof renderPainelVeios === 'function') renderPainelVeios();
            if (typeof renderAtivos === 'function') renderAtivos();
            if (typeof renderReparos === 'function') renderReparos();
            if (typeof renderReservas === 'function') renderReservas();
            if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
        }
    } else {
        console.log("⚠️ Usando os dados em cache (offline ou sem dados novos).");
    }
});