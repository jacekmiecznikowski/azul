import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, ArrowLeft, Bot, Check, ChevronDown, ChevronUp, Clock3, Gem, History, ShieldAlert, Users } from 'lucide-react'
import { BROKEN_TRACK, patternFor, WINDOW_POINTS } from '../game/engine'
import { WindowCard } from './WindowBoard'
import type { GameEvent, GameState, GlassColor, Player, SlotColor, WindowStrip } from '../game/engine'

const COLOR_NAMES: Record<GlassColor, string> = { rose: 'różowe', citrine: 'żółte', cyan: 'turkusowe', amber: 'pomarańczowe', slate: 'szare' }
const DIFFICULTY: Record<string, string> = { easy: 'Łatwy', normal: 'Normalny', hard: 'Trudny' }
const AVATARS = ['✧', '✦', '❖', '✳']

function ColorTile({ color, mini = false }: { color: SlotColor; mini?: boolean }) {
  return <span className={`preview-glass tile-${color}${mini ? ' preview-tiny' : ''}`} title={color === 'wild' ? 'Joker' : COLOR_NAMES[color]} />
}

function StripMini({ strip, index, glazier }: { strip: WindowStrip; index: number; glazier: number }) {
  return <div className={`opponent-strip${strip.side === 2 ? ' cleared' : ''}${glazier === index ? ' is-glazier' : ''}`} title={`Kwatera ${index + 1}, ${WINDOW_POINTS[index]} pkt`}>
    <div className="opponent-strip-top">{glazier === index ? '◆' : String(index + 1)}</div>
    {strip.side === 2 ? <div className="mini-cleared">✓</div> : patternFor(strip).map((color, i) =>
      <ColorTile key={i} color={strip.panes[i] ?? color} />)}
    <div className="opponent-frame">
      <span className={strip.upper ? `tile-${strip.upper}` : 'mini-empty'} />
      <span className={strip.lower ? `tile-${strip.lower}` : 'mini-empty'} />
    </div>
    <div className="opponent-strip-points">{WINDOW_POINTS[index]}</div>
  </div>
}

/** Exactly the same window board and dimensions for human and AI players. */
export function TableSeat({ player, index, location, isCurrent, onInspect, isHuman = false,
  isHumanTurn = false, highlightedTargets, activeSelection = false, onTarget, canReset = false, onReset }: {
  player: Player; index: number; location: 'north' | 'south' | 'east' | 'west'
  isCurrent: boolean; onInspect: () => void; isHuman?: boolean
  isHumanTurn?: boolean; highlightedTargets?: ReadonlySet<number>
  activeSelection?: boolean; onTarget?: (index: number) => void
  canReset?: boolean; onReset?: () => void
}) {
  const completed = player.strips.filter(strip => strip.side === 2).length
  return <section className={`tabletop-seat tabletop-seat-${location}${isCurrent ? ' tabletop-seat-current' : ''}${isHuman ? ' tabletop-seat-human' : ''}`} aria-label={`Witraże gracza ${player.name}, ${player.score} punktów`}>
    <div className="tabletop-seat-header">
      <span className={`player-avatar avatar-${index}`}>{AVATARS[index]}</span>
      <span className="tabletop-seat-name"><strong>{isHuman ? 'Twoje witraże' : player.name}</strong><small>{isCurrent ? 'TERAZ GRA' : isHuman ? 'TWOJA PLANSZA' : `AI · ${DIFFICULTY[player.difficulty ?? 'normal']}`}</small></span>
      <span className="tabletop-seat-meta"><Gem size={12}/>{completed}/8 <ShieldAlert size={12}/>{player.brokenSteps}/8</span>
      <span className="tabletop-seat-score">{player.score}<small> pkt</small></span>
      {isHuman && <button type="button" className="tabletop-seat-reset" disabled={!canReset} onClick={onReset} title="Cofnij witrażystę zamiast pobierać szkło"><ArrowLeft size={13}/> Cofnij witrażystę</button>}
      <button type="button" className="tabletop-seat-zoom" onClick={onInspect} aria-label={`Powiększ witraże gracza ${player.name}`} title="Powiększ planszę"><ArrowUpRight size={16}/></button>
    </div>
    <div className="tabletop-seat-windows window-row" aria-label={`Osiem pełnych kwater gracza ${player.name}`}>
      {player.strips.map((strip, i) => <WindowCard key={i} strip={strip} index={i}
        glazier={player.glazier} highlighted={isHuman && !!highlightedTargets?.has(i)}
        active={isHuman && activeSelection} isHumanTurn={isHuman && isHumanTurn}
        onClick={() => { if (isHuman) onTarget?.(i) }} />)}
    </div>
  </section>
}

