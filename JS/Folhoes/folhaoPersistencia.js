// ==============================================================
// folhaoPersistencia.js
// ==============================================================
// Módulo único e genérico de "salvar progresso" do folhão, usado por
// TODOS os equipamentos (Molde4, Molde23, Bow, Horizontal, R2,
// Straightener R1, Segmento Zero, Bender, Desempenadeira).
//
// Problema que resolve: antes, se o técnico preenchia a CHEGADA e
// fechava o folhão, os dados sumiam. Agora, a cada alteração no
// formulário o progresso é salvo automaticamente no banco (Neon via
// API), vinculado ao ID do equipamento. Quando o folhão for reaberto
// (no mesmo PC ou em outro), os campos já vêm preenchidos, faltando só
// completar a etapa de SAÍDA. O rascunho só é apagado quando o folhão
// é finalizado/impresso (window.finalizarRascunhoFolhao).
// ==============================================================

import { resolverApiBase } from '../Core/banco.js?v=5';
import { headersAdmin } from '../Core/utils.js';

// --------------------------------------------------------------
// COLETA GENÉRICA DE TODOS OS CAMPOS DENTRO DE UM MODAL
// --------------------------------------------------------------
// 🆕 Agora também coleta QUAIS campos foram editados manualmente pelo
// técnico (data-editado-manual="1", marcado por ativarAutoSalvamentoFolhao
// sempre que o próprio usuário mexe num campo — nunca quando é o script
// que preenche via .value=). Isso é o que permite ao Checklist de
// Execução respeitar uma correção manual feita direto no Folhão, em vez
// de sempre sobrescrever na próxima abertura.
export function coletarDadosModal(modalId) {
    const modal = document.getElementById(modalId);
    const dados = { campos: {}, radios: {}, editadosManualmente: {} };
    if (!modal) return dados;

    modal.querySelectorAll('input, textarea, select').forEach(el => {
        if (!el.id) return;
        if (el.type === 'radio') return; // radios são tratados abaixo, por name
        if (el.type === 'checkbox') {
            dados.campos[el.id] = el.checked;
        } else {
            dados.campos[el.id] = el.value;
        }
        if (el.dataset.editadoManual === '1') dados.editadosManualmente[el.id] = true;
    });

    const nomesRadio = new Set();
    modal.querySelectorAll('input[type="radio"][name]').forEach(el => nomesRadio.add(el.name));
    nomesRadio.forEach(nome => {
        const marcado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`);
        if (marcado) dados.radios[nome] = marcado.value;
        const algumEditado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"][data-editado-manual="1"]`);
        if (algumEditado) dados.editadosManualmente[`radio:${nome}`] = true;
    });

    return dados;
}

// --------------------------------------------------------------
// MARCA VISUALMENTE UM CAMPO/GRUPO COMO "EDITADO MANUALMENTE NO
// FOLHÃO" — cor diferente da que o Checklist de Execução usa (azul, em
// vez do verde/vermelho do preenchimento automático), pra ficar claro
// que essa resposta foi conferida/corrigida na mão e não vem mais do
// Checklist.
// --------------------------------------------------------------
function marcarEditadoManual(el) {
    if (!el) return;
    el.dataset.editadoManual = '1';
    el.style.background = 'rgba(56, 189, 248, 0.14)';
    el.style.borderColor = 'var(--primary, #38bdf8)';
    el.title = '✍️ Editado manualmente no Folhão — não será mais sobrescrito pelo Checklist de Execução';
}

// --------------------------------------------------------------
// PREENCHE O MODAL COM UM RASCUNHO CARREGADO DO BANCO
// --------------------------------------------------------------
// 🆕 Linhas de material criadas com "Adicionar linha" só existem depois
// do clique — ao reabrir o Folhão, o rascunho trazia os valores delas mas
// o <input> ainda não existia, e o material digitado sumia sem aviso.
// Aqui: se o campo salvo casa com um desses padrões, cria as linhas que
// faltam antes de preencher.
const LINHAS_DINAMICAS_FOLHAO = [
    [/^desemp_mat_(?:cod|desc|qtd)_(\d+)$/, 'adicionarLinhaMaterialDesemp'],
    [/^mat-bender-(?:desc|qtd)-(\d+)$/, 'adicionarLinhaMaterialBender'],
    [/^(?:mat|qtd)-r2-(\d+)$/, 'adicionarLinhaMaterialR2'],
];
function garantirCampoDinamico(id) {
    for (const [regex, nomeFn] of LINHAS_DINAMICAS_FOLHAO) {
        if (!regex.test(id) || typeof window[nomeFn] !== 'function') continue;
        for (let n = 0; n < 80 && !document.getElementById(id); n++) window[nomeFn]();
        return document.getElementById(id);
    }
    return null;
}

