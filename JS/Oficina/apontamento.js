// ==========================================================================
// APONTAMENTO DIÁRIO, LAUDOS E SWAP — extraído de script.js na modularização
// ==========================================================================
// Conexão com o backend Python/Neon (sincronização de ativos),
// apontamento de produção diária (desconto de vida útil em lote),
// histórico de laudos gerados, e o fluxo de Saque/Swap/Reserva de
// equipamento entre Oficina e Máquina.

import { resolverApiBase, sincronizarAtivosReaisMCC4, salvarPecaNoPython, BANCO_ATIVOS } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { fetchComRetry, calcularDias, rotuloDesgaste, headersAdmin } from '../Core/utils.js';


// Local padrão "MCC 2 - Veio C" a partir do veio (C/D = 2, E/F = 3, G/H = 4).
// Ver comentário em Core/utils.js (localDoVeio) — duplicado aqui de
// propósito pra não depender do cache de outro arquivo.
function localPadraoDoVeio(veio, mccPadrao) {
    const v = String(veio || '').trim().toUpperCase();
    const mcc = { C: '2', D: '2', E: '3', F: '3', G: '4', H: '4' }[v] || mccPadrao || '';
    return `MCC ${mcc} - Veio ${v}`;
}

window.abrirModalProducao = function() {
    document.getElementById("prod-mcc2").value = "";
    document.getElementById("prod-mcc3").value = "";
    document.getElementById("prod-mcc4").value = "";
    document.getElementById("modal-producao-diaria").classList.remove("hidden");
};

window.fecharModalProducao = function() {
    document.getElementById("modal-producao-diaria").classList.add("hidden");
};


// ==============================================================
// 2. CONEXÃO COM O PYTHON 
// ==============================================================
window.carregarAtivosDoPython = async function() {
 
    console.log("🔄 Conectando ao Banco de Dados Python...");
    const atualizou = await sincronizarAtivosReaisMCC4();
    if (atualizou) {
        console.log(`✨ Tela atualizada! ${BANCO_ATIVOS.length} peças carregadas.`);
    } else {
        console.warn("⚠️ Python Offline. Usando dados locais.");
    }
    return atualizou;
};

