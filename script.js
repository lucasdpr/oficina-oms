// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS (VERSÃO COMPLETA DE PRODUÇÃO v16)
// ==========================================================================
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v16_local"));
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v16_local")) || [];

if (!BANCO_ATIVOS || BANCO_ATIVOS.length < 150) {
  BANCO_ATIVOS = [];
  
  // Mapeamento dos Veios da MCC 2 e MCC 3 (Cadeiras 43 à 79)
  const veiosMcc23 = [
    { mcc: 2, veio: "C" }, { mcc: 2, veio: "D" },
    { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }
  ];

  veiosMcc23.forEach(m => {
    const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
    
    BANCO_ATIVOS.push({ id: `MLD-2${m.veio}`, tipo: "Molde", local: vNome, pos: `Molde de Cobre - Veio ${m.veio}`, dias: 14, ton: 1000000, meta: 1200000 });
    BANCO_ATIVOS.push({ id: `OSC-2${m.veio}`, tipo: "Mesa Osciladora", local: vNome, pos: `Mesa Osciladora Bardella ${m.veio}`, dias: 65, ton: 610000, meta: 1800000 });
    BANCO_ATIVOS.push({ id: `SEG-0-2${m.veio}`, tipo: "Seguimento Zero", local: vNome, pos: "Segmento Zero Hitachi", dias: 38, ton: 142100, meta: 450000 });
    
    // Cadeiras 43 a 79
    for (let c = 43; c <= 79; c++) {
      let isTracionada = [45, 48, 52, 56, 60, 64, 68, 72, 76, 79].includes(c);
      
      BANCO_ATIVOS.push({ 
        id: `CAD-SUP-${c}-2${m.veio}`, 
        tipo: "Cadeira Superior", 
        local: vNome, 
        pos: `Cadeira Superior ${c} (Guia)`, 
        dias: 45, 
        ton: c === 43 ? 1438977 : 943444, 
        meta: 2000000 
      });

      BANCO_ATIVOS.push({ 
        id: `CAD-INF-${c}-2${m.veio}`, 
        tipo: "Cadeira Inferior", 
        local: vNome, 
        pos: `Cadeira Inferior ${c} ${isTracionada ? '(⚡)' : '(Livre)'}`, 
        dias: 50, 
        ton: c === 43 ? 1348264 : 1414185, 
        meta: 2500000,
        acionada: isTracionada
      });
    }
  });

  // CONFIGURAÇÃO DA MCC 4
  const veiosMcc4 = ["A", "B"];
  veiosMcc4.forEach(veio => {
    const vNome = `MCC 4 - Veio ${veio}`;
    BANCO_ATIVOS.push({ id: `MLD-4${veio}`, tipo: "Molde", local: vNome, pos: "Molde de Alta Performance", dias: 12, ton: 180000, meta: 1000000 });
    BANCO_ATIVOS.push({ id: `BND-4${veio}`, tipo: "Bender", local: vNome, pos: "Segmento Dobrador (Bender)", dias: 45, ton: 520000, meta: 1500000 });
    
    for (let b = 1; b <= 5; b++) {
      BANCO_ATIVOS.push({ id: `BOW-${b}-4${veio}`, tipo: "Bow", local: vNome, pos: `Segmento Curvo Bow #0${b}`, dias: 60, ton: 650000, meta: 1600000 });
    }
    BANCO_ATIVOS.push({ id: `STR-4${veio}`, tipo: "Straightener", local: vNome, pos: "Segmento Endireitador", dias: 88, ton: 910000, meta: 1800000 });
    for (let h = 1; h <= 6; h++) {
      BANCO_ATIVOS.push({ id: `HOR-${h}-4${veio}`, tipo: "Horizontal", local: vNome, pos: `Segmento Horizontal #0${h}`, dias: 102, ton: 430000, meta: 2000000 });
    }
  });

  localStorage.setItem("oms_ativos_v16_local", JSON.stringify(BANCO_ATIVOS));
}

let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v16_local")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v16_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

