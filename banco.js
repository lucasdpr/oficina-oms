// banco.js - O Coração de Dados do Sistema

export let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v32_local"));
export let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
export let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
export let BANCO_HIDRAULICA = JSON.parse(localStorage.getItem("oms_hidraulica_v32_local"));
export let BANCO_MATERIAIS = JSON.parse(localStorage.getItem("oms_materiais_v32_local"));
export let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v32_local")) || null;
export let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
export let VEIO_SELECIONADO_PAINEL = "C";

export const CADASTRO_MATRICULAS = {
    "1011": "Desenvoldedor"
};


const API_PLANILHA_URL = "https://script.google.com/macros/s/AKfycby_XSR5hrrvOgDEqlWhbKC2l7iPjthe6ht5YrabNliXsFlkNhzYGFU2BR8JUhzv8yY2/exec";

// ==========================================================================
// URL DA API PYTHON — resolvida sozinha em tempo real: tenta o servidor
// local (uvicorn) primeiro; se não responder em 1,5s (ou o arquivo foi
// aberto direto com duplo-clique, sem servidor nenhum), usa o backend
// publicado no Render. Resolvido uma vez e reaproveitado nas chamadas
// seguintes, pra não ficar testando toda hora.
// ==========================================================================
const URL_LOCAL = "http://localhost:8000";
const URL_RENDER = "https://api-oms-csn.onrender.com";

