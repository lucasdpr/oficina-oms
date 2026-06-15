import { BANCO_ATIVOS } from './banco.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_MOLDE23_ATUAL = null;

// ==============================================================
// 1. DADOS DAS TABELAS (Transcritos do Documento)
// ==============================================================

const recebimentoMecanica = [
    "Os engates rápidos do sistema hidráulico e do sistema de nitrogênio estão completos e em perfeitas condições?",
    "Os flexíveis das faces estreitas e spray estão amassados e/ou danificados?",
    "Verificar se existe alguma tubulação hidráulica amassada e / ou danificada?",
    "Teste de água com pressão de 10 KGF/cm2 c / tempo de 30 minutos conforme?",
    "Verificar se todos os conectores de termopares estão em perfeitas condições e funcionando?",
    "Sensor vuhz se encontra em perfeitas condições?",
    "Proteções sanfonadas encontram-se em perfeitas condições?",
    "Tampas e réguas guias das placas estão em perfeitas condições?",
    "As cangalhas de spray estão em perfeitas condições, sem avarias?",
    "Os foot-roll e roletes das guias laterais estão em perfeitas condições?",
    "O sistema de lubrificação possui alguma avaria?",
    "As placas de cobre possuem ferimentos e/ou arranhões profundos na face de trabalho?",
    "As juntas de expansão das placas principais estão em perfeitas condições?",
    "Parafusos de fixação do molde no stand estão completos e em perfeitas condições?"
];

const recebimentoEletrica = [
    "Os conectores do detector de break-out das faces larga estão tampados e em perfeitas condições?",
    "Os cabos elétricos dos termopares do detector de break-out das faces estreitas estão em perfeitas condições?"
];

const revisaoMoldes = [
    "Inspeção das proteções sanfonadas dos cilindros das faces estreitas, substituindo as que estiverem danificadas.",
    "Inspeção das proteções sanfonadas dos fusos dos castelos quadrados, substituindo as que estiverem danificadas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos de porcas e contra porcas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos do castelo quadrado.",
    "Inspeção das hastes dos cilindros das faces estreitas, verificando se há avarias e vazamentos de óleo.",
    "Inspeção dos cilindros do clamp de abertura da face larga, substituindo os que estiverem com vazamento.",
    "Inspeção do filtro de óleo do sistema hidráulico, verificando se ele não está sujo.",
    "Inspeção e lubrificação nos olhais e nas chavetas de fixação das placas laterais, ajustando se necessário.",
    "Inspeção, revisão e lubrificação dos eixos e mancais deslizantes (caixa louca).",
    "Inspeção em todo sistema de lubrificação, corrigindo anomalias. Testar as válvulas de graxa na unidade hidráulica, trocas tubulações.",
    "Inspeção das condições dos flexíveis de água, substituindo os que estiverem danificados.",
    "Inspeção, revisão e lubrificação dos parafusos de fixação do molde no stand.",
    "Inspeção das tubulações hidráulicas (conferir aperto das conexões e trocar as que estiverem danificadas).",
    "Alinhar os fusos dos castelos quadrados na medida padrão de 210mm.",
    "Lubrificar e amaciar os fusos do ajuste mecânico.",
    "Inspeção das juntas de expansão (trocar se necessário)."
];

