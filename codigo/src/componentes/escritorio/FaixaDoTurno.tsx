import { Megaphone, Moon, RotateCcw, Sun, SunMoon, Sunset } from 'lucide-react'
import type { Turno } from '../../lib/escritorio/turno'
import { Icone } from '../Icone'

const DESENHO = { dia: Sun, fimDeTarde: Sunset, noite: Moon }

function fraseDoTurno(turno: Turno, dormem: boolean, alguemAcordado: boolean) {
  if (turno === 'dia') return 'Dia de trabalho.'
  if (turno === 'fimDeTarde') return 'Fim de tarde. A equipe está fechando o dia.'
  if (!dormem) return 'Noite. A equipe acordou com o seu chamado.'
  return alguemAcordado
    ? 'Noite. A equipe dormiu; quem precisa de você ficou acordado.'
    : 'Noite. A equipe está dormindo.'
}

/** A linha em cima do Escritório: diz a parte do dia, mostra o dia passando e deixa chamar a equipe para uma reunião. */
export function FaixaDoTurno({
  turno,
  dormem,
  acordados,
  alguemAcordado,
  chamar,
  deixarDormir,
  ensaio,
  verODia,
  voltar,
}: {
  turno: Turno
  dormem: boolean
  acordados: boolean
  /** de noite, quem precisa de você não dorme */
  alguemAcordado: boolean
  chamar: () => void
  deixarDormir: () => void
  /** a hora da amostra do dia passando; null = a hora de verdade */
  ensaio: number | null
  verODia: () => void
  voltar: () => void
}) {
  return (
    <div className="cena3d-turno" data-turno={turno}>
      <p role="status">
        <Icone desenho={DESENHO[turno]} size={18} />
        {ensaio !== null && <b>Amostra, {Math.floor(ensaio)}h.</b>}
        {fraseDoTurno(turno, dormem, alguemAcordado)}
      </p>
      <div className="cena3d-turno-acoes">
        {ensaio === null ? (
          <button type="button" className="pill" onClick={verODia}>
            <Icone desenho={SunMoon} />
            Ver o dia passar
          </button>
        ) : (
          <button type="button" className="pill" onClick={voltar}>
            <Icone desenho={RotateCcw} />
            Voltar para agora
          </button>
        )}
        {turno === 'noite' && acordados && (
          <button type="button" className="pill" onClick={deixarDormir}>
            <Icone desenho={Moon} />
            Deixar dormir
          </button>
        )}
        <button type="button" className="pill" onClick={chamar}>
          <Icone desenho={Megaphone} />
          {dormem ? 'Acordar para reunião' : 'Chamar para reunião'}
        </button>
      </div>
    </div>
  )
}
