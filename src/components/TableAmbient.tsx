import type { CSSProperties } from 'react'

const MOTES = Array.from({ length: 22 }, (_, i) => i)

/** Decorative tabletop dust: no timers, no random rerenders, no hit-testing. */
export function TableAmbient({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return <div className="sg-table-ambient" aria-hidden="true">
    <span className="sg-table-light sg-table-light-a"/>
    <span className="sg-table-light sg-table-light-b"/>
    {MOTES.map(i => <i key={i}
      className={`sg-table-mote sg-table-mote-${i % 3}`}
      style={{
        left: `${(i * 41 + 7) % 97}%`,
        top: `${(i * 63 + 19) % 93}%`,
        '--mote-duration': `${18 + i % 9 * 2}s`,
        '--mote-delay': `${-((i * 11) % 33)}s`,
        '--mote-distance': `${10 + i % 6 * 3}px`,
        '--mote-size': `${i % 6 === 0 ? 3 : 1.5 + (i % 3) * .35}px`,
      } as CSSProperties}/>)}
  </div>
}
