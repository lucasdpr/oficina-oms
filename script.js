// ===== INICIALIZAÇÃO E MODELAGEM DO BANCO DE DADOS DA OMS =====
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("oms_ativos_v5"));

if (!BANCO_ATIVOS) {
  BANCO_ATIVOS = [];
  const veiosMcc23 = [
    { mcc: 2, veio: "C" }, { mcc: 2, veio: "D" },
    { mcc: 3, veio: "E" }, { mcc: 3, veio: "F" }
  ];

  // GERAÇÃO AUTOMÁTICA DAS MÁQUINAS 2 E 3 (Mapeamento Fiel do Áudio Técnico)
  veiosMcc23.forEach(m => {
    const vNome = `MCC ${m.mcc} - Veio ${m.veio}`;
    
    // 1. Molde e Mesa Osciladora (Conjunto único conforme áudio)
    BANCO_ATIVOS.push({ id: `MLD-${m.mcc}${m.veio}`, tipo: "Molde", local: vNome, pos: "Molde", dias: 12, ton: 140000, meta: 1200000 });
    BANCO_ATIVOS.push({ id: `OSC-${m.mcc}${m.veio}`, tipo: "Mesa Osciladora", local: vNome, pos: "Mesa Osciladora", dias: 45, ton: 320000, meta: 1800000 });
    
    // 2. Seguimento Zero
    BANCO_ATIVOS.push({ id: `SEG-0-${m.mcc}${m.veio}`, tipo: "Seguimento Zero", local: vNome, pos: "Seg. Zero", dias: 90, ton: 610000, meta: 2200000 });
    
    // 3. Câmara de Exaustão (6 Segmentos do 1 ao 6)
    for (let s = 1; s <= 6; s++) {
      BANCO_ATIVOS.push({ id: `SEG-${s}-${m.mcc}${m.veio}`, tipo: "Câmara de Exaustão", local: vNome, pos: `Seg. Exaustão ${s}`, dias: 110, ton: 750000, meta: 2500000 });
    }

    // 4. Trem de Cadeiras (43 a 79) - 36 Superiores e 36 Inferiores por Veio (Total 72)
    const cadeirasAcionadas = [45, 48, 52, 55, 56, 59, 60, 63, 67, 71, 76, 77, 78, 79];
    
    for (let c = 43; c <= 79; c++) {
      let eAcionada = cadeirasAcionadas.includes(c);
      
      // Inferiores (Podem ser acionadas/motorizadas)
      BANCO_ATIVOS.push({
        id: `CAD-INF-${c}-${m.mcc}${m.veio}`,
        tipo: "Cadeira Inferior",
        local: vNome,
        pos: `Cadeira Inf ${c}`,
        dias: 210,
        ton: 890000,
        meta: 3000000,
        acionada: eAcionada
      });

      // Superiores (Nunca são acionadas conforme áudio)
      BANCO_ATIVOS.push({
        id: `CAD-SUP-${c}-${m.mcc}${m.veio}`,
        tipo: "Cadeira Superior",
        local: vNome,
        pos: `Cadeira Sup ${c}`,
        dias: 140,
        ton: 420000,
        meta: 3000000,
        acionada: false
      });
    }
  });

  // GERAÇÃO MAQUINA 4
  const veiosMcc4 = ["G", "H"];
  veiosMcc4.forEach(v => {
    const vNome = `MCC 4 - Veio ${v}`;
    BANCO_ATIVOS.push({ id: `MLD-4${v}`, tipo: "Molde", local: vNome, pos: "Molde", dias: 65, ton: 410000, meta: 1500000 });
    BANCO_ATIVOS.push({ id: `OSC-4${v}`, tipo: "Mesa Osciladora", local: vNome, pos: "Mesa Osciladora", dias: 70, ton: 490000, meta: 1800000 });
    BANCO_ATIVOS.push({ id: `BND-4${v}`, tipo: "Bender / Horizontais (MCC4)", local: vNome, pos: "Bender", dias: 118, ton: 520000, meta: 1100000 });
    BANCO_ATIVOS.push({ id: `HOR-1-4${v}`, tipo: "Bender / Horizontais (MCC4)", local: vNome, pos: "Horizontal 1", dias: 340, ton: 910000, meta: 3300000 });
  });

  localStorage.setItem("oms_ativos_v5", JSON.stringify(BANCO_ATIVOS));
}

let HISTORICO_EVENTOS = JSON.parse(localStorage.getItem("oms_historico_v5")) || [];
let EM_EMERGENCIA = JSON.parse(localStorage.getItem("oms_emergencia_v5")) || null;

const CADASTRO_MATRICULAS = {
  "40090430": "Filipe Silva Souza (Líder)",
  "40075827": "Denilson Jose de Oliveira (Líder)",
  "40080751": "Valmir de Paula da Silva (Líder)",
  "40090851": "Samuel dos Santos Generoso (Líder)",
  "1011": "Supervisor de Área"
};
let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v5")) || null;
let VEIO_SELECIONADO_PAINEL = "C";

