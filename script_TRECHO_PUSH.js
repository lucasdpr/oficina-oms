// ==============================================================
// ONDE COLAR: logo depois desta linha, que já existe no seu script.js:
//
//     } from './banco.js?v=5';
//
// (é a linha que fecha o segundo bloco de import, logo no topo do
// arquivo). Cole o bloco abaixo IMEDIATAMENTE depois dela.
// ==============================================================

// Troque pela SUA VAPID_PUBLIC_KEY (a mesma que você configurou no
// Render). É a chave PÚBLICA — pode ficar exposta no front sem problema.
const VAPID_PUBLIC_KEY = "BKY36hQFqVrbfz1jSB2FhQs58OV6JNMHnug1V3mwhZMK-urLU0y5E_6dNoRZv8J89EalEAn4ItgqBT_pmiAMuF8";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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


// ==============================================================
// SEGUNDA EDIÇÃO NECESSÁRIA: dentro da função finalizarLogin(),
// no seu script.js, ache este trecho (já existe):
//
//     if (typeof registrarHistorico === 'function') registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
//
// E adicione logo depois dele, dentro da mesma função:
//
//     window.ativarPushNotification();
//
// Assim o técnico é convidado a permitir notificações automaticamente
// assim que loga com sucesso (só pede permissão de verdade uma vez —
// nas próximas vezes o navegador já lembra a resposta).
// ==============================================================
