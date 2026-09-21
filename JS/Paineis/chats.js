// ==========================================================================
// CHATS (Área ↔ ADM) — extraído de script.js na modularização
// ==========================================================================
// Canal único de conversa entre uma área da Oficina e o ADM (e entre
// áreas técnicas via canal "tecnicos"), com polling rápido e badge de
// notificação. Inclui também os Avisos do Sistema (leitura obrigatória
// no login) e o atalho de menu que abre a Área da Oficina direto.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, OFICINA_AREA_ATUAL, setOficinaAreaAtual } from '../Core/estado.js';
import { executarSeguro, executarSeguroAsync } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ==========================================================================
// 💬 ABA DE CHATS — canal Área ↔ ADM, reorganizado numa aba única em vez
// dos dois modais soltos que existiam antes (um pra área falar com o
// ADM, outro só do ADM com a lista de áreas). Mesmo backend
// (/api/mensagens_area*), layout novo: lista de conversas + thread,
// como qualquer app de mensagens. O contexto (qual área, de qual lado
// da conversa quem está logado enxerga) fica em CHAT_AREA_ADM_CTX.
// ==========================================================================
// 🆕 areaDestinoTecnicos: a OUTRA área da conversa no canal 'tecnicos'
// (pedido do usuário: "caldeiraria tem que ter chat com o molde,
// bender, zero etc, tem que ter com todos" — deixou de ser "só dentro
// da própria área" e virou área-a-área). null = ainda não escolheu com
// qual área conversar (mostra o seletor em vez da thread).
let CHAT_AREA_ADM_CTX = { area: null, deAdm: false, canal: 'supervisao', areaDestinoTecnicos: null };
// 🆕 Lembra a última área escolhida no canal "Entre Técnicos" nesta
// sessão — sem isso, trocar de canal (Supervisão <-> Entre Técnicos) e
// voltar forçava escolher a área nesse par de novo toda vez, mesmo
// tendo acabado de escolher (ver window.chatsTrocarCanal).
let CHAT_ULTIMA_AREA_DESTINO_TECNICOS = null;

