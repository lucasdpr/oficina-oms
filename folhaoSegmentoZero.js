// ==========================================
// folhaoSegmentoZero.js - COMPLETO E ÚNICO
// Segmento Zero (MCC 2/3)
// ==========================================

import { BANCO_ATIVOS } from './banco.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

// ==========================================
// VARIÁVEIS GLOBAIS DO MÓDULO
// ==========================================
let ID_SEGMENTO_ZERO_ATUAL = null;

// ==========================================
// 1. ABRIR E FECHAR MODAL
// ==========================================
export function abrirFolhaoSegmentoZero(id) {
    ID_SEGMENTO_ZERO_ATUAL = id;
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-folhao-segmento-zero');
    if (!modal) return;

    // Preenche cabeçalho
    document.getElementById('segzero-tag-ativo').innerText = id;
    document.getElementById('segzero-data-inicio').valueAsDate = new Date();
    document.getElementById('segzero-data-fim').valueAsDate = new Date();

    // Renderiza todas as abas
    renderizarChegada();
    renderizarGap('chegada');
    renderizarMedidas();
    renderizarMancais();
    renderizarPassLine('chegada');
    renderizarSaida();
    renderizarMateriais();

    modal.classList.remove('hidden');
    trocarAbaSegZero(null, 'segzero-aba-dados');
}

export function fecharFolhaoSegmentoZero() {
    document.getElementById('modal-folhao-segmento-zero').classList.add('hidden');
    ID_SEGMENTO_ZERO_ATUAL = null;
}