// ==============================================================
// 3. APONTAMENTO DE PRODUÇÃO GERAL E MOLDES
// ==============================================================
window.processarProducaoDiaria = async function() {
    if (!window.verificarAcesso()) return;

    const prodMcc2 = parseFloat(document.getElementById("prod-mcc2").value) || 0;
    const prodMcc3 = parseFloat(document.getElementById("prod-mcc3").value) || 0;
    const prodMcc4 = parseFloat(document.getElementById("prod-mcc4").value) || 0;

    if (prodMcc2 === 0 && prodMcc3 === 0 && prodMcc4 === 0) return alert("⚠️ Digite a produção de pelo menos uma máquina.");

    // 🔧 CORREÇÃO (achado no teste completo): o botão da tela nova é
    // ".pd-salvar" — procurar ".btn-success" dava null e o lançamento
    // inteiro quebrava sem gravar nada. Agora tolera não achar o botão.
    const btn = document.querySelector("#aba-producao .pd-salvar") || document.querySelector("#aba-producao .btn-success") || { disabled: false, innerHTML: "" };
    const textoOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> Lançando...";

    let pecasAtualizadas = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        // 🔧 CORREÇÃO ("osciladores contabilizando tonelagem"): Oscilador e
        // Mesa Osciladora reaproveitam o campo `ton` pra guardar DIAS de
        // vida (não toneladas — ver rotuloDesgaste, comentário mais acima
        // neste arquivo), então precisam ficar de fora do incremento de
        // produção igual Molde já fica. Sem este filtro, cada lançamento
        // somava tonelagem lingotada em cima do que devia ser uma
        // contagem de dias, inflando o desgaste desses itens à toa — a
        // contagem de dias de verdade já é calculada à parte, a partir de
        // dataEntradaVeio (calcularDias), e não é afetada por isto aqui.
        if (p.status === "Instalado" && p.tipo && !p.tipo.toUpperCase().includes("MOLDE") && p.tipo !== "Oscilador" && p.tipo !== "Mesa Osciladora") {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && prodMcc2 > 0) { p.ton = (p.ton || 0) + prodMcc2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && prodMcc3 > 0) { p.ton = (p.ton || 0) + prodMcc3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && prodMcc4 > 0) { p.ton = (p.ton || 0) + prodMcc4; sofreuDesgaste = true; }
            if (sofreuDesgaste) pecasAtualizadas++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO CRÍTICA (achado de auditoria de Go-Live): esse
        // endpoint SOMA tonelagem em todos os equipamentos instalados —
        // não é idempotente. fetchComRetry reenvia sozinho em timeout/5xx
        // mesmo quando o servidor já processou a primeira tentativa
        // (só a resposta que não voltou), o que soma a tonelagem da
        // fábrica inteira 2x. Usa fetch puro aqui — sem retry automático
        // nessa chamada específica.
        const resposta = await fetch(`${apiBase}/api/apontar_producao_geral`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: prodMcc2, qtd_mcc3: prodMcc3, qtd_mcc4: prodMcc4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Sistema" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("prod-mcc2").value = ""; document.getElementById("prod-mcc3").value = ""; document.getElementById("prod-mcc4").value = "";
            
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ Sucesso Absoluto!\n${pecasAtualizadas} equipamentos gerais foram atualizados.`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com a API."); }

    btn.disabled = false; btn.innerHTML = textoOriginal;
};

window.salvarApontamentoMoldes = async function(event) {
    if (!window.verificarAcesso()) return;

    const m2 = parseInt(document.getElementById("molde-prod-mcc2").value) || 0;
    const m3 = parseInt(document.getElementById("molde-prod-mcc3").value) || 0;
    const m4 = parseInt(document.getElementById("molde-prod-mcc4").value) || 0;

    if (m2 === 0 && m3 === 0 && m4 === 0) return alert("Digite a quantidade de panelas.");

    const btn = event.currentTarget;
    const txtOriginal = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "<i class='fas fa-spinner fa-pulse'></i> Processando...";

    let moldesAtualizados = 0;
    for (let i = 0; i < BANCO_ATIVOS.length; i++) {
        let p = BANCO_ATIVOS[i];
        if (p.status === "Instalado" && p.tipo && p.tipo.toUpperCase().includes("MOLDE")) {
            let sofreuDesgaste = false;
            if ((p.local.includes("Veio C") || p.local.includes("Veio D")) && m2 > 0) { p.ton = (p.ton || 0) + m2; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio E") || p.local.includes("Veio F")) && m3 > 0) { p.ton = (p.ton || 0) + m3; sofreuDesgaste = true; }
            else if ((p.local.includes("Veio H") || p.local.includes("Veio G") || p.local.includes("MCC 4")) && m4 > 0) { p.ton = (p.ton || 0) + m4; sofreuDesgaste = true; }
            if (sofreuDesgaste) moldesAtualizados++;
        }
    }
    localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO CRÍTICA (mesmo achado de auditoria — ver
        // apontar_producao_geral acima): endpoint acumulativo, não
        // idempotente. Sem retry automático aqui.
        const resposta = await fetch(`${apiBase}/api/apontar_moldes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qtd_mcc2: m2, qtd_mcc3: m3, qtd_mcc4: m4, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById("molde-prod-mcc2").value = ""; document.getElementById("molde-prod-mcc3").value = ""; document.getElementById("molde-prod-mcc4").value = "";
            
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            alert(`✅ ${moldesAtualizados} Moldes foram atualizados com sucesso!`);
        } else { alert("❌ Erro no Banco: " + (resultado.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão com o Python."); }
    
    btn.disabled = false; btn.innerHTML = txtOriginal;
};

window.carregarHistoricoApontamentoGeral = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_geral`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-geral");
        window.__pdGeral = Array.isArray(json) ? json : [];
        if (typeof window.atualizarResumoProducao === 'function') window.atualizarResumoProducao();
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // data_hora já é horário de Brasília (gravado com agora_brasil)
                // data_hora já vem em horário de Brasília (agora_brasil no backend) — antes somava 'Z' e mostrava 3h a menos
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T').slice(0, 19))
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1
                    ? `<span class="pd-desfeito">Desfeito</span>`
                    : `<button type="button" class="cc-btn pd-desfazer" onclick="window.desfazerApontamentoGeral(${log.id})">Desfazer</button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc2 > 0 ? '+'+Number(log.qtd_mcc2).toLocaleString('pt-BR') : '—'}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc3 > 0 ? '+'+Number(log.qtd_mcc3).toLocaleString('pt-BR') : '—'}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc4 > 0 ? '+'+Number(log.qtd_mcc4).toLocaleString('pt-BR') : '—'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6' class='text-muted'>Nenhum lançamento ainda.</td></tr>"; }
    } catch (e) { console.error(e); }
};


