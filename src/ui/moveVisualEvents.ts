import type { GameState, GlassColor, Move } from '../game/engine'

export type VisualEvent =
  | { kind: 'glass'; playerIndex: number; windowIndex: number; slot: number; color: GlassColor }
  | { kind: 'complete'; playerIndex: number; windowIndex: number; color: GlassColor }
  | { kind: 'shatter'; playerIndex: number; amount: number; color: GlassColor }
  | { kind: 'score'; playerIndex: number; amount: number }

/** Plan visual feedback exclusively from actual applied moves, never from guesses or UI timers. */
export function describeMoveVisuals(before: GameState, after: GameState, move: Move): VisualEvent[] {
  const events: VisualEvent[] = []
  const actor = before.currentPlayer

  if (move.kind === 'take') {
    const source = move.source.type === 'center'
      ? before.center
      : before.factories[move.source.index] ?? []
    const picked = source.filter(c => c === move.color).length
    const slots = move.windowIndex === null ? [] : (move.slots ?? [])
    if (move.windowIndex !== null) {
      for (const slot of slots) {
        events.push({
          kind: 'glass', playerIndex: actor, windowIndex: move.windowIndex,
          slot, color: move.color,
        })
      }
      const previous = before.players[actor].strips[move.windowIndex]
      const current = after.players[actor].strips[move.windowIndex]
      if (current && previous && current.side !== previous.side) {
        events.push({ kind: 'complete', playerIndex: actor, windowIndex: move.windowIndex, color: move.color })
      }
    }

    // Taking the first center marker also advances the broken-glass penalty track.
    const marker = move.source.type === 'center' && !before.firstCenterTaken ? 1 : 0
    const shattered = Math.max(0, picked - slots.length) + marker
    if (shattered > 0) events.push({ kind: 'shatter', playerIndex: actor, amount: shattered, color: move.color })
  }

  // Include final scoring changes to ALL players, not just the player who moved last.
  for (let i = 0; i < before.players.length; i++) {
    const difference = after.players[i].score - before.players[i].score
    if (difference !== 0) events.push({ kind: 'score', playerIndex: i, amount: difference })
  }
  return events
}
