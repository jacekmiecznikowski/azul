import { GlassPiece } from './GameBoard'
import type { GlassColor } from '../game/engine'
import { GLASS_COLOR_LABELS_PL } from '../game/colorLabels'

/** The bonus colors are actual faceted GlassPiece gems, not CSS-colored squares. */
export function RoundTracker({ round, colors }: { round: number; colors: GlassColor[] }) {
  return <section className="sg-header-round sg-round-tracker-v52"
    aria-label={`Runda ${round} z 6. Aktualna premia: ${colors[round - 1] ? GLASS_COLOR_LABELS_PL[colors[round - 1]] : 'brak'} szkło.`}>
    <div className="sg-round-v52-current">
      <span className="sg-round-v52-caption">RUNDA</span>
      <span className="sg-round-v52-count">{round}<small>/6</small></span>
    </div>
    <ol className="sg-round-v52-steps" aria-label="Kolory premii w kolejnych rundach">
      {colors.map((color, i) => {
        const number = i + 1
        const current = number === round
        const past = number < round
        return <li key={i}
          className={`sg-round-v52-step${current ? ' sg-round-v52-active' : past ? ' sg-round-v52-past' : ' sg-round-v52-future'}`}
          aria-current={current ? 'step' : undefined}
          aria-label={`Runda ${number}: ${GLASS_COLOR_LABELS_PL[color]}${current ? ', aktualna' : past ? ', zakończona' : ''}`}
          title={`Runda ${number}: ${GLASS_COLOR_LABELS_PL[color]}`}>
          <span className="sg-round-v52-index" aria-hidden="true">{number}</span>
          <span className="sg-round-v52-gem" aria-hidden="true"><GlassPiece color={color}/></span>
        </li>
      })}
    </ol>
  </section>
}
