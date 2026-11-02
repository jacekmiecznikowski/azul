import type { SlotColor } from '../game/engine'

export const EMPTY_SLOT_LABELS: Record<SlotColor, string> = {
  rose: 'czerwone', citrine: 'żółte', cyan: 'niebieskie',
  amber: 'pomarańczowe', slate: 'białe', wild: 'dowolny kolor (joker)',
}

/** Four bright glass shards surround a genuinely EMPTY dark diamond. */
export function EmptyGlassSocket({ color, small = false }: { color: SlotColor; small?: boolean }) {
  return <span className={`sg-empty-socket sg-empty-socket-${color}${small ? ' sg-empty-socket-small' : ''}`}
    role="img" aria-label={`Puste pole, wymagane szkło: ${EMPTY_SLOT_LABELS[color]}`}
    title={`Puste pole: ${EMPTY_SLOT_LABELS[color]}`}>
    <i className="sg-socket-shard sg-socket-shard-nw" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-ne" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-se" aria-hidden="true"/>
    <i className="sg-socket-shard sg-socket-shard-sw" aria-hidden="true"/>
    <span className="sg-socket-core" aria-hidden="true"/>
  </span>
}
