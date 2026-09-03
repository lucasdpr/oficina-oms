// ==============================================================
// folhaoMolde4.js - Módulo completo para BENDER e MOLDE MCC 4
// ==============================================================

import { BANCO_ATIVOS, resolverApiBase, OPERADOR_LOGADO } from '../Core/banco.js?v=5';
import { renderAtivos, renderReparos, renderReservas } from '../ui.js';
import { gerarTelasBenderHTML, montarHtmlLaudoBender } from './folhao_bender.js';
import { restaurarRascunhoNoModal, ativarAutoSalvamentoFolhao, finalizarRascunhoFolhao } from './folhaoPersistencia.js';
import { buscarPonteChecklist, preencherCamposFolhao, ligarListenerEdicaoManualFolhao, mostrarAvisoPreenchimentoChecklist } from '../Core/checklistFolhaoPonte.js';

let ID_FOLHAO_ATUAL = null;

// 🆕 Contexto da ponte com o Checklist de Execução do folhão aberto no
// momento — precisa ficar acessível pra window.folhaoM4CampoEditado
// (chamada quando o técnico edita um campo na mão) saber PRA QUAL
// etapa/execução mandar a correção de volta.
let PONTE_CHECKLIST_M4 = { execucaoId: null, tipoEquipamento: null, mapaCampoParaEtapa: {} };

// 🆕 Mesmo esquema, só que pro Bender (que compartilha este arquivo
// com o Molde MCC4, mas tem seu próprio modal e seus próprios campos).
let PONTE_CHECKLIST_BENDER = { execucaoId: null, tipoEquipamento: null, mapaCampoParaEtapa: {} };

// ==============================================================
// FUNÇÕES AUXILIARES
// ==============================================================
export function getV(id) {
    let el = document.getElementById(id);
    return el ? el.value : '';
}

export function getRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (let r of radios) if (r.checked) return r.value;
    // 🔧 CORREÇÃO: antes retornava 'NÃO' aqui como padrão — quase nunca
    // aparecia na prática porque o SIM vinha marcado (checked) por
    // padrão em toda pergunta (ver correção em renderizarTabelaSimNaoM4).
    // Agora que nenhuma pergunta vem pré-marcada, esse "padrão NÃO"
    // passaria a aparecer pra QUALQUER pergunta esquecida em branco —
    // fabricando uma resposta negativa que ninguém realmente deu. null
    // = pergunta em branco fica em branco no PDF (nem X no SIM, nem no
    // NÃO), honesto com o que de fato foi respondido.
    return null;
}

export function getCheckboxValue(id) {
    const el = document.getElementById(id);
    return el && el.checked ? 'OK' : '';
}