export function preencherDadosModal(modalId, dados) {
    if (!dados) return;
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const campos = dados.campos || {};
    // Cadeira: a lista de materiais depende do tipo (Superior/Inferior) —
    // se o rascunho foi salvo com o outro tipo, recarrega a lista certa
    // ANTES de preencher as quantidades (senão caem nas linhas erradas).
    const tipoCadeiraEl = document.getElementById('desemp-tipo-cadeira');
    if (modalId === 'modal-folhao-desempenadeira' && campos['desemp-tipo-cadeira'] && tipoCadeiraEl && tipoCadeiraEl.value !== campos['desemp-tipo-cadeira'] && typeof window.carregarMateriaisDesemp === 'function') {
        tipoCadeiraEl.value = campos['desemp-tipo-cadeira'];
        window.carregarMateriaisDesemp(campos['desemp-tipo-cadeira']);
    }
    Object.keys(campos).forEach(id => {
        const el = document.getElementById(id) || garantirCampoDinamico(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!campos[id];
        else el.value = campos[id];
    });

    const radios = dados.radios || {};
    Object.keys(radios).forEach(nome => {
        const valor = radios[nome];
        const el = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"][value="${CSS.escape(String(valor))}"]`);
        if (el) el.checked = true;
    });

    // 🆕 Reaplica a marca de "editado manualmente" salva no rascunho —
    // sem isso, ao recarregar a página essa informação existia só no
    // banco (dentro de "dados"), mas os elementos <input> recém-criados
    // nasciam sem o data-editado-manual, e o Checklist voltava a poder
    // sobrescrever um campo que o técnico já tinha corrigido na mão.
    const editados = dados.editadosManualmente || {};
    Object.keys(editados).forEach(chave => {
        if (chave.startsWith('radio:')) {
            const nome = chave.slice('radio:'.length);
            modal.querySelectorAll(`input[type="radio"][name="${CSS.escape(nome)}"]`).forEach(r => {
                r.dataset.editadoManual = '1';
            });
            const marcado = modal.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`);
            marcarEditadoManual(marcado?.closest('.sim-nao-card') || marcado?.closest('tr') || marcado?.closest('label'));
        } else {
            marcarEditadoManual(document.getElementById(chave));
        }
    });
}

// --------------------------------------------------------------
// API: SALVAR / CARREGAR / FINALIZAR RASCUNHO
// --------------------------------------------------------------
export async function salvarRascunhoFolhao(equipamentoId, tipoFolhao, dados, etapa = null) {
    if (!equipamentoId) return false;
    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO (achado de auditoria: "salvar Folhão sem internet
        // perde o progresso preenchido se o técnico fechar o modal sem
        // reparar no alerta de erro"): usa a fila offline em vez de
        // fetch() puro — só entra na fila em falha de REDE de verdade,
        // não em erro do servidor. Seguro reenfileirar porque
        // /api/folhao/salvar é um UPSERT por equipamento_id (ON CONFLICT
        // DO UPDATE) — reenviar só regrava o mesmo rascunho, não duplica.
        const { resp, enfileirado } = await window.enviarComFilaOffline(
            `${apiBase}/api/folhao/salvar`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipamento_id: equipamentoId,
                    tipo_folhao: tipoFolhao,
                    dados: JSON.stringify(dados),
                    etapa
                })
            },
            `Rascunho do Folhão (${tipoFolhao || '?'}) — ${equipamentoId}`,
            `folhao-rascunho-${equipamentoId}`
        );
        if (enfileirado) {
            console.warn('📦 Sem conexão — progresso do Folhão guardado pra reenviar quando a rede voltar.');
            return true; // não é uma falha pro chamador: o dado não foi perdido, só está na fila
        }
        // 🐛 CORRIGIDO: antes essa função nunca contava pra quem chamou
        // se o salvamento deu certo ou não — mesmo com a API retornando
        // erro (500, offline, etc.), o "catch" só fazia console.error e
        // a função terminava normal, sem sinalizar nada. Isso deixava
        // quem chama (ex: o botão "Salvar" do Folhão) sem saber que
        // precisava avisar o técnico. Agora devolve true/false de verdade.
        return resp.ok;
    } catch (e) {
        console.error('⚠️ Não foi possível salvar o progresso do folhão:', e);
        return false;
    }
}

export async function carregarRascunhoFolhao(equipamentoId) {
    if (!equipamentoId) return null;
    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/folhao/${encodeURIComponent(equipamentoId)}`, { headers: headersAdmin() });
        if (!resp.ok) return null; // 404 = não tem rascunho ainda, é normal
        const json = await resp.json();
        if (!json || !json.dados) return null;
        return { ...JSON.parse(json.dados), etapa: json.etapa, tipo_folhao: json.tipo_folhao };
    } catch (e) {
        console.error('⚠️ Não foi possível carregar o progresso salvo do folhão:', e);
        return null;
    }
}

export async function finalizarRascunhoFolhao(equipamentoId, tipoFolhao = null) {
    if (!equipamentoId) return;

    // 📋 Registra no histórico individual do equipamento que um folhão foi
    // concluído — é isso que faz o card "Folhões Concluídos" do Prontuário
    // (e a linha do tempo) contarem certo. Fica centralizado aqui porque
    // TODOS os folhões (Molde4, Molde23, Bow, Horizontal, R2, Straightener
    // R1, Segmento Zero, Segmento de Grupo, Desempenadeira) chamam essa
    // mesma função no momento de salvar/imprimir.
    if (typeof window.registrarHistorico === 'function') {
        const rotulo = tipoFolhao ? ` (${tipoFolhao})` : '';
        window.registrarHistorico(equipamentoId, `📋 Folhão de manutenção${rotulo} finalizado e salvo.`);
    }

    try {
        const apiBase = await resolverApiBase();
        // 🔧 CORREÇÃO: era fetch() puro, falha 100% silenciosa em rede
        // ruim. Baixo impacto (o laudo já foi salvo antes disso), mas
        // fica na fila offline em vez de simplesmente sumir — /finalizar
        // é um DELETE por equipamento_id, idempotente, seguro reenviar.
        const { enfileirado } = await window.enviarComFilaOffline(
            `${apiBase}/api/folhao/finalizar`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipamento_id: equipamentoId })
            },
            `Limpar rascunho do Folhão — ${equipamentoId}`
        );
        if (enfileirado) console.warn('📦 Sem conexão — limpeza do rascunho do Folhão guardada pra reenviar quando a rede voltar.');
    } catch (e) {
        console.error('⚠️ Não foi possível limpar o rascunho do folhão finalizado:', e);
    }
}

