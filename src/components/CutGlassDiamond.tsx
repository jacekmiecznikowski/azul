import type { SlotColor } from '../game/engine'

const GLASS_LABELS: Record<SlotColor,string> = {
  rose:'czerwone',citrine:'żółte',cyan:'niebieskie',
  amber:'pomarańczowe',slate:'białe',wild:'joker',
}

/** One identical physical tile for a loose glass piece and a placed pane.
 * The container decides only the size; the faceting and color stay identical.
 */
export function CutGlassDiamond({color,small=false}: {color:SlotColor;small?:boolean}) {
  return <span
    className={`sg-glass sg-glass-${color} sg-glass-placed sg-cut-diamond${small?' sg-glass-small':''}`}
    role="img" aria-label={`Szklana tafla: ${GLASS_LABELS[color]}`}
    title={`Tafla: ${GLASS_LABELS[color]}`}>
      <span className="sg-glass-inner"/>
    </span>
}