window.carregarHistoricoApontamentoMoldes = async function() {
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/historico_apontamentos_moldes`);
        const json = await res.json();
        const tbody = document.getElementById("tabela-historico-moldes");
        window.__pdMoldes = Array.isArray(json) ? json : [];
        if (typeof window.atualizarResumoProducao === 'function') window.atualizarResumoProducao();
        if (!tbody) return;
        if (Array.isArray(json) && json.length > 0) {
            tbody.innerHTML = json.map(log => {
                // data_hora já é horário de Brasília (gravado com agora_brasil)
                // data_hora já vem em horário de Brasília (agora_brasil no backend) — antes somava 'Z' e mostrava 3h a menos
                const dataHoraLocal = new Date(log.data_hora.replace(' ', 'T').slice(0, 19))
                                         .toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

                let btnAcao = log.desfeito === 1
                    ? `<span class="pd-desfeito">Desfeito</span>`
                    : `<button type="button" class="cc-btn pd-desfazer" onclick="window.desfazerApontamentoMolde(${log.id})">Desfazer</button>`;
                return `<tr><td>${dataHoraLocal}</td><td style="text-align:left;">${log.operador}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc2 > 0 ? '+'+Number(log.qtd_mcc2).toLocaleString('pt-BR') : '—'}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc3 > 0 ? '+'+Number(log.qtd_mcc3).toLocaleString('pt-BR') : '—'}</td><td class="pd-num${log.desfeito === 1 ? ' pd-riscado' : ''}">${log.qtd_mcc4 > 0 ? '+'+Number(log.qtd_mcc4).toLocaleString('pt-BR') : '—'}</td><td>${btnAcao}</td></tr>`;
            }).join("");
        } else { tbody.innerHTML = "<tr><td colspan='6' class='text-muted'>Nenhum lançamento ainda.</td></tr>"; }
    } catch (e) { console.error(e); }
};

// 🔧 "AÇÃO RESTRITA: senha master dev123" removido — era decoração
// (senha em texto puro no JS, sem checagem nenhuma no servidor; ver
// revisão de segurança). A proteção de verdade agora é o servidor
// exigir um token de admin (ver headersAdmin() acima e exigir_admin()
// no backend) — o confirm() abaixo continua só pra evitar clique
// acidental, não é mais a "segurança" da ação.
window.desfazerApontamentoGeral = async function(id_log) {
    if (!confirm("Tem certeza? A tonelagem será RETIRADA de todas as peças instaladas.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_geral`, {
            method: "POST", headers: headersAdmin(),
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();

        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoGeral === 'function') window.carregarHistoricoApontamentoGeral();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};

window.desfazerApontamentoMolde = async function(id_log) {
    if (!confirm("Tem certeza? As corridas serão RETIRADAS dos moldes na linha.")) return;
    try {
        const apiBase = await resolverApiBase();
        const res = await fetchComRetry(`${apiBase}/api/desfazer_apontamento_moldes`, {
            method: "POST", headers: headersAdmin(),
            body: JSON.stringify({ log_id: id_log, operador: OPERADOR_LOGADO ? OPERADOR_LOGADO.nome : "Desconhecido" })
        });
        const json = await res.json();
        
        if (json.sucesso) {
            alert("✅ Lançamento desfeito com sucesso!");
            await window.carregarAtivosDoPython();
            if (typeof window.carregarHistoricoApontamentoMoldes === 'function') window.carregarHistoricoApontamentoMoldes();
            if (typeof window.atualizarPainelCompleto === 'function') window.atualizarPainelCompleto();
            if (typeof window.renderAtivos === 'function') window.renderAtivos();
            if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
        } else { alert("❌ Erro: " + (json.detail || "desconhecido")); }
    } catch (e) { alert("❌ Erro de conexão."); }
};



