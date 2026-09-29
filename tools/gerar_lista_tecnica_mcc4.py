"""Gera JS/Paineis/listaTecnicaMCC4.js a partir de dados/lista_tecnica_mcc4.xlsx.

Rodar de novo sempre que a planilha for atualizada:
    python3 tools/gerar_lista_tecnica_mcc4.py
"""
import json
import re
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "dados" / "lista_tecnica_mcc4.xlsx"
SAIDA = RAIZ / "JS" / "Paineis" / "listaTecnicaMCC4.js"

# Ordem importa: a primeira regra que bater decide o conjunto.
REGRAS = [
    ("placaLarga", ["foot roll", "footroll", "placa larga", "backup"]),
    ("placaEstreita", ["placa estreita", "telesc", "caixa de transm", "caixas de transm", "cardan",
                       "sanfonad", "edge", "guia", "tartaruga", "calço placa", "chaveta"]),
    ("tubulao", ["tubulão"]),
    ("carcacaMovel", ["lado movel", "lado móvel"]),
    ("carcacaFixa", ["cilindro", "haste", "kit vedação", "lado fixo"]),
]


# Sugestões pros itens com APLICAÇÃO vazia na planilha — só onde dá pra
# ter segurança pelo próprio texto do item. Aparecem no painel marcadas
# "a confirmar". O que não está aqui fica sem peça até a planilha ser
# preenchida (a APLICAÇÃO da planilha sempre ganha da sugestão).
SUGESTOES = {
    # --- água principal / tubulão ---
    "1775081": ("tubulao", "Água Principal"), "9442127": ("tubulao", "Água Principal"),
    "1210714": ("tubulao", "Engate Água Principal"), "1625816": ("tubulao", "Flexível água"),
    "8012766": ("tubulao", "Engate Hidrogênio"),
    # --- hidráulica dos cilindros (carcaça fixa) ---
    "8012769": ("carcacaFixa", "Engate Hidráulica"), "8012768": ("carcacaFixa", "Engate Hidráulica"),
    "9414084": ("carcacaFixa", "Filtro hidráulico"), "9412817": ("carcacaFixa", "Filtro hidráulico"),
    "9412818": ("carcacaFixa", "Elemento filtro hidráulico"), "9384085": ("carcacaFixa", "Elemento filtro hidráulico"),
    "9245787": ("carcacaFixa", "Elemento filtro hidráulico"), "1756583": ("carcacaFixa", "Tubulação Hidráulica 12mm"),
    "8221482": ("carcacaFixa", "Tubulação Hidráulica 12mm"), "8360095": ("carcacaFixa", "Tubulação Hidráulica 12mm"),
    "8015014": ("carcacaFixa", "Tubulação Hidráulica 10mm"), "8015074": ("carcacaFixa", "Tubulação Hidráulica 10mm"),
    "1726158": ("carcacaFixa", "Tubulação Hidráulica 10mm"), "8695074": ("carcacaFixa", "Tubulação Hidráulica 10mm"),
    "9155560": ("carcacaFixa", "Abraçadeira Stauff (tubulação hidráulica)"),
    "9376806": ("carcacaFixa", "Rótula do cilindro"), "8893209": ("carcacaFixa", "Tomador de Pressão"),
    "8003102": ("carcacaFixa", "Fixação cilindro (BSA3953)"), "8003066": ("carcacaFixa", "Fixação cilindro (BSA3954)"),
    "8003068": ("carcacaFixa", "Fixação cilindro (BSA3955)"), "8003067": ("carcacaFixa", "Fixação cilindro (BSA3956)"),
    "8003103": ("carcacaFixa", "Fixação cilindro (BSA3957)"), "8001155": ("carcacaFixa", "Fixação cilindro (BSA3958)"),
    "9188821": ("carcacaFixa", "Parafuso Primetals"),
    # --- graxa do foot roll (placa larga) ---
    "9233741": ("placaLarga", "Distribuidor de Graxa"), "9442806": ("placaLarga", "O'ring distribuidor"),
    "1223276": ("placaLarga", "Parafuso de Montagem dos Distribuidores"), "8008911": ("placaLarga", "Válvula Lincoln (graxa)"),
    "8003032": ("placaLarga", "Mangueira de graxa"), "8003033": ("placaLarga", "Mangueira de graxa"),
    "8006022": ("placaLarga", "Mangueira de graxa"), "1010420": ("placaLarga", "Pino graxeiro"),
    "8877116": ("placaLarga", "União de Graxa 8mm"), "8009077": ("placaLarga", "Tubulação de graxa 8mm"),
    "1690728": ("placaLarga", "Tubulação de graxa 8mm"), "8288917": ("placaLarga", "Tubulação de graxa"),
    "1064445": ("placaLarga", "Tubulação de graxa"), "1064438": ("placaLarga", "Tubulação de graxa"),
    "8288919": ("placaLarga", "Tubulação de graxa"), "8003514": ("placaLarga", "Tubulação de graxa 10mm"),
    "8012767": ("placaLarga", "Engate Graxa"), "9271015": ("placaLarga", "Engate Graxa"),
    "8739838": ("placaLarga", "Calço do foot roll (VAI 2137/2138/2139)"), "8003091": ("placaLarga", "Bolacha do Clamp"),
    "8524233": ("placaLarga", "Flexível das Cangalhas"), "1755753": ("placaLarga", "Pino (desenho B-354724)"),
    # --- placa estreita ---
    "8012895": ("placaEstreita", "Gaxeta Telescópio"), "1059438": ("placaEstreita", "Porca de ajuste"),
    "8034239": ("placaEstreita", "Régua"), "8034280": ("placaEstreita", "Régua"),
    "8766465": ("placaEstreita", "Régua (BSA3919)"), "8031008": ("placaEstreita", "Bucha do pino excêntrico"),
    "8003096": ("placaEstreita", "Pino Excêntrico"), "8025597": ("placaEstreita", "Bucha do cardan (VAI 2174)"),
    "8125978": ("placaEstreita", "Arruela da tartaruga"),
    # --- carcaça móvel ---
    "8003142": ("carcacaMovel", "Proteção (BSA3835)"),
}
# Fixação sem aplicação: vai pela bitola (parafuso, arruela e porca da
# mesma medida ficam juntos na mesma peça).
POR_BITOLA = {
    "M24": ("carcacaFixa", "Fixação M24"), "M27": ("carcacaFixa", "Fixação M27"),
    "M20": ("placaLarga", "Fixação M20"), "M12": ("placaLarga", "Fixação M12"), "M13": ("placaEstreita", "Arruela da tartaruga"),
    "M16": ("placaEstreita", "Fixação M16"), "M10": ("placaEstreita", "Fixação M10"),
    "M6": ("placaEstreita", "Fixação M6"), "M5": ("placaEstreita", "Fixação M5"), "M8": ("carcacaMovel", "Fixação M8"),
}
MODELO = {"9531207"}
# Desligado: itens sem aplicação ficam sem peça até o supervisor preencher
# a coluna APLICAÇÃO. Pra voltar a usar as sugestões, trocar pra True.
USAR_SUGESTOES = False


