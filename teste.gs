function deleteUsers() {
  Registro.deleteDB()
}

function setDB(){
  Registro._saveDB({"users":{"user_bruno.marques@praiaclube.org.br":{"nome":"Bruno","sobrenome":"Caixeta Marques","setor":"Conservação","email":"bruno.marques@praiaclube.org.br","senha":"4k0dStjKcgfbMnceFvKkHAEdqcuLQoLjMdh8UvZJmxc=","criado":"2026-04-23T20:05:56.928Z","admin":true},"user_vinicius.campos@praiaclube.org.br":{"nome":"Vinicius","sobrenome":"Campos","setor":"Esporte","email":"vinicius.campos@praiaclube.org.br","senha":"LqPOJDJgR3BGyDW9In2/j5tFAeYyi1w/XCr8+ohR4FQ=","criado":"2026-04-28T17:36:50.286Z","admin":true},"user_camila.alves@praiaclube.org.br":{"nome":"Camila","sobrenome":"Cardoso Alves","setor":"Eventos Sociais","email":"camila.alves@praiaclube.org.br","senha":"jZae727K08KaOmKSgOaGzww/XVqGr/PKEgIMkjrcbJI=","criado":"2026-05-20T17:22:13.248Z","admin":false},"user_vinicius.araujo@praiaclube.org.br":{"nome":"Vinicius","sobrenome":"Drumond","setor":"Ações, Esporte e Lazer","email":"vinicius.araujo@praiaclube.org.br","senha":"hXPQhBfKjybT1/nG8Dpb41vLEtWBgy9VqZg6LV75GRs=","criado":"2026-05-20T17:23:45.156Z","admin":false},"user_felipe.calixto@praiaclube.org.br":{"nome":"Felipe","sobrenome":"Calixto","setor":"Competição Externa e Alto Rendimento","email":"felipe.calixto@praiaclube.org.br","senha":"Kv+KiQ6na1mA+cA05FvCmioxQza+U4jqgAnOtD9/f60=","criado":"2026-05-21T19:48:56.215Z","admin":false},"user_tatiane.borges@praiaclube.org.br":{"nome":"Tatiane","sobrenome":"Andrade Borges","setor":"Esporte","email":"tatiane.borges@praiaclube.org.br","senha":"mluXHOSbBCy6EB+Z7JPTlQtxSH3ibnpSgoUKtCxD/D8=","criado":"2026-05-21T19:50:20.848Z","admin":false}}})
}

function setAdmin(){
  
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