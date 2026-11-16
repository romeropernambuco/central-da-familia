import { ErroRede } from '../api/erros'
interface Pendente { executar: () => Promise<unknown>; resolver: (r: any) => void; rejeitar: (e: unknown) => void; promessa: Promise<any> }
export class FilaPendentes {
 itens = new Map<string,Pendente>(); ocupado = false; geracao = 0
 private ouvintes = new Set<() => void>()
 ouvir = (f:()=>void) => { this.ouvintes.add(f); return () => { this.ouvintes.delete(f) } }
 private avisar() { this.ouvintes.forEach(f=>f()) }
 async enviar<T>(chave: string, executar:()=>Promise<T>): Promise<T> {
 const geracao = this.geracao
 const antigo=this.itens.get(chave); if(antigo) return antigo.promessa
 try{const r = await executar(); if(geracao !== this.geracao) throw new Error('Sessão encerrada.'); return r}catch(e){if(geracao !== this.geracao || !(e instanceof ErroRede))throw e}
 let resolver!: (r:T)=>void, rejeitar!: (e:unknown)=>void
 const promessa=new Promise<T>((sim,nao)=>{resolver=sim;rejeitar=nao})
 this.itens.set(chave,{executar,resolver,rejeitar,promessa});this.avisar();return promessa
 }
 async repetir() {
 if(this.ocupado)return
 this.ocupado=true
 try{for(const [chave,item] of this.itens){
 try{const r=await item.executar(); if(this.itens.get(chave)!==item)continue;this.itens.delete(chave);item.resolver(r)}
 catch(e){if(!(e instanceof ErroRede)){this.itens.delete(chave);item.rejeitar(e)}}
 this.avisar()
 }}finally{this.ocupado=false}
 }
 limpar(){ this.geracao++; for(const i of this.itens.values())i.rejeitar(new Error('Sessão encerrada. Confira os lançamentos ao entrar.'));this.itens.clear();this.avisar() }
}
export const pendentes=new FilaPendentes()
