// folhao.js - VISUAL LIMPO E SEM QUADRADOS BRANCOS

import { BANCO_ATIVOS, OPERADOR_LOGADO } from './banco.js';
import { BIBLIOTECA_CHECKLISTS } from './dados.js'; 
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_ATUAL = null;
let DADOS_FOLGA_ARESTA = {}; 

export function getV(id) { let el = document.getElementById(id); return el && el.value ? el.value : ''; }

export function fecharFolhaoMCC4() { document.getElementById("modal-folhao-mcc4").classList.add("hidden"); ID_FOLHAO_ATUAL = null; }

export function trocarAbaFolhao(event, idAba) {
    document.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
    let abaDestino = document.getElementById(idAba);
    if(abaDestino) abaDestino.classList.remove('hidden');
    if(event) event.currentTarget.classList.add('active');
}

export function renderizarChecklist(categoriasObj, containerId, prefix) {
    const container = document.getElementById(containerId);
    if(!container) return;
    let html = ""; let groupIndex = 0;
    for (const [nomeCategoria, perguntas] of Object.entries(categoriasObj)) {
        html += `<h4 style="margin: 20px 0 10px 0; color: var(--text-accent); border-bottom: 1px dashed var(--border-color); padding-bottom: 5px;"><i class="fas fa-tasks"></i> ${nomeCategoria}</h4><div class="checklist-container">`;
        perguntas.forEach((pergunta, index) => {
            let name = `${prefix}-g${groupIndex}-q${index}`;
            html += `<div class="check-item"><p>${index + 1}. ${pergunta}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
        });
        html += `</div>`; groupIndex++;
    }
    container.innerHTML = html;
}

export function gerarLinhasChecklistPDF(categoriasObj, prefix) {
    let html = ""; let groupIndex = 0;
    for (const [nomeCategoria, perguntas] of Object.entries(categoriasObj)) {
        html += `<tr><th colspan="3" style="background:#002b5e; color:#fff; font-size:12px; text-align:left; padding: 6px; border: 1px solid #000;">${nomeCategoria}</th></tr>`;
        html += `<tr><th style="border: 1px solid #000; padding: 4px; width:5%;">Item</th><th style="border: 1px solid #000; padding: 4px;">Descrição do Serviço</th><th style="border: 1px solid #000; padding: 4px; width:15%;">Status</th></tr>`;
        perguntas.forEach((pergunta, index) => {
            let name = `${prefix}-g${groupIndex}-q${index}`;
            let radios = document.getElementsByName(name);
            let valor = "N/A";
            for(let i=0; i<radios.length; i++) if(radios[i].checked) { valor = radios[i].value; break; }
            html += `<tr><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${index + 1}</td><td style="border: 1px solid #000; padding: 4px;">${pergunta}</td><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${valor}</td></tr>`;
        });
        groupIndex++;
    }
    return html;
}

// ==========================================
// MOTORES GÊMEOS DE DADOS
// ==========================================

const idenKeys = [{l: "PLACA FIXA", ids: ["id-pf-sm", "id-pf-so"], r: "RED. SUP DIR", idr: ["id-rsd-sm", "id-rsd-so"]}, {l: "PLACA MÓVEL", ids: ["id-pm-sm", "id-pm-so"], r: "RED. INF DIR", idr: ["id-rid-sm", "id-rid-so"]}, {l: "PLACA DIREITA", ids: ["id-pd-sm", "id-pd-so"], r: "RED. SUP ESQ", idr: ["id-rse-sm", "id-rse-so"]}, {l: "PLACA ESQUERDA", ids: ["id-pe-sm", "id-pe-so"], r: "RED. INF ESQ", idr: ["id-rie-sm", "id-rie-so"]}, {l: "CIL. SUP DIR", ids: ["id-csd-sm", "id-csd-so"], r: "CIL. INF DIR", idr: ["id-cid-sm", "id-cid-so"]}, {l: "CIL. SUP ESQ", ids: ["id-cse-sm", "id-cse-so"], r: "CIL. INF ESQ", idr: ["id-cie-sm", "id-cie-so"]}];
const tIden = (p) => idenKeys.map(k => `<tr><td style="font-weight:bold;">${k.l}</td>` + (p ? `<td style="text-align:center">${getV(k.ids[0])}</td><td style="text-align:center">${getV(k.ids[1])}</td>` : `<td><input id="${k.ids[0]}" class="w-100"></td><td><input id="${k.ids[1]}" class="w-100"></td>`) + `<td style="font-weight:bold;">${k.r}</td>` + (p ? `<td style="text-align:center">${getV(k.idr[0])}</td><td style="text-align:center">${getV(k.idr[1])}</td>` : `<td><input id="${k.idr[0]}" class="w-100"></td><td><input id="${k.idr[1]}" class="w-100"></td>`) + `</tr>`).join('');

const anKeys = [{l: "Torque Parafuso Excêntrico (Esq/Dir)", ids: ["an-exc-e", "an-exc-d"]}, {l: "Torque Fixação Foot Roll (300+5 Nm)", ids: ["an-foot"]}, {l: "Torque Fixação Placa Lateral (200+5 Nm)", ids: ["an-plat"]}, {l: "Tirante Fixação Guias Laterais (100 Nm)", ids: ["an-guia"]}, {l: "Folga Gabarito Clamp (1.60 +/- 0.15mm) Sup/Inf", ids: ["an-cl-s", "an-cl-i"]}];
const tAN = (p) => anKeys.map(k => `<tr><td>${k.l}</td>` + (p ? `<td style="text-align:center; font-weight:bold;">${k.ids.map(id => getV(id)).join(' / ')}</td>` : `<td>${k.ids.map(id => `<input id="${id}" style="width:60px; margin-right:5px;">`).join('')}</td>`) + `</tr>`).join('');

const tTermos = (pfx, max, p) => Array.from({length:max}).map((_,i) => `<tr><td style="text-align:center">${i+1}</td>` + (p ? `<td style="text-align:center">${getV(`tm-${pfx}-f-${i+1}`)}</td><td style="text-align:center">${getV(`tm-${pfx}-m-${i+1}`)}</td>` : `<td><input id="tm-${pfx}-f-${i+1}" class="w-100"></td><td><input id="tm-${pfx}-m-${i+1}" class="w-100"></td>`) + `</tr>`).join('') + `<tr><td style="text-align:center; font-weight:bold;">P1</td>` + (p ? `<td style="text-align:center">${getV(`tm-${pfx}-f-p1`)}</td><td style="text-align:center">${getV(`tm-${pfx}-m-p1`)}</td>` : `<td><input id="tm-${pfx}-f-p1" class="w-100"></td><td><input id="tm-${pfx}-m-p1" class="w-100"></td>`) + `</tr><tr><td style="text-align:center; font-weight:bold;">P2</td>` + (p ? `<td style="text-align:center">${getV(`tm-${pfx}-f-p2`)}</td><td style="text-align:center">${getV(`tm-${pfx}-m-p2`)}</td>` : `<td><input id="tm-${pfx}-f-p2" class="w-100"></td><td><input id="tm-${pfx}-m-p2" class="w-100"></td>`) + `</tr>`;

const ptsPE = ["A (Topo)", "B (Base)", "C (Comp)", "D (Comp)", "E (Chanfro)", "F (Chanfro)", "G (Meio)", "H1 (0.0)", "H2 (0.5)", "H3 (1.0)", "H4 (1.5)", "L (Larg Topo)", "M (Larg Base)"];
const tPE = (mom, p) => ptsPE.map((pt,i) => `<tr><td style="text-align:center">${pt}</td>` + (p ? `<td style="text-align:center">${getV(`pe-${mom}-e-${i}`)}</td><td style="text-align:center">${getV(`pe-${mom}-d-${i}`)}</td>` : `<td><input id="pe-${mom}-e-${i}" class="w-100"></td><td><input id="pe-${mom}-d-${i}" class="w-100"></td>`) + `</tr>`).join('');

const paresIso = ["5 e 6","5 e 8","5 e 10","5 e 15","6 e 8","6 e 10","6 e 15","8 e 10","8 e 15","10 e 15"];
const tIso = (p) => paresIso.map((pt,i) => `<tr><td style="text-align:center; font-weight:bold;">${pt}</td>` + (p ? `<td style="text-align:center">${getV(`iso-${i}`)}</td>` : `<td><input id="iso-${i}" class="w-100"></td>`) + `</tr>`).join('');

const cardans = [{n:"Sup Esq", id:"se"},{n:"Inf Esq", id:"ie"},{n:"Sup Dir", id:"sd"},{n:"Inf Dir", id:"id"}];
const tCard = (p) => cardans.map(c => `<tr><td style="text-align:center">${c.n}</td>` + (p ? `<td style="text-align:center">${getV(`cd-${c.id}-a`)}</td><td style="text-align:center">${getV(`cd-${c.id}-s`)}</td><td style="text-align:center">${getV(`cd-${c.id}-p`)}</td><td style="text-align:center">${getV(`cd-${c.id}-c`)}</td>` : `<td><input id="cd-${c.id}-a" class="w-100"></td><td><input id="cd-${c.id}-s" class="w-100"></td><td><input id="cd-${c.id}-p" class="w-100"></td><td><input id="cd-${c.id}-c" class="w-100"></td>`) + `</tr>`).join('');

const cotasExc = [{l:"A", d:"70 (0/+0.1)", t:"70 (+/-1.5)"},{l:"B", d:"45,00", t:"45,00 (0/-0.5)"},{l:"C", d:"90 d9", t:"90 (0/-0.207)"},{l:"D", d:"31,00", t:"31,00 (0/-0.5)"},{l:"E", d:"70 h7", t:"70,00 (-0.15)"},{l:"F", d:"12,00", t:"12,00 (+/-0.2)"},{l:"SW", d:"55,00", t:"55,00 (+/-0.5)"},{l:"DIA INT", d:"70 H8", t:"70,00 (+0.15)"}];
const tExc = (p) => cotasExc.map((c,i) => `<tr ${c.l==='DIA INT'?'style="background:#f0f0f0;"':''}><td style="text-align:center; font-weight:bold;">${c.l}</td><td style="text-align:center;">${c.d}</td><td style="text-align:center;">${c.t}</td>` + (p ? `<td style="text-align:center; font-weight:bold;">${getV(`exc-d-${i}`)}</td><td style="text-align:center; font-weight:bold;">${getV(`exc-e-${i}`)}</td>` : `<td><input id="exc-d-${i}" class="w-100"></td><td><input id="exc-e-${i}" class="w-100"></td>`) + `</tr>`).join('');

const frKeys = [{l:"CHEGADA Oficina", id:"c"}, {l:"SAÍDA Oficina", id:"s"}];
const tFR = (p) => frKeys.map(k => `<tr><td style="font-weight:bold;">${k.l}</td>` + (p ? `<td style="text-align:center">${getV(`fr-fix-${k.id}`)}</td><td style="text-align:center">${getV(`fr-mov-${k.id}`)}</td><td style="text-align:center">${getV(`fr-esq-${k.id}`)}</td><td style="text-align:center">${getV(`fr-dir-${k.id}`)}</td>` : `<td><input id="fr-fix-${k.id}" class="w-100"></td><td><input id="fr-mov-${k.id}" class="w-100"></td><td><input id="fr-esq-${k.id}" class="w-100"></td><td><input id="fr-dir-${k.id}" class="w-100"></td>`) + `</tr>`).join('');

const plKeys = [{m:"CHEGADA", p:"FIXA", id:"c-f"}, {m:"CHEGADA", p:"MÓVEL", id:"c-m"}, {m:"SAÍDA", p:"FIXA", id:"s-f"}, {m:"SAÍDA", p:"MÓVEL", id:"s-m"}];
const tPPL = (p) => plKeys.map(k => `<tr>` + (k.p==="FIXA" ? `<td rowspan="2" style="vertical-align:middle; text-align:center; font-weight:bold;">${k.m}</td>` : ``) + `<td style="text-align:center">${k.p}</td>` + (p ? `<td style="text-align:center">${getV(`ppl-v-${k.id}`)}</td><td style="text-align:center">${getV(`ppl-h-${k.id}`)}</td><td style="text-align:center">${getV(`ppl-r-${k.id}`)}</td><td style="text-align:center">${getV(`ppl-d-${k.id}`)}</td>` : `<td><input id="ppl-v-${k.id}" class="w-100"></td><td><input id="ppl-h-${k.id}" class="w-100"></td><td><input id="ppl-r-${k.id}" class="w-100"></td><td><input id="ppl-d-${k.id}" class="w-100"></td>`) + `</tr>`).join('');

const cxKeys = [{l:"FUSO", id:"f"}, {l:"PLACA", id:"p"}];
const tCX = (p) => cxKeys.map(k => `<tr><td style="font-weight:bold;">${k.l}</td>` + (p ? `<td style="text-align:center">${getV(`cx-${k.id}-se`)}</td><td style="text-align:center">${getV(`cx-${k.id}-ie`)}</td><td style="text-align:center">${getV(`cx-${k.id}-sd`)}</td><td style="text-align:center">${getV(`cx-${k.id}-id`)}</td>` : `<td><input id="cx-${k.id}-se" class="w-100"></td><td><input id="cx-${k.id}-ie" class="w-100"></td><td><input id="cx-${k.id}-sd" class="w-100"></td><td><input id="cx-${k.id}-id" class="w-100"></td>`) + `</tr>`).join('') + `<tr><td style="font-weight:bold;">Parafusos Transm.</td>` + (p ? `<td style="text-align:center">${getV(`cx-pt-se`)}</td><td style="text-align:center">${getV(`cx-pt-ie`)}</td><td style="text-align:center">${getV(`cx-pt-sd`)}</td><td style="text-align:center">${getV(`cx-pt-id`)}</td>` : `<td><input id="cx-pt-se" class="w-100"></td><td><input id="cx-pt-ie" class="w-100"></td><td><input id="cx-pt-sd" class="w-100"></td><td><input id="cx-pt-id" class="w-100"></td>`) + `</tr>`;

const trPL = (pfx, p) => Array.from({length:15}).map((_, i) => `<tr><td style="text-align:center">${i+1}º</td>` + (p ? `<td style="text-align:center">${getV(`pl-${pfx}-a-${i}`)}</td><td style="text-align:center">${getV(`pl-${pfx}-b-${i}`)}</td><td style="text-align:center">${getV(`pl-${pfx}-c-${i}`)}</td>` : `<td><input id="pl-${pfx}-a-${i}" class="w-100"></td><td><input id="pl-${pfx}-b-${i}" class="w-100"></td><td><input id="pl-${pfx}-c-${i}" class="w-100"></td>`) + `</tr>`).join('');
const trLub = (pfx, p) => Array.from({length:15}).map((_, i) => `<tr><td style="text-align:center">${i+1}º</td>` + (p ? `<td style="text-align:center">${getV(`lub-${pfx}-st-${i}`)}</td><td style="text-align:center">${getV(`lub-${pfx}-obs-${i}`)}</td>` : `<td><select id="lub-${pfx}-st-${i}"><option></option><option>OK</option><option>NOK</option></select></td><td><input id="lub-${pfx}-obs-${i}" class="w-100"></td>`) + `</tr>`).join('');
const trRol = (pfx, p) => Array.from({length:15}).map((_, i) => `<tr><td style="text-align:center">${i+1}</td>` + (p ? `<td style="text-align:center">${getV(`rol-${pfx}-1-${i}`)}</td><td style="text-align:center">${getV(`rol-${pfx}-2-${i}`)}</td><td style="text-align:center">${getV(`rol-${pfx}-3-${i}`)}</td><td style="text-align:center">${getV(`rol-${pfx}-4-${i}`)}</td>` : `<td><select id="rol-${pfx}-1-${i}"><option></option><option>OK</option><option>NOK</option></select></td><td><select id="rol-${pfx}-2-${i}"><option></option><option>OK</option><option>NOK</option></select></td><td><select id="rol-${pfx}-3-${i}"><option></option><option>OK</option><option>NOK</option></select></td><td><select id="rol-${pfx}-4-${i}"><option></option><option>OK</option><option>NOK</option></select></td>`) + `</tr>`).join('');
const trMed = (pfx, p) => Array.from({length:15}).map((_, i) => `<tr><td style="text-align:center">${i+1}</td>` + (p ? `<td style="text-align:center">${getV(`med-${pfx}-n1-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-m1-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-n2-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-m2-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-n3-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-m3-${i}`)}</td><td style="text-align:center">${getV(`med-${pfx}-cls-${i}`)}</td>` : `<td><input id="med-${pfx}-n1-${i}" style="width:30px"></td><td><input id="med-${pfx}-m1-${i}" style="width:30px"></td><td><input id="med-${pfx}-n2-${i}" style="width:30px"></td><td><input id="med-${pfx}-m2-${i}" style="width:30px"></td><td><input id="med-${pfx}-n3-${i}" style="width:30px"></td><td><input id="med-${pfx}-m3-${i}" style="width:30px"></td><td><input id="med-${pfx}-cls-${i}" style="width:40px"></td>`) + `</tr>`).join('');
const gapTabela = (pfx, p) => `<table class="premium-table" style="font-size: 11px;"><thead><tr><th>Conjunto</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr></thead><tbody><tr><td style="text-align:center; font-weight:bold;">1º ao 3º</td>` + (p ? `<td style="text-align:center;">${getV(`gap-${pfx}-a-1`)}</td><td style="text-align:center;">${getV(`gap-${pfx}-b-1`)}</td><td style="text-align:center;">${getV(`gap-${pfx}-c-1`)}</td>` : `<td><input id="gap-${pfx}-a-1" class="w-100"></td><td><input id="gap-${pfx}-b-1" class="w-100"></td><td><input id="gap-${pfx}-c-1" class="w-100"></td>`) + `</tr><tr><td style="text-align:center; font-weight:bold;">4º ao 6º</td>` + (p ? `<td style="text-align:center;">${getV(`gap-${pfx}-a-2`)}</td><td style="text-align:center;">${getV(`gap-${pfx}-b-2`)}</td><td style="text-align:center;">${getV(`gap-${pfx}-c-2`)}</td>` : `<td><input id="gap-${pfx}-a-2" class="w-100"></td><td><input id="gap-${pfx}-b-2" class="w-100"></td><td><input id="gap-${pfx}-c-2" class="w-100"></td>`) + `</tr></tbody></table>`;

const itensExecucao = [{i: "1", d: "Limpeza e lavagem"}, {i: "2.1", d: "Limpeza de Break Out"}, {i: "3.1", d: "Soltar as uniões das cangalhas e tampar"}, {i: "3.2", d: "Retirar chavetas das cangalhas"}, {i: "3.3", d: "Remover as cangalhas"}, {i: "3.4", d: "Isolar as pontas dos bicos spray"}, {i: "3.5", d: "Retirar proteções de madeira"}, {i: "3.6", d: "Posicionar segmento na horizontal"}, {i: "3.7", d: "Aferir medida do GAP de chegada"}, {i: "3.8", d: "Soltar as 4 porcas de segurança"}, {i: "3.9", d: "Içar e separar a base superior da inferior"}, {i: "3.10", d: "Posicionar base superior no cavalete"}, {i: "3.11", d: "Retirar as proteções dos rolos"}, {i: "3.12", d: "Desconectar tubulação de graxa e parafusos"}, {i: "3.13", d: "Retirar os conjuntos dos rolos"}, {i: "3.14", d: "Guardar calços de alinhamento bons"}, {i: "3.15", d: "Preparar base superior para pintura"}, {i: "3.16", d: "Preparar base inferior para pintura"}, {i: "4.1", d: "Preparação de refrigeração nas cangalhas"}, {i: "4.2", d: "Testes de refrigeração nas cangalhas"}, {i: "5.1", d: "Preparar a base inferior"}, {i: "5.2", d: "Conferir o aperto dos calços nas bases"}, {i: "5.3", d: "Remover válvulas de graxa e testar"}, {i: "5.4", d: "Instalar os conjuntos de rolos na base"}, {i: "5.5", d: "Colocar parafusos M16 (com graxa)"}, {i: "5.6", d: "Aferir passline na base inferior"}, {i: "5.7", d: "Conectar tubos de lubrificação e testar"}, {i: "5.8", d: "Montar proteções dos rolos e apertar"}, {i: "5.9", d: "Passar graxa nas hastes"}, {i: "5.10", d: "Preparar a base superior"}, {i: "5.13", d: "Instalar rolos na base superior"}, {i: "5.15", d: "Aferir passline na base superior"}, {i: "5.19", d: "Transportar base sup e montar calços"}, {i: "5.21", d: "Conferir o GAP final e registrar"}, {i: "6.1", d: "Efetuar teste de todos resfriadores"}, {i: "6.2", d: "Realizar teste de lubrificação"}];
const tExec = (p) => itensExecucao.map((obj, i) => `<tr><td style="text-align:center;">${obj.i}</td><td>${obj.d}</td>` + (p ? `<td style="text-align:center;">${document.getElementById(`exe-p-${i}`) && document.getElementById(`exe-p-${i}`).checked ? 'X' : ''}</td><td style="text-align:center;">${document.getElementById(`exe-g-${i}`) && document.getElementById(`exe-g-${i}`).checked ? 'X' : ''}</td><td style="text-align:center;">${getV(`exe-resp-${i}`)}</td><td style="text-align:center;">${getV(`exe-mat-${i}`)}</td><td style="text-align:center;">${getV(`exe-dat-${i}`)}</td>` : `<td style="text-align:center"><input type="checkbox" id="exe-p-${i}"></td><td style="text-align:center"><input type="checkbox" id="exe-g-${i}"></td><td><input id="exe-resp-${i}" class="w-100"></td><td><input id="exe-mat-${i}" class="w-100"></td><td><input id="exe-dat-${i}" type="date" class="w-100"></td>`) + `</tr>`).join('');

export function carregarMedidaAresta() {
    let larguraEl = document.getElementById("folga-largura");
    if(!larguraEl) return;
    let dados = DADOS_FOLGA_ARESTA[larguraEl.value] || { ec: "", em: "", ei: "", ech: "", dc: "", dm: "", di: "", dch: "" };
    if(document.getElementById("fa-esq-cima")) {
        document.getElementById("fa-esq-cima").value = dados.ec; document.getElementById("fa-esq-meio").value = dados.em; document.getElementById("fa-esq-inf").value = dados.ei; document.getElementById("fa-esq-chav").value = dados.ech;
        document.getElementById("fa-dir-cima").value = dados.dc; document.getElementById("fa-dir-meio").value = dados.dm; document.getElementById("fa-dir-inf").value = dados.di; document.getElementById("fa-dir-chav").value = dados.dch;
    }
}

export function salvarMedidaAresta() {
    let larguraEl = document.getElementById("folga-largura");
    if(!larguraEl) return;
    DADOS_FOLGA_ARESTA[larguraEl.value] = { ec: document.getElementById("fa-esq-cima")?.value||"", em: document.getElementById("fa-esq-meio")?.value||"", ei: document.getElementById("fa-esq-inf")?.value||"", ech: document.getElementById("fa-esq-chav")?.value||"", dc: document.getElementById("fa-dir-cima")?.value||"", dm: document.getElementById("fa-dir-meio")?.value||"", di: document.getElementById("fa-dir-inf")?.value||"", dch: document.getElementById("fa-dir-chav")?.value||"" };
}

export function abrirFolhaoMCC4(id) {
    ID_FOLHAO_ATUAL = id; DADOS_FOLGA_ARESTA = {}; 
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    let tipoPeca = item.tipo.toUpperCase();
    let btnSalvar = document.querySelector("#modal-folhao-mcc4 .btn-success");
    if(btnSalvar) btnSalvar.setAttribute("onclick", "salvarLaudoInteligente()");

    let tituloModal = document.querySelector("#modal-folhao-mcc4 h2");
    if(tituloModal) tituloModal.innerHTML = `<i class="fas fa-clipboard-check text-blue-500 mr-2"></i> Liberação Oficial - ${tipoPeca} (${item.mcc_compat})`;
    document.querySelectorAll('#modal-folhao-mcc4 label').forEach(lbl => { if(lbl.innerText.toUpperCase().includes('Nº DO')) lbl.innerText = `Nº DO ${tipoPeca}`; });

    document.getElementById("mcc4-tag-name").innerText = id;
    document.getElementById("mcc4-data-inicio").valueAsDate = new Date();
    document.getElementById("mcc4-data-fim").valueAsDate = new Date();

    prepararAbasDinamicamente(tipoPeca);
    let objChecklist = BIBLIOTECA_CHECKLISTS[item.tipo] || { "INSPEÇÃO GERAL": ["Inspecionar equipamento."] };
    renderizarChecklist(objChecklist, "container-check-recebimento", "geral");

    document.querySelectorAll('.folhao-tab')[0].click();
    if (tipoPeca === "MOLDE") carregarMedidaAresta();
    document.getElementById("modal-folhao-mcc4").classList.remove("hidden");
}

function prepararAbasDinamicamente(tipoUpper) {
    let tabsContainer = document.querySelector('.folhao-tabs');
    let bodyContainer = document.querySelector('.folhao-body');

    document.querySelectorAll('.tab-dinamica').forEach(e => e.remove());
    document.querySelectorAll('.content-dinamico').forEach(e => e.remove());
    let tabsFixas = tabsContainer.querySelectorAll('button:not(.tab-dinamica)');
    if(tabsFixas[2]) tabsFixas[2].style.display = 'none';
    if(tabsFixas[3]) tabsFixas[3].style.display = 'none';
    if(tabsFixas[4]) tabsFixas[4].style.display = 'none';
    if(tabsFixas[1]) { tabsFixas[1].innerText = `2. Check List Geral`; tabsFixas[1].setAttribute('onclick', "trocarAbaFolhao(event, 'folhao-aba-recebimento')"); }

    if (tipoUpper === "BENDER") {
        tabsContainer.innerHTML += `<button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-chegada')">3. Chegada</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-execucao')">4. Execução</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-saida')">5. Saída</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'aba-materiais-geral')">6. Materiais</button>`;
        bodyContainer.innerHTML += gerarTelasBenderHTML();
    } else if (tipoUpper === "MOLDE") {
        tabsContainer.innerHTML += `<button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'molde-iden')">3. Identificação/Ajustes</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'molde-rolos')">4. Rolos/Aresta</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'molde-eletrica')">5. Elétrica</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'molde-peritagem')">6. Peritagem/Mecânica</button><button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'aba-materiais-geral')">7. Materiais</button>`;
        bodyContainer.innerHTML += gerarTelasMoldeHTML();
    }
}