window.renderAbaChats = async function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const painelLista = document.getElementById('chat-lista-painel');
    if (painelLista) painelLista.classList.toggle('hidden', !isAdm);

    if (isAdm) {
        await window.chatsCarregarListaConversas();
        // Sem conversa selecionada ainda nesta visita à aba — mantém o
        // que já estava selecionado se a pessoa só voltou pra aba.
        if (!CHAT_AREA_ADM_CTX.area) {
            const tituloEl = document.getElementById('chat-thread-titulo');
            if (tituloEl) tituloEl.textContent = 'Selecione uma conversa';
        }
    } else {
        // 🔧 CORREÇÃO ("todos os técnicos tão assim no chat" — Chats
        // travava em "Abra uma área primeiro"): OFICINA_AREA_ATUAL só
        // fica preenchida depois que a pessoa abre a própria área pela
        // Central de Áreas NESSA sessão — quem foi direto pra Chats
        // (ex: acabou de logar, ou clicou "Chats" no menu antes de
        // qualquer outra coisa) nunca tinha isso setado, mesmo a área
        // dele já estando cadastrada no login (OPERADOR_LOGADO.area).
        // Agora cai pra área do próprio operador quando ainda não abriu
        // nenhuma — só mostra o aviso se realmente não tiver área
        // nenhuma associada (ex: visitante).
        const areaChat = OFICINA_AREA_ATUAL || (OPERADOR_LOGADO && OPERADOR_LOGADO.area);
        if (!areaChat) {
            const tituloEl = document.getElementById('chat-thread-titulo');
            if (tituloEl) tituloEl.textContent = 'Sem área associada ao seu usuário';
            return;
        }
        // Outras partes do app (badge de chat, quadro de atividades) já
        // assumem OFICINA_AREA_ATUAL como fonte da verdade — resolvendo
        // aqui pela 1ª vez, propaga pra elas também funcionarem.
        if (!OFICINA_AREA_ATUAL) setOficinaAreaAtual(areaChat);
        await window.chatsSelecionarConversa(areaChat, false);

        // 🔧 CORREÇÃO ("mandei mensagem no Entre Técnicos e não chegou
        // nem notificação pro outro lado"): a aba Chats sempre abria no
        // canal "Com a Supervisão" — quem recebeu uma mensagem no canal
        // "Entre Técnicos" precisava DESCOBRIR sozinho que existe uma
        // 2ª aba de canal e escolher a área certa nela pra ver a
        // conversa. Agora, se tiver alguma mensagem não lida esperando
        // no Entre Técnicos, já entra direto nela.
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/mensagens_area/resumo_tecnicos?area=${encodeURIComponent(areaChat)}`, { cache: 'no-store' });
            const linhas = resp.ok ? await resp.json() : [];
            const pendente = Array.isArray(linhas) ? linhas.find(l => (l.nao_lidas || 0) > 0) : null;
            if (pendente) {
                window.chatsTrocarCanal('tecnicos');
                await window.chatsEscolherAreaTecnicos(pendente.outra_area);
            }
        } catch (e) { /* não bloqueia a abertura normal do chat por causa disso */ }
    }
};

// ---- Lista de conversas (só o ADM vê) ----
window.chatsCarregarListaConversas = async function() {
    const cont = document.getElementById('chat-lista-conversas');
    if (!cont) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store' });
        const linhas = resp.ok ? await resp.json() : [];
        const porArea = new Map(linhas.map(l => [l.area, l]));

        // 🔧 CORREÇÃO ("chat só mostra Caldeiraria, preciso de todas as
        // áreas ali pra mandar mensagem"): /api/mensagens_area/resumo só
        // devolve áreas que JÁ têm pelo menos 1 mensagem trocada — uma
        // área que o ADM nunca escreveu simplesmente não existia na
        // lista, mesmo que a Central de Áreas mostrasse ela normalmente.
        // Agora a lista parte de TODAS as áreas cadastradas
        // (AREAS_OFICINA), usando o resumo só pra completar quem já tem
        // histórico (última mensagem/não lidas); quem não tem, aparece
        // do mesmo jeito, só sem prévia — clicar já abre a conversa
        // vazia, pronta pra mandar a primeira mensagem.
        const todasAreas = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : [])
            .filter(a => a.chave !== 'adm') // ADM é quem está vendo essa lista — não faz sentido conversar com ela mesma.
            .map(a => ({
            area: a.chave,
            nome_area: a.nome,
            ultima_em: porArea.get(a.chave)?.ultima_em || null,
            ultima_mensagem: porArea.get(a.chave)?.ultima_mensagem || null,
            nao_lidas: porArea.get(a.chave)?.nao_lidas || 0,
        }));
        // Quem tem mensagem mais recente primeiro; empate por ordem alfabética.
        todasAreas.sort((a, b) => {
            if (a.ultima_em && b.ultima_em) return b.ultima_em.localeCompare(a.ultima_em);
            if (a.ultima_em) return -1;
            if (b.ultima_em) return 1;
            return (a.nome_area || a.area).localeCompare(b.nome_area || b.area);
        });

        cont.innerHTML = todasAreas.length ? todasAreas.map(l => {
            const dataFmt = l.ultima_em ? new Date(l.ultima_em.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            const ativa = CHAT_AREA_ADM_CTX.area === l.area;
            return `
                <div class="chat-conversa-item${ativa ? ' ativa' : ''}" onclick="window.chatsSelecionarConversa('${l.area}', true)">
                    <div class="chat-conversa-avatar">${(l.nome_area || l.area || '?').slice(0, 1).toUpperCase()}</div>
                    <div class="chat-conversa-corpo">
                        <div class="chat-conversa-topo">
                            <strong>${l.nome_area || l.area}</strong>
                            <span class="chat-conversa-hora">${dataFmt}</span>
                        </div>
                        ${l.ultima_mensagem ? `<div class="chat-conversa-preview">${l.ultima_mensagem.slice(0, 40)}</div>` : '<div class="chat-conversa-preview text-muted">Nenhuma mensagem ainda</div>'}
                    </div>
                    ${l.nao_lidas > 0 ? `<span class="chat-conversa-badge">${l.nao_lidas > 9 ? '9+' : l.nao_lidas}</span>` : ''}
                </div>
            `;
        }).join('') : '<div class="chat-vazio">Nenhuma área cadastrada ainda.</div>';
    } catch (e) {
        cont.innerHTML = '<div class="chat-vazio">Não consegui carregar as conversas.</div>';
    }
};

// ---- Selecionar/abrir uma conversa na thread ----
// deAdm=true quando é o ADM abrindo a conversa de uma área; false
// quando é a própria área abrindo a conversa dela com o ADM.
window.chatsSelecionarConversa = async function(area, deAdm) {
    // 🆕 canal sempre reseta pra 'supervisao' ao trocar de conversa —
    // evita ficar preso na aba "Entre Técnicos" de uma área ao abrir
    // outra sem perceber.
    CHAT_AREA_ADM_CTX = { area, deAdm: !!deAdm, canal: 'supervisao', areaDestinoTecnicos: null };
    window.chatsCancelarRespostaAtividade();
    const areaInfo = AREAS_OFICINA.find(a => a.chave === area);
    const tituloEl = document.getElementById('chat-thread-titulo');
    if (tituloEl) tituloEl.textContent = deAdm ? (areaInfo ? areaInfo.nome : area) : 'ADM';

    const voltar = document.getElementById('chat-thread-voltar');
    if (voltar) voltar.classList.toggle('hidden', !deAdm);
    // 🔧 CORREÇÃO ("no mobile a aba Chats abre vazia pra técnico"): esta
    // classe é o que faz o CSS mobile mostrar a thread (ver style.css,
    // regra ".chat-thread-painel:not(.chat-thread-mobile-ativo){display:
    // none}") — antes só era ligada quando deAdm=true, ou seja, só
    // quando o ADM clicava numa conversa da lista. Técnico nunca tem
    // lista (#chat-lista-painel já fica sempre "hidden" pra ele, ver
    // renderAbaChats) — sem essa classe, a thread dele também ficava
    // escondida, e a aba inteira aparecia em branco no celular (o
    // desktop não tem essa media query, por isso lá não dava pra notar).
    // Agora liga sempre que uma conversa é selecionada — o ADM ainda
    // volta pra lista normalmente pelo botão "voltar" (chatsVoltarParaLista,
    // que remove a classe de novo).
    document.getElementById('chat-thread-painel')?.classList.add('chat-thread-mobile-ativo');

    // 🆕 Mostra as abas de canal e garante que "Com a Supervisão" volta a
    // ficar marcada como ativa (visual) toda vez que abre uma conversa.
    document.getElementById('chat-thread-canais')?.classList.remove('hidden');
    document.querySelectorAll('#chat-thread-canais .chat-thread-canal-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    window.chatsAtualizarVisibilidadeEnvio();

    document.querySelectorAll('#chat-lista-conversas .chat-conversa-item').forEach(el => el.classList.remove('ativa'));

    await window.chatsCarregarMensagens();

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/mensagens_area/marcar_lida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area, de_adm: !!deAdm, matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null })
        });
    } catch (e) { /* não bloqueia a leitura por isso */ }

    if (deAdm) {
        await window.chatsCarregarListaConversas(); // atualiza contagem de não lidas na lista
    } else if (typeof window.atualizarBadgeChatAreaAdm === 'function') {
        window.atualizarBadgeChatAreaAdm();
    }
    if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas();
};

// ---- Mobile: sai da thread e volta pra lista (só existe quando é ADM) ----
window.chatsVoltarParaLista = function() {
    CHAT_AREA_ADM_CTX = { area: null, deAdm: false, canal: 'supervisao', areaDestinoTecnicos: null };
    document.getElementById('chat-thread-painel')?.classList.remove('chat-thread-mobile-ativo');
    document.getElementById('chat-thread-canais')?.classList.add('hidden');
    const tituloEl = document.getElementById('chat-thread-titulo');
    if (tituloEl) tituloEl.textContent = 'Selecione uma conversa';
    const msgsEl = document.getElementById('chat-thread-mensagens');
    if (msgsEl) msgsEl.innerHTML = '<div class="chat-vazio">Escolha uma conversa pra começar.</div>';
    document.getElementById('chat-thread-voltar')?.classList.add('hidden');
};

// 🆕 Alterna entre os canais "Com a Supervisão" e "Entre Técnicos" da
// MESMA conversa (pedido do usuário — ver comentário grande acima, na
// definição de #chat-thread-canais). O ADM só LÊ o canal "tecnicos"
// (sem campo de envio); quem é da própria área pode escrever nos dois.
window.chatsTrocarCanal = function(canal) {
    if (!CHAT_AREA_ADM_CTX.area) return;
    CHAT_AREA_ADM_CTX.canal = canal;
    // 🔧 CORREÇÃO ("mandei mensagem e sumiu, tenho que ficar escolhendo
    // a área de novo toda vez"): antes zerava areaDestinoTecnicos
    // incondicionalmente — trocar pra "Entre Técnicos" sempre caía no
    // seletor de área, mesmo logo depois de já ter escolhido uma nesta
    // sessão. Agora, se já tinha uma área escolhida antes (e não é a
    // própria área da pessoa), reabre direto nela.
    CHAT_AREA_ADM_CTX.areaDestinoTecnicos =
        (canal === 'tecnicos' && CHAT_ULTIMA_AREA_DESTINO_TECNICOS && CHAT_ULTIMA_AREA_DESTINO_TECNICOS !== CHAT_AREA_ADM_CTX.area)
            ? CHAT_ULTIMA_AREA_DESTINO_TECNICOS
            : null;
    window.chatsCancelarRespostaAtividade();
    document.querySelectorAll('#chat-thread-canais .chat-thread-canal-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().includes(canal === 'tecnicos' ? 'Técnicos' : 'Supervisão'));
    });
    window.chatsAtualizarVisibilidadeEnvio();
    window.chatsCarregarMensagens();
};

// 🆕 Escolhe COM QUAL área conversar no canal "tecnicos" (agora
// área-a-área) — chamado ao clicar numa área no seletor renderizado
// por chatsRenderSeletorAreaTecnicos, ou automaticamente por
// abrirConversaAtividade quando dá pra deduzir a área certa.
window.chatsEscolherAreaTecnicos = async function(areaDestino) {
    CHAT_AREA_ADM_CTX.areaDestinoTecnicos = areaDestino;
    CHAT_ULTIMA_AREA_DESTINO_TECNICOS = areaDestino;
    window.chatsAtualizarVisibilidadeEnvio();
    await window.chatsCarregarMensagens();
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/mensagens_area/marcar_lida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: CHAT_AREA_ADM_CTX.area, de_adm: !!CHAT_AREA_ADM_CTX.deAdm, canal: 'tecnicos', area_destino: areaDestino, matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null })
        });
    } catch (e) { /* não bloqueia a leitura por isso */ }
};

// 🆕 Volta pro seletor de área dentro do canal "tecnicos" (link "Trocar
// área" no topo da thread).
window.chatsTrocarAreaTecnicos = function() {
    CHAT_AREA_ADM_CTX.areaDestinoTecnicos = null;
    window.chatsAtualizarVisibilidadeEnvio();
    window.chatsCarregarMensagens();
};

function chatsRenderSeletorAreaTecnicos() {
    const cont = document.getElementById('chat-thread-mensagens');
    if (!cont) return;
    const outrasAreas = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : [])
        .filter(a => a.chave !== CHAT_AREA_ADM_CTX.area && a.chave !== 'adm');
    cont.innerHTML = `
        <div style="padding:8px 4px;">
            <p class="text-muted" style="font-size:12.5px; margin-bottom:10px;">Com qual área você quer falar?</p>
            ${outrasAreas.map(a => `
                <div class="chat-conversa-item" onclick="window.chatsEscolherAreaTecnicos('${a.chave}')">
                    <div class="chat-conversa-avatar">${(a.nome || a.chave).slice(0, 1).toUpperCase()}</div>
                    <div class="chat-conversa-corpo"><strong>${a.nome || a.chave}</strong></div>
                </div>
            `).join('')}
        </div>
    `;
}

// 🆕 Esconde a linha de envio quando: o ADM está só lendo o canal
// "Entre Técnicos" (ele acompanha, mas não participa de nenhuma
// conversa área-a-área); ou quando ainda não foi escolhida COM QUAL
// área conversar nesse canal (sem alvo, não tem pra onde mandar).
window.chatsAtualizarVisibilidadeEnvio = function() {
    const linhaEnvio = document.querySelector('#chat-thread-painel .chat-thread-input-row');
    const noCanalTecnicos = CHAT_AREA_ADM_CTX.canal === 'tecnicos';
    const somenteLeitura = (CHAT_AREA_ADM_CTX.deAdm && noCanalTecnicos) || (noCanalTecnicos && !CHAT_AREA_ADM_CTX.areaDestinoTecnicos);
    if (linhaEnvio) linhaEnvio.classList.toggle('hidden', somenteLeitura);
};

window.chatsCarregarMensagens = async function() {
    const cont = document.getElementById('chat-thread-mensagens');
    if (!cont || !CHAT_AREA_ADM_CTX.area) return;
    const canal = CHAT_AREA_ADM_CTX.canal || 'supervisao';

    // 🆕 Canal "tecnicos" agora é área-a-área — sem uma área destino
    // escolhida, mostra o seletor em vez de tentar buscar mensagens.
    if (canal === 'tecnicos' && !CHAT_AREA_ADM_CTX.areaDestinoTecnicos) {
        chatsRenderSeletorAreaTecnicos();
        return;
    }

    // 🔧 CORREÇÃO ("tela piscando"): o auto-refresh de 15s chamava isto e
    // sempre forçava scrollTop = scrollHeight — se a pessoa tivesse
    // rolado pra cima pra ler mensagens antigas, o chat pulava pro fim
    // sozinho a cada ciclo. Agora só reaplica o auto-scroll se ela já
    // estava perto do fim (ou é a primeira renderização, sem scroll
    // ainda) — rolando pra cima, o refresh atualiza o conteúdo mas
    // respeita a posição.
    const permaneceEmbaixo = cont.scrollHeight === 0 || (cont.scrollHeight - cont.scrollTop - cont.clientHeight) < 80;

    try {
        const apiBase = await resolverApiBase();
        const qs = new URLSearchParams({ area: CHAT_AREA_ADM_CTX.area, canal });
        if (canal === 'tecnicos') qs.set('area_destino', CHAT_AREA_ADM_CTX.areaDestinoTecnicos);
        const resp = await fetch(`${apiBase}/api/mensagens_area?${qs.toString()}`, { cache: 'no-store' });
        const lista = resp.ok ? await resp.json() : [];
        // 🆕 Cabeçalho "Falando com: X · Trocar área" — só no canal
        // 'tecnicos' (área-a-área), pra sempre deixar claro com quem é a
        // conversa e dar um jeito fácil de trocar sem sair da aba.
        const cabecalhoAreaDestino = canal === 'tecnicos'
            ? (() => {
                const infoDestino = AREAS_OFICINA.find(a => a.chave === CHAT_AREA_ADM_CTX.areaDestinoTecnicos);
                return `<div class="chat-thread-area-destino-cabecalho">
                    <span><i class="fas fa-people-arrows"></i> Falando com: <strong>${infoDestino ? infoDestino.nome : CHAT_AREA_ADM_CTX.areaDestinoTecnicos}</strong>
                        · <span id="chat-thread-presenca" class="text-muted" style="font-size:11px;">...</span>
                    </span>
                    ${!CHAT_AREA_ADM_CTX.deAdm ? `<button type="button" onclick="window.chatsTrocarAreaTecnicos()">Trocar área</button>` : ''}
                </div>
                <div id="chat-thread-digitando" class="hidden" style="font-size:11px; color:var(--text-accent); font-style:italic; padding:2px 4px 6px;"></div>`;
            })()
            : '';
        cont.innerHTML = cabecalhoAreaDestino + (lista.length ? lista.map(m => {
            // "Minha" mensagem: no canal "supervisao", é quem partiu do
            // MESMO lado de quem está vendo (área vendo área, ADM vendo
            // ADM). No canal "tecnicos" não existe "lado" (de_adm é
            // sempre falso pra todo mundo ali) — compara por matrícula.
            const minha = canal === 'tecnicos'
                ? (OPERADOR_LOGADO && m.remetente_matricula && m.remetente_matricula === OPERADOR_LOGADO.matricula)
                : m.de_adm === CHAT_AREA_ADM_CTX.deAdm;
            const hora = m.criado_em ? new Date(m.criado_em.replace(' ', 'T')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            return `
                <div class="chat-bolha ${minha ? 'chat-bolha-minha' : 'chat-bolha-outro'}">
                    <div class="chat-bolha-remetente">${m.de_adm ? 'ADM' : window.escapeHtmlNotif(m.remetente || 'Técnico')}</div>
                    ${m.atividade_referencia ? `<div class="chat-bolha-atividade-tag"><i class="fas fa-link"></i> Respondendo: ${window.escapeHtmlNotif(m.atividade_referencia)}</div>` : ''}
                    ${m.foto_base64 ? `<img class="chat-bolha-foto" src="${m.foto_base64}" alt="Foto enviada" onclick="window.abrirFotoAmpliada('${m.foto_base64}', '${window.escapeAtributoNotif(hora)}')">` : ''}
                    ${m.mensagem ? `<div class="chat-bolha-texto">${window.escapeHtmlNotif(m.mensagem)}</div>` : ''}
                    <div class="chat-bolha-hora">${hora}</div>
                </div>
            `;
        }).join('') : `<div class="chat-vazio">${canal === 'tecnicos' ? 'Nenhuma mensagem com essa área ainda.' : 'Nenhuma mensagem ainda — mande a primeira 👋'}</div>`);
        if (permaneceEmbaixo) cont.scrollTop = cont.scrollHeight;

        // 🆕 Enquanto essa conversa Entre Técnicos estiver aberta, liga o
        // polling rápido (digitando/presença/mensagem nova) — ver
        // window.iniciarPollingRapidoChatTecnicos.
        if (canal === 'tecnicos' && CHAT_AREA_ADM_CTX.areaDestinoTecnicos) {
            const ultimaMsg = lista.length ? lista[lista.length - 1] : null;
            if (CHAT_TECNICOS_ULTIMA_EM_CONHECIDA === null && ultimaMsg) {
                CHAT_TECNICOS_ULTIMA_EM_CONHECIDA = ultimaMsg.criado_em;
            }
            window.iniciarPollingRapidoChatTecnicos();
        }
    } catch (e) {
        cont.innerHTML = '<div class="chat-vazio">Não consegui carregar a conversa.</div>';
    }
};

// 🆕 "Está digitando...", presença (online/offline + último acesso) e
// aviso de mensagem nova no canal Entre Técnicos — pedido do usuário,
// igual WhatsApp. O auto-refresh geral (REFRESH_POR_ABA) já cobria essa
// aba a cada 15s, rápido demais pra virar chat de verdade mas devagar
// demais pra "digitando"; este é um timer À PARTE, só enquanto uma
// conversa Entre Técnicos está de fato aberta na tela, e se autodesarma
// sozinho quando a pessoa sai dela (mesmo padrão de polling
// autodesarmável já usado no resto do arquivo).
const INTERVALO_POLLING_RAPIDO_CHAT_MS = 3000;
let TIMER_POLLING_RAPIDO_CHAT = null;
let CHAT_TECNICOS_ULTIMA_EM_CONHECIDA = null;

window.iniciarPollingRapidoChatTecnicos = function() {
    window.pararPollingRapidoChat();
    TIMER_POLLING_RAPIDO_CHAT = setInterval(async () => {
        const aba = document.getElementById('aba-chats');
        const emConversaTecnicos = aba && aba.classList.contains('active')
            && CHAT_AREA_ADM_CTX.canal === 'tecnicos' && CHAT_AREA_ADM_CTX.areaDestinoTecnicos;
        if (!emConversaTecnicos) { window.pararPollingRapidoChat(); return; }

        const minhaArea = CHAT_AREA_ADM_CTX.area;
        const outraArea = CHAT_AREA_ADM_CTX.areaDestinoTecnicos;

        executarSeguroAsync(async () => {
            const apiBase = await resolverApiBase();

            // "Está digitando..."
            const respDig = await fetch(`${apiBase}/api/mensagens_area/digitando?area=${encodeURIComponent(minhaArea)}&area_destino=${encodeURIComponent(outraArea)}`, { cache: 'no-store' });
            const dadosDig = respDig.ok ? await respDig.json() : { digitando: false };
            const elDig = document.getElementById('chat-thread-digitando');
            if (elDig) {
                const infoDestino = AREAS_OFICINA.find(a => a.chave === outraArea);
                elDig.textContent = dadosDig.digitando ? `${infoDestino ? infoDestino.nome : outraArea} está digitando...` : '';
                elDig.classList.toggle('hidden', !dadosDig.digitando);
            }

            // Presença (online agora / offline há Xh) da área com quem fala.
            const respPresenca = await fetch(`${apiBase}/api/colaboradores/presenca_area?area=${encodeURIComponent(outraArea)}`, { cache: 'no-store' });
            const dadosPresenca = respPresenca.ok ? await respPresenca.json() : { ultimo_acesso: null };
            const elPresenca = document.getElementById('chat-thread-presenca');
            if (elPresenca && typeof window.formatarPresencaColaborador === 'function') {
                elPresenca.innerHTML = window.formatarPresencaColaborador(dadosPresenca.ultimo_acesso);
            }

            // Mensagem nova chegou? (resumo_tecnicos é uma query bem mais
            // leve que buscar a conversa inteira de novo a cada 3s).
            const respResumo = await fetch(`${apiBase}/api/mensagens_area/resumo_tecnicos?area=${encodeURIComponent(minhaArea)}`, { cache: 'no-store' });
            const linhasResumo = respResumo.ok ? await respResumo.json() : [];
            const par = Array.isArray(linhasResumo) ? linhasResumo.find(l => l.outra_area === outraArea) : null;
            if (par && par.ultima_em && par.ultima_em !== CHAT_TECNICOS_ULTIMA_EM_CONHECIDA) {
                const eraPrimeiraChecagem = CHAT_TECNICOS_ULTIMA_EM_CONHECIDA === null;
                CHAT_TECNICOS_ULTIMA_EM_CONHECIDA = par.ultima_em;
                await window.chatsCarregarMensagens();
                if (!eraPrimeiraChecagem) {
                    window.mostrarAvisoNovaMensagemChat(par.nome_area || outraArea);
                    executarSeguro(() => window.atualizarBadgeChatAreaAdm(), 'atualizarBadgeChatAreaAdm');
                }
            }
        }, 'pollingRapidoChatTecnicos');
    }, INTERVALO_POLLING_RAPIDO_CHAT_MS);
};

window.pararPollingRapidoChat = function() {
    if (TIMER_POLLING_RAPIDO_CHAT) {
        clearInterval(TIMER_POLLING_RAPIDO_CHAT);
        TIMER_POLLING_RAPIDO_CHAT = null;
    }
    CHAT_TECNICOS_ULTIMA_EM_CONHECIDA = null;
};

// 🆕 CORREÇÃO ("se eu tiver em qualquer aba, tem que aparecer a
// notificação" / "se eu tiver na aba do técnico e chegar [mensagem] no
// supervisor tem que sinalizar"): o polling rápido de 3s (digitando/
// presença/mensagem nova) só rodava DENTRO da aba Chats, com uma
// conversa Entre Técnicos aberta — em qualquer outra tela (Painel do
// Técnico, Central de Áreas, etc.) nada avisava que chegou mensagem
// nova, nem no canal Supervisão nem no Entre Técnicos. Este poller é
// GLOBAL: começa no login, roda em QUALQUER aba (não é
// desarmado/religado por window.abrirAba como o REFRESH_POR_ABA), e
// cobre os dois canais de uma vez via /api/mensagens_area/nao_lidas
// (que já soma supervisao + tecnicos, ver correção anterior).
const INTERVALO_NOTIFICACAO_GLOBAL_CHAT_MS = 6000;
let TIMER_NOTIFICACAO_GLOBAL_CHAT = null;
let NOTIF_GLOBAL_CHAT_ULTIMO_TOTAL = null;

window.iniciarNotificacaoGlobalChat = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return; // visitante não tem chat de verdade
    window.pararNotificacaoGlobalChat();
    TIMER_NOTIFICACAO_GLOBAL_CHAT = setInterval(() => {
        if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) { window.pararNotificacaoGlobalChat(); return; }
        executarSeguroAsync(async () => {
            const isAdm = !!OPERADOR_LOGADO.isAdm;
            const apiBase = await resolverApiBase();
            let total = 0;
            let nomeProvavel = 'uma conversa';

            if (isAdm) {
                const resp = await fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store' });
                const linhas = resp.ok ? await resp.json() : [];
                if (Array.isArray(linhas)) {
                    total = linhas.reduce((s, l) => s + (Number(l.nao_lidas) || 0), 0);
                    const maisNaoLidas = linhas.filter(l => l.nao_lidas > 0).sort((a, b) => b.nao_lidas - a.nao_lidas)[0];
                    if (maisNaoLidas) nomeProvavel = maisNaoLidas.nome_area || maisNaoLidas.area;
                }
            } else {
                const area = OFICINA_AREA_ATUAL || OPERADOR_LOGADO.area;
                if (!area) return;
                const resp = await fetch(`${apiBase}/api/mensagens_area/nao_lidas?area=${encodeURIComponent(area)}`, { cache: 'no-store' });
                const dados = resp.ok ? await resp.json() : { nao_lidas: 0 };
                total = dados.nao_lidas || 0;
                nomeProvavel = 'ADM ou outra área';
            }

            const navBadge = document.getElementById('nav-chats-badge');
            if (navBadge) aplicarBadgeElemento(navBadge, total);

            // Só avisa se o total SUBIU desde a última checagem (chegou
            // mensagem nova de verdade — não dispara ao simplesmente ler
            // e o número cair). Não duplica aviso se a pessoa já está
            // dentro do Chat vendo a conversa certa ao vivo (o polling
            // rápido de 3s de lá já cuida desse caso com o nome certo).
            const dentroDoChatCerto = document.getElementById('aba-chats')?.classList.contains('active') && CHAT_AREA_ADM_CTX.area;
            if (NOTIF_GLOBAL_CHAT_ULTIMO_TOTAL !== null && total > NOTIF_GLOBAL_CHAT_ULTIMO_TOTAL && !dentroDoChatCerto) {
                window.mostrarAvisoNovaMensagemChat(nomeProvavel);
                navBadge?.classList.add('badge-piscando');
                setTimeout(() => navBadge?.classList.remove('badge-piscando'), 4000);
            }
            NOTIF_GLOBAL_CHAT_ULTIMO_TOTAL = total;
        }, 'notificacaoGlobalChat');
    }, INTERVALO_NOTIFICACAO_GLOBAL_CHAT_MS);
};

window.pararNotificacaoGlobalChat = function() {
    if (TIMER_NOTIFICACAO_GLOBAL_CHAT) {
        clearInterval(TIMER_NOTIFICACAO_GLOBAL_CHAT);
        TIMER_NOTIFICACAO_GLOBAL_CHAT = null;
    }
    NOTIF_GLOBAL_CHAT_ULTIMO_TOTAL = null;
};

// 🆕 Aviso no topo da tela quando chega mensagem nova no Entre Técnicos
// (além de atualizar o badge, que já acontecia) — mesmo padrão visual
// de toast já usado em mostrarAvisoPreenchimentoChecklist.
// 🆕 Empilha os toasts de aviso (chat + notificações gerais) num
// container só, um embaixo do outro — sem isso, dois avisos chegando
// perto um do outro ficavam um exatamente por cima do outro (mesma
// posição fixa), e o de baixo nunca aparecia.
function obterContainerToastsAvisos() {
    let cont = document.getElementById('toasts-avisos-container');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'toasts-avisos-container';
        cont.style.cssText = 'position:fixed; top:16px; right:16px; z-index:10500; display:flex; flex-direction:column; gap:8px; max-width:320px; pointer-events:none;';
        document.body.appendChild(cont);
    }
    return cont;
}

window.mostrarAvisoNovaMensagemChat = function(nomeArea) {
    const toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 16px; border-radius:10px; font-size:13px; background:var(--brand, #f59e0b); color:#1a1a1a; box-shadow:0 10px 30px rgba(0,0,0,0.4); animation:fadeInModal 0.25s ease-out; pointer-events:auto; cursor:pointer;';
    toast.innerHTML = `<i class="fas fa-comment-dots"></i> Nova mensagem de <strong>${nomeArea}</strong>`;
    toast.onclick = () => {
        toast.remove();
        document.getElementById('nav-chats')?.click();
    };
    obterContainerToastsAvisos().appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

// 🆕 Aviso genérico pra QUALQUER notificação da Central (OS, atividade,
// achado de Qualidade, estoque, sinótico...) — pedido do usuário: "isso
// pode ser pra todas as notificações aparecer ali por 5 segundos e
// sumir, aí pra mim ver ou eu clico na notificação ou vou na área de
// notificações". Clicar já leva direto pro destino (mesma função que o
// clique dentro da Central usa) e marca como lida.
window.mostrarAvisoNotificacaoGenerica = function(item) {
    const toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 14px; border-radius:10px; font-size:13px; background:var(--bg-card, #1a1a1a); color:var(--text-heading); border:1px solid var(--border-color); box-shadow:0 10px 30px rgba(0,0,0,0.4); animation:fadeInModal 0.25s ease-out; pointer-events:auto; cursor:pointer;';
    const icone = (typeof ICONE_POR_TIPO_NOTIFICACAO !== 'undefined' && ICONE_POR_TIPO_NOTIFICACAO[item.tipo]) || '📋';
    toast.innerHTML = `
        <div style="display:flex; gap:8px; align-items:flex-start;">
            <span style="font-size:18px; flex-shrink:0;">${icone}</span>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; color:var(--text-heading);">${window.escapeHtmlNotif(item.referencia) || 'Notificação'}</div>
                ${item.descricao ? `<div class="text-muted" style="font-size:12px; margin-top:2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${window.escapeHtmlNotif(window.limparMarcadorTecnicoDescricao(item.descricao))}</div>` : ''}
            </div>
        </div>
    `;
    toast.onclick = () => {
        toast.remove();
        window.abrirItemNotificacao(item.tipo, item.evento_id, item.referencia, item.area, item.atividade_id != null ? Number(item.atividade_id) : null, item.tipo_evento || 'status');
    };
    obterContainerToastsAvisos().appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

// 🆕 Aviso-resumo pra quem loga (ou volta) com notificação represada —
// clicar leva direto pra Central de Notificações, em vez de detalhar
// item por item (isso o badge + a própria Central já fazem).
window.mostrarAvisoResumoNotificacoesPendentes = function(quantidade) {
    const toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 14px; border-radius:10px; font-size:13px; background:var(--bg-card, #1a1a1a); color:var(--text-heading); border:1px solid var(--text-accent); box-shadow:0 10px 30px rgba(0,0,0,0.4); animation:fadeInModal 0.25s ease-out; pointer-events:auto; cursor:pointer;';
    toast.innerHTML = `<i class="fas fa-bell"></i> Você tem <strong>${quantidade}</strong> notificaç${quantidade === 1 ? 'ão' : 'ões'} não vista${quantidade === 1 ? '' : 's'} — toque pra ver`;
    toast.onclick = () => {
        toast.remove();
        document.getElementById('nav-notificacoes')?.click();
    };
    obterContainerToastsAvisos().appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

// 🆕 Poller GLOBAL da Central de Notificações (mesmo espírito do
// iniciarNotificacaoGlobalChat) — roda em qualquer aba, iniciado no
// login. Compara os ids do feed a cada ciclo com os já vistos NESTA
// sessão; só avisa dos itens que apareceram DEPOIS da 1ª checagem (não
// dispara um toast pra cada notificação não lida antiga assim que a
// pessoa loga).
const INTERVALO_NOTIFICACAO_GLOBAL_FEED_MS = 15000;
let TIMER_NOTIFICACAO_GLOBAL_FEED = null;
let NOTIF_GLOBAL_FEED_IDS_CONHECIDOS = null;

window.iniciarNotificacaoGlobalFeed = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;
    window.pararNotificacaoGlobalFeed();
    TIMER_NOTIFICACAO_GLOBAL_FEED = setInterval(() => {
        if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula || typeof operadorPodeVerNotificacoes !== 'function' || !operadorPodeVerNotificacoes()) {
            window.pararNotificacaoGlobalFeed();
            return;
        }
        executarSeguroAsync(async () => {
            const feed = await window.carregarFeedNotificacoes();
            if (feed === null) return;

            const feedDoOperador = (typeof operadorTecnicoComArea === 'function' && operadorTecnicoComArea())
                ? feed.filter(item => item.area === OPERADOR_LOGADO.area)
                : feed;
            const idsAtuais = new Set(feedDoOperador.map(i => `${i.tipo}:${i.evento_id}`));

            if (NOTIF_GLOBAL_FEED_IDS_CONHECIDOS === null) {
                NOTIF_GLOBAL_FEED_IDS_CONHECIDOS = idsAtuais;
                // 🔧 CORREÇÃO ("só foi conferir depois" — o toast normal só
                // avisa de eventos que chegam DEPOIS do login, de propósito,
                // pra não enfiar uma enxurrada de toast de coisa velha na
                // cara de quem loga depois de um tempo fora. Mas isso
                // deixava quem chegou atrasado sem NENHUM sinal, mesmo
                // tendo coisa esperando — mostra 1 aviso-resumo (não um por
                // item) na 1ª checagem, se tiver algo não lido.
                const naoLidasNaPrimeiraChecagem = feedDoOperador.filter(i => !i.lida).length;
                const dentroDaCentralAgora = document.getElementById('aba-notificacoes')?.classList.contains('active');
                if (naoLidasNaPrimeiraChecagem > 0 && !dentroDaCentralAgora) {
                    window.mostrarAvisoResumoNotificacoesPendentes(naoLidasNaPrimeiraChecagem);
                }
            } else {
                const novos = feedDoOperador.filter(i => !NOTIF_GLOBAL_FEED_IDS_CONHECIDOS.has(`${i.tipo}:${i.evento_id}`));
                NOTIF_GLOBAL_FEED_IDS_CONHECIDOS = idsAtuais;
                // Não duplica aviso se a pessoa já está DENTRO da Central
                // vendo isso ao vivo.
                const dentroDaCentral = document.getElementById('aba-notificacoes')?.classList.contains('active');
                if (!dentroDaCentral) {
                    novos.slice(0, 3).forEach(item => window.mostrarAvisoNotificacaoGenerica(item));
                }
            }
            if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas(feed);
        }, 'notificacaoGlobalFeed');
    }, INTERVALO_NOTIFICACAO_GLOBAL_FEED_MS);
};

window.pararNotificacaoGlobalFeed = function() {
    if (TIMER_NOTIFICACAO_GLOBAL_FEED) {
        clearInterval(TIMER_NOTIFICACAO_GLOBAL_FEED);
        TIMER_NOTIFICACAO_GLOBAL_FEED = null;
    }
    NOTIF_GLOBAL_FEED_IDS_CONHECIDOS = null;
};

// 🆕 "Estou digitando" — ping throttled (no máx. 1x a cada 1.5s) pro
// outro lado saber, só quando o campo tem texto de verdade. O TTL no
// backend (DIGITANDO_TTL_SEGUNDOS) cuida de "parar de mostrar" sozinho
// se a pessoa parar de digitar sem mandar nem apagar o texto.
let CHAT_ULTIMO_PING_DIGITANDO = 0;
window.chatsAvisarDigitando = function() {
    if (CHAT_AREA_ADM_CTX.canal !== 'tecnicos' || !CHAT_AREA_ADM_CTX.areaDestinoTecnicos) return;
    const input = document.getElementById('chat-thread-input');
    if (!input || !input.value.trim()) return;
    const agora = Date.now();
    if (agora - CHAT_ULTIMO_PING_DIGITANDO < 1500) return;
    CHAT_ULTIMO_PING_DIGITANDO = agora;
    executarSeguroAsync(async () => {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/mensagens_area/digitando`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area: CHAT_AREA_ADM_CTX.area, area_destino: CHAT_AREA_ADM_CTX.areaDestinoTecnicos })
        });
    }, 'chatsAvisarDigitando');
};

