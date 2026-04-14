class Locais{

  static getDB() {

    if(this._cache) return this._cache

    const props = PropertiesService.getScriptProperties()
    const json = props.getProperty(this.KEY)

    if (!json || json === []) {
      const inicial = { setores: [] }
      props.setProperty(this.KEY, JSON.stringify(inicial))
      return inicial;
    }

    this._cache = JSON.parse(json)
    return this._cache
  }

  static _saveDB(db) {
    PropertiesService.getScriptProperties().setProperty(this.KEY, JSON.stringify(db))
    this._cache = db
  }

  static criarSetor(nome) {
    const db = this.getDB();

    if (db.setores.some(s => s.nome === nome))
      throw new Error(`Setor '${nome}' já existe`)
    
    const id = db.setores.map(setor => setor.id).sort((a, b) => b - a)[0] + 1 || 1

    db.setores.push({
      id,
      nome,
      quadras: [],
      eventos: [],
      tipo: 'setor',
      ativo: true
    })

    this._saveDB(db);
  }

  static criarQuadra(setorNome, nome) {
    const db = this.getDB();
    const setor = db.setores.find(s => s.nome === setorNome)

    if (!setor)
      throw new Error("Setor não encontrado");

    if (setor.quadras.some(q => q.nome === nome))
      throw new Error(`Quadra '${nome}'já existe`)

    const id = setor.id + '.' + setor.quadras.map(q => q.id).sort((a, b) => b - a)[0] + 1 || 1

    setor.quadras.push({id, nome, eventos: [], tipo: 'quadra', ativo: true})

    this._saveDB(db)
  }

  static busca(id){
    const db = this.getDB()
    const [idSetor, idQuadra] = String(id).split('.')
    const setor = db.setores.find(s => s.id == idSetor)
    if(!setor) throw new Error(`Setor id '${idSetor}' não encontrado`)
    if(!idQuadra) return setor
    const quadra = setor.quadras.find(q => q.id == id)
    if(!quadra) throw new Error(`Quadra id ${id} não encontrada`)
    return quadra
  }

  static adicionarEvento(id, locais){

    const db = this.getDB()

    locais.forEach(local => this.busca(local.id).eventos.push(id))
    
    this._saveDB(db)
  }

  static apagarEvento(id, local){
    const db = this.getDB()
    local = this.busca(local)
    if (!local) throw new Error(`Local não encontrado: ID ${localID}`)

    local.eventos = local.eventos.filter(e => e != id)

    this._saveDB(db)
  }
  
  static listaSetores(){
    return this.getDB().setores
  }

  static listaQuadras(id){
    return this.getDB().setores.find(s => s.id == id).quadras
  }

  static deleteDB(){
    PropertiesService.getScriptProperties().deleteProperty(this.KEY)
    this._cache = null
  }

  static resetarEventos(){
    const db = this.getDB()

    db.setores.forEach(setor => {
      setor.eventos = []
      setor.quadras.forEach(quadra => quadra.eventos = [])
    })

    this._saveDB(db)
  }
}


class Eventos{

  static getDB() {

    // if(this._cache) return this._cache

    const props = PropertiesService.getScriptProperties()
    const json = props.getProperty(this.KEY)

    if (!json) {
      const inicial = { eventos: [] }
      props.setProperty(this.KEY, JSON.stringify(inicial))
      this._cache = inicial
      return inicial;
    }

    this._cache = JSON.parse(json)
    return this._cache
  }

  static _saveDB(db) {
    PropertiesService.getScriptProperties().setProperty(this.KEY, JSON.stringify(db))
    this._cache = db
  }

  static listaEventos(){
    return this.getDB().eventos
  }
  
  static busca(id, cond = true){
    const db = this.getDB()
    return db.eventos.find(e => e.id == id && cond)
  }

  static criarEvento(evento){

    const {titulo, locais, inicio, fim, tipo} = evento

    const horario = [inicio, fim]

    this._isConflited(horario, locais)

    const db = this.getDB()

    evento.id = db.eventos.map(e => e.id).sort((a, b) => b - a)[0] + 1 || 1

    const serverEvento = {
      summary: titulo,
      start: {dateTime: inicio},
      end: {dateTime: fim},
      location: locais.map(l => l.nome),
      color: colorsCalendar[tipo],
      description: this._getDescription(evento.obs),
      extendedProperties: {private: {
        planilhaID: evento.id,
        tipo
      }}
    }

    evento.serverID = Calendar.Events.insert(serverEvento, idAgenda).id

    evento.locais = locais.map(l => l.id)

    db.eventos.push(evento)

    Locais.adicionarEvento(evento.id, locais)

    this._saveDB(db)
    
    return evento.id
  }

