// ===== BANCO DE DADOS PERSISTENTE =====
let BANCO_ATIVOS = JSON.parse(localStorage.getItem("mcc_ativos_v3")) || [
  // MOLDES MCC 4
  { id: "Molde 02", tipo: "Molde", local: "MCC 4 - Veio G", pos: "Molde", dias: 120, ton: 340000, meta: 1500000 },
  { id: "Molde 03", tipo: "Molde", local: "Bancada / Oficina", pos: "Reserva", dias: 45, ton: 110000, meta: 1500000 },
  { id: "Molde 04", tipo: "Molde", local: "MCC 4 - Veio H", pos: "Molde", dias: 210, ton: 980000, meta: 1500000 },
  { id: "Molde 05", tipo: "Molde", local: "Bancada / Oficina", pos: "Reserva", dias: 0, ton: 0, meta: 1500000 },
  { id: "Molde 06", tipo: "Molde", local: "Bancada / Oficina", pos: "Reserva", dias: 12, ton: 25000, meta: 1500000 },

  // MOLDES UNIVERSAIS (MCC 2 / MCC 3)
  { id: "Molde UNI-01", tipo: "Molde", local: "MCC 2 - Veio C", pos: "Molde", dias: 80, ton: 290000, meta: 1200000 },
  { id: "Molde UNI-02", tipo: "Molde", local: "MCC 2 - Veio D", pos: "Molde", dias: 95, ton: 410000, meta: 1200000 },
  { id: "Molde UNI-03", tipo: "Molde", local: "MCC 3 - Veio E", pos: "Molde", dias: 15, ton: 65000, meta: 1200000 },
  { id: "Molde UNI-04", tipo: "Molde", local: "MCC 3 - Veio F", pos: "Molde", dias: 140, ton: 890000, meta: 1200000 },

  // OSCILADORES
  { id: "OSC-MCC4-G", tipo: "Oscilador", local: "MCC 4 - Veio G", pos: "Oscilador", dias: 200, ton: 600000, meta: 2000000 },
  { id: "OSC-MCC4-H", tipo: "Oscilador", local: "MCC 4 - Veio H", pos: "Oscilador", dias: 150, ton: 450000, meta: 2000000 },

  // SEGUIMENTO ZERO (MCC 2 e 3) / BENDER (MCC 4)
  { id: "SEG-0-MCC2C", tipo: "Seguimento Zero / Bender", local: "MCC 2 - Veio C", pos: "Seg. Zero", dias: 310, ton: 1100000, meta: 2500000 },
  { id: "Bender-B-5", tipo: "Seguimento Zero / Bender", local: "MCC 4 - Veio G", pos: "Bender", dias: 118, ton: 181564, meta: 1100000 },
  { id: "Bender-B-2", tipo: "Seguimento Zero / Bender", local: "MCC 4 - Veio H", pos: "Bender", dias: 79, ton: 251031, meta: 1100000 },

  // SEGUIMENTOS BOW (CURVA)
  { id: "SEG-BOW-C07", tipo: "Seguimento Bow", local: "MCC 4 - Veio G", pos: "Bow Pos. 2", dias: 187, ton: 998546, meta: 1900000 },
  { id: "SEG-BOW-C01", tipo: "Seguimento Bow", local: "MCC 4 - Veio G", pos: "Bow Pos. 3", dias: 457, ton: 1772338, meta: 1900000 },

  // MCC 4 HORIZONTAIS & DESENDIREITADOR (POSIÇÃO 7)
  { id: "SEG-HOR-H07", tipo: "Horizontal / Desendireitador", local: "MCC 4 - Veio G", pos: "Horizontal 1", dias: 408, ton: 729972, meta: 3300000 },
  { id: "DESEND-RI-02", tipo: "Horizontal / Desendireitador", local: "MCC 4 - Veio G", pos: "Desendireitador (Pos 7)", dias: 580, ton: 1104341, meta: 1700000 },
  { id: "SEG-HOR-H08", tipo: "Horizontal / Desendireitador", local: "MCC 4 - Veio G", pos: "Horizontal 8", dias: 408, ton: 81339, meta: 3300000 },
  { id: "SEG-HOR-H11", tipo: "Horizontal / Desendireitador", local: "MCC 4 - Veio G", pos: "Horizontal 9", dias: 606, ton: 821248, meta: 3300000 }
];

let HISTORICO_EVENTOS = JSON.parse(localStorage.getItem("mcc_historico_v3")) || [];

const CADASTRO_MATRICULAS = {
  "40090430": "Filipe Silva Souza (Líder)",
  "40075827": "Denilson Jose de Oliveira (Líder)",
  "40080751": "Valmir de Paula da Silva (Líder)",
  "40090851": "Samuel dos Santos Generoso (Líder)",
  "1011": "Supervisor de Área"
};

