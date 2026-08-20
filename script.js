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
} from './dados.js';

import {
    BANCO_ATIVOS,
    sincronizarAtivosReaisMCC4,
    salvarPecaNoPython,
    salvarHistoricoNoPython,
    sincronizarRolosReais,
    salvarAjusteRoloNoPython,
    sincronizarHidraulicaReal,
    salvarAjusteHidraulicaNoPython,
    resolverApiBase
} from './banco.js?v=5';

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("⚠️ Este navegador não suporta push notification.");
        return false;
    }
    const permissao = await Notification.requestPermission();
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

let MODO_MODAL_RELATORIO = {};
let ID_HISTORICO_ATUAL = null;

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
            finalizarLogin("Lucas", CADASTRO_MATRICULAS[matriculaInput], matriculaInput);
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
            await fluxoDefinirNovaSenha(matriculaUpper, senhaInput, resultado.nome, resultado.cargo);
            return;
        }

        finalizarLogin(resultado.nome, resultado.cargo, matriculaUpper);
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
async function fluxoDefinirNovaSenha(matricula, senhaAtual, nome, cargo) {
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
            finalizarLogin(nome, cargo, matricula);
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
async function finalizarLogin(nome, cargo, matricula) {
    OPERADOR_LOGADO = { matricula: matricula, nome: `${nome} [${cargo}]` };
    localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));

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
    if (typeof window.carregarAtivosDoPython === 'function') await window.carregarAtivosDoPython();
    if (typeof sincronizarRolosReais === 'function') await sincronizarRolosReais();
    if (typeof sincronizarHidraulicaReal === 'function') await sincronizarHidraulicaReal();

    if (typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
    if (typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderRolos === 'function') renderRolos();
    if (typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();
    if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();

    // 🔧 Técnico entra direto no Painel do Técnico (visão simplificada e
    // com as ações do dia a dia), em vez do Painel Geral OMS — que é mais
    // voltado pra visão gerencial/completa da planta.
    const ehTecnico = (cargo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("tecnico");
    if (ehTecnico && typeof window.abrirAba === 'function') {
        const navTecnico = document.getElementById("nav-tecnico");
        if (navTecnico) window.abrirAba({ preventDefault(){}, currentTarget: navTecnico }, "aba-tecnico");
    }
}

function fazerLogout() {
    if (confirm("Encerrar o turno?")) {
        registrarHistorico("SISTEMA", "Turno encerrado.");
        OPERADOR_LOGADO = null;
        localStorage.removeItem("oms_operador_v32_local");
        document.getElementById("container-sistema-oms").style.display = "none";
        document.getElementById("tela-login-home").style.display = "flex";
        if (typeof ativarPainelDevSeAutorizado === 'function') ativarPainelDevSeAutorizado();
        if (typeof ativarAuditoriaSeAutorizado === 'function') ativarAuditoriaSeAutorizado();
    }
}

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

    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";

    if (typeof atualizarInterfaceUsuario === 'function') {
        try { atualizarInterfaceUsuario(); } catch (e) { console.error('⚠️ Falha ao atualizar a interface (acesso visitante prosseguiu mesmo assim):', e); }
    }
    if (typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Acesso em Modo Visitante (somente leitura) — ${nome}.`);

    // 🔧 Mesma correção do login normal: força uma sincronização real
    // com o backend antes de desenhar a tela, em vez de só reaproveitar
    // o que já estava (ou não estava) carregado.
    if (typeof window.carregarAtivosDoPython === 'function') await window.carregarAtivosDoPython();
    if (typeof sincronizarRolosReais === 'function') await sincronizarRolosReais();
    if (typeof sincronizarHidraulicaReal === 'function') await sincronizarHidraulicaReal();

    if (typeof calcularKpisGlobais === 'function') calcularKpisGlobais();
    if (typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderRolos === 'function') renderRolos();
    if (typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();
    if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
}

function verificarAcesso() {
    if (!OPERADOR_LOGADO) {
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
    if (idAba === "aba-hidraulica") renderHidraulica();
    if (idAba === "aba-almoxarifado") carregarMateriaisDoBackend();
    if (idAba === "aba-historico") renderHistorico();
    if (idAba === "aba-painel") {
        if (typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    }
    if (idAba === "aba-ativos") renderAtivos();
    if (idAba === "aba-fluxo") renderPainelVeios();
    if (idAba === "aba-tecnico") { if (typeof renderPainelTecnico === 'function') renderPainelTecnico(); }
    if (idAba === "aba-oficina") {
        if (typeof carregarOficina === 'function') carregarOficina();
    }
    
    if (idAba === "aba-producao") {
        if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
        if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
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

        tbody.innerHTML = montarLinhasHistorico(acoesDoServidor, [], filtroAtual);
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

function ativarPainelDevSeAutorizado() {
    const link = document.getElementById("nav-dev-teste");
    const divisor = document.getElementById("nav-divider-dev");
    if (!link) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    const autorizado = MATRICULAS_TESTE_FOLHOES.includes(matricula);

    if (autorizado) {
        link.classList.remove("hidden");
        if (divisor) divisor.classList.remove("hidden");
        renderPainelDevTeste();
    } else {
        link.classList.add("hidden");
        if (divisor) divisor.classList.add("hidden");
        const corpo = document.getElementById("dev-teste-table-body");
        if (corpo) corpo.innerHTML = ""; // garante que não sobra nada renderizado de uma sessão anterior
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
                <td>
                    <button class="btn-premium" style="padding:4px 12px; font-size:12px;" onclick="window.abrirFolhaoPorTipo('${item.id}')">
                        <i class="fas fa-file-alt"></i> Abrir Folhão
                    </button>
                </td>
            </tr>
        `).join("");

    tbody.innerHTML = linhas;
}

window.ativarPainelDevSeAutorizado = ativarPainelDevSeAutorizado;
window.renderPainelDevTeste = renderPainelDevTeste;

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
}
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
                const dias = calcularDias(a);
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
                                <button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>
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
function toggleFormAdicionar() {
    const form = document.getElementById("form-novo-equipamento");
    if (form) form.classList.toggle("hidden");
}

