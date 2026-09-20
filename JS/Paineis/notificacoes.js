// ==========================================================================
// CENTRAL DE NOTIFICAÇÕES — extraído de script.js na modularização
// ==========================================================================
// Polling da Central (badge + feed), heartbeat de presença do
// colaborador, o auto-refresh genérico por aba, e a lista única de
// notificações (grade por área + feed "flat" com filtro/busca/ordem).

import { resolverApiBase, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, OFICINA_ATIVIDADES_CACHE, setOficinaAtividadesCache } from '../Core/estado.js';
import { operadorPodeVerNotificacoes, operadorTecnicoComArea } from '../Core/permissoes.js';
import { executarSeguro, executarSeguroAsync, atividadeEstaAtrasada } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ==========================================
// 🔧 Voltou pra 30s (chegou a ir pra 10s por um instante): o banco é
// Neon plano free, com auto-suspend e CU-hrs limitados — 3x mais
// polling é 3x mais chance de manter o compute acordado à toa. 30s já
// é rápido o bastante pra área subir na lista logo depois de notificar,
// sem gastar cota de graça.
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

// 🆕 PRESENÇA REAL DO COLABORADOR — heartbeat periódico enquanto o app
// está aberto e logado (com matrícula real, visitante fica de fora).
// Mesmo padrão de polling autodesarmável já usado no resto do arquivo:
// se OPERADOR_LOGADO sumir (logout recarrega a página, então isso é
// mais defensivo que necessário), o próprio timer se desliga.
const INTERVALO_HEARTBEAT_COLABORADOR_MS = 60000;
let TIMER_HEARTBEAT_COLABORADOR = null;

window.iniciarHeartbeatColaborador = function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return; // visitante não tem matrícula pra reportar
    window.pararHeartbeatColaborador();

    const enviarHeartbeat = () => executarSeguroAsync(async () => {
        if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) { window.pararHeartbeatColaborador(); return; }
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/colaboradores/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula: OPERADOR_LOGADO.matricula })
        });
    }, 'heartbeatColaborador');

    enviarHeartbeat(); // primeiro sinal na hora, sem esperar o 1º intervalo
    TIMER_HEARTBEAT_COLABORADOR = setInterval(enviarHeartbeat, INTERVALO_HEARTBEAT_COLABORADOR_MS);
};

window.pararHeartbeatColaborador = function() {
    if (TIMER_HEARTBEAT_COLABORADOR) {
        clearInterval(TIMER_HEARTBEAT_COLABORADOR);
        TIMER_HEARTBEAT_COLABORADOR = null;
    }
};