// 🆕 Foto escolhida (câmera ou galeria) aguardando envio — guardada já
// comprimida em base64 (reaproveita comprimirFotoParaBase64, mesma
// função já usada em outras telas do sistema). Um chat só tem uma
// conversa aberta por vez, então uma variável simples basta (mesmo
// padrão de FOTO_INTERVENCAO_BASE64/OFICINA_FOTO_BASE64 já usado).
let CHAT_FOTO_PENDENTE_BASE64 = null;

// 🆕 Referência de atividade pendente de envio — pedido do usuário:
// "parece que tem 2 chats" (o modal "Conversa da Atividade" + o
// espelho no canal Entre Técnicos eram, na prática, duas conversas
// diferentes pro mesmo assunto). Agora existe só 1 chat: clicar em
// "Conversa" numa atividade (window.abrirConversaAtividade) abre
// direto o canal Entre Técnicos da área certa, com essa referência
// pendurada — a próxima mensagem enviada já sai marcada "Respondendo:
// ...", sem precisar de tabela/endpoint separado nem modal.
let CHAT_ATIVIDADE_PENDENTE_REFERENCIA = null;
// Usado por window.abrirConversaAtividade (ainda em script.js) depois de
// trocar pra conversa/canal certos — ver comentário mais abaixo.
window.setChatAtividadePendenteReferencia = function(referencia) {
    CHAT_ATIVIDADE_PENDENTE_REFERENCIA = referencia;
};