// --------------------------------------------------------------
// CARREGA O RASCUNHO (se existir) E JÁ PREENCHE O MODAL
// Chamar no FINAL da função "abrir" de cada folhão, depois que todo o
// HTML do formulário já foi renderizado na tela.
// --------------------------------------------------------------
export async function restaurarRascunhoNoModal(modalId, equipamentoId) {
    const dados = await carregarRascunhoFolhao(equipamentoId);
    if (dados) {
        preencherDadosModal(modalId, dados);
        const aviso = document.getElementById('aviso-rascunho-folhao');
        if (aviso) {
            aviso.textContent = '📋 Progresso anterior restaurado — continue de onde parou.';
            aviso.classList.remove('hidden');
            // Some sozinho depois de um tempo — é um toast, não deve ficar
            // preso na tela até o técnico fechar o Folhão.
            clearTimeout(aviso._timeoutSumir);
            aviso._timeoutSumir = setTimeout(() => aviso.classList.add('hidden'), 5000);
        }
    }
    return dados;
}

// --------------------------------------------------------------
// LIGA O AUTO-SALVAMENTO NO MODAL (debounce, sem precisar de botão)
// Chamar uma vez no final da função "abrir" de cada folhão.
// --------------------------------------------------------------
export function ativarAutoSalvamentoFolhao(modalId, equipamentoId, tipoFolhao) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    // 🐛 CORRIGIDO (perda/mistura de dados): os listeners abaixo são ligados
    // UMA vez por janela, mas guardavam o equipamentoId da PRIMEIRA peça
    // aberta. Abrir o Folhão da peça A e depois o da peça B na mesma
    // sessão fazia tudo que era digitado na B ser salvo como rascunho da
    // A. Agora a peça atual fica no próprio modal e é lida na hora de salvar.
    modal.dataset.folhaoEquipamento = equipamentoId || '';
    modal.dataset.folhaoTipo = tipoFolhao || '';
    if (modal.dataset.autoSaveFolhao === '1') return;
    modal.dataset.autoSaveFolhao = '1';

    let timer = null;
    const salvarAgora = () => {
        clearTimeout(timer);
        const equipamentoAgendado = modal.dataset.folhaoEquipamento;
        timer = setTimeout(() => {
            // trocou de peça antes do salvamento disparar: não mistura
            if (!equipamentoAgendado || modal.dataset.folhaoEquipamento !== equipamentoAgendado) return;
            const dados = coletarDadosModal(modalId);
            salvarRascunhoFolhao(equipamentoAgendado, modal.dataset.folhaoTipo, dados);
        }, 800);
    };

    // 🆕 CORRIGIDO ("editei a mão e o Checklist apagou minha resposta"):
    // esse listener roda só quando o EVENTO input/change dispara de
    // verdade — ou seja, só quando é o dedo do técnico mexendo no campo.
    // Quando o Checklist de Execução preenche um campo via JS
    // (elemento.value = ... / elemento.checked = ...), isso NUNCA
    // dispara input/change sozinho — então só marca como "editado
    // manualmente" o que o técnico realmente tocou, nunca o que veio
    // do preenchimento automático.
    const marcarComoEditado = (e) => {
        const el = e.target;
        if (!el || !(el.matches('input, textarea, select'))) return;
        if (el.type === 'radio' && el.name) {
            modal.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`).forEach(r => {
                r.dataset.editadoManual = '1';
            });
            marcarEditadoManual(el.closest('.sim-nao-card') || el.closest('tr') || el.closest('label'));
            // 🆕 Avisa quem estiver ouvindo (ex: folhaoMolde4.js) que esse
            // campo foi corrigido na mão, pra dar a chance de espelhar a
            // correção de volta pro Checklist de Execução — sem isso, a
            // correção só existia dentro do Folhão, e o Checklist
            // continuava mostrando a resposta antiga como se nada tivesse
            // mudado (sem saber quem corrigiu, nem quando).
            modal.dispatchEvent(new CustomEvent('folhao:campo-editado-manualmente', {
                detail: { modalId, campo: `radio:${el.name}`, valor: el.value },
                bubbles: true
            }));
        } else if (el.id) {
            marcarEditadoManual(el);
            modal.dispatchEvent(new CustomEvent('folhao:campo-editado-manualmente', {
                detail: { modalId, campo: el.id, valor: el.type === 'checkbox' ? el.checked : el.value },
                bubbles: true
            }));
        }
    };

    modal.addEventListener('input', marcarComoEditado);
    modal.addEventListener('change', marcarComoEditado);
    modal.addEventListener('input', salvarAgora);
    modal.addEventListener('change', salvarAgora);
}

window.coletarDadosModal = coletarDadosModal;
window.preencherDadosModal = preencherDadosModal;
window.salvarRascunhoFolhao = salvarRascunhoFolhao;
window.carregarRascunhoFolhao = carregarRascunhoFolhao;
window.finalizarRascunhoFolhao = finalizarRascunhoFolhao;
window.restaurarRascunhoNoModal = restaurarRascunhoNoModal;

// --------------------------------------------------------------
// 🔧 CORREÇÃO (achado de auditoria: "nenhum aviso ao fechar o Folhão
// sem salvar"): o progresso já é salvo automaticamente 800ms depois de
// qualquer campo editado (ativarAutoSalvamentoFolhao acima), então na
// prática o risco real de perda é bem menor do que "o formulário
// inteiro some" — só existe uma janela estreita (fechar a ABA/navegador
// de verdade a menos de 800ms do último toque, antes do autosave
// disparar). Ainda assim, vale um aviso nativo do navegador nesse caso
// específico (fechar/recarregar a aba), que é o único que o JS consegue
// interceptar de verdade — fechar o modal pelo X interno já é coberto
// pelo autosave, não precisa de confirmação extra ali.
window.addEventListener('beforeunload', (event) => {
    const folhaoAberto = document.querySelector('[id^="modal-folhao-"]:not(.hidden)');
    if (!folhaoAberto) return;
    event.preventDefault();
    event.returnValue = '';
});
window.ativarAutoSalvamentoFolhao = ativarAutoSalvamentoFolhao;

console.log("✅ folhaoPersistencia.js carregado – progresso de folhão agora persiste no banco.");

// --------------------------------------------------------------
// 🆕 FECHA A EXECUÇÃO DO CHECKLIST (status "concluida") ao concluir o
// reparo. Bow/Horizontal/Molde já faziam isso; Bender, R1, R2, Cadeira,
// Segmento Zero e o genérico NÃO — a execução ficava "em andamento" pra
// sempre, e como /execucoes/iniciar reaproveita a execução aberta, o
// PRÓXIMO reparo da mesma peça nascia com o checklist já 100% marcado do
// reparo anterior (e o laudo novo sobrescrevia o antigo, que é gravado
// por execução).
// --------------------------------------------------------------
export async function finalizarExecucaoChecklist(equipamentoId) {
    try {
        const apiBase = await resolverApiBase();
        const respStatus = await fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(equipamentoId)}`, { cache: 'no-store' });
        const status = respStatus.ok ? await respStatus.json() : null;
        if (!status || !status.execucao_id) return;
        await fetch(`${apiBase}/api/checklist-execucao/execucoes/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ execucao_id: status.execucao_id })
        });
    } catch (e) {
        console.error('⚠️ Não consegui finalizar a execução do Checklist:', e);
    }
}
window.finalizarExecucaoChecklist = finalizarExecucaoChecklist;


// --------------------------------------------------------------
// 🆕 PROGRESSO POR ABA ("x/y" em cada aba do Folhão) — o técnico vê o que
// falta preencher sem abrir aba por aba. Conta campos editáveis
// preenchidos e perguntas SIM/NÃO respondidas dentro do conteúdo de cada
// aba (a aba aponta pro conteúdo pelo 2º argumento do onclick).
// --------------------------------------------------------------
function conteudoDaAba(tab) {
    const m = (tab.getAttribute('onclick') || '').match(/,\s*['"]([\w-]+)['"]\s*\)/);
    return m ? document.getElementById(m[1]) : null;
}
export function atualizarProgressoAbasFolhao(modal) {
    if (!modal) return;
    modal.querySelectorAll('.folhao-tab').forEach(tab => {
        const alvo = conteudoDaAba(tab);
        if (!alvo) return;
        let total = 0, feitos = 0;
        alvo.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.readOnly || el.disabled || el.type === 'radio' || el.type === 'checkbox' || el.type === 'hidden' || el.type === 'button' || el.type === 'file') return;
            total++;
            if (String(el.value || '').trim()) feitos++;
        });
        const grupos = new Set([...alvo.querySelectorAll('input[type="radio"][name]')].map(r => r.name));
        grupos.forEach(nome => {
            total++;
            if (alvo.querySelector(`input[type="radio"][name="${CSS.escape(nome)}"]:checked`)) feitos++;
        });
        let badge = tab.querySelector('.folhao-tab-prog');
        if (!total) { if (badge) badge.remove(); return; }
        if (!badge) { badge = document.createElement('span'); badge.className = 'folhao-tab-prog'; tab.appendChild(badge); }
        badge.textContent = `${feitos}/${total}`;
        tab.classList.toggle('folhao-tab-completa', feitos === total);
        tab.classList.toggle('folhao-tab-iniciada', feitos > 0 && feitos < total);
    });
}
window.atualizarProgressoAbasFolhao = atualizarProgressoAbasFolhao;

let _timerProgressoAbas = null;
function agendarProgressoAbas(modal, atraso = 250) {
    clearTimeout(_timerProgressoAbas);
    _timerProgressoAbas = setTimeout(() => atualizarProgressoAbasFolhao(modal), atraso);
}
['input', 'change'].forEach(tipo => document.addEventListener(tipo, (e) => {
    const modal = e.target.closest && e.target.closest('.modal-overlay');
    if (modal && modal.querySelector('.folhao-tabs')) agendarProgressoAbas(modal);
}, true));
// Ao abrir um Folhão: conta de novo depois que o rascunho e o
// autopreenchimento do Checklist (que não disparam eventos) terminarem.
new MutationObserver((muts) => muts.forEach(m => {
    const el = m.target;
    if (el.classList && el.classList.contains('modal-overlay') && !el.classList.contains('hidden') && el.querySelector('.folhao-tabs')) {
        [400, 1500, 4000].forEach(t => setTimeout(() => atualizarProgressoAbasFolhao(el), t));
    }
})).observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