function gerarTelasMoldeHTML() {
    const larguras = [830, 950, 1000, 1030, 1040, 1090, 1100, 1160, 1180, 1230, 1290, 1300, 1360, 1380, 1420, 1460, 1500, 1530, 1550, 1560, 1580, 1620];
    const optsLargura = larguras.map(w => `<option value="${w}">LARGURA ${w}</option>`).join('');
    return `
        <div id="molde-iden" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Identificação do Molde</h3><table class="premium-table" style="font-size:11px;"><tr><th>COMPONENTE</th><th>SAÍDA MÁQUINA</th><th>SAÍDA OFICINA</th><th>COMPONENTE</th><th>SAÍDA MÁQUINA</th><th>SAÍDA OFICINA</th></tr>${tIden(false)}</table>
            <h3 style="margin: 20px 0 10px;">Ajustes e Medidas Nominais</h3><table class="premium-table" style="font-size:11px;"><tr><th>DESCRIÇÃO</th><th>VALOR ENCONTRADO</th></tr>${tAN(false)}</table>
        </div>
        <div id="molde-rolos" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Foot/Edge Rolls (Afastamento)</h3><table class="premium-table" style="font-size:11px;"><tr><th>Momento</th><th>Lado Fixo (Afastado S/N)</th><th>Lado Móvel (Afastado S/N)</th><th>Placa Esq.</th><th>Placa Dir.</th></tr>${tFR(false)}</table>
            <h3 style="margin: 20px 0 10px;">Folga de Aresta</h3>
            <div class="input-group" style="max-width: 300px; margin-bottom: 20px;"><label>LARGURA DA FACE</label><select id="folga-largura" class="premium-select" onchange="carregarMedidaAresta()">${optsLargura}</select></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background:var(--bg-th); padding:10px;"><h4>PLACA ESQUERDA</h4> Cima: <input id="fa-esq-cima" onkeyup="salvarMedidaAresta()"><br>Meio: <input id="fa-esq-meio" onkeyup="salvarMedidaAresta()"><br>Inf: <input id="fa-esq-inf" onkeyup="salvarMedidaAresta()"><br>Chaveta: <input id="fa-esq-chav" onkeyup="salvarMedidaAresta()"></div>
                <div style="background:var(--bg-th); padding:10px;"><h4>PLACA DIREITA</h4> Cima: <input id="fa-dir-cima" onkeyup="salvarMedidaAresta()"><br>Meio: <input id="fa-dir-meio" onkeyup="salvarMedidaAresta()"><br>Inf: <input id="fa-dir-inf" onkeyup="salvarMedidaAresta()"><br>Chaveta: <input id="fa-dir-chav" onkeyup="salvarMedidaAresta()"></div>
            </div>
        </div>
        <div id="molde-eletrica" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Sensores de Nível (>10 MΩ)</h3>
            <table class="premium-table" style="font-size:11px; margin-bottom:15px;">
                <tr><th>Teste (Autoset Sensor)</th><th>Valores Encontrados</th></tr>
                <tr><td>Posição 1 (0mm / 20mA)</td><td><input id="se-auto-1" class="w-100"></td></tr><tr><td>Posição 2 (80mm / 12mA)</td><td><input id="se-auto-2" class="w-100"></td></tr><tr><td>Posição 3 (160mm / 4mA)</td><td><input id="se-auto-3" class="w-100"></td></tr>
                <tr><td>Resistência Pinos Sensor</td><td><input id="se-res-geral" class="w-100"></td></tr>
            </table>
            <table class="premium-table" style="font-size:11px;"><tr><th>Pinos Conectores (Isolação)</th><th>Valor Lido</th></tr>${tIso(false)}</table>
            <h3 style="margin: 20px 0 10px;">Resistência Termopares</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4>Placas LARGAS</h4><table class="premium-table" style="font-size:10px;"><tr><th>Termopar</th><th>Fixa</th><th>Móvel</th></tr>${tTermos('tl', 12, false)}</table></div><div><h4>Placas ESTREITAS</h4><table class="premium-table" style="font-size:10px;"><tr><th>Termopar</th><th>Esquerda</th><th>Direita</th></tr>${tTermos('te', 3, false)}</table></div></div>
        </div>
        <div id="molde-peritagem" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Peritagem Placas Largas</h3><table class="premium-table" style="font-size:10px;"><tr><th>Momento</th><th>Placa</th><th>Plan. Vertical</th><th>Plan. Horizontal</th><th>Prof. Ranhuras</th><th>Desgaste</th></tr>${tPPL(false)}</table>
            <h3 style="margin: 20px 0 10px;">Peritagem Placas Estreitas</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">CHEGADA (Esq / Dir)</h4><table class="premium-table" style="font-size:9px;">${tPE('cheg', false)}</table></div><div><h4 class="text-center">SAÍDA (Esq / Dir)</h4><table class="premium-table" style="font-size:9px;">${tPE('sai', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Caixas de Engrenagem (Folgas)</h3><table class="premium-table" style="font-size:10px;"><tr><th>Local</th><th>Sup. Esq</th><th>Inf. Esq</th><th>Sup. Dir</th><th>Inf. Dir</th></tr>${tCX(false)}</table>
            <h3 style="margin: 20px 0 10px;">Verificação dos Cardans</h3><table class="premium-table" style="font-size:10px;"><tr><th>Posição</th><th>Articulação</th><th>Sanfonada</th><th>Pino</th><th>Acoplamento</th></tr>${tCard(false)}</table>
            <h3 style="margin: 20px 0 10px;">Medidas da Bucha do Excêntrico</h3><table class="premium-table" style="font-size:10px;"><tr><th>COTAS</th><th>MED. DESENHO</th><th>MED. TOLERÁVEIS</th><th>DIREITO</th><th>ESQUERDO</th></tr>${tExc(false)}</table>
        </div>
        <div id="aba-materiais-geral" class="folhao-content content-dinamico hidden"><h3 style="margin-bottom: 15px;">Materiais Aplicados no Reparo</h3><textarea id="materiais-utilizados-texto" class="premium-textarea" rows="6"></textarea></div>
    `;
}

