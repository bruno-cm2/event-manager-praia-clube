function _saveDB(DB){
  Locais._saveDB(DB)
}

function login(user, pass){
  return Registro.login(user, pass)
}

function cadastrar(user){
  Registro.cadastrar(user)
}

function alterarSenha(email, antiga, nova){
  Registro.alterarSenha(email, antiga, nova)
}

function criarLocal(nome, setorId){
  if(setorId) Locais.criarQuadra(setorId, nome)
  else Locais.criarSetor(nome)
}

function apagarLocal(id, dev){
  if(dev) Locais.apagarLocal(id)
  else Locais.desativarLocal(id)
}

function renomearLocal(id, nome){
  Locais.renomearLocal(id, nome)
}

function addEvento(evento){

  const {titulo, datas, tipo, locais, obs} = evento

  const planilha = SpreadsheetApp.openById(idPlanilha).getSheetByName("Eventos")

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

    const setores = [...new Set(locais.map(l => capital((l.tipo == 'setor'? l.nome : l.setor).replace('Complexo de ', '').replace('Complexo ', ''))))].join(', ')
    const quadras = locais.filter(l => l.tipo == 'quadra').map(l => l.nome).join(', ')

    const infoEvento = [evento.id, tipo, titulo, inicio, fim, setores, quadras, obs.link]

    updateSheet(planilha, meses, infoEvento, tipo)
  }
}


function updateSheet(planilha, meses, infoEvento, tipo){

  const namedRanges = planilha.getNamedRanges()

  for(let mes of meses){

    const namedRange = namedRanges.find(r => r.getName() == mes)
    const range = namedRange.getRange()                                                  // Procurando mês
    const header = range.offset(0,0,1,1)                                                 // Cabeçalho

    let datas = range.offset(2,3,range.getNumRows()-2,1).getValues().map(v => v[0]).filter(d => d).map(d => new Date(d))

    const dia = new Date(infoEvento[3])

    const index = datas.findIndex(d => dia < d)
    const pos = index === -1 ? datas.length : index

    const linha = range.offset(pos + 2, 0, 1, infoEvento.length)

    // Inserindo evento e formatando a linha
    linha.insertCells(SpreadsheetApp.Dimension.ROWS)
    linha.setValues([infoEvento])
    linha.setBorder(true,true,true,true,true,true,header.getBackground(), SpreadsheetApp.BorderStyle.SOLID)
    linha.setFontFamily('Arial').setFontSize(9).setFontWeight('bold').setVerticalAlignment('middle').setHorizontalAlignment('center').setFontColor(cores[tipo].sheet).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
  }
}


function apagarEvento(id){

  const planilha = SpreadsheetApp.openById(idPlanilha).getSheetByName("Eventos")
  
  Eventos.apagarEvento(id)

  const ranges = planilha.createTextFinder(id).matchEntireCell(true).findAll().map(r => r.offset(0,0,1,8))

  ranges.sort((a, b) => b.getRow() - a.getRow()).forEach(r => r.deleteCells(SpreadsheetApp.Dimension.ROWS))
}


function _saveCache(key,cache){
  PropertiesService.getUserProperties().setProperty(key, JSON.stringify(cache));
}


function _include(file){
  return HtmlService.createHtmlOutputFromFile(file).getContent()
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


function isInside(x,y){
    [x,y] = [x,y].map(i => ({inicio: new Date(i.inicio), fim: new Date(i.fim)}))
    return x.inicio <= y.fim && y.inicio <= x.fim
  }


function capital(str){
  str = String(str)
  return str.charAt(0).toUpperCase() + str.slice(1)
}


function sendEmail(subject, texto, evento){
  let locais = evento.locais.map(l => Locais.busca(l))
  locais = locais.map(l => l.tipo == 'setor' ? l.nome : l.setor + ' - ' + l.nome)
  if(evento.titulo.includes("Teste") || evento.titulo.includes("teste")) return
  MailApp.sendEmail({
    to: emails.join(','),
    subject,
    htmlBody: `
      ${texto}:<br><br>
      <b>${evento.titulo}</b><br>
      ${evento.datas.map(d => `${new Date(d.inicio).datahora()} às ${_dayLong(d) ? new Date(d.fim).datahora() : new Date(d.fim).hora()}`).join('<br>•')}<br>
      Locais: ${locais.join(', ')}<br>
      Criado por: ${evento.criador || 'N/A'}`,
    name:'Agenda de eventos'
  })
}

function _dayLong(dateISO){
  return new Date(dateISO.fim) - new Date(dateISO.inicio) >= 86400000 
}