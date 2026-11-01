import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves, newGame } from '../game/engine'
import type { Move } from '../game/engine'
import { describeMoveVisuals } from './moveVisualEvents'

describe('move-triggered glass feedback', () => {
  const makeState = () => newGame({ opponents: 1, palaceSide: 'A', seed: 8765 })

  it('places a glint only on the slots actually chosen by a legal move', () => {
    const before = makeState()
    const move = legalMoves(before).find((m): m is Extract<Move, {kind:'take'}> =>
      m.kind === 'take' && m.windowIndex !== null && !!m.slots?.length)
    expect(move).toBeDefined()
    if (!move) return
    const after = applyMove(before, move)
    const cues = describeMoveVisuals(before, after, move)
    const glass = cues.filter(c => c.kind === 'glass')
    expect(glass.length).toBe(move.slots?.length)
    expect(glass.every(c => c.kind === 'glass' && c.playerIndex === before.currentPlayer && c.windowIndex === move.windowIndex && c.color === move.color)).toBe(true)
    expect(glass.map(c => c.kind === 'glass' ? c.slot : -1)).toEqual(move.slots)
  })

  it('shows the first-center marker as a broken-glass penalty', () => {
    const before = makeState()
    const move = legalMoves(before).find((m): m is Extract<Move,{kind:'take'}> =>
      m.kind === 'take' && m.source.type === 'center')
    if (!move) {
      // No center tiles on initial setup; create a state with an available center tile.
      const color = before.factories[0].pop()
      if (!color) throw Error('Expected a tile in the initial factory')
      before.center.push(color)
    }
    const taken = move ?? legalMoves(before).find((m): m is Extract<Move,{kind:'take'}> =>
      m.kind === 'take' && m.source.type === 'center')!
    const after = applyMove(before, taken)
    const cues = describeMoveVisuals(before, after, taken)
    const shattered = cues.find(c => c.kind === 'shatter')
    expect(shattered?.kind).toBe('shatter')
    if (shattered?.kind === 'shatter') {
      const picked = before.center.filter(c => c === taken.color).length
      expect(shattered.amount).toBe(picked - (taken.slots?.length ?? 0) + 1)
    }
  })

  it('shows positive and negative score changes for any player including endgame totals', () => {
    const before = makeState()
    const after = structuredClone(before)
    after.players[0].score += 15
    after.players[1].score -= 8
    const cues = describeMoveVisuals(before, after, { kind: 'reset' })
    expect(cues.filter(c => c.kind === 'score')).toEqual([
      { kind: 'score', playerIndex: 0, amount: 15 },
      { kind: 'score', playerIndex: 1, amount: -8 },
    ])
    expect(cues.some(c => c.kind === 'glass' || c.kind === 'shatter')).toBe(false)
  })

  it('only shows a completion halo when a window flips or finishes', () => {
    const before = makeState()
    const move = legalMoves(before).find((m): m is Extract<Move,{kind:'take'}> =>
      m.kind === 'take' && m.windowIndex !== null && !!m.slots?.length)!
    const after = structuredClone(before)
    after.players[before.currentPlayer].strips[move.windowIndex!].side = 1
    const cues = describeMoveVisuals(before, after, move)
    expect(cues.some(c => c.kind === 'complete' && c.windowIndex === move.windowIndex)).toBe(true)
    const unchanged = describeMoveVisuals(before, before, move)
    expect(unchanged.some(c => c.kind === 'complete')).toBe(false)
  })

  it('does not animate resets without a score change', () => {
    const before = makeState()
    expect(describeMoveVisuals(before, before, {kind:'reset'})).toEqual([])
  })
})
