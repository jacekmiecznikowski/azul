import { useEffect, useRef } from 'react'
import { ArrowRight, Crown, ListChecks, Sparkles } from 'lucide-react'
import { standings } from '../game/engine'
import type { GameState } from '../game/engine'

/**
 * A compact celebratory end screen. Detailed scoring stays opt-in:
 * final results only open when the player explicitly clicks the button.
 */
export function FinishCelebration({ state, onResults, onNewGame, onBoard }: {
  state: GameState
  onResults: () => void
  onBoard: () => void
  onNewGame: () => void
}) {
  const newGameButton = useRef<HTMLButtonElement>(null)
  const ordered = standings(state)
  const leader = ordered[0]
  const winners = ordered.filter(player =>
    player.score === leader.score && player.glassLost === leader.glassLost)
  const tie = winners.length > 1

  useEffect(() => {
    newGameButton.current?.focus()
  }, [])

  return <div className="sg-finish-overlay">
    <section className="sg-finish-card" role="dialog" aria-modal="true"
      aria-labelledby="sg-finish-title" aria-describedby="sg-finish-caption">
      <div className="sg-finish-decoration" aria-hidden="true">
        <span className="sg-finish-ornament-line"/>
        <span className="sg-finish-crest"><Crown size={25} strokeWidth={1.55}/></span>
        <span className="sg-finish-ornament-line"/>
      </div>
      <div className="sg-finish-kicker"><Sparkles size={13}/> WSZYSTKIE RUNDY ZAKOŃCZONE <Sparkles size={13}/></div>
      <h2 id="sg-finish-title">Koniec partii</h2>
      <p className="sg-finish-subtitle" id="sg-finish-caption">
        {tie ? 'Zwycięzcy tej rozgrywki' : 'Zwycięzca tej rozgrywki'}
      </p>
      <div className="sg-finish-winner">
        <span className="sg-finish-winner-name">{winners.map(player => player.name).join(' · ')}</span>
        <span className="sg-finish-score"><b>{leader.score}</b><small>PKT</small></span>
      </div>
      <div className="sg-finish-diamonds" aria-hidden="true">
        <i/><i/><i/><i/><i/>
      </div>
      <div className="sg-finish-actions">
        <button type="button" className="sg-finish-primary" ref={newGameButton} onClick={onNewGame}>
          Nowa partia <ArrowRight size={16}/>
        </button>
        <button type="button" className="sg-finish-secondary" onClick={onResults}>
          <ListChecks size={16}/> Zobacz podliczenie
        </button>
        <button type="button" className="sg-board-link" onClick={onBoard}>Wróć do planszy</button>
      </div>
      <span className="sg-finish-foot">SINTRA GLASS <span>✦</span> WITRAŻE SINTRY</span>
    </section>
  </div>
}
