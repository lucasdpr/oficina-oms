// ==========================================================================
// ADMINISTRAÇÃO DE COLABORADORES — extraído de script.js na modularização
// ==========================================================================
// Área Restrita: gerenciar acesso (ativar/desativar), resetar senha,
// trocar cargo, editar dados e ver eventos de um colaborador — tudo
// protegido no servidor por token (ver headersAdmin em Core/utils.js).

import { resolverApiBase } from '../Core/banco.js?v=5';
import { OPERADOR_LOGADO } from '../Core/estado.js';
import { verificarAcesso } from '../Core/permissoes.js';
import { headersAdmin } from '../Core/utils.js';
import { AREAS_OFICINA } from '../Core/dados.js';

// ==========================================
// 🆕 ADMINISTRAÇÃO DE COLABORADORES (Área Restrita) — gerenciar acesso
// (ativar/desativar), resetar senha e trocar cargo pelo app, sem
// precisar rodar script no terminal (resetar_colaboradores.py,
// restringir_acesso.py, reativartodos.py continuam existindo, mas
// agora tem alternativa mais rápida pra ação pontual em 1 pessoa).
// ==========================================
let ADMIN_COLABORADORES_CACHE = [];

window.carregarAdminColaboradores = async function() {
    console.log('🔎 [DIAGNÓSTICO] carregarAdminColaboradores() foi chamada.');
    const tbody = document.getElementById('admin-colaboradores-table-body');
    if (!tbody) { console.log('🔎 [DIAGNÓSTICO] tbody NÃO encontrado no HTML — abortando.'); return; }

    const matricula = (OPERADOR_LOGADO && OPERADOR_LOGADO.matricula || "").toUpperCase();
    console.log('🔎 [DIAGNÓSTICO] matrícula logada:', matricula, '| autorizada?', MATRICULAS_TESTE_FOLHOES.includes(matricula));
    if (!MATRICULAS_TESTE_FOLHOES.includes(matricula)) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Acesso restrito.</td></tr>`;
        return;
    }

    // 🔧 CORREÇÃO ("tela piscando"): só mostra "Carregando..." na
    // primeira vez (tabela ainda vazia) — no auto-refresh de 15s, a
    // tabela antiga fica na tela até os dados novos chegarem, em vez de
    // piscar "Carregando..." e sumir a cada ciclo mesmo sem mudar nada.
    if (!ADMIN_COLABORADORES_CACHE.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Carregando...</td></tr>`;
    }

    try {
        const apiBase = await resolverApiBase();
        console.log('🔎 [DIAGNÓSTICO] apiBase resolvida:', apiBase);
        const resp = await fetch(`${apiBase}/api/colaboradores/todos`, { cache: 'no-store' });
        console.log('🔎 [DIAGNÓSTICO] status da resposta:', resp.status, resp.ok);
        ADMIN_COLABORADORES_CACHE = resp.ok ? await resp.json() : [];
        console.log('🔎 [DIAGNÓSTICO] colaboradores recebidos:', ADMIN_COLABORADORES_CACHE.length);
    } catch (e) {
        console.error('🔎 [DIAGNÓSTICO] ERRO ao carregar a lista de colaboradores:', e);
        ADMIN_COLABORADORES_CACHE = [];
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Não foi possível carregar. Verifique sua internet.</td></tr>`;
        return;
    }

    window.filtrarAdminColaboradores();
};

window.filtrarAdminColaboradores = function() {
    const tbody = document.getElementById('admin-colaboradores-table-body');
    if (!tbody) return;

    const termo = (document.getElementById('admin-colab-busca')?.value || '').toLowerCase().trim();
    const filtroPresenca = document.getElementById('admin-colab-filtro-presenca')?.value || '';
    let lista = ADMIN_COLABORADORES_CACHE;
    if (termo) {
        lista = lista.filter(c =>
            (c.matricula || '').toLowerCase().includes(termo) ||
            (c.nome || '').toLowerCase().includes(termo) ||
            (c.cargo || '').toLowerCase().includes(termo)
        );
    }

    // 🆕 Filtro de presença/status (pedido do usuário: achar quem nunca
    // logou ou tá offline há dias, sem precisar rolar a lista inteira).
    if (filtroPresenca) {
        const agora = Date.now();
        lista = lista.filter(c => {
            const diffMs = c.ultimo_acesso ? (agora - new Date(c.ultimo_acesso.replace(' ', 'T')).getTime()) : null;
            switch (filtroPresenca) {
                case 'online': return diffMs !== null && diffMs <= ONLINE_JANELA_MS;
                case 'offline_7d': return diffMs !== null && diffMs > 7 * 24 * 60 * 60 * 1000;
                case 'nunca': return !c.ultimo_acesso;
                case 'primeiro_acesso': return !!c.primeiro_acesso;
                case 'bloqueado': return !c.ativo;
                default: return true;
            }
        });
    }

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum colaborador encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr style="${!c.ativo ? 'opacity:0.5;' : ''}">
            <td class="font-code">${c.matricula}</td>
            <td>${c.nome}</td>
            <td>${c.cargo || '-'}</td>
            <td>
                ${c.ativo
                    ? '<span style="color:var(--success); font-weight:700;">🟢 Conta habilitada</span>'
                    : '<span style="color:var(--danger); font-weight:700;">🔴 Bloqueado</span>'}
                ${c.primeiro_acesso ? '<br><small class="text-muted">Primeiro acesso pendente</small>' : ''}
            </td>
            <td>${window.formatarPresencaColaborador(c.ultimo_acesso)}</td>
            <td style="white-space:nowrap;">
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.abrirEventosColaborador('${c.matricula}', '${c.nome.replace(/'/g, "\\'")}')" title="Ver eventos">
                    <i class="fas fa-book-open"></i>
                </button>
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.editarDadosColaborador('${c.matricula}', '${c.nome.replace(/'/g, "\\'")}', '${(c.area || '').replace(/'/g, "\\'")}')" title="Editar nome/área">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.mudarCargoColaborador('${c.matricula}', '${(c.cargo || '').replace(/'/g, "\\'")}')" title="Trocar cargo">
                    <i class="fas fa-id-badge"></i>
                </button>
                <button class="btn-outline-neutral" style="padding:4px 10px; font-size:11px;" onclick="window.resetarSenhaColaborador('${c.matricula}', '${c.nome.replace(/'/g, "\\'")}')" title="Resetar senha">
                    <i class="fas fa-key"></i>
                </button>
                <button class="${c.ativo ? 'btn-outline-danger' : 'btn-premium btn-success'}" style="padding:4px 10px; font-size:11px;" onclick="window.alternarAtivoColaborador('${c.matricula}', ${!c.ativo}, '${c.nome.replace(/'/g, "\\'")}')" title="${c.ativo ? 'Desativar acesso' : 'Reativar acesso'}">
                    <i class="fas ${c.ativo ? 'fa-user-slash' : 'fa-user-check'}"></i>
                </button>
                ${c.ativo ? `
                <button class="btn-outline-danger" style="padding:4px 10px; font-size:11px;" onclick="window.forcarLogoutColaborador('${c.matricula}', '${c.nome.replace(/'/g, "\\'")}')" title="Forçar logout (sem bloquear a conta)">
                    <i class="fas fa-right-from-bracket"></i>
                </button>` : ''}
            </td>
        </tr>
    `).join('');
};

