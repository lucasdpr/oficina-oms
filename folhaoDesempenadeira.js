// ==========================================
// BANCO DE DADOS: MATERIAIS DESEMPENADEIRA
// ==========================================

const MATERIAIS_CADEIRA_INFERIOR = [
    { codigo: "8008878", descricao: "ACOPLAMENTO DESENHO CSN DM-028275" },
    { codigo: "1210851", descricao: "ANEL O'RING 139,40 X 3,10MM - MANGA" },
    { codigo: "1646007", descricao: "ANEL O'RING 199,30MM X 5,70MM -ESPAÇADOR" },
    { codigo: "1205526", descricao: "ARRUELA DE PRESSÃO M10" },
    { codigo: "1606249", descricao: "ARRUELA DE PRESSÃO M12 INOX" },
    { codigo: "1205317", descricao: "ARRUELA DE PRESSÃO M20" },
    { codigo: "8061614", descricao: "ARRUELA DE SEGURANÇA NTN MB-30 - ARANHA" },
    { codigo: "1640576", descricao: "BUCHA HITACHI 0296769 MC.7-TAMPA INTERNA" },
    { codigo: "8005265", descricao: "CHAVETA DESENHO HITACHI 0294751 MC.3" },
    { codigo: "1640573", descricao: "ESPAÇADOR HITACHI 0296769 MC.3 - MANGA" },
    { codigo: "1640569", descricao: "ESPAÇADOR HITACHI 0296770 MC.4 - G.INF" },
    { codigo: "1640570", descricao: "ESPAÇADOR HITACHI 0296770 MC.5 - P.INF" },
    { codigo: "1640555", descricao: "GUIA HITACHI 0294770 MC.1 - LISO-10" },
    { codigo: "1640559", descricao: "GUIA HITACHI 0294770 MC.2 - LISO-20" },
    { codigo: "1640560", descricao: "GUIA HITACHI 0294770 MC.3 - LISO - 30" },
    { codigo: "1640556", descricao: "GUIA HITACHI 0294770 MC.4 - PEQ.-10" },
    { codigo: "1640561", descricao: "GUIA HITACHI 0294770 MC.5 - PEQ.-20" },
    { codigo: "1640562", descricao: "GUIA HITACHI 0294770 MC.6 - PEQ.-30" },
    { codigo: "1640553", descricao: "GUIA HITACHI 0294771 MC.4 - 2-SAL-10" },
    { codigo: "1640567", descricao: "GUIA HITACHI 0294771 MC.5 - 2-SAL-20" },
    { codigo: "1640568", descricao: "GUIA HITACHI 0294771 MC.6 - 2-SAL-30" },
    { codigo: "1640553", descricao: "GUIA HITACHI 0294771 MC.7 - 1-SAL-10" },
    { codigo: "1640566", descricao: "GUIA HITACHI 0294771 MC.8 - 1-SAL-20" },
    { codigo: "1640565", descricao: "GUIA HITACHI 0294771 MC.9 - 1-SAL-30" },
    { codigo: "9227139", descricao: "JUNTA DEUBLIN 2425000003 1,2 - (DUO -ROLO ACIONADO)" },
    { codigo: "9155306", descricao: "JUNTA DEUBLIN 2425000004 1, 2 (MONO - ROLO NÃO ACIONADO)" },
    { codigo: "1640582", descricao: "MANCAL HITACHI 0294049 MC.1- INF 400MM" },
    { codigo: "1640583", descricao: "MANCAL HITACHI 0294050 MC.1- INF.420MM" },
    { codigo: "1204944", descricao: "PARAFUSO CABEÇA SEXTAVADA M10 X 45MM" },
    { codigo: "1221385", descricao: "PARAFUSO SEXT AISI316 M12X 30MM (Junta Rotativa)" },
    { codigo: "1620774", descricao: "PARAFUSO SEXT CL8.8 M12X 25MM (Junta Rotativa)" },
    { codigo: "1042518", descricao: "PINO GRAXEIRO 1/8\" TIPO RETO - BOZZA 627" },
    { codigo: "1740070", descricao: "PORCA DESENHO HITACHI 0296769 MC.2" },
    { codigo: "1210487", descricao: "RETENTOR DI 160 X DE 190 X 16MM - VITON" },
    { codigo: "1640578", descricao: "RETENTOR DI 190 X DE 220 X 15MM - VITON" },
    { codigo: "1639748", descricao: "ROLAMENTO 24032 MB-W33-C4S1" },
    { codigo: "1640571", descricao: "TAMPA HITACHI 0296769 MC.1 - EXTERNA" },
    { codigo: "1640576", descricao: "TAMPA HITACHI 0296769 MC.6 - INTERNA" },
    { codigo: "1639420", descricao: "PARAFUSO CABEÇA CIL.SEXT.INT.M20 X 45MM" },
    { codigo: "8023476", descricao: "PARAFUSO CABEÇA CIL.SEXT.INT.M20 X 50MM" },
    { codigo: "8011321", descricao: "PAPELAO HIDR ARAMIDA 1,6X 1500X 1600MM" }
];