const CADASTRO_MATRICULAS = {
  "40090430": "Filipe Silva Souza (Líder)",
  "40075827": "Denilson Jose de Oliveira (Líder)",
  "40080751": "Valmir de Paula da Silva (Líder)",
  "40090851": "Samuel dos Santos Generoso (Líder)",
  "1011": "Supervisor de Área"
};

function processarAutenticacaoHome() {
  const nomeInput = document.getElementById("login-nome").value.trim();
  const matriculaInput = document.getElementById("login-matricula").value.trim();

  if (!nomeInput || !matriculaInput) {
    alert("Por favor, preencha todos os campos do terminal.");
    return;
  }

  if (CADASTRO_MATRICULAS[matriculaInput]) {
    OPERADOR_LOGADO = { matricula: matriculaInput, nome: `${nomeInput} [${CADASTRO_MATRICULAS[matriculaInput]}]` };
    localStorage.setItem("oms_operador_v16_local", JSON.stringify(OPERADOR_LOGADO));
    
    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";
    
    atualizarInterfaceUsuario();
    registrarHistorico("SISTEMA", `Líder ${nomeInput} realizou login no terminal.`);
    calcularKpisGlobais();
    renderPainelVeios();
    renderAtivos();
  } else {
    alert("Falha de Autenticação: Matrícula não localizada.");
  }
}

function registrarHistorico(tag, acao) {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');
  const responsavel = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema Automático";
  
  HISTORICO_ACOES.unshift({ data: dataFormatada, tag: tag, acao: acao, responsavel: responsavel });
  if (HISTORICO_ACOES.length > 50) HISTORICO_ACOES.pop(); // Mantém os últimos 50 registros
  
  localStorage.setItem("oms_historico_v16_local", JSON.stringify(HISTORICO_ACOES));
  renderHistorico();
}

