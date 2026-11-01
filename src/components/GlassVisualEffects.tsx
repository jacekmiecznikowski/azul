import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { GameState, Move } from '../game/engine'
import { describeMoveVisuals } from '../ui/moveVisualEvents'
import type { VisualEvent } from '../ui/moveVisualEvents'

const KEY = 'sintra-glass-visual-effects-v1'
const MAX_EFFECTS = 22
const COLORS = {
  rose: '#ff7fbb',
  citrine: '#ffe18b',
  cyan: '#67e9fa',
  amber: '#ffc08b',
  slate: '#e3f6fa',
}
type BurstKind = 'glass' | 'complete' | 'shatter' | 'score'

export interface VisualBurst {
  id: number
  kind: BurstKind
  x: number
  y: number
  color: string
  label?: string
  positive?: boolean
}

function centerOf(selector: string): { x: number; y: number } | null {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1 || rect.bottom < 0 || rect.top > window.innerHeight ||
    rect.right < 0 || rect.left > window.innerWidth) return null
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
function location(event: VisualEvent) {
  const board = `[data-sg-board="${event.playerIndex}"]`
  switch (event.kind) {
    case 'glass':
      return centerOf(`${board} [data-sg-window="${event.windowIndex}"] [data-sg-pane="${event.slot}"]`)
        ?? centerOf(`${board} [data-sg-window="${event.windowIndex}"]`)
    case 'complete':
      return centerOf(`${board} [data-sg-window="${event.windowIndex}"]`)
    case 'shatter':
      return centerOf(`${board} [data-sg-break]`) ?? centerOf(`${board} .sg-board-top`)
    case 'score':
      return centerOf(`${board} [data-sg-score]`)
  }
}

/**
 * Brief CSS-based effects. Uses no canvas, RAF loop, or timers during normal gameplay.
 * Animations never change game state, legal moves or bot simulation speed.
 */
export function useVisualEffects() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(KEY) !== 'false' } catch { return true }
  })
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true)
  const [bursts, setBursts] = useState<VisualBurst[]>([])
  const idRef = useRef(0)
  const timers = useRef<Set<number>>(new Set())

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => setReducedMotion(media.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  const clear = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current.clear()
    setBursts([])
  }, [])
  useEffect(() => () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current.clear()
  }, [])
  useEffect(() => { if (!enabled || reducedMotion) clear() }, [enabled, reducedMotion, clear])

  const toggle = useCallback(() => setEnabled(current => {
    const next = !current
    try { localStorage.setItem(KEY, String(next)) } catch { /* Private browser mode */ }
    return next
  }), [])

  const emit = useCallback((before: GameState, after: GameState, move: Move) => {
    if (!enabled || reducedMotion) return
    const now = describeMoveVisuals(before, after, move)
    const additions: VisualBurst[] = []
    for (const event of now) {
      const point = location(event)
      if (!point) continue
      const id = ++idRef.current
      if (event.kind === 'score') {
        additions.push({
          id, kind: 'score', ...point, positive: event.amount > 0,
          color: event.amount > 0 ? '#f6df98' : '#ff8f8b',
          label: `${event.amount > 0 ? '+' : ''}${event.amount} pkt`,
        })
      } else if (event.kind === 'shatter') {
        additions.push({
          id, kind: 'shatter', ...point, color: COLORS[event.color],
          label: `−${event.amount} szkła`,
        })
      } else {
        additions.push({ id, kind: event.kind, ...point, color: COLORS[event.color] })
      }
    }
    if (!additions.length) return
    setBursts(previous => [...previous, ...additions].slice(-MAX_EFFECTS))
    for (const burst of additions) {
      const life = burst.kind === 'score' ? 1450 : burst.kind === 'complete' ? 1300 : 1000
      const timer = window.setTimeout(() => {
        timers.current.delete(timer)
        setBursts(previous => previous.filter(current => current.id !== burst.id))
      }, life)
      timers.current.add(timer)
    }
  }, [enabled, reducedMotion])

  return { enabled, toggle, emit, clear, bursts, reducedMotion }
}

const RAYS = Array.from({ length: 9 }, (_, i) => i)
const SPARKS = Array.from({ length: 7 }, (_, i) => i)

function variables(index: number, total: number, spread: number): CSSProperties {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const distance = spread * (0.7 + ((index * 7) % 6) / 14)
  return {
    '--vfx-dx': `${Math.round(Math.cos(angle) * distance)}px`,
    '--vfx-dy': `${Math.round(Math.sin(angle) * distance)}px`,
    '--vfx-spin': `${90 + (index * 53) % 260}deg`,
    '--vfx-delay': `${(index % 3) * 32}ms`,
  } as CSSProperties
}

export function GlassVisualEffects({ bursts }: { bursts: VisualBurst[] }) {
  if (!bursts.length) return null
  return <div className="sg-vfx-layer" aria-hidden="true">{
    bursts.map(burst => <div
      key={burst.id}
      className={`sg-vfx-burst sg-vfx-${burst.kind}${burst.positive ? ' sg-vfx-positive' : ''}`}
      style={{ left: burst.x, top: burst.y, '--vfx-color': burst.color } as CSSProperties}>
      {burst.kind === 'glass' && <>
        <i className="sg-vfx-glint"/>
        {SPARKS.map(i => <i key={i} className="sg-vfx-spark" style={variables(i, SPARKS.length, 46)}/>)}
      </>}
      {burst.kind === 'complete' && <>
        <i className="sg-vfx-halo"/>
        {RAYS.map(i => <i key={i} className="sg-vfx-ray" style={variables(i, RAYS.length, 68)}/>)}
        <span className="sg-vfx-perfect">✦</span>
      </>}
      {burst.kind === 'shatter' && <>
        <i className="sg-vfx-shock"/>
        {RAYS.map(i => <i key={i} className="sg-vfx-shard" style={variables(i, RAYS.length, 80)}/>)}
      </>}
      {burst.label && <span className="sg-vfx-label">{burst.label}</span>}
    </div>)
  }</div>
}
