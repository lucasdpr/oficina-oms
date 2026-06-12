// DADOS DO DOCUMENTO: INSPEÇÃO DE CHEGADA[cite: 2]
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

// DADOS DO DOCUMENTO: PASS LINE HORIZONTAL (REFERÊNCIAS)[cite: 2]
const refPassLineInfHorizontal = ["60,00", "60,00", "60,00", "60,00", "60,00", "60,00", "60,00"]; 
const refPassLineSupHorizontal = ["35,00", "35,00", "35,00", "35,00", "35,00", "35,00", "35,00"]; 

// DADOS DO DOCUMENTO: CHECKLIST DE MANUTENÇÃO COMPLETO (108 ITENS)[cite: 2]
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

// FUNÇÕES DE CONTROLE DE TELA
function abrirFolhaoHorizontal() {
    const tituloPdf = document.getElementById('titulo-pdf');
    if(tituloPdf) tituloPdf.innerText = "SISTEMA OMS - FOLHA DE LIBERAÇÃO - SEGMENTO HORIZONTAL (MCC 4)";

    document.getElementById('modal-folhao-horizontal').classList.remove('hidden');
    renderizarInspecaoChegadaHorizontal();
    renderizarPassLinesHorizontal();
    renderizarChecklistManutencaoHorizontal();
    renderizarTabelaMateriaisIniciaisHorizontal();
}

function fecharFolhaoHorizontal() {
    document.getElementById('modal-folhao-horizontal').classList.add('hidden');
}

function trocarAbaHorizontal(evt, abaId) {
    const abas = document.querySelectorAll('#modal-folhao-horizontal .folhao-content');
    abas.forEach(aba => aba.classList.add('hidden'));
    
    const botoes = document.querySelectorAll('#modal-folhao-horizontal .folhao-tab');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(abaId).classList.remove('hidden');
    evt.currentTarget.classList.add('active');
}

