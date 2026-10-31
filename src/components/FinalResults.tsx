import { Award, Crown, X } from 'lucide-react'
import { finalBreakdown, standings } from '../game/engine'
import type { FinalScoreBreakdown, GameState, GlassColor } from '../game/engine'

const COLOR_PL: Record<GlassColor, string> = {
  rose: 'różowych', citrine: 'żółtych', cyan: 'turkusowych', amber: 'pomarańczowych', slate: 'szarych',
}

function Detail({ data, palaceSide }: { data: FinalScoreBreakdown; palaceSide: GameState['palaceSide'] }) {
  return <div className="sg-final-steps">
    <div><span>Wynik podczas rund (w tym natychmiastowe −18)</span><strong>{data.roundPoints} pkt</strong></div>
    <div><span>Pozostałe szkło: {data.remainingPanes} tafli ÷ 3</span><strong className="sg-positive">+{data.remainingPoints}</strong></div>
    <div><span>Końcowa kara z toru stłuczeń</span><strong className="sg-negative">−{data.glassPenalty}</strong></div>
    <div><span>{palaceSide === 'A' ? `Ornamenty: ${data.palaceDetails.join(' + ')}` : `Strona B: ${data.fullyGlazedWindows} pełnych okien × ${data.dominantColorCount} ${data.dominantColor ? COLOR_PL[data.dominantColor] : ''} witraży`}</span><strong className="sg-positive">+{data.palaceBonus}</strong></div>
    <div className="sg-final-total"><span>ŁĄCZNIE</span><strong>{data.total} pkt</strong></div>
    <small>Łączne punkty utracone na torze: {data.totalGlassLost} (rozstrzyga remis)</small>
  </div>
}

export function FinalResults({ state, onClose }: { state: GameState; onClose: () => void }) {
  const ordered = standings(state)
  const scores = state.finalScores ?? state.players.map(p => {
    // Migrate completed saves created before v10: old scores already include the final additions.
    const breakdown = finalBreakdown(p, state.palaceSide)
    const adjustment = breakdown.remainingPoints - breakdown.glassPenalty + breakdown.palaceBonus
    return { ...breakdown, roundPoints: p.score - adjustment, total: p.score, totalGlassLost: p.glassLost }
  })
  const top = ordered[0]
  const winners = ordered.filter(p => p.score === top.score && p.glassLost === top.glassLost)
  return <div className="modal-backdrop sg-final-overlay" onMouseDown={onClose}>
    <div className="sg-final-dialog" role="dialog" aria-modal="true" aria-label="Szczegółowe podliczenie końcowe" onMouseDown={e => e.stopPropagation()}>
      <header className="sg-final-header"><div><Award size={24}/><span><small>PO SZÓSTEJ RUNDZIE</small><h2>Podliczenie końcowe</h2></span></div><button type="button" onClick={onClose} aria-label="Zamknij podliczenie"><X size={19}/></button></header>
      <p className="sg-final-winners"><Crown size={18}/> {winners.length === 1 ? `Zwycięża ${top.name}!` : `Remis: ${winners.map(p => p.name).join(', ')}!`}</p>
      <div className="sg-final-columns">{ordered.map((player, index) => {
        const data = scores.find(b => b.playerId === player.id)!
        return <article className={`sg-final-player${winners.includes(player) ? ' sg-final-winner' : ''}`} key={player.id}>
          <div className="sg-final-player-head"><span>{index + 1}. <b>{player.name}</b></span><strong>{player.score} pkt</strong></div>
          <Detail data={data} palaceSide={state.palaceSide}/>
        </article>
      })}</div>
      <footer className="sg-final-caption">Zasady: 1 pkt za każde 3 niewykorzystane tafle, kara z toru oraz premia strony {state.palaceSide}. Remis rozstrzyga najmniejsza łączna utrata punktów z toru stłuczeń.</footer>
    </div>
  </div>
}
