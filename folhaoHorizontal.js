import { BANCO_ATIVOS } from './banco.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_HORIZ_ATUAL = null;

// DADOS DO DOCUMENTO: INSPEÇÃO DE CHEGADA
const itensChegadaHorizontal = [
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
    { grupo: "", desc: "Conexões apertadas." }
];

const refPassLineInfHorizontal = ["60,00", "60,00", "60,00", "60,00", "60,00", "60,00", "60,00"]; 
const refPassLineSupHorizontal = ["35,00", "35,00", "35,00", "35,00", "35,00", "35,00", "35,00"]; 

const manutencaoHorizontal = [
    { item: "1", desc: "Lavagem e/ou Limpeza Mecânica" },
    { item: "2.1", desc: "Teste Hidrostático" },
    { item: "2.2", desc: "Teste Hidráulico" },
    { item: "2.3", desc: "Teste de Refrigeração" },
    { item: "2.4", desc: "Aferição de Gap (255mm)" },
    { item: "2.5", desc: "Abrir Segmento" },
    { item: "3.1", desc: "Desmontagem de proteções" },
    { item: "3.2", desc: "Retirar chavetas" },
    { item: "3.3", desc: "Desconectar pinos dos cilindros de elevação" },
    { item: "3.4", desc: "Retirada da Barra Transversal" },
    { item: "3.5", desc: "Desconectar flexíveis principais" },
    { item: "3.6", desc: "Retirar parafusos de fixação das buchas" },
    { item: "3.7", desc: "Transferir base para stand" },
    { item: "3.8", desc: "Aferir pass-line Inf. e Sup." },
    { item: "3.9", desc: "Retirar cangalhas (Inf. e Sup.)" },
    { item: "3.10", desc: "Desconectar flexíveis das juntas rotativas" },
    { item: "3.11", desc: "Retirar proteções de mancal" },
    { item: "3.12", desc: "Desmontagem dos rolos (Destorquear e soltá-los) inferior" },
    { item: "3.13", desc: "Desmontagem dos rolos (Destorquear e soltá-los) superior" },
    { item: "3.14", desc: "Desmontagem da estrutura do rolo acionado" },
    { item: "3.15", desc: "Retirada dos cilindros motriz" },
    { item: "3.16", desc: "Desmontagem de buchas e conjuntos na base" },
    { item: "3.17", desc: "Desmontagem de buchas e conjuntos" },
    { item: "3.18", desc: "Preparar bases e barra para jateamento e pintura" },
    { item: "4.1", desc: "Desmontagem de proteções e preparação dos calços e base Inferior" },
    { item: "4.2", desc: "Troca de oring’s" },
    { item: "4.3", desc: "Montagem de distribuidores" },
    { item: "4.4", desc: "Fixação dos distribuidores na base" },
    { item: "4.5", desc: "Desobstrução das tubulações de graxa e de refrigeração" },
    { item: "4.6", desc: "Preparação dos Rolos" },
    { item: "4.7", desc: "Montagem de flexíveis na base" },
    { item: "4.8", desc: "Preparação de pés e tulipas" },
    { item: "4.9", desc: "Montagem de rolos na base" },
    { item: "4.10", desc: "Torque dos parafusos dos mancais" },
    { item: "4.11", desc: "Regulagem dos distribuidores" },
    { item: "4.12", desc: "Teste de Lubrificação" },
    { item: "4.13", desc: "Fixação dos distribuidores na base" },
    { item: "4.14", desc: "Preparar hastes" },
    { item: "4.15", desc: "Preparar e montar conjuntos de ajustes e buchas" },
    { item: "4.16", desc: "Montagem das buchas e conjuntos na base" },
    { item: "4.17", desc: "Montagem dos flexíveis principais" },
    { item: "4.18", desc: "Conectar flexíveis de juntas nos rolos" },
    { item: "4.19", desc: "Teste hidrostático juntas rotativas" },
    { item: "4.20", desc: "Teste hidrostático Mancal" },
    { item: "4.21", desc: "Aferir Pass-Line e Ajustar" },
    { item: "4.22", desc: "Montagem e alinhamento das cangalhas" },
    { item: "5.1", desc: "Desmontar todos os bicos" },
    { item: "5.2", desc: "Realizar Limpeza das tubulações" },
    { item: "5.3", desc: "Montar os bicos e flexíveis" },
    { item: "5.4", desc: "Realizar teste" },
    { item: "6.1", desc: "Preparação de Lines ou troca" },
    { item: "6.2", desc: "Preparação dos calços e apoios" },
    { item: "6.3", desc: "Troca de oring’s" },
    { item: "6.4", desc: "Desobstrução de tubulações de graxa e de refrigeração" },
    { item: "6.5", desc: "Montagem de proteções das tubulações e de stauff" },
    { item: "6.6", desc: "Verificar roscas dos parafusos M30" },
    { item: "6.7", desc: "Montagem do rolo motriz" },
    { item: "7.1", desc: "Preparação para receber estrutura e cilindros (Lines e mancais)" },
    { item: "7.2", desc: "Montagem de Cilindros Motriz" },
    { item: "7.3", desc: "Desmontagem de proteções e preparação dos calços e base Superior" },
    { item: "7.4", desc: "Troca de oring’s" },
    { item: "7.5", desc: "Desobstruição das tubulações de graxa e de refrigeração" },
    { item: "7.6", desc: "Preparação dos Rolos" },
    { item: "7.7", desc: "Troca de parafusos dos calços de alinhamento pass-line" },
    { item: "7.8", desc: "Montagem de rolos na base" },
    { item: "7.9", desc: "Aperto de parafusos nos mancais" },
    { item: "7.10", desc: "Montagem da estrutura" },
    { item: "7.11", desc: "Montagem de distribuidores" },
    { item: "7.12", desc: "Regulagem dos distribuidores" },
    { item: "7.13", desc: "Teste de Lubrificação" },
    { item: "7.14", desc: "Fixação dos distribuidores na base" },
    { item: "7.15", desc: "Montagem de proteções dos mancais" },
    { item: "7.16", desc: "Realização do teste hidrostático da base" },
    { item: "7.17", desc: "Virar a base" },
    { item: "7.18", desc: "Torque dos parafusos dos mancais" },
    { item: "7.19", desc: "Montagem de flexíveis de junta rotativa" },
    { item: "7.20", desc: "Aferir e ajustar pass-line" },
    { item: "7.21", desc: "Troca das válvulas dos cilindros" },
    { item: "7.22", desc: "Troca dos mangotes hidráulicos dos cilindros" },
    { item: "7.23", desc: "Montagem de proteções sanfonadas" },
    { item: "7.24", desc: "Substituição dos engates rápidos (hidráulicos)" },
    { item: "7.25", desc: "Substituição dos engates rápidos (refrigeração)" },
    { item: "7.26", desc: "Montagem de cangalhas na base" },
    { item: "8.1", desc: "Troca de cilindros de elevação" },
    { item: "8.2", desc: "Troca de cilindros clamp" },
    { item: "8.3", desc: "Montagem de blocos nos cilindros clamp" },
    { item: "8.4", desc: "Troca de oring’s (completo)" },
    { item: "8.5", desc: "Aperto de tubulações (Conferir)" },
    { item: "8.6", desc: "Montagem de mangotes dos cilindros de elevação" },
    { item: "8.7", desc: "Teste hidráulico da barra" },
    { item: "9.1", desc: "Movimentar base sup para inf" },
    { item: "9.2", desc: "Conectar flexíveis principais (graxa e água)" },
    { item: "9.3", desc: "Montar parafusos das buchas" },
    { item: "9.4", desc: "Preparação das hastes para receber a barra" },
    { item: "9.5", desc: "Alinhamento de cangalha superior" },
    { item: "9.6", desc: "Teste geral de juntas" },
    { item: "9.7", desc: "Montagem da barra transversal no segmento" },
    { item: "9.8", desc: "Aperto de parafusos dos cilindros clamp" },
    { item: "9.9", desc: "Montagem de pinos e chavetas" },
    { item: "9.10", desc: "Montagem de proteções" },
    { item: "9.11", desc: "Conexão da hidráulica" },
    { item: "9.12", desc: "Equalização dos cilindros motriz" },
    { item: "9.13", desc: "Aferir e Ajustar Gap (255mm)" },
    { item: "10.1", desc: "Teste e Liberação hidráulica" },
    { item: "10.2", desc: "Teste e Liberação hidrostática" },
    { item: "10.3", desc: "Retirar Segmento do Stand" },
    { item: "10.4", desc: "Montagem de Acoplamentos" },
    { item: "10.5", desc: "Teste de lubrificação geral" }
];