// ==============================================================
// 4. HISTÓRICO DE LAUDOS E SWAP
// ==============================================================
// 🔧 CORREÇÃO ("laudos só existiam no localStorage de quem gerava"):
// antes, o PDF do folhão ficava só no navegador de quem finalizava —
// sumia se limpasse os dados, e nunca aparecia pra outro técnico em
// outro aparelho, nem pra outro moderador na Auditoria. Agora persiste
// no Neon (tabela "laudos"), igual todo o resto do histórico.
// 🔧 CORREÇÃO ("cada clique em Salvar cria uma linha nova no banco em
// vez de atualizar o rascunho"): execucaoId (opcional) amarra o laudo à
// execução (reparo) em andamento — o backend faz UPSERT por
// execucao_id, então salvar de novo durante o mesmo reparo atualiza a
// mesma linha em vez de acumular uma nova a cada clique.
window.salvarLaudoNoHistorico = async function(tag, tipo, htmlPDF, execucaoId = null) {
    const operador = OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema';
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ peca_id: tag, tipo, html: htmlPDF, operador, execucao_id: execucaoId })
        });
        if (!resp.ok) throw new Error('A API não confirmou o salvamento do laudo.');
        const resultado = await resp.json();
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
        return resultado.id;
    } catch (e) {
        console.error('⚠️ Não consegui salvar o laudo no servidor:', e);
        return null;
    }
};

window.excluirLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/excluir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!resp.ok) {
            alert('Não foi possível excluir o laudo.');
            return;
        }
        if (typeof window.renderHistorico === 'function') window.renderHistorico();
    } catch (e) {
        console.error('⚠️ Erro ao excluir laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.visualizarLaudo = async function(id) {
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/laudos/${id}`, { cache: 'no-store' });
        if (!resp.ok) return alert('Laudo não encontrado.');
        const laudo = await resp.json();
        const win = window.open('', '_blank', 'width=1100,height=800');
        if (win) { win.document.write(window.prepararHtmlLaudo(laudo.html)); win.document.close(); }
        else { const p = document.getElementById('print-content'); if (p) { p.innerHTML = window.prepararHtmlLaudo(laudo.html); window.print(); } }
    } catch (e) {
        console.error('⚠️ Erro ao carregar laudo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};


// 🆕 TRANSPORTE FÍSICO (Logística) — o swap de peça (abaixo) muda o
// STATUS no sistema na hora ("Instalado"/"Oficina / Reparo"), mas isso
// é só o registro — a peça continua fisicamente onde estava até
// alguém de verdade carregar ela na carreta. Sem isso, "Oficina" no
// sistema não significa "chegou na oficina" de verdade, e ninguém
// ficava sabendo que precisava buscar/levar um equipamento.
// Decisão explícita: NÃO mexe no status nem na lógica do swap (que já
// funciona e é usada em vários lugares) — só cria uma atividade
// normal pra área "logistica", reaproveitando 100% a infraestrutura
// que já existe (POST /api/oficina/atividade — mesma rota do botão
// "+ Lançar Atividade" que a Logística já usa). A Logística vê na
// própria fila de Atividades Pendentes, anexa foto do documento de
// retirada ao editar (já suportado) e marca Concluído quando entregar
// de verdade — sem criar nenhum sistema novo.
async function notificarLogisticaTransporte(descricao, equipamentoId, destino) {
    // 🔧 CORREÇÃO ("prontuário deve mostrar toda logística finalizada e
    // pra onde"): até aqui, essa atividade só existia na fila da
    // Logística — quando ela marcava "Concluído", nada era escrito no
    // Prontuário da peça (só o fluxo de reabastecimento, marcador
    // [REABASTECER_RESERVA:<id>], fechava esse loop). Mesmo padrão de
    // marcador em texto na descrição (sem mudar schema do backend), pra
    // processarMarcadorAtividadeConcluida saber qual peça e destino
    // registrar no histórico quando a entrega de verdade for confirmada.
    const descricaoComMarcador = (equipamentoId && destino)
        ? `[TRANSPORTE:${equipamentoId}:${destino}] ${descricao}`
        : descricao;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/atividade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: 'logistica',
                equipamento_id: equipamentoId || null,
                descricao: descricaoComMarcador,
                responsavel: null,
                prioridade: 'Alta',
                operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema',
                foto_base64: null,
                prazo: null,
                data_inicio: null,
                solicitante_matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null
            })
        });
    } catch (e) {
        // Nunca pode travar o swap por causa disso — a troca de peça já
        // foi aplicada e salva; se a notificação falhar, só avisa no
        // console (mesmo padrão de robustez usado em todo o sistema).
        console.error('⚠️ Não consegui avisar a Logística sobre o transporte:', e);
    }
}
window.notificarLogisticaTransporte = notificarLogisticaTransporte;

// 🆕 REABASTECIMENTO DA RESERVA NA MÁQUINA: quando um reparo termina, a
// peça vira "Oficina / Reserva" (parada na oficina central), mas o
// estoque volante de verdade fica perto da máquina ("Máquina /
// Reserva"), pronto pra swap instantâneo sem acionar a Logística de
// novo. Essa função pede o transporte oficina→máquina pra repor esse
// estoque, reaproveitando a mesma rota/infra de notificarLogisticaTransporte.
// A descrição carrega o marcador [REABASTECER_RESERVA:<ID>] — é o jeito
// simples de linkar essa atividade de volta à peça quando a Logística
// concluir (ver parsing em mudarStatusAtividadeOficina), sem precisar
// mudar o schema do backend.
window.notificarLogisticaReabastecimento = async function(peca) {
    if (!peca || !peca.id) return;
    try {
        const apiBase = await resolverApiBase();
        await fetch(`${apiBase}/api/oficina/atividade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: 'logistica',
                equipamento_id: peca.id,
                descricao: `[REABASTECER_RESERVA:${peca.id}] Levar ${peca.id} (${peca.tipo}) da Oficina para Reserva na Máquina.`,
                responsavel: null,
                prioridade: 'Normal',
                operador: OPERADOR_LOGADO ? (OPERADOR_LOGADO.nome || 'Sistema') : 'Sistema',
                foto_base64: null,
                prazo: null,
                data_inicio: null,
                solicitante_matricula: OPERADOR_LOGADO ? OPERADOR_LOGADO.matricula : null
            })
        });
    } catch (e) {
        // Fire-and-forget — igual a notificarLogisticaTransporte, nunca
        // pode travar a conclusão do reparo por causa disso.
        console.error('⚠️ Não consegui avisar a Logística sobre o reabastecimento da reserva:', e);
    }
};

