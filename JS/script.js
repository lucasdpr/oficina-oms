// ==========================================
// SCRIPT.JS - COMPLETO E CORRIGIDO 
// ==========================================

import { 
    MOTIVOS_RETIRO, 
    CHECKLIST_RECEBIMENTO, 
    CHECKLIST_REVISAO, 
    CHECKLIST_HIDRAULICA, 
    CHECKLIST_FINAL, 
    BIBLIOTECA_CHECKLISTS,
    AREAS_OFICINA,
    ABAS_PADRAO_OFICINA
} from './Core/dados.js';

import {
    BANCO_ATIVOS,
    sincronizarAtivosReaisMCC4,
    salvarPecaNoPython,
    salvarHistoricoNoPython,
    sincronizarRolosReais,
    salvarAjusteRoloNoPython,
    sincronizarHidraulicaReal,
    salvarAjusteHidraulicaNoPython,
    resolverApiBase,
    setOperador as setOperadorBanco
} from './Core/banco.js?v=5';

// ==========================================
// 🔧 CORREÇÃO ("depois do login a tela fica em branco, só o cabeçalho
// aparece"): finalizarLogin() e entrarComoVisitante() chamam várias
// funções de renderização em sequência. Se qualquer uma lançar um
// erro, o JavaScript parava ali mesmo e tudo que vinha depois na fila
// nunca rodava — inclusive a função que desenha o Painel Geral.
// executarSeguro() isola cada chamada: se uma falhar, registra o erro
// no console e deixa as próximas rodarem normalmente.
// ==========================================
function executarSeguro(fn, nomeParaLog) {
    try {
        return fn();
    } catch (e) {
        console.error(`⚠️ Falha ao executar "${nomeParaLog}" (o resto da tela continua carregando):`, e);
        return undefined;
    }
}
async function executarSeguroAsync(fn, nomeParaLog) {
    try {
        return await fn();
    } catch (e) {
        console.error(`⚠️ Falha ao executar "${nomeParaLog}" (o resto da tela continua carregando):`, e);
        return undefined;
    }
}
window.executarSeguro = executarSeguro;
window.executarSeguroAsync = executarSeguroAsync;

// ==========================================
// 📲 PUSH NOTIFICATION (Web Push API)
// ==========================================
const VAPID_PUBLIC_KEY = "BKY36hQFqVrbfz1jSB2FhQs58OV6JNMHnug1V3mwhZMK-urLU0y5E_6dNoRZv8J89EalEAn4ItgqBT_pmiAMuF8";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

window.ativarPushNotification = async function () {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // No Safari/iOS isso é normal enquanto o app não foi instalado na
        // tela de início — Web Push só existe ali quando roda em modo
        // standalone (instalado). Não é erro, é a plataforma mesmo.
        console.warn("⚠️ Este navegador não suporta push notification.");
        return false;
    }
    // 🔧 IMPORTANTE: requestPermission tem que ser a PRIMEIRA coisa async
    // chamada aqui, sem nenhum await antes — no Safari/iOS o pedido de
    // permissão só aparece se for resposta direta e imediata de um toque
    // do usuário. Chamar essa função automaticamente depois do login (que
    // já passou por um fetch de rede) chega tarde demais: o "gesto" já
    // expirou e o Safari simplesmente ignora o pedido, sem erro nenhum e
    // sem popup — por isso o botão manual "Ativar Notificações" existe
    // (toque nele = gesto novo, chega aqui sem nenhum await no meio).
    const permissao = await Notification.requestPermission();
    if (typeof window.atualizarBotaoAtivarNotificacoes === 'function') window.atualizarBotaoAtivarNotificacoes();
    if (permissao !== "granted") {
        console.warn("⚠️ Usuário não concedeu permissão de notificação.");
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        const dados = subscription.toJSON();
        const matricula = OPERADOR_LOGADO?.matricula || "";
        if (!matricula) {
            console.warn("⚠️ Nenhum operador logado — inscrição de push não vinculada.");
            return false;
        }
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                matricula,
                endpoint: dados.endpoint,
                p256dh: dados.keys.p256dh,
                auth: dados.keys.auth
            })
        });
        console.log("✅ Push notification ativado com sucesso.");
        return true;
    } catch (e) {
        console.error("⚠️ Erro ao ativar push notification:", e);
        return false;
    }
};


// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS
// ==========================================================================
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
let BANCO_MATERIAIS = []; // carregado do Neon via carregarMateriaisDoBackend() — não é mais localStorage

let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";
let FILTRO_CRITICOS = false;

const CADASTRO_MATRICULAS = {
    "061012": "Lucas (Desenvolvedor)"
};

// Matrículas com acesso total a todas as áreas da Oficina (mesma lista
// do backend, em main.py). Usado no front pra decidir se o Painel do
// Técnico mostra tudo (ADM) ou só a área da pessoa.
export const MATRICULAS_ADM = ["CBK3574", "CSP1869", "CSP6632"];

// ==========================================
// 🆕 RESTRIÇÃO POR ÁREA — função única, reaproveitada em toda tela que
// lista equipamentos em reparo (tabela geral "Peças em Reparo", card
// de KPI, atalho do Painel do Técnico, e a lista "Iniciar Novo" dentro
// do próprio Painel do Técnico). ADM (MATRICULAS_ADM) nunca é filtrado.
// Áreas "de serviço geral" (Hidráulica, Elétrica...) têm filtro=null
// em AREAS_OFICINA e continuam vendo qualquer equipamento — só quem
// tem uma área "de bancada fixa" (Molde MCC4, Bender, Segmento Zero...)
// é restrito à própria categoria.
// ==========================================
function filtrarPorAreaTecnico(lista) {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    if (isAdm) return { lista, isAdm, semArea: false };

    const areaTecnico = OPERADOR_LOGADO && OPERADOR_LOGADO.area;
    if (!areaTecnico) return { lista: [], isAdm, semArea: true };

    const infoArea = AREAS_OFICINA.find(ar => ar.chave === areaTecnico);
    if (infoArea && typeof infoArea.filtro === "function") {
        return { lista: lista.filter(infoArea.filtro), isAdm, semArea: false };
    }
    // Área de serviço geral (filtro null) — não restringe por tipo.
    return { lista, isAdm, semArea: false };
}

let MODO_MODAL_RELATORIO = {};
let ID_HISTORICO_ATUAL = null;

// 🆕 IDs de equipamentos com rascunho salvo (reparo já iniciado, ainda
// não concluído). Usado por renderReparos() pra tirar da lista
// "Iniciar Reparo" quem já está "em andamento". Populado por
// atualizarRascunhosAtivos() e reaproveitado por carregarReparosAndamento().
let RASCUNHOS_IDS_ATIVOS = new Set();

// Busca a lista de rascunhos ativos no back-end, atualiza o cache
// local (RASCUNHOS_IDS_ATIVOS) e re-renderiza "Iniciar Reparo" pra
// esconder quem já foi iniciado. Chamada toda vez que a aba de Reparo
// (ou o atalho do Painel do Técnico) é aberta.
async function atualizarRascunhosAtivos() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/folhao/rascunhos/todos`, { cache: 'no-store' });
        if (!resp.ok) throw new Error("Falha ao buscar rascunhos.");
        const rascunhos = await resp.json();
        RASCUNHOS_IDS_ATIVOS = new Set(rascunhos.map(r => r.equipamento_id));
    } catch (e) {
        console.error('⚠️ Não consegui atualizar rascunhos ativos (lista "Iniciar Reparo" pode mostrar item já em andamento):', e);
    }
    // 🆕 Reparo pode ter sido "iniciado" só pelo Checklist de Execução,
    // sem nenhum Folhão salvo ainda — sem carregar isso também, esse
    // equipamento continuaria aparecendo em "Iniciar Reparo".
    if (typeof window.carregarExecucoesChecklistAtivas === 'function') {
        await window.carregarExecucoesChecklistAtivas();
    }
    if (typeof renderReparos === 'function') renderReparos();
}
window.atualizarRascunhosAtivos = atualizarRascunhosAtivos;

// ==========================================
// FUNÇÃO AUXILIAR - ORDEM PADRÃO
// ==========================================
function getOrdemPadrao(tipo) {
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

// ==============================================================
// FUNÇÃO GLOBAL DE CÁLCULO DE DIAS (em reparo OU no veio/máquina)
// ==============================================================
// 🔧 CORREÇÃO: antes, "dias" era um número estático que só mudava se
// alguém editasse manualmente. Agora, todo equipamento instalado num
// veio guarda "dataEntradaVeio" (timestamp de quando entrou na
// máquina), e os dias são sempre calculados na hora, a partir dessa
// data — por isso passam a subir sozinhos, dia após dia, sem precisar
// de nenhuma ação manual. O mesmo já valia pra dias em reparo
// (dataReparo); agora os dois casos usam a mesma lógica central.
window.calcularDias = function(item) {
    const agora = Date.now();
    if (item.local === "Oficina / Reparo" && item.dataReparo) {
        return Math.floor((agora - item.dataReparo) / (1000 * 60 * 60 * 24));
    }
    if (item.dataEntradaVeio && item.local && !item.local.includes("Oficina")) {
        return Math.floor((agora - item.dataEntradaVeio) / (1000 * 60 * 60 * 24));
    }
    return item.dias || 0;
};

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

// ==========================================================================
// ESTOQUE HIDRÁULICO (fica logo abaixo de Estoque de Rolos no menu)
// ==========================================================================
let BANCO_HIDRAULICA = JSON.parse(localStorage.getItem("oms_hidraulica_v32_local"));
if (!BANCO_HIDRAULICA) {
    BANCO_HIDRAULICA = [
        // ---- MCC 2/3 ----
        { id: "H-PGH12", nome: "Porca Hidráulica Grupo 1,2", conjunto: "Grupo 1,2", mcc_compat: "2/3", qtd: 0 },
        { id: "H-PGH3", nome: "Porca Hidráulica Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G1", nome: "Cilindro de Grupo 1", conjunto: "Grupo 1", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G2", nome: "Cilindro de Grupo 2", conjunto: "Grupo 2", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G3", nome: "Cilindro de Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd: 0 },
        { id: "H-DESEMP", nome: "Desempenadeira Cadeira", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 0 },
        // ---- MCC 4 ----
        { id: "H-CIL-ELEV4", nome: "Cilindro de Elevação de Estrutura", conjunto: "Estrutura", mcc_compat: "4", qtd: 0 },
        { id: "H-CIL-PUX4", nome: "Cilindro Puxador", conjunto: "Puxador", mcc_compat: "4", qtd: 0 },
        { id: "H-PH-BOW", nome: "Porca Hidráulica Bow", conjunto: "Bow", mcc_compat: "4", qtd: 0 },
        { id: "H-PH-HOR", nome: "Porca Hidráulica Horizontal", conjunto: "Horizontal", mcc_compat: "4", qtd: 0 }
    ];
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
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

// (toggleTheme e toggleSidebar reais ficam definidas mais abaixo, como
// window.toggleTheme / window.toggleSidebar — ver correção do bug do
// abrirAba() duplicado: havia versões "mortas" destas duas funções
// aqui, que nunca executavam de verdade porque não estavam presas ao
// escopo global, e a versão real ficava só mais abaixo no arquivo.
// Removidas pra não confundir de novo no futuro.)

// ==========================================
// MOSTRAR/OCULTAR SENHA NO LOGIN
// ==========================================
window.alternarVisibilidadeSenha = function() {
    const campo = document.getElementById('login-matricula');
    const icone = document.getElementById('toggle-senha-icon');
    if (!campo || !icone) return;
    const oculto = campo.type === 'password';
    campo.type = oculto ? 'text' : 'password';
    icone.className = oculto ? 'fas fa-eye-slash login-input-icon-toggle' : 'fas fa-eye login-input-icon-toggle';
};

// ==========================================
// FETCH COM RETRY AUTOMÁTICO (pro banco "acordar" sem assustar o usuário)
// ==========================================
// Usado em todas as chamadas de API que buscam/enviam dados reais.
// Tem DUAS proteções:
// 1) timeoutMs: se o servidor não responder dentro desse prazo (banco
//    Neon "acordando" de um autosuspend, ou conexão travada), a chamada
//    é abortada sozinha — sem isso, um fetch() puro podia ficar
//    pendurado PRA SEMPRE, travando a tela em "carregando" eternamente
//    mesmo com o app já tendo aberto.
// 2) tentativas: se abortar por timeout (ou cair a conexão), tenta de
//    novo automaticamente antes de desistir de vez — dando tempo do
//    banco terminar de acordar.
async function fetchComRetry(url, opcoes = {}, tentativas = 4, esperaMs = 4000, timeoutMs = 30000) {
    let ultimaResposta = null;
    for (let i = 0; i <= tentativas; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch(url, { ...opcoes, signal: controller.signal });
            clearTimeout(timer);
            // 🔧 CORREÇÃO: um erro 500 (ex: conexão "zumbi" no pool do
            // Python logo após o Neon suspender sozinho, mesmo com o
            // Render já acordado — outro celular tinha acabado de
            // acessar) chegava aqui como resposta válida e NUNCA era
            // tentado de novo. Era por isso que às vezes o login ou um
            // apontamento falhava na primeira tentativa e só funcionava
            // se o usuário fechasse e abrisse o app de novo. Agora 5xx
            // também entra no retry, igual timeout/erro de rede.
            if (resp.status >= 500 && i < tentativas) {
                ultimaResposta = resp;
                console.warn(`⚠️ Servidor respondeu ${resp.status} (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, esperaMs));
                continue;
            }
            return resp;
        } catch (e) {
            clearTimeout(timer);
            if (i === tentativas) throw e; // acabaram as tentativas, propaga o erro
            console.warn(`⚠️ Falha/timeout de conexão (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, esperaMs));
        }
    }
    return ultimaResposta;
}

// ==========================================
// AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================
async function processarAutenticacaoHome() {
    // Apesar dos ids (legado), o campo #login-nome guarda a MATRÍCULA
    // e o #login-matricula guarda a SENHA (é o que os labels na tela mostram).
    // Os campos já forçam maiúsculas ao digitar, mas garantimos aqui também.
    const matriculaInput = document.getElementById("login-nome").value.trim().toUpperCase();
    const senhaInput = document.getElementById("login-matricula").value.trim().toUpperCase();

    if (!matriculaInput || !senhaInput) {
        return alert("Preencha todos os campos.");
    }

    const matriculaUpper = matriculaInput.toUpperCase();
    const btnEntrar = document.querySelector(".login-btn-submit");
    if (btnEntrar) { btnEntrar.disabled = true; btnEntrar.innerText = "Verificando..."; }

    try {
        // Acesso local de desenvolvedor (não depende do Neon estar no ar).
        if (CADASTRO_MATRICULAS[matriculaInput] && senhaInput.toUpperCase() === matriculaInput.toUpperCase()) {
            finalizarLogin("Lucas", CADASTRO_MATRICULAS[matriculaInput], matriculaInput, null, true);
            return;
        }

        const apiBase = await resolverApiBase();

        // Se demorar, é provável que o servidor (Render) e/ou o banco
        // (Neon) estejam "acordando" de um período parado — avisa o
        // colaborador em vez de deixar ele achando que travou. A
        // mensagem evolui conforme o tempo passa, pra deixar claro que
        // ainda está tentando, não travado.
        const avisoLento1 = setTimeout(() => {
            if (btnEntrar) btnEntrar.innerText = "Conectando ao servidor...";
        }, 3000);
        const avisoLento2 = setTimeout(() => {
            if (btnEntrar) btnEntrar.innerText = "Servidor iniciando, aguarde...";
        }, 12000);
        const avisoLento3 = setTimeout(() => {
            if (btnEntrar) btnEntrar.innerText = "Quase lá, ainda tentando...";
        }, 45000);

        let resp;
        try {
            resp = await fetchComRetry(`${apiBase}/api/colaboradores/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matricula: matriculaUpper, senha: senhaInput })
            });
        } finally {
            clearTimeout(avisoLento1);
            clearTimeout(avisoLento2);
            clearTimeout(avisoLento3);
        }

        const resultado = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            alert(resultado.detail || "Falha ao autenticar. Tente novamente.");
            return;
        }

        if (resultado.precisa_definir_senha) {
            await fluxoDefinirNovaSenha(matriculaUpper, senhaInput, resultado.nome, resultado.cargo, resultado.area, resultado.is_adm);
            return;
        }

        finalizarLogin(resultado.nome, resultado.cargo, matriculaUpper, resultado.area, resultado.is_adm);
    } catch (e) {
        console.error("Erro no login:", e);
        alert("Não foi possível conectar ao servidor mesmo após tentar novamente. Verifique sua internet e tente mais uma vez em alguns segundos.");
    } finally {
        if (btnEntrar) { btnEntrar.disabled = false; btnEntrar.innerText = "Autenticar Terminal"; }
    }
}

// ==========================================
// PRIMEIRO ACESSO: obriga a cadastrar uma senha definitiva
// ==========================================
async function fluxoDefinirNovaSenha(matricula, senhaAtual, nome, cargo, area, isAdm) {
    alert(`Bem-vindo(a), ${nome}!\nEste é seu primeiro acesso. Você precisa cadastrar uma senha definitiva (mínimo 4 caracteres).`);

    while (true) {
        let novaSenha = prompt("Digite sua nova senha:");
        if (novaSenha === null) return; // cancelou
        novaSenha = novaSenha.trim().toUpperCase();
        if (novaSenha.length < 4) {
            alert("A senha precisa ter pelo menos 4 caracteres.");
            continue;
        }
        let confirmacao = prompt("Confirme a nova senha:");
        if (confirmacao === null) return;
        confirmacao = confirmacao.trim().toUpperCase();
        if (novaSenha !== confirmacao) {
            alert("As senhas não coincidem. Tente de novo.");
            continue;
        }

        try {
            const apiBase = await resolverApiBase();
            const resp = await fetchComRetry(`${apiBase}/api/colaboradores/definir_senha`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matricula, senha_atual: senhaAtual, nova_senha: novaSenha })
            });
            const resultado = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                alert(resultado.detail || "Não foi possível cadastrar a senha. Tente novamente.");
                continue;
            }
            alert("✅ Senha cadastrada! A partir de agora, use ela pra entrar.");
            finalizarLogin(nome, cargo, matricula, area, isAdm);
            return;
        } catch (e) {
            console.error("Erro ao definir senha:", e);
            alert("Não foi possível conectar ao servidor. Tente novamente.");
            return;
        }
    }
}

// ==========================================
// FINALIZA O LOGIN (comum a dev, colaborador e primeiro acesso)
// ==========================================
async function finalizarLogin(nome, cargo, matricula, area, isAdm) {
    // 🆕 Área do técnico + flag de ADM (vêm do login no back-end; no
    // acesso local de dev, is_adm é forçado true). Usado no Painel do
    // Técnico pra filtrar "Em Reparo" / "Em Andamento" só pelos
    // equipamentos da área da pessoa — ADM (as 3 matrículas fixas) vê
    // tudo, sem filtro nenhum, em qualquer aba (mobile ou PC).
    OPERADOR_LOGADO = {
        matricula: matricula,
        nome: `${nome} [${cargo}]`,
        area: area || null,
        isAdm: !!isAdm || MATRICULAS_ADM.includes(matricula)
    };
    localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
    setOperadorBanco(OPERADOR_LOGADO); // 🔧 mantém a cópia do banco.js sincronizada (ver comentário em window.setOperadorLogado)

    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";

    // 🛡️ Protegido: se atualizarInterfaceUsuario() (que redesenha várias
    // partes da tela) falhar por qualquer motivo, isso NÃO pode impedir
    // o registro do login nem a sincronização de dados logo abaixo — foi
    // exatamente isso que aconteceu quando um bug de renderização
    // (btnExcluir) travava aqui e o login "sumia" sem deixar rastro.
    if (typeof atualizarInterfaceUsuario === 'function') {
        try { atualizarInterfaceUsuario(); } catch (e) { console.error('⚠️ Falha ao atualizar a interface (login prosseguiu mesmo assim):', e); }
    }
    if (typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
    window.ativarPushNotification();

    // 🔧 CORREÇÃO ("encerra o turno, loga de novo, continua com os dados
    // vazios/velhos até fechar e abrir o app"): antes, a sincronização com
    // o banco só rodava UMA vez, no carregamento da página (antes até do
    // login acontecer). Se ela falhasse nesse instante (servidor ainda
    // acordando), nada nunca mandava tentar de novo — nem fazer login,
    // nem encerrar turno e logar de novo, só um recarregamento completo
    // da página dava outra chance. Como o login que acabou de dar certo
    // já prova que o servidor está de pé, este é o melhor momento pra dar
    // mais uma tentativa real de sincronizar tudo, antes de desenhar a tela.
    if (typeof window.carregarAtivosDoPython === 'function') await executarSeguroAsync(() => window.carregarAtivosDoPython(), 'carregarAtivosDoPython');
    if (typeof sincronizarRolosReais === 'function') await executarSeguroAsync(() => sincronizarRolosReais(), 'sincronizarRolosReais');
    if (typeof sincronizarHidraulicaReal === 'function') await executarSeguroAsync(() => sincronizarHidraulicaReal(), 'sincronizarHidraulicaReal');

    if (typeof calcularKpisGlobais === 'function') executarSeguro(() => calcularKpisGlobais(), 'calcularKpisGlobais');
    if (typeof renderPainelVeios === 'function') executarSeguro(() => renderPainelVeios(), 'renderPainelVeios');
    if (typeof renderAtivos === 'function') executarSeguro(() => renderAtivos(), 'renderAtivos');
    if (typeof renderReparos === 'function') executarSeguro(() => renderReparos(), 'renderReparos');
    if (typeof renderReservas === 'function') executarSeguro(() => renderReservas(), 'renderReservas');
    if (typeof renderRolos === 'function') executarSeguro(() => renderRolos(), 'renderRolos');
    if (typeof carregarMateriaisDoBackend === 'function') executarSeguro(() => carregarMateriaisDoBackend(), 'carregarMateriaisDoBackend');
    if (typeof atualizarPainelCompleto === 'function') executarSeguro(() => atualizarPainelCompleto(), 'atualizarPainelCompleto');

    // 🔧 Técnico entra direto no Painel do Técnico (visão simplificada e
    // com as ações do dia a dia), em vez do Painel Geral OMS — que é mais
    // voltado pra visão gerencial/completa da planta.
    const ehTecnico = (cargo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("tecnico");
    if (ehTecnico && typeof window.abrirAba === 'function') {
        const navTecnico = document.getElementById("nav-tecnico");
        if (navTecnico) window.abrirAba({ preventDefault(){}, currentTarget: navTecnico }, "aba-tecnico");
    }
}

// (fazerLogout real fica definida mais abaixo, como window.fazerLogout —
// ver correção do bug do abrirAba() duplicado.)

// ==========================================
// MODO VISITANTE (somente leitura)
// ==========================================
// ==========================================
// MODAL: PEDIR NOME ANTES DE ENTRAR COMO VISITANTE
// ==========================================
window.abrirModalVisitante = function() {
    const input = document.getElementById("visitante-nome-input");
    if (input) input.value = "";
    const modal = document.getElementById("modal-visitante-nome");
    if (modal) modal.classList.remove("hidden");
    setTimeout(() => { if (input) input.focus(); }, 150);
};
window.fecharModalVisitante = function() {
    const modal = document.getElementById("modal-visitante-nome");
    if (modal) modal.classList.add("hidden");
};
window.confirmarAcessoVisitante = function() {
    const nome = document.getElementById("visitante-nome-input")?.value.trim();
    if (!nome) return alert("Digite seu nome pra continuar.");
    window.fecharModalVisitante();
    entrarComoVisitante(nome);
};

// 🔧 Agora recebe o nome digitado no modal (antes sempre entrava como
// "Visitante" genérico, sem dar pra saber quem realmente acessou). O
// nome fica registrado no histórico de autenticação e aparece no lugar
// de "Colaborador" no menu lateral.
async function entrarComoVisitante(nomeDigitado) {
    const nome = (nomeDigitado || "Visitante").trim();
    OPERADOR_LOGADO = { matricula: null, nome: nome, visitante: true };
    localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
    setOperadorBanco(OPERADOR_LOGADO); // 🔧 mantém a cópia do banco.js sincronizada (ver comentário em window.setOperadorLogado)

    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";

    if (typeof atualizarInterfaceUsuario === 'function') {
        try { atualizarInterfaceUsuario(); } catch (e) { console.error('⚠️ Falha ao atualizar a interface (acesso visitante prosseguiu mesmo assim):', e); }
    }
    if (typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Acesso em Modo Visitante (somente leitura) — ${nome}.`);

    // 🔧 Mesma correção do login normal: força uma sincronização real
    // com o backend antes de desenhar a tela, em vez de só reaproveitar
    // o que já estava (ou não estava) carregado.
    if (typeof window.carregarAtivosDoPython === 'function') await executarSeguroAsync(() => window.carregarAtivosDoPython(), 'carregarAtivosDoPython');
    if (typeof sincronizarRolosReais === 'function') await executarSeguroAsync(() => sincronizarRolosReais(), 'sincronizarRolosReais');
    if (typeof sincronizarHidraulicaReal === 'function') await executarSeguroAsync(() => sincronizarHidraulicaReal(), 'sincronizarHidraulicaReal');

    if (typeof calcularKpisGlobais === 'function') executarSeguro(() => calcularKpisGlobais(), 'calcularKpisGlobais');
    if (typeof renderPainelVeios === 'function') executarSeguro(() => renderPainelVeios(), 'renderPainelVeios');
    if (typeof renderAtivos === 'function') executarSeguro(() => renderAtivos(), 'renderAtivos');
    if (typeof renderReparos === 'function') executarSeguro(() => renderReparos(), 'renderReparos');
    if (typeof renderReservas === 'function') executarSeguro(() => renderReservas(), 'renderReservas');
    if (typeof renderRolos === 'function') executarSeguro(() => renderRolos(), 'renderRolos');
    if (typeof carregarMateriaisDoBackend === 'function') executarSeguro(() => carregarMateriaisDoBackend(), 'carregarMateriaisDoBackend');
    if (typeof atualizarPainelCompleto === 'function') executarSeguro(() => atualizarPainelCompleto(), 'atualizarPainelCompleto');
}

export function verificarAcesso() {
    if (!OPERADOR_LOGADO) {
        // 🔧 CORREÇÃO CRÍTICA ("marco uma etapa do Checklist, o sistema
        // volta pra tela de login, e ao logar de novo volta direto pro
        // Checklist"): o modal do Checklist de Execução (e outros modais)
        // ficam DENTRO de #container-sistema-oms no HTML. Escondendo só o
        // container, o modal "some" junto (efeito colateral, não fechado
        // de verdade — a classe "hidden" dele nunca volta). Quando faz
        // login de novo e o container reaparece, o modal reaparece junto,
        // por trás de tudo, dando a impressão de ter "voltado" pra ele.
        // Agora, antes de trocar de tela, fecha de verdade qualquer modal
        // que esteja aberto.
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
        return false;
    }
    if (OPERADOR_LOGADO.visitante) {
        alert("🔒 Modo Visitante: apenas visualização.\nFaça login com sua matrícula para criar, editar ou excluir.");
        return false;
    }
    return true;
}

// ==========================================
// ABRIR ABA - CORRIGIDA E BLINDADA
// ==========================================
// ==========================================
// HISTÓRICO E AUDITORIA
// ==========================================
// 🔧 CORREÇÃO CRÍTICA ("evento de instalação não aparece no Prontuário,
// mesmo com tudo mais certo — Data de Entrada ok, Localização ok"):
// esta função é chamada de forma síncrona, e o envio pro banco
// (salvarHistoricoNoPython) sempre rodou em "fire-and-forget" — chama e
// não espera terminar. Isso é ok na maioria dos casos, mas o Swap
// (iniciarSwapAlocacao) chama registrarHistorico() e, logo em seguida,
// mostra um alert() de sucesso e permite o técnico seguir pra próxima
// tela. Se a internet estiver lenta ou o servidor (Render) estiver
// "acordando" de um período parado (comum no plano free, pode levar uns
// bons segundos), e o técnico trocar de aba/tela rápido demais depois
// do alert, o navegador pode abandonar essa chamada ANTES dela terminar
// — o Swap em si fica salvo certinho (isso já é aguardado com "await"
// em outro lugar), mas o REGISTRO do evento no histórico se perde,
// mesmo aparecendo local na hora (por isso parecia "funcionar" até
// reabrir o Prontuário depois).
//
// Agora registrarHistorico() devolve a Promise do salvamento no banco,
// pra quem chama poder (opcionalmente) usar "await" antes de avisar o
// técnico que terminou — ver iniciarSwapAlocacao() mais abaixo, que
// agora faz exatamente isso nos pontos críticos (entrar/sair de um
// slot). Chamadas antigas que não usam "await" continuam funcionando
// exatamente igual — retornar uma Promise não quebra nada pra quem
// ignora o retorno.
async function registrarHistorico(tag, acao) {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');

    const evento = {
        data: data,
        tag: tag,
        acao: acao,
        responsavel: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema"
    };

    HISTORICO_ACOES.unshift(evento);

    if (HISTORICO_ACOES.length > 2000) {
        HISTORICO_ACOES.pop();
    }

    localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
    renderHistorico();
    if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();

    // 🔧 Antes, o histórico só ficava salvo no localStorage do navegador
    // de cada colaborador — cada um via um histórico diferente, e não
    // dava pra consultar nada pela API. Agora, toda ação registrada aqui
    // também é enviada pro Neon (tabela log_eventos), disponível em
    // GET /api/historico_eventos (com filtro por peca_id).
    if (typeof salvarHistoricoNoPython === 'function') {
        await salvarHistoricoNoPython(evento);
    }
}

// Monta o HTML das linhas da tabela de Auditoria a partir de uma lista
// já pronta de "ações" (no formato {data, tag, acao, responsavel,
// dataTimestamp}) + laudos. Extraído de renderHistorico() pra poder ser
// reaproveitado tanto no render instantâneo (local) quanto depois que a
// busca no servidor voltar — ver atualizarHistoricoGlobalComServidor().
function montarLinhasHistorico(acoes, laudos, filtroData) {
    let todos = [
        ...acoes.map(h => ({
            ...h,
            tipo: 'acao',
            dataTimestamp: h.dataTimestamp !== undefined ? h.dataTimestamp : (() => {
                try {
                    const partes = h.data.split(' ');
                    const dataPartes = partes[0].split('/');
                    const dataStr = dataPartes[2] + '-' + dataPartes[1] + '-' + dataPartes[0];
                    return new Date(dataStr + 'T' + partes[1]).getTime();
                } catch (e) { return 0; }
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
        return `<tr><td colspan="4" class="text-center text-muted">Nenhum registro encontrado.</td></tr>`;
    }

    return todos.map(item => {
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

function renderHistorico() {
    const tbody = document.getElementById("historico-table-body");
    if (!tbody) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    if (!MATRICULAS_AUDITORIA.includes(matricula)) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Acesso restrito.</td></tr>`;
        return;
    }

    const filtroData = document.getElementById("filtro-data-historico")?.value || '';

    // Mostra na hora o que já tem local (resposta instantânea, cobre o
    // caso sem internet) — a lista completa e oficial vem logo em
    // seguida do servidor, ver abaixo.
    tbody.innerHTML = montarLinhasHistorico(HISTORICO_ACOES, getLaudosSalvos(), filtroData);

    // 🔧 CORREÇÃO CRÍTICA ("preciso que apareça TUDO pros dois
    // moderadores, incluindo visitante"): esta função só usava
    // HISTORICO_ACOES — um array que vive no localStorage DE CADA
    // APARELHO. Um moderador abrindo a Auditoria no celular dele só via
    // as ações feitas NAQUELE MESMO aparelho/sessão — qualquer coisa
    // feita por um técnico (ou por um Visitante, que também já registra
    // o nome digitado via registrarHistorico) em OUTRO aparelho nunca
    // aparecia, mesmo estando salva certinho no banco. Agora busca a
    // lista oficial e completa do servidor (mesma rota que o Prontuário
    // individual e o Sinótico 3D já usam) e substitui a tabela por ela.
    atualizarHistoricoGlobalComServidor(filtroData);
}

// Ver correção grande em renderHistorico() logo acima.
async function atualizarHistoricoGlobalComServidor(filtroData) {
    const tbody = document.getElementById("historico-table-body");
    if (!tbody) return;
    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    if (!MATRICULAS_AUDITORIA.includes(matricula)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?limite=500`, { cache: 'no-store' });
        if (!resp.ok) return;
        const eventosServidor = await resp.json();
        if (!Array.isArray(eventosServidor)) return;

        // Enquanto buscava, o moderador pode ter trocado o filtro de
        // data — usa o valor mais atual do campo, não o que foi passado
        // no início da busca.
        const filtroAtual = document.getElementById("filtro-data-historico")?.value || '';

        let acoesDoServidor = eventosServidor.map(e => ({
            data: e.data_hora || '',
            tag: e.peca_id || 'AUTENTICAÇÃO',
            acao: e.acao || '',
            responsavel: e.operador || 'Sistema',
            dataTimestamp: e.data_hora ? new Date(e.data_hora.replace(' ', 'T')).getTime() : 0
        }));

        // 🔍 Filtro "Só Acessos": mostra só logins e entradas de visitante,
        // usando a mesma tag "AUTENTICAÇÃO" que já é salva em cada login.
        if (typeof FILTRO_SO_ACESSOS !== 'undefined' && FILTRO_SO_ACESSOS) {
            acoesDoServidor = acoesDoServidor.filter(a => a.tag === 'AUTENTICAÇÃO');
        }

        // 🔧 CORREÇÃO ("laudos sumiam da Auditoria assim que a busca do
        // servidor terminava"): esta função sempre substituiu a tabela
        // passando um array VAZIO de laudos pro montarLinhasHistorico —
        // então mesmo quando os laudos eram só locais, eles apareciam só
        // por um instante (na primeira renderização, antes desta busca
        // terminar) e depois somiam. Agora busca os laudos oficiais do
        // servidor também, do mesmo jeito que já faz com os eventos.
        let laudosDoServidor = [];
        try {
            const respLaudos = await fetch(`${apiBase}/api/laudos?limite=200`, { cache: 'no-store' });
            if (respLaudos.ok) {
                const laudosBrutos = await respLaudos.json();
                if (Array.isArray(laudosBrutos)) {
                    laudosDoServidor = laudosBrutos.map(l => ({
                        id: l.id,
                        tag: l.peca_id,
                        tipo: l.tipo,
                        data: l.criado_em || '',
                        responsavel: l.criado_por || 'Sistema',
                        html: l.html,
                        timestamp: l.criado_em ? new Date(l.criado_em.replace(' ', 'T')).getTime() : 0
                    }));
                }
            }
        } catch (eLaudos) {
            console.error('⚠️ Não consegui buscar os laudos do servidor:', eLaudos);
        }

        tbody.innerHTML = montarLinhasHistorico(acoesDoServidor, laudosDoServidor, filtroAtual);
    } catch (e) {
        console.error('⚠️ Não consegui buscar a Auditoria completa do servidor (mantendo só o que tinha local):', e);
    }
}


// ==========================================
// PAINEL DE TESTE DE FOLHÕES — só CBK3574 e CSP1869 podem ver
// ==========================================
// 🔒 Restrição fica no JS, não só escondendo com CSS: a tabela de
// equipamentos só é montada (innerHTML preenchido) se a matrícula
// logada bater com uma das autorizadas. Pra qualquer outro colaborador,
// o link do menu nem aparece e a aba fica vazia mesmo se a pessoa tentar
// abrir na unha pelo console.
const MATRICULAS_TESTE_FOLHOES = ["CBK3574", "CSP1869"];

// ==========================================
// AUDITORIA — só CBK3574 e CSP1869 podem ver
// ==========================================
// 🔒 Mesmo princípio do painel de teste acima: a restrição não é só
// visual (esconder o link do menu). renderHistorico() abaixo também
// se recusa a montar a tabela pra quem não está na lista — ninguém
// não autorizado vê os dados de auditoria, nem forçando a aba pelo
// console do navegador.
const MATRICULAS_AUDITORIA = ["CBK3574", "CSP1869"];

function ativarAuditoriaSeAutorizado() {
    const link = document.getElementById("nav-historico");
    if (!link) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    const autorizado = MATRICULAS_AUDITORIA.includes(matricula);

    if (autorizado) {
        link.classList.remove("hidden");
    } else {
        link.classList.add("hidden");
        // Se a aba de Auditoria estava aberta (ex: outro operador loga
        // por cima na mesma tela), tira a pessoa de lá.
        const abaHistorico = document.getElementById("aba-historico");
        if (abaHistorico && !abaHistorico.classList.contains("hidden") && typeof window.abrirAba === 'function') {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel) window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
        }
    }
    // renderHistorico() decide sozinha se preenche a tabela ou não,
    // com base na mesma checagem de matrícula — chamar de novo aqui
    // garante que o conteúdo (não só o link) reflita a autorização atual.
    if (typeof renderHistorico === 'function') renderHistorico();
}
window.ativarAuditoriaSeAutorizado = ativarAuditoriaSeAutorizado;

// ==========================================
// 🆕 CENTRAL DE NOTIFICAÇÕES — visível pra ADM (admin do sistema, as 3
// matrículas fixas de MATRICULAS_ADM) e pra quem tem "Supervisor" no
// cargo (mesmo texto livre que já aparece entre colchetes no nome, ex:
// "Filipe [Supervisor]" — não existe uma coluna de cargo separada pra
// isso hoje, então reaproveita a mesma extração já usada no badge).
// ==========================================
function operadorEhSupervisorOuAdm() {
    if (!OPERADOR_LOGADO || OPERADOR_LOGADO.visitante) return false;
    if (OPERADOR_LOGADO.isAdm) return true;
    const match = (OPERADOR_LOGADO.nome || "").match(/\[(.+?)\]/);
    const cargo = match ? match[1] : "";
    return /supervisor/i.test(cargo);
}
window.operadorEhSupervisorOuAdm = operadorEhSupervisorOuAdm;

let TIMER_BADGE_NOTIFICACOES_GLOBAL = null;

function ativarCentralNotificacoesSeAutorizado() {
    const link = document.getElementById("nav-notificacoes");
    if (!link) return;

    const autorizado = operadorEhSupervisorOuAdm();

    if (autorizado) {
        link.classList.remove("hidden");
        // 🆕 Atualiza o número no sininho mesmo com a Central fechada —
        // dá pra ver que tem coisa nova sem precisar abrir a aba. Chamado
        // de novo a cada login/refresh de interface; o polling contínuo
        // (a cada 2 min) é armado uma vez logo abaixo.
        if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas();
        if (!TIMER_BADGE_NOTIFICACOES_GLOBAL) {
            TIMER_BADGE_NOTIFICACOES_GLOBAL = setInterval(() => {
                if (operadorEhSupervisorOuAdm() && typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') {
                    window.atualizarBadgeNotificacoesNaoLidas();
                }
            }, 120000);
        }
    } else {
        link.classList.add("hidden");
        if (typeof window.pararPollingCentralNotificacoes === 'function') window.pararPollingCentralNotificacoes();
        const aba = document.getElementById("aba-notificacoes");
        if (aba && aba.classList.contains("active") && typeof window.abrirAba === 'function') {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel) window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
        }
    }
}
window.ativarCentralNotificacoesSeAutorizado = ativarCentralNotificacoesSeAutorizado;

function ativarPainelDevSeAutorizado() {
    const link = document.getElementById("nav-dev-teste");
    const divisor = document.getElementById("nav-divider-dev");
    // 🆕 Os dois links novos da Área Restrita (Registro Recente e
    // Administração) usam a mesma checagem de matrícula que o Teste de
    // Folhões — então ficam visíveis/escondidos junto com ele aqui.
    const linkRegistroRecente = document.getElementById("nav-registro-recente");
    const linkAdmin = document.getElementById("nav-admin-colaboradores");
    if (!link) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    const autorizado = MATRICULAS_TESTE_FOLHOES.includes(matricula);

    if (autorizado) {
        link.classList.remove("hidden");
        if (linkRegistroRecente) linkRegistroRecente.classList.remove("hidden");
        if (linkAdmin) linkAdmin.classList.remove("hidden");
        if (divisor) divisor.classList.remove("hidden");
        renderPainelDevTeste();
    } else {
        link.classList.add("hidden");
        if (linkRegistroRecente) linkRegistroRecente.classList.add("hidden");
        if (linkAdmin) linkAdmin.classList.add("hidden");
        if (divisor) divisor.classList.add("hidden");
        const corpo = document.getElementById("dev-teste-table-body");
        if (corpo) corpo.innerHTML = ""; // garante que não sobra nada renderizado de uma sessão anterior
        // Se a pessoa estava numa dessas abas e outro operador loga por
        // cima sem ser autorizado, tira ela de lá (mesmo princípio já
        // usado em ativarAuditoriaSeAutorizado para a Auditoria).
        const abaAtual = document.querySelector('.tab-content.active');
        if (abaAtual && ['aba-registro-recente', 'aba-admin-colaboradores', 'aba-dev-teste'].includes(abaAtual.id)) {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel && typeof window.abrirAba === 'function') {
                window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
            }
        }
    }
}

function renderPainelDevTeste() {
    const tbody = document.getElementById("dev-teste-table-body");
    if (!tbody) return;

    if (!BANCO_ATIVOS || BANCO_ATIVOS.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento cadastrado.</td></tr>`;
        return;
    }

    const linhas = [...BANCO_ATIVOS]
        .sort((a, b) => (a.tipo || "").localeCompare(b.tipo || "") || (a.id || "").localeCompare(b.id || ""))
        .map(item => `
            <tr>
                <td class="font-code">${item.id}</td>
                <td>${item.tipo || "-"}</td>
                <td>${item.local || "-"}</td>
                <td style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn-premium" style="padding:4px 12px; font-size:12px;" onclick="window.abrirFolhaoPorTipo('${item.id}')">
                        <i class="fas fa-file-alt"></i> Abrir Folhão
                    </button>
                    <button class="btn-premium" style="padding:4px 12px; font-size:12px;" onclick="window.previsualizarFolhaoDoReparo('${item.id}')" title="Ver como o Folhão está ficando, sem precisar completar o Checklist de Execução">
                        <i class="fas fa-eye"></i> Pré-visualizar
                    </button>
                </td>
            </tr>
        `).join("");

    tbody.innerHTML = linhas;
}

window.ativarPainelDevSeAutorizado = ativarPainelDevSeAutorizado;
window.renderPainelDevTeste = renderPainelDevTeste;

// 🆕 Mostra/esconde o botão manual "Ativar Notificações" — só aparece
// quando faz sentido (navegador suporta, ainda não foi concedido, tem
// alguém logado e não é visitante). Some sozinho depois que a pessoa
// concede (ou nega) a permissão.
function atualizarBotaoAtivarNotificacoes() {
    const btn = document.getElementById("btn-ativar-notificacoes");
    if (!btn) return;
    const suportado = ("Notification" in window) && ("serviceWorker" in navigator) && ("PushManager" in window);
    const jaDecidido = suportado && Notification.permission !== "default";
    const visitante = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.visitante);
    const mostrar = suportado && !jaDecidido && !visitante && !!OPERADOR_LOGADO;
    btn.classList.toggle("hidden", !mostrar);
}
window.atualizarBotaoAtivarNotificacoes = atualizarBotaoAtivarNotificacoes;

function atualizarInterfaceUsuario() {
    const nomeEl = document.getElementById("nome-operador-logado");
    const badgeEl = document.getElementById("badge-cargo-operador");
    const matriculaEl = document.getElementById("matricula-operador-logado");
    const btnLogout = document.getElementById("btn-encerrar-turno");

    if (!OPERADOR_LOGADO) {
        if (nomeEl) nomeEl.innerText = "Não identificado";
        if (matriculaEl) matriculaEl.style.display = "none";
        if (badgeEl) badgeEl.style.display = "none";
        renderHistorico();
        ativarPainelDevSeAutorizado();
        ativarAuditoriaSeAutorizado();
        ativarCentralNotificacoesSeAutorizado();
        atualizarBotaoAtivarNotificacoes();
        return;
    }

    if (OPERADOR_LOGADO.visitante) {
        if (nomeEl) nomeEl.innerText = `👁️ ${OPERADOR_LOGADO.nome || "Visitante"}`;
        if (matriculaEl) matriculaEl.style.display = "none";
        if (badgeEl) {
            badgeEl.innerText = "Somente leitura";
            badgeEl.className = "operator-role-badge role-visitante";
            badgeEl.style.display = "inline-block";
        }
        // Visitante não tem "turno" pra encerrar — o botão vira um
        // atalho direto de volta pro login, sem confirmação nem alerta.
        if (btnLogout) btnLogout.innerText = "Voltar ao Login";
        renderHistorico();
        ativarPainelDevSeAutorizado();
        ativarAuditoriaSeAutorizado();
        ativarCentralNotificacoesSeAutorizado();
        atualizarBotaoAtivarNotificacoes();
        return;
    }

    if (btnLogout) btnLogout.innerText = "Encerrar Turno";

    // Extrai o cargo entre colchetes do nome cadastrado, ex: "Filipe [Líder]"
    const match = (OPERADOR_LOGADO.nome || "").match(/\[(.+?)\]/);
    const cargo = match ? match[1] : "Operador";
    const nomeLimpo = (OPERADOR_LOGADO.nome || "").replace(/\s*\[.+?\]/, "");

    if (nomeEl) nomeEl.innerText = nomeLimpo || "Não identificado";
    if (matriculaEl) {
        matriculaEl.innerText = `Matrícula: ${OPERADOR_LOGADO.matricula || "--"}`;
        matriculaEl.style.display = "block";
    }
    if (badgeEl) {
        badgeEl.innerText = cargo;
        badgeEl.className = "operator-role-badge";
        badgeEl.style.display = "inline-block";
    }
    renderHistorico();
    ativarPainelDevSeAutorizado();
    ativarAuditoriaSeAutorizado();
    ativarCentralNotificacoesSeAutorizado();
    atualizarBotaoAtivarNotificacoes();
    aplicarRestricaoNavTecnico();
}

// ==========================================
// 🆕 RESTRIÇÃO DE NAVEGAÇÃO — TÉCNICO SÓ VÊ AS PRÓPRIAS ABAS
// ==========================================
// Técnico com área cadastrada (não-ADM, não-visitante) só pode acessar
// o "Painel do Técnico" + as abas de monitoramento/registro que ele
// usa no dia a dia (Sinótico 3D, Sequenciamento de Veios, Registro de
// Ocorrência, Registro de OS) — o resto do menu lateral fica escondido.
// ADM (MATRICULAS_ADM) e visitante continuam vendo o menu completo.
const NAV_IDS_LIBERADOS_TECNICO = ['nav-tecnico', 'nav-sinotico', 'nav-fluxo', 'nav-ocorrencia', 'nav-ordens-servico'];

function aplicarRestricaoNavTecnico() {
    const restrito = !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && !OPERADOR_LOGADO.isAdm && OPERADOR_LOGADO.area);

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => {
        // 🆕 Supervisor com área cadastrada cai no "restrito" acima (não é
        // ADM), mas ainda precisa ver a Central de Notificações — sem essa
        // exceção o link ficaria escondido por aqui mesmo já autorizado
        // por ativarCentralNotificacoesSeAutorizado().
        const excecaoNotificacoes = el.id === 'nav-notificacoes' && operadorEhSupervisorOuAdm();
        const liberado = NAV_IDS_LIBERADOS_TECNICO.includes(el.id) || excecaoNotificacoes;
        el.style.display = (restrito && !liberado) ? 'none' : '';
    });
    // Dividers de seção ("Monitoramento de Máquinas", "Oficina"...) só
    // ficam visíveis se sobrar pelo menos 1 link liberado dentro dela.
    document.querySelectorAll('.sidebar-nav .nav-divider').forEach(divider => {
        if (!restrito) { divider.style.display = ''; return; }
        let irmao = divider.nextElementSibling;
        let temLinkVisivel = false;
        while (irmao && !irmao.classList.contains('nav-divider')) {
            if (irmao.classList.contains('nav-link') && irmao.style.display !== 'none') { temLinkVisivel = true; break; }
            irmao = irmao.nextElementSibling;
        }
        divider.style.display = temLinkVisivel ? '' : 'none';
    });

    if (restrito) {
        const abaAtual = document.querySelector('.tab-content.active');
        const idAtual = abaAtual ? abaAtual.id : null;
        const abaAindaPermitida = idAtual === 'aba-tecnico' || idAtual === 'aba-fluxo' || idAtual === 'aba-ocorrencia' || idAtual === 'aba-ordens-servico';
        if (!abaAindaPermitida) window.abrirAba(null, 'aba-tecnico');
    }
}
window.aplicarRestricaoNavTecnico = aplicarRestricaoNavTecnico;
// 🔧 CORREÇÃO ("some o nome/matrícula/cargo, fica só '...' quando reabre o
// app já logado"): esta função só era chamada dentro do próprio script.js
// (como identificador puro, funciona certo lá). Mas o bloco de "restaurar
// sessão salva" no app.html é um <script type="module"> SEPARADO, que só
// enxerga isso através de window.* — e como window.atualizarInterfaceUsuario
// nunca existia, aquele "if (window.atualizarInterfaceUsuario) ..." era
// sempre falso e a função nunca rodava nesse caminho. O nome/matrícula/cargo
// ficavam parados no placeholder "..." do HTML (só apareciam certinho no
// login normal, que chama a função direto, sem passar por window).
window.atualizarInterfaceUsuario = atualizarInterfaceUsuario;

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

    animarNumero("kpi-criticos", criticos);
    animarNumero("kpi-reparo", reparo);
    animarNumero("kpi-reserva", reserva);
}
window.calcularKpisGlobais = calcularKpisGlobais;

