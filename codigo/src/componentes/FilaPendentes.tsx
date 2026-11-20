import './apoio-f32.css'
import { Icone } from './Icone'
import { useEffect, useState } from 'react'
import { pendentes } from '../app/pendentes'
export function FilaPendentes() {
 const [,mudar]=useState(0)
 useEffect(()=>{const sair=pendentes.ouvir(()=>mudar(n=>n+1));const repetir=()=>void pendentes.repetir();const t=setInterval(repetir,5000);addEventListener('online',repetir);
  // a fila vive só na memória: sair agora perde o que ainda não foi salvo, então o navegador pergunta antes
  const segurar=(e:BeforeUnloadEvent)=>{if(pendentes.itens.size){e.preventDefault();e.returnValue=''}};addEventListener('beforeunload',segurar)
  return()=>{sair();clearInterval(t);removeEventListener('online',repetir);removeEventListener('beforeunload',segurar)}},[])
 const n=pendentes.itens.size
 return n ? <div className="todo f32-feedback" role="status">Não foi possível salvar ainda. {n} {n===1?'pendente':'pendentes'}, tentando de novo. Mantenha o app aberto.<button type="button" onClick={()=>void pendentes.repetir()}><Icone nome="pendente" />Tentar agora</button></div> : null
}
