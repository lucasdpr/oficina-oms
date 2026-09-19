// ==========================================================================
// NAVEGAÇÃO — extraído de script.js na modularização
// ==========================================================================
// abrirAba() é o roteador central de troca de aba, chamado de todo o
// sistema. atualizarInterfaceUsuario() atualiza nome/matrícula/cargo no
// topo e reaplica as permissões de menu a cada login/refresh. Os dois
// blocos no final (ripple e botão voltar do PWA) são comportamento
// transversal de UI, sem tela própria.

import { OPERADOR_LOGADO } from './estado.js';
import {
    ativarPainelDevSeAutorizado,
    ativarAuditoriaSeAutorizado,
    ativarCentralNotificacoesSeAutorizado,
    ativarPainelSupervisorSeAutorizado,
    ativarPainelAdmSeAutorizado,
    aplicarRestricaoNavTecnico
} from './permissoes.js';

export function atualizarInterfaceUsuario() {
    const nomeEl = document.getElementById("nome-operador-logado");
    const badgeEl = document.getElementById("badge-cargo-operador");
    const matriculaEl = document.getElementById("matricula-operador-logado");
    const btnLogout = document.getElementById("btn-encerrar-turno");

    const saudacaoEl = document.getElementById("header-topo-saudacao-nome");

    if (!OPERADOR_LOGADO) {
        if (nomeEl) nomeEl.innerText = "Não identificado";
        if (saudacaoEl) saudacaoEl.innerText = "visitante";
        if (matriculaEl) matriculaEl.style.display = "none";
        if (badgeEl) badgeEl.style.display = "none";
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
        ativarPainelDevSeAutorizado();
        ativarAuditoriaSeAutorizado();
        ativarCentralNotificacoesSeAutorizado();
        ativarPainelSupervisorSeAutorizado();
        ativarPainelAdmSeAutorizado();
        if (typeof window.atualizarBotaoAtivarNotificacoes === 'function') window.atualizarBotaoAtivarNotificacoes();
        return;
    }

    if (OPERADOR_LOGADO.visitante) {
        if (nomeEl) nomeEl.innerText = `👁️ ${OPERADOR_LOGADO.nome || "Visitante"}`;
        if (saudacaoEl) saudacaoEl.innerText = OPERADOR_LOGADO.nome || "Visitante";
        if (matriculaEl) matriculaEl.style.display = "none";
        if (badgeEl) {
            badgeEl.innerText = "Somente leitura";
            badgeEl.className = "operator-role-badge role-visitante";
            badgeEl.style.display = "inline-block";
        }
        // Visitante não tem "turno" pra encerrar — o botão vira um
        // atalho direto de volta pro login, sem confirmação nem alerta.
        // 🔧 Botão virou ícone-only (movido pro topo da sidebar) — trocar
        // innerText aqui apagaria o <i> do ícone; só o title (tooltip)
        // muda agora.
        if (btnLogout) btnLogout.title = "Voltar ao Login";
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
        ativarPainelDevSeAutorizado();
        ativarAuditoriaSeAutorizado();
        ativarCentralNotificacoesSeAutorizado();
        ativarPainelSupervisorSeAutorizado();
        ativarPainelAdmSeAutorizado();
        if (typeof window.atualizarBotaoAtivarNotificacoes === 'function') window.atualizarBotaoAtivarNotificacoes();
        return;
    }

    if (btnLogout) btnLogout.title = "Sair";

    // Extrai o cargo entre colchetes do nome cadastrado, ex: "Filipe [Líder]"
    const match = (OPERADOR_LOGADO.nome || "").match(/\[(.+?)\]/);
    const cargo = match ? match[1] : "Operador";
    const nomeLimpo = (OPERADOR_LOGADO.nome || "").replace(/\s*\[.+?\]/, "");
    // 🐛 CORREÇÃO: nome completo ("Wesley Oliveira De So...") estourava a
    // largura do card da sidebar e cortava no meio de uma palavra — feio
    // e ilegível. Mostra só primeiro e último nome ali (nome completo
    // continua disponível em qualquer outro lugar que precise dele).
    const partesNome = nomeLimpo.trim().split(/\s+/).filter(Boolean);
    const nomeCurto = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}` : nomeLimpo;

    if (nomeEl) nomeEl.innerText = nomeCurto || "Não identificado";
    if (saudacaoEl) saudacaoEl.innerText = (nomeLimpo || "Não identificado").split(" ")[0];
    if (matriculaEl) {
        matriculaEl.innerText = `Matrícula: ${OPERADOR_LOGADO.matricula || "--"}`;
        matriculaEl.style.display = "block";
    }
    if (badgeEl) {
        badgeEl.innerText = cargo;
        badgeEl.className = "operator-role-badge";
        badgeEl.style.display = "inline-block";
    }
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
    ativarPainelDevSeAutorizado();
    ativarAuditoriaSeAutorizado();
    ativarCentralNotificacoesSeAutorizado();
    ativarPainelSupervisorSeAutorizado();
    ativarPainelAdmSeAutorizado();
    if (typeof window.atualizarBotaoAtivarNotificacoes === 'function') window.atualizarBotaoAtivarNotificacoes();
    aplicarRestricaoNavTecnico();
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

export const abrirAba = function(event, idAba) {
    if (event) event.preventDefault();

    // 🔧 CORREÇÃO ("todas as abas mostram a aba antiga empilhada
    // embaixo da nova, só no celular" — confirmado pelo usuário que
    // acontece em QUALQUER troca, sem exceção): a troca de aba
    // dependia só da classe "active" pro CSS (.tab-content{display:
    // none} / .tab-content.active{display:block}) decidir o que
    // mostrar. Em algum cenário no navegador do celular esse
    // display:none não está de fato sendo aplicado — a aba anterior
    // continua pintada na tela, "por baixo" da aba nova (que também
    // aparece, já que ambas ficam com display:block ao mesmo tempo).
    // Em vez de caçar qual regra CSS está sendo vencida nesse
    // navegador específico, força o display diretamente via JS aqui —
    // estilo inline sempre vence qualquer regra de stylesheet, então
    // isso garante a troca não importa o que mais esteja acontecendo
    // com CSS/animação/especificidade.
    document.querySelectorAll(".tab-content").forEach(c => {
        c.classList.remove("active");
        c.style.display = "none";
    });
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    const abaDestino = document.getElementById(idAba);
    if (abaDestino) {
        abaDestino.classList.add("active");
        abaDestino.style.display = "block";
    }

    // 🆕 Auto-refresh da aba (ver REFRESH_POR_ABA acima) — desarma o
    // timer da aba anterior e liga o da nova, se ela tiver um mapeado.
    if (typeof window.iniciarAutoRefreshAba === 'function') window.iniciarAutoRefreshAba(idAba);

    // 🔧 CORREÇÃO ("mobile não troca de aba, acontece com QUALQUER item"
    // — usuário confirmou que não é lógica de uma aba específica):
    // nada aqui resetava a posição de rolagem ao trocar de aba. .main-
    // content não tem overflow-y próprio — quem rola é a JANELA inteira.
    // Se a pessoa estivesse rolada pra baixo na aba anterior (bem
    // provável no celular, onde as telas são compridas) e tocasse num
    // item do menu, a troca de verdade acontecia (classe "active" some
    // da aba antiga e aparece na nova), só que a rolagem continuava
    // exatamente onde estava — mostrando um pedaço do MEIO da aba nova
    // em vez do topo dela. Passava a impressão de "nada mudou", quando
    // na real tinha mudado, só que fora da área visível da tela.
    window.scrollTo(0, 0);

    // 🔧 CORREÇÃO ("mobile não troca de aba" — bug relatado várias vezes,
    // nunca reproduzido em teste automatizado com clique simulado):
    // fechar o menu mobile morava só no FINAL desta função, depois de
    // todas as chamadas de renderização de cada aba (renderPainelSupervisor,
    // carregarOficina, etc.). Se qualquer uma delas lançasse um erro no
    // meio do caminho (ex: uma chamada de rede falhando de um jeito não
    // prontamente capturado), a troca de aba já tinha acontecido (o link
    // já ficava com destaque ativo) mas o "return" antecipado pelo erro
    // nunca deixava o código chegar até o trecho que fecha o drawer —
    // sintoma exatamente igual ao relatado: item marcado como ativo, tela
    // por trás sem atualizar, menu continua aberto. Fechar o menu logo
    // aqui, ANTES de qualquer render específico de aba, garante que a
    // navegação visual sempre se completa mesmo que a função de uma aba
    // específica falhe depois.
    if (window.innerWidth <= 992) {
        const sidebarMobile = document.getElementById('sidebar-menu');
        if (sidebarMobile) sidebarMobile.classList.remove('open');
    }

    // 🔧 CORREÇÃO: todo o bloco de renderização específica de cada aba
    // agora roda dentro de um try/catch. Antes, um erro no meio (ex: uma
    // das funções de render lançando exceção) interrompia a função
    // inteira ali mesmo — o resto do bloco (inclusive o registro no
    // histórico do navegador, usado pelo gesto "voltar") nunca rodava.
    // A troca visual da aba (classes active) e o fechamento do menu
    // mobile já aconteceram ANTES deste bloco (ver acima), então já
    // ficam garantidos independente do que acontecer aqui dentro.
    //
    // 🔧 Chamadas abaixo usam window.X em vez de X bare (diferença da
    // versão original em script.js): esta função foi extraída pra um
    // módulo próprio (Core/navegacao.js), então as funções de render de
    // cada tela — que continuam morando em script.js ou nos módulos de
    // cada área — só são alcançáveis via window, não por escopo léxico
    // direto. Mesmo padrão que várias chamadas aqui já usavam.
    try {
        if (idAba === "aba-mcc2" && typeof window.renderizarGraficosMCC === 'function') window.renderizarGraficosMCC(2);
        if (idAba === "aba-mcc3" && typeof window.renderizarGraficosMCC === 'function') window.renderizarGraficosMCC(3);
        if (idAba === "aba-mcc4" && typeof window.renderizarGraficosMCC === 'function') window.renderizarGraficosMCC(4);
        if (idAba === "aba-reparos" && typeof window.renderReparos === 'function') window.renderReparos();
        if (idAba === "aba-reparos" && typeof window.atualizarRascunhosAtivos === 'function') window.atualizarRascunhosAtivos();
        if (idAba === "aba-reparos" && typeof window.trocarAbaReparo === 'function') window.trocarAbaReparo(null, "reparo-sub-iniciar");
        if (idAba === "aba-reservas" && typeof window.renderReservas === 'function') window.renderReservas();
        if (idAba === "aba-rolos" && typeof window.renderRolos === 'function') window.renderRolos();
        if (idAba === "aba-hidraulica" && typeof window.renderHidraulica === 'function') window.renderHidraulica();
        if (idAba === "aba-almoxarifado" && typeof window.carregarMateriaisDoBackend === 'function') window.carregarMateriaisDoBackend();
        if (idAba === "aba-historico" && typeof window.renderHistorico === 'function') window.renderHistorico();
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
        if (idAba === "aba-admin-colaboradores" && typeof window.carregarAdminColaboradores === 'function') window.carregarAdminColaboradores();
        if (idAba === "aba-painel" && typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
        if (idAba === "aba-ativos" && typeof window.renderAtivos === 'function') window.renderAtivos();
        if (idAba === "aba-fluxo" && typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        if (idAba === "aba-tecnico" && typeof window.renderPainelTecnico === 'function') window.renderPainelTecnico();
        if (idAba === "aba-oficina" && typeof window.carregarOficina === 'function') {
            window.carregarOficina();
            if (typeof window.carregarCatalogoMateriaisOficina === 'function') window.carregarCatalogoMateriaisOficina();
        }
        if (idAba === "aba-ordens-servico" && typeof window.carregarListaOrdensServico === 'function') {
            window.popularCheckboxAreasOs();
            window.carregarListaOrdensServico();
        }
        if (idAba === "aba-painel-supervisor" && typeof window.renderPainelSupervisor === 'function') window.renderPainelSupervisor();
        if (idAba === "aba-notificacoes" && typeof window.carregarCentralNotificacoes === 'function') {
            // Sempre entra pela grade — não deixa "preso" no detalhe de uma
            // área de uma visita anterior.
            if (typeof window.fecharDetalheAreaNotificacao === 'function') window.fecharDetalheAreaNotificacao();
            window.carregarCentralNotificacoes();
        } else if (typeof window.pararPollingCentralNotificacoes === 'function') {
            // Saiu da Central de Notificações pra outra aba — para o
            // polling na hora, não espera o próximo tick de 30s pra notar.
            window.pararPollingCentralNotificacoes();
        }
        if (idAba === "aba-qualidade" && typeof window.renderAbaQualidade === 'function') window.renderAbaQualidade();
        if (idAba === "aba-painel-adm" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('adm');
        if (idAba === "aba-painel-adm" && typeof window.renderPainelAdmExecutivo === 'function') window.renderPainelAdmExecutivo();
        if (idAba === "aba-painel-almoxarifado" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('almoxarifado');
        if (idAba === "aba-painel-ponte-rolante" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('ponte-rolante');
        if (idAba === "aba-painel-logistica" && typeof window.renderPainelAreaAdministrativa === 'function') window.renderPainelAreaAdministrativa('logistica');
        if (idAba === "aba-chats" && typeof window.renderAbaChats === 'function') window.renderAbaChats();

        if (idAba === "aba-producao") {
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
        }
    } catch (erroRenderAba) {
        console.error(`⚠️ Erro ao renderizar conteúdo da aba "${idAba}" (a troca de aba em si já aconteceu):`, erroRenderAba);
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

    // 🆕 CORRIGIDO ("botão/gesto 'voltar' do celular saía do app direto
    // pra Home em vez de voltar uma ação"): trocar de aba não deixava
    // rastro nenhum no histórico do navegador, então o primeiro "voltar"
    // sempre caía na página anterior de verdade (index.html), mesmo que
    // o técnico só tivesse navegado entre abas dentro do próprio app.
    // Agora cada troca de aba empilha 1 estado no histórico — o listener
    // de popstate lá embaixo (mesmo bloco que já tratava modal) usa isso
    // pra trocar de volta pra aba anterior em vez de sair do app. Quando
    // É o próprio popstate que está chamando abrirAba (indo pra trás),
    // `window.__omsRestaurandoAbaViaHistorico` evita empilhar de novo.
    if (idAba && !window.__omsRestaurandoAbaViaHistorico) {
        try {
            const estadoAtual = history.state;
            if (!estadoAtual || estadoAtual.omsAba !== idAba) {
                history.pushState({ omsAba: idAba }, '');
            }
        } catch (e) { /* ambiente sem History API — segue sem quebrar */ }
    }
};
window.abrirAba = abrirAba;

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
        // 🆕 Avisos do Sistema (leitura obrigatória): sem botão de
        // cancelar/fechar de propósito, pra não dar pra pular sem
        // confirmar — mas o botão "voltar" físico/gesto do celular
        // caía direto no fallback abaixo (`classList.add('hidden')`),
        // fechando o modal sem confirmar leitura nenhuma. Este
        // atributo é o jeito de dizer "nem o botão voltar fecha isso".
        if (modalEl.dataset.leituraObrigatoria) {
            // O back físico já consumiu o estado empilhado (é assim que
            // popstate funciona, não tem como "recusar" depois que já
            // aconteceu) — sem repor um estado novo aqui, o PRÓXIMO
            // "voltar" escaparia do app de vez (voltando pra página
            // anterior de verdade) em vez de cair de novo neste mesmo
            // aviso. Reempilha, pra continuar travando o botão voltar
            // até o técnico clicar em "Entendi, já li".
            try { history.pushState({ omsModal: true }, ''); } catch (e) { /* nada a fazer */ }
            return;
        }

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

    window.addEventListener('popstate', (event) => {
        if (consumindoEstadoInterno) return; // popstate gerado por nós mesmos — ignora

        const abertos = modaisAbertos();
        if (abertos.length === 0) {
            // Nenhum modal aberto — se o estado pro qual voltamos é uma
            // aba do próprio app, troca pra ela em vez de deixar o
            // navegador sair da página (ver comentário em abrirAba()).
            const idAba = event.state && event.state.omsAba;
            if (idAba && typeof window.abrirAba === 'function' && document.getElementById(idAba)) {
                window.__omsRestaurandoAbaViaHistorico = true;
                window.abrirAba(null, idAba);
                window.__omsRestaurandoAbaViaHistorico = false;
            }
            return;
        }

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
