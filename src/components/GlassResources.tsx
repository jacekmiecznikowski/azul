import { useState } from 'react'
import { Gem, X } from 'lucide-react'
import { glassInventory } from '../game/engine'
import type { GameState } from '../game/engine'

/** Always accessible from the global toolbar, never reduces the playable market. */
export function GlassResources({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false)
  const stock = glassInventory(game)
  const locations = [
    {label:'Wieża', count:stock.tower},
    {label:'Warsztaty i środek', count:stock.table},
    {label:'Witraże', count:stock.playerBoards},
    {label:'Szkła premii', count:stock.roundTrack},
    {label:'Woreczek', count:stock.bag},
  ]
  return <div className="sg-resource-control">
    <button type="button" className="sg-resource-trigger" aria-expanded={open}
      aria-controls="sg-resources-popover" aria-label="Pokaż zasoby szkła"
      title="Zasoby szkła" onClick={() => setOpen(value => !value)}>
      <Gem size={15} aria-hidden="true"/><span>Zasoby</span>
    </button>
    {open && <div id="sg-resources-popover" className="sg-resource-popover" role="region" aria-label="Zasoby szkła">
      <div className="sg-resource-popover-title"><strong>Bilans szkła</strong>
        <button type="button" aria-label="Zamknij zasoby" onClick={() => setOpen(false)}><X size={14}/></button>
      </div>
      <dl className="sg-resource-list">
        {locations.map(({label,count}) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
      </dl>
    </div>}
  </div>
}