window.atualizarPosicoesCadastro = function() {
    const tipo = document.getElementById("add-tipo").value;
    const selectPos = document.getElementById("add-posicao");
    const inputMeta = document.getElementById("add-meta");

    if (!selectPos || !inputMeta) return;
    selectPos.innerHTML = "";

    if (!tipo) {
        selectPos.innerHTML = `<option value="">Selecione um tipo primeiro...</option>`;
        inputMeta.value = "";
        return;
    }

    const familia = tipo.split("|")[0] || "";
    const mcc = tipo.split("|")[1] || "";

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

    if (!tagInput || !tipoSelect || !metaInput) {
        alert("Erro: Elementos do formulário não encontrados no HTML.");
        return;
    }

    const id = tagInput.value.trim().toUpperCase();
    const tipoCompleto = tipoSelect.value; // Ex: "Molde|2/3"
    const meta = parseFloat(metaInput.value) || 0;
    const tonAtual = parseFloat(tonInput?.value) || 0; // 0 = peça nova, sem desgaste
    const posicao = posicaoSelect ? posicaoSelect.value : "";

    if (!id || !tipoCompleto) {
        alert("Por favor, preencha a TAG e selecione o Tipo de Família.");
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

    const novoItem = {
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
        registrarHistorico(id, `📦 Peça cadastrada no Estoque Reserva${rotuloDesgaste}.`);
    }

    // Atualiza as telas do sistema
    if (typeof window.renderAtivos === 'function') window.renderAtivos();
    if (typeof window.renderReservas === 'function') window.renderReservas();
    if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();

    // Limpa os campos e fecha o formulário
    tagInput.value = '';
    metaInput.value = '';
    if (tonInput) tonInput.value = '';
    tipoSelect.value = '';
    if (typeof window.toggleFormAdicionar === 'function') {
        window.toggleFormAdicionar();
    }

    alert(`✅ Equipamento [${id}] cadastrado com sucesso no Estoque Reserva!`);
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
    const listaReparo = document.getElementById("tecnico-lista-reparo");
    const listaCriticos = document.getElementById("tecnico-lista-criticos");
    const listaReservas = document.getElementById("tecnico-lista-reservas");
    if (!listaReparo || !listaCriticos || !listaReservas) return;

    const linhaVazia = (msg) => `<div class="text-muted" style="text-align:center; padding: 18px 0;">${msg}</div>`;

    // ---- EM REPARO (toque abre o folhão direto) ----
    const emReparo = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    if (emReparo.length === 0) {
        listaReparo.innerHTML = linhaVazia("Nenhum equipamento em reparo agora. 🎉");
    } else {
        listaReparo.innerHTML = emReparo.map(a => {
            const dias = calcularDias(a);
            return `
                <div class="tecnico-item-linha" onclick="window.abrirFolhaoPorTipo('${a.id}')">
                    <div>
                        <span class="font-code" style="font-weight:700; color:var(--text-heading);">${a.id}</span>
                        <span class="ind-card-tag bg-tag" style="margin-left:6px;">${a.tipo}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:var(--warning); font-weight:700; font-size:13px;">${dias} dias</span>
                        <i class="fas fa-chevron-right" style="margin-left:8px; color:var(--text-muted);"></i>
                    </div>
                </div>`;
        }).join("");
    }

    // ---- CRÍTICOS (≥80%, instalados) ----
    const criticos = BANCO_ATIVOS
        .filter(a => a.local && a.local.includes("Veio") && !a.local.includes("Oficina"))
        .map(a => ({ ...a, pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }))
        .filter(a => a.pct >= 80)
        .sort((a, b) => b.pct - a.pct);

    if (criticos.length === 0) {
        listaCriticos.innerHTML = linhaVazia("Nenhum equipamento crítico no momento. ✅");
    } else {
        listaCriticos.innerHTML = criticos.map(a => `
            <div class="tecnico-item-linha" onclick="window.abrirHistoricoIndividual('${a.id}')">
                <div>
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${a.id}</span>
                    <span class="ind-card-tag bg-tag" style="margin-left:6px;">${a.tipo}</span>
                </div>
                <div style="text-align:right;">
                    <span style="color:var(--danger); font-weight:700; font-size:13px;">${a.pct.toFixed(1)}%</span>
                    <i class="fas fa-chevron-right" style="margin-left:8px; color:var(--text-muted);"></i>
                </div>
            </div>`).join("");
    }

    // ---- RESERVAS PRONTAS PRA SWAP ----
    const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
    if (reservas.length === 0) {
        listaReservas.innerHTML = linhaVazia("Nenhuma peça em estoque reserva.");
    } else {
        listaReservas.innerHTML = reservas.map(a => `
            <div class="tecnico-item-linha" onclick="window.abrirAba(null,'aba-reservas')">
                <div>
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${a.id}</span>
                    <span class="ind-card-tag bg-tag" style="margin-left:6px;">${a.tipo}</span>
                </div>
                <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
            </div>`).join("");
    }
}
window.renderPainelTecnico = renderPainelTecnico;

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

        container.innerHTML = `
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">
                <i class="fas fa-images"></i> Fotos anexadas (${fotos.length})
            </div>
            <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px;">
                ${fotos.map(f => `
                    <img src="${f.foto_base64}"
                         style="width:90px; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer; flex-shrink:0;"
                         onclick="window.abrirFotoAmpliada('${f.foto_base64}', '${(f.operador || 'Sistema').replace(/'/g, "\\'")} — ${f.data_hora || ''}')"
                         title="${f.data_hora} — ${f.operador}">
                `).join('')}
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
    if (typeof calcularKpisGlobais === 'function') {
        calcularKpisGlobais();
    }
    atualizarNovosKPIs();
    atualizarKPIsAvancados();
    renderizarTopCriticos();
    renderizarFeedAtividadeRecente();
}

// ==========================================
// FEED DE ATIVIDADE RECENTE (dados reais do histórico)
// ==========================================
function renderizarFeedAtividadeRecente() {
    const container = document.getElementById('home-timeline-feed');
    if (!container) return;

    const itens = (HISTORICO_ACOES || []).slice(0, 6);

    if (itens.length === 0) {
        container.innerHTML = `<li class="text-muted" style="text-align:center; padding: 10px 0;">Nenhuma atividade registrada ainda.</li>`;
        return;
    }

    container.innerHTML = itens.map(h => {
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
}

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

// Uma atividade está "atrasada" quando ainda não foi concluída, TEM um
// prazo definido, e esse prazo já passou. Sem prazo definido, nunca
// conta como atrasada (não dá pra saber isso sem uma data de referência).
function atividadeEstaAtrasada(x) {
    if (x.status === 'Concluído' || !x.prazo) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.prazo < hoje;
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
let OFICINA_EQUIPE_ATUAL = []; // equipe da área aberta no momento (usada no seletor de Responsável)
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

window.abrirAreaOficina = async function(chave) {
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
        tabsContainer.innerHTML = abasDaArea.map((aba, i) => `
            <button class="folhao-tab ${i === 0 ? 'active' : ''}" onclick="window.trocarAbaAreaOficina(event,'${aba.chave}')">
                <i class="fas ${aba.icone}"></i> ${aba.label}
            </button>
        `).join('');
    }
    // Esconde as seções que essa área não usa; mostra a 1ª por padrão.
    ['atividades', 'materiais', 'equipe', 'procedimentos', 'notas'].forEach(s => {
        const usaEssaAba = abasDaArea.some(ab => ab.chave === s);
        document.getElementById(`area-oficina-secao-${s}`)?.classList.toggle('hidden', !(usaEssaAba && s === abasDaArea[0].chave));
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
    window.abrirAba(null, 'aba-oficina');
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
    let itens = todasDaArea;
    if (OFICINA_FILTRO_STATUS_ATUAL) {
        itens = itens.filter(x => x.status === OFICINA_FILTRO_STATUS_ATUAL);
    }

    const qtdPendente = todasDaArea.filter(x => x.status === 'Pendente').length;
    const qtdAndamento = todasDaArea.filter(x => x.status === 'Em Andamento').length;
    const qtdAtrasada = todasDaArea.filter(x => atividadeEstaAtrasada(x)).length;

    const statsHtml = `
        <div class="area-oficina-stats">
            <div class="area-oficina-stat"><strong style="color:var(--warning);">${qtdPendente}</strong><span>Pendentes</span></div>
            <div class="area-oficina-stat"><strong style="color:var(--info);">${qtdAndamento}</strong><span>Em Andamento</span></div>
            <div class="area-oficina-stat"><strong style="color:${qtdAtrasada > 0 ? 'var(--danger)' : 'var(--success)'};">${qtdAtrasada}</strong><span>Atrasadas</span></div>
        </div>
    `;

    if (itens.length === 0) {
        container.innerHTML = statsHtml + `
            <div class="area-oficina-vazio">
                <i class="fas fa-clipboard-check"></i>
                <p>Nenhuma atividade encontrada${OFICINA_FILTRO_STATUS_ATUAL ? ' com esse filtro' : ' nesta área ainda'}.</p>
            </div>
        `;
        return;
    }

    const corStatus = { 'Pendente': 'var(--warning)', 'Em Andamento': 'var(--info)', 'Concluído': 'var(--success)' };
    const iconePrioridade = { 'Alta': '🔴', 'Baixa': '🔵' };

    container.innerHTML = statsHtml + itens.map(x => {
        const atrasada = atividadeEstaAtrasada(x);
        const prazoFormatado = x.prazo ? x.prazo.split('-').reverse().join('/') : null;
        const corBorda = atrasada ? 'var(--danger)' : (corStatus[x.status] || 'var(--text-muted)');
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
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                    ${x.responsavel ? `${x.responsavel} · ` : ''}${x.criado_em || ''}
                    ${prazoFormatado ? ` · Prazo: <span style="color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${atrasada ? '700' : '400'};">${prazoFormatado}</span>` : ''}
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
                ${x.status !== 'Concluído' ? `
                    <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.mudarStatusAtividadeOficina(${x.id}, '${x.status === 'Pendente' ? 'Em Andamento' : 'Concluído'}')">
                        ${x.status === 'Pendente' ? 'Iniciar' : 'Concluir'}
                    </button>
                ` : ''}
                <button class="btn-premium" style="padding:4px 10px; font-size:11px;" onclick="window.editarAtividadeOficina(${x.id})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.excluirAtividadeOficina(${x.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
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
    const equipamentoId = OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento'
        ? document.getElementById('area-oficina-equipamento')?.value
        : null;

    if (OFICINA_TIPO_ATIVIDADE_ATUAL === 'equipamento' && !equipamentoId) {
        return alert('Selecione o equipamento, ou troque para "Tarefa Avulsa".');
    }
    if (!descricao) return alert('Descreva a atividade.');

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
                foto_base64: OFICINA_FOTO_BASE64 || null
              }
            : {
                area: OFICINA_AREA_ATUAL,
                equipamento_id: equipamentoId || null,
                descricao,
                responsavel: responsavel || null,
                prioridade,
                prazo,
                foto_base64: OFICINA_FOTO_BASE64 || null,
                operador
              };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });

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
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/oficina/atividade/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus })
        });
        if (!resp.ok) {
            alert('Não foi possível atualizar o status.');
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

        const respTurno = document.getElementById('area-oficina-responsavel-turno');
        if (respTurno) respTurno.textContent = OFICINA_EQUIPE_ATUAL.length > 0 ? OFICINA_EQUIPE_ATUAL[0].nome : 'Sem responsável definido';

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

        container.innerHTML = OFICINA_EQUIPE_ATUAL.map(p => {
            const iniciais = p.nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
            return `
            <div class="equipe-card">
                <div class="equipe-avatar">${iniciais}</div>
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text-heading); font-size:13px;">${p.nome}</div>
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
    if (idAba === "aba-reservas" && typeof renderReservas === 'function') renderReservas();
    if (idAba === "aba-rolos" && typeof renderRolos === 'function') renderRolos();
    if (idAba === "aba-almoxarifado" && typeof carregarMateriaisDoBackend === 'function') carregarMateriaisDoBackend();
    if (idAba === "aba-historico" && typeof renderHistorico === 'function') renderHistorico();
    if (idAba === "aba-painel" && typeof atualizarPainelCompleto === 'function') atualizarPainelCompleto();
    if (idAba === "aba-ativos" && typeof renderAtivos === 'function') renderAtivos();
    if (idAba === "aba-fluxo" && typeof renderPainelVeios === 'function') renderPainelVeios();
    if (idAba === "aba-tecnico" && typeof renderPainelTecnico === 'function') renderPainelTecnico();
    if (idAba === "aba-oficina" && typeof carregarOficina === 'function') {
        carregarOficina();
        if (typeof carregarCatalogoMateriaisOficina === 'function') carregarCatalogoMateriaisOficina();
    }
    if (idAba === "aba-ocorrencia" && typeof window.renderAbaOcorrencia === 'function') window.renderAbaOcorrencia();
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
            body: JSON.stringify({ qtd_mcc2: prodMcc2, qtd_mcc3: prodMcc3, qtd_mcc4: prodMcc4, operador: window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Sistema" })
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
            body: JSON.stringify({ qtd_mcc2: m2, qtd_mcc3: m3, qtd_mcc4: m4, operador: window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Desconhecido" })
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
            body: JSON.stringify({ log_id: id_log, operador: window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Desconhecido" })
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
            body: JSON.stringify({ log_id: id_log, operador: window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Desconhecido" })
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
// 4. HISTÓRICO DE LAUDOS E SWAP (PRESERVADOS)
// ==============================================================
window.salvarLaudoNoHistorico = function(tag, tipo, htmlPDF) {
    const laudos = JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
    const agora = new Date();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    laudos.unshift({ id: id, tag: tag, tipo: tipo, data: agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR'), timestamp: agora.getTime(), html: htmlPDF });
    if (laudos.length > 200) laudos.pop();
    localStorage.setItem("oms_laudos_salvos", JSON.stringify(laudos));
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
    return id;
};

window.excluirLaudo = function(id) {
    let laudos = JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
    laudos = laudos.filter(l => l.id !== id);
    localStorage.setItem("oms_laudos_salvos", JSON.stringify(laudos));
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.visualizarLaudo = function(id) {
    const laudos = JSON.parse(localStorage.getItem("oms_laudos_salvos")) || [];
    const laudo = laudos.find(l => l.id === id);
    if (!laudo) return alert("Laudo não encontrado.");
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) { win.document.write(laudo.html); win.document.close(); } 
    else { const p = document.getElementById('print-content'); if (p) { p.innerHTML = laudo.html; window.print(); } }
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
if (typeof entrarComoVisitante !== 'undefined') window.entrarComoVisitante = entrarComoVisitante;
if (typeof processarAutenticacaoHome !== 'undefined') window.processarAutenticacaoHome = processarAutenticacaoHome;
window.setOperadorLogado = function(op) { OPERADOR_LOGADO = op; };
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
// ABA "REGISTRO DE OCORRÊNCIA"
// ==========================================
let FOTO_OCORRENCIA_BASE64 = null;
let FILTRO_OCORRENCIA_ATUAL = '';

window.renderAbaOcorrencia = function() {
    const select = document.getElementById("ocorrencia-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
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
        const resp = await fetch(`${apiBase}/api/registro_com_foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                acao: acaoFormatada,
                operador: operador,
                categoria: categoria,
                foto_base64: FOTO_OCORRENCIA_BASE64 || null
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
        const registros = await resp.json();

        if (!Array.isArray(registros) || registros.length === 0) {
            container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum registro encontrado.</div>`;
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
                    <div style="font-size:11px; color:var(--text-accent);">${r.operador}</div>
                </div>
            </div>
        `).join("");
    } catch (e) {
        console.error('⚠️ Erro ao carregar ocorrências:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};

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