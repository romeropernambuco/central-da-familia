export function Conferencia({ erro, repetir }: { erro?: boolean; repetir: () => void }) {
  return erro ? (
    <p role="alert">
      Não foi possível conferir.{' '}
      <button type="button" className="btn line" onClick={repetir}>
        Tentar de novo
      </button>
    </p>
  ) : (
    <p role="status">Conferindo…</p>
  )
}
