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

const CACHE_VERSION = "oms-v34";

// Arquivos baixados e guardados assim que o app é instalado.
// (não inclui chamadas de API - essas nunca ficam em cache)
const ARQUIVOS_PARA_CACHE = [
    "./",
    "./index.html",
    "./app.html",
    "./style.css",
    "./script.js",
    "./ui.js",
    "./banco.js",
    "./dados.js",
    "./procedimentosOficina.js",
    "./dadosMateriaisSegmentoGrupo.js",
    "./folhaoMolde4.js",
    "./folhaoMolde23.js",
    "./folhaoR2.js",
    "./folhaoSegmentoGrupo.js",
    "./folhaoSegmentoZero.js",
    "./folhaoStraightenerR1.js",
    "./folhao_bender.js",
    "./folhaoBow.js",
    "./folhaoDesempenadeira.js",
    "./folhaoHorizontal.js",
    "./folhaoPersistencia.js",
    "./Sinotico3d.html",
    "./manifest.json",
    "./icon-192.png?v=2",
    "./icon-512.png?v=2"
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

    event.respondWith(
        fetch(event.request, { cache: "no-store" })
            .then((resposta) => {
                // Atualiza o cache com a versão mais nova sempre que
                // conseguir buscar na rede.
                const copia = resposta.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                    cache.put(event.request, copia);
                });
                return resposta;
            })
            .catch(() => {
                // Sem internet: usa o que tiver salvo em cache.
                // 🔧 CORREÇÃO: os módulos JS são importados no app.html com
                // "?v=13" etc (ex: script.js?v=13), mas o precache do install
                // guarda a URL "pelada" (./script.js, sem query). Sem
                // ignoreSearch, essas duas URLs contam como chaves de cache
                // DIFERENTES — o fallback offline não encontrava o arquivo
                // certo na primeira vez que o app abria sem internet (só
                // "curava" sozinho depois de pelo menos 1 visita online, que
                // é quando o handler acima salva a URL com query de verdade).
                // ignoreSearch faz o match ignorar a query string, então o
                // arquivo pré-cacheado já serve de primeira, mesmo offline.
                return caches.match(event.request, { ignoreSearch: true });
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
            icon: "./icon-192.png?v=2",
            badge: "./icon-192.png?v=2",
            data: { url: dados.url || "/" },
            vibrate: [200, 100, 200],
            tag: "oms-notificacao" // notificações novas substituem a anterior na tela
        })
    );
});

// --------------------------------------------------------------
// CLIQUE NA NOTIFICAÇÃO: abre o app (ou foca a aba já aberta) na
// tela correspondente.
// --------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
            for (const janela of janelas) {
                if (janela.url.includes(self.location.origin) && "focus" in janela) {
                    return janela.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});