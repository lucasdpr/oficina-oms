// ==========================================================================
// UTILITÁRIOS COMPARTILHADOS — extraído de script.js na modularização
// ==========================================================================
// Funções sem tela própria, chamadas de várias áreas diferentes: execução
// seguros de callbacks, fetch com retry/cache offline, push notification,
// cálculo de dias/ordem/desgaste, fila de ações offline e pequenos
// helpers de UI (toast de desfazer, animação de número).

import { resolverApiBase } from './banco.js?v=5';
import { OPERADOR_LOGADO } from './estado.js';
import { AREAS_OFICINA } from './dados.js';

// ==========================================
// 🔧 CORREÇÃO ("depois do login a tela fica em branco, só o cabeçalho
// aparece"): finalizarLogin() e entrarComoVisitante() chamam várias
// funções de renderização em sequência. Se qualquer uma lançar um
// erro, o JavaScript parava ali mesmo e tudo que vinha depois na fila
// nunca rodava — inclusive a função que desenha o Painel Geral.
// executarSeguro() isola cada chamada: se uma falhar, registra o erro
// no console e deixa as próximas rodarem normalmente.
// ==========================================
export function executarSeguro(fn, nomeParaLog) {
    try {
        return fn();
    } catch (e) {
        console.error(`⚠️ Falha ao executar "${nomeParaLog}" (o resto da tela continua carregando):`, e);
        return undefined;
    }
}
export async function executarSeguroAsync(fn, nomeParaLog) {
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

// 🆕 Headers pras rotas ADMIN (mudar cargo, resetar senha, ativar/
// desativar colaborador, desfazer apontamento) — agora exigem um token
// de sessão de verdade no servidor (ver app_core.py/exigir_admin no
// backend). Sem OPERADOR_LOGADO.token (ex.: acesso local de dev, ou
// sessão antiga salva antes desta mudança), a chamada vai sem
// Authorization e o servidor recusa com 401 — como deve ser.
export function headersAdmin() {
    const headers = { "Content-Type": "application/json" };
    if (OPERADOR_LOGADO && OPERADOR_LOGADO.token) headers["Authorization"] = `Bearer ${OPERADOR_LOGADO.token}`;
    return headers;
}

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
export function filtrarPorAreaTecnico(lista) {
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

// ==========================================
// FUNÇÃO AUXILIAR - ORDEM PADRÃO
// ==========================================
// 🆕 Oscilador/Mesa Osciladora medem vida útil em DIAS, não toneladas —
// mas reaproveitam o mesmo campo "ton"/"meta" que todo o resto do
// sistema já usa pro cálculo de % de desgaste (ton/meta), pra não
// precisar duplicar essa conta em todo lugar que ela aparece hoje. Só o
// RÓTULO precisa mudar pra não fingir que é tonelagem — usado nos
// cartões de Ativos Críticos e do Painel de Sequenciamento de Veio.
export function rotuloDesgaste(tipo) {
    return (tipo === "Oscilador" || tipo === "Mesa Osciladora") ? "Vida (dias)" : "Ton";
}

export function getOrdemPadrao(tipo) {
    if (tipo === "Molde") return 10;
    // 🆕 Oscilador/Mesa Osciladora: mesmos números provisórios usados em
    // banco.js (getOrdemPadrao) — ver comentário lá.
    if (tipo === "Mesa Osciladora") return 15;
    if (tipo === "Segmento Zero") return 30;
    if (tipo === "Grupo 1") return 31;
    if (tipo === "Grupo 2") return 32;
    if (tipo === "Grupo 3") return 33;
    if (tipo === "Oscilador") return 35;
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
export const calcularDias = window.calcularDias;

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
// 🆕 Aviso visual de "Conectando ao servidor..." (pedido do usuário
// depois de confirmarmos que os erros de CORS no console eram, na
// real, o backend gratuito do Render "dormindo" por inatividade —
// ver RESUMO-NOTURNO/discussão da sessão: sem upgrade de plano por
// enquanto, então a solução é só não assustar com erro cru). Conta
// quantas chamadas estão "na segunda tentativa em diante" ao mesmo
// tempo — várias abas/seções costumam disparar fetch juntas, então um
// contador evita o aviso pisca-pisca (aparece/some) toda hora.
let _fetchRetryAtivos = 0;
function mostrarAvisoConectandoServidor() {
    _fetchRetryAtivos++;
    const el = document.getElementById('aviso-conectando-servidor');
    if (el) el.classList.remove('hidden');
}
function esconderAvisoConectandoServidor() {
    _fetchRetryAtivos = Math.max(0, _fetchRetryAtivos - 1);
    if (_fetchRetryAtivos === 0) {
        const el = document.getElementById('aviso-conectando-servidor');
        if (el) el.classList.add('hidden');
    }
}

// ==========================================
// 🆕 MODO LEITURA OFFLINE ("Nível A" — pedido do usuário: mostrar o
// último dado conhecido em vez de tela quebrada quando cai a conexão.
// NÃO é offline de escrita — lançar OS/atividade continua exigindo
// internet; isso só evita tela em branco/erro cru em telas de leitura).
// Guarda a última resposta OK de cada GET no localStorage; se um GET
// falhar de vez (sem internet mesmo depois do retry), devolve o último
// dado salvo em vez de propagar o erro, e acende um aviso fixo
// avisando que o dado pode estar desatualizado.
// ==========================================
const OFFLINE_CACHE_PREFIXO = 'oms_offline_cache::';
const OFFLINE_CACHE_TAMANHO_MAX = 400_000; // não guarda respostas gigantes (ex: fotos em base64)

function offlineCacheSalvar(url, texto) {
    try {
        if (texto.length > OFFLINE_CACHE_TAMANHO_MAX) return;
        localStorage.setItem(OFFLINE_CACHE_PREFIXO + url, JSON.stringify({ ts: Date.now(), body: texto }));
    } catch (e) { /* localStorage cheio ou indisponível — só não guarda, não é crítico */ }
}

function offlineCacheLer(url) {
    try {
        const bruto = localStorage.getItem(OFFLINE_CACHE_PREFIXO + url);
        if (!bruto) return null;
        return JSON.parse(bruto);
    } catch (e) { return null; }
}

let _offlineCacheAtivosContador = 0;
function mostrarAvisoModoOfflineCache(ts) {
    _offlineCacheAtivosContador++;
    const el = document.getElementById('aviso-modo-offline-cache');
    if (!el) return;
    el.classList.remove('hidden');
    const spanHora = document.getElementById('aviso-modo-offline-cache-hora');
    if (spanHora && ts) spanHora.textContent = new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
// 🔧 Sem contador de "esconder": ao contrário do aviso de "conectando",
// esse fica ligado até a PRÓXIMA navegação/atualização bem-sucedida —
// não some sozinho, porque enquanto não recarregar a tela o dado
// exibido continua sendo o velho.
window.esconderAvisoModoOfflineCache = function() {
    _offlineCacheAtivosContador = 0;
    const el = document.getElementById('aviso-modo-offline-cache');
    if (el) el.classList.add('hidden');
};

export async function fetchComRetry(url, opcoes = {}, tentativas = 4, esperaMs = 4000, timeoutMs = 30000) {
    const metodo = (opcoes.method || 'GET').toUpperCase();
    const podeUsarCacheOffline = metodo === 'GET';

    let ultimaResposta = null;
    let avisoAtivo = false;
    let erroFinal = null;
    try {
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
                    if (!avisoAtivo) { avisoAtivo = true; mostrarAvisoConectandoServidor(); }
                    await new Promise(resolve => setTimeout(resolve, esperaMs));
                    continue;
                }
                if (podeUsarCacheOffline && resp.ok) {
                    resp.clone().text().then(texto => offlineCacheSalvar(url, texto)).catch(() => {});
                    if (typeof window.esconderAvisoModoOfflineCache === 'function') window.esconderAvisoModoOfflineCache();
                }
                return resp;
            } catch (e) {
                clearTimeout(timer);
                erroFinal = e;
                if (i === tentativas) break; // acabaram as tentativas — tenta cache offline antes de desistir
                console.warn(`⚠️ Falha/timeout de conexão (tentativa ${i + 1}/${tentativas + 1}). Tentando de novo em ${esperaMs / 1000}s...`);
                if (!avisoAtivo) { avisoAtivo = true; mostrarAvisoConectandoServidor(); }
                await new Promise(resolve => setTimeout(resolve, esperaMs));
            }
        }
    } finally {
        if (avisoAtivo) esconderAvisoConectandoServidor();
    }

    if (erroFinal) {
        if (podeUsarCacheOffline) {
            const cache = offlineCacheLer(url);
            if (cache) {
                console.warn(`📦 Sem conexão — servindo dado em cache (${url}), salvo às ${new Date(cache.ts).toLocaleTimeString('pt-BR')}.`);
                mostrarAvisoModoOfflineCache(cache.ts);
                return new Response(cache.body, { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }
        throw erroFinal; // sem cache pra recorrer — comportamento antigo, propaga o erro
    }
    return ultimaResposta;
}
window.fetchComRetry = (...args) => fetchComRetry(...args);

// ==========================================
// ANIMAÇÃO DE CONTAGEM NOS NÚMEROS DOS KPIs
// ==========================================
export function animarNumero(elId, valorFinal, duracaoMs = 650) {
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
export async function enviarComFilaOffline(url, options, descricao) {
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
window.enviarComFilaOffline = (...args) => enviarComFilaOffline(...args);

// 🔧 CORREÇÃO CRÍTICA (achado de auditoria de Go-Live, confirmado por
// duas revisões independentes): esta função é chamada por 3 gatilhos
// diferentes (evento 'online', setInterval de 30s, clique manual no
// indicador) SEM nenhuma trava — se um item demorar mais que 30s pra
// responder (ex: OS com fotos grandes em rede ruim), o timer seguinte
// pode disparar uma segunda execução concorrente que vê o MESMO item
// ainda na fila e reenvia — e como OS/Ocorrência/Qualidade/Atividade
// NÃO são upsert (diferente de Folhão/Checklist), isso duplica o
// registro de verdade no banco. `_reenviandoFilaOffline` garante que só
// uma execução roda por vez.
let _reenviandoFilaOffline = false;

window.tentarReenviarFilaOffline = async function() {
    if (_reenviandoFilaOffline) return;
    _reenviandoFilaOffline = true;
    try {
        let fila = lerFilaOffline();
        if (fila.length === 0) return;

        const restantes = [];
        let algumEnviado = false;

        for (const item of fila) {
            try {
                const resp = await fetch(item.url, item.options);
                if (resp.ok) {
                    algumEnviado = true;
                } else if (resp.status === 401) {
                    // 🔧 CORREÇÃO: sessão expirada (token de 12h) não
                    // significa "servidor recusou os dados" — antes isso
                    // caía no mesmo caminho de descarte silencioso de
                    // qualquer outro erro, perdendo o registro pra
                    // sempre assim que o token vencesse. Mantém na fila
                    // pra tentar de novo depois de um novo login.
                    console.warn('⚠️ Sessão expirada — mantendo na fila até novo login:', item.descricao);
                    restantes.push(item);
                } else {
                    // Servidor respondeu e recusou por outro motivo (ex:
                    // validação, algo mudou nesse meio tempo) — não
                    // adianta insistir sozinho, descarta pra não travar
                    // o resto da fila esperando pra sempre.
                    console.warn('⚠️ Ação da fila offline foi recusada pelo servidor:', item.descricao);
                }
            } catch (e) {
                // Ainda sem internet — mantém na fila pra tentar de novo.
                restantes.push(item);
            }
        }

        salvarFilaOffline(restantes);

        if (algumEnviado) {
            if (typeof window.carregarListaOrdensServico === 'function') window.carregarListaOrdensServico();
            if (typeof window.carregarListaQualidade === 'function') window.carregarListaQualidade();
            if (typeof window.carregarOficina === 'function') window.carregarOficina();
        }
    } finally {
        _reenviandoFilaOffline = false;
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
export function mostrarToastDesfazer(mensagem, aoConfirmar, aoDesfazer) {
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

// 🆕 Usadas por Central de Áreas, Área da Oficina e Painel do Supervisor
// pra saber se uma atividade está atrasada (prazo passou) ou ainda não
// começou (tem Data de Início cadastrada e ela é futura).
export function atividadeEstaAtrasada(x) {
    if (x.status === 'Concluído' || !x.prazo) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.prazo < hoje;
}

export function atividadeAindaNaoComecou(x) {
    if (!x.data_inicio) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return x.data_inicio > hoje;
}
