import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, Crown, Gem, History,
  Info, Layers3, RotateCcw, Settings2, Shield, Trophy, RefreshCw,
  X,
} from 'lucide-react'
import {
  applyMove, availableSources, COLORS, legalMoves,
  newGame, standings,
} from './game/engine'
import type { Difficulty, GameState, GlassColor, Move, PalaceSide, Source } from './game/engine'
import { chooseAIMove } from './game/ai'
import { BrokenGlassTrack, GameTimeline, TableSeat } from './components/MatchPanels'
import { Glass, WindowCard } from './components/WindowBoard'
import './match.css'
import './tabletop.css'

const STORAGE_KEY = 'sintra-glass-save-v1'
const COLORS_PL: Record<GlassColor, string> = {
  rose: 'Róż', citrine: 'Złoto', cyan: 'Turkus', amber: 'Bursztyn', slate: 'Srebro',
}
const PLAYER_AVATARS = ['✧', '✦', '❖', '✳']
interface Settings {
  opponents: number
  difficulties: Difficulty[]
  palaceSide: PalaceSide
}
const DEFAULT_OPTIONS: Settings = { opponents: 2, difficulties: ['normal', 'normal', 'normal'], palaceSide: 'A' }
interface Selection { source: Source; color: GlassColor }
function sourceEquals(a: Source, b: Source): boolean {
  return a.type === b.type && (a.type === 'center' || (b.type === 'factory' && a.index === b.index))
}
function restore(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const game = JSON.parse(raw) as GameState
    if (game.players?.length >= 2 && game.factories && game.roundColors?.length === 6 && game.round >= 1 && game.round <= 6) return { ...game, history: Array.isArray(game.history) ? game.history : [] }
  } catch { /* Ignore expired/corrupt browser storage. */ }
  return null
}
function Factory({ tiles, index, selected, onPick, disabled, count }: {
  tiles: GlassColor[]; index: number; selected: Selection | null; onPick: (source: Source, color: GlassColor) => void; disabled: boolean; count: number
}) {
  const angle = (-90 + 360 * index / count) * Math.PI / 180
  const x = 50 + 38 * Math.cos(angle)
  const y = 50 + 38 * Math.sin(angle)
  const source: Source = { type: 'factory', index }
  return <div className={`factory${tiles.length ? '' : ' factory-empty'}`} style={{ left: `${x}%`, top: `${y}%` }}>
    <span className="factory-id">{String(index + 1).padStart(2, '0')}</span>
    <div className="factory-tiles">
      {tiles.length ? tiles.map((color, i) => <Glass key={`${index}-${i}`} color={color} small selected={!!selected && sourceEquals(selected.source, source) && selected.color === color} onClick={disabled ? undefined : () => onPick(source, color)} />) : <span className="factory-flower">✳</span>}
    </div>
  </div>
}
function CenterPile({ tiles, selected, onPick, disabled, first }: {
  tiles: GlassColor[]; selected: Selection | null; onPick: (source: Source, color: GlassColor) => void; disabled: boolean; first: boolean
}) {
  const counts = COLORS.map((color) => ({ color, count: tiles.filter((x) => x === color).length })).filter((x) => x.count)
  return <div className="center-pile">
    <span className="center-eyebrow">ŚRODEK STOŁU</span>
    {counts.length ? <div className="center-tiles">{counts.map(({ color, count }) =>
      <button key={color} className={`center-choice${selected?.source.type === 'center' && selected.color === color ? ' center-choice-selected' : ''}`} onClick={() => onPick({ type: 'center' }, color)} disabled={disabled} title={`Weź ${count} × ${COLORS_PL[color]}`}>
        <Glass color={color} small /><span>×{count}</span>
      </button>)}</div> : <div className="center-empty">✦<span>Pusto</span></div>}
    {!first && <span className="center-token">✦ +1 stłuczenia</span>}
  </div>
}
function SetupModal({ settings, onClose, onStart }: {
  settings: Settings; onClose: () => void; onStart: (settings: Settings) => void
}) {
  const [local, setLocal] = useState<Settings>(settings)
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal setup-modal" role="dialog" aria-modal="true" aria-label="Nowa rozgrywka" onMouseDown={(e) => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose} aria-label="Zamknij"><X size={18}/></button>
      <div className="modal-icon"><Settings2 size={23}/></div>
      <span className="overline">ROZPOCZNIJ PRZYGODĘ</span>
      <h2>Nowa rozgrywka</h2>
      <p>Wybierz przeciwników i zasady punktowania. Każda partia ma nowy układ kwater.</p>
      <label className="field-label">Liczba przeciwników AI</label>
      <div className="option-row">{[1, 2, 3].map((n) => <button key={n} className={`option-choice${local.opponents === n ? ' chosen' : ''}`} onClick={() => setLocal({ ...local, opponents: n })}>{n}<small>{n === 1 ? 'Pojedynek' : `${n + 1} graczy`}</small></button>)}</div>
      <div className="per-bot-header"><span className="field-label">Poziom trudności każdego bota</span><small>Możesz mieszać poziomy w jednej partii.</small></div>
      {Array.from({length: local.opponents}, (_, i) => <div key={i} className="bot-setting-row">
        <label htmlFor={`bot-level-${i}`}><Bot size={16}/><span>{['Aurora','Iris','Noctis'][i]}</span></label>
        <select id={`bot-level-${i}`} value={local.difficulties[i] ?? 'normal'} onChange={(e) => setLocal(prev => ({...prev, difficulties: prev.difficulties.map((level, idx) => idx === i ? e.target.value as Difficulty : level)}))}>
          <option value="easy">Łatwy · losowy</option><option value="normal">Normalny · zachłanny</option><option value="hard">Trudny · strategiczny</option>
        </select>
      </div>)}
      <label className="field-label" htmlFor="palace-side">Punktowanie finałowe</label>
      <select id="palace-side" value={local.palaceSide} onChange={(e) => setLocal({ ...local, palaceSide: e.target.value as PalaceSide })}>
        <option value="A">Strona A — ornamenty</option><option value="B">Strona B — dominujący kolor</option>
      </select>
      <button className="btn btn-primary modal-main" onClick={() => onStart(local)}>Rozpocznij partię <ArrowRight size={18} /></button>
    </div>
  </div>
}
function RulesModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal rules-modal" role="dialog" aria-modal="true" aria-label="Jak grać" onMouseDown={(e) => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose} aria-label="Zamknij"><X size={18}/></button>
      <div className="modal-icon"><BookOpen size={23}/></div>
      <span className="overline">KRÓTKI PRZEWODNIK</span><h2>Jak tworzyć witraże?</h2>
      <div className="rule"><span>01</span><div><h3>Wybierz tafle</h3><p>Kliknij kolor w jednym warsztacie lub na środku stołu. Zabierasz wszystkie tafle tego koloru z wybranego miejsca. Pozostałe z warsztatu przechodzą na środek.</p></div></div>
      <div className="rule"><span>02</span><div><h3>Uzupełnij kwaterę</h3><p>Kliknij podświetloną kwaterę. Tafle trafiają na pola tego koloru (joker przyjmuje dowolną barwę). Twój witrażysta może iść tylko w prawo. Nadmiar tafli się tłucze.</p></div></div>
      <div className="rule"><span>03</span><div><h3>Zamknij okno</h3><p>Po wypełnieniu pięciu pól zachowujesz jedną taflę w ramie, a pozostałe wracają do wieży. Zdobywasz punkty za okno, ukończone okna na prawo i premię za kolor rundy.</p></div></div>
      <div className="rule"><span>04</span><div><h3>Wróć do początku</h3><p>Zamiast pobierać szkło możesz cofnąć witrażystę do pierwszej dostępnej kwatery po lewej. Po sześciu rundach doliczane są premie i kary.</p></div></div>
      <p className="rule-note"><Info size={15} /> Nieoficjalna adaptacja mechaniki gry. Układy kolorów kwater zostały przygotowane specjalnie dla tej wersji.</p>
      <button className="btn btn-primary modal-main" onClick={onClose}>Rozumiem <Check size={18}/></button>
    </div>
  </div>
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => restore() ?? newGame({ ...DEFAULT_OPTIONS, botDifficulties: DEFAULT_OPTIONS.difficulties }))
  const [settings, setSettings] = useState<Settings>(() => ({
    opponents: game.players.length - 1,
    difficulties: game.players.slice(1).map((player) => player.difficulty ?? 'normal'),
    palaceSide: game.palaceSide,
  }))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [inspect, setInspect] = useState(0)
  const [finishing, setFinishing] = useState<Move[] | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [physicalOrientation, setPhysicalOrientation] = useState(true)
  const humanTurn = game.phase === 'playing' && game.players[game.currentPlayer].controller === 'human'
  const moves = useMemo(() => legalMoves(game), [game])
  const sourceOptions = useMemo(() => availableSources(game), [game])
  const selectionMoves = useMemo(() => selection ? moves.filter((move) => move.kind === 'take' &&
    sourceEquals(move.source, selection.source) && move.color === selection.color) : [], [moves, selection])
  const targetIndices = new Set(selectionMoves.filter((move) => move.kind === 'take' && move.windowIndex !== null).map((move) => move.kind === 'take' ? move.windowIndex : null))
  const best = standings(game)
  const current = game.players[game.currentPlayer]
  const selectedPlayer = game.players[inspect] ?? game.players[0]
  const canReset = humanTurn && moves.some((move) => move.kind === 'reset')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) }, [game])
  useEffect(() => {
    if (game.phase !== 'playing' || game.players[game.currentPlayer].controller !== 'ai' || finishing) return
    const timeout = window.setTimeout(() => {
      const move = chooseAIMove(game, game.players[game.currentPlayer].difficulty ?? 'normal')
      if (move) setGame((previous) => applyMove(previous, move))
    }, 600)
    return () => window.clearTimeout(timeout)
  }, [game, finishing])
  useEffect(() => { if (!humanTurn) { setSelection(null); setFinishing(null) } }, [humanTurn])

  function commitMove(move: Move) {
    setGame((prev) => applyMove(prev, move))
    setSelection(null)
    setFinishing(null)
    setInspect(0)
  }
  function chooseSource(source: Source, color: GlassColor) {
    if (!humanTurn || inspect !== 0 || finishing) return
    const exists = sourceOptions.some((option) => option.color === color && sourceEquals(option.source, source))
    if (!exists) return
    if (selection?.color === color && sourceEquals(selection.source, source)) { setSelection(null); return }
    const options = moves.filter((m) => m.kind === 'take' && sourceEquals(m.source, source) && m.color === color)
    const discard = options.find((m) => m.kind === 'take' && m.windowIndex === null)
    if (discard) { setSelection({ source, color }); return }
    setSelection({ source, color })
  }
  function chooseTarget(index: number | null) {
    const candidates = selectionMoves.filter((move) => move.kind === 'take' && move.windowIndex === index)
    if (candidates.length === 0) return
    if (candidates.length > 1 || (candidates[0].kind === 'take' && candidates[0].keepColor)) {
      setFinishing(candidates)
      return
    }
    commitMove(candidates[0])
  }
  function startNew(options: Settings) {
    setSettings(options)
    setGame(newGame({ ...options, botDifficulties: options.difficulties }))
    setSelection(null)
    setFinishing(null)
    setInspect(0)
    setShowSetup(false)
  }

  return <div className="app-shell tabletop-app">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <header className="site-header"><div className="tabletop-container nav-inner">
      <a className="brand" href="#top" aria-label="Sintra Glass"><span className="brand-mark"><Gem size={23}/></span><span className="brand-name">SINTRA<span>GLASS</span></span><span className="brand-label">TABLETOP EDITION</span></a>
      <div className="nav-right"><span className="online-indicator"><span/> TRYB OFFLINE</span><button className="nav-link" onClick={() => setShowRules(true)}><BookOpen size={17}/> Zasady</button><button className="btn btn-outline nav-new" onClick={() => setShowSetup(true)}><RotateCcw size={16}/> Nowa gra</button></div>
    </div></header>
    <main className="tabletop-container" id="top">
      <div className="tabletop-topline" role="status" aria-label="Stan gry">
        <div className="tabletop-title"><strong>SINTRA · WSPÓLNY STÓŁ</strong><span className="tabletop-title-hint">Witraże wszystkich graczy w czasie rzeczywistym</span></div>
        <div className="tabletop-round-counter"><span>RUNDA</span><strong>{game.round}<small>/6</small></strong><div className="tabletop-round-pips">{game.roundColors.map((c,i) => <span key={i} className={`tile-${c}${i + 1 === game.round ? ' current' : ''}`} title={`Runda ${i + 1}: ${COLORS_PL[c]}`}/>)}</div></div>
      </div>
      <div className="tabletop-layout">
        <section className={`tabletop-surface tabletop-players-${game.players.length}${physicalOrientation ? ' physical-orientation' : ' readable-orientation'}`} aria-label="Wspólny stół z planszami graczy i warsztatami">
          <div className="tabletop-grid">
            {game.players[3] && <div className="tabletop-seat-slot tabletop-seat-slot-west">
              <TableSeat player={game.players[3]} index={3} location="west" isCurrent={game.currentPlayer === 3 && game.phase === 'playing'} onInspect={() => {setInspect(3);setSelection(null)}} />
            </div>}
            {game.players[1] && <div className="tabletop-seat-slot tabletop-seat-slot-north">
              <TableSeat player={game.players[1]} index={1} location="north" isCurrent={game.currentPlayer === 1 && game.phase === 'playing'} onInspect={() => {setInspect(1);setSelection(null)}} />
            </div>}
            {game.players[2] && <div className="tabletop-seat-slot tabletop-seat-slot-east">
              <TableSeat player={game.players[2]} index={2} location="east" isCurrent={game.currentPlayer === 2 && game.phase === 'playing'} onInspect={() => {setInspect(2);setSelection(null)}} />
            </div>}

            <section className="tabletop-market" aria-label="Warsztaty, punktacja i historia">
              <div className="tabletop-game-hud">
                <div className="tabletop-hud-label">AKTUALNA TURA <span className="live-dot" /></div>
                <div className="tabletop-hud-player">
                  <span className={`player-avatar avatar-${game.currentPlayer}`}>{PLAYER_AVATARS[game.currentPlayer]}</span>
                  <div><strong>{game.phase === 'finished' ? 'Koniec gry' : current.controller === 'human' ? 'Twój ruch' : `Gra ${current.name}`}</strong><small>{game.phase === 'finished' ? `Zwycięża ${best[0].name}!` : current.controller === 'human' ? 'Wybierz szkło i kwaterę' : 'Przeciwnik wybiera ruch…'}</small></div>
                </div>
                <div className="tabletop-hud-label tabletop-scores-label"><Trophy size={14}/> WYNIKI</div>
                <div className="tabletop-hud-scores">{best.map((player, rank) => {
                  const playerIndex = game.players.findIndex(p => p.id === player.id)
                  return <div key={player.id} className={`tabletop-hud-score${playerIndex === game.currentPlayer ? ' is-current' : ''}`}>
                    <i className={`track-legend-pawn avatar-${playerIndex}`} /><span>{rank + 1}. {player.name}</span><strong>{player.score} <small>pkt</small></strong>
                  </div>
                })}</div>
                <button className="tabletop-hud-action" type="button" onClick={() => setShowHistory(true)}>
                  <History size={16}/><span>Historia rozgrywki</span><b>{game.history?.length ?? 0}</b>
                </button>
                <button className="tabletop-hud-action tabletop-orient-action" type="button" aria-pressed={physicalOrientation} onClick={() => setPhysicalOrientation(v => !v)}>
                  <RefreshCw size={15}/><span>{physicalOrientation ? 'Odwróć orientację' : 'Układ jak przy stole'}</span>
                </button>
              </div>

              <div className="tabletop-market-core">
                <div className="tabletop-market-header"><h2>Warsztaty szkła</h2><span className="market-chip"><Layers3 size={13}/> {sourceOptions.length} wyborów</span></div>
                <div className="market-playground">
                  <div className="market-circles"><div className="market-inner-ring"/><div className="market-outer-ring"/></div>
                  <CenterPile tiles={game.center} selected={selection} onPick={chooseSource} disabled={!humanTurn || inspect !== 0} first={game.firstCenterTaken}/>
                  {game.factories.map((factory, index) => <Factory key={index} tiles={factory} index={index} count={game.factories.length} selected={selection} onPick={chooseSource} disabled={!humanTurn || inspect !== 0}/>)}
                </div>
                <div className="tabletop-first-player"><span className="first-player-tile" aria-hidden="true">1</span><span>{game.firstCenterTaken ? `${game.players[game.nextStartingPlayer ?? game.startingPlayer].name} rozpocznie następną rundę` : 'Żeton pierwszego gracza'}</span></div>
              </div>

              <div className="tabletop-track-area"><BrokenGlassTrack players={game.players}/></div>
              <div className="tabletop-market-help" aria-live="polite"><Info size={15}/><span>{selection ? `Wybrano ${COLORS_PL[selection.color].toLowerCase()} — wskaż podświetloną kwaterę na swojej planszy.` : humanTurn ? 'Twój ruch — wybierz kolor z warsztatu lub ze środka.' : game.phase === 'finished' ? 'Partia zakończona.' : `Ruch: ${current.name} (AI)`}</span>{selection && <button className="clear-pick" onClick={() => setSelection(null)}>Anuluj <X size={13}/></button>}{selection && selectionMoves.some(move => move.kind === 'take' && move.windowIndex === null) && <button className="btn btn-warn tabletop-discard" onClick={() => chooseTarget(null)}>Stłucz tafle</button>}</div>
            </section>

            <section className={`tabletop-human${game.currentPlayer === 0 && game.phase === 'playing' ? ' tabletop-human-active' : ''}`} aria-label="Twoja plansza witraży" id="my-board">
              <div className="tabletop-human-heading"><div className="tabletop-human-identity"><span className="player-avatar avatar-0">{PLAYER_AVATARS[0]}</span><div><h2>Twoje witraże <span>✧</span></h2></div></div><div className="tabletop-human-stats"><span><Gem size={14}/> {game.players[0].score} pkt</span><span><Shield size={14}/> {game.players[0].brokenSteps}/8 stłuczeń</span><button className="btn btn-reset tabletop-reset" disabled={!canReset || !!finishing || inspect !== 0} onClick={() => commitMove({ kind: 'reset' })} title="Zamiast pobierać szkło, cofnij witrażystę do początku dostępnych kwater"><ArrowLeft size={14}/> Cofnij witrażystę</button></div></div>
              <div className="board-scroll"><div className="board-area"><div className="window-row">{game.players[0].strips.map((strip, index) => <WindowCard key={index} strip={strip} index={index} glazier={game.players[0].glazier} highlighted={targetIndices.has(index)} active={selection !== null} isHumanTurn={humanTurn} onClick={() => chooseTarget(index)}/>)}</div></div></div>
            </section>
          </div>
        </section>
      </div>
    </main>
    {showHistory && <div className="modal-backdrop tabletop-history-backdrop" onMouseDown={() => setShowHistory(false)}>
      <div className="tabletop-history-dialog" role="dialog" aria-modal="true" aria-label="Dziennik rozgrywki" onMouseDown={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setShowHistory(false)} aria-label="Zamknij historię"><X size={19}/></button>
        <GameTimeline state={game}/>
      </div>
    </div>}
    {inspect > 0 && <div className="modal-backdrop" onMouseDown={() => setInspect(0)}><div className="modal tabletop-inspect-modal" role="dialog" aria-modal="true" aria-label={`Plansza gracza ${selectedPlayer.name}`} onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setInspect(0)} aria-label="Zamknij podgląd"><X size={18}/></button><div className="tabletop-inspect-heading"><span className={`player-avatar avatar-${inspect}`}>{PLAYER_AVATARS[inspect]}</span><div><span className="overline">PODGLĄD PRZECIWNIKA</span><h2>{selectedPlayer.name} <small>{selectedPlayer.score} pkt</small></h2></div></div><p>Witraże i pozycja witrażysty przeciwnika. Kliknij poza planszą lub użyj ×, aby wrócić do stołu.</p><div className="board-scroll"><div className="board-area"><div className="window-row">{selectedPlayer.strips.map((strip, index) => <WindowCard key={index} strip={strip} index={index} glazier={selectedPlayer.glazier} highlighted={false} active={false} isHumanTurn={false} onClick={() => undefined}/>)}</div></div></div></div></div>}
    {game.phase === 'finished' && <div className="result-float"><Crown size={18}/><span>Partia zakończona — wygrywa <strong>{best[0].name}</strong>!</span><button onClick={() => setShowSetup(true)}>Zagraj ponownie <ArrowRight size={15}/></button></div>}
    {showSetup && <SetupModal settings={settings} onClose={() => setShowSetup(false)} onStart={startNew}/>}
    {showRules && <RulesModal onClose={() => setShowRules(false)}/>}
    {finishing && <div className="modal-backdrop" onMouseDown={() => setFinishing(null)}><div className="modal keep-modal" role="dialog" aria-modal="true" aria-label="Wybierz taflę do zachowania" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setFinishing(null)} aria-label="Zamknij"><X size={18}/></button><div className="modal-icon"><Gem size={24}/></div><span className="overline">KWATERA UKOŃCZONA</span><h2>Wybierz taflę do okna</h2><p>Jedna tafla zostanie w pałacowym witrażu, pozostałe trafią do wieży.</p><div className="keep-options">{finishing.filter((move) => move.kind === 'take' && move.keepColor).map((move) => move.kind === 'take' && move.keepColor ? <button key={move.keepColor} onClick={() => commitMove(move)}><Glass color={move.keepColor}/><span>{COLORS_PL[move.keepColor]}</span></button> : null)}</div></div></div>}
  </div>
}
