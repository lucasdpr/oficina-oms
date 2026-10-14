// ==========================================================================
// VEIOS, ATIVOS, REPAROS, PRONTUÁRIO E SAQUE/SWAP — extraído de
// script.js na modularização
// ==========================================================================
// O núcleo original do sistema: configuração das máquinas (slots MCC),
// Sequenciamento de Veios, lista de Ativos/Reparos, o Prontuário
// individual de um equipamento (histórico + registro manual) e o fluxo
// de Saque/Reparo/Swap. Muito reaproveitado por outras telas (Painel
// do Supervisor incluído) via window.X.

import { resolverApiBase, salvarPecaNoPython, salvarHistoricoNoPython, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO, HISTORICO_ACOES, RASCUNHOS_IDS_ATIVOS, MATRICULAS_ADM, setFiltroCategoriaAuditoria } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { filtrarPorAreaTecnico } from '../Core/utils.js';
import { calcularDias, rotuloDesgaste } from '../Core/utils.js';
import { AREAS_OFICINA, MOTIVOS_RETIRO } from '../Core/dados.js';

// Estado só usado dentro deste módulo (Veio ativo no Sequenciamento,
// filtro de críticos, e o modal de relatório/prontuário).
let VEIO_SELECIONADO_PAINEL = "C";
let FILTRO_CRITICOS = false;
let MODO_MODAL_RELATORIO = {};
let ID_HISTORICO_ATUAL = null;

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================

// FUNÇÃO AUXILIAR PARA GERAR SLOTS MCC 2/3
function gerarSlotsMCC23() {
    const slots = [
        { id: "MOLDE", nome: "Molde Convencional", tipo: "Molde" },
        // 🆕 Mesa Osciladora — provisório, equipamento ainda não existe
        // fisicamente em nenhum veio (ver conversa de cadastro): 1 vaga
        // fixa por veio, ensanduichada entre Molde e Segmento Zero.
        { id: "MESA-OSC", nome: "Mesa Osciladora", tipo: "Mesa Osciladora" },
        { id: "SEG-ZERO", nome: "Segmento Zero", tipo: "Segmento Zero" }
    ];
    for (let i = 1; i <= 6; i++) {
        slots.push({ id: `SEG-${i}`, nome: `Segmento #${i}`, tipo: "Segmento" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-SUP-${i}`, nome: `Cadeira Superior ${i}`, tipo: "Cadeira Superior" });
    }
    for (let i = 43; i <= 79; i++) {
        slots.push({ id: `CAD-INF-${i}`, nome: `Cadeira Inferior ${i}`, tipo: "Cadeira Inferior" });
    }
    return slots;
}

// FUNÇÃO AUXILIAR PARA MAPEAR SLOTS LEGADO MCC 2/3
function mapearSlotLegadoMCC23(peca) {
    const tipo = (peca.tipo || "").toUpperCase();
    const id = (peca.id || "").toUpperCase();
    
    if (tipo.includes("MOLDE")) return "MOLDE";
    if (tipo.includes("MESA OSCILADORA")) return "MESA-OSC";
    if (tipo.includes("ZERO") || tipo.includes("SEG-0")) return "SEG-ZERO";

    if (tipo.includes("SEGMENTO") || tipo.includes("SEGMENTO")) {
        const match = id.match(/SEG-?(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 6) return `SEG-${num}`;
        }
    }
    if (tipo.includes("CADEIRA SUPERIOR") || tipo.includes("CAD-SUP")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-SUP-${num}`;
        }
    }
    if (tipo.includes("CADEIRA INFERIOR") || tipo.includes("CAD-INF")) {
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= 43 && num <= 79) return `CAD-INF-${num}`;
        }
    }
    return null;
}

// FUNÇÃO PARA GERAR SLOTS MCC 4
function gerarSlotsMCC4() {
    return [
        { id: "MOLDE", nome: "Molde Alta Perf.", tipo: "Molde" },
        // 🆕 Oscilador — provisório, equipamento ainda não existe
        // fisicamente em nenhum veio: pool de 6 unidades (OS1..OS6, 4
        // ativas + 2 reserva) que ocupam estas 2 vagas fixas (Norte/Sul)
        // via Swap, igual as 5 vagas do Bow logo abaixo.
        { id: "OSC-N", nome: "Oscilador Norte", tipo: "Oscilador" },
        { id: "OSC-S", nome: "Oscilador Sul", tipo: "Oscilador" },
        { id: "BENDER", nome: "Dobrador (Bender)", tipo: "Bender" },
        { id: "BOW-1", nome: "Curvo Bow #01", tipo: "Bow" },
        { id: "BOW-2", nome: "Curvo Bow #02", tipo: "Bow" },
        { id: "BOW-3", nome: "Curvo Bow #03", tipo: "Bow" },
        { id: "BOW-4", nome: "Curvo Bow #04", tipo: "Bow" },
        { id: "BOW-5", nome: "Curvo Bow #05", tipo: "Bow" },
        { id: "STR-1", nome: "Endireitador R1", tipo: "Straightener" },
        { id: "STR-2", nome: "Endireitador R2", tipo: "Straightener" },
        { id: "HOR-8", nome: "Segmento Horizontal #08", tipo: "Horizontal" },
        { id: "HOR-9", nome: "Segmento Horizontal #09", tipo: "Horizontal" },
        { id: "HOR-10", nome: "Segmento Horizontal #10", tipo: "Horizontal" },
        { id: "HOR-11", nome: "Segmento Horizontal #11", tipo: "Horizontal" },
        { id: "HOR-12", nome: "Segmento Horizontal #12", tipo: "Horizontal" },
        { id: "HOR-13", nome: "Segmento Horizontal #13", tipo: "Horizontal" },
        { id: "HOR-14", nome: "Segmento Horizontal #14", tipo: "Horizontal" },
        { id: "HOR-15", nome: "Segmento Horizontal #15", tipo: "Horizontal" },
        { id: "HOR-16", nome: "Segmento Horizontal #16", tipo: "Horizontal" },
        { id: "HOR-17", nome: "Segmento Horizontal #17", tipo: "Horizontal" }
    ];
}

