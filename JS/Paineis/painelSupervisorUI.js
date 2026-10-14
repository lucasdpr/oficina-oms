// ==========================================================================
// PAINEL DO SUPERVISOR — organização em sub-abas + "Precisa de você agora"
// ==========================================================================
// A aba tinha ~16 telas de rolagem, com o que precisa de ação misturado a
// estatística. Aqui:
// - "Precisa de você agora" no topo: só o que pede decisão/ação do
//   supervisor, cada item com o botão pra agir;
// - o resto vai pra sub-abas (Visão geral / Oficina / Máquinas / Equipe /
//   Qualidade / Tendências). As seções continuam sendo desenhadas pelo
//   renderPainelSupervisor de sempre (script.js) — este arquivo só MOVE os
//   blocos já existentes pra dentro das sub-abas, uma vez.

import { resolverApiBase } from '../Core/banco.js?v=5';
import { headersAdmin, atividadeEstaAtrasada } from '../Core/utils.js';

const SUBABAS = [
    { chave: 'geral',      rotulo: 'Visão geral', icone: 'fa-gauge-high',
      blocos: ['.painel-sup-graficos', '#painel-supervisor-ranking-veios', '#painel-supervisor-atividades-recentes', '.painel-geral-linha4'] },
    { chave: 'oficina',    rotulo: 'Oficina',     icone: 'fa-screwdriver-wrench', blocos: ['.painel-sup-secao-saude', '.painel-sup-secao-estoque'] },
    { chave: 'maquinas',   rotulo: 'Máquinas',    icone: 'fa-industry',
      blocos: ['.painel-fila-inspecao', '.painel-sup-secao-sinotico', '.painel-sup-secao-previsoes', '.painel-sup-secao-historico'] },
    { chave: 'equipe',     rotulo: 'Equipe',      icone: 'fa-users', blocos: ['.painel-sup-secao-produtividade', '.painel-sup-secao-efetivo'] },
    { chave: 'qualidade',  rotulo: 'Qualidade',   icone: 'fa-magnifying-glass', blocos: ['.painel-sup-secao-qualidade'] },
    { chave: 'tendencias', rotulo: 'Tendências',  icone: 'fa-chart-line', blocos: ['.painel-sup-secao-tendencia'] },
];
const CHAVE_SUBABA = 'oms_sup_subaba';

function blocoRaiz(aba, seletor) {
    // sobe até o filho direto da <section> (o bloco inteiro, com título)
    let el = aba.querySelector(seletor);
    while (el && el.parentElement && el.parentElement !== aba) el = el.parentElement;
    return el && el.parentElement === aba ? el : null;
}


