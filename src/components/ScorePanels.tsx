import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { BROKEN_TRACK, nextClockwisePlayer } from '../game/engine'
import type { GameState, Player } from '../game/engine'
import { GLASS_COLOR_LABELS_PL } from '../game/colorLabels'
import { GlassPiece } from './GameBoard'


/** The engraved physical track is 0–99; scores above 99 do another lap.
 * Exact scores (including any negatives) always remain visible in the legend. */
export function scoreTrackPosition(score: number): number {
  return score <= 0 ? 0 : Math.trunc(score) % 100
}

/** A continuous, 100-square double rectangular orbit around the original
 * central broken-glass ladder: 54 outer squares + 46 inner squares. */
export function scoreTrackCoordinates(): ReadonlyArray<readonly [number,number]> {
  const side: Array<readonly [number,number]> = [[0,0]]
  let col=0
  while(col<17) {
    if(col===4 || col===10) {
      side.push([1,col],[2,col],[2,col+1],[2,col+2],[1,col+2],[0,col+2])
      col+=2
    } else { col++; side.push([0,col]) }
  }
  const coordinates: Array<readonly [number,number]> = []
  for(let rotation=0;rotation<4;rotation++) {
    for(const point of side.slice(0,-1)) {
      let [row,column]=point
      for(let turn=0;turn<rotation;turn++) [row,column]=[column,17-row]
      coordinates.push([row,column])
    }
  }
  return coordinates
}

export function scoreTrackCells(): number[] {
  return scoreTrackCoordinates().map((_,score)=>score)
}

function PlayerMarker({ player, compact = false }: { player: Player; compact?: boolean }) {
  return <i className={`sg-pawn sg-pawn-color-${player.palaceColor ?? 'red'}${compact ? ' sg-score-marker-compact' : ''}`}
    title={`${player.name}: ${player.score} pkt`} aria-hidden="true"/>
}

/** Shared across both score modes. Every premium glass is the real GlassPiece. */
export function ScoreRoundBonuses({ game }: { game: GameState }) {
  return <div className="sg-score-rounds" role="group"
    aria-label={`Runda ${game.round} z 6. Premia: ${GLASS_COLOR_LABELS_PL[game.roundColors[game.round - 1]] ?? 'brak'}`}>
    <div className="sg-score-rounds-heading"><b>RUNDY I PREMIE</b><strong>{game.round}<small>/6</small></strong></div>
    <p className="sg-score-bonus-label">Kolor premii: <strong>{GLASS_COLOR_LABELS_PL[game.roundColors[game.round - 1]]}</strong></p>
    <div className="sg-score-rounds-row">
      {game.roundColors.map((color, index) =>
        <div key={index}
          className={`sg-score-round-tile${index + 1 === game.round ? ' sg-score-round-current' : ''}${index + 1 < game.round ? ' sg-score-round-past' : ''}`}
          title={`Runda ${index + 1}: ${GLASS_COLOR_LABELS_PL[color]}`}
          aria-label={`Runda ${index + 1}, kolor: ${GLASS_COLOR_LABELS_PL[color]}`}
          aria-current={index + 1 === game.round ? 'step' : undefined}>
          <small>{index + 1}</small>
          <span className="sg-score-round-gem" aria-hidden="true"><GlassPiece color={color}/></span>
        </div>
      )}
    </div>
  </div>
}

/** Digital mode: penalties read like the score list, not a second physical board. */
const PAWN_COLORS = {red:'#b82731', yellow:'#dec06b', blue:'#17548b', white:'#f3f6f4'}

export function SharedFieldMarker({players, broken = false}:{players:Player[]; broken?:boolean}) {
  if (!players.length) return null
  return <span className={`sg-pawn-stack${broken ? ' sg-pawns-inline' : ''}`} role="img" aria-label={players.map(p=>broken ? `${p.name}: ${p.brokenSteps}/8 stłuczeń` : `${p.name}: ${p.score} pkt`).join('; ')}>
    {players.map((p,i)=><span key={p.id} className="sg-stacked-pawn" title={broken ? `${p.name}: ${p.brokenSteps}/8 stłuczeń` : `${p.name}: ${p.score} pkt`}
      style={{background:PAWN_COLORS[p.palaceColor ?? 'red'],zIndex:i+1}}>
      {!broken && p.score>=100 && <small className="sg-score-lap">+{Math.floor(p.score/100)*100}</small>}
    </span>)}
  </span>
}

