// ==============================================================
// procedimentosOficina.js
// ==============================================================
// Procedimentos operacionais oficiais (documentos CSN/OMS), estruturados
// pra virar checklist interativo dentro da tela de cada área da Oficina.
// Cada procedimento aqui é digitado a partir do PDF original — o texto
// (títulos, pontos-chave, EPIs) é reproduzido conforme o documento.
//
// Pra adicionar uma área nova: só criar mais uma chave no objeto
// PROCEDIMENTOS_POR_AREA abaixo, com a mesma estrutura.
// ==============================================================

export const PROCEDIMENTOS_POR_AREA = {

    // ==========================================================
    // BENDER
    // ==========================================================
    'bender': [
        {
            id: '603088',
            nome: 'Mont/Desmont Rolos Bender MCC#4',
            revisao: '03',
            dataRevisao: '28/10/2024',
            frequencia: 'Semanal',
            responsavel: 'Mecânico líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem e desmontagem dos conjuntos de rolos do Bender da MCC#4 no interior da OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor Auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chave Allen 4 mm', 'Micrômetro 125 mm a 150 mm', 'Relógio comparador', 'Paquímetro 150 mm'],
            etapas: [
                { id: '1', titulo: '1. Desmontagem', secao: true },
                { id: '1.1', texto: 'Posicionar o conjunto de rolo em cima da bancada', pontosChave: 'Com auxílio de talha giratória. Para transportar o conjunto use a cinta, e para efetuar a desmontagem dos rolos utilize o eletroímã. Em caso de equipamento com resíduo de "Break out", realizar limpeza utilizando maçarico para atividades de oxicorte.', seguranca: 'Risco de impacto por rompimento da cinta e queda do rolo. Somente efetuar a tarefa com cintas em bom estado de conservação. Ter postura defensiva e ficar fora do raio de ação de carga suspensa.' },
                { id: '1.2', texto: 'Soltar os frenos da porca de segurança', pontosChave: 'Utilizar chave allen 4 mm. Retirar a porca de segurança com chave unha.' },
                { id: '1.3', texto: 'Aferir o diâmetro dos rolos', pontosChave: 'Utilizar micrômetro externo de 125 a 150 mm e protocolar medidas na planilha de controle de reparo.' },
                { id: '1.4', texto: 'Retirar os rolos e posicionar sobre a bancada', pontosChave: 'Com auxílio da talha giratória e o eletroímã.', seguranca: 'Risco de queda e aprisionamento das mãos.' },
                { id: '1.5', texto: 'Retirar o pino elástico do mancal fixo', pontosChave: 'Utilizar martelo ou marreta e saca pino.', seguranca: 'Risco de ferida corto contusa, ter atenção ao executar a tarefa.' },
                { id: '1.6', texto: 'Retirar a graxa existente na parte interna dos eixos', seguranca: 'Cobrir o solo com plástico para não haver contaminação do solo.' },
                { id: '1.7', texto: 'Efetuar limpeza nos eixos', pontosChave: 'Utilizar solvente e toalha industrial.', seguranca: 'Risco de contaminação via cutânea e respiratória — fazer uso de luva de cano longo em PVC e respirador compatível com o risco.' },
                { id: '1.8', texto: 'Efetuar aferição do eixo diâmetro e empeno', pontosChave: 'Com auxílio da talha giratória, estropar o eixo e colocá-lo no cavalete de aferição. Utilizar micrômetro de 50mm a 75mm e relógio comparador. Tolerância do Ø do eixo mínima de 74,94 mm. Aferir empeno do eixo com tolerância ±0,3mm. Se o eixo apresentar empeno maior que a tolerância, levar para prensa vertical e efetuar o desempeno.', seguranca: 'Travar os cavaletes de aferição com um Grampo Fixo. Obs.: o empeno do eixo pode desalinhar os cavaletes e ocasionar a queda do eixo. Risco de queda e aprisionamento das mãos.' },
                { id: '1.9', texto: 'Sacar os rolamentos e tubos espaçadores dos rolos', pontosChave: 'Com auxílio da talha giratória e o eletroímã, estropar o rolo e levar na prensa horizontal e sacar os rolamentos e tubos espaçadores.', seguranca: 'Risco de queda e aprisionamento das mãos ao utilizar prensa.' },
                { id: '1.10', texto: 'Inspecionar todos os sobressalentes do conjunto de rolo já desmontados', pontosChave: 'Os rolos com problemas vão para o cavalete de reparo geral. Rolos de 500 mm com trincas na extremidade devem ser sucatados. Diâmetro mínimo permissível para reutilizar é 147,00 mm.', seguranca: 'Risco de queda e aprisionamento das mãos ao utilizar prensa.' },
                { id: '1.11', texto: 'Efetuar limpeza dos rolos que estiverem em boas condições interna e externa', pontosChave: 'Colocar os rolos no cavalete e utilizar solvente e toalha industrial.', seguranca: 'Risco de contaminação via cutânea e respiratória — fazer uso de luva de cano longo em PVC e respirador compatível com o risco.' },

                { id: '2', titulo: '2. Montagem', secao: true },
                { id: '2.1', texto: 'Montar rolos', pontosChave: 'Efetuar limpeza interna. Montar os conjuntos com rolos que possuem os diâmetros externos iguais ou próximos.', seguranca: 'Risco de corte em rebarba no Ø interno do rolo.' },
                { id: '2.2', texto: 'Montar tubos espaçadores e espaçadores de encosto de rolamento nos rolos', pontosChave: 'Montar manualmente tubos espaçadores. Empurrar espaçadores de encosto de rolamento com auxílio do dispositivo e marreta.', seguranca: 'Risco de batida contra.' },
                { id: '2.3', texto: 'Pré-montar rolamento no rolo', pontosChave: 'Fazer uso de martelo de borracha para realizar a montagem.', seguranca: 'Risco de batida contra. Aprisionamento de mãos.' },
                { id: '2.4', texto: 'Prensar rolos', pontosChave: 'Com auxílio da talha giratória e eletroímã, estropar o rolo e levar para a prensa hidráulica. Empurrar o rolamento até encostar no espaçador.', seguranca: 'Risco de aprisionamento das mãos. Ter atenção ao utilizar a prensa hidráulica. Risco de queda.' },
                { id: '2.5', texto: 'Efetuar o término da montagem do rolamento, espaçador e bucha de bronze', pontosChave: 'Atentar para pressão da prensa no máx. 5 Kg. Com rolo na bancada, fazer montagem manual.', seguranca: 'Risco de rebarba.' },
                { id: '2.6', texto: 'Posicionar o eixo sobre a bancada e montar o mancal e anel elástico, posicionar o eixo no dispositivo e efetuar a montagem dos rolos', pontosChave: 'Utilizar talha e eletroímã ou cinta.', seguranca: 'Risco de queda. Risco de aprisionamento.' },
                { id: '2.7', texto: 'Apertar a porca de segurança e observando se os rolos estão girando livremente, e os mancais estão travados, frenar a porca de segurança, lubrificar os rolos', pontosChave: 'Utilizar chave de unha allen 4 mm. Utilizar bomba de graxa pneumática. Lubrificar os rolos.' },
                { id: '2.8', texto: 'Anotar numeração dos rolos e diâmetro na Planilha de Controle de Segmento Bender' }
            ]
        },
        {
            id: '603090',
            nome: 'Aferição Régua Base Bender MCC#4',
            revisao: '03',
            dataRevisao: '28/10/2024',
            frequencia: 'Semanal',
            responsavel: 'Mecânico líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na aferição de régua da base do bender da MCC#4 no interior da OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor Auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Soquete 24mm', 'Chave "T" 24mm', 'Chave Allen 4 mm'],
            etapas: [
                { id: '1', texto: 'Apertar todos os parafusos da base inferior e superior e transportar a base para o stand de aferição', pontosChave: 'Utilizar máquina pneumática e soquete 24 mm para apertar todos os parafusos. Utilizar PR 221 ou 146 para transportar a base superior ou inferior.', seguranca: 'Risco de aprisionamento. Risco de carga suspensa — verificar condições de uso dos estropos.' },
                { id: '1.1', texto: 'Aferir com a régua o Pass-line, respeitando base superior e inferior', pontosChave: 'Colocar a régua para aferição no stand. Utilizar paquímetro T para aferição. Registrar as informações na planilha de aferição de Pass-line.', seguranca: 'Risco de queda por diferença de nível.' },
                { id: '1.2', texto: 'Calcular e separar os calços para cada rolo, de acordo com as medidas encontradas', pontosChave: 'Utilizar micrômetro ou paquímetro.', seguranca: 'Ter atenção ao manusear os calços, risco de corte nas mãos.' },
                { id: '1.3', texto: 'Soltar os parafusos, levantar o rolo e colocar os calços', pontosChave: 'Utilizar máquina pneumática para soltar os parafusos. Utilizar talha elétrica e estropos ou cinta para levantar os rolos.', seguranca: 'Risco de aprisionamento das mãos. Risco de rompimento de estropos e cintas — utilizar somente estropos e cintas em boas condições de uso.' },
                { id: '1.4', texto: 'Apertar os parafusos, aferir conforme o 1.1 novamente', pontosChave: 'Utilizar máquina pneumática, soquete de 24 mm para apertar os parafusos. Utilizar paquímetro T para aferir. Se estiverem na medida conforme a planilha de aferição de Pass-Line base inferior, protocolar e torquear os parafusos com 200Nm. Se não estiver dentro da medida, repetir o processo.', seguranca: 'Ter atenção ao manusear os calços, risco de corte nas mãos. Risco de aprisionamento das mãos. Risco de queda devido diferença de nível.' },
                { id: '2', texto: 'Alinhamento da base superior', pontosChave: 'Executar as mesmas atividades de execução da base superior. Respeitar as diferenças apresentadas nas planilhas de aferição de passe-line superior e inferior.' }
            ],
            // 📏 Ficha de referência anexa ao procedimento (Aferição de
            // Pass-Line) — usada durante a etapa 1.1/1.4 pra saber o valor
            // esperado de cada rolo (tolerância ±0.15mm) e o diâmetro
            // esperado dos apoios (Ø 205 - 0,30 mm).
            tabelaReferencia: {
                titulo: 'Aferição de Pass-Line — valores de referência (Conjunto de rolo, tolerância ±0,15mm)',
                diametroApoios: 'Valor: Ø 205 - 0,30 mm',
                colunas: ['Rolo', 'Base Superior (mm)', 'Base Inferior (mm)'],
                linhas: [
                    ['1', '149,97', '149,97'],
                    ['2', '149,95', '149,95'],
                    ['3', '149,92', '149,92'],
                    ['4', '149,91', '149,90'],
                    ['5', '149,89', '149,89'],
                    ['6', '149,90', '149,86'],
                    ['7', '150,06', '149,63'],
                    ['8', '150,83', '148,73'],
                    ['9', '152,81', '146,53'],
                    ['10', '156,63', '142,41'],
                    ['11', '162,91', '135,74'],
                    ['12', '172,29', '125,92'],
                    ['13', '185,28', '112,46'],
                    ['14', '202,24', '95,06'],
                    ['15', '223,26', '73,66']
                ]
            }
        }
    ]

};

window.PROCEDIMENTOS_POR_AREA = PROCEDIMENTOS_POR_AREA;
console.log("✅ procedimentosOficina.js carregado — procedimentos do Bender disponíveis.");