def conjunto_de(aplicacao):
    a = (aplicacao or "").lower()
    if not a:
        return "geral"
    for chave, termos in REGRAS:
        if any(t in a for t in termos):
            return chave
    return "geral"


def bitola_de(texto):
    t = texto.upper()
    if not re.search(r"PARAF|ARRUELA|PORCA", t):
        return None
    m = re.search(r"\bM\s?(\d{1,2})(?!\d)", t)
    return f"M{m.group(1)}" if m else None


def num(v):
    if v is None or v == "":
        return None
    try:
        f = float(str(v).replace(",", "."))
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def main():
    ws = openpyxl.load_workbook(ENTRADA, data_only=True).active
    atualizado = ws.cell(1, 6).value
    itens = []
    for linha in ws.iter_rows(min_row=4, values_only=True):
        codigo, texto = linha[0], linha[1]
        if codigo is None or not texto:
            continue
        texto = str(texto).strip()
        aplicacao = (str(linha[7]).strip() if linha[7] else "")
        conjunto = conjunto_de(aplicacao) if aplicacao else None
        sugestao = False
        cod = str(codigo).strip()
        bit = bitola_de(texto)
        if cod in MODELO:
            conjunto = "modelo"
        elif conjunto in (None, "geral") and USAR_SUGESTOES:
            if cod in SUGESTOES:
                conjunto, apl = SUGESTOES[cod]
            elif "INOX" in texto.upper() and bit == "M10":
                conjunto, apl = "tubulao", "Fixação M10 inox"
            elif bit in POR_BITOLA:
                conjunto, apl = POR_BITOLA[bit]
            else:
                apl = None
            if apl:
                aplicacao = aplicacao or apl
                sugestao = True
        itens.append({
            "codigo": str(codigo).strip(),
            "texto": texto,
            "qtd": num(linha[2]),
            "un": linha[5] or "",
            "aplicacao": aplicacao,
            "conjunto": conjunto,
            "sugestao": sugestao,
            "bitola": bitola_de(texto),
        })
    dados = {"equipamento": "Molde MCC#4", "atualizado": str(atualizado or ""), "itens": itens}
    SAIDA.write_text(
        "// GERADO por tools/gerar_lista_tecnica_mcc4.py a partir de dados/lista_tecnica_mcc4.xlsx — não editar à mão.\n"
        "export const LISTA_TECNICA_MCC4 = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    contagem = {}
    for i in itens:
        contagem[i["conjunto"]] = contagem.get(i["conjunto"], 0) + 1
    print(len(itens), "itens", contagem)


if __name__ == "__main__":
    main()
