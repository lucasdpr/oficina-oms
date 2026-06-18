
// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS (VERSÃO DEFINITIVA v36 - TODOS OS MOLDES NO FOLHÃO)
// ==========================================================================
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v32_local"));
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
let BANCO_MATERIAIS = JSON.parse(localStorage.getItem("oms_materiais_v32_local"));

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

// ==========================================================================
// ARRAYS DE CHECKLIST DO FOLHÃO DE MOLDES
// ==========================================================================
const CHECKLIST_RECEBIMENTO = [
    "Os engates rápidos do sistema hidráulico e nitrogênio estão completos e em perfeitas condições?",
    "Os flexíveis das faces estreitas e spray estão amassados e/ou danificados?",
    "Verificar se existe alguma tubulação hidráulica amassada e/ou danificada?",
    "Teste de água com pressão de 10 KGF/cm2 c/ tempo de 30 minutos conforme?",
    "Sensor vuhz se encontra em perfeitas condições?",
    "Verificar se todos os conectores de termopares estão em perfeitas condições e funcionando?",
    "As cangalhas de spray estão em perfeitas condições, sem avarias?",
    "Proteções sanfonadas encontram-se em perfeitas condições?",
    "Tampas e réguas guias das placas estão em perfeitas condições?",
    "Os foot-roll e roletes das guias laterais estão em perfeitas condições?",
    "O sistema de lubrificação possui alguma avaria?",
    "As placas de cobre possuem ferimentos e/ou arranhões profundos na face de trabalho?",
    "As juntas de expansão das placas principais estão em perfeitas condições?",
    "Parafusos de fixação do molde no stand estão completos e em perfeitas condições?",
    "(ELÉTRICA) Conectores do detector de break-out das faces larga estão tampados e em perfeitas condições?",
    "(ELÉTRICA) Cabos elétricos dos termopares do detector de break-out das faces estreitas estão em perfeitas condições?"
];

const CHECKLIST_REVISAO = [
    "Inspeção das proteções sanfonadas dos cilindros das faces estreitas, substituindo as que estiverem danificadas.",
    "Inspeção das proteções sanfonadas dos fusos dos castelos quadrados, substituindo as danificadas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos de porcas e contra porcas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos do castelo quadrado.",
    "Inspeção das hastes dos cilindros das faces estreitas, verificando avarias e vazamentos de óleo.",
    "Inspeção dos cilindros do clamp de abertura da face larga, substituindo os com vazamento.",
    "Inspeção do filtro de óleo do sistema hidráulico, verificando se não está sujo.",
    "Inspeção e lubrificação nos olhais e nas chavetas de fixação das placas laterais.",
    "Inspeção, revisão e lubrificação dos eixos e mancais deslizantes (caixa louca).",
    "Inspeção em todo sistema de lubrificação, corrigindo anomalias. Testar válvulas de graxa.",
    "Inspeção das condições dos flexíveis de água, substituindo os danificados.",
    "Inspeção, revisão e lubrificação dos parafusos de fixação do molde no stand.",
    "Inspeção das tubulações hidráulicas (conferir aperto das conexões).",
    "Alinhar os fusos dos castelos quadrados na medida padrão de 210mm.",
    "Lubrificar e amaciar os fusos do ajuste mecânico.",
    "Inspeção das juntas de expansão (trocar se necessário)."
];

const CHECKLIST_HIDRAULICA = [
    "Check dos cilindros de ajuste de largura do molde.",
    "Verificar vazamento de graxa nas conexões.",
    "Verificar vazamento de óleo nas conexões.",
    "Inspecionar o elemento filtrante da linha de pressão hidráulica e trocar se necessário.",
    "Lubrificação geral de componentes.",
    "Verificar vazamento em mangueiras e dosador, substituir se necessário.",
    "Efetuar a limpeza dos engates hidráulicos.",
    "Embalar engates hidráulicos."
];

const CHECKLIST_FINAL = [
    "Indicadores de pressão de ajuste das molas da placa lado móvel estão completos e alinhados?",
    "Tampa de proteção do molde NÃO está tocando sobre a tubulação de sangria das placas?",
    "Placas de proteção estão calafetadas com fita, desempenadas, alinhadas e fixadas?",
    "Posicionamento dos flexíveis superiores e inferiores estão conformes?",
    "Teste de água com pressão de 10 KGF/cm2 c/ tempo de 30 minutos conforme?",
    "Proteções sanfonadas estão fixadas?",
    "Foot-roll e roletes das guias laterais estão lubrificados e girando normalmente?",
    "Alinhamento dos bicos de spray das faces largas e estreitas?",
    "Parafusos de fixação do molde na máquina estão completos e lubrificados?",
    "Sensor Vuhz está montado corretamente e testado?",
    "A precisão de movimento das faces estreitas estão conforme?",
    "Funcionamento correto das válvulas distribuidoras de graxa, conexões marcadas?",
    "Réguas do ajuste mecânico estão livres e lubrificadas corretamente?",
    "Folga na aresta das faces das placas estreitas e largas (<= 0,35mm)?",
    "Cavidade interna do molde limpa?",
    "Centro do molde está identificado na placa norte e visível ao operador?",
    "Conectores dos termopares das placas estão limpos e tampados?",
    "Teste de profundidade está conforme?",
    "Engates rápidos (hidráulico, N2, graxa) com vedações completas, apertados e limpos?",
    "Base de vedação do molde está limpa e lixada?",
    "Os conectores dos DBO estão todos tamponados e protegidos?"
];

