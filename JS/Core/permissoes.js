// ==========================================================================
// PERMISSÕES / GATING DE TELAS — extraído de script.js na modularização
// ==========================================================================
// Quem pode ver o quê: verificação de sessão, checagens de matrícula/
// cargo e as funções "ativarXSeAutorizado" que escondem/mostram links
// do menu lateral conforme o operador logado.

import { OPERADOR_LOGADO, MATRICULAS_AUDITORIA, MATRICULAS_TESTE_FOLHOES } from './estado.js';
import { AREAS_OFICINA } from './dados.js';

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

export function ativarAuditoriaSeAutorizado() {
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
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
}
window.ativarAuditoriaSeAutorizado = ativarAuditoriaSeAutorizado;

// ==========================================
// 🆕 CENTRAL DE NOTIFICAÇÕES — quem vê TUDO (todas as áreas) é só o ADM
// de sistema de verdade: as 3 matrículas fixas em MATRICULAS_ADM
// (OPERADOR_LOGADO.isAdm). Cargo "Supervisor" no nome NÃO dá mais
// acesso total — pediu explicitamente pra ser só essas 3 matrículas;
// supervisor cai na mesma regra de técnico (só a própria área).
// ==========================================
export function operadorEhAdmDeSistema() {
    return !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && OPERADOR_LOGADO.isAdm);
}
window.operadorEhAdmDeSistema = operadorEhAdmDeSistema;

// 🆕 Qualquer não-ADM com área cadastrada (técnico ou supervisor) — antes
// não enxergava a Central de Notificações de jeito nenhum; agora entra,
// mas só vê o que é da própria área (ver renderizarGradeNotificacoes).
export function operadorTecnicoComArea() {
    return !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && !operadorEhAdmDeSistema() && OPERADOR_LOGADO.area);
}
window.operadorTecnicoComArea = operadorTecnicoComArea;

// ADM (as 3 matrículas) vê a Central inteira; qualquer outro com área
// cadastrada só vê a própria área.
export function operadorPodeVerNotificacoes() {
    return operadorEhAdmDeSistema() || operadorTecnicoComArea();
}
window.operadorPodeVerNotificacoes = operadorPodeVerNotificacoes;

let TIMER_BADGE_NOTIFICACOES_GLOBAL = null;