// ==========================================
// ANIMAÇÃO DE CONTAGEM NOS NÚMEROS DOS KPIs
// ==========================================
function animarNumero(elId, valorFinal, duracaoMs = 650) {
    const el = document.getElementById(elId);
    if (!el) return;
    const valorInicial = parseInt(el.dataset.valorAtual || el.innerText, 10) || 0;
    if (valorInicial === valorFinal) {
        el.innerText = valorFinal;
        el.dataset.valorAtual = valorFinal;
        return;
    }
    const inicio = performance.now();
    function passo(agora) {
        const progresso = Math.min((agora - inicio) / duracaoMs, 1);
        const facilitado = 1 - Math.pow(1 - progresso, 3); // ease-out cúbico
        const valorAtual = Math.round(valorInicial + (valorFinal - valorInicial) * facilitado);
        el.innerText = valorAtual;
        if (progresso < 1) {
            requestAnimationFrame(passo);
        } else {
            el.innerText = valorFinal;
            el.dataset.valorAtual = valorFinal;
        }
    }
    requestAnimationFrame(passo);
}
window.animarNumero = animarNumero;

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================

// FUNÇÃO AUXILIAR PARA GERAR SLOTS MCC 2/3
function gerarSlotsMCC23() {
    const slots = [
        { id: "MOLDE", nome: "Molde Convencional", tipo: "Molde" },
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
        if (idUpper.includes("STR-1") || idUpper.includes("R1")) return "STR-1";
        if (idUpper.includes("STR-2") || idUpper.includes("R2")) return "STR-2";
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

            // 🆕 Selo de ocorrência de mancal: se a peça tem QUALQUER
            // mancal marcado (quebra de rolamento / vazamento de graxa
            // ou água — gravado em "mancais_ocorrencias", ver
            // Sinotico3d.html), mostra um aviso vermelho piscando no
            // card, pra dar pra ver de longe que tem algo errado sem
            // precisar abrir a peça uma por uma.
            let temOcorrenciaMancal = false;
            try {
                const mapaOcorrencias = JSON.parse(pecaEncontrada.mancais_ocorrencias || '{}');
                temOcorrenciaMancal = Object.values(mapaOcorrencias).some(v => !!v);
            } catch (e) { /* campo vazio/inválido — trata como sem ocorrência */ }

            htmlSlots += `
                <div class="ind-card" style="border-top: 3px solid var(--${corClass}); min-width: 260px; max-width: 300px; background: var(--bg-td); border-radius: var(--radius-md); padding: 16px 18px; transition: all var(--transition-base); ${temOcorrenciaMancal ? 'box-shadow: 0 0 0 2px var(--danger);' : ''}">
                    <div class="flex-between" style="margin-bottom: 4px;">
                        <span class="font-code" style="font-size: 0.9rem; font-weight: 700; color: var(--text-heading);">${pecaEncontrada.id}</span>
                        <span class="bg-tag" style="font-size: 0.55rem;">${pecaEncontrada.tipo}</span>
                    </div>
                    ${temOcorrenciaMancal ? `
                    <div style="display:flex; align-items:center; gap:5px; background: var(--danger-bg); color: var(--danger); border-radius: 4px; padding: 4px 8px; font-size: 0.65rem; font-weight: 700; margin-bottom: 8px;">
                        <i class="fas fa-triangle-exclamation"></i> Ocorrência em mancal — ver Prontuário
                    </div>` : ''}
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
    const dias = calcularDias(a);

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

    // 🔧 MIGRAÇÃO: equipamentos que já estavam instalados num veio antes
    // dessa atualização não tinham "dataEntradaVeio". Pra não zerar a
    // contagem de dias deles, plantamos a data retroativa com base no
    // valor de "dias" que já existia — a partir daqui, o contador passa
    // a andar sozinho, todo santo dia, sem precisar editar nada.
    let precisaSalvarMigracao = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local && a.local.includes("Veio") && !a.local.includes("Oficina") && !a.dataEntradaVeio) {
            const diasAtuais = a.dias || 0;
            a.dataEntradaVeio = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvarMigracao = true;
        }
    });
    if (precisaSalvarMigracao) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

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
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${calcularDias(a)}</td>
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
export function renderReparos() {
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

    // 🔧 CORREÇÃO ("reparo já iniciado continuava aparecendo em 'Iniciar
    // Reparo'"): equipamento com rascunho salvo (RASCUNHOS_IDS_ATIVOS,
    // atualizado por atualizarRascunhosAtivos()) já está "em andamento"
    // — não faz sentido continuar oferecendo "Iniciar" pra ele também.
    // Agora esses IDs são excluídos daqui e só aparecem na sub-aba
    // "Reparo em Andamento".
    const execucoesAtivas = window.EXECUCOES_CHECKLIST_IDS_ATIVAS || new Set();
    const reparosBrutos = BANCO_ATIVOS.filter(a =>
        a.local === "Oficina / Reparo" && !RASCUNHOS_IDS_ATIVOS.has(a.id) && !execucoesAtivas.has(a.id)
    );
    const { lista: reparos, semArea } = filtrarPorAreaTecnico(reparosBrutos);

    if (semArea) {
        repBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.</td></tr>`;
        return;
    }
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
                const dias = calcularDias(a);
                htmlFinal += `
                    <tr>
                        <td class="font-code" data-label="TAG" style="padding-left: 45px;">${a.id}</td>
                        <td data-label="Tipo"><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
                        <td data-label="Desgaste">
                            <div class="flex-align-center gap-10">
                                <span class="font-code bold w-40" style="color: var(--text-heading);">${pctFixed}%</span>
                                <div class="ind-gauge-bar premium-bar w-100px">
                                    <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
                                </div>
                            </div>
                        </td>
                        <td data-label="Dias em Reparo" style="font-weight:bold; color:var(--warning);">${dias} dias</td>
                        <td data-label="Ações">
                            <div class="flex-align-center gap-10 action-buttons-mobile" style="flex-wrap:wrap;">
                                <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
                                <button class="btn-premium btn-success" onclick="window.iniciarReparoEAbrirChecklist('${a.id}')"><i class="fas fa-play"></i> Iniciar Reparo</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });
    });

    repBody.innerHTML = htmlFinal;

    // 🆕 Dispara em segundo plano a busca do status do Checklist de
    // Execução (% concluído) e se o Folhão já foi salvo, pra cada
    // equipamento visível — os botões já renderizados acima usam o
    // cache; quando a busca voltar, a tabela é redesenhada com o
    // estado real (ver carregarStatusChecklistExecucaoReparo).
    window.carregarStatusChecklistExecucaoReparo(reparos.map(a => a.id));
}

// Checklist de Execução: módulo separado (extraído pra oficina/checklist-execucao.js).
import './Oficina/checklist-execucao.js';


// ==========================================
// FILTRO "SÓ ACESSOS" NA AUDITORIA
// ==========================================
let FILTRO_SO_ACESSOS = false;

window.filtrarHistoricoAcessos = function(soAcessos, botaoClicado) {
    FILTRO_SO_ACESSOS = soAcessos;
    document.querySelectorAll('#historico-filtro-acessos .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    const filtroData = document.getElementById("filtro-data-historico")?.value || '';
    atualizarHistoricoGlobalComServidor(filtroData);
};

// ==========================================
// FILTROS MCC
// ==========================================
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
    if (tagLocal) tagLocal.innerText = item.local || "Não alocado";

    renderizarResumoHistoricoIndividual(item);
    renderizarTabelaHistoricoIndividual(id);
    const modal = document.getElementById("modal-historico-ativo");
    if (modal) modal.classList.remove("hidden");

    // 🔧 Ver correção "PRONTUÁRIO NÃO MOSTRA QUANDO A PEÇA FOI
    // INSTALADA" logo abaixo, em atualizarTabelaHistoricoComServidor().
    // Não usa "await" de propósito: o modal já abre na hora com o que
    // tinha local, e a tabela é substituída assim que o servidor
    // responder, sem travar a abertura do modal.
    atualizarTabelaHistoricoComServidor(id);
    carregarFotosNoProntuario(id);
}

// ==============================================================
// RESUMO RÁPIDO DO PRONTUÁRIO (entrada atual, dias, folhões feitos)
// ==============================================================
function renderizarResumoHistoricoIndividual(item) {
    const container = document.getElementById("hist-resumo-cards");
    if (!container) return;

    const formatarData = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR') : "--";

    let cardEntrada, cardDias, iconeDias, corDias;

    if (item.local === "Oficina / Reparo" && item.dataReparo) {
        cardEntrada = formatarData(item.dataReparo);
        iconeDias = "fa-tools";
        corDias = "#ef4444";
    } else if (item.dataEntradaVeio && item.local && !item.local.includes("Oficina")) {
        // 🔧 Ver correção "Prontuário sem Data de Entrada" em
        // sincronizarAtivosReaisMCC4() (banco.js): quando não existe um
        // registro real (peça antiga, anterior a esse controle), a data
        // mostrada é uma ESTIMATIVA calculada a partir dos dias já
        // acumulados — marca com "~" pra deixar isso claro, em vez de
        // fingir ser uma data exata.
        cardEntrada = (item.dataEntradaEstimada ? "~" : "") + formatarData(item.dataEntradaVeio);
        iconeDias = "fa-industry";
        corDias = "#22c55e";
    } else {
        cardEntrada = "--";
        iconeDias = "fa-question";
        corDias = "var(--text-muted)";
    }

    const dias = typeof calcularDias === 'function' ? calcularDias(item) : (item.dias || 0);
    const statusLabel = item.local === "Oficina / Reparo" ? "Dias em Reparo" : "Dias na Máquina";

    // Conta quantos folhões (laudos de manutenção) já foram feitos nesse
    // equipamento, olhando o histórico global por menções de finalização.
    const historicoItem = HISTORICO_ACOES.filter(h => h.tag === item.id);
    const folhoesFeitos = historicoItem.filter(h => (h.acao || "").toLowerCase().includes("folhão") || (h.acao || "").toLowerCase().includes("laudo")).length;

    container.innerHTML = `
        <div class="kpi-card" style="border-top:3px solid ${corDias};">
            <div class="kpi-icon" style="color:${corDias}; border-color:${corDias}33;"><i class="fas ${iconeDias}"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${cardEntrada}</h4><p>${item.local === "Oficina / Reparo" ? "Saiu do Veio em" : (item.dataEntradaEstimada ? "Data de Entrada (estimada)" : "Data de Entrada Atual")}</p></div>
        </div>
        <div class="kpi-card" style="border-top:3px solid ${corDias};">
            <div class="kpi-icon" style="color:${corDias}; border-color:${corDias}33;"><i class="fas fa-calendar-day"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${dias}</h4><p>${statusLabel}</p></div>
        </div>
        <div class="kpi-card" style="border-top:3px solid var(--primary);">
            <div class="kpi-icon" style="color:var(--primary); border-color:rgba(56,189,248,0.2);"><i class="fas fa-clipboard-check"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${folhoesFeitos}</h4><p>Folhões Concluídos</p></div>
        </div>
    `;

    // 🔁 Quando a peça está em reparo por causa de um Swap (não um saque
    // manual), mostra quem entrou no lugar dela — antes essa informação
    // só existia dentro do texto livre da linha do tempo, difícil de
    // achar rápido.
    const avisoSubstituicao = document.getElementById("hist-aviso-substituicao");
    if (avisoSubstituicao) {
        if (item.local === "Oficina / Reparo" && item.substituidoPor) {
            avisoSubstituicao.innerHTML = `<i class="fas fa-right-left"></i> Substituída por <strong class="font-code">${item.substituidoPor}</strong>`;
            avisoSubstituicao.classList.remove("hidden");
        } else {
            avisoSubstituicao.classList.add("hidden");
        }
    }
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
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
        return;
    }

    const iconePorEvento = (acao) => {
        const a = (acao || "").toLowerCase();
        if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
        if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
        if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
        if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#38bdf8" };
        if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#a855f7" };
        return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
    };

    tbody.innerHTML = historicoFiltrado.map(h => {
        const { icone, cor } = iconePorEvento(h.acao);
        return `
        <tr>
            <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${h.data}</td>
            <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${h.acao}</td>
            <td style="font-size: 11px; color: var(--text-accent);">${h.responsavel || 'Sistema'}</td>
        </tr>`;
    }).join("");
}

// ==============================================================
// 🔧 CORREÇÃO CRÍTICA ("não aparece no Prontuário quando foi
// instalado na máquina"): renderizarTabelaHistoricoIndividual() (acima)
// só lê de HISTORICO_ACOES — um array que vive no localStorage DE CADA
// APARELHO/NAVEGADOR. Toda ação (troca, saque, cadastro...) já era
// enviada certinho pro banco (registrarHistorico -> salvarHistoricoNoPython
// -> tabela log_eventos no Neon), mas o Prontuário nunca ia buscar isso
// de volta — só mostrava o que aquele navegador específico acumulou na
// própria sessão. Resultado: um Swap feito e visto na hora (mesma
// sessão) parecia registrar certo, mas abrir o Prontuário dessa peça
// depois — em outro aparelho, outra sessão, ou depois de limpar o
// site — não mostrava o evento de instalação, só o que sobrou local
// (nesse caso, só o cadastro inicial). A própria aba do Sinótico 3D
// (que roda isolada, sem acesso a esse localStorage) já resolvia isso
// buscando direto do servidor — a correção abaixo faz o Prontuário do
// app principal fazer a mesma coisa.
//
// Fluxo: mostra o que já tem local na hora (resposta instantânea, feito
// em abrirHistoricoIndividual), depois busca a lista oficial do
// servidor e SUBSTITUI a tabela por ela. Se a busca falhar (sem
// internet), mantém o que já estava mostrando em vez de esvaziar.
// ==============================================================
async function atualizarTabelaHistoricoComServidor(id) {
    const tbody = document.getElementById("tabela-historico-individual");
    if (!tbody) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?peca_id=${encodeURIComponent(id)}&limite=200`, { cache: 'no-store' });
        if (!resp.ok) return;
        const eventos = await resp.json();
        if (!Array.isArray(eventos)) return;

        // Enquanto a busca rodava, o técnico pode ter fechado o
        // Prontuário ou aberto o de outra peça — não sobrescreve com um
        // resultado que já não é mais o que está na tela.
        if (ID_HISTORICO_ATUAL !== id) return;

        if (eventos.length === 0) {
            // 🔧 Mensagem mais clara pra peças antigas (da importação
            // original da planilha) que nunca passaram por uma ação
            // registrada pelo sistema (Swap, Saque, cadastro...): em vez
            // de parecer que "faltou registrar algo", explica que o
            // histórico do sistema só começa a partir de quando essa peça
            // passou a ser controlada por aqui.
            const itemAtual = BANCO_ATIVOS.find(a => a.id === id);
            const antigaJaInstalada = itemAtual && itemAtual.local && !itemAtual.local.includes("Oficina") && (itemAtual.dias || 0) > 0;
            tbody.innerHTML = antigaJaInstalada
                ? `<tr><td colspan="3" class="text-center text-muted">Sem eventos registrados pelo sistema — esta peça já estava instalada quando o controle digital começou (histórico anterior não é rastreado).</td></tr>`
                : `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
            return;
        }

        const iconePorEvento = (acao) => {
            const a = (acao || "").toLowerCase();
            if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
            if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
            if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
            if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#38bdf8" };
            if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#a855f7" };
            return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
        };

        // 🔧 CORREÇÃO ("registrei uma Atividade Pendente e não tem como
        // concluir ela no Prontuário"): uma "Atividade Pendente" criada
        // pelo modal de Intervenção vira só uma LINHA de texto no
        // histórico (log_eventos) — diferente das atividades da aba
        // Oficina, que têm status (Pendente/Em Andamento/Concluído) numa
        // tabela própria. Aqui não dá pra adicionar um campo de status
        // sem mudar o banco, então a solução é: quando o evento é da
        // categoria "Atividade Pendente" e ainda não tem uma marcação de
        // conclusão referenciando ele (procurando "(ref #ID)" nos outros
        // eventos dessa peça), mostra um botão "Concluir" que registra um
        // novo evento de conclusão, referenciando o id do original.
        const idsConcluidos = new Set();
        eventos.forEach(ev => {
            const m = (ev.acao || '').match(/\(ref #(\d+)\)/);
            if (m) idsConcluidos.add(Number(m[1]));
        });

        // A API já devolve mais recente primeiro (ORDER BY id DESC),
        // igual à ordem que a tabela local usa (unshift a cada evento novo).
        tbody.innerHTML = eventos.map(e => {
            const { icone, cor } = iconePorEvento(e.acao);
            const ehAtividadePendente = e.categoria === 'Atividade Pendente';
            const jaConcluida = idsConcluidos.has(e.id);
            let marcadorPendencia = '';
            if (ehAtividadePendente) {
                marcadorPendencia = jaConcluida
                    ? `<span style="font-size:10px; color:#22c55e; font-weight:700; margin-left:8px; white-space:nowrap;"><i class="fas fa-check-circle"></i> Concluída</span>`
                    : `<button class="btn-premium" style="padding:2px 8px; font-size:10px; margin-left:8px; white-space:nowrap;" onclick="window.concluirAtividadePendenteProntuario(${e.id}, '${id}')"><i class="fas fa-check"></i> Concluir</button>`;
            }
            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${e.data_hora || '—'}</td>
                <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${e.acao || ''}${marcadorPendencia}</td>
                <td style="font-size: 11px; color: var(--text-accent);">${e.operador || 'Sistema'}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do servidor pro Prontuário (mantendo o que tinha local):', e);
    }
}

// --------------------------------------------------------------
// Marca uma "Atividade Pendente" (registrada via modal de Intervenção)
// como concluída, direto no Prontuário do equipamento.
// --------------------------------------------------------------
window.concluirAtividadePendenteProntuario = async function(eventoId, equipamentoId) {
    if (!verificarAcesso()) return;
    if (!confirm('Marcar esta atividade pendente como concluída?')) return;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    await registrarHistorico(
        equipamentoId,
        `✅ <span style="color:#22c55e;">[ATIVIDADE CONCLUÍDA]</span> (ref #${eventoId})`
    );

    if (ID_HISTORICO_ATUAL === equipamentoId) {
        atualizarTabelaHistoricoComServidor(equipamentoId);
    }
};

function salvarRegistroManual() {
    if (!verificarAcesso() || !ID_HISTORICO_ATUAL) return;

    const nota = document.getElementById("input-nota-manual").value.trim();
    if (!nota) {
        return alert("Escreva algo para registrar.");
    }

    registrarHistorico(ID_HISTORICO_ATUAL, `<span style="color:var(--text-accent);">[REGISTRO MANUAL]</span> ${nota}`);
    document.getElementById("input-nota-manual").value = "";
    renderizarTabelaHistoricoIndividual(ID_HISTORICO_ATUAL);
    const itemAtual = BANCO_ATIVOS.find(a => a.id === ID_HISTORICO_ATUAL);
    if (itemAtual) renderizarResumoHistoricoIndividual(itemAtual);
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
        if (typeof executarSwapFinal === 'function') {
            executarSwapFinal(MODO_MODAL_RELATORIO.idReserva, MODO_MODAL_RELATORIO.idSacado, MODO_MODAL_RELATORIO.localDestino, textoLaudo);
        } else {
            console.warn("⚠️ executarSwapFinal não está definida — esse fluxo (tipoAcao SWAP) está incompleto.");
        }
    }

    fecharModalRelatorio();
}