export function fetchComTimeout(url, opts = {}, ms = 1500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ==========================================================================
// FETCH DE DADOS COM TIMEOUT + RETRY (pro banco "acordar" sem travar a tela)
// ==========================================================================
// Diferente do fetchComTimeout acima (usado só pra testar se o servidor
// local existe, com timeout curto de 1,5s), esta função é usada em TODAS
// as chamadas que buscam/enviam dados reais pro Neon. Sem um timeout aqui,
// se o banco estiver "acordando" de um autosuspend (ou a conexão cair no
// meio do caminho), o fetch podia ficar pendurado pra sempre — travando a
// tela em "carregando" eternamente, mesmo o app tendo entrado com sucesso.
// Agora: espera até 20s por tentativa: se estourar, tenta mais 1 vez (dando
// tempo do banco terminar de acordar) antes de desistir de vez.
export async function fetchDadosComTimeout(url, opts = {}, { tentativas = 3, timeoutMs = 30000, esperaMs = 4000 } = {}) {
    for (let i = 0; i <= tentativas; i++) {
        try {
            return await fetchComTimeout(url, opts, timeoutMs);
        } catch (e) {
            if (i === tentativas) throw e;
            console.warn(`⚠️ Timeout/erro de conexão (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, esperaMs));
        }
    }
}

let apiBaseResolvida = null;
let apiBaseResolvendo = null;

export async function resolverApiBase() {
    if (apiBaseResolvida) return apiBaseResolvida;
    if (apiBaseResolvendo) return apiBaseResolvendo;

    apiBaseResolvendo = (async () => {
        try {
            const resp = await fetchComTimeout(`${URL_LOCAL}/`, {}, 1500);
            if (resp.ok) { apiBaseResolvida = URL_LOCAL; return URL_LOCAL; }
        } catch (e) { /* servidor local indisponível, segue pro Render */ }
        apiBaseResolvida = URL_RENDER;
        return URL_RENDER;
    })();

    return apiBaseResolvendo;
}

// FUNÇÃO AUXILIAR EXPORTADA PARA ORDEM PADRÃO
// ==========================================================================
export function getOrdemPadrao(tipo) {
    if (tipo === "Molde") return 10;
    if (tipo === "Segmento Zero") return 30;
    if (tipo === "Grupo 1") return 31;
    if (tipo === "Grupo 2") return 32;
    if (tipo === "Grupo 3") return 33;
    if (tipo === "Bender") return 40;
    if (tipo === "Cadeira Superior") return 100;
    if (tipo === "Cadeira Inferior") return 200;
    if (tipo === "Bow") return 300;
    if (tipo === "Straightener") return 400;
    if (tipo === "Horizontal") return 500;
    return 999;
}

// ==========================================================================
// TRADUÇÃO: vocabulário bruto da planilha (API) -> vocabulário canônico
// que o resto do sistema (dados.js, ui.js, folhões) já espera.
// A planilha usa "CADEIRA SUP", "ZERO", "R1"/"R2", "HORIZONTAL 3" etc;
// o sistema usa "Cadeira Superior", "Segmento Zero", "Straightener",
// "Horizontal". Isso evita que peças caiam em "Outros" por engano.
// ==========================================================================
const TRADUCAO_TIPO = {
    "MOLDE": "Molde",
    "BENDER": "Bender",
    "BOW": "Bow",
    "R1": "Straightener",
    "R2": "Straightener",
    "ZERO": "Segmento Zero",
    "CADEIRA SUP": "Cadeira Superior",
    "CADEIRA INF": "Cadeira Inferior",
    "GRUPO 1": "Grupo 1",
    "GRUPO 2": "Grupo 2",
    "GRUPO 3": "Grupo 3"
};

export function traduzirTipo(tipoBruto) {
    if (!tipoBruto) return tipoBruto;
    const t = String(tipoBruto).toUpperCase().trim();
    if (t.startsWith("HORIZONTAL")) return "Horizontal";
    return TRADUCAO_TIPO[t] || tipoBruto;
}

// Gera um rótulo de posição legível (ex: "Cad Sup 73") a partir do
// id de sistema (ex: "CAD-SUP-73-2C"), no mesmo estilo que os dados
// padrão do sistema já usam.
function gerarLabelPosicao(tipoCanonico, idSistema) {
    const partes = String(idSistema).split('-');
    if (tipoCanonico === "Cadeira Superior") return `Cad Sup ${partes[2] || ''}`.trim();
    if (tipoCanonico === "Cadeira Inferior") return `Cad Inf ${partes[2] || ''}`.trim();
    if (tipoCanonico === "Bow") return `Curvo Bow #0${partes[1] || ''}`;
    if (tipoCanonico === "Straightener") return `Endireitador #0${partes[1] || ''}`;
    if (tipoCanonico === "Horizontal") {
        const n = partes[1] || '';
        return `Horizontal #${n.length < 2 ? '0' + n : n}`;
    }
    if (tipoCanonico === "Molde") return "Molde";
    if (tipoCanonico === "Bender") return "Dobrador (Bender)";
    if (tipoCanonico === "Segmento Zero") return "Segmento Zero";
    if (tipoCanonico.startsWith("Grupo")) return tipoCanonico;
    return idSistema;
}

// ==========================================================================
// INICIALIZAÇÃO AUTOMÁTICA DOS BANCOS DE DADOS
// ==========================================================================
if (!BANCO_ATIVOS || BANCO_ATIVOS.length === 0) {   
    BANCO_ATIVOS = [];
    const veiosMcc23 = [{ mcc: 2, veio: "C" }, { mcc: 2, veio: "D" }, { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }];
    
    veiosMcc23.forEach(m => {
        const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
        BANCO_ATIVOS.push({ id: `MLD-2${m.veio}`, tipo: "Molde", local: vNome, pos: `Molde Veio ${m.veio}`, dias: 14, ton: 1000000, meta: 1200000, ordem: 10, mcc_compat: "2/3" });
        BANCO_ATIVOS.push({ id: `SEG-0-2${m.veio}`, tipo: "Segmento Zero", local: vNome, pos: "Segmento Zero", dias: 38, ton: 142100, meta: 450000, ordem: 30, mcc_compat: "2/3" });

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
        
        // Bow (Mantido padrão de 1 a 5)
        for (let b = 1; b <= 5; b++) BANCO_ATIVOS.push({ id: `BOW-${b}-4${veio}`, tipo: "Bow", local: vNome, pos: `Curvo Bow #0${b}`, dias: 60, ton: 650000, meta: 1600000, ordem: 300 + b, mcc_compat: "4" });
        
        // Straightener: ID usa STR-1/STR-2 (bate com o R1/R2 real da planilha e com o ui.js)
        for (let s = 1; s <= 2; s++) BANCO_ATIVOS.push({ id: `STR-${s}-4${veio}`, tipo: "Straightener", local: vNome, pos: `Endireitador #0${s}`, dias: 88, ton: 910000, meta: 1800000, ordem: 400 + s, mcc_compat: "4" });
        
        // ⚡ CORREÇÃO: Horizontal configurado com ID real de 8 a 17 para sincronizar com a planilha
        for (let h = 8; h <= 17; h++) BANCO_ATIVOS.push({ id: `HOR-${h}-4${veio}`, tipo: "Horizontal", local: vNome, pos: `Horizontal #${h < 10 ? '0'+h : h}`, dias: 102, ton: 430000, meta: 2000000, ordem: 500 + h, mcc_compat: "4" });
    });

    // Pushes de Equipamentos Reservas e de Oficina
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
        { id: "R-200", nome: "Rolo 200", conjunto: "Segmento Zero", mcc_compat: "2/3/4", qtd: 8 },
        { id: "R-FR23", nome: "Foot Roll", conjunto: "Molde", mcc_compat: "2/3", qtd: 4 }
    ];
    localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
}

if (!BANCO_HIDRAULICA) {
    BANCO_HIDRAULICA = [
        // ---- MCC 2/3 ----
        { id: "H-PGH12", nome: "Porca Hidráulica Grupo 1,2", conjunto: "Grupo 1,2", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-PGH3", nome: "Porca Hidráulica Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-CIL-G1", nome: "Cilindro de Grupo 1", conjunto: "Grupo 1", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-CIL-G2", nome: "Cilindro de Grupo 2", conjunto: "Grupo 2", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-CIL-G3", nome: "Cilindro de Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-DESEMP", nome: "Desempenadeira Cadeira", conjunto: "Cadeira", mcc_compat: "2/3", qtd_aplicado: 0, qtd_reserva: 0 },
        // ---- MCC 4 ----
        { id: "H-CIL-ELEV4", nome: "Cilindro de Elevação de Estrutura", conjunto: "Estrutura", mcc_compat: "4", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-CIL-PUX4", nome: "Cilindro Puxador", conjunto: "Puxador", mcc_compat: "4", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-PH-BOW", nome: "Porca Hidráulica Bow", conjunto: "Bow", mcc_compat: "4", qtd_aplicado: 0, qtd_reserva: 0 },
        { id: "H-PH-HOR", nome: "Porca Hidráulica Horizontal", conjunto: "Horizontal", mcc_compat: "4", qtd_aplicado: 0, qtd_reserva: 0 }
    ];
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
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

// ==========================================================================
// 🔧 CORREÇÃO CRÍTICA: expõe o BANCO_ATIVOS também em window.BANCO_ATIVOS.
//
// Vários arquivos (script.js na função abrirFolhaoPorTipo — chamada pelo
// botão "Concluir" —, além de folhaoR2.js, folhaoDesempenadeira.js e
// folhao_bender.js) leem `window.BANCO_ATIVOS` em vez de importar
// `BANCO_ATIVOS` deste módulo. Como nada nunca atribuía esse global, essas
// chamadas quebravam com "Cannot read properties of undefined (reading
// 'find')" assim que o botão "Concluir" era clicado — o folhão nem chegava
// a abrir. A linha abaixo aponta window.BANCO_ATIVOS para o MESMO array
// usado internamente aqui; como todo o resto do código só faz mutação in
// place nesse array (push, splice, length = 0 seguido de push — nunca
// reatribuição), essa referência continua válida e sincronizada mesmo
// depois de sincronizarAtivosReaisMCC4() trocar o conteúdo.
// ==========================================================================
window.BANCO_ATIVOS = BANCO_ATIVOS;

// 🔧 MESMA CORREÇÃO, PARA A MESMA CLASSE DE BUG: window.salvarPecaNoPython
// e window.resolverApiBase também nunca eram atribuídos. script.js (na
// função REAL de cadastro, window.processarCadastroPeca) e os folhões
// R2, Straightener R1 e Desempenadeira (que não importam banco.js, só
// usam window.*) chamavam window.salvarPecaNoPython(...) esperando que
// existisse — e como nunca existiu, a chamada era sempre pulada em
// silêncio (nenhum erro no console, só nada acontecia). Isso significa
// que peça nova cadastrada pelo formulário, e o "Concluir" desses 3
// folhões, pareciam funcionar na tela mas NUNCA chegavam no Postgres.
window.salvarPecaNoPython = salvarPecaNoPython;
window.resolverApiBase = resolverApiBase;

// Funções de acesso para alterar variáveis blindadas
export function setOperador(novoOperador) { OPERADOR_LOGADO = novoOperador; }
export function setEmergencia(status) { EM_EMERGENCIA = status; }
export function setVeioSelecionado(veio) { VEIO_SELECIONADO_PAINEL = veio; }


// Deriva o id do "slot fixo" que a grade de Sequenciamento Veios usa
// (ex: "MOLDE", "CAD-SUP-73", "BOW-2", "STR-1", "SEG-ZERO"), direto da
// estrutura do id de sistema que o importar_excel.py já gera. Isso evita
// depender do casamento por texto (mapearSlotLegado) que existe no
// script.js, que não reconhece o vocabulário bruto da planilha.
function gerarPosicaoFixa(idSistema, tipoCanonico, contadorGrupoPorVeio, veio) {
    const partes = String(idSistema).split('-');
    const prefixo = partes[0];

    if (prefixo === "MLD") return "MOLDE";
    if (prefixo === "BND") return "BENDER";
    if (prefixo === "BOW") return `BOW-${partes[1]}`;
    if (prefixo === "STR") return `STR-${partes[1]}`;
    if (prefixo === "HOR") return `HOR-${partes[1]}`;
    if (prefixo === "SEG") return "SEG-ZERO";
    if (prefixo === "CAD") return `${partes[0]}-${partes[1]}-${partes[2]}`; // CAD-SUP-73 / CAD-INF-73
    if (prefixo.startsWith("GRP")) {
        // Os 3 "Grupos" da planilha (1 + 2 + 3 = 6 peças por veio) ocupam
        // os 6 slots genéricos "SEG-1".."SEG-6" da grade, na ordem em que
        // chegam da API (que já segue a ordem real da planilha).
        contadorGrupoPorVeio[veio] = (contadorGrupoPorVeio[veio] || 0) + 1;
        return `SEG-${contadorGrupoPorVeio[veio]}`;
    }
    return null;
}

export async function sincronizarAtivosReaisMCC4() {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/pecas`, {}, { tentativas: 2 });

        if (!resposta.ok) {
            throw new Error(`API respondeu com status ${resposta.status}`);
        }

        const pecasApi = await resposta.json();

        if (!Array.isArray(pecasApi) || pecasApi.length === 0) {
            console.warn("⚠️ API retornou vazio.");
            return false;
        }

        // A API já retorna os campos em minúsculo (id, tipo, local, status,
        // tonelagem, dias, meta, posicao, tag_patrimonio) — o Postgres sempre
        // converte nomes de coluna sem aspas pra minúsculo, então é assim
        // que eles chegam de verdade, mesmo que o resto do código antigo
        // esperasse maiúsculo.
        //
        // Em vez de tentar "adivinhar" qual peça local corresponde a qual
        // peça da API (like antes), reconstruímos a lista inteira a partir
        // do banco de dados, que agora é a fonte da verdade. Isso também
        // resolve sozinho os equipamentos que o BANCO_ATIVOS local nunca
        // teve (como os "Grupo 1/2/3" da MCC 2/3).
        const reservasLocais = BANCO_ATIVOS.filter(a =>
            a.local === "Oficina / Reserva" || a.local === "Oficina / Reparo"
        );

        const contadorGrupoPorVeio = {};

        const novosAtivos = pecasApi.map(peca => {
            const tipoCanonico = traduzirTipo(peca.tipo);
            return {
                id: peca.id,
                tipo: tipoCanonico,
                local: peca.local,
                pos: gerarLabelPosicao(tipoCanonico, peca.id),
                posicaoFixa: gerarPosicaoFixa(peca.id, tipoCanonico, contadorGrupoPorVeio, peca.local),
                dias: parseInt(peca.dias) || 0,
                ton: parseFloat(peca.tonelagem) || 0,
                meta: parseFloat(peca.meta) || 0,
                ordem: getOrdemPadrao(tipoCanonico),
                mcc_compat: (peca.local && peca.local.includes("MCC 4")) ? "4" : "2/3",
                tag_patrimonio: peca.tag_patrimonio || null,
                data_entrada: peca.data_entrada || null,
                observacao: peca.observacao || "",
                status: peca.status || "Instalado"
            };
        });

        // 🔧 CORREÇÃO: blindagem contra duplicatas (ex: "MLD-2C" aparecendo
        // várias vezes na tela de Reparo). Antes, reservasLocais entrava
        // aqui do jeito que estava no localStorage, sem checar se: (a) o
        // mesmo id já veio fresquinho da API em novosAtivos, ou (b) o
        // próprio localStorage já estava com esse id repetido de alguma
        // sincronização anterior. As duas situações agora são descartadas
        // — sempre fica só 1 cópia de cada id, a mais confiável.
        const idsNovos = new Set(novosAtivos.map(a => a.id));
        const idsVistos = new Set();
        const reservasLocaisUnicas = reservasLocais.filter(a => {
            if (idsNovos.has(a.id)) return false;   // já existe uma versão fresca vinda da API
            if (idsVistos.has(a.id)) return false;  // duplicata dentro do próprio localStorage
            idsVistos.add(a.id);
            return true;
        });

        BANCO_ATIVOS.length = 0;
        BANCO_ATIVOS.push(...novosAtivos, ...reservasLocaisUnicas);

        console.log(`✅ MARCO ZERO ESTABELECIDO: ${novosAtivos.length} ativos sincronizados com o banco real.`);

        // Salva a versão atualizada
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        return true;

    } catch (erro) {
        console.error("❌ Falha ao buscar dados do Python. O servidor (uvicorn) está ligado?", erro);
        return false;
    }
}
// ==========================================================================
// MÃO DUPLA: Enviando atualizações para o Python (SQLite)
// ==========================================================================
export async function salvarPecaNoPython(peca) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/atualizar_peca`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // 🔧 CORREÇÃO: além de tonelagem/dias/local/status, agora também
            // envia tipo, meta e posicao. Isso é o que faz a API (main.py)
            // conseguir CRIAR a linha no Postgres com dados completos quando
            // o id ainda não existe (peça nova) — antes, só esses 4 campos
            // eram enviados, então uma peça nova, mesmo se a API soubesse
            // inserir, ficaria com tipo/meta/posição em branco no banco.
            body: JSON.stringify({
                id: peca.id || peca.ID,
                tipo: peca.tipo || "",
                tonelagem: peca.ton || 0,
                dias: peca.dias || 0,
                local: peca.local || "",
                status: peca.status || "",
                meta: peca.meta || 0,
                posicao: peca.posicaoFixa || peca.pos || peca.posicao || "",
                tag_patrimonio: peca.tag_patrimonio || null,
                data_entrada: peca.data_entrada || null,
                observacao: peca.observacao ?? null
            })
        }, { tentativas: 2 });

        const resultado = await resposta.json();

        if (resultado.sucesso) {
            console.log(resultado.criada
                ? `✅ [Banco de Dados] Peça ${peca.id} CRIADA no Postgres com sucesso!`
                : `✅ [Banco de Dados] Peça ${peca.id} atualizada com sucesso!`);
        } else {
            console.error("❌ Erro no Python:", resultado.detail || resultado);
        }

    } catch (erro) {
        console.error("❌ Erro de comunicação com o servidor:", erro);
    }
}

// ==========================================================================
// AUDITORIA: salva cada evento do histórico (quem fez, o quê, quando) no
// banco Postgres. registrarHistorico() (em script.js) chama essa função
// toda vez que grava uma linha no histórico local, então isso cobre saque,
// swap, apontamentos e notas manuais automaticamente, sem precisar mexer
// em cada função separadamente.
// ==========================================================================
export async function salvarHistoricoNoPython(evento) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/registrar_evento`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: evento.tag || "",
                acao: evento.acao || "",
                operador: evento.responsavel || "Sistema"
            })
        }, { tentativas: 2 });

        const resultado = await resposta.json();

        if (!resultado.sucesso) {
            console.error("❌ Erro ao registrar evento no banco:", resultado.detail || resultado);
        }
    } catch (erro) {
        console.error("❌ Erro de comunicação ao registrar evento:", erro);
    }
}

// ==========================================================================
// ESTOQUE DE ROLOS — sincronização com o Neon
// ==========================================================================
export async function sincronizarRolosReais() {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/rolos`, {}, { tentativas: 2 });
        if (!resposta.ok) throw new Error(`API respondeu com status ${resposta.status}`);

        const rolosApi = await resposta.json();
        if (!Array.isArray(rolosApi)) return false;

        BANCO_ROLOS.length = 0;
        BANCO_ROLOS.push(...rolosApi.map(r => ({
            id: r.id,
            nome: r.nome,
            conjunto: r.conjunto,
            mcc_compat: r.mcc_compat,
            qtd: parseFloat(r.qtd) || 0
        })));

        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        console.log(`✅ Estoque de rolos sincronizado com o Neon: ${BANCO_ROLOS.length} itens.`);
        return true;
    } catch (erro) {
        console.error("❌ Falha ao buscar rolos do Neon (usando dados locais salvos):", erro);
        return false;
    }
}

