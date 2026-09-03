// ==============================================================
// folhaoSegmentoGrupo.js - Segmento Grupo 1, 2 e 3 (MCC 2/3)
// ==============================================================
// Os três grupos usam O MESMO checklist de chegada e saída (documento
// oficial "CHECK LIST GERAL SEGMENTOS GRUPO MCC 2 E 3"). Só muda:
//  - a tolerância do GAP (cada grupo tem um valor de referência diferente)
//  - a lista de materiais aplicados (cada grupo usa peças diferentes)
// Por isso um único módulo atende os 3, parametrizado pelo número do grupo.
// ==============================================================

import { BANCO_ATIVOS, resolverApiBase } from '../Core/banco.js?v=5';
import { renderAtivos, renderReparos, renderReservas } from '../ui.js';
import { restaurarRascunhoNoModal, ativarAutoSalvamentoFolhao, finalizarRascunhoFolhao } from './folhaoPersistencia.js';
import { MATERIAIS_SEG_GRUPO1, MATERIAIS_SEG_GRUPO2, MATERIAIS_SEG_GRUPO3 } from '../Oficina/dadosMateriaisSegmentoGrupo.js';
import { buscarPonteChecklist, preencherCamposFolhao, ligarListenerEdicaoManualFolhao, mostrarAvisoPreenchimentoChecklist } from '../Core/checklistFolhaoPonte.js';

let ID_FOLHAO_SEGGRUPO_ATUAL = null;

// 🆕 Contexto da ponte com o Checklist de Execução do folhão aberto no
// momento — mesmo padrão do PONTE_CHECKLIST_M4 (folhaoMolde4.js).
let PONTE_CHECKLIST_SEGGRUPO = { execucaoId: null, tipoEquipamento: null, mapaCampoParaEtapa: {} };
let GRUPO_ATUAL = "1";

function getV(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}
function getRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (const r of radios) if (r.checked) return r.value;
    return 'NÃO';
}
function getChecked(id) {
    const el = document.getElementById(id);
    return el && el.checked;
}

// Tolerância de GAP por grupo (do documento oficial)
const GAP_TOLERANCIA = {
    "1": "261,50 / 261,40 mm",
    "2": "261,00 / 260,90 mm",
    "3": "260,50 / 260,40 mm"
};

function getMateriaisPorGrupo(grupo) {
    if (grupo === "2") return MATERIAIS_SEG_GRUPO2;
    if (grupo === "3") return MATERIAIS_SEG_GRUPO3;
    return MATERIAIS_SEG_GRUPO1;
}

function detectarGrupo(item) {
    // Detecta o número do grupo pelo tipo cadastrado ("Grupo 1", "Grupo 2"...)
    // ou, na falta disso, pelo próprio ID do equipamento (ex: GRP2-2D).
    const tipo = (item.tipo || '').toUpperCase();
    let m = tipo.match(/GRUPO\s*([123])/);
    if (m) return m[1];
    m = (item.id || '').toUpperCase().match(/GRP\s*([123])/);
    if (m) return m[1];
    return "1";
}

// ==============================================================
// 1. CHECKLIST DE CHEGADA (idêntico pros 3 grupos)
// ==============================================================
const itensChegadaSegGrupo = [
    { grupo: "LUBRIFICAÇÃO", desc: "Válvulas funcionam normalmente, sem vazamentos." },
    { grupo: "", desc: "Tubulações sem amassados ou danificada." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "", desc: "Mancais lubrificados." },
    { grupo: "REFRIGERAÇÃO", desc: "Bicos dos resfriadores desobstruídos." },
    { grupo: "", desc: "Resfriadores isentos de empenos." },
    { grupo: "", desc: "Resfriadores completos conforme especificado." },
    { grupo: "", desc: "Juntas rotativas isentas de obstrução." },
    { grupo: "", desc: "Flexíveis estão perfeitos, sem avarias." },
    { grupo: "", desc: "Furo de refrigeração dos rolos sem obstrução." },
    { grupo: "", desc: "Pontas de refrigeração isentas de obstrução." },
    { grupo: "PORCA", desc: "Isento de vazamentos." },
    { grupo: "", desc: "Conexões apertadas." },
    { grupo: "", desc: "Chavetas fixas com contra pino." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "ESTRUTURA", desc: "Proteções em perfeito estado, sem avarias." },
    { grupo: "", desc: "Guias laterais em perfeito estado." },
    { grupo: "", desc: "Rolos quebrados." },
    { grupo: "", desc: "Rolamentos quebrados." },
    { grupo: "", desc: "Mancal solto." },
    { grupo: "", desc: "Rolos girando normalmente sem restrições." },
    { grupo: "", desc: "Parafusos de fixação dos mancais todos quebrados." },
    { grupo: "", desc: "Roletes da estrutura girando normalmente." },
    { grupo: "CILINDRO", desc: "Isento de vazamentos." },
    { grupo: "", desc: "Isento de passagem interna." },
    { grupo: "", desc: "Flexível apertado e distorcido." },
    { grupo: "", desc: "Tubulações isentas de vazamentos." }
];

