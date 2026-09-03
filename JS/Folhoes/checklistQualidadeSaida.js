// ==============================================================
// checklistQualidadeSaida.js
// Checklist de Inspeção de Saída da Qualidade — convertido do
// script.py (reportlab) que o inspetor de Qualidade mandou, seguindo
// o MESMO padrão dos outros Folhões do sistema: monta um HTML,
// salva em /api/laudos (tabela `laudos`, igual todo o resto), e usa
// window.print() no #print-content pra gerar o PDF. Nada de gerar
// PDF no servidor — é o mesmo fluxo do Bender/Molde 4/etc.
// ==============================================================

import { resolverApiBase, OPERADOR_LOGADO } from '../Core/banco.js?v=5';

// --------------------------------------------------------------
// DADOS DO CHECKLIST — os mesmos 10 tópicos do script.py
// --------------------------------------------------------------
const TOPICOS_QUALIDADE_SAIDA = [
    ["1", "IDENTIFICAÇÃO E INSPEÇÃO VISUAL DO MOLDE", [
        ["1.1", "Identificação do molde", "Identificação presente, legível e correspondente ao equipamento."],
        ["1.2", "Número do molde", "Número conferido com a documentação/OS."],
        ["1.3", "Registro da manutenção", "OS e registros da manutenção disponíveis."],
        ["1.4", "Tipo de execução", "Manutenção parcial ou geral devidamente identificada."],
        ["1.5", "Condição geral", "Sem avarias aparentes que comprometam a utilização."],
        ["1.6", "Estrutura do molde", "Sem deformações, trincas ou danos visíveis."],
        ["1.7", "Placas", "Placas largas e estreitas sem danos aparentes que comprometam a operação."],
        ["1.8", "Cavidade interna", "Limpa e livre de resíduos que possam interferir na operação."],
        ["1.9", "Proteções e conexões", "Proteções, engates, mangueiras e tubulações instalados e sem anomalias aparentes."],
        ["1.10", "Limpeza geral", "Equipamento limpo, sem excesso de resíduos provenientes da manutenção."]
    ]],
    ["2", "PLACAS / GEOMETRIA / DIMENSIONAL", [
        ["2.1", "Esquadramento das faces estreitas", "Conforme tolerância especificada no padrão do equipamento."],
        ["2.2", "Alinhamento do molde", "Alinhamento em relação ao gabarito do stand conforme especificação."],
        ["2.3", "Folgas das placas", "Folgas dentro dos limites especificados para o equipamento."],
        ["2.4", "Planicidade das placas", "Planicidade conforme tolerância especificada."],
        ["2.5", "Desgaste das placas", "Desgaste dentro do limite especificado."],
        ["2.6", "Ranhuras", "Profundidade dentro do limite especificado."],
        ["2.7", "Marcação dos centros", "Marcações dos centros das placas largas legíveis."]
    ]],
    ["3", "ROLOS / FOOT ROLL / EDGE ROLL", [
        ["3.1", "Diâmetro dos Foot Rolls", "Medida encontrada conforme especificação."],
        ["3.2", "Diâmetro dos Edge Rolls", "Diâmetro conforme especificação; afastar rolo abaixo do limite estabelecido."],
        ["3.3", "Alinhamento dos rolos", "Rolos alinhados conforme padrão."],
        ["3.4", "Giro dos rolos", "Rolos girando livremente, sem travamento."],
        ["3.5", "Estado superficial", "Sem danos que comprometam o funcionamento."],
        ["3.6", "Lubrificação", "Rolos devidamente lubrificados."]
    ]],
    ["4", "FOLGAS E ALINHAMENTO", [
        ["4.1", "Folga de aresta", "Folga dentro da tolerância especificada."],
        ["4.2", "Folga das placas", "Folga conforme padrão do equipamento."],
        ["4.3", "Alinhamento das placas", "Placas alinhadas e posicionadas corretamente."],
        ["4.4", "Alinhamento dos componentes", "Sem desalinhamento ou interferência durante a movimentação."]
    ]],
    ["5", "SISTEMA DE REFRIGERAÇÃO", [
        ["5.1", "Conexões de água", "Conexões corretamente montadas e em boas condições."],
        ["5.2", "Mangueiras", "Sem cortes, amassamentos ou danos."],
        ["5.3", "Vazamentos", "Ausência de vazamentos durante o teste."],
        ["5.4", "Passagem de água", "Fluxo de água conforme condição de teste."],
        ["5.5", "Distribuição", "Sistema sem obstruções aparentes."],
        ["5.6", "Proteção das conexões", "Conexões protegidas quando aplicável."]
    ]],
    ["6", "SISTEMA HIDRÁULICO", [
        ["6.1", "Cilindros", "Cilindros em condições adequadas de funcionamento."],
        ["6.2", "Mangueiras hidráulicas", "Sem danos, cortes, deformações ou condições anormais."],
        ["6.3", "Conexões", "Conexões apertadas e sem vazamentos."],
        ["6.4", "Vazamento de óleo", "Não apresentar vazamento."],
        ["6.5", "Engates hidráulicos", "Limpos, protegidos e em boas condições."],
        ["6.6", "Funcionamento", "Movimentação hidráulica sem anormalidades."]
    ]],
    ["7", "TRANSMISSÕES / CARDANS", [
        ["7.1", "Cardans", "Instalados corretamente e identificados."],
        ["7.2", "Fixação", "Elementos de fixação presentes e corretamente montados."],
        ["7.3", "Lubrificação", "Cardans devidamente lubrificados."],
        ["7.4", "Proteção", "Proteções instaladas e em boas condições."],
        ["7.5", "Interferência", "Ausência de interferência durante a movimentação."],
        ["7.6", "Condição geral", "Sem danos ou anomalias aparentes."]
    ]],
    ["8", "LUBRIFICAÇÃO", [
        ["8.1", "Pontos de lubrificação", "Pontos atendidos conforme necessidade do equipamento."],
        ["8.2", "Distribuição de graxa", "Sistema de distribuição em condição adequada."],
        ["8.3", "Dosadores", "Dosadores e conexões sem anomalias aparentes."],
        ["8.4", "Vazamentos", "Ausência de vazamento excessivo de graxa."],
        ["8.5", "Limpeza", "Sem excesso de graxa em locais inadequados."]
    ]],
    ["9", "TESTE FUNCIONAL", [
        ["9.1", "Movimentação", "Movimentação completa sem travamentos."],
        ["9.2", "Rolos", "Rolos funcionando sem travamentos ou ruídos anormais."],
        ["9.3", "Sistema hidráulico", "Funcionamento sem vazamentos ou anormalidades."],
        ["9.4", "Sistema de refrigeração", "Funcionamento conforme condição de teste."],
        ["9.5", "Transmissões", "Funcionamento sem interferências."],
        ["9.6", "Ruídos anormais", "Não apresentar ruídos anormais durante o teste."]
    ]],
    ["10", "DOCUMENTAÇÃO E LIBERAÇÃO DA QUALIDADE", [
        ["10.1", "Checklist preenchido", "Todos os campos aplicáveis preenchidos."],
        ["10.2", "Medições registradas", "Todas as medições aplicáveis registradas."],
        ["10.3", "Desvios registrados", "Desvios identificados devidamente registrados."],
        ["10.4", "Evidências", "Evidências necessárias disponíveis."],
        ["10.5", "Pendências", "Não existem pendências que impeçam a liberação."],
        ["10.6", "Resultado final", "Equipamento atende aos critérios de liberação da Qualidade."]
    ]]
];

