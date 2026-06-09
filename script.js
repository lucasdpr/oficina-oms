// ==========================================================================
// BANCO DE DADOS CORE - SISTEMA OMS (VERSÃO COMPLETA DE PRODUÇÃO v27)
// ==========================================================================
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v27_local"));
let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v27_local")) || [];

// DICIONÁRIO DE MOTIVOS DE RETIRADA POR EQUIPAMENTO
const MOTIVOS_RETIRO = {
  "Molde": ["Desgaste de placa", "Ranhura de placa", "Falha no cilindro", "Fim de vida", "Trava da bender", "Alarme de B.O", "B.O", "Rolete travado", "Outros"],
  "Segmento Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Bow": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Straightener": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Bender": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Seguimento Zero": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
  "Cadeira Superior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
  "Cadeira Inferior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
  "Mesa Osciladora": ["Desgaste", "Falha mecânica", "Fim de vida", "Outros"],
  "Outros": ["Fim de vida", "Quebra", "Manutenção Preventiva", "Outros"]
};

function getOrdemPadrao(tipo) {
  if(tipo === "Molde") return 10;
  if(tipo === "Mesa Osciladora") return 20;
  if(tipo === "Seguimento Zero") return 30;
  if(tipo === "Bender") return 40;
  if(tipo === "Cadeira Superior") return 100;
  if(tipo === "Cadeira Inferior") return 200;
  if(tipo === "Bow") return 300;
  if(tipo === "Straightener") return 400;
  if(tipo === "Horizontal") return 500;
  return 999;
}

if (!BANCO_ATIVOS || BANCO_ATIVOS.length < 150) {
  BANCO_ATIVOS = [];
  
  const veiosMcc23 = [{ mcc: 2, veio: "C" }, { mcc: 2, veio: "D" }, { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }];
  veiosMcc23.forEach(m => {
    const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
    BANCO_ATIVOS.push({ id: `MLD-2${m.veio}`, tipo: "Molde", local: vNome, pos: `Molde Veio ${m.veio}`, dias: 14, ton: 1000000, meta: 1200000, ordem: 10 });
    BANCO_ATIVOS.push({ id: `OSC-2${m.veio}`, tipo: "Mesa Osciladora", local: vNome, pos: `Osciladora ${m.veio}`, dias: 65, ton: 610000, meta: 1800000, ordem: 20 });
    BANCO_ATIVOS.push({ id: `SEG-0-2${m.veio}`, tipo: "Seguimento Zero", local: vNome, pos: "Segmento Zero", dias: 38, ton: 142100, meta: 450000, ordem: 30 });
    
    for (let c = 43; c <= 79; c++) {
      let isTracionada = [45, 48, 52, 56, 60, 64, 68, 72, 76, 79].includes(c);
      BANCO_ATIVOS.push({ id: `CAD-SUP-${c}-2${m.veio}`, tipo: "Cadeira Superior", local: vNome, pos: `Cad Sup ${c}`, dias: 45, ton: c === 43 ? 1438977 : 943444, meta: 2000000, ordem: 100 + c });
      BANCO_ATIVOS.push({ id: `CAD-INF-${c}-2${m.veio}`, tipo: "Cadeira Inferior", local: vNome, pos: `Cad Inf ${c} ${isTracionada ? '(⚡)' : ''}`, dias: 50, ton: c === 43 ? 1348264 : 1414185, meta: 2500000, ordem: 200 + c });
    }
  });

  const veiosMcc4 = ["H", "G"];
  veiosMcc4.forEach(veio => {
    const vNome = `MCC 4 - Veio ${veio}`;
    BANCO_ATIVOS.push({ id: `MLD-4${veio}`, tipo: "Molde", local: vNome, pos: "Molde Alta Perf.", dias: 12, ton: 180000, meta: 1000000, ordem: 10 });
    BANCO_ATIVOS.push({ id: `BND-4${veio}`, tipo: "Bender", local: vNome, pos: "Dobrador (Bender)", dias: 45, ton: 520000, meta: 1500000, ordem: 40 });
    for (let b = 1; b <= 5; b++) {
        BANCO_ATIVOS.push({ id: `BOW-${b}-4${veio}`, tipo: "Bow", local: vNome, pos: `Curvo Bow #0${b}`, dias: 60, ton: 650000, meta: 1600000, ordem: 300 + b });
    }
    for (let s = 1; s <= 2; s++) {
        BANCO_ATIVOS.push({ id: `STR-${s}-4${veio}`, tipo: "Straightener", local: vNome, pos: `Endireitador #0${s}`, dias: 88, ton: 910000, meta: 1800000, ordem: 400 + s });
    }
    for (let h = 1; h <= 10; h++) {
        BANCO_ATIVOS.push({ id: `HOR-${h}-4${veio}`, tipo: "Horizontal", local: vNome, pos: `Horizontal #0${h}`, dias: 102, ton: 430000, meta: 2000000, ordem: 500 + h });
    }
  });

  BANCO_ATIVOS.push({ id: `MLD-RES-01`, tipo: "Molde", local: "Oficina / Reserva", pos: "Estoque Central", dias: 0, ton: 0, meta: 1200000, ordem: 10 });
  BANCO_ATIVOS.push({ id: `BOW-REP-04`, tipo: "Bow", local: "Oficina / Reparo", pos: "Bancada", dias: 65, ton: 1550000, meta: 1600000, ordem: 301 });

  localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS));
}

