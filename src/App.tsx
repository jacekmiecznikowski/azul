import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, CirclePlus, Gem, House, Info, Settings2, X } from 'lucide-react'
import { applyMove, availableSources, BROKEN_TRACK, COLORS, legalMoves, newGame, standings } from './game/engine'
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
import { useSharedGlassGeometry } from './hooks/useSharedGlassGeometry'
import { roundPresentationTiming } from './ui/turnPresentation'
import { GlassResources } from './components/GlassResources'
import { GLASS_COLOR_LABELS_PL as COLORS_PL } from './game/colorLabels'
import { ManualPlacementDialog } from './components/ManualPlacementDialog'
import { GameMenu } from './components/GameMenu'
import { CompactScores } from './components/ScorePanels'
import { HomeScreen } from './components/HomeScreen'
import { RoundTracker } from './components/RoundTracker'
import { RoundAnnouncement } from './components/RoundAnnouncement'
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
import './ui-refinement-v33.css'
import './ui-refinement-v34.css'
import './ui-refinement-v36.css'
import './stained-glass-v44.css'
import './market-gems-v45.css'
import './market-orbit-v46.css'
import './market-layout-v47.css'
import './market-layout-v48.css'
import './market-glass-v49.css'
import './glass-geometry-v50.css'
import './unified-glass-v51.css'
import './header-premium-v52.css'
import './experience-polish-v53.css'
import './header-ceremony-glazier-v54.css'
import './turn-market-v56.css'
import './score-presentation-v58.css'