async function executarSaqueFinal(id, laudo) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
        let loc = item.local;
        item.local = "Oficina / Reparo";
        item.status = "Oficina / Reparo";
        item.dataReparo = Date.now();
        item.dias = 0;
        item.dataEntradaVeio = null;
        // 🔧 Ver correção "DATA DE ENTRADA não é salva" em
        // salvarPecaNoPython() (banco.js): sem isso, o "data_entrada"
        // (string) antigo ficava esquecido no objeto e voltava a ser
        // reenviado pro banco mesmo a peça já tendo saído do veio.
        item.data_entrada = null;
        item.substituidoPor = null;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        const agora = new Date().toLocaleDateString('pt-BR');
        // 🔧 Ver correção em registrarHistorico() — espera terminar de
        // salvar antes de seguir (evita perder o evento se o técnico
        // trocar de tela rápido demais logo depois do Saque).
        await registrarHistorico(id, `Sacado da linha (${loc}) em ${agora} p/ Reparo. ${laudo}`);

        // Persiste no banco Postgres — sem isso, o saque some assim que a
        // tela sincronizar de novo com o servidor (sincronizarAtivosReaisMCC4
        // reconstrói tudo a partir do banco, que nunca teria recebido a mudança).
        if (typeof salvarPecaNoPython === 'function') {
            await salvarPecaNoPython(item);
        }

        renderAtivos();
        renderPainelVeios();
        calcularKpisGlobais();
        renderReparos();
        renderReservas();
        atualizarPainelCompleto();
    }
}

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
        "Cadeira Inferior": 2500000
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
        else if (familia === "Horizontal") {
            for (let i = 8; i <= 17; i++) selectPos.innerHTML += `<option value="${i}">Horizontal Posição #${i}</option>`;
        } else selectPos.innerHTML = `<option value="GERAL">Geral / Sem posição fixa</option>`;
    } 
    else if (mcc === "2/3") {
        if (familia === "Molde") selectPos.innerHTML = `<option value="MOLDE">Molde (Única posição)</option>`;
        else if (familia === "Segmento Zero") selectPos.innerHTML = `<option value="SEG-ZERO">Segmento Zero (Única)</option>`;
        
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

async function alterarSaldoRolo(id, fator) {
    if (!verificarAcesso()) return;
    let rolo = BANCO_ROLOS.find(r => r.id === id);
    if (rolo) {
        if (rolo.qtd + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
        rolo.qtd += fator;
        localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
        registrarHistorico("ALMOXARIFADO", `Ajuste de estoque do rolo [${rolo.nome}]. Novo saldo: ${rolo.qtd} Pçs.`);
        renderRolos();

        // Persiste no Neon — sem isso, o ajuste sumia assim que a página
        // sincronizasse de novo com o servidor.
        if (typeof salvarAjusteRoloNoPython === 'function') {
            await salvarAjusteRoloNoPython(id, fator);
        }
    }
}

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

async function alterarSaldoHidraulica(id, local, fator) {
    if (!verificarAcesso()) return;
    let peca = BANCO_HIDRAULICA.find(h => h.id === id);
    if (!peca) return;

    const campo = local === 'aplicado' ? 'qtd_aplicado' : 'qtd_reserva';
    const rotulo = local === 'aplicado' ? 'Aplicado na Máquina' : 'Reserva (Oficina)';

    if ((peca[campo] || 0) + fator < 0) { return alert("O saldo em estoque não pode ser negativo."); }
    peca[campo] = (peca[campo] || 0) + fator;
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
    registrarHistorico("ALMOXARIFADO", `Ajuste hidráulico [${peca.nome}] — ${rotulo}. Novo saldo: ${peca[campo]} Pçs.`);
    renderHidraulica();

    // Persiste no Neon — sem isso, o ajuste sumia assim que a página
    // sincronizasse de novo com o servidor.
    if (typeof salvarAjusteHidraulicaNoPython === 'function') {
        await salvarAjusteHidraulicaNoPython(id, local, fator);
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

// ==========================================
// CARREGA O ALMOXARIFADO DO NEON (compartilhado entre todos)
// ==========================================
async function carregarMateriaisDoBackend() {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetchComRetry(`${apiBase}/api/materiais`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        BANCO_MATERIAIS = await resp.json();
        renderMateriais();
    } catch (e) {
        console.error('❌ Não foi possível carregar o almoxarifado do Neon:', e);
    }
}

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
            registrarHistorico("ALMOXARIFADO", `Adição no material [${codigo}]. +${qtd} UN. Saldo atual: ${resultado.material.qtd} UN.`);
            alert(`SUCESSO!\nO código ${codigo} já existe no sistema.\nSomamos a quantidade de ${qtd} UN ao saldo atual.`);
        } else {
            registrarHistorico("ALMOXARIFADO", `Material [${codigo}] cadastrado. Entrada: ${qtd} UN.`);
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
        registrarHistorico("ALMOXARIFADO", `Ajuste manual (${acao}) no material [${codigo}]. Novo saldo: ${resultado.material.qtd} UN.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao ajustar material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
}

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
        registrarHistorico("ALMOXARIFADO", `O material [${codigo}] foi deletado do cadastro.`);
        await carregarMateriaisDoBackend();
    } catch (e) {
        console.error('❌ Erro ao remover material:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
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
        if (typeof registrarHistorico === 'function') {
            registrarHistorico(pecaSacada.id, `🔻 Sacado do Veio ${veioInstalacao} (slot ${posicaoFixa}) — substituído por ${id} no cadastro retroativo.`);
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

    if (typeof registrarHistorico === 'function') {
        const rotuloDesgaste = tonAtual > 0 ? ` (cadastrada já com ${tonAtual.toLocaleString('pt-BR')} de desgaste)` : ' (peça nova, sem uso)';
        const dataFormatada = new Date(dataEntradaMs).toLocaleDateString('pt-BR');
        const rotuloSacada = pecaSacada ? ` — ${pecaSacada.id} foi sacado do slot pra Oficina / Reparo` : '';
        const rotuloLocal = jaInstalada
            ? `📦 Peça cadastrada já Instalada no Veio ${veioInstalacao} (entrada em ${dataFormatada})${rotuloDesgaste}${rotuloSacada}.`
            : `📦 Peça cadastrada no Estoque Reserva${rotuloDesgaste}.`;
        registrarHistorico(id, rotuloLocal);
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

// ==========================================
// PAINEL DO TÉCNICO — visão simplificada e direta ao ponto
// ==========================================
// Pensado pra abrir sozinho no celular do técnico assim que ele loga,
// juntando num só lugar as 3 ações que ele mais faz no dia a dia:
// abrir folhão de equipamento em reparo, sacar/trocar (swap) uma peça
// reserva, e ver os equipamentos críticos — sem precisar navegar pelo
// menu lateral procurando cada coisa em aba separada.
function renderPainelTecnico() {
    const listaCriticos = document.getElementById("tecnico-lista-criticos");
    const listaReservas = document.getElementById("tecnico-lista-reservas");
    if (!listaCriticos || !listaReservas) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;

    // 🆕 Aviso de "sem área" no topo do painel (ADM não é afetado).
    const avisoArea = document.getElementById("tecnico-aviso-sem-area");
    const { isAdm, semArea } = filtrarPorAreaTecnico([]);
    if (avisoArea) avisoArea.classList.toggle("hidden", isAdm || !semArea);

    // 🆕 Atividades (Pendente/Em Andamento, incluindo as programadas
    // pra data futura) da área do técnico.
    if (typeof window.carregarAtividadesPainelTecnico === 'function') window.carregarAtividadesPainelTecnico();

    // 🆕 Todos os equipamentos "no veio" (instalados) da área do
    // técnico — não só os críticos. ADM continua vendo tudo.
    const equipamentosVeioArea = filtrarPorAreaTecnico(
        BANCO_ATIVOS.filter(a => a.local && a.local.includes("Veio") && !a.local.includes("Oficina"))
    ).lista;

    // 🆕 Lista completa por área, ordenada do mais desgastado pro
    // menos — pedido pra o técnico acompanhar tudo da área dele, não
    // só quem já bateu 80%.
    const listaEquipArea = document.getElementById("tecnico-lista-equipamentos-area");
    if (listaEquipArea) {
        if (semArea && !isAdm) {
            listaEquipArea.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        } else if (equipamentosVeioArea.length === 0) {
            listaEquipArea.innerHTML = linhaVazia("Nenhum equipamento da sua área instalado no veio.");
        } else {
            const todosOrdenados = equipamentosVeioArea
                .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct);
            listaEquipArea.innerHTML = `<div class="tecnico-cards-grid">`
                + todosOrdenados.map(a => `
                <div class="tecnico-card-item ${a.pct >= 80 ? 'tecnico-card-critico' : 'tecnico-card-normal'}" onclick="window.abrirHistoricoIndividual('${a.id}')">
                    <div class="tecnico-card-topo">
                        <span class="font-code tecnico-card-id">${a.id}</span>
                        <span class="ind-card-tag bg-tag">${a.tipo}</span>
                    </div>
                    <div class="tecnico-card-pct" style="color:${a.pct >= 80 ? 'var(--danger)' : 'var(--text-heading)'};">${a.pct.toFixed(1)}%</div>
                </div>`).join("")
                + `</div>`;
        }
    }

    // 🔧 CORREÇÃO ("equipamento crítico no painel do técnico MUITO
    // GRANDE"): antes mostrava TODOS os equipamentos ≥80%, sem limite —
    // com muitos críticos ao mesmo tempo, a lista esticava a tela toda.
    // Agora segue o mesmo padrão do Painel Geral (renderizarTopCriticos):
    // mostra só os 5 mais críticos aqui, com um botão pra abrir a lista
    // completa no modal que já existe (abrirCriticos()).
    // 🆕 Também passa pelo mesmo filtro de área usado no resto do
    // sistema — técnico só vê os críticos da própria área; ADM vê tudo.
    const criticosTodos = equipamentosVeioArea
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .filter(a => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct);

    const criticos = criticosTodos.slice(0, 5);

    if (semArea && !isAdm) {
        listaCriticos.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
    } else if (criticos.length === 0) {
        listaCriticos.innerHTML = linhaVazia("Nenhum equipamento crítico no momento. ✅");
    } else {
        listaCriticos.innerHTML = `<div class="tecnico-cards-grid">`
            + criticos.map(a => `
            <div class="tecnico-card-item tecnico-card-critico" onclick="window.abrirHistoricoIndividual('${a.id}')">
                <div class="tecnico-card-topo">
                    <span class="font-code tecnico-card-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="tecnico-card-pct">${a.pct.toFixed(1)}%</div>
            </div>`).join("")
            + `</div>`
            + (criticosTodos.length > 5
                ? `<div class="tecnico-ver-todos" onclick="window.abrirCriticos()">
                        Ver todos os ${criticosTodos.length} críticos <i class="fas fa-arrow-right" style="margin-left:6px;"></i>
                   </div>`
                : '');
    }

    // ---- RESERVAS PRONTAS PRA SWAP ----
    // 🆕 Também filtrado pela área do técnico (ADM continua vendo tudo).
    const reservas = filtrarPorAreaTecnico(
        BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva")
    ).lista;

    if (semArea && !isAdm) {
        listaReservas.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
    } else if (reservas.length === 0) {
        listaReservas.innerHTML = linhaVazia("Nenhuma peça em estoque reserva.");
    } else {
        listaReservas.innerHTML = `<div class="tecnico-cards-grid">`
            + reservas.map(a => `
            <div class="tecnico-card-item tecnico-card-reserva" onclick="window.abrirAba(null,'aba-reservas')">
                <div class="tecnico-card-topo">
                    <span class="font-code tecnico-card-id">${a.id}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <i class="fas fa-check-circle" style="color:#22c55e;"></i>
            </div>`).join("")
            + `</div>`;
    }
}
window.renderPainelTecnico = renderPainelTecnico;

// Atalho "Área" do Painel do Técnico — abre a própria área do técnico
// já direto na sub-aba "Atividades" (sem passar pela grade de cards
// da Central de Áreas primeiro).
window.irParaAreaTecnico = function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;
    if (!isAdm && !area) {
        alert("Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        window.abrirAba(null, 'aba-oficina'); // ADM sem área fixa: manda pra grade de áreas
        return;
    }
    window.abrirAreaOficina(area, 'atividades');
};

// Atalho "Criar Atividade" do Painel do Técnico — abre a própria área
// já na sub-aba Atividades e destrava o formulário de nova atividade
// (o mesmo formulário da Central de Áreas, com campo de Prazo — é ele
// que permite programar uma atividade pra uma data futura: ela fica
// "Pendente" até lá).
window.irCriarAtividadeTecnico = function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;
    if (!isAdm && !area) {
        alert("Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        window.abrirAba(null, 'aba-oficina');
        return;
    }
    window.abrirAreaOficina(area, 'atividades');
    // Pequeno delay pra garantir que o DOM da área já renderizou antes
    // de abrir o formulário (abrirAreaOficina faz fetches assíncronos).
    setTimeout(() => {
        const card = document.getElementById('area-oficina-form-card');
        if (card && card.classList.contains('hidden') && typeof window.alternarFormAtividadeOficina === 'function') {
            window.alternarFormAtividadeOficina();
        }
    }, 350);
};

// 🆕 Lista de atividades (Pendente/Em Andamento) da área do técnico,
// direto no Painel do Técnico — sem precisar entrar na área pra ver o
// que já está rolando ou o que foi programado pra frente.
window.carregarAtividadesPainelTecnico = async function() {
    const container = document.getElementById("tecnico-lista-atividades");
    if (!container) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const area = OPERADOR_LOGADO && OPERADOR_LOGADO.area;

    if (!isAdm && !area) {
        container.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }
    if (!area) {
        container.innerHTML = linhaVazia("Você é ADM sem área fixa — abra a Central de Áreas pra ver atividades.");
        return;
    }

    container.innerHTML = linhaVazia("Carregando...");
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades?area=${encodeURIComponent(area)}`, { cache: 'no-store' });
        const atividades = resp.ok ? await resp.json() : [];

        // 🆕 Agora as futuras (data_inicio no futuro) continuam
        // aparecendo na lista — só que sinalizadas com um selo
        // "PROGRAMADA", em vez de sumirem sem explicação. Ficam por
        // último, depois das que já podem ser feitas.
        const abertas = atividades
            .filter(a => a.status !== 'Concluído')
            .sort((a, b) => {
                const aFutura = atividadeAindaNaoComecou(a) ? 1 : 0;
                const bFutura = atividadeAindaNaoComecou(b) ? 1 : 0;
                if (aFutura !== bFutura) return aFutura - bFutura;
                return (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1);
            });

        if (abertas.length === 0) {
            container.innerHTML = linhaVazia("Nenhuma atividade pendente ou em andamento. ✅");
            return;
        }

        const corStatus = { 'Pendente': 'var(--warning)', 'Em Andamento': 'var(--info)' };
        container.innerHTML = abertas.map(x => {
            const prazoFormatado = x.prazo ? x.prazo.split('-').reverse().join('/') : null;
            const inicioFormatado = x.data_inicio ? x.data_inicio.split('-').reverse().join('/') : null;
            const futura = atividadeAindaNaoComecou(x);
            const atrasada = !futura && typeof atividadeEstaAtrasada === 'function' && atividadeEstaAtrasada(x);
            return `
                <div class="tecnico-item-linha" onclick="window.irParaAreaTecnico()" style="${futura ? 'opacity:0.8;' : ''}">
                    <div>
                        ${x.equipamento_id ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span> · ` : ''}
                        <span style="font-size:13px; color:var(--text-body);">${x.descricao}</span>
                        ${futura ? `<span style="font-size:10px; background:var(--text-accent, #3b82f6); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">PROGRAMADA</span>` : ''}
                        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                            ${futura
                                ? `<span style="color:var(--text-accent, #3b82f6); font-weight:700;">Começa ${inicioFormatado}</span>`
                                : `<span style="color:${corStatus[x.status] || 'var(--text-muted)'}; font-weight:700;">${x.status}</span>`}
                            ${x.responsavel ? ` · <i class="fas fa-user"></i> ${x.responsavel}` : ' · <span style="font-style:italic;">Sem responsável</span>'}
                            ${prazoFormatado ? ` · Prazo: <span style="color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${atrasada ? '700' : '400'};">${prazoFormatado}</span>` : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar atividades do painel técnico:', e);
        container.innerHTML = linhaVazia("Não foi possível carregar as atividades agora.");
    }
};

// ==========================================
// ABA REPARO — abas "Iniciar Reparo" x "Reparo em Andamento"
// ==========================================
window.trocarAbaReparo = function(evento, idAlvo) {
    const abas = ["reparo-sub-iniciar", "reparo-sub-andamento"];
    abas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === idAlvo) ? "block" : "none";
    });
    if (evento && evento.currentTarget) {
        const container = evento.currentTarget.closest(".folhao-tabs");
        if (container) container.querySelectorAll(".folhao-tab").forEach(btn => btn.classList.remove("active"));
        evento.currentTarget.classList.add("active");
    } else {
        const container = document.querySelector('#aba-reparos .folhao-tabs');
        if (container) {
            container.querySelectorAll(".folhao-tab").forEach(btn => btn.classList.remove("active"));
            const idx = abas.indexOf(idAlvo);
            const btns = container.querySelectorAll(".folhao-tab");
            if (btns[idx]) btns[idx].classList.add("active");
        }
    }
    if (idAlvo === "reparo-sub-andamento" && typeof window.carregarReparosAndamento === "function") {
        window.carregarReparosAndamento();
    }
};

// Navega direto pra aba de Reparo, já abrindo a sub-aba certa
// ("iniciar" ou "andamento") — usado pelos atalhos do Painel do Técnico.
window.abrirAbaReparo = function(subaba) {
    window.abrirAba(null, "aba-reparos");
    const idAlvo = subaba === "andamento" ? "reparo-sub-andamento" : "reparo-sub-iniciar";
    window.trocarAbaReparo(null, idAlvo);
};

// ==========================================
// "EM ANDAMENTO": folhões com rascunho salvo na nuvem (equipamento com
// progresso salvo em folhoes_rascunho, ver /api/folhao/rascunhos/todos
// no back-end), filtrado pela área do técnico igual à lista "Iniciar
// Novo". Qualquer técnico da mesma área (ou ADM) pode continuar de
// onde outro parou — o rascunho é salvo por equipamento, não por
// pessoa, então não existe "travar pra um só técnico".
// ==========================================
window.carregarReparosAndamento = async function() {
    const listaAndamento = document.getElementById("reparos-lista-andamento");
    if (!listaAndamento) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;
    listaAndamento.innerHTML = linhaVazia("Carregando...");

    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const areaTecnico = OPERADOR_LOGADO && OPERADOR_LOGADO.area;

    if (!isAdm && !areaTecnico) {
        listaAndamento.innerHTML = linhaVazia("⚠️ Sua área ainda não foi cadastrada. Fale com um ADM.");
        return;
    }

    try {
        const apiBase = await resolverApiBase();
        // 🆕 Busca as duas fontes de "reparo iniciado" em paralelo:
        // rascunho de Folhão (folhoes_rascunho) E execução de Checklist
        // (checklist_execucao_execucoes) — um técnico pode ter começado
        // só por um dos dois lados, e os dois contam como "em andamento".
        const [respRascunhos, respExecucoes] = await Promise.all([
            fetch(`${apiBase}/api/folhao/rascunhos/todos`),
            fetch(`${apiBase}/api/checklist-execucao/execucoes/todas`)
        ]);
        if (!respRascunhos.ok) throw new Error("Falha ao buscar rascunhos.");
        const rascunhos = await respRascunhos.json();
        const execucoes = respExecucoes.ok ? await respExecucoes.json() : [];

        // Reaproveita esses fetches pra manter RASCUNHOS_IDS_ATIVOS e
        // EXECUCOES_CHECKLIST_IDS_ATIVAS em dia (usados por renderReparos()
        // na sub-aba "Iniciar Reparo").
        RASCUNHOS_IDS_ATIVOS = new Set(rascunhos.map(r => r.equipamento_id));
        window.EXECUCOES_CHECKLIST_IDS_ATIVAS = new Set(execucoes.map(e => e.equipamento_id));
        if (typeof renderReparos === 'function') renderReparos();

        // Junta as duas listas por equipamento_id — um mesmo equipamento
        // pode ter as duas coisas (rascunho E execução); nesse caso, só
        // guarda uma entrada só, preferindo a data mais recente pra
        // exibir em "Atualizado".
        const porEquipamento = new Map();
        rascunhos.forEach(r => porEquipamento.set(r.equipamento_id, { rascunho: r, execucao: null }));
        execucoes.forEach(e => {
            const atual = porEquipamento.get(e.equipamento_id) || { rascunho: null, execucao: null };
            atual.execucao = e;
            porEquipamento.set(e.equipamento_id, atual);
        });

        // Cruza cada equipamento_id com o cadastro (BANCO_ATIVOS) pra
        // saber o tipo dele e poder aplicar o filtro de área.
        const equipamentosEmAndamento = [...porEquipamento.keys()]
            .map(id => BANCO_ATIVOS.find(a => a.id === id))
            .filter(Boolean);
        const { lista: equipamentosFiltrados } = filtrarPorAreaTecnico(equipamentosEmAndamento);
        const idsPermitidos = new Set(equipamentosFiltrados.map(e => e.id));

        let itens = [...porEquipamento.entries()]
            .map(([id, dados]) => {
                const equipamento = BANCO_ATIVOS.find(a => a.id === id);
                return equipamento ? { ...dados, equipamento } : null;
            })
            .filter(Boolean)
            .filter(x => idsPermitidos.has(x.equipamento.id));

        if (itens.length === 0) {
            listaAndamento.innerHTML = linhaVazia("Nenhum reparo em andamento no momento.");
            return;
        }

        // 🆕 Agrupa por MCC → Tipo, igual a sub-aba "Iniciar Reparo"
        // (renderReparos). O técnico já só vê a área dele aqui — quem
        // sente falta do agrupamento é o ADM, que vê tudo junto e sem
        // essa separação a lista fica uma bagunça de máquinas diferentes
        // misturadas.
        const coresMCC = { "2": "#3b82f6", "3": "#8b5cf6", "4": "#ec4899" };
        const grupos = {};
        itens.forEach(item => {
            const mcc = item.equipamento.mcc_compat || "2/3";
            if (!grupos[mcc]) grupos[mcc] = [];
            grupos[mcc].push(item);
        });

        const linhaItem = ({ rascunho, execucao, equipamento }) => {
            const dataRef = rascunho?.atualizado_em || execucao?.iniciada_em;
            const atualizado = dataRef ? new Date(dataRef).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
            return `
                <div class="tecnico-item-linha" style="flex-direction:column; align-items:stretch; gap:10px; cursor:default; margin-left:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="font-code" style="font-weight:700; color:var(--text-heading);">${equipamento.id}</span>
                            <span class="ind-card-tag bg-tag" style="margin-left:6px;">${equipamento.tipo}</span>
                        </div>
                        <span style="color:var(--text-accent); font-weight:600; font-size:11px;">Atualizado ${atualizado}</span>
                    </div>
                    <div class="flex-align-center gap-10" style="flex-wrap:wrap;">
                        <button class="btn-premium btn-warning" onclick="window.abrirFolhaoPorTipo('${equipamento.id}')"><i class="fas fa-file-alt"></i> Folhão</button>
                        ${window.renderizarBotaoChecklistExecucao(equipamento.id)}
                        ${window.renderizarBotaoConcluirReparo(equipamento.id)}
                    </div>
                </div>`;
        };

        listaAndamento.innerHTML = Object.keys(grupos).sort().map(mcc => {
            const porTipo = {};
            grupos[mcc].forEach(item => {
                const tipo = item.equipamento.tipo || "Outros";
                if (!porTipo[tipo]) porTipo[tipo] = [];
                porTipo[tipo].push(item);
            });

            const blocoTipos = Object.keys(porTipo).sort().map(tipo => `
                <div style="font-weight:600; color:var(--text-muted); font-size:13px; margin:10px 0 8px 6px;">
                    <i class="fas fa-tag"></i> ${tipo}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${porTipo[tipo].map(linhaItem).join("")}
                </div>
            `).join("");

            return `
                <div style="margin-bottom:18px;">
                    <div style="padding:10px 12px; font-weight:700; color:var(--text-heading); font-size:15px; background:${coresMCC[mcc] || '#f59e0b'}20; border-top:3px solid ${coresMCC[mcc] || '#f59e0b'}; border-radius:6px 6px 0 0;">
                        <i class="fas fa-server"></i> MCC ${mcc}
                    </div>
                    ${blocoTipos}
                </div>
            `;
        }).join("");

        // 🆕 Igual acontece na sub-aba "Iniciar Reparo": busca em segundo
        // plano o % do Checklist de Execução e se o Folhão já foi salvo,
        // pra cada equipamento aqui listado, e redesenha quando chegar.
        window.carregarStatusChecklistExecucaoReparo(itens.map(x => x.equipamento.id));
    } catch (e) {
        console.error("Erro ao carregar folhões em andamento:", e);
        listaAndamento.innerHTML = linhaVazia("❌ Não foi possível carregar. Verifique sua conexão.");
    }
};

// ==========================================
// 🔧 CORREÇÃO CRÍTICA: abrirCriticos() chamava abrirAba(null, 'aba-ativos'),
// mas esse HTML NUNCA teve uma aba com id="aba-ativos" — a "Matriz
// Operacional Geral" ficou de fora quando o app.html foi remontado.
// Por isso o botão "Críticos" (no Painel Geral e no Painel do Técnico)
// não levava a lugar nenhum: o clique disparava, mas não existia
// destino pra navegar. Agora ele abre um modal com a lista de
// equipamentos críticos de verdade, sem depender de nenhuma aba.
// ==========================================
function abrirCriticos() {
    const criticos = BANCO_ATIVOS
        .filter(a => a.local && a.local.includes("Veio") && !a.local.includes("Oficina"))
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .filter(a => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct);

    const lista = document.getElementById("modal-criticos-lista");
    if (lista) {
        lista.innerHTML = criticos.length === 0
            ? `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum equipamento crítico no momento. ✅</div>`
            : criticos.map(a => `
                <div class="tecnico-item-linha" onclick="window.fecharModalCriticos(); window.abrirHistoricoIndividual('${a.id}')">
                    <div>
                        <span class="font-code" style="font-weight:700; color:var(--text-heading);">${a.id}</span>
                        <span class="ind-card-tag bg-tag" style="margin-left:6px;">${a.tipo}</span>
                        <div class="text-muted" style="font-size:11px; margin-top:2px;">${a.local || ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:var(--danger); font-weight:700; font-size:14px;">${a.pct.toFixed(1)}%</span>
                        <i class="fas fa-chevron-right" style="margin-left:8px; color:var(--text-muted);"></i>
                    </div>
                </div>`).join("");
    }

    const modal = document.getElementById("modal-criticos");
    if (modal) modal.classList.remove("hidden");
}
window.fecharModalCriticos = function() {
    const modal = document.getElementById("modal-criticos");
    if (modal) modal.classList.add("hidden");
};

// ==========================================
// REGISTRAR INTERVENÇÃO RÁPIDA (sem precisar abrir o Folhão completo)
// ==========================================

// Guarda a foto escolhida (em base64) entre o momento que o técnico
// tira/anexa e o momento que ele aperta "Salvar".
let FOTO_INTERVENCAO_BASE64 = null;

window.abrirModalIntervencao = function() {
    if (!verificarAcesso()) return;
    const select = document.getElementById("intervencao-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    const textoEl = document.getElementById("intervencao-texto");
    if (textoEl) textoEl.value = "";
    const categoriaEl = document.getElementById("intervencao-categoria");
    if (categoriaEl) categoriaEl.value = "Intervenção";
    window.removerFotoIntervencao(); // limpa qualquer foto de uma abertura anterior
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.remove("hidden");
};

window.fecharModalIntervencao = function() {
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.add("hidden");
};

// --------------------------------------------------------------
// Lê o arquivo escolhido (câmera ou galeria), comprime pra não pesar
// no banco/rede, e mostra o preview.
// --------------------------------------------------------------
window.processarFotoIntervencao = function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        alert('Por favor, escolha um arquivo de imagem.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const MAX_LADO = 1280;
            let largura = img.width;
            let altura = img.height;

            if (largura > altura && largura > MAX_LADO) {
                altura = Math.round((altura * MAX_LADO) / largura);
                largura = MAX_LADO;
            } else if (altura > MAX_LADO) {
                largura = Math.round((largura * MAX_LADO) / altura);
                altura = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, largura, altura);

            FOTO_INTERVENCAO_BASE64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('intervencao-foto-preview');
            const container = document.getElementById('intervencao-foto-preview-container');
            if (preview) preview.src = FOTO_INTERVENCAO_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoIntervencao = function() {
    FOTO_INTERVENCAO_BASE64 = null;
    const preview = document.getElementById('intervencao-foto-preview');
    const container = document.getElementById('intervencao-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

// --------------------------------------------------------------
// Salva o registro (categoria + texto + foto opcional) direto no
// backend, já no formato que aparece no Prontuário do equipamento.
// --------------------------------------------------------------
window.confirmarIntervencao = async function() {
    const equipamentoId = document.getElementById("intervencao-equipamento")?.value;
    const texto = document.getElementById("intervencao-texto")?.value.trim();
    const categoria = document.getElementById("intervencao-categoria")?.value || "Intervenção";

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (!texto) return alert("Descreva o que foi feito.");

    const iconePorCategoria = {
        "Intervenção": "🔧",
        "Melhoria": "✨",
        "Comentário": "💬",
        "Atividade Pendente": "⏳"
    };
    const icone = iconePorCategoria[categoria] || "🔧";
    const acaoFormatada = `${icone} <span style="color:#eab308;">[${categoria.toUpperCase()}]</span> ${texto}`;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/registro_com_foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                acao: acaoFormatada,
                operador: operador,
                categoria: categoria,
                foto_base64: FOTO_INTERVENCAO_BASE64 || null
            })
        });

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível salvar o registro.");
            return;
        }

        if (typeof registrarHistorico === 'function') {
            const evento = {
                data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR'),
                tag: equipamentoId,
                acao: acaoFormatada,
                responsavel: operador
            };
            HISTORICO_ACOES.unshift(evento);
            localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
            if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();
        }

        window.fecharModalIntervencao();
        alert(`✅ ${categoria} registrada em [${equipamentoId}]${FOTO_INTERVENCAO_BASE64 ? ' com foto' : ''}.`);
    } catch (e) {
        console.error('⚠️ Erro ao salvar registro com foto:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// --------------------------------------------------------------
// 🔧 CORREÇÃO ("fotos anexadas não abrem, e não tem como saber quem
// anexou"): as fotos são guardadas como data URL (base64), e o clique
// nelas fazia window.open(dataUrl, '_blank'). A maioria dos navegadores
// modernos (Chrome/Safari no celular principalmente) BLOQUEIA abrir uma
// data: URL direto numa aba nova por segurança — o clique simplesmente
// não fazia nada, sem erro nenhum visível. Além disso, quem tirou a
// foto só aparecia no atributo "title" (tooltip) — que não existe no
// toque do celular, só no hover do mouse no desktop.
//
// Esta função abre um lightbox (modal simples, criado na hora) com a
// foto em tamanho grande e a legenda (data/operador) sempre visível
// como texto, funcionando igual em desktop e celular.
// --------------------------------------------------------------
window.abrirFotoAmpliada = function(fotoBase64, legenda) {
    let overlay = document.getElementById('lightbox-foto-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-foto-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10100';
        overlay.innerHTML = `
            <div style="max-width:95vw; max-height:92vh; display:flex; flex-direction:column; align-items:center; gap:10px;" onclick="event.stopPropagation()">
                <img id="lightbox-foto-img" src="" style="max-width:95vw; max-height:80vh; border-radius:10px; object-fit:contain; box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                <div id="lightbox-foto-legenda" style="color:#fff; font-size:13px; text-align:center; background:rgba(0,0,0,0.55); padding:6px 14px; border-radius:20px;"></div>
                <button class="btn-premium" style="padding:6px 16px;" onclick="window.fecharFotoAmpliada()"><i class="fas fa-times"></i> Fechar</button>
            </div>
        `;
        overlay.addEventListener('click', window.fecharFotoAmpliada ? window.fecharFotoAmpliada : () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }
    document.getElementById('lightbox-foto-img').src = fotoBase64;
    document.getElementById('lightbox-foto-legenda').innerText = legenda || '';
    overlay.classList.remove('hidden');
};

window.fecharFotoAmpliada = function() {
    const overlay = document.getElementById('lightbox-foto-overlay');
    if (overlay) overlay.classList.add('hidden');
};

// --------------------------------------------------------------
// Busca as fotos do equipamento e monta a mini-galeria no Prontuário.
// --------------------------------------------------------------
async function carregarFotosNoProntuario(id) {
    const container = document.getElementById("hist-galeria-fotos");
    if (!container) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/fotos/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!resp.ok) { container.innerHTML = ''; return; }
        const fotos = await resp.json();

        if (!Array.isArray(fotos) || fotos.length === 0) {
            container.innerHTML = '';
            return;
        }

        // 🔧 CORREÇÃO ("a foto não fala qual comentário ela pertence"):
        // a API /api/fotos/{id} já manda o texto do comentário/registro
        // (campo "acao", ex: "teste 2") junto de cada foto — mas essa
        // função nunca usava esse campo, só mostrava data e operador.
        // Agora cada foto ganha uma legenda com o texto do registro
        // logo abaixo da miniatura (sem precisar clicar pra ver), e o
        // texto completo também aparece na foto ampliada.
        //
        // "acao" pode vir com tags HTML (ex: '<span style="...">[CATEGORIA]</span>
        // texto'), usadas pra colorir a categoria no Prontuário — remove
        // essas tags aqui porque o atributo "title" e o rodapé da miniatura
        // não interpretam HTML (apareceria a tag escrita, igual o bug
        // corrigido antes nas notificações push).
        const textoSemHtml = (texto) => String(texto || '').replace(/<[^>]+>/g, '').trim();

        container.innerHTML = `
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
                <i class="fas fa-images"></i> Fotos anexadas (${fotos.length})
            </div>
            <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:8px;">
                ${fotos.map(f => {
                    const legendaCompleta = `${textoSemHtml(f.acao) || 'Sem descrição'} — ${f.operador || 'Sistema'} — ${f.data_hora || ''}`;
                    const legendaCurta = textoSemHtml(f.acao) || 'Sem descrição';
                    return `
                    <div style="flex-shrink:0; width:90px;">
                        <img src="${f.foto_base64}"
                             style="width:90px; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; display:block;"
                             onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${legendaCompleta.replace(/'/g, "\\'")}')"
                             title="${legendaCompleta}">
                        <div class="text-muted" style="font-size:10px; margin-top:3px; line-height:1.3; max-height:2.6em; overflow:hidden; text-overflow:ellipsis;" title="${legendaCompleta}">${legendaCurta}</div>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos do Prontuário:', e);
        container.innerHTML = '';
    }
}

// ==========================================
// RELATÓRIO DIÁRIO DO TÉCNICO (o que foi feito no turno)
// ==========================================
window.abrirModalRelatorioDiario = function() {
    if (!verificarAcesso()) return;
    const textoEl = document.getElementById("relatorio-diario-texto");
    if (textoEl) textoEl.value = "";
    const modal = document.getElementById("modal-relatorio-diario");
    if (modal) modal.classList.remove("hidden");
};
window.fecharModalRelatorioDiario = function() {
    const modal = document.getElementById("modal-relatorio-diario");
    if (modal) modal.classList.add("hidden");
};
window.confirmarRelatorioDiario = function() {
    const texto = document.getElementById("relatorio-diario-texto")?.value.trim();
    if (!texto) return alert("Escreva o que você fez hoje antes de enviar.");

    const hoje = new Date().toLocaleDateString('pt-BR');
    // Usa o próprio operador como "tag" — assim cada relatório fica
    // agrupado por quem o escreveu na Auditoria (aba-historico), e dá
    // pra filtrar por data ali também.
    const nomeOperador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico").replace(/\s*\[.+?\]/, "") : "Técnico";
    registrarHistorico("RELATÓRIO DIÁRIO", `📋 <strong>${nomeOperador}</strong> (${hoje}): ${texto}`);
    window.fecharModalRelatorioDiario();
    alert("✅ Relatório diário enviado com sucesso!");
};

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
    // 🔧 Cada pedaço do Painel Geral roda isolado — se um card específico
    // falhar, os outros continuam aparecendo normalmente.
    if (typeof calcularKpisGlobais === 'function') {
        executarSeguro(() => calcularKpisGlobais(), 'calcularKpisGlobais (painel)');
    }
    executarSeguro(() => atualizarNovosKPIs(), 'atualizarNovosKPIs');
    executarSeguro(() => atualizarKPIsAvancados(), 'atualizarKPIsAvancados');
    executarSeguro(() => renderizarTopCriticos(), 'renderizarTopCriticos');
    executarSeguro(() => renderizarFeedAtividadeRecente(), 'renderizarFeedAtividadeRecente');
}

// ==========================================
// 🔧 "Registro Recente" (antes "Atividade Recente" no Painel Geral,
// visível pra todo mundo) — a pedido do usuário, virou aba própria
// dentro da Área Restrita (só as 2 matrículas admin), sem o limite de
// 6 itens do widget antigo, e buscando a lista oficial do servidor —
// mesmo princípio já usado na Auditoria (atualizarHistoricoGlobalComServidor):
// o localStorage só reflete o que aconteceu NESTE aparelho, então
// buscar do servidor garante ver o que outros técnicos fizeram em
// outros aparelhos também.
//
// renderizarFeedAtividadeRecente() é mantida como um "atalho" (chamada
// em vários pontos do código toda vez que uma ação é registrada) — ela
// só repassa pra renderRegistroRecenteCompleto() se a aba nova estiver
// aberta na hora, pra manter a lista atualizada em tempo real sem
// precisar reabrir a aba.
// ==========================================
function renderizarFeedAtividadeRecente() {
    const abaAtiva = document.getElementById('aba-registro-recente');
    if (abaAtiva && abaAtiva.classList.contains('active') && typeof window.renderRegistroRecenteCompleto === 'function') {
        window.renderRegistroRecenteCompleto();
    }
}

window.renderRegistroRecenteCompleto = async function() {
    const lista = document.getElementById('registro-recente-lista');
    if (!lista) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    if (!MATRICULAS_TESTE_FOLHOES.includes(matricula)) {
        lista.innerHTML = `<li class="text-muted" style="text-align:center; padding: 10px 0;">Acesso restrito.</li>`;
        return;
    }

    const montarItens = (itens) => {
        if (itens.length === 0) {
            return `<li class="text-muted" style="text-align:center; padding: 10px 0;">Nenhuma atividade registrada ainda.</li>`;
        }
        return itens.map(h => {
            const tagUpper = (h.tag || '').toUpperCase();
            let classe = '';
            if (tagUpper.includes('EXCLU') || tagUpper.includes('ALERTA') || tagUpper.includes('CRÍTIC')) {
                classe = 'alert';
            } else if (tagUpper.includes('CONCLU') || tagUpper.includes('AUTENTIC') || tagUpper.includes('SUCESSO')) {
                classe = 'success';
            }
            return `
                <li class="${classe}">
                    <span class="timeline-time">${h.data || '--'}</span>
                    <strong>${h.tag || 'Sistema'}:</strong> ${h.acao || ''}
                    ${h.responsavel ? `<br><small class="text-muted">${h.responsavel}</small>` : ''}
                </li>
            `;
        }).join('');
    };

    // 🔧 CORREÇÃO ("fica mudando sozinho, mesma aba, sem eu mexer"):
    // antes mostrava o HISTORICO_ACOES local (formato de data dd/mm/aaaa)
    // e, pouco depois, TROCAVA pela lista do servidor (formato
    // aaaa-mm-dd) — dois formatos e duas ordens diferentes brigando na
    // tela. Pior: essa função é chamada de novo toda vez que QUALQUER
    // evento acontece no app inteiro (renderizarFeedAtividadeRecente),
    // não só quando esta aba está em uso — então a lista "piscava"
    // sozinha em segundo plano. Agora só renderiza uma vez, direto do
    // servidor (fonte única de verdade); local só entra como fallback
    // se a busca falhar de verdade (sem internet).
    lista.innerHTML = `<li class="text-muted" style="text-align:center; padding: 10px 0;">Carregando...</li>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?limite=50`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Resposta não-ok do servidor');
        const eventos = await resp.json();
        if (!Array.isArray(eventos)) throw new Error('Formato inesperado');

        const itensServidor = eventos.map(e => ({
            data: e.data_hora || '',
            tag: e.peca_id || 'AUTENTICAÇÃO',
            acao: e.acao || '',
            responsavel: e.operador || 'Sistema'
        }));
        lista.innerHTML = montarItens(itensServidor);
    } catch (e) {
        console.error('⚠️ Não consegui buscar o Registro Recente completo do servidor — usando o que tinha local:', e);
        lista.innerHTML = montarItens((HISTORICO_ACOES || []).slice(0, 50));
    }
};

// ==========================================
// 🆕 ADMINISTRAÇÃO DE COLABORADORES (Área Restrita) — gerenciar acesso
// (ativar/desativar), resetar senha e trocar cargo pelo app, sem
// precisar rodar script no terminal (resetar_colaboradores.py,
// restringir_acesso.py, reativartodos.py continuam existindo, mas
// agora tem alternativa mais rápida pra ação pontual em 1 pessoa).
// ==========================================
let ADMIN_COLABORADORES_CACHE = [];

window.carregarAdminColaboradores = async function() {
    console.log('🔎 [DIAGNÓSTICO] carregarAdminColaboradores() foi chamada.');
    const tbody = document.getElementById('admin-colaboradores-table-body');
    if (!tbody) { console.log('🔎 [DIAGNÓSTICO] tbody NÃO encontrado no HTML — abortando.'); return; }

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    console.log('🔎 [DIAGNÓSTICO] matrícula logada:', matricula, '| autorizada?', MATRICULAS_TESTE_FOLHOES.includes(matricula));
    if (!MATRICULAS_TESTE_FOLHOES.includes(matricula)) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Acesso restrito.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;

    try {
        const apiBase = await resolverApiBase();
        console.log('🔎 [DIAGNÓSTICO] apiBase resolvida:', apiBase);
        const resp = await fetch(`${apiBase}/api/colaboradores/todos`, { cache: 'no-store' });
        console.log('🔎 [DIAGNÓSTICO] status da resposta:', resp.status, resp.ok);
        ADMIN_COLABORADORES_CACHE = resp.ok ? await resp.json() : [];
        console.log('🔎 [DIAGNÓSTICO] colaboradores recebidos:', ADMIN_COLABORADORES_CACHE.length);
    } catch (e) {
        console.error('🔎 [DIAGNÓSTICO] ERRO ao carregar a lista de colaboradores:', e);
        ADMIN_COLABORADORES_CACHE = [];
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Não foi possível carregar. Verifique sua internet.</td></tr>`;
        return;
    }

    window.filtrarAdminColaboradores();
};

window.filtrarAdminColaboradores = function() {
    const tbody = document.getElementById('admin-colaboradores-table-body');
    if (!tbody) return;

    const termo = (document.getElementById('admin-colab-busca')?.value || '').toLowerCase().trim();
    let lista = ADMIN_COLABORADORES_CACHE;
    if (termo) {
        lista = lista.filter(c =>
            (c.matricula || '').toLowerCase().includes(termo) ||
            (c.nome || '').toLowerCase().includes(termo) ||
            (c.cargo || '').toLowerCase().includes(termo)
        );
    }

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum colaborador encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr style="${!c.ativo ? 'opacity:0.5;' : ''}">
            <td class="font-code">${c.matricula}</td>
            <td>${c.nome}</td>
            <td>${c.cargo || '-'}</td>
            <td>
                ${c.ativo
                    ? '<span style="color:var(--success); font-weight:700;">🟢 Ativo</span>'
                    : '<span style="color:var(--danger); font-weight:700;">🔴 Inativo</span>'}
                ${c.primeiro_acesso ? '<br><small class="text-muted">Primeiro acesso pendente</small>' : ''}
            </td>
            <td style="white-space:nowrap;">
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarCargoColaborador('${c.matricula}', '${(c.cargo || '').replace(/'/g, "\\'")}')" title="Trocar cargo">
                    <i class="fas fa-id-badge"></i>
                </button>
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.resetarSenhaColaborador('${c.matricula}', '${c.nome.replace(/'/g, "\\'")}')" title="Resetar senha">
                    <i class="fas fa-key"></i>
                </button>
                <button class="${c.ativo ? 'btn-outline-danger' : 'btn-premium btn-success'}" style="padding:4px 10px; font-size:11px;" onclick="window.alternarAtivoColaborador('${c.matricula}', ${!c.ativo}, '${c.nome.replace(/'/g, "\\'")}')" title="${c.ativo ? 'Desativar acesso' : 'Reativar acesso'}">
                    <i class="fas ${c.ativo ? 'fa-user-slash' : 'fa-user-check'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.mudarCargoColaborador = async function(matricula, cargoAtual) {
    if (!verificarAcesso()) return;
    const novoCargo = prompt(`Novo cargo para ${matricula}:`, cargoAtual || '');
    if (novoCargo === null) return; // cancelou
    if (!novoCargo.trim()) return alert('O cargo não pode ficar vazio.');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/mudar_cargo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, cargo: novoCargo.trim() })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível trocar o cargo.');
            return;
        }
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao trocar cargo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.resetarSenhaColaborador = async function(matricula, nome) {
    if (!verificarAcesso()) return;
    if (!confirm(`Resetar a senha de ${nome} (${matricula})?\n\nA senha temporária dela volta a ser a própria matrícula, e ela vai precisar criar uma senha nova no próximo login.`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/resetar_senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível resetar a senha.');
            return;
        }
        alert(`✅ Senha de ${nome} resetada.`);
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao resetar senha:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.alternarAtivoColaborador = async function(matricula, novoAtivo, nome) {
    if (!verificarAcesso()) return;
    const acao = novoAtivo ? 'reativar o acesso de' : 'desativar o acesso de';
    if (!confirm(`Tem certeza que quer ${acao} ${nome} (${matricula})?`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/alternar_ativo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, ativo: novoAtivo })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível atualizar o acesso.');
            return;
        }
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar acesso:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// ==========================================
// OFICINA — CATÁLOGO GERAL DE MATERIAIS (todas as áreas juntas)
// ==========================================
let CATALOGO_MATERIAIS_OFICINA_CACHE = [];

async function carregarCatalogoMateriaisOficina() {
    const container = document.getElementById('catalogo-materiais-oficina-lista');
    if (!container) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais_todos`, { cache: 'no-store' });
        CATALOGO_MATERIAIS_OFICINA_CACHE = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Não consegui carregar o catálogo de materiais:', e);
        CATALOGO_MATERIAIS_OFICINA_CACHE = [];
    }
    window.renderCatalogoMateriaisOficina();
}