const MATERIAIS_CADEIRA_SUPERIOR = [
    { codigo: "1219088", descricao: "ANEL ELASTICO TIPO \"E\" 55MM" },
    { codigo: "8003064", descricao: "ANEL O'RING 11 X 3,00MM - VITON" },
    { codigo: "1210851", descricao: "ANEL O'RING 139,40 X 3,10MM - MANGA" },
    { codigo: "1646007", descricao: "ANEL O'RING 199,30MM X 5,70MM -ESPAÇADOR" },
    { codigo: "1205526", descricao: "ARRUELA DE PRESSÃO M10" },
    { codigo: "1606249", descricao: "ARRUELA DE PRESSÃO M12 INOX" },
    { codigo: "1205317", descricao: "ARRUELA DE PRESSÃO M20" },
    { codigo: "8061614", descricao: "ARRUELA DE SEGURANÇA NTN MB-30 - ARANHA" },
    { codigo: "1640576", descricao: "BUCHA HITACHI 0296769 MC.7-TAMPA INTERNA" },
    { codigo: "1216378", descricao: "BUCHA REDUÇÃO 1/2\" X 3/8\" - BSP" },
    { codigo: "8023215", descricao: "BUJAO Ø 1/4\" SEXTAVADO INTERNO - INOX" },
    { codigo: "1059049", descricao: "CONTRA PINO 3/8\" X 5\" COMPRIMENTO" },
    { codigo: "1083053", descricao: "COTOVELO MACHO/FEMEA 1\" - TIPO CACHIMBO" },
    { codigo: "1640573", descricao: "ESPAÇADOR HITACHI 0296769 MC.3 - MANGA" },
    { codigo: "1640574", descricao: "ESPAÇADOR HITACHI 0296769 MC.4 - P.SUP." },
    { codigo: "1640575", descricao: "ESPAÇADOR HITACHI 0296769 MC.5 - G.SUP" },
    { codigo: "1195185", descricao: "GRAMPO TIPO \"U\" DE 1\" - INOX" },
    { codigo: "1640555", descricao: "GUIA HITACHI 0294770 MC.1 - LISO-10" },
    { codigo: "1640558", descricao: "GUIA HITACHI 0294770 MC.12-PINO MANCAL30" },
    { codigo: "1640563", descricao: "GUIA HITACHI 0294770 MC.13 - PINO MANCAL" },
    { codigo: "1640564", descricao: "GUIA HITACHI 0294770 MC.14-PINO MANCAL50" },
    { codigo: "1640559", descricao: "GUIA HITACHI 0294770 MC.2 - LISO-20" },
    { codigo: "1640560", descricao: "GUIA HITACHI 0294770 MC.3 - LISO - 30" },
    { codigo: "1640556", descricao: "GUIA HITACHI 0294770 MC.4 - PEQ.-10" },
    { codigo: "1640561", descricao: "GUIA HITACHI 0294770 MC.5 - PEQ.-20" },
    { codigo: "1640562", descricao: "GUIA HITACHI 0294770 MC.6 - PEQ.-30" },
    { codigo: "1640553", descricao: "GUIA HITACHI 0294771 MC.4 - 2-SAL-10" },
    { codigo: "1640567", descricao: "GUIA HITACHI 0294771 MC.5 - 2-SAL-20" },
    { codigo: "1640568", descricao: "GUIA HITACHI 0294771 MC.6 - 2-SAL-30" },
    { codigo: "1640554", descricao: "GUIA HITACHI 0294771 MC.7 - 1-SAL-10" },
    { codigo: "1640566", descricao: "GUIA HITACHI 0294771 MC.8 - 1-SAL-20" },
    { codigo: "1640565", descricao: "GUIA HITACHI 0294771 MC.9 - 1-SAL-30" },
    { codigo: "9155306", descricao: "JUNTA DEUBLIN 2425000004 1, 2 (MONO)" },
    { codigo: "8038832", descricao: "LUVA CONFORME DESENHO CSN-DH048001 MC1" },
    { codigo: "8038831", descricao: "LUVA CONFORME DESENHO CSN-DH048001 MC2" },
    { codigo: "1639859", descricao: "MANCAL HITACHI 0294045 MC.1-SUP.FIXO 400" },
    { codigo: "1640579", descricao: "MANCAL HITACHI 0294046 MC.1- SUP.MOV.400" },
    { codigo: "1640580", descricao: "MANCAL HITACHI 0294047 MC.1-SUP.FIXO 420" },
    { codigo: "1640581", descricao: "MANCAL HITACHI 0294048 MC.1-SUP.MOV 420" },
    { codigo: "1268042", descricao: "MANGUEIRA SBR 9,5 X 650MM" },
    { codigo: "9265349", descricao: "MANGUEIRA SBR 12,7 X 600MM (COD.ANTIGO 1268039)" }
];

// ==========================================
// FUNÇÕES DE INTERFACE (AMARRADAS NO WINDOW)
// ==========================================

window.abrirFolhaoDesempenadeira = function(idAtivo) {
    // 1. Aqui vamos limpar os campos quando abrir
    // 2. Mostrar o Modal na tela
    const modal = document.getElementById("modal-folhao-desempenadeira");
    if(modal) {
        modal.classList.remove("hidden");
        document.getElementById("desemp-tag-ativo").innerText = idAtivo || "CADEIRA - DESEMPENADEIRA";
    } else {
        console.error("Modal de desempenadeira não encontrado no HTML!");
    }
};

window.fecharFolhaoDesempenadeira = function() {
    const modal = document.getElementById("modal-folhao-desempenadeira");
    if(modal) modal.classList.add("hidden");
};

window.salvarFolhaoDesempenadeira = function() {
    // Aqui vai entrar a lógica pesada de puxar os dados, 
    // os checkboxes de inspeção e gerar o PDF depois.
    alert("Dados da Desempenadeira salvos com sucesso!");
    window.fecharFolhaoDesempenadeira();
};