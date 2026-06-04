// ==========================================================================
// BANCO DE DADOS CORE E ESTRUTURA DE ATIVOS (OMS INDUSTRIAL)
// ==========================================================================
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v10"));

if (!BANCO_ATIVOS) {
  BANCO_ATIVOS = [];
  const veiosMcc23 = [
    { mcc: 2, veio: "C" }, { mcc: 2, veio: "D" },
    { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }
  ];

  veiosMcc23.forEach(m => {
    const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
    BANCO_ATIVOS.push({ id: `MLD-${m.mcc}${m.veio}`, tipo: "Molde", local: vNome, pos: "Molde", dias: 15, ton: 190000, meta: 1200000 });
    BANCO_ATIVOS.push({ id: `OSC-${m.mcc}${m.veio}`, tipo: "Mesa Osciladora", local: vNome, pos: "Mesa Osciladora", dias: 52, ton: 410000, meta: 1800000 });
    BANCO_ATIVOS.push({ id: `SEG-0-${m.mcc}${m.veio}`, tipo: "Seguimento Zero", local: vNome, pos: "Seg. Zero", dias: 88, ton: 690000, meta: 2200000 });
    
    for (let s = 1; s <= 4; s++) {
      BANCO_ATIVOS.push({ id: `SEG-${s}-${m.mcc}${m.veio}`, tipo: "Câmara de Exaustão", local: vNome, pos: `Seg. Exaustão ${s}`, dias: 112, ton: 820000, meta: 2500000 });
    }

    const cadeirasAcionadas = [45, 48, 52];
    for (let c = 43; c <= 48; c++) {
      let eAcionada = cadeirasAcionadas.includes(c);
      BANCO_ATIVOS.push({ id: `CAD-INF-${c}-${m.mcc}${m.veio}`, tipo: "Cadeira Inferior", local: vNome, pos: `Cadeira Inf ${c}`, dias: 195, ton: 1150000, meta: 3000000, acionada: eAcionada });
      BANCO_ATIVOS.push({ id: `CAD-SUP-${c}-${m.mcc}${m.veio}`, tipo: "Cadeira Superior", local: vNome, pos: `Cadeira Sup ${c}`, dias: 130, ton: 580000, meta: 3000000, acionada: false });
    }
  });

  const veiosMcc4 = ["G", "H"];
  veiosMcc4.forEach(v => {
    const vNome = `MCC 4 - Veio ${v}`;
    BANCO_ATIVOS.push({ id: `MLD-4${v}`, tipo: "Molde", local: vNome, pos: "Molde", dias: 45, ton: 320000, meta: 1500000 });
    BANCO_ATIVOS.push({ id: `OSC-4${v}`, tipo: "Mesa Osciladora", local: vNome, pos: "Mesa Osciladora", dias: 60, ton: 480000, meta: 1800000 });
    BANCO_ATIVOS.push({ id: `BND-4${v}`, tipo: "Seguimento Zero", local: vNome, pos: "Bender", dias: 92, ton: 710000, meta: 2200000 });
  });

  localStorage.setItem("oms_ativos_v10", JSON.stringify(BANCO_ATIVOS));
}

let HISTORICO_EVENTOS = JSON.parse(localStorage.getItem("oms_historico_v10")) || [];
let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v10")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v10")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

const CADASTRO_MATRICULAS = {
  "40090430": "Filipe Silva Souza (Líder)",
  "40075827": "Denilson Jose de Oliveira (Líder)",
  "40080751": "Valmir de Paula da Silva (Líder)",
  "40090851": "Samuel dos Santos Generoso (Líder)",
  "1011": "Supervisor de Área"
};

