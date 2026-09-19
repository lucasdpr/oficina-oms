// ==========================================================================
// FOLHÕES — abrir/pré-visualizar/concluir — extraído de script.js
// ==========================================================================
// Abre o Folhão certo por tipo de equipamento, gera a pré-visualização
// (chamada pelo Painel de Teste de Folhões) e o fluxo de "Concluir e
// Imprimir" por tipo — ponte entre o Painel Geral/Painel do Técnico e
// os módulos de Folhão específicos de cada equipamento (JS/Folhoes/).

import { BANCO_ATIVOS } from '../Core/banco.js?v=5';

// ==========================================
window.abrirFolhaoPorTipo = function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        alert('Equipamento não encontrado.');
        return;
    }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ==========================================
    // 1. MAPEAMENTO COMPLETO DE FOLHÕES
    // ==========================================

    // ---- MOLDES ----
    if (tipo === 'Molde') {
        if (mcc === '2/3') {
            if (typeof window.abrirFolhaoMolde23 === 'function') {
                window.abrirFolhaoMolde23(id);
                return;
            }
        } else {
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        // Fallback: se a função não existir, abre o folhão genérico
        if (typeof window.abrirFolhaoGenerico === 'function') {
            window.abrirFolhaoGenerico(id);
            return;
        }
        console.warn(`Folhão para Molde (MCC ${mcc}) não implementado.`);
        return;
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.abrirFolhaoMCC4 === 'function') {
            window.abrirFolhaoMCC4(id);
            return;
        }
        console.warn('Folhão Bender não implementado.');
        return;
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.abrirFolhaoBow === 'function') {
            window.abrirFolhaoBow(id);
            return;
        }
        console.warn('Folhão Bow não implementado.');
        return;
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.abrirFolhaoHorizontal === 'function') {
            window.abrirFolhaoHorizontal(id);
            return;
        }
        console.warn('Folhão Horizontal não implementado.');
        return;
    }

    // ---- STRAIGHTENER (R1 e R2) ----
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.abrirFolhaoR1 === 'function') {
                window.abrirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.abrirFolhaoR2 === 'function') {
                window.abrirFolhaoR2(id);
                return;
            }
        } else {
            // Fallback: se não identificar R1/R2, tenta o folhão MCC4
            if (typeof window.abrirFolhaoMCC4 === 'function') {
                window.abrirFolhaoMCC4(id);
                return;
            }
        }
        console.warn('Folhão para Straightener não implementado.');
        return;
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.abrirFolhaoDesempenadeira === 'function') {
            window.abrirFolhaoDesempenadeira(id);
            return;
        }
        console.warn('Folhão Desempenadeira não implementado.');
        return;
    }

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    // 🔧 CORREÇÃO: antes esses tipos caíam no fallback genérico e abriam
    // o folhão MCC4 (Molde/Bender) por engano — checklist errado. Os 3
    // grupos usam o mesmo checklist entre si (documento oficial), só
    // muda a tolerância de GAP e a lista de materiais.
    //
    // 🔧 CORREÇÃO 2 (o "Concluir" não tirava a peça da Oficina/Reparo,
    // mesmo pra peças de Grupo já reconhecidas aqui): o cadastro manual
    // no Estoque Reserva usa o tipo "Segmento Grupo 1/2/3" (com a
    // palavra "Segmento" na frente — ver as <option> em app.html), mas
    // esta checagem só reconhecia "Grupo 1/2/3" (sem "Segmento"), que é
    // como as peças ORIGINAIS da planilha ficam depois de traduzidas
    // (traduzirTipo, em banco.js). Uma peça de Grupo cadastrada pelo
    // técnico (e não importada da planilha original) nunca batia aqui,
    // caía no fallback genérico (folhão de Molde/Bender, sem noção
    // nenhuma de "concluir e voltar pra reserva" desse tipo de peça) —
    // por isso o "Concluir" parecia não fazer nada.
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.abrirFolhaoSegmentoGrupo === 'function') {
            window.abrirFolhaoSegmentoGrupo(id);
            return;
        }
        console.warn('Folhão Segmento Grupo não implementado.');
        return;
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.abrirFolhaoSegmentoZero === 'function') {
            window.abrirFolhaoSegmentoZero(id);
            return;
        }
        console.warn('Folhão Segmento Zero não implementado.');
        return;
    }

    // ---- OUTROS TIPOS (FALLBACK) ----
    // Se chegar aqui, tenta abrir o folhão genérico (se existir)
    if (typeof window.abrirFolhaoGenerico === 'function') {
        window.abrirFolhaoGenerico(id);
        return;
    }

    // Último recurso: abre o folhão do Bender como fallback
    if (typeof window.abrirFolhaoMCC4 === 'function') {
        console.warn(`Tipo ${tipo} sem folhão específico. Usando MCC4 como fallback.`);
        window.abrirFolhaoMCC4(id);
        return;
    }

    // Se nada funcionar, exibe uma mensagem amigável (sem alert)
    console.warn(`Nenhum folhão disponível para o tipo: ${tipo}`);
};

