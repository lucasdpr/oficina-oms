<script src="gas-api.js"></script>


function doGet(e) {
  const acao = e.parameter.acao;
  
  if (acao === 'getOficina') {
    return getOficinaData();
  }
  
  return ContentService.createTextOutput('Ação não reconhecida');
}

function doPost(e) {
  const dados = JSON.parse(e.postData.contents);
  const acao = dados.acao;
  
  if (acao === 'updateOficina') {
    return updateOficina(dados);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ erro: 'Ação não reconhecida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOficinaData() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName('OFICINA');
  
  if (!aba) {
    return ContentService.createTextOutput(JSON.stringify({ erro: 'Aba OFICINA não encontrada' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0];
  const linhas = dados.slice(1);
  
  // Converte para array de objetos JSON
  const resultado = linhas.map(linha => {
    const obj = {};
    cabecalho.forEach((coluna, index) => {
      obj[coluna] = linha[index];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}
function updateOficina(dados) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName('OFICINA');
  
  if (!aba) {
    return ContentService.createTextOutput(JSON.stringify({ erro: 'Aba OFICINA não encontrada' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Exemplo: atualiza o % de conclusão de uma atividade específica
  const todasLinhas = aba.getDataRange().getValues();
  const cabecalho = todasLinhas[0];
  
  // Encontra a coluna "ID" ou "ATIVIDADE" para localizar a linha certa
  let colunaId = -1;
  let colunaConclusao = -1;
  cabecalho.forEach((nome, i) => {
    if (nome === 'ID') colunaId = i;
    if (nome === '% CONCLUSÃO') colunaConclusao = i;
  });
  
  if (colunaId === -1 || colunaConclusao === -1) {
    return ContentService.createTextOutput(JSON.stringify({ erro: 'Colunas não encontradas' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Procura a linha pelo ID
  for (let i = 1; i < todasLinhas.length; i++) {
    if (todasLinhas[i][colunaId] == dados.id) {
      aba.getRange(i + 1, colunaConclusao + 1).setValue(dados.percentual);
      break;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ sucesso: true, mensagem: 'Atualizado!' }))
    .setMimeType(ContentService.MimeType.JSON);
}