let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v27_local")) || null;
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v27_local")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

const CADASTRO_MATRICULAS = {
  "40090430": "Filipe (Líder)", 
  "40075827": "Denilson (Líder)",
  "40080751": "Valmir (Líder)", 
  "40090851": "Samuel (Líder)", 
  "1011": "Supervisor"
};

let MODO_MODAL_RELATORIO = {};
let ID_REPARO_ATUAL = null;
let ID_HISTORICO_ATUAL = null;

// FUNÇÃO PARA MENU MOBILE
function toggleSidebar() {
  document.getElementById('sidebar-menu').classList.toggle('open');
}

function processarAutenticacaoHome() {
  const nomeInput = document.getElementById("login-nome").value.trim();
  const matriculaInput = document.getElementById("login-matricula").value.trim();
  
  if (!nomeInput || !matriculaInput) {
      return alert("Preencha todos os campos.");
  }

  if (CADASTRO_MATRICULAS[matriculaInput]) {
    OPERADOR_LOGADO = { matricula: matriculaInput, nome: `${nomeInput} [${CADASTRO_MATRICULAS[matriculaInput]}]` };
    localStorage.setItem("oms_operador_v27_local", JSON.stringify(OPERADOR_LOGADO));
    
    // CORREÇÃO AQUI: display flex no container principal para manter lado a lado no PC
    document.getElementById("tela-login-home").style.display = "none";
    document.getElementById("container-sistema-oms").style.display = "flex";
    
    atualizarInterfaceUsuario(); 
    registrarHistorico("AUTENTICAÇÃO", `Login executado com sucesso.`);
    calcularKpisGlobais(); 
    renderPainelVeios(); 
    renderAtivos(); 
    renderReparos(); 
    renderReservas();
  } else {
    alert("Falha: Matrícula não localizada.");
  }
}

function registrarHistorico(tag, acao) {
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR') + " " + agora.toLocaleTimeString('pt-BR');
  
  HISTORICO_ACOES.unshift({ 
      data: data, 
      tag: tag, 
      acao: acao, 
      responsavel: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" 
  });
  
  if (HISTORICO_ACOES.length > 2000) {
      HISTORICO_ACOES.pop(); 
  }
  
  localStorage.setItem("oms_historico_v27_local", JSON.stringify(HISTORICO_ACOES));
  renderHistorico();
}

