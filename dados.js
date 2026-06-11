export const MOTIVOS_RETIRO = {
    "Molde": ["Desgaste de placa", "Ranhura de placa", "Falha no cilindro", "Fim de vida", "Trava da bender", "Alarme de B.O", "B.O", "Rolete travado", "Outros"],
    "Segmento Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Horizontal": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Bow": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Straightener": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Bender": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Seguimento Zero": ["Blackout", "Fim de vida", "Vazamento de graxa", "Placa na linha", "Transpordo", "Vazão", "Rolo travado", "Outros"],
    "Cadeira Superior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
    "Cadeira Inferior": ["Empeno", "Desgaste", "Rolo quebrado", "Vazamento de cilindro", "Vazamento de graxa", "Refrigeração", "Trinca", "Fim de vida", "Outros"],
    "Mesa Osciladora": ["Desgaste", "Falha mecânica", "Fim de vida", "Outros"],
    "Outros": ["Fim de vida", "Quebra", "Manutenção Preventiva", "Outros"]
};

export const CHECKLIST_RECEBIMENTO = [
    "Os engates rápidos do sistema hidráulico e nitrogênio estão completos e em perfeitas condições?",
    "Os flexíveis das faces estreitas e spray estão amassados e/ou danificados?",
    "Verificar se existe alguma tubulação hidráulica amassada e/ou danificada?",
    "Teste de água com pressão de 10 KGF/cm2 c/ tempo de 30 minutos conforme?",
    "Sensor vuhz se encontra em perfeitas condições?",
    "Verificar se todos os conectores de termopares estão em perfeitas condições e funcionando?",
    "As cangalhas de spray estão em perfeitas condições, sem avarias?",
    "Proteções sanfonadas encontram-se em perfeitas condições?",
    "Tampas e réguas guias das placas estão em perfeitas condições?",
    "Os foot-roll e roletes das guias laterais estão em perfeitas condições?",
    "O sistema de lubrificação possui alguma avaria?",
    "As placas de cobre possuem ferimentos e/ou arranhões profundos na face de trabalho?",
    "As juntas de expansão das placas principais estão em perfeitas condições?",
    "Parafusos de fixação do molde no stand estão completos e em perfeitas condições?",
    "(ELÉTRICA) Conectores do detector de break-out das faces larga estão tampados e em perfeitas condições?",
    "(ELÉTRICA) Cabos elétricos dos termopares do detector de break-out das faces estreitas estão em perfeitas condições?"
];

export const CHECKLIST_REVISAO = [
    "Inspeção das proteções sanfonadas dos cilindros das faces estreitas, substituindo as que estiverem danificadas.",
    "Inspeção das proteções sanfonadas dos fusos dos castelos quadrados, substituindo as danificadas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos de porcas e contra porcas.",
    "Inspeção, reparo (se necessário) e lubrificação dos conjuntos do castelo quadrado.",
    "Inspeção das hastes dos cilindros das faces estreitas, verificando avarias e vazamentos de óleo.",
    "Inspeção dos cilindros do clamp de abertura da face larga, substituindo os com vazamento.",
    "Inspeção do filtro de óleo do sistema hidráulico, verificando se não está sujo.",
    "Inspeção e lubrificação nos olhais e nas chavetas de fixação das placas laterais.",
    "Inspeção, revisão e lubrificação dos eixos e mancais deslizantes (caixa louca).",
    "Inspeção em todo sistema de lubrificação, corrigindo anomalias. Testar válvulas de graxa.",
    "Inspeção das condições dos flexíveis de água, substituindo os danificados.",
    "Inspeção, revisão e lubrificação dos parafusos de fixação do molde no stand.",
    "Inspeção das tubulações hidráulicas (conferir aperto das conexões).",
    "Alinhar os fusos dos castelos quadrados na medida padrão de 210mm.",
    "Lubrificar e amaciar os fusos do ajuste mecânico.",
    "Inspeção das juntas de expansão (trocar se necessário)."
];

