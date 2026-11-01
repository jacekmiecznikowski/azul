import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, Gem, House, Info, RotateCcw, Settings2, X } from 'lucide-react'
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
import { HomeScreen } from './components/HomeScreen'
import { desktopTableMetrics } from './ui/responsiveTable'
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
import './polish-v24.css'
import './android-mobile-v25.css'
import './home-v29.css'
import './ui-refinement-v32.css'

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
    <div className="sg-panel-title"><span>WARSZTATY SZKŁA</span><span className="sg-market-title-meta"><small>{game.factories.filter(f => f.length).length} aktywnych</small>{!game.firstCenterTaken && <span className="sg-start-tile sg-market-first-badge" aria-label="Żeton pierwszego gracza jest na środku stołu" title="Żeton pierwszego gracza jest na środku stołu">1</span>}</span></div>
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
        {!game.firstCenterTaken && <small className="sg-center-penalty">+1 stłuczenie</small>}
      </div>
    </div>
    <div className="sg-inventory sg-inventory-v32" aria-label={`Zasoby tafli: ${inventory.table} na stole, ${inventory.playerBoards} w witrażach, ${inventory.bag} w woreczku, ${inventory.tower} w wieży. Razem ${inventory.total} ze 100.`}>
      <div className="sg-inventory-tower" title={`W szklanej wieży: ${inventory.tower}`}>
        <svg viewBox="0 0 28 36" aria-hidden="true" fill="none">
          <path d="M8 3H20L24 30L19 34H9L4 30Z" fill="#245867" stroke="#bcdbd1" strokeWidth="1.3"/>
          <path d="M10 7H18L20.5 29L17 31H11L7.5 29Z" fill="#6ad5df" fillOpacity=".18" stroke="#e0e3ce" strokeOpacity=".48"/>
          <path d="M8 15H20M7 23H21" stroke="#b8dada" strokeOpacity=".5"/>
          <path d="M11 7L9 28" stroke="#fff7dc" strokeWidth="2" strokeOpacity=".55"/>
          <path d="M5 32H23" stroke="#c6b37a" strokeWidth="2"/>
        </svg>
        <span className="sg-inventory-tower-caption"><small>WIEŻA</small><strong>{inventory.tower}</strong></span>
      </div>
      <div className="sg-inventory-stats">
        <span><small>Na stole</small><b>{inventory.table}</b></span>
        <span><small>Witraże</small><b>{inventory.playerBoards}</b></span>
        <span><small>Woreczek</small><b>{inventory.bag}</b></span>
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
    <div className="sg-track-cells" role="group" aria-label="Dziewięć pól toru stłuczonego szkła">{BROKEN_TRACK.map((value, i) =>
      <div key={i} className={`sg-track-step${i === 8 ? ' sg-track-last' : ''}${game.players.some(p => p.brokenSteps === i) ? ' sg-track-occupied' : ''}`}
        title={`Pole ${i} z 8, kara ${value} pkt`}>
        <span className="sg-track-step-number">{i === 0 ? 'START' : String(i).padStart(2, '0')}</span>
        <strong>{value === 0 ? '0' : `−${value}`}</strong>
        <div className="sg-track-pawns">{game.players.map(p => p.brokenSteps === i && <i key={p.id} className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`} title={`${p.name}: pole ${i}`}/>)}</div>
      </div>)}</div>
    <div className="sg-track-legend" aria-label="Kolory pionków">{game.players.map(p => <span key={p.id}><i className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`}/><span>{p.name}</span></span>)}</div>
  </section>
}

