// folhaoMolde4.js - Orquestrador para BENDER (e outros futuros)
import { BANCO_ATIVOS } from './banco.js';
import { BIBLIOTECA_CHECKLISTS } from './dados.js';
import { renderAtivos, renderReparos, renderReservas } from './ui.js';
import { gerarTelasBenderHTML, imprimirPDFBender } from './folhao_bender.js';

let ID_FOLHAO_ATUAL = null;

export function getV(id) {
  let el = document.getElementById(id);
  return el ? el.value : '';
}

export function fecharFolhaoMCC4() {
  document.getElementById("modal-folhao-mcc4").classList.add("hidden");
  ID_FOLHAO_ATUAL = null;
}

export function trocarAbaFolhao(event, idAba) {
  document.querySelectorAll('.folhao-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.folhao-tab').forEach(t => t.classList.remove('active'));
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
      html += `<div class="check-item"><p>${idx+1}. ${p}</p><div class="check-options"><label><input type="radio" name="${name}" value="SIM" checked> SIM</label><label><input type="radio" name="${name}" value="NÃO"> NÃO</label></div></div>`;
    });
    html += `</div>`;
    groupIndex++;
  }
  container.innerHTML = html;
}

function prepararAbasDinamicamente(tipoUpper) {
  let tabsContainer = document.querySelector('.folhao-tabs');
  let bodyContainer = document.querySelector('.folhao-body');
  document.querySelectorAll('.tab-dinamica, .content-dinamico').forEach(el => el.remove());

  if (tipoUpper === "BENDER") {
    tabsContainer.innerHTML += `
      <button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-chegada')">3. Chegada</button>
      <button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-execucao')">4. Execução</button>
      <button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'bender-saida')">5. Saída</button>
      <button class="folhao-tab tab-dinamica" onclick="trocarAbaFolhao(event, 'aba-materiais-geral')">6. Materiais</button>
    `;
    bodyContainer.innerHTML += gerarTelasBenderHTML();
  }
}

export function abrirFolhaoMCC4(id) {
  ID_FOLHAO_ATUAL = id;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (!item) return alert('Equipamento não encontrado!');

  let tipoPeca = item.tipo.toUpperCase();
  // Força BENDER para teste
  tipoPeca = "BENDER";

  document.getElementById("mcc4-tag-name").innerText = id;
  document.getElementById("mcc4-data-inicio").valueAsDate = new Date();
  document.getElementById("mcc4-data-fim").valueAsDate = new Date();

  prepararAbasDinamicamente(tipoPeca);

  let objChecklist = {
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
  renderizarChecklist(objChecklist, "container-check-recebimento", "geral");

  document.querySelectorAll('.folhao-tab')[0].click();
  document.getElementById("modal-folhao-mcc4").classList.remove("hidden");
}

export function salvarLaudoInteligente() {
  if (!ID_FOLHAO_ATUAL) return;
  let tag = ID_FOLHAO_ATUAL;
  let item = BANCO_ATIVOS.find(a => a.id === tag);
  if (!item) return;

  item.ton = 0; item.dias = 0; item.local = "Oficina / Reserva";
  localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

  let motivo = document.getElementById("mcc4-motivo")?.value || "Manutenção";
  if (window.registrarHistorico) {
    window.registrarHistorico(tag, `Laudo Bender finalizado. Motivo: ${motivo}`);
  }
  fecharFolhaoMCC4();
  if (renderReparos) renderReparos();
  if (renderReservas) renderReservas();
  if (renderAtivos) renderAtivos();
  if (window.calcularKpisGlobais) window.calcularKpisGlobais();
  imprimirPDFBender(tag, motivo, getV);
}

// Expor funções globalmente
window.abrirFolhaoMCC4 = abrirFolhaoMCC4;
window.fecharFolhaoMCC4 = fecharFolhaoMCC4;
window.trocarAbaFolhao = trocarAbaFolhao;
window.salvarLaudoInteligente = salvarLaudoInteligente;
window.adicionarLinhaMaterialBender = window.adicionarLinhaMaterialBender || function() {};
window.getV = getV;