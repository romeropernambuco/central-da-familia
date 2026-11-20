// Superfície DOM mínima para montar com react-dom em Node, sem dependências extras.
// Não simula hooks nem a reconciliação: ambos são executados pelo React real.
export class NoTeste {
  get options() {
    return this.childNodes.filter(n => n instanceof NoTeste && n.tagName === 'OPTION')
  }
  readonly nodeType: number
  readonly nodeName: string
  readonly tagName: string
  readonly namespaceURI = 'http://www.w3.org/1999/xhtml'
  readonly style = {
    setProperty(nome: string, valor: string) {
      Object.assign(this, { [nome]: valor })
    },
  }
  readonly atributos = new Map<string, string>()
  readonly childNodes: NoTeste[] = []
  parentNode: NoTeste | null = null
  ownerDocument!: DocumentoTeste
  private texto = ''
  private ouvintes = new Map<string, ((evento: object) => void)[]>()

  constructor(nome: string, tipo = 1) {
    this.nodeType = tipo
    this.nodeName = this.tagName = nome.toUpperCase()
  }
  get textContent(): string {
    return this.texto + this.childNodes.map(n => n.textContent).join('')
  }
  set textContent(texto: string) {
    for (const filho of this.childNodes) filho.parentNode = null
    this.childNodes.length = 0
    this.texto = texto
  }
  set nodeValue(texto: string) {
    this.texto = texto
  }
  get nodeValue() {
    return this.texto
  }
  appendChild(no: NoTeste) {
    return this.insertBefore(no, null)
  }
  insertBefore(no: NoTeste, antes: NoTeste | null): NoTeste {
    no.parentNode?.removeChild(no)
    this.texto = ''
    this.childNodes.splice(antes ? this.childNodes.indexOf(antes) : this.childNodes.length, 0, no)
    no.parentNode = this
    return no
  }
  removeChild(no: NoTeste) {
    this.childNodes.splice(this.childNodes.indexOf(no), 1)
    no.parentNode = null
    return no
  }
  setAttribute(nome: string, valor: string) {
    this.atributos.set(nome, String(valor))
  }
  removeAttribute(nome: string) {
    this.atributos.delete(nome)
  }
  getAttribute(nome: string) {
    return this.atributos.get(nome) ?? null
  }
  addEventListener(tipo: string, ouvir: (evento: object) => void) {
    this.ouvintes.set(tipo, [...(this.ouvintes.get(tipo) ?? []), ouvir])
  }
  removeEventListener(tipo: string, ouvir: (evento: object) => void) {
    this.ouvintes.set(
      tipo,
      (this.ouvintes.get(tipo) ?? []).filter(f => f !== ouvir),
    )
  }
  focus() {}
  click() {
    const evento = { type: 'click', target: this, button: 0, bubbles: true }
    for (let no: NoTeste | null = this; no; no = no.parentNode)
      for (const ouvir of no.ouvintes.get('click') ?? []) ouvir(evento)
  }
  buscar(predicado: (no: NoTeste) => boolean): NoTeste[] {
    return [...(predicado(this) ? [this] : []), ...this.childNodes.flatMap(n => n.buscar(predicado))]
  }
}

export class DocumentoTeste extends NoTeste {
  readonly documentElement: NoTeste
  readonly body: NoTeste
  readonly activeElement = null
  constructor() {
    super('#document', 9)
    this.ownerDocument = this
    this.documentElement = this.createElement('html')
    this.body = this.createElement('body')
    this.appendChild(this.documentElement)
    this.documentElement.appendChild(this.body)
  }
  createElement(nome: string) {
    const no = new NoTeste(nome)
    no.ownerDocument = this
    return no
  }
  createElementNS(_namespace: string, nome: string) {
    return this.createElement(nome)
  }
  createTextNode(texto: string) {
    const no = new NoTeste('#text', 3)
    no.ownerDocument = this
    no.nodeValue = texto
    return no
  }
}