function renderHistorico() {
  const tbody = document.getElementById("historico-table-body");
  if (!tbody) return;
  
  tbody.innerHTML = HISTORICO_ACOES.map(h => `
    <tr>
        <td><small class="text-muted">${h.data}</small></td>
        <td><span class="ind-card-tag bg-tag">${h.tag}</span></td>
        <td>${h.acao}</td>
        <td><small>${h.responsavel}</small></td>
    </tr>
  `).join("");
}

function fazerLogout() {
  if (confirm("Encerrar o turno?")) {
    registrarHistorico("SISTEMA", "Turno encerrado.");
    OPERADOR_LOGADO = null; 
    localStorage.removeItem("oms_operador_v27_local");
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
  
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  
  document.getElementById(idAba.replace("aba-", "nav-")).classList.add("active");
  document.getElementById(idAba).classList.add("active");

  if (idAba === "aba-mcc2") renderizarGraficosMCC(2, 'TODOS');
  if (idAba === "aba-mcc3") renderizarGraficosMCC(3, 'TODOS');
  if (idAba === "aba-mcc4") renderizarGraficosMCC(4, 'TODOS');
  if (idAba === "aba-reparos") renderReparos();
  if (idAba === "aba-reservas") renderReservas();
  if (idAba === "aba-historico") renderHistorico();

  const selVeios = document.getElementById("seletor-veios-container");
  if (idAba === "aba-fluxo" || idAba === "aba-ativos") {
      selVeios.classList.remove("hidden");
  } else {
      selVeios.classList.add("hidden");
  }

  // FECHAR MENU NO MOBILE APÓS CLICAR
  if (window.innerWidth <= 992) {
    document.getElementById('sidebar-menu').classList.remove('open');
  }
}

function mudarVeioVisualizado(veioNome) {
  VEIO_SELECIONADO_PAINEL = veioNome;
  
  document.querySelectorAll(".btn-veio-tab").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("onclick").includes(`'${veioNome}'`));
  });
  
  renderPainelVeios(); 
  renderAtivos();
}

function atualizarInterfaceUsuario() {
  document.getElementById("nome-operador-logado").innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
  renderHistorico();
}

function calcularKpisGlobais() {
  let c = 0, rep = 0, res = 0;
  
  BANCO_ATIVOS.forEach(a => {
    const pct = (a.ton / a.meta) * 100;
    if (pct > 85 && !a.local.includes("Oficina")) c++;
    if (a.local === "Oficina / Reparo") rep++;
    if (a.local === "Oficina / Reserva") res++;
  });
  
  document.getElementById("kpi-criticos").innerText = c;
  document.getElementById("kpi-reparo").innerText = rep;
  document.getElementById("kpi-reserva").innerText = res;
}