export function TurnSummary({ game }: { game: GameState }) {
  const current = game.players[game.currentPlayer]
  return <section className="sg-turn sg-center-card" aria-label="Tura i wyniki">
    <div className="sg-panel-title"><span>PRZY STOLE</span></div>
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
  const [screen, setScreen] = useState<'home' | 'game'>('home')
  const [hasSave, setHasSave] = useState(() => restore() !== null)
  const [viewport, setViewport] = useState(() => typeof window === 'undefined' ? { width: 1600, height: 900 } : { width: window.innerWidth, height: window.innerHeight })
  const [showSetup, setShowSetup] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [mobileBoard, setMobileBoard] = useState<number | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'score' | 'history' | null>(null)
  const [lastHumanIndex, setLastHumanIndex] = useState(() =>
    game.players[game.currentPlayer]?.controller === 'human' ? game.currentPlayer : 0)
  const { enabled: soundEnabled, toggle: toggleSound, play } = useGameAudio()
  const { enabled: musicEnabled, toggle: toggleMusic, unavailable: musicUnavailable } = useAmbientMusic()
  const { enabled: effectsEnabled, toggle: toggleEffects, emit: emitEffects, clear: clearEffects, bursts: visualBursts, reducedMotion } = useVisualEffects()
  const humanTurn = screen === 'game' && game.phase === 'playing' && game.players[game.currentPlayer].controller === 'human'
  const desktopTable = useMemo(() => desktopTableMetrics(viewport.width, viewport.height), [viewport.width, viewport.height])
  const viewerIndex = viewingPlayerIndex(game.currentPlayer, lastHumanIndex, game.players.map(p => p.controller))
  const tableSeats = useMemo(() => seatsForViewer(viewerIndex, game.players.length), [viewerIndex, game.players.length])
  const mobileBoardIndex = mobileBoard !== null && mobileBoard < game.players.length ? mobileBoard : viewerIndex
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

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    if (screen !== 'game') return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) } catch { /* private storage */ }
  }, [game, screen])
  useEffect(() => {
    if (game.phase === 'playing' && game.players[game.currentPlayer]?.controller === 'human') {
      setLastHumanIndex(game.currentPlayer)
    }
  }, [game.currentPlayer, game.phase, game.players])
  useEffect(() => {
    if (screen !== 'game' || game.phase !== 'playing' || game.players[game.currentPlayer].controller !== 'ai' || finishing) return
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
  }, [game, screen, finishing, play, emitEffects])
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
    setScreen('game')
    setHasSave(true)
    setMobileBoard(null)
    setMobilePanel(null)
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

  return <div className={`sg${screen === "home" ? " sg-in-home" : ""}`}>
    <header className="sg-header">
      <div className="sg-brand"><span className="sg-brand-symbol"><Gem size={20}/></span><span>SINTRA <b>GLASS</b></span></div>
      <div className="sg-header-round"><span>RUNDA</span><strong>{game.round} <small>/ 6</small></strong><div className="sg-round-colors">{game.roundColors.map((c, i) =>
        <i key={i} title={`Runda ${i + 1}: ${COLORS_PL[c]}`} className={`sg-color-dot sg-color-dot-${c}${i + 1 === game.round ? ' sg-color-now' : i + 1 < game.round ? ' sg-color-past' : ''}`}/>)}</div><div className="sg-round-mobile-colors" role="group" aria-label="Kolory punktowane w rundach od 1 do 6">
          {game.roundColors.map((c, i) =>
            <span key={i} className={`sg-round-mobile-color${i + 1 === game.round ? ' sg-round-mobile-color-active' : i + 1 < game.round ? ' sg-round-mobile-color-past' : ''}`}
              title={`Runda ${i + 1}: ${COLORS_PL[c]}`}
              aria-label={`Runda ${i + 1}, ${COLORS_PL[c]}`}>
              <small>{i + 1}</small><i className={`sg-color-dot sg-color-dot-${c}`}/>
            </span>)}
        </div></div>
      <div className="sg-header-actions">
        <GameMenu effectsEnabled={effectsEnabled} reducedMotion={reducedMotion} toggleEffects={toggleEffects}
          musicEnabled={musicEnabled} musicUnavailable={musicUnavailable} toggleMusic={toggleMusic}
          soundEnabled={soundEnabled} toggleSound={toggleSound}
          openStrategy={() => setShowStrategy(true)} openRules={() => setShowRules(true)}/>
        <button type="button" className="sg-home-return" onClick={() => { clearEffects(); setScreen('home'); setSelection(null); setFinishing(null); setPlacementOptions(null); setMobilePanel(null) }} aria-label="Menu główne" title="Menu główne"><House size={16}/><span>Główne</span></button>
        <button type="button" className="sg-new" onClick={() => setShowSetup(true)}>
          <RotateCcw size={16}/> Nowa gra
        </button>
      </div>
    </header>
    <main className="sg-stage sg-responsive-stage" aria-label="Wspólny stół Sintra Glass">
      <div className="sg-felt" style={{ zoom: desktopTable.scale, width: desktopTable.width, minWidth: desktopTable.width, height: desktopTable.height, '--sg-long': `${desktopTable.boardLong}px` } as React.CSSProperties}>
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
    <div className="sg-mobile-layout" aria-label="Mobilny stół Sintra Glass">
      <nav className="sg-mobile-players" aria-label="Wybierz planszę gracza">
        {game.players.map((p,i) => <button type="button" key={p.id}
          className={`sg-mobile-player sg-palace-${p.palaceColor ?? 'red'}${mobileBoardIndex === i ? ' sg-mobile-player-selected' : ''}`}
          aria-pressed={mobileBoardIndex === i}
          onClick={() => setMobileBoard(i)}>
          <span className="sg-mobile-palace-chip" aria-hidden="true" title={`Pałac: ${p.palaceColor ?? 'red'}`}/>
          <span className="sg-mobile-player-name">{p.name}</span>
          <strong>{p.score} pkt</strong>
          {game.currentPlayer === i && game.phase === 'playing' && <i className="sg-mobile-now" aria-label="Aktualna tura"/>}
        </button>)}
        <button type="button" className="sg-mobile-panel-button" onClick={() => setMobilePanel('score')}>Wyniki</button>
        <button type="button" className="sg-mobile-panel-button" onClick={() => setMobilePanel('history')}>Historia</button>
      </nav>
      <div className="sg-mobile-game">
        <div className="sg-mobile-board">
          {game.players[mobileBoardIndex] && <GameBoard
            player={game.players[mobileBoardIndex]} index={mobileBoardIndex}
            isCurrent={game.currentPlayer === mobileBoardIndex && game.phase === 'playing'}
            isHuman={game.players[mobileBoardIndex].controller === 'human'}
            isHumanTurn={humanTurn && game.currentPlayer === mobileBoardIndex}
            selected={!!selection && humanTurn && game.currentPlayer === mobileBoardIndex}
            targets={humanTurn && game.currentPlayer === mobileBoardIndex ? targets : undefined}
            onTarget={humanTurn && game.currentPlayer === mobileBoardIndex ? chooseTarget : undefined}
            canReset={canReset && !finishing && game.currentPlayer === mobileBoardIndex}
            onReset={() => commit({kind:'reset'})}
            isStartingPlayer={game.startingPlayer === mobileBoardIndex}
            palaceSide={game.palaceSide}
            hasFirstToken={game.firstCenterTaken && game.nextStartingPlayer === mobileBoardIndex}/>}
        </div>
        <div className="sg-mobile-market">
          <Market game={game} selection={selection} disabled={!humanTurn || !!finishing} onPick={chooseSource}/>
          <div className="sg-mobile-penalty-strip" role="group" aria-label="Tor stłuczonego szkła — naciśnij pole, aby zobaczyć wyniki">
            <span className="sg-mobile-penalty-label">STŁUCZONE SZKŁO</span>
            {BROKEN_TRACK.map((points, i) => <button type="button" key={i}
              title={`Pole ${i} z 8 · kara ${points} pkt`}
              aria-label={`Tor szkła, pole ${i} z 8, kara ${points} punktów`}
              onClick={() => setMobilePanel('score')}
              className={`sg-mobile-penalty-step${i === 8 ? ' sg-mobile-penalty-final' : ''}${game.players.some(p => p.brokenSteps === i) ? ' sg-mobile-penalty-occupied' : ''}`}>
              <small>{i === 0 ? 'START' : i}</small>
              <strong>{i === 0 ? '0' : `−${points}`}</strong>
              <span className="sg-mobile-penalty-pawns">
                {game.players.map(p => p.brokenSteps === i ? <i key={p.id} className={`sg-pawn sg-pawn-color-${p.palaceColor ?? 'red'}`} title={p.name}/> : null)}
              </span>
            </button>)}
          </div>
          <div className="sg-mobile-status" aria-live="polite">
            <span>{selection ? `Wskaż kwaterę — ${COLORS_PL[selection.color].toLowerCase()}` : humanTurn ? `Ruch: ${current.name}` : `${current.name} wybiera ruch…`}</span>
            {selection && <button type="button" onClick={() => setSelection(null)}>Anuluj</button>}
            {selection && selectionMoves.some(m => m.kind === 'take' && m.windowIndex === null) &&
              <button type="button" onClick={() => chooseTarget(null)}>Stłucz</button>}
            {humanTurn && mobileBoardIndex !== game.currentPlayer &&
              <button type="button" onClick={() => setMobileBoard(game.currentPlayer)}>Moja tura</button>}
          </div>
        </div>
      </div>
      {mobilePanel && <div className="sg-mobile-overlay" onMouseDown={() => setMobilePanel(null)}>
        <div className="sg-mobile-overlay-dialog" role="dialog" aria-modal="true"
          aria-label={mobilePanel === 'score' ? 'Wyniki i tor szkła' : 'Historia rozgrywki'}
          onMouseDown={e => e.stopPropagation()}>
          <div className="sg-mobile-overlay-heading"><strong>{mobilePanel === 'score' ? 'Wyniki i stłuczone szkło' : 'Historia ruchów'}</strong>
            <button type="button" onClick={() => setMobilePanel(null)}>Zamknij ×</button></div>
          {mobilePanel === 'score'
            ? <div className="sg-mobile-stats"><TurnSummary game={game}/><PenaltyTrack game={game}/></div>
            : <LiveHistory state={game} status={status}
                onCancel={selection ? () => setSelection(null) : undefined}
                onDiscard={selection && selectionMoves.some(m => m.kind === 'take' && m.windowIndex === null) ? () => chooseTarget(null) : undefined}/>}
        </div>
      </div>}
    </div>
    {screen === 'home' && <HomeScreen
      hasSave={hasSave}
      onContinue={() => { setScreen('game'); setShowSetup(false) }}
      onNewGame={() => setShowSetup(true)}
      onRules={() => setShowRules(true)}
      effectsEnabled={effectsEnabled} reducedMotion={reducedMotion} toggleEffects={toggleEffects}
      musicEnabled={musicEnabled} musicUnavailable={musicUnavailable} toggleMusic={toggleMusic}
      soundEnabled={soundEnabled} toggleSound={toggleSound}/>} 
    {screen === 'game' && <GlassVisualEffects bursts={visualBursts}/>}
    {screen === 'game' && finishOverlay.banner && <FinishCelebration state={game} onResults={() => setShowResults(true)} onNewGame={() => setShowSetup(true)}/>}
    {screen === 'game' && finishOverlay.results && <FinalResults state={game} onClose={() => setShowResults(false)}/>}
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
