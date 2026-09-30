// Teste de ponta a ponta de TODOS os Folhões, com a API simulada (não toca o banco).
// Pra cada tipo: abre, troca todas as abas, preenche tudo, gera a pré-visualização
// (confere que cada valor digitado e cada caixa marcada sai no documento), salva
// e reabre (confere que o rascunho volta 100%).
// Uso: python3 -m http.server 8765 (na raiz do repo) e depois
//      node tools/testar_folhoes.mjs [filtro]
// Playwright: ajuste o import abaixo se ele estiver em outro lugar.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'fs';

const BASE = 'http://localhost:8765/app.html';
const CASOS = [
  { nome: 'Molde MCC4',        item: { id: 'M4-04',      tipo: 'Molde',            mcc_compat: '4' },   prev: 'previsualizarFolhaoMolde4' },
  { nome: 'Molde MCC2-3',      item: { id: 'M23-01',     tipo: 'Molde',            mcc_compat: '2/3' }, prev: 'previsualizarFolhaoMolde23' },
  { nome: 'Bender',            item: { id: 'BND-01',     tipo: 'Bender',           mcc_compat: '4' },   prev: 'previsualizarFolhaoBender' },
  { nome: 'Bow',               item: { id: 'BOW-01',     tipo: 'Bow',              mcc_compat: '4' },   prev: 'previsualizarFolhaoBow' },
  { nome: 'Horizontal',        item: { id: 'HZ-01',      tipo: 'Horizontal',       mcc_compat: '4' },   prev: 'previsualizarFolhaoHorizontal' },
  { nome: 'Straightener R1',   item: { id: 'STR-1-01',   tipo: 'Straightener',     mcc_compat: '4' },   prev: 'previsualizarFolhaoR1' },
  { nome: 'Straightener R2',   item: { id: 'STR-2-01',   tipo: 'Straightener',     mcc_compat: '4' },   prev: 'previsualizarFolhaoR2' },
  { nome: 'Cadeira Superior',  item: { id: 'CAD-S-01',   tipo: 'Cadeira Superior', mcc_compat: '2/3' }, prev: 'previsualizarFolhaoDesemp' },
  { nome: 'Cadeira Inferior',  item: { id: 'CAD-I-01',   tipo: 'Cadeira Inferior', mcc_compat: '2/3' }, prev: 'previsualizarFolhaoDesemp' },
  { nome: 'Segmento Grupo 1',  item: { id: 'GRP1-1-2C',  tipo: 'Grupo 1',          mcc_compat: '2/3' }, prev: 'previsualizarFolhaoSegGrupo' },
  { nome: 'Segmento Grupo 3',  item: { id: 'GRP3-1-2C',  tipo: 'Segmento Grupo 3', mcc_compat: '2/3' }, prev: 'previsualizarFolhaoSegGrupo' },
  { nome: 'Segmento Zero',     item: { id: 'SZ-01',      tipo: 'Segmento Zero',    mcc_compat: '2/3' }, prev: 'previsualizarFolhaoSegZero' },
];
const filtro = process.argv[2];
const OUT = process.argv[3] || 'fh';

const b = await chromium.launch();
const relatorio = [];