window.abrirFolhaoHorizontal = function(id) {
    ID_FOLHAO_HORIZ_ATUAL = id;
    
    let tituloPdf = document.getElementById('titulo-pdf');
    if(tituloPdf) tituloPdf.innerText = "SISTEMA OMS - FOLHA DE LIBERAÇÃO - SEGMENTO HORIZONTAL (MCC 4)";

    let tagNameEl = document.getElementById('horizontal-tag-name');
    if(tagNameEl) tagNameEl.innerText = id;

    // Zera os inputs
    document.getElementById('horiz-data-inicio').valueAsDate = new Date();
    document.getElementById('horiz-data-fim').valueAsDate = new Date();
    document.getElementById('horiz-motivo').value = '';

    document.getElementById('modal-folhao-horizontal').classList.remove('hidden');
    renderizarInspecaoChegadaHorizontal();
    renderizarPassLinesHorizontal();
    renderizarChecklistManutencaoHorizontal();
    renderizarTabelaMateriaisIniciaisHorizontal();
    
    window.trocarAbaHorizontal({ currentTarget: document.querySelector('#modal-folhao-horizontal .folhao-tab') }, 'horiz-aba-dados');
};

window.fecharFolhaoHorizontal = function() {
    document.getElementById('modal-folhao-horizontal').classList.add('hidden');
    ID_FOLHAO_HORIZ_ATUAL = null;
};

