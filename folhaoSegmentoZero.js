// ==========================================
// BANCO DE DADOS: MATERIAIS SEGMENTO ZERO
// ==========================================

const MATERIAIS_SEGMENTO_ZERO = [
    { codigo: "1205772", descricao: "ARRUELA DE PRESSÃO M16" },
    { codigo: "1203902", descricao: "ARRUELA DE PRESSAO M24 DIN 127" },
    { codigo: "1205307", descricao: "ARRUELA DE PRESSÃO M36" },
    { codigo: "1203775", descricao: "ARRUELA LISA M64 X 66MM X 115MM" },
    { codigo: "1777550", descricao: "BASE DESENHO HITACHI 0294000 MC.1 - PÉ" },
    { codigo: "1660305", descricao: "CARCAÇA DESENHO HITACHI 0144798 MC1 INFERIOR" },
    { codigo: "1660305", descricao: "CARCAÇA DESENHO HITACHI 0294079 MC1" },
    { codigo: "1660303", descricao: "CARCAÇA HITACHI 2245098 SUPERIOR" },
    { codigo: "1672147", descricao: "CARCAÇA LATERAL HITACHI 2253621 MC.1" },
    { codigo: "1672146", descricao: "CARCAÇA LATERAL HITACHI 2253621 MC.2" },
    { codigo: "8288919", descricao: "CONEXÃO 1/4\" COMPRESSÃO 188D-E-1" },
    { codigo: "9140946", descricao: "CORPO CSN DM613216 1" },
    { codigo: "1691878", descricao: "COTOVELO 1.1/4\" X 90º ROSCA BSP" },
    { codigo: "1064442", descricao: "COTOVELO 1/4\" X 90º" },
    { codigo: "8097039", descricao: "DISTRIBUIDOR GRAXA 3/8 X1/4\" NPTF 2 SAID" },
    { codigo: "1211859", descricao: "ENGATE RAPIDO 1.1/4\"" },
    { codigo: "1211500", descricao: "ENGATE RAPIDO 2\"" },
    { codigo: "1268070", descricao: "ENGATE RÁPIDO 3/8\" - GRAXA" },
    { codigo: "1195298", descricao: "FITA DE ARAMIDA 1\" X 1,7MM X 30 METROS" },
    { codigo: "1624645", descricao: "MANGUEIRA 3/8\" X 1400MM (GRAXA)" },
    { codigo: "1204966", descricao: "PARAF CB SEXT M16X140MM" },
    { codigo: "1204620", descricao: "PARAFUSO CABEÇA SEXT.M12 X 45MM - INOX" },
    { codigo: "8003560", descricao: "PARAFUSO CABEÇA SEXT.M16 X 70MM-INOX" },
    { codigo: "1628930", descricao: "PARAFUSO CABEÇA SEXT.M16 X 90MM-INOX" },
    { codigo: "1204624", descricao: "PARAFUSO CABEÇA SEXTAVADA M12 X 30MM" },
    { codigo: "8010789", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 115MM" },
    { codigo: "1221020", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 150MM" },
    { codigo: "1615479", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 160MM" },
    { codigo: "1615369", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 175MM" },
    { codigo: "1204967", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 180MM" },
    { codigo: "1205571", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 190MM" },
    { codigo: "1205334", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 200MM" },
    { codigo: "1205193", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 210MM" },
    { codigo: "1219654", descricao: "PARAFUSO CABEÇA SEXTAVADA M16 X 90MM" },
    { codigo: "1203880", descricao: "PARAFUSO CABEÇA SEXTAVADA M36 X 150MM" },
    { codigo: "1620873", descricao: "PARAFUSO CABEÇA SEXTAVADA M36 X 440MM" },
    { codigo: "1205431", descricao: "PARAFUSO CABEÇA SEXTAVADA M64 X 170MM" },
    { codigo: "1204965", descricao: "PARAFUSO CABEÇA SEXTAVADO M16 X 120MM" },
    { codigo: "1205144", descricao: "PARAFUSO CIL CL10.9 M16X 150MM" },
    { codigo: "1752138", descricao: "PINO HITACHI 0294015 2" },
    { codigo: "8500175", descricao: "PLACA HITACHI 0293493 1" },
    { codigo: "8500174", descricao: "PLACA HITACHI 0293493 2" },
    { codigo: "9272310", descricao: "PONTA UNIJET TP1285L - 12,3 L/MIN A 3,0 BAR" },
    { codigo: "9140945", descricao: "PORCA FIX. INOX PONTA UNIJET CSN DM613216 2" },
    { codigo: "1205361", descricao: "PORCA SEXTAVADA M12" },
    { codigo: "1204312", descricao: "PORCA SEXTAVADA M16" },
    { codigo: "1228240", descricao: "PORCA SEXTAVADA M24" },
    { codigo: "1206197", descricao: "PORCA SEXTAVADA M64" },
    { codigo: "1642482", descricao: "RESFRIADOR DESENHO HITACHI 0295300 MC.1" },
    { codigo: "1642484", descricao: "RESFRIADOR DESENHO HITACHI 0295300 MC.31" },
    { "codigo": "1642483", "descricao": "RESFRIADOR DESENHO HITACHI 0295301MC.12" },
    { codigo: "1642481", descricao: "RESFRIADOR DESENHO HITACHI 0295302 MC.25" },
    { codigo: "8287526", descricao: "TUBO DE COBRE 6,35MM X 0,79MM X 30M" },
    { codigo: "9182710", descricao: "TUBO FLEX SANF AISI304 1.1/4\" 2600MM" },
    { codigo: "1220355", descricao: "TUBO Ø 1.1/4 X 42,16 X 6M - AÇO INOX" },
    { codigo: "1726447", descricao: "UNIÃO 3/8\" INOX PARA SOLDA" },
    { codigo: "1220503", descricao: "UNIÃO DE 1.1/4\" - INOX - ROSCA NPT" },
    { codigo: "1064438", descricao: "UNIÃO PARA TUBO 1/4\"" },
    { codigo: "1779160", descricao: "VALVULA BM-7 (Distributor)" }
];

// ==========================================
// FUNÇÕES DE INTERFACE DO SEGMENTO ZERO
// ==========================================

window.abrirFolhaoSegmentoZero = function(idAtivo) {
    const modal = document.getElementById("modal-folhao-segmento-zero");
    if(modal) {
        modal.classList.remove("hidden");
        document.getElementById("segzero-tag-ativo").innerText = idAtivo || "SEGMENTO ZERO";
    } else {
        console.error("Modal do Segmento Zero não encontrado no HTML!");
    }
};

window.fecharFolhaoSegmentoZero = function() {
    const modal = document.getElementById("modal-folhao-segmento-zero");
    if(modal) modal.classList.add("hidden");
};

window.salvarFolhaoSegmentoZero = function() {
    alert("Dados do Segmento Zero salvos com sucesso!");
    window.fecharFolhaoSegmentoZero();
};