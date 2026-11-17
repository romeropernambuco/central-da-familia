export class EstadoSalvamento {
 estado: '' | 'Salvando' | 'Salvo' | 'Não foi possível salvar' = ''
 private ativos = 0; private falhou = false; private geracao = 0
 private ouvintes = new Set<() => void>()
 ouvir = (f: () => void) => { this.ouvintes.add(f); return () => { this.ouvintes.delete(f) } }
 private avisar() { this.ouvintes.forEach(f => f()) }
 limpar() { this.geracao++; this.ativos = 0; this.falhou = false; this.estado = ''; this.avisar() }
 async acompanhar<T>(f: () => Promise<T>): Promise<T> {
 const g = this.geracao
 if (!this.ativos) this.falhou = false
 this.ativos++; this.estado = 'Salvando'; this.avisar()
 try { return await f() } catch (e) { if (g === this.geracao) this.falhou = true; throw e }
 finally { if (g === this.geracao) { this.ativos--; this.estado = this.ativos ? 'Salvando' : this.falhou ? 'Não foi possível salvar' : 'Salvo'; this.avisar() } }
 }
}
export const salvamento = new EstadoSalvamento()