window.chatsCancelarRespostaAtividade = function() {
    CHAT_ATIVIDADE_PENDENTE_REFERENCIA = null;
    document.getElementById('chat-thread-atividade-preview')?.classList.add('hidden');
};

window.chatsProcessarFoto = async function(arquivo) {
    if (!arquivo) return;
    try {
        CHAT_FOTO_PENDENTE_BASE64 = await window.comprimirFotoParaBase64(arquivo);
        const preview = document.getElementById('chat-thread-foto-preview');
        const previewImg = document.getElementById('chat-thread-foto-preview-img');
        if (previewImg) previewImg.src = CHAT_FOTO_PENDENTE_BASE64;
        if (preview) preview.classList.remove('hidden');
    } catch (e) {
        alert('Não consegui processar essa foto. Tente outra.');
    } finally {
        // Limpa os dois <input type=file> — sem isso, escolher o MESMO
        // arquivo de novo depois de remover não dispara "onchange".
        const galeria = document.getElementById('chat-thread-foto-galeria');
        const camera = document.getElementById('chat-thread-foto-camera');
        if (galeria) galeria.value = '';
        if (camera) camera.value = '';
    }
};

window.chatsCancelarFoto = function() {
    CHAT_FOTO_PENDENTE_BASE64 = null;
    document.getElementById('chat-thread-foto-preview')?.classList.add('hidden');
    const previewImg = document.getElementById('chat-thread-foto-preview-img');
    if (previewImg) previewImg.src = '';
};

