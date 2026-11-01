import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, Gem, Info, RotateCcw, Settings2, X } from 'lucide-react'
import { applyMove, availableSources, BROKEN_TRACK, COLORS, glassInventory, legalMoves, newGame, standings } from './game/engine'
import type { Controller, Difficulty, GameState, GlassColor, Move, PalaceSide, Source } from './game/engine'
import { chooseAIMove } from './game/ai'
import { LiveHistory } from './components/LiveHistory'
import { FinalResults } from './components/FinalResults'
import { FinishCelebration } from './components/FinishCelebration'
import { StrategyLab } from './components/StrategyLab'
import { finishOverlayVisibility } from './ui/finishOverlayVisibility'
import { moveAudioCue } from './ui/moveAudioCue'
import { seatsForViewer, viewingPlayerIndex } from './ui/tableSeating'
import { useGameAudio } from './hooks/useGameAudio'
import { GlassVisualEffects, useVisualEffects } from './components/GlassVisualEffects'
import { useAmbientMusic } from './hooks/useAmbientMusic'
import { GameBoard, GlassPiece } from './components/GameBoard'
import { ManualPlacementDialog } from './components/ManualPlacementDialog'
import { GameMenu } from './components/GameMenu'
import './match.css'
import './redesign.css'
import './center-v9.css'
import './center-v10.css'
import './inventory-v12.css'
import './ux-v13.css'
import './polish-v14.css'
import './strategy-lab.css'
import './glass-effects-v16.css'
import './polish-v17.css'
import './ornaments-v20.css'
import './finish-v21.css'
import './hotseat-v23.css'

const STORAGE_KEY = 'sintra-glass-save-v1'
const COLORS_PL: Record<GlassColor, string> = { rose: 'Czerwone', citrine: 'Żółte', cyan: 'Niebieskie', amber: 'Pomarańczowe', slate: 'Białe' }
const PLAYER_AVATARS = ['✦', '✧', '✳', '❖']
interface Settings { opponents: number; difficulties: Difficulty[]; controllers: Controller[]; names: string[]; palaceSide: PalaceSide }
const DEFAULT_OPTIONS: Settings = {
  opponents: 3,
  difficulties: ['normal', 'normal', 'normal'],
  controllers: ['human', 'ai', 'ai', 'ai'],
  names: ['Ty', 'Gracz 2', 'Gracz 3', 'Gracz 4'],
  palaceSide: 'A',
}
interface Selection { source: Source; color: GlassColor }
function sourceEquals(a: Source, b: Source): boolean {
  return a.type === b.type && (a.type === 'center' || (b.type === 'factory' && a.index === b.index))
}
function restore(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const game = JSON.parse(raw) as GameState
    if (game.players?.length >= 2 && game.factories && game.roundColors?.length === 6 && game.round >= 1 && game.round <= 6)
      return { ...game, history: Array.isArray(game.history) ? game.history : [] }
  } catch { /* Corrupt or old save: start a fresh game. */ }
  return null
}

