// 🆕 Ferramenta de verificação visual do Sinótico 3D — nasceu de uma
// sessão inteira ajustando posição de peça (Molde/Mesa/Zero) "às cegas":
// eu mudava a posição, mandava pro usuário, ele mandava print, eu via
// o erro, ajustava de novo — 6+ rodadas só pra 3 peças. Isso automatiza
// a parte que eu SEMPRE consigo fazer sozinho: abrir a página de
// verdade num Chromium headless, montar a cena e tirar um screenshot —
// sem precisar do usuário como "olho" do processo a cada iteração.
//
// REQUISITO: precisa do pacote "playwright" (mesmo requisito de
// tools/gerar_mapeamento.mjs — já instalado globalmente neste ambiente
// de execução; em outro ambiente: npm install playwright && npx
// playwright install chromium).
//
// USO:
//   1. Sirva a pasta do repo num servidor local (o Sinótico usa ES
//      modules, então não funciona abrindo o .html direto como file://):
//        python3 -m http.server 8791
//   2. node tools/screenshot_sinotico.mjs <urlBase> <mcc> <veio> <saida.png> [--zoom=x,y,z] [--target=x,y,z]
//
// Ex (estado padrão, câmera de enquadramento geral):
//   node tools/screenshot_sinotico.mjs http://localhost:8791 2 C /tmp/veio-c.png
//
// Ex (zoom numa peça específica, tipo conferir o cluster Molde/Mesa/Zero
// de perto — position/target em unidades do mundo 3D, ache o valor
// certo olhando slot.pos no devtools ou testando):
//   node tools/screenshot_sinotico.mjs http://localhost:8791 2 C /tmp/molde-mesa.png --zoom=9,6,2 --target=9,5,0
//
// Sem dado da API (backend fora do ar/sem acesso): a cena monta do
// mesmo jeito, só que com todas as peças na cor cinza "vaga" — dá pra
// conferir posição/rotação/geometria/etiqueta perfeitamente, só não o
// código de cor por desgaste real.

// import direto ('playwright') falha se o pacote só existir na
// node_modules global (fora da árvore deste projeto, que não tem
// package.json/node_modules — ver tools/gerar_mapeamento.mjs, mesmo
// requisito) — resolução ESM não olha NODE_PATH, mas createRequire
// (CJS) olha. Funciona local (node_modules do projeto) e global.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');

const [, , urlBase, mcc, veio, saida, ...resto] = process.argv;

if (!urlBase || !mcc || !veio || !saida) {
    console.error('Uso: node tools/screenshot_sinotico.mjs <urlBase> <mcc: 2|3|4> <veio: C|D|E|F|G|H> <saida.png> [--zoom=x,y,z] [--target=x,y,z]');
    process.exit(1);
}

function parseVec3(flag) {
    const arg = resto.find(a => a.startsWith(`--${flag}=`));
    if (!arg) return null;
    const [x, y, z] = arg.split('=')[1].split(',').map(Number);
    return { x, y, z };
}

const zoom = parseVec3('zoom');
const target = parseVec3('target');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    const erros = [];
    page.on('pageerror', e => erros.push(`pageerror: ${e.message}`));
    page.on('console', msg => { if (msg.type() === 'error') erros.push(`console.error: ${msg.text()}`); });

    await page.goto(`${urlBase}/Sinotico3d.html`, { waitUntil: 'networkidle' });

    // Escolhe a MCC (tela inicial) — mesmo clique que a pessoa faria.
    await page.click(`.card-mcc[data-mcc="${mcc}"]`);

    // Troca de veio, se não for o primeiro da MCC (entrarNaMcc já entra
    // no primeiro veio da lista automaticamente).
    const veioAtivo = await page.$eval('.veio-tab.active[data-veio]', el => el.dataset.veio).catch(() => null);
    if (veioAtivo && veioAtivo.toUpperCase() !== veio.toUpperCase()) {
        await page.click(`.veio-tab[data-veio="${veio.toUpperCase()}"]`);
    }

    // Dá um tempo pro construirCena() + eventual animação de voo de
    // câmera (voarCameraPara, ~900ms) assentarem antes do print.
    await page.waitForTimeout(1200);

    if (zoom) {
        // camera/controls/scene são escopo de módulo, não globais — usa
        // o hook window.__sinoticoDebug exposto no fim do Sinotico3d.html.
        await page.evaluate(({ zoom, target }) => {
            const { camera, controls, scene, renderer } = window.__sinoticoDebug;
            camera.position.set(zoom.x, zoom.y, zoom.z);
            if (target) controls.target.set(target.x, target.y, target.z);
            controls.update();
            renderer.render(scene, camera);
        }, { zoom, target });
        await page.waitForTimeout(150);
    }

    await page.screenshot({ path: saida });

    if (erros.length) {
        console.error(`⚠️ ${erros.length} erro(s) de JS durante o carregamento:`);
        erros.forEach(e => console.error('  ' + e));
    }
    console.log(`✅ Screenshot salvo em ${saida}`);
} finally {
    await browser.close();
}
