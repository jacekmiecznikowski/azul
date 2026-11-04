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
    <div className="sg-round-v54-bonus" aria-label={`Premiowany kolor: ${GLASS_COLOR_LABELS_PL[colors[round - 1]] ?? 'brak'}`}>
      <span className="sg-round-v54-bonus-label">PREMIOWANY KOLOR</span>
      {colors[round - 1] && <span className="sg-round-v54-featured-gem" aria-hidden="true"><GlassPiece color={colors[round - 1]}/></span>}
      <strong className="sg-round-v54-color-name">{(GLASS_COLOR_LABELS_PL[colors[round - 1]] ?? '—').toLocaleUpperCase('pl-PL')}</strong>
    </div>

  </section>
}