// 🆕 CENTRAL DE COMANDOS do supervisor — "daqui eu vou pra qualquer lugar
// e faço qualquer coisa". Busca por texto (Enter executa a 1ª) + todas as
// ações do sistema agrupadas. Só chama funções que já existem no app.
const COMANDOS_SUP = [
    { g: 'Decidir agora', t: 'Atividade em massa', d: 'Programar a mesma atividade pra várias áreas', k: 'massa programar varias areas', f: "window.abrirModalAtividadeMassa()" },
    { g: 'Decidir agora', t: 'Novo comunicado', d: 'Aviso pra toda a equipe', k: 'aviso comunicado mensagem todos', f: "window.abrirModalCriarAviso()" },
    { g: 'Decidir agora', t: 'Lançar OS', d: 'Registrar ordem de serviço com foto', k: 'os ordem servico registrar', f: "window.abrirAba(null,'aba-ordens-servico')" },
    { g: 'Decidir agora', t: 'Relatório de críticos', d: 'Todas as peças ≥ 80% da meta', k: 'criticos relatorio desgaste meta', f: "window.abrirCriticos()" },
    { g: 'Oficina', t: 'Central de áreas', d: 'Quadro de todas as áreas', k: 'areas oficina quadro atividades', f: "window.abrirAba(null,'aba-oficina')" },
    { g: 'Oficina', t: 'Reparos em andamento', d: 'O que está na bancada', k: 'reparo andamento bancada', f: "window.abrirAbaReparo('andamento')" },
    { g: 'Oficina', t: 'Iniciar reparo', d: 'Abrir folhão de uma peça', k: 'reparo iniciar folhao', f: "window.abrirAbaReparo('iniciar')" },
    { g: 'Oficina', t: 'Fila da ponte rolante', d: 'Ordem dos transportes', k: 'ponte rolante fila transporte', f: "window.abrirAba(null,'aba-fila-ponte'); window.renderFilaPonteRolante && window.renderFilaPonteRolante()" },
    { g: 'Oficina', t: 'Qualidade', d: 'Inspeções de entrada e saída', k: 'qualidade inspecao achado', f: "window.abrirAba(null,'aba-qualidade')" },
    { g: 'Máquinas', t: 'Painel geral', d: 'Centro de controle da planta', k: 'painel geral planta controle', f: "window.abrirAba(null,'aba-painel')" },
    { g: 'Máquinas', t: 'Veio C · MCC 2', d: 'Sequenciamento', k: 'veio c mcc2 sequenciamento', f: "window.mudarVeioVisualizado('C')" },
    { g: 'Máquinas', t: 'Veio D · MCC 2', d: 'Sequenciamento', k: 'veio d mcc2 sequenciamento', f: "window.mudarVeioVisualizado('D')" },
    { g: 'Máquinas', t: 'Veio E · MCC 3', d: 'Sequenciamento', k: 'veio e mcc3 sequenciamento', f: "window.mudarVeioVisualizado('E')" },
    { g: 'Máquinas', t: 'Veio F · MCC 3', d: 'Sequenciamento', k: 'veio f mcc3 sequenciamento', f: "window.mudarVeioVisualizado('F')" },
    { g: 'Máquinas', t: 'Veio G · MCC 4', d: 'Sequenciamento', k: 'veio g mcc4 sequenciamento', f: "window.mudarVeioVisualizado('G')" },
    { g: 'Máquinas', t: 'Veio H · MCC 4', d: 'Sequenciamento', k: 'veio h mcc4 sequenciamento', f: "window.mudarVeioVisualizado('H')" },
    { g: 'Máquinas', t: 'Lançar produção', d: 'Apontamento diário de toneladas', k: 'producao apontamento tonelagem lancar', f: "window.abrirAba(null,'aba-producao')" },
    { g: 'Máquinas', t: 'Sinótico 3D', d: 'Abre em nova aba', k: 'sinotico 3d', f: "window.open('Sinotico3d.html','_blank')" },
    { g: 'Máquinas', t: 'Molde MCC 4 em 3D', d: 'Abre em nova aba', k: 'molde mcc4 3d', f: "window.open('Molde3d.html','_blank')" },
    { g: 'Máquinas', t: 'Molde MCC 2/3 em 3D', d: 'Abre em nova aba', k: 'molde mcc23 mcc2 mcc3 3d', f: "window.open('MoldeMCC23d.html','_blank')" },
    { g: 'Estoque', t: 'Reserva', d: 'Peças prontas pra instalar', k: 'reserva estoque swap', f: "window.abrirAba(null,'aba-reservas')" },
    { g: 'Estoque', t: 'Rolos', d: 'Estoque de rolos', k: 'rolos estoque', f: "window.abrirAba(null,'aba-rolos')" },
    { g: 'Estoque', t: 'Hidráulica', d: 'Itens hidráulicos', k: 'hidraulica', f: "window.abrirAba(null,'aba-hidraulica')" },
    { g: 'Estoque', t: 'Almoxarifado', d: 'Materiais da oficina', k: 'almoxarifado materiais', f: "window.abrirAba(null,'aba-almoxarifado')" },
    { g: 'Equipe e comunicação', t: 'Chats das áreas', d: 'Conversas com as áreas', k: 'chat conversa mensagens', f: "window.abrirAba(null,'aba-chats')" },
    { g: 'Equipe e comunicação', t: 'Notificações', d: 'Tudo o que aconteceu', k: 'notificacoes avisos', f: "window.abrirAba(null,'aba-notificacoes')" },
    { g: 'Equipe e comunicação', t: 'Painel do técnico', d: 'Ver como o técnico vê', k: 'tecnico painel', f: "window.abrirAba(null,'aba-tecnico')" },
];
const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function htmlComandos(filtro = '') {
    const q = semAcento(filtro.trim());
    const lista = COMANDOS_SUP.map((c, i) => ({ ...c, i })).filter(c => !q || semAcento(`${c.t} ${c.d} ${c.k} ${c.g}`).includes(q));
    if (!lista.length) return `<div class="tc-vazio">Nada encontrado para “${esc(filtro)}”.</div>`;
    const grupos = [...new Set(lista.map(c => c.g))];
    return grupos.map(g => `<div class="sup-cmd-grupo"><div class="cc-rotulo">${g}</div><div class="sup-cmd-grade">${lista.filter(c => c.g === g).map(c =>
        `<button type="button" class="sup-cmd" data-cmd="${c.i}"><strong>${c.t}</strong><span>${c.d}</span></button>`).join('')}</div></div>`).join('');
}