function Factory({ tiles, index, count, selected, disabled, onPick }: {
  tiles: GlassColor[]; index: number; count: number; selected: Selection | null;
  disabled: boolean; onPick: (source: Source, color: GlassColor) => void
}) {
  const a = (-90 + 360 * index / count) * Math.PI / 180
  const x = 50 + 39 * Math.cos(a)
  const y = 50 + 39 * Math.sin(a)
  return <div className={`sg-factory${tiles.length ? '' : ' sg-factory-empty'}`} style={{ left: `${x}%`, top: `${y}%` }}>
    <span className="sg-factory-num">{String(index + 1).padStart(2, '0')}</span>
    <div className="sg-factory-grid">{tiles.length ? tiles.map((color, i) =>
      <button type="button" key={`${i}-${color}`} disabled={disabled} onClick={() => onPick({ type: 'factory', index }, color)}
        className={`sg-market-token sg-market-token-${color}${selected?.source.type === 'factory' && selected.source.index === index && selected.color === color ? ' sg-token-selected' : ''}`}
        aria-label={`Warsztat ${index + 1}, ${COLORS_PL[color]}`} title={`Weź wszystkie ${COLORS_PL[color].toLowerCase()} tafle z warsztatu ${index + 1}`}>
        <GlassPiece color={color}/></button>) : <span className="sg-factory-empty-mark">✥</span>}
    </div>
  </div>
}
function Market({ game, selection, disabled, onPick }: {
  game: GameState; selection: Selection | null; disabled: boolean;
  onPick: (source: Source, color: GlassColor) => void
}) {
  const center = COLORS.map(color => ({ color, count: game.center.filter(x => x === color).length })).filter(item => item.count > 0)
  const inventory = glassInventory(game)
  return <section className="sg-market sg-center-card" aria-label="Warsztaty szkła">
    <div className="sg-panel-title"><span>WARSZTATY SZKŁA</span><small>{game.factories.filter(f => f.length).length} aktywnych</small></div>
    <div className="sg-market-circle">
      <div className="sg-market-ring"/>
      {game.factories.map((tiles, i) => <Factory key={i} tiles={tiles} index={i} count={game.factories.length} selected={selection} disabled={disabled} onPick={onPick}/>)}
      <div className="sg-center-pile">
        <span>ŚRODEK</span>
        <div className="sg-center-tokens">{center.length ? center.map(({ color, count }) =>
          <button type="button" disabled={disabled} key={color} title={`Zabierz ${count} × ${COLORS_PL[color]}`} onClick={() => onPick({ type: 'center' }, color)}
            className={`sg-center-choice${selection?.source.type === 'center' && selection.color === color ? ' sg-token-selected' : ''}`}>
            <GlassPiece color={color} small/><b>{count}</b>
          </button>) : <span className="sg-center-quiet">✧</span>}</div>
        {!game.firstCenterTaken && <span className="sg-start-tile sg-start-on-market" title="Żeton pierwszego gracza — pierwszy pobór ze środka oznacza +1 stłuczenie">1</span>}
        {!game.firstCenterTaken && <small className="sg-center-penalty">+1 stłuczenie</small>}
      </div>
    </div>
    <div className="sg-inventory" aria-label={`Bilans tafli szkła: ${inventory.total} ze 100`}>
      <div className="sg-inventory-tower" title={`Szklana Wieża: ${inventory.tower} tafli`}>
        <svg viewBox="0 0 34 42" role="img" aria-label="Szklana Wieża" fill="none">
          <path d="M9 4 L25 4 L29 35 L25 39 L9 39 L5 35 Z" fill="#2b7180" fillOpacity=".28" stroke="#9dc6c5" strokeWidth="1.4"/>
          <path d="M11 8 L23 8 L26 33 L22 36 L12 36 L8 33 Z" fill="#72c4d7" fillOpacity=".13" stroke="#9ad3db" strokeOpacity=".45"/>
          <path d="M9 14 L24 14 M8 23 L26 23 M10 32 L24 32" stroke="#ddf1e8" strokeOpacity=".35"/>
          <path d="M13 6 L11 32" stroke="#f3ffff" strokeOpacity=".55" strokeWidth="2"/>
          <path d="M6 38 L28 38" stroke="#e1b578" strokeWidth="2.2"/>
        </svg>
        <span>WIEŻA</span>
      </div>
      <div className="sg-inventory-stats">
        <span title={`Warsztaty: ${inventory.factories}, środek: ${inventory.center}`}><small>Na stole</small><b>{inventory.table}</b></span>
        <span><small>Witraże</small><b>{inventory.playerBoards}</b></span>
        <span><small>Woreczek</small><b>{inventory.bag}</b></span>
        <span className="sg-inventory-highlight"><small>W wieży</small><b>{inventory.tower}</b></span>
        <span><small>Rundy</small><b>{inventory.roundTrack}</b></span>
      </div>
      <div className={`sg-inventory-total${inventory.total !== 100 ? ' sg-inventory-warning' : ''}`} title="Razem: 100 tafli szkła">
        <strong>{inventory.total}<small> / 100</small></strong><span>SUMA</span>
      </div>
    </div>
    <div className="sg-first-token">{game.firstCenterTaken
      ? <>Żeton zdobył(a): <strong>{game.players[game.nextStartingPlayer ?? game.startingPlayer].name}</strong> · start w następnej rundzie</>
      : <>Rundę rozpoczął(a) <strong>{game.players[game.startingPlayer].name}</strong> · żeton na środku</>}</div>
  </section>
}