export const CHECKLIST_HIDRAULICA = [
    "Check dos cilindros de ajuste de largura do molde.",
    "Verificar vazamento de graxa nas conexões.",
    "Verificar vazamento de óleo nas conexões.",
    "Inspecionar o elemento filtrante da linha de pressão hidráulica e trocar se necessário.",
    "Lubrificação geral de componentes.",
    "Verificar vazamento em mangueiras e dosador, substituir se necessário.",
    "Efetuar a limpeza dos engates hidráulicos.",
    "Embalar engates hidráulicos."
];

export const CHECKLIST_FINAL = [
    "Indicadores de pressão de ajuste das molas da placa lado móvel estão completos e alinhados?",
    "Tampa de proteção do molde NÃO está tocando sobre a tubulação de sangria das placas?",
    "Placas de proteção estão calafetadas com fita, desempenadas, alinhadas e fixadas?",
    "Posicionamento dos flexíveis superiores e inferiores estão conformes?",
    "Teste de água com pressão de 10 KGF/cm2 c/ tempo de 30 minutos conforme?",
    "Proteções sanfonadas estão fixadas?",
    "Foot-roll e roletes das guias laterais estão lubrificados e girando normalmente?",
    "Alinhamento dos bicos de spray das faces largas e estreitas?",
    "Parafusos de fixação do molde na máquina estão completos e lubrificados?",
    "Sensor Vuhz está montado corretamente e testado?",
    "A precisão de movimento das faces estreitas estão conforme?",
    "Funcionamento correto das válvulas distribuidoras de graxa, conexões marcadas?",
    "Réguas do ajuste mecânico estão livres e lubrificadas corretamente?",
    "Folga na aresta das faces das placas estreitas e largas (<= 0,35mm)?",
    "Cavidade interna do molde limpa?",
    "Centro do molde está identificado na placa norte e visível ao operador?",
    "Conectores dos termopares das placas estão limpos e tampados?",
    "Teste de profundidade está conforme?",
    "Engates rápidos (hidráulico, N2, graxa) com vedações completas, apertados e limpos?",
    "Base de vedação do molde está limpa e lixada?",
    "Os conectores dos DBO estão todos tamponados e protegidos?"
];
// ==========================================
// NOVOS CHECKLISTS INTELIGENTES POR EQUIPAMENTO
// ==========================================
export const BIBLIOTECA_CHECKLISTS = {
    "Molde": [
        "Os engates rápidos do sistema hidráulico e de nitrogênio estão completos?",
        "Os flexíveis das faces estreitas e spray estão amassados ou danificados?",
        "Existe alguma tubulação hidráulica amassada ou danificada?",
        "Teste de água com pressão de 10 KGF/cm² por 30 minutos realizado?",
        "Conectores de termopares em perfeitas condições?"
    ],
    "Bender": [
        "LUBRIFICAÇÃO: Sistema de lubrificação isento de vazamentos.",
        "REFRIGERAÇÃO: Resfriadores completos e alinhados.",
        "CILINDROS: Isento de vazamento hidráulico.",
        "ESTRUTURA: Rolos Lubrificados e girando normalmente."
    ],
    "Bow": [
        "LUBRIFICAÇÃO: Sistema isento de vazamentos.",
        "REFRIGERAÇÃO: Bicos obstruídos e flexíveis isentos de vazamentos.",
        "PORCA HIDRÁULICA: Isenta de vazamento e conexões apertadas."
    ],
    "Straightener": [
        "HIDRÁULICA: Ausência de vazamentos nos cilindros.",
        "MECÂNICA: Alinhamento dos rolos tracionadores confirmado."
    ],
    "Horizontal": [
        "ESTRUTURA: Condição da estrutura do segmento está OK.",
        "ROLETES: Girando livremente sem travamentos."
    ]
};