// ==========================================
// 2. TROCA DE ABAS
// ==========================================
export function trocarAbaSegZero(event, idAba) {
    const container = document.getElementById('modal-folhao-segmento-zero');
    if (!container) return;

    container.querySelectorAll('.folhao-content').forEach(c => {
        c.classList.add('hidden');
        c.style.display = '';
    });
    container.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));

    const aba = document.getElementById(idAba);
    if (aba) {
        aba.classList.remove('hidden');
        aba.style.display = '';
        aba.classList.add('active');
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// ==========================================
// 3. FUNÇÃO AUXILIAR
// ==========================================
function getV(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// ==========================================
// 4. INSPEÇÃO DE CHEGADA
// ==========================================
const ITENS_CHEGADA = [
    'Distribuidores de graxa com vazamentos',
    'Distribuidores de graxa com agarramentos',
    'Tubulações de graxa amassadas ou danificadas',
    'Flexíveis com vazamentos e/ou avarias',
    'Tubulações de graxa (inox) com avarias',
    'Resfriadores com vazamento',
    'Resfriadores com empeno',
    'Bicos de spray obstruídos',
    'Tubulação com avarias',
    'Uniões com avarias',
    'Proteções dos parafusos em perfeito estado, sem avarias',
    'Rolamentos quebrados',
    'Mancais soltos e avariados',
    'Rolos girando normalmente sem restrições',
    'Estrutura com break-out'
];

function renderizarChegada() {
    const container = document.getElementById('segzero-aba-chegada');
    if (!container) return;

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Inspeção de Chegada</h3>
                <div class="checklist-container">`;
    ITENS_CHEGADA.forEach((desc, idx) => {
        const name = `chg-${idx}`;
        html += `<div class="check-item">
                    <p>${idx+1}. ${desc}</p>
                    <div class="check-options">
                        <label><input type="radio" name="${name}" value="SIM" checked> SIM</label>
                        <label><input type="radio" name="${name}" value="NÃO"> NÃO</label>
                    </div>
                 </div>`;
    });
    html += `</div>
             <div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-chegada" rows="3" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 5. GAP (CHEGADA E SAÍDA)
// ==========================================
function renderizarGap(tipo) {
    const container = document.getElementById('segzero-aba-gap');
    if (!container) return;

    const label = tipo === 'chegada' ? 'Chegada' : 'Saída';
    const rows = [1, 2, 3];
    const pref = tipo === 'chegada' ? 'cg' : 'sg';

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Aferição de Gap (${label})</h3>
                <p class="text-muted">Referência: 261,5 (-0,1) mm</p>
                <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th>Conj. Rolo</th><th>Referência</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr></thead>
                        <tbody>`;
    rows.forEach(i => {
        html += `<tr>
                    <td style="text-align:center;font-weight:bold;">${i}º Conj. Rolo</td>
                    <td style="text-align:center;">261,5 (-0,1)</td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-1" style="width:80px;"></td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-2" style="width:80px;"></td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-3" style="width:80px;"></td>
                </tr>`;
    });
    html += `</tbody></table></div>
             <div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-gap-${tipo}" rows="2" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 6. MEDIDAS DOS ROLOS (CHEGADA)
// ==========================================
function renderizarMedidas() {
    const container = document.getElementById('segzero-aba-medidas');
    if (!container) return;

    const bases = ['Superior', 'Inferior'];
    const pos = Array.from({ length: 10 }, (_, i) => i + 1);

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Inspeção Dimensional dos Rolos (Chegada)</h3>
                <p class="text-muted">Diâmetro: 140mm (máx) / 137mm (mín) | Empeno máximo: 0,5mm</p>`;

    bases.forEach(base => {
        const label = base.toLowerCase();
        html += `<h4 style="margin:20px 0 10px;color:var(--text-accent);">Base ${base}</h4>
                 <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th>Posição</th><th>N° Rolo</th><th>Diâmetro (mm)</th><th>Empeno (mm)</th><th>OK/NOK</th></tr></thead>
                        <tbody>`;
        pos.forEach(p => {
            html += `<tr>
                        <td style="text-align:center;font-weight:bold;">${p}ª</td>
                        <td><input type="text" id="md-${label}-num-${p}" style="width:70px;"></td>
                        <td><input type="number" step="0.01" id="md-${label}-diam-${p}" style="width:80px;"></td>
                        <td><input type="number" step="0.01" id="md-${label}-empeno-${p}" style="width:80px;"></td>
                        <td>
                            <select id="md-${label}-status-${p}" class="premium-select select-sm">
                                <option value="OK">OK</option>
                                <option value="NOK">NOK</option>
                            </select>
                        </td>
                    </tr>`;
        });
        html += `</tbody></table></div>`;
    });
    html += `<div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-medidas" rows="2" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 7. INSPEÇÃO DE MANCAIS (CHEGADA)
// ==========================================
function renderizarMancais() {
    const container = document.getElementById('segzero-aba-mancais');
    if (!container) return;

    const bases = ['Superior', 'Inferior'];
    const pos = Array.from({ length: 10 }, (_, i) => i + 1);

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Inspeção de Mancais (Chegada)</h3>`;

    bases.forEach(base => {
        const label = base.toLowerCase();
        html += `<h4 style="margin:20px 0 10px;color:var(--text-accent);">Base ${base}</h4>
                 <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th>Posição</th><th>Mancal 1</th><th>Mancal 2</th><th>Mancal 3</th></tr></thead>
                        <tbody>`;
        pos.forEach(p => {
            html += `<tr>
                        <td style="text-align:center;font-weight:bold;">${p}</td>
                        <td>
                            <select id="mc-${label}-${p}-1" class="premium-select select-sm">
                                <option value="OK">OK</option>
                                <option value="NOK">NOK</option>
                            </select>
                        </td>
                        <td>
                            <select id="mc-${label}-${p}-2" class="premium-select select-sm">
                                <option value="OK">OK</option>
                                <option value="NOK">NOK</option>
                            </select>
                        </td>
                        <td>
                            <select id="mc-${label}-${p}-3" class="premium-select select-sm">
                                <option value="OK">OK</option>
                                <option value="NOK">NOK</option>
                            </select>
                        </td>
                    </tr>`;
        });
        html += `</tbody></table></div>`;
    });
    html += `<div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-mancais" rows="2" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 8. PASS LINE (CHEGADA E SAÍDA)
// ==========================================
function renderizarPassLine(tipo) {
    const container = document.getElementById('segzero-aba-passline');
    if (!container) return;

    const label = tipo === 'chegada' ? 'Chegada' : 'Saída';
    const rows = Array.from({ length: 10 }, (_, i) => i + 1);
    const pref = tipo === 'chegada' ? 'plc' : 'pls';

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Pass Line - Base Inferior (${label})</h3>
                <p class="text-muted">Referência: 1 ± 0,05 mm</p>
                <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th>Conj. Rolo</th><th>Posição 1</th><th>Posição 2</th><th>Posição 3</th></tr></thead>
                        <tbody>`;
    rows.forEach(i => {
        html += `<tr>
                    <td style="text-align:center;font-weight:bold;">${i}°</td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-1" style="width:80px;"></td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-2" style="width:80px;"></td>
                    <td><input type="number" step="0.01" id="${pref}-${i}-3" style="width:80px;"></td>
                </tr>`;
    });
    html += `</tbody></table></div>
             <div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-passline-${tipo}" rows="2" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 9. INSPEÇÃO DE SAÍDA
// ==========================================
const ITENS_SAIDA = [
    'Distribuidores de graxa sem vazamentos, isentos de agarramento',
    'Mancais lubrificados',
    'Flexíveis apertados e distorcidos',
    'Pressão de teste entre 90 a 110 kgf/cm² (pressão de referência)',
    'Tubulações em inox, sem avarias',
    'Flexíveis isentos de vazamentos',
    'Resfriadores isentos de empenos',
    'Bicos de spray alinhados e isentos de obstruções',
    'Tubulação apertada sem avaria',
    'Teste de pressão lateral com 5kg/cm² (Pressão referência)',
    'Uniões apertadas isentas de vazamento e avarias',
    'Uniões montadas na tubulação 2" da cangalha inferior',
    'Proteções dos parafusos fixadas',
    'Estrutura jateada e pintada',
    'Gap em conformidade com o desenho',
    'Rolos girando normalmente sem restrições',
    'Chapa de proteção soldada'
];

function renderizarSaida() {
    const container = document.getElementById('segzero-aba-saida');
    if (!container) return;

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Inspeção de Saída</h3>
                <div class="checklist-container">`;
    ITENS_SAIDA.forEach((desc, idx) => {
        const name = `sai-${idx}`;
        html += `<div class="check-item">
                    <p>${idx+1}. ${desc}</p>
                    <div class="check-options">
                        <label><input type="radio" name="${name}" value="SIM" checked> SIM</label>
                        <label><input type="radio" name="${name}" value="NÃO"> NÃO</label>
                    </div>
                 </div>`;
    });
    html += `</div>
             <div class="input-group mt-15">
                <label>Observações</label>
                <textarea id="segzero-obs-saida" rows="3" class="premium-textarea"></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 10. MATERIAIS APLICADOS
// ==========================================
function renderizarMateriais() {
    const container = document.getElementById('segzero-aba-materiais');
    if (!container) return;

    const materiais = [
        { cod: '1205772', desc: 'ARRUELA DE PRESSÃO M16' },
        { cod: '1203902', desc: 'ARRUELA DE PRESSAO M24 DIN 127' },
        { cod: '1205307', desc: 'ARRUELA DE PRESSÃO M36' },
        { cod: '1203775', desc: 'ARRUELA LISA M64 X 66MM X 115MM' },
        { cod: '1777550', desc: 'BASE DESENHO HITACHI 0294000 MC.1 - PÉ' },
        { cod: '1660305', desc: 'CARCAÇA DESENHO HITACHI 0144798 MC1 INFERIOR' },
        { cod: '1660303', desc: 'CARCAÇA HITACHI 2245098 SUPERIOR' },
        { cod: '1672147', desc: 'CARCAÇA LATERAL HITACHI 2253621 MC.1' },
        { cod: '1672146', desc: 'CARCAÇA LATERAL HITACHI 2253621 MC.2' },
        { cod: '8288919', desc: 'CONEXÃO 1/4" COMPRESSÃO 188D-E-1' },
        { cod: '9140946', desc: 'CORPO CSN DM613216 1' },
        { cod: '1691878', desc: 'COTOVELO 1.1/4" X 90º ROSCA BSP' },
        { cod: '1064442', desc: 'COTOVELO 1/4" X 90º' },
        { cod: '8097039', desc: 'DISTRIBUIDOR GRAXA 3/8 X1/4" NPTF 2 SAID' },
        { cod: '1211859', desc: 'ENGATE RAPIDO 1.1/4"' },
        { cod: '1211500', desc: 'ENGATE RAPIDO 2"' },
        { cod: '1268070', desc: 'ENGATE RÁPIDO 3/8" - GRAXA' },
        { cod: '1195298', desc: 'FITA DE ARAMIDA 1" X 1,7MM X 30 METROS' },
        { cod: '1624645', desc: 'MANGUEIRA 3/8" X 1400MM (GRAXA)' },
        { cod: '1204966', desc: 'PARAF CB SEXT M16X140MM' },
        { cod: '1204620', desc: 'PARAFUSO CABEÇA SEXT.M12 X 45MM - INOX' },
        { cod: '8003560', desc: 'PARAFUSO CABEÇA SEXT.M16 X 70MM-INOX' },
        { cod: '1628930', desc: 'PARAFUSO CABEÇA SEXT.M16 X 90MM-INOX' },
        { cod: '1204624', desc: 'PARAFUSO CABEÇA SEXTAVADA M12 X 30MM' },
        { cod: '8010789', desc: 'PARAFUSO CABEÇA SEXTAVADA M16 X 115MM' },
        { cod: '1221020', desc: 'PARAFUSO CABEÇA SEXTAVADA M16 X 150MM' },
        { cod: '1615479', desc: 'PARAFUSO CABEÇA SEXTAVADA M16 X 160MM' }
    ];

    let html = `<h3 style="margin-bottom:15px;color:var(--text-heading);">Materiais Aplicados</h3>
                <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th>Código</th><th>Descrição</th><th style="width:120px;">Quantidade</th></tr></thead>
                        <tbody>`;
    materiais.forEach(m => {
        html += `<tr>
                    <td class="font-code">${m.cod}</td>
                    <td>${m.desc}</td>
                    <td><input type="number" id="mat-${m.cod}" class="w-100" min="0" step="1" value="0"></td>
                </tr>`;
    });
    html += `</tbody></table></div>
             <div class="input-group mt-15">
                <label>Outros materiais (descreva)</label>
                <textarea id="segzero-materiais-outros" rows="4" class="premium-textarea" placeholder="Adicione outros materiais não listados..."></textarea>
             </div>`;
    container.innerHTML = html;
}

// ==========================================
// 11. SALVAR LAUDO
// ==========================================
export function salvarFolhaoSegmentoZero() {
    if (!ID_SEGMENTO_ZERO_ATUAL) return alert('Nenhum segmento selecionado.');
    if (!window.verificarAcesso || !window.verificarAcesso()) return;

    const tag = ID_SEGMENTO_ZERO_ATUAL;
    const item = BANCO_ATIVOS.find(a => a.id === tag);
    if (!item) return alert('Equipamento não encontrado.');

    // Atualiza o item para Reserva
    item.ton = 0;
    item.dias = 0;
    item.local = 'Oficina / Reserva';
    localStorage.setItem('oms_ativos_v32_local', JSON.stringify(BANCO_ATIVOS));

    // Registra no histórico
    const motivo = getV('segzero-motivo') || 'Manutenção';
    window.registrarHistorico(tag, `Laudo Segmento Zero concluído. Motivo: ${motivo}`);

    // Atualiza interface
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();

    // Fecha o modal
    fecharFolhaoSegmentoZero();
    alert(`✅ Laudo do Segmento Zero [${tag}] salvo e enviado para Reserva.`);
}

// ==========================================
// 12. IMPRESSÃO EM PDF
// ==========================================
export function imprimirFolhaoSegmentoZero() {
    if (!ID_SEGMENTO_ZERO_ATUAL) return alert('Nenhum segmento selecionado.');

    const tag = ID_SEGMENTO_ZERO_ATUAL;
    const printDiv = document.getElementById('print-content');
    if (!printDiv) return;

    const dataInicio = getV('segzero-data-inicio') || new Date().toLocaleDateString('pt-BR');
    const dataFim = getV('segzero-data-fim') || new Date().toLocaleDateString('pt-BR');
    const veio = document.getElementById('segzero-veio')?.value || '';
    const motivo = getV('segzero-motivo') || 'Manutenção';

    let html = `
    <div style="border:2px solid #000; padding:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; font-family:Arial,sans-serif;">
        <div style="font-size:28px; font-weight:900; letter-spacing:2px;">CSN</div>
        <div style="text-align:center;">
            <div style="font-size:16px; font-weight:bold; text-decoration:underline;">CHECK LIST GERAL SEGMENTO ZERO (MCC 2/3)</div>
            <div style="font-size:12px;">Laudo Oficial de Manutenção</div>
        </div>
        <div style="font-size:11px; text-align:right; line-height:1.5;">
            <div><strong>TAG:</strong> ${tag}</div>
            <div><strong>INÍCIO:</strong> ${dataInicio}</div>
            <div><strong>FIM:</strong> ${dataFim}</div>
        </div>
    </div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-family:Arial,sans-serif; font-size:11px; border:1px solid #000;">
        <tr><td style="padding:4px; border:1px solid #000;"><strong>VEIO:</strong> ${veio}</td>
            <td style="padding:4px; border:1px solid #000;"><strong>MOTIVO:</strong> ${motivo}</td>
            <td style="padding:4px; border:1px solid #000;"><strong>TIPO:</strong> ${document.getElementById('segzero-tipo-execucao')?.value || 'GERAL'}</td></tr>
    </table>
    <div style="page-break-before:always;"></div>
    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">1. INSPEÇÃO DE CHEGADA</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:10px; border:1px solid #000;">`;

    ITENS_CHEGADA.forEach((desc, idx) => {
        const name = `chg-${idx}`;
        let valor = 'NÃO';
        document.getElementsByName(name).forEach(r => { if (r.checked) valor = r.value; });
        html += `<tr><td style="border:1px solid #000; padding:4px; width:5%; text-align:center;">${idx+1}</td>
                    <td style="border:1px solid #000; padding:4px;">${desc}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; font-weight:bold;">${valor}</td></tr>`;
    });
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-chegada') || 'Nenhuma'}
    </div>
    <div class="quebra-pagina" style="page-break-before:always;"></div>

    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">2. AFERIÇÃO DE GAP (CHEGADA)</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:10px; border:1px solid #000;">
        <tr><th style="border:1px solid #000; background:#ddd;">Conj. Rolo</th><th style="border:1px solid #000; background:#ddd;">Ref</th><th style="border:1px solid #000; background:#ddd;">Pos 1</th><th style="border:1px solid #000; background:#ddd;">Pos 2</th><th style="border:1px solid #000; background:#ddd;">Pos 3</th></tr>`;
    for (let i = 1; i <= 3; i++) {
        const v1 = getV(`cg-${i}-1`) || '-';
        const v2 = getV(`cg-${i}-2`) || '-';
        const v3 = getV(`cg-${i}-3`) || '-';
        html += `<tr><td style="border:1px solid #000; text-align:center; font-weight:bold;">${i}º</td>
                    <td style="border:1px solid #000; text-align:center;">261,5</td>
                    <td style="border:1px solid #000; text-align:center;">${v1}</td>
                    <td style="border:1px solid #000; text-align:center;">${v2}</td>
                    <td style="border:1px solid #000; text-align:center;">${v3}</td></tr>`;
    }
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-gap-chegada') || 'Nenhuma'}
    </div>
    <div class="quebra-pagina" style="page-break-before:always;"></div>

    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">3. MEDIDAS DOS ROLOS (CHEGADA)</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:9px; border:1px solid #000;">
        <tr><th style="border:1px solid #000; background:#ddd;">Base</th><th style="border:1px solid #000; background:#ddd;">Pos</th><th style="border:1px solid #000; background:#ddd;">N°</th><th style="border:1px solid #000; background:#ddd;">Diâmetro</th><th style="border:1px solid #000; background:#ddd;">Empeno</th><th style="border:1px solid #000; background:#ddd;">Status</th></tr>`;
    const bases = ['superior', 'inferior'];
    bases.forEach(base => {
        const label = base;
        for (let p = 1; p <= 10; p++) {
            const num = getV(`md-${label}-num-${p}`) || '-';
            const diam = getV(`md-${label}-diam-${p}`) || '-';
            const empeno = getV(`md-${label}-empeno-${p}`) || '-';
            const status = getV(`md-${label}-status-${p}`) || 'OK';
            html += `<tr><td style="border:1px solid #000; text-align:center; font-weight:bold;">${base.charAt(0).toUpperCase()+base.slice(1)}</td>
                        <td style="border:1px solid #000; text-align:center;">${p}ª</td>
                        <td style="border:1px solid #000; text-align:center;">${num}</td>
                        <td style="border:1px solid #000; text-align:center;">${diam}</td>
                        <td style="border:1px solid #000; text-align:center;">${empeno}</td>
                        <td style="border:1px solid #000; text-align:center; font-weight:bold;">${status}</td></tr>`;
        }
    });
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-medidas') || 'Nenhuma'}
    </div>
    <div class="quebra-pagina" style="page-break-before:always;"></div>

    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">4. INSPEÇÃO DE MANCAIS (CHEGADA)</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:9px; border:1px solid #000;">
        <tr><th style="border:1px solid #000; background:#ddd;">Base</th><th style="border:1px solid #000; background:#ddd;">Pos</th><th style="border:1px solid #000; background:#ddd;">Mancal 1</th><th style="border:1px solid #000; background:#ddd;">Mancal 2</th><th style="border:1px solid #000; background:#ddd;">Mancal 3</th></tr>`;
    bases.forEach(base => {
        const label = base;
        for (let p = 1; p <= 10; p++) {
            const m1 = getV(`mc-${label}-${p}-1`) || 'OK';
            const m2 = getV(`mc-${label}-${p}-2`) || 'OK';
            const m3 = getV(`mc-${label}-${p}-3`) || 'OK';
            html += `<tr><td style="border:1px solid #000; text-align:center; font-weight:bold;">${base.charAt(0).toUpperCase()+base.slice(1)}</td>
                        <td style="border:1px solid #000; text-align:center;">${p}</td>
                        <td style="border:1px solid #000; text-align:center; font-weight:bold;">${m1}</td>
                        <td style="border:1px solid #000; text-align:center; font-weight:bold;">${m2}</td>
                        <td style="border:1px solid #000; text-align:center; font-weight:bold;">${m3}</td></tr>`;
        }
    });
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-mancais') || 'Nenhuma'}
    </div>
    <div class="quebra-pagina" style="page-break-before:always;"></div>

    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">5. PASS LINE (CHEGADA)</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:9px; border:1px solid #000;">
        <tr><th style="border:1px solid #000; background:#ddd;">Conj.</th><th style="border:1px solid #000; background:#ddd;">Pos 1</th><th style="border:1px solid #000; background:#ddd;">Pos 2</th><th style="border:1px solid #000; background:#ddd;">Pos 3</th></tr>`;
    for (let i = 1; i <= 10; i++) {
        const v1 = getV(`plc-${i}-1`) || '-';
        const v2 = getV(`plc-${i}-2`) || '-';
        const v3 = getV(`plc-${i}-3`) || '-';
        html += `<tr><td style="border:1px solid #000; text-align:center; font-weight:bold;">${i}°</td>
                    <td style="border:1px solid #000; text-align:center;">${v1}</td>
                    <td style="border:1px solid #000; text-align:center;">${v2}</td>
                    <td style="border:1px solid #000; text-align:center;">${v3}</td></tr>`;
    }
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-passline-chegada') || 'Nenhuma'}
    </div>
    <div class="quebra-pagina" style="page-break-before:always;"></div>

    <div style="font-weight:bold; font-size:14px; margin:10px 0 5px 0; background:#002b5e; color:#fff; padding:4px 8px;">6. INSPEÇÃO DE SAÍDA</div>
    <table style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:10px; border:1px solid #000;">`;
    ITENS_SAIDA.forEach((desc, idx) => {
        const name = `sai-${idx}`;
        let valor = 'NÃO';
        document.getElementsByName(name).forEach(r => { if (r.checked) valor = r.value; });
        html += `<tr><td style="border:1px solid #000; padding:4px; width:5%; text-align:center;">${idx+1}</td>
                    <td style="border:1px solid #000; padding:4px;">${desc}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; font-weight:bold;">${valor}</td></tr>`;
    });
    html += `</table>
    <div style="margin-top:5px; padding:4px; border:1px solid #000; background:#f9f9f9; font-size:10px;">
        <strong>Observações:</strong> ${getV('segzero-obs-saida') || 'Nenhuma'}
    </div>
    <div style="margin-top:40px; display:flex; justify-content:space-around; text-align:center; font-size:12px; font-weight:bold; padding-bottom:30px;">
        <div><p>___________________________________</p><p>Líder Responsável</p></div>
        <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
    </div>`;

    printDiv.innerHTML = html;
    window.print();
}

// ==========================================
// 13. EXPOSIÇÃO GLOBAL
// ==========================================
window.abrirFolhaoSegmentoZero = abrirFolhaoSegmentoZero;
window.fecharFolhaoSegmentoZero = fecharFolhaoSegmentoZero;
window.trocarAbaSegZero = trocarAbaSegZero;
window.salvarFolhaoSegmentoZero = salvarFolhaoSegmentoZero;
window.imprimirFolhaoSegmentoZero = imprimirFolhaoSegmentoZero;

export default {
    abrirFolhaoSegmentoZero,
    fecharFolhaoSegmentoZero,
    trocarAbaSegZero,
    salvarFolhaoSegmentoZero,
    imprimirFolhaoSegmentoZero
};