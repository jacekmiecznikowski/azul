import type { SlotColor } from '../game/engine'
import { StainedGlassPane } from './EmptyGlassSocket'

/** Physical diamond used by the source buttons, same as a filled window. */
export function CutGlassDiamond({color,small=false}: {color:SlotColor;small?:boolean}) {
  return <StainedGlassPane color={color} filled small={small}/>
}