let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("mcc_operador_atual")) || null;

// ===== CONTROLE DE AUTENTICAÇÃO =====
function pedirIdentificacao() {
  const m = prompt("Digite sua matrícula operacional para liberar alterações:");
  if (!m) return;
  if (CADASTRO_MATRICULAS[m.trim()]) {
    OPERADOR_LOGADO = { matricula: m.trim(), nome: CADASTRO_MATRICULAS[m.trim()] };
    localStorage.setItem("mcc_operador_atual", JSON.stringify(OPERADOR_LOGADO));
    atualizarInterfaceUsuario();
    alert("Identificação Confirmada: " + OPERADOR_LOGADO.nome);
  } else {
    alert("Matrícula inválida.");
  }
}

function verificarAcesso() {
  if (!OPERADOR_LOGADO) {
    alert("Acesso Negado! Identifique sua matrícula na barra lateral primeiro.");
    pedirIdentificacao();
    return false;
  }
  return true;
}

function atualizarInterfaceUsuario() {
  const el = document.getElementById("nome-operador-logado");
  if (el) {
    el.innerText = OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Não identificado";
  }
}

// ===== CONTROLE DE ABAS =====
function abrirAba(e, idAba) {
  e.preventDefault();
  document.querySelectorAll(".tab-content").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  e.currentTarget.classList.add("active");
  document.getElementById(idAba).classList.add("active");

  if (idAba === "aba-painel") renderPainelVeios();
  if (idAba === "aba-ativos") renderAtivos();
  if (idAba === "aba-intervencao") inicializarAbaIntervencao();
}

// ===== ABA 1: PAINEL SEQUENCIAL DO FLUXO DO AÇO =====
function renderPainelVeios() {
  const veios = ["C", "D", "E", "F", "G", "H"];
  
  veios.forEach(v => {
    const container = document.getElementById(`veio-${v}-status`);
    if (!container) return;

    let emOperacao = BANCO_ATIVOS.filter(a => a.local.endsWith(`Veio ${v}`));

    if (emOperacao.length === 0) {
      container.innerHTML = `<div class="vazio" style="color:#555; font-style:italic; padding:10px;">Veio sem ativos configurados</div>`;
      return;
    }

    emOperacao.sort((a, b) => {
      const ordem = ["Molde", "Oscilador", "Seg. Zero", "Bender", "Bow Pos. 2", "Bow Pos. 3", "Horizontal 1", "Desendireitador (Pos 7)", "Horizontal 8", "Horizontal 9"];
      return ordem.indexOf(a.pos) - ordem.indexOf(b.pos);
    });

    container.innerHTML = emOperacao.map(a => {
      const pct = ((a.ton / a.meta) * 100).toFixed(0);
      let cor = "var(--success)";
      if (pct > 75) cor = "var(--danger)";
      
      return `
        <div class="card-fluxo-item">
          <div class="linha-topo-fluxo">
            <span class="badge-posicao">${a.pos}</span>
            <strong>${a.id}</strong>
          </div>
          <div class="barra-vida-container">
            <div class="barra-vida-preenchida" style="width: ${Math.min(pct, 100)}%; background: ${cor};"></div>
          </div>
          <small>${Math.round(a.ton).toLocaleString()} TON (${pct}%)</small>
        </div>
      `;
    }).join("");
  });
}

