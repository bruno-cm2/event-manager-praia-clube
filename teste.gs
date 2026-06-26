function deleteUsers() {
  Registro.deleteDB()
}

function setDB(){
  Registro._saveDB(DB)
}

function getLocais(){
  Logger.log(Locais.listaQuadras(1))
}

function getEvento(){
  Logger.log(Eventos.busca(2))
}

function fixObs() {
  const db = Eventos.getDB()
  
  db.eventos.forEach(e => {
    if (!e.obs) return

    const isLink = e.obs.match(/\/d\/([a-zA-Z0-9\-_]+)/)
    
    if (isLink) {
      const texto = Eventos.getDescription(e.obs) ?? ''
      e.obs = { link: e.obs, texto }
    } else {
      e.obs = { link: null, texto: e.obs }
    }
  })

  Eventos._saveDB(db)
}

function showLogs(){
  Logs.showLogs()
}

function clearLogs(){
  Logs.clearLogs()
}

function changeKey(){
  const db = PropertiesService.getScriptProperties().getProperty("Erros")
  PropertiesService.getScriptProperties().setProperty("DB_LOGS", db)
  PropertiesService.getScriptProperties().deleteProperty("Erros")
}