window.chatsEnviarMensagem = async function() {
    const input = document.getElementById('chat-thread-input');
    const texto = input ? input.value.trim() : '';
    const foto = CHAT_FOTO_PENDENTE_BASE64;
    // 🆕 Manda se tiver texto OU foto (antes só permitia texto) — pedido
    // do usuário: "posso anexar uma foto ou tirar uma foto", inclusive
    // sem legenda nenhuma.
    if ((!texto && !foto) || !CHAT_AREA_ADM_CTX.area) return;
    const canal = CHAT_AREA_ADM_CTX.canal || 'supervisao';
    // 🆕 Canal 'tecnicos' é área-a-área agora — sem área escolhida, não
    // tem pra onde mandar (a linha de envio já fica escondida nesse
    // caso, ver chatsAtualizarVisibilidadeEnvio, mas a checagem aqui
    // evita mandar mesmo se algo chamar essa função por fora).
    if (canal === 'tecnicos' && !CHAT_AREA_ADM_CTX.areaDestinoTecnicos) return;
    // 🆕 Canal "tecnicos" não tem "lado ADM" (o ADM só lê, nunca escreve
    // ali — a linha de envio fica escondida pra ele, ver
    // chatsAtualizarVisibilidadeEnvio). de_adm sempre falso nesse canal.
    const deAdmEfetivo = canal === 'tecnicos' ? false : CHAT_AREA_ADM_CTX.deAdm;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    const matricula = OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/mensagens_area`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: CHAT_AREA_ADM_CTX.area,
                de_adm: deAdmEfetivo,
                remetente: deAdmEfetivo ? 'ADM' : operador,
                remetente_matricula: matricula,
                mensagem: texto,
                foto_base64: foto,
                canal: canal,
                area_destino: canal === 'tecnicos' ? CHAT_AREA_ADM_CTX.areaDestinoTecnicos : null,
                atividade_referencia: CHAT_ATIVIDADE_PENDENTE_REFERENCIA || null
            })
        });
        if (!resp.ok) throw new Error('Falha ao enviar');
        input.value = '';
        window.chatsCancelarFoto();
        window.chatsCancelarRespostaAtividade();
        await window.chatsCarregarMensagens();
        if (CHAT_AREA_ADM_CTX.deAdm) await window.chatsCarregarListaConversas();
    } catch (e) {
        alert('Não consegui enviar a mensagem. Verifique sua conexão.');
    }
};

// ---- Atalhos de compatibilidade — botões antigos (badge na Área da
// Oficina, "Mensagens das Áreas" no painel ADM) continuam chamando
// esses nomes; agora só levam pra aba de Chats em vez de abrir modal. ----
window.abrirChatAreaAdm = async function() {
    if (!OFICINA_AREA_ATUAL) return;
    window.abrirAba(null, 'aba-chats');
    await window.chatsSelecionarConversa(OFICINA_AREA_ATUAL, false);
};

window.abrirChatAdmArea = async function(area) {
    window.abrirAba(null, 'aba-chats');
    await window.chatsSelecionarConversa(area, true);
};

window.abrirChatAdmLista = function() {
    window.abrirAba(null, 'aba-chats');
};

function aplicarBadgeElemento(el, total) {
    if (!el) return;
    if (total > 0) {
        el.textContent = total > 9 ? '9+' : total;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

window.atualizarBadgeChatAreaAdm = async function() {
    const isAdm = !!(OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm);
    const navBadge = document.getElementById('nav-chats-badge');
    if (isAdm) {
        // ADM: badge do nav soma as não lidas de todas as áreas.
        try {
            const apiBase = await resolverApiBase();
            const resp = await fetch(`${apiBase}/api/mensagens_area/resumo`, { cache: 'no-store' });
            const linhas = resp.ok ? await resp.json() : [];
            const total = Array.isArray(linhas) ? linhas.reduce((s, l) => s + (Number(l.nao_lidas) || 0), 0) : 0;
            aplicarBadgeElemento(navBadge, total);
        } catch (e) { /* badge é cosmético — sem retry aqui */ }
        return;
    }
    const badgeArea = document.getElementById('area-oficina-chat-badge');
    if (!OFICINA_AREA_ATUAL) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/mensagens_area/nao_lidas?area=${encodeURIComponent(OFICINA_AREA_ATUAL)}`);
        const dados = resp.ok ? await resp.json() : { nao_lidas: 0 };
        aplicarBadgeElemento(badgeArea, dados.nao_lidas || 0);
        aplicarBadgeElemento(navBadge, dados.nao_lidas || 0);
    } catch (e) { /* badge é cosmético — sem retry aqui */ }
};