function gerarTelasBenderHTML() {
    return `
        <div id="bender-chegada" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Aferição GAP (Chegada)</h3>${gapTabela('cheg', false)}
            <h3 style="margin: 20px 0 10px;">Pass Line (Chegada)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Base Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-cheg', false)}</table></div><div><h4 class="text-center">Base Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-cheg', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Diâmetro dos Apoios (Ø205 ±0,30)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div class="input-group"><label>Base Inferior (A, B, C, D)</label><div style="display:flex;gap:5px"><input id="diam-inf-a" class="w-100"><input id="diam-inf-b" class="w-100"><input id="diam-inf-c" class="w-100"><input id="diam-inf-d" class="w-100"></div></div><div class="input-group"><label>Base Superior (A, B, C, D)</label><div style="display:flex;gap:5px"><input id="diam-sup-a" class="w-100"><input id="diam-sup-b" class="w-100"><input id="diam-sup-c" class="w-100"><input id="diam-sup-d" class="w-100"></div></div></div>
            <h3 style="margin: 20px 0 10px;">Check de Lubrificação (Chegada)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Base Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('inf', false)}</table></div><div><h4 class="text-center">Base Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('sup', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Inspeção de Rolos (Chegada)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-cheg', false)}</table></div><div><h4 class="text-center">Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-cheg', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Medidas dos Rolos (Chegada)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('inf-cheg', false)}</table></div><div><h4 class="text-center">Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('sup-cheg', false)}</table></div></div>
        </div>
        <div id="bender-execucao" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Checklist de Manutenção</h3><table class="premium-table" style="font-size: 11px;"><tr><th>Item</th><th>Descrição da Atividade</th><th>P</th><th>G</th><th>Executante</th><th>Matrícula</th><th>Data</th></tr>${tExec(false)}</table>
        </div>
        <div id="bender-saida" class="folhao-content content-dinamico hidden">
            <h3 style="margin-bottom: 10px;">Aferição GAP (Saída)</h3>${gapTabela('sai', false)}
            <h3 style="margin: 20px 0 10px;">Pass Line (Saída)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Base Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-sai', false)}</table></div><div><h4 class="text-center">Base Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-sai', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Inspeção de Rolos (Saída)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-sai', false)}</table></div><div><h4 class="text-center">Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-sai', false)}</table></div></div>
            <h3 style="margin: 20px 0 10px;">Medidas dos Rolos (Saída)</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><h4 class="text-center">Inferior</h4><table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('inf-sai', false)}</table></div><div><h4 class="text-center">Superior</h4><table class="premium-table" style="font-size:10px;"><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Classe</th></tr>${trMed('sup-sai', false)}</table></div></div>
        </div>
        <div id="aba-materiais-geral" class="folhao-content content-dinamico hidden"><h3 style="margin-bottom: 15px;">Materiais Aplicados no Reparo</h3><textarea id="materiais-utilizados-texto" class="premium-textarea" rows="6"></textarea></div>
    `;
}