// ==========================================================================
// 🆕 PRÉ-VISUALIZAR — chamado direto do painel "Teste de Folhões"
// (renderPainelDevTeste), não de dentro do Folhão nem da tela do
// Checklist de Execução. Pedido do técnico: antes só dava pra
// conferir o documento final abrindo o Folhão na mão e clicando num
// botão lá dentro — queria isso junto do "Abrir Folhão" já existente
// nesse painel de teste.
//
// Abre o Folhão certo pro tipo do equipamento (populado com o rascunho
// + o que já foi preenchido no Checklist de Execução, igual o botão
// "Folhão" já faz) e, assim que terminar de carregar, dispara a
// pré-visualização sozinho — sem precisar clicar em mais nada.
window.previsualizarFolhaoDoReparo = async function(id) {
    const item = window.BANCO_ATIVOS.find(a => a.id === id);
    if (!item) { alert('Equipamento não encontrado.'); return; }

    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // Molde MCC4, Molde MCC2/3 e Horizontal têm pré-visualização própria.
    // Os outros folhões ainda não têm uma função previsualizarFolhaoX
    // equivalente — adicionar aqui conforme cada área ganhar a sua.
    if (tipo === 'Molde' && mcc !== '2/3' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoMolde4 === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoMolde4();
        return;
    }
    if (tipo === 'Molde' && mcc === '2/3' && typeof window.abrirFolhaoMolde23 === 'function' && typeof window.previsualizarFolhaoMolde23 === 'function') {
        await window.abrirFolhaoMolde23(id);
        window.previsualizarFolhaoMolde23();
        return;
    }
    if (tipo === 'Horizontal' && typeof window.abrirFolhaoHorizontal === 'function' && typeof window.previsualizarFolhaoHorizontal === 'function') {
        await window.abrirFolhaoHorizontal(id);
        window.previsualizarFolhaoHorizontal();
        return;
    }
    if (tipo === 'Bow' && typeof window.abrirFolhaoBow === 'function' && typeof window.previsualizarFolhaoBow === 'function') {
        await window.abrirFolhaoBow(id);
        window.previsualizarFolhaoBow();
        return;
    }
    // 🆕 Bender — mesmo gap que existia pro Straightener (ver abaixo):
    // abrirFolhaoMCC4 + previsualizarFolhaoBender já existem, só faltava
    // o caso aqui pra Pré-visualizar não cair no alert genérico.
    if (tipo === 'Bender' && typeof window.abrirFolhaoMCC4 === 'function' && typeof window.previsualizarFolhaoBender === 'function') {
        await window.abrirFolhaoMCC4(id);
        window.previsualizarFolhaoBender();
        return;
    }
    // 🆕 Segmento Zero — mesmo gap do Bender/Straightener.
    if (tipo === 'Segmento Zero' && typeof window.abrirFolhaoSegmentoZero === 'function' && typeof window.previsualizarFolhaoSegZero === 'function') {
        await window.abrirFolhaoSegmentoZero(id);
        window.previsualizarFolhaoSegZero();
        return;
    }
    // 🆕 Cadeira Superior/Inferior (Desempenadeira) — mesmo gap.
    if ((tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') && typeof window.abrirFolhaoDesempenadeira === 'function' && typeof window.previsualizarFolhaoDesemp === 'function') {
        await window.abrirFolhaoDesempenadeira(id);
        window.previsualizarFolhaoDesemp();
        return;
    }
    // 🆕 Segmento Grupo 1/2/3 — mesmo gap.
    if (/^(Grupo|Segmento Grupo) [123]$/.test(tipo) && typeof window.abrirFolhaoSegmentoGrupo === 'function' && typeof window.previsualizarFolhaoSegGrupo === 'function') {
        await window.abrirFolhaoSegmentoGrupo(id);
        window.previsualizarFolhaoSegGrupo();
        return;
    }
    // 🆕 Straightener (R1 e R2) — mesma regra de identificação usada em
    // abrirFolhaoPorTipo (por id, já que os dois compartilham o tipo
    // canônico "Straightener").
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if ((tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) && typeof window.abrirFolhaoR1 === 'function' && typeof window.previsualizarFolhaoR1 === 'function') {
            await window.abrirFolhaoR1(id);
            window.previsualizarFolhaoR1();
            return;
        }
        if ((tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) && typeof window.abrirFolhaoR2 === 'function' && typeof window.previsualizarFolhaoR2 === 'function') {
            await window.abrirFolhaoR2(id);
            window.previsualizarFolhaoR2();
            return;
        }
    }

    alert('Pré-visualização ainda não disponível pra esse tipo de equipamento — use o botão "Folhão" pra conferir manualmente.');
};

