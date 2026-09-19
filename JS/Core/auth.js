// ==========================================================================
// AUTENTICAÇÃO — extraído de script.js na modularização
// ==========================================================================
// Login (colaborador com matrícula/senha), primeiro acesso (definir
// senha), finalização do login (comum a dev/colaborador/primeiro
// acesso) e modo Visitante (somente leitura).

import { resolverApiBase, sincronizarRolosReais, sincronizarHidraulicaReal, setOperador as setOperadorBanco } from './banco.js?v=5';
import { OPERADOR_LOGADO, setOperadorLogado, MATRICULAS_ADM, recarregarRolosEHidraulicaLocal } from './estado.js';
import { executarSeguro, executarSeguroAsync, fetchComRetry } from './utils.js';
import { atualizarInterfaceUsuario } from './navegacao.js';

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
// AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================
export async function processarAutenticacaoHome() {
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
        // 🔒 "Backdoor de dev hardcoded em produção" — removido numa revisão
        // de segurança. Existia aqui um atalho (matrícula "061012", senha
        // igual à matrícula) que logava como admin total ("Lucas
        // Desenvolvedor", isAdm forçado) sem nunca chamar o backend — bastava
        // ler o código-fonte (JS de cliente, público) pra descobrir. Login de
        // desenvolvedor local, se precisar, deve continuar existindo só numa
        // cópia local/.env, nunca commitado no código que todo mundo baixa.
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

        finalizarLogin(resultado.nome, resultado.cargo, matriculaUpper, resultado.area, resultado.is_adm, resultado.token);
    } catch (e) {
        console.error("Erro no login:", e);
        alert("Não foi possível conectar ao servidor mesmo após tentar novamente. Verifique sua internet e tente mais uma vez em alguns segundos.");
    } finally {
        if (btnEntrar) { btnEntrar.disabled = false; btnEntrar.innerText = "Autenticar Terminal"; }
    }
}
window.processarAutenticacaoHome = processarAutenticacaoHome;

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
            finalizarLogin(nome, cargo, matricula, area, isAdm, resultado.token);
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
async function finalizarLogin(nome, cargo, matricula, area, isAdm, token) {
    // 🆕 Área do técnico + flag de ADM (vêm do login no back-end; no
    // acesso local de dev, is_adm é forçado true). Usado no Painel do
    // Técnico pra filtrar "Em Reparo" / "Em Andamento" só pelos
    // equipamentos da área da pessoa — ADM (as 3 matrículas fixas) vê
    // tudo, sem filtro nenhum, em qualquer aba (mobile ou PC).
    //
    // 🆕 token: veio do /api/colaboradores/login (ou /definir_senha) —
    // achado numa revisão de segurança: as rotas admin (mudar cargo,
    // resetar senha, desfazer apontamento) não tinham NENHUMA checagem
    // no servidor, só um prompt de "senha master" hardcoded no JS. Esse
    // token agora vai no header Authorization das chamadas admin (ver
    // resetarSenhaColaborador/mudarCargoColaborador/alternarAtivoColaborador
    // e desfazerApontamentoGeral/Molde). No acesso local de dev (sem
    // passar pelo servidor) não existe token real — is_adm fica forçado
    // true só pra mostrar os botões na tela, mas o servidor vai
    // recusar (401) qualquer ação admin de verdade sem um token válido,
    // como deve ser.
    setOperadorLogado({
        matricula: matricula,
        nome: `${nome} [${cargo}]`,
        area: area || null,
        isAdm: !!isAdm || MATRICULAS_ADM.includes(matricula),
        token: token || null
    });
    localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
    setOperadorBanco(OPERADOR_LOGADO); // 🔧 mantém a cópia do banco.js sincronizada (ver comentário em window.setOperadorLogado)
    if (typeof window.iniciarHeartbeatColaborador === 'function') window.iniciarHeartbeatColaborador();
    if (typeof window.iniciarNotificacaoGlobalChat === 'function') window.iniciarNotificacaoGlobalChat();
    if (typeof window.iniciarNotificacaoGlobalFeed === 'function') window.iniciarNotificacaoGlobalFeed();

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
    if (typeof window.registrarHistorico === 'function') window.registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
    window.ativarPushNotification();
    // 🆕 Avisos do Sistema (ver seção "AVISOS DO SISTEMA" mais abaixo):
    // comunicado do ADM que precisa de leitura confirmada. Só pra quem
    // tem matrícula real (visitante não entra nessa, matricula é null).
    if (typeof window.verificarAvisosPendentes === 'function') window.verificarAvisosPendentes();
    if (typeof window.atualizarBadgeChatAreaAdm === 'function') executarSeguro(() => window.atualizarBadgeChatAreaAdm(), 'atualizarBadgeChatAreaAdm');

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
    recarregarRolosEHidraulicaLocal();

    if (typeof window.calcularKpisGlobais === 'function') executarSeguro(() => window.calcularKpisGlobais(), 'calcularKpisGlobais');
    if (typeof window.renderPainelVeios === 'function') executarSeguro(() => window.renderPainelVeios(), 'renderPainelVeios');
    if (typeof window.renderAtivos === 'function') executarSeguro(() => window.renderAtivos(), 'renderAtivos');
    if (typeof window.renderReparos === 'function') executarSeguro(() => window.renderReparos(), 'renderReparos');
    if (typeof window.renderReservas === 'function') executarSeguro(() => window.renderReservas(), 'renderReservas');
    if (typeof window.renderRolos === 'function') executarSeguro(() => window.renderRolos(), 'renderRolos');
    if (typeof window.carregarMateriaisDoBackend === 'function') executarSeguro(() => window.carregarMateriaisDoBackend(), 'carregarMateriaisDoBackend');
    if (typeof window.atualizarPainelCompleto === 'function') executarSeguro(() => window.atualizarPainelCompleto(), 'atualizarPainelCompleto');

    // 🔧 Técnico entra direto no Painel do Técnico (visão simplificada e
    // com as ações do dia a dia), em vez do Painel Geral OMS — que é mais
    // voltado pra visão gerencial/completa da planta.
    const ehTecnico = (cargo || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes("tecnico");
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
export async function entrarComoVisitante(nomeDigitado) {
    const nome = (nomeDigitado || "Visitante").trim();
    setOperadorLogado({ matricula: null, nome: nome, visitante: true });
    localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
    setOperadorBanco(OPERADOR_LOGADO); // 🔧 mantém a cópia do banco.js sincronizada (ver comentário em window.setOperadorLogado)

    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";

    if (typeof atualizarInterfaceUsuario === 'function') {
        try { atualizarInterfaceUsuario(); } catch (e) { console.error('⚠️ Falha ao atualizar a interface (acesso visitante prosseguiu mesmo assim):', e); }
    }
    if (typeof window.registrarHistorico === 'function') window.registrarHistorico("AUTENTICAÇÃO", `Acesso em Modo Visitante (somente leitura) — ${nome}.`);

    // 🔧 Mesma correção do login normal: força uma sincronização real
    // com o backend antes de desenhar a tela, em vez de só reaproveitar
    // o que já estava (ou não estava) carregado.
    if (typeof window.carregarAtivosDoPython === 'function') await executarSeguroAsync(() => window.carregarAtivosDoPython(), 'carregarAtivosDoPython');
    if (typeof sincronizarRolosReais === 'function') await executarSeguroAsync(() => sincronizarRolosReais(), 'sincronizarRolosReais');
    if (typeof sincronizarHidraulicaReal === 'function') await executarSeguroAsync(() => sincronizarHidraulicaReal(), 'sincronizarHidraulicaReal');
    recarregarRolosEHidraulicaLocal();

    if (typeof window.calcularKpisGlobais === 'function') executarSeguro(() => window.calcularKpisGlobais(), 'calcularKpisGlobais');
    if (typeof window.renderPainelVeios === 'function') executarSeguro(() => window.renderPainelVeios(), 'renderPainelVeios');
    if (typeof window.renderAtivos === 'function') executarSeguro(() => window.renderAtivos(), 'renderAtivos');
    if (typeof window.renderReparos === 'function') executarSeguro(() => window.renderReparos(), 'renderReparos');
    if (typeof window.renderReservas === 'function') executarSeguro(() => window.renderReservas(), 'renderReservas');
    if (typeof window.renderRolos === 'function') executarSeguro(() => window.renderRolos(), 'renderRolos');
    if (typeof window.carregarMateriaisDoBackend === 'function') executarSeguro(() => window.carregarMateriaisDoBackend(), 'carregarMateriaisDoBackend');
    if (typeof window.atualizarPainelCompleto === 'function') executarSeguro(() => window.atualizarPainelCompleto(), 'atualizarPainelCompleto');

    // 🆕 Login cai direto na aba "Painel Geral" (classe "active" já vem
    // assim no HTML) sem passar por window.abrirAba — sem isto aqui, o
    // auto-refresh só ligaria na primeira troca de aba manual.
    const abaAtiva = document.querySelector('.tab-content.active');
    if (abaAtiva && typeof window.iniciarAutoRefreshAba === 'function') window.iniciarAutoRefreshAba(abaAtiva.id);
}
window.entrarComoVisitante = entrarComoVisitante;
