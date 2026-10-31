import { applyMove, availableSources, legalMoves, patternFor, remainingSlots, WINDOW_POINTS } from './engine'
import type { Difficulty, GameState, Move, Player } from './engine'

/** AI uses exactly the same legal-move list and reducer as the human player. */
function progress(player: Player): number {
  return player.strips.reduce((value, strip, index) => {
    if (strip.side === 2) return value + 8
    const filled = strip.panes.filter(Boolean).length
    const access = index < player.glazier ? 0.8 : 1
    return value + filled * (1.25 + filled * 0.24) * access + (strip.upper ? 5.0 : 0)
  }, 0)
}
function evaluate(state: GameState, next: GameState, move: Move, difficulty: Difficulty): number {
  const oldPlayer = state.players[state.currentPlayer]
  const player = next.players[state.currentPlayer]
  let value = (player.score - oldPlayer.score) * 2.8 + (progress(player) - progress(oldPlayer)) * 1.6
  value -= (player.brokenSteps - oldPlayer.brokenSteps) * 2.6
  value -= (player.glassLost - oldPlayer.glassLost) * 0.15
  if (move.kind === 'reset') {
    value -= 2.0
    const optionsBefore = availableSources(state).length
    const benefit = oldPlayer.strips.slice(0, oldPlayer.glazier)
      .reduce((sum, strip) => sum + patternFor(strip).filter((c, i) => strip.panes[i] === null && c !== 'wild').length, 0)
    value += Math.min(optionsBefore, benefit) * 0.4
  } else {
    const count = availableSources(state).find((entry) => entry.color === move.color &&
      entry.source.type === move.source.type &&
      (entry.source.type === 'center' || (move.source.type === 'factory' && entry.source.index === move.source.index)))?.count ?? 0
    value += count * 0.1
    if (move.windowIndex !== null) {
      const strip = oldPlayer.strips[move.windowIndex]
      const placed = Math.min(count, remainingSlots(strip, move.color))
      value += placed * 1.3
      value += (move.windowIndex < 5 ? (5 - move.windowIndex) * 0.11 : 0)
      // Advanced AI plans for windows whose completion scores again for earlier ones.
      if (difficulty === 'hard') {
        value += WINDOW_POINTS[move.windowIndex] * (strip.panes.filter(Boolean).length + placed) / 5 * 0.35
        value += (7 - move.windowIndex) * (strip.panes.filter(Boolean).length + placed) / 5 * 0.22
        const missedAccess = oldPlayer.strips.slice(oldPlayer.glazier, move.windowIndex)
          .reduce((v, s) => v + s.panes.filter(Boolean).length, 0)
        value -= missedAccess * 0.35
      }
    }
    if (move.source.type === 'center' && !state.firstCenterTaken) value -= 0.8
  }
  return value
}
export function chooseAIMove(state: GameState, difficulty: Difficulty): Move | null {
  const moves = legalMoves(state)
  if (!moves.length) return null
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)]
  const scored = moves.map((move) => ({ move, value: evaluate(state, applyMove(state, move), move, difficulty) }))
  scored.sort((a, b) => b.value - a.value)
  if (difficulty === 'normal') {
    // A little variety, without making only obviously poor moves.
    const viable = scored.filter((item) => item.value >= scored[0].value - 2.5)
    return viable[Math.floor(Math.random() * Math.min(3, viable.length))].move
  }
  return scored[0].move
}