// 🆕 CORREÇÃO ("mando mensagem e fico na tela, só chega se eu sair e
// voltar" — depois confirmado pelo usuário que o mesmo problema vale
// pra qualquer aba, não só o Chat): até aqui, cada aba só recarregava
// os dados dela quando a pessoa clicava pra abri-la — sair e voltar era
// o único "refresh" que existia. Registro único de auto-refresh por
// aba, plugado em window.abrirAba (o trocador de aba central do app):
// ao entrar numa aba com refresh conhecido, dispara um setInterval que
// chama a MESMA função que já roda ao abrir a aba; ao sair da aba (ou
// abrir outra), o timer da aba anterior é desarmado. Só cobre abas cuja
// função de recarregar é uma lista/painel somente-leitura (idempotente
// re-renderizar) — abas de formulário (cadastro, lançamento) não têm
// entrada aqui de propósito, pra não apagar o que a pessoa tá digitando
// no meio de um polling.
const INTERVALO_AUTO_REFRESH_ABA_MS = 15000;
// 🔧 Todas as entradas também chamam atualizarBadgeChatAreaAdm — antes o
// badge de "mensagens não lidas" (nav Chats / Central de Áreas) só
// atualizava em raras ações pontuais (login, enviar mensagem); ficar
// em qualquer outra aba não avisava que uma mensagem nova chegou no
// canal Entre Técnicos (ver correção em GET /api/mensagens_area/
// nao_lidas, que também deixou de ignorar esse canal).
const REFRESH_POR_ABA = {
    'aba-painel': () => { window.atualizarPainelCompleto(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-painel-supervisor': () => { window.atualizarPainelCompleto(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-tecnico': () => { window.carregarAtividadesPainelTecnico(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-oficina': () => { window.atualizarOficinaSilencioso(); window.atualizarBadgeChatAreaAdm?.(); },
    'aba-reparos': () => window.carregarReparosAndamento(),
    'aba-ordens-servico': () => window.carregarListaOrdensServico(),
    'aba-qualidade': () => window.carregarListaQualidade(),
    'aba-notificacoes': () => window.carregarCentralNotificacoes(),
    'aba-chats': () => { window.chatsCarregarMensagens(); window.atualizarBadgeChatAreaAdm?.(); }, // no-op sozinho se nenhuma conversa estiver aberta
    'aba-admin-colaboradores': () => window.carregarAdminColaboradores(), // mantém "Online agora"/"Offline há Xh" atualizando sozinho
    'aba-area-oficina': () => window.atualizarBadgeChatAreaAdm?.(), // atividades/OS da área já ficam cobertas pelo polling rápido de 4s (window.iniciarPollingRapidoArea)
};
let TIMER_AUTO_REFRESH_ABA = null;

window.pararAutoRefreshAba = function() {
    if (TIMER_AUTO_REFRESH_ABA) {
        clearInterval(TIMER_AUTO_REFRESH_ABA);
        TIMER_AUTO_REFRESH_ABA = null;
    }
};

window.iniciarAutoRefreshAba = function(idAba) {
    window.pararAutoRefreshAba();
    const refresh = REFRESH_POR_ABA[idAba];
    if (!refresh) return; // aba sem refresh automático mapeado
    TIMER_AUTO_REFRESH_ABA = setInterval(() => {
        const aba = document.getElementById(idAba);
        if (!aba || !aba.classList.contains('active')) {
            window.pararAutoRefreshAba();
            return;
        }
        executarSeguro(refresh, `auto-refresh ${idAba}`);
    }, INTERVALO_AUTO_REFRESH_ABA_MS);
};

// 🆕 Feed unificado (evento de Auditoria + OS em aberto + achado de
// Qualidade pendente), com lido/não-lido POR MATRÍCULA vindo pronto do
// backend (/api/notificacoes/feed) — nada de "lido" calculado no
// cliente, senão cada aba/dispositivo teria sua própria ideia do que
// já foi visto.
// 🐛 CORREÇÃO: essa função sempre devolveu `[]` tanto pra "busquei e não
// tem notificação nenhuma" quanto pra "o servidor falhou" (resp não-ok,
// exceção de rede) — exatamente o mesmo bug de "cadê as áreas, tirou
// tudo" já corrigido pro `/api/oficina/atividades`, só que nunca tinha
// sido corrigido aqui: um 500 (ex: pool de conexão esgotado, já
// aconteceu em produção) fazia a Central e o sininho mostrarem "nenhuma
// notificação" bem na hora que tinha alguma sem conseguir avisar.
// `null` = falhou; `[]` = buscou certinho e realmente não tem nada.
window.carregarFeedNotificacoes = async function() {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return [];
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/notificacoes/feed?matricula=${encodeURIComponent(OPERADOR_LOGADO.matricula)}&limite=30`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const feed = await resp.json();
        return Array.isArray(feed) ? feed : null;
    } catch (e) {
        console.error('⚠️ Erro ao carregar feed de notificações:', e);
        return null;
    }
};

// Atualiza o número no sininho do menu lateral — chamado depois do
// login, pelo timer global de 2 min (mesmo com a Central fechada), e
// agora também toda vez que a própria Central busca o feed (ver
// carregarCentralNotificacoes) ou marca algo como lido (ver
// abrirItemNotificacao/marcarTodasLidasDaArea) — 🐛 CORREÇÃO: antes só
// o timer de 2 min mexia nele, então ler tudo dentro da Central e
// fechar a aba deixava o número errado (alto) piscando na barra lateral
// por até 2 minutos.
// `feedPronto` é opcional: quando quem chama já tem o feed em mãos (a
// Central acabou de buscar), evita um fetch duplicado — passe undefined
// pra buscar do zero (uso original, fora da Central).
window.atualizarBadgeNotificacoesNaoLidas = async function(feedPronto) {
    const badge = document.getElementById('badge-notificacoes-nao-lidas');
    if (!badge) return;
    if (!operadorPodeVerNotificacoes()) { badge.classList.add('hidden'); return; }
    const feed = feedPronto !== undefined ? feedPronto : await window.carregarFeedNotificacoes();
    // `null` = a busca falhou — mantém o sino como já estava (não dá
    // pra saber se tem novidade ou não) em vez de escondê-lo como se
    // tivesse zero, e sem quebrar num "null.filter".
    if (feed === null) return;
    // 🆕 Técnico só conta o que é da própria área — senão o sino dele
    // mostraria não-lidas de áreas que ele nem enxerga na Central.
    const feedDoOperador = operadorTecnicoComArea()
        ? feed.filter(item => item.area === OPERADOR_LOGADO.area)
        : feed;
    const naoLidas = feedDoOperador.filter(item => !item.lida).length;
    // 🆕 Espelha no sino do header do Painel Geral (mesmo número, mesmo
    // critério de exibir/esconder) — ver header-topo-sino-badge em
    // app.html. Não é uma segunda fonte de verdade, só outro elemento
    // mostrando o mesmo estado.
    const badgeHeader = document.getElementById('header-topo-sino-badge');
    if (naoLidas > 0) {
        const texto = naoLidas > 99 ? '99+' : String(naoLidas);
        badge.innerText = texto;
        badge.classList.remove('hidden');
        if (badgeHeader) { badgeHeader.innerText = texto; badgeHeader.classList.remove('hidden'); }
    } else {
        badge.classList.add('hidden');
        if (badgeHeader) badgeHeader.classList.add('hidden');
    }
};

// Estado da navegação estilo Central de Áreas: null = mostrando a
// grade de todas as áreas; com valor = mostrando só as notificações
// daquela área (ver abrirDetalheAreaNotificacao/fecharDetalhe...).
let NOTIF_AREA_SELECIONADA = null;
let NOTIF_FEED_CACHE = [];
// 🔧 CORREÇÃO ("criei atividade, área ficou em Atenção mas o detalhe
// não mostra nada"): o status do card (Crítico/Restrição/Atenção) vem
// das ATIVIDADES em aberto da área (igual à Central de Áreas), mas o
// detalhe só listava o feed de NOTIFICAÇÕES (Ocorrência/OS/Achado/
// Estoque/Sinótico) — uma atividade nova não é nada disso, então o
// card acendia "Atenção" e o detalhe abria vazio. Guarda as atividades
// também pra poder mostrar as em aberto no detalhe.
let NOTIF_ATIVIDADES_CACHE = [];
// 🆕 Busca + filtro por status na grade — mesma UX da Central de Áreas
// (ver renderizarGridCentralAreas), só que aqui filtrando os CARDS de
// notificação, não os de atividade.
let NOTIF_GRADE_BUSCA = '';
let NOTIF_GRADE_FILTRO_STATUS = '';
// 🐛 CORREÇÃO: digitar na busca ou clicar num filtro depois de uma falha
// no servidor chamava renderizarGradeNotificacoes(NOTIF_ATIVIDADES_CACHE, …)
// — que é sempre um array (nunca null) — apagando o aviso de "não
// consegui verificar as áreas" e mostrando uma grade normal (vazia ou
// desatualizada) por cima, exatamente a falsa sensação de "tá tudo bem"
// que a distinção null/[] foi feita pra evitar.
let NOTIF_ULTIMO_FETCH_FALHOU = false;

window.carregarCentralNotificacoes = async function() {
    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO ("cadê as áreas, você tirou tudo"): uma falha real
        // no servidor (ex: pool de conexão do banco esgotado por um
        // instante) fazia essa busca cair no `[]` do catch — e uma lista
        // vazia de atividades é EXATAMENTE o mesmo formato de "nenhuma
        // área crítica agora", então a tela mostrava "tudo certo ✅" bem
        // na hora que os dados não tinham nem chegado. `null` marca "não
        // consegui buscar" separado de "busquei e não tem nada".
        const [atividades, feed] = await Promise.all([
            fetch(`${apiBase}/api/oficina/atividades`, { cache: 'no-store' })
                .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
                .catch(e => { console.error('⚠️ Não consegui buscar atividades da oficina:', e); return null; }),
            window.carregarFeedNotificacoes(),
        ]);

        // 🐛 CORREÇÃO: `feed` também pode vir `null` agora (falha do
        // servidor) — antes disso, NOTIF_FEED_CACHE virava `[]` numa
        // falha, e como esse cache alimenta a contagem de notificações
        // por área E o cálculo do resumo do topo, um 500 no meio do
        // caminho fazia tudo parecer "zero notificação" em vez de "não
        // consegui verificar". Mantém o último feed bom em cache em vez
        // de apagar com uma falha.
        if (Array.isArray(feed)) NOTIF_FEED_CACHE = feed;
        NOTIF_ATIVIDADES_CACHE = Array.isArray(atividades) ? atividades : [];
        // 🐛 CORREÇÃO (severidade saindo sempre "Normal"/"Novo" na lista de
        // notificações): severidadeNotificacaoItem() reaproveita
        // window.calcularStatusArea(), que lê de OFICINA_ATIVIDADES_CACHE — uma
        // variável de módulo DIFERENTE, preenchida só pela Central de
        // Áreas (window.carregarOficina). Quem entra direto na Central de
        // Notificações sem nunca ter aberto a Central de Áreas nessa
        // sessão via essa variável vazia, e toda área calculava "Normal"
        // mesmo tendo pendência/atrasada de verdade. Os dois caches vêm
        // do MESMO endpoint (/api/oficina/atividades) — sincroniza aqui
        // também, só quando a busca deu certo (não sobrescreve o cache
        // bom da Central de Áreas com [] numa falha de rede só desta
        // busca).
        if (Array.isArray(atividades)) setOficinaAtividadesCache(atividades);
        NOTIF_ULTIMO_FETCH_FALHOU = !Array.isArray(atividades) || !Array.isArray(feed);
        renderizarNotificacoesFlat(Array.isArray(feed) ? feed : null);
        // 🐛 CORREÇÃO: mantém o sino da barra lateral em dia sempre que a
        // Central busca o feed (reaproveita o que já veio, sem outro
        // fetch) — antes só o timer global de 2 min mexia nele, então
        // marcar tudo como lido aqui dentro deixava o número errado
        // piscando lá fora por um tempo.
        if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas(Array.isArray(feed) ? feed : null);
        // Se a pessoa já estiver dentro do detalhe de uma área, atualiza
        // ele também — sem isso, o polling de 30s só atualizaria a grade
        // por trás, e a lista de itens ficaria parada até voltar/entrar
        // de novo.
        if (NOTIF_AREA_SELECIONADA) renderizarDetalheAreaNotificacao(NOTIF_AREA_SELECIONADA);

        const marcador = document.getElementById('notificacoes-ultima-atualizacao');
        if (marcador) marcador.innerText = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
    } catch (e) {
        console.error('⚠️ Erro ao carregar a Central de Notificações:', e);
    } finally {
        window.iniciarPollingCentralNotificacoes();
    }
};

window.irParaAreaOficinaViaNotificacao = function(chave, atividadeId) {
    // 🔧 REVERTIDO ("essa tela [o painel resumo] não é a que funciona de
    // vdd, vc tirou"): a correção anterior mandava notificação de área
    // administrativa (Logística etc.) pro painel resumo (abaDestino) —
    // mas esse painel é só leitura (KPIs + lista), SEM os botões
    // Iniciar/Recusar/Concluir. Quem clica numa notificação de
    // atividade quer AGIR nela, e isso só existe no quadro genérico
    // (window.abrirAreaOficina) — que é pra onde esta função sempre
    // mandou. Volta a ir direto pro quadro pra todo mundo, sem
    // distinguir tipo de área.
    window.abrirAba(null, 'aba-oficina');
    document.getElementById('nav-oficina')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    if (typeof window.abrirAreaOficina === 'function') window.abrirAreaOficina(chave);
    // 🆕 Notificação de status/criação/edição (ver abrirItemNotificacao)
    // não abre mais a Conversa — cai aqui, no quadro da área. Sem
    // atividadeId não tem card pra destacar (ex: notificação de
    // exclusão, a atividade já não existe mais).
    if (atividadeId) window.destacarAtividadeNoQuadro(atividadeId);
};

// 🆕 Rola até o card da atividade e pisca a borda dele por alguns
// segundos — dá o mesmo efeito de "chegar direto na atividade" que uma
// tela de detalhe dedicada daria, sem precisar criar uma view nova só
// pra isso. abrirAreaOficina() busca a lista de forma assíncrona, então
// espera o card aparecer no DOM (tenta por até ~3s) antes de desistir.
window.destacarAtividadeNoQuadro = function(atividadeId, tentativas) {
    tentativas = tentativas || 0;
    const card = document.getElementById(`atividade-card-${atividadeId}`);
    if (!card) {
        if (tentativas < 15) setTimeout(() => window.destacarAtividadeNoQuadro(atividadeId, tentativas + 1), 200);
        return;
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('atividade-card-destacada');
    setTimeout(() => card.classList.remove('atividade-card-destacada'), 2600);
};

// 🔧 CORREÇÃO (aba "Registro de Ocorrência" removida — redundante com
// "Criar Atividade" na Central de Áreas): notificações do tipo 'evento'
// (Intervenção/Melhoria/Comentário/Atividade Pendente antigas, ainda no
// banco) clicavam aqui pra abrir aquela aba e filtrar pela peça. Como a
// tela não existe mais, mas o mesmo evento sempre foi gravado com
// peca_id (e /api/historico_eventos lê por peca_id sem filtrar
// categoria), o destino equivalente — e mais completo — é abrir direto
// o Prontuário da peça, que já mostra essa mesma linha do tempo.
window.irParaOcorrenciaEspecifica = function(pecaId) {
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    if (pecaId && typeof abrirHistoricoIndividual === 'function' && BANCO_ATIVOS.find(a => a.id === pecaId)) {
        abrirHistoricoIndividual(pecaId);
    } else {
        alert('Esse registro é de um equipamento que não está mais cadastrado. Veja a Auditoria Global pra conferir o histórico completo.');
    }
};

// Mesma ideia pra OS — filtra pelo número (ou, se a OS não tiver
// número, por um trecho da descrição) assim que a lista carregar.
window.irParaOsEspecifica = async function(termoBusca) {
    window.abrirAba(null, 'aba-ordens-servico');
    document.getElementById('nav-ordens-servico')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    window.popularCheckboxAreasOs();
    await window.carregarListaOrdensServico();
    const input = document.getElementById('os-busca');
    if (input) input.value = termoBusca || '';
    if (typeof window.buscarOrdensServico === 'function') window.buscarOrdensServico(termoBusca || '');
};

// Mesma ideia pra Achado de Qualidade — a lista de Qualidade é por
// equipamento (não por achado individual), então filtra pela peça do
// registro que tem o achado; a pessoa acha ele dentro do card.
window.irParaAchadoEspecifico = async function(pecaId) {
    window.abrirAba(null, 'aba-qualidade');
    document.getElementById('nav-qualidade')?.classList.add('active');
    document.getElementById('nav-notificacoes')?.classList.remove('active');
    await window.carregarListaQualidade();
    const input = document.getElementById('qualidade-busca');
    if (input) input.value = pecaId || '';
    if (typeof window.buscarQualidade === 'function') window.buscarQualidade(pecaId || '');
};

// ==============================================================
// 🆕 LISTA ÚNICA DE NOTIFICAÇÕES (referência mandada pelo usuário) —
// substitui o modelo "grade de área -> clica -> detalhe" por um feed
// só, com todas as notificações de todas as áreas juntas, abas de
// filtro por contagem, busca, ordenação e uma coluna lateral de
// contexto (resumo, atalhos, dica). As funções antigas de
// grade/detalhe por área continuam no arquivo (não removidas), só não
// são mais chamadas — os ids de elemento delas não existem mais no
// HTML, então ficam inertes.
// ==============================================================
let NOTIF_FLAT_FILTRO = 'todas'; // 'todas' | 'criticas' | 'atencao' | 'nao-vistas'
let NOTIF_FLAT_BUSCA = '';
let NOTIF_FLAT_ORDEM = 'recentes'; // 'recentes' | 'nao-lidas' | 'severidade'

// Severidade de UM item de notificação: reaproveita o status calculado
// da ÁREA dele (mesmo cálculo que já colore os cards da Central de
// Áreas) — não é um dado novo por notificação, é herdado da área.
// "Novo" (azul) só aparece quando a área está Normal mas o item ainda
// não foi visto; áreas Crítico/Atenção mantêm a cor delas mesmo lidas,
// porque a urgência é da área, não de ter sido vista ou não.
function severidadeNotificacaoItem(item) {
    const areaStatus = item.area ? window.window.calcularStatusArea(item.area) : null;
    if (areaStatus && areaStatus.label === 'Crítico') return { label: 'Crítico', cor: 'var(--danger)', emoji: '🔴' };
    if (areaStatus && (areaStatus.label === 'Restrição' || areaStatus.label === 'Atenção')) return { label: 'Atenção', cor: 'var(--warning)', emoji: '🟡' };
    if (!item.lida) return { label: 'Novo', cor: 'var(--text-accent)', emoji: '🔵' };
    return { label: 'Normal', cor: 'var(--success)', emoji: '🟢' };
}

window.buscarFeedNotificacoesFlat = function(valor) {
    NOTIF_FLAT_BUSCA = (valor || '').toLowerCase().trim();
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.ordenarFeedNotificacoesFlat = function(valor) {
    NOTIF_FLAT_ORDEM = valor;
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.filtrarFeedNotificacoesFlat = function(filtro) {
    NOTIF_FLAT_FILTRO = filtro;
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

window.limparFiltrosNotificacoesFlat = function() {
    NOTIF_FLAT_FILTRO = 'todas';
    NOTIF_FLAT_BUSCA = '';
    NOTIF_FLAT_ORDEM = 'area';
    const busca = document.getElementById('notificacoes-busca-flat');
    if (busca) busca.value = '';
    const ordenar = document.getElementById('notificacoes-ordenar');
    if (ordenar) ordenar.value = 'area';
    renderizarNotificacoesFlat(NOTIF_FEED_CACHE);
};

// 🆕 "Limpar" na Central de Notificações: o usuário esperava que isso
// LIMPASSE as notificações (marcasse tudo como visto), não só resetasse
// o filtro/busca — antes o botão só fazia a segunda coisa, então na
// prática parecia "não funcionar" (a lista continuava do mesmo jeito).
// Agora marca todas como lidas (mesmo endpoint usado item a item) e
// também reseta o filtro/busca, num botão só.
window.limparTudoNotificacoesFlat = async function(event) {
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) {
        window.limparFiltrosNotificacoesFlat();
        return;
    }

    const restritoAPropriaArea = operadorTecnicoComArea();
    const base = restritoAPropriaArea
        ? NOTIF_FEED_CACHE.filter(item => item.area === OPERADOR_LOGADO.area)
        : NOTIF_FEED_CACHE;
    const naoLidas = base.filter(item => !item.lida);

    const botao = event ? event.currentTarget : null;
    const htmlOriginal = botao ? botao.innerHTML : null;
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Limpando...'; }

    try {
        if (naoLidas.length > 0) {
            const apiBase = await resolverApiBase();
            await Promise.all(naoLidas.map(item => fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: item.tipo, evento_id: String(item.evento_id), matricula: OPERADOR_LOGADO.matricula })
            })));
        }
    } catch (e) {
        console.error('⚠️ Erro ao limpar notificações:', e);
    } finally {
        if (botao) { botao.disabled = false; botao.innerHTML = htmlOriginal; }
        window.limparFiltrosNotificacoesFlat();
        if (typeof window.carregarCentralNotificacoes === 'function') window.carregarCentralNotificacoes();
    }
};

function renderizarNotificacoesFlat(feedBruto) {
    const container = document.getElementById('notificacoes-feed-flat');
    if (!container) return;

    if (feedBruto === null) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0; color:var(--warning);">⚠️ Não foi possível verificar as notificações agora. Toque em "Atualizar" pra tentar de novo.</div>`;
        return;
    }

    const restritoAPropriaArea = operadorTecnicoComArea();
    let itens = (restritoAPropriaArea
        ? feedBruto.filter(item => item.area === OPERADOR_LOGADO.area)
        : feedBruto
    ).map(item => ({ item, sev: severidadeNotificacaoItem(item) }));

    // Pills do topo + abas de filtro sempre refletem TODAS as
    // notificações (antes do filtro de busca/aba atual) — mesmo
    // princípio já usado no resumo da Central de Áreas: filtrar pra
    // focar não devia esconder a contagem real lá em cima.
    const totalGeral = itens.length;
    const criticasGeral = itens.filter(x => x.sev.label === 'Crítico').length;
    const atencaoGeral = itens.filter(x => x.sev.label === 'Atenção').length;
    const naoVistasGeral = itens.filter(x => !x.item.lida).length;

    const resumoTopo = document.getElementById('notificacoes-resumo-topo');
    if (resumoTopo) {
        resumoTopo.innerHTML = `
            <div class="notif-pill-resumo" style="--pill-cor:var(--danger);"><i class="fas fa-triangle-exclamation"></i><div><strong>${criticasGeral}</strong><span>Crítica${criticasGeral === 1 ? '' : 's'}</span></div></div>
            <div class="notif-pill-resumo" style="--pill-cor:var(--warning);"><i class="fas fa-circle-exclamation"></i><div><strong>${atencaoGeral}</strong><span>Atenção</span></div></div>
            <div class="notif-pill-resumo" style="--pill-cor:var(--text-accent);"><i class="fas fa-bell"></i><div><strong>${naoVistasGeral}</strong><span>Não vistas</span></div></div>
        `;
    }

    const abas = document.getElementById('notificacoes-abas-filtro');
    if (abas) {
        const btn = (valor, label, qtd) => `<button class="btn-filter-mcc ${NOTIF_FLAT_FILTRO === valor ? 'active' : ''}" onclick="window.filtrarFeedNotificacoesFlat('${valor}')">${label} (${qtd})</button>`;
        abas.innerHTML = btn('todas', 'Todas', totalGeral) + btn('criticas', '🔴 Críticas', criticasGeral) + btn('atencao', '🟡 Atenção', atencaoGeral) + btn('nao-vistas', '🔵 Não vistas', naoVistasGeral);
    }

    // Donut de resumo (mesmo padrão conic-gradient já usado em outros
    // donuts do sistema, ex: painel-donut-anel no Painel Geral).
    const donut = document.getElementById('notificacoes-resumo-donut');
    if (donut) {
        const normaisGeral = Math.max(0, totalGeral - criticasGeral - atencaoGeral);
        if (totalGeral === 0) {
            donut.innerHTML = `<div class="text-muted" style="text-align:center; padding:10px 0; font-size:12px;">Sem notificações.</div>`;
        } else {
            const pctCrit = (criticasGeral / totalGeral) * 100;
            const pctAtn = (atencaoGeral / totalGeral) * 100;
            donut.innerHTML = `
                <div style="display:flex; align-items:center; gap:16px;">
                    <div class="painel-donut-anel" style="background:conic-gradient(var(--danger) 0% ${pctCrit}%, var(--warning) ${pctCrit}% ${pctCrit + pctAtn}%, var(--success) ${pctCrit + pctAtn}% 100%); width:84px; height:84px; flex-shrink:0;">
                        <div class="painel-donut-centro" style="inset:12px;"><strong style="font-size:1rem;">${totalGeral}</strong><span>Total</span></div>
                    </div>
                    <div class="painel-donut-legenda" style="flex:1;">
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--danger);"></span>Críticas</span><strong>${criticasGeral} (${Math.round(pctCrit)}%)</strong></div>
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--warning);"></span>Atenção</span><strong>${atencaoGeral} (${Math.round(pctAtn)}%)</strong></div>
                        <div class="painel-donut-legenda-item"><span><span class="painel-donut-legenda-dot" style="background:var(--text-accent);"></span>Não vistas</span><strong>${naoVistasGeral}</strong></div>
                    </div>
                </div>
            `;
        }
    }

    const rapidos = document.getElementById('notificacoes-filtros-rapidos');
    if (rapidos && !restritoAPropriaArea) {
        rapidos.innerHTML = `
            <button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('criticas')"><i class="fas fa-triangle-exclamation" style="color:var(--danger);"></i> Apenas críticas <i class="fas fa-chevron-right"></i></button>
            <button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('nao-vistas')"><i class="fas fa-bell" style="color:var(--text-accent);"></i> Apenas não vistas <i class="fas fa-chevron-right"></i></button>
        `;
    } else if (rapidos) {
        rapidos.innerHTML = `<button class="notif-filtro-rapido" onclick="window.filtrarFeedNotificacoesFlat('nao-vistas')"><i class="fas fa-bell" style="color:var(--text-accent);"></i> Apenas não vistas <i class="fas fa-chevron-right"></i></button>`;
    }

    // Filtro de aba + busca (área, referência, descrição).
    if (NOTIF_FLAT_FILTRO === 'criticas') itens = itens.filter(x => x.sev.label === 'Crítico');
    else if (NOTIF_FLAT_FILTRO === 'atencao') itens = itens.filter(x => x.sev.label === 'Atenção');
    else if (NOTIF_FLAT_FILTRO === 'nao-vistas') itens = itens.filter(x => !x.item.lida);

    if (NOTIF_FLAT_BUSCA) {
        itens = itens.filter(({ item }) => {
            const alvo = `${window.nomeAreaOficina(item.area) || ''} ${item.referencia || ''} ${item.descricao || ''}`.toLowerCase();
            return alvo.includes(NOTIF_FLAT_BUSCA);
        });
    }

    if (NOTIF_FLAT_ORDEM === 'nao-lidas') {
        itens.sort((a, b) => (a.item.lida === b.item.lida) ? 0 : (a.item.lida ? 1 : -1));
    } else if (NOTIF_FLAT_ORDEM === 'severidade') {
        const ORDEM = { 'Crítico': 0, 'Atenção': 1, 'Novo': 2, 'Normal': 3 };
        itens.sort((a, b) => ORDEM[a.sev.label] - ORDEM[b.sev.label]);
    }
    // 'recentes' é a ordem que o feed já vem do backend (mais novo primeiro).

    if (itens.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;"><i class="fas fa-magnifying-glass"></i> Nenhuma notificação encontrada com esse filtro/busca.</div>`;
        return;
    }

    container.innerHTML = itens.map(({ item, sev }) => {
        const referencia = item.referencia;
        return `
        <div class="notificacoes-item" style="--item-cor:${sev.cor}; ${!item.lida ? 'background:color-mix(in srgb, var(--text-accent) 5%, var(--bg-card));' : ''}"
             onclick="window.abrirItemNotificacao('${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}', '${escapeAtributoNotif(referencia)}', '${escapeAtributoNotif(item.area)}', ${item.atividade_id != null ? Number(item.atividade_id) : 'null'}, '${escapeAtributoNotif(item.tipo_evento || 'status')}')">
            <span class="notificacoes-item-dot ${!item.lida ? 'nao-lida' : ''}" title="${!item.lida ? 'Não vista' : 'Vista'}"></span>
            <div class="notificacoes-item-icone" style="color:${sev.cor}; background:color-mix(in srgb, ${sev.cor} 15%, transparent);">${ICONE_POR_TIPO_NOTIFICACAO[item.tipo] || '📋'}</div>
            <div class="notificacoes-item-corpo">
                <div class="notificacoes-item-topo">
                    <span class="font-code" style="font-weight:700; color:var(--text-heading);">${escapeHtmlNotif(referencia) || '-'}</span>
                    <span class="notif-linha-status" style="color:${sev.cor}; background:color-mix(in srgb, ${sev.cor} 15%, transparent);">${sev.emoji} ${sev.label}</span>
                </div>
                <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(item.descricao))}</div>
                <div class="notif-item-meta">
                    ${item.area ? `<span>Área: ${escapeHtmlNotif(window.nomeAreaOficina(item.area))}</span>` : ''}
                    <span>${escapeHtmlNotif(item.data_hora)}</span>
                </div>
            </div>
            ${!item.lida ? `
            <button type="button" class="notificacoes-item-marcar-lida" title="Marcar como vista"
                    onclick="window.marcarNotificacaoLidaRapido(event, '${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}')">
                <i class="fas fa-check"></i>
            </button>
            ` : ''}
        </div>
        `;
    }).join('');
}

// 🆕 Grade única com TODAS as áreas (oficina + administrativo + estoque
// de Rolos/Hidráulica) — mesmo modelo de navegação da Central de Áreas.
// Cada card mostra status (quando é área de reparo, com atividades) e
// quantas notificações tem (total/não lidas); clicar abre o detalhe só
// daquela área (ver abrirDetalheAreaNotificacao). Substitui a antiga
// lista "Atividade Recente" com tudo misturado.
// 🗑️ NÃO É MAIS CHAMADA (ver renderizarNotificacoesFlat acima) — os ids
// de elemento que ela procura não existem mais no HTML, então fica
// inerte. Mantida sem remover pra não perder a lógica de agrupamento
// por área caso precise voltar a esse modelo.
function renderizarGradeNotificacoes(atividades, feed) {
    const container = document.getElementById('notificacoes-grade-container');
    if (!container) return;

    // `null` = a busca no servidor falhou (ver carregarCentralNotificacoes)
    // — bem diferente de "busquei certinho e não tem nenhuma área crítica".
    // Mostrar isso como erro em vez de "tudo certo" evita o susto de achar
    // que perdeu dado que nunca chegou a sumir de verdade. Vale tanto pra
    // atividades quanto pro feed (🐛 CORREÇÃO: feed === null nunca foi
    // tratado aqui — um feed que falhou renderizava normal com 0
    // notificação em toda área, escondendo justamente o que a pessoa
    // mais precisava ver numa instabilidade do servidor).
    if (atividades === null || feed === null) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0; color:var(--warning);">⚠️ Não foi possível verificar as áreas agora (falha ao consultar o servidor). Toque em "Atualizar" pra tentar de novo.</div>`;
        const resumoErro = document.getElementById('notificacoes-resumo');
        if (resumoErro) resumoErro.innerHTML = '';
        return;
    }

    const contagemPorArea = new Map(); // chave (ou '__sem_area__') -> {total, naoLidas, ultimoTs}
    for (const item of feed) {
        const chave = item.area || '__sem_area__';
        if (!contagemPorArea.has(chave)) contagemPorArea.set(chave, { total: 0, naoLidas: 0, ultimoTs: 0 });
        const c = contagemPorArea.get(chave);
        c.total++;
        if (!item.lida) c.naoLidas++;
        // 🆕 Guarda o horário da notificação mais recente da área — é isso
        // que decide a ordem agora (chegou novidade, sobe na lista), não
        // mais uma categoria fixa de severidade.
        const ts = item.data_hora ? new Date(item.data_hora.replace(' ', 'T')).getTime() : 0;
        if (ts > c.ultimoTs) c.ultimoTs = ts;
    }

    // 🆕 Técnico comum só vê a própria área — ADM/Supervisor continuam
    // vendo a Oficina inteira, sem mudança nenhuma pra eles.
    const restritoAPropriaArea = operadorTecnicoComArea();
    const titulo = document.getElementById('notificacoes-grade-titulo');
    const toolbar = document.getElementById('notificacoes-grade-toolbar');
    if (titulo) titulo.innerHTML = restritoAPropriaArea
        ? '<i class="fas fa-bell"></i> Minhas Notificações'
        : '<i class="fas fa-industry"></i> Áreas';
    if (toolbar) toolbar.classList.toggle('hidden', restritoAPropriaArea);

    const todasAreas = restritoAPropriaArea
        ? [...AREAS_OFICINA, ...window.AREAS_NOTIFICACAO_EXTRAS].filter(a => a.chave === OPERADOR_LOGADO.area)
        : [
            ...AREAS_OFICINA.filter(a => a.tipo === 'oficina' || a.tipo === 'administrativo'),
            ...window.AREAS_NOTIFICACAO_EXTRAS,
        ];

    const PESO_STATUS = { 'Crítico': 0, 'Restrição': 1, 'Atenção': 2, 'Novo': 3, 'Normal': 4, 'Sem novidade': 5 };

    const cards = todasAreas.map(a => {
        // 🐛 CORREÇÃO: sem excluir "ainda não começou" aqui, uma atividade
        // com data de início futura contava como Pendente/em aberto no
        // card (podendo acender Atenção/Restrição), mas o detalhe (ver
        // renderizarDetalheAreaNotificacao) já excluía ela de propósito
        // — reproduzindo o mesmo bug já corrigido antes (card avisa,
        // detalhe abre vazio), só que pra esse caso específico.
        // 🆕 Item 5: conta também atividades PEDIDAS por essa área mesmo
        // sendo executadas por outra (solicitante_area) — senão o card
        // de quem pediu nunca acendia "Atenção"/"Novo" pra algo que só
        // aparece pra ele no quadro (ver renderizarAtividadesArea).
        const doArea = atividades.filter(x => (x.area === a.chave || x.solicitante_area === a.chave) && !atividadeAindaNaoComecou(x));
        const pendentes = doArea.filter(x => x.status === 'Pendente').length;
        const andamento = doArea.filter(x => x.status === 'Em Andamento').length;
        const atrasadas = doArea.filter(x => atividadeEstaAtrasada(x)).length;
        const emAberto = pendentes + andamento;
        const contagem = contagemPorArea.get(a.chave) || { total: 0, naoLidas: 0, ultimoTs: 0 };

        let status;
        if (atrasadas > 0) status = { emoji: '🔴', label: 'Crítico', cor: 'var(--danger)' };
        else if (emAberto >= 5) status = { emoji: '🟠', label: 'Restrição', cor: 'var(--limit)' };
        else if (emAberto >= 1) status = { emoji: '🟡', label: 'Atenção', cor: 'var(--warning)' };
        else if (contagem.naoLidas > 0) status = { emoji: '🔵', label: 'Novo', cor: 'var(--text-accent)' };
        else status = { emoji: '🟢', label: 'Normal', cor: 'var(--success)' };

        return { area: a, status, contagem };
    });

    // "Outros" — item sem área nenhuma (achado, ou ocorrência/OS sem a
    // área escolhida no formulário). Só entra na grade se tiver alguma
    // notificação; sempre por último. Técnico restrito à própria área
    // não vê isso — "Outros" é ruído de fora da área dele.
    const semArea = !restritoAPropriaArea && contagemPorArea.get('__sem_area__');
    if (semArea && semArea.total > 0) {
        cards.push({
            area: { chave: '__sem_area__', nome: 'Outros', icone: 'fa-ellipsis', cor: '#8a97ab' },
            status: semArea.naoLidas > 0 ? { emoji: '🔵', label: 'Novo', cor: 'var(--text-accent)' } : { emoji: '⚪', label: 'Sem novidade', cor: 'var(--text-muted)' },
            contagem: semArea,
        });
    }

    // 🆕 Ordem por atividade recente, não por categoria fixa: quem tem
    // notificação não lida vem primeiro (mais não lidas primeiro), e
    // dentro disso quem recebeu algo mais recentemente. Sem novidade
    // nenhuma, cai pro final na ordem que já tinha (cadastro das áreas).
    cards.sort((x, y) => {
        const naoLidasDiff = y.contagem.naoLidas - x.contagem.naoLidas;
        if (naoLidasDiff !== 0) return naoLidasDiff;
        return (y.contagem.ultimoTs || 0) - (x.contagem.ultimoTs || 0);
    });

    // 🆕 Resumo sempre reflete TODAS as áreas (mesmo com busca/filtro
    // ativos na grade) — senão o gerente filtra "Crítico" pra focar e o
    // resumo no topo muda de número junto, o que confunde mais do que
    // ajuda.
    atualizarResumoNotificacoes(cards);

    let visiveis = cards;
    if (NOTIF_GRADE_BUSCA) visiveis = visiveis.filter(({ area: a }) => a.nome.toLowerCase().includes(NOTIF_GRADE_BUSCA));
    if (NOTIF_GRADE_FILTRO_STATUS) visiveis = visiveis.filter(({ status: s }) => s.label === NOTIF_GRADE_FILTRO_STATUS);

    if (visiveis.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;"><i class="fas fa-magnifying-glass"></i> Nenhuma área encontrada com esse filtro/busca.</div>`;
        return;
    }

    // 🆕 Lista única ordenada por novidade (sem seção fixa de Crítico/
    // Restrição/Atenção) — chegou notificação, a área sobe. O status
    // continua visível, só que como etiqueta discreta na linha, não como
    // divisor que reordena tudo de novo.
    // 🔧 CORREÇÃO ("muito simples", print real): o quadrado do ícone era
    // cinza apagado (var(--text-muted), 14px) sobre um fundo quase
    // idêntico ao card — na prática ilegível/invisível numa tela real,
    // por isso toda a lista parecia "vazia"/genérica. Cada área já tem
    // sua PRÓPRIA cor cadastrada (a.cor, usada em Central de Áreas) que
    // não estava sendo aproveitada aqui — virou o fundo/ícone do chip,
    // igual ao padrão de ícone colorido já usado nos KPIs. Isso NÃO é a
    // mesma coisa que "cor de identidade fixa por item" (a regra que
    // proíbe amarelo repetido): aqui são cores DIFERENTES por área
    // (várias cores, não uma só reaproveitada em todo item), só pra dar
    // variedade visual de lista — a gravidade real continua exclusivamente
    // na etiqueta de status (s.cor), sem mudar.
    const linhasHtml = visiveis.map(({ area: a, status: s, contagem }) => `
        <div class="notif-linha" style="--sev-color:${s.cor};" onclick="window.abrirDetalheAreaNotificacao('${a.chave}')">
            <div class="notif-linha-icone" style="background:color-mix(in srgb, ${a.cor || 'var(--text-muted)'} 18%, transparent); color:${a.cor || 'var(--text-muted)'};"><i class="fas ${a.icone}"></i></div>
            <div class="notif-linha-corpo">
                <div class="notif-linha-titulo">
                    ${a.nome}
                    ${contagem.naoLidas > 0 ? `<span class="notif-ponto-novo" title="Tem novidade não vista"></span>` : ''}
                    <span class="notif-linha-status" style="color:${s.cor};">${s.emoji} ${s.label}</span>
                </div>
                <div class="notif-linha-meta">
                    <i class="fas fa-bell"></i> ${contagem.total} notificaç${contagem.total === 1 ? 'ão' : 'ões'}
                    ${contagem.naoLidas > 0 ? `<span class="notif-nao-lidas">${contagem.naoLidas} não lida${contagem.naoLidas > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <i class="fas fa-chevron-right notif-linha-seta"></i>
        </div>
    `).join('');

    container.innerHTML = `<div class="notif-lista">${linhasHtml}</div>`;
}

window.buscarGradeNotificacoes = function(valor) {
    NOTIF_GRADE_BUSCA = (valor || '').toLowerCase().trim();
    renderizarGradeNotificacoes(NOTIF_ULTIMO_FETCH_FALHOU ? null : NOTIF_ATIVIDADES_CACHE, NOTIF_FEED_CACHE);
};

window.filtrarGradeNotificacoes = function(statusLabel, botao) {
    NOTIF_GRADE_FILTRO_STATUS = statusLabel;
    document.querySelectorAll('#notificacoes-grade-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botao) botao.classList.add('active');
    renderizarGradeNotificacoes(NOTIF_ULTIMO_FETCH_FALHOU ? null : NOTIF_ATIVIDADES_CACHE, NOTIF_FEED_CACHE);
};

// Resumo no topo — visão de supervisor/ADM sem contar card por card:
// quantas áreas em cada status, e total de notificações não vistas (por
// qualquer matrícula ADM, já que a marcação é pessoal). Sempre calculado
// com TODOS os cards, mesmo com busca/filtro ativos na grade.
function atualizarResumoNotificacoes(cards) {
    const resumoEl = document.getElementById('notificacoes-resumo');
    if (!resumoEl) return;
    const porStatus = { 'Crítico': 0, 'Restrição': 0, 'Atenção': 0 };
    let naoLidasTotal = 0;
    for (const { status: s, contagem } of cards) {
        if (s.label in porStatus) porStatus[s.label]++;
        naoLidasTotal += contagem.naoLidas;
    }
    const pill = (emoji, label, valor, cor) => valor > 0
        ? `<span style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; background:${cor}22; color:${cor}; font-size:12px; font-weight:600;">${emoji} ${valor} ${label}</span>`
        : '';
    resumoEl.innerHTML = [
        pill('🔴', porStatus['Crítico'] === 1 ? 'área crítica' : 'áreas críticas', porStatus['Crítico'], 'var(--danger)'),
        pill('🟠', 'em restrição', porStatus['Restrição'], 'var(--limit)'),
        pill('🟡', 'em atenção', porStatus['Atenção'], 'var(--warning)'),
        pill('🔵', naoLidasTotal === 1 ? 'notificação não vista' : 'notificações não vistas', naoLidasTotal, 'var(--text-accent)'),
    ].join('') || `<span class="text-muted" style="font-size:12px;">🟢 Tudo normal — nenhuma área precisa de atenção agora.</span>`;
}

// Abre o "detalhe" de uma área — some com a grade, mostra só as
// notificações dessa área (mesmo padrão de abrirAreaOficina/
// fecharAreaOficina já usado na Central de Áreas de verdade).
window.abrirDetalheAreaNotificacao = function(chave) {
    NOTIF_AREA_SELECIONADA = chave;
    document.getElementById('notificacoes-grade-painel')?.classList.add('hidden');
    document.getElementById('notificacoes-detalhe-painel')?.classList.remove('hidden');
    const a = AREAS_OFICINA.find(x => x.chave === chave) || window.AREAS_NOTIFICACAO_EXTRAS.find(x => x.chave === chave);
    const titulo = document.getElementById('notificacoes-detalhe-titulo');
    if (titulo) titulo.innerHTML = `<i class="fas ${a ? a.icone : 'fa-ellipsis'}"></i> ${chave === '__sem_area__' ? 'Outros' : (a ? a.nome : chave)}`;
    document.getElementById('notificacoes-detalhe-acessar')?.classList.toggle('hidden', chave === '__sem_area__');
    renderizarDetalheAreaNotificacao(chave);
};

window.fecharDetalheAreaNotificacao = function() {
    NOTIF_AREA_SELECIONADA = null;
    document.getElementById('notificacoes-detalhe-painel')?.classList.add('hidden');
    document.getElementById('notificacoes-grade-painel')?.classList.remove('hidden');
};

// Botão "Acessar Área" do detalhe — leva pra tela de verdade daquela
// área (Central de Áreas, painel administrativo, ou o estoque de
// Rolos/Hidráulica), não só pras notificações dela. Sem parâmetro de
// propósito: lê NOTIF_AREA_SELECIONADA direto (variável de módulo, não
// dá pra referenciar num onclick inline do HTML).
window.irParaTelaDaAreaNotificacao = function() {
    const chave = NOTIF_AREA_SELECIONADA;
    if (!chave || chave === '__sem_area__') return;
    const a = AREAS_OFICINA.find(x => x.chave === chave);
    // 🔧 CORREÇÃO ("já aceitei, já atualizou e não mudou nada" — o
    // "Acessar Área" continuava mandando pro painel resumo mesmo
    // depois da PR #136, porque aquela correção só tinha mexido no
    // clique direto numa notificação, não nesse botão aqui, que é um
    // caminho SEPARADO até a mesma área). Mesmo motivo da #136: o
    // painel resumo (abaDestino) não tem Iniciar/Recusar/Concluir —
    // só o quadro (irParaAreaOficinaViaNotificacao) tem. "Acessar
    // Área" agora manda pro quadro pra área administrativa também,
    // igual já fazia pra área de oficina normal logo abaixo.
    if ((a && a.tipo === 'administrativo') || (a && a.tipo === 'oficina')) {
        window.irParaAreaOficinaViaNotificacao(chave);
        return;
    }
    if (chave === 'rolos') {
        window.abrirAba(null, 'aba-rolos');
        document.getElementById('nav-rolos')?.classList.add('active');
        return;
    }
    if (chave === 'hidraulica-estoque') {
        window.abrirAba(null, 'aba-hidraulica');
        document.getElementById('nav-hidraulica')?.classList.add('active');
        return;
    }
    if (chave === 'qualidade') {
        window.abrirAba(null, 'aba-qualidade');
        document.getElementById('nav-qualidade')?.classList.add('active');
        return;
    }
    if (chave === 'sinotico-3d') {
        // Sinótico 3D é uma página própria (não uma aba interna) — abre
        // em nova guia, igual ao link da sidebar.
        window.open('Sinotico3d.html', '_blank');
    }
};

// Ícone por tipo de item do feed unificado — tipo='evento' cobre tanto
// Ocorrência (categoria Intervenção/Melhoria/...) quanto Auditoria geral
// (ex: rolo travado no Sinótico 3D), que antes nunca aparecia aqui.
const ICONE_POR_TIPO_NOTIFICACAO = { os: '📄', achado: '🔍', evento: '📋', estoque: '📦', sinotico: '🧊', atividade: '🧰', mensagem_area: '💬', padrao_qualidade: '🚨' };

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

// 🆕 Destino de UMA notificação de Atividade da Oficina — extraído pra
// função própria porque agora tem DOIS chamadores: o clique dentro da
// Central (abrirItemNotificacao, abaixo) e o clique numa notificação
// PUSH do sistema operacional (ver notificationclick em
// service-worker.js -> mensagem 'abrir-destino-atividade' tratada em
// processarParametrosNotificacaoPush). Mesma regra dos dois: só
// 'mensagem' abre a Conversa; 'status'/'criacao'/'edicao' abre a
// Atividade destacada no quadro da área.
window.abrirDestinoAtividadeNotificacao = function(area, atividadeId, tipoEvento) {
    if (tipoEvento === 'mensagem' && atividadeId && typeof window.abrirConversaAtividade === 'function') {
        window.abrirConversaAtividade(atividadeId);
    } else if (atividadeId) {
        window.irParaAreaOficinaViaNotificacao(area, atividadeId);
    } else {
        window.irParaAreaOficinaViaNotificacao(area);
    }
};

// Clique num item do feed: marca como lido PRA ESSA MATRÍCULA (não
// afeta o que outras pessoas já viram) e leva pra tela de onde aquilo
// veio — cada tipo tem sua própria rota.
window.abrirItemNotificacao = async function(tipo, eventoId, referencia, area, atividadeId, tipoEvento) {
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

    // 🐛 CORREÇÃO: pros tipos abaixo que navegam pra FORA da Central
    // (os/evento/achado/sinotico/estoque), carregarCentralNotificacoes()
    // nunca era chamado de novo — então o sino da barra lateral só
    // refletia essa leitura no próximo tick do timer de 2 min. Dispara
    // sem esperar (a navegação não deve travar por isso).
    if (typeof window.atualizarBadgeNotificacoesNaoLidas === 'function') window.atualizarBadgeNotificacoesNaoLidas();

    if (tipo === 'os') {
        window.irParaOsEspecifica(referencia);
    } else if (tipo === 'evento') {
        window.irParaOcorrenciaEspecifica(referencia);
    } else if (tipo === 'atividade') {
        // 🆕 Ação numa atividade da Oficina (criar/status/editar/
        // excluir/mensagem). Desde a PR #57 TODA notificação de
        // atividade abria a "Conversa da Atividade" — mas quem clica
        // num "iniciou"/"concluiu"/"criou"/"editou" quer VER a
        // atividade (status, prazo, responsável), não abrir um chat
        // vazio. Só notificação de MENSAGEM de verdade deve abrir a
        // Conversa; o resto abre a Atividade em si.
        // 🆕 Não existe uma tela de "detalhe da atividade" separada do
        // quadro da área (só o card dentro da lista) — criar uma view
        // nova só pra isso seria over-engineering pra este ajuste.
        // Decisão: pra 'status'/'criacao'/'edicao' vai pro quadro da
        // área (irParaAreaOficinaViaNotificacao) e usa
        // destacarAtividadeNoQuadro pra rolar até o card certo e
        // piscar ele — o técnico chega direto na atividade em questão,
        // sem abrir um chat.
        window.abrirDestinoAtividadeNotificacao(area, atividadeId, tipoEvento);
    } else if (tipo === 'mensagem_area') {
        // 🆕 Mensagem do chat Área <-> ADM (ver mensagens_area_adm no
        // backend) — antes só virava push e sumia se a pessoa não visse
        // na hora; agora clicar aqui abre a conversa de verdade. ADM abre
        // direto a conversa daquela área (sem precisar estar na aba
        // Painel ADM); técnico é levado pro próprio quadro da área e a
        // conversa abre por cima.
        const éAdm = OPERADOR_LOGADO && OPERADOR_LOGADO.isAdm;
        if (éAdm && typeof window.abrirChatAdmArea === 'function') {
            window.abrirChatAdmArea(area);
        } else if (typeof window.abrirAreaOficina === 'function') {
            window.abrirAreaOficina(area).then(() => {
                if (typeof window.abrirChatAreaAdm === 'function') window.abrirChatAreaAdm();
            });
        }
    } else if (tipo === 'achado') {
        window.irParaAchadoEspecifico(referencia);
    } else if (tipo === 'padrao_qualidade') {
        // 🆕 Padrão detectado entre achados (mesma categoria em vários
        // equipamentos diferentes) — não é um achado específico, é o
        // painel de padrões no topo da aba Qualidade que mostra isso.
        window.abrirAba(null, 'aba-qualidade');
        document.getElementById('nav-qualidade')?.classList.add('active');
        setTimeout(() => {
            document.getElementById('qualidade-padroes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    } else if (tipo === 'sinotico') {
        window.open('Sinotico3d.html', '_blank');
    } else if (tipo === 'estoque') {
        // referencia é "ESTOQUE-ROLOS" ou "ESTOQUE-HIDRAULICA".
        if (referencia === 'ESTOQUE-ROLOS') {
            window.abrirAba(null, 'aba-rolos');
            document.getElementById('nav-rolos')?.classList.add('active');
        } else {
            window.abrirAba(null, 'aba-hidraulica');
            document.getElementById('nav-hidraulica')?.classList.add('active');
        }
    } else {
        window.carregarCentralNotificacoes();
    }
};

// 🆕 PUSH -> ROTEAMENTO: quando a notificação chega como PUSH de
// verdade do sistema operacional (fora do app, barra de notificações
// do celular) e o usuário TOCA nela, quem trata o clique é o Service
// Worker (notificationclick em service-worker.js) — ele roda num
// contexto separado e não enxerga essas funções direto. Em vez de
// duplicar a lógica de "pra onde vai", o SW só repassa os dados
// (tipo_evento/atividade_id/area, que agora vêm no payload do push —
// ver dados_extra no backend) e a gente reaproveita o MESMO destino já
// usado pelo clique dentro da Central (abrirDestinoAtividadeNotificacao,
// acima). Dois jeitos do SW entregar isso, tratados aqui:
//   - Janela NOVA (app fechado): o SW abre a URL com querystring
//     (?abrir_atividade=ID&area=X&tipo_evento=Y) — lida no
//     DOMContentLoaded abaixo.
//   - Janela JÁ ABERTA: o SW usa postMessage (focar não recarrega a
//     página, então não dava pra usar querystring) — ouvido logo abaixo.
function processarDestinoNotificacaoPush(dados) {
    if (!dados) return;
    const atividadeId = dados.atividade_id != null && dados.atividade_id !== '' ? Number(dados.atividade_id) : null;
    const area = dados.area || null;
    const tipoEvento = dados.tipo_evento || 'status';
    if (!atividadeId && !area) return;
    // Espera o app estar logado e com a tela principal pronta antes de
    // navegar — se o toque na notificação abriu o app do zero, o login
    // e o carregamento inicial ainda podem estar em andamento.
    const tentar = (restantes) => {
        if (OPERADOR_LOGADO && typeof window.abrirDestinoAtividadeNotificacao === 'function' && typeof window.abrirAba === 'function') {
            window.abrirDestinoAtividadeNotificacao(area, atividadeId, tipoEvento);
        } else if (restantes > 0) {
            setTimeout(() => tentar(restantes - 1), 300);
        }
        // Sem OPERADOR_LOGADO depois de ~6s: usuário provavelmente caiu
        // na tela de login — não dá pra rotear sem ele decidir entrar,
        // desiste silenciosamente (a notificação continua na Central).
    };
    tentar(20);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const idConversa = params.get('abrir_conversa_atividade');
        const idAtividade = params.get('abrir_atividade');
        if (idConversa || idAtividade) {
            processarDestinoNotificacaoPush({
                atividade_id: idConversa || idAtividade,
                area: params.get('area'),
                tipo_evento: idConversa ? 'mensagem' : (params.get('tipo_evento') || 'status')
            });
            // Limpa a querystring pra um refresh depois não reabrir a
            // mesma atividade de novo sozinho.
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
    } catch (e) {
        console.warn('⚠️ Erro ao processar parâmetros de notificação push:', e);
    }
});

if (window.navigator && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.tipo === 'abrir-destino-atividade') {
            processarDestinoNotificacaoPush(event.data);
        }
    });
}

// 🆕 Marca de uma vez todas as notificações não lidas da área aberta —
// só pra essa matrícula (a marcação sempre foi individual, ver
// /api/notificacoes/marcar_lido). Não mexe nas atividades em aberto
// (aquilo se resolve na área de verdade, não aqui).
window.marcarTodasLidasDaArea = async function() {
    const chave = NOTIF_AREA_SELECIONADA;
    if (!chave || !OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;

    const naoLidas = NOTIF_FEED_CACHE.filter(item =>
        (chave === '__sem_area__' ? !item.area : item.area === chave) && !item.lida
    );
    if (naoLidas.length === 0) return;

    const botao = document.getElementById('notificacoes-detalhe-marcar-todas');
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marcando...'; }

    try {
        const apiBase = await resolverApiBase();
        await Promise.all(naoLidas.map(item => fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: item.tipo, evento_id: String(item.evento_id), matricula: OPERADOR_LOGADO.matricula })
        })));
    } catch (e) {
        console.error('⚠️ Erro ao marcar todas como lidas:', e);
    } finally {
        if (botao) { botao.disabled = false; botao.innerHTML = '<i class="fas fa-check-double"></i> Marcar todas como lidas'; }
        window.carregarCentralNotificacoes();
    }
};