// ==========================================================================
// CORREÇÃO DO MAPEAMENTO DE GAVETAS
// ==========================================================================
function mapearSlotLegadoMCC4(peca) {
    const tipoUpper = (peca.tipo || "").toUpperCase();
    const idUpper = (peca.id || "").toUpperCase();
    
    if (tipoUpper.includes("MOLDE")) return "MOLDE";
    if (tipoUpper.includes("BENDER")) return "BENDER";

    if (tipoUpper.includes("OSCILADOR")) {
        if (idUpper.includes("-S") || idUpper.includes("SUL")) return "OSC-S";
        return "OSC-N"; // padrão Norte se não der pra identificar o lado pelo ID
    }

    if (tipoUpper.includes("BOW")) {
        const match = idUpper.match(/BOW-(\d)/);
        if (match) return `BOW-${match[1]}`;
    }
    
    if (tipoUpper.includes("STRAIGHTENER")) {
        if (idUpper.includes("STR-1") || idUpper.includes("R1")) return "STR-1";
        if (idUpper.includes("STR-2") || idUpper.includes("R2")) return "STR-2";
    }
    
    if (tipoUpper.includes("HORIZONTAL")) {
        const match = idUpper.match(/HOR-(\d+)/);
        if (match) return `HOR-${match[1]}`;
    }
    return null;
}