window.renderCatalogoMateriaisOficina = function() {
    const container = document.getElementById('catalogo-materiais-oficina-lista');
    if (!container) return;

    const busca = (document.getElementById('busca-material-oficina')?.value || '').toLowerCase().trim();

    let itens = CATALOGO_MATERIAIS_OFICINA_CACHE;
    if (busca) {
        itens = itens.filter(m => {
            const info = AREAS_OFICINA.find(a => a.chave === m.area);
            const nomeArea = info ? info.nome.toLowerCase() : m.area.toLowerCase();
            return (m.codigo || '').toLowerCase().includes(busca)
                || (m.descricao || '').toLowerCase().includes(busca)
                || nomeArea.includes(busca);
        });
    }

    if (itens.length === 0) {
        container.innerHTML = `<div class="text-muted" style="font-size:12px; padding:12px 0;">Nenhum material encontrado.</div>`;
        return;
    }

    container.innerHTML = itens.map(m => {
        const info = AREAS_OFICINA.find(a => a.chave === m.area);
        const nomeArea = info ? info.nome : m.area;
        const corArea = info ? info.cor : 'var(--text-muted)';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 4px; border-bottom:1px solid var(--border-color);">
                <div style="min-width:0; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading); font-size:12px;">${m.codigo}</span>
                    <span style="font-size:12.5px; color:var(--text-body);">${m.descricao}</span>
                </div>
                <span style="flex-shrink:0; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; color:${corArea}; background:color-mix(in srgb, ${corArea} 16%, transparent);">${nomeArea}</span>
            </div>
        `;
    }).join('');
};

// ==========================================
// CENTRAL DE ÁREAS — Grid único (Oficina + Administrativo)
// ==========================================
// Calcula o status operacional de uma área de Oficina a partir das
// atividades em aberto (não existe sensor real — é a melhor proxy que
// temos hoje a partir do que já é lançado no sistema).
//   🔴 Crítico   -> tem atividade atrasada
//   🟠 Restrição -> 5+ atividades pendentes/andamento (fila grande)
//   🟡 Atenção   -> 1 a 4 pendentes/andamento
//   🟢 Normal    -> tudo concluído / nada pendente
function calcularStatusArea(chave) {
    const doArea = OFICINA_ATIVIDADES_CACHE.filter(x => x.area === chave);
    const pendentes = doArea.filter(x => x.status === 'Pendente').length;
    const andamento = doArea.filter(x => x.status === 'Em Andamento').length;
    const atrasadas = doArea.filter(x => atividadeEstaAtrasada(x)).length;
    const emAberto = pendentes + andamento;

    let status;
    if (atrasadas > 0) status = { emoji: '🔴', label: 'Crítico', cor: 'var(--danger)' };
    else if (emAberto >= 5) status = { emoji: '🟠', label: 'Restrição', cor: 'var(--limit)' };
    else if (emAberto >= 1) status = { emoji: '🟡', label: 'Atenção', cor: 'var(--warning)' };
    else status = { emoji: '🟢', label: 'Normal', cor: 'var(--success)' };

    return { ...status, pendentes, andamento, atrasadas, emAberto };
}

let CENTRAL_AREAS_FILTRO_STATUS = '';
let CENTRAL_AREAS_BUSCA = '';

window.filtrarCentralAreas = function(statusLabel, botao) {
    CENTRAL_AREAS_FILTRO_STATUS = statusLabel;
    document.querySelectorAll('#central-areas-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botao) botao.classList.add('active');
    renderizarGridCentralAreas();
};

window.buscarCentralAreas = function(valor) {
    CENTRAL_AREAS_BUSCA = (valor || '').toLowerCase().trim();
    renderizarGridCentralAreas();
};

function renderizarGridCentralAreas() {
    const grid = document.getElementById('oficina-grade-areas');
    if (!grid) return;

    const areasOficina = AREAS_OFICINA.filter(a => a.tipo === 'oficina');
    const areasAdmin = AREAS_OFICINA.filter(a => a.tipo === 'administrativo');

    let visiveis = areasOficina.map(a => ({ area: a, status: calcularStatusArea(a.chave) }));

    if (CENTRAL_AREAS_BUSCA) {
        visiveis = visiveis.filter(v => v.area.nome.toLowerCase().includes(CENTRAL_AREAS_BUSCA));
    }
    if (CENTRAL_AREAS_FILTRO_STATUS) {
        visiveis = visiveis.filter(v => v.status.label === CENTRAL_AREAS_FILTRO_STATUS);
    }

    const cardsOficina = visiveis.map(({ area: a, status: s }) => `
        <div class="oficina-area-card" style="--area-color:${a.cor};" onclick="window.abrirAreaOficina('${a.chave}')">
            <div class="oficina-area-topo">
                <div class="oficina-area-icone" style="color:${a.cor};"><i class="fas ${a.icone}"></i></div>
                <span class="oficina-area-status-badge" style="color:${s.cor};">${s.emoji} ${s.label}</span>
            </div>
            <h4>${a.nome}</h4>
            <div class="oficina-area-resumo">
                <span title="Pendentes"><i class="fas fa-hourglass-half"></i> ${s.pendentes}</span>
                <span title="Em andamento"><i class="fas fa-person-running"></i> ${s.andamento}</span>
                ${s.atrasadas > 0 ? `<span title="Atrasadas" style="color:var(--danger);"><i class="fas fa-triangle-exclamation"></i> ${s.atrasadas}</span>` : ''}
            </div>
            <button class="oficina-area-acessar" style="color:${a.cor};">Acessar Área <i class="fas fa-arrow-right"></i></button>
        </div>
    `).join('');

    let cardsAdmin = '';
    if (!CENTRAL_AREAS_FILTRO_STATUS) {
        let admVisiveis = areasAdmin;
        if (CENTRAL_AREAS_BUSCA) admVisiveis = admVisiveis.filter(a => a.nome.toLowerCase().includes(CENTRAL_AREAS_BUSCA));
        if (admVisiveis.length > 0) {
            cardsAdmin = `
                <div class="central-areas-secao-titulo">Painéis Administrativos</div>
                <div id="oficina-grade-areas-admin" class="oficina-grade">
                    ${admVisiveis.map(a => `
                        <div class="oficina-area-card oficina-area-card-admin" style="--area-color:${a.cor};" onclick="window.abrirAba(null,'${a.abaDestino}')">
                            <div class="oficina-area-topo">
                                <div class="oficina-area-icone" style="color:${a.cor};"><i class="fas ${a.icone}"></i></div>
                            </div>
                            <h4>${a.nome}</h4>
                            <button class="oficina-area-acessar" style="color:${a.cor};">Acessar Painel <i class="fas fa-arrow-right"></i></button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    if (visiveis.length === 0 && !cardsAdmin) {
        grid.outerHTML = `<div id="oficina-grade-areas" class="area-oficina-vazio" style="padding:40px 0;">
            <i class="fas fa-magnifying-glass"></i>
            <p>Nenhuma área encontrada com esse filtro/busca.</p>
        </div>`;
        return;
    }

    grid.outerHTML = `<div id="oficina-grade-areas" class="oficina-grade">${cardsOficina}</div>${cardsAdmin}`;
}

window.carregarOficina = async function() {
    const container = document.getElementById('oficina-container');
    if (!container) return;

    container.innerHTML = `
        <div class="central-areas-toolbar">
            <div class="login-input-wrapper" style="position:relative; flex:1; min-width:200px;">
                <input type="text" id="central-areas-busca" placeholder="Buscar área..." oninput="window.buscarCentralAreas(this.value)" style="height:38px; border-radius:6px; padding-left:38px; width:100%;">
                <i class="fas fa-search login-input-icon" style="top:10px; font-size:13px; color:#a855f7;"></i>
            </div>
            <div class="mcc-filter-group" id="central-areas-filtros">
                <button class="btn-filter-mcc active" onclick="window.filtrarCentralAreas('', this)">Todas</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Crítico', this)">🔴 Crítico</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Restrição', this)">🟠 Restrição</button>
                <button class="btn-filter-mcc" onclick="window.filtrarCentralAreas('Atenção', this)">🟡 Atenção</button>
            </div>
            ${OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm ? `
                <button class="btn-premium" onclick="window.abrirModalAtividadeMassa()">
                    <i class="fas fa-layer-group"></i> Atividade em Massa
                </button>
            ` : ''}
        </div>
        <div id="oficina-grade-areas" class="oficina-grade"></div>
    `;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        OFICINA_ATIVIDADES_CACHE = Array.isArray(todas) ? todas : [];
    } catch (e) {
        console.error('⚠️ Não consegui carregar as atividades da oficina:', e);
        OFICINA_ATIVIDADES_CACHE = [];
    }

    CENTRAL_AREAS_FILTRO_STATUS = '';
    CENTRAL_AREAS_BUSCA = '';
    renderizarGridCentralAreas();
    atualizarKpisOficina();

    if (OFICINA_AREA_ATUAL) renderizarAtividadesArea();
};

// ==========================================
// 🆕 ATIVIDADE EM MASSA (só ADM) — cria a mesma atividade em várias
// áreas de uma vez, ou em todas, reaproveitando o mesmo endpoint que
// já existe pra criar 1 atividade (POST /api/oficina/atividade), só
// que chamado uma vez por área selecionada.
// ==========================================
window.abrirModalAtividadeMassa = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.isAdm) return;

    const descEl = document.getElementById('massa-descricao');
    const prioEl = document.getElementById('massa-prioridade');
    const inicioEl = document.getElementById('massa-data-inicio');
    const prazoEl = document.getElementById('massa-prazo');
    const respEl = document.getElementById('massa-responsavel');
    const todasEl = document.getElementById('massa-todas-areas');
    if (descEl) descEl.value = '';
    if (prioEl) prioEl.value = 'Normal';
    if (inicioEl) inicioEl.value = '';
    if (prazoEl) prazoEl.value = '';
    if (respEl) respEl.value = '';
    if (todasEl) todasEl.checked = false;

    const areasOficina = AREAS_OFICINA.filter(a => a.tipo === 'oficina');
    const lista = document.getElementById('massa-lista-areas');
    if (lista) {
        lista.innerHTML = areasOficina.map(a => `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 2px; cursor:pointer;">
                <input type="checkbox" class="massa-area-checkbox" value="${a.chave}">
                <span>${a.nome}</span>
            </label>
        `).join('');
    }
    document.getElementById('modal-atividade-massa')?.classList.remove('hidden');
};

window.fecharModalAtividadeMassa = function() {
    document.getElementById('modal-atividade-massa')?.classList.add('hidden');
};

window.alternarTodasAreasMassa = function(marcado) {
    document.querySelectorAll('.massa-area-checkbox').forEach(cb => { cb.checked = marcado; });
};

window.confirmarAtividadeMassa = async function() {
    if (!verificarAcesso()) return;

    const descricao = document.getElementById('massa-descricao')?.value.trim();
    if (!descricao) return alert('Descreva a atividade.');

    const prioridade = document.getElementById('massa-prioridade')?.value || 'Normal';
    const prazo = document.getElementById('massa-prazo')?.value || null;
    const dataInicio = document.getElementById('massa-data-inicio')?.value || null;
    const responsavel = document.getElementById('massa-responsavel')?.value.trim() || null;
    const areasSelecionadas = Array.from(document.querySelectorAll('.massa-area-checkbox:checked')).map(cb => cb.value);

    if (areasSelecionadas.length === 0) return alert('Selecione pelo menos uma área (ou marque "Selecionar todas").');
    if (dataInicio && prazo && dataInicio > prazo) {
        return alert('A Data de Início não pode ser depois do Prazo.');
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'ADM') : 'Sistema';
    let sucesso = 0, falha = 0;

    try {
        const apiBase = await resolverApiBase();
        for (const chave of areasSelecionadas) {
            try {
                const resp = await fetch(`${apiBase}/api/oficina/atividade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        area: chave,
                        equipamento_id: null,
                        descricao,
                        responsavel,
                        prioridade,
                        prazo,
                        data_inicio: dataInicio,
                        foto_base64: null,
                        operador
                    })
                });
                if (resp.ok) sucesso++; else falha++;
            } catch (e) {
                falha++;
            }
        }
    } catch (e) {
        console.error('⚠️ Erro ao resolver a API base pra atividade em massa:', e);
        alert('Não foi possível conectar ao servidor.');
        return;
    }

    alert(`✅ Atividade criada em ${sucesso} área(s).${falha > 0 ? ` ⚠️ Não foi possível criar em ${falha} área(s).` : ''}`);
    window.fecharModalAtividadeMassa();
    if (typeof window.carregarOficina === 'function') window.carregarOficina();
};

// Uma atividade está "atrasada" quando ainda não foi concluída, TEM um
// prazo definido, e esse prazo já passou. Sem prazo definido, nunca
// conta como atrasada (não dá pra saber isso sem uma data de referência).
function atividadeEstaAtrasada(x) {
    if (x.status === 'Concluído' || !x.prazo) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.prazo < hoje;
}

// 🆕 Uma atividade "ainda não começou" quando tem uma Data de Início
// cadastrada e essa data é futura (depois de hoje). Ela existe no
// sistema (dá pra editar/excluir), mas não entra nas contagens de
// Pendente/Em Andamento nem na lista principal — só aparece como
// "pra fazer" no dia marcado. Sem data de início, é considerada já
// disponível pra começar (comportamento de antes, sem quebrar nada).
function atividadeAindaNaoComecou(x) {
    if (!x.data_inicio) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.data_inicio > hoje;
}

// --------------------------------------------------------------
// KPIs GLOBAIS DA OFICINA (topo da aba, acima da grade de áreas)
// --------------------------------------------------------------
function atualizarKpisOficina() {
    const hoje = new Date().toISOString().slice(0, 10);
    const dataLimite7dias = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
    })();

    const pendentes = OFICINA_ATIVIDADES_CACHE.filter(x => x.status === 'Pendente').length;
    const emAndamento = OFICINA_ATIVIDADES_CACHE.filter(x => x.status === 'Em Andamento').length;
    const atrasadas = OFICINA_ATIVIDADES_CACHE.filter(atividadeEstaAtrasada).length;
    const concluidasRecentes = OFICINA_ATIVIDADES_CACHE.filter(x =>
        x.status === 'Concluído' && x.concluido_em && x.concluido_em.slice(0, 10) >= dataLimite7dias
    ).length;

    const definirTexto = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    };
    definirTexto('oficina-kpi-pendentes', pendentes);
    definirTexto('oficina-kpi-andamento', emAndamento);
    definirTexto('oficina-kpi-atrasadas', atrasadas);
    definirTexto('oficina-kpi-concluidas', concluidasRecentes);
}

// Estado local do módulo de Oficina.
let OFICINA_ATIVIDADES_CACHE = [];
let OFICINA_AREA_ATUAL = null;
let OFICINA_FILTRO_STATUS_ATUAL = '';
let OFICINA_TIPO_ATIVIDADE_ATUAL = 'equipamento'; // 'equipamento' | 'avulsa'
let OFICINA_FOTO_BASE64 = null;
export let OFICINA_EQUIPE_ATUAL = []; // equipe da área aberta no momento (usada no seletor de Responsável)
let OFICINA_EDITANDO_ID = null; // null = criando atividade nova; número = editando essa atividade

// ==========================================
// PAINÉIS ADMINISTRATIVOS (ADM, Almoxarifado, Ponte Rolante, Logística)
// ==========================================
// Ao contrário das 12 áreas técnicas (que abrem o modal genérico de
// atividades vinculado a equipamento), essas 4 áreas não têm
// equipamentos — só equipe e atividades soltas (e, no caso do
// Almoxarifado, o estoque geral de materiais). Por isso ganham um
// painel próprio, no estilo do Painel Geral, em vez do modal.
//
// Configuração de cada painel: nome de exibição, cor, ícone e se deve
// (ou não) mostrar o resumo do estoque de materiais.
const PAINEL_AREA_CONFIG = {
    'adm':            { nome: 'ADM',            cor: '#38bdf8', estoque: false },
    'almoxarifado':   { nome: 'Almoxarifado',   cor: '#22c55e', estoque: true  },
    'ponte-rolante':  { nome: 'Ponte Rolante',  cor: '#3b82f6', estoque: false },
    'logistica':      { nome: 'Logística',      cor: '#a855f7', estoque: false },
};

// Limite abaixo do qual um material é considerado "saldo baixo" no
// resumo do painel do Almoxarifado. Ajustável aqui sem mexer no resto.
const PAINEL_ALMOXARIFADO_LIMITE_BAIXO = 5;

window.renderPainelAreaAdministrativa = async function(chave) {
    const cfg = PAINEL_AREA_CONFIG[chave];
    const container = document.getElementById(`painel-${chave}-container`);
    if (!cfg || !container) return;

    // Esqueleto fixo do painel — os números/listas são preenchidos
    // depois, conforme cada chamada de API vai respondendo (não trava
    // a tela esperando tudo de uma vez).
    container.innerHTML = `
        <div class="kpi-container" style="margin-bottom:20px;">
            <div class="kpi-card">
                <div class="kpi-icon" style="color:${cfg.cor};"><i class="fas fa-users"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-equipe">–</h4><p>Equipe Ativa</p></div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-icon glow-warning"><i class="fas fa-hourglass-half"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-pendentes">–</h4><p>Atividades Pendentes</p></div>
            </div>
            <div class="kpi-card danger">
                <div class="kpi-icon glow-danger"><i class="fas fa-triangle-exclamation"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-atrasadas">–</h4><p>Atrasadas</p></div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-icon glow-success"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-data"><h4 id="painel-${chave}-kpi-concluidas">–</h4><p>Concluídas (7 dias)</p></div>
            </div>
        </div>

        ${cfg.estoque ? `
        <div class="glass-panel" style="padding:24px; margin-bottom:20px;">
            <div class="flex-between" style="margin-bottom:12px;">
                <h3 style="color:var(--text-title); font-size:1rem;"><i class="fas fa-boxes-stacked"></i> Resumo do Estoque</h3>
                <button class="btn-xs-primary" onclick="window.abrirAba(null,'aba-almoxarifado')" style="color:var(--text-accent); background:rgba(59,130,246,0.1);">
                    Ver Almoxarifado Completo <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="kpi-container" style="margin-bottom:16px;">
                <div class="kpi-card"><div class="kpi-data"><h4 id="painel-${chave}-kpi-itens-estoque">–</h4><p>Itens Cadastrados</p></div></div>
                <div class="kpi-card danger"><div class="kpi-data"><h4 id="painel-${chave}-kpi-estoque-baixo">–</h4><p>Saldo Baixo (≤ ${PAINEL_ALMOXARIFADO_LIMITE_BAIXO})</p></div></div>
            </div>
            <div id="painel-${chave}-estoque-lista"></div>
        </div>
        ` : ''}

        <div class="dashboard-main-grid">
            <div class="glass-panel" style="padding:24px;">
                <div class="flex-between" style="margin-bottom:16px;">
                    <h3 style="color:var(--text-title); font-size:1rem;"><i class="fas fa-list"></i> Atividades Recentes</h3>
                    <button class="btn-xs-primary" onclick="window.abrirAreaOficina('${chave}')" style="color:var(--text-accent); background:rgba(59,130,246,0.1);">
                        <i class="fas fa-plus"></i> Lançar Atividade
                    </button>
                </div>
                <div id="painel-${chave}-atividades-lista"></div>
            </div>

            <div class="glass-panel" style="padding:24px;">
                <h3 style="color:var(--text-title); font-size:1rem; margin-bottom:16px;"><i class="fas fa-user-hard-hat"></i> Equipe da Área</h3>
                <div id="painel-${chave}-equipe-lista"></div>
            </div>
        </div>
    `;

    // ---- EQUIPE ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const equipe = resp.ok ? await resp.json() : [];

        const kpiEquipe = document.getElementById(`painel-${chave}-kpi-equipe`);
        if (kpiEquipe) kpiEquipe.textContent = equipe.length;

        const listaEquipe = document.getElementById(`painel-${chave}-equipe-lista`);
        if (listaEquipe) {
            listaEquipe.innerHTML = equipe.length
                ? equipe.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                        <span style="color:var(--text-body);">${p.nome}</span>
                        <span class="text-muted" style="font-size:12px;">${p.cargo || ''}</span>
                    </div>
                `).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhum colaborador cadastrado nesta área ainda.</div>`;
        }
    } catch (e) {
        console.error(`⚠️ Não consegui carregar a equipe do painel [${chave}]:`, e);
    }

    // ---- ATIVIDADES ----
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades?area=${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const atividades = resp.ok ? await resp.json() : [];

        const pendentes = atividades.filter(a => a.status === 'Pendente').length;
        const atrasadas = atividades.filter(a => atividadeEstaAtrasada(a)).length;
        const dataLimite7dias = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d.toISOString().slice(0, 10);
        })();
        const concluidasRecentes = atividades.filter(a =>
            a.status === 'Concluído' && a.concluido_em && a.concluido_em.slice(0, 10) >= dataLimite7dias
        ).length;

        const definir = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
        definir(`painel-${chave}-kpi-pendentes`, pendentes);
        definir(`painel-${chave}-kpi-atrasadas`, atrasadas);
        definir(`painel-${chave}-kpi-concluidas`, concluidasRecentes);

        const listaAtividades = document.getElementById(`painel-${chave}-atividades-lista`);
        if (listaAtividades) {
            const recentes = [...atividades].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 10);
            listaAtividades.innerHTML = recentes.length
                ? recentes.map(a => {
                    const atrasada = atividadeEstaAtrasada(a);
                    const corStatus = a.status === 'Concluído' ? 'var(--success)' : (atrasada ? 'var(--danger)' : 'var(--warning)');
                    return `
                        <div style="padding:10px 0; border-bottom:1px solid var(--border);">
                            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                                <span style="color:var(--text-body); font-size:13px;">${a.descricao || 'Sem descrição'}</span>
                                <span style="font-size:11px; font-weight:700; color:${corStatus};">${atrasada ? 'ATRASADA' : (a.status || '').toUpperCase()}</span>
                            </div>
                            <div class="text-muted" style="font-size:11px; margin-top:2px;">${a.responsavel || 'Sem responsável'}${a.prazo ? ' · prazo ' + a.prazo.split('-').reverse().join('/') : ''}</div>
                        </div>
                    `;
                }).join('')
                : `<div class="text-muted" style="text-align:center; padding:20px 0;">Nenhuma atividade registrada nesta área ainda.</div>`;
        }
    } catch (e) {
        console.error(`⚠️ Não consegui carregar as atividades do painel [${chave}]:`, e);
    }

    // ---- ESTOQUE (só Almoxarifado) ----
    if (cfg.estoque) {
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/materiais`, { cache: 'no-store' });
            const materiais = resp.ok ? await resp.json() : [];
            const baixoEstoque = materiais.filter(m => Number(m.qtd) <= PAINEL_ALMOXARIFADO_LIMITE_BAIXO);

            const definir = (id, valor) => { const el = document.getElementById(id); if (el) el.textContent = valor; };
            definir(`painel-${chave}-kpi-itens-estoque`, materiais.length);
            definir(`painel-${chave}-kpi-estoque-baixo`, baixoEstoque.length);

            const listaEstoque = document.getElementById(`painel-${chave}-estoque-lista`);
            if (listaEstoque) {
                listaEstoque.innerHTML = baixoEstoque.length
                    ? `<div class="text-muted" style="font-size:12px; margin-bottom:8px;">Itens com saldo baixo (≤ ${PAINEL_ALMOXARIFADO_LIMITE_BAIXO}):</div>` +
                      baixoEstoque.slice(0, 10).map(m => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
                            <span style="color:var(--text-body); font-size:13px;">${m.descricao}</span>
                            <span style="color:var(--danger); font-weight:700; font-size:13px;">${m.qtd}</span>
                        </div>
                    `).join('')
                    : `<div class="text-muted" style="text-align:center; padding:12px 0;">Nenhum item com saldo baixo no momento ✅</div>`;
            }
        } catch (e) {
            console.error('⚠️ Não consegui carregar o resumo do estoque no painel do Almoxarifado:', e);
        }
    }
};

// --------------------------------------------------------------
// ABRIR O MODAL DE UMA ÁREA (chamado ao clicar num card da grade)
// --------------------------------------------------------------
// --------------------------------------------------------------
// ATALHO: abre direto a tela de uma área da Oficina a partir de um
// link dedicado no menu lateral (nav-area-oficina), sem precisar
// passar pela grade de cards da aba "Oficina" primeiro. Marca o link
// clicado como ativo no menu.
// --------------------------------------------------------------
window.abrirAreaOficinaDireto = function(event, chave) {
    if (event) event.preventDefault();

    // abrirAreaOficina() já chama abrirAba(null, 'aba-area-oficina')
    // logo na primeira linha (de forma síncrona, antes de qualquer
    // "await") — isso já limpa a classe "active" de todos os links do
    // menu. Por isso marcamos ESTE link como ativo só depois de chamar
    // a função, e não antes (senão essa marcação seria apagada).
    if (typeof window.abrirAreaOficina === 'function') window.abrirAreaOficina(chave);

    if (event && event.currentTarget) event.currentTarget.classList.add("active");
};

