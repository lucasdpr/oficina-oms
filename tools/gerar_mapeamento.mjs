// Gerador automático de mapeamento (folhao_campo) pra ponte
// Checklist de Execução <-> Folhão.
//
// REQUISITO: precisa do pacote "playwright" instalado (não vem com o
// repo). Rode uma vez: npm install playwright && npx playwright install chromium
//
// USO:
//   1. Sirva a pasta do repo num servidor local (o app usa ES modules,
//      então não funciona abrindo o app.html direto como file://):
//        python3 -m http.server 8791
//   2. node tools/gerar_mapeamento.mjs <urlBase> <funcaoAbrir> <tagExemplo> <containerId1> [containerId2...]
//
// Ex:
//   node tools/gerar_mapeamento.mjs http://localhost:8791 abrirFolhaoBow BOW-1-4G bow-diametros-saida
//
// O script abre o app.html de verdade num Chromium headless, chama a
// função de abrir o Folhão indicado (do jeito que o próprio app chama,
// sem precisar clicar em nada), e varre o DOM real dentro de cada
// container pedido — extrai todo <input>/<select>/<textarea> com id
// (mais grupos de <input type="radio"> por `name`, que não têm id),
// e tenta achar um rótulo legível pra cada um (título da seção mais
// próximo, célula da mesma linha da tabela, cabeçalho da coluna).
//
// Saída: JSON { "rótulo automático": "id-ou-name-real-do-campo", ... }
// — pronto pra colar no campo folhao_campo de uma etapa "Medição
// múltipla" (ou conferir/ajustar rótulos antes de colar, se ficar
// estranho). Validado contra o mapeamento feito à mão pro Horizontal
// (Saída): bateu 100% campo a campo, 196/196.
import { chromium } from 'playwright';

const [, , urlBase, funcaoAbrir, tagExemplo, ...containers] = process.argv;

if (!urlBase || !funcaoAbrir || !tagExemplo || containers.length === 0) {
    console.error('USO: node gerar_mapeamento.mjs <urlBase> <funcaoAbrir> <tagExemplo> <containerId1> [containerId2...]');
    process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', e => console.error('⚠️ erro de página (pode ser inofensivo — fetch de API que não existe aqui):', e.message));

await page.goto(`${urlBase}/app.html`, { waitUntil: 'load' });
// Dá tempo dos módulos ES rodarem (init do BANCO_ATIVOS etc.)
await page.waitForTimeout(1500);

const resultado = await page.evaluate(({ funcaoAbrir, tagExemplo, containers }) => {
    if (typeof window[funcaoAbrir] !== 'function') {
        return { erro: `window.${funcaoAbrir} não existe. Funções disponíveis parecidas: ` +
            Object.keys(window).filter(k => k.toLowerCase().includes('abrirfolhao')).join(', ') };
    }
    try {
        window[funcaoAbrir](tagExemplo);
    } catch (e) {
        return { erro: `Erro ao chamar window.${funcaoAbrir}('${tagExemplo}'): ${e.message}` };
    }

    // Rótulo pra um campo: tenta, em ordem — (1) <label> com for=id,
    // (2) texto da célula <td>/<th> mais próxima à esquerda na mesma
    // <tr>, (3) atributo placeholder/title, (4) o próprio id.
    // Muita tabela desse app vem antecedida de um <h3>/<h4> com o nome
    // do grupo (ex: "Cilindro de Elevação") — sem isso, linhas repetidas
    // em tabelas parecidas (Elevação/Clamp/Motriz) geram rótulo igual.
    function tituloDaSecao(el) {
        let node = el.closest('table') || el;
        while (node) {
            let irmao = node.previousElementSibling;
            while (irmao) {
                if (/^H[1-6]$/.test(irmao.tagName) && irmao.textContent.trim()) return irmao.textContent.trim();
                irmao = irmao.previousElementSibling;
            }
            node = node.parentElement;
        }
        return '';
    }

    function rotuloPara(el) {
        if (el.id) {
            const labelFor = document.querySelector(`label[for="${el.id}"]`);
            if (labelFor && labelFor.textContent.trim()) return labelFor.textContent.trim();
        }
        const titulo = tituloDaSecao(el);
        const tr = el.closest('tr');
        if (tr) {
            const cellDoCampo = el.closest('td');
            const celulas = Array.from(tr.children);
            const idxCampo = cellDoCampo ? celulas.indexOf(cellDoCampo) : -1;
            // Cabeçalho da coluna (mesma posição, na <thead> ou 1ª linha da tabela)
            const table = tr.closest('table');
            let cabecalho = '';
            if (table && idxCampo >= 0) {
                const headerRow = table.querySelector('tr');
                if (headerRow && headerRow !== tr) {
                    const th = headerRow.children[idxCampo];
                    if (th) cabecalho = th.textContent.trim();
                }
            }
            // Texto da(s) célula(s) à esquerda do campo, na mesma linha
            // (normalmente é o "nome" da linha: posição, conjunto, etc.)
            const textoLinha = celulas.slice(0, idxCampo >= 0 ? idxCampo : celulas.length)
                .map(td => td.textContent.trim()).filter(Boolean).join(' ');
            const partes = [titulo, textoLinha, cabecalho].filter(Boolean);
            if (partes.length) return partes.join(' - ');
        }
        if (el.placeholder) return [titulo, el.placeholder].filter(Boolean).join(' - ');
        if (el.title) return [titulo, el.title].filter(Boolean).join(' - ');
        return el.id;
    }

    const saida = {};
    const avisos = [];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) {
            avisos.push(`Container #${containerId} não encontrado no DOM (nome errado, ou essa aba não é renderizada por essa função).`);
            return;
        }
        const adicionar = (rotuloBase, valor) => {
            let rotuloFinal = rotuloBase;
            let n = 2;
            while (Object.prototype.hasOwnProperty.call(saida, rotuloFinal) && saida[rotuloFinal] !== valor) {
                rotuloFinal = `${rotuloBase} (${n++})`;
            }
            saida[rotuloFinal] = valor;
        };

        // Campos com id (texto, número, select, checkbox) — cada um vira
        // 1 entrada, chave = id.
        const camposComId = container.querySelectorAll('input[id]:not([type="radio"]), select[id], textarea[id]');
        camposComId.forEach(el => adicionar(rotuloPara(el), el.id));

        // 🆕 Grupos de radio (OK/NOK, SIM/NÃO) — não têm id, só `name`,
        // e várias <input> compartilham o mesmo name (1 grupo). O
        // técnico responde isso no modal de "Medição múltipla" (um
        // select travado, não clicando direto no Folhão), por isso o
        // rótulo ganha o sufixo "(OK/NOK)" — mesma convenção que o
        // Checklist de Execução já usa pra travar a resposta num select.
        const nomesJaVistos = new Set();
        container.querySelectorAll('input[type="radio"][name]').forEach(r => {
            if (nomesJaVistos.has(r.name)) return;
            nomesJaVistos.add(r.name);
            adicionar(`${rotuloPara(r)} (OK/NOK)`, r.name);
        });
    });

    return { mapeamento: saida, avisos, totalCampos: Object.keys(saida).length };
}, { funcaoAbrir, tagExemplo, containers });

await browser.close();

if (resultado.erro) {
    console.error('❌', resultado.erro);
    process.exit(1);
}
if (resultado.avisos && resultado.avisos.length) {
    resultado.avisos.forEach(a => console.error('⚠️', a));
}
console.log(JSON.stringify(resultado.mapeamento, null, 2));
console.error(`\n(total: ${resultado.totalCampos} campos)`);