export function OpponentBoards({ state, inspect, onInspect }: { state: GameState; inspect: number; onInspect: (index: number) => void }) {
  return <section className="panel rivals-panel" aria-label="Plansze wszystkich uczestników">
    <div className="section-heading">
      <div><span className="overline">04 / PRZEGLĄD STOLIKA</span><h2>Witraże przeciwników</h2><p>Wszystkie plansze są widoczne w czasie rzeczywistym. Wybierz gracza, żeby otworzyć jego duży witraż powyżej.</p></div>
      <div className="section-heading-icon"><Users size={22} /></div>
    </div>
    <div className="rival-grid">{state.players.map((player, index) =>
      <button key={player.id} className={`rival-card${inspect === index ? ' selected' : ''}`} onClick={() => onInspect(index)} aria-label={`Otwórz planszę gracza ${player.name}`}>
        <div className="rival-heading"><span className={`player-avatar avatar-${index}`}>{AVATARS[index]}</span>
          <span className="rival-name"><strong>{player.name}</strong><small>{player.controller === 'human' ? 'TWOJA PLANSZA' : `BOT · ${DIFFICULTY[player.difficulty ?? 'normal']}`}</small></span>
          <span className="rival-score">{player.score} <small>pkt</small></span>
        </div>
        <div className="rival-window-board">{player.strips.map((strip, i) => <StripMini key={i} strip={strip} index={i} glazier={player.glazier} />)}</div>
        <div className="rival-foot"><span><Gem size={13} /> {player.strips.filter(s => s.side === 2).length}/8 okien</span><span>{BROKEN_TRACK[player.brokenSteps] ? `−${BROKEN_TRACK[player.brokenSteps]} do rozliczenia` : 'Bez kar na torze'}</span><span className="rival-open">Powiększ <ArrowUpRight size={13}/></span></div>
      </button>
    )}</div>
  </section>
}

export function BrokenGlassTrack({ players }: { players: Player[] }) {
  return <section className="panel glass-track-panel" aria-label="Tor stłuczonego szkła">
    <div className="section-heading"><div><span className="overline">05 / PUNKTACJA</span><h2>Tor stłuczonego szkła</h2><p>Każde nieułożone szkło i pierwszy pobór ze środka przesuwają znacznik o 1 pole. Kary są odejmowane na koniec gry.</p></div><div className="section-heading-icon"><ShieldAlert size={23}/></div></div>
    <div className="broken-track-scroll"><div className="broken-track-rail" role="list" aria-label="Wartości kar od 0 do minus 18">
      {BROKEN_TRACK.map((penalty, index) => <div role="listitem" key={index} className={`broken-track-step${index === 8 ? ' terminal' : ''}`}>
        <span className="broken-track-position">{index === 0 ? 'START' : String(index)}</span>
        <strong>{penalty === 0 ? '0' : `−${penalty}`}</strong>
        <div className="track-avatars">{players.map((player, i) => player.brokenSteps === index &&
          <span key={player.id} className={`track-pawn avatar-${i}`} title={`${player.name}: ${index} stłuczeń, ${penalty} pkt kary`}>{AVATARS[i]}</span>
        )}</div>
      </div>)}
    </div></div>
    <div className="glass-track-legend">{players.map((player, i) => <span key={player.id}><i className={`track-legend-pawn avatar-${i}`}/>{player.name}: <b>{player.brokenSteps}/8</b> <span>({BROKEN_TRACK[player.brokenSteps] === 0 ? '0' : `−${BROKEN_TRACK[player.brokenSteps]}`} pkt)</span></span>)}</div>
    <p className="broken-track-note"><Activity size={15}/> Po wejściu na pole −18 gracz natychmiast traci 18 punktów, a jego znacznik wraca na START. Wcześniejsze takie kary są już uwzględnione w wyniku.</p>
  </section>
}