export function fecharFolhaoMCC4() {
    const modal = document.getElementById("modal-folhao-mcc4");
    if (modal) modal.classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

export function fecharFolhaoMolde4() {
    const modal = document.getElementById("modal-folhao-molde4");
    if (modal) modal.classList.add("hidden");
    ID_FOLHAO_ATUAL = null;
}

export function trocarAbaFolhao(event, idAba) {
    const modal = document.getElementById("modal-folhao-mcc4");
    if (!modal) return;
    modal.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    modal.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
    let aba = document.getElementById(idAba);
    if (aba) aba.classList.remove('hidden');
    if (event) event.currentTarget.classList.add('active');
}

export function trocarAbaMolde4(event, idAba) {
    const modal = document.getElementById('modal-folhao-molde4');
    if (!modal) return;
    modal.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
    modal.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
    let aba = document.getElementById(idAba);
    if (aba) aba.classList.remove('hidden');
    if (event) event.currentTarget.classList.add('active');
}

export function renderizarChecklist(categoriasObj, containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = "", groupIndex = 0;
    for (const [cat, perguntas] of Object.entries(categoriasObj)) {
        html += `<h4 style="margin:20px 0 10px; color:var(--text-accent); border-bottom:1px dashed var(--border-color);">${cat}</h4><div class="checklist-container">`;
        perguntas.forEach((p, idx) => {
            let name = `${prefix}-g${groupIndex}-q${idx}`;
            html += `<div class="check-item"><p>${idx + 1}. ${p}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
        });
        html += `</div>`;
        groupIndex++;
    }
    container.innerHTML = html;
}

// ==============================================================
// PREPARAR ABAS DINÂMICAS PARA O BENDER
// ==============================================================
function prepararAbasDinamicamente(tipoUpper) {
    const modal = document.getElementById("modal-folhao-mcc4");
    if (!modal) {
        console.error("Modal MCC4 não encontrado para adicionar abas dinâmicas.");
        return;
    }
    let tabsContainer = modal.querySelector('.folhao-tabs');
    let bodyContainer = modal.querySelector('.folhao-body');
    if (!tabsContainer || !bodyContainer) return;

    // Remove abas e conteúdos antigos (para evitar duplicação)
    modal.querySelectorAll('.tab-dinamica, .content-dinamico').forEach(el => el.remove());

    if (tipoUpper === "BENDER") {
        tabsContainer.innerHTML += `
            <button class="folhao-tab tab-dinamica" onclick="window.trocarAbaFolhao(event, 'bender-chegada')">3. Chegada</button>
            <button class="folhao-tab tab-dinamica" onclick="window.trocarAbaFolhao(event, 'bender-execucao')">4. Execução</button>
            <button class="folhao-tab tab-dinamica" onclick="window.trocarAbaFolhao(event, 'bender-saida')">5. Saída</button>
            <button class="folhao-tab tab-dinamica" onclick="window.trocarAbaFolhao(event, 'aba-materiais-geral')">6. Materiais</button>
        `;
        bodyContainer.innerHTML += gerarTelasBenderHTML();
    }
}

// ==============================================================
// DADOS DOS CHECKLISTS - MOLDE MCC 4 (IDÊNTICO AO DOCUMENTO)
// ==============================================================
const checklistsM4 = {
    recebimentoMecanica: [
        "Os engates rápidos para abertura da face móvel estão completos e em perfeitas condições?",
        "Os engates rápidos para o sistema de lubrificação estão completos e em perfeitas condições?",
        "Os flexíveis das guias laterais estão amassados e/ou danificados?",
        "Os flexíveis das guias laterais estão amassados e/ou danificados? (Duplicado doc original)",
        "As tubulações hidráulicas e de lubrificação estão em perfeitas condições?",
        "Os protetores sanfonados dos fusos e tubos telescópicos das placas laterais estão danificados?",
        "As cangalhas de spray estão 'OK' sem avarias?",
        "Há avarias nas mangueiras e tubulação de lubrificação dos foot rolls e guias laterais?",
        "As réguas de guia das placas laterais estão em perfeitas condições?",
        "Ao executar o teste de movimentação das laterais houve ruídos?",
        "Ao realizar o teste hidrostático nas placas foi identificados vazamentos?",
        "Ao realizar o teste de spray, ocorreu obstrução de bicos?"
    ],
    recebimentoEletrica: [
        "Os conectores do detector de break-out das faces larga estão tampados e em perfeitas condições?",
        "Os cabos elétricos dos termopares do detector de break-out das faces estreitas estão em perfeitas condições?"
    ],
    revisao: [
        "Retirar os parafusos de fixação dos foot rolls e guias laterais;",
        "Fazer acabamento e recondicionar roscas.",
        "Ajustar chavetas das guias dos rolos laterais e bases dos foot-rolls.",
        "Desmontar réguas guias das laterais, lixar, desempenar e recompor c/ solda se necessário",
        "Calibrar com 0.40mm a folga da arruela dos parafusos de fixação da face larga móvel.",
        "Desobstruir dreno na tampa das hastes do cilindro do clamp",
        "Ajustar as 04 porcas castelo da haste do cilindro de clamp da face larga móvel.",
        "Limpar e ajustar os parafusos de alinhamento das bases (guias laterais).",
        "Limpar faces de apoio das placas largas e estreitas e montar o'ring.",
        "Fazer inspeção visual em todo o sistema hidráulico e relatar anomalias.",
        "Verificar e reparar pinos travas dos eixos KARDANS, lubrificar, ajustar estrias e pintá-los.",
        "Desmontar proteção sanfonada dos fusos, inspecionar e lubrificar os mesmos.",
        "Substituir proteção sanfonada danificada.",
        "Limpar e ajustar calços para alinhamento dos foot roll.",
        "Ajustar e lubrificar o parafuso excêntrico de alinhamento do molde na máquina.",
        "Fixar e ajustar placa suporte do parafuso de fixação do molde na máquina, com 1mm.",
        "folga entre a placa e a estrutura do molde.",
        "Inspecionar folgas nas caixas de engrenagem das placas laterais.",
        "Lubrificar total, verificando o perfeito funcionamento das válvulas distribuidoras de graxa.",
        "Fazer inspeção nas roscas para fixação das placas laterais (back up)",
        "Verificar torque de aperto dos parafusos tipo feno dos eixos cardans - 25 Nm"
    ],
    inspecaoFinal: [
        {num: 1, text: "Esquadramento das faces estreitas está na tolerância de 0.1mm?"},
        {num: 2, text: "Alinhamento do molde em relação ao gabarito do stand está correto?"},
        {num: 3, text: "A folga nas arruelas dos parafusos de fixação da placa móvel estão entre 0.3mm a 0.5mm?"},
        {num: 4, text: "A folga máxima entre as placas laterais e largas é de 0.25mm?"},
        {num: 5, text: "Os encaixes dos eixos cardans nos motores foram feitos sem interferência?"},
        {num: 6, text: "As marcações dos centros das placas largas estão legíveis?"},
        {num: 7, text: "Tubos telescópios sem vazamentos? (Analisado durante a movimentação das faces entre as bitolas de 810mm até 1830mm em condição de teste de casamento com 7kgf/cm2 (pressão referência)."},
        {num: 8, text: "Os protetores sanfonados estão em bom estado de conservação?"},
        {num: 9, text: "Os engates rápidos estão apertados e protegidos?"},
        {num: 11, text: "Os eixos cardan estão limpos, lubrificados e protegidos?"},
        {num: 12, text: "Os leques dos sprays estão corretamente alinhados (passando entre os rolos e placas, e sem obstrução?"},
        {num: 13, text: "Não houve vazamento durante o teste hidrostático com 10 bar de pressão durante 30min."},
        {num: 14, text: "Foot Rolls e roletes das guias laterais estão lubrificados e girando normalmente?"},
        {num: 15, text: "As tampas de proteção dos parafusos do foot roll estão montadas?"},
        {num: 16, text: "Os parafusos M36 alinhados (c/ contra porca) na elevação de 1640mm ~3mm a partir do pé do molde?"},
        {num: 17, text: "Cavidade interna do molde e rolos limpos?"},
        {num: 18, text: "Cilindros hidráulicos do sistema do clamp foi feito sangria?"}
    ],
    hidraulico: [
        "CHECK DOS CILINDROS DO CLAMP",
        "VERIFICAR VAZAMENTO DE GRAXA NAS CONEXÕES",
        "VERIFICAR VAZAMENTO DE ÓLEO NAS CONEXÕES",
        "INSPECIONAR O ELEMENTO FILTRANTE DO FILTRO DA LINHA DE PRESSÃO HIDRÁULICA E SE NECESSÁRIO EFETUAR A TROCA.",
        "LUBRIFICAÇÃO",
        "VERIFICAR VAZAMENTO EM MANGUEIRAS E DOSADOR, SUBSTITUIR SE NECESSÁRIO.",
        "EFETUAR A LIMPEZA DOS ENGATES HIDRÁULICOS",
        "EMBALAR ENGATES HIDRÁULICOS"
    ]
};

// ==============================================================
// FUNÇÕES DE RENDERIZAÇÃO - MOLDE MCC 4
// ==============================================================
function renderizarTabelaSimNaoM4(containerId, array, prefix, isFinal = false, invertidas = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 🔧 REFORMULADO ("ficou espremido no celular"): antes era uma
    // <table> com 4 colunas (ITEM, DESCRIÇÃO, SIM, NÃO) — no celular a
    // tela é estreita demais pra isso, a DESCRIÇÃO quebrava em várias
    // linhas e os botões SIM/NÃO ficavam cortados/minúsculos.
    //
    // 🖥️ CORRIGIDO ("os cards só funcionam no celular, não no PC"): o
    // grid/card agora usa classes (.sim-nao-card-grid / .sim-nao-card /
    // .sim-nao-card-options etc., ver CSS no app.html) em vez de estilo
    // inline fixo. No celular continua empilhado (texto em cima, SIM/NÃO
    // embaixo, fácil de tocar). A partir de telas largas (>=900px) o
    // card vira uma linha: texto à esquerda, botões SIM/NÃO numa faixa
    // fixa à direita — como uma lista, não um formulário de celular
    // esticado.
    const invertidasSet = new Set(invertidas);
    let html = `<div class="sim-nao-card-grid">`;
    array.forEach((item, i) => {
        const desc = isFinal ? item.text : item;
        const num = isFinal ? item.num : (i + 1);
        const name = `${prefix}-${i}`;
        // 🐛 CORRIGIDO: perguntas com fraseado invertido (ex: "está
        // danificado?", "houve vazamento?") marcam data-inverte="1" —
        // usado por mostrarDadosPuxadosChecklist() pra saber que aqui é
        // o SIM que indica problema, não o NÃO.
        const inverte = invertidasSet.has(i) ? '1' : '0';
        html += `
            <div class="sim-nao-card" data-inverte="${inverte}">
                <div class="sim-nao-card-header">
                    <span class="sim-nao-card-num">${num}.</span>
                    <span class="sim-nao-card-text">${desc}</span>
                </div>
                <div class="sim-nao-card-options">
                    ${isFinal ? `<input id="${name}-med" class="premium-input w-100" placeholder="Medida encontrada" style="margin-bottom:8px; font-size:12px;">` : ''}
                    <div class="sim-nao-card-options-row">
                        <label class="sim-nao-option">
                            <input type="radio" name="${name}" value="SIM" style="width:17px; height:17px; flex-shrink:0; accent-color:var(--success, #10b981);"> SIM
                        </label>
                        <label class="sim-nao-option">
                            <input type="radio" name="${name}" value="NÃO" style="width:17px; height:17px; flex-shrink:0; accent-color:var(--danger, #ef4444);"> NÃO
                        </label>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML += html;
}

// ==============================================================
// 🆕 PONTE COM O CHECKLIST DE EXECUÇÃO
// ==============================================================
// Busca os valores já respondidos no Checklist de Execução (reparo em
// andamento dessa tag) e preenche os campos correspondentes do folhão
// automaticamente. Só preenche os campos que JÁ têm etapa mapeada
// (folhao_campo) e JÁ foram respondidos — o resto do formulário
// continua 100% manual, sem quebrar nada.
//
// Não sobrescreve com valor vazio: se uma etapa ainda não foi marcada,
// o campo do folhão fica do jeito que já estava (em branco ou como o
// técnico tiver digitado manualmente).
// ==============================================================
// 🆕 AVISO DE PREENCHIMENTO AUTOMÁTICO — movido pra
// '../Core/checklistFolhaoPonte.js' (mostrarAvisoPreenchimentoChecklist,
// importado acima), porque o Folhão do Molde 2/3 agora usa a ponte
// também e precisava do mesmo aviso, sem copiar a função de novo.
// ==============================================================

// ==============================================================
// 🆕 REFLETE EDIÇÃO MANUAL DO FOLHÃO DE VOLTA NO CHECKLIST DE EXECUÇÃO
// ==============================================================
// A lógica de fato (ouvir o evento, montar o payload, chamar
// /api/checklist-execucao/marcar) foi extraída pra
// '../Core/checklistFolhaoPonte.js' (ligarListenerEdicaoManualFolhao),
// porque era código que qualquer área nova ia precisar copiar igual.
// Aqui só passamos o modalId do Molde 4 e um "getter" do estado atual
// da ponte (PONTE_CHECKLIST_M4) — cada Folhão guarda o seu próprio.
async function preencherFolhaoComChecklistExecucao(id, item) {
    ligarListenerEdicaoManualFolhao('modal-folhao-molde4', () => PONTE_CHECKLIST_M4);
    try {
        const ponte = await buscarPonteChecklist(id, item);
        // Só faz sentido puxar valor se existir um reparo em andamento
        // pra essa tag. Se não tiver (ex: abriu o folhão sem ter aberto o
        // Checklist de Execução ainda), não tem de onde puxar — segue
        // tudo manual normalmente.
        if (!ponte) return;
        PONTE_CHECKLIST_M4 = ponte;

        // 🐛 CORRIGIDO ("MOTIVO sempre voltava com 100000 mesmo apagando"):
        // um folhao_campo mal configurado numa etapa do Checklist de
        // Execução pode apontar, por engano, pra um campo de cabeçalho
        // do Folhão (Motivo, Nº Molde, Líder, Desempenho...). Esses
        // campos são sempre preenchidos manualmente pelo técnico pra
        // aquela ordem de serviço específica — nunca fazem sentido vindo
        // do Checklist (que é por TIPO de equipamento, não por OS). Essa
        // lista bloqueia a ponte de mexer neles, não importa o que
        // esteja mapeado do lado do Checklist.
        const camposProtegidos = new Set([
            'molde4-tag-name', 'molde4-num-molde', 'molde4-motivo',
            'molde4-tipo-exec', 'molde4-data-inicio', 'molde4-data-fim',
            'molde4-lider-responsavel', 'molde4-desempenho', 'molde4-nova-meta'
        ]);

        const { preenchidos, naoEncontrados, camposNaoEncontrados } = preencherCamposFolhao(ponte.valores, camposProtegidos);

        // 🆕 RESUMO VISÍVEL: sem isso, o técnico só descobre se a ponte
        // funcionou catando campo por campo numa tabela de 57 linhas. Um
        // aviso simples resolve tanto "funcionou" (confirma rápido) quanto
        // "não funcionou" (avisa que o mapeamento (folhao_campo) de
        // alguma etapa está apontando pro campo errado, em vez de falhar
        // silenciosamente igual antes).
        if (preenchidos > 0 || naoEncontrados > 0) {
            mostrarAvisoPreenchimentoChecklist(preenchidos, naoEncontrados, camposNaoEncontrados);
        }
    } catch (e) {
        console.error('⚠️ Não consegui puxar os valores do Checklist de Execução pro folhão:', e);
        // Falha aqui não deve travar a abertura do folhão — só segue sem
        // autopreencher, técnico preenche manual como sempre.
    }
}

async function preencherFolhaoBenderComChecklistExecucao(id, item) {
    ligarListenerEdicaoManualFolhao('modal-folhao-mcc4', () => PONTE_CHECKLIST_BENDER);
    try {
        const ponte = await buscarPonteChecklist(id, item);
        if (!ponte) return;
        PONTE_CHECKLIST_BENDER = ponte;

        const camposProtegidos = new Set([
            'mcc4-tag-name', 'mcc4-data-inicio', 'mcc4-data-fim', 'mcc4-motivo'
        ]);

        const { preenchidos, naoEncontrados, camposNaoEncontrados } = preencherCamposFolhao(ponte.valores, camposProtegidos);
        if (preenchidos > 0 || naoEncontrados > 0) {
            mostrarAvisoPreenchimentoChecklist(preenchidos, naoEncontrados, camposNaoEncontrados);
        }
    } catch (e) {
        console.error('⚠️ Não consegui puxar os valores do Checklist de Execução pro folhão (Bender):', e);
    }
}

function renderizarM4Identificacao() {
    const container = document.getElementById('container-m4-identificacao');
    if (!container) return;
    container.innerHTML = `
        <h3 style="color:var(--text-heading);">IDENTIFICAÇÃO DE COMPONENTES</h3>
        <table class="premium-table" style="font-size:10px;">
            <thead><tr><th>PLACAS</th><th>SAÍDA MÁQUINA</th><th>SAÍDA OFICINA</th>
                <th>REDUTORES</th><th>SAIR MÁQUINA</th><th>SAIR OFICINA</th>
                <th>CILINDROS</th><th>SAIR MÁQUINA</th><th>SAIR OFICINA</th></tr></thead>
            <tbody>
                <tr><td>FIXA:</td><td><input id="m4-id-pl-fixa-mq"></td><td><input id="m4-id-pl-fixa-of"></td>
                    <td>SUP DIREITO</td><td><input id="m4-id-red-sd-mq"></td><td><input id="m4-id-red-sd-of"></td>
                    <td>SUP DIR</td><td><input id="m4-id-cil-sd-mq"></td><td><input id="m4-id-cil-sd-of"></td></tr>
                <tr><td>MÓVEL</td><td><input id="m4-id-pl-movel-mq"></td><td><input id="m4-id-pl-movel-of"></td>
                    <td>INF DIREITO</td><td><input id="m4-id-red-id-mq"></td><td><input id="m4-id-red-id-of"></td>
                    <td>INF DIR</td><td><input id="m4-id-cil-id-mq"></td><td><input id="m4-id-cil-id-of"></td></tr>
                <tr><td>DIREITA:</td><td><input id="m4-id-pl-dir-mq"></td><td><input id="m4-id-pl-dir-of"></td>
                    <td>SUP ESQ</td><td><input id="m4-id-red-se-mq"></td><td><input id="m4-id-red-se-of"></td>
                    <td>SUP ESQ</td><td><input id="m4-id-cil-se-mq"></td><td><input id="m4-id-cil-se-of"></td></tr>
                <tr><td>ESQUERDA:</td><td><input id="m4-id-pl-esq-mq"></td><td><input id="m4-id-pl-esq-of"></td>
                    <td>INF ESQ</td><td><input id="m4-id-red-ie-mq"></td><td><input id="m4-id-red-ie-of"></td>
                    <td>INF ESQ</td><td><input id="m4-id-cil-ie-mq"></td><td><input id="m4-id-cil-ie-of"></td></tr>
            </tbody>
        </table>
    `;
}

function renderizarM4AjustesHidraulica() {
    const container = document.getElementById('container-m4-ajustes');
    if (!container) return;
    
    let htmlHidr = `<table class="premium-table" style="font-size:10px;"><thead><tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO (HIDRÁULICA)</th><th>NOME</th><th>MATRÍCULA</th></tr></thead><tbody>`;
    checklistsM4.hidraulico.forEach((desc, i) => {
        htmlHidr += `<tr><td style="text-align:center;">${i+1}</td><td>${desc}</td><td><input id="m4-hid-nome-${i}" class="w-100"></td><td><input id="m4-hid-mat-${i}" class="w-100"></td></tr>`;
    });
    htmlHidr += `</tbody></table>`;

    // 🔧 CORRIGIDO ("bater com o documento oficial"): faltava a coluna
    // ASSINATURA (o oficial tem MOLDE|NOMINAL|REAL|ASSINATURA) e o "CHECK
    // ELÉTRICO" estava só como texto solto dentro da Hidráulica — no
    // oficial é uma tabela própria (CHECK LIST ELÉTRICO), separada da
    // Hidráulica, mesmo padrão ITEM/DESCRIÇÃO/NOME/MATRÍCULA.
    container.innerHTML = `
        <h3 style="color:var(--text-heading);">PLANILHA DE AJUSTE E MEDIDAS NOMINAIS</h3>
        <table class="premium-table" style="font-size:10px;">
            <thead><tr><th>ITEM</th><th>DESCRIÇÃO</th><th>NOMINAL</th><th>REAL</th><th>ASSINATURA</th></tr></thead>
            <tbody>
                <tr><td>1</td><td>APERTO DO PARAFUSO EXCÊNTRICO (DIR/ESQ)</td><td>-</td><td>Dir: <input id="m4-aj-exc-dir" style="width:80px;"> Esq: <input id="m4-aj-exc-esq" style="width:80px;"></td><td><input id="m4-aj-exc-ass" class="w-100"></td></tr>
                <tr><td>2</td><td>TORQUE PARAFUSO FIXAÇÃO FOOT ROLL</td><td>300 + 5 Nm</td><td><input id="m4-aj-tfr"></td><td><input id="m4-aj-tfr-ass" class="w-100"></td></tr>
                <tr><td>3</td><td>TORQUE PARAFUSO FIXAÇÃO PLACA LATERAL</td><td>200 + 5 Nm</td><td><input id="m4-aj-tpl"></td><td><input id="m4-aj-tpl-ass" class="w-100"></td></tr>
                <tr><td>4</td><td>TIRANTE FIXAÇÃO GUIAS LATERAIS</td><td>100 Nm</td><td><input id="m4-aj-tir"></td><td><input id="m4-aj-tir-ass" class="w-100"></td></tr>
                <tr><td>5</td><td>FOLGA GABARITO CLAMP (SUP/INF) - Ø250</td><td>1,60 ± 0,15 mm</td><td>Sup: <input id="m4-aj-clp-sup" style="width:80px;"> Inf: <input id="m4-aj-clp-inf" style="width:80px;"></td><td><input id="m4-aj-clp-ass" class="w-100"></td></tr>
            </tbody>
        </table>
        <h3 style="color:var(--text-heading); margin-top:20px;">CHECK LIST HIDRÁULICO</h3>
        ${htmlHidr}
        <h3 style="color:var(--text-heading); margin-top:20px;">CHECK LIST ELÉTRICO</h3>
        <table class="premium-table" style="font-size:10px;">
            <thead><tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO (ELÉTRICA)</th><th>NOME</th><th>MATRÍCULA</th></tr></thead>
            <tbody>
                <tr><td style="text-align:center;">1</td><td>OS CONECTORES DO DBO E VUHZ ESTÃO LIMPOS, TAMPONADOS E PROTEGIDOS?</td><td><input id="m4-ele-nome" class="w-100"></td><td><input id="m4-ele-mat" class="w-100"></td></tr>
            </tbody>
        </table>
    `;
}

function renderizarM4Rolos() {
    const container = document.getElementById('container-m4-rolos');
    if (!container) return;
    
    const secRolos = (titulo, prefix) => `
        <h4 style="margin-top:15px; color:var(--text-accent);">${titulo}</h4>
        <div style="display:flex; gap:20px; align-items:center; margin-bottom:5px;">
            <label>Lado Esq Afastado: <input type="radio" name="m4-${prefix}-esq-af" value="SIM"> SIM <input type="radio" name="m4-${prefix}-esq-af" value="NÃO" checked> NÃO</label>
            <label>Lado Dir Afastado: <input type="radio" name="m4-${prefix}-dir-af" value="SIM"> SIM <input type="radio" name="m4-${prefix}-dir-af" value="NÃO" checked> NÃO</label>
        </div>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>LADO FIXO</th><td><input id="m4-${prefix}-fixo"></td><th>LADO MÓVEL</th><td><input id="m4-${prefix}-movel"></td></tr>
            <tr><th>LADO DIREITO</th><td><input id="m4-${prefix}-dir"></td><th>LADO ESQUERDO</th><td><input id="m4-${prefix}-esq"></td></tr>
        </table>
    `;

    const secAlinhamento = `
        <h4 style="margin-top:20px; color:var(--text-accent);">ALINHAMENTO DOS ROLOS (F1, F2, F3 - Tolerância ±0.1mm)</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>FACE</th><th>F1 (0,00mm)</th><th>F2 (0,00mm)</th><th>F3 (0,00mm)</th></tr>
            <tr><td>FIXA</td><td><input id="m4-alinh-fixa-f1"></td><td><input id="m4-alinh-fixa-f2"></td><td><input id="m4-alinh-fixa-f3"></td></tr>
            <tr><td>MÓVEL</td><td><input id="m4-alinh-mov-f1"></td><td><input id="m4-alinh-mov-f2"></td><td><input id="m4-alinh-mov-f3"></td></tr>
        </table>
    `;

    container.innerHTML = `
        <h3 style="color:var(--text-heading);">DIÂMETROS E ALINHAMENTO (FOOT ROLL E EDGE ROLL)</h3>
        ${secRolos('DIÂMETROS - CHEGADA NA OFICINA', 'dia-c')}
        ${secRolos('DIÂMETROS - SAÍDA DA OFICINA', 'dia-s')}
        ${secAlinhamento}
    `;
}

function renderizarM4SensorResist() {
    const containerSn = document.getElementById('container-m4-sensor');
    const containerRes = document.getElementById('container-m4-resist');
    if (!containerSn || !containerRes) return;

    containerSn.innerHTML = `
        <h3 style="color:var(--text-heading);">PLANILHA DE AJUSTE SENSOR DE NÍVEL</h3>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>ITEM</th><th>DESCRIÇÃO</th><th>OK</th></tr>
            ${[1,2,3,4,5,6,7].map(i => `<tr><td style="text-align:center;">${i}</td><td>${['VERIFICAR TAMPA DE PROTEÇÃO;','EFETUAR A TROCA DAS GAXETAS DE ISOLAÇÃO DO SENSOR','VERIFICAR PARAFUSO DE FIXAÇÃO DO SUPORTE DO SENSOR, TORQUE 50 NM;','VERIFICAR PARAFUSO DE FIXAÇÃO DA TAMPA DE PROTEÇÃO DO SENSOR, TORQUE 40 NM;','VERIFICAR ESTADO DE CONSERVAÇÃO E LIMPEZA;','TESTE DE ESTANQUIEDADE (5 BAR);','CHECK NA CONEXÕES DE ALIMENTAÇÃO DE ÁGUA;'][i-1]}</td><td style="text-align:center;"><input type="checkbox" id="m4-sn-${i}"></td></tr>`).join('')}
        </table>
        <h4 style="margin-top:15px;">MEDIÇÃO RESISTÊNCIA NO SENSOR</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>ITEM</th><th>PINOS</th><th>LIMITES (Ω)</th><th>VALOR</th></tr>
            ${[['1-2','140...300'],['3-4','0...2'],['1-5','70...150'],['3-5','0...1'],['7-8','0...1'],['8-9','100...140'],['15-16','3...10'],['Pino 10 / Carcaça','0...1']].map((p,i) => `<tr><td style="text-align:center;">${i+8}</td><td>${p[0]}</td><td>${p[1]}</td><td><input id="m4-sn-res-${i+8}"></td></tr>`).join('')}
        </table>
        <h4 style="margin-top:15px;">ISOLAÇÃO DOS SENSORES (MΩ)</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>PINOS</th><th>>10 MΩ</th><th>VALOR MEDIDO</th></tr>
            ${["5 e 6","5 e 8","5 e 10","5 e 15","6 e 8","6 e 10","6 e 15","8 e 10","8 e 15","10 e 15"].map((p,i) => `<tr><td style="text-align:center;">${p}</td><td>>10 MΩ</td><td><input id="m4-sn-iso-${i}"></td></tr>`).join('')}
        </table>
    `;

    let htmlTermopares = `<table class="premium-table" style="font-size:10px; width:100%;"><tr><th>TERMOPAR</th><th>FACE FIXA (10-30 Ω)</th><th>FACE MÓVEL (10-30 Ω)</th></tr>`;
    for(let i=1; i<=12; i++) {
        htmlTermopares += `<tr><td style="text-align:center;font-weight:bold;">T${i}</td><td><input id="m4-termo-f-${i}" class="w-100"></td><td><input id="m4-termo-m-${i}" class="w-100"></td></tr>`;
    }
    htmlTermopares += `</table>`;

    containerRes.innerHTML = `
        <h3 style="color:var(--text-heading);">TESTE DE RESISTÊNCIA DAS PLACAS (TERMOPARES)</h3>
        <div style="display:flex; gap:20px; justify-content:space-between; flex-wrap:wrap;">
            <div style="width:48%; min-width:300px;">
                ${htmlTermopares}
            </div>
            <div style="width:48%; min-width:300px;">
                <h4 style="margin-bottom:10px;">PLACAS ESTREITAS</h4>
                <table class="premium-table" style="font-size:10px;">
                    <tr><th>LADO</th><th>T1 (10-30 Ω)</th><th>T2 (10-30 Ω)</th></tr>
                    <tr><td>DIREITA</td><td><input id="m4-termo-ed-1" class="w-100"></td><td><input id="m4-termo-ed-2" class="w-100"></td></tr>
                    <tr><td>ESQUERDA</td><td><input id="m4-termo-ee-1" class="w-100"></td><td><input id="m4-termo-ee-2" class="w-100"></td></tr>
                </table>
                <h4 style="margin-top:20px; margin-bottom:10px;">VERIFICAÇÃO CAIXAS TERMOPARES</h4>
                <table class="premium-table" style="font-size:10px;">
                    <tr><th>DESCRIÇÃO</th><th>CONDIÇÃO</th></tr>
                    <tr><td>PARAFUSOS BASE</td><td><input id="m4-tc-1" class="w-100"></td></tr>
                    <tr><td>TESTE DE AR</td><td><input id="m4-tc-2" class="w-100"></td></tr>
                    <tr><td>ESTADO/LIMPEZA</td><td><input id="m4-tc-3" class="w-100"></td></tr>
                    <tr><td>BORRACHAS/VED.</td><td><input id="m4-tc-4" class="w-100"></td></tr>
                    <tr><td>TRAVAS</td><td><input id="m4-tc-5" class="w-100"></td></tr>
                </table>
            </div>
        </div>
    `;
}

function renderizarM4PeritagemLargas() {
    const container = document.getElementById('container-m4-peritagem-l');
    if (!container) return;

    // 🆕 Restruturado pra bater com o documento oficial: em vez de 1
    // tabela combinando fixa+móvel, agora são 4 blocos separados (Placa
    // Fixa e Placa Móvel, em Entrada e Saída), cada um com o Nº da
    // placa e a "Leitura Original" separada da "Tolerância".
    const MEDIDAS_PLACA_LARGA = [
        { label: "PLANICIDADE VERTICAL (F)", sufixo: "fv", tolerancia: "< 0,2mm" },
        { label: "PLANICIDADE HORIZONTAL (G)", sufixo: "fh", tolerancia: "< 0,2mm" },
        { label: "PROFUNDIDADE DE RANHURAS (P)", sufixo: "pr", tolerancia: "< 1mm" },
        { label: "DESGASTE (A)", sufixo: "da", tolerancia: "< 1mm" },
    ];

    const renderBlocoPlaca = (prefix, ladoLabel, ladoSufixo) => `
        <h4 style="margin-top:15px; color:var(--text-accent);">PLACA LARGA ${ladoLabel} — Nº <input id="${prefix}-${ladoSufixo}-numero" style="width:100px; display:inline-block;"></h4>
        <p style="font-size:9.5px; color:var(--text-muted); margin:2px 0 6px 0;">
            1) Afastar placa quando o cobre estiver aparente. &nbsp; 2) Identificar na placa o local do desgaste.
        </p>
        <div style="margin-bottom:6px; font-size:11px;">
            <label style="margin-right:15px;">PLACA AFASTADA: <input type="radio" name="${prefix}-${ladoSufixo}-afast" value="SIM"> SIM <input type="radio" name="${prefix}-${ladoSufixo}-afast" value="NÃO" checked> NÃO</label>
            <label>PLACA: <select id="${prefix}-${ladoSufixo}-tipo" style="display:inline-block; width:auto;"><option value="STEP">STEP</option><option value="FULL FACE">FULL FACE</option></select></label>
        </div>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>DESCRIÇÃO</th><th>LEITURA ORIGINAL (± 0,10mm)</th><th>TOLERÂNCIA</th></tr>
            ${MEDIDAS_PLACA_LARGA.map(m => `
                <tr><td>${m.label}</td><td><input id="${prefix}-${m.sufixo}-${ladoSufixo}"></td><td style="text-align:center;">${m.tolerancia}</td></tr>
            `).join('')}
        </table>
        <p style="font-size:9px; color:var(--text-muted); margin-top:2px;">Obs: só preencher se a placa for substituída.</p>
    `;

    container.innerHTML = `
        <h3 style="color:var(--text-heading);">PERITAGEM PLACAS LARGAS</h3>

        <h4 style="margin-top:10px; color:var(--text-heading); border-bottom:1px dashed var(--border-color); padding-bottom:4px;">AO ENTRAR NA OFICINA</h4>
        ${renderBlocoPlaca('m4-per-ent', 'FIXA', 'fixa')}
        ${renderBlocoPlaca('m4-per-ent', 'MÓVEL', 'movel')}

        <h4 style="margin-top:20px; color:var(--text-heading); border-bottom:1px dashed var(--border-color); padding-bottom:4px;">AO SAIR DA OFICINA</h4>
        ${renderBlocoPlaca('m4-per-sai', 'FIXA', 'fixa')}
        ${renderBlocoPlaca('m4-per-sai', 'MÓVEL', 'movel')}
    `;
}

function renderizarM4PeritagemEstreitas() {
    const container = document.getElementById('container-m4-peritagem-e');
    if (!container) return;
    
    const secEstreitas = (titulo, prefix) => `
        <h4 style="margin-top:15px; color:var(--text-accent);">${titulo}</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>MEDIDA</th><th>FACE SUL (ESQ)</th><th>FACE NORTE (DIR)</th></tr>
            ${['A (Desgaste topo)','B (Desgaste base)','C (Comprimento)','D (Comprimento)','E (Chanfro)','F (Chanfro)','G (Meio)','H 1(0,0mm +/-0,1mm)','H 2(0,5mm +/-0,1mm)','H 3(1,0mm +/-0,1mm)','H 4(1,5mm +/-0,1mm)','L (Largura topo)','M (Largura base)'].map((p,i) => `
                <tr><td>${p}</td><td><input id="${prefix}-sul-${i}"></td><td><input id="${prefix}-nor-${i}"></td></tr>
            `).join('')}
        </table>
    `;

    container.innerHTML = `
        <h3 style="color:var(--text-heading);">PERITAGEM PLACAS ESTREITAS</h3>
        <p style="font-size:10px; color:var(--text-muted);">TOLERÂNCIAS: B <= 1,0mm | E/F <= 2,0mm</p>
        <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <div style="width:48%; min-width:300px;">
                ${secEstreitas('CHEGADA NA OFICINA', 'pe-cheg')}
            </div>
            <div style="width:48%; min-width:300px;">
                ${secEstreitas('SAÍDA DA OFICINA', 'pe-sai')}
            </div>
        </div>
    `;
}

function renderizarM4ChavetasEngrenagem() {
    const container = document.getElementById('container-m4-chavetas');
    if (!container) return;

    // 🔧 CORRIGIDO ("bater com o documento oficial"): o desenho técnico
    // do CHECK LIST GERAL DO MOLDE MCC4 (Word oficial) mostra a Folga de
    // Aresta medida em MÓVEL/FIXO por lado (Esquerda-Móvel, Esquerda-Fixo,
    // Direita-Móvel, Direita-Fixo) — não em 3 alturas Sup/Meio/Inf como
    // estava aqui antes (isso parece ter vindo copiado de outro molde).
    // IDs trocados de "-es/-em/-ei/-ds/-dm/-di" pra "-esq-mov/-esq-fix/
    // -dir-mov/-dir-fix" — ver migração da ponte com o Checklist de
    // Execução (etapas "Verificar bitola/aresta") que precisou ser
    // atualizada junto pra apontar pros IDs novos.
    let htmlFolga = `<table class="premium-table" style="font-size:10px;"><tr><th>LARGURA</th><th>ESQUERDA</th><th>DIREITA</th></tr>`;
    [1000, 1030, 1040, 1090, 1100, 1160, 1180, 1230, 1290, 1360, 1380, 1420, 1460, 1500, 1530, 1550, 1560, 1580, 1620].forEach(l => {
        htmlFolga += `<tr><td style="font-weight:bold;">${l}</td>
            <td>Móvel:<input id="m4-fa-${l}-esq-mov" style="width:50px;"> Fixo:<input id="m4-fa-${l}-esq-fix" style="width:50px;"></td>
            <td>Móvel:<input id="m4-fa-${l}-dir-mov" style="width:50px;"> Fixo:<input id="m4-fa-${l}-dir-fix" style="width:50px;"></td>
        </tr>`;
    });
    htmlFolga += `</table>`;

    container.innerHTML = `
        <h3 style="color:var(--text-heading);">CAIXAS DE ENGRENAGEM, CHAVETAS E FOLGA ARESTA</h3>
        
        <h4 style="margin-top:15px;">FOLGAS NAS CAIXAS DE ENGRENAGEM (BITOLA 1300 ± 1MM)</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>COMPONENTE</th><th>ESQ SUP (ES)</th><th>ESQ INF (EI)</th><th>DIR SUP (DS)</th><th>DIR INF (DI)</th></tr>
            <tr><td>FUSO (mm)</td><td><input id="m4-eng-fuso-es"></td><td><input id="m4-eng-fuso-ei"></td><td><input id="m4-eng-fuso-ds"></td><td><input id="m4-eng-fuso-di"></td></tr>
            <tr><td>PLACA (mm)</td><td><input id="m4-eng-placa-es"></td><td><input id="m4-eng-placa-ei"></td><td><input id="m4-eng-placa-ds"></td><td><input id="m4-eng-placa-di"></td></tr>
        </table>

        <h4 style="margin-top:15px;">AJUSTE DE CHAVETAS DAS PLACAS ESTREITAS</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>PLACA</th><th>LADO</th><th>A</th><th>B</th><th>NOME</th><th>REG</th></tr>
            <tr><td rowspan="2" style="text-align:center;font-weight:bold;">ESQUERDA</td><td style="text-align:center;">A</td><td><input id="m4-chav-esq-a-a"></td><td><input id="m4-chav-esq-a-b"></td><td><input id="m4-chav-esq-a-nome"></td><td><input id="m4-chav-esq-a-reg"></td></tr>
            <tr><td style="text-align:center;">B</td><td><input id="m4-chav-esq-b-a"></td><td><input id="m4-chav-esq-b-b"></td><td><input id="m4-chav-esq-b-nome"></td><td><input id="m4-chav-esq-b-reg"></td></tr>
            <tr><td rowspan="2" style="text-align:center;font-weight:bold;">DIREITA</td><td style="text-align:center;">A</td><td><input id="m4-chav-dir-a-a"></td><td><input id="m4-chav-dir-a-b"></td><td><input id="m4-chav-dir-a-nome"></td><td><input id="m4-chav-dir-a-reg"></td></tr>
            <tr><td style="text-align:center;">B</td><td><input id="m4-chav-dir-b-a"></td><td><input id="m4-chav-dir-b-b"></td><td><input id="m4-chav-dir-b-nome"></td><td><input id="m4-chav-dir-b-reg"></td></tr>
        </table>

        <h4 style="margin-top:15px;">AVALIAÇÃO DO SISTEMA DE RESFRIAMENTO NA SAÍDA</h4>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>FACE FIXA</th><td><input id="m4-resf-fixa" class="w-100"></td></tr>
            <tr><th>FACE MÓVEL</th><td><input id="m4-resf-movel" class="w-100"></td></tr>
        </table>

        <h4 style="margin-top:15px;">RELATÓRIO FOLGA DE ARESTA (Tolerância = 0.25mm)</h4>
        ${htmlFolga}
    `;
}

function renderizarM4Mecanica() {
    const container = document.getElementById('container-m4-mecanica');
    if (!container) return;

    let htmlCardans = `<table class="premium-table" style="font-size:10px;"><tr><th>LOCAL</th><th>ARTICULAÇÃO</th><th>SANFONADA</th><th>PINO TRAVA</th><th>ACOPLAMENTO</th><th>DATA ÚLTIMA TROCA</th></tr>`;
    ['Esq Sup', 'Dir Sup', 'Esq Inf', 'Dir Inf'].forEach((loc, i) => {
        htmlCardans += `<tr><td style="font-weight:bold;">${loc}</td>
            <td style="text-align:center;"><select id="m4-cd-art-${i}"><option>OK</option><option>NOK</option></select></td>
            <td style="text-align:center;"><select id="m4-cd-sanf-${i}"><option>OK</option><option>NOK</option></select></td>
            <td style="text-align:center;"><select id="m4-cd-pino-${i}"><option>OK</option><option>NOK</option></select></td>
            <td style="text-align:center;"><select id="m4-cd-acop-${i}"><option>OK</option><option>NOK</option></select></td>
            <td><input type="date" id="m4-cd-data-${i}" class="w-100"></td>
        </tr>`;
    });
    htmlCardans += `</table>`;

    let htmlTransm = `<table class="premium-table" style="font-size:10px;"><tr><th>LOCAL</th><th>Nº BENZLER</th><th>Nº TRANSMI</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr>`;
    ['Sup Dir', 'Sup Esq', 'Inf Dir', 'Inf Esq'].forEach((loc, i) => {
        htmlTransm += `<tr><td style="font-weight:bold;">${loc}</td>
            <td><input id="m4-tr-bz-${i}" style="width:70px;"></td><td><input id="m4-tr-tr-${i}" style="width:70px;"></td>
            ${[1,2,3,4].map(p => `<td style="text-align:center;"><input type="checkbox" id="m4-tr-p${p}-${i}"></td>`).join('')}
        </tr>`;
    });
    htmlTransm += `</table>`;

    container.innerHTML = `
        <h3 style="color:var(--text-heading);">AFERIÇÃO EIXO EXCÊNTRICO E BUCHA</h3>
        <table class="premium-table" style="font-size:10px;">
            <tr><th>COTA</th><th>MEDIDA DO DESENHO</th><th>MEDIDA TOLERÁVEL</th><th>LADO DIREITO</th><th>LADO ESQUERDO</th></tr>
            <tr><td>A</td><td>70 (0 / +0,1)</td><td>70 (+/- 1,5)</td><td><input id="m4-ex-a-d"></td><td><input id="m4-ex-a-e"></td></tr>
            <tr><td>B</td><td>45,00</td><td>45,00 (0 / -0,5)</td><td><input id="m4-ex-b-d"></td><td><input id="m4-ex-b-e"></td></tr>
            <tr><td>C</td><td>90 d9 (-0,12/-0,20)</td><td>90 (0 / -0,207)</td><td><input id="m4-ex-c-d"></td><td><input id="m4-ex-c-e"></td></tr>
            <tr><td>D</td><td>31,00</td><td>31,00 (0 / -0,5)</td><td><input id="m4-ex-d-d"></td><td><input id="m4-ex-d-e"></td></tr>
            <tr><td>E</td><td>70 h7 (0 / -0,03)</td><td>70,00 (-0,15)</td><td><input id="m4-ex-e-d"></td><td><input id="m4-ex-e-e"></td></tr>
            <tr><td>F</td><td>12,00</td><td>12,00 (+/- 0,2)</td><td><input id="m4-ex-f-d"></td><td><input id="m4-ex-f-e"></td></tr>
            <tr><td>SW</td><td>55,00</td><td>55,00 (+/- 0,5)</td><td><input id="m4-ex-sw-d"></td><td><input id="m4-ex-sw-e"></td></tr>
            <tr><td colspan="5" style="background:#ddd;text-align:center;font-weight:bold;">BUCHA DO EXCÊNTRICO</td></tr>
            <tr><td>DIA INT.</td><td>70 H8 (0 / +0,046)</td><td>70,00 (+0,15)</td><td><input id="m4-ex-buc-d"></td><td><input id="m4-ex-buc-e"></td></tr>
        </table>

        <h3 style="color:var(--text-heading); margin-top:20px;">VERIFICAÇÃO DOS CARDANS</h3>
        ${htmlCardans}

        <h3 style="color:var(--text-heading); margin-top:20px;">PARAFUSOS DE FIXAÇÃO DAS TRANSMISSÕES</h3>
        ${htmlTransm}
    `;
}

function renderizarM4Materiais() {
    const container = document.getElementById('container-m4-materiais');
    if (!container) return;
    let rows = '';
    for (let i = 1; i <= 29; i++) {
        rows += `<tr><td><input id="m4-mat-desc-${i}" class="w-100" placeholder="Material"></td><td><input id="m4-mat-qtd-${i}" style="width:80px;" placeholder="Qtd"></td></tr>`;
    }
    container.innerHTML = `
        <h3 style="color:var(--text-heading);">MATERIAIS UTILIZADOS NA MANUTENÇÃO</h3>
        <table class="premium-table" style="font-size:10px;">
            <thead><tr><th style="width:80%;">DESCRIÇÃO DO MATERIAL / SKU</th><th style="width:20%;">QUANTIDADE</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:15px;">
            <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">OBSERVAÇÕES GERAIS</label>
            <textarea id="m4-observacoes-gerais" class="premium-textarea" rows="3"></textarea>
        </div>
    `;
}

// --------------------------------------------------------------
// 🆕 CABEÇALHO TRAVADO (DATA INÍCIO/FIM + LÍDER RESPONSÁVEL) — Molde
// MCC4. Mesma lógica do Folhão Horizontal (ver
// preencherCabecalhoExecucaoHorizontal em folhaoHorizontal.js): busca
// a execução dessa tag no Checklist de Execução e usa
// iniciada_em/concluida_em/tecnico_nome, gravados pelo servidor em
// /execucoes/iniciar e /execucoes/finalizar — sem isso o técnico tinha
// que digitar a data toda vez, e ela virava "hoje" de novo a cada
// reabertura do Folhão.
// --------------------------------------------------------------
async function preencherCabecalhoExecucaoMolde4(id) {
    const dataInicio = document.getElementById('molde4-data-inicio');
    const dataFim = document.getElementById('molde4-data-fim');
    const liderEl = document.getElementById('molde4-lider-responsavel');
    if (!dataInicio && !dataFim && !liderEl) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const status = resp.ok ? await resp.json() : null;
        if (!status) return;

        // iniciada_em/concluida_em vêm como ISO ("2026-09-02T10:15:23-03:00")
        // — <input type="date"> só aceita "YYYY-MM-DD".
        if (dataInicio) dataInicio.value = status.iniciada_em ? status.iniciada_em.slice(0, 10) : '';
        if (dataFim) dataFim.value = status.concluida_em ? status.concluida_em.slice(0, 10) : '';
        if (liderEl) liderEl.value = status.tecnico_nome || '';
    } catch (e) {
        console.error('⚠️ Não consegui buscar início/fim/líder reais da execução (Molde MCC4):', e);
    }
}

// ==============================================================
// FUNÇÃO PRINCIPAL - ABRIR FOLHÃO (DISPATCHER)
// ==============================================================
export async function abrirFolhaoMCC4(id) {
    ID_FOLHAO_ATUAL = id;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) return alert('Equipamento não encontrado!');

    let tipoPeca = item.tipo.trim();
    console.log('Tipo detectado:', tipoPeca);

    // ---- STRAIGHTENER R2 ----
    if (tipoPeca.toLowerCase().includes('straightener r2') || tipoPeca.toLowerCase().includes('straightener r-ii')) {
        console.log('Abrindo Straightener R2...');
        if (typeof window.abrirFolhaoR2 === 'function') {
            window.abrirFolhaoR2(id);
            return;
        } else {
            alert('Função abrirFolhaoR2 não encontrada. Verifique se folhaoR2.js foi carregado.');
            return;
        }
    }

    // ---- BENDER ----
    if (tipoPeca.toUpperCase() === 'BENDER') {
        console.log('Abrindo BENDER...');
        const modal = document.getElementById("modal-folhao-mcc4");
        if (!modal) {
            alert('Modal do Bender (modal-folhao-mcc4) não encontrado no HTML!');
            return;
        }

        const tagInput = document.getElementById("mcc4-tag-name");
        if (tagInput) tagInput.innerText = id;
        const dataInicio = document.getElementById("mcc4-data-inicio");
        if (dataInicio) dataInicio.valueAsDate = new Date();
        const dataFim = document.getElementById("mcc4-data-fim");
        if (dataFim) dataFim.valueAsDate = new Date();

        prepararAbasDinamicamente("BENDER");
        
        let objChecklistBender = {
            "LUBRIFICAÇÃO": [
                "Sistema de lubrificação isento de vazamentos.",
                "Tubulação amassada.",
                "Distribuidores de graxa funcionando corretamente sem vazamentos.",
                "Flexíveis estão perfeitos, sem avarias",
                "Tubulações Inox ou Cobre danificadas"
            ],
            "REFRIGERAÇÃO": [
                "Resfriadores completos e alinhados.",
                "Bicos completos e obstruídos.",
                "Flexíveis isentos de vazamentos.",
                "Tubulações isentas de empenos.",
                "Tubulações furadas."
            ],
            "ESTRUTURA": [
                "Rolos Lubrificados, girando normalmente",
                "Proteções isentas de avarias.",
                "Estrutura com break-out.",
                "Rolamentos quebrados.",
                "Rolos travados",
                "Parafusos de fixação dos mancais todos apertados",
                "Conexões apertadas."
            ]
        };
        renderizarChecklist(objChecklistBender, "container-check-recebimento", "geral");
        
        const firstTab = modal.querySelector('.folhao-tab');
        if (firstTab) firstTab.click();
        
        modal.classList.remove("hidden");

        // Restaura progresso salvo (ex: chegada já feita, aguardando saída)
        // e liga o auto-salvamento pra nada mais se perder.
        await restaurarRascunhoNoModal("modal-folhao-mcc4", id);
        ativarAutoSalvamentoFolhao("modal-folhao-mcc4", id, "Bender");

        // 🆕 PONTE COM O CHECKLIST DE EXECUÇÃO — autopreenche os campos
        // já respondidos lá (ver '../Core/checklistFolhaoPonte.js').
        // Faltava aqui: o Bender era a única área com Folhão ativo que
        // nunca puxava nada do Checklist, mesmo o Molde MCC4 (logo
        // abaixo, no mesmo arquivo) já fazendo isso.
        preencherFolhaoBenderComChecklistExecucao(id, item);
        return;
    }

    // ---- MOLDE MCC 4 ----
    if (tipoPeca.toUpperCase() === 'MOLDE') {
        console.log('Abrindo MOLDE MCC 4...');
        const modalM4 = document.getElementById("modal-folhao-molde4");
        if (!modalM4) {
            alert("Modal do Molde 4 (modal-folhao-molde4) não encontrado no HTML!");
            return;
        }

        const tagInput = document.getElementById("molde4-tag-name");
        if (tagInput) tagInput.value = id;
        // 🆕 DATA INÍCIO/FIM e LÍDER RESPONSÁVEL não são mais digitados
        // pelo técnico nem resetados pra "hoje" toda vez que reabre —
        // ver preencherCabecalhoExecucaoMolde4, que trava os três com o
        // que o servidor registrou de verdade no Checklist de Execução.
        const dataInicio = document.getElementById("molde4-data-inicio");
        const dataFim = document.getElementById("molde4-data-fim");
        const liderM4 = document.getElementById("molde4-lider-responsavel");
        if (dataInicio) dataInicio.value = '';
        if (dataFim) dataFim.value = '';
        if (liderM4) liderM4.value = '';
        preencherCabecalhoExecucaoMolde4(id);

        // Limpa as divs vitais
        const recebDiv = document.getElementById('m4-aba-receb');
        if (recebDiv) recebDiv.innerHTML = '<div id="container-m4-recebimento"></div><div id="container-m4-eletrica"></div>';
        const revisaoDiv = document.getElementById('m4-aba-revisao');
        if (revisaoDiv) revisaoDiv.innerHTML = '<div id="container-m4-revisao"></div><div id="container-m4-final"></div>';

        // Renderiza tudo
        renderizarM4Identificacao();
        // 🐛 Índices (a partir de 0) das perguntas de recebimentoMecanica
        // que são escritas ao contrário ("está danificado?", "houve
        // vazamento?", "ocorreu obstrução?") — nelas SIM é que indica
        // problema, não NÃO. Ver comentário em renderizarTabelaSimNaoM4.
        const invertidasRecebimentoMecanica = [2, 3, 5, 7, 9, 10, 11];
        renderizarTabelaSimNaoM4('container-m4-recebimento', checklistsM4.recebimentoMecanica, 'm4-rec', false, invertidasRecebimentoMecanica);
        renderizarTabelaSimNaoM4('container-m4-eletrica', checklistsM4.recebimentoEletrica, 'm4-ele');
        renderizarTabelaSimNaoM4('container-m4-revisao', checklistsM4.revisao, 'm4-rev');
        renderizarTabelaSimNaoM4('container-m4-final', checklistsM4.inspecaoFinal, 'm4-fin', true);
        renderizarM4AjustesHidraulica();
        renderizarM4Rolos();
        renderizarM4SensorResist();
        renderizarM4PeritagemLargas();
        renderizarM4PeritagemEstreitas();
        renderizarM4ChavetasEngrenagem();
        renderizarM4Mecanica();
        renderizarM4Materiais();

        // 🐛 CORRIGIDO ("preenchi um monte de coisa e não aparece no
        // folhão"): antes essas duas chamadas rodavam em paralelo sem
        // se esperar (nenhuma tinha "await"). Ambas mexem nos MESMOS
        // campos (ex: m4-fa-1000-es) — uma restaura o rascunho salvo
        // (que pode ter esses campos em branco, de uma sessão anterior
        // antes do Checklist de Execução ser respondido) e a outra
        // preenche com os valores reais do Checklist. Quem terminava o
        // fetch por último "ganhava" e apagava o valor do outro — na
        // prática, virava loteria dependendo da rede.
        //
        // Agora é sequencial: primeiro espera restaurar o rascunho
        // (progresso manual salvo), e só DEPOIS disso terminar é que
        // preenche com o Checklist de Execução por cima — assim o dado
        // mais recente e mais confiável (o que já foi de fato marcado
        // na execução do reparo) sempre vence, nunca é sobrescrito por
        // um rascunho antigo em branco.
        await restaurarRascunhoNoModal("modal-folhao-molde4", id);
        await preencherFolhaoComChecklistExecucao(id, item);
        ativarAutoSalvamentoFolhao("modal-folhao-molde4", id, "Molde");

        const firstTabM4 = modalM4.querySelector('.folhao-tab');
        if (firstTabM4) firstTabM4.click();
        modalM4.classList.remove("hidden");
        return;
    }

    alert('Tipo de equipamento sem folhão definido: ' + tipoPeca);
}

// ==============================================================
// SALVAR FOLHÃO - MOLDE MCC 4 (sem imprimir)
// ==============================================================
// 🔧 SEPARADO ("Salvar e Imprimir" virou só "Salvar"): antes, o único
// botão do Folhão já mandava pra impressora na hora. Agora ele só
// grava o laudo (dados + HTML pronto) no banco — a impressão só
// acontece depois, quando o Checklist de Execução estiver 100% e o
// técnico clicar em "Concluir" (ver window.concluirEImprimirFolhao,
// chamado por renderizarBotaoConcluirReparo em checklist-execucao.js).
// Isso também é o que já fazia falta pra destravar o botão Concluir:
// ele só liga quando existe pelo menos 1 laudo salvo pra aquela peça
// (ver folhaoSalvo em checklist-execucao.js) — e antes NADA aqui
// jamais criava um laudo, então Concluir nunca destravava sozinho.
// ==============================================================
// 🆕 PRÉ-VISUALIZAR (sem salvar, sem precisar concluir 100%)
// ==============================================================
// Pedido direto do técnico: "não consigo testar o Folhão antes de
// responder tudo". Antes, o único jeito de ver como o documento final
// ficava era ou (a) clicar Salvar e nunca ver o resultado, ou (b)
// completar o Checklist de Execução inteiro e clicar Concluir. Isso
// gera exatamente o mesmo HTML que o Salvar/Concluir gerariam — só
// que abre numa aba nova pra olhar, sem gravar nada no banco nem
// mexer no status do Checklist de Execução. Os campos ainda em branco
// aparecem em branco mesmo, então dá pra conferir o layout a qualquer
// momento do preenchimento.
export function previsualizarFolhaoMolde4() {
    if (!ID_FOLHAO_ATUAL) return alert("Nenhuma TAG carregada.");
    const htmlPreview = montarHtmlLaudoMolde4(ID_FOLHAO_ATUAL);
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
        win.document.write(htmlPreview);
        win.document.close();
    } else {
        alert('Seu navegador bloqueou a janela de pré-visualização (pop-up). Permita pop-ups pra este site e tente de novo.');
    }
}
window.previsualizarFolhaoMolde4 = previsualizarFolhaoMolde4;

export async function salvarFolhaoMolde4() {
    if (!ID_FOLHAO_ATUAL) return alert("Nenhuma TAG carregada.");
    let tag = ID_FOLHAO_ATUAL;

    const htmlPDF = montarHtmlLaudoMolde4(tag);
    const lider = getV('molde4-lider-responsavel');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: tag,
                tipo: "Molde MCC4",
                html: htmlPDF,
                operador: lider || "Sistema"
            })
        });
        if (!resp.ok) throw new Error("A API não confirmou o salvamento do laudo.");
    } catch (e) {
        console.error("Erro ao salvar laudo do Folhão:", e);
        alert(`❌ Não consegui salvar o Folhão no banco.\n\nMotivo: ${e.message}\n\nSeu progresso continua salvo como rascunho — tente salvar de novo, ou confira sua conexão.`);
        return;
    }

    // 🐛 CORRIGIDO ("aparece a mensagem de sucesso, mas quando abre fica
    // igual"): quem realmente guarda os dados pra reabrir o Folhão depois
    // é o /api/folhao/salvar (rascunho), NÃO o /api/laudos (que só grava
    // o HTML pronto pra impressão). Antes essa chamada de rascunho não
    // era esperada nem verificada — se ela falhasse (rede instável, API
    // fora do ar), o alerta de sucesso aparecia do mesmo jeito (porque é
    // de outra chamada, o /api/laudos), passando a falsa impressão de
    // que salvou tudo. Agora ela é esperada de verdade e, se falhar, o
    // técnico é avisado explicitamente em vez de ficar pensando que
    // "salvou mas bugou".
    let rascunhoSalvoComSucesso = true;
    if (typeof window.salvarRascunhoFolhao === 'function' && typeof window.coletarDadosModal === 'function') {
        try {
            const resultado = await window.salvarRascunhoFolhao(tag, "Molde", window.coletarDadosModal("modal-folhao-molde4"));
            rascunhoSalvoComSucesso = resultado !== false;
        } catch (e) {
            rascunhoSalvoComSucesso = false;
        }
    }

    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Folhão de manutenção (Molde MCC4) salvo — aguardando conclusão do reparo.`);

    // Avisa o Checklist de Execução que o status mudou (folhaoSalvo passa
    // a valer true), pra destravar o botão Concluir sem precisar recarregar.
    if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
        window.carregarStatusChecklistExecucaoReparo([tag], true);
    }
    if (typeof window.renderReparos === 'function') window.renderReparos();

    if (rascunhoSalvoComSucesso) {
        alert("✅ Folhão salvo. Assim que o Checklist de Execução estiver 100%, clique em \"Concluir\" para gerar e imprimir o documento final.");
    } else {
        alert("⚠️ O laudo foi gravado, mas NÃO consegui salvar o progresso do formulário pra reabrir depois (falha ao falar com /api/folhao/salvar). Confira sua conexão e clique em \"Salvar\" de novo antes de fechar — senão os campos digitados podem não vir de volta.");
    }
    fecharFolhaoMolde4();
}
window.salvarFolhaoMolde4 = salvarFolhaoMolde4;

// ==============================================================
// CONCLUIR E IMPRIMIR - MOLDE MCC 4 (chamado pelo botão "Concluir" do
// Checklist de Execução, só depois de 100% + Folhão salvo)
// ==============================================================
window.concluirEImprimirFolhaoMolde4 = async function(tag) {
    let htmlPDF;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos?peca_id=${encodeURIComponent(tag)}&limite=1`, { cache: 'no-store' });
        const laudos = resp.ok ? await resp.json() : [];
        if (!Array.isArray(laudos) || laudos.length === 0) {
            alert('Nenhum Folhão salvo encontrado pra essa peça ainda. Abra o Folhão e clique em "Salvar" primeiro.');
            return;
        }
        htmlPDF = laudos[0].html;
    } catch (e) {
        console.error("Erro ao buscar laudo salvo pra imprimir:", e);
        alert(`❌ Não consegui buscar o Folhão salvo pra imprimir.\n\nMotivo: ${e.message}`);
        return;
    }

    let item = BANCO_ATIVOS.find(a => a.id === tag);
    // 🆕 Parcial x Geral: Geral zera tudo (comportamento de sempre).
    // Parcial não zera — o inspetor informa quantas corridas o molde
    // entra no veio (ex: trocou placa, mas o corpo do molde continua
    // com desgaste acumulado, então não é "vida nova" nem "zero").
    // Sem valor informado no Parcial, mantém a tonelagem como estava
    // (mais seguro que zerar por engano).
    const tipoExecucaoM4 = (getV('molde4-tipo-exec') || 'GERAL').toUpperCase();
    const tonEntradaParcial = getV('molde4-ton-entrada');
    if (item) {
        item.local = "Oficina / Reserva";
        if (tipoExecucaoM4 === 'PARCIAL') {
            if (tonEntradaParcial !== '' && !isNaN(parseFloat(tonEntradaParcial))) {
                item.ton = parseFloat(tonEntradaParcial);
            }
            // sem valor informado: mantém item.ton como já estava
        } else {
            item.ton = 0;
        }
        item.dias = 0;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/atualizar_peca`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: tag,
                tipo: item?.tipo || "Molde",
                mcc_compat: item?.mcc_compat || "4",
                local: "Oficina / Reserva",
                tonelagem: item?.ton ?? 0,
                dias: 0,
                status: "Reserva"
            })
        });
    } catch (e) {
        console.error("Erro ao atualizar peça na nuvem:", e);
    }

    // 🆕 Fecha a execução do Checklist de Execução de verdade — sem isso
    // "concluida_em" nunca era gravada no servidor, e a DATA FIM travada
    // no Folhão (ver preencherCabecalhoExecucaoMolde4) ficava sempre
    // vazia mesmo com o reparo concluído.
    try {
        const apiBase = await resolverApiBase();
        const respStatus = await fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(tag)}`, { cache: 'no-store' });
        const status = respStatus.ok ? await respStatus.json() : null;
        if (status && status.execucao_id) {
            await fetch(`${apiBase}/api/checklist-execucao/execucoes/finalizar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ execucao_id: status.execucao_id })
            });
        }
    } catch (e) {
        console.error("Erro ao finalizar a execução do Checklist (Molde MCC4):", e);
    }

    finalizarRascunhoFolhao(tag, "Molde 4");
    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Reparo concluído — Folhão de manutenção (Molde MCC4) impresso.`);

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = htmlPDF;

    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    setTimeout(() => window.print(), 500);
};

