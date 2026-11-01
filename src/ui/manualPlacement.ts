import type { Move } from '../game/engine'

type TakeMove = Extract<Move, { kind: 'take' }>

/** Normalize pane indices so selecting in reverse order finds the same legal engine move. */
export function slotsSignature(slots: readonly number[]): string {
  return [...slots].sort((a, b) => a - b).join(',')
}

export function distinctPlacementSlots(moves: readonly TakeMove[]): number[][] {
  const variants = new Map<string, number[]>()
  for (const move of moves) {
    const slots = move.slots ?? []
    const signature = slotsSignature(slots)
    if (!variants.has(signature)) variants.set(signature, [...slots].sort((a, b) => a - b))
  }
  return [...variants.values()]
}

export function matchingPlacementMoves(moves: readonly TakeMove[], selected: readonly number[]): TakeMove[] {
  const signature = slotsSignature(selected)
  return moves.filter(move => (move.slots?.length ?? 0) === selected.length &&
    slotsSignature(move.slots ?? []) === signature)
}
