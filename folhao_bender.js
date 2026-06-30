// folhao_bender.js - Módulo específico para o equipamento BENDER
import { getV } from './molde4.js';

// -------------------- CHECKLIST DE EXECUÇÃO (BENDER) --------------------
export const itensExecucao = [
  { i: "1", d: "Limpeza e lavagem" },
  { i: "2.1", d: "Limpeza de Break Out" },
  { i: "3.1", d: "Soltar as uniões das cangalhas e tampar" },
  { i: "3.2", d: "Retirar chavetas das cangalhas" },
  { i: "3.3", d: "Remover as cangalhas" },
  { i: "3.4", d: "Isolar as pontas dos bicos spray" },
  { i: "3.5", d: "Retirar proteções de madeira" },
  { i: "3.6", d: "Posicionar segmento na horizontal" },
  { i: "3.7", d: "Aferir medida do GAP de chegada" },
  { i: "3.8", d: "Soltar as 4 porcas de segurança" },
  { i: "3.9", d: "Içar e separar a base superior da inferior" },
  { i: "3.10", d: "Posicionar base superior no cavalete" },
  { i: "3.11", d: "Retirar as proteções dos rolos" },
  { i: "3.12", d: "Desconectar tubulação de graxa e parafusos" },
  { i: "3.13", d: "Retirar os conjuntos dos rolos" },
  { i: "3.14", d: "Guardar calços de alinhamento bons" },
  { i: "3.15", d: "Preparar base superior para pintura" },
  { i: "3.16", d: "Preparar base inferior para pintura" },
  { i: "4.1", d: "Preparação de refrigeração nas cangalhas" },
  { i: "4.2", d: "Testes de refrigeração nas cangalhas" },
  { i: "5.1", d: "Preparar a base inferior" },
  { i: "5.2", d: "Conferir o aperto dos calços nas bases" },
  { i: "5.3", d: "Remover válvulas de graxa e testar" },
  { i: "5.4", d: "Instalar os conjuntos de rolos na base" },
  { i: "5.5", d: "Colocar parafusos M16 (com graxa)" },
  { i: "5.6", d: "Aferir passline na base inferior" },
  { i: "5.7", d: "Conectar tubos de lubrificação e testar" },
  { i: "5.8", d: "Montar proteções dos rolos e apertar" },
  { i: "5.9", d: "Passar graxa nas hastes" },
  { i: "5.10", d: "Preparar a base superior" },
  { i: "5.13", d: "Instalar rolos na base superior" },
  { i: "5.15", d: "Aferir passline na base superior" },
  { i: "5.19", d: "Transportar base sup e montar calços" },
  { i: "5.21", d: "Conferir o GAP final e registrar" },
  { i: "6.1", d: "Efetuar teste de todos resfriadores" },
  { i: "6.2", d: "Realizar teste de lubrificação" }
];

// -------------------- FUNÇÕES DE GERAÇÃO DE TABELAS (BENDER) --------------------
export function tExec(p) {
  return itensExecucao.map((obj, i) =>
    `<tr>
      <td style="text-align:center;">${obj.i}</td>
      <td>${obj.d}</td>
      ${p
        ? `<td style="text-align:center;">${document.getElementById(`exe-p-${i}`)?.checked ? 'X' : ''}</td>
           <td style="text-align:center;">${document.getElementById(`exe-g-${i}`)?.checked ? 'X' : ''}</td>
           <td style="text-align:center;">${getV(`exe-resp-${i}`)}</td>
           <td style="text-align:center;">${getV(`exe-mat-${i}`)}</td>
           <td style="text-align:center;">${getV(`exe-dat-${i}`)}</td>`
        : `<td style="text-align:center"><input type="checkbox" id="exe-p-${i}"></td>
           <td style="text-align:center"><input type="checkbox" id="exe-g-${i}"></td>
           <td><input id="exe-resp-${i}" class="w-100"></td>
           <td><input id="exe-mat-${i}" class="w-100"></td>
           <td><input id="exe-dat-${i}" type="date" class="w-100"></td>`
      }
    </tr>`
  ).join('');
}

export function trPL(pfx, p) {
  return Array.from({ length: 15 }).map((_, i) =>
    `<tr>
      <td style="text-align:center">${i+1}º</td>
      ${p
        ? `<td style="text-align:center">${getV(`pl-${pfx}-a-${i}`)}</td>
           <td style="text-align:center">${getV(`pl-${pfx}-b-${i}`)}</td>
           <td style="text-align:center">${getV(`pl-${pfx}-c-${i}`)}</td>`
        : `<td><input id="pl-${pfx}-a-${i}" class="w-100"></td>
           <td><input id="pl-${pfx}-b-${i}" class="w-100"></td>
           <td><input id="pl-${pfx}-c-${i}" class="w-100"></td>`
      }
    </tr>`
  ).join('');
}