// ===== ABA 2: PLANILHA ESTILO EXCEL =====
function renderAtivos() {
  const filtro = document.getElementById("filtro-tipo-ativo").value;
  const tbody = document.getElementById("ativos-table-body");
  if (!tbody) return;

  let filtrados = filtro === "TODOS" ? BANCO_ATIVOS : BANCO_ATIVOS.filter(a => a.tipo === filtro);

  tbody.innerHTML = filtrados.map(a => {
    const pct = ((a.ton / a.meta) * 100).toFixed(1);
    let classe = "operação";
    if (pct > 75) classe = "reparo";
    if (pct >= 100) classe = "reserva";

    return `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td><span class="tag-subarea">${a.tipo}</span></td>
        <td><code>${a.local} (${a.pos})</code></td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'dias')">${a.dias}</td>
        <td class="editavel" onclick="fazerCelulaEditavel(this, '${a.id}', 'ton')"><strong>${Math.round(a.ton)}</strong></td>
        <td>${a.meta.toLocaleString()}</td>
        <td><span class="status-pill ${classe}">${pct}%</span></td>
        <td>
          <button class="btn-xs-primary" onclick="sacarParaOficina('${a.id}')"><i class="fas fa-wrench"></i> Sacar p/ Oficina</button>
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
  input.style.width = "90px";
  input.style.color = "#000";
  
  celula.innerHTML = "";
  celula.appendChild(input);
  input.focus();

  const fecharEGuardar = () => {
    const val = parseFloat(input.value) || 0;
    let item = BANCO_ATIVOS.find(a => a.id === id);
    if (item) {
      item[campo] = val;
      localStorage.setItem("mcc_ativos_v3", JSON.stringify(BANCO_ATIVOS));
      
      HISTORICO_EVENTOS.unshift({
        data: new Date().toLocaleString(),
        ativoId: id,
        evento: "Edição Direta",
        detalhe: `Campo ${campo.toUpperCase()} modificado manualmente de ${original} para ${val}`,
        executor: OPERADOR_LOGADO.nome
      });
      localStorage.setItem("mcc_historico_v3", JSON.stringify(HISTORICO_EVENTOS));
    }
    renderAtivos();
  };

  input.addEventListener("blur", fecharEGuardar);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") fecharEGuardar(); });
}

function sacarParaOficina(id) {
  if (!verificarAcesso()) return;
  let item = BANCO_ATIVOS.find(a => a.id === id);
  if (item) {
    item.local = "Bancada / Oficina";
    item.pos = "Reserva";
    localStorage.setItem("mcc_ativos_v3", JSON.stringify(BANCO_ATIVOS));
    renderAtivos();
  }
}

// ===== ABA 3: INTERVENÇÕES =====
function ajustarCamposIntervencao() {
  const tipo = document.getElementById("form-tipo-evento").value;
  document.getElementById("campo-abatimento").style.display = tipo === "Reparo Parcial" ? "block" : "none";
  document.getElementById("campo-posicao-veio").style.display = tipo === "Troca de Ativo" ? "block" : "none";
}

function inicializarAbaIntervencao() {
  const select = document.getElementById("form-ativo-alvo");
  if (select) {
    select.innerHTML = BANCO_ATIVOS.map(a => `<option value="${a.id}">${a.id} [${a.tipo}] - Local: ${a.local}</option>`).join("");
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

  let detalhe = "";

  if (tipo === "Reparo Parcial") {
    const abatimento = parseFloat(document.getElementById("form-ton-abatida").value) || 0;
    item.ton = Math.max(0, item.ton - abatimento);
    detalhe = `Abatimento realizado de ${abatimento.toLocaleString()} TON na bancada de manutenção.`;
  } 
  else if (tipo === "Troca de Ativo") {
    const destino = document.getElementById("form-nova-posicao").value;
    detalhe = `Troca de posição: De [${item.local}] para [${destino}]`;
    item.local = destino;
    
    if (destino === "Bancada / Oficina") {
      item.pos = "Reserva";
    } else {
      if (item.tipo === "Molde") item.pos = "Molde";
      if (item.tipo === "Oscilador") item.pos = "Oscilador";
      if (item.tipo === "Seguimento Zero / Bender") {
        item.pos = destino.includes("MCC 4") ? "Bender" : "Seg. Zero";
      }
    }
  } else {
    detalhe = `Evento operacional registrado enquanto ativo estava em ${item.local}`;
  }

  HISTORICO_EVENTOS.unshift({
    data: new Date().toLocaleString(),
    ativoId: id,
    evento: tipo,
    detalhe: `${detalhe}. Relato: ${obs}`,
    executor: `${OPERADOR_LOGADO.nome} (${OPERADOR_LOGADO.matricula})`
  });

  localStorage.setItem("mcc_ativos_v3", JSON.stringify(BANCO_ATIVOS));
  localStorage.setItem("mcc_historico_v3", JSON.stringify(HISTORICO_EVENTOS));

  alert("Histórico atualizado e sincronizado com Sucesso!");
  document.getElementById("form-obs-evento").value = "";
  inicializarAbaIntervencao();
}

function renderHistorico() {
  const tbody = document.getElementById("historico-eventos-body");
  if (!tbody) return;
  tbody.innerHTML = HISTORICO_EVENTOS.slice(0, 10).map(h => `
    <tr>
      <td><small>${h.data}</small></td>
      <td><code>${h.ativoId}</code></td>
      <td><span class="tag-subarea" style="background:rgba(239,68,68,0.1); color:var(--danger);">${h.evento}</span></td>
      <td><small>${h.detalhe}</small></td>
      <td><strong>${h.executor || "Sistema"}</strong></td>
    </tr>
  `).join("");
}

// ===== INICIALIZAÇÃO SEGURA =====
document.addEventListener("DOMContentLoaded", () => {
  atualizarInterfaceUsuario();
  renderPainelVeios();
});