export async function salvarAjusteRoloNoPython(id, fator) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/rolos/ajustar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fator })
        }, { tentativas: 2 });
        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.detail || `HTTP ${resposta.status}`);
        }
        return resultado;
    } catch (erro) {
        console.error("❌ Não foi possível salvar o ajuste do rolo no Neon:", erro);
        return null;
    }
}

// ==========================================================================
// ESTOQUE HIDRÁULICO — sincronização com o Neon (aplicado x reserva)
// ==========================================================================
export async function sincronizarHidraulicaReal() {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/hidraulica`, {}, { tentativas: 2 });
        if (!resposta.ok) throw new Error(`API respondeu com status ${resposta.status}`);

        const hidraulicaApi = await resposta.json();
        if (!Array.isArray(hidraulicaApi)) return false;

        BANCO_HIDRAULICA.length = 0;
        BANCO_HIDRAULICA.push(...hidraulicaApi.map(h => ({
            id: h.id,
            nome: h.nome,
            conjunto: h.conjunto,
            mcc_compat: h.mcc_compat,
            qtd_aplicado: parseFloat(h.qtd_aplicado) || 0,
            qtd_reserva: parseFloat(h.qtd_reserva) || 0
        })));

        localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
        console.log(`✅ Estoque hidráulico sincronizado com o Neon: ${BANCO_HIDRAULICA.length} itens.`);
        return true;
    } catch (erro) {
        console.error("❌ Falha ao buscar hidráulica do Neon (usando dados locais salvos):", erro);
        return false;
    }
}

export async function salvarAjusteHidraulicaNoPython(id, local, fator) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/hidraulica/ajustar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, local, fator })
        }, { tentativas: 2 });
        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(resultado.detail || `HTTP ${resposta.status}`);
        }
        return resultado;
    } catch (erro) {
        console.error("❌ Não foi possível salvar o ajuste hidráulico no Neon:", erro);
        return null;
    }
}

// ==========================================================================
// EXPORTAÇÃO PADRÃO
// ==========================================================================
export default {
    BANCO_ATIVOS,
    HISTORICO_ACOES,
    BANCO_ROLOS,
    BANCO_HIDRAULICA,
    BANCO_MATERIAIS,
    EM_EMERGENCIA,
    OPERADOR_LOGADO,
    VEIO_SELECIONADO_PAINEL,
    CADASTRO_MATRICULAS,
    getOrdemPadrao,
    traduzirTipo,
    setOperador,
    setEmergencia,
    setVeioSelecionado,
    sincronizarAtivosReaisMCC4,
    salvarPecaNoPython,
    salvarHistoricoNoPython,
    sincronizarRolosReais,
    salvarAjusteRoloNoPython,
    sincronizarHidraulicaReal,
    salvarAjusteHidraulicaNoPython,
    resolverApiBase
};