let ID_FOLHAO_ATUAL = null;
let DADOS_FOLGA_ARESTA = {}; 

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

// ==========================================================================
// INICIALIZAÇÃO DE BANCOS DE DADOS
// ==========================================================================
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
    BANCO_ATIVOS.push({ id: `MLD-MCC4-REP`, tipo: "Molde", local: "Oficina / Reparo", pos: "Bancada", dias: 25, ton: 800000, meta: 1000000, ordem: 10, mcc_compat: "4" });

    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
}

if (!BANCO_ROLOS) {
    BANCO_ROLOS = [
        { id: "R-S5", nome: "Rolo de Cadeira 450", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 14 },
        { id: "R-S5P", nome: "Rolo de Cadeira 450 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 8 },
        { id: "R-S4", nome: "Rolo de Cadeira 400", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 12 },
        { id: "R-S4P", nome: "Rolo de Cadeira 400 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 6 },
        { id: "R-H300A", nome: "Rolo Horizontal de 300 Acionado", conjunto: "Segmento", mcc_compat: "4", qtd: 6 },
        { id: "R-200", nome: "Rolo 200", conjunto: "Seguimento Zero", mcc_compat: "2/3/4", qtd: 8 },
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

const NOVOS_NOMES_ROLOS = {
    "R-S5": "Rolo de Cadeira 450",
    "R-S5P": "Rolo de Cadeira 450 Puxador",
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

let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v32_local")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

const CADASTRO_MATRICULAS = {
    
    "1011": "Desenvoldedor do Sistema "
};

let MODO_MODAL_RELATORIO = {};
let ID_REPARO_ATUAL = null;
let ID_HISTORICO_ATUAL = null;

// ==========================================
// TEMA E UI GLOBAL
// ==========================================
window.carregarTema = function() {
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
};

window.toggleTheme = function() {
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
};

window.toggleSidebar = function() {
    document.getElementById('sidebar-menu').classList.toggle('open');
};

// ==========================================
// AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================
window.processarAutenticacaoHome = function() {
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

        if(typeof atualizarInterfaceUsuario === 'function') atualizarInterfaceUsuario();
        if(typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
        if(typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
        if(typeof renderPainelVeios === 'function') renderPainelVeios();
        if(typeof renderAtivos === 'function') renderAtivos();
        if(typeof renderReparos === 'function') renderReparos();
        if(typeof renderReservas === 'function') renderReservas();
        if(typeof renderRolos === 'function') renderRolos();
        if(typeof renderMateriais === 'function') renderMateriais(); 
    } else {
        alert("Falha: Matrícula não localizada.");
    }
};

window.fazerLogout = function() {
    if (confirm("Encerrar o turno?")) {
        registrarHistorico("SISTEMA", "Turno encerrado.");
        OPERADOR_LOGADO = null;
        localStorage.removeItem("oms_operador_v32_local");
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
    }
};

window.verificarAcesso = function() {
    if (!OPERADOR_LOGADO) {
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
        return false;
    }
    return true;
};

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
window.abrirAba = abrirAba;

// ===================================================
// GERENCIADOR DE CHASSIS - SEQUENCIAMENTO DE VEIOS
// ===================================================
window.mudarVeioVisualizado = function(veio) {
    console.log("Montando chassi para o Veio:", veio);
    
    // Atualiza os botões visuais no topo
    document.querySelectorAll('.btn-veio-tab').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Atualiza o título
    const titulo = document.getElementById("titulo-veio-focado");
    if (titulo) titulo.innerHTML = `Sequenciamento Estrutural: <span style="color: var(--text-accent);">Veio ${veio}</span>`;

    const container = document.getElementById("container-fluxo-horizontal-scroll");
    if (!container) return;
    container.innerHTML = ""; // Limpa a tela

    // Busca as peças que estão fisicamente Instaladas neste veio
    const pecasInstaladas = typeof BANCO_ATIVOS !== 'undefined' ? BANCO_ATIVOS.filter(p => p.veio === veio && p.status === "Instalado") : [];

    // ----------------------------------------------------
    // ARQUITETURA MCC 4 (VEIOS G E H) - 19 SLOTS FIXOS
    // ----------------------------------------------------
    if (veio === "G" || veio === "H") {
        const esqueletoMCC4 = [
            { idSlot: "MOLDE", nome: "Molde Alta Perf.", familia: "MOLDE" },
            { idSlot: "BENDER", nome: "Dobrador (Bender)", familia: "BENDER" },
            { idSlot: "BOW-1", nome: "Curvo Bow #01", familia: "BOW" },
            { idSlot: "BOW-2", nome: "Curvo Bow #02", familia: "BOW" },
            { idSlot: "BOW-3", nome: "Curvo Bow #03", familia: "BOW" },
            { idSlot: "BOW-4", nome: "Curvo Bow #04", familia: "BOW" },
            { idSlot: "BOW-5", nome: "Curvo Bow #05", familia: "BOW" },
            { idSlot: "STR-1", nome: "Endireitador R1", familia: "STRAIGHTENER R1" },
            { idSlot: "STR-2", nome: "Endireitador R2", familia: "STRAIGHTENER R2" },
            { idSlot: "HOR-8", nome: "Segmento Horizontal #08", familia: "HORIZONTAL" },
            { idSlot: "HOR-9", nome: "Segmento Horizontal #09", familia: "HORIZONTAL" },
            { idSlot: "HOR-10", nome: "Segmento Horizontal #10", familia: "HORIZONTAL" },
            { idSlot: "HOR-11", nome: "Segmento Horizontal #11", familia: "HORIZONTAL" },
            { idSlot: "HOR-12", nome: "Segmento Horizontal #12", familia: "HORIZONTAL" },
            { idSlot: "HOR-13", nome: "Segmento Horizontal #13", familia: "HORIZONTAL" },
            { idSlot: "HOR-14", nome: "Segmento Horizontal #14", familia: "HORIZONTAL" },
            { idSlot: "HOR-15", nome: "Segmento Horizontal #15", familia: "HORIZONTAL" },
            { idSlot: "HOR-16", nome: "Segmento Horizontal #16", familia: "HORIZONTAL" },
            { idSlot: "HOR-17", nome: "Segmento Horizontal #17", familia: "HORIZONTAL" }
        ];

        let htmlSlots = "";

        esqueletoMCC4.forEach(slot => {
            // Lógica inteligente para tentar achar qual peça do banco encaixa nessa gaveta exata
            let pecaEncontrada = pecasInstaladas.find(p => {
                let tipoUpper = p.tipo.toUpperCase();
                let idUpper = p.id.toUpperCase();
                
                if (slot.familia === "MOLDE" && tipoUpper.includes("MOLDE")) return true;
                if (slot.familia === "BENDER" && tipoUpper.includes("BENDER")) return true;
                
                // Para Bow, Str e Horizontais, checa se a TAG da peça tem o número do slot para não misturar
                if (tipoUpper.includes("BOW") && slot.idSlot.includes("BOW") && idUpper.includes(slot.idSlot.replace("BOW-", ""))) return true;
                if (tipoUpper.includes("STRAIGHTENER") && slot.idSlot.includes("STR") && idUpper.includes(slot.idSlot.replace("STR-", "R"))) return true; 
                if (tipoUpper.includes("HORIZONTAL") && slot.idSlot.includes("HOR") && idUpper.includes(`-${slot.idSlot.replace("HOR-", "")}-`)) return true;
                
                return false;
            });

            if (pecaEncontrada) {
                // DESENHA A GAVETA COM A PEÇA DENTRO
                let pct = pecaEncontrada.limite > 0 ? (pecaEncontrada.ton / pecaEncontrada.limite) * 100 : 0;
                let corClass = pct >= 80 ? "danger" : pct >= 50 ? "warning" : "success";

                htmlSlots += `
                <div class="ind-card glass-panel" style="border-top: 3px solid var(--${corClass}); min-width: 300px;">
                    <div class="flex-between">
                        <h4>${pecaEncontrada.id} <span class="ind-card-tag bg-tag" style="font-size: 10px;">${pecaEncontrada.tipo}</span></h4>
                        <span style="color: var(--${corClass}); font-weight: bold;">${pct.toFixed(1)}%</span>
                    </div>
                    <p class="text-muted" style="font-size: 13px;"><i class="fas fa-layer-group"></i> ${slot.nome}</p>
                    
                    <div class="progress-container mt-10">
                        <div class="progress-bar bg-${corClass}" style="width: ${Math.min(pct, 100)}%;"></div>
                    </div>
                    
                    <div class="flex-between mt-10" style="font-size: 12px;">
                        <span>Ton: <strong>${Number(pecaEncontrada.ton).toLocaleString('pt-BR')}</strong></span>
                        <span>Lim: ${Number(pecaEncontrada.limite).toLocaleString('pt-BR')}</span>
                    </div>
                    
                    <div class="flex-between gap-10 mt-15">
                        <button class="btn-outline-primary w-100" style="padding: 5px;" onclick="window.abrirHistoricoIndividual('${pecaEncontrada.id}')"><i class="fas fa-book"></i> Prontuário</button>
                        <button class="btn-outline-danger w-100" style="padding: 5px;" onclick="console.log('Sacar peça da Gaveta:', '${slot.idSlot}')"><i class="fas fa-exchange-alt"></i> Sacar / Trocar</button>
                    </div>
                </div>`;
            } else {
                // DESENHA A GAVETA VAZIA PISCANDO (SLOT LIVRE)
                htmlSlots += `
                <div class="ind-card glass-panel" style="border: 2px dashed #e74c3c; background: rgba(231, 76, 60, 0.05); min-width: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #e74c3c; margin-bottom: 10px;"></i>
                    <h4 style="color: #e74c3c; margin: 0;">${slot.nome}</h4>
                    <p style="color: #e74c3c; font-size: 12px; margin-top: 5px;">GAVETA VAZIA / SEM PEÇA FÍSICA</p>
                    <button class="btn-premium btn-success mt-15 w-100" onclick="console.log('Alocar nova peça na Gaveta:', '${slot.idSlot}')"><i class="fas fa-plus"></i> Alocar do Estoque</button>
                </div>`;
            }
        });

        container.innerHTML = htmlSlots;
    } 
    // ----------------------------------------------------
    // ARQUITETURA MCC 2 e 3 (VEIOS C, D, E, F)
    // ----------------------------------------------------
    else {
        container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted); width: 100%;">
            <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
            <h3>Estrutura da Máquina 2/3 em Construção</h3>
            <p>O chassi fixo para os veios C, D, E e F será implementado assim que a estrutura for mapeada.</p>
        </div>`;
    }
};

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

// ==========================================
// ROTEADOR PRINCIPAL: ABRE A JANELA CORRETA PARA CADA PEÇA!
// ==========================================


window.abrirJanelaReparoSimples = function(item) {
    const modalSimples = document.getElementById("modal-concluir-reparo");
    if (!modalSimples) return;

    ID_REPARO_ATUAL = item.id;
    
    const tagElement = document.getElementById("modal-reparo-tag");
    if (tagElement) tagElement.innerText = item.id;
    
    const tipoReparo = document.getElementById("modal-tipo-reparo");
    if (tipoReparo) tipoReparo.value = "GERAL";
    
    const repTon = document.getElementById("modal-reparo-ton");
    if (repTon) repTon.value = Math.round(item.ton);
    
    const repDias = document.getElementById("modal-reparo-dias");
    if (repDias) repDias.value = item.dias;
    
    if (typeof window.toggleCamposReparoParcial === 'function') window.toggleCamposReparoParcial();
    else if (typeof toggleCamposReparoParcial === 'function') toggleCamposReparoParcial();

    modalSimples.classList.remove("hidden");
};

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
// SISTEMA AVANÇADO DO FOLHÃO DE MOLDES (TODAS AS FAMÍLIAS)
// ==========================================

// FUNÇÕES DA MEMÓRIA DE FOLGA DE ARESTAS
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

function injetarAbasFaltantes() {
    // Injeta de forma dinâmica para não exigir que mexa no arquivo HTML inteiro
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

            // Injeta o conteúdo dinâmico do formulário
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

// Essa função agora atende a TODOS os moldes!
function abrirFolhaoMolde(id) {
    injetarAbasFaltantes();
    
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    ID_FOLHAO_ATUAL = id;
    DADOS_FOLGA_ARESTA = {}; // Reinicia a memória de arestas
    
    // Atualiza o título do modal dinamicamente de acordo com a família do Molde
    const tituloPrincipal = document.querySelector("#modal-folhao-mcc4 h2");
    if(tituloPrincipal) {
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
    carregarMedidaAresta(); // Carrega a primeira largura padrão
    document.getElementById("modal-folhao-mcc4").classList.remove("hidden");
}

function fecharFolhaoMolde() {
    document.getElementById("modal-folhao-mcc4").classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

// Mudei apenas a chamada no botão do HTML virtual, mantendo os mesmos nomes para não quebrar seu HTML base.
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

// Extrai as opções marcadas do checklist para o PDF
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

// A FUNÇÃO SALVADORA
window.salvarEImprimirFolhaoMCC4 = function() {
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
    
    // GUARDA A TAG ANTES DE LIMPAR A MEMÓRIA PARA NÃO DAR "null" NO PDF!
    let tagParaImprimir = ID_FOLHAO_ATUAL;
    
    let linkImprimir = `<button class='btn-xs-primary' style='margin-left:10px; cursor:pointer; color:var(--text-accent)' onclick='imprimirLaudoSalvo("${tagParaImprimir}", "${motivo}")'><i class='fas fa-print'></i> Imprimir Folhão</button>`;
    
    registrarHistorico(item.id, `Folhão (${item.mcc_compat}) Assinado. Execução: ${tipoExecucao}. Motivo: ${motivo}. ${linkImprimir}`);
    
    // 1º FECHA O MODAL
    fecharFolhaoMolde();
    
    // 2º RENDERIZA AS TABELAS
    renderReparos();
    renderReservas();
    renderAtivos();
    calcularKpisGlobais();
    
    // 3º CHAMA O PDF COM A TAG GUARDAADA!
    imprimirLaudoSalvo(tagParaImprimir, motivo);
}

// Helper rápido para ler os inputs
function getV(id) {
    let el = document.getElementById(id);
    return el && el.value ? el.value : ' - ';
}

// IMPRESSÃO MASTER DO PDF CSN
window.imprimirLaudoSalvo = function(tag, motivo) {
    const printDiv = document.getElementById("print-content");
    let materiais = document.getElementById("materiais-utilizados-texto") ? document.getElementById("materiais-utilizados-texto").value : "";
    
    let itemData = BANCO_ATIVOS.find(a => a.id === tag);
    let familiaMolde = itemData ? itemData.mcc_compat : "2/3/4";

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

    let tableTermoLargas = "";
    for(let i=1; i<=12; i++) {
        tableTermoLargas += `<tr><td>Termopar ${i} (10-20 Ω)</td><td>${getV('t-fix-' + i)}</td><td>${getV('t-mov-' + i)}</td></tr>`;
    }
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV('t-fix-p1')}</td><td>${getV('t-mov-p1')}</td></tr>`;
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 2</td><td>${getV('t-fix-p2')}</td><td>${getV('t-mov-p2')}</td></tr>`;

    let tableTermoEstreitas = "";
    for(let i=1; i<=3; i++) {
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
// CADASTRO DE NOVAS PEÇAS (ESTOQUE) E ROLOS
// ==========================================
function toggleFormAdicionar() {
    document.getElementById("form-novo-equipamento").classList.toggle("hidden");
}

function salvarNovoEquipamento() {
    if (!verificarAcesso()) return;
    
    const tag = document.getElementById("add-tag").value.trim().toUpperCase();
    const valorCompleto = document.getElementById("add-tipo").value;
    const meta = parseFloat(document.getElementById("add-meta").value);

    if (!tag || !meta) { return alert("Preencha TAG e Meta."); }
    if (BANCO_ATIVOS.find(a => a.id === tag)) { return alert("TAG já cadastrada."); }

    const [tipo, mcc_compat] = valorCompleto.split("|");
    
    BANCO_ATIVOS.push({
        id: tag, tipo: tipo, local: "Oficina / Reserva", pos: "Estoque", dias: 0, ton: 0, meta: meta, ordem: getOrdemPadrao(tipo), mcc_compat: mcc_compat
    });

    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    registrarHistorico(tag, `Peça nova (${tipo} MCC ${mcc_compat}) cadastrada.`);

    document.getElementById("add-tag").value = ""; document.getElementById("add-meta").value = "";
    toggleFormAdicionar(); renderReservas(); calcularKpisGlobais(); renderAtivos();
}

function renderRolos() {
    const tbody = document.getElementById("rolos-table-body"); if (!tbody) return;
    let htmlFinal = ""; const equipamentosDiferentes = [...new Set(BANCO_ROLOS.map(r => r.conjunto))].sort();

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
        rolo.qtd += fator; localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
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

    if (filtrados.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum material encontrado.</td></tr>`; return; }

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

function toggleFormMaterial() { let form = document.getElementById("form-novo-material"); if (form) form.classList.toggle("hidden"); }

function salvarEntradaMaterial() {
    if (!verificarAcesso()) return;
    const codigo = document.getElementById("mat-codigo").value.trim().toUpperCase();
    const descricao = document.getElementById("mat-descricao").value.trim().toUpperCase();
    const qtd = parseInt(document.getElementById("mat-qtd").value) || 0;

    if (!codigo || !descricao || qtd <= 0) { return alert("Por favor, preencha o código, a descrição correta e uma quantidade maior que zero."); }

    let materialExistente = BANCO_MATERIAIS.find(m => m.codigo === codigo);
    if (materialExistente) {
        materialExistente.qtd += qtd; registrarHistorico("ALMOXARIFADO", `Adição no material [${codigo}]. +${qtd} UN. Saldo atual: ${materialExistente.qtd} UN.`);
        alert(`SUCESSO!\nO código ${codigo} já existe no sistema.\nSomamos a quantidade de ${qtd} UN ao saldo atual.`);
    } else {
        BANCO_MATERIAIS.unshift({ codigo: codigo, descricao: descricao, qtd: qtd }); registrarHistorico("ALMOXARIFADO", `Material [${codigo}] cadastrado. Entrada: ${qtd} UN.`);
        alert(`NOVO MATERIAL CADASTRADO!\nCódigo ${codigo} adicionado com saldo de ${qtd} UN.`);
    }
    localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
    document.getElementById("mat-codigo").value = ""; document.getElementById("mat-descricao").value = ""; document.getElementById("mat-qtd").value = "";
    toggleFormMaterial(); renderMateriais();
}

function ajustarSaldoMaterial(codigo, fator) {
    if (!verificarAcesso()) return;
    let material = BANCO_MATERIAIS.find(m => m.codigo === codigo);
    if (material) {
        if (material.qtd + fator < 0) { return alert("O estoque não pode ficar negativo."); }
        material.qtd += fator; localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
        let acao = fator > 0 ? "Entrada" : "Saída"; registrarHistorico("ALMOXARIFADO", `Ajuste manual (${acao}) no material [${codigo}]. Novo saldo: ${material.qtd} UN.`); renderMateriais();
    }
}

function removerMaterial(codigo) {
    if (!verificarAcesso()) return;
    if (confirm(`Atenção!\nTem certeza que deseja apagar o registro do material [${codigo}] do sistema?`)) {
        BANCO_MATERIAIS = BANCO_MATERIAIS.filter(m => m.codigo !== codigo); localStorage.setItem("oms_materiais_v32_local", JSON.stringify(BANCO_MATERIAIS));
        registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`); renderMateriais();
    }
}

// ==========================================
// SEGURANÇA E INICIALIZAÇÃO
// ==========================================
function dispararEmergencia() {
    EM_EMERGENCIA = `⚠️ ALERTA PANICO - INTERVENÇÃO FORÇADA`;
    localStorage.setItem("oms_emergencia_v32_local", JSON.stringify(EM_EMERGENCIA));
    registrarHistorico("ALERTA", "Botão de Pânico acionado."); exibirBarraEmergencia();
}

function encerrarEmergencia() {
    EM_EMERGENCIA = null; localStorage.removeItem("oms_emergencia_v32_local");
    document.getElementById("barra-emergencia").style.display = "none"; registrarHistorico("ALERTA", "Alarme resetado.");
}

function exibirBarraEmergencia() {
    if (EM_EMERGENCIA) { document.getElementById("texto-emergencia").innerText = EM_EMERGENCIA; document.getElementById("barra-emergencia").style.display = "block"; }
}

document.addEventListener("DOMContentLoaded", () => {
    if(typeof carregarTema === 'function') carregarTema(); 
    if(typeof exibirBarraEmergencia === 'function') exibirBarraEmergencia();
    
    if (OPERADOR_LOGADO) {
        const telaLogin = document.getElementById("tela-login-home");
        const telaSistema = document.getElementById("container-sistema-oms");
        
        // Só esconde e mostra se as telas realmente existirem no HTML
        if (telaLogin) telaLogin.style.display = "none";
        if (telaSistema) telaSistema.style.display = "flex";
        
        if(typeof atualizarInterfaceUsuario === 'function') atualizarInterfaceUsuario(); 
        if(typeof calcularKpisGlobais === 'function') calcularKpisGlobais(); 
        if(typeof renderPainelVeios === 'function') renderPainelVeios(); 
        if(typeof renderAtivos === 'function') renderAtivos(); 
        if(typeof renderReparos === 'function') renderReparos(); 
        if(typeof renderReservas === 'function') renderReservas();
    }

    // ADICIONE ESSE BLOCO AQUI ABAIXO NA MARRA:
    // Ele vai ler o folhoes.html e injetar na gaveta para o Molde voltar a funcionar
    fetch('folhoes.html')
        .then(response => response.text())
        .then(html => {
            const gaveta = document.getElementById('gaveta-de-folhoes');
            if (gaveta) {
                gaveta.innerHTML = html;
                console.log("Todos os folhões antigos foram reinjetados com sucesso!");
            }
        })
        .catch(err => console.error("Erro ao resgatar os folhões:", err));
});

// ==========================================
// CONTROLE DE ABAS DO SEGMENTO ZERO (FIXO NO DOM)
// ==========================================
window.trocarAbaSegZero = function(event, idAba) {
    const container = document.getElementById("modal-folhao-segmento-zero");
    if (!container) return;
    
    // Oculta todos os conteúdos das abas internas
    container.querySelectorAll('.folhao-content').forEach(content => {
        content.style.display = 'none';
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    // Remove classe ativa de todos os botões de abas
    container.querySelectorAll('.folhao-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Ativa a aba selecionada
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        abaAlvo.classList.remove('hidden');
        abaAlvo.classList.add('active');
    }
    event.currentTarget.classList.add('active');
};


// ==========================================
// BLINDAGEM DE ESCOPO GLOBAL - LAUDOS E PDFs
// ==========================================
if (typeof salvarLaudoInteligente === 'function') {
    window.salvarLaudoInteligente = salvarLaudoInteligente;
}
if (typeof gerarPDF === 'function') {
    window.gerarPDF = gerarPDF;
}
if (typeof imprimirLaudo === 'function') {
    window.imprimirLaudo = imprimirLaudo;
}
if (typeof fecharFolhaoMolde === 'function') {
    window.fecharFolhaoMolde = fecharFolhaoMolde;
}
if (typeof abrirFolhaoMolde === 'function') {
    window.abrirFolhaoMolde = abrirFolhaoMolde;
}

// ==========================================
// LIBERAÇÃO DE TROCA DE EQUIPAMENTOS E SALVAR
// ==========================================
if (typeof iniciarSwapAlocacao === 'function') {
    window.iniciarSwapAlocacao = iniciarSwapAlocacao;
}
if (typeof confirmarSwapAlocacao === 'function') {
    window.confirmarSwapAlocacao = confirmarSwapAlocacao;
}
if (typeof salvarLaudo === 'function') {
    window.salvarLaudo = salvarLaudo;
}
if (typeof verificarAcesso === 'function') {
    window.verificarAcesso = verificarAcesso;
}

// ==========================================
// LIBERAÇÃO DE CONFIRMAÇÃO DE MODAIS
// ==========================================
if (typeof confirmarRelatorio === 'function') {
    window.confirmarRelatorio = confirmarRelatorio;
}
if (typeof abrirModalRelatorio === 'function') {
    window.abrirModalRelatorio = abrirModalRelatorio;
}
if (typeof fecharModalRelatorio === 'function') {
    window.fecharModalRelatorio = fecharModalRelatorio;
}
if (typeof iniciarSaque === 'function') {
    window.iniciarSaque = iniciarSaque;
}

// ==========================================
// LIBERAÇÃO DE CADASTRO DE PEÇAS E ESTOQUE
// ==========================================
if (typeof toggleFormAdicionar === 'function') {
    window.toggleFormAdicionar = toggleFormAdicionar;
}
if (typeof salvarNovoEquipamento === 'function') {
    window.salvarNovoEquipamento = salvarNovoEquipamento;
}
if (typeof toggleFormMaterial === 'function') {
    window.toggleFormMaterial = toggleFormMaterial;
}
if (typeof salvarEntradaMaterial === 'function') {
    window.salvarEntradaMaterial = salvarEntradaMaterial;
}
if (typeof alterarSaldoRolo === 'function') {
    window.alterarSaldoRolo = alterarSaldoRolo;
}
if (typeof ajustarSaldoMaterial === 'function') {
    window.ajustarSaldoMaterial = ajustarSaldoMaterial;
}
if (typeof removerMaterial === 'function') {
    window.removerMaterial = removerMaterial;
}
if (typeof fecharModalConcluirReparo === 'function') {
    window.fecharModalConcluirReparo = fecharModalConcluirReparo;
}
// ==========================================
// INJEÇÃO DINÂMICA DE MODAIS (FOLHÕES)
// ==========================================
window.FOLHOES_INJETADOS = false;

// ==========================================
// ROTEADOR DIRETO - VOLTANDO A FUNCIONAR TUDO
// ==========================================
window.abrirModalConcluirReparo = function(id) {
    console.log("Roteador lendo TAG:", id);
    let item = typeof BANCO_ATIVOS !== 'undefined' ? BANCO_ATIVOS.find(a => a.id === id) : null;
    let tipoUpper = item && item.tipo ? item.tipo.toUpperCase() : "";

    // Oculta modais padrão e Segmento Zero para evitar sobreposição
    ['modal-concluir-reparo', 'modal-folhao-segmento-zero'].forEach(idModal => {
        const m = document.getElementById(idModal);
        if(m) { m.style.display = 'none'; m.classList.add('hidden'); }
    });

    // 1. ROTA SEGMENTO ZERO
    if (id.includes("SEG-0")) {
        const modalSegZero = document.getElementById("modal-folhao-segmento-zero");
        if (modalSegZero) {
            modalSegZero.style.setProperty('display', 'flex', 'important');
            modalSegZero.classList.remove("hidden");
            const tagAtivo = document.getElementById("segzero-tag-ativo");
            if (tagAtivo) tagAtivo.innerText = id;
        }
        return;
    }

    // 2. ROTA MOLDE 2/3
    if (id.includes("MLD") || tipoUpper.includes("MOLDE")) {
        if (typeof window.abrirFolhaoMolde23 === 'function') {
            window.abrirFolhaoMolde23(id);
            return;
        }
    }

    // 3. ROTA PADRÃO (BENDER E OUTROS REPAROS COMUNS)
    const modalSimples = document.getElementById("modal-concluir-reparo");
    if (modalSimples) {
        window.ID_REPARO_ATUAL = id;
        modalSimples.style.setProperty('display', 'flex', 'important');
        modalSimples.classList.remove("hidden");
        
        const tagElement = document.getElementById("modal-reparo-tag");
        if (tagElement) tagElement.innerText = id;
    }
};

// Amarra as funções essenciais de fechamento e conclusão direto no escopo global do window
window.confirmarConclusaoReparo = function() {
    // Chama a função local confirmarConclusaoReparo caso exista, evite sobrescrever
    if (typeof confirmarConclusaoReparo === 'function') {
        confirmarConclusaoReparo();
    } else {
        console.log("Executando salvamento padrão para a TAG:", window.ID_REPARO_ATUAL);
        const modalSimples = document.getElementById("modal-concluir-reparo");
        if (modalSimples) { modalSimples.style.display = 'none'; modalSimples.classList.add('hidden'); }
    }
};

// ===================================================
// DESTRANCANDO O HISTÓRICO PARA O HTML
// ===================================================
if (typeof abrirHistoricoIndividual === 'function') {
    window.abrirHistoricoIndividual = abrirHistoricoIndividual;
}

if (typeof fecharModalHistorico === 'function') {
    window.fecharModalHistorico = fecharModalHistorico;
} else {
    // Caso a função de fechar não exista com esse nome, cria uma forçada na marra
    window.fecharModalHistorico = function() {
        const modalHist = document.getElementById("modal-historico-individual");
        if (modalHist) { 
            modalHist.style.display = 'none'; 
            modalHist.classList.add('hidden'); 
        }
    };
}
// ===================================================
// CHAVE MESTRA: DESTRANCANDO TODA A NAVEGAÇÃO DO HTML
// ===================================================

// 1. Navegação, Layout e Login
if (typeof abrirAba === 'function') window.abrirAba = abrirAba;
if (typeof toggleSidebar === 'function') window.toggleSidebar = toggleSidebar;
if (typeof toggleTheme === 'function') window.toggleTheme = toggleTheme;
if (typeof fazerLogout === 'function') window.fazerLogout = fazerLogout;
if (typeof processarAutenticacaoHome === 'function') window.processarAutenticacaoHome = processarAutenticacaoHome;

// 2. Filtros e Veios (O SEU ERRO DO PRINT)
if (typeof mudarVeioVisualizado === 'function') window.mudarVeioVisualizado = mudarVeioVisualizado;
if (typeof aplicarFiltrosMCC === 'function') window.aplicarFiltrosMCC = aplicarFiltrosMCC;
if (typeof renderAtivos === 'function') window.renderAtivos = renderAtivos;

// 3. Estoque e Almoxarifado
if (typeof toggleFormAdicionar === 'function') window.toggleFormAdicionar = toggleFormAdicionar;
if (typeof salvarNovoEquipamento === 'function') window.salvarNovoEquipamento = salvarNovoEquipamento;
if (typeof renderMateriais === 'function') window.renderMateriais = renderMateriais;
if (typeof toggleFormMaterial === 'function') window.toggleFormMaterial = toggleFormMaterial;
if (typeof salvarEntradaMaterial === 'function') window.salvarEntradaMaterial = salvarEntradaMaterial;

// 4. Botões de Emergência
if (typeof dispararEmergencia === 'function') window.dispararEmergencia = dispararEmergencia;
if (typeof encerrarEmergencia === 'function') window.encerrarEmergencia = encerrarEmergencia;
// Liberando a edição de tabelas
if (typeof fazerCelulaEditavel === 'function') window.fazerCelulaEditavel = fazerCelulaEditavel;

// Dica: Se existir uma função para salvar essa edição depois de digitar, já libere ela também:
if (typeof salvarEdicaoCelula === 'function') window.salvarEdicaoCelula = salvarEdicaoCelula;
// ===================================================
// MOTOR DE CADASTRO E POSIÇÕES FIXAS
// ===================================================

window.atualizarPosicoesCadastro = function() {
    const tipo = document.getElementById("add-tipo").value;
    const selectPos = document.getElementById("add-posicao");
    selectPos.innerHTML = ""; // Limpa as opções

    if (tipo.includes("Bow")) {
        for(let i=1; i<=5; i++) selectPos.innerHTML += `<option value="BOW-${i}">Posição ${i}</option>`;
    } 
    else if (tipo.includes("Horizontal")) {
        for(let i=8; i<=17; i++) selectPos.innerHTML += `<option value="HOR-${i}">Posição ${i}</option>`;
    } 
    else if (tipo.includes("Straightener R1")) {
        selectPos.innerHTML = `<option value="STR-1">Posição Única (R1)</option>`;
    } 
    else if (tipo.includes("Straightener R2")) {
        selectPos.innerHTML = `<option value="STR-2">Posição Única (R2)</option>`;
    } 
    else if (tipo.includes("Molde")) {
        selectPos.innerHTML = `<option value="MOLDE">Gaveta 0 (Topo)</option>`;
    } 
    else if (tipo.includes("Bender")) {
        selectPos.innerHTML = `<option value="BENDER">Gaveta 1 (Bender)</option>`;
    } 
    else {
        selectPos.innerHTML = `<option value="GERAL">Uso Geral / Sem Posição Fixa</option>`;
    }
};

window.processarCadastroPeca = function() {
    const tag = document.getElementById("add-tag").value.trim() || `NOVA-PECA-${Math.floor(Math.random()*1000)}`;
    const tipoValor = document.getElementById("add-tipo").value || "";
    const tipoSplit = tipoValor.split("|");
    const familia = tipoSplit[0] || ""; // Garante que nunca seja undefined
    
    const limite = parseFloat(document.getElementById("add-meta").value) || 1000000;
    const veio = document.getElementById("add-veio").value || "";
    const posicao = document.getElementById("add-posicao").value || "";
    const instalarDireto = document.getElementById("add-instalar-direto").checked;

    // Define status e também o LOCAL (o que estava dando o erro undefined)
    const statusFinal = instalarDireto ? "Instalado" : "Oficina / Reserva";
    const localFinal = instalarDireto ? `MCC - Veio ${veio}` : "Estoque Reserva";

    const novaPeca = {
        id: tag,
        tipo: familia,
        veio: veio,
        local: localFinal, // <--- A salvação da lavoura pro renderAtivos
        posicaoFixa: posicao,
        status: statusFinal,
        ton: 0,
        dias: 0,
        limite: limite
    };

    if (typeof BANCO_ATIVOS !== 'undefined') {
        BANCO_ATIVOS.push(novaPeca);
        alert(`Sucesso! Peça ${tag} salva na gaveta e alocada como: ${statusFinal}`);
        
        // Atualiza as telas de forma segura (se uma der erro, não trava a outra)
        try { if(typeof renderReservas === 'function') renderReservas(); } catch(e){ console.warn(e); }
        try { if(typeof renderAtivos === 'function') renderAtivos(); } catch(e){ console.warn(e); }
        
        // Se instalou direto, recarrega o chassi para mostrar a peça nova na gaveta!
        if (instalarDireto && typeof mudarVeioVisualizado === 'function') {
            mudarVeioVisualizado(veio);
        }
    }
};