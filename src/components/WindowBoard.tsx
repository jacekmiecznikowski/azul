import { Gem, Sparkles } from 'lucide-react'
import { patternFor, WINDOW_POINTS } from '../game/engine'
import type { GlassColor, WindowStrip } from '../game/engine'

const COLORS_PL: Record<GlassColor, string> = {
  rose: 'Róż', citrine: 'Złoto', cyan: 'Turkus', amber: 'Bursztyn', slate: 'Srebro',
}

export function Glass({ color, small = false, ghost = false, onClick, selected = false, label }: {
  color: GlassColor | 'wild'; small?: boolean; ghost?: boolean; selected?: boolean
  onClick?: () => void; label?: string
}) {
  const className = `glass glass-${color}${small ? ' glass-sm' : ''}${ghost ? ' glass-ghost' : ''}${selected ? ' glass-selected' : ''}`
  const content = <><span className="glass-facet" /><span className="glass-spark">✦</span></>
  return onClick ? <button className={className} onClick={onClick} title={label || (color === 'wild' ? 'Joker' : COLORS_PL[color])} aria-label={label || (color === 'wild' ? 'Joker' : COLORS_PL[color])}>{content}</button>
    : <span className={className} title={label || (color === 'wild' ? 'Dowolny kolor' : COLORS_PL[color])}>{content}</span>
}

export function WindowCard({ strip, index, glazier, highlighted, active, onClick, isHumanTurn }: {
  strip: WindowStrip; index: number; glazier: number; highlighted: boolean; active: boolean; onClick: () => void; isHumanTurn: boolean
}) {
  const complete = strip.side === 2
  const pattern = patternFor(strip)
  const canClick = isHumanTurn && highlighted
  return <button className={`window-strip${complete ? ' window-complete' : ''}${highlighted ? ' window-highlight' : ''}${canClick ? ' window-clickable' : ''}${glazier === index ? ' window-glazier' : ''}${active ? ' window-active' : ''}`}
    onClick={onClick} disabled={!canClick} aria-label={`Kwatera ${index + 1}${highlighted ? ', można ułożyć tafle' : ''}`}>
    <div className="window-head">
      <span className="window-n">{String(index + 1).padStart(2, '0')}</span>
      {glazier === index && <span className="artisan" title="Witrażysta"><Gem size={14} strokeWidth={2.6} /></span>}
      <span className="window-side">{complete ? '✓' : strip.side === 0 ? 'A' : 'B'}</span>
    </div>
    <div className={`reverse-preview${complete ? ' reverse-finished' : ''}`} title="Ściągawka: kolor pól po drugiej stronie kwatery">
      <span className="reverse-caption">REWERS</span>
      <div className="reverse-colors">{(strip.side === 0 ? strip.back : strip.front).map((color, i) =>
        <span key={i} className={`reverse-dot tile-${color}`} aria-label={color === 'wild' ? 'Joker' : COLORS_PL[color]} />)}</div>
    </div>
    <div className="pattern-frame">
      {complete ? <div className="pattern-finished"><Sparkles size={20} /><small>UKOŃCZONO</small></div> : pattern.map((slot, slotIndex) =>
        <div key={slotIndex} className={`pattern-cell${strip.panes[slotIndex] ? ' filled' : ''}`}>
          {strip.panes[slotIndex] ? <Glass color={strip.panes[slotIndex]} /> : <Glass color={slot} ghost />}
        </div>)}
    </div>
    <div className="palace-window">
      <div className={`palace-pane${strip.upper ? ' has-glass' : ''}`}>
        {strip.upper ? <Glass color={strip.upper} small /> : <span className="pane-line">✦</span>}
      </div>
      <div className={`palace-pane${strip.lower ? ' has-glass' : ''}`}>
        {strip.lower ? <Glass color={strip.lower} small /> : <span className="pane-line">✦</span>}
      </div>
    </div>
    <span className="window-points"><Sparkles size={12} /> {WINDOW_POINTS[index]}</span>
  </button>
}
