// ==============================================================
// service-worker.js
// ==============================================================
// Faz o app poder ser "instalado" (PWA) e guarda uma cópia dos
// arquivos principais no dispositivo, para abrir mais rápido e
// funcionar mesmo com internet ruim.
//
// IMPORTANTE: sempre que você alterar algum arquivo do site (HTML,
// CSS, JS), troque o número da CACHE_VERSION abaixo. Isso força o
// celular/navegador a baixar a versão nova em vez de continuar
// usando a copia antiga guardada em cache.
// ==============================================================

const CACHE_VERSION = "oms-v127";

// 🔧 CORREÇÃO: essa lista estava com os caminhos de uma estrutura de
// pastas antiga (tudo direto na raiz) — o projeto hoje guarda os JS
// dentro de JS/ (e subpastas Core/Oficina/Folhoes/). Toda essa lista
// dava 404 silencioso (cada cache.add() falha é pega individualmente
// lá embaixo, então a instalação nunca quebrava, mas NENHUM desses
// arquivos ficava realmente salvo pra uso offline). Caminhos abaixo
// batem com os <script> reais de app.html/index.html.
//
// Arquivos baixados e guardados assim que o app é instalado.
// (não inclui chamadas de API - essas nunca ficam em cache)
const ARQUIVOS_PARA_CACHE = [
    "./",
    "./index.html",
    "./app.html",
    "./style.css",
    "./JS/script.js",
    "./JS/ui.js",
    "./JS/painelGeralExtra.js",
    "./JS/Core/banco.js",
    "./JS/Core/dados.js",
    "./JS/Core/estado.js",
    "./JS/Core/utils.js",
    "./JS/Core/permissoes.js",
    "./JS/Core/navegacao.js",
    "./JS/Core/auth.js",
    "./JS/Oficina/qualidade.js",
    "./JS/Oficina/ordemServico.js",
    "./JS/Paineis/colaboradores.js",
    "./JS/Paineis/chats.js",
    "./JS/Paineis/painelAdmExecutivo.js",
    "./JS/Paineis/molde3d.js",
    "./JS/Paineis/centralAreas.js",
    "./JS/Oficina/atividades.js",
    "./JS/Paineis/painelAreaAdministrativa.js",
    "./JS/Oficina/apontamento.js",
    "./JS/Paineis/notificacoes.js",
    "./JS/Oficina/painelTecnico.js",
    "./JS/Oficina/folhoesPonte.js",
    "./JS/Oficina/estoque.js",
    "./JS/Oficina/veiosAtivos.js",
    "./JS/Core/checklistFolhaoPonte.js",
    "./JS/Oficina/procedimentosOficina.js",
    "./JS/Oficina/checklist-execucao.js",
    "./JS/Oficina/dadosMateriaisSegmentoGrupo.js",
    "./JS/Folhoes/folhaoMolde4.js",
    "./JS/Folhoes/folhaoMolde23.js",
    "./JS/Folhoes/folhaoR2.js",
    "./JS/Folhoes/folhaoSegmentoGrupo.js",
    "./JS/Folhoes/folhaoSegmentoZero.js",
    "./JS/Folhoes/folhaoStraightenerR1.js",
    "./JS/Folhoes/folhao_bender.js",
    "./JS/Folhoes/folhaoBow.js",
    "./JS/Folhoes/folhaoDesempenadeira.js",
    "./JS/Folhoes/folhaoHorizontal.js",
    "./JS/Folhoes/folhaoPersistencia.js",
    "./JS/Folhoes/checklistQualidadeSaida.js",
    "./Sinotico3d.html",
    "./Molde3d.html",
    // 🆕 Three.js vendorizado (era CDN externo, nunca cacheado — ver
    // comentário no <script type="importmap"> do Sinotico3d.html).
    "./vendor/three/three.module.min.js",
    "./vendor/three/addons/controls/OrbitControls.js",
    "./vendor/three/addons/geometries/RoundedBoxGeometry.js",
    "./vendor/three/addons/utils/BufferGeometryUtils.js",
    "./manifest.json",
    "./JS/assets/icon-192.png?v=4",
    "./JS/assets/icon-512.png?v=4"
];