// ==========================================
// CONFIGURAÇÕES DAS MÁQUINAS
// ==========================================
const CONFIGURACOES_MAQUINAS = {
    "C": {
        id: "MCC2_C",
        nome: "Máquina 2 - Veio C",
        mcc: "2",
        veio: "C",
        veioDisplay: "C",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "D": {
        id: "MCC2_D",
        nome: "Máquina 2 - Veio D",
        mcc: "2",
        veio: "D",
        veioDisplay: "D",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "E": {
        id: "MCC3_E",
        nome: "Máquina 3 - Veio E",
        mcc: "3",
        veio: "E",
        veioDisplay: "E",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "F": {
        id: "MCC3_F",
        nome: "Máquina 3 - Veio F",
        mcc: "3",
        veio: "F",
        veioDisplay: "F",
        slots: gerarSlotsMCC23(),
        mapearSlotLegado: mapearSlotLegadoMCC23
    },
    "H": {
        id: "MCC4_H",
        nome: "Máquina 4 - Veio H",
        mcc: "4",
        veio: "H",
        veioDisplay: "H",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    },
    "G": {
        id: "MCC4_G",
        nome: "Máquina 4 - Veio G",
        mcc: "4",
        veio: "G",
        veioDisplay: "G",
        slots: gerarSlotsMCC4(),
        mapearSlotLegado: mapearSlotLegadoMCC4
    }
};

function getConfiguracaoPorVeio(veio) {
    return CONFIGURACOES_MAQUINAS[veio] || null;
}

let ultimoVeioVisualizado = null;

function mudarVeioVisualizado(veio) {
    VEIO_SELECIONADO_PAINEL = veio;
    document.querySelectorAll('.btn-veio-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.btn-veio-tab').forEach(b => {
        if (b.textContent.includes(`Veio ${veio}`)) {
            b.classList.add('active');
        }
    });
    renderPainelVeios();
    const abaFluxo = document.getElementById('aba-fluxo');
    if (abaFluxo && !abaFluxo.classList.contains('active')) {
        window.abrirAba(null, 'aba-fluxo');
    }
}
window.mudarVeioVisualizado = mudarVeioVisualizado;

// ==========================================
// RENDERIZAÇÃO DE DADOS VEIOS E ATIVOS
// ==========================================
function renderPainelVeios() {
    const container = document.getElementById("container-fluxo-horizontal-scroll");
    const titulo = document.getElementById("titulo-veio-focado");
    if (!container || !titulo) {
        console.warn("⚠️ Elementos da aba fluxo não encontrados.");
        return;
    }

    const config = getConfiguracaoPorVeio(VEIO_SELECIONADO_PAINEL);
    if (!config) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Configuração não encontrada para o Veio ${VEIO_SELECIONADO_PAINEL}</h3>
                <p>Verifique se a máquina está configurada.</p>
            </div>
        `;
        return;
    }

    titulo.innerHTML = String(config.nome).replace(/(Veio\s+[A-Z])/i, '<span class="sq-titulo-veio">$1</span>');

    const pecasInstaladas = BANCO_ATIVOS.filter(p => 
        (p.veio === VEIO_SELECIONADO_PAINEL && p.status === "Instalado") || 
        (p.local && p.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) && !p.local.includes("Oficina"))
    );

    const slots = config.slots || [];
    if (slots.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fas fa-tools" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>Estrutura da Máquina ${config.nome} em Construção</h3>
                <p>Os slots serão configurados em breve.</p>
            </div>
        `;
        return;
    }

    // 🎨 Padrão "centro de controle" (design-system.css, classes sq-*):
    // resumo do veio no topo e as posições agrupadas por zona da máquina.
    // Cadeiras em linhas por posição (superior e inferior lado a lado,
    // como na máquina). Posição vazia = cinza discreto (antes: caixa
    // vermelha tracejada — várias vazias faziam a tela inteira "gritar"
    // e escondiam o risco real). Vermelho só pra além da meta e mancal.
    const pecaDoSlot = slot => {
        for (const p of pecasInstaladas) {
            if (p.posicaoFixa && p.posicaoFixa === slot.id) return p;
            if (!p.posicaoFixa && config.mapearSlotLegado && config.mapearSlotLegado(p) === slot.id) return p;
        }
        return null;
    };
    const pctDe = p => (p && p.meta > 0 ? (p.ton / p.meta) * 100 : 0);
    const corDe = pct => `var(--pg-${pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : 'c0'})`;
    const fmtT = n => { const v = Math.abs(n); return v >= 1e6 ? (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi t' : v >= 1e3 ? Math.round(n / 1e3).toLocaleString('pt-BR') + ' mil t' : Math.round(n) + ' t'; };
    const temMancal = p => { try { return Object.values(JSON.parse(p.mancais_ocorrencias || '{}')).some(v => !!v); } catch (e) { return false; } };

    // ritmo do veio = mediana de t/dia das próprias peças (mesma regra do Painel Geral)
    const amostras = pecasInstaladas.filter(p => p.dias >= 30 && p.ton > 0).map(p => p.ton / p.dias).sort((x, y) => x - y);
    const ritmo = amostras.length ? (amostras.length % 2 ? amostras[amostras.length >> 1] : (amostras[(amostras.length >> 1) - 1] + amostras[amostras.length >> 1]) / 2) : 0;
    const diasMeta = p => (p.meta > 0 && ritmo > 0 ? (p.meta - p.ton) / ritmo : null);
    const txtMeta = p => { const d = diasMeta(p); if (d === null) return ''; return d <= 0 ? `<span style="color:var(--ds-perigo)">além da meta</span>` : `meta em ~${Math.round(d)} d`; };

    const ocupacao = slots.map(slot => ({ slot, peca: pecaDoSlot(slot) }));
    const ocupadas = ocupacao.filter(o => o.peca);
    const pcts = ocupadas.map(o => pctDe(o.peca));
    const crit = pcts.filter(x => x >= 80).length, alem = pcts.filter(x => x >= 100).length;
    const media = pcts.length ? pcts.reduce((x, y) => x + y, 0) / pcts.length : 0;
    const prox90 = ocupadas.filter(o => { const d = diasMeta(o.peca); return d !== null && d > 0 && d <= 90; }).length;

    const acoes = p => `<span class="sq-acoes"><button type="button" onclick="event.stopPropagation(); window.abrirHistoricoIndividual('${p.id}')">Prontuário</button><button type="button" class="sq-sacar" onclick="event.stopPropagation(); window.iniciarSaque('${p.id}')">Sacar</button></span>`;
    const vazia = slot => `<div class="sq-vazia"><span>${slot.nome}</span><span class="cc-rotulo">Vazia</span><button type="button" onclick="window.abrirAba(null, 'aba-reservas')">Alocar →</button></div>`;

    const bloco = (slot, p) => {
        if (!p) return vazia(slot);
        const pct = pctDe(p);
        const ehOsc = p.tipo === 'Oscilador' || p.tipo === 'Mesa Osciladora';
        return `<div class="sq-peca${temMancal(p) ? ' sq-mancal' : ''}" onclick="window.abrirHistoricoIndividual('${p.id}')">
            <div class="sq-peca-topo"><span class="cc-rotulo">${slot.nome}</span><span class="sq-pct" style="color:${pct >= 100 ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${pct.toFixed(1).replace('.', ',')}%</span></div>
            <div class="sq-id" title="Código interno: ${p.id}">${p.tag_patrimonio || p.id}</div>
            <div class="pg-trilho"><i style="width:${Math.min(pct, 100)}%;background:${corDe(pct)}"></i></div>
            <div class="sq-meta">${rotuloDesgaste(p.tipo)} ${fmtT(p.ton || 0)} / ${fmtT(p.meta || 0)}${ehOsc ? '' : ` · ${calcularDias(p)} d`}${txtMeta(p) ? ' · ' + txtMeta(p) : ''}</div>
            ${temMancal(p) ? '<div class="sq-alerta">Ocorrência em mancal — ver prontuário</div>' : ''}
            ${acoes(p)}
        </div>`;
    };

    const celCadeira = (slot, p, lado) => {
        if (!p) return `<div class="sq-cel sq-cel-vazia"><span class="cc-rotulo">${lado}</span><span>Vazia</span><button type="button" onclick="window.abrirAba(null, 'aba-reservas')">Alocar</button></div>`;
        const pct = pctDe(p);
        return `<div class="sq-cel${temMancal(p) ? ' sq-mancal' : ''}" onclick="window.abrirHistoricoIndividual('${p.id}')">
            <div class="sq-peca-topo"><span class="sq-id" title="Código interno: ${p.id}">${p.tag_patrimonio || p.id}</span><span class="sq-pct" style="color:${pct >= 100 ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${pct.toFixed(1).replace('.', ',')}%</span></div>
            <div class="pg-trilho"><i style="width:${Math.min(pct, 100)}%;background:${corDe(pct)}"></i></div>
            <div class="sq-meta">${fmtT(p.ton || 0)} · ${calcularDias(p)} d${txtMeta(p) ? ' · ' + txtMeta(p) : ''}${temMancal(p) ? ' · <span style="color:var(--ds-perigo)">mancal</span>' : ''}</div>
            ${acoes(p)}
        </div>`;
    };

    // zonas na ordem da máquina
    const zonaDe = t => (/Molde|Oscila/i.test(t) ? 'Molde e oscilação' : /Cadeira/i.test(t) ? 'Cadeiras' : /Segmento/i.test(t) ? 'Segmentos' : /Bender|Bow/i.test(t) ? 'Dobramento e curva' : /Straight/i.test(t) ? 'Endireitamento' : /Horizontal/i.test(t) ? 'Horizontais' : 'Outros');
    const zonas = [];
    ocupacao.forEach(o => { const z = zonaDe(o.slot.tipo); let g = zonas.find(x => x.nome === z); if (!g) zonas.push(g = { nome: z, itens: [] }); g.itens.push(o); });

    let htmlSlots = `
        <div class="sq-resumo">
            <div><span class="cc-rotulo">Posições</span><strong>${ocupadas.length}<small>/${slots.length}</small></strong><span>${slots.length - ocupadas.length} vazia${slots.length - ocupadas.length === 1 ? '' : 's'}</span></div>
            <div><span class="cc-rotulo"><i class="cc-marca" style="background:var(--pg-c2)"></i>≥ 80% da meta</span><strong>${crit}</strong><span>${pcts.length ? Math.round(crit / pcts.length * 100) : 0}% das instaladas</span></div>
            <div><span class="cc-rotulo"><i class="cc-marca" style="background:var(--pg-c3)"></i>Além da meta</span><strong style="color:${alem ? 'var(--ds-perigo)' : 'var(--ds-texto)'}">${alem}</strong><span>trocar com prioridade</span></div>
            <div><span class="cc-rotulo">Desgaste médio</span><strong>${media.toFixed(0)}%</strong><span>${prox90} ${prox90 === 1 ? 'bate' : 'batem'} a meta em 90 d</span></div>
            <div><span class="cc-rotulo">Ritmo do veio</span><strong>${ritmo ? Math.round(ritmo).toLocaleString('pt-BR') : '--'}</strong><span>t/dia (mediana das peças)</span></div>
        </div>`;

    zonas.forEach(z => {
        const ocup = z.itens.filter(o => o.peca).length;
        htmlSlots += `<div class="sq-zona"><div class="sq-zona-topo"><span class="cc-rotulo">${z.nome}</span><span class="cc-rotulo">${ocup}/${z.itens.length} ocupadas</span></div>`;
        if (z.nome === 'Cadeiras') {
            const pares = new Map();
            z.itens.forEach(o => { const m = o.slot.id.match(/CAD-(SUP|INF)-(\d+)/); if (!m) return; const k = +m[2]; if (!pares.has(k)) pares.set(k, {}); pares.get(k)[m[1]] = o; });
            htmlSlots += `<div class="sq-pares"><div class="sq-par sq-par-cab"><span class="cc-rotulo">Pos.</span><span class="cc-rotulo">Superior</span><span class="cc-rotulo">Inferior</span></div>`;
            [...pares.keys()].sort((x, y) => x - y).forEach(k => {
                const par = pares.get(k);
                htmlSlots += `<div class="sq-par"><span class="sq-pos">${k}</span>${par.SUP ? celCadeira(par.SUP.slot, par.SUP.peca, 'Superior') : '<div></div>'}${par.INF ? celCadeira(par.INF.slot, par.INF.peca, 'Inferior') : '<div></div>'}</div>`;
            });
            htmlSlots += `</div>`;
        } else {
            htmlSlots += `<div class="sq-slots">${z.itens.map(o => bloco(o.slot, o.peca)).join('')}</div>`;
        }
        htmlSlots += `</div>`;
    });

    container.innerHTML = htmlSlots;
}
window.renderPainelVeios = renderPainelVeios;

function gerarCardGraficoHTML(a) {
    const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
    const pctFixed = pct.toFixed(1);
    let cor = pct >= 80 ? "var(--danger)" : (pct >= 50 ? "var(--warning)" : "var(--success)");
    const dias = calcularDias(a);

    return `
        <div class="mcc-grafico-card premium-shadow" style="border-top: 3px solid ${cor};">
            <div class="mcc-grafico-header">
                <div class="mcc-grafico-info">
                    <span class="mcc-tag-id" title="Código interno: ${a.id}">${window.rotuloEquipamento(a)}</span>
                    <span class="ind-card-tag bg-tag">${a.tipo}</span>
                </div>
                <div class="mcc-grafico-porcentagem" style="color:${cor};">${pctFixed}%</div>
            </div>
            <div class="mcc-grafico-pos text-muted">${a.pos || a.posicao || "Única"}</div>
            <div class="ind-gauge-bar premium-bar">
                <div class="ind-gauge-fill" style="width:${Math.min(pct, 100)}%; background:${cor};"></div>
            </div>
            <div class="grafico-legenda" style="margin-bottom: 10px;">
                <span>${rotuloDesgaste(a.tipo)}: <strong>${Math.round(a.ton || 0).toLocaleString()}</strong></span>
                <span>Lim: ${(a.meta || 0).toLocaleString()}</span>
                ${a.tipo === "Oscilador" || a.tipo === "Mesa Osciladora" ? '' : `<span>Dias: <strong>${dias}</strong></span>`}
            </div>
            <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(240, 163, 52,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="abrirHistoricoIndividual('${a.id}')">
                <i class="fas fa-book-open"></i> Ver Prontuário
            </button>
        </div>`;
}

// ==========================================
// RENDER ATIVOS (COM FILTRO DE CRÍTICOS)
// ==========================================
function renderAtivos() {
    const tbody = document.getElementById("ativos-table-body");
    const filtroEl = document.getElementById("filtro-tipo-ativo");
    if (!tbody || !filtroEl) return;

    // 🔧 MIGRAÇÃO: equipamentos que já estavam instalados num veio antes
    // dessa atualização não tinham "dataEntradaVeio". Pra não zerar a
    // contagem de dias deles, plantamos a data retroativa com base no
    // valor de "dias" que já existia — a partir daqui, o contador passa
    // a andar sozinho, todo santo dia, sem precisar editar nada.
    let precisaSalvarMigracao = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local && a.local.includes("Veio") && !a.local.includes("Oficina") && !a.dataEntradaVeio) {
            const diasAtuais = a.dias || 0;
            a.dataEntradaVeio = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvarMigracao = true;
        }
    });
    if (precisaSalvarMigracao) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    let f = BANCO_ATIVOS.filter(a => (a.local || "").includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
    
    if (FILTRO_CRITICOS) {
        f = f.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            return pct >= 80 && !a.local.includes("Oficina");
        });
        FILTRO_CRITICOS = false;
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> Equipamentos Críticos (≥80%)`;
    } else {
        const titulo = document.querySelector('#aba-ativos .panel-card-header h1');
        if (titulo) titulo.innerHTML = `<i class="fas fa-cubes"></i> Matriz Operacional Geral`;
    }

    if (filtroEl.value === "Oficina / Reparo") {
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
    } else if (filtroEl.value === "Oficina / Reserva") {
        // 🆕 O filtro "Reserva" agora cobre as DUAS localizações físicas
        // de reserva (Oficina e Máquina) — a coluna "Local" (abaixo)
        // continua mostrando qual das duas é cada peça.
        f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva" || a.local === "Máquina / Reserva");
    } else if (filtroEl.value !== "TODOS") {
        f = f.filter(a => a.tipo === filtroEl.value);
    }

    f.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    tbody.innerHTML = f.map(a => {
        const pct = a.meta > 0 ? ((a.ton / a.meta) * 100) : 0;
        const pctFixed = pct.toFixed(1);
        let classe = pct >= 80 ? "reparo" : "operação";
        if (a.local === "Oficina / Reserva" || a.local === "Máquina / Reserva") classe = "reserva";
        else if (a.local === "Oficina / Reparo") classe = "reparo";

        let btnAcao = (a.local || "").includes("Veio")
            ? `<button class="btn-outline-danger" onclick="iniciarSaque('${a.id}')">Sacar</button>`
            : `<span class="text-muted" style="margin-right:10px;"><i class="fas fa-warehouse"></i></span>`;

        let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;
        let btnExcluir = `<button class="btn-outline-danger" style="border-color:var(--danger); color:var(--danger); padding: 4px 8px;" onclick="excluirEquipamento('${a.id}')" title="Excluir equipamento"><i class="fas fa-trash"></i></button>`;

        return `
            <tr>
                ${a.tag_patrimonio
                    ? `<td class="font-code" title="Código interno: ${a.id}">${a.tag_patrimonio}</td>`
                    : `<td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>`}
                <td><span class="ind-card-tag bg-tag">${a.tipo} <span style="opacity:0.7; font-size:10px;">(MCC ${a.mcc_compat || ''})</span></span></td>
                <td class="font-code text-muted">${a.local || "Não Alocado"}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${calcularDias(a)}</td>
                <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton || 0).toLocaleString()}</td>
                <td class="font-code text-muted">${(a.meta || 0).toLocaleString()}</td>
                <td><span class="status-pill ${classe}">${pctFixed}%</span></td>
                <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist} ${btnExcluir}</div></td>
            </tr>`;
    }).join("");
}
window.renderAtivos = renderAtivos;

// ==========================================
// RENDER REPAROS (AGRUPADO POR MCC E TIPO)
// ==========================================
export function renderReparos() {
    const repBody = document.getElementById("reparos-table-body");
    if (!repBody) return;

    let precisaSalvar = false;
    BANCO_ATIVOS.forEach(a => {
        if (a.local === "Oficina / Reparo" && !a.dataReparo) {
            const diasAtuais = a.dias || 0;
            a.dataReparo = Date.now() - (diasAtuais * 24 * 60 * 60 * 1000);
            precisaSalvar = true;
        }
    });
    if (precisaSalvar) {
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // 🔧 CORREÇÃO ("reparo já iniciado continuava aparecendo em 'Iniciar
    // Reparo'"): equipamento com rascunho salvo (RASCUNHOS_IDS_ATIVOS,
    // atualizado por atualizarRascunhosAtivos()) já está "em andamento"
    // — não faz sentido continuar oferecendo "Iniciar" pra ele também.
    // Agora esses IDs são excluídos daqui e só aparecem na sub-aba
    // "Reparo em Andamento".
    const execucoesAtivas = window.EXECUCOES_CHECKLIST_IDS_ATIVAS || new Set();
    const reparosBrutos = BANCO_ATIVOS.filter(a =>
        a.local === "Oficina / Reparo" && !RASCUNHOS_IDS_ATIVOS.has(a.id) && !execucoesAtivas.has(a.id)
    );
    const { lista: reparos, semArea } = filtrarPorAreaTecnico(reparosBrutos);

    if (semArea) {
        repBody.innerHTML = `<div class="tc-vazio">Sua área ainda não foi cadastrada. Fale com um ADM.</div>`;
        const r1 = document.getElementById('rp-resumo'); if (r1) r1.textContent = 'Sem área cadastrada.';
        return;
    }
    if (reparos.length === 0) {
        repBody.innerHTML = `<div class="tc-vazio">Nenhuma peça aguardando reparo.</div>`;
        const r0 = document.getElementById('rp-resumo'); if (r0) r0.textContent = 'Nenhuma peça aguardando reparo.';
        return;
    }

    // 🎨 Padrão novo: fila da bancada em blocos, agrupada por MCC, a peça
    // há mais tempo na oficina primeiro (> 15 dias ganha destaque).
    const LIMITE_DIAS = 15;
    const comDias = reparos.map(a => ({ a, dias: calcularDias(a), pct: a.meta > 0 ? (a.ton / a.meta) * 100 : 0 }));
    const media = comDias.length ? Math.round(comDias.reduce((s, x) => s + x.dias, 0) / comDias.length) : 0;
    const velhas = comDias.filter(x => x.dias > LIMITE_DIAS).length;
    const resumo = document.getElementById('rp-resumo');
    if (resumo) resumo.innerHTML = `<b>${comDias.length}</b> peça${comDias.length === 1 ? '' : 's'} aguardando · média de <b>${media}</b> dias na oficina${velhas ? ` · <span class="cc-perigo">${velhas} há mais de ${LIMITE_DIAS} dias</span>` : ''}`;

    const grupos = {};
    comDias.forEach(x => { const mcc = x.a.mcc_compat || "2/3"; (grupos[mcc] ||= []).push(x); });
    let htmlFinal = Object.keys(grupos).sort().map(mcc => {
        const itens = grupos[mcc].sort((x, y) => y.dias - x.dias);
        return `<div class="rp-grupo">
            <div class="rp-grupo-topo"><strong>MCC ${mcc}</strong><span>${itens.length} peça${itens.length === 1 ? '' : 's'}</span></div>
            <div class="rp-grade">${itens.map(({ a, dias, pct }) => `
                <div class="rp-card${dias > LIMITE_DIAS ? ' rp-velha' : ''}">
                    <div class="rp-topo">
                        <span class="cc-ico"><i class="fas fa-screwdriver-wrench"></i></span>
                        <div class="rp-id"><strong class="sq-id" title="Código interno: ${a.id}">${window.rotuloEquipamento(a)}</strong><span>${a.tipo}</span></div>
                        <div class="rp-dias"><b>${dias}</b><span>dia${dias === 1 ? '' : 's'}</span></div>
                    </div>
                    <div class="rp-desg"><span>Desgaste</span><div class="pg-trilho"><i style="width:${Math.min(pct, 100)}%;background:var(--pg-${pct >= 100 ? 'c3' : pct >= 80 ? 'c2' : pct >= 50 ? 'c1' : 'c0'})"></i></div><b>${pct.toFixed(0)}%</b></div>
                    <div class="rp-acoes">
                        <button type="button" class="cc-btn" onclick="abrirHistoricoIndividual('${a.id}')">Prontuário</button>
                        <button type="button" class="cc-btn cc-btn-cheio" onclick="window.iniciarReparoEAbrirChecklist('${a.id}')">Iniciar reparo</button>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    repBody.innerHTML = htmlFinal;

    // 🆕 Dispara em segundo plano a busca do status do Checklist de
    // Execução (% concluído) e se o Folhão já foi salvo, pra cada
    // equipamento visível — os botões já renderizados acima usam o
    // cache; quando a busca voltar, a tabela é redesenhada com o
    // estado real (ver carregarStatusChecklistExecucaoReparo).
    window.carregarStatusChecklistExecucaoReparo(reparos.map(a => a.id));
}
window.renderReparos = renderReparos;

// Checklist de Execução: módulo separado (extraído pra oficina/checklist-execucao.js).
import './checklist-execucao.js?v=2';


// ==========================================
// FILTRO POR CATEGORIA NA AUDITORIA
// ==========================================
// '' = "Todos os eventos". Qualquer outra chave (ver
// eventoAuditoriaEhDaCategoria) filtra ANTES de agrupar por dia — só o
// dia que teve evento daquela categoria aparece na tela.
window.filtrarHistoricoCategoria = function(chaveCategoria, botaoClicado) {
    setFiltroCategoriaAuditoria(chaveCategoria || '');
    document.querySelectorAll('#historico-filtro-acessos .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    const filtroData = document.getElementById("filtro-data-historico")?.value || '';
    if (typeof window.atualizarHistoricoGlobalComServidor === 'function') window.atualizarHistoricoGlobalComServidor(filtroData);
};

// ==========================================
// FILTROS MCC
// ==========================================
function renderizarGraficosMCC(mccNumero) {
    const container = document.getElementById(`graficos-mcc${mccNumero}`);
    if (!container) return;

    const divFiltroVeio = document.getElementById(`filtros-veio-mcc${mccNumero}`);
    const veioAtivo = divFiltroVeio ? divFiltroVeio.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    const divFiltroStatus = document.getElementById(`filtros-status-mcc${mccNumero}`);
    const statusAtivo = divFiltroStatus ? divFiltroStatus.querySelector('.active')?.getAttribute('data-valor') : 'TODOS';

    let filtrados = BANCO_ATIVOS.filter(a => a.local && a.local.includes(`MCC ${mccNumero}`));

    if (veioAtivo && veioAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => a.local && a.local.includes(`Veio ${veioAtivo}`));
    }

    if (statusAtivo && statusAtivo !== 'TODOS') {
        filtrados = filtrados.filter(a => {
            const pct = a.meta > 0 ? (a.ton / a.meta) * 100 : 0;
            if (statusAtivo === 'VERMELHO') return pct >= 80;
            if (statusAtivo === 'AMARELO') return pct >= 50 && pct < 80;
            if (statusAtivo === 'VERDE') return pct < 50;
            return true;
        });
    }

    filtrados.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="vazio">Nenhum equipamento encontrado com a combinação de filtros.</div>`;
        return;
    }

    container.innerHTML = filtrados.map(gerarCardGraficoHTML).join("");
}
window.renderizarGraficosMCC = renderizarGraficosMCC;

