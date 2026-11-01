import type { GlassColor } from '../game/engine'

const LABELS: Record<GlassColor, string> = {
  rose:'Czerwone',citrine:'Żółte',cyan:'Niebieskie',amber:'Pomarańczowe',slate:'Białe',
}

/** Shared presentation; round colors and scoring remain owned by game/engine. */
export function RoundTracker({ round, colors }: { round: number; colors: GlassColor[] }) {
  const active = colors[round - 1]
  return <section className="sg-header-round sg-round-tracker-v34"
    aria-label={`Runda ${round} z 6. Premia teraz: ${active ? LABELS[active] : 'brak'} szkło.`}>
    <div className="sg-round-v34-current"><span>RUNDA</span><strong>{round}<small>/6</small></strong></div>
    <div className="sg-round-v34-sequence" role="group" aria-label="Premie szkła w kolejnych sześciu rundach">
      {colors.map((color, i) => <span key={i}
        className={`sg-round-v34-step${i+1===round?' sg-round-v34-active':i+1<round?' sg-round-v34-past':''}`}
        aria-label={`Runda ${i+1}: ${LABELS[color]}${i+1===round?', aktualna premia':''}`}
        aria-current={i+1===round?'step':undefined}
        title={`Runda ${i+1}: ${LABELS[color].toLowerCase()} szkło`}>
        <span className="sg-round-v34-number">{i+1}</span><i className={`sg-color-dot sg-color-dot-${color}`} aria-hidden="true"/>
      </span>)}
    </div>
    <div className="sg-round-v34-bonus" aria-label={`Teraz premiowane: ${active ? LABELS[active] : 'brak'}`}>
      <small>PREMIA TERAZ</small><strong>{active ? LABELS[active] : '—'}</strong>
    </div>
  </section>
}