const PAGE_SIZE = 9
function EventDetails({ event }: { event: GameEvent }) {
  if (event.kind !== 'take') return <span className="timeline-meta">{event.description}</span>
  return <div className="event-detail-block">
    <div className="event-chips">
      <span className="event-chip"><ColorTile color={event.color!} mini /> {event.picked} × {COLOR_NAMES[event.color!]}</span>
      <span className="event-chip">{event.source?.type === 'factory' ? `Warsztat ${(event.source.index ?? 0) + 1}` : 'Środek stołu'}</span>
      <span className="event-chip good"><Check size={12}/> Ułożono {event.placed}</span>
      {!!event.broken && <span className="event-chip danger"><ShieldAlert size={12}/> Stłuczono {event.broken}</span>}
      {event.windowIndex !== null && event.windowIndex !== undefined && <span className="event-chip">Kwatera {(event.windowIndex ?? 0) + 1}</span>}
      {event.firstPlayer && <span className="event-chip caution">Znacznik startowy: +1 stłuczenie</span>}
    </div>
    {event.framePoints !== undefined && <p className="event-scoring">Ukończono {event.flipped ? 'pierwszą' : 'drugą'} stronę. Za okna: +{event.framePoints} pkt, za kolor rundy: +{event.bonusPoints} pkt.{event.keepColor ? ` Zachowana tafla: ${COLOR_NAMES[event.keepColor]}.` : ''}</p>}
  </div>
}

export function GameTimeline({ state }: { state: GameState }) {
  const [filter, setFilter] = useState<'all' | 'human' | 'ai'>('all')
  const [round, setRound] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const events = state.history ?? []
  const filtered = useMemo(() => events.filter(event => {
    const player = event.playerIndex === null ? null : state.players[event.playerIndex]
    return (round === 'all' || event.round === Number(round)) && (filter === 'all' || player?.controller === filter)
  }), [events, state.players, filter, round])
  const handleFilter = (value: typeof filter) => { setFilter(value); setVisible(PAGE_SIZE) }
  return <section className="panel full-history-panel" aria-label="Szczegółowa historia partii">
    <div className="section-heading history-full-heading"><div><span className="overline">06 / DZIENNIK PARTII</span><h2>Historia rozgrywki</h2><p>Pełny zapis ruchów każdego gracza: skąd pobrał tafle, ile ułożył, co stłukł i ile zdobył punktów.</p></div><div className="section-heading-icon"><History size={23}/></div></div>
    <div className="timeline-toolbar">
      <div className="timeline-filters" role="group" aria-label="Filtruj ruchy graczy">
        {([['all','Wszyscy'],['human','Moje ruchy'],['ai','Boty']] as const).map(([value,label]) =>
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => handleFilter(value)}>{label}</button>)}</div>
      <label className="timeline-round-label">Runda <select aria-label="Filtr rundy" value={round} onChange={e => {setRound(e.target.value);setVisible(PAGE_SIZE)}}>
        <option value="all">Wszystkie</option>{Array.from({length: 6}, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </select></label>
      <span className="timeline-total"><Clock3 size={14}/>{filtered.length} zdarzeń</span>
    </div>
    <ol className="timeline-events">{filtered.slice(0, visible).map(event => {
      const player = event.playerIndex === null ? null : state.players[event.playerIndex]
      const index = event.playerIndex
      return <li key={`${event.kind}-${event.id}-${event.round}`} className={`timeline-event ${event.kind}`}>
        <div className="timeline-symbol">{event.kind === 'take' ? <Gem size={16}/> : event.kind === 'reset' ? <ChevronUp size={16}/> : event.kind === 'round' ? <Activity size={16}/> : event.kind === 'final' ? <Check size={16}/> : <Clock3 size={16}/>}</div>
        <div className="timeline-event-body"><div className="timeline-event-top">
          <span className="timeline-label">{player ? <><i className={`track-legend-pawn avatar-${index}`}/><strong>{player.name}</strong>{player.controller === 'ai' && <Bot size={13}/>}</> : <strong>Przebieg partii</strong>}</span>
          <span className="timeline-round">Runda {event.round} · Ruch {event.id}</span>
          {event.points !== undefined && event.points !== 0 && <strong className={event.points > 0 ? 'timeline-points positive' : 'timeline-points negative'}>{event.points > 0 ? '+' : ''}{event.points} pkt</strong>}
        </div>
        <p>{event.kind === 'take' ? `Pobrano ${event.picked} ${COLOR_NAMES[event.color!]} tafle · ${event.placed} umieszczono w kwaterze` : event.description}</p>
        <EventDetails event={event}/>
        </div>
      </li>
    })}</ol>
    {!events.length && <p className="timeline-empty">Starsza zapisana partia nie zawiera szczegółowej historii. Nowe ruchy będą zapisywane od teraz.</p>}
    {!!events.length && !filtered.length && <p className="timeline-empty">Brak zdarzeń spełniających wybrane filtry.</p>}
    {filtered.length > visible && <button className="timeline-more" onClick={() => setVisible(n => n + PAGE_SIZE)}>Pokaż wcześniejsze ruchy <ChevronDown size={17}/></button>}
  </section>
}
