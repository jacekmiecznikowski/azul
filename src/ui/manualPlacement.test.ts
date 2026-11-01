import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves, newGame, placementChoices } from '../game/engine'
import type { Move, WindowStrip } from '../game/engine'
import { distinctPlacementSlots, matchingPlacementMoves, slotsSignature } from './manualPlacement'

const sample: WindowStrip = {
  front: ['slate', 'wild', 'wild', 'rose', 'amber'],
  back: ['rose', 'slate', 'amber', 'citrine', 'cyan'],
  panes: [null, null, null, null, null],
  upper: null,
  lower: null,
  side: 0,
}
const signature = (slots: readonly number[][]) => slots.map(slotsSignature).sort()

describe('manual glass choice with multiple jokers', () => {
  it('includes using a normal color + a joker, or both jokers', () => {
    expect(signature(placementChoices(sample, 'slate', 2))).toEqual(['0,1', '0,2', '1,2'])
  })

  it('maps reversed user-click order back to exact legal moves', () => {
    const state = newGame({ opponents: 1, palaceSide: 'A', seed: 71234 })
    const acting = state.currentPlayer
    state.players[acting].strips[0] = structuredClone(sample)
    state.factories[0] = ['slate', 'slate']
    const candidates = legalMoves(state).filter((m): m is Extract<Move, { kind: 'take' }> =>
      m.kind === 'take' && m.source.type === 'factory' && m.source.index === 0 &&
      m.color === 'slate' && m.windowIndex === 0)
    expect(candidates).toHaveLength(3)
    expect(signature(distinctPlacementSlots(candidates))).toEqual(['0,1', '0,2', '1,2'])
    const onlyJokers = matchingPlacementMoves(candidates, [2, 1])
    expect(onlyJokers).toHaveLength(1)
    const after = applyMove(state, onlyJokers[0])
    expect(after.players[acting].strips[0].panes).toEqual([null, 'slate', 'slate', null, null])
  })

  it('does not match impossible or partial selections', () => {
    const candidates = placementChoices(sample, 'slate', 2).map(slots => ({
      kind: 'take' as const,
      source: { type: 'center' as const }, color: 'slate' as const, windowIndex: 0, slots,
    }))
    expect(matchingPlacementMoves(candidates, [0])).toHaveLength(0)
    expect(matchingPlacementMoves(candidates, [0, 3])).toHaveLength(0)
    expect(matchingPlacementMoves(candidates, [1, 1])).toHaveLength(0)
    expect(matchingPlacementMoves(candidates, [0, 2])).toHaveLength(1)
  })

  it('deduplicates only identical slot sets, retaining keep-color choices', () => {
    const sameSlots = [
      { kind: 'take' as const, source: {type:'center' as const}, color:'slate' as const,
        windowIndex: 0, slots: [2,1], keepColor:'slate' as const },
      { kind: 'take' as const, source: {type:'center' as const}, color:'slate' as const,
        windowIndex: 0, slots: [1,2], keepColor:'rose' as const },
    ]
    expect(distinctPlacementSlots(sameSlots)).toEqual([[1,2]])
    expect(matchingPlacementMoves(sameSlots, [1,2])).toHaveLength(2)
  })
})