let FILA_AVISOS_PENDENTES = [];

window.verificarAvisosPendentes = async function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/avisos?matricula=${encodeURIComponent(OPERADOR_LOGADO.matricula)}`, { cache: 'no-store' });
        const avisos = resp.ok ? await resp.json() : [];
        if (Array.isArray(avisos) && avisos.length > 0) {
            FILA_AVISOS_PENDENTES = avisos;
            window.mostrarProximoAvisoPendente();
        }
    } catch (e) {
        // Sem internet ou API fora do ar na hora do login — não trava o
        // acesso por isso; o aviso continua pendente e aparece na
        // próxima vez que a checagem der certo.
        console.error('⚠️ Não consegui checar avisos pendentes:', e);
    }
};

window.mostrarProximoAvisoPendente = function() {
    const modal = document.getElementById('modal-aviso-pendente');
    if (!modal) return;
    if (FILA_AVISOS_PENDENTES.length === 0) {
        modal.classList.add('hidden');
        return;
    }
    const aviso = FILA_AVISOS_PENDENTES[0];
    const elTitulo = document.getElementById('aviso-pendente-titulo');
    const elMensagem = document.getElementById('aviso-pendente-mensagem');
    const elContador = document.getElementById('aviso-pendente-contador');
    if (elTitulo) elTitulo.textContent = aviso.titulo;
    if (elMensagem) elMensagem.textContent = aviso.mensagem;
    if (elContador) elContador.textContent = FILA_AVISOS_PENDENTES.length > 1 ? `1 de ${FILA_AVISOS_PENDENTES.length}` : '';
    modal.classList.remove('hidden');
};

window.confirmarLeituraAvisoPendente = async function() {
    const aviso = FILA_AVISOS_PENDENTES[0];
    if (!aviso) return;
    const botao = document.getElementById('btn-confirmar-leitura-aviso');
    if (botao) botao.disabled = true;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/avisos/marcar_lido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aviso_id: aviso.id, matricula: OPERADOR_LOGADO.matricula })
        });
    } catch (e) {
        console.error('⚠️ Não consegui confirmar a leitura do aviso (tenta de novo mais tarde):', e);
    } finally {
        if (botao) botao.disabled = false;
    }
    FILA_AVISOS_PENDENTES.shift();
    window.mostrarProximoAvisoPendente();
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

