import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, ChevronDown, Crown, Gem,
  Info, Layers3, MoonStar, RotateCcw, Settings2, Shield, Sparkles, Trophy, Users, WandSparkles,
  X,
} from 'lucide-react'
import {
  applyMove, availableSources, BROKEN_TRACK, COLORS, legalMoves,
  newGame, standings, WINDOW_POINTS,
} from './game/engine'
import type { Difficulty, GameState, GlassColor, Move, PalaceSide, Player, Source, WindowStrip } from './game/engine'
import { chooseAIMove } from './game/ai'

const STORAGE_KEY = 'sintra-glass-save-v1'
const COLORS_PL: Record<GlassColor, string> = {
  rose: 'Róż', citrine: 'Złoto', cyan: 'Turkus', amber: 'Bursztyn', slate: 'Srebro',
}
const PLAYER_AVATARS = ['✧', '✦', '❖', '✳']
const DEFAULT_OPTIONS = { opponents: 2, difficulty: 'normal' as Difficulty, palaceSide: 'A' as PalaceSide }

type Settings = typeof DEFAULT_OPTIONS
interface Selection { source: Source; color: GlassColor }
function sourceEquals(a: Source, b: Source): boolean {
  return a.type === b.type && (a.type === 'center' || (b.type === 'factory' && a.index === b.index))
}
function restore(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const game = JSON.parse(raw) as GameState
    if (game.players?.length >= 2 && game.factories && game.roundColors?.length === 6 && game.round >= 1 && game.round <= 6) return game
  } catch { /* Ignore expired/corrupt browser storage. */ }
  return null
}
function Glass({ color, small = false, ghost = false, onClick, selected = false, label }: {
  color: GlassColor | 'wild'; small?: boolean; ghost?: boolean; selected?: boolean
  onClick?: () => void; label?: string
}) {
  const className = `glass glass-${color}${small ? ' glass-sm' : ''}${ghost ? ' glass-ghost' : ''}${selected ? ' glass-selected' : ''}`
  const content = <><span className="glass-facet" /><span className="glass-spark">✦</span></>
  return onClick ? <button className={className} onClick={onClick} title={label || (color === 'wild' ? 'Joker' : COLORS_PL[color])} aria-label={label || (color === 'wild' ? 'Joker' : COLORS_PL[color])}>{content}</button>
    : <span className={className} title={label || (color === 'wild' ? 'Dowolny kolor' : COLORS_PL[color])}>{content}</span>
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
function WindowCard({ strip, index, glazier, highlighted, active, onClick, isHumanTurn }: {
  strip: WindowStrip; index: number; glazier: number; highlighted: boolean; active: boolean; onClick: () => void; isHumanTurn: boolean
}) {
  const complete = strip.side === 2
  const pattern = patternFor(strip)
  const canClick = isHumanTurn && highlighted
  return <button className={`window-strip${complete ? ' window-complete' : ''}${highlighted ? ' window-highlight' : ''}${canClick ? ' window-clickable' : ''}${glazier === index ? ' window-glazier' : ''}${active ? ' window-active' : ''}`}
    onClick={onClick} disabled={!canClick} aria-label={`Kwatera ${index + 1}${highlighted ? ', można ułożyć tafle' : ''}`}>
    <div className="window-head">
      <span className="window-n">{String(index + 1).padStart(2, '0')}</span>
      {glazier === index && <span className="artisan" title="Witrażysta"><Gem size={14} strokeWidth={2.6} /></span>}
      <span className="window-side">{complete ? '✓' : strip.side === 0 ? 'A' : 'B'}</span>
    </div>
    <div className="pattern-frame">
      {complete ? <div className="pattern-finished"><Sparkles size={20} /><small>UKOŃCZONO</small></div> : pattern.map((slot, slotIndex) =>
        <div key={slotIndex} className={`pattern-cell${strip.panes[slotIndex] ? ' filled' : ''}`}>
          {strip.panes[slotIndex] ? <Glass color={strip.panes[slotIndex]} /> : <Glass color={slot} ghost />}
        </div>)}
    </div>
    <div className="palace-window">
      <div className={`palace-pane${strip.upper ? ' has-glass' : ''}`}>
        {strip.upper ? <Glass color={strip.upper} small /> : <span className="pane-line">✦</span>}
      </div>
      <div className={`palace-pane${strip.lower ? ' has-glass' : ''}`}>
        {strip.lower ? <Glass color={strip.lower} small /> : <span className="pane-line">✦</span>}
      </div>
    </div>
    <span className="window-points"><Sparkles size={12} /> {WINDOW_POINTS[index]}</span>
  </button>
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
      <label className="field-label" htmlFor="ai-count">Liczba przeciwników AI</label>
      <div className="option-row">{[1, 2, 3].map((n) => <button key={n} className={`option-choice${local.opponents === n ? ' chosen' : ''}`} onClick={() => setLocal({ ...local, opponents: n })}>{n}<small>{n === 1 ? 'Pojedynek' : `${n + 1} graczy`}</small></button>)}</div>
      <label className="field-label" htmlFor="difficulty">Poziom trudności</label>
      <select id="difficulty" value={local.difficulty} onChange={(e) => setLocal({ ...local, difficulty: e.target.value as Difficulty })}>
        <option value="easy">Łatwy — bot losowy</option><option value="normal">Normalny — bot zachłanny</option><option value="hard">Trudny — bot strategiczny</option>
      </select>
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
  const [game, setGame] = useState<GameState>(() => restore() ?? newGame(DEFAULT_OPTIONS))
  const [settings, setSettings] = useState<Settings>(DEFAULT_OPTIONS)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [inspect, setInspect] = useState(0)
  const [finishing, setFinishing] = useState<Move[] | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showRules, setShowRules] = useState(false)
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
      const move = chooseAIMove(game, settings.difficulty)
      if (move) setGame((previous) => applyMove(previous, move))
    }, 600)
    return () => window.clearTimeout(timeout)
  }, [game, settings.difficulty, finishing])
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
    setGame(newGame(options))
    setSelection(null)
    setFinishing(null)
    setInspect(0)
    setShowSetup(false)
  }

  return <div className="app-shell">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <header className="site-header"><div className="container nav-inner">
      <a className="brand" href="#top" aria-label="Sintra Glass"><span className="brand-mark"><Gem size={23}/></span><span className="brand-name">SINTRA<span>GLASS</span></span><span className="brand-label">DIGITAL EDITION</span></a>
      <div className="nav-right"><span className="online-indicator"><span/> TRYB OFFLINE</span><button className="nav-link" onClick={() => setShowRules(true)}><BookOpen size={17}/> Jak grać</button><button className="btn btn-outline nav-new" onClick={() => setShowSetup(true)}><RotateCcw size={16}/> Nowa gra</button></div>
    </div></header>
    <main className="container" id="top">
      <section className="hero"><div className="hero-text"><div className="eyebrow"><span className="eyebrow-line"/> STRATEGIA · WITRAŻE · SINTRA</div><h1>Światło w każdym <em>ruchu.</em></h1><p>Wybieraj kolorowe tafle, buduj zachwycające okna i przechytrz przeciwników. Twoja pracownia witrażu czeka.</p></div><div className="hero-ornament"><div className="ornament-circle"><Gem size={55} strokeWidth={1.1}/><span className="orbit orbit-one">✦</span><span className="orbit orbit-two">✧</span></div></div></section>
      <section className="round-bar"><div className="round-info"><span className="section-icon"><Layers3 size={22}/></span><div><span className="muted-label">ETAP ROZGRYWKI</span><h2>{game.phase === 'finished' ? 'Partia zakończona' : `Runda ${game.round} z 6`}</h2></div></div><div className="round-steps">{game.roundColors.map((color, i) => <div className={`round-step${i + 1 === game.round ? ' is-now' : ''}${i + 1 < game.round ? ' is-done' : ''}`} key={i}><span className="round-index">{i + 1 < game.round ? <Check size={12}/> : `0${i + 1}`}</span><Glass color={color} small/><span className="round-text">{i + 1 === game.round ? 'TERAZ' : `R${i + 1}`}</span></div>)}</div><div className="round-bonus"><span className="muted-label">PREMIA ZA KOLOR</span><div><Glass color={game.roundColors[game.round - 1]} small/><span>{COLORS_PL[game.roundColors[game.round - 1]]}</span></div></div></section>
      <div className="game-grid"><section className="panel market-panel"><div className="panel-top"><div><span className="overline">01 / ZBIERANIE TAFLI</span><h2>Warsztaty szkła <span className="panel-title-spark">✦</span></h2><p>Kliknij wybrany kolor, aby zebrać tafle.</p></div><span className="panel-pill"><span className="live-dot"/>{sourceOptions.length ? `${sourceOptions.length} opcji` : 'Puste'}</span></div>
        <div className="market-playground"><div className="market-circles"><div className="market-inner-ring"/><div className="market-outer-ring"/></div><CenterPile tiles={game.center} selected={selection} onPick={chooseSource} disabled={!humanTurn || inspect !== 0} first={game.firstCenterTaken}/>{game.factories.map((factory, index) => <Factory key={index} tiles={factory} index={index} count={game.factories.length} selected={selection} onPick={chooseSource} disabled={!humanTurn || inspect !== 0}/>)}</div>
        <div className="market-footer"><div className="market-help"><Info size={17}/>{selection ? `Wybrano ${COLORS_PL[selection.color].toLowerCase()}. Kliknij podświetloną kwaterę.` : humanTurn ? 'Wybierz kolor z warsztatu lub środka stołu.' : 'Przeciwnik analizuje swój ruch...'}</div>{selection && <button className="clear-pick" onClick={() => setSelection(null)}>Anuluj <X size={14}/></button>}{selection && selectionMoves.some((move) => move.kind === 'take' && move.windowIndex === null) && <button className="btn btn-warn" onClick={() => chooseTarget(null)}>Stłucz wszystkie tafle</button>}</div></section>
        <aside className="side-column"><section className="panel players-panel"><div className="side-top"><span className="overline">02 / RYWALIZACJA</span><Trophy size={19}/></div><h2>Tabela wyników</h2><div className="players-list">{best.map((player, rank) => {const originalIndex = game.players.findIndex((p) => p.id === player.id);return <button key={player.id} className={`player-row${game.currentPlayer === originalIndex && game.phase === 'playing' ? ' current-player' : ''}${inspect === originalIndex ? ' inspecting' : ''}`} onClick={() => {setInspect(originalIndex);setSelection(null)}}><span className="rank">0{rank + 1}</span><span className={`player-avatar avatar-${originalIndex}`}>{PLAYER_AVATARS[originalIndex]}</span><span className="player-meta"><strong>{player.name}</strong><small>{player.controller === 'ai' ? <><Bot size={11}/> AI</> : <><Users size={11}/> GRACZ</>}{game.currentPlayer === originalIndex && game.phase === 'playing' ? ' · TWÓJ RUCH'.replace('TWÓJ', player.controller === 'ai' ? 'JEGO' : 'TWÓJ') : ''}</small></span><span className="player-score">{player.score}<small>PKT</small></span></button>})}</div><div className="players-bottom"><Shield size={16}/><span>O karach decyduje tor stłuczonego szkła</span></div></section>
        <section className="panel turn-panel"><div className="turn-pattern">✧</div><span className="overline">AKTUALNA TURA</span><h2>{game.phase === 'finished' ? 'Koniec rozgrywki!' : current.controller === 'human' ? 'Twój ruch!' : `Ruch gracza ${current.name}`}</h2><p>{game.phase === 'finished' ? `Zwycięzca: ${best[0].name} (${best[0].score} pkt).` : current.controller === 'human' ? 'Wybierz tafle z warsztatu i wskaż kwaterę albo cofnij witrażystę.' : 'Sztuczna inteligencja wybiera najkorzystniejszy wariant.'}</p><div className="turn-actions"><button className="btn btn-reset" disabled={!canReset || !!finishing} onClick={() => commitMove({ kind: 'reset' })}><ArrowLeft size={17}/> Cofnij witrażystę</button></div><div className="turn-bottom">{game.phase === 'finished' ? <><Crown size={15}/> Ranking końcowy</> : <><span className="thinking-dot"/> {current.controller === 'ai' ? 'AI MYŚLI...' : 'OCZEKIWANIE NA RUCH'}</>}</div></section></aside></div>
      <section className="panel board-panel"><div className="board-header"><div><span className="overline">03 / TWOJA PRACOWNIA</span><h2>Pałacowe witraże <span className="panel-title-spark">✧</span></h2><p>Ułóż tafle na pionowych kwaterach, aby ukończyć okna.</p></div><div className="board-controls"><div className="board-player"><span className={`player-avatar avatar-${inspect}`}>{PLAYER_AVATARS[inspect]}</span><span><strong>{selectedPlayer.name}</strong><small>{inspect === 0 ? 'TWOJA PLANSZA' : 'PODGLĄD GRACZA'}</small></span><ChevronDown size={14}/><select value={inspect} onChange={(e) => {setInspect(Number(e.target.value));setSelection(null)}} aria-label="Wybierz planszę do oglądania">{game.players.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}</select></div><div className="broken-indicator"><span>STŁUCZONE</span><strong>{selectedPlayer.brokenSteps}<small> / 8</small></strong><span className="glass-loss">−{BROKEN_TRACK[selectedPlayer.brokenSteps]} pkt</span></div></div></div>
        <div className="board-scroll"><div className="board-area"><div className="glazier-route"><div className="route-caption"><WandSparkles size={15}/> RUCH WITRAŻYSTY <ArrowRight size={15}/></div></div><div className="window-row">{selectedPlayer.strips.map((strip, index) => <WindowCard key={index} strip={strip} index={index} glazier={selectedPlayer.glazier} highlighted={inspect === 0 && targetIndices.has(index)} active={selection !== null} isHumanTurn={humanTurn} onClick={() => inspect === 0 && chooseTarget(index)}/>)}</div><div className="ornament-row">{[0,1,2,3].map((i) => <span key={i} className="ornament-position"><span className="ornament-symbol">❖</span><span>ORNAMENT {i+1}</span></span>)}</div></div></div><div className="board-footer"><span><Gem size={15}/> Kwatera = 5 tafli</span><span><Sparkles size={15}/> Premia za ukończone okna po prawej</span><span><MoonStar size={15}/> Strona pałacu {game.palaceSide}</span></div></section>
      <section className="lower-grid"><div className="panel how-panel"><div className="small-icon"><Sparkles size={18}/></div><div><h3>Mały ruch. Wielkie dzieło.</h3><p>Witrażysta przesuwa się w prawo. Możesz go cofnąć kosztem jednej tury. Planuj kilka ruchów naprzód.</p><button onClick={() => setShowRules(true)}>Poznaj zasady <ArrowRight size={15}/></button></div></div><div className="panel history-panel"><div className="history-head"><h3>Ostatnie wydarzenia</h3><span>HISTORIA PARTII</span></div><div className="history-list">{game.log.slice(0, 3).map((event, i) => <div key={`${i}-${event}`}><span className="history-dot"/>{event}</div>)}</div></div></section>
      <footer className="site-footer"><span><Gem size={16}/> SINTRA GLASS <small>© 2026 · FAN PROJECT</small></span><span>Nieoficjalna cyfrowa adaptacja mechaniki „Azul: Witraże Sintry”. Bez oryginalnych grafik i znaków wydawcy.</span></footer>
    </main>
    {game.phase === 'finished' && <div className="result-float"><Crown size={18}/><span>Partia zakończona — wygrywa <strong>{best[0].name}</strong>!</span><button onClick={() => setShowSetup(true)}>Zagraj ponownie <ArrowRight size={15}/></button></div>}
    {showSetup && <SetupModal settings={settings} onClose={() => setShowSetup(false)} onStart={startNew}/>}
    {showRules && <RulesModal onClose={() => setShowRules(false)}/>}
    {finishing && <div className="modal-backdrop" onMouseDown={() => setFinishing(null)}><div className="modal keep-modal" role="dialog" aria-modal="true" aria-label="Wybierz taflę do zachowania" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setFinishing(null)} aria-label="Zamknij"><X size={18}/></button><div className="modal-icon"><Gem size={24}/></div><span className="overline">KWATERA UKOŃCZONA</span><h2>Wybierz taflę do okna</h2><p>Jedna tafla zostanie w pałacowym witrażu, pozostałe trafią do wieży.</p><div className="keep-options">{finishing.filter((move) => move.kind === 'take' && move.keepColor).map((move) => move.kind === 'take' && move.keepColor ? <button key={move.keepColor} onClick={() => commitMove(move)}><Glass color={move.keepColor}/><span>{COLORS_PL[move.keepColor]}</span></button> : null)}</div></div></div>}
  </div>
}
