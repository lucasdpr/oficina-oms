// folhao.js - Gerador de Laudos, Checklists e PDFs

import { BANCO_ATIVOS, OPERADOR_LOGADO } from './banco.js';
import { CHECKLIST_RECEBIMENTO, CHECKLIST_REVISAO, CHECKLIST_HIDRAULICA, CHECKLIST_FINAL } from './dados.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';

let ID_FOLHAO_ATUAL = null;
let DADOS_FOLGA_ARESTA = {};

export function carregarMedidaAresta() {
    let largura = document.getElementById("folga-largura").value;
    let dados = DADOS_FOLGA_ARESTA[largura] || { ec: "", em: "", ei: "", ech: "", dc: "", dm: "", di: "", dch: "" };

    document.getElementById("fa-esq-cima").value = dados.ec;
    document.getElementById("fa-esq-meio").value = dados.em;
    document.getElementById("fa-esq-inf").value = dados.ei;
    document.getElementById("fa-esq-chav").value = dados.ech;

    document.getElementById("fa-dir-cima").value = dados.dc;
    document.getElementById("fa-dir-meio").value = dados.dm;
    document.getElementById("fa-dir-inf").value = dados.di;
    document.getElementById("fa-dir-chav").value = dados.dch;
}

export function salvarMedidaAresta() {
    let largura = document.getElementById("folga-largura").value;
    DADOS_FOLGA_ARESTA[largura] = {
        ec: document.getElementById("fa-esq-cima").value,
        em: document.getElementById("fa-esq-meio").value,
        ei: document.getElementById("fa-esq-inf").value,
        ech: document.getElementById("fa-esq-chav").value,
        dc: document.getElementById("fa-dir-cima").value,
        dm: document.getElementById("fa-dir-meio").value,
        di: document.getElementById("fa-dir-inf").value,
        dch: document.getElementById("fa-dir-chav").value
    };
}

