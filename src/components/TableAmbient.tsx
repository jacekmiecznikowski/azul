import type { CSSProperties } from 'react'

const MOTES = Array.from({ length: 78 }, (_, i) => i)

/**
 * More visible, slow ambient glass dust and tiny light flares.
 * Deterministic, CSS-only and pointer-transparent: no React updates or running timers.
 */
export function TableAmbient({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return <div className="sg-table-ambient" aria-hidden="true">
    <span className="sg-table-light sg-table-light-a"/>
    <span className="sg-table-light sg-table-light-b"/>
    <span className="sg-table-light sg-table-light-c"/>
    <span className="sg-table-caustic sg-table-caustic-a"/>
    <span className="sg-table-caustic sg-table-caustic-b"/>
    {MOTES.map(i => {
      const flare = i % 5 === 0
      return <i key={i} className={`sg-table-mote sg-table-mote-${i % 4}${flare ? ' sg-table-flare' : ''}`}
        style={{
          left: `${3 + ((i * 613 + 91) % 997) / 997 * 94}%`,
          top: `${3 + ((i * 733 + 137) % 991) / 991 * 94}%`,
          '--mote-duration': `${15 + i % 11 * 2.1}s`,
          '--mote-delay': `${-((i * 13) % 37)}s`,
          '--mote-distance': `${16 + i % 8 * 4}px`,
          '--mote-size': `${flare ? 3.5 + i % 3 : 2 + i % 4 * .52}px`,
        } as CSSProperties}/>
    })}
  </div>
}
