import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import { BROKEN_TRACK } from '../game/engine'
import type { GameState, Player } from '../game/engine'
import { GLASS_COLOR_LABELS_PL } from '../game/colorLabels'
import { GlassPiece } from './GameBoard'

export type ScoreDisplayMode = 'digital' | 'board'

/** The engraved physical track is 0–99; scores above 99 do another lap.
 * Exact scores (including any negatives) always remain visible in the legend. */
export function scoreTrackPosition(score: number): number {
  return score <= 0 ? 0 : Math.trunc(score) % 100
}

/** A continuous, 100-square double rectangular orbit around the original
 * central broken-glass ladder: 54 outer squares + 46 inner squares. */
export function scoreTrackCoordinates(): ReadonlyArray<readonly [number,number]> {
  const coordinates: Array<readonly [number,number]> = []
  for (let col=0;col<16;col++) coordinates.push([0,col])
  for (let row=1;row<13;row++) coordinates.push([row,15])
  for (let col=14;col>=0;col--) coordinates.push([12,col])
  for (let row=11;row>=1;row--) coordinates.push([row,0])
  for (let col=1;col<15;col++) coordinates.push([1,col])
  for (let row=2;row<12;row++) coordinates.push([row,14])
  for (let col=13;col>=1;col--) coordinates.push([11,col])
  for (let row=10;row>=2;row--) coordinates.push([row,1])
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
    <p className="sg-score-rule">−18: odejmij 18 pkt i wróć na START. Pozostała kara na koniec gry.</p>
    <ScoreRoundBonuses game={game}/>
  </section>
}

function PhysicalTrack({game}:{game:GameState}) {
  const cells = scoreTrackCoordinates()
  return <div className="sg-boardscore-engraved" role="group"
    aria-label="Tor punktów od 0 do 99, dwa połączone obwody">
    <div className="sg-boardscore-mosaic">
      {cells.map(([row,col],value) => {
        const markers = game.players.filter(p => scoreTrackPosition(p.score) === value)
        return <span key={value}
          style={{gridRow:row + 1,gridColumn:col + 1}}
          className={`sg-boardscore-cell${value % 5 === 0 ? ' sg-boardscore-milestone' : ''}${markers.length ? ' sg-boardscore-occupied' : ''}`}
          title={`Pole ${value}`}>
          {value % 5 === 0 && <b>{value}</b>}
          {markers.length > 0 && <span className="sg-boardscore-markers">
            {markers.map(p => <PlayerMarker key={p.id} player={p} compact/>)}
          </span>}
        </span>
      })}
      <div className="sg-boardscore-core"><PhysicalBrokenTrack game={game}/></div>
    </div>
    <div className="sg-boardscore-legend" aria-label="Dokładne wyniki graczy">
      {game.players.map(p => <div className="sg-boardscore-legend-item" key={p.id}>
        <PlayerMarker player={p}/><span title={p.name}>{p.name}</span><strong>{p.score}<small> pkt</small></strong>
      </div>)}
    </div>
  </div>
}

function PhysicalBrokenTrack({game}:{game:GameState}) {
  return <div className="sg-boardscore-broken" role="group" aria-label="Planszowy tor stłuczonego szkła">
    <b className="sg-boardscore-subtitle">TOR STŁUCZONEGO SZKŁA</b>
    <div className="sg-boardscore-broken-steps">
      {BROKEN_TRACK.map((penalty, step) =>
        <div key={step} className={`sg-boardscore-broken-step${step===8?' sg-boardscore-broken-end':''}`}
          title={`Pole ${step}: minus ${penalty} punktów`}>
          <small>{step}</small>
          <span>{penalty ? `−${penalty}` : '0'}</span>
          <div className="sg-boardscore-broken-pawns" aria-hidden="true">
            {game.players.filter(p=>p.brokenSteps===step).map(p=>
              <PlayerMarker key={p.id} player={p} compact/>)}
          </div>
        </div>
      )}
    </div>
  </div>
}

function PhysicalScoreContents({game}:{game:GameState}) {
  return <>
    <PhysicalTrack game={game}/>
    <p className="sg-score-rule">−18: odejmij 18 pkt i wróć na START. Pozostała kara na koniec gry.</p>
    <ScoreRoundBonuses game={game}/>
  </>
}

export function BoardScoringPanel({game}:{game:GameState}) {
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
    <section className="sg-physical-scores sg-center-card" aria-label="Planszowa punktacja">
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
      <div className="sg-boardscore-body"><PhysicalScoreContents game={game}/></div>
    </section>
    {expanded && typeof document !== 'undefined' && createPortal(
      <div className="sg sg-boardscore-modal-backdrop" onMouseDown={()=>setExpanded(false)}>
        <div className="sg-boardscore-modal" role="dialog" aria-modal="true"
          aria-label="Powiększona plansza punktacji" onMouseDown={event=>event.stopPropagation()}>
          <div className="sg-boardscore-modal-header"><strong>PUNKTACJA · WITRAŻE SINTRY</strong>
            <button ref={closeButton} type="button" onClick={()=>setExpanded(false)} aria-label="Zamknij powiększoną punktację"><X size={18}/></button>
          </div>
          <PhysicalScoreContents game={game}/>
        </div>
      </div>,document.body)}
  </>
}
