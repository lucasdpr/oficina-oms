// banco.js - O Coração de Dados do Sistema

export let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v32_local"));
export let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
export let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
export let BANCO_MATERIAIS = JSON.parse(localStorage.getItem("oms_materiais_v32_local"));
export let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v32_local")) || null;
export let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
export let VEIO_SELECIONADO_PAINEL = "C";

export const CADASTRO_MATRICULAS = {
    "40090430": "Filipe (Líder)",
    "40075827": "Denilson (Líder)",
    "40080751": "Valmir (Líder)",
    "40090851": "Samuel (Líder)",
    "1011": "Supervisor"
};

// ==========================================================================
// INICIALIZAÇÃO AUTOMÁTICA DOS BANCOS DE DADOS
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