// ==============================================================
// ADICIONAR AO script.js — Aba "Registro de Ocorrência"
// ==============================================================
// Cole este bloco inteiro em qualquer lugar do script.js (ex: perto
// do bloco "REGISTRAR INTERVENÇÃO RÁPIDA"). São funções novas, não
// mexem em nada que já existe.
// ==============================================================

let FOTO_OCORRENCIA_BASE64 = null;
let FILTRO_OCORRENCIA_ATUAL = '';

// --------------------------------------------------------------
// Chamada quando a aba é aberta (via abrirAba) — preenche o select
// de equipamentos e carrega a lista de ocorrências já registradas.
// --------------------------------------------------------------
window.renderAbaOcorrencia = function() {
    const select = document.getElementById("ocorrencia-equipamento");
    if (select) {
        const ordenados = [...BANCO_ATIVOS].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        select.innerHTML = `<option value="">Selecione...</option>` +
            ordenados.map(a => `<option value="${a.id}">${a.id} — ${a.tipo} (${a.local || 'Sem local'})</option>`).join("");
    }
    window.carregarListaOcorrencias();
};

// --------------------------------------------------------------
// Foto: mesma lógica de compressão usada no modal de Intervenção,
// só que guardando numa variável separada (FOTO_OCORRENCIA_BASE64)
// pra não conflitar se os dois formulários forem usados juntos.
// --------------------------------------------------------------
window.processarFotoOcorrencia = function(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
        alert('Por favor, escolha um arquivo de imagem.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const MAX_LADO = 1280;
            let largura = img.width;
            let altura = img.height;

            if (largura > altura && largura > MAX_LADO) {
                altura = Math.round((altura * MAX_LADO) / largura);
                largura = MAX_LADO;
            } else if (altura > MAX_LADO) {
                largura = Math.round((largura * MAX_LADO) / altura);
                altura = MAX_LADO;
            }

            const canvas = document.createElement('canvas');
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, largura, altura);

            FOTO_OCORRENCIA_BASE64 = canvas.toDataURL('image/jpeg', 0.7);

            const preview = document.getElementById('ocorrencia-foto-preview');
            const container = document.getElementById('ocorrencia-foto-preview-container');
            if (preview) preview.src = FOTO_OCORRENCIA_BASE64;
            if (container) container.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(arquivo);
    event.target.value = '';
};

window.removerFotoOcorrencia = function() {
    FOTO_OCORRENCIA_BASE64 = null;
    const preview = document.getElementById('ocorrencia-foto-preview');
    const container = document.getElementById('ocorrencia-foto-preview-container');
    if (preview) preview.src = '';
    if (container) container.classList.add('hidden');
};

// --------------------------------------------------------------
// Salva o registro (mesma rota /api/registro_com_foto que a
// Intervenção rápida usa) e recarrega a lista embaixo.
// --------------------------------------------------------------
window.confirmarOcorrencia = async function() {
    if (!verificarAcesso()) return;

    const equipamentoId = document.getElementById("ocorrencia-equipamento")?.value;
    const texto = document.getElementById("ocorrencia-texto")?.value.trim();
    const categoria = document.getElementById("ocorrencia-categoria")?.value || "Intervenção";

    if (!equipamentoId) return alert("Selecione o equipamento.");
    if (!texto) return alert("Escreva a descrição.");

    const iconePorCategoria = {
        "Intervenção": "🔧",
        "Melhoria": "✨",
        "Comentário": "💬",
        "Atividade Pendente": "⏳"
    };
    const icone = iconePorCategoria[categoria] || "🔧";
    const acaoFormatada = `${icone} <span style="color:#eab308;">[${categoria.toUpperCase()}]</span> ${texto}`;
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || "Técnico") : "Sistema";

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/registro_com_foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                peca_id: equipamentoId,
                acao: acaoFormatada,
                operador: operador,
                categoria: categoria,
                foto_base64: FOTO_OCORRENCIA_BASE64 || null
            })
        });

        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || "Não foi possível salvar o registro.");
            return;
        }

        // Também espelha no histórico local (mesma lógica de sempre)
        if (typeof registrarHistorico === 'function') {
            const evento = {
                data: new Date().toLocaleDateString('pt-BR') + " " + new Date().toLocaleTimeString('pt-BR'),
                tag: equipamentoId,
                acao: acaoFormatada,
                responsavel: operador
            };
            HISTORICO_ACOES.unshift(evento);
            localStorage.setItem("oms_historico_v32_local", JSON.stringify(HISTORICO_ACOES));
            if (typeof renderizarFeedAtividadeRecente === 'function') renderizarFeedAtividadeRecente();
        }

        // Limpa o formulário
        document.getElementById("ocorrencia-texto").value = "";
        window.removerFotoOcorrencia();

        alert(`✅ ${categoria} registrada em [${equipamentoId}]${FOTO_OCORRENCIA_BASE64 ? ' com foto' : ''}.`);
        window.carregarListaOcorrencias();
    } catch (e) {
        console.error('⚠️ Erro ao salvar ocorrência:', e);
        alert('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
    }
};