// ==========================================================================
// CONTROLE DO DRAWER (MENU LATERAL MOBILE INTERATIVO)
// ==========================================================================
function toggleMobileMenu() {
  const menu = document.getElementById("sidebar-menu");
  const overlay = document.getElementById("menu-overlay");
  if (menu && overlay) {
    menu.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

// CONTROLE DE NAVEGAÇÃO ENTRE JANELAS
function abrirAba(event, idAba) {
  if (event) event.preventDefault();
  
  // Fecha o menu mobile caso ele esteja aberto ao mudar de aba
  const menu = document.getElementById("sidebar-menu");
  const overlay = document.getElementById("menu-overlay");
  if (menu && menu.classList.contains("active")) {
    menu.classList.remove("active");
    overlay.classList.remove("active");
  }

  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
  
  const idNavEquivalente = idAba.replace("aba-", "nav-");
  const navItem = document.getElementById(idNavEquivalente);
  if (navItem) navItem.classList.add("active");
  
  const abaAlvo = document.getElementById(idAba);
  if (abaAlvo) {
    abaAlvo.classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (idAba === "aba-painel") calcularKpisGlobais();
  if (idAba === "aba-fluxo") renderPainelVeios();
  if (idAba === "aba-ativos") renderAtivos();
  if (idAba === "aba-intervencao") inicializarAbaIntervencao();
}

function voltarParaHome() {
  abrirAba(null, 'aba-painel');
}

function mudarVeioVisualizado(veioNome) {
  VEIO_SELECIONADO_PAINEL = veioNome;
  document.querySelectorAll(".btn-veio-tab").forEach(btn => {
    if (btn.innerText.includes(`Veio ${veioNome}`)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  renderPainelVeios();
}

// ==========================================================================
// AUTENTICAÇÃO OPERACIONAL
// ==========================================================================
function pedirIdentificacao() {
  const m = prompt("Digite sua matrícula operacional da OMS:");
  if (!m) return;
  
  const matriculaLimpa = m.trim();
  if (CADASTRO_MATRICULAS[matriculaLimpa]) {
    OPERADOR_LOGADO = { matricula: matriculaLimpa, nome: CADASTRO_MATRICULAS[matriculaLimpa] };
    localStorage.setItem("oms_operador_v10", JSON.stringify(OPERADOR_LOGADO));
    atualizarInterfaceUsuario();
    calcularKpisGlobais();
    alert(`Acesso liberado! Líder ativo: ${OPERADOR_LOGADO.nome}.`);
  } else {
    alert("Matrícula não localizada na base da aciaria.");
  }
}

function verificarAcesso() {
  if (!OPERADOR_LOGADO) {
    alert("Acesso negado! Valide sua matrícula no menu do sistema primeiro.");
    toggleMobileMenu(); // Abre a aba lateral automaticamente para ele fazer o login
    return false;
  }
  return true;
}

function atualizarInterfaceUsuario() {
  const el = document.getElementById("nome-operador-logado");
  if (el) el.innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
}

// ==========================================================================
// CÁLCULO DE KPIs
// ==========================================================================
function calcularKpisGlobais() {
  let criticos = 0, bancada = 0, moldesDisponiveis = 0;
  
  BANCO_ATIVOS.forEach(a => {
    const pct = (a.ton / a.meta) * 100;
    if (pct > 85 && a.local !== "Bancada / Oficina") criticos++;
    if (a.local === "Bancada / Oficina") bancada++;
    if (a.tipo === "Molde" && a.local === "Bancada / Oficina" && pct < 50) moldesDisponiveis++;
  });
  
  if (document.getElementById("kpi-criticos")) document.getElementById("kpi-criticos").innerText = criticos;
  if (document.getElementById("kpi-bancada")) document.getElementById("kpi-bancada").innerText = bancada;
  if (document.getElementById("kpi-moldes")) document.getElementById("kpi-moldes").innerText = moldesDisponiveis;
}

// ==========================================================================
// RENDERIZAÇÃO EM LINHA HORIZONTAL COMPLETA (SEM QUEBRAS DE TEXTO)
// ==========================================================================
function renderPainelVeios() {
  const container = document.getElementById("container-fluxo-horizontal-scroll");
  const titulo = document.getElementById("titulo-veio-focado");
  if (!container || !titulo) return;

  titulo.innerHTML = `<i class="fas fa-eye"></i> Fluxo Sequencial: <strong>Veio ${VEIO_SELECIONADO_PAINEL}</strong>`;
  let ativosDoVeio = BANCO_ATIVOS.filter(a => a.local.endsWith(`Veio ${VEIO_SELECIONADO_PAINEL}`));

  if (ativosDoVeio.length === 0) {
    container.innerHTML = `<div class="vazio" style="color:var(--muted); padding: 20px;">Nenhum componente ativo listado.</div>`;
    return;
  }

  container.innerHTML = ativosDoVeio.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(0);
    let corBarra = "var(--success)";
    if (pct > 75) corBarra = "var(--panic)";
    if (pct > 85) corBarra = "var(--danger)";

    return `
      <div class="industrial-fluxo-card">
        <div class="ind-card-top">
          <div>
            <span class="ind-card-tag">${a.tipo}</span>
            <div class="ind-card-id">${a.id} ${a.acionada ? '⚡' : ''}</div>
          </div>
          <div class="ind-card-pos">${a.pos}</div>
        </div>
        
        <div class="ind-card-gauge">
          <div class="ind-gauge-bar">
            <div class="ind-gauge-fill" style="width: ${Math.min(pct, 100)}%; background: ${corBarra};"></div>
          </div>
          <div class="ind-gauge-text">
            <span>${pct}% de Desgaste</span>
            <span>${Math.round(a.ton).toLocaleString()} t</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// BANCO DE DADOS E TABELAS
// ==========================================================================
function renderAtivos() {
  const tbody = document.getElementById("ativos-table-body");
  const filtroEl = document.getElementById("filtro-tipo-ativo");
  if (!tbody || !filtroEl) return;

  const filterVal = filtroEl.value;
  let filtrados = BANCO_ATIVOS;

  if (filterVal === "ACIONADOS") {
    filtrados = BANCO_ATIVOS.filter(a => a.acionada === true);
  } else if (filterVal === "Bancada / Oficina") {
    filtrados = BANCO_ATIVOS.filter(a => a.local === "Bancada / Oficina");
  } else if (filterVal !== "TODOS") {
    filtrados = BANCO_ATIVOS.filter(a => a.tipo === filterVal);
  }

  tbody.innerHTML = filtrados.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let classe = "operação";
    if (pct > 85) classe = "reparo";
    if (a.local === "Bancada / Oficina") classe = "reserva";

    return `
      <tr>
        <td><strong>${a.id} ${a.acionada ? '⚡' : ''}</strong></td>
        <td><span class="ind-card-tag">${a.tipo}</span></td>
        <td><code>${a.local}</code></td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton).toLocaleString()}</td>
        <td><small>${a.meta.toLocaleString()}</small></td>
        <td><span class="status-pill ${classe}">${pct}%</span></td>
        <td>
          <button class="btn-xs-primary" onclick="sacarParaBancada('${a.id}')"><i class="fas fa-sign-out-alt"></i> Sacar</button>
        </td>
      </tr>
    `;
  }).join("");
}

function fazerCelulaEditavel(celula, id, campo) {
  if (!verificarAcesso()) return;
  if (celula.querySelector("input")) return;

  const original = celula.innerText;
  const input = document.createElement("input");
  input.type = "number";
  input.value = original.replace(/\./g, "").replace(/,/g, "");
  input.style.width = "85px";
  input.style.color = "#fff";
  input.style.background = "#000";
  input.style.border = "1px solid var(--accent-color)";
  
  celula.innerHTML = "";
  celula.appendChild(input);
  input.focus();

  const salvarEdicao = () => {
    const val = parseFloat(input.value) || 0;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
      const antigoValor = item[campo];
      item[campo] = val;
      localStorage.setItem("oms_ativos_v10", JSON.stringify(BANCO_ATIVOS));
      registrarOcorrenciaDigital(id, "Ajuste Manual", `Modificado ${campo.toUpperCase()} de ${antigoValor} para ${val}`);
    }
    renderAtivos();
  };

  input.addEventListener("blur", salvarEdicao);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") salvarEdicao(); });
}

function sacarParaBancada(id) {
  if (!verificarAcesso()) return;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (item) {
    if (item.local === "Bancada / Oficina") {
      alert("Este componente já se encontra na oficina.");
      return;
    }
    const localAntigo = item.local;
    item.local = "Bancada / Oficina";
    localStorage.setItem("oms_ativos_v10", JSON.stringify(BANCO_ATIVOS));
    registrarOcorrenciaDigital(id, "Retirada de Linha", `Ativo transferido para manutenção na bancada.`);
    alert(`Componente ${id} enviado para a Oficina.`);
    renderAtivos();
  }
}

// ==========================================================================
// INTEGRACAO REAL-TIME GOOGLE SHEETS VIA SHEET.BEST
// ==========================================================================
function registrarOcorrenciaDigital(ativoId, tipo, detalhe) {
  const dataHoraAtual = new Date().toLocaleString("pt-BR");
  const quemFez = OPERADOR_LOGADO ? `${OPERADOR_LOGADO.nome} (${OPERADOR_LOGADO.matricula})` : "Sistema";

  HISTORICO_EVENTOS.unshift({ data: dataHoraAtual, ativoId: ativoId, evento: tipo, detalhe: detalhe, executor: quemFez });
  localStorage.setItem("oms_historico_v10", JSON.stringify(HISTORICO_EVENTOS));

  const URL_API_SHEETBEST = "https://api.sheetbest.com/sheets/09ed7cf8-6b8d-4071-973c-19ec2515c448"; 

  fetch(URL_API_SHEETBEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dataHoraAtual, ativo: ativoId, evento: tipo, detalhe: detalhe, executor: quemFez })
  })
  .then(res => res.json())
  .then(data => console.log("Planilha integrada!"))
  .catch(err => console.error("Erro na integração:", err));

  renderHistorico();
}

function renderHistorico() {
  const tbody = document.getElementById("historico-eventos-body");
  if (!tbody) return;
  
  if (HISTORICO_EVENTOS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhum relato técnico registrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = HISTORICO_EVENTOS.slice(0, 10).map(h => `
    <tr>
      <td><small>${h.data}</small></td>
      <td><code>${h.ativoId || h.ativo}</code></td>
      <td><span class="ind-card-tag">${h.evento}</span></td>
      <td><small>${h.detalhe}</small></td>
      <td><strong>${h.executor}</strong></td>
    </tr>
  `).join("");
}

// FORMULÁRIO
function ajustarCamposIntervencao() {
  const tipo = document.getElementById("form-tipo-evento").value;
  document.getElementById("campo-os-numero").style.display = tipo === "Ordem de Servico" ? "block" : "none";
  document.getElementById("campo-abatimento").style.display = tipo === "Reparo Parcial" ? "block" : "none";
}

function inicializarAbaIntervencao() {
  const select = document.getElementById("form-ativo-alvo");
  if (select) {
    const ordenados = [...BANCO_ATIVOS].sort((a,b) => a.id.localeCompare(b.id));
    select.innerHTML = ordenados.map(a => `<option value="${a.id}">${a.id} - ${a.pos}</option>`).join("");
  }
  ajustarCamposIntervencao();
  renderHistorico();
}

function salvarIntervencao() {
  if (!verificarAcesso()) return;

  const id = document.getElementById("form-ativo-alvo").value;
  const tipo = document.getElementById("form-tipo-evento").value;
  const obs = document.getElementById("form-obs-evento").value.trim();
  
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (!item) return;

  let txtDetalhe = "";

  if (tipo === "Reparo Parcial") {
    const abt = parseFloat(document.getElementById("form-ton-abatida").value) || 0;
    item.ton = Math.max(0, item.ton - abt);
    txtDetalhe = `Efetuado reparo e abatimento de ${abt.toLocaleString()} TON.`;
  } else if (tipo === "Ordem de Servico") {
    const osNum = document.getElementById("form-os-input").value.trim() || "Não Informada";
    txtDetalhe = `Executada manutenção via O.S. SAP nº ${osNum}.`;
  } else if (tipo === "Troca de Componente") {
    const tAntiga = item.ton;
    item.ton = 0; 
    item.dias = 0;
    txtDetalhe = `Substituição realizada. Ciclo zerado (TON anterior: ${tAntiga.toLocaleString()}).`;
  } else {
    txtDetalhe = `Inspeção preventiva executada.`;
  }

  registrarOcorrenciaDigital(id, tipo, `${txtDetalhe} Obs: ${obs}`);
  localStorage.setItem("oms_ativos_v10", JSON.stringify(BANCO_ATIVOS));
  
  alert("Relato sincronizado na planilha com sucesso!");
  document.getElementById("form-obs-evento").value = "";
  inicializarAbaIntervencao();
}

function dispararEmergencia(tipo) {
  if (!verificarAcesso()) return;
  const dataHora = new Date().toLocaleString("pt-BR");
  EM_EMERGENCIA = `⚠️ CRÍTICO: Emergência acionada por ${OPERADOR_LOGADO.nome} (${dataHora})`;
  localStorage.setItem("oms_emergencia_v10", JSON.stringify(EM_EMERGENCIA));
  registrarOcorrenciaDigital("SISTEMA", "PÂNICO", `Botão de pânico pressionado: ${tipo}`);
  exibirBarraEmergencia();
}

function encerrarEmergencia() {
  EM_EMERGENCIA = null;
  localStorage.removeItem("oms_emergencia_v10");
  if (document.getElementById("barra-emergencia")) document.getElementById("barra-emergencia").style.display = "none";
}

function exibirBarraEmergencia() {
  const barra = document.getElementById("barra-emergencia");
  const txt = document.getElementById("texto-emergencia");
  if (barra && txt && EM_EMERGENCIA) {
    txt.innerText = EM_EMERGENCIA;
    barra.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarInterfaceUsuario();
  exibirBarraEmergencia();
  calcularKpisGlobais();
});