// --------------------------------------------------------------
// INSTALL: baixa e guarda os arquivos principais
// --------------------------------------------------------------
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            // addAll falha inteiro se 1 arquivo der 404 - por isso cada
            // arquivo é adicionado individualmente, e um erro num
            // arquivo não derruba a instalação dos outros.
            return Promise.all(
                ARQUIVOS_PARA_CACHE.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn("⚠️ Não consegui cachear:", url, err);
                    })
                )
            );
        })
    );
    // 🔧 Força o novo service worker a assumir imediatamente, sem
    // esperar todas as abas antigas fecharem. Combinado com o
    // clients.claim() no activate, isso reduz o atraso entre o deploy
    // e o celular realmente passar a usar a versão nova.
    self.skipWaiting();
});

// --------------------------------------------------------------
// ACTIVATE: apaga caches de versões antigas
// --------------------------------------------------------------
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((nomes) =>
            Promise.all(
                nomes
                    .filter((nome) => nome !== CACHE_VERSION)
                    .map((nome) => caches.delete(nome))
            )
        ).then(() => self.clients.claim())
    );
});

// --------------------------------------------------------------
// FETCH: estratégia de resposta
// - Chamadas de API (/api/...): sempre busca na rede (dados atualizados).
//   Nunca deixa dado desatualizado do banco em cache.
// - Demais arquivos (HTML/CSS/JS/ícones): tenta a rede primeiro; se
//   não conseguir (sem internet), usa a cópia salva em cache.
// --------------------------------------------------------------
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Só cuida de requisições do próprio site (GET). Chamadas de API
    // de outro domínio (ex: api.seusite.onrender.com) e a checagem de
    // servidor local (localhost:8000, feita pelo resolverApiBase() no
    // banco.js) passam direto pro navegador, sem o service worker
    // interceptar nada. 🔧 CORREÇÃO: antes, mesmo essas chamadas de
    // outra origem passavam pelo respondWith() abaixo; quando a
    // checagem de localhost:8000 falhava (o normal, fora do seu PC) e
    // caía no .catch() -> caches.match(), esse cache nunca teria essa
    // URL guardada, e devolver "undefined" pro respondWith() gerava o
    // erro "Failed to convert value to 'Response'" no console — sem
    // quebrar o app de verdade, mas sujando o log e mascarando erros
    // reais. Ignorar tudo que não é do mesmo domínio resolve os dois
    // problemas de uma vez.
    if (url.origin !== self.location.origin) return;
    if (event.request.method !== "GET") return;

    if (url.pathname.startsWith("/api/")) {
        // Nunca cachear API - sempre dado fresco do banco.
        event.respondWith(fetch(event.request));
        return;
    }

    // 🔧 CORREÇÃO (achado de auditoria de performance): antes, TODO
    // arquivo estático (2,2MB de JS/CSS ao todo) era buscado com
    // `{ cache: "no-store" }` — isso ignora completamente o cache HTTP
    // normal do navegador, forçando o RE-DOWNLOAD COMPLETO de tudo a
    // cada abertura do app, mesmo online e mesmo sem nenhum deploy
    // novo. Numa rede de fábrica ruim, isso significava dezenas de
    // segundos de espera todo dia, à toa.
    //
    // Agora é stale-while-revalidate: responde IMEDIATAMENTE com o que
    // já está no cache da versão atual (rápido, sem esperar rede
    // nenhuma), e só then atualiza esse cache em segundo plano com uma
    // busca de rede normal (sem no-store — o navegador pode inclusive
    // usar 304 Not Modified e nem baixar de novo o corpo). Isso é
    // seguro porque a atualização "de verdade" já é garantida por
    // outro mecanismo: um deploy novo troca CACHE_VERSION, o que faz
    // o install() (acima) pré-cachear tudo de novo antes do activate()
    // apagar a versão antiga — o usuário só continua vendo arquivo
    // velho aqui se ninguém tiver incrementado CACHE_VERSION.
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((respostaCache) => {
            const buscaRede = fetch(event.request)
                .then((resposta) => {
                    const copia = resposta.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, copia);
                    });
                    return resposta;
                })
                .catch(() => respostaCache);
            // Tem cache? Devolve na hora e atualiza por trás. Sem cache
            // (primeira visita, arquivo novo): espera a rede mesmo.
            return respostaCache || buscaRede;
        })
    );
});