export function salvarLaudoInteligente() {
    if (!window.verificarAcesso() || !ID_FOLHAO_ATUAL) return;
    let item = BANCO_ATIVOS.find(a => a.id === ID_FOLHAO_ATUAL);
    if (!item) return;
    let motivo = document.getElementById("mcc4-motivo").value || "Manutenção";
    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    let tag = ID_FOLHAO_ATUAL; fecharFolhaoMCC4(); renderReparos(); renderReservas(); renderAtivos(); window.calcularKpisGlobais();
    imprimirLaudoSalvo(tag, motivo);
}

export function imprimirLaudoSalvo(tag, motivo) {
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    let tipoUpper = item ? item.tipo.toUpperCase() : "";
    let divFantasma = document.querySelector("#print-content h2"); if(divFantasma) divFantasma.remove();
    if (tipoUpper === "BENDER") imprimirPDFBender(tag, motivo, "Bender");
    else if (tipoUpper === "MOLDE") imprimirPDFMolde(tag, motivo, "Molde");
    else imprimirPDFGenerico(tag, motivo, tipoUpper);
}

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
    <div style="width: 20%; text-align: center; border-right: 2px solid #000; padding: 10px;"><span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 34px; color: #002b5e; letter-spacing: -2px;">CSN</span></div>
    <div style="width: 60%; text-align: center; padding: 10px;"><h2 style="margin: 0; font-size: 16px; color: #000; text-decoration: underline;">${titulo}</h2><p style="margin: 5px 0 0 0; font-size: 10px; color: #333; text-transform: uppercase; font-weight: bold;">Laudo Oficial de Manutenção e Peritagem</p></div>
    <div style="width: 20%; font-size: 10px; border-left: 2px solid #000; padding: 10px; line-height: 1.5; font-weight: bold;"><div style="color: #002b5e;">TAG: <span style="color:#000;">${tag}</span></div><div>INÍCIO: <span style="color:#000; font-weight:normal;">${inicio}</span></div><div>FIM: <span style="color:#000; font-weight:normal;">${fim}</span></div></div>
