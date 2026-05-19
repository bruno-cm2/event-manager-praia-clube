class Locais {

  static getDB() {

    if (this._cache) return this._cache

    const props = PropertiesService.getScriptProperties()
    const json = props.getProperty(this.KEY)

    if (!json) {
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

    const existente = db.setores.find(s => s.nome == nome)
    if (existente) {
      if (existente.disabled) {
        existente.disabled = false
        this._saveDB(db)
        throw new Error(`Setor '${nome}' estava desabilitado e foi reativado`)
      }
      throw new Error(`Setor '${nome}' já existe`)
    }
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

  static criarQuadra(setorId, nome) {
    const db = this.getDB();
    const setor = db.setores.find(s => s.id === setorId)

    if (!setor)
      throw new Error("Erro crítico: Setor da quadra não encontrado");

    if (setor.quadras.some(q => q.nome === nome))
      throw new Error(`Quadra '${nome}'já existe`)

    const id = setor.id + '.' + setor.quadras.map(q => Number(q.id.split('.')[1])).sort((a, b) => b - a)[0] + 1 || 1

    setor.quadras.push({
      id,
      nome,
      eventos: [],
      ativo: true,
      tipo: 'quadra',
      setor: setor.nome
    })

    this._saveDB(db)
  }

  static busca(id, disabled = false) {
    const db = this.getDB()
    const [idSetor, idQuadra] = String(id).split('.')
    const setor = db.setores.filter(l => disabled ? true : !l.disabled).find(s => s.id == idSetor)
    if (!setor) throw new Error(`Setor id '${idSetor}' não encontrado`)
    if (!idQuadra) return setor
    const quadra = setor.quadras.filter(l => disabled ? true : !l.disabled).find(q => q.id == id)
    if (!quadra) throw new Error(`Quadra id ${id} não encontrada`)
    return quadra
  }

  static adicionarEvento(id, locais) {

    const db = this.getDB()

    locais.forEach(local => {
      const l = this.busca(local.id)
      if (!l.eventos.includes(id)) {
        l.eventos.push(id)
      }
    })

    this._saveDB(db)
  }

  static renomearLocal(id, nome) {
    const db = this.getDB()
    const local = this.busca(id, true)

    const setor = db.setores.find(s => s.id == id.split('.')[0])
    const tipo = local.tipo

    const igual = tipo == 'setor' ? db.setores.find(s => s.nome == nome) : setor.quadras.find(q => q.nome == nome)

    if (igual) throw new Error(`${capital(tipo)} com o nome '${nome}' já existe` + (igual.disabled ? ' [Desativada]' : ''))

    local.nome = nome

    this._saveDB(db)
  }

  static apagarEvento(id, local) {

    const db = this.getDB()

    local = this.busca(local, true)
    if (!local) throw new Error(`Local não encontrado: ID ${local}`)

    local.eventos = local.eventos.filter(e => e != id)

    this._saveDB(db)
  }

  static desativarLocal(id) {
    const db = this.getDB()

    const local = this.busca(id)
    if (!local) throw new Error(`Local não encontrado: ID ${local}`)

    local.disabled = true

    this._saveDB(db)
  }

  static apagarLocal(id) {
    const db = this.getDB()

    const local = this.busca(id)
    if (!local) throw new Error(`Local não encontrado: ID ${local}`)

    if (local.tipo == "setor") {
      db.setores = db.setores.filter(s => s.id != id)
    }
    else {
      const setor = this.busca(id.split('.')[0])
      setor.quadras = setor.quadras.filter(q => q.id != id)
    }
    this._saveDB(db)
  }

  static listaSetores() {
    return this.getDB().setores
  }

  static listaQuadras(setorId) {
    return this.getDB().setores.find(s => s.id == setorId).quadras
  }

  static deleteDB() {
    PropertiesService.getScriptProperties().deleteProperty(this.KEY)
    this._cache = null
  }

  static resetarEventos() {
    const db = this.getDB()

    db.setores.forEach(setor => {
      setor.eventos = []
      setor.quadras.forEach(quadra => quadra.eventos = [])
    })

    this._saveDB(db)
  }
}


class Eventos {

  static getDB() {

    if (this._cache) return this._cache

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

  static listaEventos() {
    return this.getDB().eventos
  }

  static busca(id, cond = true) {
    const db = this.getDB()
    return db.eventos.find(e => e.id == id && cond)
  }

  static criarEvento(evento) {

    let { titulo, locais, datas, tipo, criador } = evento

    this._isConflited(datas, locais)

    const db = this.getDB()

    evento.id = db.eventos.map(e => e.id).sort((a, b) => b - a)[0] + 1 || 1

    datas = datas.map(data => {

      const { inicio, fim } = data

      const serverEvento = {
        summary: titulo,
        start: { dateTime: inicio },
        end: { dateTime: fim },
        location: locais.map(l => l.tipo == 'setor' ? l.nome : l.setor + ' - ' + l.nome),
        colorId: cores[tipo].calendar,
        description: evento.obs.html,
        extendedProperties: {
          private: {
            planilhaID: evento.id,
            tipo,
            criador
          }
        }
      }

      const serverID = Calendar.Events.insert(serverEvento, idAgenda).id

      data = { inicio, fim, serverID }

      return data
    })

    evento.obs.link = Docs.create(evento.titulo, evento.obs)

    evento.datas = datas

    evento.locais = locais.map(l => l.id)

    db.eventos.push(evento)

    Locais.adicionarEvento(evento.id, locais)

    this._saveDB(db)

    //_sendEmail("Novo evento", "Atenção - Evento criado", evento)

    return evento.id
  }

  static editarEvento(evento) {

    let { titulo, locais, datas, tipo, id } = evento

    this._isConflited(datas, locais, id)

    const db = this.getDB()

    const original = this.busca(id)

    const idsOriginais = original.datas.map(d => d.serverID)
    const ids = datas.map(d => d.serverID)
    idsOriginais.forEach(id => {
      if (!ids.includes(id)) {
        Calendar.Events.remove(idAgenda, id)
      }
    })

    original.locais.forEach(l => Locais.apagarEvento(original.id, l))

    Locais.adicionarEvento(id, locais)

    datas = datas.map(data => {

      let { inicio, fim, serverID } = data

      const serverEvento = {
        summary: titulo,
        start: { dateTime: inicio },
        end: { dateTime: fim },
        location: locais.map(l => l.tipo == 'setor' ? l.nome : l.setor + ' - ' + l.nome),
        colorId: cores[tipo].calendar,
        description: evento.obs.html,
        extendedProperties: {
          private: {
            planilhaID: evento.id,
            tipo
          }
        }
      }

      if (!serverID) serverID = Calendar.Events.insert(serverEvento, idAgenda).id
      else Calendar.Events.patch(serverEvento, idAgenda, serverID)

      data = { inicio, fim, serverID }

      return data
    })

    Docs.edit(evento.obs)

    evento.datas = datas

    evento.locais = locais.map(l => l.id)

    db.eventos = [...db.eventos.filter(e => e.id != id), evento]

    this._saveDB(db)

    //_sendEmail("Evento alterado", "Atenção - Evento alterado", evento)
  }

  static apagarEvento(id) {

    const dados = { ...this.busca(id) }

    dados.locais.forEach(l => Locais.apagarEvento(id, l))

    for (let data of dados.datas) {
      try { Calendar.Events.remove(idAgenda, data.serverID) } catch { }
    }

    Docs.remove(dados.obs)

    const db = this.getDB()

    db.eventos = db.eventos.filter(e => e.id != id)

    this._saveDB(db)
  }

  static _isConflited(datas, locais, id = '', debug = false) {

    const conflito = eventoId => {
      if (eventoId == id) return false

      const evento = this.busca(eventoId)
      if (!evento) return false

      return evento.datas.some(d1 => datas.some(d2 => isInside(d1, d2)))
    }

    locais.forEach(local => {

      let quadraOcupada
      let setor

      local = Locais.busca(debug ? local : local.id)

      if (local.tipo == 'quadra') {
        setor = Locais.busca(local.id.split('.')[0])
        quadraOcupada = local.eventos.find(conflito)
      }

      else {
        setor = local
        quadraOcupada = local.quadras.flatMap(q => q.eventos).find(conflito)
      }

      const setorOcupado = setor.eventos.find(conflito)

      if (setorOcupado) {
        const evento = this.busca(setorOcupado)

        const data = evento.datas.find(d1 => datas.some(d2 => isInside(d1, d2)))

        const [inicio, fim] = [data.inicio, data.fim].map(e => new Date(e))

        if (debug) Logger.log(`${id} - O setor '${setor.nome}' está reservado nesse horário:\n${evento.titulo} - ${inicio.datahora()} até ${fim.datahora()}`)

        else throw JSON.stringify({ locais: [setor], message: `O setor '${setor.nome}' está reservado nesse horário:\n${evento.titulo} - ${inicio.datahora()} até ${fim.datahora()}` })
      }

      else if (quadraOcupada) {

        const evento = this.busca(quadraOcupada)

        const quadras = evento.locais

        // debug(local.id + ' ' + evento.locais)

        if (local.tipo == 'setor') {
          local = Locais.busca(evento.locais.find(l => l.split('.')[0] == local.id))
        }

        const data = evento.datas.find(d1 => datas.some(d2 => isInside(d1, d2)))

        const [inicio, fim] = [data.inicio, data.fim].map(e => new Date(e))

        if (debug) Logger.log(`${id} - Existe um evento marcado em '${local.setor} - ${local.nome}' nesse horário:\n${evento.titulo} - ${inicio.data()} às ${inicio.hora()} até ${fim.data()} às ${fim.hora()}`)

        else throw JSON.stringify({ locais: quadras, message: `Existe um evento marcado em '${local.setor} - ${local.nome}' nesse horário:\n${evento.titulo} - ${inicio.data()} às ${inicio.hora()} até ${fim.data()} às ${fim.hora()}` })
      }
    })
  }
}



class Registro {

  static getDB() {

    if (this._cache) return this._cache

    const props = PropertiesService.getScriptProperties()
    const json = props.getProperty(this.KEY)

    if (!json) {
      const inicial = { users: {} }
      props.setProperty(this.KEY, JSON.stringify(inicial))
      this._cache = inicial
      return inicial
    }

    this._cache = JSON.parse(json)
    return this._cache
  }

  static _saveDB(db) {
    PropertiesService.getScriptProperties().setProperty(this.KEY, JSON.stringify(db))
    this._cache = db
  }

  static cadastrar(dados) {

    const { nome, sobrenome, setor, email, senha } = dados
    const db = this.getDB()
    const key = 'user_' + email

    if (db.users[key]) throw new Error('Esse e-mail já está cadastrado')

    const senhaHash = this.encode(senha)

    const user = { nome, sobrenome, setor, email, senha: senhaHash, criado: new Date().toISOString(), admin: false }

    db.users[key] = user

    this._saveDB(db)
  }

  static login(email, senha) {

    const db = this.getDB()

    const key = 'user_' + email
    const dados = db.users[key]

    if (!dados) throw new Error('Email não encontrado')

    const senhaHash = this.encode(senha)

    if (dados.senha !== senhaHash) throw new Error('Senha incorreta')

    const { senha: _, ...user } = dados

    return user
  }

  static alterarSenha(email, atual, nova) {

    const db = this.getDB()

    const key = 'user_' + email

    const user = db.users[key]

    if (!user) throw new Error('Erro crítico: Usuário não encontrado')

    if (this.encode(atual) !== user.senha) throw new Error('Senha atual incorreta')

    db.users[key].senha = this.encode(nova)

    this._saveDB(db)
  }

  static encode(senha) {
    return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha))
  }

  static deleteDB() {
    PropertiesService.getScriptProperties().deleteProperty(this.KEY)
    this._cache = null
  }
}

class Docs {

  static _applyDelta(body, obs) {
    const delta = JSON.parse(obs?.delta || '{"ops":[]}')

    let listId = null

    delta.ops.forEach(op => {
      if (typeof op.insert !== 'string') return

      const lines = op.insert.split('\n')

      lines.forEach((line, i) => {
        if (!line && i === lines.length - 1) return

        const attr = op.attributes || {}

        if (attr.list) {
          const glyph = attr.list === 'ordered'
            ? DocumentApp.GlyphType.DECIMAL
            : DocumentApp.GlyphType.BULLET

          const item = body.appendListItem(line)
          item.setGlyphType(glyph)


          if (!listId) listId = item.getListId()
          else item.setListId(listId)

          this._applyInline(item.editAsText(), attr, line)
          return
        }

        listId = null

        const para = body.appendParagraph(line)

        if (attr.header === 1) para.setHeading(DocumentApp.ParagraphHeading.HEADING1)
        else if (attr.header === 2) para.setHeading(DocumentApp.ParagraphHeading.HEADING2)
        else para.setHeading(DocumentApp.ParagraphHeading.NORMAL)

        this._applyInline(para.editAsText(), attr, line)
      })
    })

    if (body.getNumChildren() > 1) body.getChild(0).removeFromParent()
  }

  static _applyInline(text, attr, line) {
    if (!line.length) return
    const end = line.length - 1

    if (attr.bold) text.setBold(0, end, true)
    if (attr.italic) text.setItalic(0, end, true)
    if (attr.underline) text.setUnderline(0, end, true)
    if (attr.strike) text.setStrikethrough(0, end, true)

    if (attr.link) {
      text.setLinkUrl(0, end, attr.link)
      text.setForegroundColor(0, end, '#1155CC')
      text.setUnderline(0, end, true)
    }
  }

  static create(titulo, obs) {
    const doc = DocumentApp.create(titulo)
    this._applyDelta(doc.getBody(), obs)

    DriveApp.getFileById(doc.getId())
      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    return doc.getUrl()
  }

  static edit(obs) {
    if (!obs.link) return
    const match = obs.link.match(/\/d\/([a-zA-Z0-9_-]+)/) || obs.link.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (!match) return

    const doc = DocumentApp.openById(match[1])
    doc.getBody().clear()
    this._applyDelta(doc.getBody(), obs)
    doc.saveAndClose()
  }

  static remove(obs) {
    if (!obs.link) return
    const match = obs.link.match(/\/d\/([a-zA-Z0-9_-]+)/) || obs.link.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (!match) return
    DriveApp.getFileById(match[1]).setTrashed(true)
  }
}

Locais.KEY = "DB_LOCAIS"
Locais._cache = null

Eventos.KEY = "DB_EVENTOS"
Eventos._cache = null

Registro.KEY = "DB_REGISTRO"
Registro._cache = null

Date.prototype.data = function () {
  return this.toLocaleDateString('pt-BR', {
    month: 'numeric',
    day: 'numeric'
  })
}

Date.prototype.hora = function () {
  return this.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

Date.prototype.datahora = function () {
  return this.toLocaleDateString('pt-BR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

Date.prototype.mes = function () {
  const m = this.toLocaleDateString('pt-BR', { month: 'long' })
  return m.charAt(0).toLocaleUpperCase() + m.slice(1)
}

Date.prototype.dia = function () {
  return capital(this.toLocaleDateString('pt-br', { weekday: 'long' }))
}