export function trLub(pfx, p) {
  return Array.from({ length: 15 }).map((_, i) =>
    `<tr>
      <td style="text-align:center">${i+1}º</td>
      ${p
        ? `<td style="text-align:center">${getV(`lub-${pfx}-st-${i}`)}</td>
           <td style="text-align:center">${getV(`lub-${pfx}-obs-${i}`)}</td>`
        : `<td><select id="lub-${pfx}-st-${i}"><option></option><option>OK</option><option>NOK</option></select></td>
           <td><input id="lub-${pfx}-obs-${i}" class="w-100"></td>`
      }
    </tr>`
  ).join('');
}

export function trRol(pfx, p) {
  return Array.from({ length: 15 }).map((_, i) =>
    `<tr>
      <td style="text-align:center">${i+1}</td>
      ${p
        ? `<td style="text-align:center">${getV(`rol-${pfx}-1-${i}`)}</td>
           <td style="text-align:center">${getV(`rol-${pfx}-2-${i}`)}</td>
           <td style="text-align:center">${getV(`rol-${pfx}-3-${i}`)}</td>
           <td style="text-align:center">${getV(`rol-${pfx}-4-${i}`)}</td>`
        : `<td><select id="rol-${pfx}-1-${i}"><option></option><option>OK</option><option>NOK</option></select></td>
           <td><select id="rol-${pfx}-2-${i}"><option></option><option>OK</option><option>NOK</option></select></td>
           <td><select id="rol-${pfx}-3-${i}"><option></option><option>OK</option><option>NOK</option></select></td>
           <td><select id="rol-${pfx}-4-${i}"><option></option><option>OK</option><option>NOK</option></select></td>`
      }
    </tr>`
  ).join('');
}

export function trMed(pfx, p) {
  return Array.from({ length: 15 }).map((_, i) =>
    `<tr>
      <td style="text-align:center">${i+1}</td>
      ${p
        ? `<td style="text-align:center">${getV(`med-${pfx}-n1-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-m1-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-n2-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-m2-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-n3-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-m3-${i}`)}</td>
           <td style="text-align:center">${getV(`med-${pfx}-cls-${i}`)}</td>`
        : `<td><input id="med-${pfx}-n1-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-m1-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-n2-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-m2-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-n3-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-m3-${i}" style="width:30px"></td>
           <td><input id="med-${pfx}-cls-${i}" style="width:40px"></td>`
      }
    </tr>`
  ).join('');
}

export function gapTabela(pfx, p) {
  return `<table class="premium-table" style="font-size: 11px;">
    <thead><tr><th>Conjunto</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr></thead>
    <tbody>
      <tr><td style="text-align:center; font-weight:bold;">1º ao 3º</td>
        ${p
          ? `<td style="text-align:center;">${getV(`gap-${pfx}-a-1`)}</td>
             <td style="text-align:center;">${getV(`gap-${pfx}-b-1`)}</td>
             <td style="text-align:center;">${getV(`gap-${pfx}-c-1`)}</td>`
          : `<td><input id="gap-${pfx}-a-1" class="w-100"></td>
             <td><input id="gap-${pfx}-b-1" class="w-100"></td>
             <td><input id="gap-${pfx}-c-1" class="w-100"></td>`
        }
      </tr>
      <tr><td style="text-align:center; font-weight:bold;">4º ao 6º</td>
        ${p
          ? `<td style="text-align:center;">${getV(`gap-${pfx}-a-2`)}</td>
             <td style="text-align:center;">${getV(`gap-${pfx}-b-2`)}</td>
             <td style="text-align:center;">${getV(`gap-${pfx}-c-2`)}</td>`
          : `<td><input id="gap-${pfx}-a-2" class="w-100"></td>
             <td><input id="gap-${pfx}-b-2" class="w-100"></td>
             <td><input id="gap-${pfx}-c-2" class="w-100"></td>`
        }
      </tr>
    </tbody>
  </table>`;
}