// ==============================================================
// 2. CHECKLIST DE SAÍDA (idêntico pros 3 grupos)
// ==============================================================
const itensSaidaSegGrupo = [
    { grupo: "LUBRIFICAÇÃO", desc: "Tubulações, distribuidores isentos de vazamentos." },
    { grupo: "", desc: "Mancais lubrificados." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "", desc: "Pressão de referência para teste: 110 kgf/cm²." },
    { grupo: "", desc: "Tubulações em inox." },
    { grupo: "REFRIGERAÇÃO", desc: "Cangalhas alinhadas, destorcidas e na posição correta." },
    { grupo: "", desc: "Bicos novos, conforme especificado." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "", desc: "Juntas rotativas fixadas corretamente." },
    { grupo: "", desc: "Alinhamento dos resfriadores da base inferior e bicos verificado (1780 SEG 1/2/3 INF+SUP, 1780 SEG 4-6 INF, 1480 SEG 4-6 SUP)." },
    { grupo: "", desc: "Refrigeração interna bem fixada e alinhada." },
    { grupo: "", desc: "Tubos de refrigeração isento de empeno." },
    { grupo: "PORCA HIDRÁULICA", desc: "Isento de vazamentos." },
    { grupo: "", desc: "Conexões apertadas." },
    { grupo: "", desc: "Chavetas fixas com contra pino." },
    { grupo: "", desc: "Altura do êmbolo conforme desenho." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "ESTRUTURA", desc: "Tubulação em inox, testada com 300 kgf/cm²." },
    { grupo: "", desc: "Revestida com inox as bases dos rolos." },
    { grupo: "", desc: "Guias ajustadas a 865,5 ± 1,0 mm da linha centro da mesa do rolo." },
    { grupo: "", desc: "Distância entre guias de 1731 ± 2,00 mm." },
    { grupo: "", desc: "GAP de acordo com desenho." },
    { grupo: "", desc: "Pass line de acordo com desenho." },
    { grupo: "", desc: "Lane do mancal quadrado com 1mm de folga para o mancal do rolo puxador." },
    { grupo: "", desc: "Acoplamento em conformidade com o desenho." },
    { grupo: "", desc: "Chaveta dos mancais na altura correta." },
    { grupo: "", desc: "Parafuso de fixação dos mancais estão apertados." },
    { grupo: "", desc: "Rolos girando normalmente sem restrições." },
    { grupo: "", desc: "Roletes girando normalmente e lubrificados." },
    { grupo: "", desc: "Cordões de solda da guia lateral isentos de trincas e desgaste." },
    { grupo: "CILINDRO", desc: "Testados e isento de vazamentos." },
    { grupo: "", desc: "Isentos de passagem interna." },
    { grupo: "", desc: "Curso de 100 mm." },
    { grupo: "", desc: "Flexíveis apertados e distorcidos." },
    { grupo: "", desc: "Sem vazamento nas soldas, conexões, tubulações, porcas hidráulicas e cilindros, e sem passagem interna." },
    { grupo: "", desc: "Pressão de teste: 310 kgf/cm² (porcas) e 270 kgf/cm² (cilindros)." }
];

