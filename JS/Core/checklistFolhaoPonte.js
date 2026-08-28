// ==========================================================================
// CHECKLIST ↔ FOLHÃO — utilitários compartilhados.
// ==========================================================================
// 🆕 EXTRAÍDO de checklist-execucao.js e folhaoMolde4.js. Antes esse
// arquivo não existia: o cálculo do "tipo de equipamento" (slug) estava
// duplicado, copiado e colado, nos dois lugares — e toda a lógica de
// "ponte" (puxar valores já respondidos no Checklist de Execução pra
// autopreencher o Folhão, e refletir de volta uma edição manual) só
// existia dentro do folhaoMolde4.js, amarrada ao Molde MCC4. Pra
// qualquer área nova reaproveitar isso sem copiar o bloco inteiro de
// novo, ele mora aqui, genérico.
//
// O que fica FORA daqui (continua em cada arquivo de Folhão, porque é
// específico de cada formulário):
// - Quais campos são "protegidos" (cabeçalho da OS, nunca vêm do
//   Checklist) — cada Folhão passa a própria lista.
// - O modalId usado pra filtrar o evento de edição manual.
// ==========================================================================

import { resolverApiBase, OPERADOR_LOGADO } from './banco.js?v=5';

// --------------------------------------------------------------
// SLUG DO TIPO DE EQUIPAMENTO (ex: item.tipo="Molde", mcc_compat="4"
// -> "molde-mcc4"). Precisa bater com o que o Checklist de Execução usa
// pra cadastrar as etapas (ver resolverTipoEquipamento em
// checklist-execucao.js, que agora só chama esta função também) — daí a
// importância de existir em UM lugar só.
// --------------------------------------------------------------
export function resolverTipoEquipamento(item) {
    if (!item) return null;
    const tipoSlug = (item.tipo || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acento
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const mcc = (item.mcc_compat || '').replace('/', '-'); // "2/3" -> "2-3"
    return mcc ? `${tipoSlug}-mcc${mcc}` : tipoSlug;
}

// --------------------------------------------------------------
// BUSCA os dados da ponte pro equipamento/execução atual: valores já
// respondidos no Checklist (prontos pra autopreencher) + o mapa
// folhao_campo -> etapa_id (usado depois pra mandar edição manual de
// volta). Não mexe em NADA de DOM — só rede. Retorna null se não
// existir reparo em andamento pra essa tag (nesse caso o Folhão segue
// 100% manual, como sempre).
// --------------------------------------------------------------
export async function buscarPonteChecklist(id, item) {
    const tipoEquipamento = resolverTipoEquipamento(item);
    if (!tipoEquipamento) return null;

    const apiBase = await resolverApiBase();

    const respStatus = await fetch(`${apiBase}/api/checklist-execucao/status/${encodeURIComponent(id)}`, { cache: 'no-store' });
    const status = respStatus.ok ? await respStatus.json() : null;
    if (!status || !status.execucao_id) return null;

    const respValores = await fetch(`${apiBase}/api/checklist-execucao/folhao/${encodeURIComponent(tipoEquipamento)}?execucao_id=${status.execucao_id}`, { cache: 'no-store' });
    const valores = respValores.ok ? await respValores.json() : {};

    let mapaCampoParaEtapa = {};
    try {
        const respEtapas = await fetch(`${apiBase}/api/checklist-execucao/etapas/${encodeURIComponent(tipoEquipamento)}?execucao_id=${status.execucao_id}`, { cache: 'no-store' });
        const etapas = respEtapas.ok ? await respEtapas.json() : [];
        etapas.forEach(et => {
            if (et.folhao_campo && et.tipo_resposta === 'sim_nao') mapaCampoParaEtapa[et.folhao_campo] = et.id;
        });
    } catch (e) {
        console.error('⚠️ Não consegui montar o mapa campo→etapa pra edição manual refletir no Checklist:', e);
    }

    return { execucaoId: status.execucao_id, tipoEquipamento, valores, mapaCampoParaEtapa, equipamentoId: id };
}

// --------------------------------------------------------------
// APLICA os valores da ponte nos campos do Folhão que estiverem na
// tela (radios SIM/NÃO, checkbox ou input/textarea comum, por id ou
// name = folhao_campo). Destaca visualmente o que foi autopreenchido.
// `camposProtegidos` é a lista (Set ou array) de ids que NUNCA devem
// ser tocados por aqui (cabeçalho da OS) — cada Folhão define a sua.
// Retorna { preenchidos, naoEncontrados } pro chamador decidir se
// mostra um aviso.
// --------------------------------------------------------------
export function preencherCamposFolhao(valores, camposProtegidos) {
    const protegidos = camposProtegidos instanceof Set ? camposProtegidos : new Set(camposProtegidos || []);
    let preenchidos = 0;
    let naoEncontrados = 0;

    const destacarCampo = (el, ehAtencao = false) => {
        if (!el) return;
        el.style.background = ehAtencao ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)';
        el.style.borderColor = ehAtencao ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)';
        el.title = ehAtencao
            ? '🔗 Preenchido automaticamente pelo Checklist de Execução — resposta NÃO, requer atenção'
            : '🔗 Preenchido automaticamente pelo Checklist de Execução';
    };

    Object.entries(valores || {}).forEach(([campo, valor]) => {
        if (!valor) return; // etapa ainda não respondida — não mexe no campo
        if (protegidos.has(campo)) return; // campo de cabeçalho da OS — nunca vem do Checklist

        // Campo pode ser: par de radios SIM/NÃO (name="campo"), um
        // checkbox simples (id="campo") ou um <input>/<textarea> comum
        // (id="campo") — tenta os três, igual o Molde MCC4 sempre fez.
        const radios = document.getElementsByName(campo);
        if (radios && radios.length > 0) {
            const jaEditadoManualmente = Array.from(radios).some(r => r.dataset.editadoManual === '1');
            if (jaEditadoManualmente) return; // respeita edição manual do técnico, não sobrescreve

            let algumMarcado = false;
            radios.forEach(r => {
                r.checked = (valor === 'OK' && r.value === 'SIM') || r.value === valor;
                if (r.checked) {
                    const cardEl = r.closest('.sim-nao-card');
                    // Perguntas escritas ao contrário (ex: "está danificado?")
                    // têm data-inverte="1" — nelas SIM é que indica atenção.
                    const invertida = cardEl && cardEl.dataset.inverte === '1';
                    const ehAtencao = invertida ? r.value === 'SIM' : r.value === 'NÃO';
                    destacarCampo(cardEl || r.closest('tr') || r.closest('label') || r, ehAtencao);
                    algumMarcado = true;
                }
            });
            if (algumMarcado) preenchidos++; else naoEncontrados++;
            return;
        }

        const inputEl = document.getElementById(campo);
        if (!inputEl) { naoEncontrados++; return; }
        if (inputEl.dataset.editadoManual === '1') return;
        if (inputEl.type === 'checkbox') {
            inputEl.checked = (valor === 'OK');
        } else {
            inputEl.value = valor;
        }
        destacarCampo(inputEl);
        preenchidos++;
    });

    return { preenchidos, naoEncontrados };
}

