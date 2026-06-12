import { BANCO_ATIVOS } from './banco.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_R2_ATUAL = null;

const itensChegadaR2 = [
    { grupo: "LUBRIFICAÇÃO", desc: "Sistema de lubrificação isento de vazamentos." },
    { grupo: "", desc: "Tubulação amassada." },
    { grupo: "", desc: "Distribuidores de graxa funcionando corretamente sem vazamentos." },
    { grupo: "REFRIGERAÇÃO", desc: "Resfriadores completos e alinhados." },
    { grupo: "", desc: "Bicos obstruídos." },
    { grupo: "", desc: "Flexíveis isentos de vazamentos." },
    { grupo: "", desc: "Tubulações isentas de empenos." },
    { grupo: "", desc: "Tubulações furadas." },
    { grupo: "CILINDROS", desc: "Isento de vazamento." },
    { grupo: "", desc: "Conexões completas e apertadas." },
    { grupo: "", desc: "Flexíveis isentos de vazamentos." },
    { grupo: "", desc: "Tubulações isentas de empenos." },
    { grupo: "PORCA HIDRÁULICA", desc: "Isento de vazamento." },
    { grupo: "", desc: "Conexões completas e apertadas." },
    { grupo: "", desc: "Proteções danificadas." },
    { grupo: "", desc: "Tubulações isentas de vazamentos." },
    { grupo: "ESTRUTURA", desc: "Tubulações isentas de amassados." },
    { grupo: "", desc: "Proteções isentas de avarias." },
    { grupo: "", desc: "Estrutura com break-out." },
    { grupo: "", desc: "Rolamentos quebrados." },
    { grupo: "", desc: "Rolos travados" },
    { grupo: "", desc: "Mancais furados." },
    { grupo: "", desc: "Estrias do rolo puxador danificada." },
    { grupo: "", desc: "Conexões apertadas." }
];

const refPassLineInf = ["55,19", "58,48", "59,70", "60,15", "60,01", "60,01", "60,01"]; 
const refPassLineSup = ["39,46", "36,39", "35,26", "35,00", "34,99", "34,99", "34,99"]; 

const manutencaoR2 = [
    { item: "1", desc: "Lavagem e/ou Limpeza Mecânica" },
    { item: "2.1", desc: "Teste Hidrostático" },
    { item: "2.2", desc: "Teste Hidráulico" },
    { item: "2.4", desc: "Aferição de Gap (255mm)" },
    { item: "3.1", desc: "Desmontagem de proteções" },
    { item: "3.7", desc: "Transferir base para stand" },
    { item: "4.9", desc: "Montagem de rolos na base (Inferior)" },
    { item: "5.1", desc: "Desmontar todos os bicos (Cangalhas)" },
    { item: "6.7", desc: "Montagem do rolo motriz" },
    { item: "7.8", desc: "Montagem de rolos na base (Superior)" },
    { item: "8.1", desc: "Troca de cilindros de elevação (Barra Transversal)" },
    { item: "9.7", desc: "Montagem da barra transversal no segmento" },
    { item: "9.13", desc: "Aferir e Ajustar Gap (255mm)" },
    { item: "10.1", desc: "Teste e Liberação hidráulica Final" }
];

window.abrirFolhaoR2 = function(id) {
    ID_FOLHAO_R2_ATUAL = id;
    let tagNameEl = document.getElementById('r2-tag-name');
    if (tagNameEl) tagNameEl.innerText = "TAG: " + id;
    
    document.getElementById('modal-folhao-r2').classList.remove('hidden');
    renderizarInspecaoChegadaR2();
    renderizarPassLinesR2();
    renderizarChecklistManutencaoR2();
    renderizarTabelaMateriaisIniciaisR2();
    window.trocarAbaR2({ currentTarget: document.querySelector('#modal-folhao-r2 .folhao-tab') }, 'r2-aba-chegada');
}

window.fecharFolhaoR2 = function() {
    document.getElementById('modal-folhao-r2').classList.add('hidden');
    ID_FOLHAO_R2_ATUAL = null;
}