for (const caso of CASOS.filter(c => !filtro || c.nome.toLowerCase().includes(filtro.toLowerCase()))) {
  const erros = [], alertas = [], posts = [];
  const rascunhos = new Map(); // equipamento_id -> {dados, tipo_folhao, etapa}
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/localhost:8000/**', r => r.abort());
  await ctx.route('**api-oms-csn.onrender.com/**', async r => {
    const req = r.request(); const u = new URL(req.url()); const m = req.method();
    const json = (obj, st = 200) => r.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(obj) });
    if (m === 'POST') {
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch {}
      posts.push({ path: u.pathname, body });
      if (u.pathname === '/api/folhao/salvar') rascunhos.set(body.equipamento_id, { dados: body.dados, tipo_folhao: body.tipo_folhao, etapa: body.etapa });
      return json({ sucesso: true, id: 1 });
    }
    const mf = u.pathname.match(/^\/api\/folhao\/([^/]+)$/);
    if (mf) { const d = rascunhos.get(decodeURIComponent(mf[1])); return d ? json(d) : json({ detail: 'nao' }, 404); }
    if (u.pathname.startsWith('/api/checklist-execucao/status/')) return json({ execucao_id: null });
    return json([]);
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => erros.push('PAGEERR ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(msg.text())) erros.push('console ' + msg.text().slice(0, 200)); });
  page.on('dialog', d => { alertas.push(d.message().slice(0, 160)); d.type() === 'prompt' ? d.accept('') : d.accept(); });
  await page.addInitScript(() => {
    localStorage.setItem('oms_operador_v32_local', JSON.stringify({ matricula: 'CBK3574', nome: 'Teste [Desenvolvedor]', isAdm: true, token: 'x' }));
    window.__previews = []; window.__prints = 0;
    window.open = () => ({ document: { write: h => window.__previews.push(String(h)), close() {}, open() {} }, focus() {}, print() {}, close() {}, addEventListener() {} });
    window.print = () => { window.__prints++; };
  });

  const abrir = async () => {
    await page.goto(BASE); await page.waitForTimeout(2500);
    await page.addStyleTag({ content: '#aviso-nova-versao{display:none!important}' });
    await page.evaluate(item => { window.BANCO_ATIVOS.push({ ton: 0, meta: 1000, local: 'Oficina / Reparo', ...item }); window.abrirFolhaoPorTipo(item.id); }, caso.item);
    await page.waitForTimeout(2500);
    return page.evaluate(() => { const m = [...document.querySelectorAll('.modal-overlay:not(.hidden)')].find(x => /folhao/.test(x.id)); return m ? m.id : null; });
  };

  const r = { caso: caso.nome };
  try {
    const modalId = await abrir();
    r.modal = modalId;
    if (!modalId) { r.falha = 'folhão não abriu'; throw new Error('não abriu'); }

    // estrutura
    Object.assign(r, await page.evaluate(id => {
      const m = document.getElementById(id);
      const els = [...m.querySelectorAll('input, textarea, select')];
      const ids = els.filter(e => e.id).map(e => e.id);
      const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
      const semId = els.filter(e => !e.id && e.type !== 'radio' && e.type !== 'button' && e.type !== 'file');
      const radSemNome = els.filter(e => e.type === 'radio' && !e.name).length;
      return { campos: els.length, abas: m.querySelectorAll('.folhao-tab').length, idsDuplicados: dup.slice(0, 15), qtdDuplicados: dup.length,
               semIdNaoSalva: semId.length, semIdExemplos: semId.slice(0, 5).map(e => (e.closest('td,div,label')?.innerText || e.placeholder || e.name || '').trim().slice(0, 40)), radioSemNome: radSemNome };
    }, modalId));

    // cada aba
    const nAbas = r.abas; r.abasComErro = [];
    for (let i = 0; i < nAbas; i++) {
      const antes = erros.length;
      await page.evaluate(([id, i]) => document.getElementById(id).querySelectorAll('.folhao-tab')[i].click(), [modalId, i]);
      await page.waitForTimeout(150);
      if (erros.length > antes) r.abasComErro.push(i);
      if (i === 0 || i === 1) await page.screenshot({ path: `${OUT}_${caso.nome.replace(/\W+/g, '_')}_aba${i}.png` });
    }
    await page.evaluate(id => document.getElementById(id).querySelectorAll('.folhao-tab')[0]?.click(), modalId);

    // preenche tudo com valores únicos
    const esperado = await page.evaluate(id => {
      const m = document.getElementById(id); const esp = { texto: {}, radios: {}, checks: [], selects: {} };
      let n = 0;
      m.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.disabled || el.readOnly) return;
        const t = el.type;
        if (t === 'radio' || t === 'button' || t === 'file' || t === 'hidden' || t === 'submit') return;
        if (t === 'checkbox') { el.checked = true; if (el.id) esp.checks.push(el.id); }
        else if (el.tagName === 'SELECT') { if (el.id === 'desemp-tipo-cadeira') return; if (el.options.length > 1) { el.selectedIndex = el.options.length - 1; if (el.id) esp.selects[el.id] = el.value; } }
        else if (t === 'date') { el.value = '2026-03-' + String(10 + (n++ % 18)).padStart(2, '0'); if (el.id) esp.texto[el.id] = el.value; }
        else if (t === 'number') { el.value = String(700 + n++) + '.25'; if (el.id) esp.texto[el.id] = el.value; }
        else if (t === 'time') { el.value = '10:' + String(n++ % 60).padStart(2, '0'); if (el.id) esp.texto[el.id] = el.value; }
        else { el.value = 'Zq' + (n++) + 'x'; if (el.id) esp.texto[el.id] = el.value; }
        el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const nomes = new Set([...m.querySelectorAll('input[type=radio][name]')].map(x => x.name));
      nomes.forEach(nome => { const g = [...m.querySelectorAll(`input[type=radio][name="${CSS.escape(nome)}"]`)]; const alvo = g[g.length - 1]; alvo.checked = true; alvo.dispatchEvent(new Event('change', { bubbles: true })); alvo.dispatchEvent(new Event('click', { bubbles: true })); esp.radios[nome] = alvo.value; });
      return esp;
    }, modalId);
    r.preenchidos = Object.keys(esperado.texto).length + ' texto, ' + Object.keys(esperado.radios).length + ' SIM/NÃO, ' + esperado.checks.length + ' caixas';

    // pré-visualização: valores digitados aparecem no documento?
    const antesPrev = erros.length;
    await page.evaluate(fn => window[fn] && window[fn](), caso.prev);
    await page.waitForTimeout(800);
    const prev = await page.evaluate(() => window.__previews[window.__previews.length - 1] || '');
    r.previewOk = prev.length > 500 && erros.length === antesPrev;
    if (prev) {
      fs.writeFileSync(`${OUT}_${caso.nome.replace(/\W+/g, '_')}_preview.html`, prev);
      const variantes = v => { const out = [v]; const d = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (d) out.push(`${d[3]}/${d[2]}/${d[1]}`, `${d[3]}/${d[2]}/${d[1].slice(2)}`); if (/^\d+\.25$/.test(v)) out.push(v.replace('.', ','), v.replace('.25', '.3'), v.replace('.25', ',3')); return out; };
      const faltando = Object.entries(esperado.texto).filter(([, v]) => !variantes(v).some(x => prev.includes(x))).map(([k]) => k);
      fs.writeFileSync(`${OUT}_${caso.nome.replace(/\W+/g, '_')}_fora.json`, JSON.stringify(faltando));
      r.textoForaDoDocumento = faltando.length; r.textoForaExemplos = faltando.slice(0, 12);
    }

    // caixas de marcar: quantas viram marca no documento?
    if (prev && esperado.checks.length) {
      const contaMarcas = h => (h.match(/>\s*(?:X|x|OK|✓|✔|☑|✅)\s*</g) || []).length;
      const nComTudo = contaMarcas(prev);
      await page.evaluate(id => document.getElementById(id).querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = false; }), modalId);
      await page.evaluate(fn => window[fn] && window[fn](), caso.prev); await page.waitForTimeout(500);
      const prev2 = await page.evaluate(() => window.__previews[window.__previews.length - 1] || '');
      r.caixasNoDocumento = `${nComTudo - contaMarcas(prev2)}/${esperado.checks.length}`;
      await page.evaluate(([id, ids]) => ids.forEach(i => { const c = document.getElementById(i); if (c) c.checked = true; }), [modalId, esperado.checks]);
    }

    // salvar
    const antesPosts = posts.length;
    const clicouSalvar = await page.evaluate(id => { const bt = [...document.getElementById(id).querySelectorAll('button')].find(x => /salvar/i.test(x.getAttribute('onclick') || '') && !/rascunho/i.test(x.getAttribute('onclick') || '')); if (bt) { bt.click(); return bt.getAttribute('onclick'); } return null; }, modalId);
    await page.waitForTimeout(2500);
    const novos = posts.slice(antesPosts);
    r.salvar = clicouSalvar ? { laudo: novos.some(p => p.path === '/api/laudos'), rascunho: novos.some(p => p.path === '/api/folhao/salvar') } : 'botão Salvar não encontrado';
    const laudo = novos.find(p => p.path === '/api/laudos');
    if (laudo) r.laudoTipo = laudo.body.tipo;

    // reabrir: o rascunho volta?
    if (rascunhos.size) {
      const modal2 = await abrir();
      const volta = await page.evaluate(([id, esp]) => {
        const m = document.getElementById(id); if (!m) return { erro: 'não reabriu' };
        let okT = 0, errT = []; Object.entries(esp.texto).forEach(([k, v]) => { const el = document.getElementById(k); if (el && el.value === v) okT++; else errT.push(k); });
        let okR = 0, errR = []; Object.entries(esp.radios).forEach(([k, v]) => { const el = m.querySelector(`input[type=radio][name="${CSS.escape(k)}"]:checked`); if (el && el.value === v) okR++; else errR.push(k); });
        let okC = 0, errC = []; esp.checks.forEach(k => { const el = document.getElementById(k); if (el && el.checked) okC++; else errC.push(k); });
        return { texto: `${okT}/${okT + errT.length}`, radios: `${okR}/${okR + errR.length}`, caixas: `${okC}/${okC + errC.length}`, perdidos: [...errT, ...errR, ...errC].slice(0, 10) };
      }, [modal2, esperado]);
      r.reabrir = volta;
    }
  } catch (e) { r.excecao = r.excecao || String(e.message).slice(0, 200); }
  r.erros = [...new Set(erros)].slice(0, 8);
  r.alertas = [...new Set(alertas)].slice(0, 6);
  relatorio.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
}
fs.writeFileSync(`${OUT}_relatorio.json`, JSON.stringify(relatorio, null, 1));
await b.close();