export function injetarAbasFaltantes() {
    if(!document.getElementById('tab-peritagem-mcc4')) {
        let tabsContainer = document.querySelector('.folhao-tabs');
        let bodyContainer = document.querySelector('.folhao-body');
        
        if(tabsContainer && bodyContainer) {
            tabsContainer.innerHTML += `
                <button id="tab-peritagem-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-peritagem')">6. Folgas de Aresta</button>
                <button id="tab-eletrica-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-eletrica')">7. Elétrica e Termopares</button>
                <button id="tab-materiais-mcc4" class="folhao-tab" onclick="trocarAbaFolhao(event, 'folhao-aba-materiais')">8. Materiais</button>
            `;
            
            let inputsTermoFixa = ""; let inputsTermoMovel = "";
            for(let i=1; i<=12; i++) {
                inputsTermoFixa += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-fix-${i}"></div>`;
                inputsTermoMovel += `<div class="input-group"><label>T.Par ${i} (10-20 Ω)</label><input type="text" id="t-mov-${i}"></div>`;
            }
            inputsTermoFixa += `<div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-fix-p1"></div><div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-fix-p2"></div>`;
            inputsTermoMovel += `<div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-mov-p1"></div><div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-mov-p2"></div>`;

            let inputsTermoEsq = ""; let inputsTermoDir = "";
            for(let i=1; i<=3; i++) {
                inputsTermoEsq += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-esq-${i}"></div>`;
                inputsTermoDir += `<div class="input-group"><label>T.Par ${i} (5-15 Ω)</label><input type="text" id="t-dir-${i}"></div>`;
            }
            inputsTermoEsq += `<div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-esq-p1"></div><div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-esq-p2"></div>`;
            inputsTermoDir += `<div class="input-group"><label style="color:var(--text-accent)">Positivo 1</label><input type="text" id="t-dir-p1"></div><div class="input-group"><label style="color:var(--text-accent)">Positivo 2</label><input type="text" id="t-dir-p2"></div>`;

            bodyContainer.innerHTML += `
                <div id="folhao-aba-peritagem" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading);">Folga de Aresta - Medição Multi-Largura</h3>
                    <div class="input-group" style="max-width: 300px; margin-bottom: 20px;">
                        <label>LARGURA DA FACE DE REFERÊNCIA</label>
                        <select id="folga-largura" class="premium-select" onchange="carregarMedidaAresta()">
                            <option value="830">LARGURA 830</option><option value="870">LARGURA 870</option>
                            <option value="950">LARGURA 950</option><option value="1030">LARGURA 1030</option>
                            <option value="1100">LARGURA 1100</option><option value="1180">LARGURA 1180</option>
                            <option value="1230">LARGURA 1230</option><option value="1300">LARGURA 1300</option>
                            <option value="1380">LARGURA 1380</option><option value="1460">LARGURA 1460</option>
                            <option value="1500">LARGURA 1500</option><option value="1530">LARGURA 1530</option>
                            <option value="1550">LARGURA 1550</option><option value="1580">LARGURA 1580</option>
                            <option value="1620">LARGURA 1620</option>
                        </select>
                    </div>
                    <div class="form-grid-2-mobile" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: var(--bg-th); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 15px; color: var(--text-heading); text-align: center;">PLACA ESQUERDA</h4>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Cima (O/M)</label><input type="text" id="fa-esq-cima" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Meio (V)</label><input type="text" id="fa-esq-meio" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Inferior (E/L)</label><input type="text" id="fa-esq-inf" onkeyup="salvarMedidaAresta()"></div>
                            <hr style="border: 1px solid var(--border-color); margin: 15px 0;">
                            <div class="input-group"><label style="color:var(--warning)">Folga da Chaveta Esq.</label><input type="text" id="fa-esq-chav" onkeyup="salvarMedidaAresta()"></div>
                        </div>
                        <div style="background: var(--bg-th); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 15px; color: var(--text-heading); text-align: center;">PLACA DIREITA</h4>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Cima (O/M)</label><input type="text" id="fa-dir-cima" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Meio (V)</label><input type="text" id="fa-dir-meio" onkeyup="salvarMedidaAresta()"></div>
                            <div class="input-group" style="margin-bottom: 10px;"><label>Medida Inferior (E/L)</label><input type="text" id="fa-dir-inf" onkeyup="salvarMedidaAresta()"></div>
                            <hr style="border: 1px solid var(--border-color); margin: 15px 0;">
                            <div class="input-group"><label style="color:var(--warning)">Folga da Chaveta Dir.</label><input type="text" id="fa-dir-chav" onkeyup="salvarMedidaAresta()"></div>
                        </div>
                    </div>
                </div>
                <div id="folhao-aba-eletrica" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading); border-bottom: 1px solid var(--text-accent); padding-bottom: 5px;">Isolamento dos Sensores de Nível do Molde (>10 MΩ)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 30px;">
                        <div class="input-group"><label>Pinos 5 e 6</label><input type="text" id="iso-5-6"></div><div class="input-group"><label>Pinos 5 e 8</label><input type="text" id="iso-5-8"></div>
                        <div class="input-group"><label>Pinos 5 e 10</label><input type="text" id="iso-5-10"></div><div class="input-group"><label>Pinos 5 e 15</label><input type="text" id="iso-5-15"></div>
                        <div class="input-group"><label>Pinos 6 e 8</label><input type="text" id="iso-6-8"></div><div class="input-group"><label>Pinos 6 e 10</label><input type="text" id="iso-6-10"></div>
                        <div class="input-group"><label>Pinos 6 e 15</label><input type="text" id="iso-6-15"></div><div class="input-group"><label>Pinos 8 e 10</label><input type="text" id="iso-8-10"></div>
                        <div class="input-group"><label>Pinos 8 e 15</label><input type="text" id="iso-8-15"></div><div class="input-group"><label>Pinos 10 e 15</label><input type="text" id="iso-10-15"></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;"><h4 style="text-align: center; margin-bottom: 10px;">PLACA FIXA</h4><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">${inputsTermoFixa}</div></div>
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;"><h4 style="text-align: center; margin-bottom: 10px;">PLACA MÓVEL</h4><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">${inputsTermoMovel}</div></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;"><h4 style="text-align: center; margin-bottom: 10px;">ESTREITA ESQUERDA</h4><div style="display: grid; grid-template-columns: 1fr; gap: 10px;">${inputsTermoEsq}</div></div>
                        <div style="background: var(--bg-th); padding: 10px; border-radius: 8px;"><h4 style="text-align: center; margin-bottom: 10px;">ESTREITA DIREITA</h4><div style="display: grid; grid-template-columns: 1fr; gap: 10px;">${inputsTermoDir}</div></div>
                    </div>
                </div>
                <div id="folhao-aba-materiais" class="folhao-content hidden">
                    <h3 style="margin-bottom: 15px; color: var(--text-heading);">Relatório de Materiais Utilizados</h3>
                    <textarea id="materiais-utilizados-texto" class="premium-textarea" rows="10" placeholder="Liste as quantidades e materiais utilizados..."></textarea>
                </div>
            `;
        }
    }
}

