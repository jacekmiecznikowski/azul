import { useState } from 'react'
import { Castle, Gem, Layers3, Package, PanelsTopLeft, Sparkles, X } from 'lucide-react'
import { glassInventory } from '../game/engine'
import type { GameState } from '../game/engine'

/** Full-resolution stock ribbon; compact devices retain an accessible disclosure. */
export function GlassResources({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false)
  const stock = glassInventory(game)
  const locations = [
    { label:'Wieża', short:'Wieża', count:stock.tower, Icon:Castle },
    { label:'Warsztaty i środek', short:'Warsztat', count:stock.table, Icon:Layers3 },
    { label:'Witraże', short:'Witraże', count:stock.playerBoards, Icon:PanelsTopLeft },
    { label:'Szkła premii', short:'Premie', count:stock.roundTrack, Icon:Sparkles },
    { label:'Woreczek', short:'Woreczek', count:stock.bag, Icon:Package },
  ]
  return <div className="sg-resource-control">
    <div className="sg-resource-ribbon" role="group" aria-label="Zasoby szkła w grze">
      {locations.map(({label,short,count,Icon}) => <div className="sg-resource-ribbon-item"
        role="group" aria-label={`${label}: ${count}`} title={label} key={label}>
        <Icon size={15} strokeWidth={1.7} aria-hidden="true"/>
        <span className="sg-resource-ribbon-copy">
          <span className="sg-resource-ribbon-label">{short}</span>
          <span className="sg-resource-ribbon-value">{count}</span>
        </span>
      </div>)}
    </div>
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
