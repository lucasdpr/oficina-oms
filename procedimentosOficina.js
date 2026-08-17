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
    // CADEIRA (DESEMPENADEIRA)
    // ==========================================================
    'cadeira': [
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