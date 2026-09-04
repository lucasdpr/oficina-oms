// banco.js - O Coração de Dados do Sistema

// 🔧 CORREÇÃO CRÍTICA ("tela em branco depois do login, principalmente
// em aparelho novo / aba anônima / cache limpo"): faltava o "|| []"
// nestas linhas. Quando o localStorage está vazio, JSON.parse(null)
// retorna null — não uma lista vazia — e qualquer função que rodasse
// .forEach/.filter/.map nesses bancos quebrava na hora, travando a
// tela (só o cabeçalho aparecia).
export let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v32_local")) || [];
export let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
export let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local")) || [];
export let BANCO_HIDRAULICA = JSON.parse(localStorage.getItem("oms_hidraulica_v32_local")) || [];
export let BANCO_MATERIAIS = JSON.parse(localStorage.getItem("oms_materiais_v32_local")) || [];
export let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
export let VEIO_SELECIONADO_PAINEL = "C";

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
    let ultimaResposta = null;
    for (let i = 0; i <= tentativas; i++) {
        try {
            const resposta = await fetchComTimeout(url, opts, timeoutMs);
            // 🔧 CORREÇÃO: antes, só timeout/erro de rede tentava de novo —
            // um erro 500 (ex: a API pegou uma conexão "zumbi" do pool logo
            // depois do Neon suspender sozinho, mesmo com o Render já
            // acordado) chegava aqui como resposta válida (resposta.ok =
            // false), então NUNCA era tentado de novo: o app desistia na
            // primeira tentativa, mesmo o problema sendo passageiro e já
            // resolvido no servidor 1 segundo depois. Agora 5xx também
            // entra no retry, do mesmo jeito que timeout/erro de rede.
            if (resposta.status >= 500 && i < tentativas) {
                ultimaResposta = resposta;
                console.warn(`⚠️ Servidor respondeu ${resposta.status} (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, esperaMs));
                continue;
            }
            return resposta;
        } catch (e) {
            if (i === tentativas) throw e;
            console.warn(`⚠️ Timeout/erro de conexão (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, esperaMs));
        }
    }
    return ultimaResposta;
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
    // 🔧 CORREÇÃO CRÍTICA ("Segmento Grupo 3 nunca aparece no Sinótico 3D,
    // mesmo depois da correção anterior"): antes, os 3 "Grupos" da
    // planilha (GRP1, GRP2-1/2, GRP3-1/2/3 — 6 peças por veio) ocupavam
    // os slots genéricos "SEG-1".."SEG-6" CONTANDO na ordem em que a API
    // devolvia as peças. Isso parece funcionar quando os 6 existem, mas
    // quebra sempre que falta alguma (como a GRP3-2 desse veio, que nunca
    // foi importada da planilha): a contagem "escorrega" — a peça
    // seguinte assume o número de quem faltou, e o Swap Automático (que
    // deixa escolher um número qualquer de 1 a 6, sem saber a diferença
    // entre Grupo 1/2/3) acaba gerando colisões ou números "órfãos" que
    // nunca existiram em nenhuma vaga real.
    //
    // A posição de cada Grupo NÃO deveria depender de quantos existem —
    // é FIXA pela identidade dele, e o próprio formulário de Cadastro já
    // sabia disso (Grupo 1 = posição 1, Grupo 2 = posições 2/3, Grupo 3 =
    // posições 4/5/6 — ver comentário "AQUI ESTÃO OS GRUPOS 1, 2 E 3
    // TRAVADOS NAS POSIÇÕES CORRETAS" em script.js). Agora essa MESMA
    // regra fixa é usada aqui, sem depender de contagem nem de quais
    // peças existem no banco no momento.
    if (prefixo === "GRP1") return "SEG-1";
    if (prefixo === "GRP2") return `SEG-${1 + (parseInt(partes[1], 10) || 0)}`;   // rank 1 -> SEG-2, rank 2 -> SEG-3
    if (prefixo === "GRP3") return `SEG-${3 + (parseInt(partes[1], 10) || 0)}`;   // rank 1 -> SEG-4, rank 2 -> SEG-5, rank 3 -> SEG-6
    return null;
}

