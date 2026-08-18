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
    ],

    // ==========================================================
    // CADEIRA (MCC#2 e 3 — Desempenadeira)
    // ==========================================================
    'cadeira': [
        {
            id: '603109',
            nome: 'Desmontagem de Cadeiras Superiores e Inferiores',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na desmontagem de cadeiras inferiores e superiores das MCC\'s # 2 E 3.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chave unha', 'Maromba 3 kg', 'Chave Allen 8 e 17mm', 'Chave Catraca', 'Chave de Gancho (unha)', 'Chave combinada 17, 19 e 22mm', 'Chave Soquete 55mm', 'Lixadeiras', 'Martelo', 'Alavanca', 'Macete', 'Talhadeira', 'Parafusadeira', 'Espátula'],
            etapas: [
                { id: '1', titulo: '1. Desmontagem das cadeiras inferiores', secao: true },
                { id: '1.1', texto: 'Posicionar cadeira no poço com auxílio da ponte rolante e realizar limpeza', pontosChave: 'Utilizando espátula, pincel e trapo para retirar os excessos de graxa e sujeiras. Caso necessário utilizar solvente para auxiliar limpeza.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor. Utilizar luvas de PVC e jaleco para atividade de limpeza.' },
                { id: '1.2', texto: 'Em caso de cadeiras inferiores acionadas, posicionar a mesma na prensa hidráulica com auxílio da ponte rolante e desmontar acoplamento', pontosChave: 'Caso necessário aquecer o acoplamento para facilitar desmontagem.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos. Risco de queimadura proveniente da execução de atividades com oxi-corte — utilizar os EPI\'s adequados.' },
                { id: '1.3', texto: 'Posicionar cadeira na bancada de desmontagem com auxílio da ponte rolante', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente e utilizar extensor.' },
                { id: '1.4', texto: 'Retirar as proteções dos mancais', pontosChave: 'Utilizar chave combinada 17mm e chave catraca com estampa de 17mm para soltar os parafusos de fixação. Caso necessário utilizar oxi-corte para cortar os parafusos.', seguranca: 'Risco de queimadura proveniente da execução de atividades com oxi-corte — utilizar EPI\'s adequados e biombos para barreira de projeção de fagulhas.' },
                { id: '1.5', texto: 'Retirar as duas tampas externas dos mancais', pontosChave: 'Utilizar chave soquete allen 17mm com a parafusadeira pneumática para soltar os parafusos de fixação da tampa.', seguranca: 'Risco de impacto por escape de peças ou ferramentas — atenção ao manusear as mesmas.' },
                { id: '1.6', texto: 'Retirar os anéis de trava das porcas de fixação do rolamento', pontosChave: 'Utilizar martelo, macete e talhadeira.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.7', texto: 'Soltar as porcas da manga do rolo', pontosChave: 'Utilizar chave de gancho ou unha, martelo e talhadeira para soltar porcas.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.8', texto: 'Reposicionar as duas tampas externas dos mancais', pontosChave: 'Utilizar chave soquete allen 17mm com a parafusadeira pneumática para aperto dos parafusos de fixação da tampa.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.9', texto: 'Retirar do rolo os conjuntos de caixa de mancal (mancal, rolamento, espaçador) e posicionar sobre a bancada com auxílio da PR ou talha', pontosChave: 'Caso necessário utilizar alavanca ou maromba para remover conjunto. Obs.: em caso de quebra de rolamento, deformações na manga do rolo e outras situações que impedem a retirada completa, a atividade deve ser realizada de forma segmentada dos componentes.', seguranca: 'Risco de impacto por escape de peças ou ferramentas. Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.10', texto: 'Desmontar os conjuntos de caixa de mancal, removendo tampas externas, espaçadores, travas, porcas, rolamentos 24032 e tampas internas', pontosChave: 'Utilizar marreta, macete e talhadeira para auxílio na desmontagem.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.11', texto: 'Limpar os sobressalentes: rolo, mancais, tampas externas, espaçadores, travas, porcas, rolamentos e tampas internas', pontosChave: 'Utilizar espátula, pincel e trapo para retirar os excessos de graxa e sujeiras. Caso necessário utilizar o decantador e solvente.', seguranca: 'Utilizar luvas de PVC e jaleco para atividade de limpeza.' },
                { id: '1.12', texto: 'Inspecionar os sobressalentes: rolo, mancais, tampas externas, espaçadores, travas, porcas, rolamentos e tampas internas', pontosChave: 'Repostar as informações do rolo na planilha de desmontagem para atividades de reparo.' },
                { id: '1.13', texto: 'Armazenar e organizar os sobressalentes que serão reutilizados', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.14', texto: 'Reposicionar porcas nas mangas do rolo', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.15', texto: 'Posicionar rolo na área de transição para envio de reparo', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },

                { id: '2', titulo: '2. Desmontagem das cadeiras superiores', secao: true },
                { id: '2.1', texto: 'Posicionar cadeira no poço com auxílio da ponte rolante e realizar limpeza', pontosChave: 'Utilizando espátula, pincel e trapo. Caso necessário utilizar solvente.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos. Utilizar luvas de PVC e jaleco.' },
                { id: '2.2', texto: 'Posicionar cadeira na área de desmontagem com auxílio da ponte rolante', pontosChave: 'Manter os estropos levemente tencionados para auxílio na desmontagem da estrutura superior.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '2.3', texto: 'Retirar os contra pinos e espaçadores', pontosChave: 'Utilizar marreta, macete e talhadeira.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.4', texto: 'Retirar os pinos de união dos mancais com a estrutura superior', pontosChave: 'Utilizar marreta, maromba. Caso necessário utilizar oxi-corte para aquecer os olhais do mancal.', seguranca: 'Risco de impacto por escape de peças. Risco de queimadura — utilizar EPI\'s adequados e biombos.' },
                { id: '2.5', texto: 'Posicionar estrutura superior da cadeira na bancada com auxílio da ponte rolante ou talha', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '2.6', texto: 'Despressurizar e drenar o óleo das tubulações e cilindros para desmontagem', pontosChave: 'Utilizar trapos, baldes ou baias para contenção. Utilizar chave combinada 17, 19 e 22mm.', seguranca: 'Risco de impacto por rompimento dos flexíveis e projeção de óleo — manter postura defensiva e ficar fora do raio de ação.' },
                { id: '2.7', texto: 'Retirar as tubulações de óleo da estrutura superior da cadeira', pontosChave: 'Soltar os "stauffs" de fixação das tubulações.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.8', texto: 'Retirar as porcas dos parafusos e desmontar os mancais de fixação dos cilindros hidráulicos', pontosChave: 'Utilizar parafusadeira com soquete 55mm ou chave de impacto 55mm. Caso necessário utilizar oxi-corte para aquecer e facilitar desmontagem da porca.', seguranca: 'Risco de impacto por escape de peças. Risco de queimadura — utilizar EPI\'s adequados e biombos.' },
                { id: '2.9', texto: 'Retirar os cilindros e posicioná-los para teste e reparo', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '2.10', texto: 'Encaminhar estrutura superior para área de jateamento em pintura', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '2.11', texto: 'Desmontar os conjuntos de caixa de mancal (mancal, rolamento, espaçador) e posicionar sobre a bancada com auxílio da PR ou talha', pontosChave: 'Para realizar as atividades, repetir as operações: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.14 e 1.15.' }
            ],
            tabelaReferencia: {
                titulo: 'Tabela de "Line" aplicados nas cadeiras das MCC#2 e 3',
                colunas: ['Cadeiras', 'Line'],
                linhas: [
                    ['43 @ 47', '10 mm'],
                    ['48 @ 53', '10 mm'],
                    ['54 @ 65', '20 mm'],
                    ['66 @ 79', '30 mm']
                ]
            }
        },
        {
            id: '603111',
            nome: 'Montagem de Cadeiras Inferiores',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem das cadeiras inferiores das MCC\'s # 2 E 3.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Maromba', 'Chave Allen 8 e 17mm', 'Chave Catraca', 'Chave de Gancho (unha)', 'Chave combinada 11, 13, 17, 19 e 22mm', 'Chave Soquete 17, 19 e 55mm', 'Lixadeira', 'Martelo', 'Macete', 'Talhadeira', 'Parafusadeira', 'Micrômetro', 'Paquímetro'],
            etapas: [
                { id: '1.1', texto: 'Posicionar rolo com auxílio da ponte rolante ou talha na bancada de reparo', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente e utilizar extensor.' },
                { id: '1.2', texto: 'Realizar limpeza nas duas mangas do rolo', pontosChave: 'Caso necessário utilizar solvente e trapos.', seguranca: 'Utilizar luvas de PVC e jaleco.' },
                { id: '1.3', texto: 'Aferir as medidas das mangas do rolo', pontosChave: 'Utilizar micrômetro e paquímetro para aferir medidas da manga e garantir montagem. Avaliar furos de refrigeração do rolo.' },
                { id: '1.4', texto: 'Preparar juntas e montar nas tampas externas e internas', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.5', texto: 'Montar os 04 retentores nas tampas externas e internas', pontosChave: 'Utilizar macete para auxiliar na montagem. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.6', texto: 'Montar os 02 anéis o\'rings nas 02 luvas' },
                { id: '1.7', texto: 'Montar as 02 luvas na parte interna das mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.8', texto: 'Montar as 02 tampas na parte interna das mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.9', texto: 'Passar lubrificante ou vaselina nas mangas do rolo para formar uma película', pontosChave: 'Utilizar pincel para espalhar o lubrificante.' },
                { id: '1.10', texto: 'Montar os rolamentos autocompensador', pontosChave: 'Montagem livre (caso necessário utilizar macete de bronze para posicionar o rolamento).', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.11', texto: 'Montar o par de espaçadores (interno/externo) nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático. Nota: para cadeira inferior 48, realizar a montagem com o par de espaçadores (interno/externo) + o rolamento NU 1032 nas duas mangas.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.12', texto: 'Montar outros espaçadores nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.13', texto: 'Montar as arruelas de segurança (aranha) e anéis o\'ring nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.14', texto: 'Apertar as porcas até ajustar os espaçadores e travar com arruela de segurança (aranha)', pontosChave: 'Utilizar chave unha e maromba e talhadeira para travar arruela de segurança. Nota: o Padrão SKF para arruela de segurança é realizar um bom aperto e retornar 18º para o travamento.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.15', texto: 'Posicionar os mancais com talha ou ponte rolante na bancada e preparar para montagem', pontosChave: 'Lixar e realizar limpeza dos mancais (bases de apoio e alojamento de rolamento). Utilizar micrometro interno para aferir medidas do diâmetro de alojamento do rolamento e reportar informações para planilha de acompanhamento. Caso necessário avaliar a substituição das buchas dos mancais.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.16', texto: 'Montar os mancais com talha ou ponte rolante na manga do rolo', pontosChave: 'Montagem livre.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.17', texto: 'Posicionar as tampas internas e externas com parafuso e apertá-los', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 17mm.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.18', texto: 'Montar os "lines" nas laterais dos mancais', pontosChave: 'Atenção para montagem dos "lines" do lado fixo e lado livre.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.19', texto: 'Montar as proteções dos mancais', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 17mm.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.20', texto: 'Montar as juntas rotativas no furo de refrigeração do rolo', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 19mm. Limpar o furo de refrigeração antes da montagem.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.21', texto: 'Realizar lubrificação dos mancais', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.22', texto: 'Montar o acoplamento caso rolo seja acionado', pontosChave: 'Aquecer acoplamento aproximadamente 140ºC para montagem. Ajustar chaveta e alojamento para montagem do acoplamento.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos. Risco de queimadura — utilizar EPI\'s adequados.' },
                { id: '1.23', texto: 'Preparar cadeira para envio' }
            ],
            tabelaReferencia: {
                titulo: 'Tabela de "Line" aplicados nas cadeiras das MCC#2 e 3',
                colunas: ['Cadeiras', 'Line'],
                linhas: [
                    ['43 @ 47', '10 mm'],
                    ['48 @ 53', '10 mm'],
                    ['54 @ 65', '20 mm'],
                    ['66 @ 79', '30 mm']
                ]
            }
        },
        {
            id: '603110',
            nome: 'Montagem de Cadeiras Superiores',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem das cadeiras superiores das MCC\'s # 2 E 3.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Maromba', 'Chave Allen 8 e 17mm', 'Chave Catraca', 'Chave de Gancho (unha)', 'Chave combinada 11, 13, 17, 19 e 22mm', 'Chave Soquete 17, 19 e 55mm', 'Lixadeira', 'Martelo', 'Macete', 'Talhadeira', 'Parafusadeira', 'Micrômetro', 'Paquímetro'],
            etapas: [
                { id: '1.1', texto: 'Posicionar rolo com auxílio da ponte rolante ou talha na bancada de reparo', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.2', texto: 'Realizar limpeza nas duas mangas do rolo', pontosChave: 'Caso necessário utilizar solvente e trapos.', seguranca: 'Utilizar luvas de PVC e jaleco.' },
                { id: '1.3', texto: 'Aferir as medidas das mangas do rolo', pontosChave: 'Utilizar micrômetro e paquímetro. Avaliar os furos de refrigeração do rolo.' },
                { id: '1.4', texto: 'Preparar juntas e montar nas tampas externas e internas', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.5', texto: 'Montar os 04 retentores nas tampas externas e internas', pontosChave: 'Utilizar macete para auxiliar na montagem. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.6', texto: 'Montar os 02 anéis o\'rings nas 02 luvas' },
                { id: '1.7', texto: 'Montar as 02 luvas na parte interna das mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.8', texto: 'Montar as 02 tampas na parte interna das mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.9', texto: 'Passar lubrificante ou vaselina nas mangas do rolo para formar uma película', pontosChave: 'Utilizar pincel para espalhar o lubrificante.' },
                { id: '1.10', texto: 'Montar os rolamentos autocompensador', pontosChave: 'Montagem livre (caso necessário utilizar macete de bronze).', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.11', texto: 'Montar o par de espaçadores (interno/externo) nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.12', texto: 'Montar os rolamentos NU 1032', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.13', texto: 'Montar outros espaçadores nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.14', texto: 'Montar as arruelas de segurança (aranha) e anéis o\'ring nas mangas do rolo', pontosChave: 'Montagem livre. Ver desenho esquemático.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.15', texto: 'Apertar as porcas até ajustar os espaçadores e travar com arruela de segurança (aranha)', pontosChave: 'Utilizar chave unha, maromba e talhadeira. Nota: o Padrão SKF é realizar um bom aperto e retornar 18º para o travamento.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.16', texto: 'Posicionar os mancais com talha ou ponte rolante na bancada e preparar para montagem', pontosChave: 'Lixar e limpar os mancais (bases de apoio e alojamento de rolamento). Utilizar micrometro interno para aferir e reportar na planilha de acompanhamento. Caso necessário avaliar substituição das buchas dos mancais.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.17', texto: 'Montar os mancais com talha ou ponte rolante na manga do rolo', pontosChave: 'Montagem livre.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.18', texto: 'Posicionar as tampas internas e externas com parafuso e apertá-los', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 17mm.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.19', texto: 'Montar os "lines" nas laterais dos mancais', pontosChave: 'Atenção para montagem dos "lines" do lado fixo e lado livre.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.20', texto: 'Montar as proteções dos mancais', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 17mm.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.21', texto: 'Montar as juntas rotativas no furo de refrigeração do rolo', pontosChave: 'Utilizar chave catraca ou pneumática com soquete 19mm. Limpar o furo de refrigeração antes da montagem.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.22', texto: 'Realizar lubrificação dos mancais', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.23', texto: 'Retirar conjunto de rolo montado na bancada com ponte rolante e posicionar sobre calços no piso', pontosChave: 'Utilizar dormentes de madeira como calço.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.24', texto: 'Posicionar estrutura superior com ponte rolante na área de reparo', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.25', texto: 'Inspecionar e reparar as tubulações de água e óleo da estrutura caso necessário', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.26', texto: 'Inspecionar e substituir caso necessário os "stauff" de fixação das tubulações', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.27', texto: 'Montar os cilindros na estrutura da cadeira', pontosChave: 'Preparar os mancais de fixação do munhão dos cilindros. Apertar os parafusos dos mancais para fixação do cilindro na estrutura.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.28', texto: 'Posicionar estrutura de cadeira com talha ou ponte sobre o conjunto de rolo já preparado', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.29', texto: 'Montar os pinos para união dos mancais do conjunto de rolo com os olhais dos cilindros da estrutura', pontosChave: 'Utilizar maromba para posicionar os pinos.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.30', texto: 'Lubrificar olhal dos cilindros' },
                { id: '1.31', texto: 'Montar arruelas e travas nos pinos', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.32', texto: 'Preparar cadeira para envio' }
            ],
            tabelaReferencia: {
                titulo: 'Tabela de "Line" aplicados nas cadeiras das MCC#2 e 3',
                colunas: ['Cadeiras', 'Line'],
                linhas: [
                    ['43 @ 47', '10 mm'],
                    ['48 @ 53', '10 mm'],
                    ['54 @ 65', '20 mm'],
                    ['66 @ 79', '30 mm']
                ]
            }
        },
        {
            id: '606156',
            nome: 'Operação da Talha Central MCC#2 e 3',
            revisao: '00',
            dataRevisao: '14/10/2024',
            frequencia: 'Sempre que houver necessidade de operação com a talha elétrica',
            responsavel: 'Líderes, mecânicos, técnicos de manutenção e/ou pessoas capacitadas para operação do equipamento',
            objetivo: 'Realizar a operação da talha elétrica central da desempenadeira das máquinas de lingotamento contínuo 2 e 3 de maneira segura e correta.',
            seguranca: ['Bota cano curto anti torção (EPI 8001)', 'Capacete de segurança cinza (EPI 1000)', 'Protetor auricular concha ou plug (EPI 3007/3002)', 'Óculos panorâmico único incolor (EPI 2016)', 'Luva seg. em raspa único BR/CZ (EPI 6024)'],
            recomendacoes: [
                'Certificar-se de que todos os alarmes audiovisuais da talha elétrica e da PR#189 estejam funcionando corretamente; se algum estiver inoperante, não realizar operação até que seja normalizado.',
                'O colaborador deverá estar de posse da carteirinha de operação de talha elétrica dentro da validade.',
                'Somente pessoas habilitadas e com carteirinha válida podem operar a talha elétrica.'
            ],
            ferramentas: [],
            etapas: [
                { id: '7.1', texto: 'Após a chegada da equipe de manutenção, o líder que irá utilizar a talha deve ir até a cabine de operação da PR189, testar a comunicação via rádio e coletar a chave de bloqueio da botoeira', pontosChave: 'Manter comunicação direta com o operador da PR#189 durante todo o uso da talha. Testar rádio e manter na frequência exclusiva.', seguranca: 'Risco de impacto da PR#189 com a talha elétrica durante a execução das atividades.' },
                { id: '7.2', texto: 'Realizar checklist da talha elétrica', pontosChave: 'Verificar se todos os itens do formulário estão em perfeito estado. Se identificar não conformidade, não iniciar a atividade até resolver.' },
                { id: '7.3', texto: 'Solicitar ao operador da PR#189 que ligue o disjuntor para habilitar o alarme audiovisual da cabine da PR', pontosChave: 'Certificar-se de que o disjuntor foi ligado corretamente.', seguranca: 'Risco de impacto da PR#189 com a talha elétrica.' },
                { id: '7.4', texto: 'Operador da PR#189 translada até o atuador (instalado na viga de rolamento) para certificar que o alarme está funcionando', pontosChave: 'Durante os testes com a PR#189 a talha elétrica deve permanecer desligada e na garagem (próxima à cadeira 48).', seguranca: 'Risco de colisão PR#189 com a talha de reparo. Manter comunicação entre operador da PR#189 e responsável pela manutenção.' },
                { id: '7.5', texto: 'Após certificar todos os alarmes, liberar a talha para a equipe iniciar as atividades', pontosChave: 'Verificar se as documentações das atividades estão liberadas.', seguranca: 'Cumprir normas e padrões de segurança. Somente pessoas habilitadas e com carteirinha válida podem operar a talha.' },
                { id: '7.6', texto: 'Ao final das atividades, posicionar a talha elétrica na garagem (próxima à cadeira 48)', pontosChave: 'Certificar-se de que o cabo de aço do guincho está todo enrolado.' },
                { id: '7.7', texto: 'Comunicar via rádio ao operador da PR#189 o encerramento das atividades', pontosChave: 'Liberar a PR#189 para operação normal.' },
                { id: '7.8', texto: 'Guardar a botoeira na caixa de bloqueio e fechar o cadeado, ir até a cabine da PR189, recolher o rádio e devolver a chave de bloqueio da talha elétrica', pontosChave: 'Liberar a PR#189 para operação normal. Manter comunicação entre operador da PR#189 e responsável pela manutenção.' }
            ],
            acoesCorretivas: 'Caso algum alarme não esteja funcionando, interromper de imediato a operação com a talha elétrica até que o problema seja resolvido.'
        },
        {
            id: '603923',
            nome: 'Reparo do Conjunto do Rolo Sólido das Mesas de Transferência da MCC#2 e 3',
            revisao: '01',
            dataRevisao: '19/02/2026',
            frequencia: 'Diário',
            responsavel: 'Mecânico líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas no reparo do conjunto do rolo sólido das mesas de transferência das MCC#2 e 3 no interior da OMS.',
            seguranca: ['Luva de mecânico', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança com biqueira de aço'],
            recomendacoes: [
                'Verificar se as ferramentas estão em boas condições de uso.',
                'Não permanecer sob cargas suspensas.',
                'Verificar as condições dos estropos, correntes ou cintas.'
            ],
            ferramentas: ['Lixadeira', 'Chaves combinada', 'Chave soquete', 'Maromba', 'Chave Unha', 'Par de estropo ¼" x 1m ou 1 1/2m', 'Paquímetro', 'Micrômetro', 'Espátula'],
            etapas: [
                { id: '1', titulo: '1. Desmontagem', secao: true },
                { id: '1.1', texto: 'Posicionar rolo sólido sobre o cavalete de reparo (bancada)', pontosChave: 'Utilizar as PR\'s 146 e 221.', seguranca: 'Risco de impacto por queda do rolo — utilizar estropos/cabos/cintas em bom estado.' },
                { id: '1.2', texto: 'Desamassar chapa trava para liberar a cabeça sextavada do parafuso do espelho', pontosChave: 'Utilizar martelo bola e uma talhadeira.', seguranca: 'Risco de impacto do martelo nas mãos.' },
                { id: '1.3', texto: 'Sacar a engrenagem do rolo e retirar a chaveta', pontosChave: 'Utilizar a unidade hidráulica móvel.', seguranca: 'Risco de aprisionamento das mãos. Risco de impacto por escape da chave e dos pinos da prensa.' },
                { id: '1.4', texto: 'Soltar os parafusos dos mancais lado móvel e fixo e os parafusos do espelho', pontosChave: 'Utilizar chave combinada 24mm e 30mm ou soquete 24mm e 30mm / pneumática.', seguranca: 'Risco de impacto por escape da chave. Risco de perda auditiva — usar protetor auricular.' },
                { id: '1.5', texto: 'Aquecer o espaçador para sacar o mesmo (e o acoplamento, se houver)', pontosChave: 'Utilizar maçarico para dar calor. Utilizar a prensa se necessário.', seguranca: 'Risco de impacto por escape do macete, maromba e martelo. Risco de queimadura por oxi-corte — usar EPI\'s adequados (blusão de raspa, avental, capuz de lona, perneira, luva de raspa cano longo, óculos de maçariqueiro).' },
                { id: '1.6', texto: 'Retirar as tampas externas dos mancais', pontosChave: 'Utilizar chave combinada 30 e 24, soquete e pneumática.', seguranca: 'Risco de impacto por queda da tampa. Risco de aprisionamento das mãos. Risco de escape da chave.' },
                { id: '1.7', texto: 'Soltar arruela e porca de segurança', pontosChave: 'Utilizar talhadeira sem fio de corte.', seguranca: 'Risco de impacto por escape do martelo e por queda da porca.' },
                { id: '1.8', texto: 'Sacar os mancais móveis e fixo', pontosChave: 'Utilizar talha e maromba.', seguranca: 'Risco de impacto por queda do mancal.' },
                { id: '1.9', texto: 'Transportar para a bancada de reparo os mancais e tampas', pontosChave: 'Utilizar talha, PR 146 ou PR 221.', seguranca: 'Risco de impacto por rompimento de cabos de aço e estropos. Risco de aprisionamento das mãos.' },
                { id: '1.10', texto: 'Sacar rolamento da manga do rolo e a tampa interna junto com piston ring', pontosChave: 'Utilizar maçarico se necessário.', seguranca: 'Risco de queimaduras — usar EPI\'s adequados (blusão de raspa, avental, capuz de lona, perneira, luva de raspa cano longo, máscara de solda).' },
                { id: '1.11', texto: 'Limpar e inspecionar todas as peças que compõem o conjunto de rolo (inclusive mangas e piston)', pontosChave: 'Utilizar solvente. Utilizar maçarico se necessário.', seguranca: 'Contato com produto químico — usar luva de cano longo em PVC e respirador compatível. Risco de queimadura.' },
                { id: '1.12', texto: 'Medir os mancais, engrenagens e mangas do rolo' },

                { id: '2', titulo: '2. Montagem', secao: true },
                { id: '2.1', texto: 'Montar os pistons o\'ring nas mangas do rolo', pontosChave: 'Montagem livre, ajustar pistons o\'ring, se necessário utilizar esmeril ou maquita.', seguranca: 'Risco de impacto por quebra da peça. Risco de aprisionamento das mãos.' },
                { id: '2.2', texto: 'Montar as tampas sobre os pistons ring', pontosChave: 'Atentar para o lado móvel e fixo.', seguranca: 'Risco de impacto por escape da chave. Risco de queda das tampas.' },
                { id: '2.3', texto: 'Aquecer rolamento no aquecedor indutivo', pontosChave: '80º a 120ºC.', seguranca: 'Risco de queimadura — utilizar luva para alta caloria.' },
                { id: '2.4', texto: 'Montar a arruela e a porca de segurança na manga do rolo lado do mancal fixo', pontosChave: 'Apertar com auxílio de um martelo de bola e uma talhadeira.', seguranca: 'Risco de impacto por escape de chave.' },
                { id: '2.5', texto: 'Montar mancais nas mangas dos rolos', pontosChave: 'Estropar os mancais (móvel e fixo). Utilizar talha ou PR\'s 146 ou 221.', seguranca: 'Risco de impacto por queda da peça — utilizar cabos/estropos e cintas em bom estado.' },
                { id: '2.6', texto: 'Montar o espaçador no mancal fixo' },
                { id: '2.7', texto: 'Colocar os parafusos, arruelas de pressão e porcas nos mancais e apertá-los', seguranca: 'Risco de impacto por escape da chave.' },
                { id: '2.8', texto: 'Montar o piston ring no espaçador', pontosChave: 'Montagem livre.' },
                { id: '2.9', texto: 'Montar o espaçador na manga do rolo', pontosChave: 'Montagem livre. Utilizar o maçarico.', seguranca: 'Risco de queimadura — utilizar luvas para alta temperatura e EPI\'s de solda.' },
                { id: '2.10', texto: 'Aquecer a engrenagem e montar na ponta do rolo', pontosChave: 'Utilizar maçarico por um período de 20 a 30 minutos. Não esquecer de alinhar o rasgo de chaveta da engrenagem com o rasgo de chaveta do rolo. Ao dar calor, nunca direcionar o jato da chama direto nos dentes das engrenagens, e sim no centro.', seguranca: 'Risco de queimadura por oxi-corte — usar EPI\'s adequados (blusão de raspa, avental, capuz de lona, perneira, luva de raspa cano longo, óculos de maçariqueiro).' },
                { id: '2.11', texto: 'Ajustar e montar no rasgo de chaveta do eixo com engrenagem', pontosChave: 'Utilizar maromba se necessário.', seguranca: 'Risco de impacto por escape da maromba.' },
                { id: '2.12', texto: 'Montar a chapa trava, o espelho e os parafusos de fixação do espelho', pontosChave: 'Utilizar martelo e talhadeira.', seguranca: 'Risco de aprisionamento das mãos.' },
                { id: '2.13', texto: 'Dobrar a chapa trava para travar os parafusos (e montar o acoplamento, se o rolo tiver)', pontosChave: 'Utilizar martelo e talhadeira.', seguranca: 'Risco de aprisionamento das mãos.' },
                { id: '2.14', texto: 'Dar acabamento na engrenagem e pintar os mancais de cor cinza', seguranca: 'Contato com produto químico — usar luva de cano longo em PVC e respirador compatível.' },
                { id: '2.15', texto: 'Lubrificar os mancais', pontosChave: 'Não esquecer de travar o mancal móvel com solda. Utilizar máquina de solda para travar os mancais no rolo.', seguranca: 'Risco de queimadura por solda — usar EPI\'s adequados (blusão de raspa, avental, capuz de lona, perneira, luva de raspa cano longo, máscara de solda).' }
            ]
        },
        {
            id: '603112',
            nome: 'Reparo do Eixo do Sistema de Transferência de Placas',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Semanal',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas no reparo do eixo do sistema de transferência de placas das MCC\'s # 2 E 3.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Maromba', 'Chave Allen 8 e 17mm', 'Chave Catraca', 'Chave combinada 11, 13, 17, 19 e 22mm', 'Chave Soquete 17, 19 e 55mm', 'Lixadeira', 'Martelo', 'Macete', 'Talhadeira', 'Parafusadeira', 'Micrômetro', 'Paquímetro'],
            etapas: [
                { id: '1', titulo: '1. Desmontagem', secao: true },
                { id: '1.1', texto: 'Posicionar eixo "Line shaft" no cavalete com auxílio da PR146, 221 ou talha elétrica', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente e utilizar extensor.' },
                { id: '1.2', texto: 'Caso necessário, realizar limpeza do eixo para remover graxa e sujeiras', pontosChave: 'Utilizar espátula e solvente para limpar.', seguranca: 'Contato com produto químico — usar luva de cano longo em PVC e respirador compatível.' },
                { id: '1.3', texto: 'Soltar as aranhas e buchas dos rolamentos e tentar sacar o mesmo', pontosChave: 'Caso seja necessário, cortar os rolamentos com auxílio do maçarico.', seguranca: 'Risco de impacto por escape de peças. Risco de queimadura por oxi-corte — usar EPI\'s adequados.' },
                { id: '1.4', texto: 'Retirar os batentes da engrenagem', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.5', texto: 'Retirar os espaçadores das chavetas', pontosChave: 'Utilizar chave combinada 13mm, talhadeira e martelo bola.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.6', texto: 'Retirar as chavetas cônicas da engrenagem', pontosChave: 'Utilizar talhadeira e maromba. Caso necessário cortar as chavetas com maçarico.', seguranca: 'Risco de impacto por escape de peças. Risco de queimadura por oxi-corte.' },
                { id: '1.7', texto: 'Soltar o espelho do acoplamento', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '1.8', texto: 'Posicionar o eixo com auxílio da PR na prensa hidráulica horizontal e sacar acoplamento, engrenagens e rolamento do eixo', pontosChave: 'Caso haja necessidade, utilizar maçarico para dar calor no acoplamento e engrenagem.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos. Risco de queimadura por oxi-corte.' },
                { id: '1.9', texto: 'Posicionar os itens (acoplamento, engrenagens e eixo) com auxílio de PR na área de desmontagem', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '1.10', texto: 'Realizar limpeza dos itens desmontados (acoplamento, eixo e engrenagens)', pontosChave: 'Utilizar espátula e solvente. Caso necessário utilizar poço de lavagem de peças.', seguranca: 'Contato com produto químico — usar luva de cano longo em PVC e respirador compatível.' },
                { id: '1.11', texto: 'Inspecionar acoplamento e engrenagens', pontosChave: 'Avaliar desgaste e medir encubação, caso necessário descartar. Utilizar micrometro interno para medir o diâmetro do furo do acoplamento e das engrenagens.' },
                { id: '1.12', texto: 'Posicionar o eixo no cavalete de giro e inspecionar com auxílio da PR', pontosChave: 'Utilizar micrometro para medir o diâmetro do eixo no local de montagem dos rolamentos e engrenagens. Utilizar relógio comparador para inspecionar empeno. Caso necessário, descartar o eixo.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },

                { id: '2', titulo: '2. Montagem', secao: true },
                { id: '2.1', texto: 'Verificar os desenhos referente ao conjunto a ser montado', pontosChave: 'Avaliar se as informações estão corretas nos documentos de trabalho, pois o desenho é a referência de montagem.' },
                { id: '2.2', texto: 'Posicionar o eixo com auxílio de PR no cavalete de montagem', seguranca: 'Risco de carga suspensa e aprisionamento das mãos.' },
                { id: '2.3', texto: 'Inspecionar eixo conforme desenho', pontosChave: 'Utilizar micrometro para medir o diâmetro do eixo no local de montagem. Utilizar relógio comparador para inspecionar empeno.' },
                { id: '2.4', texto: 'Ajustar e preparar chavetas, batentes, espaçadores, engrenagens e encubações de rolamentos e engrenagens' },
                { id: '2.5', texto: 'Montar o batente de encosto da engrenagem no eixo', pontosChave: 'Seguir croqui de montagem da engrenagem e batente.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.6', texto: 'Aquecer a engrenagem com auxílio de maçarico e montar até encostar no batente', pontosChave: 'A engrenagem deve ser aquecida até 120ºC e seu manuseio deve ser realizado com luva apropriada. A montagem das engrenagens deve ser realizada do centro para a extremidade.', seguranca: 'Risco de queimadura por oxi-corte — usar EPI\'s adequados.' },
                { id: '2.7', texto: 'Montar chaveta cônica na engrenagem', pontosChave: 'Utilizar maromba para realizar aperto da chaveta.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.8', texto: 'Ajustar e montar o espaçador da chaveta', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.9', texto: 'Montagem da bucha cônica, rolamento, arruela de trava e porca', pontosChave: 'A montagem deve ser realizada de forma livre, pois os apertos devem ser concluídos na área de aplicação.', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.10', texto: 'Acompanhar a sequência de montagem entre engrenagem e rolamento conforme desenho' },
                { id: '2.11', texto: 'Realizar a proteção dos rolamentos', pontosChave: 'A proteção do rolamento é para evitar a contaminação com água e particulados.' },
                { id: '2.12', texto: 'Para eixo com acoplamento rígido: montar acoplamento com ajuste de chaveta e fixar com espelho no eixo', pontosChave: 'O acoplamento deve ser aquecido até 120ºC e seu manuseio deve ser realizado com luva apropriada.', seguranca: 'Risco de impacto por escape de peças. Risco de queimadura por oxi-corte.' },
                { id: '2.13', texto: 'Para eixo com mancal de encosto: montar pista externa do rolamento + espaçador no mancal de encosto, primeira pista interna + espaçador na ponta do eixo, unir as etapas, montar segunda pista interna do rolamento no eixo, montar o espelho na ponta do eixo e montar a tampa do mancal de encosto', seguranca: 'Risco de impacto por escape de peças ou ferramentas.' },
                { id: '2.14', texto: 'Embalar e preparar para envio' }
            ]
        }
    ],

    // ==========================================================
    // HIDRÁULICA
    // ==========================================================
    'hidraulica': [
        {
            id: '606052',
            nome: 'Teste de Spray e Hidrostático das MCC\'s #2 e 3',
            revisao: '04',
            dataRevisao: '14/10/2024',
            frequencia: 'Semanal',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de teste de spray e hidrostático das MCC\'S#2 e 3 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chave inglesa de 8" e 15"', 'Chave de estria de 30 x 32mm', 'Chave de estria de 30mm', 'Chave de extensão com estampa de 15/16"', 'Chave de impacto estriada de 2 ¾"'],
            etapas: [
                { id: '8.1', titulo: '8.1 Teste Hidrostático', secao: true },
                { id: '8.1', texto: 'Posicionar e fixar o molde no Stand principal de alinhamento das MCC\'s 2 e 3, utilizando 6 (seis) parafusos para aperto', pontosChave: 'Utilizar chave de impacto estriada de 2 ¾" ou ferramenta pneumática com soquete 2 ¾" para aperto.', seguranca: 'Risco de carga suspensa e aprisionamento — ficar fora do raio de ação da carga e manter postura defensiva durante o manuseio do molde.' },
                { id: '8.1.1', texto: 'Verificar se os registros das tubulações Ø12mm de dreno e sangria das placas largas estão abertos', pontosChave: 'Caso não esteja, abrir os registros.' },
                { id: '8.1.2', texto: 'Abrir os 4 registros de entrada de água das placas do molde, localizados no stand' },
                { id: '8.1.3', texto: 'Fechar os 4 registros de retorno de água das placas do molde, localizados no stand' },
                { id: '8.1.4', texto: 'Abrir o registro da linha alimentação da rede principal de água para o stand do molde' },
                { id: '8.1.5', texto: 'Realizar sangria, aguardando a saída de ar das tubulações de dreno e fechar os registros', pontosChave: 'Após fechar os registros de sangria, o circuito fica pressurizado com aproximadamente 5kgf/cm² (pressão da rede de alimentação de água).' },
                { id: '8.1.6', texto: 'Fechar o registro de água da rede alimentação principal e ligar a bomba de pressurização de água no stand até atingir o valor de referência de 10kgf/cm²', pontosChave: 'A pressão de teste de 10kgf/cm² deve ser ajustada através da válvula de saída da bomba.' },
                { id: '8.1.7', texto: 'O circuito deve permanecer pressurizado por 20 minutos (teste hidrostático) para realizar a inspeção de vazamentos', pontosChave: 'Caso o circuito não consiga manter a pressão de teste (10kgf/cm²), identificar o local da fuga (vazamentos e passagem). Reportar resultados no checklist dos moldes da MCC\'s #2 e 3.' },
                { id: '8.1.8', texto: 'Inspeção visual de vazamentos na face de trabalho, no topo e base das placas largas e estreitas' },
                { id: '8.1.9', texto: 'Inspeção visual de vazamentos nos flexíveis, conexões, juntas de expansão, tubulações e válvulas' },

                { id: '8.2', titulo: '8.2 Teste dos Bicos de Spray', secao: true },
                { id: '8.2', texto: 'Teste dos bicos de spray', pontosChave: 'O bico padrão aplicado nas faces estreitas e largas do molde é o modelo 1485.' },
                { id: '8.2.1', texto: 'Teste dos bicos das faces estreitas. Abrir o registro de água de spray das faces estreitas e fechar os demais localizados no stand' },
                { id: '8.2.2', texto: 'Inspecionar a formação do leque que sai dos bicos', pontosChave: 'Verificar se os bicos estão totalmente desobstruídos, caso contrário desmontar os bicos, realizar a limpeza e testar novamente. Verificar se o leque está projetando água com passagem livre entre os roletes laterais e a base das placas.' },
                { id: '8.2.3', texto: 'Teste dos bicos das faces largas. Abrir o registro de água de spray das faces largas e fechar os demais localizados no stand' },
                { id: '8.2.4', texto: 'Inspecionar a formação do leque que sai dos bicos (faces largas)', pontosChave: 'Verificar se os bicos estão totalmente desobstruídos, caso contrário desmontar, limpar e testar novamente. Verificar se o leque está projetando água com passagem livre entre os roletes do foot roll e a base das placas.' },
                { id: '8.2.5', texto: 'Reportar resultados', pontosChave: 'Reportar resultados no checklist dos moldes da MCC\'s #2 e 3.' }
            ]
        },
        {
            id: '606056',
            nome: 'Reparo de Cilindros (Fluxo Externo)',
            revisao: '03',
            dataRevisao: '28/10/2024',
            frequencia: 'Diariamente',
            responsavel: 'Planejador, inspetor, líder e mecânico',
            objetivo: 'Estabelecer o fluxo para o reparo externo dos cilindros hidropneumáticos da oficina de moldes e segmentos da GMLC aplicados nas máquinas de corrida contínua #2, 3 e 4, garantindo a continuidade do processo de recuperação dos cilindros nos contratos.',
            seguranca: ['Capacete com jugular', 'Óculos de segurança', 'Luva de vaqueta', 'Botina de segurança com biqueira de aço', 'Protetor auricular'],
            recomendacoes: [
                'Risco de carga suspensa, devido ao grande fluxo de movimentação dos cilindros.',
                'Todo resíduo gerado deve ser armazenado nos locais de segregação, acondicionado corretamente, identificado e descartado em local apropriado, conforme PP 501537 (Gestão de Resíduos Industriais) e PP 503450 (Gestão de Resíduos Sociais).',
                'Qualquer anormalidade encontrada deve ser comunicada ao Supervisor imediato.'
            ],
            ferramentas: [],
            etapas: [
                { id: '8.1', texto: 'Receber o cilindro conforme desenho das máquinas de corrida contínua #2, 3 e 4, e executar as conferências necessárias ao equipamento' },
                { id: '8.2', texto: 'Verificar o peso do cilindro junto ao desenho' },
                { id: '8.3', texto: 'Desmontagem de todos os componentes do conjunto', pontosChave: 'Ter todos os cuidados para não causar dano físico aos componentes.' },
                { id: '8.4', texto: 'Lavagem de todos os componentes do conjunto', pontosChave: 'Eliminando graxas, óleos ou outros contaminantes.' },
                { id: '8.5', texto: 'Peritagem de todos os componentes através de medição e inspeção visual', pontosChave: 'Registrar em planilhas próprias. Emissão de laudos técnicos quando necessário.' },
                { id: '8.6', texto: 'Montagem do conjunto com todos os componentes envolvidos', pontosChave: 'Tomar precauções para não danificá-los, principalmente as guias e vedações.' },
                { id: '8.7', texto: 'Armazenagem dos conjuntos montados', pontosChave: 'Mantê-los identificados conforme requisição de serviço, de forma organizada na área própria para embarque.' },
                { id: '8.8', texto: 'Embarque dos conjuntos montados, identificados', pontosChave: 'Assegurando a conformidade com a Ordem de Embarque e Encomenda de Reparo da GPMA.' }
            ]
        },
        {
            id: '604066',
            nome: 'Teste das Porcas Hidráulicas do Segmento 1@6 da MCC#2e3',
            revisao: '01',
            dataRevisao: '19/02/2026',
            frequencia: 'Diário',
            responsavel: 'Inspetor, líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de teste das porcas hidráulicas dos Segmentos 1@6 da MCC#2e3 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chave Combinada 08 a 36mm e 7/8"', 'Chave de Grife 08, 12, 14 e 48mm', 'Chave Allen 03 a 19mm e polegadas', 'Chave inglesa 10 e 12"', 'Chaves de fenda', 'Micrômetro interno e externo', 'Paquímetro', 'Lixadeira pneumática', 'Parafusadeira ½" e ¾"', 'Mini mestre', 'Martelo, macete e marreta'],
            etapas: [
                { id: '8.1', texto: 'Posicionar porca hidráulica na bancada de teste', pontosChave: 'Nota: as porcas hidráulicas da MCC#2e3 possuem bancada própria de teste.', seguranca: 'Risco de queda da carga durante movimentação — verificar condição de uso do olhal e rosca (isentos de amassamento e espanada). Fixar toda a extensão da rosca do olhal na porca hidráulica.' },
                { id: '8.2', texto: 'Conectar as mangueiras de alimentação para linha de pressão e linha de piloto', pontosChave: 'Utilizar engates rápidos para conexão das mangueiras.', seguranca: 'Risco de projeção de óleo — verificar se as mangueiras estão em boas condições de uso, isentas de vazamento ou deformação.' },
                { id: '8.3a', texto: 'Conectar o manômetro na linha de treno para acompanhamento de teste', pontosChave: 'Utilizar tomador de pressão no manômetro.', seguranca: 'Risco de projeção de óleo — verificar mangueiras.' },
                { id: '8.3b', texto: 'Com a porca fechada, ajustar a abertura do batente no dispositivo de teste', pontosChave: 'Utilizar paquímetro para ajuste de altura: porca grupo #1e2 (altura 115mm) — abertura de 20mm; porca grupo #3 (altura 100mm) — abertura de 10mm.' },
                { id: '8.4', texto: 'Fechar a válvula de alívio da porca hidráulica', pontosChave: 'Utilizar chave allen de 4mm e chave combinada 13mm.' },
                { id: '8.5', texto: 'Ligar sistema hidráulico e iniciar pressurização da porca hidráulica', pontosChave: 'A pressão inicial de teste dos cilindros e porcas é 5Kgf/cm². Os cilindros e porcas devem estar limpos para melhor visualização de vazamentos. A pressão deve ser ampliada de forma escalonada em 50Kgf/cm² até atingir a pressão final de teste conforme Anexo 1.', seguranca: 'Risco de projeção de óleo — ficar fora do raio de ação e manter postura defensiva durante os testes.' },
                { id: '8.6', texto: 'Realizar o teste com a pressão final na porca hidráulica', pontosChave: 'A pressão final de teste deve seguir a tabela do Anexo 1 e permanecer por 5 minutos. Critério de aceitação: +/- 5Kgf/cm² em relação à pressão final do anexo.', seguranca: 'Risco de projeção de óleo — isolar a área, manter mangueiras desenroladas, ficar fora do raio de ação e manter postura defensiva.' },
                { id: '8.7', texto: 'Verificar ocorrência de passagem interna e vazamentos (conexões, êmbolo, válvula alívio, válvula de retenção e plugs) nos testes', pontosChave: 'Caso ocorra anomalia, preencher o relatório de não conformidade de cilindros e comunicar a área técnica e supervisão para providenciar devolução do equipamento.' },
                { id: '8.8', texto: 'Despressurizar porca hidráulica', pontosChave: 'Pilotar a porca utilizando a botoeira do sistema hidráulico, invertendo a pressão da linha de alimentação com a linha piloto.' },
                { id: '8.9', texto: 'Pressurizar novamente o sistema hidráulico até 370Kgf/cm²', pontosChave: 'Utilizando a botoeira, invertendo a pressão da linha de piloto com a linha de alimentação.', seguranca: 'Risco de projeção de óleo — isolar a área, mangueiras desenroladas, ficar fora do raio de ação e postura defensiva.' },
                { id: '8.10', texto: 'Ajustar a válvula de alívio para 350Kgf/cm², monitorando a queda de pressão no manômetro', pontosChave: 'Utilizar chave allen 4mm e chave combinada 13mm até a pressão estabilizar com tolerância de +/- 5Kgf/cm².' },
                { id: '8.11', texto: 'Despressurizar porca hidráulica', pontosChave: 'Pilotar invertendo a pressão da linha de alimentação com a linha piloto.' },
                { id: '8.12', texto: 'Pressurizar novamente o conjunto, para teste da regulagem realizada com 350Kgf/cm² da válvula de alívio', pontosChave: 'Observar que a pressão não pode ultrapassar 355Kgf/cm² para alívio da porca. Travar a regulagem da válvula sem alterar o ajuste.', seguranca: 'Risco de projeção de óleo — isolar área, mangueiras desenroladas, postura defensiva.' },
                { id: '8.13', texto: 'Despressurizar porca hidráulica', pontosChave: 'Pilotar invertendo a pressão da linha de alimentação.' },
                { id: '8.14', texto: 'Pressurizar novamente o conjunto na linha de pressão até atingir 320kgf/cm² no manômetro da porca hidráulica para teste de estanquidade', pontosChave: 'Manter a porca pressurizada por 15 minutos. Durante esse tempo a pressão mínima é de 300kgf/cm².', seguranca: 'Risco de projeção de óleo — isolar área, mangueiras desenroladas, postura defensiva.' },
                { id: '8.15', texto: 'Despressurizar porca hidráulica', pontosChave: 'Pilotar invertendo a pressão da linha de alimentação.', seguranca: 'Risco de projeção de óleo — isolar área, mangueiras desenroladas, postura defensiva.' },
                { id: '8.16', texto: 'Desligar unidade hidráulica' },
                { id: '8.17', texto: 'Desconectar o manômetro de teste', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.18', texto: 'Fechar a porca hidráulica de forma manual através do dispositivo de ajuste', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.19', texto: 'Desconectar engates e mangueiras hidráulicas de pressão de linha e piloto', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.20', texto: 'Plugar as entradas e saída da porca hidráulica' }
            ],
            tabelaReferencia: {
                titulo: 'Anexo 1 — Tabela de teste de pressão dos cilindros e porcas hidráulicas',
                colunas: ['Teste', 'Pressão Inicial (Kgf/cm²)', 'Pressão de trabalho (Kgf/cm²)', 'Pressão Final (Kgf/cm²)'],
                linhas: [
                    ['Cilindro de cadeira', '0', '210', '315'],
                    ['Cilindro de Grupo 1, 2 & 3', '0', '210', '315'],
                    ['Cilindro puxador da MCC#4', '0', '160', '250'],
                    ['Cilindro de elevação da estrutura da MCC#4', '0', '160', '250'],
                    ['Porca hidráulica MCC#4', '0', '160', '250'],
                    ['Porca de hidráulica da MCC#1, 2 & 3', '0', '300', '450']
                ]
            }
        },
        {
            id: '605563',
            nome: 'Montar Cilindros de Ajuste de Largura',
            revisao: '01',
            dataRevisao: '09/09/2025',
            frequencia: 'Rotineira (atividades da OMS)',
            responsavel: 'Técnico de Manutenção, Inspetor, Líder de Manutenção (modalidade Elétrica) e Eletricista',
            objetivo: 'Estabelecer os conceitos, critérios e a sistemática na montagem dos cilindros de ajuste de largura, visando assegurar uma boa performance operacional destes equipamentos nas MCC\'s# 2, 3.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite (EPI-8048)', 'Capacete de segurança cinza aba frontal classe B (EPI-1000/1015)', 'Protetor auricular concha ou plug (EPI-3007/3002)', 'Óculos de segurança panorâmico (EPI-2013/2016)', 'Óculos de segurança com grau (EPI-2025)', 'Blusão de proteção contra arco elétrico classe de risco 2 (EPI-5034)', 'Calça de proteção contra arco elétrico classe de risco 2 (EPI-7030)', 'Luva contra agente (8326283)', 'Luva de vaqueta (8016934)'],
            recomendacoes: [
                'A atividade de extrair e inserir disjuntores só pode ser executada por profissionais treinados neste procedimento e com NR-10 SEP.',
                'Proibido iniciar qualquer atividade sem a Reunião Relâmpago (proc. 600714) e sem abrir a APSE identificando os riscos.',
                'É proibido o uso de adornos pessoais (anel, pulseira, relógio, colar); crachás com partes metálicas devem ser guardados.',
                'Para serviços acima de 2,0m de altura: capacitação NR-35, cinto de segurança e medidas do procedimento 503578.',
                'Ferramentas, EPI\'s e equipamentos de medição devem ser inspecionados antes do uso — ferramentas isoladas tipo VDE (NR-10).',
                'Proibido portar celular durante a atividade (proc. 600769).',
                'Cumprir as diretrizes de segurança e Regras de Aço nº1 a nº6 da GGMA.'
            ],
            ferramentas: ['Chave combinada 19, 22 e 46mm', 'Chave Allen 4, 5, 6 e 10mm', 'Chave de fenda', 'Alicate Universal, alicate de corte e alicate de bico', 'Multi-teste e fita isolante'],
            etapas: [
                { id: '1', texto: 'Abrir APSE identificando todos os riscos da atividade', pontosChave: 'Se a atividade não for segura de executar, pare e a torne segura.', seguranca: 'Certificar-se de que todos os colaboradores envolvidos estão treinados e assinarão a APSE. Garantir que o responsável ou supervisão está ciente e assinou. Se a atividade for "crítica" ou com circuito energizado, garantir avaliação pelo profissional de maior nível hierárquico presente.' },
                { id: '2', texto: 'Preparação para execução da atividade', pontosChave: 'Verificar se o trabalhador possui capacitação e autorização conforme NR-10. Inspecionar o local e identificar riscos adicionais.', seguranca: 'É proibida a execução do serviço por pessoas não capacitadas segundo a NR-10.' },
                { id: '3', texto: 'Preencher documentação', pontosChave: 'Verificar se a atividade tem procedimento e ordem de manutenção com passo a passo x riscos x medidas de controle. Verificar necessidade de abertura de PTR/PSQ. Preencher checklist de ferramentas e cinto de segurança.', seguranca: 'Na ausência de procedimento, a ordem de serviço + PTR + APSE pode ser utilizada.' },
                { id: '4', texto: 'Montar caixa de proteção', pontosChave: 'Colocar vedação ao redor da caixa e passar silicone para fixação da vedação.', seguranca: 'Prensamento — não expor partes do corpo em local de prensamento. Corte — atenção a partes cortantes na estrutura e nos cabos. Queda de nível diferente — posicionar guarda-corpo no stand de manutenção do molde.' },
                { id: '5', texto: 'Montar caixa no local', pontosChave: 'Montar parafusos e fixar a caixa no cilindro.', seguranca: 'Mesmos riscos: prensamento, corte e queda de nível diferente.' },
                { id: '6', texto: 'Colocar junta de vedação', pontosChave: 'Ao colocar a vedação, posicionar os parafusos como guia e passar silicone para fixação.', seguranca: 'Prensamento, corte e queda de nível diferente.' },
                { id: '7', texto: 'Montar transdutores de pressão', pontosChave: 'Remover a proteção do tomador de pressão, posicionar o transdutor fazendo o aperto no sentido horário. Montar transdutores na linha "A" e na linha "B".', seguranca: 'Prensamento, corte e queda de nível diferente.' },
                { id: '8', texto: 'Montar transdutores de posição', pontosChave: 'Remover o tampão do cilindro e introduzir o transdutor de posição girando em sentido horário para fixação. Atentar ao o\'ring de vedação. Torquear com 40Nm.', seguranca: 'Prensamento, corte, queda de nível diferente. Contaminação — usar luvas apropriadas ao manusear óleo/graxa, evitar contato com rosto e olhos.' },
                { id: '9', texto: 'Montar os cabos', pontosChave: 'Na montagem dos conectores, atenção às posições de encaixe, fazendo o aperto no sentido horário. Efetuar limpeza das conexões com limpa-contato.', seguranca: 'Queda de nível diferente e corte.' },
                { id: '10', texto: 'Teste do sistema', pontosChave: 'Ligar cabos de alimentação no molde e reconhecer as falhas no wamboy ao ligar o painel.', seguranca: 'Queda de nível diferente — posicionar guarda-corpo no stand.' },
                { id: '11', texto: 'Ligar painel', pontosChave: 'Após painel ligado, checar o reconhecimento dos cilindros.', seguranca: 'Queda de nível diferente — posicionar guarda-corpo no stand.' }
            ],
            anomalias: [
                { anomalia: 'Cilindros não movimentam.', acao: 'Verificar e refazer conexões dos cabos.' },
                { anomalia: 'Molde não apresenta indicação de pressão.', acao: 'Verificar montagem dos transdutores de pressão.' },
                { anomalia: 'Cilindros não reconhecem.', acao: 'Verificar a montagem dos cabos e conexões.' }
            ]
        },
        {
            id: '605564',
            nome: 'Desmontar Cilindros de Ajuste de Largura',
            revisao: '01',
            dataRevisao: '09/09/2025',
            frequencia: 'Rotineira (atividades da OMS)',
            responsavel: 'Técnico de Manutenção, Inspetor, Líder de Manutenção (modalidade Elétrica) e Eletricista',
            objetivo: 'Estabelecer os conceitos, critérios e a sistemática na desmontagem dos cilindros de ajuste de largura, visando assegurar uma boa performance operacional destes equipamentos nas MCC\'s# 2, 3.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite (EPI-8048)', 'Capacete de segurança cinza aba frontal classe B (EPI-1000/1015)', 'Protetor auricular concha ou plug (EPI-3007/3002)', 'Óculos de segurança panorâmico (EPI-2013/2016)', 'Óculos de segurança com grau (EPI-2025)', 'Blusão de proteção contra arco elétrico classe de risco 2 (EPI-5034)', 'Calça de proteção contra arco elétrico classe de risco 2 (EPI-7030)', 'Luva contra agente (8326283)', 'Luva de vaqueta (8016934)'],
            recomendacoes: [
                'A atividade de extrair e inserir disjuntores só pode ser executada por profissionais treinados neste procedimento e com NR-10 SEP.',
                'Proibido iniciar qualquer atividade sem a Reunião Relâmpago (proc. 600714) e sem abrir a APSE identificando os riscos.',
                'É proibido o uso de adornos pessoais; crachás com partes metálicas devem ser guardados.',
                'Para serviços acima de 2,0m de altura: capacitação NR-35, cinto de segurança e medidas do procedimento 503578.',
                'Ferramentas, EPI\'s e equipamentos de medição devem ser inspecionados antes do uso — ferramentas isoladas tipo VDE (NR-10).',
                'Proibido portar celular durante a atividade (proc. 600769).'
            ],
            ferramentas: ['Chave combinada 19, 22 e 46mm', 'Chave Allen 4, 5, 6 e 10mm', 'Chave de fenda', 'Alicate Universal', 'Alicate de corte', 'Multi-teste', 'Fita isolante'],
            etapas: [
                { id: '1', texto: 'Abrir APSE identificando todos os riscos da atividade', pontosChave: 'Se a atividade não for segura de executar, pare e a torne segura.', seguranca: 'Certificar-se de que todos os colaboradores estão treinados e assinarão a APSE. Se atividade "crítica" ou energizada, garantir avaliação pelo profissional de maior nível hierárquico.' },
                { id: '2', texto: 'Preparação para execução da atividade', pontosChave: 'Verificar capacitação/autorização conforme NR10. Inspecionar o local e identificar riscos adicionais.', seguranca: 'É proibida a execução do serviço por pessoas não capacitadas segundo a NR-10.' },
                { id: '3', texto: 'Preencher documentação', pontosChave: 'Verificar procedimento, ordem de manutenção (passo a passo x riscos x medidas de controle), necessidade de PTR/PSQ. Preencher checklist de ferramentas e cinto de segurança.', seguranca: 'Na ausência de procedimento, ordem de serviço + PTR + APSE pode ser utilizada.' },
                { id: '4', texto: 'Remoção das tampas', pontosChave: 'Retirar tampas de proteção das válvulas utilizando chaves allen 4 e 6.', seguranca: 'Queda de nível diferente — guarda-corpo no stand. Corte e perfuração — atenção a partes cortantes. Prensamento — não expor partes do corpo.' },
                { id: '5', texto: 'Remoção dos cabos', pontosChave: 'Retirar os conectores girando sentido anti-horário, desconectando os cabos de comunicação. Depois de retirados, isolar os cabos.', seguranca: 'Queda de nível diferente, corte e perfuração, prensamento.' },
                { id: '6', texto: 'Remoção dos transdutores de pressão', pontosChave: 'Utilizar chaves combinadas 19 e 22mm. Após a retirada, colocar os transdutores em local adequado.', seguranca: 'Queda de nível diferente, corte e perfuração, prensamento.' },
                { id: '7', texto: 'Remoção dos transdutores de posição instalados na estrutura', pontosChave: 'Retirar toda a pressão do sistema, utilizar chave para retirar o sensor de posição de 46mm ou chave combinada 46mm. Depois de retirado, colocar em local adequado e tamponar o local onde foi retirado o transdutor.', seguranca: 'Queda de nível diferente, corte e perfuração, prensamento.' }
            ],
            anomalias: [
                { anomalia: 'Cabos danificados ou com emendas.', acao: 'Efetuar a substituição dos cabos danificados.' },
                { anomalia: 'Transdutor de posição queimado ou com marcas de excesso de calor.', acao: 'Descartar transdutor de posição.' },
                { anomalia: 'Tampas de proteção danificadas ou com a proteção contra calor danificada.', acao: 'Descartar tampas e substituir por novas.' },
                { anomalia: 'Conectores danificados.', acao: 'Substituir cabos.' }
            ]
        },
        {
            id: '605965',
            nome: 'Teste de Cilindros e Porcas Hidráulicas',
            revisao: '01',
            dataRevisao: '19/02/2026',
            frequencia: 'Diário',
            responsavel: 'Inspetor, líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de teste de cilindros e porcas hidráulicas na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chave Combinada 08 a 36mm e 7/8"', 'Chave de Grife 08, 12, 14 e 48mm', 'Chave Allen 03 a 19mm e polegadas', 'Chave inglesa 10 e 12"', 'Chaves de fenda', 'Micrômetro interno e externo', 'Paquímetro', 'Lixadeira pneumática', 'Parafusadeira ½" e ¾"', 'Mini mestre', 'Martelo, macete e marreta', 'Pneumática ½", ¾" e 1"'],
            etapas: [
                { id: '8.1', texto: 'Posicionar cilindro/porca hidráulica na bancada de teste', pontosChave: 'Nota: as porcas hidráulicas da MCC#2e3 possuem bancada própria de teste e procedimento específico.', seguranca: 'Risco de queda da carga durante movimentação — verificar condição de uso do olhal e rosca. Fixar toda a extensão da rosca do olhal na porca hidráulica.' },
                { id: '8.2', texto: 'Conectar as mangueiras de alimentação para linha de pressão e linha de retorno', pontosChave: 'Utilizar engates rápidos para conexão das mangueiras.', seguranca: 'Risco de projeção de óleo — verificar se as mangueiras estão em boas condições de uso.' },
                { id: '8.3', texto: 'Ligar sistema hidráulico e pressurizar', pontosChave: 'A pressão inicial de teste dos cilindros hidráulicos e porcas é 5Kgf/cm². Os cilindros e porcas devem estar limpos para melhor visualização de vazamentos. A pressão deve ser ampliada de forma escalonada em 50Kgf/cm² até atingir a pressão final de teste conforme Anexo 1.', seguranca: 'Risco de projeção de óleo — ficar fora do raio de ação e manter postura defensiva.' },
                { id: '8.4', texto: 'Realizar o teste de pressão nos cilindros/porca hidráulica', pontosChave: 'A pressão final de teste deve seguir a tabela do Anexo 1. Critério de aceitação: +/- 5Kgf/cm². Realizar a movimentação da haste do cilindro entre o cabeçote inferior e superior com o tempo de 20 minutos.', seguranca: 'Risco de projeção de óleo — ficar fora do raio de ação e manter postura defensiva.' },
                { id: '8.5', texto: 'Verificar ocorrência de passagem interna e vazamentos (conexões, tampas de cabeçote, êmbolo, válvula alívio, válvula de retenção e plugs) nos testes', pontosChave: 'Caso ocorra anomalia, preencher o relatório de não conformidade de cilindros e comunicar a área técnica e supervisão para providenciar devolução do equipamento.' },
                { id: '8.6', texto: 'Despressurizar e desligar a unidade hidráulica', pontosChave: 'Deixar o cilindro na posição com a haste avançada.', seguranca: 'Risco de projeção de óleo — ficar fora do raio de ação e manter postura defensiva.' },
                { id: '8.7', texto: 'Desconectar mangueira hidráulica do cabeçote superior e conectar a mangueira de ar comprimido', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.8', texto: 'Acionar cilindro/porca hidráulica com a pressão do ar comprimido e movimentar o mesmo para drenar óleo', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.9', texto: 'Desconectar a mangueira hidráulica e ar comprimido', pontosChave: 'A unidade hidráulica deve permanecer desligada.' },
                { id: '8.10', texto: 'Plugar as entradas e saída do cilindro/porca hidráulica' }
            ],
            tabelaReferencia: {
                titulo: 'Anexo 1 — Tabela de teste de pressão dos cilindros e porcas hidráulicas',
                colunas: ['Teste', 'Pressão Inicial (Kgf/cm²)', 'Pressão de trabalho (Kgf/cm²)', 'Pressão Final (Kgf/cm²)'],
                linhas: [
                    ['Cilindro de cadeira', '0', '210', '315'],
                    ['Cilindro de Grupo 1, 2 & 3', '0', '210', '315'],
                    ['Cilindro puxador da MCC#4', '0', '160', '250'],
                    ['Cilindro de elevação da estrutura da MCC#4', '0', '160', '250'],
                    ['Porca hidráulica MCC#4', '0', '160', '250'],
                    ['Porca de hidráulica da MCC#1, 2 & 3', '0', '300', '450']
                ]
            }
        }
    ],

    // ==========================================================
    // CALDEIRARIA
    // ==========================================================
    'caldeiraria': [
        {
            id: '603969',
            nome: 'Procedimento de Oxi-Corte na Oficina da OMS',
            revisao: '01',
            dataRevisao: '19/02/2026',
            frequencia: 'Diário',
            responsavel: 'Mecânico, líder de manutenção e técnicos',
            objetivo: 'Estabelecer diretrizes para as atividades de oxi-corte na oficina de reparo de moldes e segmento OMS.',
            seguranca: [
                'Capacete com jugular', 'Bota de segurança', 'Protetor auricular', 'Luva de raspa (cano longo)',
                'Óculos escuro com lente adequada para atividade ou máscara e solda', 'Capuz', 'Avental de raspa',
                'Blusão ou paletó de raspa', 'Perneira de raspa', 'Máscara pff2'
            ],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.',
                'Remover ou proteger todos os materiais de fácil combustão que estejam dentro do raio de ação das chamas ou centelhas ao operar o maçarico.'
            ],
            ferramentas: [
                'Maçarico de corte 90 ou 180 graus', 'Chuveirão aquecimento', 'Bicos de corte', 'Isqueiro de fricção',
                'Agulheiro', 'Mangueiras para acetileno/gás natural e oxigênio', 'Braçadeiras', 'Chave inglesa 08, 12mm', 'Chave de fenda'
            ],
            // ⚠️ Anexo 2 do documento original — lista do que NUNCA fazer
            // ao operar o maçarico. Mostrado em destaque no topo do
            // procedimento, antes das etapas, por ser crítico de segurança.
            atencao: [
                'Limpar o bico do maçarico na luva como se tivesse esfregando — se houver não conformidade na luva (um furo, por exemplo), o gás pode entrar e se alojar dentro, causando uma atmosfera inflamável.',
                'Limpar o bico com os gases abertos — caso tenha alguma fagulha, pode fechar o triângulo do fogo e gerar a "explosão".',
                'Limpar o bico com o maçarico pressurizado e/ou jateando — mesmo risco de explosão.',
                'Limpar o bico do maçarico sem luvas — o gás pode ir para dentro da blusa, podendo gerar atmosfera explosiva.',
                'Acender o maçarico sem as luvas — proteção do colaborador em caso de "explosão".',
                'Acender o maçarico na caloria da peça — não é possível definir a criticidade da atmosfera quanto aos gases.',
                'Nunca acender o maçarico somente com o gás combustível (na maioria das vezes Acetileno) — aumenta a sujeira do bico de corte.'
            ],
            etapas: [
                { id: '8.1', texto: 'Preencher o checklist CSN-2207 (exemplo anexo 1) para atividade de oxi-corte', pontosChave: 'Analisar com cautela todos os itens de acordo com o descrito no checklist. Caso haja não conformidade com equipamento, favor acionar liderança/supervisão.', seguranca: 'Somente iniciar a atividade após cumprir todas as obrigações do checklist.' },
                { id: '8.2', texto: 'Preencher permissão de serviço a quente (PSQ)', pontosChave: 'Para atividades na oficina de moldes e segmento, a permissão de serviço a quente é permanente.', seguranca: 'Somente iniciar a atividade após a liberação da PSQ.' },
                { id: '8.3', texto: 'Verificar se não há vazamentos nas conexões (válvulas, manômetros, mangueiras)', pontosChave: 'Utilizar bucha ou pincel encharcado com sabão nos locais para inspeção de formação de bolhas.', seguranca: 'Somente utilizar o maçarico em caso que não haja vazamento.' },
                { id: '8.4', texto: 'Trocar caneta de aquecimento (chuveirão e maçaricos de 90° e 180°)', pontosChave: 'Caso necessário trocar a caneta: despressurize a linha, solte as abraçadeiras com uso de chave de fenda e desconecte o espigão das mangueiras retirando a caneta danificada. Realize o acoplamento das mangueiras no espigão da nova caneta e fixe a abraçadeira com chave de fenda.', seguranca: 'Risco de queimadura — despressurizar as linhas de gás e oxigênio antes de realizar qualquer intervenção no maçarico/chuveiro.' },
                { id: '8.5', texto: 'Troca ou instalação do bico de aquecimento', pontosChave: 'Caso necessário trocar o bico: despressurize a linha, utilize chave de boca ou inglesa para soltar e apertar a porca de fixação do bico — o bico aplicado será de acordo com a espessura do material a ser cortado. Atentar-se ao gás usado: acetileno (cilindro) usa bico série nº 1502; gás GN (da rede) usa série nº 1503.', seguranca: 'Risco de queimadura — despressurizar as linhas de gás e oxigênio antes de realizar qualquer intervenção no maçarico/chuveiro.' },
                { id: '8.6', texto: 'Verificar se o vigia está com os EPIs apropriados para acompanhamento da atividade', pontosChave: 'Todo auxiliando e/ou acompanhando, com exposição similar à do soldador/maçariqueiro, obrigatoriamente deverá usar óculos de segurança com lentes especiais e máscara pff2.', seguranca: 'Permanecer atento à atividade e ao ambiente, e ficar fora do raio de ação das fagulhas do corte.' },
                { id: '8.7', texto: 'Preparar a área ou superfície a ser cortada ou aquecida', pontosChave: 'Verificar se estão limpas e isentas de graxa/óleo antes de iniciar a atividade.', seguranca: 'Somente iniciar a atividade quando não houver graxa — risco de incêndio e queimadura.' },
                { id: '8.8', texto: 'Executar corte', pontosChave: 'Iniciar com aquecimento da região a ser cortada por uma borda ou fazer um furo na chapa/peça. Quando o material em volta desse ponto inicial estiver na temperatura adequada (avermelhado), abrir o oxigênio de corte (O2) e iniciar o processo deslocando o maçarico. Veja o Anexo 2 acima para o que NÃO fazer.', seguranca: 'Risco de queimadura — despressurizar as linhas de gás e oxigênio antes de qualquer intervenção. Garantir que não haja ninguém no raio de ação do corte. A atividade só pode ser iniciada com a presença do vigia.' },
                { id: '8.9', texto: 'Após a atividade, recolher e limpar mangueiras e realizar 5S na área', seguranca: 'Garantir que todo o sistema foi despressurizado antes de iniciar a atividade de limpeza e armazenamento.' }
            ]
        }
    ],

    // ==========================================================
    // FERRAMENTARIA
    // ==========================================================
    'ferramentaria': [
        {
            id: '606067',
            nome: 'Inspeção de Ferramentas Manuais de Impacto',
            revisao: '03',
            dataRevisao: '23/05/2025',
            frequencia: 'Diária',
            responsavel: 'Colaborador da ferramentaria (inspeciona no ato de entrega e recebimento)',
            objetivo: 'Estabelecer diretrizes para inspeção de ferramentas manuais de impacto.',
            seguranca: ['Óculos de Segurança', 'Capacete', 'Protetor auricular', 'Bota de segurança', 'Luvas de Proteção (Vaqueta)'],
            recomendacoes: [
                'Cuidado no manuseio das ferramentas avariadas, devido ao risco de corte causados por rebarbas, cabos rachados e lascados.'
            ],
            ferramentas: ['Marretas', 'Chaves de impacto', 'Marombas', 'Talhadeiras', 'Martelos em geral', 'Alavancas', 'E outras ferramentas de impacto'],
            etapas: [
                { id: '8.1a', texto: 'Inspecionar as ferramentas', pontosChave: 'Avaliar se a quantidade é suficiente para atender as necessidades das atividades da oficina.' },
                { id: '8.1b', texto: 'Substituir as ferramentas com anomalias', pontosChave: 'Deformações, rebarbas, trincas, desgaste, encunhamento duplo no cabo de madeira, cabos rachados e/ou lascados, ausência de dispositivo de segurança. Solicitar junto à supervisão a reposição das mesmas.' },
                { id: '8.1c', texto: 'Inutilizar ferramentas com anomalias' },
                { id: '8.1d', texto: 'Manter as ferramentas em locais e recipientes apropriados após a utilização' },
                { id: '8.1e', texto: 'Manter a área de trabalho sempre limpa e organizada' },
                { id: '8.1f', texto: 'Manter as características originais das ferramentas', pontosChave: 'Orientar colaboradores sobre a importância da conservação.' },
                { id: '8.1g', texto: 'Inserir as ferramentas produzidas na CSN no manual de ferramentas da gerência', pontosChave: 'Com as características específicas: tipo de material utilizado, dimensões, finalidade, entre outras.' }
            ]
        }
    ],

    // ==========================================================
    // JATO
    // ==========================================================
    'jato': [
        {
            id: '605130',
            nome: 'Procedimento de Jateamento e Pintura',
            revisao: '00',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção, pintor e mecânico',
            objetivo: 'Estabelecer diretrizes para as atividades de jateamento e pintura na OMS.',
            seguranca: [
                'Luva de vaqueta', 'Blusão de raspa para jatista', 'Perneira de raspa', 'Capuz',
                'Máscara semifacial para vapores orgânicos (atividade de pintura)', 'Capacete para jatista',
                'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'
            ],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Pá', 'Espátula', 'Martelo', 'Marreta', 'Peneira', 'Cabo de aço'],
            etapas: [
                { id: '8.1', texto: 'Posicionar a peça na cabine de jateamento corretamente', pontosChave: 'Para o posicionamento da peça deverá ter uma pessoa para sinalizar para o operador da PR no lado externo da cabine — a comunicação também pode ser por via rádio.', seguranca: 'Risco de queda de peça, impacto por/contra e aprisionamento. Ao utilizar estropos e/ou cintas, verificar se estão em perfeitas condições de uso e sem fios arrebentados, alma exposta, amassados ou efeito mola — se detectada irregularidade, não utilizar e comunicar ao líder imediato para troca e descarte. Para movimentação de peças, usar dispositivo tipo gancho prolongado ou corda para direcionar cargas suspensas — não é permitido usar as mãos.' },
                { id: '8.1.1', texto: 'Preparar a atividade de jateamento: inspecionar o compressor, retirar a tampa da cabine, posicionar a peça no interior da cabine, colocar a tampa da cabine, verificar a iluminação na cabine', pontosChave: 'Inspecionar diariamente o nível do óleo do compressor — se a faixa estiver desagregada, completar até o nível agregado. Utilizar cavalete para posicionar as peças na cabine (não realizar jateamento em peças em balanço ou mal posicionadas).', seguranca: 'Risco de queda de peça, impacto por/contra e aprisionamento. As mangueiras de ar comprimido devem ser compatíveis ao esforço da pressão da atividade, sem rachaduras, com corrente presa por abraçadeiras interligadas. A tampa da cabine deve ser posicionada pela PR e verificada se está bem fixada antes de iniciar. A iluminação interna deve atender bem o serviço e os refletores devem estar protegidos.' },
                { id: '8.1.2', texto: 'Inspeção do Manifold de ar da cabine', pontosChave: 'O ar enviado para a cabine deve ser filtrado antes de chegar ao jatista — o filtro deve conter desumidificador, filtro mecânico de carvão ativo, vapores orgânicos e umidificadores. Os pulmões de ar devem ter relógio de leitura de pressão e ser inspecionados visualmente antes de usar, e periodicamente por formulário próprio.', seguranca: 'Risco de intoxicação/asfixia. As conexões e tubulações da rede de ar comprimido devem estar identificadas, pra evitar conexão errada em outras linhas de gases. Não deve existir água condensada na rede de ar comprimido.' },
                { id: '8.1.3', texto: 'Início da atividade de jateamento', pontosChave: 'O vigia deve ficar atento às atividades de jateamento através do visor de acrílico. Avaliar a condição do bico de saída dos abrasivos.', seguranca: 'Risco de impacto por/contra, queda em mesmo nível e projeção de abrasivos. É proibido abrir a porta da cabine do jato enquanto estiver jateando. É proibido trabalhar sozinho na área do jato — o jatista deve ser observado constantemente pelo operador através do visor da cabine. Manter postura segura e muita atenção ao se locomover no interior da cabine.' },
                { id: '8.3', texto: 'Término da atividade de jateamento', pontosChave: 'Fechar a válvula de saída de granalha. Desligar o compressor. Abrir a cabine e aguardar a saída do jatista.', seguranca: 'Risco de impacto por/contra e projeção de abrasivos. O vigia deve estar atento ao sinal do jatista para fechar a válvula de saída de granalha ao concluir a atividade.' },
                { id: '8.4', texto: 'Posicionar a peça na área de pintura', pontosChave: 'Deverá ter uma pessoa para sinalizar para o operador da PR. Utilizar cavalete para posicionamento — não realizar atividade com peça em balanço ou mal posicionada.', seguranca: 'Risco de queda de peça, impacto por/contra e aprisionamento. Mesma verificação de estropos/cintas e uso de dispositivo tipo gancho prolongado ou corda (nunca as mãos) descrita na etapa 8.1.' },
                { id: '8.4.1', texto: 'Preparar a peça e realizar pintura', pontosChave: 'Isolar com fitas as áreas e peças que não devem receber pintura.' }
            ]
        }
    ],

    // ==========================================================
    // MOLDE MCC#4
    // ==========================================================
    'molde-mcc4': [
        {
            id: '602086',
            nome: 'Reparo Guias Laterais do Molde MCC#4',
            revisao: '04',
            dataRevisao: '25/10/2024',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de reparo das guias laterais do molde da MCC#4 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chaves combinadas 11, 13, 16, 24, 30mm', 'Pneumática', 'Paquímetro', 'Micrômetro de 0 a 25mm', 'Soquete 21mm ou 13/16"', 'Calibre de folga', 'Lixadeira', 'Esmerilhadeira'],
            etapas: [
                { id: '1', texto: 'Posicionar guia lateral na bancada de reparo', pontosChave: 'Utilizando olhal M16 e estropo ¼" x 0,50m. Posicionar com pórtico ou PR a guia lateral (edge-roll) na bancada de reparo com a face de apoio para baixo.', seguranca: 'Risco de carga suspensa e impacto por queda — não ficar no raio de ação da carga e utilizar estropos/cabos em bom estado. Risco de impacto por escape de chave e aprisionamento — ter atenção ao manusear peças e ferramentas.' },
                { id: '2', texto: 'Desmontar conjunto de rolos da guia lateral', pontosChave: 'Desmontar tubulação de lubrificação com chave combinada M11, M13. Soltar a porca de fixação dos rolos com máquina pneumática ¾" e soquete M30. Soltar os conjuntos de rolos da guia lateral.', seguranca: 'Risco de impacto por escape de chave e aprisionamento — ter atenção ao manusear peças e ferramentas.' },
                { id: '3', texto: 'Limpar e preparar guias laterais (caso necessário, jatear)', pontosChave: 'Utilizar tampões especiais para proteger as roscas de refrigeração.' },
                { id: '4', texto: 'Desmontar rolos, rolamentos e componentes dos rolos', pontosChave: 'Utilizar chave Allen M5 para soltar os parafusos da tampa e, com dispositivo, sacar a tampa do conjunto de rolo. Com auxílio do Kit de desmontagem de rolos e prensa hidráulica, sacar o eixo do garfo do conjunto de rolo. Utilizar alicate para anéis internos ponta fina pra retirar os anéis elásticos do rolo. Com o Kit e a prensa hidráulica novamente, sacar o rolamento e componentes do rolo.', seguranca: 'Risco de impacto por escape de chave, aprisionamento e projeção de peça. Ter atenção ao manusear peças e ferramentas. Utilizar grade de proteção na prensa hidráulica e posicionar-se fora do raio de projeção.' },
                { id: '5', texto: 'Limpar os componentes dos rolos', pontosChave: 'Antes de iniciar a limpeza, verificar a existência de materiais estranhos e rebarbas. Utilizar desengraxante para efetuar a limpeza dos componentes.', seguranca: 'Risco de corte contuso e contaminação de produto químico. Ter atenção ao manusear peças/ferramentas com rebarbas. Utilizar luva de PVC para limpeza das peças.' },
                { id: '6', texto: 'Inspecionar componentes dos rolos', pontosChave: 'Verificar rolamento (CSN-BSA 3077) quanto a folga, coloração, arranhões, desgastes e marcas. Eixo (CSN-BSA 3976) quanto ao empeno, dimensional e passagem de lubrificante pelo canal. Tampa (CSN-BSA 3966) quanto a empeno e deformação. Espaçador (CSN-BSA 3974) e bucha espaçadora (CSN-BSA 3973) quanto ao dimensional. Bucha (CSN-BSA 3967), anel distanciador (CSN-BSA 3965) e anel elástico (CSN-BSA 3978) quanto ao dimensional.' },
                { id: '7', texto: 'Inspecionar e preparar os garfos', pontosChave: 'Fazer inspeção visual no suporte, avaliando empenho, deformação e desgaste nas paredes que comprometam a montagem. Fazer teste com líquido penetrante na solda verificando trincas (garfos novos e usados). Verificar dimensional das furações de encaixe do eixo conforme desenho CSN-BSA 3975. Raspar e pintar o suporte.' },
                { id: '8', texto: 'Desmontar e inspecionar os pacotes de molas', pontosChave: 'Utilizar chave combinada M30 para soltar porca M20 de fixação do conjunto. Soltar parafuso "T" (CSN-BSA 3953) e inspecionar. Liberar as molas prato e inspecionar depois de lavadas, verificando trincas ou molas quebradas.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '9', texto: 'Montar o conjunto de rolo (rolo + garfo + pacote de mola)', pontosChave: 'Montar o pacote de molas no garfo conforme desenho CSN-BSA 3950 seção BB. Preparar o rolo, encaixando anéis elástico, anéis distanciadores, anéis laminar, buchas, rolamentos e espaçador conforme desenho CSN-BSA 3971. Posicionar o rolo e garfo na prensa hidráulica e montar o eixo conforme o mesmo desenho, finalizando com a tampa e parafusos de fixação. Obs.: inspecionar se o furo de lubrificação do eixo está alinhado com o do garfo.', seguranca: 'Risco de impacto por escape de chave, aprisionamento e projeção de peça. Utilizar grade de proteção na prensa hidráulica e posicionar-se fora do raio de projeção.' },
                { id: '10', texto: 'Preparar estrutura da guia lateral', pontosChave: 'Retirar tampões de proteção das tubulações e bicos de spray. Limpar bicos e tubulações de resfriamento (bico modelo TP9530). Limpar cavidades de encaixe dos suportes. Inspecionar o-rings e substituir quando necessário. Montar bicos de spray. Lixar a face de apoio da guia. Verificar medida da largura da guia — deve estar no máximo em 244 mm. Verificar dimensional de encaixe do suporte nas guias, reparando com solda sempre que a folga for superior a 1,0 mm.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '11', texto: 'Montar conjuntos de rolos na estrutura da guia lateral e pré-alinhar', pontosChave: 'Utilizar chave combinada M16 e M24 e fixar a estrutura da guia lateral na mesa de alinhamento. Posicionar o conjunto de rolo na estrutura e apertar a porca com chave combinada M30. Montar conforme desenho CSN-BSA 3950. Pré-alinhamento dos rolos com calibre de folga e régua de alinhamento: 1º rolo 0,00mm; 2º rolo 0,50mm; 3º rolo 1,00mm; 4º rolo 1,50mm (tolerância ±0,10mm). Reportar resultados no checklist do molde MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '12', texto: 'Montar tubulação de lubrificação e testar', pontosChave: 'Em caso de falha no teste, retirar a válvula de graxa progressiva do conjunto e fazer teste de passagem interna na bancada de teste.' }
            ]
        },
        {
            id: '602087',
            nome: 'Reparo de Foot-Roll do Molde MCC#4',
            revisao: '04',
            dataRevisao: '28/10/2024',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de reparo do foot-roll do molde da MCC#4 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança', 'Máscara de oxi corte', 'Luva de raspa', 'Avental de raspa, blusão de raspa ou sobretudo de raspa', 'Perneira de raspa'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Chaves combinadas M5, M17, M18, M19, M24 e M30', 'Chaves Allen M5', 'Cintas 1 e 3m', 'Prensa hidráulica', 'Bomba de graxa', 'Lixadeira'],
            etapas: [
                { id: '1', texto: 'Desmontar rolos do foot-roll', pontosChave: 'Com pórtico ou PR, posicionar o foot-roll na bancada específica e fixar mancais com parafusos M20. Usar dispositivo de segurança para evitar queda. Limpar previamente os rolos, removendo o excesso de graxa. Com chave combinada de 19mm, soltar mangotes de graxa. Soltar porcas de bronze 45x3mm das pontas dos eixos. Desmontar rolos do lado esquerdo puxando com as mãos e posicionando sobre o piso. Desmontar mancal do centro. Com chave combinada de 19mm, desmontar chavetas do mancal do lado direito. Desmontar mancal do lado direito com marreta, posicionando sobre a bancada. Desmontar os rolos puxando com as mãos e posicioná-los no piso. Reportar resultados no checklist do molde MCC#4.', seguranca: 'Risco de impacto por escape de chave — ter atenção ao manusear peças e ferramentas. Risco de impacto por queda do rolo — manter postura defensiva.' },
                { id: '2', texto: 'Desmontar rolos, rolamentos e componentes dos rolos', pontosChave: 'Posicionar rolo sob a unidade de desmontagem. Montar dispositivo de desmontagem sob o cilindro hidráulico, posicionado sobre o rolo, acionando até que anel, rolamento, eixo e espaçador caiam na gaveta da bancada. Virar o rolo pra sacar o rolamento do outro lado. Posicionar rolo no cavalete. Posicionar componente na bancada, lavar e inspecionar, sucatando os danificados. Lavar rolos retirando toda a graxa, inspecionar e enviar para usinagem. Com pórtico ou PR, posicionar o conjunto de eixos e mancais na bancada fixando com parafuso M20. Fazer limpeza e inspeção nos eixos, identificando desgastes e deformações. Se necessário, verificar empeno dos eixos. Reportar resultados no checklist do molde MCC#4.', seguranca: 'Risco de impacto por escape de chave, aprisionamento e projeção de peça. Utilizar grade de proteção na prensa hidráulica e posicionar-se fora do raio de projeção.' },
                { id: '3', texto: 'Montar componentes nos rolos', pontosChave: 'Posicionar rolo sob a prensa e montar os componentes pista, rolamentos, espaçadores e anéis. Virar o rolo para montar os componentes do outro lado. Posicionar rolo montado na bancada.', seguranca: 'Risco de impacto por escape de chave, e risco de impacto por queda dos rolos — fazer sinalização correta para o operador da PR, utilizar cintas, cabos e estropos em boas condições.' },
                { id: '4', texto: 'Montagem dos rolos no foot-roll', pontosChave: 'Lixar e preparar eixos. Montar rolos e mancais do lado esquerdo. Fixar mancal do lado esquerdo com porca 45x3mm de bronze. Montar rolos do lado direito. Montar e fixar mancal com chavetas presas por parafusos M12x30mm. Instalar mangueiras de lubrificação e lubrificar rolos. Retirar excesso de graxa. Isolar pontas das mangueiras. Transportar para área de estocagem. Reportar resultados no checklist do molde MCC#4.', seguranca: 'Risco de impacto por escape de chave, e risco de impacto por queda dos rolos — fazer sinalização correta para o operador da PR, utilizar cintas, cabos e estropos em boas condições.' }
            ]
        },
        {
            id: '602088',
            nome: 'Revisão de Suporte do Molde MCC#4',
            revisao: '04',
            dataRevisao: '28/10/2024',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades na revisão de suporte do molde da MCC#4 no interior da OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Micrômetro externo de 25 mm', 'Micrômetro interno de 25 mm', 'Estampa 17 mm e 24 mm', 'Escova de aço', 'Nível', 'Chave de fenda', 'Chave Allen 3, 5, 6 e 8 mm', 'Soprador', 'Lixadeira', 'Chave combinada 13, 17, 19 e 30 mm', 'Chave de boca 55 mm e 65 mm', 'Martelo', 'Macho M8 e M10', 'Esmerilhadeira', 'Pneumática ¾"'],
            etapas: [
                { id: '1', texto: 'Transportar molde para cavalete', pontosChave: 'Utilizar Jig ou cabo de aço para movimentação com PR.', seguranca: 'Risco de carga suspensa e impacto por queda — não ficar no raio de ação da carga, usar estropos/cabos em bom estado. Risco de queda com diferença de nível — utilizar guarda-corpo sobre o molde ao efetuar a tarefa.' },
                { id: '2', texto: 'Lixar faces de apoio das placas e réguas guia', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '3', texto: 'Lubrificar caixas de transmissão', pontosChave: 'Abrir o furo de sangria ou tampa para retirar graxa usada e encher as caixas com graxa nova.' },
                { id: '4', texto: 'Desmontar "foot-roll" para limpar e ajustar calços', pontosChave: 'Lavar calços e parafusos com desengripante. Lixar calços de ajuste. Quando necessário, restaurar roscas.', seguranca: 'Risco de corte contuso e contaminação de produto químico. Ter atenção ao manusear peças com rebarbas. Utilizar luva de PVC para limpeza.' },
                { id: '5', texto: 'Limpar calços e parafusos "T" das guias laterais (edge-roll)', pontosChave: 'Quando necessário, restaurar rosca do parafuso "T" utilizando cossinete M16.' },
                { id: '6', texto: 'Testar válvulas de distribuição de graxa, lubrificar caixas redutoras e Cardans', pontosChave: 'Conectar mangueiras e, com a bomba, testar o funcionamento das válvulas de distribuição de linha dupla de graxa. Utilizar acoplador de graxa tipo botão e lubrificar caixas redutoras e Cardans.' },
                { id: '7', texto: 'Desmontar eixo cardan das caixas Benzlers para inspecionar e verificar as medidas conforme as interferências do desenho', pontosChave: 'Soltar os frenos e, com marreta de 1 kg, desmontar o eixo cardan do conjunto Benzlers. Posicionar os cardans na bancada e conferir a medida interna do furo com micrômetro interno e externo de 25 mm (interferência -25,00mm +25,02mm), e a medida do eixo das caixas Benzlers (interferência +25,00mm -24,99mm), relatando à supervisão qualquer anomalia fora das tolerâncias.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '8', texto: 'Conferir torque de fixação dos eixos cardans', pontosChave: 'Soltar proteções sanfonadas dos eixos cardans. Com torquímetro e chave soquete, conferir o torque dos freios de fixação dos cardans (25Nm). Após conferir, passar silicone para conservar a integridade dos freios.' },
                { id: '9', texto: 'Ajustar e aferir eixo excêntricos', pontosChave: 'Com pneumática e estampa 24mm, soltar a base de sustentação e remover o eixo excêntrico, lixar manualmente e aferir dimensional do eixo e bucha. Reportar resultados no checklist do molde MCC#4.' },
                { id: '10', texto: 'Verificar folga dos parafusos de fixação da placa móvel e suporte de fixação do molde na máquina', pontosChave: 'Usar chave de boca 65 mm e apalpador de folga de 0,40mm para ajustar folga entre a arruela e base da caixa d\'água. Retirar o suporte de fixação do molde com chave combinada 24 mm, lixar, lubrificar e prender, deixando uma folga de 1 mm entre as arruelas.' },
                { id: '11', texto: 'Avaliar condição do dreno do cilindro do clamp e ajustar porcas castelo', pontosChave: 'Com vareta ou chave de fenda, desobstruir drenos. Limpar as roscas com escova de aço e aplicar desengripante. Com chave de boca 55 mm, ajustar as porcas castelo.' },
                { id: '12', texto: 'Desmontar conjuntos (placas laterais e guias)', pontosChave: 'Posicionar o pórtico, fixar olhal M16 e laçar com cabo de aço ¼" x 1m. Soltar parafusos que fixam os telescópios e protetores sanfonados com chave catraca, extensão e estampa 17 mm. Soltar porca batente com chave Allen 3 mm e acionar a movimentação até o fim do curso dos fusos. Içar conjunto e levar para a bancada.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' },
                { id: '13', texto: 'Inspecionar roscas na estrutura lateral (back-up) para fixação das placas lateral direita e esquerda', pontosChave: 'Caso haja folga nos primeiros filetes de rosca, recondicionar com implante de rosca postiça para parafuso M16 ou enchimento de solda para abrir a nova rosca.' },
                { id: '14', texto: 'Soltar protetores sanfonados e desmontar dos fusos e tubos telescópicos', pontosChave: 'Usar chave de fenda para soltar braçadeiras das proteções sanfonadas. Soltar capa protetora dos mancais do fuso com chave Allen 8 mm ou estampa Allen 8 mm.' },
                { id: '15', texto: 'Ajustar dispositivo de ajuste da guia', pontosChave: 'Com chave combinada 19 mm e 30 mm, desmontar dispositivo usando cossinete M20, ajustar roscas do dispositivo de ajuste e montar novamente.' },
                { id: '16', texto: 'Montar conjuntos ("foot-roll", placas e guias)', pontosChave: 'Lubrificar e montar mancais do fuso, montar proteções sanfonadas novas. Prender olhal M16, laçar com cabo ¼" e içar. Posicionar conjunto no interior do molde, nivelar os fusos com o nível e acionar movimentação para montagem do conjunto. Reportar resultados no checklist do molde MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento. Ter atenção ao manusear peças e ferramentas.' }
            ]
        },
        {
            id: '602089',
            nome: 'Leitura e Redução de Folga nos Fusos (Benzler)',
            revisao: '04',
            dataRevisao: '28/10/2024',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de aferir folga na redutora do molde da MCC#4 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Soquete 17 mm', 'Chave combinada 17mm e 24mm', 'Relógio Comparador', 'Base Magnética', 'Pneumática'],
            etapas: [
                { id: '1', texto: 'Ligar unidade hidráulica do molde', pontosChave: 'Verificar se as mangueiras hidráulicas estão conectadas de forma correta no molde. Ir até o painel da unidade hidráulica na área da MCC#4 e ligá-la.' },
                { id: '2', texto: 'Posição das placas largas do molde "clamp"', pontosChave: 'Ir até o painel do molde da MCC#4 e colocar o "clamp" na posição neutra.' },
                { id: '3', texto: 'Posicionar o relógio comparador', pontosChave: 'Retirar as calotas de proteção da redutora para acessar o fuso e posicionar o relógio comparador com base magnética no final dele.' },
                { id: '4', texto: 'Aferir folga dos fusos', pontosChave: 'Rotacionar o eixo cardan até o fuso encostar no relógio. Após encostar, rotacionar o cardan no mesmo sentido até fazer pressão no relógio e zerá-lo. Com o relógio zerado, marcar um risco no cardan e dar três voltas no mesmo sentido que rodou, depois três voltas no sentido contrário. Avaliar o deslocamento do relógio e o retorno para visualizar a folga na redutora (tolerância < 1,0mm). Realizar aferição nas 4 redutoras do molde. Reportar resultados no checklist do molde MCC#4.' },
                { id: '5', texto: 'Medir folga na placa estreita', pontosChave: 'Seguir os itens 2 ao 4 com o relógio comparador posicionado na face da placa estreita. Realizar aferição em 4 pontos do molde. Reportar resultados no checklist do molde MCC#4.' }
            ]
        },
        {
            id: '602059',
            nome: 'Reparo de Molde da MCC#4',
            revisao: '05',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Líder de manutenção e mecânicos',
            objetivo: 'Estabelecer diretrizes para as atividades de reparo de molde da MCC#4 na OMS.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Régua para alinhamento', 'Chaves Allen 5, 14, 17 e 19mm', 'Chaves combinadas 17, 19, 24 e 30mm', 'Marretas 2 e 5Kg', 'Estropo e Cinta', 'Chave inglesa 10 e 15"', 'Estampa 17, 19, 24 e 36', 'Chave de fenda', 'Pneumática', 'Lixadeira', 'Esmerilhadeira', 'Esquadro', 'Calibre de folga', 'Micrômetro de 0 à 25mm'],
            etapas: [
                { id: '1', texto: 'Transportar o molde para área de lavagem e efetuar limpeza', pontosChave: 'Utilizar o jig ou cabo de aço. Embalar conectores (DBO e Vuhz) para evitar contato com água. Utilizar raspador e a máquina de lavar para efetuar limpeza.', seguranca: 'Risco de carga suspensa e impacto por queda — não ficar no raio de ação da carga e utilizar estropos/cabos em bom estado. Risco de queda com diferença de nível — utilizar guarda corpo sobre o molde ao efetuar tarefa.' },
                { id: '2', texto: 'Posicionar molde no stand, apertar parafusos de fixação, acoplar eixos cardan, e conectar mangueiras hidráulicas e graxas para os testes iniciais de recebimento', pontosChave: 'Reportar resultados dos testes iniciais no checklist do molde da MCC#4. Após conectar os flexíveis hidráulicos aproximar o clamp, retirar as réguas do 1,65 e afastar o clamp e desligar a unidade hidráulica para dar sequência nos testes.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível — utilizar guarda corpo sobre o molde.' },
                { id: '3', texto: 'Limpeza de Break Out (quando aplicável)', pontosChave: 'Aguardar liberação dos gestores para iniciar a limpeza do break out. Realizar limpeza utilizando oxicorte, removendo todo o aço agarrado no equipamento. Utilizar checklist de verificação em serviço de oxicorte.', seguranca: 'Risco de queimadura devido ao trabalho a quente — utilizar EPIs para trabalho a quente e biombos de proteção contra fagulhas. O vigia do maçariqueiro também deve usar EPIs para trabalho a quente.' },
                { id: '4', texto: 'Inspeção no Spray, termopar e desgaste de placas no recebimento', pontosChave: 'Reportar resultados no checklist do molde da MCC#4.' },
                { id: '5', texto: 'Aferir a folga nos fusos (quando aplicável)', pontosChave: 'Utilizar padrão de procedimento para leitura e redução de folga nos fusos (Benzler) do molde.' },
                { id: '6', texto: 'Desmontar placas estreitas laterais', pontosChave: 'Posicionar pórtico ou PR sobre a placa lateral. Rosquear os olhais M12 e manilhas no topo da placa. Passar cabo de aço ¼" ou cinta de 1 metro e tensionar com pórtico ou PR. Utilizar chave Allen 14mm para soltar parafuso da cunha de fixação da placa lateral. Soltar placa lateral e içar para posicionar em local próprio (cavalete).', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '7', texto: 'Desmontar sensor VUHZ da placa fixa', pontosChave: 'Utilizar chave allen 10mm para soltar a tampa do VUHZ. Utilizar chave combinada 17mm e 19mm para soltar conexões das tubulações de água e nitrogênio do sensor.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '8', texto: 'Desmontar resfriadores (cangalhas)', pontosChave: 'Soltar conexão da tubulação de água. Soltar a cunha de fixação da cangalha com martelo/marreta.', seguranca: 'Risco de impacto por escape de chave.' },
                { id: '9', texto: 'Desmontar os "Foot-rolls"', pontosChave: 'Soltar mangotes de lubrificação dos rolos com chave combinada de 19mm. Posicionar pórtico ou PR sobre o molde. Prender e tencionar com a cinta o rolo do centro do conjunto do "foot roll". Retirar os calços de alinhamento (cachorros). Soltar as 04 porcas dos tirantes que fixam os foot-rolls com máquina pneumática ¾" e estampa de 1 7/8". Girar tirante 90º e descer o "foot-roll" apoiando-o no piso do stand. Retirar tirantes que fixam o "foot roll" para revisão.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '10', texto: 'Desmontar guias laterais (Edge roll)', pontosChave: 'Posicionar pórtico ou PR sobre o molde. Soltar mangote de lubrificação e refrigeração utilizando chave combinada 19mm e inglesa de 15". Encaixar suporte de içamento da guia. Posicionar cabos de aço de ¼" e tencionar. Aliviar porcas do dispositivo de ajuste de alinhamento da guia lateral utilizando chave M30. Utilizar chave cachimbo M24 para soltar porcas dos tirantes. Girar 90º e descer guia lateral apoiando-a no piso do stand. Retirar tirantes que fixam a guia para revisão.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '11', texto: 'Desmontar as placas largas principais', pontosChave: 'Desmontar régua guia e suporte da lateral. Com auxílio do pórtico ou PR posicionar balancim sobre a placa principal. Montar olhais M24 no topo da jaqueta da placa e encaixar balancim de içamento e tencionar. Utilizar máquina pneumática ¾ com extensão e estojo M36 para soltar os parafusos Allen que fixam a placa larga. Soltar placa larga e içar para posicionar em local próprio (cavalete).', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '12', texto: 'Fazer revisão no suporte', pontosChave: 'Posicionar molde no cavalete e realizar revisão conforme padrão de procedimento de revisão de suporte.' },
                { id: '13', texto: 'Montar as placas largas principais', pontosChave: 'Posicionar os o\'rings na face de encaixe da caixa d\'água do molde (utilizar graxa nos o\'rings para auxiliar na fixação e montagem das placas largas). Montar olhais M24 e, com auxílio de balancim, içar a jaqueta da placa e posicioná-la sobre o molde. Descer as jaquetas das placas fixa e móvel até que apoiem na base da estrutura. Montar parafusos Allen M24x70mm no meio, topo e base da caixa d\'água para fixar a placa. Com auxílio da máquina pneumática ¾ e extensão para chave soquete 19mm, apertar os parafusos do centro e depois os da base e topo (torque 100Nm). Descer o balancim, retirar olhais e posicionar no cavalete. Testar estanqueidade para verificar vazamento de água nas placas montadas. Montar réguas guia e suportes da lateral.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '14', texto: 'Montar placas laterais', pontosChave: 'Posicionar os o\'rings na face de apoio da lateral (utilizar graxa nos o\'rings para auxiliar na fixação e montagem das placas estreitas). Inspecionar acabamento na face de trabalho e laterais, verificar medidas das placas 258 no topo e 256 na base com tolerância de 1mm. Inspecionar ajuste de chave nas placas laterais, verificando recuo de 0,3mm em relação ao esquadro da placa. Montar olhais M12 nas placas e, com auxílio de cabo de aço de ¼" e anilhas, içar a lateral com pórtico ou PR. Transportar a lateral com pórtico ou PR até que fique sobre o molde. Descer as placas laterais até que apoiem na base da estrutura e encaixar a cunha de travamento. Antes de encaixar a cunha, certificar que a rosca M16 da estrutura não está avariada. Utilizar parafusos M16x70mm (classe 8.8 ou superior) para montar a cunha de travamento, com chave allen 14mm (torque 100Nm). Testar estanqueidade. Descer pórtico ou PR para soltar cabo de aço, olhais e anilhas.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '15', texto: 'Realizar esquadro das placas laterais com a placa fixa', pontosChave: 'Posicionar esquadro na face fixa e avaliar alinhamento com a face estreita (tolerância <0,1mm). Caso necessário corrigir o esquadro, soltar os parafusos de fixação das redutoras e movimentá-las junto às placas estreitas, alinhando conforme esquadro a face estreita na face fixa. Após concluir esquadro, apertar os parafusos de fixação da redutora.', seguranca: 'Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '16', texto: 'Realizar aferição e ajuste de abertura e fechamento das faces estreitas (troca a frio)', pontosChave: 'O range de movimentação é 765mm e 1860mm. Caso necessário, soltar os batentes nos fusos da redutora e ajustar.' },
                { id: '17', texto: 'Realizar ajuste das (bolachas), espaçamento da placa fixa com a placa móvel', pontosChave: 'Conectar mangueiras hidráulicas no molde e ligar sistema hidráulico. Testar acionamento dos cilindros do "clamp" e colocar na posição neutra. Equalizar a posição da haste dos 4 cilindros do "clamp" (80mm de haste exposta na tampa dos cilindros). Ajustar o espaçamento (bolacha) da haste dos cilindros superiores até zerar a folga de aresta. Ajustar o espaçamento (bolacha) da haste dos cilindros inferiores até zerar a folga de aresta.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '18', texto: 'Verificar folga de aresta e ajuste das porcas sextavadas do cilindro do "clamp"', pontosChave: 'Posicionar as duas réguas de "clamp" no molde. Ligar sistema hidráulico de acionamento dos cilindros do "clamp" e colocar na posição aproximada. Aferir as folgas de aresta (folga <0,30mm) em todas as larguras de lingotamento. Ajustar o espaçamento da porca sextavada na haste dos cilindros (X=1,60±0,15mm). Reportar resultados no checklist do molde da MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '19', texto: 'Montar guias laterais (Edge roll)', pontosChave: 'Posicionar guias laterais sob o molde. Posicionar pórtico ou PR sobre o molde. Encaixar suporte de içamento da guia lateral. Posicionar cabos de aço ¼" e içar a guia até que se aproxime do apoio. Encaixar a guia na chaveta do conjunto de alinhamento e posicionar os tirantes. Girar tirante 90º e, utilizando chave cachimbo M16, apertar porca M16 (torque 100Nm). Descer o guincho do pórtico ou PR e soltar suporte de içamento da guia.', seguranca: 'Risco de carga suspensa e impacto por queda. Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '20', texto: 'Alinhar guias laterais (Edge roll)', pontosChave: 'Posicionar a régua de alinhamento encostando-a na face da placa. Posicionar calço 0,20mm para alinhamento conforme croqui em anexo. Com auxílio de chave combinada M30, apertar a porca sextavada M20 do rolo da guia para movimentar e posicionar conforme ajuste de alinhamento. Conferir alinhamento utilizando calibre de folga conforme croqui em anexo. Reportar resultados no checklist do molde da MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '21', texto: 'Montar foot-roll', pontosChave: 'Com auxílio do pórtico ou PR e cinta, posicionar foot-roll sob o molde. Posicionar a cinta no rolo do meio, içar foot-roll até apoiar nos suportes. Encaixar os 04 tirantes de sustentação do foot-roll. Girar os tirantes 90º e apertar porcas utilizando máquina pneumática ¾" e estampa 1 7/8" (torque 250Nm). Montar calços de alinhamento (cachorros) e mangote de lubrificação na estrutura.', seguranca: 'Risco de queda com diferença de nível. Risco de impacto por escape de chave e aprisionamento.' },
                { id: '22', texto: 'Alinhamento de foot-roll', pontosChave: 'Encostar régua de alinhamento na placa principal posicionando-a no centro dos rolos das extremidades. Fixar régua com auxílio de macaquinho (parafuso M20 x 90 com porcas nas extremidades) apoiando-o na placa oposta. Com auxílio da chave combinada M17, aproximar os rolos e apertar os calços de alinhamento (cachorros) que se fixam entre o mancal do foot roll e a base do molde até o valor (E=0,5±0,2mm) em relação à régua. Verificar o espaçamento do foot roll e as guias laterais (referência de 4 a 6mm). Reportar resultados no checklist do molde da MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '23', texto: 'Lubrificar o molde', pontosChave: 'Conectar as mangueiras de lubrificação do "foot roll" e "edge roll". Conectar as mangueiras de alimentação do molde e ligar bomba de lubrificação. Avaliar vazamentos e falhas do circuito. Lubrificar toda estrutura do molde (pontual). Retirar excesso de graxa.' },
                { id: '24', texto: 'Montar cangalhas de resfriamento e fazer teste no spray', pontosChave: 'Montagem do foot-roll bico modelo TP9520. Montagem do edge-roll bico modelo TP9530. Avaliar formação e projeção do leque. Reportar resultados no checklist do molde da MCC#4.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '25', texto: 'Montar os plugs do sistema de detector de "breakout" e realizar aferição de resistência ôhmica dos termopares', pontosChave: 'Reportar resultados no checklist do molde da MCC#4.' },
                { id: '26', texto: 'Montar o sensor nível (Vuhz)', pontosChave: 'Posicionar o mancal de fixação do sensor de nível. Utilizar gabarito e apertar os parafusos M12x50mm com arruela (torque 50Nm). Montar gaxeta de isolamento entre o sensor e a placa do molde. Posicionar o sensor de nível eletromagnético. Posicionar a tampa do sensor e fixar o conjunto com porca isolante e parafuso M12x35mm (torque 40Nm). Conectar plug e mangotes de refrigeração, nitrogênio.', seguranca: 'Risco de impacto por escape de chave e aprisionamento.' },
                { id: '27', texto: 'Fazer aferição, teste de profundidade e calibração do sensor de nível (Vuhz)', pontosChave: 'Realizar aferição, teste e calibração conforme checklist. Reportar resultados no checklist do molde da MCC#4.' },
                { id: '28', texto: 'Inspeção final, testes, limpeza e preparação para embarque', pontosChave: 'Reportar resultados no checklist do molde da MCC#4.' }
            ]
        }
    ]

    ,
    // ==========================================================
    // SEGMENTO DE GRUPO (1, 2 e 3 — MCC's #2 e #3)
    // ==========================================================
    'segmento-grupo': [
        {
            id: '603104',
            nome: 'Desmontagem dos Seg. Gr 1,2 e 3 e Conj. Rolos da MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na desmontagem dos conjuntos de rolos do segmento grupo 1, 2 ou 3 das MCC\'s #2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾", ½" e 1"', 'Chaves combinadas de 11, 13, 14, 17, 18, 19, 22, 23, 24, 26, 27, 28, 30, 32, 36, 46mm', 'Soquetes de 19x½", 19x¾", 30x¾", 36x¾", 55x1", 95x1"', 'Allen 10x½", 19x½" e 19x¾"', 'Chaves impacto 46 e 55mm', 'Grife 18"', 'Relógio comparador para medir Gap (Robocop)', 'Micrômetro 250 a 275mm', 'Paquímetro de 0 a 300mm', 'Martelo', 'Marreta 1, 2 e 5kg', 'Manilhas', 'Corta frio e dobrador de tubos'],
            etapas: [
                { id: '1.1', texto: 'Receber segmento e enviá-lo ao Box de lavagem para retirar excesso de pó', pontosChave: 'Para movimentação dos segmentos grupo 1, 2 e 3 utilizar PR e JIG (balancinho).', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.2', texto: 'Iniciar inspeção visual do segmento e verificação dos itens citados na planilha de inspeção de chegada', pontosChave: 'Fazer inspeção dos rolamentos, medições do diâmetro dos rolos, empeno, espaçamento entre rolos "GAP" e reportar informações para folha de registro do segmento. Utilizar relógio comparador (robocop) e micrômetro 250 e 275mm para as medições.' },
                { id: '1.3', texto: 'Pilotar porcas hidráulicas e garantir que as porcas estejam despressurizadas' },
                { id: '1.4', texto: 'Remover os capacetes de proteção da coluna do segmento', seguranca: 'Risco de queda com diferença de nível — para acessar os capacetes utilizar a plataforma ou escada.' },
                { id: '1.5', texto: 'Soltar os parafusos de fixação e remover as chavetas das colunas da base sobre a porca hidráulica', pontosChave: 'Utilizar chave combinada 30mm e marreta 5kg.', seguranca: 'Risco de queda com diferença de nível — utilizar a plataforma ou escada.' },
                { id: '1.6', texto: 'Soltar os parafusos e remover as proteções dos mancais da base superior', pontosChave: 'Utilizar chaves combinada 19 para soltar as proteções. Quando necessário, utilizar oxi-corte para cortar os parafusos da proteção.', seguranca: 'Risco de corte e aprisionamento das mãos — manter postura defensiva e utilizar luvas. Risco de queimadura por oxi-corte — utilizar EPIs adequados e biombos.' },
                { id: '1.7', texto: 'Desconectar os tubos de graxa e flexíveis da base superior', pontosChave: 'Utilizar chaves combinada 13, 18, 19, 22, 23, 32mm e grife 18".', seguranca: 'Risco de corte e aprisionamento das mãos — manter postura defensiva e utilizar luvas.' },
                { id: '1.8', texto: 'Abrir o segmento, separando a base superior da inferior', pontosChave: 'Para movimentação das bases dos segmentos de grupo 1, 2 e 3 utilizar PR.', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.9', texto: 'Caso necessário, movimentar a base superior para o poço de lavagem para nova limpeza' },
                { id: '1.10', texto: 'Movimentar a base superior para os cavaletes na área de reparo', pontosChave: 'Para movimentação das bases dos segmentos de grupo 1, 2 e 3 utilizar PR.', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.11', texto: 'Drenar óleo e retirar os flexíveis hidráulicos do cilindro e plugar as linhas hidráulicas para desmontar cilindro de acionamento e porcas hidráulicas', pontosChave: 'A drenagem do óleo pode ser realizada no poço de lavagem. Caso necessário, usar suporte para retirar cilindro dos mancais de apoio com macaco hidráulico e maçarico para aquecer.', seguranca: 'Risco de corte e aprisionamento das mãos. Risco de queimadura por oxi-corte — utilizar EPIs adequados e biombos.' },
                { id: '1.12', texto: 'Virar a base superior e posicionar no cavalete para desmontar conjuntos de rolos', pontosChave: 'Utilizar dispositivo padrão para virar a base. Para movimentação das bases dos segmentos de grupo 1, 2 e 3 utilizar PR.', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.13', texto: 'Soltar os parafusos M20 de fixação dos mancais da base superior', pontosChave: 'Utilizar parafusadeira de ¾" e soquete 30x¾" para soltar os parafusos.', seguranca: 'Risco de corte e aprisionamento das mãos — manter postura defensiva e utilizar luvas.' },
                { id: '1.14', texto: 'Retirar os conjuntos de rolo da base superior e posicionar na bancada', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.15', texto: 'Retirar os calços para limpar e reaproveitar' },
                { id: '1.16', texto: 'Encaminhar base superior para área de jateamento e pintura' },
                { id: '1.17', texto: 'Iniciar desmontagem da base inferior com a retirada das guias laterais e proteções', pontosChave: 'Utilizar chaves combinada 19 para soltar as proteções. Quando necessário, utilizar oxi-corte para cortar os parafusos da proteção.', seguranca: 'Risco de corte e aprisionamento das mãos. Risco de queimadura por oxi-corte.' },
                { id: '1.18', texto: 'Soltar os parafusos M20 de fixação dos mancais da base inferior', pontosChave: 'Utilizar parafusadeira de ¾" e soquete 30x¾" para soltar os parafusos.', seguranca: 'Risco de corte e aprisionamento das mãos.' },
                { id: '1.19', texto: 'Retirar os conjuntos de rolo da base inferior e posicionar na bancada', seguranca: 'Risco de aprisionamento das mãos e carga suspensa.' },
                { id: '1.20', texto: 'Retirar os calços para limpar e reaproveitar' },
                { id: '1.21', texto: 'Encaminhar base inferior para área de jateamento e pintura', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.22', texto: 'Desmontar conjuntos: retirar os acoplamentos dos conjuntos acionados', pontosChave: 'Observar o rasgo de chaveta e, caso necessário, aquecer acoplamento e utilizar presa hidráulica para desmontagem.' },
                { id: '1.23', texto: 'Soltar os parafusos de fixação das tampas e espelhos para retirar os mancais dos conjuntos de rolos acionados e não acionados', pontosChave: 'Utilizar parafusadeira de ½", soquete 19x½" e chave combinada de 19mm.', seguranca: 'Risco de corte e aprisionamento das mãos. Risco de queimadura por oxi-corte.' },
                { id: '1.24', texto: 'Efetuar a limpeza das mangas dos rolos' },
                { id: '1.25', texto: 'Retirar as buchas das mangas do rolo', pontosChave: 'Quando necessário, utilizar oxi-corte para cortar as buchas.', seguranca: 'Risco de queimadura por oxi-corte — utilizar EPIs adequados e biombos.' },
                { id: '1.26', texto: 'Inspecionar os rolos desmontados e reportar as informações na planilha de inspeção do rolo' },
                { id: '1.27', texto: 'Retirar os anéis e rolamentos dos mancais para lavagem e inspeção das peças', pontosChave: 'Fazer inspeção para reaproveitamento de peças.' },
                { id: '1.28', texto: 'Fazer inspeção das hastes que ligam os cilindros aos mancais do rolo acionado', pontosChave: 'Fazer inspeção para identificar deformações nos flanges, corrosão, trincas na solda das hastes. Caso possível, realizar teste de líquido penetrante nas hastes.' }
            ],
            observacoes: 'Documentação de referência: para a execução deste procedimento deverá ter em mãos os devidos formulários. Anexo 1 - Desenho esquemático do segmento de grupo (estrutura superior, cilindro hidráulico, porca hidráulica, eixo cardan, mancal, placa, rolo, guia lateral, estrutura lateral, calços, base de apoio, rolete guia).'
        },
        {
            id: '603105',
            nome: 'Montagem dos Conj. de Rolos de Seg. Grupo 1, 2 ou 3 MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem dos conjuntos de rolos dos segmentos de grupo 1, 2 ou 3 das MCC\'s #2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾" ou ½"', 'Chaves combinada de 13, 14, 17, 19, 30mm', 'Soquetes de 19x½", 19x¾", 30x¾", 30x½"', 'Allen 10x½"', 'Grife 18"', 'Micrômetros 50 a 75, 75 a 100, 100 a 125, 125 a 175, 225 a 250, 275 a 300 e 300 a 400mm', 'Paquímetro de 0 a 300mm', 'Martelo', 'Marreta 1 e 2kg'],
            etapas: [
                { id: '1.1', texto: 'Preparar mancais e aferir medidas', pontosChave: 'Lixar e limpar os mancais para realizar inspeção. Atentar para os valores dimensionais toleráveis para aplicação e reutilização de mancais (ver tabelas em anexo).', seguranca: 'Risco de inalação de partículas sólidas nas atividades de limpeza e acabamento — usar respirador, protetor facial, blusão, luva e perneira para atividades com lixadeira.' },
                { id: '1.2', texto: 'Efetuar inspeção e preparar para montagem os sobressalentes como tampas, espelhos, anéis, buchas, rolamentos, juntas e acoplamento para os rolos de Ø240mm, Ø290mm e Ø340mm', pontosChave: 'Realizar limpeza nas peças. Fazer uso de lixadeira para dar acabamento. Observar existência de rebarbas e peças ovalizadas. Verificar tampas danificadas.', seguranca: 'Risco de inalação de partículas sólidas — usar respirador, protetor facial, blusão, luva e perneira.' },
                { id: '1.3', texto: 'Separar todos os parafusos, porcas e retentores a serem montados', pontosChave: 'Caso possível, reutilizar porcas e parafusos.' },
                { id: '1.4', texto: 'Posicionar os rolos sobre as bancadas para montagem', seguranca: 'Risco de aprisionamento das mãos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.5', texto: 'Cortar juntas de fibra cerâmica de 1,6mm de espessura para as tampas', pontosChave: 'Utilizar a própria tampa como molde para cortar as juntas.' },
                { id: '1.6', texto: 'Inspecionar rolamentos', pontosChave: 'Em caso de reparo parcial e seja encontrada alguma marca nas pistas ou coloração azulada, separar este rolamento para avaliação junto ao supervisor.' },
                { id: '1.7', texto: 'Montar os rolamentos na caixa de mancais', pontosChave: 'O número do rolamento deve estar para cima e para fora (rolamentos novos). Para reutilizar: A) medir a folga com calibrador de folga; B) girar o rolamento 90º e medir novamente; C) repetir item B mais duas vezes; D) comparar valores com as tolerâncias em anexo; E) se ao menos um valor estiver fora do padrão, o rolamento deve ser sucatado; F) girar o rolamento 90º com o número para dentro da caixa; G) passar camada fina de lubrificante no diâmetro interno da caixa; H) colocar os mancais na posição vertical sobre a bancada; I) utilizar macetes para introduzir o rolamento na caixa do mancal.', seguranca: 'Risco de aprisionamento das mãos — utilizar luvas e manter postura defensiva.' },
                { id: '1.8', texto: 'Montar as buchas nas mangas dos rolos', pontosChave: 'Utilizar o aquecedor indutivo a 120ºC para montagem. Evitar pancadas para não danificar a bucha.', seguranca: 'Risco de queimadura — utilizar EPIs adequados para manuseio de peças quentes.' },
                { id: '1.9', texto: 'Montar retentores nas tampas para vedação', pontosChave: 'Ficar atento para não amassar os retentores durante a montagem (perdem a função). Utilizar martelo de teflon para montar.' },
                { id: '1.10', texto: 'Montar tampas internas e juntas nas mangas dos rolos (seguir o mesmo para rolo acionado)', pontosChave: 'No Segmento de Grupo 1 há necessidade de fazer alinhamento das buchas externas de acordo com o furo de refrigeração; atentar para a montagem do anel o\'ring.', seguranca: 'Risco de impacto e aprisionamento das mãos — utilizar luvas e manter postura defensiva.' },
                { id: '1.11', texto: 'Montar caixa de mancais e rolamentos nas mangas dos rolos não acionados (loucos)', pontosChave: 'Rolos Ø240mm (Gr#1): lado fixo — 1 espaçador 10mm + rolamento 22218 + 1 espaçador 10mm; lado móvel — rolamento auto compensador nº22218 sem espaçadores (livres). Rolos Ø290/340mm (Gr#2 e 3): lado fixo — 1 espaçador 10mm + rolamento 23126 + 1 espaçador 10mm; lado móvel — rolamento nº23116 sem espaçadores. O nº do rolo deve ficar no lado fixo do rolo não acionado. Observar esquadro da caixa de mancal e passar camada fina de óleo para facilitar a montagem. Usar talha giratória.', seguranca: 'Risco de impacto e aprisionamento das mãos. Risco de aprisionamento e carga suspensa na movimentação.' },
                { id: '1.12', texto: 'Montar caixa de mancais e rolamentos nas mangas dos rolos acionados', pontosChave: 'Rolo Ø240mm (Gr#1) — rolo superior: rolamento 23024 + 2 espaçadores 19mm + rolamento NU1024 + anel de encosto + anel de segurança (aranha) + porca de segurança; rolo inferior: lado fixo — 2 espaçadores 34mm + rolamento 23024 + 2 espaçadores 13mm; lado móvel — 1 espaçador 34mm + rolamento 23024 + 1 espaçador 13mm. Rolos Ø290/340mm (Gr#2 e 3) — rolo superior: rolamento 23030 + 2 espaçadores 29mm + rolamento NU1030 + anel de encosto + anel de segurança (aranha) + porca de segurança; no rolo acionado o mancal fixo deve ser montado no lado do acoplamento. Observar esquadro da caixa de mancal, passar óleo e usar talha giratória.', seguranca: 'Risco de impacto e aprisionamento das mãos. Risco de aprisionamento e carga suspensa na movimentação.' },
                { id: '1.13', texto: 'Montar espelho na manga dos rolos não acionados (loucos)', seguranca: 'Risco de impacto e aprisionamento das mãos — utilizar luvas e manter postura defensiva.' },
                { id: '1.14', texto: 'Montar tampas externas e juntas nos mancais de rolos não acionados (loucos)', seguranca: 'Risco de impacto e aprisionamento das mãos.' },
                { id: '1.15', texto: 'Montar tampas externas e juntas nos mancais do rolo acionado', seguranca: 'Risco de impacto e aprisionamento das mãos.' },
                { id: '1.16', texto: 'Montar acoplamento lado fixo do rolo acionado', pontosChave: 'Aquecer acoplamento para facilitar a montagem.', seguranca: 'Risco de queimadura por oxi-corte — utilizar EPIs adequados e biombos.' }
            ],
            observacoes: 'Anexos: desenho esquemático do segmento de grupo; tabela de folgas dos rolamentos (22118-C4: 0,13~0,18mm; 23024-C4: 0,16~0,21mm; NU1024-C5: 0,14~0,19mm; 23030-C4: 0,22~0,28mm; 23126-C4: 0,19~0,24mm; NU1030-C5: 0,16~0,21mm); tabela de aplicação e reutilização de mancais (dimensões e ovalização máxima por diâmetro Ø160/Ø180 F7 para Grupo I e Ø210/Ø225 F7 para Grupo II e III).'
        },
        {
            id: '603106',
            nome: 'Montagem do Seg. Grupo 1, 2 ou 3 MCC\'s #2 e 3',
            revisao: '04',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem do segmento grupo 1, 2 ou 3 das MCC\'s #2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾", ½" e 1"', 'Chaves combinada de 11, 13, 14, 17, 18, 19, 22, 23, 24, 26, 27, 28, 30, 32, 36, 46mm', 'Soquetes de 19x½", 19x¾", 30x¾", 36x¾", 55x1"', 'Allen 19x½", 19x¾"', 'Chaves impacto 46 e 55mm', 'Grife 18"', 'Relógio comparador para medir Gap (Robocop)', 'Micrômetro 250 a 275mm', 'Paquímetro de 0 a 300mm', 'Martelo', 'Marreta 1, 2 e 5kg', 'Corta frio de tubo ¼"', 'Dobrador de tubo ¼"'],
            etapas: [
                { id: '1.2', texto: 'Inspecionar base inferior antes de iniciar montagem', pontosChave: 'Utilizar prancha (rolimã) para inspecionar parafusos dos pés da base inferior; reparar ou trocar se necessário. Utilizar suporte padrão para virar a base com 2 estropos para o guincho principal e 2 estropos para o auxiliar.', seguranca: 'Risco de aprisionamento das mãos ao virar o segmento e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.3', texto: 'Preparar a base inferior para montagem de rolo', pontosChave: 'Restaurar roscas da base inferior. Realizar acabamento na base de apoio de mancais utilizando lixadeira. Preparar calços e montá-los na base e substituir parafusos da coluna do segmento (caso necessário). Inspecionar as chavetas na base.', seguranca: 'Risco de impacto por projeção de mangueira de ar comprimido — verificar se as mangueiras estão montadas com corrente e braçadeira. Risco de inalação de partículas sólidas — usar respirador, protetor facial, blusão, luva e perneira.' },
                { id: '1.4', texto: 'Montar os conjuntos de rolos na base inferior, colocando 3mm de calço entre o mancal e a base de fixação do segmento', pontosChave: 'Utilizar calços de inox junto às chavetas.', seguranca: 'Risco de aprisionamento das mãos ao posicionar os conjuntos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.5', texto: 'Transportar base inferior para o stand e efetuar ajuste de "Pass Line"', pontosChave: 'Realizar o "Pass Line" conforme procedimento.' },
                { id: '1.6', texto: 'Montar e aferir altura do resfriador da base inferior e montar flexível de teste', pontosChave: 'Medida padrão é de 285mm da ponta do bico spray à base da régua (tolerância ±5mm).' },
                { id: '1.7', texto: 'Transportar a base inferior para o poço de lavagem e efetuar alinhamento dos bicos spray', pontosChave: 'Realizar alinhamento dos resfriadores da base inferior e verificar montagem dos bicos: bico 1485 (rolos de molde), 1285 (seg.0 sup/inf), 1780 (seg.1 sup+inf; seg.2+3 sup; seg.2+3 inf; seg.4,5,6 inf), 1480 (seg.4,5,6 sup).', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa — utilizar extensor. Utilizar PR com Jig (balancinho) padrão para movimentação.' },
                { id: '1.8', texto: 'Retirar a base inferior do poço e transportar para área de teste hidráulico e lubrificação', seguranca: 'Risco de aprisionamento das mãos e carga suspensa. Utilizar PR com Jig padrão para movimentação.' },
                { id: '1.9', texto: 'Aferir folga entre guia e o mancal do rolo puxador', pontosChave: 'Medida tolerância para folga é de 1mm.', seguranca: 'Risco de corte das mãos devido a rebarbas de calço — usar luva de proteção.' },
                { id: '1.10', texto: 'Inspecionar base superior antes de iniciar montagem' },
                { id: '1.11', texto: 'Virar a base superior e preparar a base para montagem dos conjuntos de rolos', pontosChave: 'Utilizar suporte padrão para virar a base com 2 estropos para o guincho principal e 2 estropos para o auxiliar. Restaurar roscas da base superior. Realizar acabamento na base de apoio de mancais utilizando lixadeira.', seguranca: 'Risco de aprisionamento das mãos ao virar o segmento e carga suspensa. Risco de impacto por projeção de mangueira de ar comprimido. Risco de inalação de partículas sólidas.' },
                { id: '1.12', texto: 'Montar os conjuntos de rolos na base superior, colocando 5mm de calço entre o mancal e a base de fixação do segmento', pontosChave: 'Utilizar calços de inox junto às chavetas.', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa.' },
                { id: '1.13', texto: 'Montar os cilindros e fixar flange dos mesmos com a haste do rolo puxador', seguranca: 'Risco de aprisionamento das mãos ao posicionar cilindro e carga suspensa.' },
                { id: '1.14', texto: 'Conectar os flexíveis hidráulicos nos cilindros da base superior', pontosChave: 'Utilizar chave combinada para aperto e evitar a torção dos flexíveis.', seguranca: 'Risco de corte das mãos ao manusear e montar os flexíveis hidráulicos — utilizar luvas de proteção.' },
                { id: '1.15', texto: 'Inspecionar e substituir o\'ring das tubulações hidráulicas', pontosChave: 'Utilizar somente tubos de inox caso seja necessário substituir. Inspecionar bloco e manifold, verificando se estão em perfeitas condições de uso.' },
                { id: '1.16', texto: 'Montar calços e porcas hidráulicas na base superior', pontosChave: 'Montar joelhos e tampões de ¼" nas porcas antes de montá-los na base superior.', seguranca: 'Risco de aprisionamento das mãos ao montar as porcas e carga suspensa.' },
                { id: '1.17', texto: 'Montagem da base superior sobre a base inferior', pontosChave: 'Verificar os apoios e utilizar graxa para proteção deles. Verificar lado fixo da base superior com a base inferior.', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa. Utilizar PR com Jig padrão para montagem.' },
                { id: '1.18', texto: 'Montar as chavetas sobre as porcas hidráulicas e pressurizar', pontosChave: 'Verificar as condições dos parafusos de fixação da chaveta e substituir se necessário. Pressão de referência para teste: 310kgf/cm². Verificar existência de vazamentos nas tubulações, flexíveis e porcas hidráulicas.', seguranca: 'Risco de impacto por rompimento dos flexíveis e projeção de óleo durante o teste — isolar a área, ficar fora do raio de ação e informar que o equipamento está em teste de hidráulico.' },
                { id: '1.19', texto: 'Ajustar o espaçamento de abertura das porcas hidráulicas', pontosChave: 'Segmentos de grupo 1 e 2: espaçamento de 20mm. Segmento de grupo #3: espaçamento de 10mm.', seguranca: 'Risco de aprisionamento das mãos ao realizar ajuste — utilizar luvas e manter postura defensiva.' },
                { id: '1.20', texto: 'Efetuar medidas de espaçamento entre rolos "GAP"', pontosChave: 'Realizar o "Gap" conforme procedimento.' },
                { id: '1.21', texto: 'Montar proteções e guias laterais', pontosChave: 'Tolerância de abertura entre as guias: 1730mm; verificar se estão centralizadas.', seguranca: 'Risco de aprisionamento das mãos ao posicionar e montar as guias e proteção — utilizar luvas e manter postura defensiva.' },
                { id: '1.22', texto: 'Montar tubulações de cobre para lubrificação dos mancais', pontosChave: 'Utilizar corta frio e dobrador de tubos ¼".', seguranca: 'Risco de corte das mãos ao manusear e cortar as tubulações — utilizar luvas de proteção.' },
                { id: '1.23', texto: 'Realizar teste de lubrificação no segmento', pontosChave: 'Pressão de referência para teste: 110kgf/cm². Verificar existência de vazamentos nas tubulações, conexões, blocos e corrigir.', seguranca: 'Risco de impacto por rompimento e projeção de graxa durante o teste — isolar a área e informar que o equipamento está em teste.' },
                { id: '1.24', texto: 'Isolar tubos de cobre com utilização de fita de aramida', pontosChave: 'Utilizar fita de aramida para proteção e isolamento térmico das tubulações.' },
                { id: '1.25', texto: 'Inspecionar, lubrificar e testar movimentação das rodas guias' },
                { id: '1.26', texto: 'Efetuar teste geral para hidráulica', pontosChave: 'Verificar se há vazamento nas soldas, conexões, tubulações, porcas hidráulicas e cilindros. Pressão de teste: 310kgf/cm² para as porcas e 270kgf/cm² para os cilindros.', seguranca: 'Risco de impacto por rompimento dos flexíveis e projeção de óleo — isolar a área durante o teste.' },
                { id: '1.27', texto: 'Aferir altura do resfriador superior', pontosChave: 'Medida padrão é de 285mm da ponta do bico spray à base da régua (tolerância ±5mm). Ajustar com calço se necessário.', seguranca: 'Risco de queda com diferença de nível — utilizar escada apropriada ou plataforma para acesso.' },
                { id: '1.28', texto: 'Aferir altura das porcas hidráulicas', pontosChave: 'Medida padrão: segmento grupo #1 e 2 = 20mm; segmento grupo #3 = 10mm. Ajustar altura com calço se necessário.' },
                { id: '1.29', texto: 'Montar proteção dos pinos e chavetas', seguranca: 'Risco de queda com diferença de nível — utilizar escada apropriada ou plataforma para acesso.' },
                { id: '1.30', texto: 'Montar tubulações de refrigeração interna dos rolos', pontosChave: 'Segmento do grupo 1 conforme desenho TOT 00025. Segmento do grupo 2 conforme desenho TOT-00026. Segmento do grupo 3 conforme desenho HITACHI 0295218.', seguranca: 'Risco de aprisionamento das mãos — utilizar luvas e ter atenção ao executar a tarefa.' },
                { id: '1.31', texto: 'Transportar o segmento para área de teste de refrigeração', pontosChave: 'Verificar possíveis vazamentos. Conferir com a vazão padrão dos bicos da MCC#2 e 3.', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa. Utilizar PR com Jig padrão para movimentação.' },
                { id: '1.32', texto: 'Efetuar inspeção visual final e liberar segmento', pontosChave: 'Realizar liberação do equipamento após preenchimento de todos os documentos de reparo.' }
            ],
            observacoes: 'Tabela de faixa aceitável de vazão para bicos de spray (pressão de teste 7,00 e 3,00 Kgf/cm²): bico 1480 — 21,10 a 22,30 lpm (7,0) / 13,80 a 14,60 lpm (3,0), ângulo 80°; bico 1780 — 26,70 a 28,30 lpm (7,0) / 17,50 a 18,50 lpm (3,0), ângulo 80°; bico 1285 — 18,30 a 19,30 lpm (7,0) / 12,00 a 12,60 lpm (3,0), ângulo 90°; bico 1485 — 21,40 a 22,60 lpm (7,0) / 14,00 a 14,80 lpm (3,0), ângulo 90°. Anexo: desenho esquemático do segmento de grupo.'
        }
    ]

    ,
    // ==========================================================
    // SEGMENTO ZERO (MCC's #2 e #3)
    // ==========================================================
    'zero': [
        {
            id: '603099',
            nome: 'Desmontagem do Segmento Zero das MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na desmontagem do segmento zero das MCC\'S #2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾", ½" e 1"', 'Chaves combinada de 11, 13, 14, 17, 19, 22, 23, 24mm', 'Soquetes de 19x½", 55x1" e 95x1"', 'Chaves impacto 55 e 95mm', 'Grife 36"', 'Relógio comparador para medir Gap (Robocop)', 'Micrômetro 250 a 275mm', 'Paquímetro de 0 a 300mm', 'Martelo', 'Marreta 1, 2 e 5kg'],
            etapas: [
                { id: '8.1', titulo: '8.1 Desmontagem e abertura do segmento', secao: true },
                { id: '1.1', texto: 'Receber segmento e enviá-lo ao Box de lavagem para retirar excesso de pó', pontosChave: 'Posicionar calço (caneco) para o nivelamento do equipamento. Ver desenho esquemático em anexo.', seguranca: 'Risco de queda com diferença de nível — atenção ao acessar poço do stand. Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor.' },
                { id: '1.2', texto: 'Iniciar inspeção visual do segmento e verificação dos itens citados na planilha de inspeção de chegada', pontosChave: 'Fazer as medições do GAP e reportar informações para folha de registro do segmento. Utilizar relógio comparador (robocop) e micrômetro 250 e 275mm para as medições.' },
                { id: '1.3', texto: 'Posicionar o segmento zero no cavalete ou dispositivo de virar segmento com auxílio das PR\'s 146 a 221', pontosChave: 'No transporte do segmento é necessária a utilização do contra pino para fixação do JIG.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor.' },
                { id: '1.4', texto: 'Soltar tubulações de refrigeração 2" fixada na estrutura lateral', pontosChave: 'Utilizando chave combinada 19 mm e grife 36".' },
                { id: '1.5', texto: 'Soltar flexíveis 3/8" de graxa da ligação das laterais', pontosChave: 'Utilizando chaves combinada 19, 22 e 23 mm.', seguranca: 'Risco de ferimento nas mãos durante o manuseio dos flexíveis devido às rebarbas das mangueiras. Fazer uso de luvas durante o manuseio.' },
                { id: '1.6', texto: 'Soltar todos os parafusos M64 das laterais para abrir o segmento', pontosChave: 'Utilizando chaves de impacto 95 mm e marreta 5 kg.', seguranca: 'Risco de impacto por escape da chave — manter postura defensiva para que não haja projeção de material ou ferramenta.' },
                { id: '1.7', texto: 'Abrir o segmento, separando a base superior da inferior, virando-a e posicionando sobre cavaletes', pontosChave: 'Com auxílio da PR, JIG, 02 estropos de 1" e 02 anilhas de 1".', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor.' },
                { id: '1.8', texto: 'Desmontar proteções dos mancais dos rolos Ø200mm das bases superior e inferior', pontosChave: 'Utilizando soquete 19mm x ½" e máquina pneumática saída ½".' },
                { id: '1.9', texto: 'Desconectar todas as tubulações ¼" de graxa dos mancais dos rolos de Ø200mm e Ø140mm das bases superior e inferior', pontosChave: 'Utilizando chaves combinada 9/16" e ½", 13 e 14 mm.' },
                { id: '1.10', texto: 'Medir empeno dos conjuntos de rolos de 200 mm e 140 mm com relógio comparador', pontosChave: 'Fazer as medições e reportar informações para folha de registro do segmento.' },

                { id: '8.2', titulo: '8.2 Desmontar os conjuntos de rolo das bases inferior e superior', secao: true },
                { id: '2.1', texto: 'Soltar os parafusos M16 dos mancais dos rolos de Ø200mm e soltar parafusos M36 aos rolos de Ø140mm da base inferior', pontosChave: 'Utilizar chave de impacto 55mm, marreta 2Kg, soquete 55mm e parafusadeira pneumática ¾". Utilizar oxi-corte para corte dos parafusos de fixação dos mancais, caso não consiga soltá-los.', seguranca: 'Fazer inspeção visual para verificar a presença de produtos inflamáveis próximos ao local de projeção das fagulhas. Risco de queimadura ao usar oxi-corte — utilizar EPIs adequados e biombos para barreiras de projeção de fagulhas.' },
                { id: '2.2', texto: 'Retirar conjuntos de rolos da base inferior com auxílio da talha giratória e posicioná-los sobre a bancada para desmontagem e inspeção dos conjuntos', pontosChave: 'Utilizar 02 estropos de 3/8"x3000mm e olhais. Reportar informações para planilha e folha de registro do segmento.', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga e utilizar extensor.' },
                { id: '2.3', texto: 'Retirar os calços da base, inspecioná-los e guardá-los na prateleira de calços de acordo com a espessura' },
                { id: '2.4', texto: 'Com a PR 221 virar a base inferior, posicioná-la sobre cavaletes', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor.' },
                { id: '2.5', texto: 'Soltar todas as grades de refrigeração e posicioná-las sobre gabarito de alinhamento', seguranca: 'Risco de impacto por escape da chave — manter postura defensiva para que não haja projeção de material ou ferramenta.' },
                { id: '2.6', texto: 'Efetuar limpeza superficial na base inferior e enviar para jateamento' },
                { id: '2.7', texto: 'Soltar parafusos M64 com chave 95 mm e marreta 5 kg da base superior', seguranca: 'Risco de impacto por escape da chave — manter postura defensiva para que não haja projeção de material ou ferramenta.' },
                { id: '2.8', texto: 'Retirar estruturas laterais lado leste e oeste, e repetir toda a operação de desmontagem de conjuntos na base superior', seguranca: 'Risco de carga suspensa e aprisionamento das mãos — posicionar-se fora do raio de ação da carga, sinalizar corretamente para o operador e utilizar extensor.' },

                { id: '8.3', titulo: '8.3 Desmontar conjuntos de rolo', secao: true },
                { id: '3.1', texto: 'Com auxílio da pneumática, retirar os parafusos da tampa dos rolos de Ø200mm na bancada' },
                { id: '3.2', texto: 'Retirar os espelhos lado móvel e fixo, sendo que do lado fixo retirar o espaçador' },
                { id: '3.3', texto: 'Retirar o mancal do rolo junto com o rolamento' },
                { id: '3.4', texto: 'Retirar o rolamento do mancal na bancada com auxílio do saca pino' },
                { id: '3.5', texto: 'Retirar os retentores das tampas com auxílio do saca pino' },
                { id: '3.6', texto: 'Retirar as buchas dos rolos' },
                { id: '3.7', texto: 'Realizar limpeza em todas as peças, inclusive nos rolamentos, e realizar inspeção', pontosChave: 'Em caso de reparo parcial nos rolamentos, posicionar e reaproveitar. As que estiverem danificadas, verificar se cabe reparo, caso negativo sucatear.' },
                { id: '3.8', texto: 'Realizar inspeção da mesa dos rolos, mangas, e preencher ficha de reparo' },
                { id: '3.9', texto: 'Desmontar os rolos Ø140mm, iniciar retirando os pinos elásticos dos mancais', pontosChave: 'Utilizar marreta e saca pino.' },
                { id: '3.10', texto: 'Retirar os mancais dos eixos' },
                { id: '3.11', texto: 'Retirar os mancais (carretel) do eixo' },
                { id: '3.12', texto: 'Retirar os anéis elásticos dos rolos' },
                { id: '3.13', texto: 'Retirar os rolos dos eixos', pontosChave: 'Utilizar talha e cinta de 1m com capacidade maior que 1 ton.' },
                { id: '3.14', texto: 'Retirar os espaçadores (labirinto, anel espaçador) e rolamentos dos rolos com auxílio dos saca rolamento' },
                { id: '3.15', texto: 'Inspecionar e lavar as peças e rolamentos' },
                { id: '3.16', texto: 'Realizar limpeza dos rolos e realizar as inspeções e medições' }
            ]
        },
        {
            id: '603100',
            nome: 'Montagem do Segmento Zero das MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas na montagem do segmento zero das MCC\'S #2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾" e 1"', 'Lixadeira', 'Curvador de tubos ¼"', 'Cortador de tubo', 'Extensor 150mmx3/4"', 'Calibrador de folga', 'Micrômetro 0 a 300mm', 'Paquímetro 0 a 300mm', 'Chaves combinada de 11, ½", 13, 14, 9/16", 18, 17, 19, 21, 22, 24mm', 'Soquetes de 19x½", 24x3/4", 55x3/4", 55x1" e 95x1", 2"3/16"x1", 2"3/16"x3/4"', 'Chaves impacto 55 e 95mm', 'Grife 14", 18" e 24"', 'Martelo', 'Marreta 1 e 5kg'],
            etapas: [
                { id: '8.1', titulo: '8.1 Montagem dos conjuntos de rolo Ø200mm e 140mm', secao: true },
                { id: '1.1', titulo: 'Montagem dos rolos Ø200mm', secao: true },
                { id: '1.2', texto: 'Posicionar os rolos sobre a bancada e realizar inspeção de chegada', pontosChave: 'Colocar cunhas nos rolos para travamento.', seguranca: 'Risco de aprisionamento das mãos ao posicionar os rolos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '1.3', texto: 'Preparar as tampas dos mancais com auxílio da lixadeira', pontosChave: 'Atenção ao empilhamento das tampas e posicionar de forma segura.' },
                { id: '1.4', texto: 'Preparar os mancais dos rolos Ø200mm e realizar a montagem dos rolamentos', pontosChave: 'Lixar os mancais e inspecionar. Rolamento com número de identificação para lado externo e para cima. Nota: lado fixo do mancal montado com espaçadores.' },
                { id: '1.5', texto: 'Preparar as juntas para as tampas e montar os retentores nas tampas' },
                { id: '1.6', texto: 'Montar as buchas nos rolos' },
                { id: '1.7', texto: 'Montar as tampas do lado interno com retentores nos rolos' },
                { id: '1.8', texto: 'Montar os mancais com os rolamentos nos rolos' },
                { id: '1.9', texto: 'Montar os espelhos nos rolos', pontosChave: 'Utilizar parafusadeira de ½" e soquete 1/2x19mm e parafusos M12x30mm.' },
                { id: '1.10', texto: 'Montar tampa de fechamento dos mancais', pontosChave: 'Utilizar parafusadeira de ½" e soquete 1/2x19mm e parafusos M12x110mm.' },
                { id: '1.11', texto: 'Pintar os mancais', seguranca: 'Risco de produtos químicos — utilizar máscara contra fumos e luva de látex.' },

                { id: '1.12', titulo: 'Montagem dos rolos Ø140mm', secao: true },
                { id: '1.13', texto: 'Posicionar e inspecionar os rolos Ø140mm sobre a bancada', pontosChave: 'Colocar cunhas nos rolos para travamento.' },
                { id: '1.14', texto: 'Montar anel espaçador interno no 1º rolo' },
                { id: '1.15', texto: 'Montar as molas nos rolos', pontosChave: 'Utilizar martelo de teflon na montagem.' },
                { id: '1.16', texto: 'Montar rolamento' },
                { id: '1.17', texto: 'Montar espaçador externo (labirinto)' },
                { id: '1.18', texto: 'Montar anel elástico', pontosChave: 'Utilizar alicate para anéis.' },
                { id: '1.19', texto: 'Preparar eixos e inspecionar para avaliar empeno, dimensões, furos e rosca' },
                { id: '1.20', texto: 'Montar o eixo no mancal', pontosChave: 'Montar mancal central (carretel de centro).' },
                { id: '1.21', texto: 'Montar as molas no eixo', pontosChave: 'Utilizar chave unha para abrir as molas. Montar os tubos espaçadores para auxiliar o posicionamento das molas.' },
                { id: '1.22', texto: 'Montar os rolos no eixo' },
                { id: '1.23', texto: 'Fixar o eixo no mancal com pino elástico' },
                { id: '1.24', texto: 'Lubrificar os rolos com graxa' },
                { id: '1.25', texto: 'Pintar mancais', seguranca: 'Risco de produtos químicos — utilizar máscara contra fumos e luva de látex.' },

                { id: '8.2', titulo: '8.2 Preparar base inferior', secao: true },
                { id: '2.1', texto: 'Preparar calços, sendo no mínimo 5mm para os rolos de Ø200mm e 2mm para os rolos de Ø140mm', pontosChave: 'Realizar limpeza na estrutura e lixar as bases de apoio dos mancais.' },
                { id: '2.2', texto: 'Posicionar calços na sede dos rolos de Ø200mm e Ø140mm, verificar altura do calço em relação à chaveta', pontosChave: 'Caso necessário, trocar chaveta até atingir abertura máxima de 5 mm entre mancais e chavetas.' },
                { id: '2.3', texto: 'Posicionar os parafusos M16 e M36 nos furos da base de apoio dos mancais e em seguida montar os rolos de Ø200mm e Ø140mm na base inferior', seguranca: 'Risco de aprisionamento das mãos ao posicionar os rolos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '2.4', texto: 'Apertar todos os parafusos M16 para os rolos de Ø200mm e M36 para os rolos de Ø140mm', pontosChave: 'M16: soquete 24 mm, extensão ¾"x150mm com parafusadeira de ¾". M36: soquete 2e3/16" ou 2e1/8", 55x3/4" e 55x1".' },
                { id: '2.5', texto: 'Posicionar a base inferior no stand e executar passagem de régua e ajustes', pontosChave: 'Fazer alinhamento do "pass line" (conforme padrão) e reportar informações.', seguranca: 'Risco de aprisionamento das mãos ao posicionar a base e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '2.6', texto: 'Montar as proteções dos mancais nos rolos de Ø200mm', pontosChave: 'Utilizando chave catraca e soquete 19 mm.' },
                { id: '2.7', texto: 'Confeccionar e conectar as tubulações de graxa nos mancais dos rolos de Ø200mm e nos eixos dos rolos de Ø140mm, isolar tubulações ¼" e retornar base inferior para cavalete', pontosChave: 'Utilizando chave combinada 14 mm, 11 mm, 13 mm. Utilizar fita de aramida 1" ou 1½" de espessura.' },

                { id: '8.3', titulo: '8.3 Preparar base superior', secao: true },
                { id: '3.1', texto: 'Repetir as operações 8.2.1, 8.2.2, 8.2.3, 8.2.4, 8.2.6 e 8.2.7' },
                { id: '3.2', texto: 'Transportar as estruturas laterais leste e oeste para área de teste de refrigeração', pontosChave: 'Utilizar PR para movimentação e inspecionar condição dos olhais, manilhas e estropos (1/2"x3metros).', seguranca: 'Risco de aprisionamento das mãos ao posicionar a base e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga. Verificar se o piso não está escorregadio antes de posicionar as estruturas.' },
                { id: '3.3', texto: 'Encher laterais de água e deixá-las sob pressão de 5 kg/cm de referência para verificar se há vazamentos', pontosChave: 'Caso apresentem, esvaziar caixa e eliminar o vazamento com reparo por soldagem.' },
                { id: '3.4', texto: 'Soldar chapa de inox de 4 mm de espessura nas laterais do lado interno das estruturas laterais' },
                { id: '3.5', texto: 'Montar as estruturas laterais lado leste e oeste na base superior e fixá-las com parafusos M64', pontosChave: 'Antes de montar, passar fina camada de graxa na superfície de montagem. Utilizar chave de impacto 95mm e marreta 5kg ou parafusadeira de 1" com soquete de 1"x95mm.', seguranca: 'Risco de aprisionamento das mãos ao posicionar as estruturas laterais e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },

                { id: '8.4', titulo: '8.4 Montar segmento (unir base superior e inferior)', secao: true },
                { id: '4.1', texto: 'Utilizando a PR 221 para virar base superior e montá-la na base inferior, fixando-as com parafuso M64', pontosChave: 'Utilizar Jig (balancinho), estropos de 1¼" e manilhas de 1" para a atividade de unir as bases.', seguranca: 'Risco de aprisionamento das mãos ao posicionar as bases e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '4.2', texto: 'Montar os flexíveis de lubrificação, ligando linhas das válvulas de distribuição' },
                { id: '4.3', texto: 'Fazer teste de vazamento de graxa no sistema de lubrificação, com pressão de referência (90 a 110kgf/cm2 em cada linha)', pontosChave: 'Observar existência de vazamentos nos blocos e castelos, mantendo o sistema pressurizado por 15 minutos. Caso haja vazamento, corrigi-lo imediatamente.', seguranca: 'Risco de impacto por rompimento da mangueira por alta pressão. Atenção ao soltar os engates das mangueiras — retirar a pressão delas conferindo os manômetros.' },
                { id: '4.4', texto: 'Posicionar segmento no stand de alinhamento e efetuar ajuste dos lines (chavetas) de apoio', pontosChave: 'Fazer alinhamento dos "lines" chaveta de apoio (conforme padrão) e reportar informações.' },
                { id: '4.5', texto: 'Retirar segmento do stand, montar as cangalhas de spray inferior e superior e posicioná-lo na área de teste', pontosChave: 'Verificar se a cangalha de spray inferior está montada na tubulação principal uniões de 2".', seguranca: 'Verificar se o piso não está escorregadio; caso esteja, limpar local antes de posicionar as estruturas para teste.' },
                { id: '4.6', texto: 'Efetuar teste de refrigeração com pressão de referência de 5kgf/cm2 durante 5 minutos', pontosChave: 'Verificar alinhamento e observar existência de vazamento, corrigindo sempre que necessário.' },
                { id: '4.7', texto: 'Confeccionar 06 chapas de 15 mm de largura, 200 mm de comprimento, 3 mm de espessura em aço inox e soldar nos mancais dos 1º rolos de Ø140mm da base superior e inferior', pontosChave: 'Para fixação da chapa de proteção do segmento zero.' },
                { id: '4.8', texto: 'Limpar rolos, removendo o excesso de graxa e preparar para embarque' },
                { id: '4.9', texto: 'Fazer inspeção final e registrar conforme planilha' }
            ]
        },
        {
            id: '603101',
            nome: 'Ajuste de Pass Line no Segmento Zero da MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas no ajuste de "pass line" no segmento zero das MCC\'s # 2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Paquímetro de 150mm', 'Parafusadeira pneumática de ¾" ou ½"', 'Extensão 150x¾", 150x½"', 'Soquetes de 24x¾", 24x½", 2 3/16"x¾", 2 3/16"x½"', 'Calibrador de folga'],
            etapas: [
                { id: '8.1', texto: 'Efetuar limpeza nas bases de apoio (pés) da estrutura inferior do segmento', pontosChave: 'Utilizar lixadeira.', seguranca: 'Risco de contaminação via respiratória por poeira — fazer uso de protetor facial e respirador compatível com o risco.' },
                { id: '8.2', texto: 'Transportar e posicionar a base inferior no stand de aferição de "Pass Line"', pontosChave: 'Utilizar cabo com 4 pontas de fixação e inspecionar todos os olhais. Nota: verificar desenho esquemático.', seguranca: 'Risco de aprisionamento das mãos ao posicionar a base e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '8.3', texto: 'Fixar os pés do segmento na base do stand' },
                { id: '8.4', texto: 'Verificar folga entre base de apoio do segmento e a base do stand utilizando calibre de folga (apalpador)', pontosChave: 'Verificar a folga ≤0,3mm.' },
                { id: '8.5', texto: 'Posicionar as réguas no suporte de apoio do stand', pontosChave: 'Posicionar as réguas nos pilares de apoio do stand com talha ou PR. As réguas devem estar apoiadas totalmente nos pilares do stand para não gerar leitura falsa.', seguranca: 'Risco de aprisionamento das mãos ao posicionar a régua e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '8.6', texto: 'Utilizar o calibrador de folga para verificar o espaçamento entre o rolo e a régua', pontosChave: 'Verificar a folga entre a régua padrão e o rolo do conjunto. A folga (1±0,05mm) deverá estar entre 0,95mm e 1,05mm.' },
                { id: '8.7', texto: 'Colocar e retirar calço entre a base e o mancal (ajuste dos rolos)', pontosChave: 'Caso a medida esteja fora da desejada, içar o rolo com auxílio da talha corrente ou PR e cinta, calcular os calços necessários e reapertar os parafusos. Conferir a folga novamente e repetir a operação até atingir a medida desejada. Reportar informações para a planilha de acompanhamento de reparo.', seguranca: 'Risco de aprisionamento das mãos ao posicionar o rolo e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '8.8', texto: 'Soltar os parafusos da base de fixação do segmento no stand e retirar chaveta', pontosChave: 'Utilizar parafusadeira pneumática ¾" e soquete 2 3/16"x¾".' },
                { id: '8.9', texto: 'Efetuar retirada das réguas', pontosChave: 'Utilizar talha ou PR para movimentação.', seguranca: 'Risco de aprisionamento das mãos ao posicionar a régua e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' }
            ]
        },
        {
            id: '603102',
            nome: 'Ajuste de Gap no Segmento Zero das MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas no ajuste de "Gap" no segmento zero das MCC\'s # 2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Parafusadeira pneumática de ¾"', 'Chaves combinada de 24mm', 'Extensão ¾"x150mm', 'Soquete de 24mm', 'Soquete de 2, 3/16", 24mm', 'Relógio comparador para medir Gap (Robocop)', 'Micrômetro 250 a 275mm'],
            etapas: [
                { id: '8.1', texto: 'Posicionar o segmento zero na área sobre cavaletes', pontosChave: 'Utilizar Jig (balancinho) para movimentação do segmento.', seguranca: 'Risco de aprisionamento das mãos ao posicionar segmento e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '8.2', texto: 'Preparar o relógio comparador para realizar as medições', pontosChave: 'Utilizar micrômetro externo de 250 a 275mm para ajustar o relógio comparador de medir "Gap" (robocop) em 265mm.' },
                { id: '8.3', texto: 'Realizar as medidas de espaçamento entre rolos "Gap" com referência (261,5-0,1mm)', pontosChave: 'Caso a medida esteja fora do valor desejado (entre 261,40 a 261,50) ajustar os calços da base superior.' },
                { id: '8.4', texto: 'Caso necessário, ajustar o espaçamento entre rolos "Gap" conforme padrão, remover ou acrescentar calços entre o mancal e a base de apoio da estrutura superior', pontosChave: 'Utilizar parafusadeira pneumática para desapertar e apertar os parafusos M16 e M36 de fixação dos rolos Ø200mm e Ø140mm e ajustar os calços. Utilizar extensor ¾"x150mm, soquetes 24mmx3/4", 2/3/16x3/4". Aferir novamente as medidas e repetir a operação quantas vezes for necessário para atingir (261,5-0,1mm). Reportar informações para a planilha de acompanhamento de reparo.', seguranca: 'Risco de aprisionamento das mãos ao movimentar rolos e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' }
            ]
        },
        {
            id: '603103',
            nome: 'Ajuste do Line de Apoio (Chaveta) no Segmento Zero da MCC\'s #2 e 3',
            revisao: '03',
            dataRevisao: '28/02/2025',
            frequencia: 'Diário',
            responsavel: 'Mecânico e líder de manutenção',
            objetivo: 'Estabelecer diretrizes para as atividades incluídas no ajuste de "line" de apoio do segmento zero das MCC\'s # 2 e 3 na OMS.',
            seguranca: ['Luva', 'Capacete com jugular', 'Óculos de Segurança', 'Protetor auricular', 'Bota de segurança'],
            recomendacoes: [
                'Não ficar sob carga suspensa.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.'
            ],
            ferramentas: ['Paquímetro de 150mm', 'Parafusadeira pneumática de ¾"', 'Chaveta padrão (passa não passa)', 'Soquete de 55mmx¾", 24mmx¾"', 'Chave combinada 24mm', 'Calibrador de folga'],
            etapas: [
                { id: '8.1', texto: 'Lixar "lines" de apoio do segmento', pontosChave: 'Utilizar lixadeira.', seguranca: 'Risco de contaminação via respiratória por poeira — fazer uso de protetor facial e respirador compatível com o risco.' },
                { id: '8.2', texto: 'Posicionar o segmento zero no stand e apertar os parafusos de fixação', pontosChave: 'Utilizar jig (balancinho) para movimentação do segmento. Utilizar parafusadeira pneumática de ¾" e soquete de 55mmx¾" para fixar base de apoio no stand, observando apoio uniforme das bases do stand e pés do segmento.', seguranca: 'Risco de aprisionamento das mãos ao posicionar o segmento e carga suspensa — utilizar extensor e ficar fora do raio de ação da carga.' },
                { id: '8.3', texto: 'Verificar a folga entre os pés e o apoio da base inferior no stand', pontosChave: 'Utilizar calibrador para avaliar a folga ≤0,3mm.' },
                { id: '8.4', texto: 'Ajustar "Line" da chaveta de apoio do segmento', pontosChave: 'Utilizar a chaveta padrão (passa não passa) detalhe "A" do desenho esquemático e ajustar folga entre base do segmento e base do stand em (±0,5mm). Nota: verificar desenho esquemático.' },
                { id: '8.5', texto: 'Ajustar deslocamento do "Line" da chaveta de apoio do segmento', pontosChave: 'Utilizar a chaveta padrão (passa não passa) detalhe "A" do desenho esquemático e ajustar espaçamento conforme detalhe "B" utilizando o paquímetro com medida desejada de (6±0,5mm). Nota: verificar desenho esquemático.' },
                { id: '8.6', texto: 'Caso necessário, soltar os parafusos M16x90mm do "line" e refazer atividades de ajuste', pontosChave: 'Utilizar chave combinada 24mm, parafusadeira pneumática ¾" e soquete 24mmx¾".' }
            ]
        }
    ]


    ,
    // ==========================================================
    // USINAGEM
    // ==========================================================
    'usinagem': [
        {
            id: '605800',
            nome: 'Operação de Fresadora',
            revisao: '00',
            dataRevisao: '10/12/2025',
            frequencia: 'Rotineira (OMS — oficina de moldes e segmentos)',
            responsavel: 'Técnico de Manutenção, Operador de Máquinas e Ferramentas e Mecânico',
            objetivo: 'Estabelecer um procedimento padronizado e seguro para a operação da fresadora ferramenteira Clark 2VM, garantindo a integridade do operador, do equipamento e a qualidade do serviço executado.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite', 'Capacete de segurança classe B', 'Protetor auricular concha ou plug', 'Óculos de segurança panorâmico', 'Óculos de segurança com grau (se necessário)', 'Luva contra agente', 'Luva de vaqueta', 'Luva malha de aço único'],
            recomendacoes: [
                'Realizar atividade com a camisa para dentro da calça.',
                'Antes de iniciar as atividades, passar creme de proteção para as mãos.',
                'Evitar roupas largas, correntes ou mangas soltas durante a operação.',
                'Nunca deixar a máquina em funcionamento sem supervisão.',
                'Respeitar os dispositivos NR12 da máquina durante toda a utilização.',
                'É proibido remover limalhas com o equipamento em rotação.',
                'É proibido usar adornos (pulseiras, cordão, brincos e outros).'
            ],
            ferramentas: ['Fresadora Clark 2VM', 'Mandris, castanhas', 'Ferramentas de corte', 'Brocas', 'Lubrificante', 'Instrumentos de medição (paquímetro, micrômetro)'],
            etapas: [
                { id: '1', texto: 'Verificar as condições do equipamento e sua limpeza', pontosChave: 'Efetuar o check list diário do equipamento.', seguranca: 'Antes de iniciar as atividades, passar creme de proteção para as mãos. Carga suspensa: ficar atento a sinais sonoros e não se expor ao raio de ação de cargas suspensas. Queda de mesmo nível: atenção a desníveis/buracos no piso, isolar locais ou utilizar proteções contra desníveis.' },
                { id: '2', texto: 'Verificar se a fresadora está desligada antes de qualquer ajuste', pontosChave: 'Garantir que a fresadora está desligada e com o botão de emergência acionado, garantindo o não funcionamento do equipamento durante o ajuste.', seguranca: 'Evitar roupas largas, correntes ou mangas soltas. Nunca deixar a máquina em funcionamento sem supervisão. Respeitar dispositivos NR12 da máquina durante toda a utilização.' },
                { id: '3', texto: 'Posicionamento da peça', pontosChave: 'Fixar a peça com firmeza na mesa (em morsa ou garras), garantindo que não se desloque durante a atividade. Verificar a centralização da peça em relação ao curso. Colocar a broca/suportes e apertar bem.', seguranca: 'Evitar roupas largas, correntes ou mangas soltas. Nunca deixar a máquina em funcionamento sem supervisão. Carga suspensa e queda de mesmo nível — atenção a desníveis. Corte: utilizar luvas durante o ajuste, centralização e fixação. Prensamento: não expor partes do corpo em local de prensamento.' },
                { id: '4', texto: 'Ajuste da fresadora para a atividade', pontosChave: 'Instalar e ajustar a ferramenta com altura e inclinação adequadas. Escolher a velocidade apropriada no seletor (178 a 4200rpm). Confirmar o sentido de corte e retorno da ferramenta.', seguranca: 'Prensamento: não expor partes do corpo em pontos de prensamento. Corte: ficar atento a pontos cortantes e perfurantes. Evitar roupas largas. Não utilizar luvas ou blusões durante a execução. Nunca deixar a máquina em funcionamento sem supervisão. Respeitar dispositivos NR12.' },
                { id: '5', texto: 'Ligar fresadora', pontosChave: 'Acionar a máquina no modo manual para testar movimentos. Iniciar operação com avanço leve, monitorando vibração e esforço. Usar refrigeração (se houver) ou aplicar óleo de corte manualmente. Realizar múltiplos passes se necessário, ajustando altura e avanço.', seguranca: 'Nunca tocar na peça ou na ferramenta com a máquina em movimento. Corte: retirar cavacos apenas com escova ou pincel, jamais com as mãos. Ser atingido por material cortante/perfurante — utilizar proteções NR12 e biombo se necessário. Não utilizar luvas ou blusões durante a execução. É proibido remover limalhas com a máquina em rotação. É proibido usar adornos. Respeitar dispositivos NR12.', meioAmbiente: 'Destinar resíduos (óleo de corte e cavacos do processo de usinagem) em local adequado.' },
                { id: '6', texto: 'Finalização da atividade', pontosChave: 'Após a operação, retornar o torpedo ao início. Desligar a máquina e aguardar a parada total. Limpar a peça, a mesa e a ferramenta.', seguranca: 'Corte: retirar cavacos apenas com escova ou pincel, jamais com as mãos. Prensamento: não expor partes do corpo em local de prensamento. Utilizar luvas durante o processo de limpeza da peça e da fresadora.' }
            ],
            anormalidades: [
                { anomalia: 'Fresadora não liga', acao: 'Acionar equipe elétrica para testes e correção.' },
                { anomalia: 'Manutenção na PR 146', acao: 'Isolar e sinalizar toda a área da usinagem e impedir acesso.' },
                { anomalia: 'Dispositivo NR12 danificado ou inexistente', acao: 'Providenciar a correção ou confecção do dispositivo.' },
                { anomalia: 'Manutenção na PR 146 e 221', acao: 'Efetuar o isolamento e paralisação das atividades na área de usinagem.' },
                { anomalia: 'Dificuldades de corte', acao: 'Efetuar a troca do inserto.' },
                { anomalia: 'Dificuldade de fixação do inserto', acao: 'Efetuar a troca da ferramenta.' }
            ]
        },
        {
            id: '605804',
            nome: 'Operação de Torno Convencional Romi S-20',
            revisao: '00',
            dataRevisao: '10/12/2025',
            frequencia: 'Rotineira (OMS — oficina de moldes e segmentos)',
            responsavel: 'Técnico de Manutenção, Inspetor, Líder de Manutenção (modalidade mecânica) e Mecânico',
            objetivo: 'Estabelecer diretrizes seguras e padronizadas para a operação do torno convencional, garantindo a qualidade do serviço e a segurança do operador.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite', 'Capacete de segurança classe B', 'Protetor auricular concha ou plug', 'Óculos de segurança panorâmico', 'Óculos de segurança com grau', 'Luva contra agente', 'Luva de vaqueta', 'Luva malha de aço único'],
            recomendacoes: [
                'Realizar atividade com a camisa para dentro da calça.',
                'Nunca operar o torno com roupas largas, gravatas ou mangas soltas.',
                'Manter cabelos presos.',
                'Não fazer uso de luvas ou blusões durante o funcionamento da máquina.',
                'Nunca deixar a máquina funcionando sem supervisão.',
                'Interromper imediatamente o trabalho em caso de ruído ou vibração anormal.',
                'Sempre fazer uso de todo dispositivo NR12 das máquinas operatrizes.'
            ],
            ferramentas: ['Torno mecânico convencional Romi S-20', 'Lunetas, mandris, castanhas', 'Ferramentas de corte (bitolas, pastilhas, suportes)', 'Lubrificante', 'Instrumentos de medição (paquímetro, micrômetro)'],
            etapas: [
                { id: '1', texto: 'Verificar as condições do equipamento e sua limpeza', pontosChave: 'Efetuar o check list diário do equipamento. Verificar lubrificação do equipamento. Verificar folgas nos eixos e barramentos.', seguranca: 'Corte: ao verificar folgas nos eixos e barramentos, ficar atento a pontos cortantes e perfurantes. Prensamento: não expor partes do corpo em locais de prensamento.' },
                { id: '2', texto: 'Checar todos os acionamentos da máquina', pontosChave: 'Girar manivela do eixo longitudinal e carro superior. Girar manivela do contraponto. Checar alavancas de avanço e de rosqueamento. Checar botões de liga/desliga e alavancas de operação. Antes de qualquer acionamento, certificar-se de que o movimento a ser executado seja no sentido correto — se não estiver, parar e comunicar a manutenção.', seguranca: 'Corte e prensamento: não expor partes do corpo em local de prensamento. Carga suspensa: atenção aos sinais sonoros da ponte, não ficar no raio de ação das cargas. Não usar luvas ou blusões durante acionamento de máquinas rotativas. Nunca deixar a máquina em funcionamento sem supervisão.' },
                { id: '3', texto: 'Verificar se o torno está desligado antes de qualquer ajuste', pontosChave: 'Garantir que o torno está desligado e com o botão de emergência acionado, garantindo o não funcionamento durante o ajuste.', seguranca: 'Evitar roupas largas, correntes ou mangas soltas. Respeitar dispositivos NR12. Carga suspensa: ficar fora do raio de ação da movimentação. Prensamento: não expor partes do corpo em pontos de prensamento e usar luvas durante a fixação.' },
                { id: '4', texto: 'Conferir a fixação da peça no mandril ou dispositivo de fixação', pontosChave: 'Abrir as castanhas da placa de acordo com o diâmetro da peça. Se necessário, utilizar ponte rolante ou talha para posicionamento. Usar relógio comparador ou apalpador para auxiliar na centralização. Usar chave sextavada tipo T quadrada e conferir aperto.', seguranca: 'Carga suspensa: ficar atento aos sinais sonoros e fora do raio de ação da movimentação, usar acessos seguros e isolar/sinalizar a área abaixo da PR durante manutenção. Bater contra: ao fixar o mandril, efetuar o aperto no sentido oposto do corpo, evitando que a chave escape e atinja partes do corpo. Prensamento: usar luvas durante a fixação.' },
                { id: '5', texto: 'Selecionar a ferramenta de corte adequada', pontosChave: 'Fixar ferramenta adequada ao trabalho utilizando chave de encaixe quadrado.', seguranca: 'Corte: utilizar luvas durante o posicionamento e a fixação, não expor partes do corpo a pontos cortantes/perfurantes. Prensamento: não expor partes do corpo em local de prensamento. Carga suspensa: mesmos cuidados de acesso e isolamento de PR.' },
                { id: '6', texto: 'Ajuste do ponto rotativo', pontosChave: 'Acionar a alavanca do mangote no sentido de encontro da peça e travar a alavanca de fixação do mangote. Atenção se o parafuso de fixação do mangote está frouxo.', seguranca: 'Prensamento e corte: atenção a pontos cortantes e de prensamento. Carga suspensa: mesmos cuidados. Nunca operar com roupas largas, gravatas ou mangas soltas. Manter cabelos presos. Não usar luvas/blusões durante o funcionamento. Nunca deixar a máquina funcionando sem supervisão. Interromper imediatamente em caso de ruído ou vibração anormal.' },
                { id: '7', texto: 'Ligar o torno com atenção ao som e comportamento da máquina', pontosChave: 'Sempre usinar com o desenho da peça e as ferramentas adequadas. Sempre usinar utilizando ordem de serviço. Havendo anomalia durante a operação, acionar o botão de emergência ou o cabo de segurança NR12.', seguranca: 'Nunca operar com roupas largas, gravatas ou mangas soltas. Manter cabelos presos. Não usar luvas/blusões durante o funcionamento. Nunca deixar a máquina funcionando sem supervisão. Interromper imediatamente em caso de ruído/vibração anormal. Ergonomia: atenção à postura, realizar pausas. Prensamento e carga suspensa: mesmos cuidados.', meioAmbiente: 'Fluidos e cavacos gerados durante a retirada de material podem contaminar água e solo, além de causar problemas de pele — usar luva adequada e notificar imediatamente qualquer vazamento constatado.' },
                { id: '8', texto: 'Realizar cortes leves inicialmente, ajustando conforme necessário', pontosChave: 'Nunca deixar a chave de mandril acoplada antes de ligar a máquina.', seguranca: 'Mesmos cuidados de roupas, cabelos e supervisão. Ser atingido por materiais da usinagem — usar proteções NR12 e biombo se necessário. Corte: não expor partes do corpo a materiais cortantes/perfurantes e não posicionar mãos sobre a peça para remoção de limalhas e cavacos durante o funcionamento. Carga suspensa: mesmos cuidados.' },
                { id: '9', texto: 'Remover cavacos presos na peça, caso necessário', pontosChave: 'Utilizar ferramenta para remover cavacos ou ar comprimido. Desligar a rotação da placa do torno para remoção dos cavacos.', seguranca: 'Em nenhuma hipótese utilizar as mãos diretamente para retirada do cavaco. Manter cabelos presos. Interromper imediatamente em caso de ruído/vibração anormal. Corte: utilizar luvas anticorte. Queimadura: não posicionar mãos sobre a peça quente após a usinagem — aguardar resfriamento e verificar temperatura com termômetro. Prensamento: não expor partes do corpo em local de prensamento. Carga suspensa: mesmos cuidados.' },
                { id: '10', texto: 'Acompanhar a operação mantendo distância segura', pontosChave: 'Fazer uso do lubrificante e monitorar o desgaste da ferramenta e da peça.', seguranca: 'Mesmos cuidados de roupas, cabelos e supervisão. Sempre usar todo dispositivo NR12 das máquinas operatrizes. Projeção de materiais: manter distância segura e usar as proteções NR12. Carga suspensa: mesmos cuidados.' },
                { id: '11', texto: 'Realizar ajustes e medições', pontosChave: 'Nunca realizar ajustes e medições com a máquina ligada.', seguranca: 'Mesmos cuidados de roupas, cabelos e supervisão. Queimadura: não posicionar mãos sobre a peça quente — aguardar resfriamento e verificar temperatura com termômetro. Prensamento: não expor partes do corpo em local de prensamento. Corte: usar luvas anticorte.', meioAmbiente: 'Fluidos e cavacos gerados durante a atividade podem contaminar água e solo — usar luva adequada.' },
                { id: '12', texto: 'Remover a peça do torno', pontosChave: 'Efetuar a desmontagem do mandril para remoção da peça.', seguranca: 'Queimadura: aguardar resfriamento da peça, verificar temperatura com termômetro. Prensamento: não expor partes do corpo em local de prensamento. Corte: usar luvas anticorte. Carga suspensa: mesmos cuidados. Ergonomia: não carregar peso maior que o suportado — usar ponte ou talha se necessário.' },
                { id: '13', texto: 'Desligar máquina (torno)', pontosChave: 'Desligar o torno após o término da usinagem, efetuar a limpeza do torno e da área ao redor, guardar ferramentas e instrumentos em locais adequados.', seguranca: 'Corte: não expor mãos e braços em locais perfurantes/cortantes. Queda de mesmo nível: utilizar acessos seguros e atenção a desníveis no piso. Em nenhuma hipótese utilizar as mãos diretamente para retirada do cavaco.', meioAmbiente: 'Fluidos e cavacos gerados durante a atividade podem contaminar água e solo — usar luva adequada.' }
            ],
            anormalidades: [
                { anomalia: 'Torno Horizontal Convencional reprovado na inspeção de pré-uso (checklist)', acao: 'Paralisar a atividade e comunicar o responsável para realizar as intervenções necessárias.' },
                { anomalia: 'Manutenção na PR 146', acao: 'Isolar e sinalizar toda a área da usinagem e impedir acesso.' },
                { anomalia: 'Dispositivo NR12 danificado ou inexistente', acao: 'Providenciar a correção ou confecção do dispositivo.' },
                { anomalia: 'Dificuldade de corte', acao: 'Efetuar a troca do inserto.' },
                { anomalia: 'Dificuldade de fixação do inserto', acao: 'Efetuar a troca da ferramenta.' }
            ]
        }
    ]


    ,
    // ==========================================================
    // LOGÍSTICA
    // ==========================================================
    'logistica': [
        {
            id: '603750',
            nome: 'Posicionamento e Movimentação dos Equipamentos das Máquinas 2, 3 e 4 pela OMS com a Carreta Rebaixada',
            revisao: '02',
            dataRevisao: '28/01/2026',
            frequencia: 'Diário',
            responsavel: 'Planejamento e logística, através da equipe de movimentação dos equipamentos',
            objetivo: 'Estabelecer diretrizes para as atividades de posicionamento e movimentação de equipamentos para a carreta rebaixada, mantendo a segurança e integridade dos executantes e das cargas a serem transportadas.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança incolor', 'Protetor auricular', 'Calçado de segurança com biqueira de aço', 'Colete refletivo'],
            recomendacoes: [
                'Utilizar somente EPIs fornecidos pela CSN.',
                'Não ficar sob carga suspensa, manter-se afastado.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.',
                'Verificar os riscos inerentes da área onde irá acontecer a movimentação dos equipamentos.',
                'Ao subir na carreta rebaixada, redobrar os cuidados, verificar sempre as condições ao redor, manter postura defensiva, nunca andar de costas, atenção com cabos ou outros meios que possam levar ao tropeço.',
                'Conhecer as ferramentas necessárias para execução do serviço — não é permitido improviso nem utilização de ferramentas danificadas.',
                'Utilizar suportes para transporte de equipamentos na parte central da carreta.',
                'Utilizar protetor de cantos sempre que estropos/cintas forem usados em contato com cantos vivos.',
                'A sinalização para ponte rolante só deve ser feita por colaboradores treinados e identificados com tarjeta verde no capacete.',
                'Proibido movimentar os equipamentos com pessoas sobre a prancha.'
            ],
            ferramentas: ['Gancho prolongado para direcionar a carga', 'Cordas ou cintas catracas para amarrar a carga', 'Manilhas', 'Jig', 'Estropo', 'Cintas', 'Escada de acesso'],
            etapas: [
                { id: '8.1.1', texto: 'Solicitar ao motorista o acesso com a carreta na entrada da OMS, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar o sinal sonoro da locomotiva. Atenção ao trânsito de pessoas, veículos e locomotiva. Sinalizar e auxiliar o motorista quanto ao posicionamento da carreta na entrada da OMS.', seguranca: 'Risco de colisão entre a locomotiva, carros, pessoas e a carreta rebaixada — sinalizar e orientar as pessoas/veículos ao redor e avisar o operador da locomotiva.' },
                { id: '8.1.2', texto: 'Solicitar ao operador de ponte rolante PR146, PR221 ou PR14 da OMS, via rádio comunicador na faixa 5, o atendimento para posicionar o suporte', pontosChave: 'Os suportes se encontram na área de suportes OMS. É de responsabilidade do mecânico treinado/habilitado a sinalização para o operador. Os mecânicos devem estropar o suporte e sinalizar para a carga ser posicionada na carreta, com auxílio do extensor, no centro (parte rebaixada). A carreta não pode sair da OMS sem o suporte para transporte (exceto segmento horizontal e straightner).', seguranca: 'Ter postura defensiva. Utilizar o extensor. Realizar check list das cintas, cabos e estropos. Utilizar rádio comunicador.' },
                { id: '8.1.3', texto: 'Movimentação e posicionamento do suporte e molde na carreta (parte rebaixada)', pontosChave: 'Solicitar ao operador da PR146 ou PR221, via rádio na faixa 5, o atendimento para pegar a cinta de 4 pontas (área de reparos de moldes). Estropar o molde com a cinta de 4 pontas. Sinalizar e direcionar os pés do molde no apoio do suporte (MCC#4) ou travar os pinos de fixação (MCC#2,3). Soltar a cinta e liberar a ponte. Solicitar ao motorista fixar a carga sobre a carreta.', seguranca: 'Atenção ao posicionamento dos ganchos da cinta no olhal antes de tensionar. Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso à carreta rebaixada. Realizar check list de cabos, cintas e estropos. Utilizar rádio comunicador.' },
                { id: '8.1.4', texto: 'Movimentação e posicionamento do suporte e segmentos na carreta (parte rebaixada)', pontosChave: 'Solicitar via rádio (faixa 5) o atendimento para posicionar o suporte do segmento (exceto horizontal e straightner) na parte central (rebaixada) da carreta. Estropar o suporte e sinalizar o posicionamento. Soltar o cabo de aço e liberar a ponte. Solicitar ao motorista fixar a carga. Para segmentos bow, horizontal e straightner, utilizar a PR14 e posicionar sobre a viga da carreta.', seguranca: 'Atenção ao posicionamento dos pinos de travamento antes de tensionar o cabo do Jig. Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso. Realizar check list de cabos, cintas e estropos. Utilizar rádio comunicador.' },
                { id: '8.1.5', texto: 'Movimentação e posicionamento do suporte e cadeiras na carreta (parte rebaixada)', pontosChave: 'Solicitar via rádio (faixa 5) o posicionamento do suporte de cadeiras no centro (parte rebaixada) da carreta, conforme demarcação. Soltar o cabo de aço e liberar a ponte. Estropar as cadeiras com cabo de aço e posicionar no suporte. Solicitar ao motorista fixar a carga.', seguranca: 'Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso. Realizar check list de cabos, cintas e estropos. Utilizar rádio comunicador.' },
                { id: '8.2.1', texto: 'Solicitar ao motorista sair com a carreta da OMS, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar sinal sonoro da locomotiva. Atenção ao trânsito de pessoas, veículos e locomotiva. Sinalizar e auxiliar o motorista quanto ao posicionamento na rua lateral à OMS.', seguranca: 'Risco de colisão entre locomotiva, carros, pessoas e carreta rebaixada — sinalizar e orientar pessoas/veículos ao redor.' },
                { id: '8.2.2', texto: 'Solicitar a passagem pela linha férrea do carro torpedo', pontosChave: 'Solicitar ao operador da locomotiva do carro torpedo a passagem, atenção ao alarme sonoro. Verificar luz de sinalização: vermelha aguardar, verde solicitar autorização para acessar.', seguranca: 'Risco de colisão entre a locomotiva e a carreta rebaixada.' },
                { id: '8.2.3', texto: 'Após passar pela linha férrea do carro torpedo, aguardar com a carreta ao lado da proteção do RH e solicitar ao Líder GAC o bloqueio para entrada no vão', pontosChave: 'Estacionar em local seguro para evitar projeção de material quente caso o RH esteja em funcionamento. Atenção aos equipamentos móveis na Ala de corrida 1 e 2. Caso o piso esteja desnivelado, solicitar retroescavadeira (raspador).', seguranca: 'Postura defensiva. Posicionar a carreta de forma que todos tenham visibilidade.' },
                { id: '8.4.1', texto: 'Etiquetar o acionamento do carro RH para que não haja possibilidade de movimentação', pontosChave: 'Solicitar ao líder GAC o bloqueio do carro e verificar se está sem acionamento. O bloqueio deve ser realizado na CABINE NORTE.' },
                { id: '8.4.2', texto: 'Após o equipamento etiquetado, estacionar a carreta na torre do carro panela (poço da máquina 3, veio E)', pontosChave: 'Solicitar a PR389, PR353 ou PR188 (equipe GLA) para retirada do equipamento. Pegar a cinta ou jig correto para estropagem e realizar a retirada do equipamento da carreta.', seguranca: 'Risco de queda do equipamento da ponte rolante — manter postura defensiva, ficar longe do raio de ação, utilizar cabos extensores ou corda conforme necessidade.' },
                { id: '8.4.3', texto: 'Descarregar o equipamento da carreta rebaixada para o terceiro piso na garagem da GLA', pontosChave: 'Com a Ponte Rolante, coletar o molde ou segmento na torre do carro RH (poço da máquina 3, veio E). Usar cinta ou jig correto para estropagem e retirada.', seguranca: 'Risco de projeção de material quente. Postura defensiva.' },
                { id: '8.4.4', texto: 'Carregar a carreta com o equipamento para a OMS', pontosChave: 'Com a Ponte Rolante, coletar o segmento ou molde na garagem da GLA e posicionar na carreta na torre do carro RH (poço da máquina 3, veio E).', seguranca: 'Risco de projeção de material quente. Postura defensiva.' },
                { id: '8.4.5', texto: 'Retirar a carreta do vão do RH', pontosChave: 'Verificar se não há manobra de equipamento ou transição de Ponte Rolante com panela antes de movimentar. Retirar a carreta da torre do RH e estacionar ao lado da proteção do RH.', seguranca: 'Risco de colisão ou de projeção de material quente.' },
                { id: '8.4.6', texto: 'Retirar a etiqueta de bloqueio do carro RH', pontosChave: 'Comunicar ao líder GAC para que efetue o desbloqueio do carro do RH.' },
                { id: '8.4.7', texto: 'Solicitar a passagem pela linha férrea do carro torpedo', pontosChave: 'Solicitar ao operador da locomotiva do carro torpedo a passagem, atenção ao alarme sonoro.', seguranca: 'Risco de colisão entre a locomotiva e a carreta rebaixada.' },
                { id: '8.4.8', texto: 'Solicitar ao motorista o acesso com a carreta na entrada da OMS, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar sinal sonoro da locomotiva. Atenção ao trânsito. Sinalizar e auxiliar o motorista.', seguranca: 'Risco de colisão entre locomotiva, carros, pessoas e carreta — sinalizar e orientar ao redor.' },
                { id: '8.4.9', texto: 'Estacionar a carreta na OMS' },
                { id: '8.4.10', texto: 'Solicitar a PR146, PR221 ou PR14 para retirada do equipamento da carreta rebaixada', pontosChave: 'Atenção à capacidade de carga da ponte rolante. Utilizar JIG ou cabo de aço conforme o peso do equipamento, respeitando as normas CSN para trabalho com carga suspensa.', seguranca: 'Risco de queda do equipamento da ponte rolante — manter postura defensiva, ficar longe do raio de ação, utilizar cabos extensores ou corda conforme necessidade.' },
                { id: '8.5.1', texto: 'Entrada pela Máquina 2 — verificar se o acesso ao galpão está desobstruído', pontosChave: 'Verificar se o local por onde a carreta irá passar está desobstruído.', seguranca: 'Risco de impacto da carreta com materiais ao redor, risco de atropelamento de pessoas.' },
                { id: '8.5.2', texto: 'Realizar o deslocamento da carretinha sentido norte e descarregar os equipamentos na área de destino', pontosChave: 'Ir até o painel de movimentação da carreta e movimentar até o local desejado.', seguranca: 'Risco de impacto por/contra — manter postura defensiva, saindo do raio de ação da carretinha.' },
                { id: '8.5.3', texto: 'Retirar a carreta do galpão e retornar para a OMS', pontosChave: 'Atenção ao sair do galpão pela linha férrea se a locomotiva está a caminho.', seguranca: 'Risco de colisão entre a carreta e a locomotiva — atenção aos alarmes sonoros e avisar o operador.' },
                { id: '8.6.1', texto: 'Entrada da carreta pelo Veio "E" — verificar passagem pela lateral do RH', pontosChave: 'Verificar obstrução por máquina ferramenta ou limpeza de panela; se houver, solicitar à GAC ou GOS.', seguranca: 'Risco de projeção de material a quente — postura defensiva. Risco de colisão entre a carreta e equipamentos móveis em trânsito nas alas de corrida 1 e 2.' },
                { id: '8.6.2', texto: 'Estacionar a carreta rebaixada ao lado da cabine da GLA do Veio "E"', pontosChave: 'Solicitar ao pessoal da GLA o operador de ponte PR189 para retirar o equipamento. Verificar se não há trânsito de pessoas ou materiais obstruindo a passagem.' },
                { id: '8.6.3', texto: 'Solicitar a PR189 para transportar os equipamentos sentido leste para a garagem na máquina 2', pontosChave: 'Verificar condições dos estropos e cintas utilizados.', seguranca: 'Postura defensiva ao subir e descer da carreta e ao manusear o equipamento. Utilizar ganchos extensores e cordas para guiar o equipamento.' },
                { id: '8.6.4', texto: 'Carregar equipamentos na carreta rebaixada no Veio "E"', pontosChave: 'Solicitar a PR189 para transportar as cadeiras que precisam ser reparadas na OMS, colocar no suporte da carreta usando os estropos, cintas ou jigs corretos.', seguranca: 'Postura defensiva ao subir e descer, utilizar ganchos extensores e cordas, utilizar suporte de transporte de cadeiras.' },
                { id: '8.6.5', texto: 'Retirar a carreta rebaixada do Veio "E" vindo para a oficina OMS', pontosChave: 'Verificar se o caminho está livre; se não, solicitar à GAC ou GOS. Atenção ao transitar pelo vão do RH e vãos "H"/"I".', seguranca: 'Risco de projeção de material a quente. Risco de colisão com equipamentos móveis nas alas de corrida 1 e 2.' },
                { id: '8.7', texto: 'Solicitar ao motorista o acesso com a carreta na entrada da OMS, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar sinal sonoro da locomotiva. Sinalizar e auxiliar o motorista.', seguranca: 'Risco de colisão entre locomotiva, carros, pessoas e carreta — sinalizar e orientar ao redor.' },
                { id: '8.7.1', texto: 'Estacionar a carreta na OMS' },
                { id: '8.7.2', texto: 'Solicitar a PR146, PR221 ou PR14 para retirada do equipamento da carreta rebaixada', pontosChave: 'Atenção à capacidade de carga da ponte rolante. Utilizar JIG ou cabo de aço conforme o peso, respeitando as normas CSN.', seguranca: 'Risco de queda do equipamento da ponte rolante — manter postura defensiva e distância do raio de ação.' }
            ],
            anexos: {
                titulo: 'Tabela de peso dos equipamentos OMS (limite PR146: 25 toneladas)',
                tabela: [
                    { descricao: 'Molde MCC#2 e 3', pesoT: 14.6, pesoJigT: 0, pesoTotalT: 14.6 },
                    { descricao: 'Molde MCC#4', pesoT: 18.3, pesoJigT: 0, pesoTotalT: 18.3 },
                    { descricao: 'Cadeiras MCC#2,3', pesoT: 3, pesoJigT: 0, pesoTotalT: 3 },
                    { descricao: 'Bender MCC#4', pesoT: 25, pesoJigT: 4.6, pesoTotalT: 29.6 },
                    { descricao: 'Segmento Bow MCC#4', pesoT: 38.3, pesoJigT: 4.6, pesoTotalT: 42.9 },
                    { descricao: 'Segmento Straightner R MCC#4', pesoT: 49.4, pesoJigT: 4.6, pesoTotalT: 54 },
                    { descricao: 'Segmento Horizontal MCC#4', pesoT: 49.4, pesoJigT: 4.6, pesoTotalT: 54 },
                    { descricao: 'Segmento Zero MCC#2 e 3', pesoT: 18.1, pesoJigT: 0.9, pesoTotalT: 19 },
                    { descricao: 'Segmento Grupo 1 MCC#2 e 3', pesoT: 22.1, pesoJigT: 1.2, pesoTotalT: 23.3 },
                    { descricao: 'Segmento Grupo 2 MCC#2 e 3', pesoT: 26.4, pesoJigT: 1.2, pesoTotalT: 27.6 },
                    { descricao: 'Segmento Grupo 3 MCC#2 e 3', pesoT: 32.5, pesoJigT: 1.2, pesoTotalT: 33.7 }
                ]
            }
        },
        {
            id: '603946',
            nome: 'Posicionamento e Movimentação dos Materiais com o Caminhão Munk',
            revisao: '01',
            dataRevisao: '19/02/2026',
            frequencia: 'Diário',
            responsavel: 'Planejamento e logística, através do time de movimentação dos materiais',
            objetivo: 'Estabelecer diretrizes para as atividades de posicionamento e movimentação de rolos e placas para o caminhão munk, mantendo a segurança e integridade dos executantes e das cargas a serem transportadas.',
            seguranca: ['Luva de vaqueta', 'Capacete com jugular', 'Óculos de Segurança incolor', 'Protetor auricular', 'Calçado de segurança com biqueira de aço', 'Colete refletivo'],
            recomendacoes: [
                'Utilizar somente EPIs fornecidos pela CSN.',
                'Não ficar sob carga suspensa, manter-se afastado.',
                'Para execução desta atividade o funcionário deverá ser treinado neste padrão.',
                'Verificar os riscos inerentes da área onde irá acontecer a movimentação dos materiais.',
                'Ao subir na carroceria do caminhão munk, redobrar os cuidados, manter postura defensiva, nunca andar de costas, atenção com cabos ou meios que possam causar tropeço.',
                'Não é permitido improviso nem uso de ferramentas danificadas.',
                'Utilizar suportes para transporte de materiais na carroceria conforme orientação do motorista.',
                'Ao subir e descer escadas do caminhão, manter o corpo de frente para as escadas com uso das mãos no corrimão.',
                'Utilizar protetor de cantos sempre que estropos/cintas forem usados em contato com cantos vivos.',
                'A sinalização para ponte rolante só deve ser feita por colaboradores treinados e identificados com tarjeta verde no capacete.',
                'Proibido movimentar os materiais com pessoas sobre a carroceria. Proibido patolar o caminhão com pessoas sobre a carroceria.'
            ],
            ferramentas: ['Gancho prolongado para direcionar a carga', 'Cordas ou cintas catracas para amarrar a carga', 'Manilhas', 'Jig', 'Estropo', 'Cintas'],
            etapas: [
                { id: '8.1.1', texto: 'Solicitar ao motorista o acesso com o caminhão munk na entrada da OMS ou OMR, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar sinal sonoro da locomotiva. Atenção ao trânsito de pessoas, veículos e locomotiva. Sinalizar e auxiliar o motorista.', seguranca: 'Risco de colisão entre locomotiva, carros, pessoas e caminhão — sinalizar e orientar ao redor, avisar o operador da locomotiva.' },
                { id: '8.1.2', texto: 'Solicitar ao operador de ponte rolante PR146, PR221, PR14 da OMS ou PR248, via rádio na faixa 5, o atendimento para posicionar o suporte dos rolos e placas', pontosChave: 'Os suportes se encontram na área de suportes OMS e OMR. É responsabilidade do mecânico treinado/habilitado a sinalização para o operador. Estropar o suporte e posicionar na carroceria com auxílio do extensor. O caminhão só deve sair da oficina com os suportes de rolos ou placas, conforme a movimentação.', seguranca: 'Postura defensiva. Utilizar o extensor. Realizar check list de cintas, cabos e estropos. Utilizar rádio comunicador.' },
                { id: '8.1.3', texto: 'Movimentação e posicionamento dos rolos (segmento zero / segmento grupo das MCCs 2,3 / desempenadeira das MCCs 2,3 / sistema de saída / moldes / bender e segmentos da MCC#4)', pontosChave: 'Solicitar ao operador PR146/PR221 (OMS) ou PR248 (OMR), via rádio faixa 5, o atendimento para pegar rolos. Sinalizar e direcionar os rolos no suporte da carroceria do caminhão. Soltar cinta/cabo e liberar a ponte. Solicitar ao motorista fixar a carga.', seguranca: 'Atenção ao posicionamento dos ganchos da cinta no olhal antes de tensionar. Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso. Realizar check list de cabos, cintas e estropos. Utilizar rádio comunicador e quebra-quina em uso de cintas.' },
                { id: '8.1.4', texto: 'Movimentação e posicionamento das placas dos moldes MCCs 2,3 e 4', pontosChave: 'Solicitar via rádio (faixa 5) o posicionamento das placas com suporte na carroceria, no local orientado pelo motorista. Estropar o suporte e as placas e sinalizar. Soltar cinta/cabo e liberar a ponte. Solicitar ao motorista fixar a carga.', seguranca: 'Atenção ao posicionamento das placas com o suporte na carroceria. Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso. Realizar check list. Utilizar rádio comunicador.' },
                { id: '8.1.5', texto: 'Movimentação e posicionamento dos materiais de rotina do abastecimento (motor, redutora, motoredutor, eixos, rolos, chapas)', pontosChave: 'Solicitar via rádio (faixa 5) o atendimento para posicionar os materiais na carroceria conforme orientação do motorista. Estropar e sinalizar. Soltar cinta/cabo e liberar a ponte. Solicitar ao motorista fixar a carga.', seguranca: 'Atenção ao posicionamento dos materiais com o suporte na carroceria. Utilizar manilhas ao estropar no olhal de motor, motoredutor, redutora e materiais com olhal. Postura defensiva. Risco de aprisionamento de membros. Utilizar escada de acesso. Realizar check list. Utilizar rádio comunicador.' },
                { id: '8.2.1', texto: 'Solicitar ao motorista sair com o caminhão da OMS/OMR, sendo auxiliado pelos mecânicos GMLC', pontosChave: 'Verificar sinal sonoro da locomotiva. Sinalizar e auxiliar o motorista quanto à saída das oficinas.', seguranca: 'Risco de colisão entre locomotiva, carros, pessoas e a carreta — sinalizar e orientar ao redor.' },
                { id: '8.2.2', texto: 'Para acessar o lingotamento contínuo, solicitar a passagem pela linha férrea do carro torpedo', pontosChave: 'Solicitar ao operador da locomotiva do carro torpedo a passagem, atenção ao alarme sonoro. Verificar luz de sinalização (vermelha aguardar, verde solicitar autorização).', seguranca: 'Risco de colisão entre a locomotiva e o caminhão munk.' },
                { id: '8.4.1', texto: 'Entrada pela Máquina 2 — verificar se o acesso ao galpão está desobstruído', pontosChave: 'Verificar se o local por onde o caminhão irá passar está desobstruído.', seguranca: 'Risco de impacto do caminhão com os materiais ao redor. Risco de atropelamento de pessoas.' },
                { id: '8.4.2', texto: 'Realizar o deslocamento da carretinha sentido norte e descarregar os equipamentos na área de destino', pontosChave: 'Ir até o painel de movimentação da carreta e movimentar até o local desejado.', seguranca: 'Risco de impacto por/contra — manter postura defensiva, saindo do raio de ação da carretinha.' },
                { id: '8.5.3', texto: 'Retirar o caminhão e retornar para a OMS', pontosChave: 'Atenção ao sair do galpão pela linha férrea se a locomotiva está a caminho.', seguranca: 'Risco de colisão entre a carreta e a locomotiva — atenção aos alarmes sonoros e avisar o operador.' },
                { id: '8.6', texto: 'Entrada do caminhão pelo Veio "E"', pontosChave: 'Atenção com movimentação de pessoas, equipamentos móveis e movimentação de panelas/cargas suspensas com as PRs.', seguranca: 'Risco de atropelamento de pessoas. Manter-se fora do raio de ação da carga suspensa. Risco de colisão entre o caminhão e equipamentos móveis em trânsito nas alas de corrida 1 e 2.' },
                { id: '8.6.1', texto: 'Verificar a passagem pela lateral do RH quanto a obstrução de máquina ferramenta ou limpeza de panela', pontosChave: 'Verificar se o caminho está livre; se não, solicitar à GAC ou GOS. Atenção ao transitar pelo vão do RH e vãos "H"/"I".', seguranca: 'Risco de projeção de material a quente — postura defensiva. Risco de colisão com equipamentos móveis nas alas de corrida 1 e 2.' },
                { id: '8.6.2', texto: 'Estacionar o caminhão munk ao lado da cabine da GLA do Veio "E"', pontosChave: 'Solicitar ao pessoal da GLA o operador de ponte PR189 para retirar o material. Verificar se não há trânsito de pessoas ou materiais obstruindo a passagem.' },
                { id: '8.6.3', texto: 'Solicitar a PR189 para transportar os materiais', pontosChave: 'Utilizar rádio comunicador na faixa 3. Verificar condições dos estropos e cintas. Posicionar os materiais na carroceria conforme orientação do motorista.', seguranca: 'Postura defensiva ao subir/descer e manusear o equipamento. Utilizar ganchos extensores e cordas. Manter-se fora do raio de ação da carga suspensa.' },
                { id: '8.6.4', texto: 'Retirar o caminhão munk do Veio "E"', pontosChave: 'Verificar se o caminho está livre; se não, solicitar à GAC ou GOS. Atenção ao transitar pelo vão do RH e vãos "H"/"I" e à movimentação da locomotiva na linha férrea.', seguranca: 'Risco de projeção de material a quente. Risco de colisão com equipamentos móveis nas alas de corrida 1 e 2.' },
                { id: '8.7', texto: 'Entrada do caminhão pelo empilhador 4', pontosChave: 'Verificar se o local está desobstruído e se há placas quentes ao redor.', seguranca: 'Risco de impacto do caminhão com materiais ao redor. Risco de atropelamento. Risco de danos ao caminhão por alta temperatura.' },
                { id: '8.7.1', texto: 'Solicitar a PR351 ou PR352 para transportar os materiais', pontosChave: 'Utilizar rádio comunicador na faixa 3. Verificar condições dos estropos e cintas. Posicionar os materiais conforme orientação do motorista.', seguranca: 'Postura defensiva ao subir/descer e manusear. Utilizar ganchos extensores e cordas. Manter-se fora do raio de ação da carga suspensa.' },
                { id: '8.7.2', texto: 'Retirar o caminhão munk do acesso do empilhador 4', pontosChave: 'Verificar se o caminho está livre; se não, solicitar à GPA. Atenção à movimentação das PRs transportando placas e da locomotiva na linha férrea.', seguranca: 'Risco de impacto com materiais ao redor, atropelamento, danos por alta temperatura, colisão com locomotiva.' },
                { id: '8.8', texto: 'Entrada do caminhão pelo pátio R4', pontosChave: 'Verificar se o local está desobstruído e se há placas quentes ao redor. Atenção ao sinal sonoro e luminoso da locomotiva.', seguranca: 'Risco de impacto, atropelamento, danos por alta temperatura, colisão com a locomotiva.' },
                { id: '8.8.1', texto: 'Solicitar a PR316 ou PR317 para transportar os materiais', pontosChave: 'Utilizar rádio comunicador na faixa 3. Verificar condições dos estropos e cintas. Posicionar os materiais conforme orientação do motorista.', seguranca: 'Postura defensiva ao subir/descer e manusear. Utilizar ganchos extensores e cordas. Manter-se fora do raio de ação da carga suspensa.' },
                { id: '8.8.2', texto: 'Retirar o caminhão munk do acesso do pátio R4', pontosChave: 'Verificar se o caminho está livre; se não, solicitar à GPA. Atenção à movimentação das PRs e da locomotiva na linha férrea.', seguranca: 'Risco de impacto, atropelamento, danos por alta temperatura, colisão com locomotiva.' },
                { id: '8.9', texto: 'Movimentação de materiais nos depósitos', pontosChave: 'É responsabilidade dos assistentes de materiais da GEAL realizar a movimentação e posicionamento na carroceria conforme orientação do motorista. Fazer sinalização ao motorista quanto ao acesso e saída dos galpões.', seguranca: 'Manter-se fora do raio de ação de carga suspensa. Risco de impacto do caminhão, atropelamento de pessoas, queda de material e impacto por/contra.' }
            ]
        },
        {
            id: '606068',
            nome: 'Procedimento Operacional Padrão — Ponte Rolante PR146',
            revisao: '05',
            dataRevisao: null,
            frequencia: 'Rotineira (OMS — oficina de moldes e segmentos)',
            responsavel: 'Operadores e colaboradores habilitados a operar (Staff, Supervisor, Técnico de Manutenção, Líder, Mecânico e Operadores de Ponte Rolante)',
            objetivo: 'Padronizar as atividades de forma a garantir segurança e qualidade nos atendimentos das movimentações e içamentos de carga, garantindo a segurança e integridade dos operadores e colaboradores da oficina.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite', 'Capacete de segurança classe B', 'Protetor auricular concha ou plug', 'Óculos de segurança panorâmico', 'Óculos de segurança com grau', 'Luva contra agente', 'Luva de vaqueta', 'Cinturão para-quedista único', 'Talabarte em Y único'],
            recomendacoes: [
                'A operação da ponte rolante somente pode ser executada por profissionais treinados e autorizados, conforme NR-11 e NR-12.',
                'É proibido o uso de adornos pessoais (brincos, anéis, pulseiras, colares, relógios) durante a operação ou em áreas de movimentação de carga.',
                'Antes de iniciar a operação, inspecionar visualmente cabos, ganchos, botoeiras, limitadores, freios e demais dispositivos, além de cintos e talabartes. Qualquer anomalia deve ser comunicada imediatamente à manutenção ou supervisão.',
                'É proibido o transporte de pessoas utilizando o gancho ou a carga.',
                'A carga deve ser içada de forma vertical, evitando arrastos.',
                'Nunca ultrapassar a capacidade de peso da ponte rolante. Evitar movimentos bruscos que possam causar balanço da carga.',
                'É expressamente proibido permanecer sob cargas suspensas ou permitir que terceiros permaneçam nessa área durante a operação.',
                'Após a operação: estacionar na garagem correta, suspender o gancho em altura segura, desligar a alimentação elétrica e registrar no checklist diário.'
            ],
            ferramentas: ['Ponte rolante PR146 (guincho principal 25 toneladas; guincho auxiliar não aplicável)'],
            especificacoes: [
                'Altura do piso ao centro do dromo: 10 metros.',
                'Limite admissível para operação com carga em ângulo: 3,5 graus ou ±0,5m — não é permitido operar com a carga em ângulo (ex.: arrastar peças ao solo).',
                'Durante a movimentação, acionar a sirene de forma intermitente para alertar pessoas no raio de ação da carga.',
                'A própria ponte rolante se caracteriza como carga suspensa.'
            ],
            etapas: [
                { id: '1', texto: 'Ter como item obrigatório', pontosChave: 'Colaborador treinado em NR11 (categoria B), NR12 e NR35 para trabalhos em altura. Treinado no procedimento 503600 (ISE30) — atividades em pontes rolantes, pórticos, semipórticos e talhas. Treinado no procedimento 601595 (ISE20) — estropagem, sinalização e movimentação de cargas. Portar habilitação (Formulário CSN-1155). Estar com o checklist (Formulário CSN-1747) e checklist de cintos/talabartes em mãos ou na cabine. Teste de prontidão realizado no dia.' },
                { id: '2', texto: 'Realizar inspeção prévia da ponte rolante', pontosChave: 'Fazer reunião relâmpago de segurança antes de iniciar. Verificar estado geral da ponte, cabos de aço, gancho, botoeira, limitadores e freios. Observar ausência de etiquetas/cadeados de segurança nas chaves gerais e manetes de comando. Ao subir, garantir acesso fechado por dentro. Testar comandos sem carga. Conferir sinalização de área livre. Verificar se há colaboradores abaixo da ponte antes da operação ou manutenção.', seguranca: 'Queda de carga: não operar com cabos danificados ou ganchos deformados. Queda de nível diferente: usar corrimão ao subir/descer escadas e cinto de segurança se necessário. Choque elétrico: não tocar em painéis energizados, manter portas trancadas. Prensagem: manter distância de partes móveis. Falha nos comandos: manter comunicação via rádio com equipe de solo. Queda de objetos: liberar operação após garantir isolamento total em manutenção sob a PR.' },
                { id: '3', texto: 'Içar carga com segurança', pontosChave: 'Centralizar o gancho sobre o centro de gravidade da carga. Elevar lentamente até poucos centímetros do solo para teste de equilíbrio. Confirmar amarração correta. Atenção à carga das peças, dentro da capacidade do guincho (25 toneladas). Atenção ao transladar a ponte para não colidir com outras pontes ou materiais estropados.', seguranca: 'Queda de carga: não ultrapassar capacidade nominal, não ficar no raio de ação. Prensagem: manter afastamento do corpo e das mãos. Falta de comunicação: manter contato visual e/ou via rádio com o sinaleiro. Manter postura defensiva. Utilizar sinal sonoro intermitente ao transitar. Não efetuar comando até garantir transporte seguro. Utilizar acessos seguros.' },
                { id: '4', texto: 'Transportar carga em deslocamento horizontal', pontosChave: 'Movimentar a carga de forma suave, sem trancos. Manter altura mínima necessária durante o deslocamento. Observar o trajeto livre de obstáculos.', seguranca: 'Balanço de carga: evitar movimentos bruscos. Colisão: verificar área livre e sinalizada. Atropelamento: manter pessoas afastadas da rota da carga. Sinal sonoro intermitente. Não efetuar comando sem garantir segurança. Utilizar acessos seguros.' },
                { id: '5', texto: 'Baixar carga com segurança', pontosChave: 'Baixar lentamente até o ponto de apoio. Garantir estabilidade antes de soltar o gancho. Remover dispositivos de içamento após a descarga.', seguranca: 'Prensagem: não colocar mãos entre carga e superfície. Queda de carga: não permanecer sob carga suspensa. Comunicação: confirmar finalização segura com a equipe. Sinal sonoro intermitente. Utilizar acessos seguros.' },
                { id: '6', texto: 'Estacionar a PR na garagem', pontosChave: 'Parar a ponte na garagem sem carga estropada. Verificar o desligamento dos comandos e energia do painel da PR. Trancar o portão de acesso e posicioná-lo sobre o claviculário na sala da supervisão.', seguranca: 'Carga suspensa: garantir que a ponte esteja sem carga estropada e suspensa. Risco de colisão: designar a PR na garagem para não haver colisão e circulação de pessoas abaixo.' }
            ],
            anormalidades: [
                { anomalia: 'Corte de energia ou parada súbita do equipamento', acao: 'O operador deve acionar o botão de emergência, sinalizar com a bandeira "PERIGO", solicitar isolamento da área e comunicar a supervisão imediata (via rádio), aguardando orientação.' },
                { anomalia: 'PR221 para manutenção ou preventiva', acao: 'Efetuar o isolamento do local e seu raio de ação, garantir o preenchimento de toda a documentação para liberação da área; após manutenção, o operador deve permanecer para efetuar todos os testes.' },
                { anomalia: 'Item não conforme com o check list', acao: 'Paralisar a PR e comunicar a supervisão e inspeção do equipamento.' }
            ],
            observacoes: 'Todas as ligas e jigues utilizados na oficina de moldes e segmento devem estar posicionados em cavaletes para que a ponte rolante consiga realizar o içamento; o auxílio ao operador da PR deve ser apenas com o extensor caso necessário.'
        },
        {
            id: '606069',
            nome: 'Procedimento Operacional da Ponte Rolante PR#221',
            revisao: '04',
            dataRevisao: null,
            frequencia: 'Rotineira (OMS — oficina de moldes e segmentos)',
            responsavel: 'Operadores e colaboradores habilitados a operar (Staff, Supervisor, Técnico de Manutenção, Líder, Mecânico e Operadores de Ponte Rolante)',
            objetivo: 'Padronizar as atividades de forma a garantir segurança e qualidade nos atendimentos das movimentações e içamentos de carga, garantindo a segurança e integridade dos operadores e colaboradores da oficina.',
            seguranca: ['Bota antitorção cano longo com biqueira de composite', 'Capacete de segurança classe B', 'Protetor auricular concha ou plug', 'Óculos de segurança panorâmico', 'Óculos de segurança com grau', 'Luva contra agente', 'Luva de vaqueta', 'Cinturão para-quedista único', 'Talabarte em Y único'],
            recomendacoes: [
                'A operação da ponte rolante somente pode ser executada por profissionais treinados e autorizados, conforme NR-11 e NR-12.',
                'É proibido o uso de adornos pessoais (brincos, anéis, pulseiras, colares, relógios) durante a operação ou em áreas de movimentação de carga.',
                'Antes de iniciar a operação, inspecionar visualmente cabos, ganchos, botoeiras, limitadores, freios e demais dispositivos, além de cintos e talabartes. Qualquer anomalia deve ser comunicada imediatamente à manutenção ou supervisão.',
                'É proibido o transporte de pessoas utilizando o gancho ou a carga.',
                'A carga deve ser içada de forma vertical, evitando arrastos.',
                'Nunca ultrapassar a capacidade de peso da ponte rolante. Evitar movimentos bruscos que possam causar balanço da carga.',
                'É expressamente proibido permanecer sob cargas suspensas ou permitir que terceiros permaneçam nessa área durante a operação.',
                'Após a operação: estacionar na garagem correta, suspender o gancho em altura segura, desligar a alimentação elétrica e registrar no checklist diário.'
            ],
            ferramentas: ['Ponte rolante PR221 (guincho principal 40 toneladas; guincho auxiliar 10 toneladas)'],
            especificacoes: [
                'Altura do piso ao centro do dromo: 10 metros.',
                'Limite admissível para operação com carga em ângulo: 3,5 graus ou ±0,5m — não é permitido operar com a carga em ângulo (ex.: arrastar peças ao solo).',
                'Durante a movimentação, acionar a sirene de forma intermitente para alertar pessoas no raio de ação da carga.',
                'A própria ponte rolante se caracteriza como carga suspensa.',
                'Além do sinal sonoro, a PR221 possui sinal visual com RED SPOT instalado, sinalizando o raio de ação do trânsito das cargas em movimentação.'
            ],
            etapas: [
                { id: '1', texto: 'Ter como item obrigatório', pontosChave: 'Colaborador treinado em NR11 (categoria B), NR12 e NR35 para trabalhos em altura. Treinado no procedimento 503600 (ISE30) — atividades em pontes rolantes, pórticos, semipórticos e talhas. Treinado no procedimento 601595 (ISE20) — estropagem, sinalização e movimentação de cargas. Portar habilitação (Formulário CSN-1155). Estar com o checklist (Formulário CSN-1747) e checklist de cintos/talabartes em mãos ou na cabine. Teste de prontidão realizado no dia.' },
                { id: '2', texto: 'Realizar inspeção prévia da ponte rolante', pontosChave: 'Fazer reunião relâmpago de segurança antes de iniciar. Verificar estado geral da ponte, cabos de aço, gancho, botoeira, limitadores e freios. Observar ausência de etiquetas/cadeados de segurança nas chaves gerais e manetes de comando. Ao subir, garantir acesso fechado por dentro. Testar comandos sem carga. Conferir sinalização de área livre. Verificar se há colaboradores abaixo da ponte antes da operação ou manutenção.', seguranca: 'Queda de carga: não operar com cabos danificados ou ganchos deformados. Queda de nível diferente: usar corrimão ao subir/descer escadas e cinto de segurança se necessário. Choque elétrico: não tocar em painéis energizados, manter portas trancadas. Prensagem: manter distância de partes móveis. Falha nos comandos: manter comunicação via rádio com equipe de solo. Queda de objetos: liberar operação após garantir isolamento total em manutenção sob a PR.' },
                { id: '3', texto: 'Içar carga com segurança', pontosChave: 'Centralizar o gancho sobre o centro de gravidade da carga. Elevar lentamente até poucos centímetros do solo para teste de equilíbrio. Confirmar amarração correta. Atenção à carga das peças, dentro da capacidade do guincho principal (40 toneladas) e auxiliar (10 toneladas). Atenção ao transladar a ponte para não colidir com outras pontes ou materiais estropados.', seguranca: 'Queda de carga: não ultrapassar capacidade nominal, não ficar no raio de ação. Prensagem: manter afastamento do corpo e das mãos. Falta de comunicação: manter contato visual e/ou via rádio com o sinaleiro. Manter postura defensiva. Utilizar sinal sonoro intermitente ao transitar. Não efetuar comando até garantir transporte seguro. Utilizar acessos seguros.' },
                { id: '4', texto: 'Transportar carga em deslocamento horizontal', pontosChave: 'Movimentar a carga de forma suave, sem trancos. Manter altura mínima necessária durante o deslocamento. Observar o trajeto livre de obstáculos.', seguranca: 'Balanço de carga: evitar movimentos bruscos. Colisão: verificar área livre e sinalizada. Atropelamento: manter pessoas afastadas da rota da carga. Sinal sonoro intermitente. Não efetuar comando sem garantir segurança. Utilizar acessos seguros.' },
                { id: '5', texto: 'Baixar carga com segurança', pontosChave: 'Baixar lentamente até o ponto de apoio. Garantir estabilidade antes de soltar o gancho. Remover dispositivos de içamento após a descarga.', seguranca: 'Prensagem: não colocar mãos entre carga e superfície. Queda de carga: não permanecer sob carga suspensa. Comunicação: confirmar finalização segura com a equipe. Sinal sonoro intermitente. Utilizar acessos seguros.' },
                { id: '6', texto: 'Estacionar a PR na garagem', pontosChave: 'Parar a ponte na garagem sem carga estropada. Verificar o desligamento dos comandos e energia do painel da PR. Trancar o portão de acesso e posicioná-lo sobre o claviculário na sala da supervisão.', seguranca: 'Carga suspensa: garantir que a ponte esteja sem carga estropada e suspensa. Risco de colisão: designar a PR na garagem para não haver colisão e circulação de pessoas abaixo.' }
            ],
            anormalidades: [
                { anomalia: 'Corte de energia ou parada súbita do equipamento', acao: 'O operador deve acionar o botão de emergência, sinalizar com a bandeira "PERIGO", solicitar isolamento da área e comunicar a supervisão imediata (via rádio), aguardando orientação.' },
                { anomalia: 'PR221 para manutenção ou preventiva', acao: 'Efetuar o isolamento do local e seu raio de ação, garantir o preenchimento de toda a documentação para liberação da área; após manutenção, o operador deve permanecer para efetuar todos os testes.' },
                { anomalia: 'Item não conforme com o check list', acao: 'Paralisar a PR e comunicar a supervisão e inspeção do equipamento.' }
            ],
            observacoes: 'Todas as ligas e jigues utilizados na oficina de moldes e segmento devem estar posicionados em cavaletes para que a ponte rolante consiga realizar o içamento; o auxílio ao operador da PR deve ser apenas com o extensor caso necessário.'
        }
    ]

};

window.PROCEDIMENTOS_POR_AREA = PROCEDIMENTOS_POR_AREA;
console.log("✅ procedimentosOficina.js carregado — procedimentos de Bender, Cadeira, Ferramentaria, Jato, Segmento Zero, Usinagem e Logística disponíveis.");