// ==========================================================================
// 🆕 CONCLUIR E IMPRIMIR — POR TIPO. Chamado pelo botão "Concluir" do
// Checklist de Execução (renderizarBotaoConcluirReparo, em
// checklist-execucao.js), que ANTES chamava window.concluirEImprimirFolhaoMolde4
// direto, fixo — funcionava só pro Molde, ia quebrar (ou imprimir o
// Folhão errado) assim que outra área fosse cadastrada. Agora decide
// pelo tipo do equipamento, igual window.abrirFolhaoPorTipo já faz pro
// Folhão: se a área tiver uma função de conclusão própria, usa ela; se
// não tiver ainda, cai na genérica (window.concluirEImprimirFolhaoGenerico,
// em folhaoMolde4.js) até que uma específica seja implementada.
// ==========================================================================
window.concluirEImprimirFolhaoPorTipo = function(id) {
    const item = BANCO_ATIVOS.find(a => a.id === id);
    if (!item) {
        console.warn(`Concluir: equipamento ${id} não encontrado no BANCO_ATIVOS.`);
        return;
    }
    const tipo = item.tipo || '';
    const mcc = item.mcc_compat || '';

    // ---- MOLDE MCC4 (e Molde sem MCC 2/3) ----
    if (tipo === 'Molde' && mcc !== '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde4 === 'function') {
            window.concluirEImprimirFolhaoMolde4(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- MOLDE MCC 2/3 ----
    if (tipo === 'Molde' && mcc === '2/3') {
        if (typeof window.concluirEImprimirFolhaoMolde23 === 'function') {
            window.concluirEImprimirFolhaoMolde23(id);
            return;
        }
    }

    // ---- BOW ----
    if (tipo === 'Bow') {
        if (typeof window.concluirEImprimirFolhaoBow === 'function') {
            window.concluirEImprimirFolhaoBow(id);
            return;
        }
    }

    // ---- HORIZONTAL ----
    if (tipo === 'Horizontal') {
        if (typeof window.concluirEImprimirFolhaoHorizontal === 'function') {
            window.concluirEImprimirFolhaoHorizontal(id);
            return;
        }
    }

    // ---- STRAIGHTENER (R1 e R2) — mesma regra de identificação do
    // abrirFolhaoPorTipo, pra Concluir abrir o mesmo laudo que foi salvo.
    if (tipo === 'Straightener' || tipo === 'Straightener R1' || tipo === 'Straightener R2') {
        if (tipo === 'Straightener R1' || id.includes('STR-1') || id.includes('R1')) {
            if (typeof window.concluirEImprimirFolhaoR1 === 'function') {
                window.concluirEImprimirFolhaoR1(id);
                return;
            }
        } else if (tipo === 'Straightener R2' || id.includes('STR-2') || id.includes('R2')) {
            if (typeof window.concluirEImprimirFolhaoR2 === 'function') {
                window.concluirEImprimirFolhaoR2(id);
                return;
            }
        }
    }

    // ---- CADEIRA SUPERIOR E INFERIOR (DESEMPENADEIRA) ----
    if (tipo === 'Cadeira Superior' || tipo === 'Cadeira Inferior') {
        if (typeof window.concluirEImprimirFolhaoDesemp === 'function') {
            window.concluirEImprimirFolhaoDesemp(id);
            return;
        }
    }

    // ---- SEGMENTO GRUPO 1, 2 E 3 (MCC 2/3) ----
    if (tipo === 'Grupo 1' || tipo === 'Grupo 2' || tipo === 'Grupo 3' ||
        tipo === 'Segmento Grupo 1' || tipo === 'Segmento Grupo 2' || tipo === 'Segmento Grupo 3') {
        if (typeof window.concluirEImprimirFolhaoSegmentoGrupo === 'function') {
            window.concluirEImprimirFolhaoSegmentoGrupo(id);
            return;
        }
    }

    // ---- SEGMENTO ZERO ----
    if (tipo === 'Seguimento Zero' || tipo === 'Segmento Zero') {
        if (typeof window.concluirEImprimirFolhaoSegmentoZero === 'function') {
            window.concluirEImprimirFolhaoSegmentoZero(id);
            return;
        }
    }

    // ---- BENDER ----
    if (tipo === 'Bender') {
        if (typeof window.concluirEImprimirFolhaoBender === 'function') {
            window.concluirEImprimirFolhaoBender(id);
            return;
        }
    }

    // ---- QUALQUER OUTRO TIPO (e o que faltar implementar) ----
    // Ainda sem função de conclusão própria — usa a genérica, que faz a
    // mesma coisa (busca o laudo salvo, manda pra Reserva, imprime) sem
    // nada fixo de Molde. Quando uma área precisar de regra diferente,
    // cria window.concluirEImprimirFolhaoX e adiciona um bloco aqui, no
    // mesmo padrão dos blocos de cima.
    if (typeof window.concluirEImprimirFolhaoGenerico === 'function') {
        window.concluirEImprimirFolhaoGenerico(id);
        return;
    }

    console.warn(`Concluir: nenhuma função de conclusão disponível para o tipo "${tipo}".`);
};