// --------------------------------------------------------------
// Filtro de categoria (botões acima da lista)
// --------------------------------------------------------------
window.filtrarOcorrencias = function(categoria, botaoClicado) {
    FILTRO_OCORRENCIA_ATUAL = categoria;
    document.querySelectorAll('#ocorrencia-filtros .btn-filter-mcc').forEach(b => b.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
    window.carregarListaOcorrencias();
};

// --------------------------------------------------------------
// Busca e renderiza a lista de ocorrências (com foto, se tiver)
// --------------------------------------------------------------
window.carregarListaOcorrencias = async function() {
    const container = document.getElementById("ocorrencia-lista-container");
    if (!container) return;

    container.innerHTML = `<div class="text-muted" style="text-align:center; padding:20px 0;">Carregando...</div>`;

    try {
        const apiBase = await resolverApiBase();
        const query = FILTRO_OCORRENCIA_ATUAL ? `?categoria=${encodeURIComponent(FILTRO_OCORRENCIA_ATUAL)}` : '';
        const resp = await fetch(`${apiBase}/api/registros_ocorrencia${query}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar');
        const registros = await resp.json();

        if (!Array.isArray(registros) || registros.length === 0) {
            container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Nenhum registro encontrado.</div>`;
            return;
        }

        container.innerHTML = registros.map(r => `
            <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); align-items:flex-start;">
                ${r.foto_base64 ? `
                    <img src="${r.foto_base64}"
                         style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--border); cursor:pointer; flex-shrink:0;"
                         onclick="window.open('${r.foto_base64}', '_blank')">
                ` : `
                    <div style="width:70px; height:70px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-muted);">
                        <i class="fas fa-image" style="font-size:20px; opacity:0.4;"></i>
                    </div>
                `}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                        <span class="font-code" style="font-weight:700; color:var(--text-heading);">${r.peca_id}</span>
                        <span style="font-size:11px; color:var(--text-muted);">${r.data_hora}</span>
                    </div>
                    <div style="font-size:13px; color:var(--text-body); margin-bottom:4px;">${r.acao}</div>
                    <div style="font-size:11px; color:var(--text-accent);">${r.operador}</div>
                </div>
            </div>
        `).join("");
    } catch (e) {
        console.error('⚠️ Erro ao carregar ocorrências:', e);
        container.innerHTML = `<div class="text-muted" style="text-align:center; padding:30px 0;">Não foi possível carregar. Verifique sua internet.</div>`;
    }
};


// ==============================================================
// INTEGRAÇÃO COM abrirAba — chamar renderAbaOcorrencia quando a
// aba for aberta. Ache a função window.abrirAba no script.js e
// adicione esta linha junto das outras (ex: logo depois da linha
// que trata "aba-oficina"):
//
//     if (idAba === "aba-ocorrencia" && typeof window.renderAbaOcorrencia === 'function') window.renderAbaOcorrencia();
// ==============================================================