function montarCentralComandos(aba, depoisDe) {
    if (document.getElementById('sup-comandos')) return;
    const bloco = document.createElement('div');
    bloco.className = 'cc-bloco sup-comandos';
    bloco.id = 'sup-comandos';
    bloco.innerHTML = `<div class="cc-rotulo">Central de comandos</div><h2 class="cc-titulo">O que você quer fazer?</h2>
        <input type="search" class="premium-input sup-cmd-busca" id="sup-cmd-busca" placeholder="Digite: reparo, veio E, comunicado, produção…" autocomplete="off">
        <div id="sup-cmd-lista">${htmlComandos()}</div>`;
    depoisDe.after(bloco);
    const busca = bloco.querySelector('#sup-cmd-busca'), lista = bloco.querySelector('#sup-cmd-lista');
    const executar = i => { const c = COMANDOS_SUP[i]; if (c) { try { new Function(c.f)(); } catch (e) { console.error('⚠️ Comando do supervisor falhou:', c.t, e); } } };
    busca.addEventListener('input', () => { lista.innerHTML = htmlComandos(busca.value); });
    busca.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const b = lista.querySelector('[data-cmd]'); if (b) executar(+b.dataset.cmd); } if (ev.key === 'Escape') { busca.value = ''; lista.innerHTML = htmlComandos(); } });
    lista.addEventListener('click', ev => { const b = ev.target.closest('[data-cmd]'); if (b) executar(+b.dataset.cmd); });
}

