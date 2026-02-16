// ===== CONFIG =====
const API_URL = "https://script.google.com/macros/s/AKfycbyz3u0MXrrKsny4VcFwYRljVIi1lsQzmXJ_4uP1bcGMLfDi2Ji1mxd7jq7GyZ_N3Ctd/exec";
const API_KEY = "oficina2026seguro";

// PIN simples (um para todos) - opcional
const PIN_CORRETO = "1011";
const PIN_STORAGE_KEY = "oficina_pin_ok";

// ===== DADOS LOCAL =====
let listaEquips = JSON.parse(localStorage.getItem("oficina_maquinas")) || [];
let listaMembros = JSON.parse(localStorage.getItem("oficina_equipe")) || [];

// ===== EFETIVO (JSON) =====
let EFETIVO = [];

// ===== UI HELPERS =====
function limparEquipForm() {
  document.getElementById("equipNome").value = "";
  document.getElementById("equipStatus").value = "operação";
  document.getElementById("equipTeam").value = "Mecânica";
  document.getElementById("equipObs").value = "";
}

function limparMembroForm() {
  document.getElementById("membroNome").value = "";
  document.getElementById("membroCargo").value = "";
}

// ===== ABAS =====
function abrirAba(event, nomeAba) {
  event.preventDefault();

  document.querySelectorAll(".tab-content").forEach(aba => aba.classList.remove("active"));

  // sidebar links: marca ativo
  document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));
  event.currentTarget.classList.add("active");

  const alvo = document.getElementById(nomeAba);
  if (alvo) alvo.classList.add("active");

  // quando entrar em relatórios, tenta renderizar
  if (nomeAba === "aba-relatorios") {
    renderListaPessoas();
  }
}

// ===== MODAIS =====
function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// ===== EQUIPAMENTOS =====
function salvarEquipamento() {
  const nome = document.getElementById("equipNome").value.trim();
  const status = document.getElementById("equipStatus").value;
  const equipe = document.getElementById("equipTeam").value;
  const obs = document.getElementById("equipObs").value.trim();

  if (!nome) return alert("Digite o nome do equipamento.");

  listaEquips.push({ id: Date.now(), nome, status, equipe, obs });
  localStorage.setItem("oficina_maquinas", JSON.stringify(listaEquips));
  render();
  fecharModal("modal-equip");
  limparEquipForm();
}

// ===== MEMBROS =====
function salvarMembro() {
  const nome = document.getElementById("membroNome").value.trim();
  const cargo = document.getElementById("membroCargo").value.trim();

  if (!nome || !cargo) return alert("Preencha Nome e Cargo.");

  listaMembros.push({ id: Date.now(), nome, cargo });
  localStorage.setItem("oficina_equipe", JSON.stringify(listaMembros));
  render();
  fecharModal("modal-membro");
  limparMembroForm();
}

function excluirItem(id, tipo) {
  if (tipo === "equip") {
    listaEquips = listaEquips.filter(i => i.id !== id);
    localStorage.setItem("oficina_maquinas", JSON.stringify(listaEquips));
  } else {
    listaMembros = listaMembros.filter(i => i.id !== id);
    localStorage.setItem("oficina_equipe", JSON.stringify(listaMembros));
  }
  render();
}