// ==============================================================
// 3. RENDERIZAÇÃO — checklist padrão (mesmo estilo dos outros folhões)
// ==============================================================
function renderizarChecklistSegGrupo(containerId, itens, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<table class="premium-table" style="font-size:11px;">
        <thead><tr><th style="width:6%;">ITEM</th><th>DESCRIÇÃO</th><th style="width:10%;">SIM</th><th style="width:10%;">NÃO</th></tr></thead><tbody>`;
    itens.forEach((it, i) => {
        html += `<tr><td style="text-align:center; font-weight:bold;">${String(i + 1).padStart(2, '0')}</td>
            <td>${it.grupo ? `<b style="color:var(--text-accent);">${it.grupo}</b><br>` : ''}${it.desc}</td>
            <td style="text-align:center;"><input type="radio" name="${prefix}-${i}" value="SIM" checked></td>
            <td style="text-align:center;"><input type="radio" name="${prefix}-${i}" value="NÃO"></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderizarGapSegGrupo(containerId, prefix, grupo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<p style="font-size:11px; color:var(--text-muted);">Tolerância de referência do Grupo ${grupo}: <b>${GAP_TOLERANCIA[grupo]}</b></p>
    <table class="premium-table" style="font-size:11px; max-width:500px;">
        <thead><tr><th>CONJ. ROLO</th><th>Posição A</th><th>Posição B</th><th>Posição C</th></tr></thead><tbody>`;
    for (let i = 1; i <= 5; i++) {
        html += `<tr><td style="text-align:center; font-weight:bold;">${i}</td>
            <td><input id="${prefix}-a-${i}" class="w-100"></td>
            <td><input id="${prefix}-b-${i}" class="w-100"></td>
            <td><input id="${prefix}-c-${i}" class="w-100"></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderizarDiametroRolos(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const baseTable = (baseLabel, basePrefix) => {
        let h = `<h4 style="margin:10px 0; color:var(--text-accent);">Base ${baseLabel}</h4>
        <table class="premium-table" style="font-size:11px; max-width:300px;"><thead><tr><th>Nº ROLO</th><th>Medida (D)</th></tr></thead><tbody>`;
        for (let i = 1; i <= 5; i++) {
            h += `<tr><td style="text-align:center;">${i}ª</td><td><input id="${prefix}-${basePrefix}-${i}" class="w-100"></td></tr>`;
        }
        return h + `</tbody></table>`;
    };
    container.innerHTML = `<div style="display:flex; gap:20px; flex-wrap:wrap;">
        <div>${baseTable('Superior', 'sup')}</div>
        <div>${baseTable('Inferior', 'inf')}</div>
    </div>`;
}

function renderizarRolamentosQuebrados(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const baseTable = (baseLabel, basePrefix) => {
        let h = `<h4 style="margin:10px 0; color:var(--text-accent);">Rolamento quebrado — Base ${baseLabel}</h4>
        <table class="premium-table" style="font-size:11px;"><thead><tr><th>MANCAL</th>${[1,2,3,4,5].map(r => `<th>Rolo ${r}</th>`).join('')}</tr></thead><tbody>
            <tr><td style="font-weight:bold;">1 (FIXO)</td>${[1,2,3,4,5].map(r => `<td style="text-align:center;"><input type="checkbox" id="${prefix}-${basePrefix}-fixo-${r}"></td>`).join('')}</tr>
            <tr><td style="font-weight:bold;">2 (MÓVEL)</td>${[1,2,3,4,5].map(r => `<td style="text-align:center;"><input type="checkbox" id="${prefix}-${basePrefix}-movel-${r}"></td>`).join('')}</tr>
        </tbody></table>`;
        return h;
    };
    container.innerHTML = `${baseTable('Superior', 'sup')}${baseTable('Inferior', 'inf')}`;
}

function renderizarRolamentosMontados(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const baseTable = (baseLabel, basePrefix) => {
        let h = `<h4 style="margin:10px 0; color:var(--text-accent);">Rolamentos montados — Base ${baseLabel}</h4>
        <table class="premium-table" style="font-size:10px;"><thead><tr><th>MANCAL</th>${[1,2,3,4,5].map(r => `<th colspan="2">Rolo ${r}</th>`).join('')}</tr>
        <tr><th></th>${[1,2,3,4,5].map(() => `<th>Novo</th><th>Reut.</th>`).join('')}</tr></thead><tbody>
            <tr><td style="font-weight:bold;">1 (FIXO)</td>${[1,2,3,4,5].map(r => `<td style="text-align:center;"><input type="checkbox" id="rm-${basePrefix}-fixo-${r}-novo"></td><td style="text-align:center;"><input type="checkbox" id="rm-${basePrefix}-fixo-${r}-reut"></td>`).join('')}</tr>
            <tr><td style="font-weight:bold;">2 (MÓVEL)</td>${[1,2,3,4,5].map(r => `<td style="text-align:center;"><input type="checkbox" id="rm-${basePrefix}-movel-${r}-novo"></td><td style="text-align:center;"><input type="checkbox" id="rm-${basePrefix}-movel-${r}-reut"></td>`).join('')}</tr>
        </tbody></table>`;
        return h;
    };
    container.innerHTML = `${baseTable('Superior', 'sup')}${baseTable('Inferior', 'inf')}`;
}

function renderizarCilindrosHidraulicos(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const linhaMotriz = (pos) => `<tr><td style="text-align:center; font-weight:bold;">${pos}</td>
        <td><input id="cil-motriz-${pos}-num" class="w-100"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-motriz-${pos}-novo"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-motriz-${pos}-rep"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-motriz-${pos}-reut"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-motriz-${pos}-prod"></td></tr>`;
    const linhaClamp = (pos) => `<tr><td style="text-align:center; font-weight:bold;">${pos}</td>
        <td><input id="cil-clamp-${pos}-num" class="w-100"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-clamp-${pos}-novo"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-clamp-${pos}-rep"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-clamp-${pos}-reut"></td>
        <td style="text-align:center;"><input type="checkbox" id="cil-clamp-${pos}-prod"></td></tr>`;

    container.innerHTML = `
        <h4 style="margin:10px 0; color:var(--text-accent);">Cilindros Motriz</h4>
        <table class="premium-table" style="font-size:11px;"><thead><tr><th>Posição</th><th>Número</th><th>Novo</th><th>Reparado</th><th>Reutilizado</th><th>Produção</th></tr></thead>
        <tbody>${linhaMotriz('A')}${linhaMotriz('B')}</tbody></table>

        <h4 style="margin:20px 0 10px; color:var(--text-accent);">Cilindros Clamp (Porcas)</h4>
        <table class="premium-table" style="font-size:11px;"><thead><tr><th>Posição</th><th>Número</th><th>Novo</th><th>Reparado</th><th>Reutilizado</th><th>Produção</th></tr></thead>
        <tbody>${[1,2,3,4].map(linhaClamp).join('')}</tbody></table>
    `;
}

function renderizarMateriaisSegGrupo(containerId, grupo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const materiais = getMateriaisPorGrupo(grupo);
    let html = `<table class="premium-table" style="font-size:11px;">
        <thead><tr><th>Código</th><th>Descrição</th><th style="width:15%;">Aplicado?</th><th style="width:15%;">Quantidade</th></tr></thead><tbody>`;
    materiais.forEach((mat, i) => {
        html += `<tr><td style="font-family:monospace;">${mat.codigo}</td><td>${mat.descricao}</td>
            <td style="text-align:center;"><input type="checkbox" id="segg-mat-${i}-aplicado"></td>
            <td><input type="number" id="segg-mat-${i}-qtd" style="width:70px;" placeholder="Qtd"></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ==============================================================
// 4. ABRIR / FECHAR / TROCAR ABA
// ==============================================================
window.abrirFolhaoSegmentoGrupo = function (id) {
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) { alert('Equipamento não encontrado!'); return; }

    ID_FOLHAO_SEGGRUPO_ATUAL = id;
    GRUPO_ATUAL = detectarGrupo(item);

    const modal = document.getElementById('modal-folhao-seg-grupo');
    if (!modal) { alert('Modal do Segmento Grupo não encontrado!'); return; }

    document.getElementById('segg-tag-name').value = id;
    document.getElementById('segg-grupo-label').innerText = `Grupo ${GRUPO_ATUAL}`;
    document.getElementById('segg-data-inicio').valueAsDate = new Date();
    document.getElementById('segg-data-fim').valueAsDate = new Date();
    document.getElementById('segg-motivo').value = '';

    renderizarChecklistSegGrupo('segg-container-chegada', itensChegadaSegGrupo, 'segg-cheg');
    renderizarGapSegGrupo('segg-container-gap-chegada', 'segg-gap-cheg', GRUPO_ATUAL);
    renderizarDiametroRolos('segg-container-diametro-chegada', 'segg-diam-cheg');
    renderizarRolamentosQuebrados('segg-container-rolquebrado-chegada', 'segg-rq-cheg');

    renderizarChecklistSegGrupo('segg-container-saida', itensSaidaSegGrupo, 'segg-sai');
    renderizarGapSegGrupo('segg-container-gap-saida', 'segg-gap-sai', GRUPO_ATUAL);
    renderizarDiametroRolos('segg-container-diametro-saida', 'segg-diam-sai');
    renderizarRolamentosMontados('segg-container-rolmontado-saida');
    renderizarCilindrosHidraulicos('segg-container-cilindros');

    renderizarMateriaisSegGrupo('segg-container-materiais', GRUPO_ATUAL);

    modal.classList.remove('hidden');
    const firstTab = modal.querySelector('.folhao-tab');
    if (firstTab) window.trocarAbaSegGrupo({ currentTarget: firstTab }, 'segg-aba-chegada');

    // Restaura progresso salvo (ex: chegada já feita, aguardando saída)
    // e liga o auto-salvamento pra nada mais se perder.
    restaurarRascunhoNoModal('modal-folhao-seg-grupo', id);
    ativarAutoSalvamentoFolhao('modal-folhao-seg-grupo', id, `Segmento Grupo ${GRUPO_ATUAL}`);

    // 🆕 PONTE COM O CHECKLIST DE EXECUÇÃO — autopreenche os campos já
    // respondidos lá (ver '../Core/checklistFolhaoPonte.js').
    preencherFolhaoSegGrupoComChecklistExecucao(id);
};

async function preencherFolhaoSegGrupoComChecklistExecucao(id) {
    ligarListenerEdicaoManualFolhao('modal-folhao-seg-grupo', () => PONTE_CHECKLIST_SEGGRUPO);
    try {
        const item = BANCO_ATIVOS.find(a => a.id === id);
        const ponte = await buscarPonteChecklist(id, item);
        if (!ponte) return;
        PONTE_CHECKLIST_SEGGRUPO = ponte;

        const camposProtegidos = new Set([
            'segg-tag-name', 'segg-num-segmento', 'segg-veio', 'segg-desempenho',
            'segg-motivo', 'segg-tipo-execucao', 'segg-data-inicio', 'segg-data-fim'
        ]);

        const { preenchidos, naoEncontrados } = preencherCamposFolhao(ponte.valores, camposProtegidos);
        if (preenchidos > 0 || naoEncontrados > 0) {
            mostrarAvisoPreenchimentoChecklist(preenchidos, naoEncontrados);
        }
    } catch (e) {
        console.error('⚠️ Não consegui puxar os valores do Checklist de Execução pro folhão (Segmento Grupo):', e);
    }
}

window.fecharFolhaoSegmentoGrupo = function () {
    const modal = document.getElementById('modal-folhao-seg-grupo');
    if (modal) modal.classList.add('hidden');
    ID_FOLHAO_SEGGRUPO_ATUAL = null;
};

window.trocarAbaSegGrupo = function (evt, abaId) {
    const modal = document.getElementById('modal-folhao-seg-grupo');
    if (!modal) return;
    modal.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    modal.querySelectorAll('.folhao-tab').forEach(b => b.classList.remove('active'));
    const aba = document.getElementById(abaId);
    if (aba) aba.classList.remove('hidden');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
};

// ==============================================================
// 5. MONTA O HTML DO LAUDO (PDF) - SEGMENTO GRUPO 1/2/3
// ==============================================================
function montarHtmlLaudoSegGrupo(tag) {
    const grupo = GRUPO_ATUAL;
    const dtIni = getV('segg-data-inicio') || new Date().toLocaleDateString('pt-BR');
    const dtFim = getV('segg-data-fim') || new Date().toLocaleDateString('pt-BR');
    const numSeg = getV('segg-num-segmento') || '______';
    const veio = getV('segg-veio') || '';
    const desempenho = getV('segg-desempenho') || '';
    const motivo = getV('segg-motivo') || '_______________';
    const tipoExec = getV('segg-tipo-execucao') || 'GERAL';

    // Monta o PDF (padrão visual igual aos demais folhões)
    const gerarTabelaChecklistPDF = (itens, prefix) => {
        let h = `<table><tr><th style="width:6%;">ITEM</th><th>DESCRIÇÃO</th><th style="width:10%;">SIM</th><th style="width:10%;">NÃO</th></tr>`;
        itens.forEach((it, i) => {
            const v = getRadioValue(`${prefix}-${i}`);
            h += `<tr><td style="text-align:center;">${String(i + 1).padStart(2, '0')}</td>
                <td>${it.grupo ? `<b>${it.grupo}</b><br>` : ''}${it.desc}</td>
                <td style="text-align:center; font-weight:bold;">${v === 'SIM' ? 'X' : ''}</td>
                <td style="text-align:center; font-weight:bold;">${v === 'NÃO' ? 'X' : ''}</td></tr>`;
        });
        return h + `</table>`;
    };

    const gerarTabelaGapPDF = (prefix) => {
        let h = `<table><tr><th>CONJ. ROLO</th><th>Posição A</th><th>Posição B</th><th>Posição C</th></tr>`;
        for (let i = 1; i <= 5; i++) {
            h += `<tr><td style="text-align:center;">${i}</td>
                <td style="text-align:center;">${getV(`${prefix}-a-${i}`)}</td>
                <td style="text-align:center;">${getV(`${prefix}-b-${i}`)}</td>
                <td style="text-align:center;">${getV(`${prefix}-c-${i}`)}</td></tr>`;
        }
        return h + `</table>`;
    };

    const gerarTabelaDiametroPDF = (prefix) => {
        const baseTable = (label, basePrefix) => {
            let h = `<table><tr><th colspan="2">Base ${label}</th></tr><tr><th>Nº ROLO</th><th>Medida (D)</th></tr>`;
            for (let i = 1; i <= 5; i++) {
                h += `<tr><td style="text-align:center;">${i}ª</td><td style="text-align:center;">${getV(`${prefix}-${basePrefix}-${i}`)}</td></tr>`;
            }
            return h + `</table>`;
        };
        return `<div style="display:flex; gap:10px;"><div style="width:50%;">${baseTable('Superior', 'sup')}</div><div style="width:50%;">${baseTable('Inferior', 'inf')}</div></div>`;
    };

    const gerarTabelaMateriaisPDF = () => {
        const materiais = getMateriaisPorGrupo(grupo);
        let h = `<table><tr><th>Código</th><th>Descrição</th><th style="width:12%;">Aplicado</th><th style="width:12%;">Qtd</th></tr>`;
        materiais.forEach((mat, i) => {
            const aplicado = getChecked(`segg-mat-${i}-aplicado`) ? 'X' : '';
            const qtd = getV(`segg-mat-${i}-qtd`);
            h += `<tr><td>${mat.codigo}</td><td>${mat.descricao}</td><td style="text-align:center;">${aplicado}</td><td style="text-align:center;">${qtd}</td></tr>`;
        });
        return h + `</table>`;
    };

    const htmlPDF = `
    <style>
        /* 🔧 CORREÇÃO (mesmo problema já resolvido no Molde MCC4 e na
           Cadeira/Desempenadeira): sem print-color-adjust, o navegador
           não imprime cor de fundo a menos que o usuário marque
           "Gráficos de segundo plano" na hora de imprimir — as barras
           azuis dos títulos saíam cinza sem cor nenhuma. */
        .pdf-base { font-family: Arial, sans-serif; font-size: 9px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .pdf-base *, .pdf-base *::before, .pdf-base *::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .pdf-base table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .pdf-base th, .pdf-base td { border: 1px solid #000; padding: 3px; }
        .pdf-base th { background: #e0e0e0; text-align: center; font-weight: bold; font-size: 9px; }
        .pdf-base .titulo-secao { background: #002b5e; color: #fff; font-weight: bold; padding: 4px; text-align: left; margin: 10px 0 4px 0; border: 1px solid #000; font-size: 10px; text-transform: uppercase; }
        @media print { .quebra-pagina { break-before: page; page-break-before: always; margin-top: 10px; } }
    </style>
    <div class="pdf-base">
        <div style="display: flex; border: 2px solid #000; border-bottom: 5px solid #002b5e; margin-bottom: 8px; align-items: center;">
            <div style="width: 20%; text-align: center; border-right: 2px solid #000; padding: 8px;"><span style="font-weight: 900; font-size: 28px; color: #002b5e; letter-spacing: -2px;">CSN</span></div>
            <div style="width: 60%; text-align: center; padding: 8px;">
                <h2 style="margin: 0; font-size: 12px; color: #000;">CHECK LIST GERAL - SEGMENTO GRUPO ${grupo} (MCC 2/3)</h2>
                <p style="margin: 4px 0 0 0; font-size: 8px; font-weight: bold;">DATA INÍCIO: ${dtIni} | DATA FIM: ${dtFim}</p>
            </div>
            <div style="width: 20%; font-size: 9px; border-left: 2px solid #000; padding: 8px; font-weight: bold;">TAG: ${tag}</div>
        </div>

        <table style="margin-bottom: 15px; border: 2px solid #000;">
            <tr>
                <td style="width: 20%;"><strong>Nº SEGMENTO:</strong> ${numSeg}</td>
                <td style="width: 15%;"><strong>VEIO:</strong> ${veio}</td>
                <td style="width: 15%;"><strong>DESEMPENHO:</strong> ${desempenho}</td>
                <td style="width: 25%;"><strong>MOTIVO:</strong> ${motivo}</td>
                <td style="width: 25%; color: #002b5e;"><strong>EXECUÇÃO:</strong> ${tipoExec}</td>
            </tr>
        </table>

        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA</div>
        ${gerarTabelaChecklistPDF(itensChegadaSegGrupo, 'segg-cheg')}

        <div class="titulo-secao">2. AFASTAMENTO ENTRE ROLOS (GAP) — CHEGADA</div>
        <p>Tolerância de referência do Grupo ${grupo}: <b>${GAP_TOLERANCIA[grupo]}</b></p>
        ${gerarTabelaGapPDF('segg-gap-cheg')}

        <div class="titulo-secao">3. DIÂMETRO DOS ROLOS — CHEGADA</div>
        ${gerarTabelaDiametroPDF('segg-diam-cheg')}
        <div class="assinatura-box">DATA: ____/____/____ NOME:______________________________________ MATRÍCULA:_________</div>

        <div class="quebra-pagina"></div>
        <div class="titulo-secao">4. INSPEÇÃO DE SAÍDA</div>
        ${gerarTabelaChecklistPDF(itensSaidaSegGrupo, 'segg-sai')}

        <div class="titulo-secao">5. AFASTAMENTO ENTRE ROLOS (GAP) — SAÍDA</div>
        ${gerarTabelaGapPDF('segg-gap-sai')}

        <div class="titulo-secao">6. DIÂMETRO DOS ROLOS — SAÍDA</div>
        ${gerarTabelaDiametroPDF('segg-diam-sai')}

        <div class="quebra-pagina"></div>
        <div class="titulo-secao">7. MATERIAIS APLICADOS (SEGMENTO GRUPO ${grupo})</div>
        ${gerarTabelaMateriaisPDF()}
        <div class="assinatura-box">DATA: ____/____/____ NOME:______________________________________ MATRÍCULA:_________</div>

        <div style="margin-top:40px; display:flex; justify-content:space-around; text-align:center; font-size:10px; font-weight:bold;">
            <div><p>___________________________________</p><p>Assinatura Mecânica / Operador</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    </div>`;

    return htmlPDF;
}

// ==============================================================
// 🆕 PRÉ-VISUALIZAR (sem salvar, sem precisar concluir 100%)
// ==============================================================
// Mesmo padrão dos demais Folhões — faltava aqui, então o botão
// "Pré-visualizar" caía no alert genérico pro Segmento Grupo.
window.previsualizarFolhaoSegGrupo = function () {
    if (!ID_FOLHAO_SEGGRUPO_ATUAL) { alert("Nenhuma TAG carregada."); return; }
    const htmlPreview = montarHtmlLaudoSegGrupo(ID_FOLHAO_SEGGRUPO_ATUAL);
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
        win.document.write(htmlPreview);
        win.document.close();
    } else {
        alert('Seu navegador bloqueou a janela de pré-visualização (pop-up). Permita pop-ups pra este site e tente de novo.');
    }
};

// ==============================================================
// 6. SALVAR FOLHÃO - SEGMENTO GRUPO 1/2/3 (sem imprimir)
// ==============================================================
window.salvarFolhaoSegmentoGrupo = async function () {
    if (!ID_FOLHAO_SEGGRUPO_ATUAL) { alert('Nenhuma TAG carregada.'); return; }
    const tag = ID_FOLHAO_SEGGRUPO_ATUAL;
    const grupo = GRUPO_ATUAL;

    const htmlPDF = montarHtmlLaudoSegGrupo(tag);

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peca_id: tag, tipo: `Segmento Grupo ${grupo}`, html: htmlPDF, operador: "Sistema" })
        });
        if (!resp.ok) throw new Error("A API não confirmou o salvamento do laudo.");
    } catch (e) {
        console.error("Erro ao salvar laudo do Folhão (Segmento Grupo):", e);
        alert(`❌ Não consegui salvar o Folhão no banco.\n\nMotivo: ${e.message}\n\nSeu progresso continua salvo como rascunho — tente salvar de novo, ou confira sua conexão.`);
        return;
    }

    let rascunhoSalvoComSucesso = true;
    if (typeof window.salvarRascunhoFolhao === 'function' && typeof window.coletarDadosModal === 'function') {
        try {
            const resultado = await window.salvarRascunhoFolhao(tag, `Segmento Grupo ${grupo}`, window.coletarDadosModal("modal-folhao-seg-grupo"));
            rascunhoSalvoComSucesso = resultado !== false;
        } catch (e) {
            rascunhoSalvoComSucesso = false;
        }
    }

    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Folhão de manutenção (Segmento Grupo ${grupo}) salvo — aguardando conclusão do reparo.`);
    if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
        window.carregarStatusChecklistExecucaoReparo([tag], true);
    }
    if (typeof window.renderReparos === 'function') window.renderReparos();

    if (rascunhoSalvoComSucesso) {
        alert("✅ Folhão salvo. Assim que o Checklist de Execução estiver 100%, clique em \"Concluir\" para gerar e imprimir o documento final.");
    } else {
        alert("⚠️ O laudo foi gravado, mas NÃO consegui salvar o progresso do formulário pra reabrir depois. Confira sua conexão e clique em \"Salvar\" de novo antes de fechar.");
    }
    window.fecharFolhaoSegmentoGrupo();
};

// ==============================================================
// 7. CONCLUIR E IMPRIMIR - SEGMENTO GRUPO 1/2/3 (chamado pelo botão
// "Concluir" do Checklist de Execução, só depois de 100% + Folhão salvo)
// ==============================================================
window.concluirEImprimirFolhaoSegmentoGrupo = async function (tag) {
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
        console.error("Erro ao buscar laudo salvo pra imprimir (Segmento Grupo):", e);
        alert(`❌ Não consegui buscar o Folhão salvo pra imprimir.\n\nMotivo: ${e.message}`);
        return;
    }

    const item = BANCO_ATIVOS.find(a => a.id === tag);
    if (item) {
        item.local = "Oficina / Reserva";
        item.ton = 0;
        item.dias = 0;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/atualizar_peca`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: tag, local: "Oficina / Reserva", tonelagem: 0, dias: 0, status: "Reserva" })
        });
    } catch (e) {
        console.error("Erro ao atualizar peça na nuvem (Segmento Grupo):", e);
    }

    finalizarRascunhoFolhao(tag, "Segmento de Grupo");
    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Reparo concluído — Folhão de manutenção (Segmento de Grupo) impresso.`);

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = htmlPDF;

    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();

    setTimeout(() => window.print(), 500);
};

console.log("✅ folhaoSegmentoGrupo.js carregado – Segmento Grupo 1/2/3 (MCC 2/3) com checklist único.");