// 🆕 Presença real (pedido do usuário: "Ativo" hoje é só a conta estar
// habilitada — não diz se a pessoa está DE VERDADE dentro do app agora).
// ultimo_acesso é atualizado no login e a cada heartbeat (ver
// iniciarHeartbeatColaborador) — dentro da janela = Online; fora,
// mostra há quanto tempo ficou offline. Sem heartbeat vivo há mais de
// ONLINE_JANELA_MS, mesmo com a aba aberta, cai pra "offline" sozinho
// (ex: perdeu internet, fechou o app sem logout).
const ONLINE_JANELA_MS = 2 * 60 * 1000; // 2x o intervalo do heartbeat (60s)

window.formatarPresencaColaborador = function(ultimoAcessoStr) {
    if (!ultimoAcessoStr) return '<span class="text-muted">Nunca acessou</span>';
    const ultimoAcesso = new Date(ultimoAcessoStr.replace(' ', 'T'));
    if (isNaN(ultimoAcesso.getTime())) return '<span class="text-muted">—</span>';

    const diffMs = Date.now() - ultimoAcesso.getTime();
    if (diffMs <= ONLINE_JANELA_MS) {
        return '<span style="color:var(--success); font-weight:700;">🟢 Online agora</span>';
    }

    const diffMin = Math.floor(diffMs / 60000);
    const dias = Math.floor(diffMin / 1440);
    const horas = Math.floor((diffMin % 1440) / 60);
    const minutos = diffMin % 60;
    let tempo;
    if (dias > 0) tempo = `${dias}d ${horas}h`;
    else if (horas > 0) tempo = `${horas}h ${minutos}min`;
    else tempo = `${minutos}min`;

    return `<span class="text-muted">⚪ Offline há ${tempo}</span>`;
};