// -------------------- GERAÇÃO DO HTML DAS ABAS DO BENDER --------------------
export function gerarTelasBenderHTML() {
  return `
    <div id="bender-chegada" class="folhao-content content-dinamico hidden">
      <h3 style="margin-bottom: 10px;">Aferição GAP (Chegada)</h3>${gapTabela('cheg', false)}
      <h3 style="margin: 20px 0 10px;">Pass Line (Chegada)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Base Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-cheg', false)}</table>
        </div>
        <div><h4 class="text-center">Base Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-cheg', false)}</table>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Diâmetro dos Apoios (Ø205 ±0,30)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div class="input-group">
          <label>Base Inferior (A, B, C, D)</label>
          <div style="display:flex;gap:5px">
            <input id="diam-inf-a" class="w-100"><input id="diam-inf-b" class="w-100">
            <input id="diam-inf-c" class="w-100"><input id="diam-inf-d" class="w-100">
          </div>
        </div>
        <div class="input-group">
          <label>Base Superior (A, B, C, D)</label>
          <div style="display:flex;gap:5px">
            <input id="diam-sup-a" class="w-100"><input id="diam-sup-b" class="w-100">
            <input id="diam-sup-c" class="w-100"><input id="diam-sup-d" class="w-100">
          </div>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Check de Lubrificação (Chegada)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Base Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('inf', false)}</table>
        </div>
        <div><h4 class="text-center">Base Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('sup', false)}</table>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Inspeção de Rolos (Chegada)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-cheg', false)}</table>
        </div>
        <div><h4 class="text-center">Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-cheg', false)}</table>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Medidas dos Rolos (Chegada)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('inf-cheg', false)}</table>
        </div>
        <div><h4 class="text-center">Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('sup-cheg', false)}</table>
        </div>
      </div>
    </div>

    <div id="bender-execucao" class="folhao-content content-dinamico hidden">
      <h3 style="margin-bottom: 10px;">Checklist de Manutenção</h3>
      <table class="premium-table" style="font-size: 11px;">
        <tr><th>Item</th><th>Descrição da Atividade</th><th>P</th><th>G</th><th>Executante</th><th>Matrícula</th><th>Data</th></tr>
        ${tExec(false)}
      </table>
    </div>

    <div id="bender-saida" class="folhao-content content-dinamico hidden">
      <h3 style="margin-bottom: 10px;">Aferição GAP (Saída)</h3>${gapTabela('sai', false)}
      <h3 style="margin: 20px 0 10px;">Pass Line (Saída)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Base Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-sai', false)}</table>
        </div>
        <div><h4 class="text-center">Base Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-sai', false)}</table>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Inspeção de Rolos (Saída)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-sai', false)}</table>
        </div>
        <div><h4 class="text-center">Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-sai', false)}</table>
        </div>
      </div>
      <h3 style="margin: 20px 0 10px;">Medidas dos Rolos (Saída)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div><h4 class="text-center">Inferior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('inf-sai', false)}</table>
        </div>
        <div><h4 class="text-center">Superior</h4>
          <table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('sup-sai', false)}</table>
        </div>
      </div>
    </div>

    <div id="aba-materiais-geral" class="folhao-content content-dinamico hidden">
      <h3 style="margin-bottom: 15px;">Materiais Aplicados no Reparo</h3>
      <textarea id="materiais-utilizados-texto" class="premium-textarea" rows="6"></textarea>
    </div>
  `;
}