// --------------------------------------------------------------
// FUNÇÕES AUXILIARES
// --------------------------------------------------------------
function getV(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// Cada item tem 3 opções (OK / NOK / N-A), num grupo de radio próprio.
function getRadio3Via(name) {
    const radios = document.getElementsByName(name);
    for (const r of radios) if (r.checked) return r.value;
    return '';
}

// --------------------------------------------------------------
// CSS DO CHECKLIST — injetado uma vez, cobre desktop e mobile
// --------------------------------------------------------------
function garantirEstiloChecklistQualidade() {
    if (document.getElementById('qsaida-estilo')) return;
    const style = document.createElement('style');
    style.id = 'qsaida-estilo';
    style.textContent = `
        .qsaida-item {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            padding: 12px;
            margin-bottom: 10px;
            border: 1px solid var(--border-color, rgba(255,255,255,0.1));
            border-radius: 8px;
            background: rgba(255,255,255,0.02);
        }
        .qsaida-item .qsaida-desc { font-size: 13px; }
        .qsaida-item .qsaida-desc .qsaida-criterio { display:block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .qsaida-item .qsaida-opts { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }
        .qsaida-item .qsaida-opts label { display: flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer; }
        .qsaida-item .qsaida-obs { width: 100%; }

        @media (min-width: 760px) {
            .qsaida-item {
                grid-template-columns: 2.2fr 1fr 1.4fr;
                align-items: center;
                gap: 12px;
            }
        }
    `;
    document.head.appendChild(style);
}

// --------------------------------------------------------------
// RENDERIZA O CHECKLIST NO MODAL (todas as 10 seções, contínuo)
// --------------------------------------------------------------
function renderizarChecklistQualidade() {
    const container = document.getElementById('checklist-qualidade-corpo');
    if (!container) return;
    garantirEstiloChecklistQualidade();

    let html = '';
    TOPICOS_QUALIDADE_SAIDA.forEach(([numero, nome, itens]) => {
        html += `<h4 style="margin:18px 0 8px; color:var(--text-accent); border-bottom:1px dashed var(--border-color); padding-bottom:4px;">${numero}. ${nome}</h4>`;
        itens.forEach(([codigo, ponto, criterio]) => {
            const name = `qsaida-item-${codigo}`;
            html += `
                <div class="qsaida-item">
                    <p class="qsaida-desc"><b>${codigo}</b> — ${ponto}<span class="qsaida-criterio">${criterio}</span></p>
                    <div class="qsaida-opts">
                        <label><input type="radio" name="${name}" value="OK"> OK</label>
                        <label><input type="radio" name="${name}" value="NOK"> NOK</label>
                        <label><input type="radio" name="${name}" value="N/A"> N/A</label>
                    </div>
                    <input type="text" id="qsaida-obs-${codigo}" class="premium-input qsaida-obs" placeholder="Observação (opcional)">
                </div>
            `;
        });
    });
    container.innerHTML = html;
}

// --------------------------------------------------------------
// MONTA O HTML IMPRIMÍVEL (mesmo padrão visual dos outros Folhões)
// --------------------------------------------------------------
function montarHtmlChecklistQualidade(pecaId) {
    const dataCompacta = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('').slice(2);
    const codigoDocumento = `QUAL-SAIDA-${pecaId}-${dataCompacta}`;

    const linhasTabela = (itens) => itens.map(([codigo, ponto, criterio]) => {
        const resultado = getRadio3Via(`qsaida-item-${codigo}`) || '';
        const obs = getV(`qsaida-obs-${codigo}`);
        return `<tr>
            <td style="text-align:center;">${codigo}</td>
            <td>${ponto}</td>
            <td>${criterio}</td>
            <td style="text-align:center; font-weight:bold;">${resultado==='OK'?'X':''}</td>
            <td style="text-align:center; font-weight:bold;">${resultado==='NOK'?'X':''}</td>
            <td style="text-align:center; font-weight:bold;">${resultado==='N/A'?'X':''}</td>
            <td>${obs}</td>
        </tr>`;
    }).join('');

    const secoes = TOPICOS_QUALIDADE_SAIDA.map(([numero, nome, itens]) => `
        <div class="titulo-secao">${numero}. ${nome}</div>
        <table>
            <colgroup>
                <col style="width:5%;"><col style="width:20%;"><col style="width:37%;">
                <col style="width:6%;"><col style="width:6%;"><col style="width:6%;"><col style="width:20%;">
            </colgroup>
            <thead><tr>
                <th>ITEM</th><th>PONTO DE INSPEÇÃO</th><th>CRITÉRIO DE ACEITAÇÃO</th>
                <th>OK</th><th>NOK</th><th>N/A</th>
                <th>OBSERVAÇÃO</th>
            </tr></thead>
            <tbody>${linhasTabela(itens)}</tbody>
        </table>
    `).join('');

    const resultadoFinal = getRadio3Via('qsaida-resultado-final') || '';

    return `
    <style>
        /* Margens ABNT (NBR 14724): superior/esquerda 3cm, inferior/direita 2cm */
        @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
        /* 🔧 CORREÇÃO (mesmo problema já resolvido no Molde MCC4/Cadeira/
           Segmento Grupo/Segmento Zero): sem print-color-adjust, o
           navegador não imprime cor de fundo a menos que o usuário
           marque "Gráficos de segundo plano" na hora de imprimir. */
        .pdf-base { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.5; width: 16cm; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .pdf-base *, .pdf-base *::before, .pdf-base *::after { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .pdf-base h2 { font-family: Arial, Helvetica, sans-serif; }
        .pdf-base table { width: 16cm; max-width: 16cm; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; line-height: 1.2; }
        .pdf-base th, .pdf-base td { border: 1px solid #333; padding: 3px 4px; font-size: 8.5pt; white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word; vertical-align: top; }
        .pdf-base th { background: #e8e8e8; text-align: center; font-weight: bold; }
        .pdf-base thead { display: table-header-group; }
        .pdf-base tr { page-break-inside: avoid; }
        .pdf-base .titulo-secao {
            background: #002b5e; color: #fff; font-weight: bold;
            padding: 6px 8px; text-align: left; margin: 16px 0 6px 0;
            font-size: 10.5pt; font-family: Arial, Helvetica, sans-serif;
            text-transform: uppercase; letter-spacing: 0.3px;
        }
        .pdf-base .assinatura-box { margin: 6px 0 4px 0; font-size: 9pt; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
        .pdf-base .rodape-documento {
            margin-top: 24px; padding-top: 6px; border-top: 1px solid #999;
            font-size: 7.5pt; color: #444; font-family: Arial, Helvetica, sans-serif;
            display: flex; justify-content: space-between;
        }
        .pdf-base .campos-identificacao td { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; padding: 5px 6px; }
        @media print {
            .quebra-pagina { break-before: page; page-break-before: always; margin-top: 10px; }
            .pdf-base { counter-reset: pagina; }
            .rodape-documento::after { content: ""; }
        }
    </style>
    <div class="pdf-base">
        <div style="display: flex; border: 2px solid #000; border-bottom: 4px solid #002b5e; margin-bottom: 10px; align-items: center; font-family: Arial, Helvetica, sans-serif;">
            <div style="width: 18%; text-align: center; border-right: 2px solid #000; padding: 10px;"><span style="font-weight: 900; font-size: 26px; color: #002b5e; letter-spacing: -1.5px;">CSN</span></div>
            <div style="width: 62%; text-align: center; padding: 8px;">
                <h2 style="margin: 0; font-size: 13pt; letter-spacing: 0.5px;">CHECKLIST DE INSPEÇÃO DE SAÍDA DA QUALIDADE</h2>
                <p style="margin: 4px 0 0 0; font-size: 8.5pt; font-weight: bold;">DATA DA INSPEÇÃO: ${getV('qsaida-data')}</p>
            </div>
            <div style="width: 20%; font-size: 9pt; border-left: 2px solid #000; padding: 8px; font-weight: bold; text-align: center;">
                EQUIPAMENTO<br><span style="font-size: 13pt;">${pecaId}</span>
            </div>
        </div>

        <table class="campos-identificacao" style="margin-bottom: 15px; border: 2px solid #000;">
            <tr>
                <td style="width: 25%;"><strong>Nº MOLDE:</strong> ${getV('qsaida-num-molde') || pecaId}</td>
                <td style="width: 25%;"><strong>Nº OS:</strong> ${getV('qsaida-num-os')}</td>
                <td style="width: 25%; color: #002b5e;"><strong>TIPO:</strong> ${getV('qsaida-tipo')}</td>
                <td style="width: 25%; background-color: #f0f0f0;"><strong>CALIBRAÇÃO ATÉ:</strong> ${getV('qsaida-calibracao')}</td>
            </tr>
            <tr>
                <td colspan="2"><strong>RESP. MANUTENÇÃO:</strong> ${getV('qsaida-resp-manutencao')} <br><strong>MATRÍCULA:</strong> ${getV('qsaida-mat-manutencao')}</td>
                <td colspan="2"><strong>INSPETOR QUALIDADE:</strong> ${getV('qsaida-inspetor')} <br><strong>MATRÍCULA:</strong> ${getV('qsaida-mat-inspetor')}</td>
            </tr>
            <tr>
                <td colspan="4"><strong>INSTRUMENTO(S) DE MEDIÇÃO:</strong> ${getV('qsaida-instrumento')}</td>
            </tr>
        </table>

        ${secoes}

        <div class="titulo-secao">11. Resultado Final da Inspeção</div>
        <table style="margin-bottom: 15px; border: 2px solid #000; font-family: Arial, Helvetica, sans-serif;">
            <tr>
                <td style="text-align:center; font-weight:bold; background:${resultadoFinal==='APROVADO'?'#c8f7c5':'#fff'};">☐ APROVADO ${resultadoFinal==='APROVADO'?'(X)':''}</td>
                <td style="text-align:center; font-weight:bold; background:${resultadoFinal==='APROVADO COM RESTRIÇÃO'?'#fff3c4':'#fff'};">☐ APROVADO C/ RESTRIÇÃO ${resultadoFinal==='APROVADO COM RESTRIÇÃO'?'(X)':''}</td>
                <td style="text-align:center; font-weight:bold; background:${resultadoFinal==='REPROVADO'?'#f7c5c5':'#fff'};">☐ REPROVADO ${resultadoFinal==='REPROVADO'?'(X)':''}</td>
            </tr>
        </table>
        <p style="font-size:11pt; font-family: Arial, Helvetica, sans-serif;"><strong>OBSERVAÇÕES / DESVIOS ENCONTRADOS:</strong> ${getV('qsaida-observacoes-gerais') || '—'}</p>

        <div class="assinatura-box" style="margin-top:30px; display:flex; justify-content:space-around; text-align:center;">
            <div>___________________________________<br>Inspetor da Qualidade</div>
            <div>___________________________________<br>Responsável pela Manutenção</div>
        </div>

        <div class="rodape-documento">
            <span>Documento: ${codigoDocumento}</span>
            <span>Oficina de Moldes e Segmentos — CSN</span>
            <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
        </div>
    </div>`;
}

// --------------------------------------------------------------
// ABRIR / FECHAR MODAL
// --------------------------------------------------------------
window.abrirChecklistQualidadeSaida = function(registroId, pecaId) {
    let overlay = document.getElementById('modal-checklist-qualidade-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-checklist-qualidade-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.style.zIndex = '10097';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width:720px; max-height:90vh; display:flex; flex-direction:column;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 id="checklist-qualidade-titulo"><i class="fas fa-clipboard-check"></i> Checklist de Saída da Qualidade</h2>
                    <button class="btn-close-modal" onclick="document.getElementById('modal-checklist-qualidade-overlay').classList.add('hidden')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="overflow-y:auto; flex:1;">
                    <div class="form-grid-4" style="margin-bottom:14px;">
                        <div class="input-group"><label>Nº do Molde</label><input type="text" id="qsaida-num-molde" class="premium-input"></div>
                        <div class="input-group"><label>Nº da OS</label><input type="text" id="qsaida-num-os" class="premium-input"></div>
                        <div class="input-group"><label>Data da inspeção</label><input type="date" id="qsaida-data" class="premium-input"></div>
                        <div class="input-group">
                            <label>Tipo</label>
                            <select id="qsaida-tipo" class="premium-select"><option value="Parcial">Parcial</option><option value="Geral">Geral</option></select>
                        </div>
                        <div class="input-group"><label>Responsável Manutenção</label><input type="text" id="qsaida-resp-manutencao" class="premium-input"></div>
                        <div class="input-group"><label>Matrícula</label><input type="text" id="qsaida-mat-manutencao" class="premium-input"></div>
                        <div class="input-group"><label>Inspetor da Qualidade</label><input type="text" id="qsaida-inspetor" class="premium-input"></div>
                        <div class="input-group"><label>Matrícula</label><input type="text" id="qsaida-mat-inspetor" class="premium-input"></div>
                        <div class="input-group"><label>Instrumento de medição</label><input type="text" id="qsaida-instrumento" class="premium-input"></div>
                        <div class="input-group"><label>Calibração válida até</label><input type="date" id="qsaida-calibracao" class="premium-input"></div>
                    </div>

                    <div id="checklist-qualidade-corpo"></div>

                    <div class="input-group" style="margin:16px 0;">
                        <label>Resultado Final</label>
                        <div class="check-options" style="display:flex; gap:14px;">
                            <label><input type="radio" name="qsaida-resultado-final" value="APROVADO"> Aprovado</label>
                            <label><input type="radio" name="qsaida-resultado-final" value="APROVADO COM RESTRIÇÃO"> Aprovado c/ Restrição</label>
                            <label><input type="radio" name="qsaida-resultado-final" value="REPROVADO"> Reprovado</label>
                        </div>
                    </div>
                    <div class="input-group" style="margin-bottom:16px;">
                        <label>Observações / Desvios encontrados</label>
                        <textarea id="qsaida-observacoes-gerais" class="premium-textarea" rows="3"></textarea>
                    </div>

                    <button class="btn-premium btn-success w-100" id="btn-salvar-checklist-qualidade">
                        <i class="fas fa-check"></i> Salvar e Gerar PDF
                    </button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', () => overlay.classList.add('hidden'));
        document.body.appendChild(overlay);
    }

    document.getElementById('checklist-qualidade-titulo').innerHTML = `<i class="fas fa-clipboard-check"></i> Checklist de Saída — ${pecaId}`;
    document.getElementById('qsaida-num-molde').value = pecaId;
    document.getElementById('qsaida-data').value = new Date().toISOString().slice(0, 10);
    renderizarChecklistQualidade();
    document.getElementById('btn-salvar-checklist-qualidade').onclick = () => window.salvarChecklistQualidadeSaida(registroId, pecaId);
    overlay.classList.remove('hidden');
};

// --------------------------------------------------------------
// SALVAR (grava em /api/laudos, igual todo o resto do sistema) E IMPRIMIR
// --------------------------------------------------------------
window.salvarChecklistQualidadeSaida = async function(registroId, pecaId) {
    const htmlPDF = montarHtmlChecklistQualidade(pecaId);
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Inspetor') : 'Sistema';

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peca_id: pecaId, tipo: 'Checklist Saída Qualidade', html: htmlPDF, operador })
        });
        if (!resp.ok) throw new Error('A API não confirmou o salvamento do checklist.');
    } catch (e) {
        console.error('Erro ao salvar Checklist de Saída da Qualidade:', e);
        alert(`❌ Não consegui salvar o checklist.\n\nMotivo: ${e.message}\n\nSeu preenchimento NÃO foi perdido — a janela continua aberta, tente salvar de novo.`);
        return;
    }

    if (window.registrarHistorico) {
        window.registrarHistorico(pecaId, `📋 Checklist de Saída da Qualidade preenchido e salvo.`);
    }

    document.getElementById('modal-checklist-qualidade-overlay').classList.add('hidden');

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = montarHtmlChecklistQualidade(pecaId);
    alert('✅ Checklist salvo. A impressão vai abrir em seguida.');
    setTimeout(() => window.print(), 400);
};

console.log('✅ checklistQualidadeSaida.js carregado.');