window.mudarCargoColaborador = async function(matricula, cargoAtual) {
    if (!verificarAcesso()) return;
    const novoCargo = prompt(`Novo cargo para ${matricula}:`, cargoAtual || '');
    if (novoCargo === null) return; // cancelou
    if (!novoCargo.trim()) return alert('O cargo não pode ficar vazio.');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/mudar_cargo`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula, cargo: novoCargo.trim() })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível trocar o cargo.');
            return;
        }
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao trocar cargo:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.resetarSenhaColaborador = async function(matricula, nome) {
    if (!verificarAcesso()) return;
    if (!confirm(`Resetar a senha de ${nome} (${matricula})?\n\nA senha temporária dela volta a ser a própria matrícula, e ela vai precisar criar uma senha nova no próximo login.`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/resetar_senha`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível resetar a senha.');
            return;
        }
        alert(`✅ Senha de ${nome} resetada.`);
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao resetar senha:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Forçar logout remoto SEM bloquear a conta — pra token suspeito de
// vazado, celular perdido/roubado, ou garantir que um dispositivo
// antigo caiu depois de trocar de aparelho. Diferente de bloquear
// (que já mata a sessão E impede logar de novo), aqui a pessoa
// consegue logar de novo na mesma hora.
window.forcarLogoutColaborador = async function(matricula, nome) {
    if (!verificarAcesso()) return;
    if (!confirm(`Forçar logout de ${nome} (${matricula})?\n\nQualquer sessão aberta dela em qualquer dispositivo é encerrada agora. A conta continua habilitada — ela pode logar de novo na hora.`)) return;

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/forcar_logout`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível forçar o logout.');
            return;
        }
        alert(`✅ Sessão de ${nome} encerrada.`);
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao forçar logout:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

window.alternarAtivoColaborador = async function(matricula, novoAtivo, nome) {
    if (!verificarAcesso()) return;

    // 🆕 Motivo obrigatório só ao BLOQUEAR (pedido do usuário: "daqui 3
    // meses ninguém lembra por que fulano foi bloqueado" sem isso
    // registrado) — o backend também exige, isto aqui só evita a ida e
    // volta com erro.
    let motivo = null;
    if (!novoAtivo) {
        motivo = prompt(`Por que está bloqueando o acesso de ${nome} (${matricula})?`);
        if (motivo === null) return; // cancelou
        if (!motivo.trim()) return alert('É preciso informar o motivo do bloqueio.');
    } else {
        if (!confirm(`Tem certeza que quer reativar o acesso de ${nome} (${matricula})?`)) return;
    }

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/alternar_ativo`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula, ativo: novoAtivo, motivo: motivo ? motivo.trim() : null })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível atualizar o acesso.');
            return;
        }
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao atualizar acesso:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Editar nome/área de um colaborador (cargo já tem botão dedicado —
// window.mudarCargoColaborador). Cancelar qualquer um dos dois prompts
// não perde o outro: cada campo só entra no PATCH se de fato mudou.
window.editarDadosColaborador = async function(matricula, nomeAtual, areaAtual) {
    if (!verificarAcesso()) return;
    const novoNome = prompt(`Nome de ${matricula}:`, nomeAtual || '');
    if (novoNome === null) return; // cancelou tudo

    const areasValidas = (typeof AREAS_OFICINA !== 'undefined' ? AREAS_OFICINA : []).map(a => a.chave).join(', ');
    const novaArea = prompt(`Área de ${matricula} (chaves válidas: ${areasValidas} — ou deixe em branco):`, areaAtual || '');
    if (novaArea === null) return; // cancelou

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/editar`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula, nome: novoNome.trim() || null, area: novaArea.trim() || null })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível editar os dados.');
            return;
        }
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao editar colaborador:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 Cadastro de colaborador novo direto pela tela (ver modal
// #modal-novo-colaborador em app.html) — antes só dava rodando script
// no servidor (importar_colaboradores.py).
window.abrirModalNovoColaborador = function() {
    if (!verificarAcesso()) return;
    document.getElementById('novo-colab-matricula').value = '';
    document.getElementById('novo-colab-nome').value = '';
    document.getElementById('novo-colab-cargo').value = '';
    if (typeof popularSelectAreaOficina === 'function') popularSelectAreaOficina('novo-colab-area');
    document.getElementById('modal-novo-colaborador')?.classList.remove('hidden');
};

window.confirmarNovoColaborador = async function() {
    const matricula = document.getElementById('novo-colab-matricula')?.value.trim();
    const nome = document.getElementById('novo-colab-nome')?.value.trim();
    const cargo = document.getElementById('novo-colab-cargo')?.value.trim();
    const area = document.getElementById('novo-colab-area')?.value || null;

    if (!matricula || !nome) return alert('Matrícula e nome são obrigatórios.');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/colaboradores/criar`, {
            method: 'POST',
            headers: headersAdmin(),
            body: JSON.stringify({ matricula, nome, cargo: cargo || null, area })
        });
        if (!resp.ok) {
            const erro = await resp.json().catch(() => ({}));
            alert(erro.detail || 'Não foi possível cadastrar o colaborador.');
            return;
        }
        document.getElementById('modal-novo-colaborador')?.classList.add('hidden');
        alert(`✅ ${nome} cadastrado(a). Senha temporária: a própria matrícula.`);
        await window.carregarAdminColaboradores();
    } catch (e) {
        console.error('⚠️ Erro ao cadastrar colaborador:', e);
        alert('Não foi possível conectar ao servidor.');
    }
};