// ==============================================================
// ÁREA DA OFICINA — NAVEGAÇÃO POR ABAS (Atividades/Materiais/Equipe/
// Procedimentos/Notas) — antes tudo ficava num scroll único gigante.
// ==============================================================
window.trocarAbaAreaOficina = function(event, secao) {
    document.querySelectorAll('#area-oficina-tabs .folhao-tab').forEach(b => b.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    ['atividades', 'materiais', 'equipe', 'procedimentos', 'notas'].forEach(s => {
        const el = document.getElementById(`area-oficina-secao-${s}`);
        if (el) el.classList.toggle('hidden', s !== secao);
    });
};

// Formulário de "Nova Atividade" começa fechado — abre só quando o
// usuário realmente quer lançar algo, em vez de ocupar a tela toda.
window.alternarFormAtividadeOficina = function() {
    const card = document.getElementById('area-oficina-form-card');
    const textoBtn = document.getElementById('area-oficina-btn-toggle-form-texto');
    if (!card) return;
    const vaiAbrir = card.classList.contains('hidden');
    card.classList.toggle('hidden', !vaiAbrir);
    if (textoBtn) textoBtn.textContent = vaiAbrir ? 'Fechar Formulário' : 'Nova Atividade';
    if (vaiAbrir) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.abrirAreaOficina = async function(chave, abaInicial) {
    const area = AREAS_OFICINA.find(a => a.chave === chave);
    if (!area) return;

    // Agora é uma aba de verdade (não mais um modal por cima da tela) —
    // abrirAba() já cuida de esconder as outras abas e marcar esta como
    // ativa. Chamado com event=null porque pode vir de vários lugares
    // (card da grade, botão do painel administrativo, link direto do
    // menu lateral).
    window.abrirAba(null, 'aba-area-oficina');

    // ABAS MODULARES: cada área declara sua própria lista de abas em
    // dados.js (area.abas). Quem não declara usa o padrão de 5 abas.
    // Isso é o que permite, por exemplo, a Ferramentaria não ter
    // "Procedimentos" e chamar sua aba de materiais de "Ferramentas",
    // sem precisar de HTML/lógica duplicada por área.
    const abasDaArea = area.abas || ABAS_PADRAO_OFICINA;
    const tabsContainer = document.getElementById('area-oficina-tabs');
    if (tabsContainer) {
        // 🔧 CORREÇÃO CRÍTICA ("procedimento não aparece em NENHUMA
        // área"): esses botões são recriados do zero toda vez que uma
        // área é aberta, e não tinham "id" nenhum. renderProcedimentosArea()
        // procura o botão de Procedimentos por
        // getElementById('area-oficina-tab-btn-procedimentos') pra
        // decidir se mostra ou esconde a aba — como o id nunca existia
        // aqui, a busca sempre retornava null, e a função abortava ANTES
        // de preencher a lista (return antecipado por "!tabBtn"). Por
        // isso a aba Procedimentos sempre aparecia visível mas
        // completamente vazia, em toda área, mesmo quando havia
        // procedimento cadastrado. Agora cada botão leva um id previsível
        // (area-oficina-tab-btn-<chave>), então a busca funciona de novo.
        // Se abaInicial foi pedida e existe nessa área, ela entra ativa
        // no lugar da 1ª aba padrão (usada pelo atalho "Ver Equipe da
        // Área" do Painel do Técnico, por exemplo).
        const abaAtiva = (abaInicial && abasDaArea.some(ab => ab.chave === abaInicial)) ? abaInicial : abasDaArea[0].chave;

        tabsContainer.innerHTML = abasDaArea.map((aba) => `
            <button class="folhao-tab ${aba.chave === abaAtiva ? 'active' : ''}" id="area-oficina-tab-btn-${aba.chave}" onclick="window.trocarAbaAreaOficina(event,'${aba.chave}')">
                <i class="fas ${aba.icone}"></i> ${aba.label}
            </button>
        `).join('');
    }
    // Esconde as seções que essa área não usa; mostra a aba ativa.
    const abaAtivaSecao = (abaInicial && abasDaArea.some(ab => ab.chave === abaInicial)) ? abaInicial : abasDaArea[0].chave;
    ['atividades', 'materiais', 'equipe', 'procedimentos', 'notas'].forEach(s => {
        const usaEssaAba = abasDaArea.some(ab => ab.chave === s);
        document.getElementById(`area-oficina-secao-${s}`)?.classList.toggle('hidden', !(usaEssaAba && s === abaAtivaSecao));
    });
    // Renomeia labels dentro da própria seção "Materiais" quando a área
    // usa outro nome pra ela (ex: "Ferramentas"), sem duplicar seção.
    const abaMateriais = abasDaArea.find(ab => ab.chave === 'materiais');
    const tituloMateriais = document.getElementById('area-oficina-materiais-titulo-label');
    if (tituloMateriais) tituloMateriais.textContent = abaMateriais ? abaMateriais.label : 'Materiais';

    document.getElementById('area-oficina-form-card')?.classList.add('hidden');
    const textoBtn = document.getElementById('area-oficina-btn-toggle-form-texto');
    if (textoBtn) textoBtn.textContent = 'Nova Atividade';

    OFICINA_AREA_ATUAL = chave;
    OFICINA_FILTRO_STATUS_ATUAL = '';
    OFICINA_TIPO_ATIVIDADE_ATUAL = 'equipamento';
    OFICINA_EQUIPE_ATUAL = [];
    window.cancelarEdicaoAtividadeOficina(); // garante que não fica "preso" numa edição de outra área

    document.getElementById('area-oficina-nome').textContent = area.nome;
    const icone = document.getElementById('area-oficina-icone');
    icone.className = `fas ${area.icone}`;
    icone.style.color = area.cor;
    // Setado na section inteira (não só nas abas) porque os chips de
    // material e os avatares da equipe, mais abaixo na tela, também
    // usam essa variável e não são descendentes do bloco de abas.
    document.getElementById('aba-area-oficina')?.style.setProperty('--area-color', area.cor);

    // Status calculado a partir das atividades em aberto (mesma lógica
    // da Central de Áreas) + timestamp de quando essa tela carregou.
    const s = calcularStatusArea(chave);
    const badge = document.getElementById('area-oficina-status-badge');
    if (badge) { badge.textContent = `${s.emoji} ${s.label}`; badge.style.color = s.cor; }
    const ts = document.getElementById('area-oficina-timestamp');
    if (ts) ts.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const respEl = document.getElementById('area-oficina-responsavel-turno');
    if (respEl) respEl.textContent = 'Sem responsável definido'; // atualizado depois que a equipe carrega

    document.querySelectorAll('#area-oficina-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    document.querySelector('#area-oficina-filtros .btn-filter-mcc[data-status=""]')?.classList.add('active');

    document.getElementById('area-oficina-descricao').value = '';
    document.getElementById('area-oficina-responsavel-select').value = '';
    document.getElementById('area-oficina-responsavel-outro').value = '';
    document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
    document.getElementById('area-oficina-prioridade').value = 'Normal';
    document.getElementById('area-oficina-prazo').value = '';
    document.getElementById('area-oficina-data-inicio').value = '';
    window.removerFotoAtividadeOficina();
    window.alternarTipoAtividadeOficina('equipamento');

    const select = document.getElementById('area-oficina-equipamento');
    if (select) {
        let disponiveis = [...BANCO_ATIVOS];
        if (typeof area.filtro === 'function') {
            disponiveis = disponiveis.filter(area.filtro);
        }
        disponiveis.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

        if (disponiveis.length === 0) {
            select.innerHTML = `<option value="">Nenhum equipamento desse tipo cadastrado</option>`;
        } else {
            select.innerHTML = `<option value="">Selecione...</option>` +
                disponiveis.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
        }
    }

    // Atualiza o cache de atividades antes de renderizar — necessário
    // porque agora essa tela pode ser aberta direto (link do menu, ou
    // botão "Lançar Atividade" de um painel administrativo), sem
    // necessariamente ter passado pela grade da aba "Oficina" antes
    // (que normalmente é quem carrega esse cache).
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' });
        const todas = resp.ok ? await resp.json() : [];
        OFICINA_ATIVIDADES_CACHE = Array.isArray(todas) ? todas : [];
    } catch (e) {
        console.error('⚠️ Não consegui atualizar as atividades da oficina:', e);
    }

    renderizarAtividadesArea();
    carregarNotaAreaOficina(chave);
    carregarEquipeAreaOficina(chave);
    carregarMateriaisAreaOficina(chave);
    renderProcedimentosArea(chave);
};

window.fecharAreaOficina = function() {
    OFICINA_AREA_ATUAL = null;
    // 🔧 CORREÇÃO ("técnico fechava a área e caía na Central de Áreas,
    // uma visão de ADM com todas as áreas da fábrica"): técnico
    // restrito (não-ADM, com área fixa) volta pro Painel do Técnico —
    // só ADM/visitante continuam caindo na grade completa.
    const restrito = !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && !OPERADOR_LOGADO.isAdm && OPERADOR_LOGADO.area);
    window.abrirAba(null, restrito ? 'aba-tecnico' : 'aba-oficina');
};

// --------------------------------------------------------------
// TOGGLE: atividade vinculada a equipamento x tarefa avulsa
// --------------------------------------------------------------
window.alternarTipoAtividadeOficina = function(tipo) {
    OFICINA_TIPO_ATIVIDADE_ATUAL = tipo;
    document.getElementById('area-oficina-tipo-equip').classList.toggle('active', tipo === 'equipamento');
    document.getElementById('area-oficina-tipo-avulsa').classList.toggle('active', tipo === 'avulsa');
    const wrap = document.getElementById('area-oficina-select-equip-wrap');
    if (wrap) wrap.classList.toggle('hidden', tipo !== 'equipamento');
};

// --------------------------------------------------------------
// FILTRO DE STATUS (dentro do modal da área)
// --------------------------------------------------------------
window.filtrarAtividadesArea = function(status, botaoClicado) {
    OFICINA_FILTRO_STATUS_ATUAL = status;
    document.querySelectorAll('#area-oficina-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    renderizarAtividadesArea();
};

// --------------------------------------------------------------
// RENDERIZA A LISTA DE ATIVIDADES DA ÁREA ABERTA (usa o cache local)
// --------------------------------------------------------------
function renderizarAtividadesArea() {
    const container = document.getElementById('area-oficina-lista');
    if (!container || !OFICINA_AREA_ATUAL) return;

    const todasDaArea = OFICINA_ATIVIDADES_CACHE.filter(x => x.area === OFICINA_AREA_ATUAL);

    // 🆕 Separa quem já pode aparecer como "pra fazer" de quem ainda
    // está programado pra uma data futura (data_inicio no futuro).
    const ativas = todasDaArea.filter(x => !atividadeAindaNaoComecou(x));
    const futuras = todasDaArea.filter(x => atividadeAindaNaoComecou(x))
        .sort((a, b) => (a.data_inicio || '').localeCompare(b.data_inicio || ''));

    let itens = ativas;
    if (OFICINA_FILTRO_STATUS_ATUAL) {
        itens = itens.filter(x => x.status === OFICINA_FILTRO_STATUS_ATUAL);
    }

    const qtdPendente = ativas.filter(x => x.status === 'Pendente').length;
    const qtdAndamento = ativas.filter(x => x.status === 'Em Andamento').length;
    const qtdAtrasada = ativas.filter(x => atividadeEstaAtrasada(x)).length;

    const statsHtml = `
        <div class="area-oficina-stats">
            <div class="area-oficina-stat"><strong style="color:var(--warning);">${qtdPendente}</strong><span>Pendentes</span></div>
            <div class="area-oficina-stat"><strong style="color:var(--info);">${qtdAndamento}</strong><span>Em Andamento</span></div>
            <div class="area-oficina-stat"><strong style="color:${qtdAtrasada > 0 ? 'var(--danger)' : 'var(--success)'};">${qtdAtrasada}</strong><span>Atrasadas</span></div>
        </div>
    `;

    // 🆕 Bloco de "Programadas" — atividades com início futuro, fora da
    // contagem principal, cada uma mostrando a data em que vai "virar"
    // Pendente sozinha.
    const futurasHtml = futuras.length === 0 ? '' : `
        <div class="area-oficina-programadas">
            <h4 style="font-size:12px; color:var(--text-accent); text-transform:uppercase; letter-spacing:0.5px; margin:16px 0 8px;">
                <i class="fas fa-calendar-plus"></i> Programadas (ainda não começaram)
            </h4>
            ${futuras.map(x => {
                const inicioFormatado = x.data_inicio.split('-').reverse().join('/');
                return `
                <div class="atividade-card" style="--card-accent:var(--text-accent, #3b82f6); opacity:0.85;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
                            ${x.equipamento_id
                                ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span>`
                                : `<span class="ind-card-tag bg-tag">Tarefa avulsa</span>`}
                            <span style="font-size:10px; background:var(--text-accent, #3b82f6); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700;">COMEÇA ${inicioFormatado}</span>
                        </div>
                        <div style="font-size:13px; color:var(--text-body);">${x.descricao}</div>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${x.responsavel ? `${x.responsavel} · ` : ''}${x.criado_em || ''}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                        <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.editarAtividadeOficina(${x.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirAtividadeOficina(${x.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    if (itens.length === 0) {
        container.innerHTML = statsHtml + `
            <div class="area-oficina-vazio">
                <i class="fas fa-clipboard-check"></i>
                <p>Nenhuma atividade encontrada${OFICINA_FILTRO_STATUS_ATUAL ? ' com esse filtro' : ' nesta área ainda'}.</p>
            </div>
        ` + futurasHtml;
        return;
    }

    // 🆕 "Aguardando" (travou depois de já ter começado, ex: esperando
    // material chegar) e "Recusado" (nem chegou a iniciar, ex: pediram
    // e não forneceram material) — ambos SEMPRE vêm com motivo (ver
    // mudarStatusAtividadeOficina), e avisam quem pediu a atividade.
    const corStatus = { 'Pendente': 'var(--warning)', 'Em Andamento': 'var(--info)', 'Concluído': 'var(--success)', 'Aguardando': '#f97316', 'Recusado': 'var(--danger)' };
    const iconePrioridade = { 'Alta': '🔴', 'Baixa': '🔵' };

    container.innerHTML = statsHtml + itens.map(x => {
        const atrasada = atividadeEstaAtrasada(x);
        const prazoFormatado = x.prazo ? x.prazo.split('-').reverse().join('/') : null;
        const corBorda = atrasada ? 'var(--danger)' : (corStatus[x.status] || 'var(--text-muted)');

        // Botões de ação variam por status — sempre um jeito de avançar
        // (ou pausar/recusar com motivo), nunca "passar por cima" sem
        // justificar.
        let botoesAcao = '';
        if (x.status === 'Pendente') {
            botoesAcao = `
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Em Andamento')">Iniciar</button>
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Recusado')">Recusar</button>
            `;
        } else if (x.status === 'Em Andamento') {
            botoesAcao = `
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Concluído')">Concluir</button>
                <button class="btn-premium" style="padding:4px 10px; font-size:11px; background:#f97316; border-color:#f97316;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Aguardando')">Aguardando</button>
            `;
        } else if (x.status === 'Aguardando') {
            botoesAcao = `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Em Andamento')"><i class="fas fa-play"></i> Retomar</button>`;
        } else if (x.status === 'Recusado') {
            botoesAcao = `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, 'Pendente')"><i class="fas fa-rotate-left"></i> Reabrir</button>`;
        }

        return `
        <div class="atividade-card" style="--card-accent:${corBorda};">
            ${x.foto_base64 ? `
                <img src="${x.foto_base64}"
                     style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; flex-shrink:0;"
                     onclick="window.abrirFotoAmpliada('${x.foto_base64}', '${(x.criado_por || 'Sistema').replace(/'/g, "\\'")} — ${x.criado_em || ''}')"
                     title="${x.criado_por || 'Sistema'} — ${x.criado_em || ''}">
            ` : ''}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px;">
                    ${x.equipamento_id
                        ? `<span class="font-code" style="font-weight:700; color:var(--text-heading);">${x.equipamento_id}</span>`
                        : `<span class="ind-card-tag bg-tag">Tarefa avulsa</span>`}
                    <span style="font-size:11px; color:${corStatus[x.status] || 'var(--text-muted)'}; font-weight:700;">${x.status}</span>
                    ${iconePrioridade[x.prioridade] ? `<span title="Prioridade ${x.prioridade}">${iconePrioridade[x.prioridade]}</span>` : ''}
                    ${atrasada ? `<span style="font-size:10px; background:var(--danger); color:#fff; padding:2px 6px; border-radius:4px; font-weight:700;">ATRASADA</span>` : ''}
                </div>
                <div style="font-size:13px; color:var(--text-body);">${x.descricao}</div>
                ${x.motivo_status ? `<div style="font-size:11.5px; color:${corStatus[x.status]}; margin-top:4px;"><i class="fas fa-circle-info"></i> ${x.motivo_status}</div>` : ''}
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                    ${x.responsavel ? `${x.responsavel} · ` : ''}${x.criado_em || ''}
                    ${x.data_inicio ? ` · <span style="color:var(--text-accent, #3b82f6);">Início salvo: ${x.data_inicio.split('-').reverse().join('/')}</span>` : ''}
                    ${prazoFormatado ? ` · Prazo: <span style="color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${atrasada ? '700' : '400'};">${prazoFormatado}</span>` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${botoesAcao}
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.abrirConversaAtividade(${x.id})" title="Conversa">
                    <i class="fas fa-comments"></i>
                </button>
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.editarAtividadeOficina(${x.id})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirAtividadeOficina(${x.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('') + futurasHtml;
}

// --------------------------------------------------------------
// CRIAR ATIVIDADE (vinculada a equipamento OU avulsa)
// --------------------------------------------------------------
window.confirmarAtividadeOficina = async function() {
    if (!verificarAcesso()) return;
    if (!OFICINA_AREA_ATUAL) return;

    const descricao = document.getElementById('area-oficina-descricao')?.value.trim();
    const responsavel = lerResponsavelFormOficina();
    const prioridade = document.getElementById('area-oficina-prioridade')?.value || 'Normal';
    const prazo = document.getElementById('area-oficina-prazo')?.value || null;
    const dataInicio = document.getElementById('area-oficina-data-inicio')?.value || null;
    const equipamentoId = OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento'
        ? document.getElementById('area-oficina-equipamento')?.value
        : null;

    if (OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento' && !equipamentoId) {
        return alert('Selecione o equipamento, ou troque para "Tarefa Avulsa".');
    }
    if (!descricao) return alert('Descreva a atividade.');
    // 🆕 Início não pode ser depois do prazo — evita programar algo
    // pra "começar" numa data que já é depois do "terminar".
    if (dataInicio && prazo && dataInicio > prazo) {
        return alert('A Data de Início não pode ser depois do Prazo.');
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    const editando = OFICINA_EDITANDO_ID !== null;

    try {
        const apiBase = await resolverApiBase();
        const url = editando ? `${apiBase}/api/oficina/atividade/editar` : `${apiBase}/api/oficina/atividade`;
        const corpo = editando
            ? {
                id: OFICINA_EDITANDO_ID,
                equipamento_id: equipamentoId || null,
                descricao,
                responsavel: responsavel || null,
                prioridade,
                prazo,
                data_inicio: dataInicio,
                foto_base64: OFICINA_FOTO_BASE64 || null
              }
            : {
                area: OFICINA_AREA_ATUAL,
                equipamento_id: equipamentoId || null,
                descricao,
                responsavel: responsavel || null,
                prioridade,
                prazo,
                data_inicio: dataInicio,
                foto_base64: OFICINA_FOTO_BASE64 || null,
                operador
              };

        let resp, enfileirado = false;
        if (editando) {
            // Edição não entra na fila offline — reenviar uma edição
            // sozinho depois, sem o usuário ver o resultado na hora, é
            // arriscado demais (pode já ter mudado de novo nesse meio
            // tempo). Só cria-nova-atividade é seguro de enfileirar.
            resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            });
        } else {
            const resultado = await enviarComFilaOffline(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            }, `Atividade da Oficina — ${descricao}`);
            resp = resultado.resp;
            enfileirado = resultado.enfileirado;
        }

        if (enfileirado) {
            document.getElementById('area-oficina-descricao').value = '';
            document.getElementById('area-oficina-responsavel-select').value = '';
            document.getElementById('area-oficina-responsavel-outro').value = '';
            document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
            document.getElementById('area-oficina-prazo').value = '';
            document.getElementById('area-oficina-data-inicio').value = '';
            window.removerFotoAtividadeOficina();
            alert('📴 Sem internet agora — a atividade foi guardada e será enviada sozinha assim que a conexão voltar.');
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || `Não foi possível ${editando ? 'salvar a edição' : 'salvar a atividade'}.`);
            return;
        }

        if (!editando && typeof registrarHistorico === 'function') {
            const areaInfo = AREAS_OFICINA.find(a => a.chave === OFICINA_AREA_ATUAL);
            const nomeArea = areaInfo ? areaInfo.nome : OFICINA_AREA_ATUAL;
            registrarHistorico(
                equipamentoId || `OFICINA-${OFICINA_AREA_ATUAL.toUpperCase()}`,
                `🧰 [${nomeArea}] ${descricao}`
            );
        }

        document.getElementById('area-oficina-descricao').value = '';
        document.getElementById('area-oficina-responsavel-select').value = '';
        document.getElementById('area-oficina-responsavel-outro').value = '';
        document.getElementById('area-oficina-responsavel-outro').classList.add('hidden');
        document.getElementById('area-oficina-prazo').value = '';
        document.getElementById('area-oficina-data-inicio').value = '';
        window.removerFotoAtividadeOficina();
        window.cancelarEdicaoAtividadeOficina();

        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao salvar atividade da oficina:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// --------------------------------------------------------------
// MUDAR STATUS (Pendente -> Em Andamento -> Concluído)
// --------------------------------------------------------------
window.mudarStatusAtividadeOficina = async function(id, novoStatus) {
    if (!verificarAcesso()) return;

    // 🆕 "Recusado" e "Aguardando" exigem motivo — o backend também
    // valida isso (não dá pra contornar só chamando a API direto), mas
    // pedir aqui já evita a ida e volta com erro pro técnico.
    // Iniciar/Concluir agora também aceitam uma observação — opcional
    // (cancelar o prompt não bloqueia a ação, diferente de
    // Recusado/Aguardando) — dá pra deixar uma nota tipo "trocado o
    // parafuso X" que chega pro solicitante junto do aviso.
    let motivo = null;
    if (novoStatus === 'Recusado' || novoStatus === 'Aguardando') {
        const rotulo = novoStatus === 'Recusado' ? 'Por que está recusando essa atividade?' : 'Por que está pausando essa atividade? (ex: aguardando material)';
        motivo = prompt(rotulo);
        if (!motivo || !motivo.trim()) { alert('É preciso informar um motivo.'); return; }
    } else if (novoStatus === 'Concluído') {
        // Iniciar dispara notificação automática sem interromper o
        // técnico com um prompt — só Concluir pede observação (e
        // mesmo assim é opcional: cancelar/deixar em branco conclui
        // sem nota).
        motivo = prompt('Observação ao concluir (opcional):') || null;
    }

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus, motivo })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => null);
            alert(erro?.detail || 'Não foi possível atualizar o status.');
            return;
        }
        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status da atividade:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// EXCLUIR ATIVIDADE
// --------------------------------------------------------------
window.excluirAtividadeOficina = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir esta atividade?')) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir.');
            return;
        }
        await window.carregarOficina();
    } catch (e) {
        console.error('⚠️ Erro ao excluir atividade da oficina:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// 🆕 CONVERSA DA ATIVIDADE — mensagens de mão dupla numa atividade
// específica. Mesmo modal/thread é usado tanto aqui (quadro da área)
// quanto na lista de Atividade Extra do Checklist de Execução (ver
// checklist-execucao.js), então essas funções ficam em window.* pra
// os dois lados chamarem.
// --------------------------------------------------------------
let CONVERSA_ATIVIDADE_ID_ATUAL = null;

window.abrirConversaAtividade = async function(atividadeId) {
    CONVERSA_ATIVIDADE_ID_ATUAL = atividadeId;
    const modal = document.getElementById('modal-conversa-atividade');
    if (!modal) return;
    document.getElementById('conversa-atividade-texto').value = '';
    modal.classList.remove('hidden');
    await window.carregarMensagensConversaAtividade();
};

window.fecharConversaAtividade = function() {
    const modal = document.getElementById('modal-conversa-atividade');
    if (modal) modal.classList.add('hidden');
    CONVERSA_ATIVIDADE_ID_ATUAL = null;
};

window.carregarMensagensConversaAtividade = async function() {
    if (!CONVERSA_ATIVIDADE_ID_ATUAL) return;
    const lista = document.getElementById('conversa-atividade-lista');
    if (!lista) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/mensagens/${CONVERSA_ATIVIDADE_ID_ATUAL}`, { cache: 'no-store' });
        const mensagens = resp.ok ? await resp.json() : [];
        const minhaMatricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || '').toUpperCase();

        lista.innerHTML = mensagens.length === 0
            ? `<p class="text-muted" style="text-align:center; font-size:11.5px; padding:12px;">Nenhuma mensagem ainda — escreva a primeira abaixo.</p>`
            : mensagens.map(m => {
                const minha = (m.autor_matricula || '').toUpperCase() === minhaMatricula && minhaMatricula !== '';
                const quando = m.criado_em ? new Date(m.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                return `
                    <div style="margin-bottom:8px; text-align:${minha ? 'right' : 'left'};">
                        <div style="display:inline-block; max-width:80%; padding:6px 10px; border-radius:10px; font-size:12.5px; text-align:left;
                                    background:${minha ? 'var(--text-accent, #3b82f6)' : 'var(--bg-card, #1f2937)'}; color:${minha ? '#fff' : 'var(--text-body)'};">
                            <div style="font-weight:700; font-size:10.5px; opacity:0.85; margin-bottom:2px;">${m.autor_nome || 'Sistema'}</div>
                            ${m.mensagem}
                        </div>
                        <div style="font-size:9.5px; color:var(--text-muted); margin-top:2px;">${quando}</div>
                    </div>
                `;
            }).join('');
        lista.scrollTop = lista.scrollHeight;
    } catch (e) {
        console.error('⚠️ Erro ao carregar mensagens da atividade:', e);
        lista.innerHTML = `<p class="text-muted" style="text-align:center; font-size:11.5px;">Não foi possível carregar a conversa.</p>`;
    }
};

window.enviarMensagemConversaAtividade = async function() {
    if (!CONVERSA_ATIVIDADE_ID_ATUAL) return;
    const input = document.getElementById('conversa-atividade-texto');
    const mensagem = input.value.trim();
    if (!mensagem) return;

    const tecnico = OPERADOR_LOGADO || {};
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/mensagem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                atividade_id: CONVERSA_ATIVIDADE_ID_ATUAL,
                autor_matricula: tecnico.matricula || '',
                autor_nome: tecnico.nome || tecnico.matricula || 'Sistema',
                mensagem
            })
        });
        if (!resp.ok) { alert('Não foi possível enviar a mensagem.'); return; }
    } catch (e) {
        console.error('⚠️ Erro ao enviar mensagem da atividade:', e);
        alert('Não foi possível conectar ao servidor.');
        return;
    }
    input.value = '';
    await window.carregarMensagensConversaAtividade();
};

// --------------------------------------------------------------
// FOTO DA ATIVIDADE (mesma lógica de compressão de Intervenção/Ocorrência)
// --------------------------------------------------------------
window.processarFotoAtividadeOficina = function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        alert('Por favor, escolha um arquivo de imagem.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const MAX_LADO = 1280;
            let largura = img.width;
            let altura = img.height;

            if (largura > altura && largura > MAX_LADO) {
                altura = Math.round((altura * MAX_LADO) / largura);
                largura = MAX_LADO;
            } else if (altura > MAX_LADO) {
                largura = Math.round((largura * MAX_LADO) / altura);
                altura = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, largura, altura);

            OFICINA_FOTO_BASE64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('area-oficina-foto-preview');
            const container = document.getElementById('area-oficina-foto-preview-container');
            if (preview) preview.src = OFICINA_FOTO_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoAtividadeOficina = function() {
    OFICINA_FOTO_BASE64 = null;
    const preview = document.getElementById('area-oficina-foto-preview');
    const container = document.getElementById('area-oficina-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

// 🔧 Remove acentos pra comparar cargo sem depender de a planilha ter
// escrito "TÉCNICO" com acento — usado por carregarEquipeAreaOficina()
// pra achar o líder de qualquer área, sem exceção.
function normalizarTextoSemAcento(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

// Regra única de "quem é o líder da equipe da área", reaproveitada
// tanto pro badge do topo (área-oficina-responsavel-turno) quanto pra
// estrelinha na lista de Equipe — pra nunca ficar divergente entre os
// dois lugares:
//   1) Se só tem 1 pessoa na área, ela É a líder (não tem mais ninguém
//      pra escolher — ex: Paula, sozinha na Ferramentaria).
//   2) Senão, é quem tiver "TECNICO" no cargo (ignorando acento).
//   3) Se ninguém bater nenhuma das duas regras, não tem líder definido
//      (quem chama decide o fallback, ex: primeiro da lista).
function encontrarLiderEquipe(equipe) {
    if (!Array.isArray(equipe) || equipe.length === 0) return null;
    if (equipe.length === 1) return equipe[0];
    return equipe.find(p => normalizarTextoSemAcento(p.cargo).includes('TECNICO')) || null;
}

// --------------------------------------------------------------
// EQUIPE DA ÁREA (dados reais, vindos da planilha do efetivo)
// --------------------------------------------------------------
async function carregarEquipeAreaOficina(chave) {
    const container = document.getElementById('area-oficina-equipe-lista');
    const selectResp = document.getElementById('area-oficina-responsavel-select');
    if (!container) return;
    container.innerHTML = `<div class="text-muted" style="font-size:12px;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/equipe/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        const equipe = resp.ok ? await resp.json() : [];
        OFICINA_EQUIPE_ATUAL = Array.isArray(equipe) ? equipe : [];

        // 🔧 CORREÇÃO ("técnico da área ser o líder da equipe" — vale
        // pra TODAS as áreas, não só uma): antes o "responsável" mostrado
        // no topo da tela era simplesmente o PRIMEIRO nome em ordem
        // alfabética da lista (a API devolve a equipe com ORDER BY
        // nome) — um pick totalmente arbitrário, sem relação nenhuma
        // com quem lidera a equipe de verdade. Agora procura primeiro
        // alguém cujo cargo (vindo da planilha do efetivo) contenha a
        // palavra "TECNICO" — que é quem exerce a liderança da equipe
        // da área — e só cai pro primeiro da lista se ninguém tiver esse
        // cargo cadastrado.
        //
        // A comparação ignora acento (normalizarTextoSemAcento) porque
        // a planilha tem cargos como "TECNICO DE MANUTENCAO MECANICA"
        // (sem acento) — comparar só com "TÉCNICO" (acentuado, cargo
        // exato) nunca batia com esses cargos reais, e a busca sempre
        // caía no fallback alfabético mesmo tendo um técnico na equipe.
        //
        // 🆕 Se a área tem só 1 pessoa cadastrada (ex: Paula, sozinha na
        // Ferramentaria), essa pessoa É a líder por padrão — não faz
        // sentido exigir o cargo "Técnico" quando não tem mais ninguém
        // pra escolher.
        const respTurno = document.getElementById('area-oficina-responsavel-turno');
        if (respTurno) {
            const lider = encontrarLiderEquipe(OFICINA_EQUIPE_ATUAL);
            const responsavel = lider || OFICINA_EQUIPE_ATUAL[0];
            respTurno.textContent = responsavel
                ? `${responsavel.nome}${lider ? ' (Líder)' : ''}`
                : 'Sem responsável definido';
        }

        // Seletor de Responsável (no formulário de atividade) — lista a
        // equipe real da área + opção "Outro" pra digitar um nome que
        // não está no roster (ex: um supervisor, ou área ainda sem
        // gente cadastrada na planilha do efetivo).
        if (selectResp) {
            selectResp.innerHTML = `<option value="">Selecione...</option>` +
                OFICINA_EQUIPE_ATUAL.map(p => `<option value="${p.nome}">${p.nome}${p.cargo ? ` — ${p.cargo}` : ''}</option>`).join('') +
                `<option value="__outro__">Outro (digitar nome)</option>`;
        }

        if (OFICINA_EQUIPE_ATUAL.length === 0) {
            container.innerHTML = `
                <div class="area-oficina-vazio">
                    <i class="fas fa-users"></i>
                    <p>Nenhum colaborador cadastrado nesta área ainda.</p>
                </div>
            `;
            return;
        }

        const liderDaArea = encontrarLiderEquipe(OFICINA_EQUIPE_ATUAL);
        container.innerHTML = OFICINA_EQUIPE_ATUAL.map(p => {
            const iniciais = p.nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
            const ehLider = !!liderDaArea && liderDaArea.matricula === p.matricula;
            return `
            <div class="equipe-card" style="${ehLider ? 'border-color:var(--area-color, var(--text-accent));' : ''}">
                <div class="equipe-avatar">${iniciais}</div>
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text-heading); font-size:13px;">${p.nome} ${ehLider ? '<i class="fas fa-star" style="color:var(--warning); font-size:10px;" title="Líder da equipe"></i>' : ''}</div>
                    ${p.cargo ? `<div class="text-muted" style="font-size:11px;">${p.cargo}</div>` : ''}
                </div>
            </div>
        `;
        }).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar a equipe da área:', e);
        container.innerHTML = `<div class="text-muted" style="font-size:12px;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
}

// --------------------------------------------------------------
// ANOTAÇÕES DA ÁREA (materiais/procedimento — provisório, texto livre)
// --------------------------------------------------------------
// --------------------------------------------------------------
// TOGGLE do seletor de Responsável: mostra o campo de texto livre só
// quando "Outro" é escolhido.
// --------------------------------------------------------------
window.alternarResponsavelOficina = function() {
    const select = document.getElementById('area-oficina-responsavel-select');
    const outro = document.getElementById('area-oficina-responsavel-outro');
    if (!select || !outro) return;
    outro.classList.toggle('hidden', select.value !== '__outro__');
    if (select.value === '__outro__') outro.focus();
};

function lerResponsavelFormOficina() {
    const select = document.getElementById('area-oficina-responsavel-select')?.value || '';
    if (select === '__outro__') {
        return document.getElementById('area-oficina-responsavel-outro')?.value.trim() || null;
    }
    return select || null;
}

// --------------------------------------------------------------
// MATERIAIS TÉCNICOS DA ÁREA
// --------------------------------------------------------------
let MATERIAIS_AREA_OFICINA_CACHE = [];

async function carregarMateriaisAreaOficina(chave) {
    const container = document.getElementById('area-oficina-materiais-lista');
    if (!container) return;
    container.innerHTML = `<div class="text-muted" style="font-size:12px;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        MATERIAIS_AREA_OFICINA_CACHE = resp.ok ? await resp.json() : [];
    } catch (e) {
        console.error('⚠️ Não consegui carregar os materiais da área:', e);
        MATERIAIS_AREA_OFICINA_CACHE = [];
        container.innerHTML = `<div class="text-muted" style="font-size:12px;">Não foi possível carregar. Verifique sua internet.</div>`;
        return;
    }
    const busca = document.getElementById('area-oficina-busca-material');
    if (busca) busca.value = '';
    window.filtrarMateriaisAreaOficina();
}

window.filtrarMateriaisAreaOficina = function() {
    const container = document.getElementById('area-oficina-materiais-lista');
    if (!container) return;

    const termo = (document.getElementById('area-oficina-busca-material')?.value || '').toLowerCase().trim();
    let materiais = MATERIAIS_AREA_OFICINA_CACHE;
    if (termo) {
        materiais = materiais.filter(m =>
            (m.codigo || '').toLowerCase().includes(termo) ||
            (m.descricao || '').toLowerCase().includes(termo)
        );
    }

    const tabBtn = document.querySelector('#area-oficina-tabs .folhao-tab:nth-child(2)');
    if (tabBtn) tabBtn.innerHTML = `<i class="fas fa-boxes-stacked"></i> Materiais${MATERIAIS_AREA_OFICINA_CACHE.length ? ` (${MATERIAIS_AREA_OFICINA_CACHE.length})` : ''}`;

    if (materiais.length === 0) {
        container.innerHTML = `
            <div class="area-oficina-vazio">
                <i class="fas fa-boxes-stacked"></i>
                <p>${termo ? 'Nenhum material encontrado.' : 'Nenhum material cadastrado nesta área ainda — use o campo abaixo pra começar a lista.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="max-height:320px; overflow-y:auto;">
            ${materiais.map(m => `
                <div class="material-chip">
                    <div style="min-width:0; display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-cube" style="color:var(--area-color, var(--text-accent)); font-size:13px; flex-shrink:0;"></i>
                        <div style="min-width:0;">
                            <span class="font-code" style="font-weight:700; color:var(--text-heading); font-size:12px;">${m.codigo}</span>
                            <span style="font-size:12px; color:var(--text-body); margin-left:6px;">${m.descricao}</span>
                        </div>
                    </div>
                    <button class="btn-outline-danger" style="padding:3px 8px; font-size:11px; flex-shrink:0;" onclick="window.excluirMaterialAreaOficina(${m.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

window.adicionarMaterialAreaOficina = async function() {
    if (!verificarAcesso()) return;
    if (!OFICINA_AREA_ATUAL) return;

    const codigoEl = document.getElementById('area-oficina-material-codigo');
    const descricaoEl = document.getElementById('area-oficina-material-descricao');
    const codigo = codigoEl?.value.trim();
    const descricao = descricaoEl?.value.trim();

    if (!codigo || !descricao) return alert('Preencha código e descrição do material.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: OFICINA_AREA_ATUAL, codigo, descricao, operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível salvar o material.');
            return;
        }
        codigoEl.value = '';
        descricaoEl.value = '';
        await carregarMateriaisAreaOficina(OFICINA_AREA_ATUAL);
    } catch (e) {
        console.error('⚠️ Erro ao adicionar material:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.excluirMaterialAreaOficina = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir este material da lista da área?')) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/materiais/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir.');
            return;
        }
        await carregarMateriaisAreaOficina(OFICINA_AREA_ATUAL);
    } catch (e) {
        console.error('⚠️ Erro ao excluir material:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// ==============================================================
// PROCEDIMENTOS OPERACIONAIS (checklist de etapas por área)
// ==============================================================
// Conteúdo dos procedimentos (passo a passo, EPIs, ferramentas) vem de
// PROCEDIMENTOS_POR_AREA, definido em procedimentosOficina.js — este
// arquivo só cuida de MOSTRAR isso e registrar cada execução no banco.
let PROCEDIMENTO_ATUAL = null; // objeto do procedimento aberto no modal
let PROCEDIMENTO_ETAPAS_MARCADAS = new Set(); // ids das etapas marcadas na execução atual

// Lista, dentro da tela da área, quais procedimentos existem pra ela
// (card só aparece se houver pelo menos 1 cadastrado).
function renderProcedimentosArea(chave) {
    const tabBtn = document.getElementById('area-oficina-tab-btn-procedimentos');
    const lista = document.getElementById('area-oficina-procedimentos-lista');
    if (!tabBtn || !lista) return;

    const procedimentos = (window.PROCEDIMENTOS_POR_AREA && window.PROCEDIMENTOS_POR_AREA[chave]) || [];
    if (procedimentos.length === 0) {
        tabBtn.classList.add('hidden');
        return;
    }

    tabBtn.classList.remove('hidden');
    lista.innerHTML = procedimentos.map(p => `
        <div class="procedimento-card">
            <div style="min-width:0; display:flex; align-items:center; gap:10px;">
                <i class="fas fa-file-shield" style="color:var(--area-color, var(--text-accent)); font-size:14px; flex-shrink:0;"></i>
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text-heading); font-size:13px;">${p.nome}</div>
                    <div class="text-muted" style="font-size:11px;">Nº ${p.id} · Rev. ${p.revisao || '-'} · ${p.frequencia || ''}</div>
                </div>
            </div>
            <button class="btn-premium" style="flex-shrink:0; padding:6px 12px; font-size:11.5px;" onclick="window.abrirProcedimento('${chave}','${p.id}')">
                <i class="fas fa-clipboard-check"></i> Abrir
            </button>
        </div>
    `).join('');
}
window.renderProcedimentosArea = renderProcedimentosArea;

// Abre o modal com o procedimento completo (EPIs, ferramentas, checklist
// de etapas). Também busca a última execução registrada, só pra mostrar
// "última vez feito por Fulano em tal data" como referência.
window.abrirProcedimento = async function(chave, procedimentoId) {
    const procedimentos = (window.PROCEDIMENTOS_POR_AREA && window.PROCEDIMENTOS_POR_AREA[chave]) || [];
    const procedimento = procedimentos.find(p => p.id === procedimentoId);
    if (!procedimento) return;

    PROCEDIMENTO_ATUAL = { ...procedimento, area: chave };
    PROCEDIMENTO_ETAPAS_MARCADAS = new Set();

    document.getElementById('procedimento-titulo').textContent = procedimento.nome;
    document.getElementById('procedimento-meta').textContent =
        `Nº ${procedimento.id} · Revisão ${procedimento.revisao || '-'} (${procedimento.dataRevisao || ''}) · Frequência: ${procedimento.frequencia || '-'}`;

    const info = document.getElementById('procedimento-info');
    info.innerHTML = `
        ${procedimento.objetivo ? `<p style="margin-bottom:10px;"><strong>Objetivo:</strong> ${procedimento.objetivo}</p>` : ''}
        ${procedimento.responsavel ? `<p style="margin-bottom:10px;"><strong>Responsável:</strong> ${procedimento.responsavel}</p>` : ''}
        ${(procedimento.seguranca || []).length ? `<p style="margin-bottom:6px;"><strong>EPIs:</strong> ${procedimento.seguranca.join(', ')}</p>` : ''}
        ${(procedimento.ferramentas || []).length ? `<p style="margin-bottom:6px;"><strong>Ferramentas:</strong> ${procedimento.ferramentas.join(', ')}</p>` : ''}
        ${(procedimento.recomendacoes || []).length ? `<p style="margin-top:10px; color:var(--warning);"><strong><i class="fas fa-triangle-exclamation"></i> Recomendações de segurança:</strong><br>${procedimento.recomendacoes.join('<br>')}</p>` : ''}
        ${(procedimento.atencao || []).length ? `
            <div style="margin-top:14px; padding:12px; border-radius:8px; background:var(--danger-bg); border:1px solid var(--danger);">
                <strong style="color:var(--danger);"><i class="fas fa-ban"></i> O que NÃO deve ser feito:</strong>
                <ul style="margin:8px 0 0 18px; padding:0;">
                    ${procedimento.atencao.map(a => `<li style="margin-bottom:6px; color:var(--text-body);">${a}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;

    // 📏 Tabela de referência anexa (ex: valores de aferição de
    // Pass-Line por rolo) — só renderiza se o procedimento tiver uma.
    const containerTabela = document.getElementById('procedimento-tabela-referencia');
    if (containerTabela) {
        const tabela = procedimento.tabelaReferencia;
        if (tabela) {
            containerTabela.classList.remove('hidden');
            containerTabela.innerHTML = `
                <div style="font-weight:700; color:var(--text-accent); font-size:12px; margin-bottom:6px;">
                    <i class="fas fa-ruler"></i> ${tabela.titulo}
                </div>
                ${tabela.diametroApoios ? `<div class="text-muted" style="font-size:11.5px; margin-bottom:8px;">${tabela.diametroApoios}</div>` : ''}
                <div class="table-responsive">
                    <table class="premium-table" style="font-size:11.5px;">
                        <thead><tr>${tabela.colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${tabela.linhas.map(linha => `<tr>${linha.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            containerTabela.classList.add('hidden');
            containerTabela.innerHTML = '';
        }
    }

    renderizarEtapasProcedimento();

    const modal = document.getElementById('modal-procedimento');
    if (modal) modal.classList.remove('hidden');

    // Busca a última execução — só informativo, não bloqueia nada.
    const statusEl = document.getElementById('procedimento-ultima-execucao');
    if (statusEl) statusEl.textContent = '';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/procedimento/historico/${encodeURIComponent(chave)}?procedimento_id=${encodeURIComponent(procedimentoId)}&limite=1`, { cache: 'no-store' });
        const listaExec = resp.ok ? await resp.json() : [];
        if (statusEl && Array.isArray(listaExec) && listaExec.length > 0) {
            const ultima = listaExec[0];
            statusEl.textContent = ultima.concluido
                ? `Última execução concluída por ${ultima.operador || 'alguém'} em ${ultima.data_hora}`
                : `Última execução (parcial) por ${ultima.operador || 'alguém'} em ${ultima.data_hora}`;
        }
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do procedimento:', e);
    }
};

function renderizarEtapasProcedimento() {
    const container = document.getElementById('procedimento-etapas-lista');
    if (!container || !PROCEDIMENTO_ATUAL) return;

    const etapasReais = PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao);
    container.innerHTML = PROCEDIMENTO_ATUAL.etapas.map(e => {
        if (e.secao) {
            return `<div style="font-weight:700; color:var(--text-accent); font-size:12px; text-transform:uppercase; letter-spacing:0.5px; margin:14px 0 6px 0;">${e.titulo}</div>`;
        }
        const marcada = PROCEDIMENTO_ETAPAS_MARCADAS.has(e.id);
        return `
            <label style="display:flex; gap:10px; align-items:flex-start; padding:10px; border-radius:8px; background:${marcada ? 'var(--success-bg)' : 'var(--bg-td)'}; margin-bottom:6px; cursor:pointer; transition:background 0.15s;">
                <input type="checkbox" ${marcada ? 'checked' : ''} onchange="window.marcarEtapaProcedimento('${e.id}', this.checked)" style="margin-top:3px; width:18px; height:18px; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:13px; color:var(--text-heading); font-weight:600;">${e.id} — ${e.texto}</div>
                    ${e.pontosChave ? `<div class="text-muted" style="font-size:11.5px; margin-top:3px;"><i class="fas fa-wrench" style="opacity:0.6;"></i> ${e.pontosChave}</div>` : ''}
                    ${e.seguranca ? `<div style="font-size:11.5px; margin-top:3px; color:var(--warning);"><i class="fas fa-triangle-exclamation"></i> ${e.seguranca}</div>` : ''}
                </div>
            </label>
        `;
    }).join('');

    atualizarProgressoProcedimento(etapasReais.length);
}

function atualizarProgressoProcedimento(totalEtapas) {
    const el = document.getElementById('procedimento-progresso');
    if (el) el.textContent = `${PROCEDIMENTO_ETAPAS_MARCADAS.size} / ${totalEtapas}`;
}

window.marcarEtapaProcedimento = function(etapaId, marcada) {
    if (marcada) PROCEDIMENTO_ETAPAS_MARCADAS.add(etapaId);
    else PROCEDIMENTO_ETAPAS_MARCADAS.delete(etapaId);
    const totalEtapas = PROCEDIMENTO_ATUAL ? PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao).length : 0;
    atualizarProgressoProcedimento(totalEtapas);
};

window.fecharModalProcedimento = function() {
    const modal = document.getElementById('modal-procedimento');
    if (modal) modal.classList.add('hidden');
    PROCEDIMENTO_ATUAL = null;
    PROCEDIMENTO_ETAPAS_MARCADAS = new Set();
};

window.concluirProcedimento = async function() {
    if (!verificarAcesso()) return;
    if (!PROCEDIMENTO_ATUAL) return;

    const etapasReais = PROCEDIMENTO_ATUAL.etapas.filter(e => !e.secao);
    const totalEtapas = etapasReais.length;
    const marcadas = PROCEDIMENTO_ETAPAS_MARCADAS.size;

    if (marcadas < totalEtapas) {
        const continuar = confirm(`Só ${marcadas} de ${totalEtapas} etapas foram marcadas. Concluir mesmo assim?`);
        if (!continuar) return;
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/procedimento/executar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: PROCEDIMENTO_ATUAL.area,
                procedimento_id: PROCEDIMENTO_ATUAL.id,
                procedimento_nome: PROCEDIMENTO_ATUAL.nome,
                etapas_marcadas: Array.from(PROCEDIMENTO_ETAPAS_MARCADAS),
                total_etapas: totalEtapas,
                concluido: true,
                operador
            })
        });

        if (!resp.ok) {
            alert('Não foi possível registrar a conclusão do procedimento.');
            return;
        }

        if (typeof registrarHistorico === 'function') {
            registrarHistorico(`OFICINA-${PROCEDIMENTO_ATUAL.area.toUpperCase()}`, `📋 Procedimento concluído: ${PROCEDIMENTO_ATUAL.nome} (${marcadas}/${totalEtapas} etapas).`);
        }

        alert(`✅ Procedimento "${PROCEDIMENTO_ATUAL.nome}" concluído!`);
        window.fecharModalProcedimento();
    } catch (e) {
        console.error('⚠️ Erro ao registrar conclusão do procedimento:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// --------------------------------------------------------------
// EDITAR ATIVIDADE — reaproveita o formulário de "Nova Atividade".
// Ao clicar em editar, o formulário é preenchido com os dados atuais
// e o botão vira "Salvar Edição" até confirmar ou cancelar.
// --------------------------------------------------------------
window.editarAtividadeOficina = function(id) {
    const atividade = OFICINA_ATIVIDADES_CACHE.find(x => x.id === id);
    if (!atividade) return;

    OFICINA_EDITANDO_ID = id;

    // Tipo (equipamento x avulsa) + equipamento selecionado
    window.alternarTipoAtividadeOficina(atividade.equipamento_id ? 'equipamento' : 'avulsa');
    const selectEquip = document.getElementById('area-oficina-equipamento');
    if (selectEquip && atividade.equipamento_id) selectEquip.value = atividade.equipamento_id;

    document.getElementById('area-oficina-descricao').value = atividade.descricao || '';
    document.getElementById('area-oficina-prioridade').value = atividade.prioridade || 'Normal';
    document.getElementById('area-oficina-prazo').value = atividade.prazo || '';
    document.getElementById('area-oficina-data-inicio').value = atividade.data_inicio || '';

    // Responsável: tenta achar na equipe carregada; se não achar
    // (pessoa não está no roster, ou já não existe mais), cai pro
    // campo "Outro" com o nome tal como estava salvo.
    const selectResp = document.getElementById('area-oficina-responsavel-select');
    const respExiste = atividade.responsavel && OFICINA_EQUIPE_ATUAL.some(p => p.nome === atividade.responsavel);
    if (selectResp) {
        if (respExiste) {
            selectResp.value = atividade.responsavel;
            window.alternarResponsavelOficina();
        } else if (atividade.responsavel) {
            selectResp.value = '__outro__';
            window.alternarResponsavelOficina();
            document.getElementById('area-oficina-responsavel-outro').value = atividade.responsavel;
        } else {
            selectResp.value = '';
            window.alternarResponsavelOficina();
        }
    }

    // Foto: se já tinha uma, mostra no preview (mantém se não mexer)
    OFICINA_FOTO_BASE64 = atividade.foto_base64 || null;
    const preview = document.getElementById('area-oficina-foto-preview');
    const previewContainer = document.getElementById('area-oficina-foto-preview-container');
    if (OFICINA_FOTO_BASE64) {
        if (preview) preview.src = OFICINA_FOTO_BASE64;
        if (previewContainer) previewContainer.classList.remove('hidden');
    } else {
        if (preview) preview.src = '';
        if (previewContainer) previewContainer.classList.add('hidden');
    }

    // Muda a cara do formulário pra deixar claro que é uma edição
    document.getElementById('area-oficina-form-titulo').textContent = 'Editar Atividade';
    document.getElementById('area-oficina-form-icone').className = 'fas fa-pen';
    document.getElementById('area-oficina-btn-texto').textContent = 'Salvar Edição';
    document.getElementById('area-oficina-btn-icone').className = 'fas fa-save';
    document.getElementById('area-oficina-btn-cancelar').classList.remove('hidden');

    document.getElementById('area-oficina-descricao')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelarEdicaoAtividadeOficina = function() {
    OFICINA_EDITANDO_ID = null;
    document.getElementById('area-oficina-form-titulo').textContent = 'Nova Atividade';
    document.getElementById('area-oficina-form-icone').className = 'fas fa-plus';
    document.getElementById('area-oficina-btn-texto').textContent = 'Lançar Atividade';
    document.getElementById('area-oficina-btn-icone').className = 'fas fa-check';
    document.getElementById('area-oficina-btn-cancelar').classList.add('hidden');
};

async function carregarNotaAreaOficina(chave) {
    const textarea = document.getElementById('area-oficina-notas');
    const statusEl = document.getElementById('area-oficina-notas-status');
    if (!textarea) return;
    textarea.value = '';
    if (statusEl) statusEl.textContent = '';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/nota/${encodeURIComponent(chave)}`, { cache: 'no-store' });
        if (!resp.ok) return;
        const nota = await resp.json();
        textarea.value = nota?.texto || '';
        if (statusEl && nota?.atualizado_em) statusEl.textContent = `Última atualização: ${nota.atualizado_em}`;
    } catch (e) {
        console.error('⚠️ Não consegui carregar as anotações da área:', e);
    }
}

window.salvarNotaAreaOficina = async function() {
    if (!OFICINA_AREA_ATUAL) return;
    const textarea = document.getElementById('area-oficina-notas');
    const statusEl = document.getElementById('area-oficina-notas-status');
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/nota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: OFICINA_AREA_ATUAL, texto: textarea.value, operador })
        });
        if (statusEl) statusEl.textContent = `Salvo agora (${new Date().toLocaleTimeString('pt-BR')})`;
    } catch (e) {
        console.error('⚠️ Não consegui salvar as anotações da área:', e);
        if (statusEl) statusEl.textContent = '⚠️ Não foi possível salvar — verifique sua internet.';
    }
};

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

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    // 🔧 CORREÇÃO: antes esses tipos caíam no fallback genérico e abriam
    // o folhão MCC4 (Molde/Bender) por engano — checklist errado. Os 3
    // grupos usam o mesmo checklist entre si (documento oficial), só
    // muda a tolerância de GAP e a lista de materiais.
    //
    // 🔧 CORREÇÃO 2 (o "Concluir" não tirava a peça da Oficina/Reparo,
    // mesmo pra peças de Grupo já reconhecidas aqui): o cadastro manual
    // no Estoque Reserva usa o tipo "Segmento Grupo 1/2/3" (com a
    // palavra "Segmento" na frente — ver as <option> em app.html), mas
    // esta checagem só reconhecia "Grupo 1/2/3" (sem "Segmento"), que é
    // como as peças ORIGINAIS da planilha ficam depois de traduzidas
    // (traduzirTipo, em banco.js). Uma peça de Grupo cadastrada pelo
    // técnico (e não importada da planilha original) nunca batia aqui,
    // caía no fallback genérico (folhão de Molde/Bender, sem noção
    // nenhuma de "concluir e voltar pra reserva" desse tipo de peça) —
    // por isso o "Concluir" parecia não fazer nada.
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.abrirFolhaoSegmentoGrupo === 'function') {
            window.abrirFolhaoSegmentoGrupo(id);
            return;
        }
        console.warn('Folhão Segmento Grupo não implementado.');
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
};

