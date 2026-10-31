import { useEffect, useRef, useState } from 'react'
import { Bot, Check, History, RotateCcw, Sparkles } from 'lucide-react'
import type { GameEvent, GameState, GlassColor } from '../game/engine'

const COLOR_NAMES: Record<GlassColor, string> = {
  rose: 'różowe', citrine: 'żółte', cyan: 'turkusowe', amber: 'pomarańczowe', slate: 'szare',
}
type Filter = 'all' | 'human' | 'ai'

function PointChange({ value, label }: { value: number; label?: string }) {
  if (!value) return null
  return <span className={`sg-history-points ${value < 0 ? 'sg-history-points-negative' : 'sg-history-points-positive'}`}
    title={label ?? 'Zmiana wyniku'}>
    {value > 0 ? '+' : '−'}{Math.abs(value)} pkt
  </span>
}

function EventItem({ event, state }: { event: GameEvent; state: GameState }) {
  const player = event.playerIndex === null ? null : state.players[event.playerIndex]
  const text = event.kind === 'take'
    ? `${event.picked} × ${COLOR_NAMES[event.color!]} · ${event.source?.type === 'center' ? 'środek stołu' : `warsztat ${event.source?.type === 'factory' ? event.source.index + 1 : ''}`}`
    : event.description
  return <li className={`sg-event sg-event-${event.kind}${event.points ? ' sg-event-scored' : ''}`}>
    <span className={`sg-event-avatar${player ? ` sg-event-avatar-${event.playerIndex}` : ' sg-event-system'}`} aria-hidden="true">
      {event.kind === 'take' ? (player?.controller === 'ai' ? <Bot size={13}/> : <Sparkles size={13}/>) : event.kind === 'reset' ? <RotateCcw size={13}/> : <Check size={13}/>}
    </span>
    <div className="sg-event-body">
      <div className="sg-event-by"><strong>{player?.name ?? 'Gra'}</strong><span>Runda {event.round} · ruch {event.id}</span><PointChange value={event.points ?? 0}/></div>
      <p>{text}</p>
      {event.kind === 'take' && <div className="sg-event-details">
        {event.windowIndex !== null && event.windowIndex !== undefined && <span>Kwatera {event.windowIndex + 1}</span>}
        <span>Ułożono {event.placed}</span>
        {!!event.broken && <span className="sg-event-broken">Stłuczono {event.broken}</span>}
        {event.firstPlayer && <span className="sg-event-token">Żeton 1 · +1 stłuczenie</span>}
      </div>}
      {event.kind === 'take' && ((event.framePoints ?? 0) > 0 || (event.bonusPoints ?? 0) > 0 || (event.penaltyPoints ?? 0) < 0) &&
        <div className="sg-history-score-lines">
          {!!event.framePoints && <span>Okna <b className="sg-positive">+{event.framePoints}</b></span>}
          {!!event.bonusPoints && <span>Kolor rundy <b className="sg-positive">+{event.bonusPoints}</b></span>}
          {!!event.penaltyPoints && <span>Przekroczenie toru <b className="sg-negative">{event.penaltyPoints}</b></span>}
        </div>}
      {event.kind === 'final' && player && <div className="sg-history-score-lines">
        <span>Premia pałacu <b className="sg-positive">+{event.bonusPoints ?? 0}</b></span>
        <span>Końcowa kara <b className="sg-negative">{event.penaltyPoints ?? 0}</b></span>
      </div>}
    </div>
  </li>
}

/** Newest events are always first; scrolling never moves the rest of the table. */
export function LiveHistory({ state }: { state: GameState }) {
  const [filter, setFilter] = useState<Filter>('all')
  const listRef = useRef<HTMLOListElement>(null)
  const atTop = useRef(true)
  const events = (state.history ?? []).filter(event => {
    const player = event.playerIndex === null ? null : state.players[event.playerIndex]
    return filter === 'all' || player?.controller === filter
  })
  const latestId = state.history?.[0]?.id
  useEffect(() => { if (atTop.current && listRef.current) listRef.current.scrollTop = 0 }, [latestId, filter])
  return <section className="sg-history sg-center-card" aria-label="Historia rozgrywki">
    <div className="sg-panel-title"><span><History size={15}/> HISTORIA RUCHÓW</span><small>{state.history?.length ?? 0} wpisów</small></div>
    <div className="sg-history-filters" role="group" aria-label="Filtr historii">
      {([['all','Wszystkie'],['human','Moje'],['ai','Boty']] as const).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'sg-history-selected' : ''} onClick={() => {atTop.current = true; setFilter(value)}}>{label}</button>)}
    </div>
    <ol className="sg-history-scroll" ref={listRef} onScroll={e => { atTop.current = e.currentTarget.scrollTop < 24 }}>
      {events.map((event, i) => <EventItem key={`${event.id}-${event.kind}-${i}`} event={event} state={state}/>)}
    </ol>
    {!events.length && <div className="sg-history-empty">Brak ruchów dla wybranego filtra.</div>}
    <div className="sg-history-footer">Najnowsze wpisy u góry · kolory oznaczają zmianę punktów</div>
  </section>
}
