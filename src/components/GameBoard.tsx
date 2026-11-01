import { Gem, RotateCcw, Sparkles } from 'lucide-react'
import { patternFor, WINDOW_POINTS } from '../game/engine'
import type { GlassColor, Player, SlotColor, WindowStrip } from '../game/engine'

const colors: Record<GlassColor, string> = {
  rose: 'czerwony', citrine: 'żółty', cyan: 'niebieski', amber: 'pomarańczowy', slate: 'biały',
}
const ORNAMENT_PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]] as const

/** In Palace A, 2 / 3 / 4 completed sides in a pair score 3 / 6 / 10 points. */
export function ornamentBonus(completedSides: number): number {
  return completedSides >= 4 ? 10 : completedSides === 3 ? 6 : completedSides === 2 ? 3 : 0
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

/** A common architectural crown binds two playable strips into one ornament. */
function OrnamentPair({ player, pairIndex, glazier, targets, selected, isHumanTurn, onTarget, palaceSide }: {
  player: Player
  pairIndex: number
  glazier: number
  targets?: ReadonlySet<number>
  selected: boolean
  isHumanTurn: boolean
  onTarget?: (index: number) => void
  palaceSide: 'A' | 'B'
}) {
  const [leftIndex, rightIndex] = ORNAMENT_PAIRS[pairIndex]
  const left = player.strips[leftIndex]
  const right = player.strips[rightIndex]
  const sides = left.side + right.side
  const completed = sides === 4
  const bonus = ornamentBonus(sides)
  const title = `Ornament ${pairIndex + 1}: kwatery ${leftIndex + 1} i ${rightIndex + 1}. ${sides} z 4 stron ukończonych.` +
    (palaceSide === 'A' ? ` Premia pałacu A: ${bonus} pkt na koniec gry.` : ' Na stronie B premia zależy od dominującego koloru szkła.')

  return <div className={`sg-ornament-pair${completed ? ' sg-ornament-complete' : ''}`}
    data-sg-ornament={pairIndex} data-ornament-progress={sides} title={title}
    role="group" aria-label={title}>
    <span className="sg-ornament-crown" aria-hidden="true">
      <svg viewBox="0 0 132 32" preserveAspectRatio="xMidYMid meet">
        <path className="sg-ornament-outline" d="M3 28 Q10 9 27 12 Q40 14 51 24 Q59 13 66 5 Q73 13 81 24 Q92 14 105 12 Q122 9 129 28"/>
        <path className={`sg-ornament-wing${left.side > 0 ? ' sg-ornament-wing-lit' : ''}${left.side === 2 ? ' sg-ornament-wing-full' : ''}`}
          d="M6 26 Q15 14 27 17 Q39 18 54 28 M24 17 Q30 7 41 10 Q49 13 54 21"/>
        <path className={`sg-ornament-wing${right.side > 0 ? ' sg-ornament-wing-lit' : ''}${right.side === 2 ? ' sg-ornament-wing-full' : ''}`}
          d="M126 26 Q117 14 105 17 Q93 18 78 28 M108 17 Q102 7 91 10 Q83 13 78 21"/>
        <path className={`sg-ornament-gem${completed ? ' sg-ornament-gem-lit' : ''}`}
          d="M66 8 L75 19 L66 29 L57 19 Z"/>
        <path className="sg-ornament-gem-line" d="M66 11 L66 26 M59 19 L73 19"/>
        {[0, 1, 2, 3].map((i) =>
          <path key={i} className={`sg-ornament-petal${i < left.side && i < 2 || i >= 2 && i - 2 < right.side ? ' sg-ornament-petal-lit' : ''}`}
            d={i === 0 ? 'M14 21 L19 16 L24 21 L19 26 Z'
              : i === 1 ? 'M36 18 L41 13 L46 18 L41 23 Z'
              : i === 2 ? 'M86 18 L91 13 L96 18 L91 23 Z'
              : 'M108 21 L113 16 L118 21 L113 26 Z'}/>)}
      </svg>
    </span>
    <Window strip={left} index={leftIndex} glazier={glazier} target={!!targets?.has(leftIndex)}
      selected={selected} isHumanTurn={isHumanTurn} onTarget={onTarget}/>
    <Window strip={right} index={rightIndex} glazier={glazier} target={!!targets?.has(rightIndex)}
      selected={selected} isHumanTurn={isHumanTurn} onTarget={onTarget}/>
  </div>
}

const avatars = ['✦', '✧', '✳', '❖']
export function GameBoard({ player, index, isCurrent, isHuman = false, isHumanTurn = false,
  targets, selected = false, onTarget, canReset = false, onReset, isStartingPlayer = false, hasFirstToken = false,
  palaceSide = 'A' }: {
  player: Player; index: number; isCurrent: boolean; isHuman?: boolean; isHumanTurn?: boolean
  targets?: ReadonlySet<number>; selected?: boolean; onTarget?: (index: number) => void
  canReset?: boolean; onReset?: () => void; isStartingPlayer?: boolean; hasFirstToken?: boolean
  palaceSide?: 'A' | 'B'
}) {
  const completed = player.strips.filter(s => s.side === 2).length
  return <section data-sg-board={index} className={`sg-board sg-player-${index} sg-palace-${player.palaceColor ?? 'red'}${isCurrent ? ' sg-board-current' : ''}${isHuman ? ' sg-board-human' : ''}`}
    aria-label={`Plansza gracza ${player.name} (${player.palaceColor === 'red' ? 'czerwona' : player.palaceColor === 'yellow' ? 'żółta' : player.palaceColor === 'blue' ? 'niebieska' : 'biała'})`}>
    <div className="sg-board-top">
      <span className={`sg-player-icon sg-player-icon-${index} sg-palace-icon-${player.palaceColor ?? 'red'}`}>{avatars[index]}</span>
      <span className="sg-board-name">{isHuman && player.name === 'Ty' ? 'Twoje witraże' : player.name} <small className="sg-palace-label">{({red:'CZERWONY', yellow:'ŻÓŁTY', blue:'NIEBIESKI', white:'BIAŁY'} as const)[player.palaceColor ?? 'red']}</small></span>
      <span className="sg-board-label">{isCurrent ? 'TERAZ GRA' : isStartingPlayer ? 'ROZPOCZĄŁ RUNDĘ' : player.controller === 'human' ? 'GRACZ LOKALNY' : `AI · ${player.difficulty === 'master' ? 'TRENING AI' : player.difficulty === 'expert' ? 'EKSPERT' : player.difficulty === 'hard' ? 'TRUDNY' : player.difficulty === 'easy' ? 'ŁATWY' : 'NORMALNY'}`}</span>
      {hasFirstToken && <span className="sg-start-tile sg-start-on-board" title="Ten gracz zdobył żeton pierwszego gracza i rozpocznie kolejną rundę">1</span>}
      <span className="sg-board-stat">{completed}/8 <small>okien</small></span>
      <span data-sg-break className="sg-board-stat">{player.brokenSteps}/8 <small>stłuczeń</small></span>
      <strong data-sg-score className="sg-board-score">{player.score}<small> pkt</small></strong>
      {isHuman && <button type="button" className="sg-reset" onClick={onReset} disabled={!canReset}><RotateCcw size={13}/> Cofnij witrażystę</button>}
    </div>
    <div className="sg-board-windows">
      {ORNAMENT_PAIRS.map((_, pairIndex) => <OrnamentPair key={pairIndex}
        pairIndex={pairIndex} player={player} glazier={player.glazier}
        targets={targets} selected={selected} isHumanTurn={isHuman && isHumanTurn}
        onTarget={onTarget} palaceSide={palaceSide}/>)}
    </div>
  </section>
}
