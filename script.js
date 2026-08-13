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
function registrarHistorico(tag, acao) {
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
        salvarHistoricoNoPython(evento);
    }
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

        // A API já devolve mais recente primeiro (ORDER BY id DESC),
        // igual à ordem que a tabela local usa (unshift a cada evento novo).
        tbody.innerHTML = eventos.map(e => {
            const { icone, cor } = iconePorEvento(e.acao);
            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${e.data_hora || '—'}</td>
                <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${e.acao || ''}</td>
                <td style="font-size: 11px; color: var(--text-accent);">${e.operador || 'Sistema'}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do servidor pro Prontuário (mantendo o que tinha local):', e);
    }
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
        registrarHistorico(id, `Sacado da linha (${loc}) em ${agora} p/ Reparo. ${laudo}`);

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
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.remove("hidden");
};
window.fecharModalIntervencao = function() {
    const modal = document.getElementById("modal-intervencao");
    if (modal) modal.classList.add("hidden");
};
window.confirmarIntervencao = function() {
    const equipamentoId = document.getElementById("intervencao-equipamento")?.value;
    const texto = document.getElementById("intervencao-texto")?.value.trim();

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (!texto) return alert("Descreva o que foi feito.");

    registrarHistorico(equipamentoId, `🔧 <span style="color:#eab308;">[INTERVENÇÃO]</span> ${texto}`);
    window.fecharModalIntervencao();
    alert(`✅ Intervenção registrada em [${equipamentoId}].`);
};

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
// CARREGAR DADOS DA OFICINA (MARCO ZERO)
// ==========================================
window.carregarOficina = async function() {
    const container = document.getElementById('oficina-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-tools"></i>
            <h3>Módulo de Gestão da Oficina em Desenvolvimento</h3>
            <p>
                Estamos estruturando uma solução completa para o controle centralizado das operações de manutenção.<br><br>
                Em breve, a plataforma contará com indicadores avançados e acompanhamento dinâmico da porcentagem de finalização dos equipamentos em tempo real.
            </p>
            <p class="empty-tag">Próxima Atualização do Sistema</p>
        </div>
    `;
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
        document.getElementById(event.currentTarget.id).classList.add("active");
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
    if (idAba === "aba-oficina" && typeof carregarOficina === 'function') carregarOficina();
    
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
            body: JSON.stringify({ mcc2: prodMcc2, mcc3: prodMcc3, mcc4: prodMcc4, operador: window.OPERADOR_LOGADO ? window.OPERADOR_LOGADO.nome : "Sistema" })
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

    let pecaAntiga = null;
    for (const p of BANCO_ATIVOS) {
        if ((p.veio === veio && p.status === "Instalado") || (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"))) {
            if (p.posicaoFixa === slotChassi || p.id.includes(slotChassi)) { pecaAntiga = p; break; }
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
                window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} em ${agora} (substituiu ${pecaAntiga.id}). Contagem de dias na máquina reiniciada.`);
                window.registrarHistorico(pecaAntiga.id, `📤 Saiu do slot ${slotChassi} do Veio ${veio} em ${agora}, substituída por ${pecaReserva.id}. Foi para reparo — contagem de dias em reparo reiniciada.`);
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

            if (window.registrarHistorico) window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} (gaveta vazia). Contagem de dias na máquina reiniciada.`);
            
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