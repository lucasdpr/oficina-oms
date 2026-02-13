const API_URL = "https://script.google.com/macros/s/AKfycbyI0RrvQi7QRo_D1ubYnGhPDTuPH4Hc9sovUAZUbOe24EpzIauLAWV_jdEd9eoXpUCW/exec";
const API_KEY = "oficina2026seguro";


let listaEquips = JSON.parse(localStorage.getItem('oficina_maquinas')) || [];
let listaMembros = JSON.parse(localStorage.getItem('oficina_equipe')) || [];
function limparEquipForm(){
    document.getElementById('equipNome').value = "";
    document.getElementById('equipStatus').value = "operação";
    document.getElementById('equipTeam').value = "Mecânica";
    document.getElementById('equipObs').value = "";
}

function limparMembroForm(){
    document.getElementById('membroNome').value = "";
    document.getElementById('membroCargo').value = "";
    // TESTE GIT FUNCIONANDO

}

// --- FUNÇÃO DE TROCAR ABAS ---
function abrirAba(event, nomeAba) {
    // Esconde todos os conteúdos das abas
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.remove('active'));
    // Remove a classe 'active' de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Mostra a aba atual e marca o botão como ativo
    document.getElementById(nomeAba).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- BOTÕES LATERAIS ---
document.getElementById('menu-add-equip').onclick = (e) => {
    e.preventDefault();
    document.getElementById('modal-equip').style.display = 'flex';
};

document.getElementById('menu-add-membro').onclick = (e) => {
    e.preventDefault();
    document.getElementById('modal-membro').style.display = 'flex';
};

function fecharModal(id) {
    document.getElementById(id).style.display = 'none';
}

// --- SALVAR DADOS ---
function salvarEquipamento() {
    const nome = document.getElementById('equipNome').value;
    const status = document.getElementById('equipStatus').value;
    const equipe = document.getElementById('equipTeam').value;
    const obs = document.getElementById('equipObs').value.trim();


    if (nome) {
        listaEquips.push({ id: Date.now(), nome, status, equipe, obs });
        localStorage.setItem('oficina_maquinas', JSON.stringify(listaEquips));
        render();
        fecharModal('modal-equip');
        limparEquipForm();

    }
}

function salvarMembro() {
    const nome = document.getElementById('membroNome').value;
    const cargo = document.getElementById('membroCargo').value;

    if (nome && cargo) {
        listaMembros.push({ id: Date.now(), nome, cargo });
        localStorage.setItem('oficina_equipe', JSON.stringify(listaMembros));
        render();
        fecharModal('modal-membro');
        limparMembroForm();

    }
}

function excluirItem(id, tipo) {
    if (tipo === 'equip') {
        listaEquips = listaEquips.filter(i => i.id !== id);
        localStorage.setItem('oficina_maquinas', JSON.stringify(listaEquips));
    } else {
        listaMembros = listaMembros.filter(i => i.id !== id);
        localStorage.setItem('oficina_equipe', JSON.stringify(listaMembros));
    }
    render();
}

// --- RENDERIZAR ---
function render() {
    document.getElementById('equip-table').innerHTML = listaEquips.map(e => `
        <tr>
            <td><strong>${e.nome}</strong></td>
            <td>${e.equipe}</td>
            <td><span class="status-pill ${e.status}">${e.status}</span></td>
            <td>${e.obs || ""}</td>
            <td><button class="btn-delete" onclick="excluirItem(${e.id}, 'equip')"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');

    document.getElementById('membro-table').innerHTML = listaMembros.map(m => `
        <tr>
            <td>${m.nome}</td>
            <td>${m.cargo}</td>
            <td><span class="status-pill operação">Ativo</span></td>
            <td><button class="btn-delete" onclick="excluirItem(${m.id}, 'membro')"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

render();
// Fechar modal clicando fora do conteúdo
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
});
async function salvarRelatorio() {
  const payload = {
    data: document.getElementById("dataRelatorio").value,
    equipe: document.getElementById("equipeRelatorio").value,
    presentes: Number(document.getElementById("presentes").value || 0),
    faltas: Number(document.getElementById("faltas").value || 0),
    atestados: Number(document.getElementById("atestados").value || 0),
    ferias: Number(document.getElementById("ferias").value || 0),
    observacao: document.getElementById("observacaoRelatorio").value || ""
  };

  if (!payload.data) {
    alert("Escolha a data do relatório.");
    return;
  }

  try {
    const resp = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await resp.json();

    if (json.ok) {
      alert("Relatório salvo na planilha ✅");
    } else {
      alert("Erro ao salvar: " + JSON.stringify(json));
    }
  } catch (e) {
    alert("Erro de conexão: " + e);
  }
}