function renderHistorico() {
  const tbody = document.getElementById("historico-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = HISTORICO_ACOES.map(h => `
    <tr>
      <td><small class="text-muted">${h.data}</small></td>
      <td><span class="mcc-tag-tipo">${h.tag}</span></td>
      <td><strong>${h.acao}</strong></td>
      <td><small>${h.responsavel}</small></td>
    </tr>
  `).join("");
}

function fazerLogout() {
  if (confirm("Deseja encerrar o turno?")) {
    registrarHistorico("SISTEMA", "Turno encerrado pelo operador.");
    OPERADOR_LOGADO = null;
    localStorage.removeItem("oms_operador_v16_local");
    document.getElementById("container-sistema-oms").style.display = "none";
    document.getElementById("tela-login-home").style.display = "flex";
  }
}

function verificarAcesso() {
  if (!OPERADOR_LOGADO) {
    document.getElementById("container-sistema-oms").style.display = "none";
    document.getElementById("tela-login-home").style.display = "flex";
    return false;
  }
  return true;
}

function abrirAba(event, idAba) {
  if (event) event.preventDefault();
  
  document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
  
  const navItem = document.getElementById(idAba.replace("aba-", "nav-"));
  if (navItem) navItem.classList.add("active");
  
  const abaAlvo = document.getElementById(idAba);
  if (abaAlvo) abaAlvo.classList.add("active");

  if (idAba === "aba-mcc2") renderizarGraficosMCC(2);
  if (idAba === "aba-mcc3") renderizarGraficosMCC(3);
  if (idAba === "aba-mcc4") renderizarGraficosMCC(4);

  const seletorVeios = document.getElementById("seletor-veios-container");
  if (seletorVeios) {
    if (idAba === "aba-fluxo" || idAba === "aba-ativos") {
      seletorVeios.classList.remove("hidden");
    } else {
      seletorVeios.classList.add("hidden");
    }
  }
}

function mudarVeioVisualizado(veioNome) {
  VEIO_SELECIONADO_PAINEL = veioNome;
  document.querySelectorAll(".btn-veio-tab").forEach(btn => {
    if (btn.getAttribute("onclick").includes(`'${veioNome}'`)) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  renderPainelVeios();
  renderAtivos();
}

function atualizarInterfaceUsuario() {
  document.getElementById("nome-operador-logado").innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
  renderHistorico();
}

function calcularKpisGlobais() {
  let criticos = 0, bancada = 0, moldesDisponiveis = 0;
  BANCO_ATIVOS.forEach(a => {
    const pct = (a.ton / a.meta) * 100;
    if (pct > 85 && a.local !== "Bancada / Oficina") criticos++;
    if (a.local === "Bancada / Oficina") bancada++;
    if (a.tipo === "Molde" && a.local === "Bancada / Oficina" && pct < 50) moldesDisponiveis++;
  });
  document.getElementById("kpi-criticos").innerText = criticos;
  document.getElementById("kpi-bancada").innerText = bancada;
  document.getElementById("kpi-moldes").innerText = moldesDisponiveis;
}

// RENDERIZAÇÃO EM GRID ESPELHADO DO SEQUENCIAMENTO SÍNCRONO
function renderPainelVeios() {
  const container = document.getElementById("container-fluxo-horizontal-scroll");
  const titulo = document.getElementById("titulo-veio-focado");
  if (!container || !titulo) return;

  titulo.innerHTML = `<i class="fas fa-stream"></i> Sequenciamento Dinâmico Síncrono: <strong style="color:var(--text-accent)">Veio ${VEIO_SELECIONADO_PAINEL}</strong>`;
  
  let ativosDoVeio = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`));

  if (ativosDoVeio.length === 0) {
    container.innerHTML = `<div class="vazio" style="color:var(--text-muted); padding: 20px;">Nenhum componente cadastrado para o Veio ${VEIO_SELECIONADO_PAINEL}.</div>`;
    return;
  }

  container.innerHTML = ativosDoVeio.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let corBarra = "var(--success)"; 
    if (pct > 70) corBarra = "var(--warning)"; 
    if (pct > 85) corBarra = "var(--danger)"; 

    return `
      <div class="mcc-grafico-card" style="border-left: 4px solid ${corBarra};">
        <div class="mcc-grafico-header">
          <div class="mcc-grafico-info">
            <span class="mcc-tag-id"><strong>${a.id}</strong></span>
            <span class="mcc-tag-tipo">${a.tipo}</span>
          </div>
          <div class="mcc-grafico-porcentagem" style="color: ${corBarra}; font-weight:700;">
            ${pct}%
          </div>
        </div>
        <div class="mcc-grafico-pos">${a.pos}</div>
        <div class="ind-gauge-bar">
          <div class="ind-gauge-fill" style="width: ${Math.min(pct, 100)}%; background: ${corBarra};"></div>
        </div>
        <div class="grafico-legenda">
          <span>Acumulado: <strong>${Math.round(a.ton).toLocaleString()} t</strong></span>
          <span>Meta: ${a.meta.toLocaleString()} t</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderAtivos() {
  const tbody = document.getElementById("ativos-table-body");
  const filtroEl = document.getElementById("filtro-tipo-ativo");
  if (!tbody || !filtroEl) return;

  let filtrados = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value === "Bancada / Oficina");
  if (filtroEl.value === "Bancada / Oficina") filtrados = BANCO_ATIVOS.filter(a => a.local === "Bancada / Oficina");
  else if (filtroEl.value !== "TODOS") filtrados = filtrados.filter(a => a.tipo === filtroEl.value);

  tbody.innerHTML = filtrados.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let classe = pct > 85 ? "reparo" : (a.local === "Bancada / Oficina" ? "reserva" : "operação");

    return `
      <tr>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')"><strong>${a.id}</strong></td>
        <td><span class="ind-card-tag">${a.tipo}</span></td>
        <td><code>${a.local}</code></td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton).toLocaleString()}</td>
        <td><small>${a.meta.toLocaleString()}</small></td>
        <td><span class="status-pill ${classe}">${pct}%</span></td>
        <td><button class="btn-xs-primary" onclick="sacarParaBancada('${a.id}')">Sacar p/ Oficina</button></td>
      </tr>
    `;
  }).join("");
}

function fazerCelulaEditavel(celula, id, campo) {
  if (!verificarAcesso() || celula.querySelector("input")) return;
  const original = celula.innerText.trim();
  const input = document.createElement("input");
  input.type = campo === 'id' ? "text" : "number";
  input.value = original.replace(/\./g, "");
  input.style = "width:100px; background:#000; color:#fff; border:1px solid var(--text-accent);";
  
  celula.innerHTML = "";
  celula.appendChild(input);
  input.focus();

  const salvar = () => {
    let val = campo === 'id' ? input.value.trim().toUpperCase() : parseFloat(input.value) || 0;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item && val !== "") { 
      let antigoValor = item[campo];
      item[campo] = val; 
      localStorage.setItem("oms_ativos_v16_local", JSON.stringify(BANCO_ATIVOS)); 
      registrarHistorico(id, `Alterou ${campo.toUpperCase()} de ${antigoValor} para ${val}`);
    }
    renderAtivos(); renderPainelVeios(); calcularKpisGlobais();
  };
  input.addEventListener("blur", salvar);
}

function sacarParaBancada(id) {
  if (!verificarAcesso()) return;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (item) { 
    let localAntigo = item.local;
    item.local = "Bancada / Oficina"; 
    localStorage.setItem("oms_ativos_v16_local", JSON.stringify(BANCO_ATIVOS)); 
    registrarHistorico(id, `Componente sacado da linha (${localAntigo}) para Oficina`);
    renderAtivos(); 
    renderPainelVeios();
    calcularKpisGlobais();
  }
}

function dispararEmergencia() {
  EM_EMERGENCIA = `⚠️ ALERTA PARICO - INTERVENÇÃO FORÇADA`;
  localStorage.setItem("oms_emergencia_v16_local", JSON.stringify(EM_EMERGENCIA));
  registrarHistorico("ALERTA", "Botão de Pânico acionado manualmente!");
  exibirBarraEmergencia();
}

function encerrarEmergencia() { 
  EM_EMERGENCIA = null; 
  localStorage.removeItem("oms_emergencia_v16_local"); 
  document.getElementById("barra-emergencia").style.display = "none"; 
  registrarHistorico("ALERTA", "Alarme geral resetado.");
}

function exibirBarraEmergencia() { if (EM_EMERGENCIA) { document.getElementById("texto-emergencia").innerText = EM_EMERGENCIA; document.getElementById("barra-emergencia").style.display = "block"; } }

function renderizarGraficosMCC(mccNumero) {
  const container = document.getElementById(`graficos-mcc${mccNumero}`);
  if (!container) return;
  container.innerHTML = "";
  
  const filtrados = BANCO_ATIVOS.filter(a => a.local.includes(`MCC ${mccNumero}`));
  filtrados.forEach(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let cor = pct > 85 ? "var(--danger)" : (pct > 70 ? "var(--warning)" : "var(--success)");
    container.innerHTML += `
      <div class="mcc-grafico-card" style="border-left: 4px solid ${cor};">
        <div class="mcc-grafico-header">
          <div class="mcc-grafico-info"><span class="mcc-tag-id"><strong>${a.id}</strong></span><span class="mcc-tag-tipo">${a.tipo}</span></div>
          <div class="mcc-grafico-porcentagem" style="color:${cor};"><strong>${pct}%</strong></div>
        </div>
        <div class="mcc-grafico-pos">${a.pos}</div>
        <div class="ind-gauge-bar"><div class="ind-gauge-fill" style="width:${Math.min(pct,100)}%; background:${cor};"></div></div>
        <div class="grafico-legenda"><span>Acumulado: <strong>${Math.round(a.ton).toLocaleString()} t</strong></span><span>Meta: ${a.meta.toLocaleString()} t</span></div>
      </div>`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  exibirBarraEmergencia();
  if (OPERADOR_LOGADO) {
    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";
    atualizarInterfaceUsuario(); calcularKpisGlobais(); renderPainelVeios(); renderAtivos();
  }
});