// Extrai a letra do veio (C, D, E, F, G, H) a partir do texto salvo em
// "local" (ex: "MCC 4 - Veio G" -> "G"). Usada pra popular o campo
// `veio` de cada peça depois de sincronizar com o banco — ver correção
// logo abaixo, dentro de sincronizarAtivosReaisMCC4().
function extrairVeioDoLocal(local) {
    const m = local && String(local).match(/Veio\s+([A-Z])/i);
    return m ? m[1].toUpperCase() : "";
}

// Converte um timestamp (ms) pro mesmo formato "DD/MM/AAAA" que o
// importar_excel.py já grava na coluna data_entrada pras peças
// originais da planilha — ver correção "DATA DE ENTRADA não é salva"
// logo abaixo.
function formatarDataBr(timestampMs) {
    return new Date(timestampMs).toLocaleDateString('pt-BR');
}

// Caminho inverso: lê "DD/MM/AAAA" (como vem do banco) e devolve um
// timestamp (ms), pra virar dataEntradaVeio depois de uma sincronização.
function parseDataBrParaTimestamp(dataBr) {
    if (!dataBr || typeof dataBr !== 'string') return null;
    const m = dataBr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, dia, mes, ano] = m;
    const ts = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T00:00:00`).getTime();
    return isNaN(ts) ? null : ts;
}

// Descobre a família MCC (4, ou 2/3) de uma peça. Usado como correção
// de: "instalei um Molde MCC4, expulsei ele sem querer, ele voltou pra
// Oficina/Reserva, e passou a aparecer rotulado como MCC 2/3 — fica
// preso lá, porque o dropdown de veio só oferece C/D/E/F pra quem tá
// nesse grupo, nunca G/H". Antes, mcc_compat era SEMPRE recalculado a
// partir de "local" — mas uma peça em "Oficina / Reserva" ou "Oficina /
// Reparo" não tem NENHUMA pista de MCC no local (não é "MCC 4 - Veio
// G", é só "Oficina / Reserva"), então caía sempre no "senão" e virava
// "2/3", mesmo pra peças que eram MCC4 até segundos atrás.
function inferirMccCompat(peca, tipoCanonico) {
    // Instalada agora? O local já entrega a resposta certa, sem margem
    // pra erro — mantém exatamente como já funcionava.
    if (peca.local && peca.local.includes("MCC 4")) return "4";
    if (peca.local && (peca.local.includes("MCC 2") || peca.local.includes("MCC 3"))) return "2/3";

    // Não instalada (Reserva/Reparo): a maioria dos tipos só existe numa
    // família só, então dá pra confiar 100% no tipo, sem ambiguidade.
    const SOMENTE_MCC4 = ["Bender", "Bow", "Horizontal", "Straightener"];
    const SOMENTE_MCC23 = [
        "Segmento Zero", "Cadeira Superior", "Cadeira Inferior",
        "Grupo 1", "Grupo 2", "Grupo 3",
        "Segmento Grupo 1", "Segmento Grupo 2", "Segmento Grupo 3"
    ];
    if (SOMENTE_MCC4.includes(tipoCanonico)) return "4";
    if (SOMENTE_MCC23.includes(tipoCanonico)) return "2/3";

    // "Molde" é o ÚNICO tipo que existe nas duas famílias — sem estar
    // instalado, o banco hoje não guarda essa informação separada da
    // localização (não existe uma coluna própria pra isso ainda). Usa a
    // meta de vida útil como pista: Molde MCC4 = 1.100.000, MCC2/3 =
    // 900.000 (ver META_POR_TIPO no cadastro de peça nova, em
    // script.js). Não é infalível se alguém mudar a meta manualmente
    // pra um valor fora do padrão, mas resolve o caso comum sem precisar
    // mexer no banco de dados agora.
    if (tipoCanonico === "Molde") {
        const meta = parseFloat(peca.meta) || 0;
        return meta >= 1000000 ? "4" : "2/3";
    }

    return "2/3"; // fallback final — mesmo comportamento de antes
}

let syncAtivosEmAndamento = null;

// 🔧 CORREÇÃO ("loga, não aparece nada, mas sem erro nenhum — só fecha e
// abre de novo que aparece"): esta função é chamada em MAIS de um lugar
// quase ao mesmo tempo — no carregamento da página (DOMContentLoaded) E
// logo depois do login (finalizarLogin). Sem essa guarda, as duas
// chamadas rodavam em paralelo, cada uma fazendo sua própria busca e, no
// final, cada uma fazia `BANCO_ATIVOS.length = 0` seguido de `push(...)`
// — se a tela renderizasse bem no meio dessa janela (entre uma chamada
// zerar o array e a outra ainda não ter reenchido), aparecia tudo vazio
// por puro azar de tempo, mesmo as duas buscas tendo dado certo no
// servidor (por isso nenhum erro aparecia). Agora, se já existe uma
// sincronização em andamento, uma segunda chamada simplesmente espera e
// reaproveita o resultado da primeira, em vez de rodar outra em paralelo.
export async function sincronizarAtivosReaisMCC4() {
    if (syncAtivosEmAndamento) return syncAtivosEmAndamento;
    syncAtivosEmAndamento = (async () => {
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

            // Mantém sempre o cálculo original a partir do ID (garante que o
            // contador de "Grupo 1/2/3" -> SEG-1..SEG-6 continue funcionando
            // certinho pra quem nunca passou por um Swap).
            const posicaoDerivadaDoId = gerarPosicaoFixa(peca.id, tipoCanonico, contadorGrupoPorVeio, peca.local);

            // 🔧 CORREÇÃO CRÍTICA (peça "some" do Sequenciamento de Veios e
            // do Sinótico 3D ao atualizar a página, depois de um Swap):
            // esta função sempre IGNORAVA o campo "posicao" que o Swap
            // Automático (iniciarSwapAlocacao, em script.js) já grava
            // corretamente no banco (ex: "BOW-3"), e recalculava a posição
            // do zero a partir do próprio ID da peça. Isso funciona pra
            // peças originais da planilha (o ID "BOW-3-4G" já entrega o
            // slot certo), mas quebra pra qualquer peça do Estoque Reserva
            // instalada via Swap: ela continua com o SEU PRÓPRIO id (ex:
            // "MLD-RES-01" — o Swap nunca renomeia a peça), então o ID
            // dela não bate com nenhum slot real, e a posição calculada
            // "MLD-RES" não encontra lugar nenhum no painel. A peça ficava
            // "Instalada" no banco (o /api/atualizar_peca salvou certo),
            // mas invisível no Sequenciamento — e sumia de vez ao dar F5,
            // que reconstrói tudo a partir do banco refazendo esse mesmo
            // cálculo errado.
            //
            // Agora: se o "posicao" salvo no banco é DIFERENTE do próprio
            // ID da peça, é sinal de que foi definido manualmente por um
            // Swap (que sempre grava o slot curto certo) — nesse caso ele
            // é a fonte confiável e tem prioridade sobre o cálculo pelo ID.
            const posicaoSalvaPeloSwap = (peca.posicao && peca.posicao !== peca.id) ? peca.posicao : null;

            // 🔧 CORREÇÃO ("Prontuário sem Data de Entrada" pra peças
            // antigas/originais, ex: CAD-SUP-65-2F com 2409 dias na
            // máquina e "--" na entrada): existia um remendo parecido em
            // renderAtivos() (script.js), mas ele só rodava se a aba
            // "Ativos" fosse aberta pelo menos uma vez na sessão, e só
            // gravava no localStorage (nunca no banco) — sumia de novo no
            // próximo login/sincronização. Centralizando aqui, roda
            // SEMPRE que os dados são carregados, em qualquer tela.
            //
            // Peças que nunca tiveram "data_entrada" real gravada (ex:
            // vieram da planilha original sem a coluna ENTRADA
            // preenchida, ou já estavam instaladas antes desse controle
            // existir no sistema) recebem uma data ESTIMADA, calculada de
            // trás pra frente a partir dos "dias" que a peça já acumula —
            // só pra o Prontuário não ficar em branco. dataEntradaEstimada
            // marca quando é estimativa (não um registro real), pra quem
            // for exibir isso poder avisar o usuário.
            const dataEntradaReal = parseDataBrParaTimestamp(peca.data_entrada);
            const estaInstalada = peca.local && String(peca.local).includes("Veio") && !String(peca.local).includes("Oficina");
            const dataEntradaVeioFinal = dataEntradaReal
                || (estaInstalada ? (Date.now() - ((parseInt(peca.dias) || 0) * 24 * 60 * 60 * 1000)) : null);

            return {
                id: peca.id,
                tipo: tipoCanonico,
                local: peca.local,
                // 🔧 CORREÇÃO: o campo "veio" nunca era preenchido aqui —
                // ficava sempre undefined depois de qualquer sincronização
                // com o banco (a única coisa confiável era o texto de
                // "local"). Agora é extraído direto do "local" (ex:
                // "MCC 4 - Veio G" -> "G"), pra bater com o que o Swap
                // Automático e o Painel de Veios esperam encontrar em
                // peca.veio.
                veio: extrairVeioDoLocal(peca.local),
                pos: gerarLabelPosicao(tipoCanonico, peca.id),
                posicaoFixa: posicaoSalvaPeloSwap || posicaoDerivadaDoId,
                dias: parseInt(peca.dias) || 0,
                ton: parseFloat(peca.tonelagem) || 0,
                meta: parseFloat(peca.meta) || 0,
                ordem: getOrdemPadrao(tipoCanonico),
                // 🆕 CORREÇÃO CRÍTICA: agora que "mcc_compat" é uma coluna
                // de verdade no banco (antes não existia lá), a resposta da
                // API já traz o valor certo — usa ele direto. O "chute" por
                // meta (inferirMccCompat) só entra como plano B, pras peças
                // antigas cadastradas antes dessa correção, que nunca
                // tiveram esse campo salvo no Postgres.
                mcc_compat: peca.mcc_compat || inferirMccCompat(peca, tipoCanonico),
                tag_patrimonio: peca.tag_patrimonio || null,
                data_entrada: peca.data_entrada || null,
                // 🔧 CORREÇÃO ("instalei e não foi salvo com a data"): esta
                // função nunca reconstruía dataEntradaVeio (o timestamp que
                // o resto do app usa pra saber "desde quando essa peça está
                // no veio" — calcularDias(), o Prontuário, etc). Ela só
                // existia enquanto durasse a sessão em que o Swap foi feito;
                // depois de qualquer F5/login novo, sumia (undefined), e o
                // Prontuário ficava sem "Data de Entrada" mesmo a peça
                // estando Instalada. Agora ela é reconstruída a partir do
                // "data_entrada" salvo no banco (formato "DD/MM/AAAA") —
                // que só existe de verdade a partir da correção em
                // salvarPecaNoPython(), logo abaixo, que agora grava esse
                // campo corretamente (antes ele nunca era enviado certo,
                // então ficava sempre NULL no Postgres). Pra peça sem
                // nenhum registro (ver nota acima), usa a estimativa.
                dataEntradaVeio: dataEntradaVeioFinal,
                dataEntradaEstimada: !dataEntradaReal && estaInstalada,
                // 🔧 CORREÇÃO: sem isso, todo login "esquecia" quando a
                // peça realmente entrou em Oficina/Reparo — dataReparo só
                // existia localmente, então virava undefined aqui mesmo
                // pra uma peça salva corretamente no banco. calcularDias()
                // (ui.js) precisa desse timestamp pra contar os dias certos.
                dataReparo: peca.data_reparo ? new Date(peca.data_reparo).getTime() : null,
                substituidoPor: peca.substituido_por || null,
                observacao: peca.observacao || "",
                // 🆕 Rolos travados: mantém a string JSON como veio do
                // banco (quem lê/escreve o conteúdo é o Sinótico 3D).
                rolos_travados: peca.rolos_travados || null,
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
        // Guarda o erro técnico num lugar acessível globalmente, pra
        // poder ser mostrado na tela (sem precisar abrir o console do
        // navegador) por quem chamar essa função.
        window.ULTIMO_ERRO_SYNC = `${erro.name || "Erro"}: ${erro.message || "sem detalhes"}`;
        return false;
    } finally {
        syncAtivosEmAndamento = null;
    }
    })();
    return syncAtivosEmAndamento;
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
                // 🆕 CORREÇÃO CRÍTICA: "mcc_compat" (MCC 2/3 ou MCC 4) nunca
                // era enviado pro backend aqui, mesmo já vindo certinho no
                // objeto `peca` desde o cadastro. Isso fazia o campo viver
                // só no localStorage de quem cadastrou — qualquer outro
                // login/dispositivo, ao sincronizar com a nuvem, recebia o
                // equipamento SEM esse dado e caía no padrão "2/3", fazendo
                // um Molde MCC4 "virar" MCC 2/3 (inclusive abrindo o Folhão
                // errado) pra todo mundo, exceto no navegador original.
                mcc_compat: peca.mcc_compat || null,
                tonelagem: peca.ton || 0,
                dias: peca.dias || 0,
                local: peca.local || "",
                status: peca.status || "",
                meta: peca.meta || 0,
                posicao: peca.posicaoFixa || peca.pos || peca.posicao || "",
                tag_patrimonio: peca.tag_patrimonio || null,
                // 🔧 CORREÇÃO CRÍTICA ("instalei e não foi salvo com a
                // data"): este campo mandava pro banco "peca.data_entrada"
                // — só que NADA no app escreve nesse nome (snake_case).
                // Quem marca a data de entrada de verdade é
                // iniciarSwapAlocacao() (script.js), e ele grava em
                // "peca.dataEntradaVeio" (camelCase, um timestamp em ms).
                // Resultado: essa linha sempre mandava null pro banco, TODA
                // vez que uma peça era instalada via Swap — a peça aparecia
                // certinho no Sinótico 3D (depois da correção anterior),
                // só que sem data nenhuma. Agora prioriza dataEntradaVeio
                // (convertendo pra "DD/MM/AAAA", o mesmo formato que a
                // planilha original já usa); se não tiver (ex: só uma
                // observação sendo salva, sem mexer na instalação), mantém
                // o que já veio de "data_entrada" pra não apagar a data por
                // engano.
                data_entrada: peca.dataEntradaVeio ? formatarDataBr(peca.dataEntradaVeio) : (peca.data_entrada || null),
                // 🔧 CORREÇÃO: antes esses dois campos só existiam na
                // memória do navegador. Toda sincronização com o banco
                // (que roda em todo login) reconstruía a peça do zero, sem
                // eles — o contador de "dias em reparo" perdia a
                // referência de quando a peça realmente saiu do veio, e
                // voltava a mostrar um valor antigo/congelado.
                data_reparo: peca.dataReparo ? new Date(peca.dataReparo).toISOString() : null,
                substituido_por: peca.substituidoPor || null,
                observacao: peca.observacao ?? null,
                // 🆕 Rolos travados: string JSON (ex: '["S-4","I-2"]'),
                // gravada direto pelo grid no modal do Sinótico 3D. Aqui
                // só repassa o que já veio pronto, sem processar nada.
                rolos_travados: peca.rolos_travados ?? null
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
let syncRolosEmAndamento = null;
export async function sincronizarRolosReais() {
    if (syncRolosEmAndamento) return syncRolosEmAndamento;
    syncRolosEmAndamento = (async () => {
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
    } finally {
        syncRolosEmAndamento = null;
    }
    })();
    return syncRolosEmAndamento;
}

export async function salvarAjusteRoloNoPython(id, fator) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/rolos/ajustar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, fator, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" })
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
let syncHidraulicaEmAndamento = null;
export async function sincronizarHidraulicaReal() {
    if (syncHidraulicaEmAndamento) return syncHidraulicaEmAndamento;
    syncHidraulicaEmAndamento = (async () => {
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
    } finally {
        syncHidraulicaEmAndamento = null;
    }
    })();
    return syncHidraulicaEmAndamento;
}

export async function salvarAjusteHidraulicaNoPython(id, local, fator) {
    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchDadosComTimeout(`${apiBase}/api/hidraulica/ajustar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, local, fator, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" })
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
    OPERADOR_LOGADO,
    VEIO_SELECIONADO_PAINEL,
    getOrdemPadrao,
    traduzirTipo,
    setOperador,
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