// ==========================================================================
// 🆕 PRÉ-VISUALIZAR — chamado direto do painel "Teste de Folhões"
// (renderPainelDevTeste), não de dentro do Folhão nem da tela do
// Checklist de Execução. Pedido do técnico: antes só dava pra
// conferir o documento final abrindo o Folhão na mão e clicando num
// botão lá dentro — queria isso junto do "Abrir Folhão" já existente
// nesse painel de teste.
//
// Abre o Folhão certo pro tipo do equipamento (populado com o rascunho
// + o que já foi preenchido no Checklist de Execução, igual o botão
// "Folhão" já faz) e, assim que terminar de carregar, dispara a
// pré-visualização sozinho — sem precisar clicar em mais nada.
window.previsualizarFolhaoDoReparo = async function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) { alert('Equipamento não encontrado.'); return; }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // Molde MCC4, Molde MCC2/3 e Horizontal têm pré-visualização própria.
    // Os outros folhões ainda não têm uma função previsualizarFolhaoX
    // equivalente — adicionar aqui conforme cada área ganhar a sua.
    if (tipo === 'Molde' && mcc !== '2/3' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoMolde4 === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoMolde4();
        return;
    }
    if (tipo === 'Molde' && mcc === '2/3' && typeof window.abrirFolhaoMolde23 === 'function' && typeof window.previsualizarFolhaoMolde23 === 'function') {
        await window.abrirFolhaoMolde23(id);
        window.previsualizarFolhaoMolde23();
        return;
    }
    if (tipo === 'Horizontal' && typeof window.abrirFolhaoHorizontal === 'function' && typeof window.previsualizarFolhaoHorizontal === 'function') {
        await window.abrirFolhaoHorizontal(id);
        window.previsualizarFolhaoHorizontal();
        return;
    }
    if (tipo === 'Bow' && typeof window.abrirFolhaoBow === 'function' && typeof window.previsualizarFolhaoBow === 'function') {
        await window.abrirFolhaoBow(id);
        window.previsualizarFolhaoBow();
        return;
    }
    // 🆕 Bender — mesmo gap que existia pro Straightener (ver abaixo):
    // abrirFolhaoMCC4 + previsualizarFolhaoBender já existem, só faltava
    // o caso aqui pra Pré-visualizar não cair no alert genérico.
    if (tipo === 'Bender' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoBender === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoBender();
        return;
    }
    // 🆕 Segmento Zero — mesmo gap do Bender/Straightener.
    if (tipo === 'Segmento Zero' && typeof window.abrirFolhaoSegmentoZero === 'function' && typeof window.previsualizarFolhaoSegZero === 'function') {
        await window.abrirFolhaoSegmentoZero(id);
        window.previsualizarFolhaoSegZero();
        return;
    }
    // 🆕 Cadeira Superior/Inferior (Desempenadeira) — mesmo gap.
    if ((tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') && typeof window.abrirFolhaoDesempenadeira === 'function' && typeof window.previsualizarFolhaoDesemp === 'function') {
        await window.abrirFolhaoDesempenadeira(id);
        window.previsualizarFolhaoDesemp();
        return;
    }
    // 🆕 Segmento Grupo 1/2/3 — mesmo gap.
    if (/^(Grupo|Segmento Grupo) [123]$/.test(tipo) && typeof window.abrirFolhaoSegmentoGrupo === 'function' && typeof window.previsualizarFolhaoSegGrupo === 'function') {
        await window.abrirFolhaoSegmentoGrupo(id);
        window.previsualizarFolhaoSegGrupo();
        return;
    }
    // 🆕 Straightener (R1 e R2) — mesma regra de identificação usada em
    // abrirFolhaoPorTipo (por id, já que os dois compartilham o tipo
    // canônico "Straightener").
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if ((tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) && typeof window.abrirFolhaoR1 === 'function' && typeof window.previsualizarFolhaoR1 === 'function') {
            await window.abrirFolhaoR1(id);
            window.previsualizarFolhaoR1();
            return;
        }
        if ((tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) && typeof window.abrirFolhaoR2 === 'function' && typeof window.previsualizarFolhaoR2 === 'function') {
            await window.abrirFolhaoR2(id);
            window.previsualizarFolhaoR2();
            return;
        }
    }

    alert('Pré-visualização ainda não disponível pra esse tipo de equipamento — use o botão "Folhão" pra conferir manualmente.');
};

// ==========================================================================
// 🆕 CONCLUIR E IMPRIMIR — POR TIPO. Chamado pelo botão "Concluir" do
// Checklist de Execução (renderizarBotaoConcluirReparo, em
// checklist-execucao.js), que ANTES chamava window.concluirEImprimirFolhaoMolde4
// direto, fixo — funcionava só pro Molde, ia quebrar (ou imprimir o
// Folhão errado) assim que outra área fosse cadastrada. Agora decide
// pelo tipo do equipamento, igual window.abrirFolhaoPorTipo já faz pro
// Folhão: se a área tiver uma função de conclusão própria, usa ela; se
// não tiver ainda, cai na genérica (window.concluirEImprimirFolhaoGenerico,
// em folhaoMolde4.js) até que uma específica seja implementada.
// ==========================================================================
window.concluirEImprimirFolhaoPorTipo = function(id) {
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        console.warn(`Concluir: equipamento ${id} não encontrado no BANCO_ATIVOS.`);
        return;
    }
    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ---- MOLDE MCC4 (e Molde sem MCC 2/3) ----
    if (tipo === 'Molde' && mcc !== '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde4 === 'function') {
            window.concluirEImprimirFolhaoMolde4(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.concluirEImprimirFolhaoBow === 'function') {
            window.concluirEImprimirFolhaoBow(id);
            return;
        }
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.concluirEImprimirFolhaoHorizontal === 'function') {
            window.concluirEImprimirFolhaoHorizontal(id);
            return;
        }
    }

    // ---- STRAIGHTENER (R1 e R2) — mesma regra de identificação do
    // abrirFolhaoPorTipo, pra Concluir abrir o mesmo laudo que foi salvo.
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.concluirEImprimirFolhaoR1 === 'function') {
                window.concluirEImprimirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.concluirEImprimirFolhaoR2 === 'function') {
                window.concluirEImprimirFolhaoR2(id);
                return;
            }
        }
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.concluirEImprimirFolhaoDesemp === 'function') {
            window.concluirEImprimirFolhaoDesemp(id);
            return;
        }
    }

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.concluirEImprimirFolhaoSegmentoGrupo === 'function') {
            window.concluirEImprimirFolhaoSegmentoGrupo(id);
            return;
        }
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.concluirEImprimirFolhaoSegmentoZero === 'function') {
            window.concluirEImprimirFolhaoSegmentoZero(id);
            return;
        }
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.concluirEImprimirFolhaoBender === 'function') {
            window.concluirEImprimirFolhaoBender(id);
            return;
        }
    }

    // ---- QUALQUER OUTRO TIPO (e o que faltar implementar) ----
    // Ainda sem função de conclusão própria — usa a genérica, que faz a
    // mesma coisa (busca o laudo salvo, manda pra Reserva, imprime) sem
    // nada fixo de Molde. Quando uma área precisar de regra diferente,
    // cria window.concluirEImprimirFolhaoX e adiciona um bloco aqui, no
    // mesmo padrão dos blocos de cima.
    if (typeof window.concluirEImprimirFolhaoGenerico === 'function') {
        window.concluirEImprimirFolhaoGenerico(id);
        return;
    }

    console.warn(`Concluir: nenhuma função de conclusão disponível para o tipo "${tipo}".`);
};
// ==========================================================================
// MÓDULO INTELIGENTE: APONTAMENTO DIÁRIO E DESCONTO DE VIDA ÚTIL EM LOTE
// ==========================================================================

window.abrirModalProducao = function() {
    document.getElementById("prod-mcc2").value = "";
    document.getElementById("prod-mcc3").value = "";
    document.getElementById("prod-mcc4").value = "";
    document.getElementById("modal-producao-diaria").classList.remove("hidden");
};

window.fecharModalProducao = function() {
    document.getElementById("modal-producao-diaria").classList.add("hidden");
};

// ==============================================================
// 1. FUNÇÕES VISUAIS E NAVEGAÇÃO DA INTERFACE
// ==============================================================
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) sidebar.classList.toggle('open');
};

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    localStorage.setItem('oms_theme_local', isLight ? 'light' : 'dark');
    if (icon && text) {
        icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
        text.innerText = isLight ? 'Modo Escuro' : 'Modo Claro';
    }
};

window.fazerLogout = function() {
    // Visitante não tem "turno" — some sem perguntar, é só um "voltar".
    const ehVisitante = OPERADOR_LOGADO && OPERADOR_LOGADO.visitante;
    const mensagem = ehVisitante ? null : "Tem certeza que deseja encerrar o turno?";

    if (ehVisitante || confirm(mensagem)) {
        // 🔧 Resgatado de uma versão duplicada/morta desta função (ver
        // correção do bug do abrirAba() duplicado, no mesmo commit) —
        // registra o encerramento de turno na Auditoria, igual sempre
        // deveria ter feito.
        if (!ehVisitante && typeof registrarHistorico === 'function') {
            registrarHistorico("SISTEMA", "Turno encerrado.");
        }
        localStorage.removeItem("oms_operador_v32_local");
        window.location.reload();
    }
};

window.abrirAba = function(event, idAba) {
    if (event) event.preventDefault();

    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }
    
    const abaDestino = document.getElementById(idAba);
    if (abaDestino) abaDestino.classList.add("active");

    if (idAba === "aba-mcc2" && typeof renderizarGraficosMCC === 'function') renderizarGraficosMCC(2);
    if (idAba === "aba-mcc3" && typeof renderizarGraficosMCC === 'function') renderizarGraficosMCC(3);
    if (idAba === "aba-mcc4" && typeof renderizarGraficosMCC === 'function') renderizarGraficosMCC(4);
    if (idAba === "aba-reparos" && typeof renderReparos === 'function') renderReparos();
    if (idAba === "aba-reparos" && typeof window.atualizarRascunhosAtivos === 'function') window.atualizarRascunhosAtivos();
    if (idAba === "aba-reparos" && typeof window.trocarAbaReparo === 'function') window.trocarAbaReparo(null, "reparo-sub-iniciar");
    if (idAba === "aba-reservas" && typeof renderReservas === 'function') renderReservas();
    if (idAba === "aba-rolos" && typeof renderRolos === 'function') renderRolos();
    if (idAba === "aba-hidraulica" && typeof renderHidraulica === 'function') renderHidraulica();
    if (idAba === "aba-almoxarifado" && typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();
    if (idAba === "aba-historico" && typeof renderHistorico === 'function') renderHistorico();
    // 🔧 CORREÇÃO CRÍTICA ("Registro Recente e Administração não
    // abriam/carregavam nada"): existiam DUAS funções abrirAba() no
    // arquivo — uma delas (mais antiga, sem "window." na declaração)
    // nunca chegava a rodar de verdade, porque a segunda (esta aqui,
    // definida depois) sobrescrevia window.abrirAba primeiro. Toda vez
    // que eu editava a função errada (a de cima), a mudança nunca tinha
    // efeito nenhum na tela — por isso as abas novas pareciam "mortas"
    // mesmo com o código certo escrito. A duplicada foi removida, e os
    // gatilhos que faltavam (Registro Recente e Administração) foram
    // trazidos pra cá, na função que realmente executa.
    if (idAba === "aba-registro-recente" && typeof window.renderRegistroRecenteCompleto === 'function') window.renderRegistroRecenteCompleto();
    if (idAba === "aba-admin-colaboradores" && typeof window.carregarAdminColaboradores === 'function') window.carregarAdminColaboradores();
    if (idAba === "aba-painel" && typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    if (idAba === "aba-ativos" && typeof renderAtivos === 'function') renderAtivos();
    if (idAba === "aba-fluxo" && typeof renderPainelVeios === 'function') renderPainelVeios();
    if (idAba === "aba-tecnico" && typeof renderPainelTecnico === 'function') renderPainelTecnico();
    if (idAba === "aba-oficina" && typeof carregarOficina === 'function') {
        carregarOficina();
        if (typeof carregarCatalogoMateriaisOficina === 'function') carregarCatalogoMateriaisOficina();
    }
    if (idAba === "aba-ocorrencia" && typeof window.renderAbaOcorrencia === 'function') window.renderAbaOcorrencia();
    if (idAba === "aba-ordens-servico" && typeof window.carregarListaOrdensServico === 'function') {
        popularSelectAreaOficina("os-area");
        window.carregarListaOrdensServico();
    }
    if (idAba === "aba-notificacoes" && typeof window.carregarCentralNotificacoes === 'function') {
        window.carregarCentralNotificacoes();
    } else if (typeof window.pararPollingCentralNotificacoes === 'function') {
        // Saiu da Central de Notificações pra outra aba — para o
        // polling na hora, não espera o próximo tick de 30s pra notar.
        window.pararPollingCentralNotificacoes();
    }
    if (idAba === "aba-qualidade" && typeof window.renderAbaQualidade === 'function') window.renderAbaQualidade();
    if (idAba === "aba-painel-adm" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('adm');
    if (idAba === "aba-painel-almoxarifado" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('almoxarifado');
    if (idAba === "aba-painel-ponte-rolante" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('ponte-rolante');
    if (idAba === "aba-painel-logistica" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('logistica');
    
    if (idAba === "aba-producao") {
        if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
        if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
    }

    const selVeios = document.getElementById("seletor-veios-container");
    if (selVeios) {
        if (idAba === "aba-fluxo" || idAba === "aba-ativos") selVeios.classList.remove("hidden");
        else selVeios.classList.add("hidden");
    }

    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar-menu');
        if(sidebar) sidebar.classList.remove('open');
    }
};

// ==============================================================
// 2. CONEXÃO COM O PYTHON 
// ==============================================================
window.carregarAtivosDoPython = async function() {
 
    console.log("🔄 Conectando ao Banco de Dados Python...");
    const atualizou = await sincronizarAtivosReaisMCC4();
    if (atualizou) {
        console.log(`✨ Tela atualizada! ${BANCO_ATIVOS.length} peças carregadas.`);
    } else {
        console.warn("⚠️ Python Offline. Usando dados locais.");
    }
    return atualizou;
};

// ==============================================================
// 3. APONTAMENTO DE PRODUÇÃO GERAL E MOLDES
// ==============================================================
window.processarProducaoDiaria = async function() {
    if (!window.verificarAcesso()) return;

    const prodMcc2 = parseFloat(document.getElementById("prod-mcc2").value) || 0;
    const prodMcc3 = parseFloat(document.getElementById("prod-mcc3").value) || 0;
    const prodMcc4 = parseFloat(document.getElementById("prod-mcc4").value) || 0;

    if (prodMcc2 === 0 && prodMcc3 === 0 && prodMcc4 === 0) return alert("⚠️ Digite a produção de pelo menos uma máquina.");

    const btn = document.querySelector("#aba-producao .btn-success");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> ATUALIZANDO...";

    let pecasAtualizadas = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        if (p.status === "Instalado" && p.tipo && !p.tipo.toUpperCase().includes("MOLDE")) {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && prodMcc2 > 0) { p.ton = (p.ton || 0) + prodMcc2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && prodMcc3 > 0) { p.ton = (p.ton || 0) + prodMcc3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && prodMcc4 > 0) { p.ton = (p.ton || 0) + prodMcc4; sofreuDesgaste = true; }
            if (sofreuDesgaste) pecasAtualizadas++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchComRetry(`${apiBase}/api/apontar_producao_geral`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: prodMcc2, qtd_mcc3: prodMcc3, qtd_mcc4: prodMcc4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("prod-mcc2").value = ""; document.getElementById("prod-mcc3").value = ""; document.getElementById("prod-mcc4").value = "";
            
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ Sucesso Absoluto!\n${pecasAtualizadas} equipamentos gerais foram atualizados.`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com a API."); }

    btn.disabled = false; btn.innerHTML = textoOriginal;
};

window.salvarApontamentoMoldes = async function(event) {
    if (!window.verificarAcesso()) return;

    const m2 = parseInt(document.getElementById("molde-prod-mcc2").value) || 0;
    const m3 = parseInt(document.getElementById("molde-prod-mcc3").value) || 0;
    const m4 = parseInt(document.getElementById("molde-prod-mcc4").value) || 0;

    if (m2 === 0 && m3 === 0 && m4 === 0) return alert("Digite a quantidade de panelas.");

    const btn = event.currentTarget;
    const txtOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> Processando...";

    let moldesAtualizados = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        if (p.status === "Instalado" && p.tipo && p.tipo.toUpperCase().includes("MOLDE")) {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && m2 > 0) { p.ton = (p.ton || 0) + m2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && m3 > 0) { p.ton = (p.ton || 0) + m3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && m4 > 0) { p.ton = (p.ton || 0) + m4; sofreuDesgaste = true; }
            if (sofreuDesgaste) moldesAtualizados++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        const resposta = await fetchComRetry(`${apiBase}/api/apontar_moldes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: m2, qtd_mcc3: m3, qtd_mcc4: m4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("molde-prod-mcc2").value = ""; document.getElementById("molde-prod-mcc3").value = ""; document.getElementById("molde-prod-mcc4").value = "";
            
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ ${moldesAtualizados} Moldes foram atualizados com sucesso!`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com o Python."); }
    
    btn.disabled = false; btn.innerHTML = txtOriginal;
};

window.carregarHistoricoApontamentoGeral = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_geral`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-geral");
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // 🔥 Conversão de UTC para Horário Local (Brasília)
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T') + 'Z')
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1 
                    ? `<span style="color:var(--danger); font-weight:bold; font-size:10px;"><i class="fas fa-ban"></i> DESFEITO</span>` 
                    : `<button class="btn-outline-danger" style="padding: 2px 6px; font-size: 10px;" onclick="window.desfazerApontamentoGeral(${log.id})"><i class="fas fa-undo"></i></button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc2 > 0 ? '+'+log.qtd_mcc2 : '-'}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc3 > 0 ? '+'+log.qtd_mcc3 : '-'}</td><td style="color:#3b82f6; font-weight:bold;">${log.qtd_mcc4 > 0 ? '+'+log.qtd_mcc4 : '-'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6'>Nenhum lançamento.</td></tr>"; }
    } catch (e) { console.log(e); }
};


window.carregarHistoricoApontamentoMoldes = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_moldes`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-moldes");
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // 🔥 Conversão de UTC para Horário Local (Brasília)
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T') + 'Z')
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1 
                    ? `<span style="color:var(--danger); font-weight:bold; font-size:10px;"><i class="fas fa-ban"></i> DESFEITO</span>` 
                    : `<button class="btn-outline-danger" style="padding: 2px 6px; font-size: 10px;" onclick="window.desfazerApontamentoMolde(${log.id})"><i class="fas fa-undo"></i></button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc2 > 0 ? '+'+log.qtd_mcc2 : '-'}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc3 > 0 ? '+'+log.qtd_mcc3 : '-'}</td><td style="color:var(--warning); font-weight:bold;">${log.qtd_mcc4 > 0 ? '+'+log.qtd_mcc4 : '-'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6'>Nenhum lançamento.</td></tr>"; }
    } catch (e) { console.log(e); }
};

window.desfazerApontamentoGeral = async function(id_log) {
    if (prompt("AÇÃO RESTRITA: Digite a senha master:") !== "dev123") return alert("❌ Senha incorreta!");
    if (!confirm("Tem certeza? A tonelagem será RETIRADA de todas as peças instaladas.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_geral`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();
        
        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};

window.desfazerApontamentoMolde = async function(id_log) {
    if (prompt("AÇÃO RESTRITA: Digite a senha master:") !== "dev123") return alert("❌ Senha incorreta!");
    if (!confirm("Tem certeza? As corridas serão RETIRADAS dos moldes na linha.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_moldes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();
        
        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};



// ==============================================================
// 4. HISTÓRICO DE LAUDOS E SWAP
// ==============================================================
// 🔧 CORREÇÃO ("laudos só existiam no localStorage de quem gerava"):
// antes, o PDF do folhão ficava só no navegador de quem finalizava —
// sumia se limpasse os dados, e nunca aparecia pra outro técnico em
// outro aparelho, nem pra outro moderador na Auditoria. Agora persiste
// no Neon (tabela "laudos"), igual todo o resto do histórico.
window.salvarLaudoNoHistorico = async function(tag, tipo, htmlPDF) {
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peca_id: tag, tipo, html: htmlPDF, operador })
        });
        if (!resp.ok) throw new Error('A API não confirmou o salvamento do laudo.');
        const resultado = await resp.json();
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
        return resultado.id;
    } catch (e) {
        console.error('⚠️ Não consegui salvar o laudo no servidor:', e);
        return null;
    }
};

window.excluirLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir o laudo.');
            return;
        }
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
    } catch (e) {
        console.error('⚠️ Erro ao excluir laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.visualizarLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/${id}`, { cache: 'no-store' });
        if (!resp.ok) return alert('Laudo não encontrado.');
        const laudo = await resp.json();
        const win = window.open('', '_blank', 'width=1100,height=800');
        if (win) { win.document.write(laudo.html); win.document.close(); }
        else { const p = document.getElementById('print-content'); if (p) { p.innerHTML = laudo.html; window.print(); } }
    } catch (e) {
        console.error('⚠️ Erro ao carregar laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};


window.iniciarSwapAlocacao = async function(idReserva) {
    if (!window.verificarAcesso()) return;
    const veioSelect = document.getElementById(`alocar-veio-${idReserva}`);
    const posElement = document.getElementById(`alocar-pos-${idReserva}`);
    if (!veioSelect) return alert('Erro: campo de veio não encontrado.');

    const veio = veioSelect.value;
    let posicao = posElement ? posElement.value : '';
    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
    
    if (!pecaReserva) return alert('Peça reserva não encontrada.');
    if (!veio) return alert('Selecione o Veio de destino.');

    const tipoUpper = (pecaReserva.tipo || '').toUpperCase();
    const mcc = pecaReserva.mcc_compat || '4';
    
    let slotChassi = posicao;
    if (mcc === '4') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('BENDER')) slotChassi = 'BENDER';
        else if (tipoUpper.includes('STR-1') || tipoUpper.includes('STRAIGHTENER R1')) slotChassi = 'STR-1';
        else if (tipoUpper.includes('STR-2') || tipoUpper.includes('STRAIGHTENER R2')) slotChassi = 'STR-2';
        else if (tipoUpper.includes('BOW')) slotChassi = `BOW-${posicao}`;
        else if (tipoUpper.includes('HORIZONTAL')) slotChassi = `HOR-${posicao}`;
    } else if (mcc === '2/3') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('ZERO') || tipoUpper.includes('SEGMENTO ZERO')) slotChassi = 'SEG-ZERO';
        else if (tipoUpper.includes('CADEIRA SUPERIOR')) slotChassi = `CAD-SUP-${posicao}`;
        else if (tipoUpper.includes('CADEIRA INFERIOR')) slotChassi = `CAD-INF-${posicao}`;
        else if (tipoUpper.includes('SEGMENTO')) slotChassi = `SEG-${posicao}`;
    }

    if (!slotChassi || slotChassi === "") return alert('Selecione a Posição de destino para este equipamento.');

    // 🔧 CORREÇÃO CRÍTICA ("coloquei o Bow e ele expulsou o Molde que
    // tinha acabado de instalar"): a busca pela peça que já ocupa o
    // slot usava DOIS critérios — `p.posicaoFixa === slotChassi` OU
    // `p.id.includes(slotChassi)`. O segundo critério (substring no ID)
    // era uma tentativa antiga de cobrir peças sem posicaoFixa
    // confiável — mas hoje toda peça instalada TEM posicaoFixa
    // confiável (essa é literalmente a correção que fizemos nas últimas
    // rodadas). Esse segundo critério agora só serve pra gerar falso
    // positivo: como as peças de Estoque Reserva podem ter QUALQUER tag
    // digitada pelo técnico, era só o ID de alguma peça já instalada
    // (ex: o Molde) conter, por coincidência, os mesmos caracteres do
    // slotChassi sendo procurado (ex: "BOW-1") pra ela ser encontrada
    // por engano e expulsa do lugar certo dela.
    let pecaAntiga = null;
    for (const p of BANCO_ATIVOS) {
        if ((p.veio === veio && p.status === "Instalado") || (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"))) {
            if (p.posicaoFixa === slotChassi) { pecaAntiga = p; break; }
        }
    }

    if (pecaAntiga) {
        if (confirm(`A peça ${pecaAntiga.id} será SACADA do slot ${slotChassi} (Veio ${veio}) para dar lugar à ${pecaReserva.id}.`)) {
            pecaAntiga.status = "Oficina / Reparo"; pecaAntiga.local = "Oficina / Reparo";
            pecaAntiga.veio = ""; pecaAntiga.posicaoFixa = ""; pecaAntiga.pos = ""; pecaAntiga.dataReparo = Date.now(); pecaAntiga.dias = 0; pecaAntiga.dataEntradaVeio = null;
            pecaAntiga.substituidoPor = pecaReserva.id;

            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`; pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            // Persiste as duas peças no banco Postgres (a que saiu e a que entrou)
            if (typeof salvarPecaNoPython === 'function') {
                await salvarPecaNoPython(pecaAntiga);
                await salvarPecaNoPython(pecaReserva);
            }
            
            if (window.registrarHistorico) {
                const agora = new Date().toLocaleDateString('pt-BR');
                // 🔧 CORREÇÃO ("evento de instalação não aparece no
                // Prontuário"): ver nota grande em registrarHistorico()
                // — agora espera o registro terminar de salvar no banco
                // ANTES de liberar o alert() de sucesso, pra evitar que o
                // técnico troque de tela rápido demais e a chamada seja
                // abandonada antes de terminar.
                await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} em ${agora} (substituiu ${pecaAntiga.id}). Contagem de dias na máquina reiniciada.`);
                await window.registrarHistorico(pecaAntiga.id, `📤 Saiu do slot ${slotChassi} do Veio ${veio} em ${agora}, substituída por ${pecaReserva.id}. Foi para reparo — contagem de dias em reparo reiniciada.`);
            }
            if (typeof renderReparos === 'function') renderReparos(); if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos(); if (typeof renderPainelVeios === 'function') renderPainelVeios();
            alert(`✅ Swap realizado! ${pecaReserva.id} instalado.`);
        }
    } else {
        if (confirm(`Instalar a reserva ${pecaReserva.id} no slot ${slotChassi} do Veio ${veio}?`)) {
            pecaReserva.local = `MCC ${mcc} - Veio ${veio}`; pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            if (typeof salvarPecaNoPython === 'function') {
                await salvarPecaNoPython(pecaReserva);
            }

            // 🔧 Ver correção em registrarHistorico(): espera terminar de
            // salvar antes do alert() de sucesso liberar o técnico.
            if (window.registrarHistorico) await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} (gaveta vazia). Contagem de dias na máquina reiniciada.`);
            
            if (typeof renderReparos === 'function') renderReparos(); if (typeof renderReservas === 'function') renderReservas();
            if (typeof renderAtivos === 'function') renderAtivos(); if (typeof renderPainelVeios === 'function') renderPainelVeios();
            alert(`✅ ${pecaReserva.id} instalado com sucesso!`);
        }
    }
};

window.forcarCamposPosicao = function() {
    const rows = document.querySelectorAll('#estoque-table-body tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const posCell = cells[4]; const tagId = cells[0]?.textContent?.trim();
            if (tagId && !posCell.querySelector('input') && !posCell.querySelector('select')) {
                const input = document.createElement('input'); input.type = 'number'; input.id = `pos-${tagId}`; input.placeholder = 'Pos'; input.min = 1; input.max = 99;
                input.style.cssText = 'width:55px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#1a1a2e; color:#fff; text-align:center;';
                posCell.innerHTML = ''; posCell.appendChild(input);
            }
        }
    });
};

// ==============================================================
// 5. LAUDOS EM PDF E PONTES GLOBAIS (Conecta o HTML ao JS)
// ==============================================================
function getLaudosSalvos() {
    return JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
}
window.getLaudosSalvos = getLaudosSalvos;

// Reconectando as funções principais da tela (A Ponte)
if (typeof mudarVeioVisualizado !== 'undefined') window.mudarVeioVisualizado = mudarVeioVisualizado;
if (typeof renderHistorico !== 'undefined') window.renderHistorico = renderHistorico;
if (typeof carregarOficina !== 'undefined') window.carregarOficina = carregarOficina;
if (typeof renderizarGraficosMCC !== 'undefined') window.renderizarGraficosMCC = renderizarGraficosMCC;
if (typeof atualizarPainelCompleto !== 'undefined') window.atualizarPainelCompleto = atualizarPainelCompleto;
// 🔧 CORREÇÃO: renderAtivos, renderReparos e renderPainelVeios eram
// definidos aqui em cima, mas nunca chegavam a virar window.X —
// diferente de calcularKpisGlobais (linha abaixo), que já tinha essa
// atribuição. Como o resto do sistema todo chama essas 3 funções via
// "if (typeof window.renderX === 'function') window.renderX()" (em
// mais de 10 lugares, incluindo depois de excluir peça, cadastrar,
// saque, swap...), essa checagem sempre dava falso e a tela de
// Ativos/Reparos/Painel de Veios nunca era re-renderizada sozinha
// depois dessas ações — só atualizava se a página fosse recarregada
// na mão. Agora ficam expostas certinho, igual as outras.
if (typeof renderAtivos !== 'undefined') window.renderAtivos = renderAtivos;
if (typeof renderReparos !== 'undefined') window.renderReparos = renderReparos;
if (typeof renderPainelVeios !== 'undefined') window.renderPainelVeios = renderPainelVeios;
if (typeof verificarAcesso !== 'undefined') window.verificarAcesso = verificarAcesso;
// 🔧 CORREÇÃO CRÍTICA (checklist voltava pro login sozinho): o
// checklist-execucao.js importa este script.js SEM o "?v=27" que o
// app.html usa — pro navegador isso é uma URL diferente, então ele
// carrega uma SEGUNDA CÓPIA inteira deste arquivo, com seu próprio
// OPERADOR_LOGADO isolado, que o login de verdade nunca atualiza.
// Qualquer coisa importada via "import { X } from '../script.js'" por
// outro arquivo pode estar pegando essa cópia fantasma. A correção é
// nunca depender de um import direto pra essas informações — sempre
// ler de window.*, que sempre aponta pra cópia real (a que de fato
// roda os cliques da tela), não importa quantas cópias fantasmas
// existam por aí.
window.MATRICULAS_ADM = MATRICULAS_ADM;
window.getOficinaEquipeAtual = function() { return OFICINA_EQUIPE_ATUAL; };
if (typeof entrarComoVisitante !== 'undefined') window.entrarComoVisitante = entrarComoVisitante;
if (typeof processarAutenticacaoHome !== 'undefined') window.processarAutenticacaoHome = processarAutenticacaoHome;
window.setOperadorLogado = function(op) {
    OPERADOR_LOGADO = op;
    // 🔧 CORREÇÃO: banco.js tem sua PRÓPRIA cópia de OPERADOR_LOGADO,
    // separada dessa aqui — checklist-execucao.js, folhaoMolde4.js e a
    // ponte com o Folhão importam a cópia de lá, não essa. Sem essa
    // linha, um login feito NESSA sessão (sem recarregar a página)
    // nunca chegava na cópia do banco.js, e por isso, por exemplo,
    // ehAdminChecklistExecucao() sempre via a pessoa como "não ADM"
    // (matrícula vazia/null), escondendo os botões de mover/editar/
    // excluir etapa mesmo pra quem realmente é ADM.
    setOperadorBanco(op);
};
window.getOperadorLogado = function() { return OPERADOR_LOGADO; };
if (typeof abrirCriticos !== 'undefined') window.abrirCriticos = abrirCriticos;
if (typeof abrirHistoricoIndividual !== 'undefined') window.abrirHistoricoIndividual = abrirHistoricoIndividual;
if (typeof fecharModalHistorico !== 'undefined') window.fecharModalHistorico = fecharModalHistorico;
if (typeof salvarRegistroManual !== 'undefined') window.salvarRegistroManual = salvarRegistroManual;
if (typeof iniciarSaque !== 'undefined') window.iniciarSaque = iniciarSaque;
if (typeof confirmarRelatorio !== 'undefined') window.confirmarRelatorio = confirmarRelatorio;
if (typeof fecharModalRelatorio !== 'undefined') window.fecharModalRelatorio = fecharModalRelatorio;
if (typeof fazerCelulaEditavel !== 'undefined') window.fazerCelulaEditavel = fazerCelulaEditavel;
if (typeof alterarSaldoRolo !== 'undefined') window.alterarSaldoRolo = alterarSaldoRolo;
if (typeof renderHidraulica !== 'undefined') window.renderHidraulica = renderHidraulica;
if (typeof alterarSaldoHidraulica !== 'undefined') window.alterarSaldoHidraulica = alterarSaldoHidraulica;
if (typeof ajustarSaldoMaterial !== 'undefined') window.ajustarSaldoMaterial = ajustarSaldoMaterial;
if (typeof removerMaterial !== 'undefined') window.removerMaterial = removerMaterial;
if (typeof toggleFormMaterial !== 'undefined') window.toggleFormMaterial = toggleFormMaterial;
if (typeof salvarEntradaMaterial !== 'undefined') window.salvarEntradaMaterial = salvarEntradaMaterial;
if (typeof renderMateriais !== 'undefined') window.renderMateriais = renderMateriais;
if (typeof carregarMateriaisDoBackend !== 'undefined') window.carregarMateriaisDoBackend = carregarMateriaisDoBackend;

// ==============================================================
// 5. INICIALIZAÇÃO DA PÁGINA (START - LIVRE DE GOOGLE SHEETS)
// ==============================================================

// ==============================================================
// AUTO-REFRESH DOS CONTADORES DE DIAS
// ==============================================================
// Como "dias" agora é sempre calculado na hora (a partir de
// dataEntradaVeio / dataReparo), basta re-renderizar as telas que
// mostram esse número de tempos em tempos pra ele ficar sempre em dia
// mesmo se o técnico deixar a aba aberta passando da meia-noite.
setInterval(() => {
    const abaAtiva = document.querySelector('.tab-content.active');
    const idAtivo = abaAtiva ? abaAtiva.id : null;
    if (idAtivo === 'aba-ativos' && typeof renderAtivos === 'function') renderAtivos();
    if (idAtivo === 'aba-reparos' && typeof renderReparos === 'function') renderReparos();
    if (idAtivo === 'aba-fluxo' && typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof atualizarKPIsAvancados === 'function') atualizarKPIsAvancados();
}, 15 * 60 * 1000); // a cada 15 minutos

// ==============================================================
// EFEITO RIPPLE GLOBAL (botões premium, outline-danger, auth)
// ==============================================================
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-premium, .btn-outline-danger, .btn-auth');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const tamanho = Math.max(rect.width, rect.height);
    const raio = tamanho / 2;
    const onda = document.createElement('span');
    onda.className = 'ui-ripple';
    onda.style.width = onda.style.height = tamanho + 'px';
    onda.style.left = (e.clientX - rect.left - raio) + 'px';
    onda.style.top = (e.clientY - rect.top - raio) + 'px';
    const posicaoOriginal = getComputedStyle(btn).position;
    if (posicaoOriginal === 'static') btn.style.position = 'relative';
    btn.appendChild(onda);
    setTimeout(() => onda.remove(), 550);
});

// ==========================================
// 🆕 FILA OFFLINE — se salvar algo falhar por FALTA DE INTERNET (não
// por erro do servidor), a ação fica guardada no aparelho e é reenviada
// sozinha quando a conexão voltar. Cobre as ações de criar um registro
// novo mais usadas em campo: Ocorrência, OS, Entrada de Qualidade e
// Atividade da Oficina — onde o sinal costuma falhar no meio do uso.
// Ações de editar/mudar status não entram na fila (não são idempotentes
// o bastante pra reenviar sozinho sem risco de duplicar/confundir).
// ==========================================
const FILA_OFFLINE_KEY = 'oms_fila_offline_v1';

function lerFilaOffline() {
    try { return JSON.parse(localStorage.getItem(FILA_OFFLINE_KEY) || '[]'); }
    catch (e) { return []; }
}

function salvarFilaOffline(fila) {
    localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(fila));
    atualizarIndicadorFilaOffline();
}

function atualizarIndicadorFilaOffline() {
    const fila = lerFilaOffline();
    let indicador = document.getElementById('indicador-fila-offline');

    if (fila.length === 0) {
        if (indicador) indicador.classList.add('hidden');
        return;
    }

    if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'indicador-fila-offline';
        indicador.style.cssText = 'position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:var(--warning); color:#1a1200; font-weight:700; font-size:12px; padding:9px 16px; border-radius:20px; z-index:9500; box-shadow:0 4px 16px rgba(0,0,0,0.35); cursor:pointer; white-space:nowrap;';
        indicador.onclick = () => window.tentarReenviarFilaOffline();
        document.body.appendChild(indicador);
    }
    indicador.classList.remove('hidden');
    indicador.innerHTML = `<i class="fas fa-cloud-arrow-up"></i> ${fila.length} aguardando conexão — toque pra tentar agora`;
}

// Envia uma ação; se o fetch falhar por falta de conexão de verdade
// (não chegou nem a sair do aparelho — sem internet, DNS falhou etc),
// guarda na fila em vez de perder o que a pessoa preencheu. Um erro do
// SERVIDOR (400, 500...) não cai aqui — isso o código que chama trata
// normal, olhando "resp.ok", porque não adianta reenviar sozinho algo
// que o servidor já recusou.
async function enviarComFilaOffline(url, options, descricao) {
    try {
        const resp = await fetch(url, options);
        return { resp, enfileirado: false };
    } catch (e) {
        const fila = lerFilaOffline();
        fila.push({
            id: Date.now() + Math.random(),
            url, options, descricao,
            criado_em: new Date().toLocaleString('pt-BR')
        });
        salvarFilaOffline(fila);
        return { resp: null, enfileirado: true };
    }
}

window.tentarReenviarFilaOffline = async function() {
    let fila = lerFilaOffline();
    if (fila.length === 0) return;

    const restantes = [];
    let algumEnviado = false;

    for (const item of fila) {
        try {
            const resp = await fetch(item.url, item.options);
            if (resp.ok) {
                algumEnviado = true;
            } else {
                // Servidor respondeu mas recusou (ex: algo mudou nesse
                // meio tempo) — não adianta insistir sozinho, descarta
                // pra não travar o resto da fila esperando pra sempre.
                console.warn('⚠️ Ação da fila offline foi recusada pelo servidor:', item.descricao);
            }
        } catch (e) {
            // Ainda sem internet — mantém na fila pra tentar de novo.
            restantes.push(item);
        }
    }

    salvarFilaOffline(restantes);

    if (algumEnviado) {
        if (typeof window.carregarListaOcorrencias === 'function') window.carregarListaOcorrencias();
        if (typeof window.carregarListaOrdensServico === 'function') window.carregarListaOrdensServico();
        if (typeof window.carregarListaQualidade === 'function') window.carregarListaQualidade();
        if (typeof window.carregarOficina === 'function') window.carregarOficina();
    }
};

window.addEventListener('online', () => window.tentarReenviarFilaOffline());
setInterval(() => window.tentarReenviarFilaOffline(), 30000);
document.addEventListener('DOMContentLoaded', () => atualizarIndicadorFilaOffline());

// ==========================================
// 🆕 DESFAZER EXCLUSÃO — mostra um toast por alguns segundos com botão
// "Desfazer". Se a pessoa não clicar, a ação de exclusão de verdade
// (passada em aoConfirmar) roda sozinha ao final do tempo. Se clicar
// em desfazer, aoConfirmar NUNCA roda, e aoDesfazer (opcional) é
// chamado pra devolver o item na tela.
// ==========================================
function mostrarToastDesfazer(mensagem, aoConfirmar, aoDesfazer) {
    const SEGUNDOS = 5;
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; bottom:16px; left:50%; transform:translateX(-50%);
        background:#1f2937; color:#fff; font-size:13px; padding:10px 14px;
        border-radius:10px; z-index:9600; box-shadow:0 4px 16px rgba(0,0,0,0.4);
        display:flex; align-items:center; gap:12px; white-space:nowrap;
    `;
    toast.innerHTML = `
        <span>${mensagem}</span>
        <button type="button" style="background:none; border:1px solid #38bdf8; color:#38bdf8; border-radius:6px; padding:4px 10px; font-weight:700; font-size:12px; cursor:pointer;">Desfazer</button>
    `;
    document.body.appendChild(toast);

    let desfeito = false;
    const timeoutId = setTimeout(async () => {
        if (desfeito) return;
        toast.remove();
        await aoConfirmar();
    }, SEGUNDOS * 1000);

    toast.querySelector('button').onclick = () => {
        desfeito = true;
        clearTimeout(timeoutId);
        toast.remove();
        if (typeof aoDesfazer === 'function') aoDesfazer();
    };
}