  static editarEvento(evento){

    const {titulo, locais, inicio, fim, tipo, id} = evento

    const horario = [inicio, fim]

    this._isConflited(horario, locais, id)

    const db = this.getDB()
    
    const original = this.busca(id)

    original.locais.forEach(l => Locais.apagarEvento(original.id, l))

    Locais.adicionarEvento(id, locais)
    
    const serverEvento = {
      summary: titulo,
      start: {dateTime: inicio},
      end: {dateTime: fim},
      location: locais.map(l => l.nome),
      color: colorsCalendar[tipo],
      description: this._getDescription(evento.obs),
      extendedProperties: {private: {
        planilhaID: evento.id,
        tipo
      }}
    }

    Calendar.Events.patch(serverEvento, idAgenda, evento.serverID)

    evento.locais = locais.map(l => l.id)

    db.eventos = [...db.eventos.filter(e => e.id != id), evento]

    this._saveDB(db)
  }

  static apagarEvento(id){
    
    const dados = {...this.busca(id)}

    dados.locais.forEach(l => Locais.apagarEvento(id, l))

    Calendar.Events.remove(idAgenda, dados.serverID)

    let db = this.getDB()

    db.eventos = db.eventos.filter(e => e.id != id)

    this._saveDB(db)

    return dados
  }

  static deleteDB(){
    PropertiesService.getScriptProperties().deleteProperty(this.KEY)
    this._cache = null
  }

  static _isConflited(horario, locais, id = ''){

    const conflito = eventoId => {
      if(eventoId == id) return false
      const evento = this.busca(eventoId)
      return evento && _isInside([evento.inicio, evento.fim],horario)
    }

    locais.forEach(local => {

      let quadraOcupada
      let setor

      local = Locais.busca(local.id)

      if(local.tipo == 'quadra'){
        setor = Locais.busca(local.id.split('.')[0])
        quadraOcupada = local.eventos.find(conflito)
      }

      else {
        setor = local
        quadraOcupada = local.quadras.flatMap(q => q.eventos).find(conflito)
      }

      const setorOcupado = setor.eventos.find(conflito)

      if(setorOcupado){
        const evento = this.busca(setorOcupado)
        const [inicio, fim] = [evento.inicio, evento.fim].map(e => new Date(e))
        throw JSON.stringify({locais: [setor], message: `O setor '${setor.nome}' está reservado nesse horário:\n${evento.titulo} - ${inicio.datahora()} até ${fim.datahora()}`})
      }

      else if(quadraOcupada) {

        const evento = this.busca(quadraOcupada)

        const quadras = evento.locais

        if(local.tipo == 'setor'){
          local = evento.locais.find(l => l.id.startsWith(local.id))
        }

        const [inicio, fim] = [evento.inicio, evento.fim].map(e => new Date(e))
        throw JSON.stringify({locais: quadras, message: `Existe um evento marcado em '${local.setor} - ${local.nome}' nesse horário:\n${evento.titulo} - ${inicio.data()} às ${inicio.hora()} até ${fim.data()} às ${fim.hora()}`})
      }
    })
  }

  static _getDescription(id){
    if(!id) return
    const url = id.match(/\/d\/([a-zA-Z0-9\-_]+)/)
    if(!url) return
    return DocumentApp.openById(url[1]).getBody().getText()
  }
}

Locais.KEY = "DB_LOCAIS"
Locais._cache = null

Eventos.KEY = "DB_EVENTOS"
Eventos._cache = null

Date.prototype.data = function(){
  return this.toLocaleDateString('pt-BR', {
  month: 'numeric',
  day: 'numeric'
  })
}

Date.prototype.hora = function(){
  return this.toLocaleTimeString('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'})
}

Date.prototype.mes = function(){
  const m = this.toLocaleDateString('pt-BR', {month: 'long'})
  return m.charAt(0).toLocaleUpperCase() + m.slice(1)
}

Date.prototype.datahora = function(){
    return this.toLocaleDateString('pt-BR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}