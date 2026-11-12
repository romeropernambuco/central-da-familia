/** Ícone da Central: casinha em pixel branca no quadrado verde (o mesmo do ícone do iPhone). */
export function Marca({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="16" height="16" fill="#0E7A5A" />
      <rect x="7" y="3" width="2" height="1" fill="#fff" /><rect x="6" y="4" width="4" height="1" fill="#fff" />
      <rect x="5" y="5" width="6" height="1" fill="#fff" /><rect x="4" y="6" width="8" height="1" fill="#fff" />
      <rect x="3" y="7" width="10" height="1" fill="#fff" /><rect x="4" y="8" width="8" height="5" fill="#fff" />
      <rect x="7" y="10" width="2" height="3" fill="#0E7A5A" /><rect x="5" y="9" width="1" height="1" fill="#F2C94C" /><rect x="10" y="9" width="1" height="1" fill="#F2C94C" />
    </svg>
  )
}