const inspecaoFinal = [
    "Indicadores de pressão de ajuste das molas da placa lado móvel, estão completos e alinhados?",
    "Tampa de proteção do molde não está tocando sobre a tubulação de sangria das placas principais?",
    "Placas de proteção estão calafetadas com fita, desempenadas alinhadas e fixadas através de parafusos?",
    "Posicionamento dos flexíveis superiores e inferiores estão conformes?",
    "Teste de água com pressão de 10 KGF/cm2 (valor referência) c/ tempo de 30 minutos, conforme?",
    "Proteções sanfonadas estão fixadas?",
    "“Foot-roll” e roletes das guias laterais estão lubrificados e girando normalmente?",
    "Alinhamento dos bicos de spray das faces largas e estreitas?",
    "Parafusos de fixação do molde na máquina estão completos e lubrificados?",
    "Sensor Vuhz está montado corretamente e testado?",
    "A precisão de movimento das faces estreitas estão conforme?",
    "Funcionamento correto das válvulas distribuidoras de graxa, conexões marcadas?",
    "Réguas do ajuste mecânico estão livres e lubrificadas corretamente?",
    "Folga na aresta das faces das placas estreitas e largas (<= 0,35mm)?",
    "Cavidade interna do molde limpa?",
    "Centro do molde está identificado na placa norte e visível ao operador?",
    "Conectores dos termopares das placas estão limpos e tampados?",
    "Teste de profundidade está conforme?",
    "Engates rápido do sistema hidráulico, sistema de nitrogênio e graxa, estão c/ as vedações completas, apertados e protegidos?",
    "Base de vedação do molde está limpa e lixada?",
    "Os conectores dos DBO estão todos tamponados e protegidos?"
];

const checkHidraulico = [
    "CHECK DOS CILINDROS DE AJUSTE DE LARGURA DO MOLDE",
    "VERIFICAR VAZAMENTO DE GRAXA NAS CONEXÕES",
    "VERIFICAR VAZAMENTO DE ÓLEO NAS CONEXÕES",
    "INSPECIONAR O ELEMENTO FILTRANTE DO FILTRO DA LINHA DE PRESSÃO HIDRÁULICA E SE NECESSÁRIO EFETUAR A TROCA.",
    "LUBRIFICAÇÃO",
    "VERIFICAR VAZAMENTO EM MANGUEIRAS E DOSADOR, SUBSTITUIR SE NECESSÁRIO.",
    "EFETUAR A LIMPEZA DOS ENGATES HIDRÁULICOS",
    "EMBALAR ENGATES HIDRÁULICOS"
];

// ==============================================================
// 2. FUNÇÕES DE JANELA (ABRIR, FECHAR, ABAS)
// ==============================================================

window.abrirFolhaoMolde23 = function(id) {
    ID_FOLHAO_MOLDE23_ATUAL = id;
    let tagNameEl = document.getElementById('molde23-tag-name');
    if (tagNameEl) tagNameEl.innerText = "TAG: " + id;
    
    document.getElementById('modal-folhao-molde23').classList.remove('hidden');
    // Se você tiver as funções de renderizar interface, chame-as aqui
    // renderizarTabelasMolde23();
}

window.fecharFolhaoMolde23 = function() {
    document.getElementById('modal-folhao-molde23').classList.add('hidden');
    ID_FOLHAO_MOLDE23_ATUAL = null;
}

