function doGet(e) {
  html = HtmlService.createTemplateFromFile('index')

  html.ev = Eventos.getDB()
  html.lc = Locais.getDB()
  html.tipos = cores
  html.cache = PropertiesService.getUserProperties().getProperty('CACHE') || '{}'
  return html.evaluate().setTitle('Painel de Comandos').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl()
}