</div>`;

function imprimirPDFMolde(tag, motivo, tipoStr) {
    const printDiv = document.getElementById("print-content");
    let listaInteligente = BIBLIOTECA_CHECKLISTS[tipoStr] || {};
    let htmlFolgas = "";
    Object.keys(DADOS_FOLGA_ARESTA).forEach(larg => {
        let d = DADOS_FOLGA_ARESTA[larg];
        if(d.ec || d.em || d.ei || d.ech || d.dc || d.dm || d.di || d.dch) {
            htmlFolgas += `<tr style="background:#ddd;"><th colspan="3">LARGURA ${larg}</th></tr><tr><td>Sup</td><td style="text-align:center">${d.ec}</td><td style="text-align:center">${d.dc}</td></tr><tr><td>Meio</td><td style="text-align:center">${d.em}</td><td style="text-align:center">${d.dm}</td></tr><tr><td>Inf</td><td style="text-align:center">${d.ei}</td><td style="text-align:center">${d.di}</td></tr><tr><td>Chaveta</td><td style="text-align:center">${d.ech}</td><td style="text-align:center">${d.dch}</td></tr>`;
        }
    });

    let html = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL DO MOLDE MCC#4", tag, getV('mcc4-data-inicio'), getV('mcc4-data-fim'))}
        <table style="margin-top:5px; background: #f9f9f9;"><tr><td><strong>MOTIVO DA OS:</strong> ${motivo}</td><td><strong>VEIO:</strong> MCC 4</td></tr></table>
        <div class="titulo-secao">1. IDENTIFICAÇÃO E AJUSTES</div>
        <table><tr><th>COMPONENTE</th><th>SAÍDA MÁQ.</th><th>SAÍDA OFICINA</th><th>COMPONENTE</th><th>SAÍDA MÁQ.</th><th>SAÍDA OFICINA</th></tr>${tIden(true)}</table>
        <table style="margin-top:10px;"><tr><th>DESCRIÇÃO</th><th>VALOR ENCONTRADO</th></tr>${tAN(true)}</table>
        <div class="titulo-secao">2. ROLOS E FOLGA DE ARESTA</div>
        <table><tr><th>Momento</th><th>Lado Fixo (Afastado S/N)</th><th>Lado Móvel (Afastado S/N)</th><th>Placa Esq.</th><th>Placa Dir.</th></tr>${tFR(true)}</table>
        
        <div style="display:flex; gap:15px; align-items: flex-start; width:100%;">
            <table style="flex-grow: 1;"><thead><tr><th>Posição de Medição</th><th>Esquerda</th><th>Direita</th></tr></thead><tbody>${htmlFolgas}</tbody></table>
            <div style="text-align:center;"><img src="desenho-molde.jpg" style="max-width:250px; max-height:200px;" onerror="this.style.display='none'"></div>
        </div>

        <div class="quebra-pagina"></div>
        <div class="titulo-secao">3. CHECK LIST GERAL DE INSPEÇÃO</div>
        <table>${gerarLinhasChecklistPDF(listaInteligente, "geral")}</table>
        
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">4. PERITAGEM E MECÂNICA</div>
        <table><tr><th colspan="6">PERITAGEM PLACAS LARGAS</th></tr><tr><th>Momento</th><th>Placa</th><th>Plan. Vertical</th><th>Plan. Horizontal</th><th>Prof. Ranhuras</th><th>Desgaste</th></tr>${tPPL(true)}</table>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="3">PLACAS ESTREITAS (CHEGADA)</th></tr>${tPE('cheg', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="3">PLACAS ESTREITAS (SAÍDA)</th></tr>${tPE('sai', true)}</table></div>
        </div>
        <table style="margin-top:10px;"><tr><th colspan="5">CAIXAS DE ENGRENAGEM E TRANSMISSÃO</th></tr><tr><th>Local</th><th>Sup. Esq</th><th>Inf. Esq</th><th>Sup. Dir</th><th>Inf. Dir</th></tr>${tCX(true)}</table>
        <table style="margin-top:10px;"><tr><th colspan="5">CARDANS</th></tr><tr><th>Posição</th><th>Articulação</th><th>Sanfonada</th><th>Pino</th><th>Acoplamento</th></tr>${tCard(true)}</table>
        
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">5. BUCHA EXCÊNTRICA E ELÉTRICA</div>
        
        <div style="display:flex; gap:15px; align-items: flex-start; width:100%;">
            <table style="flex-grow: 1;"><tr><th rowspan="2">COTAS</th><th rowspan="2">MEDIDAS DESENHO (mm)</th><th rowspan="2">TOLERÁVEIS (mm)</th><th colspan="2">MEDIDA (mm)</th></tr><tr><th>DIREITO</th><th>ESQUERDO</th></tr>${tExc(true)}</table>
            <div style="text-align:center;"><img src="desenho-excentrico.jpg" style="max-width:200px; max-height:200px;" onerror="this.style.display='none'"></div>
        </div>

        <table style="margin-top:10px;"><tr><th colspan="2">ELÉTRICA - SENSORES E ISOLAÇÃO</th></tr><tr><td>Autoset (1=0mm/20mA | 2=80mm/12mA | 3=160mm/4mA)</td><td style="text-align:center">P1: ${getV('se-auto-1')} | P2: ${getV('se-auto-2')} | P3: ${getV('se-auto-3')}</td></tr><tr><td>Resistência dos Pinos do Sensor</td><td style="text-align:center">${getV('se-res-geral')}</td></tr>${tIso(true)}</table>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="3">TERMOPARES LARGAS (10-20 Ω)</th></tr><tr><th>Elemento</th><th>Fixa</th><th>Móvel</th></tr>${tTermos('tl', 12, true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="3">TERMOPARES ESTREITAS (5-15 Ω)</th></tr><tr><th>Elemento</th><th>Esquerda</th><th>Direita</th></tr>${tTermos('te', 3, true)}</table></div>
        </div>
        <div class="titulo-secao">6. MATERIAIS APLICADOS NO REPARO E OBSERVAÇÕES</div>
        <div style="border: 1px solid #000; padding: 10px; min-height: 50px;">${getV('materiais-utilizados-texto').replace(/\n/g, "<br>")}</div>
        <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-weight: bold; padding-bottom: 30px;"><div><p>___________________________________</p><p>Líder Responsável</p></div><div><p>___________________________________</p><p>Inspetor de Qualidade</p></div></div>
    </div>`;
    printDiv.innerHTML = html; setTimeout(() => { window.print(); }, 500); 
}