window.trocarAbaMolde23 = function(evt, abaId) {
    document.querySelectorAll('#modal-folhao-molde23 .folhao-content').forEach(aba => {
        aba.classList.add('hidden');
        aba.classList.remove('active');
    });
    document.querySelectorAll('#modal-folhao-molde23 .folhao-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    let abaDestino = document.getElementById(abaId);
    if(abaDestino) {
        abaDestino.classList.remove('hidden');
        abaDestino.classList.add('active');
    }
    
    if(evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

// ==============================================================
// 3. O MEGA GERADOR DE PDF
// ==============================================================

const cssBase = `
<style>
    .pdf-base { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
    .pdf-base table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .pdf-base th, .pdf-base td { border: 1px solid #000; padding: 4px; }
    .pdf-base th { background: #e0e0e0; text-align: center; font-weight: bold; font-size: 10px;}
    .pdf-base .titulo-secao { background: #002b5e; color: #fff; font-weight: bold; padding: 6px; text-align: left; margin: 15px 0 5px 0; border: 1px solid #000; font-size: 12px; text-transform: uppercase;}
    .pdf-base .subtitulo { background: #d0d0d0; font-weight: bold; text-align: center; padding: 4px; font-size: 10px;}
    @media print { .quebra-pagina { break-before: page; page-break-before: always; margin-top: 15px;} }
</style>`;

const getCabecalhoUnico = (titulo, tag, inicio, fim, lider) => `
<div style="display: flex; border: 2px solid #000; border-bottom: 5px solid #002b5e; margin-bottom: 10px; align-items: center; background: #fff;">
    <div style="width: 20%; text-align: center; border-right: 2px solid #000; padding: 10px;"><span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 30px; color: #002b5e; letter-spacing: -2px;">CSN</span></div>
    <div style="width: 60%; text-align: center; padding: 10px;">
        <h2 style="margin: 0; font-size: 14px; color: #000;">${titulo}</h2>
        <p style="margin: 5px 0 0 0; font-size: 9px; color: #333; font-weight: bold;">DATA INÍCIO: ${inicio} | DATA FIM: ${fim}</p>
        <p style="margin: 2px 0 0 0; font-size: 9px; color: #333; font-weight: bold;">LÍDER RESPONSÁVEL: ${lider}</p>
    </div>
    <div style="width: 20%; font-size: 11px; border-left: 2px solid #000; padding: 10px; line-height: 1.5; font-weight: bold;">
        <div style="color: #002b5e;">MOLDE TAG: <span style="color:#000;">${tag}</span></div>
    </div>
</div>`;

window.salvarEImprimirFolhaoMolde23 = function() {
    console.log("Iniciando geração de PDF para Molde 2/3...");

    if (window.verificarAcesso && !window.verificarAcesso()) { alert("Acesso negado."); return; }
    if (!ID_FOLHAO_MOLDE23_ATUAL) { alert("Erro: Nenhuma TAG carregada."); return; }

    let tag = ID_FOLHAO_MOLDE23_ATUAL;
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    
    if (item) {
        item.ton = 0;
        item.dias = 0;
        item.local = "Oficina / Reserva";
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // Busca dados do Cabeçalho (Puxa os IDs dos inputs caso você crie eles no HTML)
    let lider = document.getElementById('molde23-lider') ? document.getElementById('molde23-lider').value : "_______________";
    let dataInicio = document.getElementById('molde23-data-inicio') ? document.getElementById('molde23-data-inicio').value : new Date().toLocaleDateString('pt-BR');
    let dataFim = document.getElementById('molde23-data-fim') ? document.getElementById('molde23-data-fim').value : new Date().toLocaleDateString('pt-BR');

    // Montando o HTML de impressão gigante
    let htmlImp = `${cssBase}<div class="pdf-base">
        ${getCabecalhoUnico("CHECK LIST GERAL DO MOLDE MCC 2 E 3", tag, dataInicio, dataFim, lider)}

        <div class="titulo-secao">1. INSPEÇÃO DE RECEBIMENTO MECÂNICA</div>
        <table>
            <tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO DO SERVIÇO</th><th style="width:5%;">SIM</th><th style="width:5%;">NÃO</th></tr>`;
    
    recebimentoMecanica.forEach((desc, index) => {
        htmlImp += `<tr><td style="text-align:center;">${index+1}</td><td>${desc}</td><td></td><td></td></tr>`;
    });

    htmlImp += `</table>
        <div class="titulo-secao">2. INSPEÇÃO DE RECEBIMENTO ELÉTRICA</div>
        <table>
            <tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO DO SERVIÇO</th><th style="width:5%;">SIM</th><th style="width:5%;">NÃO</th></tr>`;
            
    recebimentoEletrica.forEach((desc, index) => {
        htmlImp += `<tr><td style="text-align:center;">${index+1}</td><td>${desc}</td><td></td><td></td></tr>`;
    });

    htmlImp += `</table><div class="quebra-pagina"></div>`;

    // BLOCO 2: REVISÃO E EXECUÇÃO
    htmlImp += `${getCabecalhoUnico("CHECK LIST GERAL DO MOLDE MCC 2 E 3", tag, dataInicio, dataFim, lider)}
        <div class="titulo-secao">3. REVISÃO DOS MOLDES</div>
        <table>
            <tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO DO SERVIÇO</th><th style="width:5%;">SIM</th><th style="width:5%;">NÃO</th></tr>`;
    
    revisaoMoldes.forEach((desc, index) => {
        htmlImp += `<tr><td style="text-align:center;">${index+1}</td><td>${desc}</td><td></td><td></td></tr>`;
    });

    htmlImp += `</table>
        <div class="titulo-secao">4. CHECK LIST HIDRÁULICO</div>
        <table>
            <tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO DO SERVIÇO</th><th style="width:20%;">NOME</th><th style="width:15%;">MATRÍCULA</th></tr>`;
            
    checkHidraulico.forEach((desc, index) => {
        htmlImp += `<tr><td style="text-align:center;">${index+1}</td><td>${desc}</td><td></td><td></td></tr>`;
    });

    htmlImp += `</table><div class="quebra-pagina"></div>`;

    // BLOCO 3: INSPEÇÃO FINAL E SENSORES
    htmlImp += `${getCabecalhoUnico("CHECK LIST GERAL DO MOLDE MCC 2 E 3", tag, dataInicio, dataFim, lider)}
        <div class="titulo-secao">5. INSPEÇÃO FINAL DOS MOLDES</div>
        <table>
            <tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO DO SERVIÇO</th><th style="width:5%;">SIM</th><th style="width:5%;">NÃO</th></tr>`;
    
    inspecaoFinal.forEach((desc, index) => {
        htmlImp += `<tr><td style="text-align:center;">${index+1}</td><td>${desc}</td><td></td><td></td></tr>`;
    });

    htmlImp += `</table>
        <div class="titulo-secao">6. SENSORES DE NÍVEL (PLANILHA E RESISTÊNCIA)</div>
        <table>
            <tr><th colspan="4" class="subtitulo">RESULTADOS DO SENSOR COM SIMULAÇÃO</th></tr>
            <tr><th>Posição</th><th>Profundidade (mm)</th><th>Ref. Corrente (mA)</th><th>Valor Corrente (mA)</th></tr>
            <tr><td style="text-align:center;">1</td><td style="text-align:center;">0</td><td style="text-align:center;">20</td><td></td></tr>
            <tr><td style="text-align:center;">2</td><td style="text-align:center;">80</td><td style="text-align:center;">12</td><td></td></tr>
            <tr><td style="text-align:center;">3</td><td style="text-align:center;">160</td><td style="text-align:center;">4</td><td></td></tr>
        </table>
        
        <table style="margin-top: 5px;">
            <tr><th colspan="2" class="subtitulo">MEDIÇÃO RESISTÊNCIA E ISOLAÇÃO</th></tr>
            <tr><td>RESISTÊNCIA PINOS 1-2 (140...300 Ω)</td><td></td></tr>
            <tr><td>RESISTÊNCIA PINOS 3-4 (0...2 Ω)</td><td></td></tr>
            <tr><td>ISOLAÇÃO PINOS 5 e 6 (>10 MΩ)</td><td></td></tr>
            <tr><td>ISOLAÇÃO PINOS 5 e 8 (>10 MΩ)</td><td></td></tr>
        </table><div class="quebra-pagina"></div>`;

    // BLOCO 4: DADOS EXTRAS E ASSINATURAS
    htmlImp += `${getCabecalhoUnico("CHECK LIST GERAL DO MOLDE MCC 2 E 3", tag, dataInicio, dataFim, lider)}
        <div class="titulo-secao">7. TESTE DE RESISTÊNCIA DAS PLACAS (TERMOPARES)</div>
        <table style="text-align:center;">
            <tr><th>TERMOPAR</th><th>REFERÊNCIA</th><th>PLACA MÓVEL</th><th>PLACA FIXA</th><th>ESTREITA DIR.</th><th>ESTREITA ESQ.</th></tr>
            <tr><td>1 a 12 (Largos)</td><td>10 A 20 Ω</td><td>OK ( ) NOK ( )</td><td>OK ( ) NOK ( )</td><td>-</td><td>-</td></tr>
            <tr><td>1 a 3 (Estreitos)</td><td>5 A 15 Ω</td><td>-</td><td>-</td><td>OK ( ) NOK ( )</td><td>OK ( ) NOK ( )</td></tr>
            <tr><td>POSITIVO 1 e 2</td><td>-</td><td></td><td></td><td></td><td></td></tr>
        </table>

        <div class="titulo-secao">8. MATERIAIS UTILIZADOS NA MANUTENÇÃO</div>
        <table>
            <tr><th style="width: 80%;">DESCRIÇÃO DO MATERIAL / SKU</th><th style="width: 20%;">QUANTIDADE</th></tr>
            <tr><td style="height: 15px;"></td><td></td></tr>
            <tr><td style="height: 15px;"></td><td></td></tr>
            <tr><td style="height: 15px;"></td><td></td></tr>
            <tr><td style="height: 15px;"></td><td></td></tr>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 11px; font-weight: bold; padding-bottom:30px;">
            <div><p>___________________________________</p><p>Assinatura Mecânica</p></div>
            <div><p>___________________________________</p><p>Assinatura Elétrica</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    </div>`;

    let printContent = document.getElementById('print-content');
    if (!printContent) { alert("Erro: Div 'print-content' não encontrada!"); return; }

    printContent.innerHTML = htmlImp;
    window.fecharFolhaoMolde23();
    
    if(typeof renderReparos === 'function') renderReparos(); 
    if(typeof renderReservas === 'function') renderReservas(); 
    if(typeof renderAtivos === 'function') renderAtivos(); 
    
    setTimeout(() => window.print(), 500);
};
// ==============================================================
// 4. FUNÇÕES DE RENDERIZAR TABELAS (NOVIDADE!)
// ==============================================================

function renderizarTabelasMolde23() {
    const renderTable = (id, array, isMatricula = false) => {
        const tbody = document.getElementById(id);
        if(!tbody) return;
        tbody.innerHTML = '';
        array.forEach((item, index) => {
            const tr = document.createElement('tr');
            if (isMatricula) {
                tr.innerHTML = `
                    <td style="text-align:center; font-weight:bold;">${index + 1}</td>
                    <td style="font-size: 11px;">${item}</td>
                    <td><input type="text" class="w-100" placeholder="Matrícula"></td>
                `;
            } else {
                tr.innerHTML = `
                    <td style="text-align:center; font-weight:bold;">${index + 1}</td>
                    <td style="font-size: 11px;">${item}</td>
                    <td style="text-align:center;"><input type="radio" name="${id}_${index}" value="SIM" checked></td>
                    <td style="text-align:center;"><input type="radio" name="${id}_${index}" value="NÃO"></td>
                `;
            }
            tbody.appendChild(tr);
        });
    };

    // Preenche as abas com as listas
    renderTable('tabela-m23-recebimento', [...recebimentoMecanica, ...recebimentoEletrica]);
    renderTable('tabela-m23-revisao', revisaoMoldes);
    renderTable('tabela-m23-hidraulica', checkHidraulico, true);
    renderTable('tabela-m23-final', inspecaoFinal);
}

// Sobrescrevendo a função de abrir para ela chamar o preenchimento das tabelas
window.abrirFolhaoMolde23 = function(id) {
    ID_FOLHAO_MOLDE23_ATUAL = id;
    let tagNameEl = document.getElementById('molde23-tag-name');
    if (tagNameEl) tagNameEl.innerText = id;
    
    document.getElementById('modal-folhao-molde23').classList.remove('hidden');
    
    // MÁGICA: Preenche as tabelas quando a tela abre!
    renderizarTabelasMolde23(); 
}