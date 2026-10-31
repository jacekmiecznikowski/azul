import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Bot, Check, Gem, Info, RotateCcw, Settings2, Trophy, Volume2, VolumeX, Music2, X, ListChecks, BrainCircuit } from 'lucide-react'
import { applyMove, availableSources, BROKEN_TRACK, COLORS, glassInventory, legalMoves, newGame, patternFor, standings } from './game/engine'
import type { Difficulty, GameState, GlassColor, Move, PalaceSide, Source } from './game/engine'
import { chooseAIMove } from './game/ai'
import { LiveHistory } from './components/LiveHistory'
import { FinalResults } from './components/FinalResults'
import { StrategyLab } from './components/StrategyLab'
import { finishOverlayVisibility } from './ui/finishOverlayVisibility'
import { useGameAudio } from './hooks/useGameAudio'
import { useAmbientMusic } from './hooks/useAmbientMusic'
import { GameBoard, GlassPiece } from './components/GameBoard'
import './match.css'
import './redesign.css'
import './center-v9.css'
import './center-v10.css'
import './inventory-v12.css'
import './ux-v13.css'
import './polish-v14.css'
import './strategy-lab.css'

const STORAGE_KEY = 'sintra-glass-save-v1'
const COLORS_PL: Record<GlassColor, string> = { rose: 'Czerwone', citrine: 'Żółte', cyan: 'Niebieskie', amber: 'Pomarańczowe', slate: 'Białe' }
const PLAYER_AVATARS = ['✦', '✧', '✳', '❖']
interface Settings { opponents: number; difficulties: Difficulty[]; palaceSide: PalaceSide }
const DEFAULT_OPTIONS: Settings = { opponents: 3, difficulties: ['normal', 'normal', 'normal'], palaceSide: 'A' }
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
    <div className="sg-turn-player"><span className={`sg-player-icon sg-player-icon-${game.currentPlayer}`}>{PLAYER_AVATARS[game.currentPlayer]}</span>
      <div><strong>{game.phase === 'finished' ? 'Koniec rozgrywki' : current.controller === 'human' ? 'Twój ruch' : `Gra ${current.name}`}</strong>
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
          <option value="easy">Łatwy · losowy</option><option value="normal">Normalny · zachłanny</option><option value="hard">Trudny · strategiczny</option><option value="expert">Ekspert · przewiduje przeciwników</option><option value="master">Trenowany · eksperymentalna strategia</option>
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
    difficulties: game.players.slice(1).map(p => p.difficulty ?? 'normal'),
    palaceSide: game.palaceSide,
  }))
  const [selection, setSelection] = useState<Selection | null>(null)
  const [finishing, setFinishing] = useState<Move[] | null>(null)
  const [placementOptions, setPlacementOptions] = useState<Move[] | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const { enabled: soundEnabled, toggle: toggleSound, play } = useGameAudio()
  const { enabled: musicEnabled, toggle: toggleMusic, unavailable: musicUnavailable } = useAmbientMusic()
  const humanTurn = game.phase === 'playing' && game.players[game.currentPlayer].controller === 'human'
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
    : humanTurn ? 'Twój ruch: wybierz tafle z warsztatu lub środka stołu.'
    : `${current.name} wybiera ruch…`

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)) }, [game])
  useEffect(() => { if (game.phase === 'finished') setShowResults(true) }, [game.phase])
  useEffect(() => {
    if (game.phase !== 'playing' || game.players[game.currentPlayer].controller !== 'ai' || finishing) return
    const difficulty = game.players[game.currentPlayer].difficulty ?? 'normal'
    const base = difficulty === 'easy' ? 1100 : difficulty === 'normal' ? 1500 : difficulty === 'expert' ? 2200 : difficulty === 'master' ? 2250 : 1900
    const delay = base + Math.round(Math.random() * 450)
    const timer = window.setTimeout(() => {
      const move = chooseAIMove(game, difficulty)
      if (move) {
        const next = applyMove(game, move)
        setGame(next)
        play(next.round !== game.round ? 'round' : next.players[game.currentPlayer].score > game.players[game.currentPlayer].score ? 'score' : 'place')
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [game, finishing, play])
  useEffect(() => { if (!humanTurn) { setSelection(null); setFinishing(null); setPlacementOptions(null) } }, [humanTurn])

  function commit(move: Move) {
    const next = applyMove(game, move)
    setGame(next)
    play(next.round !== game.round ? 'round' : next.players[game.currentPlayer].score > game.players[game.currentPlayer].score ? 'score' : 'place')
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
  function choosePlacement(selectedMove: Move) {
    if (selectedMove.kind !== 'take') return
    const options = (placementOptions ?? []).filter(m => m.kind === 'take' &&
      m.slots?.join(',') === selectedMove.slots?.join(','))
    setPlacementOptions(null)
    chooseFinalGlass(options)
  }
  function startNew(options: Settings) {
    setSettings(options)
    setGame(newGame({ ...options, botDifficulties: options.difficulties }))
    play('round')
    setSelection(null); setFinishing(null); setPlacementOptions(null); setShowSetup(false); setShowResults(false)
  }
  function seat(index: number, place: 'north' | 'west' | 'east' | 'south') {
    const player = game.players[index]
    if (!player) return null
    return <div className={`sg-seat sg-seat-${place}`} key={player.id}>
      <div className="sg-seat-rotation"><GameBoard player={player} index={index} isCurrent={game.currentPlayer === index && game.phase === 'playing'}
        isHuman={index === 0} isHumanTurn={humanTurn} selected={!!selection}
        targets={index === 0 ? targets : undefined} onTarget={index === 0 ? i => chooseTarget(i) : undefined}
        canReset={canReset && !finishing} onReset={() => commit({ kind: 'reset' })}
        isStartingPlayer={game.startingPlayer === index}
        hasFirstToken={game.firstCenterTaken && game.nextStartingPlayer === index}/></div>
    </div>
  }

  return <div className="sg">
    <header className="sg-header">
      <div className="sg-brand"><span className="sg-brand-symbol"><Gem size={20}/></span><span>SINTRA <b>GLASS</b></span><small>WITRAŻE SINTRY · EDYCJA CYFROWA</small></div>
      <div className="sg-header-round"><span>RUNDA</span><strong>{game.round} <small>/ 6</small></strong><div className="sg-round-colors">{game.roundColors.map((c, i) =>
        <i key={i} title={`Runda ${i + 1}: ${COLORS_PL[c]}`} className={`sg-color-dot sg-color-dot-${c}${i + 1 === game.round ? ' sg-color-now' : i + 1 < game.round ? ' sg-color-past' : ''}`}/>)}</div></div>
      <div className="sg-header-actions"><button type="button" className="sg-music-toggle" onClick={toggleMusic} aria-pressed={musicEnabled && !musicUnavailable} title={musicUnavailable ? "Brak pliku public/background.mp3 — skopiuj plik do katalogu public i odśwież stronę" : musicEnabled ? "Wycisz muzykę w tle" : "Włącz muzykę w tle"} aria-label={musicUnavailable ? "Brak pliku muzyki" : musicEnabled ? "Wycisz muzykę" : "Włącz muzykę"}>{musicUnavailable || !musicEnabled ? <VolumeX size={16}/> : <Music2 size={16}/>}<span>{musicUnavailable ? "Brak MP3" : musicEnabled ? "Muzyka" : "Muzyka wył."}</span></button><button type="button" onClick={toggleSound} title={soundEnabled ? 'Wyłącz dźwięki' : 'Włącz dźwięki'} aria-label={soundEnabled ? 'Wyłącz dźwięki' : 'Włącz dźwięki'} aria-pressed={soundEnabled} className="sg-audio-toggle">{soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{soundEnabled ? 'Dźwięk' : 'Cisza'}</span></button><button type="button" onClick={() => setShowStrategy(true)}><BrainCircuit size={16}/> Strategia</button><button onClick={() => setShowRules(true)}><BookOpen size={16}/> Zasady</button>
        <button className="sg-new" onClick={() => setShowSetup(true)}><RotateCcw size={16}/> Nowa gra</button></div>
    </header>
    <main className="sg-stage" aria-label="Wspólny stół Sintra Glass">
      <div className="sg-felt">
        {seat(1, 'north')}
        {seat(3, 'west')}
        {seat(2, 'east')}
        <div className="sg-center">
          <div className="sg-side-left"><TurnSummary game={game}/><PenaltyTrack game={game}/></div>
          <Market game={game} selection={selection} disabled={!humanTurn || !!finishing} onPick={chooseSource}/>
          <LiveHistory state={game} status={status} onCancel={selection ? () => setSelection(null) : undefined}
            onDiscard={selection && selectionMoves.some(m => m.kind === 'take' && m.windowIndex === null) ? () => chooseTarget(null) : undefined}/>

        </div>
        {seat(0, 'south')}
      </div>
    </main>
    {finishOverlay.banner && <div className="sg-finish"><Trophy size={17}/> Koniec partii <button onClick={() => setShowResults(true)}><ListChecks size={14}/> Zobacz podliczenie</button><button onClick={() => setShowSetup(true)}>Nowa partia <ArrowRight size={14}/></button></div>}
    {finishOverlay.results && <FinalResults state={game} onClose={() => setShowResults(false)}/>}
    {showSetup && <SetupModal settings={settings} onClose={() => setShowSetup(false)} onStart={startNew}/>}
    {showRules && <RulesModal onClose={() => setShowRules(false)}/>}
    {showStrategy && <StrategyLab state={game} onClose={() => setShowStrategy(false)}/>}
    {placementOptions && selection && <div className="modal-backdrop sg-placement-overlay" onMouseDown={() => setPlacementOptions(null)}>
      <div className="modal sg-placement-dialog" role="dialog" aria-modal="true" aria-label="Wybierz pola kwatery" onMouseDown={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setPlacementOptions(null)} aria-label="Zamknij"><X size={18}/></button>
        <h2>Wybierz pola na tafle</h2>
        <p>Joker przyjmuje każdy kolor. Wybierz, czy zająć joker, czy zachować go na później.</p>
        <div className="sg-placement-list">{[...new Map(placementOptions.filter((m): m is Extract<Move,{kind:'take'}> => m.kind === 'take')
          .map(m => [m.slots?.join(',') ?? '', m] as const)).values()].map((m, i) => {
            const strip = game.players[game.currentPlayer].strips[m.windowIndex!]
            const pattern = patternFor(strip)
            return <button type="button" key={m.slots?.join(',') ?? i} onClick={() => choosePlacement(m)}>
              <span className="sg-placement-number">Wariant {i + 1}</span>
              <span className="sg-placement-slots">{pattern.map((slot, j) => <span key={j} className={`sg-placement-slot${m.slots?.includes(j) ? ' sg-placement-active' : ''}`}>
                <GlassPiece color={m.slots?.includes(j) ? m.color : strip.panes[j] ?? slot} placed={!!strip.panes[j] || !!m.slots?.includes(j)} small/>
                <small>{slot === 'wild' ? '★' : String(j + 1)}</small>
              </span>)}</span>
              <small>{m.slots?.some(j => pattern[j] === 'wild') ? 'Z użyciem jokera' : 'Bez zajmowania jokera'}</small>
            </button>
          })}</div>
      </div>
    </div>}
    {finishing && <div className="modal-backdrop" onMouseDown={() => setFinishing(null)}><div className="modal keep-modal" role="dialog" aria-modal="true" aria-label="Wybierz taflę do zachowania" onMouseDown={e => e.stopPropagation()}><button className="close-btn" onClick={() => setFinishing(null)} aria-label="Zamknij"><X size={18}/></button><div className="modal-icon"><Gem size={24}/></div><h2>Wybierz taflę do okna</h2><p>Jedna tafla zostanie w pałacowym witrażu.</p><div className="keep-options">{finishing.filter(m => m.kind === 'take' && m.keepColor).map(m => m.kind === 'take' && m.keepColor ? <button key={m.keepColor} onClick={() => commit(m)}><GlassPiece color={m.keepColor}/><span>{COLORS_PL[m.keepColor]}</span></button> : null)}</div></div></div>}
  </div>
}