export function ativarCentralNotificacoesSeAutorizado() {
    const link = document.getElementById("nav-notificacoes");
    if (!link) return;

    const autorizado = operadorPodeVerNotificacoes();
    const sinoHeader = document.getElementById("header-topo-sino-pai");
    if (sinoHeader) sinoHeader.classList.toggle("hidden", !autorizado);

    if (autorizado) {
        link.classList.remove("hidden");
        // 🆕 Atualiza o número no sininho mesmo com a Central fechada —
        // dá pra ver que tem coisa nova sem precisar abrir a aba. Chamado
        // de novo a cada login/refresh de interface; o polling contínuo
        // (a cada 2 min) é armado uma vez logo abaixo.
        if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas();
        if (!TIMER_BADGE_NOTIFICACOES_GLOBAL) {
            TIMER_BADGE_NOTIFICACOES_GLOBAL = setInterval(() => {
                if (operadorPodeVerNotificacoes() && typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') {
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

// 🆕 Painel do Supervisor — visão executiva de cima da oficina inteira.
// Mesma regra de acesso da Central de Notificações (ADM de sistema, ou
// técnico/supervisor com área cadastrada — ver operadorPodeVerNotificacoes):
// começa escondido no HTML (classe "hidden"), esse JS decide quem vê.
export function ativarPainelSupervisorSeAutorizado() {
    const link = document.getElementById("nav-painel-supervisor");
    if (!link) return;

    const autorizado = operadorPodeVerNotificacoes();

    if (autorizado) {
        link.classList.remove("hidden");
    } else {
        link.classList.add("hidden");
        const aba = document.getElementById("aba-painel-supervisor");
        if (aba && aba.classList.contains("active") && typeof window.abrirAba === 'function') {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel) window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
        }
    }
}
window.ativarPainelSupervisorSeAutorizado = ativarPainelSupervisorSeAutorizado;

// 🆕 Painel ADM — pedido do usuário: "não tem mais esse painel, só
// existe a área... crie um painel adm... porém não repita as coisas
// pra não ficar igual, adm é uma coisa e supervisor é outra". O Painel
// do Supervisor é sobre a OFICINA (ativos, produção, equipe técnica);
// este aqui é sobre ADMINISTRAÇÃO DO SISTEMA (comunicados, mensagens
// das áreas, colaboradores) — só visível pra ADM de sistema de verdade,
// não pra supervisor/técnico com área.
export function ativarPainelAdmSeAutorizado() {
    const link = document.getElementById("nav-painel-adm");
    if (!link) return;

    const autorizado = operadorEhAdmDeSistema();

    if (autorizado) {
        link.classList.remove("hidden");
    } else {
        link.classList.add("hidden");
        const aba = document.getElementById("aba-painel-adm");
        if (aba && aba.classList.contains("active") && typeof window.abrirAba === 'function') {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel) window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
        }
    }
}
window.ativarPainelAdmSeAutorizado = ativarPainelAdmSeAutorizado;

// 🆕 Molde MCC4 3D — visualização temporária pra apresentação do
// supervisor. Mesma regra de acesso do Painel ADM (só admin de sistema
// de verdade). Remover essa função + a seção/link correspondentes
// depois que a apresentação acontecer.
export function ativarMolde3DSeAutorizado() {
    const link = document.getElementById("nav-molde-mcc4-3d");
    if (!link) return;

    const autorizado = operadorEhAdmDeSistema();

    if (autorizado) {
        link.classList.remove("hidden");
    } else {
        link.classList.add("hidden");
        const aba = document.getElementById("aba-molde-mcc4-3d");
        if (aba && aba.classList.contains("active") && typeof window.abrirAba === 'function') {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel) window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
        }
    }
}
window.ativarMolde3DSeAutorizado = ativarMolde3DSeAutorizado;

export function ativarPainelDevSeAutorizado() {
    const link = document.getElementById("nav-dev-teste");
    const divisor = document.getElementById("nav-divider-dev");
    // 🆕 O outro link da Área Restrita (Administração) usa a mesma
    // checagem de matrícula que o Teste de Folhões — fica
    // visível/escondido junto com ele aqui. ("Registro Recente" usava
    // a mesma checagem também, mas foi removido — era duplicado da
    // Auditoria Global.)
    const linkAdmin = document.getElementById("nav-admin-colaboradores");
    if (!link) return;

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    const autorizado = MATRICULAS_TESTE_FOLHOES.includes(matricula);

    if (autorizado) {
        link.classList.remove("hidden");
        if (linkAdmin) linkAdmin.classList.remove("hidden");
        if (divisor) divisor.classList.remove("hidden");
        if (typeof window.renderPainelDevTeste === 'function') window.renderPainelDevTeste();
    } else {
        link.classList.add("hidden");
        if (linkAdmin) linkAdmin.classList.add("hidden");
        if (divisor) divisor.classList.add("hidden");
        const corpo = document.getElementById("dev-teste-table-body");
        if (corpo) corpo.innerHTML = ""; // garante que não sobra nada renderizado de uma sessão anterior
        // Se a pessoa estava numa dessas abas e outro operador loga por
        // cima sem ser autorizado, tira ela de lá (mesmo princípio já
        // usado em ativarAuditoriaSeAutorizado para a Auditoria).
        const abaAtual = document.querySelector('.tab-content.active');
        if (abaAtual && ['aba-admin-colaboradores', 'aba-dev-teste'].includes(abaAtual.id)) {
            const navPainel = document.getElementById("nav-painel");
            if (navPainel && typeof window.abrirAba === 'function') {
                window.abrirAba({ preventDefault(){}, currentTarget: navPainel }, "aba-painel");
            }
        }
    }
}
window.ativarPainelDevSeAutorizado = ativarPainelDevSeAutorizado;

// 🆕 RESTRIÇÃO DE NAVEGAÇÃO — TÉCNICO SÓ VÊ AS PRÓPRIAS ABAS
// Técnico com área cadastrada (não-ADM, não-visitante) só pode acessar
// o "Painel do Técnico" + as abas de monitoramento/registro que ele
// usa no dia a dia (Sinótico 3D, Sequenciamento de Veios, Registro de
// OS) — o resto do menu lateral fica escondido.
// ADM (MATRICULAS_ADM) e visitante continuam vendo o menu completo.
const NAV_IDS_LIBERADOS_TECNICO = ['nav-tecnico', 'nav-area-oficina', 'nav-sinotico', 'nav-fluxo', 'nav-ordens-servico', 'nav-fila-ponte', 'nav-chats'];

export function aplicarRestricaoNavTecnico() {
    const restrito = !!(OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante && !OPERADOR_LOGADO.isAdm && OPERADOR_LOGADO.area);

    // 🆕 Atalho "Minha Área" — mostra só pra quem tem área cadastrada
    // (técnico ou supervisor, restrito ou não) e não é visitante. Nome
    // da área vem de AREAS_OFICINA pela chave salva no login
    // (OPERADOR_LOGADO.area) — sem isso o link ficaria com "Minha Área"
    // genérico, ou pior, mandando pra área errada.
    const linkAreaOficina = document.getElementById('nav-area-oficina');
    if (linkAreaOficina) {
        const areaOperador = (OPERADOR_LOGADO && !OPERADOR_LOGADO.visitante) ? OPERADOR_LOGADO.area : null;
        if (areaOperador) {
            const info = AREAS_OFICINA.find(a => a.chave === areaOperador);
            const nomeSpan = linkAreaOficina.querySelector('[data-area-nome]');
            if (nomeSpan) nomeSpan.textContent = info ? info.nome : areaOperador;
            linkAreaOficina.dataset.area = areaOperador;
            linkAreaOficina.classList.remove('hidden');
        } else {
            linkAreaOficina.classList.add('hidden');
        }
    }

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => {
        // 🆕 Supervisor com área cadastrada, ou técnico com área, caem no
        // "restrito" acima (nenhum dos dois é ADM), mas os dois precisam
        // ver a Central de Notificações (o técnico só a própria área, ver
        // renderizarGradeNotificacoes) — sem essa exceção o link ficaria
        // escondido por aqui mesmo já autorizado por
        // ativarCentralNotificacoesSeAutorizado().
        const excecaoNotificacoes = el.id === 'nav-notificacoes' && operadorPodeVerNotificacoes();
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
        const abaAindaPermitida = idAtual === 'aba-tecnico' || idAtual === 'aba-fluxo' || idAtual === 'aba-ordens-servico' || idAtual === 'aba-fila-ponte' || idAtual === 'aba-chats';
        if (!abaAindaPermitida && typeof window.abrirAba === 'function') window.abrirAba(null, 'aba-tecnico');
    }
}
window.aplicarRestricaoNavTecnico = aplicarRestricaoNavTecnico;
