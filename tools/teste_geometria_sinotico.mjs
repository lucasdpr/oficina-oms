// 🆕 Teste automatizado da geometria do Sinótico 3D — item #5 da lista
// de melhorias pedida numa sessão inteira corrigindo bug de posição/
// etiqueta "à mão, uma vez detectado no print". Isso varre TODOS os
// veios das 3 MCCs e confere invariantes básicas que, se quebradas,
// eram exatamente os bugs que apareceram nesta sessão — pra pegar
// antes de virar PR, não depois.
//
// Não é um teste unitário puro (calcularTransformacoesMCC23/4 vivem
// dentro do <script type="module"> do próprio Sinotico3d.html, não dá
// pra importar isolado sem reestruturar o arquivo) — é um teste de
// integração leve, reaproveitando a mesma infra de
// tools/screenshot_sinotico.mjs (Chromium headless + o hook
// window.__sinoticoDebug).
//
// REQUISITO: mesmo de tools/screenshot_sinotico.mjs — precisa do
// pacote "playwright" (já instalado globalmente neste ambiente).
//
// USO:
//   1. Sirva a pasta do repo: python3 -m http.server 8791
//   2. node tools/teste_geometria_sinotico.mjs [urlBase]
//      (urlBase default: http://localhost:8791)
//
// Sai com código 0 se tudo passar, 1 se algum veio falhar qualquer
// checagem — dá pra plugar num CI (o CI atual, .github/workflows/lint.yml,
// só faz "node --check" — não sobe servidor nem browser, então este
// teste NÃO está plugado nele automaticamente; rodar à mão por enquanto).

import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');

const urlBase = process.argv[2] || 'http://localhost:8791';

// Distância mínima 3D entre duas etiquetas — mesmo threshold de
// resolverColisaoEtiquetas() no próprio Sinotico3d.html. Se esse teste
// falhar aqui, a rede de segurança do próprio app já devia ter
// resolvido — então é bug de verdade, não só "achado visual".
const DIST_MINIMA_ETIQUETA = 0.18;

// Nenhuma peça deveria acabar exatamente em cima da outra (mesmo X/Y/Z,
// ou perto disso) — foi exatamente o bug de Molde/Mesa/Zero antes de
// virarem uma coluna com folga de verdade entre eles.
const DIST_MINIMA_PECA = 0.05;

const MCCS = [
    { mcc: '2', veios: ['C', 'D'] },
    { mcc: '3', veios: ['E', 'F'] },
    { mcc: '4', veios: ['G', 'H'] },
];

function par(lista) {
    const pares = [];
    for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) pares.push([lista[i], lista[j]]);
    }
    return pares;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let falhas = [];
let veiosTestados = 0;

try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.route('**/api/pecas*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    for (const { mcc, veios } of MCCS) {
        for (const veio of veios) {
            await page.goto(`${urlBase}/Sinotico3d.html`, { waitUntil: 'networkidle' });
            await page.click(`.card-mcc[data-mcc="${mcc}"]`);
            await page.waitForTimeout(400);
            const veioAtivo = await page.$eval('.veio-tab.active[data-veio]', el => el.dataset.veio).catch(() => null);
            if (veioAtivo && veioAtivo.toUpperCase() !== veio.toUpperCase()) {
                await page.click(`.veio-tab[data-veio="${veio.toUpperCase()}"]`);
                await page.waitForTimeout(400);
            }
            veiosTestados++;

            const resultado = await page.evaluate(({ DIST_MINIMA_ETIQUETA, DIST_MINIMA_PECA }) => {
                const dbg = window.__sinoticoDebug;
                const slots = dbg.slots;
                const labels = dbg.labelObjects.filter(o => o.isSprite);

                const problemas = [];

                // 1) Nenhuma peça em cima da outra (exclui cadeiras — são
                // MUITAS e propositalmente próximas em fila, não é o
                // invariante que importa ali).
                const relevantes = slots.filter(s => s.grupo !== 'sup' && s.grupo !== 'inf');
                for (let i = 0; i < relevantes.length; i++) {
                    for (let j = i + 1; j < relevantes.length; j++) {
                        const a = relevantes[i], b = relevantes[j];
                        const d = a.pos.distanceTo(b.pos);
                        if (d < DIST_MINIMA_PECA) {
                            problemas.push(`Peça '${a.label}' e '${b.label}' quase no mesmo ponto (dist ${d.toFixed(4)})`);
                        }
                    }
                }

                // 2) Nenhuma etiqueta sobrepondo outra (a própria
                // resolverColisaoEtiquetas() do app já deveria garantir
                // isso — este teste confirma que ela realmente rodou).
                for (let i = 0; i < labels.length; i++) {
                    for (let j = i + 1; j < labels.length; j++) {
                        const a = labels[i], b = labels[j];
                        const d = a.position.distanceTo(b.position);
                        if (d < DIST_MINIMA_ETIQUETA) {
                            problemas.push(`Etiqueta '${a.userData.label}' e '${b.userData.label}' coladas (dist ${d.toFixed(4)})`);
                        }
                    }
                }

                return { problemas, nPecas: slots.length, nLabels: labels.length };
            }, { DIST_MINIMA_ETIQUETA, DIST_MINIMA_PECA });

            const prefixo = `MCC${mcc} / Veio ${veio}`;
            if (resultado.problemas.length > 0) {
                falhas.push({ veio: prefixo, problemas: resultado.problemas });
                console.log(`❌ ${prefixo} — ${resultado.problemas.length} problema(s):`);
                resultado.problemas.forEach(p => console.log(`   - ${p}`));
            } else {
                console.log(`✅ ${prefixo} — ok (${resultado.nPecas} peças, ${resultado.nLabels} etiquetas)`);
            }
        }
    }
} finally {
    await browser.close();
}

console.log(`\n${veiosTestados} veio(s) testados, ${falhas.length} com problema.`);
process.exit(falhas.length > 0 ? 1 : 0);