function organizarSubabas() {
    const aba = document.getElementById('aba-painel-supervisor');
    if (!aba || aba.dataset.subabas === '1') return;
    const ancora = document.getElementById('painel-supervisor-hero');
    if (!ancora) return;
    aba.dataset.subabas = '1';

    // "Precisa de ajuda?" só abria um alert — sai do painel.
    aba.querySelectorAll('.painel-ajuda-card').forEach(el => el.remove());
    // "Acesso Rápido" virou a Central de Comandos (todas as ações, com busca)
    aba.querySelectorAll('.painel-geral-linha4').forEach(el => el.remove());

    const atencao = document.createElement('div');
    atencao.className = 'cc-bloco sup-atencao';
    atencao.innerHTML = `<div class="cc-rotulo">Fila de decisões</div><h2 class="cc-titulo">Precisa de você agora</h2><p class="cc-sub">Ordenado por gravidade. Cada linha tem a ação ao lado.</p>
        <div id="sup-atencao"><div class="cc-carregando">Verificando…</div></div>`;

    const barra = document.createElement('div');
    barra.className = 'sup-subabas';
    barra.setAttribute('role', 'tablist');
    const paineis = document.createElement('div');
    paineis.className = 'sup-subabas-conteudo';

    SUBABAS.forEach(cfg => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sup-subaba';
        btn.dataset.chave = cfg.chave;
        btn.setAttribute('role', 'tab');
        btn.textContent = cfg.rotulo;
        btn.addEventListener('click', () => mostrarSubaba(cfg.chave));
        barra.appendChild(btn);

        const painel = document.createElement('div');
        painel.className = 'sup-subaba-painel';
        painel.dataset.chave = cfg.chave;
        cfg.blocos.forEach(sel => { const b = blocoRaiz(aba, sel); if (b) painel.appendChild(b); });
        paineis.appendChild(painel);
    });

    ancora.after(atencao, barra, paineis);
    montarCentralComandos(aba, atencao);
    let inicial = 'geral';
    try { inicial = localStorage.getItem(CHAVE_SUBABA) || 'geral'; } catch (e) { /* sem storage */ }
    mostrarSubaba(SUBABAS.some(s => s.chave === inicial) ? inicial : 'geral');
}

function mostrarSubaba(chave) {
    document.querySelectorAll('#aba-painel-supervisor .sup-subaba').forEach(b => {
        const ativo = b.dataset.chave === chave;
        b.classList.toggle('active', ativo);
        b.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    document.querySelectorAll('#aba-painel-supervisor .sup-subaba-painel').forEach(p => p.classList.toggle('hidden', p.dataset.chave !== chave));
    try { localStorage.setItem(CHAVE_SUBABA, chave); } catch (e) { /* sem storage */ }
}
window.mostrarSubabaSupervisor = mostrarSubaba;

// --------------------------------------------------------------
// "PRECISA DE VOCÊ AGORA"
// --------------------------------------------------------------
const esc = (t) => (typeof window.escapeHtmlNotif === 'function' ? window.escapeHtmlNotif(String(t ?? '')) : String(t ?? ''));
const diasDesde = (txt) => { if (!txt) return null; const d = new Date(String(txt).replace(' ', 'T').slice(0, 19)); return isNaN(d) ? null : Math.floor((Date.now() - d) / 864e5); };
const semMarcador = (t) => String(t || '').replace(/\[[^\]]+\]\s*/g, '').replace(/<[^>]+>/g, '');
async function json(apiBase, caminho, comAuth = false) {
    try { const r = await fetch(`${apiBase}${caminho}`, { cache: 'no-store', headers: comAuth ? headersAdmin() : {} }); return r.ok ? await r.json() : null; }
    catch (e) { return null; }
}
// 🎨 Padrão "centro de controle": cada pendência vira um item da FILA DE
// DECISÕES (ordenada por gravidade), em vez de um cartão colorido solto.
// nivel: 'critico' | '' (atenção) | 'info' | 'ok'
function cartao({ nivel = '', num, titulo, desc, lista = [], acoes = '' }) {
    return { nivel: nivel || 'atencao', num, titulo, desc, lista, acoes };
}
const ORDEM_NIVEL = { critico: 0, atencao: 1, ok: 2, info: 3 };
const ROTULO_NIVEL = { critico: 'Crítico', atencao: 'Atenção', ok: 'Pronto', info: 'Informativo' };

function htmlFilaDecisoes(itens) {
    return `<div class="sup-fila">${itens.map((c, i) => {
        const extra = c.lista.length > 4;
        return `<div class="sup-item" data-nivel="${c.nivel}">
            <div class="sup-item-num">${c.num}</div>
            <div class="sup-item-corpo">
                <div class="sup-item-topo"><span class="sup-item-nivel">${ROTULO_NIVEL[c.nivel] || ''}</span><strong>${c.titulo}</strong></div>
                <p>${c.desc}</p>
                ${c.lista.length ? `<div class="sup-item-lista${extra ? ' recolhida' : ''}" id="sup-lista-${i}">${c.lista.join('')}</div>
                ${extra ? `<button type="button" class="sup-ver-mais" onclick="var l=document.getElementById('sup-lista-${i}'); l.classList.toggle('recolhida'); this.textContent = l.classList.contains('recolhida') ? 'Ver todos os ${c.lista.length}' : 'Ver menos';">Ver todos os ${c.lista.length}</button>` : ''}` : ''}
            </div>
            ${c.acoes ? `<div class="sup-item-acoes">${c.acoes}</div>` : ''}
        </div>`;
    }).join('')}</div>`;
}

function atualizarBriefingSupervisor(itens) {
    const conta = n => itens.filter(c => c.nivel === n).reduce((s, c) => s + (Number(c.num) || 0), 0);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('sup-grav-critico', conta('critico')); set('sup-grav-atencao', conta('atencao')); set('sup-grav-info', conta('info')); set('sup-grav-ok', conta('ok'));
    set('sup-faixa-data', new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, ''));
    const man = document.getElementById('sup-manchete'), sub = document.getElementById('sup-manchete-sub');
    if (!man) return;
    const crit = itens.filter(c => c.nivel === 'critico');
    const resto = itens.filter(c => c.nivel !== 'critico' && c.nivel !== 'ok');
    const prontos = itens.filter(c => c.nivel === 'ok');
    const frase = c => `${String(c.titulo).charAt(0).toLowerCase() + String(c.titulo).slice(1)} (${c.num})`;
    if (crit.length) {
        man.innerHTML = `<span class="cc-perigo">${crit.length === 1 ? 'Uma pendência crítica' : crit.length + ' pendências críticas'}</span> esperando decisão: ${crit.map(frase).join(', ')}.`;
    } else if (resto.length) {
        man.innerHTML = `Nada crítico agora. <em>${resto.length}</em> ${resto.length === 1 ? 'ponto pede' : 'pontos pedem'} atenção.`;
    } else {
        man.innerHTML = `Oficina em dia. <em>Nada</em> esperando por você.`;
    }
    if (sub) sub.innerHTML = [resto.length && crit.length ? `Também: ${resto.map(frase).join(', ')}.` : '', prontos.length ? `Pronto pra concluir: ${prontos.map(c => c.num).reduce((x, y) => x + Number(y || 0), 0)} reparo(s).` : ''].filter(Boolean).join(' ');
}

