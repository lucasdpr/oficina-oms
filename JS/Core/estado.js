// ==========================================================================
// ESTADO COMPARTILHADO ENTRE MÓDULOS DE script.js
// ==========================================================================
// Extraído de script.js na modularização — estas são as variáveis que
// mais de uma área do sistema lê ou escreve (ex: OPERADOR_LOGADO é usado
// do login até a Central de Notificações). Variáveis usadas por uma única
// tela continuam morando no próprio arquivo daquela tela.
//
// Import só para leitura: como são bindings de módulo ES, quem importar
// não pode fazer `OPERADOR_LOGADO = ...` diretamente (erro em tempo de
// execução). Para os casos em que o valor precisa ser TROCADO por outro
// módulo (não só lido ou mutado com .push/.unshift), existe uma função
// setXxx() correspondente — mesmo padrão que Core/banco.js já usa com
// setOperador().

let HISTORICO_ACOES = JSON.parse(localStorage.getItem("oms_historico_v32_local")) || [];
export { HISTORICO_ACOES };

let BANCO_ROLOS = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
if (!BANCO_ROLOS) {
    BANCO_ROLOS = [
        { id: "R-S5", nome: "Rolo de Cadeira 450", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 14 },
        { id: "R-S5P", nome: "Rolo de Cadeira 450 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 8 },
        { id: "R-S4", nome: "Rolo de Cadeira 400", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 12 },
        { id: "R-S4P", nome: "Rolo de Cadeira 400 Puxador", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 6 },
        { id: "R-H300A", nome: "Rolo Horizontal de 300 Acionado", conjunto: "Segmento", mcc_compat: "4", qtd: 6 },
        { id: "R-200", nome: "Rolo 200", conjunto: "Segmento Zero", mcc_compat: "2/3/4", qtd: 8 },
        { id: "R-FR23", nome: "Foot Roll", conjunto: "Molde", mcc_compat: "2/3", qtd: 4 }
    ];
    localStorage.setItem("oms_rolos_v32_local", JSON.stringify(BANCO_ROLOS));
}
export { BANCO_ROLOS };

let BANCO_HIDRAULICA = JSON.parse(localStorage.getItem("oms_hidraulica_v32_local"));
if (!BANCO_HIDRAULICA) {
    BANCO_HIDRAULICA = [
        // ---- MCC 2/3 ----
        { id: "H-PGH12", nome: "Porca Hidráulica Grupo 1,2", conjunto: "Grupo 1,2", mcc_compat: "2/3", qtd: 0 },
        { id: "H-PGH3", nome: "Porca Hidráulica Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G1", nome: "Cilindro de Grupo 1", conjunto: "Grupo 1", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G2", nome: "Cilindro de Grupo 2", conjunto: "Grupo 2", mcc_compat: "2/3", qtd: 0 },
        { id: "H-CIL-G3", nome: "Cilindro de Grupo 3", conjunto: "Grupo 3", mcc_compat: "2/3", qtd: 0 },
        { id: "H-DESEMP", nome: "Desempenadeira Cadeira", conjunto: "Cadeira", mcc_compat: "2/3", qtd: 0 },
        // ---- MCC 4 ----
        { id: "H-CIL-ELEV4", nome: "Cilindro de Elevação de Estrutura", conjunto: "Estrutura", mcc_compat: "4", qtd: 0 },
        { id: "H-CIL-PUX4", nome: "Cilindro Puxador", conjunto: "Puxador", mcc_compat: "4", qtd: 0 },
        { id: "H-PH-BOW", nome: "Porca Hidráulica Bow", conjunto: "Bow", mcc_compat: "4", qtd: 0 },
        { id: "H-PH-HOR", nome: "Porca Hidráulica Horizontal", conjunto: "Horizontal", mcc_compat: "4", qtd: 0 }
    ];
    localStorage.setItem("oms_hidraulica_v32_local", JSON.stringify(BANCO_HIDRAULICA));
}
export { BANCO_HIDRAULICA };

// 🔧 CORREÇÃO (dessincronia silenciosa de Rolos/Hidráulica): sincronizarRolosReais()/
// sincronizarHidraulicaReal() (em banco.js) buscam do Neon e gravam tanto no array
// interno daquele módulo quanto no localStorage — mas este módulo mantém sua PRÓPRIA
// cópia (BANCO_ROLOS/BANCO_HIDRAULICA acima), lida do localStorage só uma vez no
// carregamento. Sem isso, a sincronização "funcionava" (log de sucesso, localStorage
// atualizado) mas a tela continuava mostrando os dados antigos até um F5 completo.
// Chamar isto logo depois de cada sincronizarRolosReais()/sincronizarHidraulicaReal()
// recarrega a cópia local a partir do que acabou de ser gravado no localStorage.
export function recarregarRolosEHidraulicaLocal() {
    try {
        const rolos = JSON.parse(localStorage.getItem("oms_rolos_v32_local"));
        if (Array.isArray(rolos)) { BANCO_ROLOS.length = 0; BANCO_ROLOS.push(...rolos); }
    } catch (erro) {
        console.error("❌ Falha ao recarregar BANCO_ROLOS local:", erro);
    }
    try {
        const hidraulica = JSON.parse(localStorage.getItem("oms_hidraulica_v32_local"));
        if (Array.isArray(hidraulica)) { BANCO_HIDRAULICA.length = 0; BANCO_HIDRAULICA.push(...hidraulica); }
    } catch (erro) {
        console.error("❌ Falha ao recarregar BANCO_HIDRAULICA local:", erro);
    }
}

// carregado do Neon via carregarMateriaisDoBackend() (Oficina/estoque.js) — não é mais localStorage
let BANCO_MATERIAIS = [];
export { BANCO_MATERIAIS };
export function setBancoMateriais(novaLista) { BANCO_MATERIAIS = novaLista; }

let OPERADOR_LOGADO = JSON.parse(localStorage.getItem("oms_operador_v32_local")) || null;
export { OPERADOR_LOGADO };
export function setOperadorLogado(novoOperador) { OPERADOR_LOGADO = novoOperador; }

// 🆕 IDs de equipamentos com rascunho salvo (reparo já iniciado, ainda
// não concluído). Usado por renderReparos() pra tirar da lista
// "Iniciar Reparo" quem já está "em andamento". Populado por
// atualizarRascunhosAtivos() (Core/utils.js) e reaproveitado por
// carregarReparosAndamento() (Oficina/painelTecnico.js).
let RASCUNHOS_IDS_ATIVOS = new Set();
export { RASCUNHOS_IDS_ATIVOS };
export function setRascunhosIdsAtivos(novoSet) { RASCUNHOS_IDS_ATIVOS = novoSet; }

// Matrículas com acesso total a todas as áreas da Oficina (mesma lista
// do backend, em main.py). Usado no front pra decidir se o Painel do
// Técnico mostra tudo (ADM) ou só a área da pessoa.
export const MATRICULAS_ADM = ["CBK3574", "CSP1869", "CSP6632"];

// PAINEL DE TESTE DE FOLHÕES — só CBK3574 e CSP1869 podem ver.
// 🔒 Restrição fica no JS, não só escondendo com CSS: a tabela de
// equipamentos só é montada (innerHTML preenchido) se a matrícula
// logada bater com uma das autorizadas. Pra qualquer outro colaborador,
// o link do menu nem aparece e a aba fica vazia mesmo se a pessoa tentar
// abrir na unha pelo console.
export const MATRICULAS_TESTE_FOLHOES = ["CBK3574", "CSP1869"];

// AUDITORIA — só CBK3574 e CSP1869 podem ver.
// 🔒 Mesmo princípio do painel de teste acima: a restrição não é só
// visual (esconder o link do menu). renderHistorico() também se recusa
// a montar a tabela pra quem não está na lista — ninguém não autorizado
// vê os dados de auditoria, nem forçando a aba pelo console do navegador.
export const MATRICULAS_AUDITORIA = ["CBK3574", "CSP1869"];

// 🆕 Chave da área da Oficina que a pessoa está olhando agora — usada
// tanto por quem abre a tela da área (Área da Oficina) quanto por quem
// abre um chat de uma área específica (Chats), pra saber "de qual área
// estamos falando" sem precisar passar isso de módulo em módulo.
let OFICINA_AREA_ATUAL = null;
export { OFICINA_AREA_ATUAL };
export function setOficinaAreaAtual(novaChave) { OFICINA_AREA_ATUAL = novaChave; }

// 🆕 Cache de atividades da Oficina e o "estado do formulário" de Nova
// Atividade — lidos/escritos pela Central de Áreas, pela própria Área
// da Oficina, pela Ponte Rolante e pelo Painel do Supervisor (leitura).
// Todos ainda moram fisicamente em script.js hoje, mas como 4 áreas
// diferentes mexem nisso, o estado precisa ser único de verdade.
let OFICINA_ATIVIDADES_CACHE = [];
export { OFICINA_ATIVIDADES_CACHE };
export function setOficinaAtividadesCache(novaLista) { OFICINA_ATIVIDADES_CACHE = novaLista; }

let OFICINA_FILTRO_STATUS_ATUAL = '';
export { OFICINA_FILTRO_STATUS_ATUAL };
export function setOficinaFiltroStatusAtual(novoStatus) { OFICINA_FILTRO_STATUS_ATUAL = novoStatus; }

let OFICINA_TIPO_ATIVIDADE_ATUAL = 'equipamento'; // 'equipamento' | 'avulsa'
export { OFICINA_TIPO_ATIVIDADE_ATUAL };
export function setOficinaTipoAtividadeAtual(novoTipo) { OFICINA_TIPO_ATIVIDADE_ATUAL = novoTipo; }

let OFICINA_FOTO_BASE64 = null;
export { OFICINA_FOTO_BASE64 };
export function setOficinaFotoBase64(novaFoto) { OFICINA_FOTO_BASE64 = novaFoto; }

let OFICINA_EDITANDO_ID = null; // null = criando atividade nova; número = editando essa atividade
export { OFICINA_EDITANDO_ID };
export function setOficinaEditandoId(novoId) { OFICINA_EDITANDO_ID = novoId; }

let OFICINA_EQUIPE_ATUAL = []; // equipe da área aberta no momento (usada no seletor de Responsável)
export { OFICINA_EQUIPE_ATUAL };
export function setOficinaEquipeAtual(novaEquipe) { OFICINA_EQUIPE_ATUAL = novaEquipe; }
