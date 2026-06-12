// DADOS DO DOCUMENTO: INSPEÇÃO DE CHEGADA
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

// DADOS DO DOCUMENTO: PASS LINE (REFERÊNCIAS)
const refPassLineInf = ["55,19", "58,48", "59,70", "60,15", "60,01", "60,01", "60,01"];
const refPassLineSup = ["39,46", "36,39", "35,26", "35,00", "34,99", "34,99", "34,99"];

// DADOS DO DOCUMENTO: CHECKLIST DE MANUTENÇÃO
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

// FUNÇÕES DE CONTROLE DE TELA
function abrirFolhaoR2() {
    // 1. Muda o título do PDF para Straightener R2
    document.getElementById('titulo-pdf').innerText = "SISTEMA OMS - FOLHA DE LIBERAÇÃO - STRAIGHTENER R2 (MCC 4)";
    
    // 2. Abre o modal e carrega os dados
    document.getElementById('modal-folhao-r2').classList.remove('hidden');
    renderizarInspecaoChegada();
    renderizarPassLines();
    renderizarChecklistManutencao();
    renderizarTabelaMateriaisIniciais();
}

function fecharFolhaoR2() {
    document.getElementById('modal-folhao-r2').classList.add('hidden');
}

function trocarAbaR2(evt, abaId) {
    // Oculta todos os conteúdos
    const abas = document.querySelectorAll('#modal-folhao-r2 .folhao-content');
    abas.forEach(aba => aba.classList.add('hidden'));
    
    // Remove a classe 'active' das abas
    const botoes = document.querySelectorAll('#modal-folhao-r2 .folhao-tab');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    // Mostra a aba clicada e marca como ativa
    document.getElementById(abaId).classList.remove('hidden');
    evt.currentTarget.classList.add('active');
}

// FUNÇÕES DE RENDERIZAÇÃO DINÂMICA
function renderizarInspecaoChegada() {
    const tbody = document.getElementById('tabela-r2-inspecao-chegada');
    tbody.innerHTML = '';
    
    let htmlContent = '';
    itensChegadaR2.forEach((item, index) => {
        const numItem = String(index + 1).padStart(2, '0');
        const grupoHtml = item.grupo ? `<strong style="color: var(--text-accent); font-size:11px;">${item.grupo}</strong><br>` : '';
        
        htmlContent += `
            <tr>
                <td class="font-code text-muted">${numItem}</td>
                <td>
                    ${grupoHtml}
                    ${item.desc}
                </td>
                <td><input type="radio" name="insp_chg_${index}" value="SIM"></td>
                <td><input type="radio" name="insp_chg_${index}" value="NAO"></td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlContent;
}

function renderizarPassLines() {
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

    renderTable('r2-passline-inf-chegada', refPassLineInf);
    renderTable('r2-passline-sup-chegada', refPassLineSup);
    renderTable('r2-passline-inf-saida', refPassLineInf);
    renderTable('r2-passline-sup-saida', refPassLineSup);
}

function renderizarChecklistManutencao() {
    const tbody = document.getElementById('r2-tabela-manutencao');
    let htmlContent = '';
    
    manutencaoR2.forEach((tarefa) => {
        htmlContent += `
            <tr>
                <td class="font-code text-warning">${tarefa.item}</td>
                <td style="font-size: 13px;">${tarefa.desc}</td>
                <td><input type="checkbox"></td>
                <td><input type="text" class="w-100" placeholder="Matrícula"></td>
                <td><input type="date" class="w-100"></td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlContent;
}

function addLinhaMaterialR2() {
    const tbody = document.getElementById('r2-tabela-materiais');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="w-100" placeholder="Descrição ou Código SKU"></td>
        <td><input type="number" style="width: 80px;" placeholder="Qtd"></td>
    `;
    tbody.appendChild(tr);
}

function renderizarTabelaMateriaisIniciais() {
    const tbody = document.getElementById('r2-tabela-materiais');
    tbody.innerHTML = ''; // Limpa pra não duplicar
    for(let i = 0; i < 3; i++) { 
        addLinhaMaterialR2(); 
    }
}

// EXPORTANDO PARA O ESCOPO GLOBAL (Para o HTML conseguir chamar nos botões)
window.abrirFolhaoR2 = abrirFolhaoR2;
window.fecharFolhaoR2 = fecharFolhaoR2;
window.trocarAbaR2 = trocarAbaR2;
window.addLinhaMaterialR2 = addLinhaMaterialR2;