// ==========================================
// ABA "REGISTRO DE OCORRÊNCIA"
// ==========================================
let FOTO_OCORRENCIA_BASE64 = null;
let FILTRO_OCORRENCIA_ATUAL = '';
let OCORRENCIA_CACHE = [];
let BUSCA_OCORRENCIA_ATUAL = '';

// 🆕 Preenche um <select> de área (TODAS as áreas de AREAS_OFICINA —
// oficina + administrativo, igual a Central de Áreas mostra as duas) —
// usado nos formulários de Ocorrência e OS, pra dar contexto de área
// nesses registros (sem isso a Central de Notificações não tem como
// saber onde a ocorrência/OS aconteceu). 🔧 CORREÇÃO: antes filtrava só
// tipo 'oficina', deixando de fora Almoxarifado/Ponte Rolante/ADM/
// Logística — uma ocorrência pode acontecer em qualquer uma delas.
function popularSelectAreaOficina(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select || select.dataset.preenchido) return;
    const grupos = [
        { label: 'Oficina', itens: AREAS_OFICINA.filter(a => a.tipo === 'oficina') },
        { label: 'Administrativo', itens: AREAS_OFICINA.filter(a => a.tipo === 'administrativo') },
    ];
    select.innerHTML = `<option value="">Não informar</option>` +
        grupos.map(g => `<optgroup label="${g.label}">${
            g.itens.map(a => `<option value="${a.chave}">${a.nome}</option>`).join("")
        }</optgroup>`).join("");
    select.dataset.preenchido = "1";
}

window.renderAbaOcorrencia = function() {
    const select = document.getElementById("ocorrencia-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    popularSelectAreaOficina("ocorrencia-area");
    window.carregarListaOcorrencias();
};

window.processarFotoOcorrencia = function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        alert('Por favor, escolha um arquivo de imagem.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const MAX_LADO = 1280;
            let largura = img.width;
            let altura = img.height;

            if (largura > altura && largura > MAX_LADO) {
                altura = Math.round((altura * MAX_LADO) / largura);
                largura = MAX_LADO;
            } else if (altura > MAX_LADO) {
                largura = Math.round((largura * MAX_LADO) / altura);
                altura = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, largura, altura);

            FOTO_OCORRENCIA_BASE64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('ocorrencia-foto-preview');
            const container = document.getElementById('ocorrencia-foto-preview-container');
            if (preview) preview.src = FOTO_OCORRENCIA_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoOcorrencia = function() {
    FOTO_OCORRENCIA_BASE64 = null;
    const preview = document.getElementById('ocorrencia-foto-preview');
    const container = document.getElementById('ocorrencia-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

window.confirmarOcorrencia = async function() {
    if (!verificarAcesso()) return;

    const equipamentoId = document.getElementById("ocorrencia-equipamento")?.value;
    const texto = document.getElementById("ocorrencia-texto")?.value.trim();
    const categoria = document.getElementById("ocorrencia-categoria")?.value || "Intervenção";
    const area = document.getElementById("ocorrencia-area")?.value || null;

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (!texto) return alert("Escreva a descrição.");

    const iconePorCategoria = {
        "Intervenção": "🔧",
        "Melhoria": "✨",
        "Comentário": "💬",
        "Atividade Pendente": "⏳"
    };
    const icone = iconePorCategoria[categoria] || "🔧";
    const acaoFormatada = `${icone} <span style="color:#eab308;">[${categoria.toUpperCase()}]</span> ${texto}`;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const { resp, enfileirado } = await enviarComFilaOffline(`${apiBase}/api/registro_com_foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                acao: acaoFormatada,
                operador: operador,
                categoria: categoria,
                foto_base64: FOTO_OCORRENCIA_BASE64 || null,
                area: area
            })
        }, `Ocorrência em ${equipamentoId}`);

        if (enfileirado) {
            document.getElementById("ocorrencia-texto").value = "";
            window.removerFotoOcorrencia();
            alert(`📴 Sem internet agora — a ${categoria.toLowerCase()} de [${equipamentoId}] foi guardada e será enviada sozinha assim que a conexão voltar.`);
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível salvar o registro.");
            return;
        }

        if (typeof registrarHistorico === 'function') {
            const evento = {
                data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR'),
                tag: equipamentoId,
                acao: acaoFormatada,
                responsavel: operador
            };
            HISTORICO_ACOES.unshift(evento);
            localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
            if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();
        }

        document.getElementById("ocorrencia-texto").value = "";
        window.removerFotoOcorrencia();

        alert(`✅ ${categoria} registrada em [${equipamentoId}]${FOTO_OCORRENCIA_BASE64 ? ' com foto' : ''}.`);
        window.carregarListaOcorrencias();
    } catch (e) {
        console.error('⚠️ Erro ao salvar ocorrência:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.filtrarOcorrencias = function(categoria, botaoClicado) {
    FILTRO_OCORRENCIA_ATUAL = categoria;
    document.querySelectorAll('#ocorrencia-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaOcorrencias();
};

window.carregarListaOcorrencias = async function() {
    const container = document.getElementById("ocorrencia-lista-container");
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_OCORRENCIA_ATUAL ? `?categoria=${encodeURIComponent(FILTRO_OCORRENCIA_ATUAL)}` : '';
        const resp = await fetch(`${apiBase}/api/registros_ocorrencia${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        OCORRENCIA_CACHE = await resp.json();
        window.renderizarListaOcorrencias();
    } catch (e) {
        console.error('⚠️ Erro ao carregar ocorrências:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

// 🆕 Busca por equipamento — filtra o que já foi carregado (não faz
// nova chamada à API), então funciona instantâneo enquanto digita.
window.buscarOcorrencias = function(texto) {
    BUSCA_OCORRENCIA_ATUAL = (texto || '').trim().toLowerCase();
    window.renderizarListaOcorrencias();
};

window.renderizarListaOcorrencias = function() {
    const container = document.getElementById("ocorrencia-lista-container");
    if (!container) return;

    const registros = BUSCA_OCORRENCIA_ATUAL
        ? OCORRENCIA_CACHE.filter(r => (r.peca_id || '').toLowerCase().includes(BUSCA_OCORRENCIA_ATUAL))
        : OCORRENCIA_CACHE;

    if (!Array.isArray(registros) || registros.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum registro encontrado${BUSCA_OCORRENCIA_ATUAL ? ' pra essa busca' : ''}.</div>`;
        return;
    }

    container.innerHTML = registros.map(r => `
        <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
            ${r.foto_base64 ? `
                <img src="${r.foto_base64}"
                     style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--border); cursor:pointer; flex-shrink:0;"
                     onclick="window.abrirFotoAmpliada('${r.foto_base64}', '${(r.operador || 'Sistema').replace(/'/g, "\\'")} — ${r.data_hora || ''}')"
                     title="${r.operador || 'Sistema'} — ${r.data_hora || ''}">
            ` : `
                <div style="width:70px; height:70px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-muted);">
                    <i class="fas fa-image" style="font-size:20px; opacity:0.4;"></i>
                </div>
            `}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${r.peca_id}</span>
                    <span style="font-size:11px; color:var(--text-muted);">${r.data_hora}</span>
                </div>
                <div style="font-size:13px; color:var(--text-body); margin-bottom:4px;">${r.acao}</div>
                <div style="font-size:11px; color:var(--text-accent);">${r.operador}${r.area ? ` · ${nomeAreaOficina(r.area)}` : ''}</div>
            </div>
        </div>
    `).join("");
};

// Nome legível de uma área (chave -> nome de AREAS_OFICINA), com
// fallback pra própria chave se não achar — usado nos registros de
// Ocorrência/OS (campo "area" opcional) e na Central de Notificações.
function nomeAreaOficina(chave) {
    const a = AREAS_OFICINA.find(x => x.chave === chave);
    return a ? a.nome : chave;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof carregarTema === 'function') carregarTema();
    console.log("🚀 Iniciando Sistema...");

    const atualizou = await window.carregarAtivosDoPython();
    if (typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();

    // 🔧 Rolos e Hidráulica agora vivem no Neon (antes só no localStorage
    // de cada colaborador). Sincroniza e já deixa a tela pronta se o
    // técnico for direto pra uma dessas abas.
    if (typeof sincronizarRolosReais === 'function') {
        await sincronizarRolosReais();
        if (typeof renderRolos === 'function') renderRolos();
    }
    if (typeof sincronizarHidraulicaReal === 'function') {
        await sincronizarHidraulicaReal();
        if (typeof renderHidraulica === 'function') renderHidraulica();
    }

    if (atualizou) {
        if (typeof renderPainelVeios === 'function') renderPainelVeios();
        if (typeof renderAtivos === 'function') renderAtivos();
        if (typeof renderReparos === 'function') renderReparos();
        if (typeof renderReservas === 'function') renderReservas();
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    } else {
        console.warn("⚠️ Python Offline ou Sem Dados. As abas podem estar vazias.");
    }

    // 🆕 Verifica se alguma atividade da Oficina passou do prazo sem
    // ser concluída e dispara notificação (sem travar o carregamento
    // do resto do app — roda em segundo plano). Cada atividade
    // atrasada só notifica 1 vez (controlado no backend).
    (async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/oficina/verificar_atrasos`, { method: 'POST' });
        } catch (e) {
            console.warn('⚠️ Não consegui verificar atividades atrasadas:', e);
        }
    })();
});
// ==============================================================
// CONTROLE DO FORMULÁRIO DE CADASTRO DE PEÇAS
// ==============================================================
window.toggleFormAdicionar = function() {
    // Busca o formulário que acabamos de criar no app.html
    const form = document.getElementById('form-novo-equipamento');
    
    if (form) {
        // Alterna entre mostrar e esconder (tira ou coloca a classe 'hidden')
        form.classList.toggle('hidden');
    } else {
        console.error("Formulário 'form-novo-equipamento' não encontrado no HTML!");
    }
};
// ==========================================
// 🆕 REGISTRO DE OS (Ordem de Serviço) — a OS real da CSN vem em várias
// páginas (cabeçalho, EPIs/ferramentas/operações, confirmação — ver
// exemplo real com 3 páginas), então o registro aceita VÁRIAS fotos por
// OS, uma por página. Cada foto passa pela mesma compressão já usada em
// Intervenção/Ocorrência (window.processarFotoOcorrencia).
// ==========================================
let FOTOS_OS_BASE64 = []; // array de fotos (páginas) da OS sendo cadastrada
let FILTRO_OS_ATUAL = '';
let BUSCA_OS_ATUAL = '';
let OS_CACHE = [];

function renderPreviewFotosOs() {
    const container = document.getElementById('os-fotos-preview-container');
    if (!container) return;

    if (FOTOS_OS_BASE64.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = FOTOS_OS_BASE64.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <span style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:1px 5px; border-radius:4px;">Pág. ${i + 1}</span>
            <button type="button" onclick="window.removerFotoOs(${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:11px; line-height:1;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Comprime UM arquivo de imagem e devolve o data URL via Promise —
// extraído pra poder ser usado em loop (várias fotos escolhidas de
// uma vez, ex: múltiplas páginas selecionadas juntas na galeria).
function comprimirFotoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        if (!arquivo.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const MAX_LADO = 1280;
                let largura = img.width;
                let altura = img.height;

                if (largura > altura && largura > MAX_LADO) {
                    altura = Math.round((altura * MAX_LADO) / largura);
                    largura = MAX_LADO;
                } else if (altura > MAX_LADO) {
                    largura = Math.round((largura * MAX_LADO) / altura);
                    altura = MAX_LADO;
                }

                const canvas = document.createElement('canvas');
                canvas.width = largura;
                canvas.height = altura;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, largura, altura);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject(new Error('Não consegui ler a imagem.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
        reader.readAsDataURL(arquivo);
    });
}

window.processarFotoOs = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;

    for (const arquivo of arquivos) {
        try {
            const base64 = await comprimirFotoParaBase64(arquivo);
            FOTOS_OS_BASE64.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto da OS:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}). Pulei ela.`);
        }
    }

    renderPreviewFotosOs();
    event.target.value = '';
};

window.removerFotoOs = function(indice) {
    if (typeof indice === 'number') {
        FOTOS_OS_BASE64.splice(indice, 1);
    } else {
        FOTOS_OS_BASE64 = [];
    }
    renderPreviewFotosOs();
};

window.confirmarOrdemServico = async function() {
    if (!verificarAcesso()) return;

    const numero = document.getElementById('os-numero')?.value.trim();
    const descricao = document.getElementById('os-descricao')?.value.trim();
    const area = document.getElementById('os-area')?.value || null;

    if (FOTOS_OS_BASE64.length === 0) return alert('Tire ou anexe pelo menos 1 foto da OS antes de registrar.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const { resp, enfileirado } = await enviarComFilaOffline(`${apiBase}/api/ordens_servico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numero_os: numero || null,
                descricao: descricao || null,
                fotos_base64: FOTOS_OS_BASE64,
                operador,
                area
            })
        }, `OS ${numero || '(sem número)'}`);

        if (enfileirado) {
            document.getElementById('os-numero').value = '';
            document.getElementById('os-descricao').value = '';
            window.removerFotoOs();
            alert('📴 Sem internet agora — a OS foi guardada e será enviada sozinha assim que a conexão voltar.');
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível registrar a OS.');
            return;
        }

        document.getElementById('os-numero').value = '';
        document.getElementById('os-descricao').value = '';
        window.removerFotoOs();
        alert('✅ OS registrada com sucesso.');
        await window.carregarListaOrdensServico();
    } catch (e) {
        console.error('⚠️ Erro ao registrar OS:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.filtrarOrdensServico = function(status, botaoClicado) {
    FILTRO_OS_ATUAL = status;
    document.querySelectorAll('#os-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaOrdensServico();
};

window.carregarListaOrdensServico = async function() {
    const container = document.getElementById('os-lista-container');
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_OS_ATUAL ? `?status=${encodeURIComponent(FILTRO_OS_ATUAL)}` : '';
        const resp = await fetch(`${apiBase}/api/ordens_servico${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        OS_CACHE = await resp.json();
        window.renderizarListaOrdensServico();
    } catch (e) {
        console.error('⚠️ Erro ao carregar OS:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

// 🆕 Busca por número/descrição — filtra o que já foi carregado (não
// faz nova chamada à API), funciona instantâneo enquanto digita.
window.buscarOrdensServico = function(texto) {
    BUSCA_OS_ATUAL = (texto || '').trim().toLowerCase();
    window.renderizarListaOrdensServico();
};

window.renderizarListaOrdensServico = function() {
    const container = document.getElementById('os-lista-container');
    if (!container) return;

    const lista = BUSCA_OS_ATUAL
        ? OS_CACHE.filter(os =>
            (os.numero_os || '').toLowerCase().includes(BUSCA_OS_ATUAL) ||
            (os.descricao || '').toLowerCase().includes(BUSCA_OS_ATUAL))
        : OS_CACHE;

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhuma OS encontrada${BUSCA_OS_ATUAL ? ' pra essa busca' : (FILTRO_OS_ATUAL ? ' com esse filtro' : ' ainda')}.</div>`;
        return;
    }

    container.innerHTML = lista.map(os => {
        const concluida = os.status === 'Concluído';
        const naoExecutada = os.status === 'Não Executada';
        let corStatus = 'var(--warning)';
        let iconeStatus = '🔧';
        if (concluida) { corStatus = 'var(--success)'; iconeStatus = '✅'; }
        else if (naoExecutada) { corStatus = 'var(--danger)'; iconeStatus = '🚫'; }
        const totalFotos = os.total_fotos || 0;
        return `
        <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
            ${os.foto_capa ? `
                <div style="position:relative; flex-shrink:0; cursor:pointer;" onclick="window.abrirGaleriaOs(${os.id}, '${os.numero_os ? `OS ${os.numero_os}` : `OS #${os.id}`}')">
                    <img src="${os.foto_capa}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                    ${totalFotos > 1 ? `<span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:1px 6px; border-radius:10px;"><i class="fas fa-images"></i> ${totalFotos}</span>` : ''}
                </div>
            ` : `
                <div style="width:70px; height:70px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-muted);">
                    <i class="fas fa-file-invoice" style="font-size:20px; opacity:0.4;"></i>
                </div>
            `}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${os.numero_os ? `OS ${os.numero_os}` : `#${os.id}`}</span>
                    <span style="font-size:11px; font-weight:700; color:${corStatus};">${iconeStatus} ${os.status}</span>
                </div>
                ${os.descricao ? `<div style="font-size:13px; color:var(--text-body); margin-bottom:4px;">${os.descricao}</div>` : ''}
                ${naoExecutada && os.motivo_nao_executada ? `
                    <div style="font-size:12px; color:var(--danger); background:rgba(239,68,68,0.08); border-left:3px solid var(--danger); padding:5px 8px; border-radius:4px; margin-bottom:4px;">
                        <strong>Motivo:</strong> ${os.motivo_nao_executada}
                    </div>
                ` : ''}
                <div style="font-size:11px; color:var(--text-accent);">
                    ${os.criado_por || 'Sistema'} · ${os.criado_em || ''}${os.area ? ` · ${nomeAreaOficina(os.area)}` : ''}
                    ${concluida && os.concluido_por ? `<br>Concluída por ${os.concluido_por} · ${os.concluido_em || ''}` : ''}
                    ${naoExecutada && os.encerrado_por ? `<br>Encerrada por ${os.encerrado_por} · ${os.encerrado_em || ''}` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${!concluida ? `<button class="btn-premium btn-success" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusOrdemServico(${os.id}, 'Concluído')">Concluir</button>` : ''}
                ${!naoExecutada ? `<button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.marcarOsNaoExecutada(${os.id})">Não Executada</button>` : ''}
                ${(concluida || naoExecutada) ? `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusOrdemServico(${os.id}, 'Em Andamento')">Reabrir</button>` : ''}
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirOrdemServico(${os.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// --------------------------------------------------------------
// Galeria de páginas de UMA OS — busca todas as fotos dela na hora do
// clique (a lista principal só traz a foto de capa, pra não pesar) e
// mostra num mini-visualizador com miniaturas; clicar numa miniatura
// abre ela ampliada (reaproveita window.abrirFotoAmpliada).
// --------------------------------------------------------------
window.abrirGaleriaOs = async function(osId, titulo) {
    let overlay = document.getElementById('lightbox-galeria-os-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-os-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10090';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="galeria-os-titulo"><i class="fas fa-file-invoice"></i> OS</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-os-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-os-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('galeria-os-titulo').innerHTML = `<i class="fas fa-file-invoice"></i> ${titulo}`;
    const corpo = document.getElementById('galeria-os-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando páginas...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/${osId}/fotos`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <div style="position:relative;">
                <img src="${f.foto_base64}"
                     style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                     onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${titulo.replace(/'/g, "\\'")} — Página ${i + 1}')">
                <span style="position:absolute; bottom:4px; left:4px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:1px 6px; border-radius:10px;">Pág. ${i + 1}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as páginas da OS:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

window.mudarStatusOrdemServico = async function(id, novoStatus, motivo) {
    if (!verificarAcesso()) return;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus, operador, motivo: motivo || null })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível atualizar o status da OS.');
            return;
        }
        await window.carregarListaOrdensServico();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar status da OS:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 "Não Executada" (bate com o campo do papel da OS real) — pede o
// motivo/justificativa ANTES de marcar, porque o backend exige esse
// campo preenchido pra esse status.
window.marcarOsNaoExecutada = function(id) {
    if (!verificarAcesso()) return;
    const motivo = prompt('Motivo / Justificativa da OS não ter sido executada:');
    if (motivo === null) return; // cancelou
    if (!motivo.trim()) return alert('É preciso informar o motivo.');
    window.mudarStatusOrdemServico(id, 'Não Executada', motivo.trim());
};


window.excluirOrdemServico = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir esta OS registrada? Essa ação não pode ser desfeita.')) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/ordens_servico/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir a OS.');
            return;
        }
        await window.carregarListaOrdensServico();
    } catch (e) {
        console.error('⚠️ Erro ao excluir OS:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// ==========================================
// 🆕 CENTRAL DE NOTIFICAÇÕES — só supervisor/ADM (visibilidade decidida
// em ativarCentralNotificacoesSeAutorizado, mais abaixo). Não é uma
// aba de cadastro nova: só AGREGA o que já existe em outras abas
// (Central de Áreas, Ocorrência, OS) num feed único, lendo as mesmas
// APIs — não duplica lógica nenhuma de negócio.
// ==========================================
const INTERVALO_POLLING_NOTIFICACOES_MS = 30000;
let TIMER_POLLING_NOTIFICACOES = null;

// Enquanto a aba estiver aberta, atualiza sozinha a cada 30s. Se a
// pessoa sair da aba (ou trocar de operador), o próprio timer se
// desarma sozinho no próximo tick — não fica batendo no servidor à toa
// com a aba em segundo plano.
window.iniciarPollingCentralNotificacoes = function() {
    window.pararPollingCentralNotificacoes();
    TIMER_POLLING_NOTIFICACOES = setInterval(() => {
        const aba = document.getElementById('aba-notificacoes');
        if (!aba || !aba.classList.contains('active')) {
            window.pararPollingCentralNotificacoes();
            return;
        }
        window.carregarCentralNotificacoes();
    }, INTERVALO_POLLING_NOTIFICACOES_MS);
};

window.pararPollingCentralNotificacoes = function() {
    if (TIMER_POLLING_NOTIFICACOES) {
        clearInterval(TIMER_POLLING_NOTIFICACOES);
        TIMER_POLLING_NOTIFICACOES = null;
    }
};

// 🆕 Feed unificado (evento de Auditoria + OS em aberto + achado de
// Qualidade pendente), com lido/não-lido POR MATRÍCULA vindo pronto do
// backend (/api/notificacoes/feed) — nada de "lido" calculado no
// cliente, senão cada aba/dispositivo teria sua própria ideia do que
// já foi visto.
window.carregarFeedNotificacoes = async function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return [];
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/notificacoes/feed?matricula=${encodeURIComponent(OPERADOR_LOGADO.matricula)}&limite=30`, { cache: 'no-store' });
        const feed = resp.ok ? await resp.json() : [];
        return Array.isArray(feed) ? feed : [];
    } catch (e) {
        console.error('⚠️ Erro ao carregar feed de notificações:', e);
        return [];
    }
};

// Atualiza o número no sininho do menu lateral — chamado depois do
// login e sempre que o feed é recarregado, mesmo com a Central
// fechada, pra dar pra ver que tem coisa nova sem precisar abrir.
window.atualizarBadgeNotificacoesNaoLidas = async function() {
    const badge = document.getElementById('badge-notificacoes-nao-lidas');
    if (!badge) return;
    if (!operadorEhSupervisorOuAdm()) { badge.classList.add('hidden'); return; }
    const feed = await window.carregarFeedNotificacoes();
    const naoLidas = feed.filter(item => !item.lida).length;
    if (naoLidas > 0) {
        badge.innerText = naoLidas > 99 ? '99+' : String(naoLidas);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
};

window.carregarCentralNotificacoes = async function() {
    try {
        const apiBase = await resolverApiBase();
        const [atividades, feed] = await Promise.all([
            fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
            window.carregarFeedNotificacoes(),
        ]);

        renderizarAreasNotificacoes(Array.isArray(atividades) ? atividades : [], feed);
        renderizarFeedNotificacoes(feed);

        const marcador = document.getElementById('notificacoes-ultima-atualizacao');
        if (marcador) marcador.innerText = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
    } catch (e) {
        console.error('⚠️ Erro ao carregar a Central de Notificações:', e);
    } finally {
        window.iniciarPollingCentralNotificacoes();
    }
};

window.irParaAreaOficinaViaNotificacao = function(chave) {
    window.abrirAba(null, 'aba-oficina');
    document.getElementById('nav-oficina')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    if (typeof window.abrirAreaOficina === 'function') window.abrirAreaOficina(chave);
};

// 🆕 Vai direto pra Ocorrência clicada (não só abre a aba genérica) —
// abre "Registro de Ocorrência", espera a lista carregar e já filtra
// pela peça daquele registro, usando a mesma busca que a aba já tem.
window.irParaOcorrenciaEspecifica = async function(pecaId) {
    window.abrirAba(null, 'aba-ocorrencia');
    document.getElementById('nav-ocorrencia')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    await window.carregarListaOcorrencias();
    const input = document.getElementById('ocorrencia-busca');
    if (input) input.value = pecaId || '';
    if (typeof window.buscarOcorrencias === 'function') window.buscarOcorrencias(pecaId || '');
};

// Mesma ideia pra OS — filtra pelo número (ou, se a OS não tiver
// número, por um trecho da descrição) assim que a lista carregar.
window.irParaOsEspecifica = async function(termoBusca) {
    window.abrirAba(null, 'aba-ordens-servico');
    document.getElementById('nav-ordens-servico')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    popularSelectAreaOficina('os-area');
    await window.carregarListaOrdensServico();
    const input = document.getElementById('os-busca');
    if (input) input.value = termoBusca || '';
    if (typeof window.buscarOrdensServico === 'function') window.buscarOrdensServico(termoBusca || '');
};

function renderizarAreasNotificacoes(atividades, feed) {
    const container = document.getElementById('notificacoes-areas-container');
    if (!container) return;

    // 🆕 Áreas que têm pelo menos 1 item não lido no feed (ocorrência,
    // OS, evento) ganham um selo "Novo" — sinaliza que "aquela área
    // sofreu ação" mesmo sem estar Crítica/em Restrição.
    const areasComNaoLido = new Set(
        (feed || []).filter(item => !item.lida && item.area).map(item => item.area)
    );

    const ORDEM_STATUS = { 'Crítico': 0, 'Restrição': 1, 'Atenção': 2 };

    const areas = AREAS_OFICINA
        .filter(a => a.tipo === 'oficina')
        .map(a => {
            const doArea = atividades.filter(x => x.area === a.chave);
            const pendentes = doArea.filter(x => x.status === 'Pendente').length;
            const andamento = doArea.filter(x => x.status === 'Em Andamento').length;
            const atrasadas = doArea.filter(x => atividadeEstaAtrasada(x)).length;
            const emAberto = pendentes + andamento;
            const temNaoLido = areasComNaoLido.has(a.chave);

            let status = null;
            if (atrasadas > 0) status = { emoji: '🔴', label: 'Crítico', cor: 'var(--danger)' };
            else if (emAberto >= 5) status = { emoji: '🟠', label: 'Restrição', cor: 'var(--limit)' };
            else if (emAberto >= 1) status = { emoji: '🟡', label: 'Atenção', cor: 'var(--warning)' };
            else if (temNaoLido) status = { emoji: '🔵', label: 'Novo', cor: 'var(--text-accent)' };

            return { area: a, status, pendentes, andamento, atrasadas, temNaoLido };
        })
        .filter(v => v.status)
        .sort((x, y) => (x.temNaoLido === y.temNaoLido ? 0 : x.temNaoLido ? -1 : 1) || (ORDEM_STATUS[x.status.label] ?? 9) - (ORDEM_STATUS[y.status.label] ?? 9));

    if (areas.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">✅ Nenhuma área precisa de atenção agora.</div>`;
        return;
    }

    // 🔧 Mesmo card (e mesma classe CSS) já usado na Central de Áreas —
    // antes cada área era só uma linha de lista encostada na outra
    // (parecia um bloco só de texto). Como card de grade, cada área vira
    // uma unidade visualmente separada da vizinha, igual o resto do app.
    container.innerHTML = `
        <div class="oficina-grade">
            ${areas.map(({ area: a, status: s, pendentes, andamento, atrasadas, temNaoLido }) => `
                <div class="oficina-area-card" style="--area-color:${a.cor}; position:relative;" onclick="window.irParaAreaOficinaViaNotificacao('${a.chave}')">
                    ${temNaoLido ? `<span style="position:absolute; top:8px; right:8px; width:9px; height:9px; border-radius:50%; background:var(--danger); box-shadow:0 0 0 2px var(--bg-card);" title="Tem novidade não vista"></span>` : ''}
                    <div class="oficina-area-topo">
                        <div class="oficina-area-icone" style="color:${a.cor};"><i class="fas ${a.icone}"></i></div>
                        <span class="oficina-area-status-badge" style="color:${s.cor};">${s.emoji} ${s.label}</span>
                    </div>
                    <h4>${a.nome}</h4>
                    <div class="oficina-area-resumo">
                        <span title="Pendentes"><i class="fas fa-hourglass-half"></i> ${pendentes}</span>
                        <span title="Em andamento"><i class="fas fa-person-running"></i> ${andamento}</span>
                        ${atrasadas > 0 ? `<span style="color:var(--danger);" title="Atrasadas"><i class="fas fa-triangle-exclamation"></i> ${atrasadas}</span>` : ''}
                    </div>
                    <button class="oficina-area-acessar" style="color:${a.cor};">Acessar Área <i class="fas fa-arrow-right"></i></button>
                </div>
            `).join('')}
        </div>
    `;
}

// Ícone por tipo de item do feed unificado — tipo='evento' cobre tanto
// Ocorrência (categoria Intervenção/Melhoria/...) quanto Auditoria geral
// (ex: rolo travado no Sinótico 3D), que antes nunca aparecia aqui.
const ICONE_POR_TIPO_NOTIFICACAO = { os: '📄', achado: '🔍', evento: '📋' };

// 🔧 CORREÇÃO ("mostra os antigos, não quero isso"): não lido aparece
// sempre (é exatamente o que a pessoa ainda não viu, não importa a
// idade); já lido só aparece se for recente — assim a lista não fica
// eternamente entulhada de coisa antiga só porque ninguém marcou como
// vista, mas também não esconde nada novo.
const DIAS_RECENCIA_NOTIFICACOES = 3;
const MAX_ITENS_NOTIFICACOES = 10;

function dataDentroDaJanelaRecente(dataHoraStr) {
    if (!dataHoraStr) return false;
    const data = new Date(String(dataHoraStr).replace(' ', 'T'));
    if (isNaN(data.getTime())) return false;
    const diffMs = Date.now() - data.getTime();
    return diffMs >= 0 && diffMs <= DIAS_RECENCIA_NOTIFICACOES * 24 * 60 * 60 * 1000;
}

// Clique num item do feed: marca como lido PRA ESSA MATRÍCULA (não
// afeta o que outras pessoas já viram) e navega pro lugar certo —
// Ocorrência/OS têm tela própria; achado e evento de auditoria não têm
// uma tela dedicada de "ver este item", então só marca como visto.
window.abrirItemNotificacao = async function(tipo, eventoId, referencia) {
    try {
        if (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula) {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, evento_id: String(eventoId), matricula: OPERADOR_LOGADO.matricula })
            });
        }
    } catch (e) {
        console.error('⚠️ Erro ao marcar notificação como lida:', e);
    }

    if (tipo === 'os') {
        window.irParaOsEspecifica(referencia);
    } else if (tipo === 'evento') {
        window.irParaOcorrenciaEspecifica(referencia);
    } else {
        // achado (sem tela dedicada) — só atualiza o feed pra sumir o "não lido"
        window.carregarCentralNotificacoes();
    }
};

function renderizarFeedNotificacoes(feed) {
    const container = document.getElementById('notificacoes-feed-container');
    const contagemEl = document.getElementById('notificacoes-contagem-nao-lidas');
    if (!container) return;

    const naoLidas = feed.filter(item => !item.lida).length;
    if (contagemEl) contagemEl.innerText = naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'tudo em dia ✅';

    const visiveis = feed
        .filter(item => !item.lida || dataDentroDaJanelaRecente(item.data_hora))
        .slice(0, MAX_ITENS_NOTIFICACOES);

    if (visiveis.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">✅ Nada de novo — sem atividade nos últimos ${DIAS_RECENCIA_NOTIFICACOES} dias.</div>`;
        return;
    }

    container.innerHTML = visiveis.map(item => {
        const naoLida = !item.lida;
        const icone = ICONE_POR_TIPO_NOTIFICACAO[item.tipo] || '📋';
        const cor = naoLida ? 'var(--danger)' : 'var(--border-color)';
        const referencia = item.tipo === 'os' ? (item.referencia || '') : item.referencia;
        return `
        <div class="notificacoes-item" style="--item-cor:${cor}; ${naoLida ? 'background:color-mix(in srgb, var(--danger) 6%, var(--bg-card));' : ''}"
             onclick="window.abrirItemNotificacao('${item.tipo}', '${item.evento_id}', '${String(referencia || '').replace(/'/g, "\\'")}')">
            <div class="notificacoes-item-icone" style="${naoLida ? 'color:var(--danger);' : ''}">${icone}</div>
            <div class="notificacoes-item-corpo">
                <div class="notificacoes-item-topo">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">
                        ${naoLida ? '<span style="color:var(--danger);">●</span> ' : ''}${item.referencia || '-'}
                    </span>
                    <span style="font-size:10.5px; color:var(--text-muted);">${item.data_hora || ''}</span>
                </div>
                <div class="notificacoes-item-linha">${item.descricao || ''}</div>
                <div style="font-size:10.5px; color:var(--text-accent);">${item.autor || 'Sistema'}${item.area ? ` · ${nomeAreaOficina(item.area)}` : ''}</div>
            </div>
        </div>
        `;
    }).join('');
}

// ==========================================
// 🆕 QUALIDADE (Entrada/Saída) — o responsável pela Qualidade registra
// como o equipamento chegou na oficina (fotos + observação) e depois,
// quando o serviço termina, registra como ele está saindo. Reaproveita
// comprimirFotoParaBase64() já usada em OS/Ocorrência.
// ==========================================
let QUALIDADE_FOTOS_ENTRADA_BASE64 = [];
let QUALIDADE_FOTOS_SAIDA_BASE64 = [];
let FILTRO_QUALIDADE_ATUAL = '';
let BUSCA_QUALIDADE_ATUAL = '';
let QUALIDADE_CACHE = [];
let QUALIDADE_ACHADO_FOTOS_NOVAS = []; // 🆕 fotos (pode ter mais de 1) do achado sendo digitado no formulário de entrada
let QUALIDADE_ACHADOS_LISTA = []; // achados já adicionados, aguardando o "Registrar Entrada"

window.processarFotoAchadoNovo = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;
    for (const arquivo of arquivos) {
        try {
            const base64 = await comprimirFotoParaBase64(arquivo);
            QUALIDADE_ACHADO_FOTOS_NOVAS.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto do achado:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}).`);
        }
    }
    renderPreviewFotosAchadoNovo();
    event.target.value = '';
};

function renderPreviewFotosAchadoNovo() {
    const preview = document.getElementById('qualidade-achado-novo-foto-preview');
    if (!preview) return;
    if (QUALIDADE_ACHADO_FOTOS_NOVAS.length === 0) { preview.classList.add('hidden'); preview.innerHTML = ''; return; }

    preview.classList.remove('hidden');
    preview.style.display = 'flex';
    preview.style.gap = '6px';
    preview.style.flexWrap = 'wrap';
    preview.innerHTML = QUALIDADE_ACHADO_FOTOS_NOVAS.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <button type="button" onclick="window.removerFotoAchadoNovo(${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; line-height:1;"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

window.removerFotoAchadoNovo = function(indice) {
    if (typeof indice === 'number') QUALIDADE_ACHADO_FOTOS_NOVAS.splice(indice, 1);
    else QUALIDADE_ACHADO_FOTOS_NOVAS = [];
    renderPreviewFotosAchadoNovo();
};

window.adicionarAchadoNaLista = function() {
    const campo = document.getElementById('qualidade-achado-descricao');
    const descricao = campo?.value.trim();
    if (!descricao) return alert('Descreva o achado antes de adicionar.');

    QUALIDADE_ACHADOS_LISTA.push({ descricao, fotos_base64: [...QUALIDADE_ACHADO_FOTOS_NOVAS] });
    campo.value = '';
    window.removerFotoAchadoNovo();
    renderAchadosPendentesLista();
};

window.removerAchadoDaLista = function(indice) {
    QUALIDADE_ACHADOS_LISTA.splice(indice, 1);
    renderAchadosPendentesLista();
};

function renderAchadosPendentesLista() {
    const container = document.getElementById('qualidade-achados-pendentes-lista');
    if (!container) return;
    if (QUALIDADE_ACHADOS_LISTA.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = QUALIDADE_ACHADOS_LISTA.map((a, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--border);">
            ${a.fotos_base64 && a.fotos_base64[0] ? `<img src="${a.fotos_base64[0]}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;">` : `<div style="width:36px; height:36px; flex-shrink:0;"></div>`}
            <span style="flex:1; font-size:12px; color:var(--text-body);">${a.descricao}${a.fotos_base64 && a.fotos_base64.length > 1 ? ` <span style="color:var(--text-muted);">(${a.fotos_base64.length} fotos)</span>` : ''}</span>
            <button type="button" onclick="window.removerAchadoDaLista(${i})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:12px;"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

window.renderAbaQualidade = function() {
    const select = document.getElementById("qualidade-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    window.carregarListaQualidade();
};

function renderPreviewFotosQualidade(etapa) {
    const lista = etapa === 'entrada' ? QUALIDADE_FOTOS_ENTRADA_BASE64 : QUALIDADE_FOTOS_SAIDA_BASE64;
    const container = document.getElementById(etapa === 'entrada' ? 'qualidade-fotos-entrada-preview' : 'qualidade-fotos-saida-preview');
    if (!container) return;

    if (lista.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = lista.map((foto, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${foto}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
            <button type="button" onclick="window.removerFotoQualidade('${etapa}', ${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:11px; line-height:1;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

window.processarFotoQualidade = async function(event, etapa) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;

    for (const arquivo of arquivos) {
        try {
            const base64 = await comprimirFotoParaBase64(arquivo);
            if (etapa === 'entrada') QUALIDADE_FOTOS_ENTRADA_BASE64.push(base64);
            else QUALIDADE_FOTOS_SAIDA_BASE64.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto de qualidade:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}). Pulei ela.`);
        }
    }

    renderPreviewFotosQualidade(etapa);
    event.target.value = '';
};