// 🆕 Proposta A (Central de Notificações — "está horrível"): antes só
// dava pra marcar como lida abrindo o item (que também navega pra
// fora da Central) ou marcando TODAS de uma área de uma vez. Essa aqui
// marca só UM item, sem sair da lista — o botão fica dentro da linha,
// visível só quando a notificação está não lida (ver renderItemNotificacao).
// event.stopPropagation() é essencial: a linha inteira (.notificacoes-item)
// já tem onclick pra abrir/navegar — sem isso, clicar no botão também
// dispararia a navegação por cima.
window.marcarNotificacaoLidaRapido = async function(event, tipo, eventoId) {
    event.stopPropagation();
    if (!OPERADOR_LOGADO || !OPERADOR_LOGADO.matricula) return;

    const botao = event.currentTarget;
    if (botao) { botao.disabled = true; botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/notificacoes/marcar_lido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, evento_id: String(eventoId), matricula: OPERADOR_LOGADO.matricula })
        });
    } catch (e) {
        console.error('⚠️ Erro ao marcar notificação como lida:', e);
    } finally {
        window.carregarCentralNotificacoes();
    }
};

// 🆕 Detalhe de UMA área — chamado ao clicar num card da grade (ou de
// novo pelo polling, se a pessoa já estiver dentro do detalhe). Não
// agrupa mais por área (já é uma área só aqui); a separação por área
// agora é a própria navegação da grade -> detalhe.
function renderizarDetalheAreaNotificacao(chave) {
    const container = document.getElementById('notificacoes-feed-container');
    const contagemEl = document.getElementById('notificacoes-contagem-nao-lidas');
    if (!container) return;

    const itensArea = NOTIF_FEED_CACHE.filter(item => chave === '__sem_area__' ? !item.area : item.area === chave);
    const naoLidas = itensArea.filter(item => !item.lida).length;
    if (contagemEl) contagemEl.innerText = naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'tudo em dia ✅';
    document.getElementById('notificacoes-detalhe-marcar-todas')?.classList.toggle('hidden', naoLidas === 0);

    const visiveis = itensArea
        .filter(item => !item.lida || dataDentroDaJanelaRecente(item.data_hora))
        .slice(0, MAX_ITENS_NOTIFICACOES);

    // 🔧 Atividades em aberto da área (Pendente/Em Andamento) — é o que
    // realmente define o status do card na grade (Crítico/Restrição/
    // Atenção), então precisam aparecer aqui, senão o detalhe fica vazio
    // mesmo quando o card avisou que tinha algo pra ver.
    const atividadesAreaTodas = NOTIF_ATIVIDADES_CACHE
        .filter(x => (x.area === chave || x.solicitante_area === chave) && x.status !== 'Concluído' && x.status !== 'Recusado' && !atividadeAindaNaoComecou(x));
    // 🐛 CORREÇÃO: o cabeçalho mostrava o tamanho da lista já cortada em
    // MAX_ITENS_NOTIFICACOES, então uma área com, digamos, 15 atividades
    // em aberto anunciava "(10)" — a pessoa lia um número errado antes
    // de rolar a lista.
    const atividadesArea = atividadesAreaTodas.slice(0, MAX_ITENS_NOTIFICACOES);

    if (visiveis.length === 0 && atividadesArea.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">✅ Nada de novo nessa área nos últimos ${DIAS_RECENCIA_NOTIFICACOES} dias.</div>`;
        return;
    }

    const blocoAtividades = atividadesArea.length === 0 ? '' : `
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin:2px 0 8px;">
            <i class="fas fa-clipboard-list"></i> Atividades em aberto (${atividadesAreaTodas.length})
        </div>
        ${atividadesArea.map(x => renderItemAtividadeNotificacao(x, chave)).join('')}
        ${visiveis.length > 0 ? `<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); margin:16px 0 8px;"><i class="fas fa-bell"></i> Notificações</div>` : ''}
    `;

    container.innerHTML = blocoAtividades + visiveis.map(renderItemNotificacao).join('');
}

// 🐛 CORREÇÃO: descrição/autor/responsável/referência são texto livre
// (o operador digita), mas iam direto pro innerHTML sem escapar — um
// simples "<" ou aspas na descrição de uma Ocorrência/OS quebrava o
// cartão (ou pior, injetava HTML). escapeHtmlNotif() é pro texto
// exibido; escapeAtributoNotif() é pra valor indo dentro de um
// onclick="...('...')" — sem isso, uma aspas dupla no meio do valor
// fecha o atributo antes da hora.
function escapeHtmlNotif(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
window.escapeHtmlNotif = escapeHtmlNotif;
function escapeAtributoNotif(s) {
    return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
window.escapeAtributoNotif = escapeAtributoNotif;

// 🔧 CORREÇÃO ("descrição da notificação enorme e cortada"): os
// marcadores [REABASTECER_RESERVA:<id>] e [FINALIZAR_INSTALACAO:<id>]
// (ver notificarLogisticaReabastecimento/iniciarSwapAlocacao) são só
// pra linkar a atividade de volta a uma peça quando a Logística
// conclui (ver processarMarcadorAtividadeConcluida) — não deveriam
// aparecer pro usuário, e deixavam a descrição bem mais comprida do
// que precisava. Limpa só na hora de EXIBIR; o texto salvo/usado pro
// parsing continua intacto.
function limparMarcadorTecnicoDescricao(descricao) {
    // 🔧 No feed de notificações o texto vem como "concluiu: [MARCADOR:id]
    // resto..." (backend monta "<ação>: <descrição original>") — o
    // marcador não fica sempre no início da string, por isso sem "^" no
    // regex.
    return (descricao || '').replace(/\[(REABASTECER_RESERVA|FINALIZAR_INSTALACAO|TRANSPORTE):[^\]]*\]\s*/, '');
}
window.limparMarcadorTecnicoDescricao = limparMarcadorTecnicoDescricao;

// Mesmo cartão visual do feed, mas pra uma atividade em aberto (não tem
// tipo/evento_id/lida — vem de /api/oficina/atividades, não do feed
// unificado). Clicar leva direto pra área de verdade, onde dá pra ver
// e agir na atividade (a Central de Notificações não edita atividade).
function renderItemAtividadeNotificacao(x, chave) {
    const atrasada = atividadeEstaAtrasada(x);
    const cor = atrasada ? 'var(--danger)' : (x.status === 'Em Andamento' ? 'var(--text-accent)' : 'var(--warning)');
    return `
    <div class="notificacoes-item" style="--item-cor:${cor};" onclick="window.irParaAreaOficinaViaNotificacao('${escapeAtributoNotif(chave)}')">
        <div class="notificacoes-item-icone" style="color:${cor};">${atrasada ? '⏰' : '🔧'}</div>
        <div class="notificacoes-item-corpo">
            <div class="notificacoes-item-topo">
                <span class="font-code" style="font-weight:700; color:var(--text-heading);">
                    ${escapeHtmlNotif(x.equipamento_id) || '-'}
                </span>
                <span style="font-size:10.5px; color:${cor};">${atrasada ? 'Atrasada' : x.status}</span>
            </div>
            <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(x.descricao))}</div>
            <div style="font-size:10.5px; color:var(--text-accent);">${escapeHtmlNotif(x.responsavel) || 'Sem responsável'}</div>
        </div>
    </div>
    `;
}

function renderItemNotificacao(item) {
    const naoLida = !item.lida;
    const icone = ICONE_POR_TIPO_NOTIFICACAO[item.tipo] || '📋';
    const cor = naoLida ? 'var(--danger)' : 'var(--border-color)';
    const referencia = item.referencia;
    // 🆕 Proposta A (Central de Notificações): o ponto de "não lida" era
    // um "●" pequeno solto no meio do texto, fácil de não notar numa
    // lista comprida — virou um indicador dedicado (.notificacoes-item-dot),
    // com o mesmo tamanho sempre (lida ou não), só a cor/preenchimento
    // muda, pra não pular o layout da linha. E o botão de marcar como
    // lida direto na linha evita ter que abrir cada item (que também
    // navega pra fora da Central) só pra limpar o "não lida".
    return `
    <div class="notificacoes-item" style="--item-cor:${cor}; ${naoLida ? 'background:color-mix(in srgb, var(--danger) 6%, var(--bg-card));' : ''}"
         onclick="window.abrirItemNotificacao('${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}', '${escapeAtributoNotif(referencia)}', '${escapeAtributoNotif(item.area)}', ${item.atividade_id != null ? Number(item.atividade_id) : 'null'}, '${escapeAtributoNotif(item.tipo_evento || 'status')}')">
        <span class="notificacoes-item-dot ${naoLida ? 'nao-lida' : ''}" title="${naoLida ? 'Não lida' : 'Lida'}"></span>
        <div class="notificacoes-item-icone" style="${naoLida ? 'color:var(--danger);' : ''}">${icone}</div>
        <div class="notificacoes-item-corpo">
            <div class="notificacoes-item-topo">
                <span class="font-code" style="font-weight:700; color:var(--text-heading);">
                    ${escapeHtmlNotif(item.referencia) || '-'}
                </span>
                <span style="font-size:10.5px; color:var(--text-muted);">${escapeHtmlNotif(item.data_hora)}</span>
            </div>
            <div class="notificacoes-item-linha">${escapeHtmlNotif(limparMarcadorTecnicoDescricao(item.descricao))}</div>
            <div style="font-size:10.5px; color:var(--text-accent);">${escapeHtmlNotif(item.autor) || 'Sistema'}</div>
        </div>
        ${naoLida ? `
        <button type="button" class="notificacoes-item-marcar-lida" title="Marcar como lida"
                onclick="window.marcarNotificacaoLidaRapido(event, '${escapeAtributoNotif(item.tipo)}', '${escapeAtributoNotif(item.evento_id)}')">
            <i class="fas fa-check"></i>
        </button>
        ` : ''}
    </div>
    `;
}

// (Qualidade — Entrada/Saída — agora vive em Oficina/qualidade.js)