// FUNÇÕES DE RENDERIZAÇÃO DINÂMICA
function renderizarInspecaoChegadaHorizontal() {
    const tbody = document.getElementById('tabela-horiz-inspecao-chegada');
    tbody.innerHTML = '';
    let htmlContent = '';
    itensChegadaHorizontal.forEach((item, index) => {
        const numItem = String(index + 1).padStart(2, '0');
        const grupoHtml = item.grupo ? `<strong style="color: var(--text-accent); font-size:11px;">${item.grupo}</strong><br>` : '';
        htmlContent += `
            <tr>
                <td class="font-code text-muted">${numItem}</td>
                <td>${grupoHtml}${item.desc}</td>
                <td><input type="radio" name="insp_chg_hz_${index}" value="SIM"></td>
                <td><input type="radio" name="insp_chg_hz_${index}" value="NAO"></td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlContent;
}

function renderizarPassLinesHorizontal() {
    const renderTable = (idTbody, refs) => {
        const tbody = document.getElementById(idTbody);
        let htmlContent = '';
        refs.forEach((ref, index) => {
            htmlContent += `
                <tr>
                    <td class="font-code text-accent">${index + 1}°</td>
                    <td class="font-code text-muted">${ref}</td>
                    <td><input type="number" class="w-100" step="0.01"></td>
                    <td><input type="number" class="w-100" step="0.01"></td>
                    <td><input type="number" class="w-100" step="0.01"></td>
                </tr>
            `;
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
        htmlContent += `
            <tr>
                <td class="font-code text-warning">${tarefa.item}</td>
                <td style="font-size: 13px;">${tarefa.desc}</td>
                <td><input type="checkbox" id="check_hz_${index}"></td>
                <td><input type="text" class="w-100" id="mat_hz_${index}" placeholder="Matrícula"></td>
                <td><input type="date" class="w-100" id="data_hz_${index}"></td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlContent;
}

function addLinhaMaterialHorizontal() {
    const tbody = document.getElementById('horiz-tabela-materiais');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="w-100" placeholder="Descrição ou Código SKU"></td>
        <td><input type="number" style="width: 80px;" placeholder="Qtd"></td>
    `;
    tbody.appendChild(tr);
}

function renderizarTabelaMateriaisIniciaisHorizontal() {
    const tbody = document.getElementById('horiz-tabela-materiais');
    tbody.innerHTML = '';
    for(let i = 0; i < 3; i++) { addLinhaMaterialHorizontal(); }
}

// ==========================================
// FUNÇÃO PARA GERAR O PDF PADRÃO[cite: 2]
// ==========================================
function salvarEImprimirFolhaoHorizontal() {
    const tituloPdf = document.getElementById('titulo-pdf');
    if(tituloPdf) tituloPdf.innerText = "SISTEMA OMS - FOLHA DE LIBERAÇÃO - SEGMENTO HORIZONTAL (MCC 4)";

    const dtInicio = document.getElementById('horiz-data-inicio').value || '___/___/___';
    const dtFim = document.getElementById('horiz-data-fim').value || '___/___/___';
    const numSeg = document.getElementById('horiz-num-segmento').value || 'N/A';
    const veio = document.getElementById('horiz-veio').value || 'N/A';
    const motivo = document.getElementById('horiz-motivo').value || 'N/A';
    const tipo = document.getElementById('horiz-tipo-execucao').value || 'N/A';

    let htmlImp = `
        <div style="border: 2px solid #000; padding: 15px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 18px;">CSN - ACIARIA MCC4</h1>
            <h2 style="margin: 5px 0; font-size: 16px;">CHECK LIST GERAL SEGMENTO HORIZONTAL</h2>
        </div>
        
        <table border="1" width="100%" cellspacing="0" cellpadding="8" style="border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <tr>
                <td colspan="2"><strong>DATA DE INÍCIO:</strong> ${dtInicio}</td>
                <td colspan="2"><strong>DATA DE FIM:</strong> ${dtFim}</td>
            </tr>
            <tr>
                <td><strong>Nº SEGMENTO:</strong> ${numSeg}</td>
                <td><strong>VEIO:</strong> ${veio}</td>
                <td><strong>MOTIVO:</strong> ${motivo}</td>
                <td><strong>TIPO EXECUÇÃO:</strong> ${tipo}</td>
            </tr>
        </table>
    `;

    htmlImp += `<h3 style="font-size: 14px; text-transform: uppercase;">1. Inspeção de Chegada</h3>`;
    htmlImp += `<table border="1" width="100%" cellspacing="0" cellpadding="5" style="border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">`;
    htmlImp += `<tr><th width="5%">Item</th><th width="75%">Descrição</th><th width="20%">Status</th></tr>`;
    
    itensChegadaHorizontal.forEach((item, index) => {
        const radios = document.getElementsByName(`insp_chg_hz_${index}`);
        let resposta = '-';
        radios.forEach(r => { if(r.checked) resposta = r.value; });

        let grupo = item.grupo ? `<b>${item.grupo}</b> - ` : '';
        htmlImp += `<tr>
            <td align="center">${index+1}</td>
            <td>${grupo}${item.desc}</td>
            <td align="center"><b>${resposta}</b></td>
        </tr>`;
    });
    htmlImp += `</table>`;

    htmlImp += `<h3 style="font-size: 14px; text-transform: uppercase;">2. Resumo de Execução</h3>`;
    htmlImp += `<table border="1" width="100%" cellspacing="0" cellpadding="5" style="border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">`;
    htmlImp += `<tr><th width="5%">Item</th><th width="50%">Atividade</th><th width="10%">Feito</th><th width="15%">Matrícula</th><th width="20%">Data</th></tr>`;
    
    manutencaoHorizontal.forEach((tarefa, index) => {
        const checked = document.getElementById(`check_hz_${index}`).checked ? 'SIM' : 'NÃO';
        const mat = document.getElementById(`mat_hz_${index}`).value || '____';
        const data = document.getElementById(`data_hz_${index}`).value || '__/__/____';

        htmlImp += `<tr>
            <td align="center">${tarefa.item}</td>
            <td>${tarefa.desc}</td>
            <td align="center">${checked}</td>
            <td align="center">${mat}</td>
            <td align="center">${data}</td>
        </tr>`;
    });
    htmlImp += `</table>`;

    document.getElementById('print-content').innerHTML = htmlImp;
    
    fecharFolhaoHorizontal();

    setTimeout(() => {
        window.print();
    }, 500);
}

// EXPORTANDO PARA O ESCOPO GLOBAL
window.abrirFolhaoHorizontal = abrirFolhaoHorizontal;
window.fecharFolhaoHorizontal = fecharFolhaoHorizontal;
window.trocarAbaHorizontal = trocarAbaHorizontal;
window.addLinhaMaterialHorizontal = addLinhaMaterialHorizontal;
window.salvarEImprimirFolhaoHorizontal = salvarEImprimirFolhaoHorizontal;