// -------------------- IMPRESSÃO DO PDF DO BENDER --------------------
export function imprimirPDFBender(tag, motivo, tipoStr, getVFun) {
  const printDiv = document.getElementById("print-content");
  const getVal = getVFun || getV;

  const cssBase = `
    <style>
      .pdf-base { font-family: Arial, sans-serif; font-size: 10px; color: #000; }
      .pdf-base table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .pdf-base th, .pdf-base td { border: 1px solid #000; padding: 4px; }
      .pdf-base th { background: #f0f0f0; text-align: center; font-weight: bold; }
      .pdf-base .titulo-secao { background: #002b5e; color: #fff; font-weight: bold; padding: 6px; text-align: left; margin: 10px 0; border: 1px solid #000; font-size: 11px;}
      @media print { .quebra-pagina { break-before: page; page-break-before: always; margin-top: 15px;} }
    </style>`;

  const getCabecalhoUnico = (titulo, tag, inicio, fim) => `
    <div style="display: flex; border: 2px solid #000; border-bottom: 5px solid #002b5e; margin-bottom: 15px; align-items: center; background: #fff;">
      <div style="width: 20%; text-align: center; border-right: 2px solid #000; padding: 10px;">
        <span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 34px; color: #002b5e; letter-spacing: -2px;">CSN</span>
      </div>
      <div style="width: 60%; text-align: center; padding: 10px;">
        <h2 style="margin: 0; font-size: 16px; color: #000; text-decoration: underline;">${titulo}</h2>
        <p style="margin: 5px 0 0 0; font-size: 10px; color: #333; text-transform: uppercase; font-weight: bold;">Laudo Oficial de Manutenção e Peritagem</p>
      </div>
      <div style="width: 20%; font-size: 10px; border-left: 2px solid #000; padding: 10px; line-height: 1.5; font-weight: bold;">
        <div style="color: #002b5e;">TAG: <span style="color:#000;">${tag}</span></div>
        <div>INÍCIO: <span style="color:#000; font-weight:normal;">${inicio}</span></div>
        <div>FIM: <span style="color:#000; font-weight:normal;">${fim}</span></div>
      </div>
    </div>`;

  let html = `${cssBase}<div class="pdf-base">
    ${getCabecalhoUnico("CHECK LIST GERAL SEGMENTOS BENDER MCC#4", tag, getVal('mcc4-data-inicio'), getVal('mcc4-data-fim'))}
    <table style="margin-top:5px; background: #f9f9f9;">
      <tr><td><strong>MOTIVO DA OS:</strong> ${motivo}</td><td><strong>VEIO:</strong> MCC 4</td></tr>
    </table>

    <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA E LUBRIFICAÇÃO</div>
    <table>${gerarLinhasChecklistPDF(/*objCheck*/{}, "geral")}</table>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table><tr><th colspan="3">CHECK LUBRIFICAÇÃO - INFERIOR</th></tr>
          <tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('inf', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table><tr><th colspan="3">CHECK LUBRIFICAÇÃO - SUPERIOR</th></tr>
          <tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('sup', true)}
        </table>
      </div>
    </div>
    <div class="quebra-pagina"></div>

    <div class="titulo-secao">2. GAP E PASS LINE (CHEGADA)</div>
    <table>
      <tr><th colspan="5">DIÂMETRO DOS APOIOS (Ø205 ±0,30)</th></tr>
      <tr><th>Base</th><th>A</th><th>B</th><th>C</th><th>D</th></tr>
      <tr><td style="text-align:center; font-weight:bold;">Inferior</td>
          <td style="text-align:center;">${getVal('diam-inf-a')}</td>
          <td style="text-align:center;">${getVal('diam-inf-b')}</td>
          <td style="text-align:center;">${getVal('diam-inf-c')}</td>
          <td style="text-align:center;">${getVal('diam-inf-d')}</td>
      </tr>
      <tr><td style="text-align:center; font-weight:bold;">Superior</td>
          <td style="text-align:center;">${getVal('diam-sup-a')}</td>
          <td style="text-align:center;">${getVal('diam-sup-b')}</td>
          <td style="text-align:center;">${getVal('diam-sup-c')}</td>
          <td style="text-align:center;">${getVal('diam-sup-d')}</td>
      </tr>
    </table>
    <div style="display:flex; gap:15px; align-items: flex-start; width:100%;">
      <table style="flex-grow: 1;">
        <tr><th colspan="4">AFERIÇÃO GAP - 255,00/254,70</th></tr>
        <tr><th>Conj.</th><th>A</th><th>B</th><th>C</th></tr>
        <tr><td style="text-align:center;font-weight:bold;">1º a 3º</td>
            <td style="text-align:center;">${getVal('gap-cheg-a-1')}</td>
            <td style="text-align:center;">${getVal('gap-cheg-b-1')}</td>
            <td style="text-align:center;">${getVal('gap-cheg-c-1')}</td>
        </tr>
        <tr><td style="text-align:center;font-weight:bold;">4º a 6º</td>
            <td style="text-align:center;">${getVal('gap-cheg-a-2')}</td>
            <td style="text-align:center;">${getVal('gap-cheg-b-2')}</td>
            <td style="text-align:center;">${getVal('gap-cheg-c-2')}</td>
        </tr>
      </table>
    </div>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table><tr><th colspan="4">BASE INFERIOR - PASS LINE</th></tr>
          <tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-cheg', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table><tr><th colspan="4">BASE SUPERIOR - PASS LINE</th></tr>
          <tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-cheg', true)}
        </table>
      </div>
    </div>
    <div class="quebra-pagina"></div>

    <div class="titulo-secao">3. INSPEÇÃO E MEDIDAS DE ROLOS (CHEGADA)</div>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table><tr><th colspan="5">INSPEÇÃO INFERIOR</th></tr>
          <tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-cheg', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table><tr><th colspan="5">INSPEÇÃO SUPERIOR</th></tr>
          <tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-cheg', true)}
        </table>
      </div>
    </div>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table style="font-size:8px;"><tr><th colspan="8">MEDIDAS INFERIOR</th></tr>
          <tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('inf-cheg', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table style="font-size:8px;"><tr><th colspan="8">MEDIDAS SUPERIOR</th></tr>
          <tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('sup-cheg', true)}
        </table>
      </div>
    </div>
    <div class="quebra-pagina"></div>

    <div class="titulo-secao">4. CHECKLIST DE MANUTENÇÃO (EXECUÇÃO)</div>
    <table><tr><th>Item</th><th>Descrição da Atividade</th><th>P</th><th>G</th><th>Executante</th><th>Matrícula</th><th>Data</th></tr>${tExec(true)}</table>
    <div class="quebra-pagina"></div>

    <div class="titulo-secao">5. AFERIÇÃO GAP E PASS LINE (SAÍDA / FINAL)</div>
    <table><tr><th colspan="4">AFERIÇÃO DE GAP (SAÍDA)</th></tr>
      <tr><th>Conjunto</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>
      <tr><td style="text-align:center;">1º ao 3º</td>
          <td style="text-align:center;">${getVal('gap-sai-a-1')}</td>
          <td style="text-align:center;">${getVal('gap-sai-b-1')}</td>
          <td style="text-align:center;">${getVal('gap-sai-c-1')}</td>
      </tr>
      <tr><td style="text-align:center;">4º ao 6º</td>
          <td style="text-align:center;">${getVal('gap-sai-a-2')}</td>
          <td style="text-align:center;">${getVal('gap-sai-b-2')}</td>
          <td style="text-align:center;">${getVal('gap-sai-c-2')}</td>
      </tr>
    </table>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table><tr><th colspan="4">BASE INFERIOR - PASS LINE (SAÍDA)</th></tr>
          <tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-sai', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table><tr><th colspan="4">BASE SUPERIOR - PASS LINE (SAÍDA)</th></tr>
          <tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-sai', true)}
        </table>
      </div>
    </div>
    <div class="quebra-pagina"></div>

    <div class="titulo-secao">6. INSPEÇÃO E MEDIDAS DOS ROLOS (SAÍDA)</div>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table><tr><th colspan="5">INSPEÇÃO INFERIOR</th></tr>
          <tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-sai', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table><tr><th colspan="5">INSPEÇÃO SUPERIOR</th></tr>
          <tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-sai', true)}
        </table>
      </div>
    </div>
    <div style="display:flex; gap:10px; width:100%;">
      <div style="width:50%;">
        <table style="font-size:8px;"><tr><th colspan="8">MEDIDAS INFERIOR</th></tr>
          <tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('inf-sai', true)}
        </table>
      </div>
      <div style="width:50%;">
        <table style="font-size:8px;"><tr><th colspan="8">MEDIDAS SUPERIOR</th></tr>
          <tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('sup-sai', true)}
        </table>
      </div>
    </div>

    <div class="titulo-secao">7. MATERIAIS APLICADOS NO REPARO E OBSERVAÇÕES</div>
    <div style="border: 1px solid #000; padding: 10px; min-height: 50px;">${getVal('materiais-utilizados-texto').replace(/\n/g, "<br>")}</div>

    <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: bold; padding-bottom:30px;">
      <div><p>___________________________________</p><p>Líder Responsável / Operador</p></div>
      <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
    </div>
  </div>`;

  printDiv.innerHTML = html;
  setTimeout(() => { window.print(); }, 500);
}

// Função auxiliar para gerar linhas do checklist (pode ser compartilhada)
function gerarLinhasChecklistPDF(categoriasObj, prefix) {
  let html = "";
  let groupIndex = 0;
  for (const [nomeCategoria, perguntas] of Object.entries(categoriasObj)) {
    html += `<tr><th colspan="3" style="background:#002b5e; color:#fff; font-size:12px; text-align:left; padding: 6px; border: 1px solid #000;">${nomeCategoria}</th></tr>`;
    html += `<tr><th style="border: 1px solid #000; padding: 4px; width:5%;">Item</th><th style="border: 1px solid #000; padding: 4px;">Descrição do Serviço</th><th style="border: 1px solid #000; padding: 4px; width:15%;">Status</th></tr>`;
    perguntas.forEach((pergunta, index) => {
      let name = `${prefix}-g${groupIndex}-q${index}`;
      let radios = document.getElementsByName(name);
      let valor = "N/A";
      for (let i = 0; i < radios.length; i++) if (radios[i].checked) { valor = radios[i].value; break; }
      html += `<tr><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${index + 1}</td><td style="border: 1px solid #000; padding: 4px;">${pergunta}</td><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${valor}</td></tr>`;
    });
    groupIndex++;
  }
  return html;
}