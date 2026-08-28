// folhaoSegmentoZero.js - VERSÃO COMPLETA PARA SEGMENTO ZERO (MCC 2/3)
// ==============================================================
// Transcrito do documento oficial "CHECK LIST GERAL SEGMENTOS ZERO
// MCC 2/3". Antes deste arquivo, folhaoSegmentoZero.js era uma cópia
// esquecida do folhaoStraightenerR1.js (mesmo conteúdo, só um texto
// interno trocado) — abrir o folhão de um Segmento Zero não fazia
// nada, porque window.abrirFolhaoSegmentoZero nunca existia de
// verdade. Agora o formulário é o checklist real de Segmento Zero.
// ==============================================================

import { resolverApiBase } from '../Core/banco.js?v=5';
import { restaurarRascunhoNoModal, ativarAutoSalvamentoFolhao, finalizarRascunhoFolhao } from './folhaoPersistencia.js';
import { buscarPonteChecklist, preencherCamposFolhao, ligarListenerEdicaoManualFolhao, mostrarAvisoPreenchimentoChecklist } from '../Core/checklistFolhaoPonte.js';

let ID_FOLHAO_SEGZERO_ATUAL = null;

// 🆕 Contexto da ponte com o Checklist de Execução do folhão aberto no
// momento — mesmo padrão do PONTE_CHECKLIST_M4 (folhaoMolde4.js).
let PONTE_CHECKLIST_SEGZERO = { execucaoId: null, tipoEquipamento: null, mapaCampoParaEtapa: {} };

// ==============================================================
// 1. DADOS DAS TABELAS (transcritos do documento oficial)
// ==============================================================

const itensChegadaSegZero = [
    { grupo: "LUBRIFICAÇÃO", desc: 'Distribuidores de graxa com vazamentos' },
    { grupo: "", desc: 'Distribuidores de graxa com agarramentos' },
    { grupo: "", desc: 'Tubulações de graxa amassadas ou danificadas' },
    { grupo: "", desc: 'Flexíveis com vazamentos e/ou avarias' },
    { grupo: "", desc: 'Tubulações de graxa (inox), com avarias' },
    { grupo: "REFRIGERAÇÃO", desc: 'Resfriadores com vazamento' },
    { grupo: "", desc: 'Resfriadores com empeno' },
    { grupo: "", desc: 'Bicos de spray obstruídos' },
    { grupo: "", desc: 'Tubulação com avarias' },
    { grupo: "", desc: 'Uniões com avarias' },
    { grupo: "ESTRUTURA", desc: 'Proteções dos parafusos em perfeito estado, sem avarias' },
    { grupo: "", desc: 'Rolamentos quebrados' },
    { grupo: "", desc: 'Mancais soltos e avariados' },
    { grupo: "", desc: 'Rolos girando normalmente sem restrições' },
    { grupo: "", desc: 'Estrutura com break-out' }
];

const itensSaidaSegZero = [
    { grupo: "LUBRIFICAÇÃO", desc: 'Distribuidores de graxa sem vazamentos, isentos de agarramento' },
    { grupo: "", desc: 'Mancais lubrificados' },
    { grupo: "", desc: 'Flexíveis apertados e distorcidos' },
    { grupo: "", desc: 'Pressão de teste entre 90 a 110 kgf/cm² (pressão de referência)' },
    { grupo: "", desc: 'Tubulações em inox, sem avarias' },
    { grupo: "REFRIGERAÇÃO", desc: 'Flexíveis isentos de vazamentos' },
    { grupo: "", desc: 'Resfriadores isentos de empenos' },
    { grupo: "", desc: 'Bicos de spray alinhados e isentos de obstruções' },
    { grupo: "", desc: 'Tubulação apertada sem avaria' },
    { grupo: "", desc: 'Teste de pressão lateral com 5kg/cm² (Pressão referência)' },
    { grupo: "", desc: 'Uniões apertadas isentas de vazamento e avarias' },
    { grupo: "", desc: 'Uniões montadas na tubulação 2\'\' da cangalha inferior' },
    { grupo: "ESTRUTURA", desc: 'Proteções dos parafusos fixadas' },
    { grupo: "", desc: 'Estrutura jateada e pintada' },
    { grupo: "", desc: 'Gap em conformidade com o desenho' },
    { grupo: "", desc: 'Rolos girando normalmente sem restrições' },
    { grupo: "", desc: 'Chapa de proteção soldada' }
];

// Referência fixa da tabela de ajuste de GAP (chegada e saída usam a
// mesma referência: Espessura A e B = 261,5 (-0,1) mm).
const REF_GAP_SEGZERO = "261,5 (-0,1)";

