// 🆕 Checa a sintaxe do JS que vive DENTRO de tags <script> nos .html
// — achado numa revisão de segurança/qualidade: o CI (.github/workflows/lint.yml)
// só rodava `node --check` em arquivos *.js. Toda a lógica do
// Sinotico3d.html (~4500 linhas de JS dentro de <script type="module">)
// e boa parte de app.html/index.html ficava fora — nenhum dos vários
// erros de sintaxe cometidos (e corrigidos à mão, com node --check
// manual num arquivo temp) numa sessão inteira mexendo no Sinótico
// teria sido pego por esse CI.
//
// Extrai cada <script> inline (sem "src", senão é biblioteca externa,
// não é nosso código) de cada .html do repo e valida a sintaxe com
// `node --check` — mesmo processo que foi feito manualmente a sessão
// inteira, automatizado.
//
// USO: node tools/checar_sintaxe_html.mjs [arquivo1.html arquivo2.html ...]
// Sem argumentos, varre todo *.html do repo (via git ls-files).
// Sai com código 1 se algum bloco tiver erro de sintaxe.

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function listarHtmlDoGit() {
    const saida = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' });
    return saida.split('\n').filter(Boolean);
}

// Casa <script ...> ... </script> — captura os atributos da tag de
// abertura (pra saber se tem "src" ou "type=module") e o conteúdo.
const REGEX_SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

function extrairBlocos(html) {
    const blocos = [];
    let m;
    REGEX_SCRIPT.lastIndex = 0;
    while ((m = REGEX_SCRIPT.exec(html))) {
        const atributos = m[1];
        const conteudo = m[2];
        if (/\bsrc\s*=/.test(atributos)) continue; // biblioteca externa, não é nosso código
        if (/type\s*=\s*["']?(importmap|application\/json)["']?/i.test(atributos)) continue; // não é JS
        if (!conteudo.trim()) continue;
        const ehModulo = /type\s*=\s*["']?module["']?/i.test(atributos);
        blocos.push({ conteudo, ehModulo });
    }
    return blocos;
}

const arquivos = process.argv.length > 2 ? process.argv.slice(2) : listarHtmlDoGit();
const dirTemp = mkdtempSync(join(tmpdir(), 'checar-sintaxe-html-'));
let erros = 0;
let blocosChecados = 0;

for (const arquivo of arquivos) {
    const html = readFileSync(arquivo, 'utf8');
    const blocos = extrairBlocos(html);
    blocos.forEach((bloco, idx) => {
        blocosChecados++;
        const extensao = bloco.ehModulo ? 'mjs' : 'cjs';
        const caminhoTemp = join(dirTemp, `bloco_${idx}.${extensao}`);
        writeFileSync(caminhoTemp, bloco.conteudo);
        try {
            execFileSync('node', ['--check', caminhoTemp], { stdio: 'pipe' });
        } catch (e) {
            erros++;
            console.error(`❌ ${arquivo} — bloco <script> #${idx + 1}${bloco.ehModulo ? ' (module)' : ''}:`);
            console.error(e.stderr.toString());
        } finally {
            unlinkSync(caminhoTemp);
        }
    });
}

console.log(`\n${blocosChecados} bloco(s) <script> inline checado(s) em ${arquivos.length} arquivo(s), ${erros} com erro.`);
process.exit(erros > 0 ? 1 : 0);
