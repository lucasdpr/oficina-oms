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

const CACHE_VERSION = "oms-v11";

// Arquivos baixados e guardados assim que o app é instalado.
// (não inclui chamadas de API - essas nunca ficam em cache)
const ARQUIVOS_PARA_CACHE = [
    "./",
    "./index.html",
    "./app.html",
    "./style.css",
    "./script.js",
    "./tema.js",
    "./ui.js",
    "./banco.js",
    "./dados.js",
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
                return caches.match(event.request);
            })
    );
});