const materiaisSegZero = [
    { nome: 'ARRUELA DE PRESSÃO M16', codigo: '1205772' },
    { nome: 'ARRUELA DE PRESSAO M24 DIN 127', codigo: '1203902' },
    { nome: 'ARRUELA DE PRESSÃO M36', codigo: '1205307' },
    { nome: 'ARRUELA LISA M64 X 66MM X 115MM', codigo: '1203775' },
    { nome: 'BASE DESENHO HITACHI 0294000 MC.1 -  PÉ', codigo: '1777550' },
    { nome: 'CARCAÇA DESENHO HITACHI 0144798 MC1 INFERIOR', codigo: '1660305' },
    { nome: 'CARCAÇA DESENHO HITACHI 0294079 MC1', codigo: '1660305' },
    { nome: 'CARCAÇA HITACHI 2245098 SUPERIOR', codigo: '1660303' },
    { nome: 'CARCAÇA LATERAL HITACHI 2253621 MC.1', codigo: '1672147' },
    { nome: 'CARCAÇA LATERAL HITACHI 2253621 MC.2', codigo: '1672146' },
    { nome: 'CONEXÃO 1/4" COMPRESSÃO 188D-E-1', codigo: '8288919' },
    { nome: 'CORPO CSN DM613216 1', codigo: '9140946' },
    { nome: 'COTOVELO 1.1/4" X 90º ROSCA BSP', codigo: '1691878' },
    { nome: 'COTOVELO 1/4" X 90º', codigo: '1064442' },
    { nome: 'DISTRIBUIDOR GRAXA 3/8 X1/4" NPTF 2 SAID', codigo: '8097039' },
    { nome: 'ENGATE RAPIDO 1.1/4"', codigo: '1211859' },
    { nome: 'ENGATE RAPIDO 2"', codigo: '1211500' },
    { nome: 'ENGATE RÁPIDO 3/8" - GRAXA', codigo: '1268070' },
    { nome: 'FITA DE ARAMIDA 1" X 1,7MM X 30 METROS', codigo: '1195298' },
    { nome: 'MANGUEIRA 3/8" X 1400MM (GRAXA)', codigo: '1624645' },
    { nome: 'PARAF CB SEXT M16X140MM', codigo: '1204966' },
    { nome: 'PARAFUSO CABEÇA SEXT.M12 X 45MM - INOX', codigo: '1204620' },
    { nome: 'PARAFUSO CABEÇA SEXT.M16 X 70MM-INOX', codigo: '8003560' },
    { nome: 'PARAFUSO CABEÇA SEXT.M16 X 90MM-INOX', codigo: '1628930' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M12 X 30MM', codigo: '1204624' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 115MM', codigo: '8010789' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 150MM', codigo: '1221020' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 160MM', codigo: '1615479' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 175MM', codigo: '1615369' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 180MM', codigo: '1204967' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 190MM', codigo: '1205571' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 200MM', codigo: '1205334' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 210MM', codigo: '1205193' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M16 X 90MM', codigo: '1219654' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M36 X 150MM', codigo: '1203880' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M36 X 440MM', codigo: '1620873' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADA M64 X 170MM', codigo: '1205431' },
    { nome: 'PARAFUSO CABEÇA SEXTAVADO M16 X 120MM', codigo: '1204965' },
    { nome: 'PARAFUSO CIL CL10.9    M16X    150MM', codigo: '1205144' },
    { nome: 'PINO HITACHI 0294015 2', codigo: '1752138' },
    { nome: 'PLACA HITACHI 0293493 1', codigo: '8500175' },
    { nome: 'PLACA HITACHI 0293493 2', codigo: '8500174' },
    { nome: 'PONTA UNIJET TP1285L - 12,3 L/MIN A 3,0 BAR (cod. Antigo 8768428)', codigo: '9272310' },
    { nome: 'PORCA FIX. INOX PONTA UNIJET CSN DM613216 2', codigo: '9140945' },
    { nome: 'PORCA SEXTAVADA M12', codigo: '1205361' },
    { nome: 'PORCA SEXTAVADA M16', codigo: '1204312' },
    { nome: 'PORCA SEXTAVADA M24', codigo: '1228240' },
    { nome: 'PORCA SEXTAVADA M64', codigo: '1206197' },
    { nome: 'RESFRIADOR DESENHO HITACHI 0295300 MC.1', codigo: '1642482' },
    { nome: 'RESFRIADOR DESENHO HITACHI 0295300 MC.31', codigo: '1642484' },
    { nome: 'RESFRIADOR DESENHO HITACHI 0295301MC.12', codigo: '1642483' },
    { nome: 'RESFRIADOR DESENHO HITACHI 0295302 MC.25', codigo: '1642481' },
    { nome: 'TUBO DE COBRE 6,35MM X 0,79MM X 30M', codigo: '8287526' },
    { nome: 'TUBO FLEX SANF AISI304 1.1/4 " 2600MM', codigo: '9182710' },
    { nome: 'TUBO Ø 1.1/4 X 42,16 X 6M - AÇO INOX', codigo: '1220355' },
    { nome: 'UNIÃO 3/8" INOX PARA SOLDA', codigo: '1726447' },
    { nome: 'UNIÃO DE 1.1/4" - INOX - ROSCA NPT', codigo: '1220503' },
    { nome: 'UNIÃO PARA TUBO 1/4"', codigo: '1064438' },
    { nome: 'VALVULA BM-7 (Distributor)', codigo: '1779160' }
];

// ==============================================================
// 2. FUNÇÕES AUXILIARES
// ==============================================================
function getV(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function getRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (let r of radios) if (r.checked) return r.value;
    return '';
}

// ==============================================================
// 3. INSPEÇÃO DE CHEGADA (checklist com categorias)
// ==============================================================
function montarChecklistHTML(itens, prefixo) {
    let categorias = {};
    let currentGroup = "GERAL";
    itens.forEach(item => {
        if (item.grupo && item.grupo.trim() !== "") currentGroup = item.grupo;
        if (!categorias[currentGroup]) categorias[currentGroup] = [];
        categorias[currentGroup].push(item.desc);
    });

    let html = "";
    let groupIndex = 0;
    for (const [nomeCategoria, perguntas] of Object.entries(categorias)) {
        html += `<h4 style="margin: 20px 0 10px 0; color: var(--text-accent); border-bottom: 1px dashed var(--border-color); padding-bottom: 5px;"><i class="fas fa-tasks"></i> ${nomeCategoria}</h4><div class="checklist-container">`;
        perguntas.forEach((pergunta, index) => {
            const name = `${prefixo}-g${groupIndex}-q${index}`;
            html += `<div class="check-item"><p>${index + 1}. ${pergunta}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
        });
        html += `</div>`;
        groupIndex++;
    }
    return html;
}

function renderizarChegadaSegZero() {
    const container = document.getElementById('segzero-container-chegada');
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">1. INSPEÇÃO DE CHEGADA</h3>`;
    html += montarChecklistHTML(itensChegadaSegZero, 'segzero-cheg');
    html += `<div class="input-group" style="margin-top:15px;"><label>Observações</label><textarea id="segzero-obs-chegada" class="premium-textarea" rows="3"></textarea></div>`;
    container.innerHTML = html;
}

// ==============================================================
// 4. AFERIÇÃO DE GAP (Chegada e Saída — mesma estrutura: 10
// conjuntos de rolo, referência fixa 261,5(-0,1)mm, 3 posições.
// A partir do 5º conjunto a Posição 2 não se aplica no documento
// original, por isso fica travada como "-".)
// ==============================================================
function renderizarTabelaGap(containerId, titulo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">${titulo}</h3>
        <p style="font-size:11px;color:var(--text-muted);">*Inspeção para identificar afastamento entre rolos. Referência: Espessura A e B = ${REF_GAP_SEGZERO}mm.</p>
        <table class="premium-table" style="font-size:11px;">
            <tr><th>LOCAL</th><th>REFERÊNCIA</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr>`;
    for (let i = 1; i <= 10; i++) {
        const prefix = containerId.includes('saida') ? 'segzero-gap-sai' : 'segzero-gap-cheg';
        const pos2 = i >= 5
            ? `<td style="text-align:center; color:var(--text-muted);">-</td>`
            : `<td><input id="${prefix}-${i}-p2"></td>`;
        html += `<tr><td style="font-weight:bold;">${i}º Conj. Rolo</td>
            <td style="text-align:center;">${REF_GAP_SEGZERO}</td>
            <td><input id="${prefix}-${i}-p1"></td>
            ${pos2}
            <td><input id="${prefix}-${i}-p3"></td></tr>`;
    }
    html += `</table>`;
    container.innerHTML = html;
}

function renderizarGapSegZero() {
    renderizarTabelaGap('segzero-container-gap-chegada', '3. AFERIÇÃO DE GAP (CHEGADA)');
    renderizarTabelaGap('segzero-container-gap-saida', 'AFERIÇÃO DE GAP (SAÍDA)');
}

// ==============================================================
// 5. INSPEÇÃO DIMENSIONAL DOS ROLOS (Chegada) — tabelas de
// referência fixas + observações das bases.
// ==============================================================
function renderizarMedidasSegZero() {
    const container = document.getElementById('segzero-container-medidas');
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">4. INSPEÇÃO DIMENSIONAL DOS ROLOS (CHEGADA)</h3>
        <p style="font-size:11px;color:var(--text-muted);">*Inspeção para identificar rolos e mancais aptos à reutilização.</p>

        <table class="premium-table" style="font-size:11px;">
            <tr><th colspan="3">DIÂMETROS PARA REUTILIZAÇÃO</th></tr>
            <tr><td style="font-weight:bold;">Rolo ø 140mm</td><td>(Máximo) 140mm</td><td>(Mínimo) 137mm</td></tr>
            <tr><td style="font-weight:bold;">Rolo ø 200mm</td><td>(Máximo) 200mm</td><td>(Mínimo) 197mm</td></tr>
        </table>

        <table class="premium-table" style="font-size:11px;">
            <tr><th colspan="2">EMPENO MÁXIMO PARA REUTILIZAÇÃO</th></tr>
            <tr><td style="font-weight:bold;">Rolo ø 140mm</td><td>0,5mm</td></tr>
            <tr><td style="font-weight:bold;">Rolo ø 200mm</td><td>0,5mm</td></tr>
        </table>

        <table class="premium-table" style="font-size:11px;">
            <tr><th colspan="3">DIÂMETROS PARA REUTILIZAÇÃO DOS MANCAIS</th></tr>
            <tr><td style="font-weight:bold;">Rolo ø 140mm – 80 H7</td><td>(Mínimo) 80,00mm</td><td>(Máximo) 80,04mm</td></tr>
            <tr><td style="font-weight:bold;">Rolo ø 200mm – 120 F7</td><td>(Mínimo) 120,05mm</td><td>(Máximo) 120,09mm</td></tr>
        </table>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:15px;">
            <div class="input-group"><label>Base Superior (diâmetro) — Observação</label><textarea id="segzero-obs-diam-sup" class="premium-textarea" rows="2"></textarea></div>
            <div class="input-group"><label>Base Inferior (diâmetro) — Observação</label><textarea id="segzero-obs-diam-inf" class="premium-textarea" rows="2"></textarea></div>
            <div class="input-group"><label>Base Superior (empeno) — Observação</label><textarea id="segzero-obs-empeno-sup" class="premium-textarea" rows="2"></textarea></div>
            <div class="input-group"><label>Base Inferior (empeno) — Observação</label><textarea id="segzero-obs-empeno-inf" class="premium-textarea" rows="2"></textarea></div>
        </div>`;
    container.innerHTML = html;
}

// ==============================================================
// 6. INSPEÇÃO DE MANCAIS (Chegada — Base Inferior e Base Superior)
// Grade de 10 posições x 3 pares OK/Ñ-OK. A partir da posição 5, o
// 3º par (posição 3) não se aplica no documento original ("-").
// ==============================================================
function renderizarTabelaMancais(containerId, titulo, prefixo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">${titulo}</h3>
        <table class="premium-table" style="font-size:10px;">
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th colspan="2">3</th></tr>
            <tr><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th></tr>`;
    for (let i = 1; i <= 10; i++) {
        const par3 = i >= 5
            ? `<td style="text-align:center; color:var(--text-muted);">-</td><td style="text-align:center; color:var(--text-muted);">-</td>`
            : `<td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p3"></td><td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p3"></td>`;
        html += `<tr><td style="text-align:center;font-weight:bold;">${i}</td>
            <td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p1"></td>
            <td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p1"></td>
            <td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p2"></td>
            <td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p2"></td>
            ${par3}</tr>`;
    }
    html += `</table>`;
    container.innerHTML = html;
}

function renderizarMancaisSegZero() {
    renderizarTabelaMancais('segzero-container-mancais-inf', '5. INSPEÇÃO DE MANCAIS — CHEGADA BASE INFERIOR', 'segzero-manc-inf');
    renderizarTabelaMancais('segzero-container-mancais-sup', 'INSPEÇÃO DE MANCAIS — CHEGADA BASE SUPERIOR', 'segzero-manc-sup');
}

// ==============================================================
// 7. PASS LINE — BASE INFERIOR (referência: 1±0,05mm). A partir do
// 5º conjunto, a Posição 2 não se aplica no documento original.
// ==============================================================
function renderizarPassLineSegZero() {
    const container = document.getElementById('segzero-container-passline');
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">6. PASS LINE — BASE INFERIOR</h3>
        <p style="font-size:11px;color:var(--text-muted);">*Aferição do pass line na base inferior: referência 1±0,05mm.</p>
        <table class="premium-table" style="font-size:11px;">
            <tr><th>Conj. Rolo</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr>`;
    for (let i = 1; i <= 10; i++) {
        const pos2 = i >= 5
            ? `<td style="text-align:center; color:var(--text-muted);">-</td>`
            : `<td><input id="segzero-passline-${i}-p2"></td>`;
        html += `<tr><td style="text-align:center;font-weight:bold;">${i}°</td>
            <td><input id="segzero-passline-${i}-p1"></td>
            ${pos2}
            <td><input id="segzero-passline-${i}-p3"></td></tr>`;
    }
    html += `</table>`;
    container.innerHTML = html;
}

// ==============================================================
// 8. INSPEÇÃO DE ROLOS — SAÍDA (Base Superior: 3 posições, Base
// Inferior: 4 posições) + Medidas dos Rolos de cada base.
// ==============================================================
function renderizarTabelaRolosSaida(containerId, titulo, prefixo, numPosicoes) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">${titulo}</h3>
        <table class="premium-table" style="font-size:10px;">
            <tr><th rowspan="2">Posição</th>`;
    for (let p = 1; p <= numPosicoes; p++) html += `<th colspan="2">${p}</th>`;
    html += `</tr><tr>`;
    for (let p = 1; p <= numPosicoes; p++) html += `<th>OK</th><th>Ñ/OK</th>`;
    html += `</tr>`;
    for (let i = 1; i <= 10; i++) {
        html += `<tr><td style="text-align:center;font-weight:bold;">${i}</td>`;
        for (let p = 1; p <= numPosicoes; p++) {
            html += `<td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p${p}"></td><td style="text-align:center;"><input type="radio" name="${prefixo}-${i}-p${p}"></td>`;
        }
        html += `</tr>`;
    }
    html += `</table>
        <h4 style="margin-top:12px;">Medidas dos Rolos</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th rowspan="2">Classe</th></tr>
            <tr><th>Num</th><th>Medida</th><th>Num</th><th>Medida</th></tr>`;
    for (let i = 1; i <= 10; i++) {
        html += `<tr><td style="text-align:center;font-weight:bold;">${i}</td>
            <td><input id="${prefixo}-med-${i}-n1"></td>
            <td><input id="${prefixo}-med-${i}-m1"></td>
            <td><input id="${prefixo}-med-${i}-n2"></td>
            <td><input id="${prefixo}-med-${i}-m2"></td>
            <td><input id="${prefixo}-med-${i}-classe"></td></tr>`;
    }
    html += `</table>
        <p style="font-size:10px;color:var(--text-muted);">*Nota: Diâmetros nominais — Classes: Vermelho (150,00); Azul (); Verde (); Amarelo ().</p>`;
    container.innerHTML = html;
}

function renderizarRolosSaidaSegZero() {
    renderizarTabelaRolosSaida('segzero-container-rolos-sup', '7. INSPEÇÃO DE ROLOS — SAÍDA BASE SUPERIOR', 'segzero-rol-sup', 3);
    renderizarTabelaRolosSaida('segzero-container-rolos-inf', 'INSPEÇÃO DE ROLOS — SAÍDA BASE INFERIOR', 'segzero-rol-inf', 4);
}

function renderizarChecklistSaidaSegZero() {
    const container = document.getElementById('segzero-container-checklist-saida');
    if (!container) return;
    let html = `<h3 style="color:var(--text-heading);">INSPEÇÃO DE SAÍDA</h3>`;
    html += montarChecklistHTML(itensSaidaSegZero, 'segzero-sai');
    html += `<div class="input-group" style="margin-top:15px;"><label>Observações</label><textarea id="segzero-obs-saida" class="premium-textarea" rows="3"></textarea></div>`;
    container.innerHTML = html;
}

// ==============================================================
// 9. MATERIAIS APLICADOS (lista oficial pré-preenchida — só a
// quantidade é editável).
// ==============================================================
function renderizarMateriaisSegZero() {
    const container = document.getElementById('segzero-container-materiais');
    if (!container) return;
    let rows = materiaisSegZero.map((m, i) => `
        <tr><td style="font-size:10px;">${m.nome}</td><td style="text-align:center; font-family:var(--font-mono); font-size:10px;">${m.codigo}</td>
        <td><input id="segzero-mat-qtd-${i}" style="width:70px;"></td></tr>`).join('');
    const html = `<h3 style="color:var(--text-heading);">8. MATERIAIS APLICADOS</h3>
        <table class="premium-table" style="font-size:11px;">
            <tr><th>MATERIAL</th><th style="width:100px;">CÓDIGO</th><th style="width:90px;">QUANTIDADE</th></tr>
            ${rows}
        </table>`;
    container.innerHTML = html;
}

// ==============================================================
// 10. ABRIR FOLHÃO
// ==============================================================
window.abrirFolhaoSegmentoZero = function(id) {
    ID_FOLHAO_SEGZERO_ATUAL = id;
    const modal = document.getElementById('modal-folhao-segmento-zero');
    if (!modal) {
        console.error("Modal #modal-folhao-segmento-zero não encontrado!");
        return;
    }

    const tagEl = document.getElementById('segzero-tag-ativo');
    if (tagEl) tagEl.innerText = id;
    const dataInicio = document.getElementById('segzero-data-inicio');
    const dataFim = document.getElementById('segzero-data-fim');
    if (dataInicio) dataInicio.valueAsDate = new Date();
    if (dataFim) dataFim.valueAsDate = new Date();
    const motivoEl = document.getElementById('segzero-motivo');
    if (motivoEl) motivoEl.value = '';

    renderizarChegadaSegZero();
    renderizarGapSegZero();
    renderizarMedidasSegZero();
    renderizarMancaisSegZero();
    renderizarPassLineSegZero();
    renderizarRolosSaidaSegZero();
    renderizarChecklistSaidaSegZero();
    renderizarMateriaisSegZero();

    modal.classList.remove('hidden');
    window.trocarAbaSegZero({ currentTarget: modal.querySelector('.folhao-tab') }, 'segzero-aba-dados');

    // Restaura progresso salvo e liga o auto-salvamento (mesmo
    // mecanismo genérico usado pelos outros folhões — persiste no
    // Neon via /api/folhao/salvar, não só no navegador).
    restaurarRascunhoNoModal('modal-folhao-segmento-zero', id);
    ativarAutoSalvamentoFolhao('modal-folhao-segmento-zero', id, 'Segmento Zero');

    // 🆕 PONTE COM O CHECKLIST DE EXECUÇÃO — autopreenche os campos já
    // respondidos lá (ver '../Core/checklistFolhaoPonte.js').
    preencherFolhaoSegZeroComChecklistExecucao(id);
};

async function preencherFolhaoSegZeroComChecklistExecucao(id) {
    ligarListenerEdicaoManualFolhao('modal-folhao-segmento-zero', () => PONTE_CHECKLIST_SEGZERO);
    try {
        const item = window.BANCO_ATIVOS.find(a => a.id === id);
        const ponte = await buscarPonteChecklist(id, item);
        if (!ponte) return;
        PONTE_CHECKLIST_SEGZERO = ponte;

        const camposProtegidos = new Set([
            'segzero-tag-ativo', 'segzero-num-segmento', 'segzero-veio', 'segzero-desempenho',
            'segzero-motivo', 'segzero-tipo-execucao', 'segzero-data-inicio', 'segzero-data-fim'
        ]);

        const { preenchidos, naoEncontrados } = preencherCamposFolhao(ponte.valores, camposProtegidos);
        if (preenchidos > 0 || naoEncontrados > 0) {
            mostrarAvisoPreenchimentoChecklist(preenchidos, naoEncontrados);
        }
    } catch (e) {
        console.error('⚠️ Não consegui puxar os valores do Checklist de Execução pro folhão (Segmento Zero):', e);
    }
}

// ==============================================================
// 11. FECHAR E TROCAR ABA
// ==============================================================
window.fecharFolhaoSegmentoZero = function() {
    const modal = document.getElementById('modal-folhao-segmento-zero');
    if (modal) modal.classList.add('hidden');
    ID_FOLHAO_SEGZERO_ATUAL = null;
};

window.trocarAbaSegZero = function(evt, abaId) {
    const modal = document.getElementById('modal-folhao-segmento-zero');
    if (!modal) return;
    modal.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    modal.querySelectorAll('.folhao-tab').forEach(b => b.classList.remove('active'));
    const aba = document.getElementById(abaId);
    if (aba) aba.classList.remove('hidden');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
};

// ==============================================================
// 12. MONTA O HTML DO LAUDO (PDF) - SEGMENTO ZERO
// ==============================================================
function montarHtmlLaudoSegZero(tag) {
    const dtInicio = getV('segzero-data-inicio') || new Date().toLocaleDateString('pt-BR');
    const dtFim = getV('segzero-data-fim') || new Date().toLocaleDateString('pt-BR');
    const numSeg = getV('segzero-num-segmento') || '______';
    const veio = document.getElementById('segzero-veio')?.value || '';
    const desempenho = getV('segzero-desempenho') || '';
    const motivo = getV('segzero-motivo') || '_______________';
    const tipoExec = document.getElementById('segzero-tipo-execucao')?.value || 'GERAL';

    function gerarChecklistPDF(itens, prefixo) {
        let html = '';
        let categorias = {};
        let currentGroup = "GERAL";
        itens.forEach(it => {
            if (it.grupo && it.grupo.trim() !== "") currentGroup = it.grupo;
            if (!categorias[currentGroup]) categorias[currentGroup] = [];
            categorias[currentGroup].push(it.desc);
        });
        let groupIndex = 0;
        for (const [nomeCategoria, perguntas] of Object.entries(categorias)) {
            html += `<tr><th colspan="3" style="background:#002b5e; color:#fff; font-size:10px; text-align:left; padding:4px; border:1px solid #000;">${nomeCategoria}</th></tr>`;
            html += `<tr><th style="border:1px solid #000; padding:3px; width:5%;">Item</th><th style="border:1px solid #000; padding:3px;">Descrição</th><th style="border:1px solid #000; padding:3px; width:12%;">Status</th></tr>`;
            perguntas.forEach((pergunta, index) => {
                const name = `${prefixo}-g${groupIndex}-q${index}`;
                const val = getRadioValue(name);
                html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px;">${index+1}</td>
                    <td style="border:1px solid #000; padding:3px;">${pergunta}</td>
                    <td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${val}</td></tr>`;
            });
            groupIndex++;
        }
        return html;
    }

    function gerarGapPDF(prefixo) {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const pos2 = i >= 5 ? '-' : getV(`${prefixo}-${i}-p2`);
            html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${i}º Conj. Rolo</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${REF_GAP_SEGZERO}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-${i}-p1`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${pos2}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-${i}-p3`)}</td></tr>`;
        }
        return html;
    }

    function gerarMancaisPDF(prefixo) {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const p1 = getRadioValue(`${prefixo}-${i}-p1`);
            const p2 = getRadioValue(`${prefixo}-${i}-p2`);
            const p3 = i >= 5 ? null : getRadioValue(`${prefixo}-${i}-p3`);
            html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${i}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${p1 === 'OK' ? 'X' : ''}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${p1 === 'Ñ/OK' ? 'X' : ''}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${p2 === 'OK' ? 'X' : ''}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${p2 === 'Ñ/OK' ? 'X' : ''}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${i >= 5 ? '-' : (p3 === 'OK' ? 'X' : '')}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${i >= 5 ? '-' : (p3 === 'Ñ/OK' ? 'X' : '')}</td></tr>`;
        }
        return html;
    }

    function gerarPassLinePDF() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const pos2 = i >= 5 ? '-' : getV(`segzero-passline-${i}-p2`);
            html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${i}°</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`segzero-passline-${i}-p1`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${pos2}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`segzero-passline-${i}-p3`)}</td></tr>`;
        }
        return html;
    }

    function gerarRolosSaidaPDF(prefixo, numPos) {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${i}</td>`;
            for (let p = 1; p <= numPos; p++) {
                const val = getRadioValue(`${prefixo}-${i}-p${p}`);
                html += `<td style="text-align:center; border:1px solid #000; padding:3px;">${val === 'OK' ? 'X' : ''}</td>
                    <td style="text-align:center; border:1px solid #000; padding:3px;">${val === 'Ñ/OK' ? 'X' : ''}</td>`;
            }
            html += `</tr>`;
        }
        return html;
    }

    function gerarMedidasRolosPDF(prefixo) {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `<tr><td style="text-align:center; border:1px solid #000; padding:3px; font-weight:bold;">${i}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-med-${i}-n1`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-med-${i}-m1`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-med-${i}-n2`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-med-${i}-m2`)}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`${prefixo}-med-${i}-classe`)}</td></tr>`;
        }
        return html;
    }

    function gerarMateriaisPDF() {
        return materiaisSegZero.map((m, i) => `
            <tr><td style="border:1px solid #000; padding:3px; font-size:9px;">${m.nome}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${m.codigo}</td>
                <td style="text-align:center; border:1px solid #000; padding:3px;">${getV(`segzero-mat-qtd-${i}`)}</td></tr>`).join('');
    }

    // ==============================================================
    // MONTA HTML DO PDF
    // ==============================================================
    let htmlPDF = `
    <style>
        .pdf-base { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
        .pdf-base table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .pdf-base th, .pdf-base td { border: 1px solid #000; padding: 3px; }
        .pdf-base th { background: #e0e0e0; text-align: center; font-weight: bold; font-size: 9px; }
        .pdf-base .titulo-secao { background: #002b5e; color: #fff; font-weight: bold; padding: 4px; text-align: left; margin: 10px 0 4px 0; border: 1px solid #000; font-size: 10px; text-transform: uppercase; }
        @media print { .quebra-pagina { break-before: page; page-break-before: always; margin-top: 10px; } }
    </style>
    <div class="pdf-base">
        <div style="display: flex; border: 2px solid #000; border-bottom: 5px solid #002b5e; margin-bottom: 8px; align-items: center; background: #fff;">
            <div style="width: 20%; text-align: center; border-right: 2px solid #000; padding: 8px;"><span style="font-weight: 900; font-size: 28px; color: #002b5e; letter-spacing: -2px;">CSN</span></div>
            <div style="width: 60%; text-align: center; padding: 8px;">
                <h2 style="margin: 0; font-size: 12px; color: #000;">CHECK LIST GERAL SEGMENTOS ZERO MCC 2/3</h2>
                <p style="margin: 4px 0 0 0; font-size: 8px; color: #333; font-weight: bold;">DATA INÍCIO: ${dtInicio} | DATA FIM: ${dtFim}</p>
            </div>
            <div style="width: 20%; font-size: 9px; border-left: 2px solid #000; padding: 8px; line-height: 1.4; font-weight: bold;">
                <div style="color: #002b5e;">TAG: <span style="color:#000;">${tag}</span></div>
            </div>
        </div>

        <table>
            <tr><td><strong>Nº SEGMENTO:</strong> ${numSeg}</td>
                <td><strong>VEIO (SAÍDA):</strong> ${veio}</td>
                <td><strong>DESEMPENHO:</strong> ${desempenho}</td></tr>
            <tr><td><strong>MOTIVO:</strong> ${motivo}</td>
                <td colspan="2"><strong>TIPO DE EXECUÇÃO:</strong> ${tipoExec}</td></tr>
        </table>

        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA</div>
        <table>${gerarChecklistPDF(itensChegadaSegZero, 'segzero-cheg')}</table>
        <p style="font-size:9px;"><strong>Observações:</strong> ${getV('segzero-obs-chegada')}</p>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">2. AFERIÇÃO DE GAP (CHEGADA)</div>
        <table>
            <tr><th>LOCAL</th><th>REFERÊNCIA</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr>
            ${gerarGapPDF('segzero-gap-cheg')}
        </table>

        <div class="titulo-secao">3. INSPEÇÃO DIMENSIONAL DOS ROLOS (CHEGADA)</div>
        <table>
            <tr><th colspan="3">DIÂMETROS PARA REUTILIZAÇÃO</th></tr>
            <tr><td><strong>Rolo ø 140mm</strong></td><td>(Máximo) 140mm</td><td>(Mínimo) 137mm</td></tr>
            <tr><td><strong>Rolo ø 200mm</strong></td><td>(Máximo) 200mm</td><td>(Mínimo) 197mm</td></tr>
        </table>
        <table>
            <tr><th colspan="2">EMPENO MÁXIMO PARA REUTILIZAÇÃO</th></tr>
            <tr><td><strong>Rolo ø 140mm</strong></td><td>0,5mm</td></tr>
            <tr><td><strong>Rolo ø 200mm</strong></td><td>0,5mm</td></tr>
        </table>
        <table>
            <tr><th colspan="3">DIÂMETROS PARA REUTILIZAÇÃO DOS MANCAIS</th></tr>
            <tr><td><strong>Rolo ø 140mm – 80 H7</strong></td><td>(Mínimo) 80,00mm</td><td>(Máximo) 80,04mm</td></tr>
            <tr><td><strong>Rolo ø 200mm – 120 F7</strong></td><td>(Mínimo) 120,05mm</td><td>(Máximo) 120,09mm</td></tr>
        </table>
        <table>
            <tr><td><strong>Base Superior (diâmetro):</strong> ${getV('segzero-obs-diam-sup')}</td></tr>
            <tr><td><strong>Base Inferior (diâmetro):</strong> ${getV('segzero-obs-diam-inf')}</td></tr>
            <tr><td><strong>Base Superior (empeno):</strong> ${getV('segzero-obs-empeno-sup')}</td></tr>
            <tr><td><strong>Base Inferior (empeno):</strong> ${getV('segzero-obs-empeno-inf')}</td></tr>
        </table>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">4. INSPEÇÃO DE MANCAIS — CHEGADA BASE INFERIOR</div>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th colspan="2">3</th></tr>
            <tr><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th></tr>
            ${gerarMancaisPDF('segzero-manc-inf')}
        </table>

        <div class="titulo-secao">INSPEÇÃO DE MANCAIS — CHEGADA BASE SUPERIOR</div>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th colspan="2">3</th></tr>
            <tr><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th></tr>
            ${gerarMancaisPDF('segzero-manc-sup')}
        </table>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">5. PASS LINE — BASE INFERIOR (ref. 1±0,05mm)</div>
        <table>
            <tr><th>Conj. Rolo</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr>
            ${gerarPassLinePDF()}
        </table>

        <div class="titulo-secao">6. AFERIÇÃO DE GAP (SAÍDA)</div>
        <table>
            <tr><th>LOCAL</th><th>REFERÊNCIA</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr>
            ${gerarGapPDF('segzero-gap-sai')}
        </table>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">7. INSPEÇÃO DE ROLOS — SAÍDA BASE SUPERIOR</div>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th colspan="2">3</th></tr>
            <tr><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th></tr>
            ${gerarRolosSaidaPDF('segzero-rol-sup', 3)}
        </table>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th rowspan="2">Classe</th></tr>
            <tr><th>Num</th><th>Medida</th><th>Num</th><th>Medida</th></tr>
            ${gerarMedidasRolosPDF('segzero-rol-sup')}
        </table>

        <div class="titulo-secao">INSPEÇÃO DE ROLOS — SAÍDA BASE INFERIOR</div>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th colspan="2">3</th><th colspan="2">4</th></tr>
            <tr><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th><th>OK</th><th>Ñ/OK</th></tr>
            ${gerarRolosSaidaPDF('segzero-rol-inf', 4)}
        </table>
        <table>
            <tr><th rowspan="2">Posição</th><th colspan="2">1</th><th colspan="2">2</th><th rowspan="2">Classe</th></tr>
            <tr><th>Num</th><th>Medida</th><th>Num</th><th>Medida</th></tr>
            ${gerarMedidasRolosPDF('segzero-rol-inf')}
        </table>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">8. INSPEÇÃO DE SAÍDA</div>
        <table>${gerarChecklistPDF(itensSaidaSegZero, 'segzero-sai')}</table>
        <p style="font-size:9px;"><strong>Observações:</strong> ${getV('segzero-obs-saida')}</p>

        <div class="quebra-pagina"></div>

        <div class="titulo-secao">9. MATERIAIS APLICADOS</div>
        <table>
            <tr><th>MATERIAL</th><th>CÓDIGO</th><th>QUANTIDADE</th></tr>
            ${gerarMateriaisPDF()}
        </table>

        <div style="margin-top:40px; display:flex; justify-content:space-around; text-align:center; font-size:10px; font-weight:bold;">
            <div><p>___________________________________</p><p>Líder Responsável / Operador</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    </div>`;

    return htmlPDF;
}

// ==============================================================
// 13. SALVAR FOLHÃO - SEGMENTO ZERO (sem imprimir)
// ==============================================================
window.salvarFolhaoSegmentoZero = async function() {
    if (!window.verificarAcesso || !window.verificarAcesso()) { alert("Acesso negado."); return; }
    if (!ID_FOLHAO_SEGZERO_ATUAL) { alert("Nenhuma TAG carregada."); return; }

    const tag = ID_FOLHAO_SEGZERO_ATUAL;
    const htmlPDF = montarHtmlLaudoSegZero(tag);

    let laudoId = null;
    if (typeof window.salvarLaudoNoHistorico === 'function') {
        laudoId = await window.salvarLaudoNoHistorico(tag, "Segmento Zero MCC 2/3", htmlPDF);
    }
    if (!laudoId) {
        alert("❌ Não consegui salvar o Folhão no banco. Tente novamente ou confira sua conexão.");
        return;
    }

    let rascunhoSalvoComSucesso = true;
    if (typeof window.salvarRascunhoFolhao === 'function' && typeof window.coletarDadosModal === 'function') {
        try {
            const resultado = await window.salvarRascunhoFolhao(tag, "Segmento Zero", window.coletarDadosModal("modal-folhao-segmento-zero"));
            rascunhoSalvoComSucesso = resultado !== false;
        } catch (e) {
            rascunhoSalvoComSucesso = false;
        }
    }

    if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
        window.carregarStatusChecklistExecucaoReparo([tag], true);
    }
    if (typeof window.renderReparos === 'function') window.renderReparos();

    if (rascunhoSalvoComSucesso) {
        alert("✅ Folhão salvo. Assim que o Checklist de Execução estiver 100%, clique em \"Concluir\" para gerar e imprimir o documento final.");
    } else {
        alert("⚠️ O laudo foi gravado, mas NÃO consegui salvar o progresso do formulário pra reabrir depois. Confira sua conexão e clique em \"Salvar\" de novo antes de fechar.");
    }
    window.fecharFolhaoSegmentoZero();
};

// ==============================================================
// 14. CONCLUIR E IMPRIMIR - SEGMENTO ZERO (chamado pelo botão
// "Concluir" do Checklist de Execução, só depois de 100% + Folhão salvo)
// ==============================================================
window.concluirEImprimirFolhaoSegmentoZero = async function(tag) {
    let htmlPDF;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos?peca_id=${encodeURIComponent(tag)}&limite=1`, { cache: 'no-store' });
        const laudos = resp.ok ? await resp.json() : [];
        if (!Array.isArray(laudos) || laudos.length === 0) {
            alert('Nenhum Folhão salvo encontrado pra essa peça ainda. Abra o Folhão e clique em "Salvar" primeiro.');
            return;
        }
        htmlPDF = laudos[0].html;
    } catch (e) {
        console.error("Erro ao buscar laudo salvo pra imprimir (Segmento Zero):", e);
        alert(`❌ Não consegui buscar o Folhão salvo pra imprimir.\n\nMotivo: ${e.message}`);
        return;
    }

    const item = window.BANCO_ATIVOS.find(a => a.id === tag);
    if (item) {
        item.ton = 0;
        item.dias = 0;
        item.local = "Oficina / Reserva";
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(window.BANCO_ATIVOS));
        if (typeof window.salvarPecaNoPython === 'function') {
            await window.salvarPecaNoPython(item);
        }
    }

    finalizarRascunhoFolhao(tag, "Segmento Zero");
    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Reparo concluído — Folhão de manutenção (Segmento Zero) impresso.`);

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = htmlPDF;

    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof renderPainelVeios === 'function') renderPainelVeios();
    if (typeof renderHistorico === 'function') renderHistorico();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
    if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();

    setTimeout(() => window.print(), 500);
};

console.log("✅ folhaoSegmentoZero.js carregado com o checklist oficial de Segmento Zero MCC 2/3.");