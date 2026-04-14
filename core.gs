function _saveDB(DB){
  Locais.saveDB(DB)
}

function loadView(name){
  return HtmlService.createHtmlOutputFromFile(name).getContent()
}

function _addEvento(evento){

  const {titulo, datas, tipo, locais, obs} = evento

  const planilha = SpreadsheetApp.getActive().getSheetByName("Eventos")

  if(!evento.id) evento.id = Eventos.criarEvento(evento)
  else{
    Eventos.editarEvento(evento)
    const linhas = planilha.createTextFinder(String(evento.id)).matchEntireCell(true).findAll()
    linhas.sort((a, b) => b.getRow() - a.getRow()).forEach(l => l.offset(0,0,1,8).deleteCells(SpreadsheetApp.Dimension.ROWS))
  }
  for(let data of datas){

    const inicio = new Date(data.inicio)
    const fim = new Date(data.fim)

    let meses = []
    let atual = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    while(atual <= fim){
      meses.push(atual.mes())
      atual.setMonth(atual.getMonth() + 1)
    }

    const setores = [...new Set(locais.map(l => _capital((l.tipo == 'setor'? l.nome : l.setor).replace('Complexo de ', '').replace('Complexo ', ''))))].join(', ')
    const quadras = locais.filter(l => l.tipo == 'quadra').map(l => l.nome).join(', ')

    const infoEvento = [evento.id, tipo, titulo, inicio, fim, setores, quadras, obs]

    _updateSheet(planilha, meses, infoEvento, tipo)
  }
}

function _updateSheet(mes, infoEvento, tipo, id = null){

  const planilha = SpreadsheetApp.getActive().getSheetByName("Eventos")

  const namedRanges = planilha.getNamedRanges()

  const range = namedRanges.find(r => r.getName() == mes).getRange()                              // Procurando mês
  const header = range.offset(0,0,1,1)                                                            // Cabeçalho
  
  let linha

  if(id){
    linha = range.offset(0,0,500,1).createTextFinder(String(id)).matchEntireCell(true).findNext().offset(0,0,1,infoEvento.length)
  } 

  else{
    const indexLinha = range.offset(1,0,500,1).getValues().findIndex(r => String(r[0]) == '') +1  // Última linha preenchida +1
    linha = range.offset(indexLinha,0,1,infoEvento.length)                                                      
  }

  // Inserindo evento e formatando a linha
  linha.setValues([infoEvento])

  if(!id){ 
    linha.setBorder(true,true,true,true,true,true,header.getBackground(), SpreadsheetApp.BorderStyle.SOLID)
    linha.setFontFamily('Arial').setFontSize(9).setFontWeight('bold').setVerticalAlignment('middle').setHorizontalAlignment('center').setFontColor(colors[tipo]).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
  }
}


function _deleteEvento(id){

  const planilha = SpreadsheetApp.getActive().getSheetByName("Eventos")

  const dados = Eventos.apagarEvento(id)

  mes = new Date(dados.inicio).mes().toLocaleUpperCase()

  const range = planilha.getNamedRanges().find(r => r.getName().toLocaleUpperCase() == mes).getRange()
  const linha = range.offset(range.getValues().findIndex(r => r[0] == id),0,1,8)

  linha.deleteCells(SpreadsheetApp.Dimension.ROWS)
}

function _saveCache(key,cache){
  PropertiesService.getUserProperties().setProperty(key, JSON.stringify(cache));
}

function _ui(mensagem, buttons = 'YES_NO'){
  const ui = SpreadsheetApp.getUi()
  const resposta = ui.alert(
    'Alerta',
    mensagem,
    ui.ButtonSet[buttons]
  )
  return resposta === ui.Button.YES || resposta === ui.Button.OK
}

function debug(msg){
  if(typeof msg == 'object') msg = JSON.stringify(msg)
  throw new Error(msg)
}

function _isInside(x,y){
    x = x.map(i => new Date(i))
    y = y.map(i => new Date(i))
    return x[0] <= y[1] && y[0] <= x[1]
}

function capital(str){
  str = String(str)
  return str.charAt(0).toUpperCase() + str.slice(1)
}