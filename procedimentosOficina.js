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
        }
    ]

};

window.PROCEDIMENTOS_POR_AREA = PROCEDIMENTOS_POR_AREA;
console.log("✅ procedimentosOficina.js carregado — procedimentos de Bender, Cadeira, Ferramentaria e Jato disponíveis.");