// ==========================================
// PRONTUÁRIO INDIVIDUAL (MODAL)
// ==========================================
function abrirHistoricoIndividual(id) {
    ID_HISTORICO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    const tagNome = document.getElementById("hist-tag-nome");
    const tagLocal = document.getElementById("hist-tag-local");
    if (tagNome) { tagNome.innerText = window.rotuloEquipamento(item); tagNome.title = `Código interno: ${item.id}`; }
    if (tagLocal) tagLocal.innerText = item.local || "Não alocado";

    renderizarResumoHistoricoIndividual(item);
    renderizarTabelaHistoricoIndividual(id);
    const modal = document.getElementById("modal-historico-ativo");
    if (modal) modal.classList.remove("hidden");

    // 🔧 Ver correção "PRONTUÁRIO NÃO MOSTRA QUANDO A PEÇA FOI
    // INSTALADA" logo abaixo, em atualizarTabelaHistoricoComServidor().
    // Não usa "await" de propósito: o modal já abre na hora com o que
    // tinha local, e a tabela é substituída assim que o servidor
    // responder, sem travar a abertura do modal.
    atualizarTabelaHistoricoComServidor(id);
    window.carregarFotosNoProntuario(id);
}
window.abrirHistoricoIndividual = abrirHistoricoIndividual;