// ==============================================================
// CORREÇÃO DO BUG DA TELA PRETA R2
// ==============================================================
window.trocarAbaR2 = function(evt, abaId) {
    document.querySelectorAll('#modal-folhao-r2 .folhao-content').forEach(aba => {
        aba.classList.add('hidden');
        aba.classList.remove('active');
    });
    document.querySelectorAll('#modal-folhao-r2 .folhao-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    let abaDestino = document.getElementById(abaId);
    if(abaDestino) {
        abaDestino.classList.remove('hidden');
        abaDestino.classList.add('active');
    }
    
    if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

function renderizarInspecaoChegadaR2() {
    const tbody = document.getElementById('tabela-r2-inspecao-chegada');
    tbody.innerHTML = '';
    itensChegadaR2.forEach((item, index) => { 
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-code text-muted">${String(index + 1).padStart(2, '0')}</td>
            <td>${item.grupo ? `<strong style="color: var(--text-accent); font-size:11px;">${item.grupo}</strong><br>` : ''}${item.desc}</td>
            <td style="text-align:center;"><input type="radio" name="insp_chg_r2_${index}" value="SIM" checked></td>
            <td style="text-align:center;"><input type="radio" name="insp_chg_r2_${index}" value="NÃO"></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarPassLinesR2() {
    const renderTable = (idTbody, refs, isInf) => {
        const tbody = document.getElementById(idTbody);
        tbody.innerHTML = '';
        refs.forEach((ref, index) => {
            const tId = isInf ? "inf" : "sup";
            tbody.innerHTML += `
                <tr>
                    <td style="text-align:center; font-weight:bold;">${index + 1}º</td>
                    <td style="text-align:center; font-weight:bold;">${ref}</td>
                    <td><input type="number" id="pl-r2-${idTbody}-a-${index}" class="w-100" step="0.01"></td>
                    <td><input type="number" id="pl-r2-${idTbody}-b-${index}" class="w-100" step="0.01"></td>
                    <td><input type="number" id="pl-r2-${idTbody}-c-${index}" class="w-100" step="0.01"></td>
                </tr>
            `;
        });
    };
    renderTable('r2-passline-inf-chegada', refPassLineInf, true);
    renderTable('r2-passline-sup-chegada', refPassLineSup, false);
    renderTable('r2-passline-inf-saida', refPassLineInf, true);
    renderTable('r2-passline-sup-saida', refPassLineSup, false);
}

function renderizarChecklistManutencaoR2() {
    const tbody = document.getElementById('r2-tabela-manutencao');
    tbody.innerHTML = '';
    manutencaoR2.forEach((tarefa, index) => { 
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center; font-weight:bold;" class="text-warning">${tarefa.item}</td>
                <td style="font-size: 11px;">${tarefa.desc}</td>
                <td style="text-align:center;"><input type="checkbox" id="chk-r2-${index}"></td>
                <td><input type="text" id="mat-r2-${index}" class="w-100" placeholder="Matrícula"></td>
                <td><input type="date" id="dat-r2-${index}" class="w-100"></td>
            </tr>
        `;
    });
}

window.addLinhaMaterialR2 = function() {
    const tbody = document.getElementById('r2-tabela-materiais');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="w-100" placeholder="Descrição ou Código SKU"></td>
                    <td><input type="number" style="width: 80px;" placeholder="Qtd"></td>`;
    tbody.appendChild(tr);
}

function renderizarTabelaMateriaisIniciaisR2() {
    document.getElementById('r2-tabela-materiais').innerHTML = '';
    for(let i=0; i<3; i++) { window.addLinhaMaterialR2(); } 
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
    <div style="width: 20%; font-size: 10px; border-left: 2px solid #000; padding: 10px; line-height: 1.5; font-weight: bold;"><div style="color: #002b5e;">TAG: <span style="color:#000;">${tag}</span></div><div>DATA: <span style="color:#000; font-weight:normal;">${inicio}</span></div></div>
</div>`;

window.salvarEImprimirFolhaoR2 = function() {
    if (!window.verificarAcesso() || !ID_FOLHAO_R2_ATUAL) return;

    let tag = ID_FOLHAO_R2_ATUAL;
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    if (!item) return;

    item.ton = 0;
    item.dias = 0;
    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    let btnPDF = `<button onclick="window.abrirFolhaoR2('${tag}')" class="btn-outline-danger" style="padding: 2px 8px; font-size: 10px; margin-left: 10px; cursor: pointer;"><i class="fas fa-file-pdf"></i> Visualizar Folhão</button>`;
    
    if (window.registrarHistorico) {
        window.registrarHistorico(tag, `Laudo Oficial (Straightener R2) concluído. <br><div style="margin-top: 5px;">${btnPDF}</div>`);
    }

    renderReparos(); 
    renderReservas(); 
    renderAtivos(); 
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    let hoje = new Date().toLocaleDateString('pt-BR');
    let htmlImp = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL SEGMENTO STRAIGHTENER R2 MCC#4", tag, hoje, hoje)}

        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA OFICIAL</div>
        <table>
            <tr><th style="width:5%;">Nº</th><th>Descrição da Inspeção</th><th style="width:15%;">Status</th></tr>`;
    
    itensChegadaR2.forEach((it, index) => {
        let resposta = 'N/A';
        let radios = document.getElementsByName(`insp_chg_r2_${index}`);
        for(let r of radios) { if(r.checked) resposta = r.value; }
        htmlImp += `<tr><td style="text-align:center; font-weight:bold;">${index+1}</td><td>${it.grupo ? `<b>${it.grupo}</b> - ` : ''}${it.desc}</td><td style="text-align:center; font-weight:bold;">${resposta}</td></tr>`;
    });
    htmlImp += `</table><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">2. CHECKLIST DE EXECUÇÃO</div>
        <table><tr><th style="width:5%;">Item</th><th>Descrição da Atividade</th><th style="width:5%;">Feito</th><th style="width:15%;">Matrícula</th><th style="width:15%;">Data</th></tr>`;
    manutencaoR2.forEach((tarefa, index) => {
        const checked = document.getElementById(`chk-r2-${index}`) && document.getElementById(`chk-r2-${index}`).checked ? 'X' : '';
        const mat = document.getElementById(`mat-r2-${index}`) ? document.getElementById(`mat-r2-${index}`).value : '';
        const data = document.getElementById(`dat-r2-${index}`) ? document.getElementById(`dat-r2-${index}`).value : '';
        htmlImp += `<tr><td style="text-align:center;">${tarefa.item}</td><td style="font-size:10px;">${tarefa.desc}</td><td style="text-align:center; font-weight:bold;">${checked}</td><td style="text-align:center;">${mat}</td><td style="text-align:center;">${data}</td></tr>`;
    });
    htmlImp += `</table>`;

    htmlImp += `
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: bold; padding-bottom:30px;">
            <div><p>___________________________________</p><p>Líder Responsável / Operador</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    </div>`;

    document.getElementById('print-content').innerHTML = htmlImp;
    window.fecharFolhaoR2();
    setTimeout(() => window.print(), 500);
};