// ===== RENDER LISTAS =====
function render() {
  const equipTbody = document.getElementById("equip-table");
  const membroTbody = document.getElementById("membro-table");

  if (equipTbody) {
    equipTbody.innerHTML = listaEquips.map(e => `
      <tr>
        <td><strong>${e.nome}</strong></td>
        <td>${e.equipe}</td>
        <td><span class="status-pill ${e.status}">${e.status}</span></td>
        <td>${e.obs || ""}</td>
        <td>
          <button class="btn-delete" onclick="excluirItem(${e.id}, 'equip')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  if (membroTbody) {
    membroTbody.innerHTML = listaMembros.map(m => `
      <tr>
        <td>${m.nome}</td>
        <td>${m.cargo}</td>
        <td><span class="status-pill ativo">Ativo</span></td>
        <td>
          <button class="btn-delete" onclick="excluirItem(${m.id}, 'membro')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }
}

// ===== PIN (opcional) =====
function pedirPIN() {
  const pin = prompt("Digite o PIN (somente Líder/Supervisor):");
  if (pin === null) return;

  if (pin.trim() === PIN_CORRETO) {
    localStorage.setItem(PIN_STORAGE_KEY, "ok");
    alert("Acesso liberado ✅");
  } else {
    localStorage.removeItem(PIN_STORAGE_KEY);
    alert("PIN errado ❌");
  }
}

function temAcessoRelatorio() {
  return localStorage.getItem(PIN_STORAGE_KEY) === "ok";
}

// ===== EFETIVO: carregar do arquivo efetivo.json =====
async function carregarEfetivo() {
  try {
    const resp = await fetch("efetivo.json", { cache: "no-store" });

    // se der 404, resp.ok = false
    if (!resp.ok) throw new Error("Não achei efetivo.json na pasta do site.");

    EFETIVO = await resp.json();

    const sel = document.getElementById("subAreaRelatorio");
    if (!sel) return;

    const subAreas = [...new Set(EFETIVO.map(p => p.subArea).filter(Boolean))].sort();
    sel.innerHTML = subAreas.map(sa => `<option value="${sa}">${sa}</option>`).join("");

    // eventos
    const dataInput = document.getElementById("dataRelatorio");
    if (dataInput) dataInput.addEventListener("change", renderListaPessoas);
    sel.addEventListener("change", renderListaPessoas);

    renderListaPessoas();
  } catch (err) {
    alert("Erro carregando efetivo: " + err.message);
  }
}

// ===== RELATÓRIO: renderizar pessoas da subárea =====
function renderListaPessoas() {
  const tbody = document.getElementById("presenca-table");
  const sel = document.getElementById("subAreaRelatorio");
  if (!tbody || !sel) return;

  const subArea = sel.value;
  const pessoas = EFETIVO.filter(p => p.subArea === subArea);

  tbody.innerHTML = pessoas.map(p => `
    <tr data-matricula="${p.matricula}">
      <td><strong>${p.nome}</strong><br><small>${p.funcao || ""}</small></td>
      <td>${p.matricula}</td>
      <td>
        <select class="statusSelect">
          <option value="Presente">Presente</option>
          <option value="Falta">Falta</option>
          <option value="Atestado">Atestado</option>
          <option value="Férias">Férias</option>
        </select>
      </td>
      <td style="text-align:center;">
        <input type="checkbox" class="heCheck" />
      </td>
      <td>
        <input class="obsInput" type="text" placeholder="Ex: HE 1h / troca / reserva" />
      </td>
    </tr>
  `).join("");
}

// ===== RELATÓRIO: enviar em lote pro Apps Script =====
async function salvarRelatorioPessoas() {
  if (!temAcessoRelatorio()) {
    alert("Sem acesso. Clique no botão PIN e digite o código.");
    return;
  }

  const data = document.getElementById("dataRelatorio").value;
  const subArea = document.getElementById("subAreaRelatorio").value;
  const lider = document.getElementById("liderRelatorio").value.trim();

  if (!data) return alert("Escolha a data.");
  if (!subArea) return alert("Escolha a Sub Área.");

  const linhas = [...document.querySelectorAll("#presenca-table tr")];

  const pessoas = linhas.map(tr => {
    const matricula = tr.dataset.matricula;
    const status = tr.querySelector(".statusSelect").value;
    const horaExtra = tr.querySelector(".heCheck").checked ? "Sim" : "Não";
    const obs = tr.querySelector(".obsInput").value || "";

    const horarioNormal = "17:18";
    const horarioHE = "18:18";
    const saida = horaExtra === "Sim" ? horarioHE : horarioNormal;

    return { matricula, status, horaExtra, saida, obs };
  });

  const payload = { data, subArea, lider, pessoas };

  try {
    // Aqui não usamos no-cors, porque seu Apps Script deve responder JSON
    const resp = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await resp.json().catch(() => ({}));

    if (resp.ok && (json.ok === true || json.ok === undefined)) {
      alert("Relatório enviado ✅ Confere a planilha.");
    } else {
      alert("Erro ao enviar: " + JSON.stringify(json));
    }
  } catch (err) {
    alert("Falha de conexão: " + err.message);
  }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  // botões laterais
  const addEquip = document.getElementById("menu-add-equip");
  const addMembro = document.getElementById("menu-add-membro");

  if (addEquip) addEquip.onclick = (e) => {
    e.preventDefault();
    document.getElementById("modal-equip").style.display = "flex";
  };

  if (addMembro) addMembro.onclick = (e) => {
    e.preventDefault();
    document.getElementById("modal-membro").style.display = "flex";
  };

  // fecha modal clicando fora
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  });

  // ESC fecha modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
    }
  });

  render();
  carregarEfetivo();
});