const STORAGE_KEY = 'sintra-glass-save-v1'
const PLAYER_AVATARS = ['✦', '✧', '✳', '❖']
interface Settings { opponents: number; difficulties: Difficulty[]; controllers: Controller[]; names: string[]; palaceSide: PalaceSide }
const DEFAULT_OPTIONS: Settings = {
  opponents: 3,
  difficulties: ['normal', 'normal', 'normal'],
  controllers: ['human', 'ai', 'ai', 'ai'],
  names: ['Ty', 'Aurora', 'Iris', 'Noctis'],
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

function Factory({ tiles, index, selected, disabled, onPick }: {
  tiles: GlassColor[]; index: number; selected: Selection | null;
  disabled: boolean; onPick: (source: Source, color: GlassColor) => void
}) {
  return <div className={`sg-factory sg-factory-v45${tiles.length ? '' : ' sg-factory-empty'}${selected?.source.type === 'factory' && selected.source.index === index ? ' sg-factory-is-selected' : ''}`}
    role="group" aria-label={`Warsztat ${index + 1}`}>
    <span className="sg-factory-num">{String(index + 1).padStart(2, '0')}</span>
    <div className="sg-factory-grid">{tiles.length ? tiles.map((color, i) =>
      <button type="button" key={`${i}-${color}`} disabled={disabled}
        onClick={() => onPick({ type: 'factory', index }, color)}
        className={`sg-market-token sg-market-token-${color}${selected?.source.type === 'factory' && selected.source.index === index && selected.color === color ? ' sg-token-selected' : ''}`}
        aria-label={`Warsztat ${index + 1}, ${COLORS_PL[color]}`}
        title={`Weź wszystkie ${COLORS_PL[color].toLowerCase()} tafle z warsztatu ${index + 1}`}>
        <GlassPiece color={color}/></button>) : <span className="sg-factory-empty-mark" aria-label="Pusty warsztat">✥</span>}
    </div>
  </div>
}
/** Equal arc-length spacing on a wide oval, not equal angles on a squeezed circle.
 * The normalized coordinates adapt to market panels of any size. */
export const MARKET_ORBIT_POSITIONS: Record<number, readonly (readonly [number, number])[]> = {
  5: [[50,17.5],[86.6,34.2],[69.2,80.9],[30.8,80.9],[13.4,34.2]],
  7: [[50,17.5],[77.1,23.7],[88.5,62],[63.8,83],[36.2,83],[11.5,62],[22.9,23.7]],
  9: [[50,17.5],[71.3,20.1],[89.4,40.4],[81.3,72.6],[60.7,83.8],[39.3,83.8],[18.7,72.6],[10.6,40.4],[28.7,20.1]],
}
export function Market({ game, selection, disabled, onPick }: {
  game: GameState; selection: Selection | null; disabled: boolean;
  onPick: (source: Source, color: GlassColor) => void
}) {
  const center = COLORS.map(color => ({ color, count: game.center.filter(x => x === color).length })).filter(item => item.count > 0)
  return <section className="sg-market sg-center-card" aria-label="Warsztaty szkła">
    <div className="sg-panel-title"><span>WARSZTATY SZKŁA</span><span className="sg-market-title-meta"><small>{game.factories.filter(f => f.length).length} aktywnych</small></span></div>
    <div className="sg-market-layout-v45">
      <div className="sg-market-orbit-v46" data-sg-orbit-count={game.factories.length}>
        <div className="sg-market-factories-v45" role="group" aria-label="Warsztaty szkła">
          {game.factories.map((tiles, i) => {
            const [x, y] = MARKET_ORBIT_POSITIONS[game.factories.length]?.[i] ?? [
              50 + 41 * Math.cos((-90 + 360 * i / game.factories.length) * Math.PI / 180),
              50 + 35 * Math.sin((-90 + 360 * i / game.factories.length) * Math.PI / 180),
            ]
            return <div key={i} className="sg-orbit-position-v46"
              style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:'var(--sg-disc-size)',aspectRatio:'1',transform:'translate(-50%,-50%)',pointerEvents:'auto'}}>
              <Factory tiles={tiles} index={i} selected={selection} disabled={disabled} onPick={onPick}/>
            </div>
          })}
        </div>
        <div className="sg-center-pile sg-center-v45" role="group" aria-label="Środek stołu">
          <span className="sg-center-accessible">Środek stołu</span>
          <div className="sg-center-tokens sg-center-tokens-v45">{center.length ? center.map(({ color, count }) =>
            <button type="button" disabled={disabled} key={color}
              title={`Zabierz ${count} × ${COLORS_PL[color]}`}
              aria-label={`Środek stołu: ${count} × ${COLORS_PL[color].toLowerCase()}`}
              onClick={() => onPick({ type: 'center' }, color)}
              className={`sg-center-choice${selection?.source.type === 'center' && selection.color === color ? ' sg-token-selected' : ''}`}>
              <GlassPiece color={color}/><b aria-hidden="true">{count}</b>
            </button>) : <span className="sg-center-quiet">✧</span>}</div>
          {!game.firstCenterTaken && <span className="sg-start-tile sg-center-first-token" aria-label="Żeton pierwszego gracza: plus jedno stłuczenie" title="Pierwszy pobór: znacznik pierwszego gracza i 1 stłuczenie">+1</span>}
        </div>
      </div>
    </div>
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
    <div className="sg-turn-first-token" role="status">
      {game.firstCenterTaken
        ? <span>Następną rundę rozpocznie: <strong>{game.players[game.nextStartingPlayer ?? game.startingPlayer].name}</strong></span>
        : <span>Rundę rozpoczyna: <strong>{game.players[game.startingPlayer].name}</strong></span>}
    </div>
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
              {<input
                aria-label={`Imię gracza ${i + 1}`}
                value={local.names[i] ?? `Gracz ${i + 1}`}
                maxLength={28}
                onChange={e => setLocal(previous => ({
                  ...previous, names: previous.names.map((name,j) => j === i ? e.target.value : name),
                }))} placeholder={`Gracz ${i + 1}`}/>
              }{!isHuman && <select aria-label={`Poziom trudności bota ${i + 1}`}
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
    names: DEFAULT_OPTIONS.names.map((name, i) => game.players[i]?.name ?? name),
    palaceSide: game.palaceSide,
  }))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [finishing, setFinishing] = useState<Move[] | null>(null)
  const [placementOptions, setPlacementOptions] = useState<Move[] | null>(null)
  const [screen, setScreen] = useState<'home' | 'game'>('home')
  const announcedRound = useRef<number | null>(null)
  const [roundAnnouncement, setRoundAnnouncement] = useState<{ round: number; color: GlassColor } | null>(null)
  // A round can start with an AI seat. Never schedule or reveal that move behind
  // the round ceremony; release the turn only after its exit and a short pause.
  const [roundReady, setRoundReady] = useState<number | null>(null)
  const [turnNotice, setTurnNotice] = useState<{ key: string; name: string } | null>(null)
  const noticedHumanTurn = useRef<string | null>(null)
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
  const roundTiming = roundPresentationTiming(effectsEnabled, reducedMotion)
  const humanTurn = screen === 'game' && game.phase === 'playing' && game.players[game.currentPlayer].controller === 'human'
  const roundIsReady = roundReady === game.round && roundAnnouncement === null
  const humanCanPlay = humanTurn && roundIsReady
  const showTurnPopup = humanCanPlay && roundTiming.cinematic
  const desktopTable = useMemo(() => desktopTableMetrics(viewport.width, viewport.height), [viewport.width, viewport.height])
  const viewerIndex = viewingPlayerIndex(game.currentPlayer, lastHumanIndex, game.players.map(p => p.controller))
  const tableSeats = useMemo(() => seatsForViewer(viewerIndex, game.players.length), [viewerIndex, game.players.length])
  const mobileBoardIndex = mobileBoard !== null && mobileBoard < game.players.length ? mobileBoard : viewerIndex
  const moves = useMemo(() => legalMoves(game), [game])
  const sourceOptions = useMemo(() => availableSources(game), [game])
  const selectionMoves = useMemo(() => selection ? moves.filter(m => m.kind === 'take' &&
    sourceEquals(m.source, selection.source) && m.color === selection.color) : [], [moves, selection])
  const targets = new Set<number>(selectionMoves.flatMap(m => m.kind === 'take' && m.windowIndex !== null ? [m.windowIndex] : []))
  const canReset = humanCanPlay && moves.some(m => m.kind === 'reset')
  const current = game.players[game.currentPlayer]
  const best = standings(game)
  const finishOverlay = finishOverlayVisibility({ phase: game.phase, setupOpen: showSetup, rulesOpen: showRules || showStrategy, resultsOpen: showResults })
  const status = selection
    ? `Wybrano ${COLORS_PL[selection.color].toLowerCase()}. Wskaż podświetloną kwaterę.`
    : game.phase === 'finished' ? `Koniec gry — wygrywa ${best[0].name}.`
    : humanTurn ? `${current.name === 'Ty' ? 'Twój ruch' : `Ruch gracza ${current.name}`}: wybierz tafle z warsztatu lub środka stołu.`
    : `${current.name} wybiera ruch…`

  useSharedGlassGeometry(
    screen === 'game',
    `${game.players.length}-${viewerIndex}-${mobileBoardIndex}-${game.currentPlayer}-${viewport.width}x${viewport.height}`,
  )

  useLayoutEffect(() => {
    if (screen !== 'game' || game.phase !== 'playing' || announcedRound.current === game.round) return
    const color = game.roundColors[game.round - 1]
    if (!color) return
    announcedRound.current = game.round
    setRoundReady(null)
    setTurnNotice(null)
    setRoundAnnouncement({ round: game.round, color })
    const releasingRound = game.round
    const unlock = window.setTimeout(() => setRoundReady(releasingRound), roundTiming.unlockMs)
    return () => window.clearTimeout(unlock)
  }, [screen, game.round, game.roundColors, game.phase])
  useEffect(() => {
    if (!roundAnnouncement) return
    // Hide at the real presentation duration; AI remains gated for 350ms more.
    const hide = window.setTimeout(() => setRoundAnnouncement(null), roundTiming.visibleMs)
    return () => window.clearTimeout(hide)
  }, [roundAnnouncement, roundTiming.visibleMs])
  useEffect(() => {
    if (!showTurnPopup) { setTurnNotice(null); return }
    const key = `${game.round}:${game.turn}:${game.currentPlayer}`
    if (noticedHumanTurn.current === key) return
    noticedHumanTurn.current = key
    setTurnNotice({key, name:game.players[game.currentPlayer].name})
  }, [showTurnPopup, game.round, game.turn, game.currentPlayer, game.players])
  useEffect(() => {
    if (!turnNotice) return
    const timer = window.setTimeout(() => setTurnNotice(null), 2000)
    return () => window.clearTimeout(timer)
  }, [turnNotice])

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
    if (screen !== 'game' || game.phase !== 'playing' || !roundIsReady || game.players[game.currentPlayer].controller !== 'ai' || finishing || showSetup || showRules || showStrategy) return
    const difficulty = game.players[game.currentPlayer].difficulty ?? 'normal'
    const base = difficulty === 'easy' ? 1100 : difficulty === 'normal' ? 1500 : difficulty === 'expert' ? 2200 : difficulty === 'master' ? 2250 : 1900
    const delay = base + Math.round(Math.random() * 450)
    let cancelled = false
    let worker: Worker | undefined
    const finish = (move: Move | null) => {
      if (cancelled) return
      worker?.terminate()
      if (move) {
        const next = applyMove(game, move)
        emitEffects(game, next, move)
        setGame(next)
        play(moveAudioCue(game, next))
      }
    }
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('./game/ai.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (event: MessageEvent<Move | null>) => finish(event.data)
        worker.onerror = () => {
          worker?.terminate()
          if (!cancelled) finish(chooseAIMove(game, difficulty))
        }
        worker.postMessage({ state: game, difficulty })
      } catch {
        finish(chooseAIMove(game, difficulty))
      }
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      worker?.terminate()
    }
  }, [game, screen, finishing, roundIsReady, showSetup, showRules, showStrategy, play, emitEffects])
  useEffect(() => { if (!humanTurn) { setSelection(null); setFinishing(null); setPlacementOptions(null) } }, [humanTurn])

  function commit(move: Move) {
    if (!humanCanPlay) return
    const next = applyMove(game, move)
    emitEffects(game, next, move)
    setGame(next)
    play(moveAudioCue(game, next))
    setSelection(null)
    setFinishing(null)
    setPlacementOptions(null)
  }
  function chooseSource(source: Source, color: GlassColor) {
    if (!humanCanPlay || finishing) return
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
    announcedRound.current = null
    noticedHumanTurn.current = null
    setRoundReady(null)
    setTurnNotice(null)
    setRoundAnnouncement(null)
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
    const activeHuman = humanCanPlay && index === game.currentPlayer
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

  return <div className={`sg${screen === "home" ? " sg-in-home" : ""}${roundTiming.cinematic ? " sg-effects-cinematic" : " sg-effects-minimal"}`}>
    <header className="sg-header sg-toolbar-modern">
      <div className="sg-brand"><span className="sg-brand-symbol"><Gem size={20}/></span><span>SINTRA <b>GLASS</b></span></div>
      <RoundTracker round={game.round} colors={game.roundColors}/>
      <div className="sg-header-actions">
        <GlassResources game={game}/>
        <GameMenu effectsEnabled={effectsEnabled} reducedMotion={reducedMotion} toggleEffects={toggleEffects}
          musicEnabled={musicEnabled} musicUnavailable={musicUnavailable} toggleMusic={toggleMusic}
          soundEnabled={soundEnabled} toggleSound={toggleSound}
          openStrategy={() => setShowStrategy(true)} openRules={() => setShowRules(true)}/>
        <button type="button" className="sg-home-return" onClick={() => { clearEffects(); announcedRound.current = null; setRoundAnnouncement(null); setRoundReady(null); setTurnNotice(null); setScreen('home'); setSelection(null); setFinishing(null); setPlacementOptions(null); setMobilePanel(null) }} aria-label="Menu główne" title="Menu główne"><House size={16}/><span>Główne</span></button>
        <button type="button" className="sg-new" aria-label="Nowa gra" title="Nowa gra" onClick={() => setShowSetup(true)}>
          <CirclePlus size={16}/><span>Nowa gra</span>
        </button>
      </div>
    </header>
    <main className="sg-stage sg-responsive-stage" aria-label="Wspólny stół Sintra Glass">
      <div className="sg-felt" data-sg-player-count={game.players.length} style={{ zoom: desktopTable.scale, width: desktopTable.width, minWidth: desktopTable.width, height: desktopTable.height, '--sg-long': `${desktopTable.boardLong}px` } as React.CSSProperties}>
        {tableSeats.filter(seatInfo => seatInfo.place !== 'south').map(seatInfo => seat(seatInfo.playerIndex, seatInfo.place))}
        <div className="sg-center">
          <div className="sg-side-left sg-score-mode-simple">
            <CompactScores game={game}/>
          </div>
          <Market game={game} selection={selection} disabled={!humanCanPlay || !!finishing} onPick={chooseSource}/>
          <LiveHistory state={game} status={status} onCancel={selection ? () => setSelection(null) : undefined}
            onDiscard={selection && selectionMoves.some(m => m.kind === 'take' && m.windowIndex === null) ? () => chooseTarget(null) : undefined}/>

        </div>
        {tableSeats.filter(seatInfo => seatInfo.place === 'south').map(seatInfo => seat(seatInfo.playerIndex, seatInfo.place))}
      </div>
    </main>
    <div className="sg-mobile-layout" aria-label="Mobilny stół Sintra Glass">
      <nav className="sg-mobile-players" aria-label="Wybierz planszę gracza">
        {game.players.map((p,i) => <button type="button" key={p.id}
          className={`sg-mobile-player sg-palace-${p.palaceColor ?? 'red'}${mobileBoardIndex === i ? ' sg-mobile-player-selected' : ''}${humanCanPlay && game.currentPlayer === i ? ' sg-mobile-player-current-human' : ''}`}
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
            isHumanTurn={humanCanPlay && game.currentPlayer === mobileBoardIndex}
            selected={!!selection && humanCanPlay && game.currentPlayer === mobileBoardIndex}
            targets={humanCanPlay && game.currentPlayer === mobileBoardIndex ? targets : undefined}
            onTarget={humanTurn && game.currentPlayer === mobileBoardIndex ? chooseTarget : undefined}
            canReset={canReset && !finishing && game.currentPlayer === mobileBoardIndex}
            onReset={() => commit({kind:'reset'})}
            isStartingPlayer={game.startingPlayer === mobileBoardIndex}
            palaceSide={game.palaceSide}
            hasFirstToken={game.firstCenterTaken && game.nextStartingPlayer === mobileBoardIndex}/>}
        </div>
        <div className="sg-mobile-market">
          <Market game={game} selection={selection} disabled={!humanCanPlay || !!finishing} onPick={chooseSource}/>
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
            ? <div className="sg-mobile-stats sg-score-mode-simple">
                <CompactScores game={game} showBoard={false}/>
              </div>
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
    {screen === 'game' && roundAnnouncement && <RoundAnnouncement key={roundAnnouncement.round} round={roundAnnouncement.round} color={roundAnnouncement.color} minimal={!roundTiming.cinematic}/>}
    {screen === 'game' && showTurnPopup && turnNotice && <div className="sg-human-turn-notice" role="status" aria-live="polite" key={turnNotice.key}>
      <span className="sg-human-turn-notice-icon" aria-hidden="true">✦</span>
      <span><strong>TWOJA TURA</strong><small>{turnNotice.name === 'Ty' ? 'Wybierz szkło z warsztatu lub środka' : `${turnNotice.name} — wybierz szkło`}</small></span>
    </div>}
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