// 🆕 Botão "Mandar pra Máquina" da seção Reserva na Oficina (ver
// JS/ui.js, montarSecaoPorLocal): peça ainda na oficina não tem veio
// nem posição pra escolher — só faz sentido pedir o transporte.
// Reaproveita a mesma notificarLogisticaReabastecimento() que já roda
// sozinha quando um reparo termina; esse botão serve pra reenviar o
// pedido manualmente (ex: peça antiga que nunca teve o pedido
// disparado, ou pedido perdido) sem precisar esperar outro reparo.
window.enviarReservaParaMaquina = async function(idPeca) {
    if (!window.verificarAcesso()) return;
    const peca = BANCO_ATIVOS.find(a => a.id === idPeca);
    if (!peca) return alert('Peça não encontrada.');
    if (peca.local !== "Oficina / Reserva") return alert('Essa peça não está na Reserva da Oficina.');

    if (!confirm(`Pedir pra Logística levar ${peca.id} da Oficina pra Reserva na Máquina?`)) return;

    await window.notificarLogisticaReabastecimento(peca);
    alert(`🚚 Pedido enviado! ${peca.id} vai aparecer em "Reserva na Máquina" assim que a Logística confirmar a entrega.`);
};

window.iniciarSwapAlocacao = async function(idReserva) {
    if (!window.verificarAcesso()) return;
    const veioSelect = document.getElementById(`alocar-veio-${idReserva}`);
    const posElement = document.getElementById(`alocar-pos-${idReserva}`);
    if (!veioSelect) return alert('Erro: campo de veio não encontrado.');

    const veio = veioSelect.value;
    let posicao = posElement ? posElement.value : '';
    let pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
    
    if (!pecaReserva) return alert('Peça reserva não encontrada.');
    if (!veio) return alert('Selecione o Veio de destino.');

    const tipoUpper = (pecaReserva.tipo || '').toUpperCase();
    const mcc = pecaReserva.mcc_compat || '4';
    
    let slotChassi = posicao;
    if (mcc === '4') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('BENDER')) slotChassi = 'BENDER';
        else if (tipoUpper.includes('STR-1') || tipoUpper.includes('STRAIGHTENER R1')) slotChassi = 'STR-1';
        else if (tipoUpper.includes('STR-2') || tipoUpper.includes('STRAIGHTENER R2')) slotChassi = 'STR-2';
        else if (tipoUpper.includes('BOW')) slotChassi = `BOW-${posicao}`;
        else if (tipoUpper.includes('HORIZONTAL')) slotChassi = `HOR-${posicao}`;
        // 🔧 CORREÇÃO ("Oscilador entra na posição Sul ou Norte, mas o
        // select de posição do Swap fica vazio"): faltava esse caso —
        // mesma trava "OSC-N"/"OSC-S" que o Cadastro já usa (ver
        // "posicaoFixa = 'OSC-' + posicao" mais abaixo), só que o Swap
        // nunca replicava.
        else if (tipoUpper.includes('OSCILADOR')) slotChassi = `OSC-${posicao}`;
    } else if (mcc === '2/3') {
        if (tipoUpper.includes('MOLDE')) slotChassi = 'MOLDE';
        else if (tipoUpper.includes('ZERO') || tipoUpper.includes('SEGMENTO ZERO')) slotChassi = 'SEG-ZERO';
        else if (tipoUpper.includes('CADEIRA SUPERIOR')) slotChassi = `CAD-SUP-${posicao}`;
        else if (tipoUpper.includes('CADEIRA INFERIOR')) slotChassi = `CAD-INF-${posicao}`;
        else if (tipoUpper.includes('SEGMENTO')) slotChassi = `SEG-${posicao}`;
    }

    if (!slotChassi || slotChassi === "") return alert('Selecione a Posição de destino para este equipamento.');

    // 🔧 CORREÇÃO ("dois técnicos fazem swap pro mesmo slot ao mesmo
    // tempo e os dois equipamentos ficam marcados como instalados no
    // mesmo lugar"): antes, a busca por quem já ocupa o slot usava só o
    // BANCO_ATIVOS em cache local (até ~20s desatualizado, ou mais se
    // ninguém mais tiver sincronizado). Busca o estado mais recente do
    // servidor antes de decidir quem ocupa o slot — reduz a janela de
    // corrida de "minutos" pra "frações de segundo entre este fetch e o
    // salvarPecaNoPython() logo abaixo".
    await sincronizarAtivosReaisMCC4();
    pecaReserva = BANCO_ATIVOS.find(a => a.id === idReserva);
    if (!pecaReserva) return alert('Peça reserva não encontrada (o cadastro pode ter mudado — recarregue a tela e tente de novo).');
    if (pecaReserva.local !== "Máquina / Reserva") {
        return alert('Essa peça não está mais em "Máquina / Reserva" — outra pessoa pode já ter mexido nela. Recarregue a tela.');
    }

    // 🔧 CORREÇÃO CRÍTICA ("coloquei o Bow e ele expulsou o Molde que
    // tinha acabado de instalar"): a busca pela peça que já ocupa o
    // slot usava DOIS critérios — `p.posicaoFixa === slotChassi` OU
    // `p.id.includes(slotChassi)`. O segundo critério (substring no ID)
    // era uma tentativa antiga de cobrir peças sem posicaoFixa
    // confiável — mas hoje toda peça instalada TEM posicaoFixa
    // confiável (essa é literalmente a correção que fizemos nas últimas
    // rodadas). Esse segundo critério agora só serve pra gerar falso
    // positivo: como as peças de Estoque Reserva podem ter QUALQUER tag
    // digitada pelo técnico, era só o ID de alguma peça já instalada
    // (ex: o Molde) conter, por coincidência, os mesmos caracteres do
    // slotChassi sendo procurado (ex: "BOW-1") pra ela ser encontrada
    // por engano e expulsa do lugar certo dela.
    let pecaAntiga = null;
    for (const p of BANCO_ATIVOS) {
        if ((p.veio === veio && p.status === "Instalado") || (p.local && p.local.includes(`Veio ${veio}`) && !p.local.includes("Oficina"))) {
            if (p.posicaoFixa === slotChassi) { pecaAntiga = p; break; }
        }
    }

    // 🆕 "Máquina / Reserva" = peça já entregue fisicamente perto da
    // máquina, pronta pra swap instantâneo. "Oficina / Reserva" = peça
    // ainda parada na oficina central, que primeiro precisa passar pelo
    // botão "Mandar pra Máquina" (aba Reserva) e só aparece aqui depois
    // que a Logística confirmar a entrega.
    //
    // O Swap só é oferecido na UI pra peças que já
    // estão em "Máquina / Reserva" (ver JS/ui.js, montarSecaoPorLocal —
    // a seção "Reserva na Oficina" não tem mais select de veio/posição
    // nem botão Swap, só o botão "Mandar pra Máquina", que aciona
    // window.enviarReservaParaMaquina). Então, na prática, uma peça
    // chegando aqui SEMPRE está fisicamente na máquina — instala na
    // hora, sem estado "pendente de transporte" (aquele fluxo chegou a
    // existir numa versão anterior, mas guardava o destino em campos
    // que o backend nem persiste de verdade — Pydantic descarta campo
    // desconhecido silenciosamente — então foi removido).
    if (pecaReserva.local !== "Máquina / Reserva") {
        return alert('Essa peça ainda está na Reserva da Oficina — use "Mandar pra Máquina" primeiro (aba Reserva) e espere a Logística confirmar a entrega antes de instalar.');
    }

    if (pecaAntiga) {
        if (confirm(`A peça ${pecaAntiga.id} será SACADA do slot ${slotChassi} (Veio ${veio}) para dar lugar à ${pecaReserva.id}.`)) {
            pecaAntiga.status = "Oficina / Reparo"; pecaAntiga.local = "Oficina / Reparo";
            pecaAntiga.veio = ""; pecaAntiga.posicaoFixa = ""; pecaAntiga.pos = ""; pecaAntiga.dataReparo = Date.now(); pecaAntiga.dias = 0; pecaAntiga.dataEntradaVeio = null;
            pecaAntiga.substituidoPor = pecaReserva.id;

            pecaReserva.local = localPadraoDoVeio(veio, mcc); pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            // Persiste as duas peças no banco Postgres (a que saiu e a que entrou)
            if (typeof salvarPecaNoPython === 'function') {
                const okAntiga = await salvarPecaNoPython(pecaAntiga);
                const okReserva = await salvarPecaNoPython(pecaReserva);
                // 🔧 CORREÇÃO: salvarPecaNoPython() agora retorna true/false — antes,
                // se a gravação no Postgres falhasse (rede instável, Neon "acordando"),
                // a tela já mostrava o swap como concluído (alert de sucesso mais
                // abaixo) e o operador nunca ficava sabendo que o servidor não
                // recebeu a mudança, até ela "desfazer sozinha" no próximo sync.
                if (!okAntiga || !okReserva) {
                    alert(`⚠️ O swap foi aplicado na tela, mas houve falha ao salvar no servidor (${!okAntiga ? pecaAntiga.id : pecaReserva.id}). Verifique a conexão e tente sincronizar de novo antes de sair da tela, ou a mudança pode ser perdida.`);
                }
            }

            if (window.registrarHistorico) {
                const agora = new Date().toLocaleDateString('pt-BR');
                // 🔧 CORREÇÃO ("evento de instalação não aparece no
                // Prontuário"): ver nota grande em registrarHistorico()
                // — agora espera o registro terminar de salvar no banco
                // ANTES de liberar o alert() de sucesso, pra evitar que o
                // técnico troque de tela rápido demais e a chamada seja
                // abandonada antes de terminar.
                await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} em ${agora} (substituiu ${pecaAntiga.id}). Contagem de dias na máquina reiniciada.`);
                await window.registrarHistorico(pecaAntiga.id, `📤 Saiu do slot ${slotChassi} do Veio ${veio} em ${agora}, substituída por ${pecaReserva.id}. Foi para reparo — contagem de dias em reparo reiniciada.`);
            }
            if (typeof window.renderReparos === 'function') window.renderReparos(); if (typeof window.renderReservas === 'function') window.renderReservas();
            if (typeof window.renderAtivos === 'function') window.renderAtivos(); if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            notificarLogisticaTransporte(
                `Transportar: retirar ${pecaAntiga.id} do Veio ${veio} (slot ${slotChassi}) e levar pra Oficina`,
                pecaAntiga.id,
                'Oficina'
            );
            alert(`✅ Swap realizado! ${pecaReserva.id} instalado.`);
        }
    } else {
        if (confirm(`Instalar a reserva ${pecaReserva.id} no slot ${slotChassi} do Veio ${veio}?`)) {
            pecaReserva.local = localPadraoDoVeio(veio, mcc); pecaReserva.veio = veio; pecaReserva.posicaoFixa = slotChassi; pecaReserva.pos = slotChassi; pecaReserva.status = "Instalado"; pecaReserva.dataEntradaVeio = Date.now(); pecaReserva.dias = 0; pecaReserva.substituidoPor = null;
            localStorage.setItem("oms_ativos_v32_local", JSON.stringify(BANCO_ATIVOS));

            if (typeof salvarPecaNoPython === 'function') {
                const okReserva = await salvarPecaNoPython(pecaReserva);
                if (!okReserva) {
                    alert(`⚠️ A instalação foi aplicada na tela, mas houve falha ao salvar ${pecaReserva.id} no servidor. Verifique a conexão e tente sincronizar de novo antes de sair da tela, ou a mudança pode ser perdida.`);
                }
            }

            // 🔧 Ver correção em registrarHistorico(): espera terminar de
            // salvar antes do alert() de sucesso liberar o técnico.
            if (window.registrarHistorico) {
                await window.registrarHistorico(pecaReserva.id, `📥 Entrou no slot ${slotChassi} do Veio ${veio} (gaveta vazia). Contagem de dias na máquina reiniciada.`);
            }

            if (typeof window.renderReparos === 'function') window.renderReparos(); if (typeof window.renderReservas === 'function') window.renderReservas();
            if (typeof window.renderAtivos === 'function') window.renderAtivos(); if (typeof window.renderPainelVeios === 'function') window.renderPainelVeios();
            // Já estava fisicamente na máquina — não precisa acionar
            // transporte de novo, é só uma instalação local.
            alert(`✅ ${pecaReserva.id} instalado com sucesso!`);
        }
    }
};

window.forcarCamposPosicao = function() {
    const rows = document.querySelectorAll('#estoque-table-body tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            const posCell = cells[4]; const tagId = cells[0]?.textContent?.trim();
            if (tagId && !posCell.querySelector('input') && !posCell.querySelector('select')) {
                const input = document.createElement('input'); input.type = 'number'; input.id = `pos-${tagId}`; input.placeholder = 'Pos'; input.min = 1; input.max = 99;
                input.style.cssText = 'width:55px; padding:4px 6px; font-size:12px; border-radius:4px; border:2px solid #10b981; background:#1a1a2e; color:#fff; text-align:center;';
                posCell.innerHTML = ''; posCell.appendChild(input);
            }
        }
    });
};



// 🎨 Padrão novo da tela de produção: total somando enquanto digita (ajuda
// a pegar erro de digitação antes de lançar) e o resumo do topo calculado
// das próprias auditorias (hoje, 7 dias, último lançamento).
window.atualizarTotaisProducao = function() {
    const soma = pre => ['2', '3', '4'].reduce((t, m) => t + (Number(document.getElementById(pre + m)?.value) || 0), 0);
    const ton = soma('prod-mcc'), pan = soma('molde-prod-mcc');
    const e1 = document.getElementById('pd-total-ton'); if (e1) e1.textContent = `${ton.toLocaleString('pt-BR')} t`;
    const e2 = document.getElementById('pd-total-pan'); if (e2) e2.textContent = `${pan.toLocaleString('pt-BR')} panela${pan === 1 ? '' : 's'}`;
};

window.atualizarResumoProducao = function() {
    if (typeof window.atualizarTotaisProducao === 'function') window.atualizarTotaisProducao();
    const validos = l => (Array.isArray(l) ? l : []).filter(x => x.desfeito !== 1);
    const geral = validos(window.__pdGeral), moldes = validos(window.__pdMoldes);
    const dia = x => (x.data_hora || '').slice(0, 10);
    const hojeStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const limite = new Date(Date.now() - 6 * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const soma = l => l.reduce((t, x) => t + (Number(x.qtd_mcc2) || 0) + (Number(x.qtd_mcc3) || 0) + (Number(x.qtd_mcc4) || 0), 0);
    const tonHoje = soma(geral.filter(x => dia(x) === hojeStr)), panHoje = soma(moldes.filter(x => dia(x) === hojeStr));
    const tonSem = soma(geral.filter(x => dia(x) >= limite)), panSem = soma(moldes.filter(x => dia(x) >= limite));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('pd-hoje', `${tonHoje.toLocaleString('pt-BR')} t`);
    const hojeSub = document.querySelector('#pd-hoje + .cc-kpi-sub'); if (hojeSub) hojeSub.textContent = `${panHoje.toLocaleString('pt-BR')} panela${panHoje === 1 ? '' : 's'} hoje`;
    set('pd-semana', `${tonSem.toLocaleString('pt-BR')} t`);
    set('pd-semana-sub', `${panSem.toLocaleString('pt-BR')} panelas nos últimos 7 dias`);
    const ultimo = [...geral, ...moldes].sort((a, b) => String(b.data_hora).localeCompare(String(a.data_hora)))[0];
    if (ultimo) {
        const d = new Date(String(ultimo.data_hora).replace(' ', 'T').slice(0, 19));
        set('pd-ultimo', d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
        set('pd-ultimo-sub', String(ultimo.operador || '').replace(/\s*\[.*\]\s*$/, '') || '—');
    } else { set('pd-ultimo', 'Nenhum'); set('pd-ultimo-sub', 'ainda não houve lançamento'); }
};
