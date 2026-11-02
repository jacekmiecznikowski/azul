import type { SlotColor } from '../game/engine'

export const EMPTY_SLOT_LABELS: Record<SlotColor, string> = {
  rose: 'czerwone', citrine: 'żółte', cyan: 'niebieskie',
  amber: 'pomarańczowe', slate: 'białe', wild: 'dowolny kolor (joker)',
}

/** One shared, one-piece diamond. The same DOM and visible material is used
 * loose in the factories/center and seated in the window. Placement changes
 * ONLY the center fill; the outer facets, proportions and colors are identical.
 * This component does not change the game's tile or slot data.
 */
export function StainedGlassPane({ color, filled, small = false }: {
  color: SlotColor; filled: boolean; small?: boolean
}) {
  return <span
    className={`${filled ? 'sg-glass-placed' : 'sg-empty-socket'} sg-stained-pane sg-stained-pane-${color}${filled ? '' : ` sg-empty-socket-${color}`}${small ? ' sg-stained-pane-small sg-empty-socket-small' : ''} sg-stained-pane-${filled ? 'filled' : 'empty'}`}
    role="img"
    aria-label={filled ? `Ułożona tafla: ${EMPTY_SLOT_LABELS[color]}` : `Puste pole, wymagane szkło: ${EMPTY_SLOT_LABELS[color]}`}
    title={filled ? `Ułożona tafla: ${EMPTY_SLOT_LABELS[color]}` : `Puste pole: ${EMPTY_SLOT_LABELS[color]}`}>
    <span className="sg-stained-frame" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-nw" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-ne" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-se" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-sw" aria-hidden="true"/>
    <span className="sg-socket-core" aria-hidden="true"><span className="sg-stained-facet"/></span>
    <span className={`sg-glass-diamond-v42${filled ? ' sg-glass-diamond-filled' : ' sg-glass-diamond-empty'}`} aria-hidden="true">
      <span className="sg-glass-diamond-core-v42"/>
      <span className="sg-glass-diamond-facet-v42"/>
    </span>
  </span>
}

export function EmptyGlassSocket({ color, small = false }: { color: SlotColor; small?: boolean }) {
  return <StainedGlassPane color={color} filled={false} small={small}/>
}