// ==============================================================
// RESUMO RÁPIDO DO PRONTUÁRIO (entrada atual, dias, folhões feitos)
// ==============================================================
const REGEX_REPARO_CONCLUIDO = /reparo conclu[ií]do/i;
function renderizarResumoHistoricoIndividual(item) {
    const container = document.getElementById("hist-resumo-cards");
    if (!container) return;

    const formatarData = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR') : "--";

    let cardEntrada, cardDias, iconeDias, corDias;

    if (item.local === "Oficina / Reparo" && item.dataReparo) {
        cardEntrada = formatarData(item.dataReparo);
        iconeDias = "fa-tools";
        corDias = "var(--danger)";
    } else if (item.dataEntradaVeio && item.local && !item.local.includes("Oficina")) {
        // 🔧 Ver correção "Prontuário sem Data de Entrada" em
        // sincronizarAtivosReaisMCC4() (banco.js): quando não existe um
        // registro real (peça antiga, anterior a esse controle), a data
        // mostrada é uma ESTIMATIVA calculada a partir dos dias já
        // acumulados — marca com "~" pra deixar isso claro, em vez de
        // fingir ser uma data exata.
        cardEntrada = (item.dataEntradaEstimada ? "~" : "") + formatarData(item.dataEntradaVeio);
        iconeDias = "fa-industry";
        corDias = "var(--success)";
    } else {
        cardEntrada = "--";
        iconeDias = "fa-question";
        corDias = "var(--text-muted)";
    }

    const dias = typeof calcularDias === 'function' ? calcularDias(item) : (item.dias || 0);
    const statusLabel = item.local === "Oficina / Reparo" ? "Dias em Reparo" : "Dias na Máquina";

    // Conta quantos folhões (laudos de manutenção) já foram feitos nesse
    // equipamento, olhando o histórico global por menções de finalização.
    const historicoItem = HISTORICO_ACOES.filter(h => h.tag === item.id);
    // 🔧 Antes contava QUALQUER evento que citasse "folhão"/"laudo" (salvo,
    // finalizado, impresso...) — um reparo só virava 3+. Agora conta só o
    // "Reparo concluído", que todo Folhão registra uma vez ao concluir. O
    // número definitivo vem do servidor (ver atualizarTabelaHistoricoComServidor);
    // este, do histórico local, é só o valor inicial enquanto carrega.
    const folhoesFeitos = historicoItem.filter(h => REGEX_REPARO_CONCLUIDO.test(h.acao || "")).length;

    // 🔧 REFINAMENTO (Fase R2): chip sólido -- neutro (corDias ==
    // var(--text-muted)) fica com fundo neutro, qualquer cor de status
    // real vira preenchimento sólido com ícone claro por cima.
    const neutro = corDias === 'var(--text-muted)';
    const estiloChip = neutro ? '' : `background:${corDias}; color:#fff;`;

    container.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="${estiloChip}"><i class="fas ${iconeDias}"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${cardEntrada}</h4><p>${item.local === "Oficina / Reparo" ? "Saiu do Veio em" : (item.dataEntradaEstimada ? "Data de Entrada (estimada)" : "Data de Entrada Atual")}</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="${estiloChip}"><i class="fas fa-calendar-day"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;">${dias}</h4><p>${statusLabel}</p></div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><i class="fas fa-clipboard-check"></i></div>
            <div class="kpi-data"><h4 style="font-size:1.3rem;" id="hist-qtd-folhoes">${folhoesFeitos}</h4><p>Folhões Concluídos</p></div>
        </div>
    `;

    // 🔁 Quando a peça está em reparo por causa de um Swap (não um saque
    // manual), mostra quem entrou no lugar dela — antes essa informação
    // só existia dentro do texto livre da linha do tempo, difícil de
    // achar rápido.
    const avisoSubstituicao = document.getElementById("hist-aviso-substituicao");
    if (avisoSubstituicao) {
        if (item.local === "Oficina / Reparo" && item.substituidoPor) {
            avisoSubstituicao.innerHTML = `<i class="fas fa-right-left"></i> Substituída por <strong class="font-code">${item.substituidoPor}</strong>`;
            avisoSubstituicao.classList.remove("hidden");
        } else {
            avisoSubstituicao.classList.add("hidden");
        }
    }
}

function fecharModalHistorico() {
    document.getElementById("modal-historico-ativo").classList.add("hidden");
    ID_HISTORICO_ATUAL = null;
    document.getElementById("input-nota-manual").value = "";
}
window.fecharModalHistorico = fecharModalHistorico;

function renderizarTabelaHistoricoIndividual(id) {
    let tbody = document.getElementById("tabela-historico-individual");
    let historicoFiltrado = HISTORICO_ACOES.filter(h => h.tag === id || h.acao.includes(id));

    if (historicoFiltrado.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
        return;
    }

    const iconePorEvento = (acao) => {
        const a = (acao || "").toLowerCase();
        if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
        if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
        if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
        if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#e3b866" };
        if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#d9b67a" };
        return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
    };

    tbody.innerHTML = historicoFiltrado.map(h => {
        const { icone, cor } = iconePorEvento(h.acao);
        return `
        <tr>
            <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${h.data}</td>
            <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${window.formatarAcaoEvento(h.acao)}</td>
            <td style="font-size: 11px; color: var(--text-accent);">${window.escapeHtmlNotif(h.responsavel || 'Sistema')}</td>
        </tr>`;
    }).join("");
}

// ==============================================================
// 🔧 CORREÇÃO CRÍTICA ("não aparece no Prontuário quando foi
// instalado na máquina"): renderizarTabelaHistoricoIndividual() (acima)
// só lê de HISTORICO_ACOES — um array que vive no localStorage DE CADA
// APARELHO/NAVEGADOR. Toda ação (troca, saque, cadastro...) já era
// enviada certinho pro banco (registrarHistorico -> salvarHistoricoNoPython
// -> tabela log_eventos no Neon), mas o Prontuário nunca ia buscar isso
// de volta — só mostrava o que aquele navegador específico acumulou na
// própria sessão. Resultado: um Swap feito e visto na hora (mesma
// sessão) parecia registrar certo, mas abrir o Prontuário dessa peça
// depois — em outro aparelho, outra sessão, ou depois de limpar o
// site — não mostrava o evento de instalação, só o que sobrou local
// (nesse caso, só o cadastro inicial). A própria aba do Sinótico 3D
// (que roda isolada, sem acesso a esse localStorage) já resolvia isso
// buscando direto do servidor — a correção abaixo faz o Prontuário do
// app principal fazer a mesma coisa.
//
// Fluxo: mostra o que já tem local na hora (resposta instantânea, feito
// em abrirHistoricoIndividual), depois busca a lista oficial do
// servidor e SUBSTITUI a tabela por ela. Se a busca falhar (sem
// internet), mantém o que já estava mostrando em vez de esvaziar.
// ==============================================================
async function atualizarTabelaHistoricoComServidor(id) {
    const tbody = document.getElementById("tabela-historico-individual");
    if (!tbody) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?peca_id=${encodeURIComponent(id)}&limite=200`, { cache: 'no-store' });
        if (!resp.ok) return;
        const eventos = await resp.json();
        if (!Array.isArray(eventos)) return;

        // Enquanto a busca rodava, o técnico pode ter fechado o
        // Prontuário ou aberto o de outra peça — não sobrescreve com um
        // resultado que já não é mais o que está na tela.
        if (ID_HISTORICO_ATUAL !== id) return;

        const qtdFolhoesEl = document.getElementById('hist-qtd-folhoes');
        if (qtdFolhoesEl) qtdFolhoesEl.textContent = eventos.filter(ev => ev.peca_id === id && REGEX_REPARO_CONCLUIDO.test(ev.acao || '')).length;

        if (eventos.length === 0) {
            // 🔧 Mensagem mais clara pra peças antigas (da importação
            // original da planilha) que nunca passaram por uma ação
            // registrada pelo sistema (Swap, Saque, cadastro...): em vez
            // de parecer que "faltou registrar algo", explica que o
            // histórico do sistema só começa a partir de quando essa peça
            // passou a ser controlada por aqui.
            const itemAtual = BANCO_ATIVOS.find(a => a.id === id);
            const antigaJaInstalada = itemAtual && itemAtual.local && !itemAtual.local.includes("Oficina") && (itemAtual.dias || 0) > 0;
            tbody.innerHTML = antigaJaInstalada
                ? `<tr><td colspan="3" class="text-center text-muted">Sem eventos registrados pelo sistema — esta peça já estava instalada quando o controle digital começou (histórico anterior não é rastreado).</td></tr>`
                : `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado ainda.</td></tr>`;
            return;
        }

        const iconePorEvento = (acao) => {
            const a = (acao || "").toLowerCase();
            if (a.includes("entrou") || a.includes("instalado")) return { icone: "fa-arrow-right-to-bracket", cor: "#22c55e" };
            if (a.includes("saiu") || a.includes("sacado")) return { icone: "fa-arrow-right-from-bracket", cor: "#ef4444" };
            if (a.includes("reparo")) return { icone: "fa-tools", cor: "#eab308" };
            if (a.includes("folhão") || a.includes("laudo")) return { icone: "fa-clipboard-check", cor: "#e3b866" };
            if (a.includes("registro manual")) return { icone: "fa-pen", cor: "#d9b67a" };
            return { icone: "fa-circle-dot", cor: "var(--text-muted)" };
        };

        // 🔧 CORREÇÃO ("registrei uma Atividade Pendente e não tem como
        // concluir ela no Prontuário"): uma "Atividade Pendente" criada
        // pelo modal de Intervenção vira só uma LINHA de texto no
        // histórico (log_eventos) — diferente das atividades da aba
        // Oficina, que têm status (Pendente/Em Andamento/Concluído) numa
        // tabela própria. Aqui não dá pra adicionar um campo de status
        // sem mudar o banco, então a solução é: quando o evento é da
        // categoria "Atividade Pendente" e ainda não tem uma marcação de
        // conclusão referenciando ele (procurando "(ref #ID)" nos outros
        // eventos dessa peça), mostra um botão "Concluir" que registra um
        // novo evento de conclusão, referenciando o id do original.
        const idsConcluidos = new Set();
        eventos.forEach(ev => {
            const m = (ev.acao || '').match(/\(ref #(\d+)\)/);
            if (m) idsConcluidos.add(Number(m[1]));
        });

        // A API já devolve mais recente primeiro (ORDER BY id DESC),
        // igual à ordem que a tabela local usa (unshift a cada evento novo).
        tbody.innerHTML = eventos.map(e => {
            const { icone, cor } = iconePorEvento(e.acao);
            const ehAtividadePendente = e.categoria === 'Atividade Pendente';
            const jaConcluida = idsConcluidos.has(e.id);
            let marcadorPendencia = '';
            if (ehAtividadePendente) {
                marcadorPendencia = jaConcluida
                    ? `<span style="font-size:10px; color:#22c55e; font-weight:700; margin-left:8px; white-space:nowrap;"><i class="fas fa-check-circle"></i> Concluída</span>`
                    : `<button class="btn-outline-neutral" style="padding:2px 8px; font-size:10px; margin-left:8px; white-space:nowrap;" onclick="window.concluirAtividadePendenteProntuario(${e.id}, '${id}')"><i class="fas fa-check"></i> Concluir</button>`;
            }
            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${e.data_hora || '—'}</td>
                <td style="font-size: 13px; color: var(--text-body);"><i class="fas ${icone}" style="color:${cor}; margin-right:8px;"></i>${window.formatarAcaoEvento(e.acao)}${marcadorPendencia}</td>
                <td style="font-size: 11px; color: var(--text-accent);">${window.escapeHtmlNotif(e.operador || 'Sistema')}</td>
            </tr>`;
        }).join("");
    } catch (e) {
        console.error('⚠️ Não consegui buscar o histórico do servidor pro Prontuário (mantendo o que tinha local):', e);
    }
}

// --------------------------------------------------------------
// Marca uma "Atividade Pendente" (registrada via modal de Intervenção)
// como concluída, direto no Prontuário do equipamento.
// --------------------------------------------------------------
window.concluirAtividadePendenteProntuario = async function(eventoId, equipamentoId) {
    if (!verificarAcesso()) return;
    if (!confirm('Marcar esta atividade pendente como concluída?')) return;

    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Técnico') : 'Sistema';
    await window.registrarHistorico(
        equipamentoId,
        `✅ <span style="color:#22c55e;">[ATIVIDADE CONCLUÍDA]</span> (ref #${eventoId})`
    );

    if (ID_HISTORICO_ATUAL === equipamentoId) {
        atualizarTabelaHistoricoComServidor(equipamentoId);
    }
};

function salvarRegistroManual() {
    if (!verificarAcesso() || !ID_HISTORICO_ATUAL) return;

    const nota = document.getElementById("input-nota-manual").value.trim();
    if (!nota) {
        return alert("Escreva algo para registrar.");
    }

    const idAtual = ID_HISTORICO_ATUAL;
    const gravando = window.registrarHistorico(idAtual, `<span style="color:var(--text-accent);">[REGISTRO MANUAL]</span> ${nota}`);
    document.getElementById("input-nota-manual").value = "";
    renderizarTabelaHistoricoIndividual(idAtual);
    // recarrega do servidor depois de gravar (antes a nota nova só
    // aparecia na lista local deste aparelho)
    Promise.resolve(gravando).finally(() => { if (ID_HISTORICO_ATUAL === idAtual) atualizarTabelaHistoricoComServidor(idAtual); });
    const itemAtual = BANCO_ATIVOS.find(a => a.id === ID_HISTORICO_ATUAL);
    if (itemAtual) renderizarResumoHistoricoIndividual(itemAtual);
}
window.salvarRegistroManual = salvarRegistroManual;

// ==========================================
// SAQUE, REPARO E SWAP (FLUXO PRINCIPAL)
// ==========================================
function abrirModalRelatorio(item) {
    document.getElementById('modal-tag').innerText = item.id;
    
    let select = document.getElementById('modal-motivo');
    let motivos = MOTIVOS_RETIRO[item.tipo] || MOTIVOS_RETIRO["Outros"];
    select.innerHTML = motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('modal-condicao').value = '';
    document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() {
    document.getElementById('modal-relatorio').classList.add('hidden');
    MODO_MODAL_RELATORIO = {};
}
window.fecharModalRelatorio = fecharModalRelatorio;

function iniciarSaque(id) {
    if (!verificarAcesso()) return;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    MODO_MODAL_RELATORIO = { tipoAcao: 'SAQUE', idSacado: id };
    abrirModalRelatorio(item);
}
window.iniciarSaque = iniciarSaque;

function confirmarRelatorio() {
    let motivo = document.getElementById('modal-motivo').value;
    let condicao = document.getElementById('modal-condicao').value.trim();

    if (!condicao) {
        return alert("Por favor, descreva como o equipamento chegou na oficina (Laudo Visual).");
    }

    let textoLaudo = `<br><span style="color:var(--warning); font-size:12px;"><strong>Motivo:</strong> ${motivo} | <strong>Condição:</strong> ${condicao}</span>`;

    if (MODO_MODAL_RELATORIO.tipoAcao === 'SAQUE') {
        executarSaqueFinal(MODO_MODAL_RELATORIO.idSacado, textoLaudo);
    } else if (MODO_MODAL_RELATORIO.tipoAcao === 'SWAP') {
        if (typeof executarSwapFinal === 'function') {
            executarSwapFinal(MODO_MODAL_RELATORIO.idReserva, MODO_MODAL_RELATORIO.idSacado, MODO_MODAL_RELATORIO.localDestino, textoLaudo);
        } else {
            console.warn("⚠️ executarSwapFinal não está definida — esse fluxo (tipoAcao SWAP) está incompleto.");
        }
    }

    fecharModalRelatorio();
}
window.confirmarRelatorio = confirmarRelatorio;

async function executarSaqueFinal(id, laudo) {
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
        let loc = item.local;
        item.local = "Oficina / Reparo";
        item.status = "Oficina / Reparo";
        item.dataReparo = Date.now();
        item.dias = 0;
        item.dataEntradaVeio = null;
        // 🔧 Ver correção "DATA DE ENTRADA não é salva" em
        // salvarPecaNoPython() (banco.js): sem isso, o "data_entrada"
        // (string) antigo ficava esquecido no objeto e voltava a ser
        // reenviado pro banco mesmo a peça já tendo saído do veio.
        item.data_entrada = null;
        item.substituidoPor = null;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
        const agora = new Date().toLocaleDateString('pt-BR');
        // 🔧 Ver correção em registrarHistorico() — espera terminar de
        // salvar antes de seguir (evita perder o evento se o técnico
        // trocar de tela rápido demais logo depois do Saque).
        await window.registrarHistorico(id, `Sacado da linha (${loc}) em ${agora} p/ Reparo. ${laudo}`);

        // Persiste no banco Postgres — sem isso, o saque some assim que a
        // tela sincronizar de novo com o servidor (sincronizarAtivosReaisMCC4
        // reconstrói tudo a partir do banco, que nunca teria recebido a mudança).
        if (typeof salvarPecaNoPython === 'function') {
            await salvarPecaNoPython(item);
        }

        renderAtivos();
        renderPainelVeios();
        if (typeof window.calcularKpisGlobais === 'function') window.calcularKpisGlobais();
        renderReparos();
        if (typeof window.renderReservas === 'function') window.renderReservas();
        window.atualizarPainelCompleto();
    }
}

