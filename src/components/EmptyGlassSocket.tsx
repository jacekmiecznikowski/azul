import type { SlotColor } from '../game/engine'

export const EMPTY_SLOT_LABELS: Record<SlotColor, string> = {
  rose: 'czerwone', citrine: 'żółte', cyan: 'niebieskie',
  amber: 'pomarańczowe', slate: 'białe', wild: 'dowolny kolor (joker)',
}

/** Both states use EXACTLY the same frame and four glass facets.
 * Empty: the diamond-shaped centre is an unfilled blue-green recess.
 * Filled: that very same recess receives a polished sheet of glass.
 * A pure visual component: no tiles are added to the engine.
 */
export function StainedGlassPane({ color, filled, small = false }: {
  color: SlotColor; filled: boolean; small?: boolean
}) {
  return <span
    className={`${filled ? 'sg-glass-placed' : 'sg-empty-socket'} sg-stained-pane sg-stained-pane-${color} sg-empty-socket-${color}${small ? ' sg-stained-pane-small sg-empty-socket-small' : ''}${filled ? ' sg-stained-pane-filled' : ' sg-stained-pane-empty'}`}
    role="img"
    aria-label={filled
      ? `Ułożona tafla: ${EMPTY_SLOT_LABELS[color]}`
      : `Puste pole, wymagane szkło: ${EMPTY_SLOT_LABELS[color]}`}
    title={filled ? `Ułożona tafla: ${EMPTY_SLOT_LABELS[color]}` : `Puste pole: ${EMPTY_SLOT_LABELS[color]}`}>
    <span className="sg-stained-frame" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-nw" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-ne" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-se" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-sw" aria-hidden="true"/>
    <span className="sg-socket-core" aria-hidden="true"><span className="sg-stained-facet"/></span>
  </span>
}

export function EmptyGlassSocket({ color, small = false }: { color: SlotColor; small?: boolean }) {
  return <StainedGlassPane color={color} filled={false} small={small}/>
}
