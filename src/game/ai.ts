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
  if (difficulty === 'expert') return expertMove(state, moves)
  const scored = moves.map((move) => ({ move, value: evaluate(state, applyMove(state, move), move, difficulty) }))
  scored.sort((a, b) => b.value - a.value)
  if (difficulty === 'normal') {
    // A little variety, without making only obviously poor moves.
    const viable = scored.filter((item) => item.value >= scored[0].value - 2.5)
    return viable[Math.floor(Math.random() * Math.min(3, viable.length))].move
  }
  return scored[0].move
}

/**
 * Bounded two-ply tactical search with exact state transitions.
 * It models the strongest replies by the next player, while preserving a
 * positional evaluation of unfinished panes and future scoring opportunities.
 * No hidden knowledge of the shuffled bag is used.
 */
function boardEstimate(state: GameState, index: number): number {
  const player = state.players[index]
  if (state.phase === 'finished') return player.score * 3.4
  let estimate = player.score * 3.4
  estimate -= [0, 1, 2, 4, 6, 8, 11, 14, 18][player.brokenSteps] * 2.55
  const marketColors = new Map<string, number>()
  for (const color of state.center) marketColors.set(color, (marketColors.get(color) ?? 0) + 1)
  for (const factory of state.factories) for (const color of factory) marketColors.set(color, (marketColors.get(color) ?? 0) + 1)
  for (const [windowIndex, strip] of player.strips.entries()) {
    if (strip.side === 2) { estimate += 9.5; continue }
    const filled = strip.panes.filter(Boolean).length
    const pointsForWindow = WINDOW_POINTS[windowIndex] + player.strips.slice(windowIndex + 1).reduce((sum, right, offset) =>
      sum + (right.upper ? WINDOW_POINTS[windowIndex + 1 + offset] : 0), 0)
    const accessible = windowIndex >= player.glazier
    const completion = filled / 5
    estimate += (strip.upper ? 6 : 0) + filled * 2.15 + completion * completion * (4.5 + pointsForWindow * 1.1)
    if (!accessible && filled) estimate -= filled * 0.9
    if (accessible) {
      const pat = patternFor(strip)
      let availableMatches = 0
      for (let i = 0; i < 5; i++) {
        if (strip.panes[i]) continue
        if (pat[i] === 'wild') availableMatches += Math.min(3, Array.from(marketColors.values()).reduce((sum, n) => sum + n, 0))
        else availableMatches += Math.min(3, marketColors.get(pat[i]) ?? 0)
      }
      estimate += Math.min(5 - filled, availableMatches) * (filled >= 3 ? 0.55 : 0.29)
    }
  }
  const glazed = player.strips.filter(s => !!s.upper && !!s.lower).length
  if (state.palaceSide === 'B') {
    const counts: Record<string, number> = {}
    player.strips.forEach(s => { for (const c of [s.upper, s.lower]) if (c) counts[c] = (counts[c] ?? 0) + 1 })
    const strongest = Math.max(0, ...Object.values(counts))
    estimate += glazed * strongest * 0.7
  } else {
    for (let i = 0; i < 8; i += 2) {
      const count = [player.strips[i].upper, player.strips[i].lower, player.strips[i + 1].upper, player.strips[i + 1].lower].filter(Boolean).length
      estimate += [0, 0.5, 2.8, 6.0, 10][count] * 0.7
    }
  }
  // Preserve flexibility: resetting is a full action, and being trapped right costs tempo.
  // A finished window on the right scores again whenever a window to its left
  // is completed. Preserve that future leverage even if the window itself is done.
  for (const [j, strip] of player.strips.entries()) {
    if (!strip.upper) continue
    const futureLeft = player.strips.slice(0, j).reduce((sum, left) => sum + (left.side === 2 ? 0 : left.side === 1 ? 0.8 : 1.4), 0)
    estimate += futureLeft * WINDOW_POINTS[j] * 0.48
  }
  estimate -= player.glazier * 0.12
  return estimate
}
function positionValue(state: GameState, root: number): number {
  const ourValue = boardEstimate(state, root)
  const rivals = state.players.map((_, i) => i === root ? -Infinity : boardEstimate(state, i))
  return ourValue - Math.max(...rivals) * 0.65 - rivals.filter(Number.isFinite).reduce((a, b) => a + b, 0) * 0.055
}
function expertMove(state: GameState, moves: Move[]): Move {
  const root = state.currentPlayer
  const first = moves.map(move => {
    const next = applyMove(state, move)
    return { move, next, quick: positionValue(next, root) + evaluate(state, next, move, 'hard') * 0.30 }
  }).sort((a, b) => b.quick - a.quick)
  // Lookahead is purposely bounded even at a crowded 4-player table.
  const shortlist = first.slice(0, Math.min(9, first.length))
  let best = shortlist[0]
  let bestValue = -Infinity
  for (const candidate of shortlist) {
    let future = positionValue(candidate.next, root)
    if (candidate.next.phase !== 'finished' && candidate.next.currentPlayer !== root) {
      const responses = legalMoves(candidate.next).map(move => {
        const after = applyMove(candidate.next, move)
        return { after, rank: evaluate(candidate.next, after, move, 'hard') + (boardEstimate(after, candidate.next.currentPlayer) - boardEstimate(candidate.next, candidate.next.currentPlayer)) * 0.4 }
      }).sort((a, b) => b.rank - a.rank).slice(0, 2)
      if (responses.length) {
        const futures = responses.map(r => {
          let predicted = positionValue(r.after, root)
          // In a duel we can anticipate our own answer after the opponent acts.
          if (r.after.phase !== 'finished' && r.after.currentPlayer === root && r.after.round === state.round) {
            const replies = legalMoves(r.after)
            let bestReply = -Infinity
            for (const reply of replies) {
              const response = applyMove(r.after, reply)
              const value = positionValue(response, root)
              if (value > bestReply) bestReply = value
            }
            if (Number.isFinite(bestReply)) predicted = predicted * 0.38 + bestReply * 0.62
          }
          return predicted
        })
        future = Math.min(...futures)
      }
    }
    const value = candidate.quick * 0.25 + future * 0.75
    if (value > bestValue) { bestValue = value; best = candidate }
  }
  return best.move
}