// ==============================================================
// CORREÇÃO DO BUG DA TELA PRETA (O "HIDDEN" REIMPLANTADO)
// ==============================================================
window.trocarAbaHorizontal = function(evt, abaId) {
    // 1. Esconde as abas e destrava o CSS inline que ficou preso no HTML
    document.querySelectorAll('#modal-folhao-horizontal .folhao-content').forEach(aba => {
        aba.classList.add('hidden');
        aba.classList.remove('active');
        aba.style.display = ''; // <-- ESSA É A CHAVE QUE DESTRAVA A TELA!
    });
    
    // 2. Tira o brilho azul de todos os botões
    document.querySelectorAll('#modal-folhao-horizontal .folhao-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 3. Mostra a aba destino e garante que ela não tem travas
    let abaDestino = document.getElementById(abaId);
    if(abaDestino) {
        abaDestino.classList.remove('hidden');
        abaDestino.classList.add('active');
        abaDestino.style.display = ''; // <-- AQUI TAMBÉM
    }
    
    if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
};

function renderizarInspecaoChegadaHorizontal() {
    const tbody = document.getElementById('tabela-horiz-inspecao-chegada');
    let htmlContent = '';
    itensChegadaHorizontal.forEach((item, index) => {
        const numItem = String(index + 1).padStart(2, '0');
        const grupoHtml = item.grupo ? `<strong style="color: var(--text-accent); font-size:11px;">${item.grupo}</strong><br>` : '';
        htmlContent += `<tr>
            <td class="font-code text-muted">${numItem}</td>
            <td>${grupoHtml}${item.desc}</td>
            <td style="text-align:center;"><input type="radio" name="insp_chg_hz_${index}" value="SIM" checked></td>
            <td style="text-align:center;"><input type="radio" name="insp_chg_hz_${index}" value="NÃO"></td>
        </tr>`;
    });
    tbody.innerHTML = htmlContent;
}

function renderizarPassLinesHorizontal() {
    const renderTable = (idTbody, refs) => {
        const tbody = document.getElementById(idTbody);
        let htmlContent = '';
        refs.forEach((ref, index) => {
            htmlContent += `<tr>
                <td style="text-align:center; font-weight:bold;">${index + 1}º</td>
                <td style="text-align:center; font-weight:bold;">${ref}</td>
                <td><input type="number" id="${idTbody}-a-${index}" class="w-100" step="0.01"></td>
                <td><input type="number" id="${idTbody}-b-${index}" class="w-100" step="0.01"></td>
                <td><input type="number" id="${idTbody}-c-${index}" class="w-100" step="0.01"></td>
            </tr>`;
        });
        tbody.innerHTML = htmlContent;
    };
    renderTable('horiz-passline-inf-chegada', refPassLineInfHorizontal);
    renderTable('horiz-passline-sup-chegada', refPassLineSupHorizontal);
    renderTable('horiz-passline-inf-saida', refPassLineInfHorizontal);
    renderTable('horiz-passline-sup-saida', refPassLineSupHorizontal);
}

function renderizarChecklistManutencaoHorizontal() {
    const tbody = document.getElementById('horiz-tabela-manutencao');
    let htmlContent = '';
    manutencaoHorizontal.forEach((tarefa, index) => {
        htmlContent += `<tr>
            <td style="text-align:center; font-weight:bold;" class="text-warning">${tarefa.item}</td>
            <td style="font-size: 11px;">${tarefa.desc}</td>
            <td style="text-align:center;"><input type="checkbox" id="check_hz_${index}"></td>
            <td><input type="text" class="w-100" id="mat_hz_${index}" placeholder="Matrícula"></td>
            <td><input type="date" class="w-100" id="data_hz_${index}"></td>
        </tr>`;
    });
    tbody.innerHTML = htmlContent;
}

window.addLinhaMaterialHorizontal = function() {
    const tbody = document.getElementById('horiz-tabela-materiais');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="w-100" placeholder="SKU / Material"></td>
                    <td><input type="number" style="width: 80px;" placeholder="Qtd"></td>`;
    tbody.appendChild(tr);
};

function renderizarTabelaMateriaisIniciaisHorizontal() {
    document.getElementById('horiz-tabela-materiais').innerHTML = '';
    for(let i = 0; i < 3; i++) { window.addLinhaMaterialHorizontal(); }
}

// ESTILOS PARA O PDF PREMIUM
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

window.salvarEImprimirFolhaoHorizontal = function() {
    if (!window.verificarAcesso() || !ID_FOLHAO_HORIZ_ATUAL) return;

    let tag = ID_FOLHAO_HORIZ_ATUAL;
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    if (!item) return;

    item.ton = 0;
    item.dias = 0;
    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    let motivo = document.getElementById('horiz-motivo') ? document.getElementById('horiz-motivo').value : 'Manutenção';
    
    let btnPDF = `<button onclick="window.abrirFolhaoHorizontal('${tag}')" class="btn-outline-danger" style="padding: 2px 8px; font-size: 10px; margin-left: 10px; cursor: pointer;"><i class="fas fa-file-pdf"></i> Visualizar Folhão</button>`;
    
    if (window.registrarHistorico) {
        window.registrarHistorico(tag, `Laudo Oficial (Horizontal MCC4) concluído. Motivo: ${motivo}. <br><div style="margin-top: 5px;">${btnPDF}</div>`);
    }

    renderReparos(); 
    renderReservas(); 
    renderAtivos(); 
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    const dtInicio = document.getElementById('horiz-data-inicio') ? document.getElementById('horiz-data-inicio').value : '';
    const dtFim = document.getElementById('horiz-data-fim') ? document.getElementById('horiz-data-fim').value : '';
    const numSeg = document.getElementById('horiz-num-segmento') ? document.getElementById('horiz-num-segmento').value : '';
    const veio = document.getElementById('horiz-veio') ? document.getElementById('horiz-veio').value : '';
    const tipoExec = document.getElementById('horiz-tipo-execucao') ? document.getElementById('horiz-tipo-execucao').value : '';

    let htmlImp = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL SEGMENTO HORIZONTAL MCC#4", tag, dtInicio, dtFim)}
        <table style="margin-top:5px; background: #f9f9f9;">
            <tr>
                <td><strong>VEIO:</strong> ${veio}</td>
                <td><strong>SEGMENTO:</strong> ${numSeg}</td>
                <td><strong>MOTIVO DA OS:</strong> ${motivo}</td>
                <td><strong>TIPO:</strong> ${tipoExec}</td>
            </tr>
        </table>

        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA OFICIAL</div>
        <table>
            <tr><th style="width:5%;">Nº</th><th>Descrição da Inspeção</th><th style="width:15%;">Status</th></tr>`;
    
    itensChegadaHorizontal.forEach((it, index) => {
        let resposta = 'NÃO';
        let radios = document.getElementsByName(`insp_chg_hz_${index}`);
        for(let r of radios) { if(r.checked) resposta = r.value; }
        htmlImp += `<tr><td style="text-align:center; font-weight:bold;">${index+1}</td><td>${it.grupo ? `<b>${it.grupo}</b> - ` : ''}${it.desc}</td><td style="text-align:center; font-weight:bold;">${resposta}</td></tr>`;
    });
    htmlImp += `</table><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">2. AFERIÇÃO PASS LINE (CHEGADA)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">BASE INFERIOR (CHEGADA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineInfHorizontal.forEach((ref, index) => {
        let a = document.getElementById(`horiz-passline-inf-chegada-a-${index}`)?.value || '';
        let b = document.getElementById(`horiz-passline-inf-chegada-b-${index}`)?.value || '';
        let c = document.getElementById(`horiz-passline-inf-chegada-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">BASE SUPERIOR (CHEGADA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineSupHorizontal.forEach((ref, index) => {
        let a = document.getElementById(`horiz-passline-sup-chegada-a-${index}`)?.value || '';
        let b = document.getElementById(`horiz-passline-sup-chegada-b-${index}`)?.value || '';
        let c = document.getElementById(`horiz-passline-sup-chegada-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div></div><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">3. CHECKLIST DE EXECUÇÃO</div>
        <table><tr><th style="width:5%;">Item</th><th>Descrição da Atividade</th><th style="width:5%;">Feito</th><th style="width:15%;">Matrícula</th><th style="width:15%;">Data</th></tr>`;
    manutencaoHorizontal.forEach((tarefa, index) => {
        const checked = document.getElementById(`check_hz_${index}`) && document.getElementById(`check_hz_${index}`).checked ? 'X' : '';
        const mat = document.getElementById(`mat_hz_${index}`) ? document.getElementById(`mat_hz_${index}`).value : '';
        const data = document.getElementById(`data_hz_${index}`) ? document.getElementById(`data_hz_${index}`).value : '';
        htmlImp += `<tr><td style="text-align:center;">${tarefa.item}</td><td style="font-size:10px;">${tarefa.desc}</td><td style="text-align:center; font-weight:bold;">${checked}</td><td style="text-align:center;">${mat}</td><td style="text-align:center;">${data}</td></tr>`;
    });
    htmlImp += `</table><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">4. AFERIÇÃO PASS LINE (SAÍDA FINAL)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">BASE INFERIOR (SAÍDA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineInfHorizontal.forEach((ref, index) => {
        let a = document.getElementById(`horiz-passline-inf-saida-a-${index}`)?.value || '';
        let b = document.getElementById(`horiz-passline-inf-saida-b-${index}`)?.value || '';
        let c = document.getElementById(`horiz-passline-inf-saida-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">BASE SUPERIOR (SAÍDA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineSupHorizontal.forEach((ref, index) => {
        let a = document.getElementById(`horiz-passline-sup-saida-a-${index}`)?.value || '';
        let b = document.getElementById(`horiz-passline-sup-saida-b-${index}`)?.value || '';
        let c = document.getElementById(`horiz-passline-sup-saida-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div></div>`;

    htmlImp += `
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 12px; font-weight: bold; padding-bottom:30px;">
            <div><p>___________________________________</p><p>Líder Responsável / Operador</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    </div>`;

    document.getElementById('print-content').innerHTML = htmlImp;
    window.fecharFolhaoHorizontal();
    setTimeout(() => window.print(), 500);
};