window.removerFotoQualidade = function(etapa, indice) {
    const lista = etapa === 'entrada' ? QUALIDADE_FOTOS_ENTRADA_BASE64 : QUALIDADE_FOTOS_SAIDA_BASE64;
    if (typeof indice === 'number') lista.splice(indice, 1);
    else lista.length = 0;
    renderPreviewFotosQualidade(etapa);
};

window.confirmarEntradaQualidade = async function() {
    if (!verificarAcesso()) return;

    const equipamentoId = document.getElementById("qualidade-equipamento")?.value;
    const observacao = document.getElementById("qualidade-obs-entrada")?.value.trim();

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (QUALIDADE_FOTOS_ENTRADA_BASE64.length === 0) return alert("Tire ou anexe pelo menos 1 foto de entrada.");

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const { resp, enfileirado } = await enviarComFilaOffline(`${apiBase}/api/qualidade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                observacao_entrada: observacao || null,
                fotos_entrada_base64: QUALIDADE_FOTOS_ENTRADA_BASE64,
                achados: QUALIDADE_ACHADOS_LISTA,
                operador
            })
        }, `Entrada de Qualidade em ${equipamentoId}`);

        if (enfileirado) {
            document.getElementById("qualidade-obs-entrada").value = "";
            window.removerFotoQualidade('entrada');
            QUALIDADE_ACHADOS_LISTA = [];
            renderAchadosPendentesLista();
            window.removerFotoAchadoNovo();
            alert(`📴 Sem internet agora — a entrada de [${equipamentoId}] foi guardada e será enviada sozinha assim que a conexão voltar.`);
            return;
        }

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível registrar a entrada.");
            return;
        }

        document.getElementById("qualidade-obs-entrada").value = "";
        window.removerFotoQualidade('entrada');
        QUALIDADE_ACHADOS_LISTA = [];
        renderAchadosPendentesLista();
        window.removerFotoAchadoNovo();
        alert(`✅ Entrada registrada em [${equipamentoId}].`);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao registrar entrada de qualidade:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

window.filtrarQualidade = function(status, botaoClicado) {
    FILTRO_QUALIDADE_ATUAL = status;
    document.querySelectorAll('#qualidade-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaQualidade();
};

window.carregarListaQualidade = async function() {
    const container = document.getElementById("qualidade-lista-container");
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_QUALIDADE_ATUAL ? `?status=${encodeURIComponent(FILTRO_QUALIDADE_ATUAL)}` : '';
        const resp = await fetch(`${apiBase}/api/qualidade${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        QUALIDADE_CACHE = await resp.json();
        window.renderizarListaQualidade();

        // 🆕 KPIs sempre olham TUDO (sem o filtro de status ativo na
        // tela), senão "Concluído" zeraria ao filtrar só "Aguardando
        // Saída" por exemplo. Só busca de novo se o filtro atual não
        // já for "todas" (senão reaproveita o que acabou de vir).
        if (!FILTRO_QUALIDADE_ATUAL) {
            window.renderizarKpisQualidade(QUALIDADE_CACHE);
        } else {
            const respTudo = await fetch(`${apiBase}/api/qualidade`, { cache: 'no-store' });
            if (respTudo.ok) window.renderizarKpisQualidade(await respTudo.json());
        }
    } catch (e) {
        console.error('⚠️ Erro ao carregar registros de qualidade:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

// 🆕 Resumo/dashboard rápido da aba Qualidade — calculado em cima da
// lista já carregada (até o limite de 100 mais recentes do backend),
// sem gastar outra chamada além da que já busca "todas" quando
// necessário.
window.renderizarKpisQualidade = function(lista) {
    const container = document.getElementById('qualidade-kpis');
    if (!container) return;
    if (!Array.isArray(lista)) lista = [];

    const aguardando = lista.filter(r => r.status !== 'Concluído').length;
    const concluidos = lista.filter(r => r.status === 'Concluído').length;
    const achadosPendentes = lista.reduce((soma, r) => soma + (Number(r.achados_pendentes) || 0), 0);
    const achadosTotal = lista.reduce((soma, r) => soma + (Number(r.achados_total) || 0), 0);

    container.innerHTML = `
        <div class="kpi-card warning">
            <div class="kpi-icon"><i class="fas fa-hourglass-half"></i></div>
            <div class="kpi-data"><h4>${aguardando}</h4><p>Aguardando Saída</p></div>
        </div>
        <div class="kpi-card success">
            <div class="kpi-icon"><i class="fas fa-check"></i></div>
            <div class="kpi-data"><h4>${concluidos}</h4><p>Concluídos</p></div>
        </div>
        <div class="kpi-card ${achadosPendentes > 0 ? 'danger' : ''}">
            <div class="kpi-icon"><i class="fas fa-triangle-exclamation"></i></div>
            <div class="kpi-data"><h4>${achadosPendentes}</h4><p>Achados Pendentes</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><i class="fas fa-list-check"></i></div>
            <div class="kpi-data"><h4>${achadosTotal}</h4><p>Achados no Total</p></div>
        </div>
    `;
};

// 🆕 Busca por equipamento — filtra o que já foi carregado (não faz
// nova chamada à API), funciona instantâneo enquanto digita.
window.buscarQualidade = function(texto) {
    BUSCA_QUALIDADE_ATUAL = (texto || '').trim().toLowerCase();
    window.renderizarListaQualidade();
};

window.renderizarListaQualidade = function() {
    const container = document.getElementById("qualidade-lista-container");
    if (!container) return;

    const lista = BUSCA_QUALIDADE_ATUAL
        ? QUALIDADE_CACHE.filter(r => (r.peca_id || '').toLowerCase().includes(BUSCA_QUALIDADE_ATUAL))
        : QUALIDADE_CACHE;

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum registro encontrado${BUSCA_QUALIDADE_ATUAL ? ' pra essa busca' : (FILTRO_QUALIDADE_ATUAL ? ' com esse filtro' : '')}.</div>`;
        return;
    }

    container.innerHTML = lista.map(r => {
        const concluido = r.status === 'Concluído';
        const corStatus = concluido ? 'var(--success)' : 'var(--warning)';
        const iconeStatus = concluido ? '✅' : '⏳';
        const fotoCapaEntrada = r.foto_entrada_capa;
        const fotoCapaSaida = r.foto_saida_capa;
        return `
        <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start; flex-wrap:wrap;">
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <div style="position:relative; cursor:pointer;" title="Fotos de Entrada" onclick="window.abrirGaleriaQualidade(${r.id}, 'entrada', '${r.peca_id}')">
                    ${fotoCapaEntrada ? `
                        <img src="${fotoCapaEntrada}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid #38bdf8;">
                        <span style="position:absolute; bottom:-6px; left:2px; background:#38bdf8; color:#04121c; font-size:9px; font-weight:800; padding:1px 5px; border-radius:8px;">ENTRADA</span>
                    ` : `<div style="width:64px; height:64px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; color:var(--text-muted);"><i class="fas fa-image" style="font-size:18px; opacity:0.4;"></i></div>`}
                </div>
                <div style="position:relative; cursor:${fotoCapaSaida ? 'pointer' : 'default'};" title="Fotos de Saída" ${fotoCapaSaida ? `onclick="window.abrirGaleriaQualidade(${r.id}, 'saida', '${r.peca_id}')"` : ''}>
                    ${fotoCapaSaida ? `
                        <img src="${fotoCapaSaida}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid #a78bfa;">
                        <span style="position:absolute; bottom:-6px; left:2px; background:#a78bfa; color:#04121c; font-size:9px; font-weight:800; padding:1px 5px; border-radius:8px;">SAÍDA</span>
                    ` : `<div style="width:64px; height:64px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; color:var(--text-muted); border:1px dashed var(--border);"><i class="fas fa-hourglass-half" style="font-size:16px; opacity:0.4;"></i></div>`}
                </div>
            </div>
            <div style="flex:1; min-width:180px;">
                <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${r.peca_id}</span>
                    <span style="font-size:11px; font-weight:700; color:${corStatus};">${iconeStatus} ${r.status}</span>
                </div>
                ${r.observacao_entrada ? `<div style="font-size:12px; color:var(--text-body); margin-bottom:2px;"><strong style="color:#38bdf8;">Entrada:</strong> ${r.observacao_entrada}</div>` : ''}
                ${r.observacao_saida ? `<div style="font-size:12px; color:var(--text-body); margin-bottom:2px;"><strong style="color:#a78bfa;">Saída:</strong> ${r.observacao_saida}</div>` : ''}
                ${Number(r.achados_total) > 0 ? `
                    <div style="margin:6px 0;">
                        <button type="button" onclick="window.abrirModalAchadosQualidade(${r.id}, '${r.peca_id}', ${!concluido})" style="background:${Number(r.achados_pendentes) > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}; color:${Number(r.achados_pendentes) > 0 ? 'var(--danger)' : 'var(--success)'}; border:1px solid currentColor; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:700; cursor:pointer;">
                            <i class="fas fa-triangle-exclamation"></i> ${r.achados_pendentes > 0 ? `${r.achados_pendentes} de ${r.achados_total} pendente(s)` : `${r.achados_total} achado(s) resolvido(s)`}
                        </button>
                    </div>
                ` : ''}
                <div style="font-size:11px; color:var(--text-accent);">
                    Entrada: ${r.criado_por || 'Sistema'} · ${r.criado_em || ''}
                    ${concluido && r.concluido_por ? `<br>Saída: ${r.concluido_por} · ${r.concluido_em || ''}` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${!concluido ? `<button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.abrirModalAchadosQualidade(${r.id}, '${r.peca_id}', true)"><i class="fas fa-plus"></i> Achado</button>` : ''}
                ${!concluido ? `<button class="btn-premium btn-success" style="padding:4px 10px; font-size:11px;" onclick="window.abrirModalSaidaQualidade(${r.id}, '${r.peca_id}')"><i class="fas fa-right-from-bracket"></i> Registrar Saída</button>` : ''}
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirQualidade(${r.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
        `;
    }).join('');
};

// Galeria de fotos (entrada OU saída) de UM registro de qualidade —
// reaproveita o mesmo padrão da galeria de OS.
window.abrirGaleriaQualidade = async function(registroId, etapa, pecaId) {
    let overlay = document.getElementById('lightbox-galeria-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10090';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="galeria-qualidade-titulo"><i class="fas fa-magnifying-glass"></i> Qualidade</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-qualidade-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    const rotulo = etapa === 'entrada' ? 'Entrada' : 'Saída';
    document.getElementById('galeria-qualidade-titulo').innerHTML = `<i class="fas fa-magnifying-glass"></i> ${pecaId} — Fotos de ${rotulo}`;
    const corpo = document.getElementById('galeria-qualidade-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando fotos...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/fotos?etapa=${etapa}`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <div style="position:relative;">
                <img src="${f.foto_base64}"
                     style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                     onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${pecaId} — ${rotulo} ${i + 1}')">
            </div>
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos de qualidade:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

// Modal de Registro de Saída — abre um formulário simples (fotos +
// observação) pro registro que já está "Aguardando Saída".
window.abrirModalSaidaQualidade = function(registroId, pecaId) {
    if (!verificarAcesso()) return;
    QUALIDADE_FOTOS_SAIDA_BASE64 = [];

    let overlay = document.getElementById('modal-saida-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-saida-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10095';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:480px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="modal-saida-qualidade-titulo"><i class="fas fa-right-from-bracket"></i> Registrar Saída</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('modal-saida-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="input-group" style="margin-bottom:14px;">
                        <label>Observação da Saída (o que foi feito, estado final...)</label>
                        <textarea id="qualidade-obs-saida" class="premium-textarea" rows="2" placeholder="Ex: Rolo #3 trocado, testado e liberado..."></textarea>
                    </div>
                    <div class="input-group" style="margin-bottom:16px;">
                        <label>Fotos de Saída <span style="color:var(--danger);">*</span></label>
                        <input type="file" id="qualidade-foto-saida-input" accept="image/*" multiple style="display:none;" onchange="window.processarFotoQualidade(event, 'saida')">
                        <button type="button" class="btn-premium" onclick="document.getElementById('qualidade-foto-saida-input').click()">
                            <i class="fas fa-camera"></i> Tirar Foto / Anexar
                        </button>
                        <div id="qualidade-fotos-saida-preview" class="hidden" style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;"></div>
                    </div>
                    <button class="btn-premium" id="btn-abrir-checklist-qualidade" style="width:100%; margin-bottom:10px; border-color:#a78bfa; color:#a78bfa;">
                        <i class="fas fa-clipboard-check"></i> Preencher Checklist de Saída
                    </button>
                    <button class="btn-premium btn-success w-100" id="btn-confirmar-saida-qualidade">
                        <i class="fas fa-check"></i> Confirmar Saída
                    </button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('modal-saida-qualidade-titulo').innerHTML = `<i class="fas fa-right-from-bracket"></i> Registrar Saída — ${pecaId}`;
    document.getElementById('qualidade-obs-saida').value = '';
    renderPreviewFotosQualidade('saida');
    document.getElementById('btn-confirmar-saida-qualidade').onclick = () => window.confirmarSaidaQualidade(registroId);
    document.getElementById('btn-abrir-checklist-qualidade').onclick = () => window.abrirChecklistQualidadeSaida(registroId, pecaId);
    overlay.classList.remove('hidden');
};

window.confirmarSaidaQualidade = async function(registroId) {
    if (!verificarAcesso()) return;
    const observacao = document.getElementById("qualidade-obs-saida")?.value.trim();

    if (QUALIDADE_FOTOS_SAIDA_BASE64.length === 0) return alert("Tire ou anexe pelo menos 1 foto de saída.");

    const registro = QUALIDADE_CACHE.find(r => r.id === registroId);
    if (registro && Number(registro.achados_pendentes) > 0) {
        if (!confirm(`⚠️ Ainda tem ${registro.achados_pendentes} achado(s) pendente(s) nesse equipamento. Registrar a saída mesmo assim?`)) return;
    }

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/saida`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                observacao_saida: observacao || null,
                fotos_saida_base64: QUALIDADE_FOTOS_SAIDA_BASE64,
                operador
            })
        });

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível registrar a saída.");
            return;
        }

        document.getElementById('modal-saida-qualidade-overlay').classList.add('hidden');
        window.removerFotoQualidade('saida');
        alert('✅ Saída registrada com sucesso.');
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao registrar saída de qualidade:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// Modal de Achados — lista os problemas encontrados pela Qualidade num
// registro específico. Se "podeEditar" for true (registro ainda
// "Aguardando Saída"), permite adicionar novo achado e marcar/desmarcar
// como resolvido. Se já estiver "Concluído", fica só como consulta.
let QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = []; // 🆕 fotos (pode ter mais de 1) do achado sendo adicionado no modal

window.abrirModalAchadosQualidade = async function(registroId, pecaId, podeEditar) {
    QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = [];

    let overlay = document.getElementById('modal-achados-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-achados-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10096';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:520px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="modal-achados-qualidade-titulo"><i class="fas fa-triangle-exclamation"></i> Achados</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('modal-achados-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="modal-achados-qualidade-form" style="margin-bottom:14px;"></div>
                    <div id="modal-achados-qualidade-lista"></div>
                </div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('modal-achados-qualidade-titulo').innerHTML = `<i class="fas fa-triangle-exclamation"></i> Achados — ${pecaId}`;

    const formContainer = document.getElementById('modal-achados-qualidade-form');
    formContainer.innerHTML = podeEditar ? `
        <div class="glass-panel" style="padding:12px; background:rgba(167,139,250,0.05); border:1px solid rgba(167,139,250,0.2);">
            <div class="form-grid-4" style="margin-bottom:8px;">
                <div class="input-group" style="grid-column: span 3;">
                    <textarea id="modal-achado-nova-descricao" class="premium-textarea" rows="1" placeholder="Descreva o novo achado..."></textarea>
                </div>
                <div class="input-group">
                    <input type="file" id="modal-achado-nova-foto-input" accept="image/*" multiple style="display:none;" onchange="window.processarFotoAchadoModal(event)">
                    <button type="button" class="btn-premium w-100 btn-icon-only" onclick="document.getElementById('modal-achado-nova-foto-input').click()"><i class="fas fa-camera"></i></button>
                </div>
            </div>
            <div id="modal-achado-nova-foto-preview" class="hidden" style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;"></div>
            <button type="button" class="btn-premium" style="font-size:12px; padding:6px 14px;" onclick="window.salvarNovoAchadoModal(${registroId}, '${pecaId}')">
                <i class="fas fa-plus"></i> Adicionar
            </button>
        </div>
    ` : '';

    const corpo = document.getElementById('modal-achados-qualidade-lista');
    corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Carregando...</div>`;
    overlay.classList.remove('hidden');

    await window.recarregarAchadosModal(registroId, pecaId, podeEditar);
};

window.processarFotoAchadoModal = async function(event) {
    const arquivos = Array.from(event.target.files || []);
    if (arquivos.length === 0) return;
    for (const arquivo of arquivos) {
        try {
            const base64 = await comprimirFotoParaBase64(arquivo);
            QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.push(base64);
        } catch (e) {
            console.error('⚠️ Erro ao processar foto:', e);
            alert(`Não consegui processar uma das imagens (${arquivo.name}).`);
        }
    }
    const preview = document.getElementById('modal-achado-nova-foto-preview');
    if (preview) {
        if (QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.length === 0) {
            preview.classList.add('hidden'); preview.innerHTML = '';
        } else {
            preview.classList.remove('hidden');
            preview.innerHTML = QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.map((foto, i) => `
                <div style="position:relative; display:inline-block;">
                    <img src="${foto}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                    <button type="button" onclick="QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS.splice(${i},1); document.getElementById('modal-achado-nova-foto-input').dispatchEvent(new Event('change'))" style="display:none;"></button>
                </div>
            `).join('');
        }
    }
    event.target.value = '';
};

window.salvarNovoAchadoModal = async function(registroId, pecaId) {
    if (!verificarAcesso()) return;
    const descricao = document.getElementById('modal-achado-nova-descricao')?.value.trim();
    if (!descricao) return alert('Descreva o achado.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registro_id: registroId, descricao, fotos_base64: QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS, operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível adicionar o achado.');
            return;
        }
        document.getElementById('modal-achado-nova-descricao').value = '';
        QUALIDADE_ACHADO_MODAL_FOTOS_NOVAS = [];
        const preview = document.getElementById('modal-achado-nova-foto-preview');
        if (preview) { preview.classList.add('hidden'); preview.innerHTML = ''; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao adicionar achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Editar a descrição de um achado já criado.
window.editarAchadoQualidade = async function(achadoId, registroId, pecaId, descricaoAtual) {
    if (!verificarAcesso()) return;
    const novaDescricao = prompt('Editar descrição do achado:', descricaoAtual || '');
    if (novaDescricao === null) return; // cancelou
    if (!novaDescricao.trim()) return alert('A descrição não pode ficar vazia.');

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/editar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId, descricao: novaDescricao.trim(), operador })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível editar o achado.');
            return;
        }
        await window.recarregarAchadosModal(registroId, pecaId, true);
    } catch (e) {
        console.error('⚠️ Erro ao editar achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Excluir achado COM desfazer — a exclusão de verdade só acontece
// depois de alguns segundos, dando tempo de cancelar caso tenha
// apertado sem querer (ver mostrarToastDesfazer, definido junto com o
// resto das funções utilitárias de Qualidade).
window.excluirAchadoQualidade = function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;

    // Some da tela na hora (otimista) — se a pessoa desfizer, a linha
    // volta a aparecer.
    const el = document.getElementById(`achado-linha-${achadoId}`);
    if (el) el.style.display = 'none';

    mostrarToastDesfazer('Achado excluído.', async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/qualidade/achados/excluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: achadoId })
            });
            await window.carregarListaQualidade();
        } catch (e) {
            console.error('⚠️ Erro ao excluir achado:', e);
        }
    }, () => window.recarregarAchadosModal(registroId, pecaId, true));
};

window.recarregarAchadosModal = async function(registroId, pecaId, podeEditar) {
    const corpo = document.getElementById('modal-achados-qualidade-lista');
    if (!corpo) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/${registroId}/achados`, { cache: 'no-store' });
        const achados = resp.ok ? await resp.json() : [];

        if (!Array.isArray(achados) || achados.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Nenhum achado registrado ainda.</div>`;
            return;
        }

        corpo.innerHTML = achados.map(a => {
            const resolvido = a.status === 'Resolvido';
            const totalFotos = Number(a.total_fotos) || 0;
            const descricaoEscapada = (a.descricao || '').replace(/'/g, "\\'");
            return `
            <div id="achado-linha-${a.id}" style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
                ${a.foto_capa ? `
                    <div style="position:relative; flex-shrink:0; cursor:pointer;" onclick="window.abrirGaleriaAchadoQualidade(${a.id}, '${pecaId}')">
                        <img src="${a.foto_capa}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">
                        ${totalFotos > 1 ? `<span style="position:absolute; bottom:-4px; right:-4px; background:rgba(0,0,0,0.75); color:#fff; font-size:9px; padding:1px 5px; border-radius:8px;"><i class="fas fa-images"></i> ${totalFotos}</span>` : ''}
                    </div>
                ` : `<div style="width:50px; height:50px; flex-shrink:0;"></div>`}
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; color:var(--text-body); ${resolvido ? 'text-decoration:line-through; opacity:0.6;' : ''}">${a.descricao}</div>
                    <div style="font-size:10px; color:var(--text-accent);">
                        ${a.criado_por || 'Sistema'} · ${a.criado_em || ''}
                        ${resolvido ? `<br>✅ Resolvido por ${a.resolvido_por || ''} · ${a.resolvido_em || ''}` : ''}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0; align-items:flex-end;">
                    ${podeEditar ? `
                        <button type="button" onclick="window.${resolvido ? 'reabrirAchadoQualidade' : 'resolverAchadoQualidade'}(${a.id}, ${registroId}, '${pecaId}')" style="padding:4px 8px; font-size:10px; border-radius:6px; border:1px solid currentColor; background:${resolvido ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)'}; color:${resolvido ? 'var(--warning)' : 'var(--success)'}; cursor:pointer;">
                            ${resolvido ? '<i class="fas fa-rotate-left"></i> Reabrir' : '<i class="fas fa-check"></i> Resolver'}
                        </button>
                        <div style="display:flex; gap:4px;">
                            <button type="button" title="Editar" onclick="window.editarAchadoQualidade(${a.id}, ${registroId}, '${pecaId}', '${descricaoEscapada}')" style="padding:3px 7px; font-size:10px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--text-muted); cursor:pointer;"><i class="fas fa-pen"></i></button>
                            <button type="button" title="Excluir" onclick="window.excluirAchadoQualidade(${a.id}, ${registroId}, '${pecaId}')" style="padding:3px 7px; font-size:10px; border-radius:6px; border:1px solid var(--border); background:transparent; color:var(--danger); cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </div>
                    ` : `<span style="font-size:10px; font-weight:700; color:${resolvido ? 'var(--success)' : 'var(--warning)'};">${resolvido ? '✅' : '⏳'}</span>`}
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error('⚠️ Erro ao carregar achados:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:16px 0;">Não foi possível carregar.</div>`;
    }
};

// Galeria de fotos de UM achado (quando tem mais de 1) — reaproveita o
// mesmo padrão da galeria de OS/entrada-saída.
window.abrirGaleriaAchadoQualidade = async function(achadoId, pecaId) {
    let overlay = document.getElementById('lightbox-galeria-achado-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightbox-galeria-achado-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10097';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:480px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-triangle-exclamation"></i> Fotos do achado</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('lightbox-galeria-achado-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="galeria-achado-corpo" style="display:flex; gap:10px; flex-wrap:wrap;"></div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    const corpo = document.getElementById('galeria-achado-corpo');
    corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Carregando...</div>`;
    overlay.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/${achadoId}/fotos`, { cache: 'no-store' });
        const fotos = resp.ok ? await resp.json() : [];

        if (!Array.isArray(fotos) || fotos.length === 0) {
            corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Nenhuma foto encontrada.</div>`;
            return;
        }

        corpo.innerHTML = fotos.map((f, i) => `
            <img src="${f.foto_base64}"
                 style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                 onclick="window.abrirFotoAmpliada('${f.foto_base64}', 'Achado — ${pecaId} ${i + 1}')">
        `).join('');
    } catch (e) {
        console.error('⚠️ Não consegui carregar as fotos do achado:', e);
        corpo.innerHTML = `<div class="text-muted" style="padding:20px 0;">Não foi possível carregar.</div>`;
    }
};

window.resolverAchadoQualidade = async function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/resolver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId, foto_base64: null, operador })
        });
        if (!resp.ok) { alert('Não foi possível marcar como resolvido.'); return; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao resolver achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.reabrirAchadoQualidade = async function(achadoId, registroId, pecaId) {
    if (!verificarAcesso()) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/qualidade/achados/reabrir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: achadoId })
        });
        if (!resp.ok) { alert('Não foi possível reabrir o achado.'); return; }
        await window.recarregarAchadosModal(registroId, pecaId, true);
        await window.carregarListaQualidade();
    } catch (e) {
        console.error('⚠️ Erro ao reabrir achado:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.excluirQualidade = async function(id) {
    if (!verificarAcesso()) return;
    if (!confirm('Excluir este registro de qualidade?')) return;

    // 🆕 Desfazer exclusão: some da lista na hora (sem recarregar do
    // servidor, que ainda tem o registro) e só chama a API de verdade
    // depois de alguns segundos — dá tempo de desfazer se apertou errado.
    QUALIDADE_CACHE = QUALIDADE_CACHE.filter(r => r.id !== id);
    window.renderizarListaQualidade();

    mostrarToastDesfazer('Registro de Qualidade excluído.', async () => {
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/qualidade/excluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch (e) {
            console.error('⚠️ Erro ao excluir registro de qualidade:', e);
        }
    }, () => window.carregarListaQualidade());
};

// ==========================================================================
// 🆕 BOTÃO "VOLTAR" DO CELULAR FECHA MODAL EM VEZ DE SAIR DO APP
// ==========================================================================
// Problema: no celular (principalmente instalado como PWA), abrir um
// modal (Folhão, Checklist de Execução, "Quem executou", etc.) NÃO
// registra nada no histórico do navegador. Resultado: o botão/gesto de
// "voltar" do Android (ou o botão físico) não fecha o modal — ele volta
// a página inteira, o que geralmente tira a pessoa do app.
//
// A correção é genérica (cobre QUALQUER modal do sistema, atual ou
// futuro, sem precisar editar cada "abrirModalX" espalhado por vários
// arquivos): um MutationObserver fica de olho em toda troca da classe
// "hidden" em qualquer ".modal-overlay". Quando um modal ABRE, empilha
// 1 estado no histórico do navegador. Quando ESSE estado é "consumido"
// pelo botão voltar (evento popstate), a gente fecha o modal que
// estiver aberto no topo — sem sair da página. Se o modal for fechado
// do jeito normal (botão "Fechar"/"X"/"Cancelar"), a gente consome
// sozinho o estado extra que tínhamos empilhado, pra não sobrar um
// "voltar" fantasma que não muda nada visualmente.
// ==========================================================================
(function () {
    let fechandoViaBotaoVoltar = false;
    let consumindoEstadoInterno = false;

    function modaisAbertos() {
        return Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
    }

    // Tenta fechar um modal "do jeito certo": clicando no botão de
    // fechar/cancelar de verdade dele (isso é importante pros modais
    // dinâmicos que ficam esperando uma Promise resolver — ex: "Sim ou
    // Não?", "Quem executou?" — clicar o botão de cancelar de verdade
    // resolve a Promise como cancelado, em vez de travar aquela etapa
    // esperando pra sempre por uma resposta que nunca vai chegar).
    function tentarFecharModal(modalEl) {
        const btn = modalEl.querySelector(
            '[id$="-cancelar"], .btn-close-emergency, .btn-close-modal'
        );
        if (btn) { btn.click(); return; }
        modalEl.classList.add('hidden');
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            if (m.type !== 'attributes' || m.attributeName !== 'class') return;
            const el = m.target;
            if (!(el.classList && el.classList.contains('modal-overlay'))) return;

            const estaEscondidoAgora = el.classList.contains('hidden');
            const estavaEscondidoAntes = (m.oldValue || '').split(' ').includes('hidden');

            if (estavaEscondidoAntes && !estaEscondidoAgora) {
                // Modal ABRIU agora — empilha o estado no histórico.
                try { history.pushState({ omsModal: true }, ''); } catch (e) { /* ambiente sem History API — segue sem quebrar */ }
            } else if (!estavaEscondidoAntes && estaEscondidoAgora && !fechandoViaBotaoVoltar) {
                // Modal FECHOU (por um botão normal, não pelo "voltar")
                // — consome o estado extra que tínhamos empilhado.
                //
                // 🐛 CORRIGIDO ("marco a etapa, escolho o colaborador, e o
                // Checklist inteiro fecha junto"): o history.back() abaixo
                // TAMBÉM dispara um evento popstate — só que esse popstate
                // é gerado por NÓS MESMOS consumindo o estado empilhado,
                // não pelo usuário clicando em voltar de verdade. Sem essa
                // flag, o listener de popstate lá embaixo não conseguia
                // diferenciar os dois casos, achava que era o botão voltar
                // físico e fechava o modal que estivesse "no topo" nesse
                // instante — no caso, o Checklist de Execução por trás do
                // modal "Quem executou" que tinha acabado de fechar.
                if (history.state && history.state.omsModal) {
                    consumindoEstadoInterno = true;
                    try { history.back(); } catch (e) { /* nada a fazer */ }
                    setTimeout(() => { consumindoEstadoInterno = false; }, 0);
                }
            }
        });
    });

    function iniciarObservadorModais() {
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            attributeOldValue: true,
            subtree: true
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarObservadorModais);
    } else {
        iniciarObservadorModais();
    }

    window.addEventListener('popstate', () => {
        if (consumindoEstadoInterno) return; // popstate gerado por nós mesmos — ignora

        const abertos = modaisAbertos();
        if (abertos.length === 0) return; // nenhum modal aberto — deixa o navegador seguir normal

        // Fecha o modal "de cima" (maior z-index calculado) — geralmente
        // o último a ter sido aberto.
        let topo = abertos[0];
        let maiorZ = -1;
        abertos.forEach((m) => {
            const z = parseInt(window.getComputedStyle(m).zIndex, 10) || 0;
            if (z >= maiorZ) { maiorZ = z; topo = m; }
        });

        fechandoViaBotaoVoltar = true;
        tentarFecharModal(topo);
        setTimeout(() => { fechandoViaBotaoVoltar = false; }, 0);
    });
})();