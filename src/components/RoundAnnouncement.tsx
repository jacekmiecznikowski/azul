import { GlassPiece } from './GameBoard'
import type { GlassColor } from '../game/engine'

const BONUS_COLORS: Record<GlassColor, string> = {
  rose: 'CZERWONY',
  citrine: 'ŻÓŁTY',
  cyan: 'NIEBIESKI',
  amber: 'POMARAŃCZOWY',
  slate: 'BIAŁY',
}

/** Visual-only announcement; never blocks the game or changes its timing. */
export function RoundAnnouncement({ round, color }: { round: number; color: GlassColor }) {
  return <div className="sg-round-announcement" role="status" aria-live="polite"
    aria-label={`Rozpoczęła się runda ${round}. Premiowany kolor: ${BONUS_COLORS[color].toLowerCase()}.`}>
    <div className="sg-round-announcement-card">
      <span className="sg-round-announcement-kicker">WITRAŻE SINTRY</span>
      <div className="sg-round-announcement-heading"><span>RUNDA</span><strong>{round}</strong></div>
      <span className="sg-round-announcement-separator" aria-hidden="true">✦</span>
      <span className="sg-round-announcement-label">PREMIOWANY KOLOR</span>
      <div className="sg-round-announcement-bonus">
        <span className="sg-round-announcement-gem" aria-hidden="true"><GlassPiece color={color}/></span>
        <strong>{BONUS_COLORS[color]}</strong>
      </div>
    </div>
  </div>
}
