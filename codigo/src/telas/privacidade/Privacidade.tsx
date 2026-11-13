import { useState } from 'react'
import { Download, Trash2, ShieldCheck, Copy } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Sheet } from '../../componentes/base'
import { hojeRecife } from '../../lib/formato'

/** Privacidade: termo em 1 tela, baixar os dados da família e apagar a família inteira. */
export function Privacidade() {
  const { api, familia, trocarSessao, toast } = useApp()
  const [apagar, setApagar] = useState(false)
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState('')
  const casal = familia?.papel === 'casal'
  const [json, setJson] = useState<string | null>(null)

  async function baixar() {
    if (!familia) return
    const dados = await api.exportarFamilia(familia.id)
    // modo exemplo: o visualizador do demo não deixa baixar arquivo, então mostra o conteúdo na tela pra copiar
    if (api.modo === 'exemplo') { setJson(JSON.stringify(dados, null, 2)); return }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `central-da-familia-${hojeRecife()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    toast('Arquivo com todos os dados baixado.')
  }

  return (
    <div className="tela-larga">
      <section className="card termo" aria-labelledby="tT">
        <h2 id="tT"><ShieldCheck size={24} aria-hidden="true" />Termo de uso, em 1 tela</h2>
        <h3>O que guardamos</h3>
        <p>Nome da família, quem participa, limites, cartões (só nome e dias), lançamentos e o que vocês anotam da casa. Não guardamos senha de banco nem número de cartão.</p>
        <h3>Quem vê</h3>
        <p>Só a sua família. Cada um vê o seu e a Casa; juntos, o placar: cada um do casal vê o próprio limite, os próprios cartões e a própria renda, e os 2 veem a Casa e a conta do fim do mês do casal, sem nenhum gasto do outro. Cada pessoa da família (um filho, a avó) vê só o próprio orçamento. A equipe da casa vê só a tela da Casa e nunca um valor em dinheiro. Nenhuma outra família vê nada, nem por erro: o banco tranca por família.</p>
        <h3>Inteligência artificial</h3>
        <p>A IA só lê a foto do cupom quando você manda e mostra pra você conferir antes de salvar. A conta de dinheiro é sempre do banco, nunca da IA. Cupom pode ter CPF: o app avisa antes de enviar.</p>
        <h3>Seus direitos (LGPD)</h3>
        <p>Você pode baixar tudo a qualquer hora e apagar a família inteira. Apagar é de vez e não tem volta.</p>
      </section>
      {!casal && <div className="col"><section className="card"><p className="sub">Baixar e apagar os dados da família é com o casal.</p></section></div>}
      {casal && <div className="col">
        <section className="card" aria-labelledby="bT">
          <h2 id="bT">Baixar meus dados</h2>
          <p className="sub" style={{ margin: '8px 0 12px' }}>Um arquivo com tudo da família, pra guardar ou levar pra outro lugar.</p>
          <button className="btn line" type="button" onClick={baixar} disabled={!casal}><Download size={20} />Baixar os dados</button>
          {!casal && <p className="sub" style={{ marginTop: 8 }}>Só o casal pode baixar.</p>}
        </section>
        <section className="card" aria-labelledby="aT">
          <h2 id="aT">Apagar a família</h2>
          <p className="sub" style={{ margin: '8px 0 12px' }}>Apaga lançamentos, cartões, limites, equipe e convites. Não tem como desfazer.</p>
          <button className="btn danger line" type="button" onClick={() => setApagar(true)} disabled={!casal}><Trash2 size={20} />Apagar a família</button>
        </section>
      </div>}
      {json != null && (
        <Sheet titulo="Seus dados" fechar={() => setJson(null)}>
          <p className="sub">No exemplo o arquivo não é baixado: o conteúdo aparece aqui. Toque em Copiar e cole onde quiser guardar.</p>
          <textarea className="inp" readOnly value={json} aria-label="Dados da família em texto" style={{ minHeight: 260, fontFamily: 'ui-monospace, monospace', fontSize: 12, whiteSpace: 'pre', overflow: 'auto' }} onFocus={e => e.currentTarget.select()} />
          <button className="btn primary full" type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(json); toast('Dados copiados.') }
            catch { const t = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Dados da família em texto"]'); t?.select(); toast('Selecionado. Use Copiar do aparelho.') }
          }}><Copy size={20} />Copiar</button>
        </Sheet>
      )}
      {apagar && familia && (
        <Sheet titulo="Apagar a família?" fechar={() => setApagar(false)}>
          <p className="corpo">Pra confirmar, digite o nome da família igualzinho: <b>{familia.nome}</b></p>
          <input className="inp" value={conf} onChange={e => setConf(e.target.value)} aria-label="Nome da família" />
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button className="btn danger on full" type="button" disabled={conf.trim() !== familia.nome} onClick={async () => {
            try { await api.apagarFamilia(familia.id, conf); setApagar(false); await trocarSessao() } catch (e) { setErro((e as Error).message) }
          }}><Trash2 size={20} />Apagar tudo de vez</button>
          <button className="btn ghost full" type="button" onClick={() => setApagar(false)}>Não apagar</button>
        </Sheet>
      )}
    </div>
  )
}
