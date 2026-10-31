import { useEffect, useRef, useState } from 'react'
import { Bot, Check, History, RotateCcw, Sparkles } from 'lucide-react'
import type { GameEvent, GameState, GlassColor } from '../game/engine'

const COLOR_NAMES: Record<GlassColor, string> = {
  rose: 'różowe', citrine: 'żółte', cyan: 'turkusowe', amber: 'pomarańczowe', slate: 'szare',
}

type Filter = 'all' | 'human' | 'ai'

function EventItem({ event, state }: { event: GameEvent; state: GameState }) {
  const player = event.playerIndex === null ? null : state.players[event.playerIndex]
  const ai = player?.controller === 'ai'
  const text = event.kind === 'take'
    ? `${event.picked} × ${COLOR_NAMES[event.color!]} — ${event.source?.type === 'center' ? 'środek stołu' : `warsztat ${(event.source?.type === 'factory' ? event.source.index : 0) + 1}`}`
    : event.description
  return <li className={`sg-event sg-event-${event.kind}`}>
    <span className={`sg-event-avatar${player ? ` sg-event-avatar-${event.playerIndex}` : ' sg-event-system'}`} aria-hidden="true">
      {event.kind === 'take' ? (ai ? <Bot size={13}/> : <Sparkles size={13}/>) : event.kind === 'reset' ? <RotateCcw size={13}/> : <Check size={13}/>}
    </span>
    <div className="sg-event-body">
      <div className="sg-event-by"><strong>{player?.name ?? 'Gra'}</strong><span>R{event.round} · {event.id}</span>
        {event.points !== undefined && event.points !== 0 && <b className={event.points < 0 ? 'sg-points-minus' : 'sg-points-plus'}>{event.points > 0 ? '+' : ''}{event.points} pkt</b>}
      </div>
      <p>{text}</p>
      {event.kind === 'take' && <div className="sg-event-details">
        {event.windowIndex !== null && event.windowIndex !== undefined && <span>Kwatera {event.windowIndex + 1}</span>}
        <span>Ułożono {event.placed}</span>
        {!!event.broken && <span className="sg-event-broken">Stłuczono {event.broken}</span>}
        {event.firstPlayer && <span className="sg-event-token">Żeton 1 · +1 stłuczenie</span>}
        {event.framePoints !== undefined && <span>Ukończono okno</span>}
      </div>}
    </div>
  </li>
}

/** Newest events are always first. Scrolling here never moves the game table. */
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
    <div className="sg-panel-title"><span><History size={14}/> HISTORIA RUCHÓW</span><small>{state.history?.length ?? 0} wpisów</small></div>
    <div className="sg-history-filters" role="group" aria-label="Filtr historii">
      {([['all','Wszystkie'],['human','Moje'],['ai','Boty']] as const).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'sg-history-selected' : ''} onClick={() => {atTop.current = true; setFilter(value)}}>{label}</button>)}
    </div>
    <ol className="sg-history-scroll" ref={listRef} onScroll={e => { atTop.current = e.currentTarget.scrollTop < 24 }}>
      {events.map((event, i) => <EventItem key={`${event.id}-${event.kind}-${i}`} event={event} state={state}/>)}
    </ol>
    {!events.length && <div className="sg-history-empty">Brak ruchów dla wybranego filtra.</div>}
    <div className="sg-history-footer">Najnowszy ruch na górze · przewijaj po starsze</div>
  </section>
}