function PhysicalTrack({game}:{game:GameState}) {
  return <div className="sg-art-board" role="group" aria-label="Plansza punktacji Witraże Sintry">
    <div className="sg-art-orbit">
      {scoreTrackCoordinates().map(([row,col],value) => {
        const players=game.players.filter(p=>scoreTrackPosition(p.score)===value)
        return <div key={value} className={`sg-boardscore-cell sg-art-cell${value % 5 === 0 ? ' sg-art-checkpoint' : ''}`}
          style={{'--field-row':row+1,'--field-col':col+1} as CSSProperties} title={`Pole ${value}${players.length ? ': '+players.map(p=>p.name).join(', ') : ''}`}>
          <span className="sg-art-number">{value}</span>
          {players.length > 0 && <div className="sg-art-marker"><SharedFieldMarker players={players}/></div>}
        </div>
      })}
      <div className="sg-art-center">

        <div className="sg-art-panels">
          <section className="sg-art-rounds" aria-label="Rundy i premie">
            <h3>RUNDY I PREMIE</h3>
            <div className="sg-art-round-list">{game.roundColors.map((color,i)=><div key={i}
              className={`sg-score-round-tile sg-art-round${i+1===game.round ? ' sg-art-round-active' : ''}${i+1<game.round ? ' sg-art-round-done' : ''}`}
              aria-current={i+1===game.round ? 'step' : undefined} title={`Runda ${i+1}: ${GLASS_COLOR_LABELS_PL[color]}`}>
              <span className="sg-art-roman">{['I','II','III','IV','V','VI'][i]}</span>
              <span className="sg-art-gem"><GlassPiece color={color}/></span>
              <span className="sg-art-multiplier">×1</span>
            </div>)}</div>
          </section>
          <section className="sg-art-broken" aria-label="Planszowy tor stłuczonego szkła">
            <h3>STŁUCZONE SZKŁO</h3>
            <div className="sg-art-break-list">{BROKEN_TRACK.map((penalty,step)=><div key={step}
              className={`sg-boardscore-broken-step sg-art-break${step===8 ? ' sg-art-break-end' : ''}`}
              title={`Pole ${step}: kara ${penalty} punktów`}>
              <span className="sg-art-step">{step===0 ? '◇' : step}</span>
              <span className="sg-art-penalty">{penalty ? `−${penalty}` : '0'}</span>
              <SharedFieldMarker broken players={game.players.filter(p=>p.brokenSteps===step)}/>
            </div>)}</div>
          </section>
        </div>
        <div className="sg-art-flourish" aria-hidden="true">― ◇ ―</div>
      </div>
    </div>
  </div>
}

function PhysicalScoreContents({game}:{game:GameState}) {
  return <PhysicalTrack game={game}/>
}

/** Fit the complete board in both available dimensions, never crop its footer. */
function FittedPhysicalContents({game}:{game:GameState}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scale,setScale] = useState(0.7)
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.max(0.01,Math.min(entry.contentRect.width / 300,entry.contentRect.height / 300)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  },[])
  return <div ref={viewport} className="sg-boardscore-fit">
    <div className="sg-boardscore-canvas" style={{transform:`translate(-50%,-50%) scale(${scale})`}}>
      <PhysicalScoreContents game={game}/>
    </div>
  </div>
}

