import { BANCO_ATIVOS } from './banco.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_BOW_ATUAL = null;

const itensChegadaBow = [
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

const refPassLineInfBow = ["68,66", "91,34", "105,13", "110,00", "105,13", "91,34", "68,66"]; 
const refPassLineSupBow = ["124,13", "102,66", "89,61", "85,00", "89,61", "102,66", "124,13"]; 

const manutencaoBow = [
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

window.abrirFolhaoBow = function(id) {
    ID_FOLHAO_BOW_ATUAL = id;
    let tituloPdf = document.getElementById('titulo-pdf');
    if(tituloPdf) tituloPdf.innerText = "SISTEMA OMS - FOLHA DE LIBERAÇÃO - SEGMENTO BOW (MCC 4)";

    let tagNameEl = document.getElementById('bow-tag-name');
    if(tagNameEl) tagNameEl.innerText = id;

    document.getElementById('bow-data-inicio').valueAsDate = new Date();
    document.getElementById('bow-data-fim').valueAsDate = new Date();
    document.getElementById('bow-motivo').value = '';

    document.getElementById('modal-folhao-bow').classList.remove('hidden');
    renderizarInspecaoChegadaBow();
    renderizarPassLinesBow();
    renderizarChecklistManutencaoBow();
    renderizarTabelaMateriaisIniciaisBow();
    
    window.trocarAbaBow({ currentTarget: document.querySelector('#modal-folhao-bow .folhao-tab') }, 'bow-aba-dados');
};

window.fecharFolhaoBow = function() {
    document.getElementById('modal-folhao-bow').classList.add('hidden');
    ID_FOLHAO_BOW_ATUAL = null;
};

window.trocarAbaBow = function(evt, abaId) {
    document.querySelectorAll('#modal-folhao-bow .folhao-content').forEach(aba => {
        aba.classList.add('hidden');
        aba.classList.remove('active');
        aba.style.display = ''; 
    });
    document.querySelectorAll('#modal-folhao-bow .folhao-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    let abaDestino = document.getElementById(abaId);
    if(abaDestino) {
        abaDestino.classList.remove('hidden');
        abaDestino.classList.add('active');
        abaDestino.style.display = ''; 
    }
    if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
};

function renderizarInspecaoChegadaBow() {
    const tbody = document.getElementById('tabela-bow-inspecao-chegada');
    if(tbody) {
        const tableResponsive = tbody.closest('.table-responsive');
        if(tableResponsive) tableResponsive.outerHTML = `<div id="container-check-recebimento-bow" class="checklist-container"></div>`;
    }
    
    const container = document.getElementById('container-check-recebimento-bow');
    if(!container) return;

    let categorias = {};
    let currentGroup = "GERAL";
    itensChegadaBow.forEach(item => {
        if(item.grupo && item.grupo.trim() !== "") currentGroup = item.grupo;
        if(!categorias[currentGroup]) categorias[currentGroup] = [];
        categorias[currentGroup].push(item.desc);
    });

    let html = ""; let groupIndex = 0;
    for (const [nomeCategoria, perguntas] of Object.entries(categorias)) {
        html += `<h4 style="margin: 20px 0 10px 0; color: var(--text-accent); border-bottom: 1px dashed var(--border-color); padding-bottom: 5px;"><i class="fas fa-tasks"></i> ${nomeCategoria}</h4><div class="checklist-container">`;
        perguntas.forEach((pergunta, index) => {
            let name = `bw-g${groupIndex}-q${index}`;
            html += `<div class="check-item"><p>${index + 1}. ${pergunta}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
        });
        html += `</div>`; groupIndex++;
    }
    container.innerHTML = html;
}

function renderizarChecklistManutencaoBow() {
    const tbody = document.getElementById('bow-tabela-manutencao');
    if(!tbody) return;
    const thead = tbody.closest('table').querySelector('thead');
    if(thead) {
        thead.innerHTML = `<tr><th>Item</th><th>Descrição da Atividade</th><th style="width: 40px; text-align:center;">P</th><th style="width: 40px; text-align:center;">G</th><th>Executante</th><th>Matrícula</th><th>Data</th></tr>`;
    }
    
    let htmlContent = '';
    manutencaoBow.forEach((tarefa, index) => {
        htmlContent += `<tr>
            <td style="text-align:center; font-weight:bold;" class="text-warning">${tarefa.item}</td>
            <td style="font-size: 11px;">${tarefa.desc}</td>
            <td style="text-align:center;"><input type="checkbox" id="bw-p-${index}"></td>
            <td style="text-align:center;"><input type="checkbox" id="bw-g-${index}"></td>
            <td><input type="text" class="w-100" id="bw-resp-${index}" placeholder="Nome"></td>
            <td><input type="text" class="w-100" id="bw-mat-${index}" placeholder="Matrícula"></td>
            <td><input type="date" class="w-100" id="bw-dat-${index}"></td>
        </tr>`;
    });
    tbody.innerHTML = htmlContent;
}

function renderizarPassLinesBow() {
    const renderTable = (idTbody, refs) => {
        const tbody = document.getElementById(idTbody);
        if(!tbody) return;
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
    renderTable('bow-passline-inf-chegada', refPassLineInfBow);
    renderTable('bow-passline-sup-chegada', refPassLineSupBow);
    renderTable('bow-passline-inf-saida', refPassLineInfBow);
    renderTable('bow-passline-sup-saida', refPassLineSupBow);
}

window.addLinhaMaterialBow = function() {
    const tbody = document.getElementById('bow-tabela-materiais');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="w-100" placeholder="SKU / Material"></td>
                    <td><input type="number" style="width: 80px;" placeholder="Qtd"></td>`;
    tbody.appendChild(tr);
};

function renderizarTabelaMateriaisIniciaisBow() {
    document.getElementById('bow-tabela-materiais').innerHTML = '';
    for(let i = 0; i < 3; i++) { window.addLinhaMaterialBow(); }
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

window.salvarEImprimirFolhaoBow = function() {
    if (!window.verificarAcesso() || !ID_FOLHAO_BOW_ATUAL) return;

    let tag = ID_FOLHAO_BOW_ATUAL;
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    if (!item) return;

    item.ton = 0;
    item.dias = 0;
    item.local = "Oficina / Reserva";
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    let motivo = document.getElementById('bow-motivo') ? document.getElementById('bow-motivo').value : 'Manutenção';
    let btnPDF = `<button onclick="window.abrirFolhaoBow('${tag}')" class="btn-outline-danger" style="padding: 2px 8px; font-size: 10px; margin-left: 10px; cursor: pointer;"><i class="fas fa-file-pdf"></i> Visualizar Folhão</button>`;
    
    if (window.registrarHistorico) window.registrarHistorico(tag, `Laudo Oficial (BOW MCC4) concluído. Motivo: ${motivo}. <br><div style="margin-top: 5px;">${btnPDF}</div>`);

    renderReparos(); 
    renderReservas(); 
    renderAtivos(); 
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    const dtInicio = document.getElementById('bow-data-inicio') ? document.getElementById('bow-data-inicio').value : '';
    const dtFim = document.getElementById('bow-data-fim') ? document.getElementById('bow-data-fim').value : '';
    const numSeg = document.getElementById('bow-num-segmento') ? document.getElementById('bow-num-segmento').value : '';
    const veio = document.getElementById('bow-veio') ? document.getElementById('bow-veio').value : '';
    const tipoExec = document.getElementById('bow-tipo-execucao') ? document.getElementById('bow-tipo-execucao').value : '';

    let htmlImp = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL SEGMENTO BOW MCC#4", tag, dtInicio, dtFim)}
        <table style="margin-top:5px; background: #f9f9f9;">
            <tr>
                <td><strong>VEIO:</strong> ${veio}</td>
                <td><strong>SEGMENTO:</strong> ${numSeg}</td>
                <td><strong>MOTIVO DA OS:</strong> ${motivo}</td>
                <td><strong>TIPO:</strong> ${tipoExec}</td>
            </tr>
        </table>

        <div class="titulo-secao">1. INSPEÇÃO DE CHEGADA OFICIAL</div>
        <table>`;
    
    let categorias = {};
    let currentGroup = "GERAL";
    itensChegadaBow.forEach(it => {
        if(it.grupo && it.grupo.trim() !== "") currentGroup = it.grupo;
        if(!categorias[currentGroup]) categorias[currentGroup] = [];
        categorias[currentGroup].push(it.desc);
    });

    let groupIndex = 0;
    for (const [nomeCategoria, perguntas] of Object.entries(categorias)) {
        htmlImp += `<tr><th colspan="3" style="background:#002b5e; color:#fff; font-size:12px; text-align:left; padding: 6px; border: 1px solid #000;">${nomeCategoria}</th></tr>`;
        htmlImp += `<tr><th style="border: 1px solid #000; padding: 4px; width:5%;">Item</th><th style="border: 1px solid #000; padding: 4px;">Descrição do Serviço</th><th style="border: 1px solid #000; padding: 4px; width:15%;">Status</th></tr>`;
        perguntas.forEach((pergunta, index) => {
            let name = `bw-g${groupIndex}-q${index}`;
            let resposta = 'NÃO';
            document.getElementsByName(name).forEach(r => { if(r.checked) resposta = r.value; });
            htmlImp += `<tr><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${index+1}</td><td style="border: 1px solid #000; padding: 4px;">${pergunta}</td><td style="text-align:center; font-weight:bold; border: 1px solid #000; padding: 4px;">${resposta}</td></tr>`;
        });
        groupIndex++;
    }
    htmlImp += `</table><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">2. AFERIÇÃO PASS LINE (CHEGADA)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">BASE INFERIOR (CHEGADA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineInfBow.forEach((ref, index) => {
        let a = document.getElementById(`bow-passline-inf-chegada-a-${index}`)?.value || '';
        let b = document.getElementById(`bow-passline-inf-chegada-b-${index}`)?.value || '';
        let c = document.getElementById(`bow-passline-inf-chegada-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">BASE SUPERIOR (CHEGADA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineSupBow.forEach((ref, index) => {
        let a = document.getElementById(`bow-passline-sup-chegada-a-${index}`)?.value || '';
        let b = document.getElementById(`bow-passline-sup-chegada-b-${index}`)?.value || '';
        let c = document.getElementById(`bow-passline-sup-chegada-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div></div><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">3. CHECKLIST DE EXECUÇÃO</div>
        <table><tr><th style="width:5%;">Item</th><th>Descrição da Atividade</th><th style="width:5%;">P</th><th style="width:5%;">G</th><th style="width:15%;">Matrícula</th><th style="width:15%;">Data</th></tr>`;
    manutencaoBow.forEach((tarefa, index) => {
        const p = document.getElementById(`bw-p-${index}`)?.checked ? 'X' : '';
        const g = document.getElementById(`bw-g-${index}`)?.checked ? 'X' : '';
        const mat = document.getElementById(`bw-mat-${index}`)?.value || '';
        const data = document.getElementById(`bw-dat-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${tarefa.item}</td><td style="font-size:10px;">${tarefa.desc}</td><td style="text-align:center; font-weight:bold;">${p}</td><td style="text-align:center; font-weight:bold;">${g}</td><td style="text-align:center;">${mat}</td><td style="text-align:center;">${data}</td></tr>`;
    });
    htmlImp += `</table><div class="quebra-pagina"></div>`;

    htmlImp += `<div class="titulo-secao">4. AFERIÇÃO PASS LINE (SAÍDA FINAL)</div>
        <div style="display:flex; gap:10px; width:100%;">
            <div style="width:50%;"><table><tr><th colspan="5">BASE INFERIOR (SAÍDA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineInfBow.forEach((ref, index) => {
        let a = document.getElementById(`bow-passline-inf-saida-a-${index}`)?.value || '';
        let b = document.getElementById(`bow-passline-inf-saida-b-${index}`)?.value || '';
        let c = document.getElementById(`bow-passline-inf-saida-c-${index}`)?.value || '';
        htmlImp += `<tr><td style="text-align:center;">${index+1}º</td><td style="text-align:center; font-weight:bold;">${ref}</td><td style="text-align:center;">${a}</td><td style="text-align:center;">${b}</td><td style="text-align:center;">${c}</td></tr>`;
    });
    htmlImp += `</table></div>
            <div style="width:50%;"><table><tr><th colspan="5">BASE SUPERIOR (SAÍDA)</th></tr><tr><th>Rolo</th><th>Ref</th><th>Pos A</th><th>Pos B</th><th>Pos C</th></tr>`;
    refPassLineSupBow.forEach((ref, index) => {
        let a = document.getElementById(`bow-passline-sup-saida-a-${index}`)?.value || '';
        let b = document.getElementById(`bow-passline-sup-saida-b-${index}`)?.value || '';
        let c = document.getElementById(`bow-passline-sup-saida-c-${index}`)?.value || '';
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
    window.fecharFolhaoBow();
    setTimeout(() => window.print(), 500);
};