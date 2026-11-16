export interface AcaoDesfazivel { rotulo: string; desfazer(): Promise<boolean> }
export class CentralDesfazer {
 ultimas: AcaoDesfazivel[] = []; atual: AcaoDesfazivel | null = null; ocupado = false; erro = false; concluidas = 0
 private geracao = 0
 private ouvintes = new Set<() => void>()
 ouvir = (f: () => void) => { this.ouvintes.add(f); return () => { this.ouvintes.delete(f) } }
 private avisar() { this.ouvintes.forEach(f => f()) }
 registrar(a: AcaoDesfazivel) { this.ultimas = [...this.ultimas, a].slice(-5); this.atual = a; this.erro = false; this.avisar() }
 dispensar() { if (!this.ocupado) { this.atual = null; this.avisar() } }
 limpar() { this.geracao++; this.ocupado = false; this.ultimas = []; this.atual = null; this.erro = false; this.avisar() }
 async executar() {
 if (!this.atual || this.ocupado) return false
 const geracao = this.geracao
 const acao = this.atual; this.ocupado = true; this.avisar(); let ok = false
 try { ok = await acao.desfazer() } catch { /* nova tentativa */ }
 if (geracao !== this.geracao) return false
 this.ocupado = false
 if (this.atual === acao) { this.erro = !ok; if (ok) { this.atual = null; this.concluidas++ } }
 this.avisar(); return ok
 }
}
export const desfazer = new CentralDesfazer()