export function BoardScoringPanel({game, launcherOnly = false}:{game:GameState; launcherOnly?:boolean}) {
  const [expanded,setExpanded] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!expanded) return
    const previousFocus = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus() }
      if (event.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown',onEscape)
    return () => { document.removeEventListener('keydown',onEscape); previousFocus?.focus() }
  },[expanded])
  const current = game.players[game.currentPlayer]
  return <>
    {launcherOnly ? <button type="button" className="sg-boardscore-expand" onClick={()=>setExpanded(true)} aria-label="Powiększ tor punktów" title="Otwórz pełną planszę punktacji"><Maximize2 size={14}/></button> : <section className="sg-physical-scores sg-center-card" aria-label="Planszowa punktacja">
      <div className="sg-panel-title">
        <span>PUNKTACJA · PLANSZOWA</span>
        <button type="button" className="sg-boardscore-expand" onClick={()=>setExpanded(true)}
          title="Powiększ tor punktów" aria-label="Powiększ tor punktów"><Maximize2 size={14}/></button>
      </div>
      <div className="sg-boardscore-current" role="status">
        <PlayerMarker player={current}/>
        <span>{game.phase==='finished' ? 'Koniec gry' :
          current.controller === 'human' ? `Ruch: ${current.name}` : `Gra: ${current.name}`}</span>
        <small>{game.firstCenterTaken
          ? `Następna: ${game.players[game.nextStartingPlayer ?? game.startingPlayer].name}`
          : `Start: ${game.players[game.startingPlayer].name}`}</small>
      </div>
      <div className="sg-boardscore-body"><FittedPhysicalContents game={game}/></div>
    </section>}
    {expanded && typeof document !== 'undefined' && createPortal(
      <div className="sg sg-boardscore-modal-backdrop" onMouseDown={()=>setExpanded(false)}>
        <div className="sg-boardscore-modal" role="dialog" aria-modal="true"
          aria-label="Powiększona plansza punktacji" onMouseDown={event=>event.stopPropagation()}>
          <div className="sg-panel-title sg-boardscore-modal-header"><strong>PUNKTACJA · WITRAŻE SINTRY</strong>
            <button ref={closeButton} type="button" onClick={()=>setExpanded(false)} aria-label="Zamknij powiększoną punktację"><X size={18}/></button>
          </div>
          <div className="sg-boardscore-full"><FittedPhysicalContents game={game}/></div>
        </div>
      </div>,document.body)}
  </>
}

export function CompactScores({game, showBoard = true}:{game:GameState; showBoard?:boolean}) {
  const ordered: Player[] = []
  let index = game.initialStartingPlayer ?? game.startingPlayer
  for (let seat = 0; seat < game.players.length; seat++) {
    ordered.push(game.players[index])
    index = nextClockwisePlayer(index, game.players.length)
  }
  const current = game.players[game.currentPlayer]
  const starter = game.players[game.firstCenterTaken ? game.nextStartingPlayer ?? game.startingPlayer : game.startingPlayer]
  return <section className={`sg-compact-scores sg-center-card${game.players.length > 2 ? ' sg-compact-multiplayer' : ''}`} aria-label="Wyniki i przebieg gry">
    <div className="sg-panel-title"><span>PRZY STOLE</span>{showBoard && <BoardScoringPanel game={game} launcherOnly/>}</div>
    <div className="sg-compact-turn"><PlayerMarker player={current}/><strong>{game.phase === 'finished' ? 'Koniec gry' : `Ruch: ${current.name}`}</strong></div>
    <div className="sg-compact-start">{game.firstCenterTaken ? 'Następna runda' : 'Rozpoczyna'}: <b>{starter.name}</b></div>
    <div className="sg-compact-columns"><span>GRACZ</span><span>PUNKTY</span></div>
    <div className="sg-compact-players">{ordered.map((p) => <div key={p.id} className={`sg-compact-player${p.id === current.id ? ' sg-score-current' : ''}`}>
      <span className="sg-compact-name" title={p.name}><PlayerMarker player={p}/><span>{p.name}</span></span>
      <strong>{p.score}</strong>
    </div>)}</div>
    <div className="sg-compact-broken-heading">STŁUCZONE SZKŁO</div>
    <div className="sg-compact-glass-grid" role="group" aria-label="Tor stłuczonego szkła">
      {BROKEN_TRACK.map((penalty,step) => {
        const occupants = ordered.filter(p => p.brokenSteps === step)
        return <div key={step} className={`sg-compact-glass-cell${step === 8 ? ' sg-glass-limit' : ''}${occupants.length ? ' sg-glass-occupied' : ''}`}>
          <small>{step === 0 ? 'START' : step}</small>
          <strong>{penalty ? `−${penalty}` : '0'}</strong>
          <span className="sg-compact-glass-markers">{occupants.map(p => <span key={p.id}
            className="sg-compact-glass-pawn" role="img"
            aria-label={`${p.name}: ${step}/8 stłuczeń, kara ${penalty} pkt`}
            title={`${p.name}: ${step}/8 stłuczeń, kara ${penalty} pkt`}
            style={{background:PAWN_COLORS[p.palaceColor ?? 'red']}}/>)}</span>
        </div>
      })}
    </div>
    <ScoreRoundBonuses game={game}/>
  </section>
}