// ==============================================================
// 🆕 CONCLUIR E IMPRIMIR — GENÉRICO (qualquer área que ainda não tenha
// uma função própria de conclusão). Mesma lógica de cima
// (concluirEImprimirFolhaoMolde4), só que sem nada fixo de "Molde":
// o tipo/label vem do próprio cadastro do equipamento (item.tipo).
// Usado pelo dispatcher window.concluirEImprimirFolhaoPorTipo, em
// script.js, como fallback pra qualquer tipo sem função dedicada —
// mesmo padrão que window.abrirFolhaoGenerico já usa pro Folhão.
// Quando uma área precisar de uma lógica de conclusão diferente da
// padrão (campos extras, validação própria etc.), aí sim vale criar
// uma window.concluirEImprimirFolhaoX específica, e cadastrar ela no
// dispatcher — até lá, essa genérica resolve.
// ==============================================================
window.concluirEImprimirFolhaoGenerico = async function(tag) {
    let htmlPDF;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos?peca_id=${encodeURIComponent(tag)}&limite=1`, { cache: 'no-store' });
        const laudos = resp.ok ? await resp.json() : [];
        if (!Array.isArray(laudos) || laudos.length === 0) {
            alert('Nenhum Folhão salvo encontrado pra essa peça ainda. Abra o Folhão e clique em "Salvar" primeiro.');
            return;
        }
        htmlPDF = laudos[0].html;
    } catch (e) {
        console.error("Erro ao buscar laudo salvo pra imprimir:", e);
        alert(`❌ Não consegui buscar o Folhão salvo pra imprimir.\n\nMotivo: ${e.message}`);
        return;
    }

    let item = BANCO_ATIVOS.find(a => a.id === tag);
    const tipoLabel = item?.tipo || 'Equipamento';
    if (item) {
        item.local = "Oficina / Reserva";
        item.ton = 0;
        item.dias = 0;
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/atualizar_peca`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: tag,
                tipo: item?.tipo || tipoLabel,
                mcc_compat: item?.mcc_compat || "",
                local: "Oficina / Reserva",
                tonelagem: 0,
                dias: 0,
                status: "Reserva"
            })
        });
    } catch (e) {
        console.error("Erro ao atualizar peça na nuvem:", e);
    }

    finalizarRascunhoFolhao(tag, tipoLabel);
    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Reparo concluído — Folhão de manutenção (${tipoLabel}) impresso.`);

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = htmlPDF;

    if (typeof renderReparos === 'function') renderReparos();
    if (typeof renderReservas === 'function') renderReservas();
    if (typeof renderAtivos === 'function') renderAtivos();
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    setTimeout(() => window.print(), 500);
};

// ==============================================================
// MONTA O HTML DO LAUDO (PDF) - MOLDE MCC 4
// ==============================================================
// 🔧 EXTRAÍDO: essa montagem de HTML era feita dentro da função de
// salvar/imprimir antiga — agora vira uma função à parte porque
// precisa ser chamada em dois momentos diferentes: ao SALVAR (grava
// o HTML pronto no banco) e ao CONCLUIR (usa o HTML já salvo, sem
// precisar reabrir/remontar o Folhão).
function montarHtmlLaudoMolde4(tag) {
    // 1. CAPTURA OS DADOS DA TELA
    const dtIni = getV('molde4-data-inicio') || new Date().toLocaleDateString('pt-BR');
    const dtFim = getV('molde4-data-fim') || new Date().toLocaleDateString('pt-BR');
    const num = getV('molde4-num-molde');
    const mot = getV('molde4-motivo');
    const tipoE = getV('molde4-tipo-exec');
    const novaMeta = getV('molde4-nova-meta') || 'Manter Atual';
    const lider = getV('molde4-lider-responsavel');
    const desempenho = getV('molde4-desempenho');

    let item = BANCO_ATIVOS.find(a => a.id === tag);
    if (item && novaMeta && !isNaN(parseFloat(novaMeta))) {
        item.meta = parseFloat(novaMeta);
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    // 3. FUNÇÃO AUXILIAR DA TABELA DO PDF
    function gerarTabelaCheckPDF(prefix, arr, isFinal = false) {
        let h = `<table><thead><tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO</th>`;
        if (isFinal) h += `<th style="width:15%;">MEDIDA ENCONTRADA</th>`;
        h += `<th style="width:8%;">SIM</th><th style="width:8%;">NÃO</th></tr></thead><tbody>`;
        arr.forEach((item, i) => {
            const desc = isFinal ? item.text : item;
            const numVal = isFinal ? item.num : (i + 1);
            const v = getRadioValue(`${prefix}-${i}`);
            h += `<tr><td style="text-align:center;">${numVal}</td><td>${desc}</td>`;
            if (isFinal) h += `<td style="text-align:center;">${getV(`${prefix}-${i}-med`)}</td>`;
            h += `<td style="text-align:center;font-weight:bold;">${v==='SIM'?'X':''}</td><td style="text-align:center;font-weight:bold;">${v==='NÃO'?'X':''}</td></tr>`;
        });
        h += `</tbody></table>`;
        return h;
    }

    // 4. DESENHA O SEU PDF PERFEITO DA CSN
    // Código do documento — identifica esse laudo de forma única, prática
    // comum em documentos técnicos formais (tipo "MCC4-M4-12-260826").
    const dataCompacta = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('').slice(2);
    const codigoDocumento = `LM-MCC4-${tag}-${dataCompacta}`;

    let htmlPDF = `
    <style>
        /* 🔧 REFEITO ("não está bonito, padrão ABNT"): duas causas raiz do
           problema visual original —
           1) o "PDF" aqui é o Ctrl+P do próprio navegador (window.print,
              ver checklist-execucao.js), e por padrão o Chrome NÃO
              imprime cor de fundo a menos que o usuário marque "Gráficos
              de segundo plano" na hora de imprimir — por isso as barras
              azuis dos títulos saíam cinza-claro sem cor nenhuma.
              print-color-adjust:exact abaixo resolve isso de vez, sem
              depender do técnico lembrar de marcar checkbox nenhum.
           2) tinha uma quebra de página forçada (.quebra-pagina) antes de
              CADA seção, mesmo as curtas — gerando várias páginas quase
              em branco (ver print anterior). Removidas: o fluxo natural
              do navegador agora decide onde quebrar, aproveitando a
              folha inteira; só as tabelas grandes (Folga de Aresta, por
              exemplo) continuam sem quebrar uma LINHA no meio, via
              page-break-inside:avoid nas linhas.

           Margens no padrão ABNT (NBR 14724): 3cm superior/esquerda,
           2cm inferior/direita. */
        @page { size: A4; margin: 3cm 2cm 2cm 3cm; }

        .pdf-base {
            font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; line-height: 1.4;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;
        }
        .pdf-base *, .pdf-base *::before, .pdf-base *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;
        }
        .pdf-base table { width: 100%; max-width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: auto; page-break-inside: auto; }
        .pdf-base th, .pdf-base td { border: 1px solid #444; padding: 3px 4px; font-size: 8pt; word-wrap: break-word; overflow-wrap: break-word; }
        .pdf-base th { background: #eef1f5; text-align: center; font-weight: bold; }
        /* Repete o cabeçalho da tabela em toda página nova, se a tabela
           quebrar no meio — padrão de documento técnico bem formatado. */
        .pdf-base thead { display: table-header-group; }
        .pdf-base tr { page-break-inside: avoid; }

        /* Título de seção no padrão ABNT: numerado, caixa alta, sem
           depender de fundo colorido pra ficar legível — um friso à
           esquerda (accent) + linha inferior dupla é o que dá o ar
           "documento oficial", e sobrevive mesmo se o navegador não
           imprimir cor nenhuma. */
        .pdf-base .titulo-secao {
            color: #001f3f; font-weight: bold;
            padding: 3px 0 4px 8px; text-align: left; margin: 14px 0 8px 0;
            font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.4px;
            border-left: 4px solid #001f3f; border-bottom: 1.5px solid #001f3f;
            background: #f2f4f7;
            page-break-after: avoid; break-after: avoid-page;
        }
        .pdf-base .assinatura-box { margin: 8px 0 4px 0; font-size: 9pt; font-weight: bold; }
        /* 🔧 Testado com Chromium headless: position:fixed NÃO repete
           em toda página do print-to-pdf (fica preso na posição em que
           o conteúdo natural empurrou, virando página extra sozinho) —
           então o rodapé volta a ser só o fechamento do documento, no
           fluxo normal, depois da assinatura final. */
        .pdf-base .rodape-documento {
            margin-top: 20px; padding-top: 4px; border-top: 1px solid #999;
            font-size: 7.5pt; color: #444; display: flex; justify-content: space-between;
        }
    </style>
    <div class="pdf-base">
        <!-- CABEÇALHO -->
        <div style="display: flex; border: 2px solid #000; border-bottom: 4px solid #002b5e; margin-bottom: 10px; align-items: center;">
            <div style="width: 18%; text-align: center; border-right: 2px solid #000; padding: 10px;"><span style="font-weight: 900; font-size: 26px; color: #002b5e; letter-spacing: -1.5px;">CSN</span></div>
            <div style="width: 62%; text-align: center; padding: 8px;">
                <h2 style="margin: 0; font-size: 13pt; letter-spacing: 0.5px;">CHECK LIST GERAL DO MOLDE MCC 4</h2>
                <p style="margin: 4px 0 0 0; font-size: 8.5pt; font-weight: bold;">DATA INÍCIO: ${dtIni} &nbsp;|&nbsp; DATA FIM: ${dtFim}</p>
            </div>
            <div style="width: 20%; font-size: 9pt; border-left: 2px solid #000; padding: 8px; font-weight: bold; text-align: center;">
                TAG<br><span style="font-size: 13pt;">${tag}</span>
            </div>
        </div>

        <table style="margin-bottom: 15px; border: 2px solid #000;">
            <tr>
                <td style="width: 25%;"><strong>Nº MOLDE:</strong> ${num}</td>
                <td style="width: 30%;"><strong>MOTIVO:</strong> ${mot}</td>
                <td style="width: 25%; color: #002b5e;"><strong>EXECUÇÃO:</strong> ${tipoE}</td>
                <td style="width: 20%; background-color: #f0f0f0; text-align: center;"><strong>NOVA META:</strong> ${novaMeta}</td>
            </tr>
            <tr>
                <td colspan="2"><strong>LÍDER RESPONSÁVEL:</strong> ${lider}</td>
                <td colspan="2"><strong>DESEMPENHO:</strong> ${desempenho}</td>
            </tr>
        </table>

        <div class="titulo-secao">Identificação de Componentes</div>
        <table>
            <thead><tr><th>PLACAS</th><th>SAÍDA MÁQ</th><th>SAÍDA OFI</th><th>REDUTORES</th><th>SAÍDA MÁQ</th><th>SAÍDA OFI</th><th>CILINDROS</th><th>SAÍDA MÁQ</th><th>SAÍDA OFI</th></tr></thead>
            <tbody>
            <tr><td>FIXA:</td><td style="text-align:center;">${getV('m4-id-pl-fixa-mq')}</td><td style="text-align:center;">${getV('m4-id-pl-fixa-of')}</td><td>SUP DIR</td><td style="text-align:center;">${getV('m4-id-red-sd-mq')}</td><td style="text-align:center;">${getV('m4-id-red-sd-of')}</td><td>SUP DIR</td><td style="text-align:center;">${getV('m4-id-cil-sd-mq')}</td><td style="text-align:center;">${getV('m4-id-cil-sd-of')}</td></tr>
            <tr><td>MÓVEL:</td><td style="text-align:center;">${getV('m4-id-pl-movel-mq')}</td><td style="text-align:center;">${getV('m4-id-pl-movel-of')}</td><td>INF DIR</td><td style="text-align:center;">${getV('m4-id-red-id-mq')}</td><td style="text-align:center;">${getV('m4-id-red-id-of')}</td><td>INF DIR</td><td style="text-align:center;">${getV('m4-id-cil-id-mq')}</td><td style="text-align:center;">${getV('m4-id-cil-id-of')}</td></tr>
            <tr><td>DIREITA:</td><td style="text-align:center;">${getV('m4-id-pl-dir-mq')}</td><td style="text-align:center;">${getV('m4-id-pl-dir-of')}</td><td>SUP ESQ</td><td style="text-align:center;">${getV('m4-id-red-se-mq')}</td><td style="text-align:center;">${getV('m4-id-red-se-of')}</td><td>SUP ESQ</td><td style="text-align:center;">${getV('m4-id-cil-se-mq')}</td><td style="text-align:center;">${getV('m4-id-cil-se-of')}</td></tr>
            <tr><td>ESQUERDA:</td><td style="text-align:center;">${getV('m4-id-pl-esq-mq')}</td><td style="text-align:center;">${getV('m4-id-pl-esq-of')}</td><td>INF ESQ</td><td style="text-align:center;">${getV('m4-id-red-ie-mq')}</td><td style="text-align:center;">${getV('m4-id-red-ie-of')}</td><td>INF ESQ</td><td style="text-align:center;">${getV('m4-id-cil-ie-mq')}</td><td style="text-align:center;">${getV('m4-id-cil-ie-of')}</td></tr>
            </tbody>
        </table>
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">1. Inspeção de Recebimento Mecânica</div>
        ${gerarTabelaCheckPDF('m4-rec', checklistsM4.recebimentoMecanica)}

        <div class="titulo-secao">2. Inspeção de Recebimento Elétrica</div>
        ${gerarTabelaCheckPDF('m4-ele', checklistsM4.recebimentoEletrica)}

        <div class="titulo-secao">3. Revisão dos Moldes</div>
        ${gerarTabelaCheckPDF('m4-rev', checklistsM4.revisao)}

        <div class="titulo-secao">4. Inspeção Final dos Moldes</div>
        ${gerarTabelaCheckPDF('m4-fin', checklistsM4.inspecaoFinal, true)}
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">5. Planilha de Ajuste e Medidas Nominais do Molde</div>
        <table>
            <thead><tr><th>ITEM</th><th>DESCRIÇÃO</th><th>NOMINAL</th><th>REAL</th><th>ASSINATURA</th></tr></thead>
            <tbody>
            <tr><td style="text-align:center;">1</td><td>APERTO DO PARAFUSO EXCÊNTRICO</td><td>-</td><td>Dir: ${getV('m4-aj-exc-dir')} | Esq: ${getV('m4-aj-exc-esq')}</td><td>${getV('m4-aj-exc-ass')}</td></tr>
            <tr><td style="text-align:center;">2</td><td>TORQUE DO PARAFUSO DE FIXAÇÃO DO FOOT ROLL</td><td>300 + 5 Nm</td><td style="text-align:center;">${getV('m4-aj-tfr')}</td><td>${getV('m4-aj-tfr-ass')}</td></tr>
            <tr><td style="text-align:center;">3</td><td>TORQUE DO PARAFUSO DE FIXAÇÃO DA PLACA LATERAL</td><td>200 + 5 Nm</td><td style="text-align:center;">${getV('m4-aj-tpl')}</td><td>${getV('m4-aj-tpl-ass')}</td></tr>
            <tr><td style="text-align:center;">4</td><td>TIRANTE FIXAÇÃO DAS GUIAS LATERAIS</td><td>100 Nm</td><td style="text-align:center;">${getV('m4-aj-tir')}</td><td>${getV('m4-aj-tir-ass')}</td></tr>
            <tr><td style="text-align:center;">5</td><td>FOLGA DE GABARITO DO CLAMP (Ø250)</td><td>1,60 ± 0,15 mm</td><td>Sup: ${getV('m4-aj-clp-sup')} | Inf: ${getV('m4-aj-clp-inf')}</td><td>${getV('m4-aj-clp-ass')}</td></tr>
            </tbody>
        </table>

        <div class="titulo-secao">6. Check List Hidráulico</div>
        <table>
            <thead><tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO SERVIÇO</th><th>NOME</th><th>MATRÍCULA</th></tr></thead>
            <tbody>
            ${checklistsM4.hidraulico.map((desc, i) => `
                <tr><td style="text-align:center;">${i + 1}</td><td>${desc}</td><td>${getV(`m4-hid-nome-${i}`)}</td><td>${getV(`m4-hid-mat-${i}`)}</td></tr>
            `).join('')}
            </tbody>
        </table>

        <div class="titulo-secao">Check List Elétrico</div>
        <table>
            <thead><tr><th style="width:5%;">ITEM</th><th>DESCRIÇÃO SERVIÇO</th><th>NOME</th><th>MATRÍCULA</th></tr></thead>
            <tbody>
            <tr><td style="text-align:center;">1</td><td>OS CONECTORES DO DBO E VUHZ ESTÃO LIMPOS, TAMPONADOS E PROTEGIDOS?</td><td>${getV('m4-ele-nome')}</td><td>${getV('m4-ele-mat')}</td></tr>
            </tbody>
        </table>

        <div class="titulo-secao">7. Diâmetros e Alinhamento (Foot Roll e Edge Roll)</div>
        ${(() => {
            const secRolosPDF = (titulo, prefix) => `
                <h4 style="margin-top:10px;">${titulo}</h4>
                <p style="font-size:9pt; margin:2px 0;">
                    Lado Esq Afastado: <strong>${getRadioValue(`m4-${prefix}-esq-af`)}</strong> &nbsp;|&nbsp;
                    Lado Dir Afastado: <strong>${getRadioValue(`m4-${prefix}-dir-af`)}</strong>
                </p>
                <table>
                    <tr><th>LADO FIXO</th><td>${getV(`m4-${prefix}-fixo`)}</td><th>LADO MÓVEL</th><td>${getV(`m4-${prefix}-movel`)}</td></tr>
                    <tr><th>LADO DIREITO</th><td>${getV(`m4-${prefix}-dir`)}</td><th>LADO ESQUERDO</th><td>${getV(`m4-${prefix}-esq`)}</td></tr>
                </table>
            `;
            return `
                ${secRolosPDF('DIÂMETROS — CHEGADA NA OFICINA', 'dia-c')}
                <p style="font-size:8pt; color:#555;">Obs.: Afastar edge roll que apresentar diâmetro Ø menor que 97,00mm.</p>
                ${secRolosPDF('DIÂMETROS — SAÍDA DA OFICINA', 'dia-s')}
                <h4 style="margin-top:15px;">ALINHAMENTO DOS ROLOS (F1, F2, F3 — Tolerância ±0,1mm)</h4>
                <table>
                    <tr><th>FACE</th><th>F1</th><th>F2</th><th>F3</th></tr>
                    <tr><td>FIXA</td><td>${getV('m4-alinh-fixa-f1')}</td><td>${getV('m4-alinh-fixa-f2')}</td><td>${getV('m4-alinh-fixa-f3')}</td></tr>
                    <tr><td>MÓVEL</td><td>${getV('m4-alinh-mov-f1')}</td><td>${getV('m4-alinh-mov-f2')}</td><td>${getV('m4-alinh-mov-f3')}</td></tr>
                </table>
            `;
        })()}
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">8. Planilha de Ajuste do Sensor de Nível</div>
        <table>
            <thead><tr><th>ITEM</th><th>DESCRIÇÃO</th><th>OK</th></tr></thead>
            <tbody>
            ${[1,2,3,4,5,6,7].map(i => `<tr><td style="text-align:center;">${i}</td><td>${['VERIFICAR TAMPA DE PROTEÇÃO;','EFETUAR A TROCA DAS GAXETAS DE ISOLAÇÃO DO SENSOR','VERIFICAR PARAFUSO DE FIXAÇÃO DO SUPORTE DO SENSOR, TORQUE 50 NM;','VERIFICAR PARAFUSO DE FIXAÇÃO DA TAMPA DE PROTEÇÃO DO SENSOR, TORQUE 40 NM;','VERIFICAR ESTADO DE CONSERVAÇÃO E LIMPEZA;','TESTE DE ESTANQUIEDADE (5 BAR);','CHECK NA CONEXÕES DE ALIMENTAÇÃO DE ÁGUA;'][i-1]}</td><td style="text-align:center;">${getCheckboxValue(`m4-sn-${i}`)}</td></tr>`).join('')}
            </tbody>
        </table>
        <h4 style="margin-top:10px;">MEDIÇÃO RESISTÊNCIA NO SENSOR</h4>
        <table>
            <thead><tr><th>ITEM</th><th>PINOS</th><th>LIMITES (Ω)</th><th>VALOR</th></tr></thead>
            <tbody>
            ${[['1-2','140...300'],['3-4','0...2'],['1-5','70...150'],['3-5','0...1'],['7-8','0...1'],['8-9','100...140'],['15-16','3...10'],['Pino 10 / Carcaça','0...1']].map((p,i) => `<tr><td style="text-align:center;">${i+8}</td><td>${p[0]}</td><td>${p[1]}</td><td>${getV(`m4-sn-res-${i+8}`)}</td></tr>`).join('')}
            </tbody>
        </table>
        <h4 style="margin-top:10px;">ISOLAÇÃO DOS SENSORES (MΩ)</h4>
        <table>
            <thead><tr><th>PINOS</th><th>&gt;10 MΩ</th><th>VALOR MEDIDO</th></tr></thead>
            <tbody>
            ${["5 e 6","5 e 8","5 e 10","5 e 15","6 e 8","6 e 10","6 e 15","8 e 10","8 e 15","10 e 15"].map((p,i) => `<tr><td style="text-align:center;">${p}</td><td style="text-align:center;">&gt;10 MΩ</td><td>${getV(`m4-sn-iso-${i}`)}</td></tr>`).join('')}
            </tbody>
        </table>

        <div class="titulo-secao">9. Teste de Resistência das Placas (Termopares)</div>
        <table>
            <thead><tr><th>TERMOPAR</th><th>FACE FIXA (10-30 Ω)</th><th>FACE MÓVEL (10-30 Ω)</th></tr></thead>
            <tbody>
            ${Array.from({length:12}, (_, idx) => idx+1).map(i => `<tr><td style="text-align:center;font-weight:bold;">T${i}</td><td>${getV(`m4-termo-f-${i}`)}</td><td>${getV(`m4-termo-m-${i}`)}</td></tr>`).join('')}
            </tbody>
        </table>
        <h4 style="margin-top:10px;">PLACAS ESTREITAS</h4>
        <table>
            <thead><tr><th>LADO</th><th>T1 (10-30 Ω)</th><th>T2 (10-30 Ω)</th></tr></thead>
            <tbody>
            <tr><td>DIREITA</td><td>${getV('m4-termo-ed-1')}</td><td>${getV('m4-termo-ed-2')}</td></tr>
            <tr><td>ESQUERDA</td><td>${getV('m4-termo-ee-1')}</td><td>${getV('m4-termo-ee-2')}</td></tr>
            </tbody>
        </table>
        <h4 style="margin-top:10px;">VERIFICAÇÃO CAIXAS TERMOPARES</h4>
        <table>
            <thead><tr><th>DESCRIÇÃO</th><th>CONDIÇÃO</th></tr></thead>
            <tbody>
            <tr><td>PARAFUSOS BASE</td><td>${getV('m4-tc-1')}</td></tr>
            <tr><td>TESTE DE AR</td><td>${getV('m4-tc-2')}</td></tr>
            <tr><td>ESTADO/LIMPEZA</td><td>${getV('m4-tc-3')}</td></tr>
            <tr><td>BORRACHAS/VED.</td><td>${getV('m4-tc-4')}</td></tr>
            <tr><td>TRAVAS</td><td>${getV('m4-tc-5')}</td></tr>
            </tbody>
        </table>

        <div class="titulo-secao">10. Peritagem Placas Largas</div>
        ${(() => {
            const medidasPlacaLargaPDF = [
                { label: "PLANICIDADE VERTICAL (F)", sufixo: "fv", tolerancia: "< 0,2mm" },
                { label: "PLANICIDADE HORIZONTAL (G)", sufixo: "fh", tolerancia: "< 0,2mm" },
                { label: "PROFUNDIDADE DE RANHURAS (P)", sufixo: "pr", tolerancia: "< 1mm" },
                { label: "DESGASTE (A)", sufixo: "da", tolerancia: "< 1mm" },
            ];
            const blocoPlacaPDF = (prefix, ladoLabel, ladoSufixo) => `
                <h4 style="margin-top:10px;">PLACA LARGA ${ladoLabel} — Nº ${getV(`${prefix}-${ladoSufixo}-numero`)}
                    &nbsp;(${getV(`${prefix}-${ladoSufixo}-tipo`) || 'STEP'}) &nbsp;—&nbsp;
                    Afastada: ${getRadioValue(`${prefix}-${ladoSufixo}-afast`)}</h4>
                <table>
                    <thead><tr><th>DESCRIÇÃO</th><th>LEITURA ORIGINAL (± 0,10mm)</th><th>TOLERÂNCIA</th></tr></thead>
                    <tbody>
                    ${medidasPlacaLargaPDF.map(m => `<tr><td>${m.label}</td><td>${getV(`${prefix}-${m.sufixo}-${ladoSufixo}`)}</td><td style="text-align:center;">${m.tolerancia}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
            return `
                <p style="font-weight:bold; margin:6px 0 2px 0;">AO ENTRAR NA OFICINA</p>
                ${blocoPlacaPDF('m4-per-ent', 'FIXA', 'fixa')}
                ${blocoPlacaPDF('m4-per-ent', 'MÓVEL', 'movel')}
                <p style="font-weight:bold; margin:10px 0 2px 0;">AO SAIR DA OFICINA</p>
                ${blocoPlacaPDF('m4-per-sai', 'FIXA', 'fixa')}
                ${blocoPlacaPDF('m4-per-sai', 'MÓVEL', 'movel')}
            `;
        })()}

        <div class="titulo-secao">11. Peritagem Placas Estreitas</div>
        <p style="font-size:8pt; color:#555;">Tolerâncias: B ≤ 1,0mm | E/F ≤ 2,0mm</p>
        ${(() => {
            const medidasEstreitasPDF = ['A (Desgaste topo)','B (Desgaste base)','C (Comprimento)','D (Comprimento)','E (Chanfro)','F (Chanfro)','G (Meio)','H1 (0,0mm ±0,1mm)','H2 (0,5mm ±0,1mm)','H3 (1,0mm ±0,1mm)','H4 (1,5mm ±0,1mm)','L (Largura topo)','M (Largura base)'];
            const secEstreitasPDF = (titulo, prefix) => `
                <h4 style="margin-top:10px;">${titulo}</h4>
                <table>
                    <thead><tr><th>MEDIDA</th><th>FACE SUL (ESQ)</th><th>FACE NORTE (DIR)</th></tr></thead>
                    <tbody>
                    ${medidasEstreitasPDF.map((p, i) => `<tr><td>${p}</td><td>${getV(`${prefix}-sul-${i}`)}</td><td>${getV(`${prefix}-nor-${i}`)}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
            return `${secEstreitasPDF('CHEGADA NA OFICINA', 'pe-cheg')}${secEstreitasPDF('SAÍDA DA OFICINA', 'pe-sai')}`;
        })()}
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">12. Caixas de Engrenagem, Chavetas e Folga Aresta</div>
        <h4 style="margin-top:10px;">FOLGAS NAS CAIXAS DE ENGRENAGEM (BITOLA 1300 ± 1MM)</h4>
        <table>
            <thead><tr><th>COMPONENTE</th><th>ESQ SUP</th><th>ESQ INF</th><th>DIR SUP</th><th>DIR INF</th></tr></thead>
            <tbody>
            <tr><td>FUSO (mm)</td><td>${getV('m4-eng-fuso-es')}</td><td>${getV('m4-eng-fuso-ei')}</td><td>${getV('m4-eng-fuso-ds')}</td><td>${getV('m4-eng-fuso-di')}</td></tr>
            <tr><td>PLACA (mm)</td><td>${getV('m4-eng-placa-es')}</td><td>${getV('m4-eng-placa-ei')}</td><td>${getV('m4-eng-placa-ds')}</td><td>${getV('m4-eng-placa-di')}</td></tr>
            </tbody>
        </table>
        <h4 style="margin-top:10px;">AJUSTE DE CHAVETAS DAS PLACAS ESTREITAS</h4>
        <table>
            <thead><tr><th>PLACA</th><th>LADO</th><th>A</th><th>B</th><th>NOME</th><th>REG</th></tr></thead>
            <tbody>
            <tr><td>ESQUERDA</td><td>A</td><td>${getV('m4-chav-esq-a-a')}</td><td>${getV('m4-chav-esq-a-b')}</td><td>${getV('m4-chav-esq-a-nome')}</td><td>${getV('m4-chav-esq-a-reg')}</td></tr>
            <tr><td>ESQUERDA</td><td>B</td><td>${getV('m4-chav-esq-b-a')}</td><td>${getV('m4-chav-esq-b-b')}</td><td>${getV('m4-chav-esq-b-nome')}</td><td>${getV('m4-chav-esq-b-reg')}</td></tr>
            <tr><td>DIREITA</td><td>A</td><td>${getV('m4-chav-dir-a-a')}</td><td>${getV('m4-chav-dir-a-b')}</td><td>${getV('m4-chav-dir-a-nome')}</td><td>${getV('m4-chav-dir-a-reg')}</td></tr>
            <tr><td>DIREITA</td><td>B</td><td>${getV('m4-chav-dir-b-a')}</td><td>${getV('m4-chav-dir-b-b')}</td><td>${getV('m4-chav-dir-b-nome')}</td><td>${getV('m4-chav-dir-b-reg')}</td></tr>
            </tbody>
        </table>
        <h4 style="margin-top:10px;">AVALIAÇÃO DO SISTEMA DE RESFRIAMENTO NA SAÍDA</h4>
        <table>
            <tr><th>FACE FIXA</th><td>${getV('m4-resf-fixa')}</td></tr>
            <tr><th>FACE MÓVEL</th><td>${getV('m4-resf-movel')}</td></tr>
        </table>
        <h4 style="margin-top:10px;">RELATÓRIO FOLGA DE ARESTA (Tolerância = 0,25mm por face)</h4>
        <table>
            <thead><tr><th>LARGURA</th><th>ESQUERDA (Móvel/Fixo)</th><th>DIREITA (Móvel/Fixo)</th></tr></thead>
            <tbody>
            ${[1000, 1030, 1040, 1090, 1100, 1160, 1180, 1230, 1290, 1360, 1380, 1420, 1460, 1500, 1530, 1550, 1560, 1580, 1620].map(l => `
                <tr><td style="font-weight:bold;">${l}</td>
                    <td>${getV(`m4-fa-${l}-esq-mov`)} / ${getV(`m4-fa-${l}-esq-fix`)}</td>
                    <td>${getV(`m4-fa-${l}-dir-mov`)} / ${getV(`m4-fa-${l}-dir-fix`)}</td></tr>
            `).join('')}
            </tbody>
        </table>
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">13. Aferição Eixo Excêntrico, Cardans e Transmissões</div>
        <table>
            <thead><tr><th>COTA</th><th>MEDIDA DO DESENHO</th><th>MEDIDA TOLERÁVEL</th><th>LADO DIREITO</th><th>LADO ESQUERDO</th></tr></thead>
            <tbody>
            ${[['A','70 (0 / +0,1)','70 (+/- 1,5)'],['B','45,00','45,00 (0 / -0,5)'],['C','90 d9 (-0,12/-0,20)','90 (0 / -0,207)'],['D','31,00','31,00 (0 / -0,5)'],['E','70 h7 (0 / -0,03)','70,00 (-0,15)'],['F','12,00','12,00 (+/- 0,2)'],['SW','55,00','55,00 (+/- 0,5)']].map(([cota, desenho, tol]) => `
                <tr><td>${cota}</td><td>${desenho}</td><td>${tol}</td><td>${getV(`m4-ex-${cota.toLowerCase()}-d`)}</td><td>${getV(`m4-ex-${cota.toLowerCase()}-e`)}</td></tr>
            `).join('')}
            <tr><td colspan="5" style="background:#e8e8e8; text-align:center; font-weight:bold;">BUCHA DO EXCÊNTRICO</td></tr>
            <tr><td>DIA INT.</td><td>70 H8 (0 / +0,046)</td><td>70,00 (+0,15)</td><td>${getV('m4-ex-buc-d')}</td><td>${getV('m4-ex-buc-e')}</td></tr>
            </tbody>
        </table>
        <h4 style="margin-top:10px;">VERIFICAÇÃO DOS CARDANS</h4>
        <table>
            <thead><tr><th>LOCAL</th><th>ARTICULAÇÃO</th><th>SANFONADA</th><th>PINO TRAVA</th><th>ACOPLAMENTO</th><th>DATA TROCA</th></tr></thead>
            <tbody>
            ${['Esq Sup', 'Dir Sup', 'Esq Inf', 'Dir Inf'].map((loc, i) => `
                <tr><td>${loc}</td><td>${getV(`m4-cd-art-${i}`)}</td><td>${getV(`m4-cd-sanf-${i}`)}</td><td>${getV(`m4-cd-pino-${i}`)}</td><td>${getV(`m4-cd-acop-${i}`)}</td><td>${getV(`m4-cd-data-${i}`)}</td></tr>
            `).join('')}
            </tbody>
        </table>
        <h4 style="margin-top:10px;">PARAFUSOS DE FIXAÇÃO DAS TRANSMISSÕES</h4>
        <table>
            <thead><tr><th>LOCAL</th><th>Nº BENZLER</th><th>Nº TRANSMI</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr></thead>
            <tbody>
            ${['Sup Dir', 'Sup Esq', 'Inf Dir', 'Inf Esq'].map((loc, i) => `
                <tr><td>${loc}</td><td>${getV(`m4-tr-bz-${i}`)}</td><td>${getV(`m4-tr-tr-${i}`)}</td>
                    ${[1,2,3,4].map(p => `<td style="text-align:center;">${getCheckboxValue(`m4-tr-p${p}-${i}`)}</td>`).join('')}</tr>
            `).join('')}
            </tbody>
        </table>
        <div class="assinatura-box">DATA: ____/____/____ &nbsp; NOME: ______________________________________ &nbsp; MATRÍCULA: _________</div>

        <div class="titulo-secao">14. Materiais Utilizados na Manutenção</div>
        <table>
            <thead><tr><th style="width:80%;">DESCRIÇÃO DO MATERIAL / SKU</th><th style="width:20%;">QUANTIDADE</th></tr></thead>
            <tbody>
            ${Array.from({length:29}, (_, idx) => idx+1).filter(i => getV(`m4-mat-desc-${i}`)).map(i => `<tr><td>${getV(`m4-mat-desc-${i}`)}</td><td style="text-align:center;">${getV(`m4-mat-qtd-${i}`)}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center; color:#777;">Nenhum material informado.</td></tr>'}
            </tbody>
        </table>
        <p style="font-size:9pt; margin-top:8px;"><strong>OBSERVAÇÕES GERAIS:</strong> ${getV('m4-observacoes-gerais')}</p>

        <div style="margin-top:36px; display:flex; justify-content:space-around; text-align:center; font-size:9.5pt; font-weight:bold;">
            <div><p style="margin-bottom:2px;">___________________________________</p><p style="margin-top:2px;">Assinatura Mecânica / Operador</p></div>
            <div><p style="margin-bottom:2px;">___________________________________</p><p style="margin-top:2px;">Inspetor de Qualidade</p></div>
        </div>

        <!-- RODAPÉ DE CONTROLE DO DOCUMENTO -->
        <div class="rodape-documento">
            <span>Documento: ${codigoDocumento}</span>
            <span>Oficina de Moldes e Segmentos — CSN</span>
            <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
        </div>
    </div>`;

    return htmlPDF;
}

// ==============================================================
// 🆕 PRÉ-VISUALIZAR (sem salvar, sem precisar concluir 100%)
// ==============================================================
// Mesmo padrão do Horizontal/Bow/Straightener (ver previsualizarFolhaoHorizontal,
// em folhaoHorizontal.js) — faltava aqui, então o botão "Pré-visualizar"
// caía no alert genérico ("Pré-visualização ainda não disponível") pro
// Bender. Gera o mesmo HTML que Salvar geraria e abre numa aba nova,
// sem gravar nada no banco.
window.previsualizarFolhaoBender = function() {
    if (!ID_FOLHAO_ATUAL) { alert("Nenhuma TAG carregada."); return; }
    const motivo = document.getElementById("mcc4-motivo")?.value || "Manutenção";
    const htmlPreview = montarHtmlLaudoBender(ID_FOLHAO_ATUAL, motivo, getV);
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) {
        win.document.write(htmlPreview);
        win.document.close();
    } else {
        alert('Seu navegador bloqueou a janela de pré-visualização (pop-up). Permita pop-ups pra este site e tente de novo.');
    }
};

// ==============================================================
// SALVAR FOLHÃO - BENDER (sem imprimir)
// ==============================================================
// 🔧 SEPARADO (mesmo padrão do Molde MCC4): "salvarLaudoInteligente"
// fazia tudo num clique só e NUNCA gravava um laudo em /api/laudos —
// o Bender era a única área do arquivo que não seguia esse padrão,
// mesmo dividindo o arquivo com o Molde MCC4 que já seguia. Isso
// deixava o "Concluir" do Checklist de Execução travado pra sempre
// pro Bender. Agora salva o laudo primeiro; a impressão e o envio pra
// Oficina/Reserva só acontecem no "Concluir".
export async function salvarFolhaoBender() {
    if (!ID_FOLHAO_ATUAL) return alert("Nenhuma TAG carregada.");
    const tag = ID_FOLHAO_ATUAL;
    const motivo = document.getElementById("mcc4-motivo")?.value || "Manutenção";
    const htmlPDF = montarHtmlLaudoBender(tag, motivo, getV);

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peca_id: tag, tipo: "Bender", html: htmlPDF, operador: "Sistema" })
        });
        if (!resp.ok) throw new Error("A API não confirmou o salvamento do laudo.");
    } catch (e) {
        console.error("Erro ao salvar laudo do Folhão (Bender):", e);
        alert(`❌ Não consegui salvar o Folhão no banco.\n\nMotivo: ${e.message}\n\nSeu progresso continua salvo como rascunho — tente salvar de novo, ou confira sua conexão.`);
        return;
    }

    let rascunhoSalvoComSucesso = true;
    if (typeof window.salvarRascunhoFolhao === 'function' && typeof window.coletarDadosModal === 'function') {
        try {
            const resultado = await window.salvarRascunhoFolhao(tag, "Bender", window.coletarDadosModal("modal-folhao-mcc4"));
            rascunhoSalvoComSucesso = resultado !== false;
        } catch (e) {
            rascunhoSalvoComSucesso = false;
        }
    }

    if (window.registrarHistorico) window.registrarHistorico(tag, `📋 Folhão de manutenção (Bender) salvo — aguardando conclusão do reparo.`);
    if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
        window.carregarStatusChecklistExecucaoReparo([tag], true);
    }
    if (typeof window.renderReparos === 'function') window.renderReparos();

    if (rascunhoSalvoComSucesso) {
        alert("✅ Folhão salvo. Assim que o Checklist de Execução estiver 100%, clique em \"Concluir\" para gerar e imprimir o documento final.");
    } else {
        alert("⚠️ O laudo foi gravado, mas NÃO consegui salvar o progresso do formulário pra reabrir depois. Confira sua conexão e clique em \"Salvar\" de novo antes de fechar.");
    }
    fecharFolhaoMCC4();
}
window.salvarFolhaoBender = salvarFolhaoBender;

