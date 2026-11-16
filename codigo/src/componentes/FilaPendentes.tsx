import { useEffect, useState } from 'react'
import { pendentes } from '../app/pendentes'
export function FilaPendentes() {
 const [,mudar]=useState(0)
 useEffect(()=>{const sair=pendentes.ouvir(()=>mudar(n=>n+1));const repetir=()=>void pendentes.repetir();const t=setInterval(repetir,5000);addEventListener('online',repetir);return()=>{sair();clearInterval(t);removeEventListener('online',repetir)}},[])
 const n=pendentes.itens.size
 return n ? <div className="todo" role="status">{n} {n===1?'pendente':'pendentes'}, tentando de novo. Mantenha o app aberto.<button type="button" onClick={()=>void pendentes.repetir()}>Tentar agora</button></div> : null
}
