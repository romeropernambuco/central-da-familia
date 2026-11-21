export class EstadoSalvamento {
  aviso = ''
  estado: '' | 'Salvando' | 'Desfazendo' | 'Salvo' | 'Não foi possível salvar' = ''
  private ativos = 0
  private inversos = 0
  private falhou = false
  private geracao = 0
  private ouvintes = new Set<() => void>()
  ouvir = (f: () => void) => {
    this.ouvintes.add(f)
    return () => {
      this.ouvintes.delete(f)
    }
  }
  private avisar() {
    this.ouvintes.forEach(f => f())
  }
  limpar() {
    this.geracao++
    this.ativos = 0
    this.inversos = 0
    this.aviso = ''
    this.falhou = false
    this.estado = ''
    this.avisar()
  }
  async acompanhar<T>(f: () => Promise<T>, rotulo: 'Salvando' | 'Desfazendo' = 'Salvando'): Promise<T> {
    const g = this.geracao
    if (!this.ativos) this.falhou = false
    this.aviso = ''
    this.ativos++
    if (rotulo === 'Desfazendo') this.inversos++
    this.estado = this.inversos ? 'Desfazendo' : rotulo
    this.avisar()
    try {
      return await f()
    } catch (e) {
      if (g === this.geracao) this.falhou = true
      throw e
    } finally {
      if (g === this.geracao) {
        this.ativos--
        if (rotulo === 'Desfazendo') this.inversos--
        this.estado = this.inversos
          ? 'Desfazendo'
          : this.ativos
            ? 'Salvando'
            : this.falhou
              ? 'Não foi possível salvar'
              : 'Salvo'
        this.avisar()
      }
    }
  }
}
export const salvamento = new EstadoSalvamento()
