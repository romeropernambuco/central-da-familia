import './privacidade.css'
import { PrivacidadeOlho } from '../../componentes/ilustracoes'
import { Icone } from '../../componentes/Icone'
import { resumoPrivacidade, VERSAO_PRIVACIDADE } from './resumos'
import { Backup } from '../../componentes/Backup'
import { copiarProtegido } from '../../componentes/privacidade'
import { textoPrivado, CampoPrivado } from '../../componentes/privacidade'
import { useEffect, useState } from 'react'
import { Download, Trash2, ShieldCheck, Copy } from 'lucide-react'
import { useApp } from '../../app/contexto'

import { Sheet } from '../../componentes/base'
import { hojeRecife, valoresOcultos } from '../../lib/formato'

/** Privacidade: termo em 1 tela, baixar os dados da família e apagar a família inteira. */
export function Privacidade() {
  const { api, familia, trocarSessao, toast, oculto, sair } = useApp()
  // QA E11 (erro 7): família de 1 adulto lê "você", nunca "vocês dois"

  const [apagar, setApagar] = useState(false)
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState('')
  const casal = familia?.papel === 'casal'
  const [json, setJson] = useState<string | null>(null)

  useEffect(() => { if (oculto) setJson(null) }, [oculto])

  // E2 (conserto 1): o casal baixa a família inteira, com o nome do dono em cada linha; a filha baixa só o dela
  const soOMeu = !casal
  async function baixar() {
    if (!familia) return
    if (soOMeu && !api.exportarMeu) { toast('Baixar só os seus dados ainda está sendo ligado no banco da família.'); return }
    const confirmar = () => window.confirm('Os valores aparecerão no arquivo, mesmo com o olho fechado. Deseja baixar os seus dados?')
    const confirmado = valoresOcultos() && confirmar()
    if(valoresOcultos() && !confirmado)return
    let dados: unknown
    try { dados = soOMeu ? await api.exportarMeu!(familia.id) : await api.exportarFamilia(familia.id) } catch (e) { toast((e as Error).message); return }
    if (valoresOcultos() && !confirmado && !confirmar()) return
    // modo exemplo: o visualizador do demo não deixa baixar arquivo, então mostra o conteúdo na tela pra copiar
    if (api.modo === 'exemplo' && !valoresOcultos()) { setJson(JSON.stringify(dados, null, 2)); return }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `central-da-familia-${hojeRecife()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    toast(soOMeu ? 'Arquivo com os seus dados baixado.' : 'Arquivo com os dados da família baixado, com o nome do dono em cada linha.')
  }

  return (
    <div className="tela-larga f32-privacidade">
      {familia?.papel === 'equipe' && <button type="button" className="btn line" onClick={async()=>{location.hash='#/inicio';await sair()}}><Icone nome="abrir" />Sair</button>}
      <section className="card termo" aria-labelledby="tT">
        <PrivacidadeOlho /><h2 id="tT"><Icone desenho={ShieldCheck} aria-hidden="true" />Termo de uso, em 1 tela</h2>
        <p className="sub">Versão {VERSAO_PRIVACIDADE} · {familia?.papel === 'equipe' ? 'Assessor da Casa' : familia?.papel === 'casal' ? 'Casal' : 'Pessoa da família'}</p>
        {resumoPrivacidade(familia?.papel || null).map(([titulo, texto]) => <div key={titulo}><h3>{titulo}</h3><p>{texto}</p></div>)}
        <h3>Leitura de cupom</h3><p>A foto é enviada para leitura quando você solicita. Confira os dados antes de salvar; o cupom pode conter informações pessoais.</p>
      </section>
      {familia?.papel !== 'equipe' && <div className="col">
        <section className="card" aria-labelledby="bT">
          <h2 id="bT">{casal ? 'Baixar os dados da família' : 'Baixar meus dados'}</h2>
          <p className="sub" style={{ margin: '8px 0 12px' }}>{casal ? 'Um arquivo com os dados disponíveis da família. Confira o conteúdo antes de guardar ou compartilhar.' : 'Um arquivo com o seu orçamento e os seus gastos. O resto da família fica de fora.'}</p>
          <button className="btn line" type="button" onClick={baixar}><Icone desenho={Download} />{casal ? 'Baixar os dados da família' : 'Baixar meus dados'}</button>
        </section>
        <Backup />
        {!casal && <section className="card"><p className="sub">Quem pode apagar tudo é o casal.</p></section>}
        {casal && <section className="card" aria-labelledby="aT">
          <h2 id="aT">Apagar a família</h2>
          <p className="sub" style={{ margin: '8px 0 12px' }}>Apaga lançamentos, cartões, limites, cadastros de Assessores da Casa e convites. Esta ação é definitiva.</p>
          <button className="btn danger line" type="button" onClick={() => setApagar(true)} disabled={!casal}><Icone desenho={Trash2} />Apagar a família</button>
        </section>}
      </div>}
      {json != null && !oculto && (
        <Sheet titulo={casal ? 'Dados da família' : 'Seus dados'} fechar={() => setJson(null)}>
          <p className="sub">No exemplo o arquivo não é baixado: o conteúdo aparece aqui. Toque em Copiar e cole onde quiser guardar.</p>
          <textarea className="inp" readOnly value={json} aria-label="Dados da família em texto" style={{ minHeight: 260, fontFamily: 'ui-monospace, monospace', fontSize: 12, whiteSpace: 'pre', overflow: 'auto' }} onFocus={e => e.currentTarget.select()} />
          <button className="btn primary full" type="button" onClick={async () => {
            try { if (await copiarProtegido(json, undefined, toast)) toast('Dados copiados.') }
            catch { const t = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Dados da família em texto"]'); t?.select(); toast('Selecionado. Use Copiar do aparelho.') }
          }}><Icone desenho={Copy} />Copiar</button>
        </Sheet>
      )}
      {apagar && familia && (
        <Sheet titulo="Apagar a família?" fechar={() => setApagar(false)}>
          <p className="corpo">Para confirmar, digite o nome da família como aparece aqui: <b>{textoPrivado(familia.nome)}</b></p>
          <CampoPrivado className="inp" value={conf} onChange={e => setConf(e.target.value)} aria-label="Nome da família" />
          {erro && <p className="erro" role="alert">{textoPrivado(erro)}</p>}
          <button className="btn danger on full" type="button" disabled={conf.trim() !== familia.nome} onClick={async () => {
            try { await api.apagarFamilia(familia.id, conf); setApagar(false); await trocarSessao() } catch (e) { setErro((e as Error).message) }
          }}><Icone desenho={Trash2} />Apagar tudo de vez</button>
          <button className="btn ghost full" type="button" onClick={() => setApagar(false)}>Não apagar</button>
        </Sheet>
      )}
    </div>
  )
}