// ==============================================================
// CONCLUIR E IMPRIMIR - BENDER (chamado pelo botão "Concluir" do
// Checklist de Execução, só depois de 100% + Folhão salvo)
// ==============================================================
window.concluirEImprimirFolhaoBender = async function(tag) {
    let htmlPDF;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos?peca_id=${encodeURIComponent(tag)}&limite=1`, { cache: 'no-store' });
        const laudos = resp.ok ? await resp.json() : [];
        if (!Array.isArray(laudos) || laudos.length === 0) {
            alert('Nenhum Folhão salvo encontrado pra essa peça ainda. Abra o Folhão e clique em "Salvar" primeiro.');
            return;
        }
        htmlPDF = laudos[0].html;
    } catch (e) {
        console.error("Erro ao buscar laudo salvo pra imprimir (Bender):", e);
        alert(`❌ Não consegui buscar o Folhão salvo pra imprimir.\n\nMotivo: ${e.message}`);
        return;
    }

    let item = BANCO_ATIVOS.find(a => a.id === tag);
    // 🆕 Parcial x Geral: Geral zera (como sempre). Parcial NÃO mexe em
    // tonelagem/dias — Bender e equipamentos não-molde não têm o
    // conceito de "entra com X corridas" que o molde tem.
    const tipoExecucaoBender = (getV('mcc4-tipo-exec') || 'GERAL').toUpperCase();
    if (item) {
        item.local = "Oficina / Reserva";
        if (tipoExecucaoBender !== 'PARCIAL') {
            item.ton = 0;
            item.dias = 0;
        }
        localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));
    }

    finalizarRascunhoFolhao(tag, "Bender");
    const motivo = document.getElementById("mcc4-motivo")?.value || "Manutenção";
    if (window.registrarHistorico) {
        window.registrarHistorico(tag, `📋 Reparo concluído — Laudo Bender finalizado. Motivo: ${motivo}`);
    }

    if (renderReparos) renderReparos();
    if (renderReservas) renderReservas();
    if (renderAtivos) renderAtivos();
    if (window.calcularKpisGlobais) window.calcularKpisGlobais();

    const printDiv = document.getElementById('print-content');
    if (printDiv) printDiv.innerHTML = htmlPDF;
    setTimeout(() => window.print(), 500);
};

// ==============================================================
// EXPOSIÇÃO GLOBAL
// ==============================================================
window.abrirFolhaoMCC4 = abrirFolhaoMCC4;
window.fecharFolhaoMCC4 = fecharFolhaoMCC4;
window.fecharFolhaoMolde4 = fecharFolhaoMolde4;
window.trocarAbaFolhao = trocarAbaFolhao;
window.trocarAbaMolde4 = trocarAbaMolde4;
window.adicionarLinhaMaterialBender = window.adicionarLinhaMaterialBender || function() {};
window.getV = getV;

console.log("✅ folhaoMolde4.js carregado – com BENDER e MOLDE MCC4 corrigidos.");