// --------------------------------------------------------------
// PUSH: recebe a notificação enviada pelo backend e exibe na tela,
// mesmo com o app fechado ou o celular com a tela bloqueada.
// --------------------------------------------------------------
self.addEventListener("push", (event) => {
    let dados = { titulo: "OMS CSN", corpo: "Você tem uma nova atualização.", url: "/" };
    try {
        if (event.data) dados = event.data.json();
    } catch (e) {
        console.warn("⚠️ Push recebido sem JSON válido, usando texto simples:", e);
        if (event.data) dados.corpo = event.data.text();
    }

    event.waitUntil(
        self.registration.showNotification(dados.titulo, {
            body: dados.corpo,
            icon: "./JS/assets/icon-192.png?v=4",
            badge: "./JS/assets/icon-192.png?v=4",
            // 🆕 Guarda o payload INTEIRO (não só `url`) — agora o
            // backend manda tipo_evento/atividade_id/area junto pra
            // eventos de Atividade da Oficina (ver dados_extra em
            // main.py), e o notificationclick abaixo precisa desses
            // campos pra saber pra onde navegar (Conversa da Atividade
            // vs Atividade destacada no quadro — mesmo destino que o
            // clique dentro da Central já usa). Pushes que não são de
            // atividade (mancal, estoque...) só têm `url` mesmo, e
            // continuam funcionando igual.
            data: dados,
            vibrate: [200, 100, 200],
            tag: "oms-notificacao" // notificações novas substituem a anterior na tela
        })
    );
});

// --------------------------------------------------------------
// CLIQUE NA NOTIFICAÇÃO: abre o app (ou foca a aba já aberta) na
// tela correspondente.
//
// 🆕 Quando o payload traz tipo_evento + atividade_id (evento de
// Atividade da Oficina), não basta abrir uma URL genérica — precisa
// levar pro MESMO destino que o clique dentro da Central de
// Notificações já usa (Conversa da Atividade se for mensagem;
// Atividade destacada no quadro da área nos outros casos). Essa
// decisão mora em JS de página (abrirDestinoAtividadeNotificacao, em
// script.js) — o Service Worker não a duplica, só repassa os dados:
//   - Janela já aberta: postMessage (focar não recarrega a página).
//   - Janela nova: abre com querystring própria, lida no
//     DOMContentLoaded de script.js.
// --------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const dados = event.notification.data || {};
    const urlRecebida = dados.url || "/";
    const ehAtividade = dados.atividade_id != null && dados.atividade_id !== "";

    let url;
    if (ehAtividade) {
        const params = new URLSearchParams();
        if (dados.tipo_evento === "mensagem") {
            params.set("abrir_conversa_atividade", dados.atividade_id);
        } else {
            params.set("abrir_atividade", dados.atividade_id);
            params.set("tipo_evento", dados.tipo_evento || "status");
        }
        if (dados.area) params.set("area", dados.area);
        url = `./app.html?${params.toString()}`;
    } else {
        url = urlRecebida;
    }
    // Resolve a URL contra o escopo do service worker (ex.: "/oficina-oms/"),
    // e não contra a raiz do domínio — senão "/" abre https://usuario.github.io/
    // (404), em vez de https://usuario.github.io/oficina-oms/.
    const urlFinal = new URL(url, self.registration.scope).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
            for (const janela of janelas) {
                if (janela.url.includes(self.location.origin) && "focus" in janela) {
                    // 🆕 Janela já aberta: focar não recarrega a página
                    // (a querystring da URL nova não seria lida), então
                    // manda os dados direto pro app tratar via
                    // 'message' (ver script.js).
                    if (ehAtividade && "postMessage" in janela) {
                        janela.postMessage({
                            tipo: "abrir-destino-atividade",
                            atividade_id: dados.atividade_id,
                            area: dados.area || null,
                            tipo_evento: dados.tipo_evento || "status"
                        });
                    }
                    return janela.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(urlFinal);
        })
    );
});