function imprimirPDFBender(tag, motivo, tipoStr) {
    const printDiv = document.getElementById("print-content");
    let listaInteligente = BIBLIOTECA_CHECKLISTS[tipoStr] || {};
    let html = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL SEGMENTOS BENDER MCC#4", tag, getV('mcc4-data-inicio'), getV('mcc4-data-fim'))}
        <table style="margin-top:5px; background: #f9f9f9;"><tr><td><strong>MOTIVO DA OS:</strong> ${motivo}</td><td><strong>VEIO:</strong> MCC 4</td></tr></table>
        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA E LUBRIFICAÇÃO</div>
        <table>${gerarLinhasChecklistPDF(listaInteligente, "chegada")}</table>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="3">CHECK LUBRIFICAÇÃO - INFERIOR</th></tr><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('inf', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="3">CHECK LUBRIFICAÇÃO - SUPERIOR</th></tr><tr><th>Rolo</th><th>Status</th><th>Obs</th></tr>${trLub('sup', true)}</table></div>
        </div>
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">2. GAP E PASS LINE (CHEGADA)</div>
        <table><tr><th colspan="5">DIÂMETRO DOS APOIOS (Ø205 ±0,30)</th></tr><tr><th>Base</th><th>A</th><th>B</th><th>C</th><th>D</th></tr><tr><td style="text-align:center; font-weight:bold;">Inferior</td><td style="text-align:center;">${getV('diam-inf-a')}</td><td style="text-align:center;">${getV('diam-inf-b')}</td><td style="text-align:center;">${getV('diam-inf-c')}</td><td style="text-align:center;">${getV('diam-inf-d')}</td></tr><tr><td style="text-align:center; font-weight:bold;">Superior</td><td style="text-align:center;">${getV('diam-sup-a')}</td><td style="text-align:center;">${getV('diam-sup-b')}</td><td style="text-align:center;">${getV('diam-sup-c')}</td><td style="text-align:center;">${getV('diam-sup-d')}</td></tr></table>
        
        <div style="display:flex; gap:15px; align-items: flex-start; width:100%;">
            <table style="flex-grow: 1;"><tr><th colspan="4">AFERIÇÃO GAP - 255,00/254,70</th></tr><tr><th>Conj.</th><th>A</th><th>B</th><th>C</th></tr><tr><td style="text-align:center;font-weight:bold;">1º a 3º</td><td style="text-align:center;">${getV('gap-cheg-a-1')}</td><td style="text-align:center;">${getV('gap-cheg-b-1')}</td><td style="text-align:center;">${getV('gap-cheg-c-1')}</td></tr><tr><td style="text-align:center;font-weight:bold;">4º a 6º</td><td style="text-align:center;">${getV('gap-cheg-a-2')}</td><td style="text-align:center;">${getV('gap-cheg-b-2')}</td><td style="text-align:center;">${getV('gap-cheg-c-2')}</td></tr></table>
            <div style="text-align:center;"><img src="desenho-bender.jpg" style="max-width:200px; max-height:150px;" onerror="this.style.display='none'"></div>
        </div>
        
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="4">BASE INFERIOR - PASS LINE</th></tr><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-cheg', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="4">BASE SUPERIOR - PASS LINE</th></tr><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-cheg', true)}</table></div>
        </div>
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">3. INSPEÇÃO E MEDIDAS DE ROLOS (CHEGADA)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">INSPEÇÃO INFERIOR</th></tr><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-cheg', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">INSPEÇÃO SUPERIOR</th></tr><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-cheg', true)}</table></div>
        </div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table style="font-size:8px;"><tr><th colspan="8">MEDIDAS INFERIOR</th></tr><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('inf-cheg', true)}</table></div>
            <div style="width:50%;"><table style="font-size:8px;"><tr><th colspan="8">MEDIDAS SUPERIOR</th></tr><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('sup-cheg', true)}</table></div>
        </div>
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">4. CHECKLIST DE MANUTENÇÃO (EXECUÇÃO)</div>
        <table><tr><th>Item</th><th>Descrição da Atividade</th><th>P</th><th>G</th><th>Executante</th><th>Matrícula</th><th>Data</th></tr>${tExec(true)}</table>
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">5. AFERIÇÃO GAP E PASS LINE (SAÍDA / FINAL)</div>
        <table><tr><th colspan="4">AFERIÇÃO DE GAP (SAÍDA)</th></tr><tr><th>Conjunto</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr><tr><td style="text-align:center;">1º ao 3º</td><td style="text-align:center;">${getV('gap-sai-a-1')}</td><td style="text-align:center;">${getV('gap-sai-b-1')}</td><td style="text-align:center;">${getV('gap-sai-c-1')}</td></tr><tr><td style="text-align:center;">4º ao 6º</td><td style="text-align:center;">${getV('gap-sai-a-2')}</td><td style="text-align:center;">${getV('gap-sai-b-2')}</td><td style="text-align:center;">${getV('gap-sai-c-2')}</td></tr></table>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="4">BASE INFERIOR - PASS LINE (SAÍDA)</th></tr><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('inf-sai', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="4">BASE SUPERIOR - PASS LINE (SAÍDA)</th></tr><tr><th>Rolo</th><th>A</th><th>B</th><th>C</th></tr>${trPL('sup-sai', true)}</table></div>
        </div>
        <div class="quebra-pagina"></div>
        <div class="titulo-secao">6. INSPEÇÃO E MEDIDAS DOS ROLOS (SAÍDA)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">INSPEÇÃO INFERIOR</th></tr><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('inf-sai', true)}</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">INSPEÇÃO SUPERIOR</th></tr><tr><th>Rolo</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>${trRol('sup-sai', true)}</table></div>
        </div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table style="font-size:8px;"><tr><th colspan="8">MEDIDAS INFERIOR</th></tr><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('inf-sai', true)}</table></div>
            <div style="width:50%;"><table style="font-size:8px;"><tr><th colspan="8">MEDIDAS SUPERIOR</th></tr><tr><th>R</th><th>N1</th><th>M1</th><th>N2</th><th>M2</th><th>N3</th><th>M3</th><th>Cls</th></tr>${trMed('sup-sai', true)}</table></div>
        </div>
        <div class="titulo-secao">7. MATERIAIS APLICADOS NO REPARO E OBSERVAÇÕES</div>
        <div style="border: 1px solid #000; padding: 10px; min-height: 50px;">${getV('materiais-utilizados-texto').replace(/\n/g, "<br>")}</div>
        <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: bold; padding-bottom:30px;"><div><p>___________________________________</p><p>Líder Responsável / Operador</p></div><div><p>___________________________________</p><p>Inspetor de Qualidade</p></div></div>
    </div>`;
    printDiv.innerHTML = html; setTimeout(() => { window.print(); }, 500); 
}

function imprimirPDFGenerico(tag, motivo, tipoStr) {
    document.getElementById("print-content").innerHTML = `<div style="padding: 20px;"><h2>CSN - LIBERAÇÃO DE ${tipoStr}</h2><p>TAG: ${tag} | Motivo: ${motivo}</p></div>`;
    setTimeout(() => { window.print(); }, 400);
}

window.trocarAbaFolhao = trocarAbaFolhao;
window.fecharFolhaoMCC4 = fecharFolhaoMCC4;
window.salvarLaudoInteligente = salvarLaudoInteligente;
window.imprimirLaudoSalvo = imprimirLaudoSalvo;
window.carregarMedidaAresta = carregarMedidaAresta;
window.salvarMedidaAresta = salvarMedidaAresta;