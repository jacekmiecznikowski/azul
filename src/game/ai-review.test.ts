import { describe, expect, it } from 'vitest'
import { chooseAIMove } from './ai'
import { applyMove, COLORS, finalBreakdown, glassInventory, legalMoves, newGame } from './engine'
import { FEATURE_NAMES, moveFeatures } from './learnedPolicy'

describe('AI review regressions', () => {
  it('preserves a joker when an ordinary matching field is available', () => {
    for (const difficulty of ['hard', 'expert', 'master'] as const) {
      const state = newGame({ opponents: 1, seed: 81 })
      const p = state.players[state.currentPlayer]
      p.strips.forEach(s => { s.side = 2; s.upper = 'cyan'; s.lower = 'cyan' })
      const strip = p.strips[0]
      strip.side = 1; strip.lower = null
      strip.back = ['wild', 'rose', 'cyan', 'amber', 'slate']
      state.factories = [['rose'], [], [], [], []]
      state.center = ['rose']; state.firstCenterTaken = true
      const move = chooseAIMove(state, difficulty)
      expect(move).toMatchObject({ kind: 'take', color: 'rose', windowIndex: 0, slots: [1] })
    }
  })
  it('expert cannot use hidden bag order or RNG at the round boundary', () => {
    for (const seed of [81, 92, 103]) {
      const state = newGame({ opponents: 1, seed })
      state.factories = [[], [], [], [], []]
      state.center = ['rose']
      state.firstCenterTaken = true
      const original = JSON.stringify(state)
      const move = chooseAIMove(state, 'expert')
      const changed = structuredClone(state)
      changed.bag = [...state.bag].reverse()
      changed.seed = 321123
      expect(chooseAIMove(changed, 'expert')).toEqual(move)
      expect(JSON.stringify(state)).toBe(original)
    }
  })
  it('master chooses the best exact final score and kept color on palace B', () => {
    const state = newGame({ opponents: 1, seed: 18, palaceSide: 'B' })
    state.round = 6; state.firstCenterTaken = true
    state.factories = [[], [], [], [], []]; state.center = ['rose']
    const p = state.players[state.currentPlayer]
    p.strips.forEach(s => { s.side = 2; s.upper = 'cyan'; s.lower = 'cyan' })
    p.glazier = 0
    const strip = p.strips[0]
    strip.side = 1; strip.lower = null
    strip.back = ['cyan', 'cyan', 'cyan', 'cyan', 'rose']
    strip.panes = ['cyan', 'cyan', 'cyan', 'cyan', null]
    const move = chooseAIMove(state, 'master')!
    expect(move).toMatchObject({ keepColor: 'cyan' })
    const bestScore = Math.max(...legalMoves(state).map(m => applyMove(state, m).players[state.currentPlayer].score))
    expect(applyMove(state, move).players[state.currentPlayer].score).toBe(bestScore)
  })
  it('rates the actual leftovers of a partially filled workshop', () => {
    const state = newGame({ opponents: 1, seed: 18 })
    state.factories = [['rose'], [], [], [], []]
    state.center = ['cyan']
    const move = legalMoves(state).find(m => m.kind === 'take' && m.source.type === 'factory')!
    expect(moveFeatures(state, move)[FEATURE_NAMES.indexOf('leaveToCenter')]).toBeCloseTo(0)
  })
  it('keeps -18 immediate, wraps to zero, and charges subsequent broken pieces', () => {
    const state = newGame({ opponents: 1, seed: 19 })
    const p = state.players[state.currentPlayer]
    p.score = 30; p.brokenSteps = 7
    p.strips.forEach(s => { s.front = Array(5).fill('cyan'); s.side = 0 })
    state.center = ['rose', 'rose']; state.firstCenterTaken = true
    const move = legalMoves(state).find(m => m.kind === 'take' && m.source.type === 'center')!
    const after = applyMove(state, move).players[state.currentPlayer]
    expect(after.score).toBe(12)
    expect(after.glassLost).toBe(18)
    expect(after.brokenSteps).toBe(1)
    expect(finalBreakdown(after, 'A').glassPenalty).toBe(1)
  })
  it.each(['A', 'B'] as const)('finishes mixed AI games on palace %s with all 100 tiles', side => {
    let state = newGame({ opponents: 2, seed: 73, palaceSide: side })
    let turn = 0
    while (state.phase !== 'finished' && turn < 350) {
      const difficulty = ['hard', 'master'] as const
      const move = chooseAIMove(state, difficulty[turn++ % 2])!
      expect(legalMoves(state)).toContainEqual(move)
      state = applyMove(state, move)
      expect(glassInventory(state).total).toBe(100)
      expect(state.players.every(p => p.brokenSteps >= 0 && p.brokenSteps < 8)).toBe(true)
    }
    expect(state.phase).toBe('finished')
    expect(state.roundColors.every(c => COLORS.includes(c))).toBe(true)
  })
})
