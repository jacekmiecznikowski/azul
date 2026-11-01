import { Gem, RotateCcw, Sparkles } from 'lucide-react'
import { patternFor, WINDOW_POINTS } from '../game/engine'
import type { GlassColor, Player, SlotColor, WindowStrip } from '../game/engine'

const colors: Record<GlassColor, string> = {
  rose: 'czerwony', citrine: 'żółty', cyan: 'niebieski', amber: 'pomarańczowy', slate: 'biały',
}

export function GlassPiece({ color, placed = true, small = false }: {
  color: SlotColor; placed?: boolean; small?: boolean
}) {
  return <span className={`sg-glass sg-glass-${color}${placed ? ' sg-glass-placed' : ' sg-glass-guide'}${small ? ' sg-glass-small' : ''}`}
    title={color === 'wild' ? 'Dowolny kolor' : `${placed ? 'Tafla' : 'Potrzebny kolor'}: ${colors[color]}`}>
    <span className="sg-glass-inner"/>
  </span>
}

function Window({ strip, index, glazier, target, selected, isHumanTurn, onTarget }: {
  strip: WindowStrip; index: number; glazier: number; target: boolean; selected: boolean
  isHumanTurn: boolean; onTarget?: (index: number) => void
}) {
  const complete = strip.side === 2
  const reverse = strip.side === 0 ? strip.back : strip.front
  const canPick = isHumanTurn && target
  return <button type="button" disabled={!canPick} onClick={() => onTarget?.(index)}
    data-sg-window={index} className={`sg-window${complete ? ' sg-window-completed' : ''}${canPick ? ' sg-window-target' : ''}${glazier === index ? ' sg-window-active' : ''}${selected ? ' sg-window-selecting' : ''}`}
    title={`Kwatera ${index + 1}; ${WINDOW_POINTS[index]} pkt${canPick ? '; kliknij, aby ułożyć tafle' : ''}`}>
    <span className="sg-window-head"><span>{String(index + 1).padStart(2, '0')}</span>
      <span className="sg-window-glazier">{glazier === index ? <Gem size={12}/> : null}</span>
      <span>{complete ? '✓' : strip.side === 0 ? 'A' : 'B'}</span></span>
    {!complete && <span className="sg-window-reverse" aria-label="Podgląd drugiej strony">
      {reverse.map((color, i) => <i key={i} className={`sg-color-dot sg-color-dot-${color}`}/>)}</span>}
    <span className="sg-window-lancet">
      {complete ? <span className="sg-finished"><Sparkles size={20}/><b>GOTOWE</b></span>
        : patternFor(strip).map((color, i) =>
          <span key={i} data-sg-pane={i} className={`sg-pane${strip.panes[i] ? ' sg-pane-filled' : ''}`}>
            <GlassPiece color={strip.panes[i] ?? color} placed={!!strip.panes[i]}/>
          </span>)}
    </span>
    <span className="sg-window-foot"><span className="sg-window-kept">
      <span>{strip.upper ? <GlassPiece color={strip.upper} small/> : <i/>}</span>
      <span>{strip.lower ? <GlassPiece color={strip.lower} small/> : <i/>}</span>
    </span><b>{WINDOW_POINTS[index]} <small>PKT</small></b></span>
  </button>
}

const avatars = ['✦', '✧', '✳', '❖']
export function GameBoard({ player, index, isCurrent, isHuman = false, isHumanTurn = false,
  targets, selected = false, onTarget, canReset = false, onReset, isStartingPlayer = false, hasFirstToken = false }: {
  player: Player; index: number; isCurrent: boolean; isHuman?: boolean; isHumanTurn?: boolean
  targets?: ReadonlySet<number>; selected?: boolean; onTarget?: (index: number) => void
  canReset?: boolean; onReset?: () => void; isStartingPlayer?: boolean; hasFirstToken?: boolean
}) {
  const completed = player.strips.filter(s => s.side === 2).length
  return <section data-sg-board={index} className={`sg-board sg-player-${index} sg-palace-${player.palaceColor ?? 'red'}${isCurrent ? ' sg-board-current' : ''}${isHuman ? ' sg-board-human' : ''}`}
    aria-label={`Plansza gracza ${player.name} (${player.palaceColor === 'red' ? 'czerwona' : player.palaceColor === 'yellow' ? 'żółta' : player.palaceColor === 'blue' ? 'niebieska' : 'biała'})`}>
    <div className="sg-board-top">
      <span className={`sg-player-icon sg-player-icon-${index} sg-palace-icon-${player.palaceColor ?? 'red'}`}>{avatars[index]}</span>
      <span className="sg-board-name">{isHuman ? 'Twoje witraże' : player.name} <small className="sg-palace-label">{({red:'CZERWONY', yellow:'ŻÓŁTY', blue:'NIEBIESKI', white:'BIAŁY'} as const)[player.palaceColor ?? 'red']}</small></span>
      <span className="sg-board-label">{isCurrent ? 'TERAZ GRA' : isStartingPlayer ? 'ROZPOCZĄŁ RUNDĘ' : isHuman ? 'TWOJA PLANSZA' : `AI · ${player.difficulty === 'master' ? 'TRENING AI' : player.difficulty === 'expert' ? 'EKSPERT' : player.difficulty === 'hard' ? 'TRUDNY' : player.difficulty === 'easy' ? 'ŁATWY' : 'NORMALNY'}`}</span>
      {hasFirstToken && <span className="sg-start-tile sg-start-on-board" title="Ten gracz zdobył żeton pierwszego gracza i rozpocznie kolejną rundę">1</span>}
      <span className="sg-board-stat">{completed}/8 <small>okien</small></span>
      <span data-sg-break className="sg-board-stat">{player.brokenSteps}/8 <small>stłuczeń</small></span>
      <strong data-sg-score className="sg-board-score">{player.score}<small> pkt</small></strong>
      {isHuman && <button type="button" className="sg-reset" onClick={onReset} disabled={!canReset}><RotateCcw size={13}/> Cofnij witrażystę</button>}
    </div>
    <div className="sg-board-windows">
      {player.strips.map((strip, i) => <Window key={i} strip={strip} index={i}
        glazier={player.glazier} target={!!targets?.has(i)} selected={selected}
        isHumanTurn={isHuman && isHumanTurn} onTarget={onTarget}/>)}
    </div>
    <div className="sg-board-engraving"><span>✥</span><span>SINTRA · PRACOWNIA WITRAŻY</span><span>✥</span></div>
  </section>
}