// --------------------------------------------------------------
// 🆕 AVISO DE PREENCHIMENTO AUTOMÁTICO (toast simples, sem depender de
// nenhuma lib externa) — some sozinho depois de alguns segundos. Igual
// existia só dentro do folhaoMolde4.js; agora fica aqui pra qualquer
// Folhão que use a ponte poder chamar.
// --------------------------------------------------------------
export function mostrarAvisoPreenchimentoChecklist(preenchidos, naoEncontrados) {
    const existente = document.getElementById('toast-preenchimento-checklist');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-preenchimento-checklist';
    toast.style.cssText = 'position:fixed; top:16px; right:16px; z-index:10500; max-width:340px; padding:12px 16px; border-radius:10px; font-size:13px; line-height:1.4; box-shadow:0 10px 30px rgba(0,0,0,0.4); animation:fadeInModal 0.25s ease-out;';

    if (naoEncontrados === 0) {
        toast.style.background = 'rgba(16, 185, 129, 0.95)';
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fas fa-check-circle"></i> <strong>${preenchidos}</strong> campo(s) preenchido(s) automaticamente pelo Checklist de Execução (destacados em verde no formulário).`;
    } else {
        toast.style.background = 'rgba(245, 158, 11, 0.95)';
        toast.style.color = '#1a1a1a';
        toast.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${preenchidos} campo(s) preenchido(s), mas <strong>${naoEncontrados}</strong> não foram encontrados no Folhão — o mapeamento (folhao_campo) de alguma etapa está apontando pro id errado. Corrija em Editar Etapa no Checklist.`;
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), naoEncontrados > 0 ? 12000 : 6000);
}

// --------------------------------------------------------------
// LIGA (uma vez só) o listener que ouve 'folhao:campo-editado-manualmente'
// (disparado por folhaoPersistencia.js) e reflete a correção de volta
// no Checklist de Execução, usando a mesma rota /marcar que o próprio
// Checklist usa. `getPonte` é uma função que devolve o estado atual da
// ponte daquele Folhão específico (cada arquivo de Folhão guarda o seu
// próprio, ex: PONTE_CHECKLIST_M4) — assim este arquivo não precisa
// saber de nenhuma variável de estado de nenhuma área.
// --------------------------------------------------------------
const MODAIS_COM_LISTENER_LIGADO = new Set();

export function ligarListenerEdicaoManualFolhao(modalId, getPonte) {
    if (MODAIS_COM_LISTENER_LIGADO.has(modalId)) return;
    MODAIS_COM_LISTENER_LIGADO.add(modalId);

    document.addEventListener('folhao:campo-editado-manualmente', async (ev) => {
        const { modalId: modalIdEvento, campo, valor } = ev.detail || {};
        if (modalIdEvento !== modalId) return;
        if (!campo.startsWith('radio:')) return; // só sim_nao tem etapa correspondente hoje

        const ponte = getPonte();
        if (!ponte || !ponte.execucaoId) return;

        const folhaoCampo = campo.slice('radio:'.length);
        const etapaId = ponte.mapaCampoParaEtapa[folhaoCampo];
        if (!etapaId) return; // esse campo não tem etapa mapeada — nada a refletir

        const tecnico = OPERADOR_LOGADO || {};
        try {
            const apiBase = await resolverApiBase();
            await fetch(`${apiBase}/api/checklist-execucao/marcar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etapa_id: etapaId,
                    execucao_id: ponte.execucaoId,
                    equipamento_id: ponte.equipamentoId,
                    marcado: true,
                    valor: valor,
                    colaborador: `${tecnico.nome || 'Técnico'} (via Folhão)`,
                    tecnico_matricula: tecnico.matricula || null,
                    tecnico_nome: tecnico.nome || 'Técnico'
                })
            });
            if (typeof window.carregarStatusChecklistExecucaoReparo === 'function') {
                window.carregarStatusChecklistExecucaoReparo([ponte.equipamentoId], true);
            }
        } catch (e) {
            console.error('⚠️ Não consegui refletir a edição manual do Folhão no Checklist de Execução:', e);
        }
    });
}