function PenaltyTrack({ game }: { game: GameState }) {
  return <section className="sg-track sg-center-card" aria-label="Tor stłuczonego szkła">
    <div className="sg-panel-title"><span>STŁUCZONE SZKŁO</span><small>tor kar</small></div>
    <div className="sg-track-cells">{BROKEN_TRACK.map((value, i) =>
      <div key={i} className={`sg-track-step${i === 8 ? ' sg-track-last' : ''}`}>
        <span>{i === 0 ? 'START' : i}</span>
        <strong>{value === 0 ? '0' : `−${value}`}</strong>
        <div className="sg-track-pawns">{game.players.map(p => p.brokenSteps === i && <i key={p.id} className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`} title={`${p.name}: ${i}/8`}/>)}</div>
      </div>)}</div>
    <div className="sg-track-legend">{game.players.map(p => <span key={p.id}><i className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`}/>{p.name} <b>{p.brokenSteps}/8</b></span>)}</div>
  </section>
}

function TurnSummary({ game }: { game: GameState }) {
  const current = game.players[game.currentPlayer]
  return <section className="sg-turn sg-center-card" aria-label="Tura i wyniki">
    <div className="sg-panel-title"><span>PRZY STOLE</span><span className="sg-live-dot"/></div>
    <div className="sg-turn-player"><span className={`sg-player-icon sg-palace-icon-${current.palaceColor ?? 'red'}`}>{PLAYER_AVATARS[game.currentPlayer]}</span>
      <div><strong>{game.phase === 'finished' ? 'Koniec rozgrywki' : current.controller === 'human' ? (current.name === 'Ty' ? 'Twój ruch' : `Tura: ${current.name}`) : `Gra ${current.name}`}</strong>
      <small>{game.phase === 'finished' ? 'Zobacz końcowe wyniki' : current.controller === 'human' ? 'Wybierz tafle i kwaterę' : 'Przeciwnik rozważa ruch…'}</small></div>
      {current.controller === 'ai' && game.phase === 'playing' && <span className="sg-thinking" aria-label="AI myśli"><i/><i/><i/></span>}
    </div>

    <div className="sg-scores">{game.players.map((p, i) => <div key={p.id} className={`sg-score-line${game.currentPlayer === i && game.phase === 'playing' ? ' sg-score-current' : ''}`}>
      <i className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`}/><span>{p.name}</span><b>{p.score}</b></div>)}</div>

  </section>
}
function SetupModal({ settings, onClose, onStart }: {
  settings: Settings; onClose: () => void; onStart: (settings: Settings) => void
}) {
  const [local, setLocal] = useState<Settings>(settings)
  const playerCount = local.opponents + 1
  const humans = Array.from({length: playerCount},(_,i)=>i).filter(i=>i === 0 || local.controllers[i] === 'human').length
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal setup-modal sg-hotseat-setup" role="dialog" aria-modal="true" aria-label="Nowa rozgrywka" onMouseDown={e => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose} aria-label="Zamknij"><X size={18}/></button>
      <div className="modal-icon"><Settings2 size={23}/></div>
      <span className="overline">ROZPOCZNIJ PRZYGODĘ</span>
      <h2>Nowa rozgrywka</h2>
      <p>Wybierz liczbę graczy i zdecyduj, kto gra osobiście, a kto jest botem.
        Przy turze człowieka jego plansza pojawi się na dole stołu.</p>
      <label className="field-label">Liczba graczy przy stole</label>
      <div className="option-row">{[2, 3, 4].map(count => <button key={count} type="button"
        className={`option-choice${playerCount === count ? ' chosen' : ''}`}
        onClick={() => setLocal(previous => ({...previous, opponents: count - 1}))}>
        {count}<small>{count === 2 ? 'Pojedynek' : count === 3 ? 'Trzy osoby' : 'Pełny stół'}</small>
      </button>)}</div>
      <div className="per-bot-header"><span className="field-label">Uczestnicy rozgrywki</span>
        <small>{humans} {humans === 1 ? 'człowiek' : 'ludzi'} · {playerCount - humans} AI</small></div>
      <div className="sg-hotseat-players">
        {Array.from({length: playerCount}, (_, i) => {
          const isHuman = i === 0 || local.controllers[i] === 'human'
          return <div key={i} className="sg-hotseat-player">
            <span className="sg-hotseat-number">{String(i + 1).padStart(2, '0')}</span>
            <div className="sg-hotseat-player-fields">
              <label htmlFor={`player-controller-${i}`}>Gracz {i + 1}</label>
              <select id={`player-controller-${i}`} value={isHuman ? 'human' : 'ai'}
                disabled={i === 0}
                title={i === 0 ? 'Pierwszy uczestnik zawsze jest człowiekiem' : undefined}
                onChange={e => setLocal(previous => ({
                  ...previous, controllers: previous.controllers.map((controller,j) =>
                    j === i ? e.target.value as Controller : controller),
                }))}>
                <option value="human">Człowiek</option>
                <option value="ai">Bot AI</option>
              </select>
              {isHuman ? <input
                aria-label={`Imię gracza ${i + 1}`}
                value={local.names[i] ?? `Gracz ${i + 1}`}
                maxLength={28}
                onChange={e => setLocal(previous => ({
                  ...previous, names: previous.names.map((name,j) => j === i ? e.target.value : name),
                }))} placeholder={`Gracz ${i + 1}`}/>
              : <select aria-label={`Poziom trudności bota ${i + 1}`}
                  value={local.difficulties[i - 1] ?? 'normal'}
                  onChange={e => setLocal(previous => ({
                    ...previous,
                    difficulties: previous.difficulties.map((level,j) =>
                      j === i - 1 ? e.target.value as Difficulty : level),
                  }))}>
                  <option value="easy">Łatwy · losowy</option>
                  <option value="normal">Normalny · zachłanny</option>
                  <option value="hard">Trudny · strategiczny</option>
                  <option value="expert">Ekspert · przewiduje przeciwników</option>
                  <option value="master">Trenowany · eksperymentalna strategia</option>
                </select>}
            </div>
          </div>
        })}
      </div>
      {humans > 1 && <p className="sg-hotseat-hint">Tryb przy jednym ekranie: plansza obraca się na turę kolejnego człowieka.
        Boty grają automatycznie, bez obracania widoku na siebie.</p>}
      <label className="field-label" htmlFor="palace-side">Punktowanie finałowe</label>
      <select id="palace-side" value={local.palaceSide} onChange={e => setLocal({...local, palaceSide:e.target.value as PalaceSide})}>
        <option value="A">Strona A — ornamenty</option><option value="B">Strona B — dominujący kolor</option>
      </select>
      <button className="btn btn-primary modal-main" onClick={() => onStart(local)}>Rozpocznij partię <ArrowRight size={18}/></button>
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
    difficulties: DEFAULT_OPTIONS.difficulties.map((difficulty, i) => game.players[i + 1]?.difficulty ?? difficulty),
    controllers: DEFAULT_OPTIONS.controllers.map((controller, i) => game.players[i]?.controller ?? controller),
    names: DEFAULT_OPTIONS.names.map((name, i) => game.players[i]?.controller === 'human' ? game.players[i].name : name),
    palaceSide: game.palaceSide,
  }))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [finishing, setFinishing] = useState<Move[] | null>(null)
  const [placementOptions, setPlacementOptions] = useState<Move[] | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [lastHumanIndex, setLastHumanIndex] = useState(() =>
    game.players[game.currentPlayer]?.controller === 'human' ? game.currentPlayer : 0)
  const { enabled: soundEnabled, toggle: toggleSound, play } = useGameAudio()
  const { enabled: musicEnabled, toggle: toggleMusic, unavailable: musicUnavailable } = useAmbientMusic()
  const { enabled: effectsEnabled, toggle: toggleEffects, emit: emitEffects, clear: clearEffects, bursts: visualBursts, reducedMotion } = useVisualEffects()
  const humanTurn = game.phase === 'playing' && game.players[game.currentPlayer].controller === 'human'
  const viewerIndex = viewingPlayerIndex(game.currentPlayer, lastHumanIndex, game.players.map(p => p.controller))
  const tableSeats = useMemo(() => seatsForViewer(viewerIndex, game.players.length), [viewerIndex, game.players.length])
  const moves = useMemo(() => legalMoves(game), [game])
  const sourceOptions = useMemo(() => availableSources(game), [game])
  const selectionMoves = useMemo(() => selection ? moves.filter(m => m.kind === 'take' &&
    sourceEquals(m.source, selection.source) && m.color === selection.color) : [], [moves, selection])
  const targets = new Set<number>(selectionMoves.flatMap(m => m.kind === 'take' && m.windowIndex !== null ? [m.windowIndex] : []))
  const canReset = humanTurn && moves.some(m => m.kind === 'reset')
  const current = game.players[game.currentPlayer]
  const best = standings(game)
  const finishOverlay = finishOverlayVisibility({ phase: game.phase, setupOpen: showSetup, rulesOpen: showRules || showStrategy, resultsOpen: showResults })
  const status = selection
    ? `Wybrano ${COLORS_PL[selection.color].toLowerCase()}. Wskaż podświetloną kwaterę.`
    : game.phase === 'finished' ? `Koniec gry — wygrywa ${best[0].name}.`
    : humanTurn ? `${current.name === 'Ty' ? 'Twój ruch' : `Ruch gracza ${current.name}`}: wybierz tafle z warsztatu lub środka stołu.`
    : `${current.name} wybiera ruch…`

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) }, [game])
  useEffect(() => {
    if (game.phase === 'playing' && game.players[game.currentPlayer]?.controller === 'human') {
      setLastHumanIndex(game.currentPlayer)
    }
  }, [game.currentPlayer, game.phase, game.players])
  useEffect(() => {
    if (game.phase !== 'playing' || game.players[game.currentPlayer].controller !== 'ai' || finishing) return
    const difficulty = game.players[game.currentPlayer].difficulty ?? 'normal'
    const base = difficulty === 'easy' ? 1100 : difficulty === 'normal' ? 1500 : difficulty === 'expert' ? 2200 : difficulty === 'master' ? 2250 : 1900
    const delay = base + Math.round(Math.random() * 450)
    const timer = window.setTimeout(() => {
      const move = chooseAIMove(game, difficulty)
      if (move) {
        const next = applyMove(game, move)
        emitEffects(game, next, move)
        setGame(next)
        play(moveAudioCue(game, next))
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [game, finishing, play, emitEffects])
  useEffect(() => { if (!humanTurn) { setSelection(null); setFinishing(null); setPlacementOptions(null) } }, [humanTurn])

  function commit(move: Move) {
    const next = applyMove(game, move)
    emitEffects(game, next, move)
    setGame(next)
    play(moveAudioCue(game, next))
    setSelection(null)
    setFinishing(null)
    setPlacementOptions(null)
  }
  function chooseSource(source: Source, color: GlassColor) {
    if (!humanTurn || finishing) return
    if (!sourceOptions.some(option => option.color === color && sourceEquals(option.source, source))) return
    play('pick')
    setSelection(prev => prev && prev.color === color && sourceEquals(prev.source, source) ? null : { source, color })
  }
  function chooseFinalGlass(candidates: Move[]) {
    // Keep-color choices are separate from placement choices. Choosing fields
    // must never force which colored pane the player preserves afterwards.
    if (candidates.length > 1 || (candidates[0]?.kind === 'take' && candidates[0].keepColor)) {
      setFinishing(candidates)
    } else if (candidates.length) commit(candidates[0])
  }
  function chooseTarget(index: number | null) {
    const candidates = selectionMoves.filter(m => m.kind === 'take' && m.windowIndex === index)
    if (!candidates.length) return
    const variants = [...new Set(candidates.map(m => m.kind === 'take' ? m.slots?.join(',') ?? '' : ''))]
    if (variants.length > 1) {
      setPlacementOptions(candidates)
    } else {
      chooseFinalGlass(candidates)
    }
  }
  function confirmManualPlacement(candidates: Extract<Move, { kind: 'take' }>[]) {
    if (!candidates.length) return
    setPlacementOptions(null)
    chooseFinalGlass(candidates)
  }
  function startNew(options: Settings) {
    clearEffects()
    setSettings(options)
    setGame(newGame({
      opponents: options.opponents,
      palaceSide: options.palaceSide,
      botDifficulties: options.difficulties,
      playerControllers: options.controllers,
      playerNames: options.names,
    }))
    setLastHumanIndex(0)
    play('round')
    setSelection(null); setFinishing(null); setPlacementOptions(null); setShowSetup(false); setShowResults(false)
  }
  function seat(index: number, place: 'north' | 'west' | 'east' | 'south') {
    const player = game.players[index]
    if (!player) return null
    const activeHuman = humanTurn && index === game.currentPlayer
    const viewedHuman = player.controller === 'human' && index === viewerIndex
    return <div className={`sg-seat sg-seat-${place}${activeHuman ? ' sg-seat-active-human' : ''}`} key={player.id}>
      <div className="sg-seat-rotation"><GameBoard player={player} index={index} isCurrent={game.currentPlayer === index && game.phase === 'playing'}
        isHuman={viewedHuman} isHumanTurn={activeHuman} selected={!!selection && activeHuman}
        targets={activeHuman ? targets : undefined} onTarget={activeHuman ? i => chooseTarget(i) : undefined}
        canReset={canReset && !finishing} onReset={() => commit({ kind: 'reset' })}
        isStartingPlayer={game.startingPlayer === index}
        palaceSide={game.palaceSide}
        hasFirstToken={game.firstCenterTaken && game.nextStartingPlayer === index}/></div>
    </div>
  }

  return <div className="sg">
    <header className="sg-header">
      <div className="sg-brand"><span className="sg-brand-symbol"><Gem size={20}/></span><span>SINTRA <b>GLASS</b></span><small>WITRAŻE SINTRY · EDYCJA CYFROWA</small></div>
      <div className="sg-header-round"><span>RUNDA</span><strong>{game.round} <small>/ 6</small></strong><div className="sg-round-colors">{game.roundColors.map((c, i) =>
        <i key={i} title={`Runda ${i + 1}: ${COLORS_PL[c]}`} className={`sg-color-dot sg-color-dot-${c}${i + 1 === game.round ? ' sg-color-now' : i + 1 < game.round ? ' sg-color-past' : ''}`}/>)}</div></div>
      <div className="sg-header-actions">
        <GameMenu effectsEnabled={effectsEnabled} reducedMotion={reducedMotion} toggleEffects={toggleEffects}
          musicEnabled={musicEnabled} musicUnavailable={musicUnavailable} toggleMusic={toggleMusic}
          soundEnabled={soundEnabled} toggleSound={toggleSound}
          openStrategy={() => setShowStrategy(true)} openRules={() => setShowRules(true)}/>
        <button type="button" className="sg-new" onClick={() => setShowSetup(true)}>
          <RotateCcw size={16}/> Nowa gra
        </button>
      </div>
    </header>
    <main className="sg-stage" aria-label="Wspólny stół Sintra Glass">
      <div className="sg-felt">
        {tableSeats.filter(seatInfo => seatInfo.place !== 'south').map(seatInfo => seat(seatInfo.playerIndex, seatInfo.place))}
        <div className="sg-center">
          <div className="sg-side-left"><TurnSummary game={game}/><PenaltyTrack game={game}/></div>
          <Market game={game} selection={selection} disabled={!humanTurn || !!finishing} onPick={chooseSource}/>
          <LiveHistory state={game} status={status} onCancel={selection ? () => setSelection(null) : undefined}
            onDiscard={selection && selectionMoves.some(m => m.kind === 'take' && m.windowIndex === null) ? () => chooseTarget(null) : undefined}/>

        </div>
        {tableSeats.filter(seatInfo => seatInfo.place === 'south').map(seatInfo => seat(seatInfo.playerIndex, seatInfo.place))}
      </div>
    </main>
    <GlassVisualEffects bursts={visualBursts}/>
    {finishOverlay.banner && <FinishCelebration state={game} onResults={() => setShowResults(true)} onNewGame={() => setShowSetup(true)}/>}
    {finishOverlay.results && <FinalResults state={game} onClose={() => setShowResults(false)}/>}
    {showSetup && <SetupModal settings={settings} onClose={() => setShowSetup(false)} onStart={startNew}/>}
    {showRules && <RulesModal onClose={() => setShowRules(false)}/>}
    {showStrategy && <StrategyLab state={game} onClose={() => setShowStrategy(false)}/>}
    {placementOptions && selection && placementOptions[0].kind === 'take' && placementOptions[0].windowIndex !== null &&
      <ManualPlacementDialog key={`${game.turn}-${placementOptions[0].windowIndex}-${selection.color}`}
        strip={game.players[game.currentPlayer].strips[placementOptions[0].windowIndex]}
        candidates={placementOptions.filter((move): move is Extract<Move, { kind: 'take' }> => move.kind === 'take')}
        picked={sourceOptions.find(option => option.color === selection.color && sourceEquals(option.source, selection.source))?.count ?? 0}
        onClose={() => setPlacementOptions(null)} onConfirm={confirmManualPlacement}/>}
    {finishing && <div className="modal-backdrop" onMouseDown={() => setFinishing(null)}><div className="modal keep-modal" role="dialog" aria-modal="true" aria-label="Wybierz taflę do zachowania" onMouseDown={e => e.stopPropagation()}><button className="close-btn" onClick={() => setFinishing(null)} aria-label="Zamknij"><X size={18}/></button><div className="modal-icon"><Gem size={24}/></div><h2>Wybierz taflę do okna</h2><p>Jedna tafla zostanie w pałacowym witrażu.</p><div className="keep-options">{finishing.filter(m => m.kind === 'take' && m.keepColor).map(m => m.kind === 'take' && m.keepColor ? <button key={m.keepColor} onClick={() => commit(m)}><GlassPiece color={m.keepColor}/><span>{COLORS_PL[m.keepColor]}</span></button> : null)}</div></div></div>}
  </div>
}
