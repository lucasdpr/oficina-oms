// ==============================================================
// ADICIONAR AO script.js — Inscrição de Push Notification
// ==============================================================
// Onde colar: junto das outras funções globais (ex: perto de
// window.calcularDias). Depois, chame ativarPushNotification()
// em algum botão/tela de configurações, OU automaticamente depois
// do login bem-sucedido (recomendado).
// ==============================================================

// Troque pela SUA VAPID_PUBLIC_KEY gerada no backend (a mesma que
// você configurou como variável de ambiente no Render).
// Essa aqui é só um EXEMPLO — não vai funcionar até você trocar.
const VAPID_PUBLIC_KEY = "BKY36hQFqVrbfz1jSB2FhQs58OV6JNMHnug1V3mwhZMK-urLU0y5E_6dNoRZv8J89EalEAn4ItgqBT_pmiAMuF8";

// Converte a chave pública (base64 urlsafe) pro formato que a API
// de Push do navegador exige (Uint8Array).
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// --------------------------------------------------------------
// Pede permissão de notificação ao usuário e registra a inscrição
// no backend, vinculada à matrícula logada.
// --------------------------------------------------------------
window.ativarPushNotification = async function () {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("⚠️ Este navegador não suporta push notification.");
        return false;
    }

    const permissao = await Notification.requestPermission();
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

// --------------------------------------------------------------
// SUGESTÃO: chame isso automaticamente depois de um login com
// sucesso (ache a função de login no seu script.js e adicione a
// chamada logo depois de "OPERADOR_LOGADO" ser definido).
// Exemplo:
//
//   OPERADOR_LOGADO = { matricula, nome, cargo };
//   localStorage.setItem("oms_operador_v32_local", JSON.stringify(OPERADOR_LOGADO));
//   window.ativarPushNotification();   // <-- adicionar esta linha
//
// Assim o técnico só precisa aceitar a permissão do navegador uma
// vez, no primeiro login, e já fica inscrito pra sempre (até
// desinstalar o app ou negar a permissão).
// --------------------------------------------------------------