function renderPainelVeios() {
  const container = document.getElementById("container-fluxo-horizontal-scroll");
  const titulo = document.getElementById("titulo-veio-focado");
  if (!container || !titulo) return;

  titulo.innerHTML = `Sequenciamento Dinâmico: <span style="color:var(--text-accent)">Veio ${VEIO_SELECIONADO_PAINEL}</span>`;
  
  let ativos = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`));
  ativos.sort((a, b) => a.ordem - b.ordem);

  if (ativos.length === 0) {
      return container.innerHTML = `<div class="vazio">Nenhum componente instalado no Veio ${VEIO_SELECIONADO_PAINEL}.</div>`;
  }
  
  container.innerHTML = ativos.map(gerarCardGraficoHTML).join("");
}

function gerarCardGraficoHTML(a) {
  const pct = ((a.ton / a.meta) * 100).toFixed(1);
  let cor = pct > 85 ? "var(--danger)" : (pct > 70 ? "var(--warning)" : "var(--success)");
  
  return `
    <div class="mcc-grafico-card premium-shadow" style="border-top: 3px solid ${cor};">
      <div class="mcc-grafico-header">
        <div class="mcc-grafico-info">
          <span class="mcc-tag-id">${a.id}</span>
          <span class="ind-card-tag bg-tag">${a.tipo}</span>
        </div>
        <div class="mcc-grafico-porcentagem" style="color:${cor};">${pct}%</div>
      </div>
      <div class="mcc-grafico-pos text-muted">${a.pos}</div>
      <div class="ind-gauge-bar premium-bar">
        <div class="ind-gauge-fill" style="width:${Math.min(pct,100)}%; background:${cor};"></div>
      </div>
      <div class="grafico-legenda" style="margin-bottom: 10px;">
        <span>Ton: <strong>${Math.round(a.ton).toLocaleString()}</strong></span>
        <span>Lim: ${a.meta.toLocaleString()}</span>
      </div>
      <button class="btn-xs-primary w-100" style="border: 1px dashed var(--text-accent); color: var(--text-accent); background: rgba(56,189,248,0.05); padding: 8px; border-radius: 4px; cursor: pointer;" onclick="abrirHistoricoIndividual('${a.id}')">
        <i class="fas fa-book-open"></i> Ver Prontuário
      </button>
    </div>`;
}

function abrirHistoricoIndividual(id) {
  ID_HISTORICO_ATUAL = id;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if(!item) return;

  document.getElementById("hist-tag-nome").innerText = item.id;
  document.getElementById("hist-tag-local").innerText = item.local;
  renderizarTabelaHistoricoIndividual(id);
  document.getElementById("modal-historico-ativo").classList.remove("hidden");
}

function fecharModalHistorico() {
  document.getElementById("modal-historico-ativo").classList.add("hidden");
  ID_HISTORICO_ATUAL = null; 
  document.getElementById("input-nota-manual").value = "";
}

function renderizarTabelaHistoricoIndividual(id) {
  let tbody = document.getElementById("tabela-historico-individual");
  let historicoFiltrado = HISTORICO_ACOES.filter(h => h.tag === id || h.acao.includes(id));
  
  if(historicoFiltrado.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum evento registrado.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = historicoFiltrado.map(h => `
    <tr>
        <td style="font-size: 11px; white-space: nowrap; color: var(--text-muted);">${h.data}</td>
        <td style="font-size: 13px;">${h.acao}</td>
        <td style="font-size: 11px; color: var(--text-accent);">${h.responsavel}</td>
    </tr>
  `).join("");
}

function salvarRegistroManual() {
  if(!verificarAcesso() || !ID_HISTORICO_ATUAL) return;
  
  const nota = document.getElementById("input-nota-manual").value.trim();
  if(!nota) {
      return alert("Escreva algo para registrar.");
  }
  
  registrarHistorico(ID_HISTORICO_ATUAL, `<span style="color:var(--text-accent);">[REGISTRO MANUAL]</span> ${nota}`);
  document.getElementById("input-nota-manual").value = ""; 
  renderizarTabelaHistoricoIndividual(ID_HISTORICO_ATUAL);
}

function abrirModalRelatorio(item) {
  document.getElementById('modal-tag').innerText = item.id;
  
  let select = document.getElementById('modal-motivo');
  let motivos = MOTIVOS_RETIRO[item.tipo] || MOTIVOS_RETIRO["Outros"];
  
  select.innerHTML = motivos.map(m => `<option value="${m}">${m}</option>`).join('');
  document.getElementById('modal-condicao').value = '';
  document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() { 
    document.getElementById('modal-relatorio').classList.add('hidden'); 
    MODO_MODAL_RELATORIO = {}; 
}

function iniciarSaque(id) {
  if (!verificarAcesso()) return;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (!item) return;
  
  MODO_MODAL_RELATORIO = { tipoAcao: 'SAQUE', idSacado: id };
  abrirModalRelatorio(item);
}

function confirmarRelatorio() {
  let motivo = document.getElementById('modal-motivo').value;
  let condicao = document.getElementById('modal-condicao').value.trim();
  
  if(!condicao) {
      return alert("Por favor, descreva como o equipamento chegou na oficina (Laudo Visual).");
  }

  let textoLaudo = `<br><span style="color:var(--warning); font-size:12px;"><strong>Motivo:</strong> ${motivo} | <strong>Condição:</strong> ${condicao}</span>`;

  if (MODO_MODAL_RELATORIO.tipoAcao === 'SAQUE') {
      executarSaqueFinal(MODO_MODAL_RELATORIO.idSacado, textoLaudo);
  } else if (MODO_MODAL_RELATORIO.tipoAcao === 'SWAP') {
      executarSwapFinal(MODO_MODAL_RELATORIO.idReserva, MODO_MODAL_RELATORIO.idSacado, MODO_MODAL_RELATORIO.localDestino, textoLaudo);
  }
  
  fecharModalRelatorio();
}

function executarSaqueFinal(id, laudo) {
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (item) { 
    let loc = item.local; 
    item.local = "Oficina / Reparo"; 
    
    localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS)); 
    registrarHistorico(id, `Sacado da linha (${loc}) p/ Reparo. ${laudo}`);
    
    renderAtivos(); 
    renderPainelVeios(); 
    calcularKpisGlobais(); 
    renderReparos(); 
    renderReservas(); 
  }
}

function abrirModalConcluirReparo(id) {
  ID_REPARO_ATUAL = id;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if(!item) return;

  document.getElementById("modal-reparo-tag").innerText = item.id;
  document.getElementById("modal-tipo-reparo").value = "GERAL";
  document.getElementById("modal-reparo-ton").value = Math.round(item.ton);
  document.getElementById("modal-reparo-dias").value = item.dias;
  
  toggleCamposReparoParcial();
  document.getElementById("modal-concluir-reparo").classList.remove("hidden");
}

function fecharModalConcluirReparo() { 
    document.getElementById("modal-concluir-reparo").classList.add("hidden"); 
    ID_REPARO_ATUAL = null; 
}

function toggleCamposReparoParcial() {
  const tipo = document.getElementById("modal-tipo-reparo").value;
  const divCampos = document.getElementById("campos-reparo-parcial");
  if(tipo === "PARCIAL") {
      divCampos.classList.remove("hidden");
  } else {
      divCampos.classList.add("hidden");
  }
}

function confirmarConclusaoReparo() {
  if (!verificarAcesso() || !ID_REPARO_ATUAL) return;
  let item = BANCO_ATIVOS.find(a => a.id === ID_REPARO_ATUAL);
  if (!item) return;

  const tipo = document.getElementById("modal-tipo-reparo").value;
  let msgHistorico = "";

  if(tipo === "GERAL") {
    item.ton = 0; 
    item.dias = 0; 
    msgHistorico = "Reparo GERAL finalizado. Tonelagem zerada.";
  } else {
    let novaTon = parseFloat(document.getElementById("modal-reparo-ton").value) || 0;
    let novosDias = parseFloat(document.getElementById("modal-reparo-dias").value) || 0;
    item.ton = novaTon; 
    item.dias = novosDias; 
    msgHistorico = `Reparo PARCIAL finalizado. Retorna com ${novaTon}t e ${novosDias} dias.`;
  }

  item.local = "Oficina / Reserva"; 
  localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS));
  registrarHistorico(item.id, msgHistorico);
  
  fecharModalConcluirReparo(); 
  renderReparos(); 
  renderReservas(); 
  renderAtivos(); 
  calcularKpisGlobais();
}

function renderReparos() {
  const repBody = document.getElementById("reparos-table-body");
  if (!repBody) return;
  
  const reparos = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
  
  if (reparos.length === 0) {
    repBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento aguardando reparo.</td></tr>`;
  } else {
    repBody.innerHTML = reparos.map(a => {
      const pct = ((a.ton / a.meta) * 100).toFixed(1);
      return `
        <tr>
          <td class="font-code">${a.id}</td>
          <td><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
          <td>
            <div class="flex-align-center gap-10">
              <span class="font-code bold w-40">${pct}%</span>
              <div class="ind-gauge-bar premium-bar w-100px">
                <div class="ind-gauge-fill bg-danger" style="width: ${Math.min(pct, 100)}%;"></div>
              </div>
            </div>
          </td>
          <td>
            <div class="flex-align-center gap-10 action-buttons-mobile">
              <button class="btn-premium btn-warning" onclick="abrirModalConcluirReparo('${a.id}')"><i class="fas fa-hammer"></i> Concluir</button>
              <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }
}

function renderReservas() {
  const resBody = document.getElementById("estoque-table-body");
  if (!resBody) return;
  
  const reservas = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
  
  if (reservas.length === 0) {
    resBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Estoque vazio. Nenhuma peça reserva disponível.</td></tr>`;
  } else {
    resBody.innerHTML = reservas.map(a => {
      const isZerado = a.ton === 0 ? `<i class="fas fa-check"></i> Zerado` : `<i class="fas fa-adjust"></i> Parcial (${a.ton}t)`;
      return `
        <tr>
          <td class="font-code">${a.id}</td>
          <td><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
          <td><span class="status-pill reserva">${isZerado}</span></td>
          <td>
            <div class="flex-align-center gap-10 action-buttons-mobile">
              <select id="alocar-veio-${a.id}" class="premium-select select-sm">
                <option value="MCC 2 - Veio C">Veio C</option>
                <option value="MCC 2 - Veio D">Veio D</option>
                <option value="MCC 3 - Veio E">Veio E</option>
                <option value="MCC 3 - Veio F">Veio F</option>
                <option value="MCC 4 - Veio H">Veio H</option>
                <option value="MCC 4 - Veio G">Veio G</option>
              </select>
              <button class="btn-premium btn-success" onclick="iniciarSwapAlocacao('${a.id}')"><i class="fas fa-exchange-alt"></i> Swap</button>
              <button class="btn-premium" style="background:transparent; border-color:var(--text-accent); color:var(--text-accent); padding: 8px 12px;" onclick="abrirHistoricoIndividual('${a.id}')" title="Ver Prontuário"><i class="fas fa-book-open"></i></button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }
}

function iniciarSwapAlocacao(idReserva) {
  if (!verificarAcesso()) return;
  
  const novoLocal = document.getElementById(`alocar-veio-${idReserva}`).value;
  let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
  
  if (pecaReserva) {
    let pecaAntiga = BANCO_ATIVOS.find(a => a.local === novoLocal && a.tipo === pecaReserva.tipo);
    if (pecaAntiga) {
      if (confirm(`A peça ${pecaAntiga.id} será SACADA do ${novoLocal} para dar lugar à ${pecaReserva.id}. Precisamos do relatório de retirada.`)) {
        MODO_MODAL_RELATORIO = { tipoAcao: 'SWAP', idSacado: pecaAntiga.id, idReserva: pecaReserva.id, localDestino: novoLocal };
        abrirModalRelatorio(pecaAntiga);
      }
    } else {
      if (confirm(`Instalar a reserva ${pecaReserva.id} no ${novoLocal}?`)) {
        pecaReserva.local = novoLocal; 
        pecaReserva.pos = "Componente Instalado"; 
        pecaReserva.ordem = getOrdemPadrao(pecaReserva.tipo); 
        
        localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS));
        registrarHistorico(pecaReserva.id, `Alocado no ${novoLocal}.`);
        
        renderReparos(); 
        renderReservas(); 
        renderAtivos(); 
        renderPainelVeios(); 
        calcularKpisGlobais();
      }
    }
  }
}

function executarSwapFinal(idReserva, idAntiga, novoLocal, laudo) {
  let pecaAntiga = BANCO_ATIVOS.find(a => a.id === idAntiga);
  let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
  
  if (pecaAntiga && pecaReserva) {
    pecaAntiga.local = "Oficina / Reparo";
    registrarHistorico(pecaAntiga.id, `Sacado do ${novoLocal} (Substituição). ${laudo}`);
    
    pecaReserva.local = novoLocal; 
    pecaReserva.pos = pecaAntiga.pos; 
    pecaReserva.ordem = pecaAntiga.ordem; 
    
    localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS));
    registrarHistorico(pecaReserva.id, `Alocado no ${novoLocal} substituindo ${pecaAntiga.id}.`);
    
    renderReparos(); 
    renderReservas(); 
    renderAtivos(); 
    renderPainelVeios(); 
    calcularKpisGlobais();
  }
}

function toggleFormAdicionar() { 
    document.getElementById("form-novo-equipamento").classList.toggle("hidden"); 
}

function salvarNovoEquipamento() {
  if (!verificarAcesso()) return;
  const tag = document.getElementById("add-tag").value.trim().toUpperCase();
  const tipo = document.getElementById("add-tipo").value;
  const meta = parseFloat(document.getElementById("add-meta").value);
  
  if (!tag || !meta) return alert("Preencha TAG e Meta.");
  if (BANCO_ATIVOS.find(a => a.id === tag)) return alert("TAG já cadastrada.");

  BANCO_ATIVOS.push({ 
      id: tag, 
      tipo: tipo, 
      local: "Oficina / Reserva", 
      pos: "Estoque", 
      dias: 0, 
      ton: 0, 
      meta: meta, 
      ordem: getOrdemPadrao(tipo) 
  });
  
  localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS));
  registrarHistorico(tag, `Peça nova cadastrada no Estoque/Reserva.`);
  
  document.getElementById("add-tag").value = ""; 
  document.getElementById("add-meta").value = "";
  
  toggleFormAdicionar(); 
  renderReservas(); 
  calcularKpisGlobais(); 
  renderAtivos();
}

function renderAtivos() {
  const tbody = document.getElementById("ativos-table-body");
  const filtroEl = document.getElementById("filtro-tipo-ativo");
  if (!tbody || !filtroEl) return;

  let f = BANCO_ATIVOS.filter(a => a.local.includes(`Veio ${VEIO_SELECIONADO_PAINEL}`) || filtroEl.value.includes("Oficina"));
  if (filtroEl.value === "Oficina / Reparo") {
      f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reparo");
  } else if (filtroEl.value === "Oficina / Reserva") {
      f = BANCO_ATIVOS.filter(a => a.local === "Oficina / Reserva");
  } else if (filtroEl.value !== "TODOS") {
      f = f.filter(a => a.tipo === filtroEl.value);
  }

  f.sort((a, b) => a.ordem - b.ordem);

  tbody.innerHTML = f.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let classe = pct > 85 ? "reparo" : "operação";
    if(a.local === "Oficina / Reserva") classe = "reserva";
    else if (a.local === "Oficina / Reparo") classe = "reparo";

    let btnAcao = a.local.includes("Veio") 
      ? `<button class="btn-outline-danger" onclick="iniciarSaque('${a.id}')">Sacar</button>` 
      : `<span class="text-muted"><i class="fas fa-warehouse"></i></span>`;

    let btnHist = `<button class="btn-outline-danger" style="border-color:var(--text-accent); color:var(--text-accent);" onclick="abrirHistoricoIndividual('${a.id}')"><i class="fas fa-book-open"></i></button>`;

    return `
      <tr>
        <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'id')">${a.id}</td>
        <td><span class="ind-card-tag bg-tag">${a.tipo}</span></td>
        <td class="font-code text-muted">${a.local}</td>
        <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
        <td class="editavel font-code" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')">${Math.round(a.ton).toLocaleString()}</td>
        <td class="font-code text-muted">${a.meta.toLocaleString()}</td>
        <td><span class="status-pill ${classe}">${pct}%</span></td>
        <td><div class="flex-align-center gap-10 action-buttons-mobile">${btnAcao} ${btnHist}</div></td>
      </tr>`;
  }).join("");
}

function fazerCelulaEditavel(celula, id, campo) {
  if (!verificarAcesso() || celula.querySelector("input")) return;
  const original = celula.innerText.trim();
  const input = document.createElement("input");
  input.type = campo === 'id' ? "text" : "number";
  input.value = original.replace(/\./g, "");
  input.className = "edit-input";
  
  celula.innerHTML = ""; 
  celula.appendChild(input); 
  input.focus();

  input.addEventListener("blur", () => {
    let val = campo === 'id' ? input.value.trim().toUpperCase() : parseFloat(input.value) || 0;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item && val !== "") { 
      let ant = item[campo]; 
      item[campo] = val; 
      localStorage.setItem("oms_ativos_v27_local", JSON.stringify(BANCO_ATIVOS)); 
      registrarHistorico(id, `Editou ${campo} de ${ant} p/ ${val}`);
    }
    renderAtivos(); 
    renderPainelVeios(); 
    calcularKpisGlobais(); 
    renderReparos(); 
    renderReservas();
  });
}

function filtrarGraficosMCC(mccNumero, veioFiltro, btnElement) {
  const containerBtns = btnElement.parentElement;
  containerBtns.querySelectorAll('.btn-filter-mcc').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  renderizarGraficosMCC(mccNumero, veioFiltro);
}

function renderizarGraficosMCC(mccNumero, veioFiltro = 'TODOS') {
  const container = document.getElementById(`graficos-mcc${mccNumero}`);
  if (!container) return;
  
  let filtrados = BANCO_ATIVOS.filter(a => a.local.includes(`MCC ${mccNumero}`));
  
  if (veioFiltro !== 'TODOS') {
      filtrados = filtrados.filter(a => a.local.includes(`Veio ${veioFiltro}`));
  }
  
  filtrados.sort((a, b) => a.ordem - b.ordem);

  if(filtrados.length === 0) {
      return container.innerHTML = `<div class="vazio">Nenhum dado encontrado para o filtro selecionado.</div>`;
  }
  
  container.innerHTML = filtrados.map(gerarCardGraficoHTML).join("");
}

function dispararEmergencia() {
  EM_EMERGENCIA = `⚠️ ALERTA PARICO - INTERVENÇÃO FORÇADA`;
  localStorage.setItem("oms_emergencia_v27_local", JSON.stringify(EM_EMERGENCIA));
  registrarHistorico("ALERTA", "Botão de Pânico acionado."); 
  exibirBarraEmergencia();
}

function encerrarEmergencia() { 
    EM_EMERGENCIA = null; 
    localStorage.removeItem("oms_emergencia_v27_local"); 
    document.getElementById("barra-emergencia").style.display = "none"; 
    registrarHistorico("ALERTA", "Alarme resetado.");
}

function exibirBarraEmergencia() { 
    if (EM_EMERGENCIA) { 
        document.getElementById("texto-emergencia").innerText = EM_EMERGENCIA; 
        document.getElementById("barra-emergencia").style.display = "block"; 
    } 
}

document.addEventListener("DOMContentLoaded", () => {
  exibirBarraEmergencia();
  if (OPERADOR_LOGADO) {
    document.getElementById("tela-login-home").style.display = "none"; 
    // CORREÇÃO AQUI TAMBÉM: display flex para desktop funcionar perfeitamente
    document.getElementById("container-sistema-oms").style.display = "flex";
    
    atualizarInterfaceUsuario(); 
    calcularKpisGlobais(); 
    renderPainelVeios(); 
    renderAtivos(); 
    renderReparos(); 
    renderReservas();
  }
});