export function abrirFolhaoMCC4(id) {
    injetarAbasFaltantes();
    ID_FOLHAO_ATUAL = id;
    
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return;

    // Busca a lista baseada exatamente no TIPO da peça cadastrada
    let listaInteligente = BIBLIOTECA_CHECKLISTS[item.tipo] || ["Checklist padrão para este equipamento."];

    document.getElementById("mcc4-tag-name").innerText = id;
    // ... (o resto da função permanece igual)
    renderizarChecklist(listaInteligente, "container-check-recebimento", "geral");
    // ...
}

export function fecharFolhaoMCC4() {
    document.getElementById("modal-folhao-mcc4").classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

export function trocarAbaFolhao(event, idAba) {
    document.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(idAba).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

export function renderizarChecklist(arrayPerguntas, containerId, prefix) {
    const container = document.getElementById(containerId);
    let html = "";
    arrayPerguntas.forEach((pergunta, index) => {
        let name = `${prefix}-q${index}`;
        html += `<div class="check-item"><p>${index + 1}. ${pergunta}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
    });
    container.innerHTML = html;
}

export function gerarLinhasChecklistPDF(arrayPerguntas, prefix) {
    let html = "";
    arrayPerguntas.forEach((pergunta, index) => {
        let name = `${prefix}-q${index}`;
        let radios = document.getElementsByName(name);
        let valorSelecionado = "N/A";
        for(let i=0; i<radios.length; i++) if(radios[i].checked) { valorSelecionado = radios[i].value; break; }
        html += `<tr><td style="text-align:center;">${index + 1}</td><td>${pergunta}</td><td style="text-align:center; font-weight:bold;">${valorSelecionado}</td></tr>`;
    });
    return html;
}

export function salvarEImprimirFolhaoMCC4() {
    // Usando as funções do script principal que vamos liberar para a janela
    if (!window.verificarAcesso() || !ID_FOLHAO_ATUAL) return;
    
    let item = BANCO_ATIVOS.find(a => a.id === ID_FOLHAO_ATUAL);
    if (!item) return;

    let tipoExecucao = document.getElementById("mcc4-tipo-execucao").value;
    let motivo = document.getElementById("mcc4-motivo").value || "Manutenção Padrão";
    
    if(tipoExecucao === "GERAL") { item.ton = 0; item.dias = 0; }
    item.local = "Oficina / Reserva";
    
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    
    let linkImprimir = `<button class='btn-xs-primary' style='margin-left:10px; cursor:pointer; color:var(--text-accent)' onclick='imprimirLaudoSalvo("${ID_FOLHAO_ATUAL}", "${motivo}")'><i class='fas fa-print'></i> Imprimir Folhão</button>`;
    
    // Chama o registrador do script principal
    window.registrarHistorico(item.id, `Folhão MCC4 assinado. Execução: ${tipoExecucao}. Motivo: ${motivo}. ${linkImprimir}`);
    
    fecharFolhaoMCC4();
    renderReparos(); renderReservas(); renderAtivos();
    window.calcularKpisGlobais();
    
    imprimirLaudoSalvo(ID_FOLHAO_ATUAL, motivo);
}

export function getV(id) {
    let el = document.getElementById(id);
    return el && el.value ? el.value : ' - ';
}

export function imprimirLaudoSalvo(tag, motivo) {
    const printDiv = document.getElementById("print-content");
    let materiais = document.getElementById("materiais-utilizados-texto") ? document.getElementById("materiais-utilizados-texto").value : "";
    
    // Descobre qual é a peça para puxar a lista certa no PDF
    let item = BANCO_ATIVOS.find(a => a.id === tag);
    let tipoDaPeca = item ? item.tipo : "Equipamento";
    let listaInteligente = CHECKLISTS_EQUIPAMENTOS[tipoDaPeca] || ["Inspecionar estrutura e lubrificação do equipamento."];

    let htmlFolgas = ""; let largurasPreenchidas = Object.keys(DADOS_FOLGA_ARESTA);
    
    if(largurasPreenchidas.length === 0) { htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida de folga registrada.</td></tr>"; } 
    else {
        largurasPreenchidas.forEach(larg => {
            let d = DADOS_FOLGA_ARESTA[larg];
            if(d.ec || d.em || d.ei || d.ech || d.dc || d.dm || d.di || d.dch) {
                htmlFolgas += `<tr style="background:#ddd; font-weight:bold;"><td colspan="3" style="text-align:center; padding: 4px;">LARGURA ${larg}</td></tr>
                    <tr><td>Superior (Cima)</td><td>${d.ec || '-'}</td><td>${d.dc || '-'}</td></tr>
                    <tr><td>Central (Meio)</td><td>${d.em || '-'}</td><td>${d.dm || '-'}</td></tr>
                    <tr><td>Inferior</td><td>${d.ei || '-'}</td><td>${d.di || '-'}</td></tr>
                    <tr><td>Ajuste Chavetas</td><td>${d.ech || '-'}</td><td>${d.dch || '-'}</td></tr>`;
            }
        });
        if(htmlFolgas === "") htmlFolgas = "<tr><td colspan='3' style='text-align:center;'>Nenhuma medida preenchida.</td></tr>";
    }

    let tableTermoLargas = "";
    for(let i=1; i<=12; i++) tableTermoLargas += `<tr><td>Termopar ${i} (10-20 Ω)</td><td>${getV(`t-fix-${i}`)}</td><td>${getV(`t-mov-${i}`)}</td></tr>`;
    tableTermoLargas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV(`t-fix-p1`)}</td><td>${getV(`t-mov-p1`)}</td></tr><tr style="background:#eee"><td>Positivo 2</td><td>${getV(`t-fix-p2`)}</td><td>${getV(`t-mov-p2`)}</td></tr>`;

    let tableTermoEstreitas = "";
    for(let i=1; i<=3; i++) tableTermoEstreitas += `<tr><td>Termopar ${i} (5-15 Ω)</td><td>${getV(`t-esq-${i}`)}</td><td>${getV(`t-dir-${i}`)}</td></tr>`;
    tableTermoEstreitas += `<tr style="background:#eee"><td>Positivo 1</td><td>${getV(`t-esq-p1`)}</td><td>${getV(`t-dir-p1`)}</td></tr><tr style="background:#eee"><td>Positivo 2</td><td>${getV(`t-esq-p2`)}</td><td>${getV(`t-dir-p2`)}</td></tr>`;

    let html = `
        <div style="border: 3px solid #000; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-family: Arial, sans-serif;">
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 2px;">CSN</div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 5px;">FOLHA DE LIBERAÇÃO - ${tipoDaPeca.toUpperCase()}</div>
                <div style="font-size: 14px;">Laudo Oficial de Manutenção e Peritagem</div>
            </div>
            <div style="font-size: 13px; text-align: right; line-height: 1.5;">
                <div><strong>DATA INÍCIO:</strong> ${getV('mcc4-data-inicio') || new Date().toLocaleDateString('pt-BR')}</div>
                <div><strong>DATA FIM:</strong> ${getV('mcc4-data-fim') || new Date().toLocaleDateString('pt-BR')}</div>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 20px; font-family: Arial, sans-serif;">
            <div style="padding: 5px; border-right: 1px solid #000; border-bottom: 1px solid #000;"><strong>TAG:</strong> ${tag}</div>
            <div style="padding: 5px; border-bottom: 1px solid #000;"><strong>MOTIVO:</strong> ${motivo}</div>
            <div style="padding: 5px; border-right: 1px solid #000;"><strong>TIPO EXECUÇÃO:</strong> ${getV('mcc4-tipo-execucao')}</div>
            <div style="padding: 5px;"><strong>LÍDER/RESPONSÁVEL:</strong> ${OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : ''}</div>
        </div>

        <div class="print-section-title">1. Check List Geral de Inspeção</div>
        <table class="print-table">
            <thead>
                <tr><th colspan="3" style="background:#ddd">STATUS DOS COMPONENTES E SISTEMAS</th></tr>
                <tr><th>Item</th><th>Descrição do Serviço</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${gerarLinhasChecklistPDF(listaInteligente, "geral")}
            </tbody>
        </table>

        <div class="print-section-title" style="page-break-before: always;">2. Relatório de Folgas de Aresta</div>
        <table class="print-table"><thead><tr><th>Posição de Medição</th><th>Placa Esquerda (Tol: 0.25)</th><th>Placa Direita (Tol: 0.25)</th></tr></thead><tbody>${htmlFolgas}</tbody></table>
        
        <div class="print-section-title" style="page-break-before: always;">3. Isolamento dos Sensores de Nível (>10 MΩ)</div>
        <table class="print-table">
            <thead><tr><th>Pinos Conectores</th><th>Valor Lido</th><th>Pinos Conectores</th><th>Valor Lido</th></tr></thead>
            <tbody>
                <tr><td>5 e 6</td><td>${getV('iso-5-6')}</td><td>6 e 10</td><td>${getV('iso-6-10')}</td></tr>
                <tr><td>5 e 8</td><td>${getV('iso-5-8')}</td><td>6 e 15</td><td>${getV('iso-6-15')}</td></tr>
                <tr><td>5 e 10</td><td>${getV('iso-5-10')}</td><td>8 e 10</td><td>${getV('iso-8-10')}</td></tr>
                <tr><td>5 e 15</td><td>${getV('iso-5-15')}</td><td>8 e 15</td><td>${getV('iso-8-15')}</td></tr>
                <tr><td>6 e 8</td><td>${getV('iso-6-8')}</td><td>10 e 15</td><td>${getV('iso-10-15')}</td></tr>
            </tbody>
        </table>
        
        <div class="print-section-title">4. Resistência Placas LARGAS</div><table class="print-table"><thead><tr><th>Elemento</th><th>Fixa (Ω)</th><th>Móvel (Ω)</th></tr></thead><tbody>${tableTermoLargas}</tbody></table>
        <div class="print-section-title">5. Resistência Placas ESTREITAS</div><table class="print-table"><thead><tr><th>Elemento</th><th>Esquerda (Ω)</th><th>Direita (Ω)</th></tr></thead><tbody>${tableTermoEstreitas}</tbody></table>
        
        <div class="print-section-title">6. Relação de Materiais Utilizados</div>
        <div style="border: 1px solid #000; padding: 10px; font-size: 12px; min-height: 80px;">${materiais ? materiais.replace(/\n/g, "<br>") : 'Nenhum material listado.'}</div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center;">
            <div><p>___________________________________</p><p>Líder Responsável / Operador</p></div>
            <div><p>___________________________________</p><p>Inspetor de Qualidade</p></div>
        </div>
    `;
    printDiv.innerHTML = html;
    window.print();
}

// Liberando o clique do HTML para as funções do folhão
window.carregarMedidaAresta = carregarMedidaAresta;
window.salvarMedidaAresta = salvarMedidaAresta;
window.trocarAbaFolhao = trocarAbaFolhao;
window.fecharFolhaoMCC4 = fecharFolhaoMCC4;
window.salvarEImprimirFolhaoMCC4 = salvarEImprimirFolhaoMCC4;
window.imprimirLaudoSalvo = imprimirLaudoSalvo;