// ===== CONTROLE DE AUTENTICAÇÃO =====
function pedirIdentificacao() {
  const m = prompt("Digite sua matrícula operacional da OMS:");
  if (!m) return;
  if (CADASTRO_MATRICULAS[m.trim()]) {
    OPERADOR_LOGADO = { matricula: m.trim(), nome: CADASTRO_MATRICULAS[m.trim()] };
    localStorage.setItem("oms_operador_v5", JSON.stringify(OPERADOR_LOGADO));
    atualizarInterfaceUsuario();
    renderAtivos();
    renderPainelVeios();
    alert(`Acesso liberado! Bem-vindo, ${OPERADOR_LOGADO.nome}.`);
  } else {
    alert("Matrícula não homologada na oficina.");
  }
}

function verificarAcesso() {
  if (!OPERADOR_LOGADO) {
    alert("Acesso Negado! Valide sua matrícula operacional na barra lateral primeiro.");
    pedirIdentificacao();
    return false;
  }
  return true;
}

function atualizarInterfaceUsuario() {
  const el = document.getElementById("nome-operador-logado");
  if (el) el.innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
}

// ===== CONTROLE DE ABAS =====
function abrirAba(e, idAba) {
  if (e) e.preventDefault();
  document.querySelectorAll(".tab-content").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  
  if (e && e.currentTarget) e.currentTarget.classList.add("active");
  const aba = document.getElementById(idAba);
  if (aba) aba.classList.add("active");

  if (idAba === "aba-painel") renderPainelVeios();
  if (idAba === "aba-ativos") renderAtivos();
  if (idAba === "aba-intervencao") inicializarAbaIntervencao();
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

// ===== ABA 1: MONITORAMENTO VERTICAL POR VEIO =====
function renderPainelVeios() {
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

  const container = document.getElementById("container-fluxo-focado");
  const titulo = document.getElementById("titulo-veio-focado");
  if (!container || !titulo) return;

  titulo.innerHTML = `<i class="fas fa-eye"></i> Linha de Fluxo Vertical: <strong>Veio ${VEIO_SELECIONADO_PAINEL}</strong>`;

  let ativosDoVeio = BANCO_ATIVOS.filter(a => a.local.endsWith(`Veio ${VEIO_SELECIONADO_PAINEL}`));

  if (ativosDoVeio.length === 0) {
    container.innerHTML = `<div class="vazio">Componentes deste veio encontram-se na Bancada / Oficina.</div>`;
    return;
  }

  ativosDoVeio.sort((a, b) => {
    const ordem = ["Molde", "Mesa Osciladora", "Seguimento Zero", "Câmara de Exaustão", "Cadeira Inferior", "Cadeira Superior", "Bender / Horizontais (MCC4)"];
    return ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo);
  });

  container.innerHTML = ativosDoVeio.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(0);
    let corBarra = "var(--success)";
    if (pct > 75) corBarra = "var(--panic)";
    if (pct > 85) corBarra = "var(--danger)";

    return `
      <div class="card-fluxo-item-linha">
        <div class="info-principal-card">
          <span class="tag-tipo-componente">${a.tipo}</span>
          <strong class="id-componente">${a.id} ${a.acionada ? '⚡' : ''}</strong>
          <span class="posicao-texto">${a.pos}</span>
        </div>
        <div class="medidor-vida-container">
          <div class="barra-vida-progresso">
            <div class="barra-preenchida" style="width: ${Math.min(pct, 100)}%; background: ${corBarra};"></div>
          </div>
          <small class="valores-ton-card"><strong>${Math.round(a.ton).toLocaleString()}</strong> / ${a.meta.toLocaleString()} TON (${pct}%)</small>
        </div>
      </div>
    `;
  }).join("");
}

