import { useState } from 'react'
import { useApp } from '../app/contexto'
import { gerarCopia, validarCopia, previaCopia, type Copia } from '../app/backup'
import { Sheet } from './base'
import { textoPrivado } from '../lib/formato'
import { desfazer } from '../app/desfazer'
import { limparRascunhos } from '../app/rascunhos'
export function Backup() {
 const { api, familia, oculto, recarregar, trocarSessao } = useApp()
 const [copia, setCopia] = useState<Copia | null>(null), [antes, setAntes] = useState<Copia | null>(null)
 const [conf, setConf] = useState(''), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false), [feito, setFeito] = useState('')
 if (familia?.papel !== 'casal') return null
 async function baixar() {
 if (!familia || ocupado || !window.confirm('A cópia contém valores, mesmo com o olho fechado. Confirma baixar o arquivo?')) return
 setOcupado(true); setErro('')
 try {
 const c = await gerarCopia(api,familia.id)
 validarCopia(JSON.stringify(c))
 const url = URL.createObjectURL(new Blob([JSON.stringify(c,null,2)],{type:'application/json'}))
 const a = document.createElement('a'); a.href = url; a.download = 'central-da-familia-backup-' + c.data.slice(0,10) + '.json'; a.click()
 setTimeout(()=>URL.revokeObjectURL(url),2000); setFeito('Cópia de segurança baixada.')
 } catch(e) { setErro((e as Error).message) } finally { setOcupado(false) }
 }
 return <section className="card"><h2>Cópia de segurança</h2><p>Guarde o arquivo em lugar seguro. Ele contém valores mesmo com o olho fechado.</p>
 <button className="btn line" type="button" disabled={ocupado} onClick={baixar}>Baixar cópia de segurança</button>
 <label className="campo"><span>Restaurar de uma cópia</span><input type="file" accept="application/json,.json" disabled={ocupado} onChange={async e=>{
 const arquivo=e.target.files?.[0]; e.target.value=''; if (!arquivo) return
 setOcupado(true); setErro(''); setConf(''); setCopia(null)
 try { if(arquivo.size>20000000) throw new Error('Arquivo muito grande.'); const c=validarCopia(await arquivo.text()); const a=await gerarCopia(api,familia.id); setAntes(a); setCopia(c) }
 catch(e){setErro((e as Error).message)} finally{setOcupado(false)}
 }} /></label>
 {erro && <p role="alert">{textoPrivado(erro,oculto)}</p>}{feito && <p role="status">{feito}</p>}
 {copia && antes && <Sheet titulo="Conferir restauração" fechar={()=>{if(!ocupado)setCopia(null)}}>
 <p>Cópia de {new Date(copia.data).toLocaleString('pt-BR')}. Vai substituir os dados atuais. Confira antes de continuar.</p>
 {previaCopia(antes,copia).map(p=><details key={p.colecao}><summary>{p.colecao}: {p.novos} incluídos, {p.excluidos} excluídos, {p.alterados} alterados.</summary>{oculto ? <p>Valores escondidos. Abra o olho para conferir as diferenças.</p> : p.diferencas.map(d=><div key={d.id}><b>{d.tipo}: {d.id}</b><p>Antes</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(d.antes,null,2) ?? 'Ausente'}</pre><p>Depois</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(d.depois,null,2) ?? 'Ausente'}</pre></div>)}</details>)}
 <p>Também substitui parâmetros do plano, configurações da Casa e nomes. {oculto ? 'Valores escondidos.' : 'Os valores serão os da cópia.'}</p>
 <label className="campo"><span>Digite RESTAURAR</span><input className="inp" value={conf} onChange={e=>setConf(e.target.value)} autoComplete="off" /></label>
 {api.modo !== 'exemplo' && <p>O banco ainda não oferece restauração segura. Você pode conferir a cópia; a gravação está desabilitada.</p>}
 {erro && <p role="alert">{textoPrivado(erro,oculto)}</p>}
 <button type="button" className="btn danger" disabled={ocupado || conf !== 'RESTAURAR' || api.modo !== 'exemplo' || !api.backupRestaurar} onClick={async()=>{
 setOcupado(true);setErro('')
 try { await api.backupRestaurar!(familia.id,copia.dados); desfazer.limpar(); limparRascunhos(); await trocarSessao();await recarregar();setCopia(null);setFeito('Cópia restaurada.') }
 catch(e){setErro((e as Error).message)} finally{setOcupado(false)}
 }}>Restaurar e substituir dados</button></Sheet>}
 </section>
}