// 🆕 "Eventos de cada funcionário separado" — reaproveita a mesma rota
// do Prontuário das peças (GET /api/historico_eventos?peca_id=X),
// passando a MATRÍCULA como peca_id (ver _registrar_evento_colaborador
// no backend, que grava toda ação admin com esse mesmo peca_id).
window.abrirEventosColaborador = async function(matricula, nome) {
    const titulo = document.getElementById('eventos-colab-titulo');
    const lista = document.getElementById('eventos-colab-lista');
    if (titulo) titulo.textContent = `${nome} (${matricula})`;
    if (lista) lista.innerHTML = '<div class="text-muted" style="padding:12px 0;">Carregando...</div>';
    document.getElementById('modal-eventos-colaborador')?.classList.remove('hidden');

    try {
        const apiBase = await resolverApiBase();
        const resp = await fetch(`${apiBase}/api/historico_eventos?peca_id=${encodeURIComponent(matricula)}&limite=200`, { cache: 'no-store' });
        const eventos = resp.ok ? await resp.json() : [];
        if (!lista) return;
        lista.innerHTML = eventos.length
            ? eventos.map(e => `
                <div style="padding:8px 0; border-bottom:1px solid var(--border);">
                    <div class="text-muted font-code" style="font-size:11px;">${e.data_hora || '—'} · ${e.operador || 'Sistema'}</div>
                    <div style="margin-top:2px; font-size:13px;">${e.acao || ''}</div>
                </div>`).join('')
            : '<div class="text-muted" style="padding:12px 0;">Nenhum evento registrado ainda pra este colaborador.</div>';
    } catch (e) {
        console.error('⚠️ Erro ao carregar eventos do colaborador:', e);
        if (lista) lista.innerHTML = '<div class="text-muted" style="padding:12px 0;">Não consegui carregar os eventos.</div>';
    }
};

// 🆕 Exporta a lista atual (já filtrada/buscada na tela) como CSV — pra
// RH/gestão cobrar quem não usa o sistema, sem precisar pedir query
// direto no banco.
window.exportarColaboradoresCsv = function() {
    if (!ADMIN_COLABORADORES_CACHE.length) return alert('Nada pra exportar ainda — carregue a lista primeiro.');
    const linhas = [['Matricula', 'Nome', 'Cargo', 'Conta', 'Primeiro Acesso Pendente', 'Ultimo Acesso'].join(';')];
    ADMIN_COLABORADORES_CACHE.forEach(c => {
        linhas.push([
            c.matricula,
            (c.nome || '').replace(/;/g, ','),
            (c.cargo || '').replace(/;/g, ','),
            c.ativo ? 'Habilitada' : 'Bloqueado',
            c.primeiro_acesso ? 'Sim' : 'Não',
            c.ultimo_acesso || 'Nunca acessou'
        ].join(';'));
    });
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