// ===== ABA 2: PLANILHA OPERACIONAL =====
function renderAtivos() {
  const tbody = document.getElementById("ativos-table-body");
  const filtroEl = document.getElementById("filtro-tipo-ativo");
  if (!tbody || !filtroEl) return;

  const filtro = filtroEl.value;
  let filtrados = BANCO_ATIVOS;

  if (filtro === "ACIONADOS") {
    filtrados = BANCO_ATIVOS.filter(a => a.acionada === true);
  } else if (filtro !== "TODOS") {
    filtrados = BANCO_ATIVOS.filter(a => a.tipo === filtro);
  }

  tbody.innerHTML = filtrados.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let classe = "operação";
    if (pct > 85) classe = "reparo";
    if (a.local === "Bancada / Oficina") classe = "reserva";

    return `
      <tr>
        <td><strong>${a.id} ${a.acionada ? '⚡' : ''}</strong></td>
        <td><span class="tag-subarea">${a.tipo}</span></td>
        <td><code>${a.local}</code></td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')"><strong>${Math.round(a.ton)}</strong></td>
        <td>${a.meta.toLocaleString()}</td>
        <td><span class="status-pill ${classe}">${pct}%</span></td>
        <td>
          <button class="btn-xs-primary" onclick="sacarParaBancada('${a.id}')"><i class="fas fa-hammer"></i> Sacar Oficina</button>
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
  input.value = original.replace(/\./g, "");
  input.style.width = "85px";
  input.style.color = "#fff";
  input.style.background = "#000";
  celula.innerHTML = "";
  celula.appendChild(input);
  input.focus();

  const salvarEdicao = () => {
    const val = parseFloat(input.value) || 0;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
      const antigoValor = item[campo];
      item[campo] = val;
      localStorage.setItem("oms_ativos_v5", JSON.stringify(BANCO_ATIVOS));
      registrarOcorrenciaDigital(id, "Modificação Manual", `Alterado ${campo.toUpperCase()} de ${antigoValor} para ${val}`);
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
    const localAntigo = item.local;
    item.local = "Bancada / Oficina";
    localStorage.setItem("oms_ativos_v5", JSON.stringify(BANCO_ATIVOS));
    registrarOcorrenciaDigital(id, "Retirada de Linha", `Ativo sacado do ${localAntigo} e enviado para a bancada da OMS.`);
    renderAtivos();
    renderPainelVeios();
  }
}

// ===== ABA 3: HISTÓRICO INTEGRADO COM SHEET.BEST (EXCEL) =====
function registrarOcorrenciaDigital(ativoId, tipo, detalhe) {
  const dataHoraAtual = new Date().toLocaleString("pt-BR");
  const quemFez = OPERADOR_LOGADO ? `${OPERADOR_LOGADO.nome} (${OPERADOR_LOGADO.matricula})` : "Sistema";

  HISTORICO_EVENTOS.unshift({
    data: dataHoraAtual,
    ativoId: ativoId,
    evento: tipo,
    detalhe: detalhe,
    executor: quemFez
  });
  localStorage.setItem("oms_historico_v5", JSON.stringify(HISTORICO_EVENTOS));

  // LINK DE CONEXÃO DO UTILIZADOR CONFIGURADO
  const URL_API_SHEETBEST = "https://api.sheetbest.com/sheets/09ed7cf8-6b8d-4071-973c-19ec2515c448"; 

  if (URL_API_SHEETBEST) {
    fetch(URL_API_SHEETBEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: dataHoraAtual,
        ativo: ativoId,
        evento: tipo,
        detalhe: detalhe,
        executor: quemFez
      })
    })
    .then(res => res.json())
    .then(data => console.log("Planilha sincronizada!", data))
    .catch(err => console.error("Erro na sincronização:", err));
  }
  renderHistorico();
}

function renderHistorico() {
  const tbody = document.getElementById("historico-eventos-body");
  if (!tbody) return;
  tbody.innerHTML = HISTORICO_EVENTOS.slice(0, 15).map(h => `
    <tr>
      <td><small>${h.data}</small></td>
      <td><code>${h.ativoId || h.ativo}</code></td>
      <td><span class="tag-subarea" style="background:rgba(248,81,73,0.1); color:var(--danger);">${h.evento}</span></td>
      <td><small>${h.detalhe}</small></td>
      <td><strong>${h.executor}</strong></td>
    </tr>
  `).join("");
}

function ajustarCamposIntervencao() {
  const tipo = document.getElementById("form-tipo-evento").value;
  document.getElementById("campo-os-numero").style.display = tipo === "Ordem de Servico" ? "block" : "none";
  document.getElementById("campo-abatimento").style.display = tipo === "Reparo Parcial" ? "block" : "none";
}

function inicializarAbaIntervencao() {
  const select = document.getElementById("form-ativo-alvo");
  if (select) {
    const ordenados = [...BANCO_ATIVOS].sort((a,b) => a.id.localeCompare(b.id));
    select.innerHTML = ordenados.map(a => `<option value="${a.id}">${a.id} [${a.tipo}] - ${a.local}</option>`).join("");
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
    txtDetalhe = `Abatimento de ${abt.toLocaleString()} TON na bancada.`;
  } else if (tipo === "Ordem de Servico") {
    const osNum = document.getElementById("form-os-input").value.trim() || "Não Informada";
    txtDetalhe = `Executada OS nº ${osNum}.`;
  } else {
    txtDetalhe = `Check de Não Conformidade Concluído.`;
  }

  registrarOcorrenciaDigital(id, tipo, `${txtDetalhe} Relato: ${obs}`);
  localStorage.setItem("oms_ativos_v5", JSON.stringify(BANCO_ATIVOS));
  
  alert("Histórico atualizado!");
  document.getElementById("form-obs-evento").value = "";
  inicializarAbaIntervencao();
}

function dispararEmergencia(tipo) {
  if (!verificarAcesso()) return;
  EM_EMERGENCIA = `${tipo} - Acionamento das equipes de plantão em curso.`;
  localStorage.setItem("oms_emergencia_v5", JSON.stringify(EM_EMERGENCIA));
  exibirBarraEmergencia();
}

function encerrarEmergencia() {
  EM_EMERGENCIA = null;
  localStorage.removeItem("oms_emergencia_v5");
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
  abrirAba(null, 'aba-painel');
});