async function renderizarAtencaoSupervisor() {
    const el = document.getElementById('sup-atencao');
    if (!el) return;
    const apiBase = await resolverApiBase();
    const [atividades, progresso, qualidade, mensagens] = await Promise.all([
        json(apiBase, '/api/oficina/atividades?limite=1000'),
        json(apiBase, '/api/checklist-execucao/progresso'),
        json(apiBase, '/api/qualidade'),
        json(apiBase, '/api/mensagens_area/resumo', true),
    ]);
    const ativos = Array.isArray(window.BANCO_ATIVOS) ? window.BANCO_ATIVOS : [];
    const peca = new Map(ativos.map(a => [a.id, a]));
    const atv = Array.isArray(atividades) ? atividades : [];
    const prog = Array.isArray(progresso) ? progresso : [];
    const c = [];

    // 1. Atividades atrasadas (prazo vencido)
    const atrasadas = atv.filter(a => a.status !== 'Recusado' && atividadeEstaAtrasada(a)).map(a => ({ ...a, dias: diasDesde(a.prazo) })).sort((a, b) => (b.dias || 0) - (a.dias || 0));
    if (atrasadas.length) c.push(cartao({ nivel: 'critico', num: atrasadas.length, titulo: 'Atividades atrasadas',
        desc: 'Prazo vencido e ainda não concluídas.',
        lista: atrasadas.slice(0, 8).map(a => `<div><span><b>${esc(a.area)}</b> · ${esc(semMarcador(a.descricao).slice(0, 48))}</span><span>${a.dias ?? '?'} d</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-area-oficina')">Central de Áreas</button>` }));

    // 2. Pronto pra concluir (checklist 100% + folhão salvo)
    const prontos = prog.filter(p => p.completo && p.folhao_salvo);
    if (prontos.length) c.push(cartao({ nivel: 'ok', num: prontos.length, titulo: 'Prontos pra concluir',
        desc: 'Checklist 100% e folhão salvo — só falta clicar em Concluir pra ir pra Reserva e avisar a Logística.',
        lista: prontos.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><button class="btn-outline-neutral" onclick="window.abrirChecklistExecucao('${esc(p.equipamento_id)}')">Abrir</button></div>`) }));

    // 3. Checklist 100% mas sem folhão
    const semFolhao = prog.filter(p => p.completo && !p.folhao_salvo);
    if (semFolhao.length) c.push(cartao({ num: semFolhao.length, titulo: 'Checklist pronto, falta o folhão',
        desc: 'Todas as etapas marcadas, mas o folhão desse reparo ainda não foi salvo.',
        lista: semFolhao.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><button class="btn-outline-neutral" onclick="window.abrirFolhaoPorTipo('${esc(p.equipamento_id)}')">Folhão</button></div>`) }));

    // 4. Reparo que não tem como terminar (checklist sem etapas)
    const travados = prog.filter(p => Number(p.total) === 0 && peca.get(p.equipamento_id)?.local === 'Oficina / Reparo');
    if (travados.length) c.push(cartao({ nivel: 'critico', num: travados.length, titulo: 'Reparo travado (checklist vazio)',
        desc: 'O checklist desse reparo não tem nenhuma etapa, então nunca chega a 100% e o Concluir nunca libera. Fale com o ADM do sistema.',
        lista: travados.map(p => `<div><span><b>${esc(p.equipamento_id)}</b></span><span class="text-muted">${esc(p.tipo_equipamento)}</span></div>`) }));

    // 5. Reparos parados (> 7 dias, abaixo de 50%)
    const parados = prog.map(p => ({ ...p, dias: diasDesde(p.iniciada_em) }))
        .filter(p => Number(p.total) > 0 && p.dias > 7 && Number(p.percentual) < 50 && peca.get(p.equipamento_id)?.local === 'Oficina / Reparo')
        .sort((a, b) => b.dias - a.dias);
    if (parados.length) c.push(cartao({ num: parados.length, titulo: 'Reparos andando devagar',
        desc: 'Começaram há mais de 7 dias e estão abaixo de 50% do checklist.',
        lista: parados.map(p => `<div><span><b>${esc(p.equipamento_id)}</b> · ${Math.round(Number(p.percentual))}%</span><span>${p.dias} d</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-reparos')">Ver reparos</button>` }));

    // 6. Na máquina acima da meta de desgaste
    const acima = ativos.filter(a => (a.local || '').startsWith('MCC') && a.meta > 0 && a.ton >= a.meta).sort((a, b) => (b.ton / b.meta) - (a.ton / a.meta));
    if (acima.length) c.push(cartao({ nivel: 'critico', num: acima.length, titulo: 'Na máquina acima da meta',
        desc: 'Já passaram da tonelagem/meta de vida útil e continuam instaladas — candidatas à próxima troca.',
        lista: acima.slice(0, 8).map(a => `<div><span><b>${esc(window.rotuloEquipamento(a))}</b> · ${esc(a.local)}</span><span>${Math.round(a.ton / a.meta * 100)}%</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.mostrarSubabaSupervisor('maquinas')">Ver fila de inspeção</button>` }));

    // 7. Reserva da Oficina sem pedido pra Logística
    const logAbertas = atv.filter(a => a.area === 'logistica' && a.status !== 'Concluído' && a.status !== 'Recusado');
    const comPedido = new Set(logAbertas.map(a => ((a.descricao || '').match(/\[REABASTECER_RESERVA:([^\]]+)\]/) || [])[1]).filter(Boolean));
    const semPedido = ativos.filter(a => a.local === 'Oficina / Reserva' && !comPedido.has(a.id));
    if (semPedido.length) c.push(cartao({ num: semPedido.length, titulo: 'Reserva parada na oficina',
        desc: 'Peça pronta sem pedido pra Logística levar pra Reserva da Máquina.',
        lista: semPedido.map(a => `<div><span><b>${esc(window.rotuloEquipamento(a))}</b> · ${esc(a.tipo)}</span><button class="btn-outline-neutral" onclick="window.enviarReservaParaMaquina('${esc(a.id)}')">Pedir</button></div>`) }));

    // 8. Logística atrasada
    const logAtras = logAbertas.map(a => ({ ...a, dias: diasDesde(a.criado_em) })).filter(a => a.dias >= 2).sort((a, b) => b.dias - a.dias);
    if (logAtras.length) c.push(cartao({ num: logAtras.length, titulo: 'Logística com pedido parado',
        desc: 'Transportes pedidos há 2 dias ou mais e ainda não feitos.',
        lista: logAtras.map(a => `<div><span>${esc(semMarcador(a.descricao).slice(0, 52))}</span><span>${a.dias} d</span></div>`) }));

    // 9. Qualidade aguardando
    const qual = (Array.isArray(qualidade) ? qualidade : []).filter(q => q.status && q.status !== 'Concluído');
    if (qual.length) c.push(cartao({ nivel: 'info', num: qual.length, titulo: 'Qualidade aguardando',
        desc: 'Inspeções de entrada/saída ainda abertas' + (qual.some(q => Number(q.achados_pendentes) > 0) ? ', algumas com achado pendente.' : '.'),
        lista: qual.slice(0, 6).map(q => `<div><span><b>${esc(q.peca_id)}</b> · ${esc(q.status)}</span><span>${Number(q.achados_pendentes) || 0} achado(s)</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-qualidade')">Abrir Qualidade</button>` }));

    // 10. Mensagens das áreas sem resposta
    const msgs = (Array.isArray(mensagens) ? mensagens : []).filter(m => Number(m.nao_lidas) > 0);
    if (msgs.length) c.push(cartao({ nivel: 'info', num: msgs.reduce((s, m) => s + Number(m.nao_lidas), 0), titulo: 'Mensagens das áreas',
        desc: 'Mensagens das áreas ainda não lidas.',
        lista: msgs.map(m => `<div><span>${esc(m.nome_area || m.area)}</span><span>${Number(m.nao_lidas)}</span></div>`),
        acoes: `<button class="btn-outline-neutral" onclick="window.abrirAba(event,'aba-chats')">Abrir conversas</button>` }));

    c.sort((x, y) => (ORDEM_NIVEL[x.nivel] ?? 9) - (ORDEM_NIVEL[y.nivel] ?? 9));
    atualizarBriefingSupervisor(c);
    el.innerHTML = c.length ? htmlFilaDecisoes(c) : `<div class="tc-vazio">Sem atraso, sem reparo travado e sem pendência de logística ou qualidade agora.</div>`;
}

// Liga no carregamento do painel (renderPainelSupervisor fica em script.js)
function ligar() {
    const original = window.renderPainelSupervisor;
    if (typeof original !== 'function' || original.__comSubabas) return false;
    const novo = async function () {
        organizarSubabas();
        const r = original.apply(this, arguments);
        renderizarAtencaoSupervisor();
        return r;
    };
    novo.__comSubabas = true;
    window.renderPainelSupervisor = novo;
    return true;
}
if (!ligar()) {
    // script.js pode carregar depois deste módulo
    const t = setInterval(() => { if (ligar()) clearInterval(t); }, 200);
    setTimeout(() => clearInterval(t), 15000);
}
