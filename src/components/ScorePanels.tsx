import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { BROKEN_TRACK } from '../game/engine'
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
  const coordinates: Array<readonly [number,number]> = [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [3, 0], [4, 0], [4, 1], [5, 1], [5, 0], [6, 0], [6, 1], [7, 1], [7, 0], [8, 0], [9, 0], [9, 1], [8, 1], [8, 2], [9, 2], [9, 3], [8, 3], [8, 4], [9, 4], [9, 5], [8, 5], [8, 6], [9, 6], [9, 7], [8, 7], [8, 8], [9, 8], [9, 9], [8, 9], [8, 10], [9, 10], [9, 11], [8, 11], [8, 12], [9, 12], [9, 13], [8, 13], [8, 14], [9, 14], [9, 15], [8, 15], [8, 16], [9, 16], [9, 17], [9, 18], [8, 18], [8, 17], [7, 17], [7, 18], [6, 18], [6, 17], [5, 17], [5, 18], [4, 18], [4, 17], [3, 17], [3, 18], [2, 18], [2, 17], [1, 17], [1, 18], [0, 18], [0, 17], [0, 16], [1, 16], [1, 15], [0, 15], [0, 14], [1, 14], [1, 13], [0, 13], [0, 12], [1, 12], [1, 11], [0, 11], [0, 10], [1, 10], [1, 9], [0, 9], [0, 8], [1, 8], [1, 7], [0, 7], [0, 6], [1, 6], [1, 5], [0, 5], [0, 4], [1, 4], [1, 3], [0, 3], [0, 2], [1, 2], [1, 1], [0, 1]]
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
export function DigitalBrokenGlass({ game }: { game: GameState }) {
  return <section className="sg-track sg-digital-penalties sg-center-card" aria-label="Cyfrowy tor stłuczonego szkła">
    <div className="sg-panel-title"><span>STŁUCZONE SZKŁO</span><small>0–8 stłuczeń</small></div>
    <div className="sg-digital-penalty-list">
      {game.players.map((player, index) => {
        const step = Math.max(0, Math.min(8, player.brokenSteps))
        const penalty = BROKEN_TRACK[step]
        return <div key={player.id}
          className={`sg-digital-penalty-row${index === game.currentPlayer ? ' sg-digital-penalty-current' : ''}`}
          aria-label={`${player.name}: ${step} z 8 stłuczeń, kara ${penalty} punktów`}>
          <div className="sg-digital-penalty-heading">
            <PlayerMarker player={player}/>
            <span>{player.name}</span>
            <b>{step}<small>/8</small></b>
            <strong>{penalty ? `−${penalty}` : '0'}<small> pkt</small></strong>
          </div>
          <div className="sg-digital-penalty-meter" aria-hidden="true">
            {Array.from({length:8}, (_, i) =>
              <i key={i} className={i < step ? 'sg-digital-penalty-filled' : ''}/>
            )}
          </div>
        </div>
      })}
    </div>
    <ScoreRoundBonuses game={game}/>
  </section>
}

const PAWN_COLORS = {red:'#de777a', yellow:'#e9c769', blue:'#6ac5df', white:'#d7e2e8'}

export function SharedFieldMarker({players}:{players:Player[]}) {
  if (!players.length) return null
  return <span className="sg-pawn-stack" role="img" aria-label={players.map(p=>`${p.name}: ${p.score} pkt`).join('; ')}>
    {players.map((p,i)=><span key={p.id} className="sg-stacked-pawn" title={`${p.name}: ${p.score} pkt`}
      style={{background:PAWN_COLORS[p.palaceColor ?? 'red'],left:`${i*2}px`,top:`${-i*1.5}px`,zIndex:i+1}}>
      {p.score>=100 && <small className="sg-score-lap">+{Math.floor(p.score/100)*100}</small>}
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
              <SharedFieldMarker players={game.players.filter(p=>p.brokenSteps===step)}/>
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
  const [portrait,setPortrait] = useState(false)
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const tall = entry.contentRect.width / entry.contentRect.height < 0.85
      setPortrait(tall)
      setScale(Math.max(0.01,Math.min(entry.contentRect.width / (tall ? 230 : 300),entry.contentRect.height / (tall ? 300 : 230))))
    })
    observer.observe(element)
    return () => observer.disconnect()
  },[])
  return <div ref={viewport} className="sg-boardscore-fit">
    <div className={`sg-boardscore-canvas${portrait ? ' sg-frame-portrait' : ''}`} style={{transform:`translate(-50%,-50%) scale(${scale})`}}>
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

export function CompactScores({game}:{game:GameState}) {
  const current = game.players[game.currentPlayer]
  const starter = game.players[game.firstCenterTaken ? game.nextStartingPlayer ?? game.startingPlayer : game.startingPlayer]
  return <section className="sg-compact-scores sg-center-card" aria-label="Wyniki i przebieg gry">
    <div className="sg-panel-title"><span>PRZY STOLE</span><BoardScoringPanel game={game} launcherOnly/></div>
    <div className="sg-compact-turn"><PlayerMarker player={current}/><strong>{game.phase === 'finished' ? 'Koniec gry' : `Ruch: ${current.name}`}</strong></div>
    <div className="sg-compact-start">{game.firstCenterTaken ? 'Następna runda' : 'Rozpoczyna'}: <b>{starter.name}</b></div>
    <div className="sg-compact-columns"><span>GRACZ</span><span>PUNKTY</span><span>SZKŁO / KARA</span></div>
    <div className="sg-compact-players">{game.players.map((p,i) => <div key={p.id} className={`sg-compact-player${i === game.currentPlayer ? ' sg-score-current' : ''}`}>
      <span className="sg-compact-name" title={p.name}><PlayerMarker player={p}/><span>{p.name}</span></span>
      <strong>{p.score}</strong><span className="sg-compact-break">{p.brokenSteps}/8 <b>−{BROKEN_TRACK[p.brokenSteps]} pkt</b></span>
    </div>)}</div>
    <ScoreRoundBonuses game={game}/>
  </section>
}
