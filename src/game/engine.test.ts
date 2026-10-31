import { describe, expect, it } from 'vitest'
import { applyMove, availableSources, availableTargets, COLORS, FACTORY_COUNT, legalMoves, newGame, patternFor, standings } from './engine'
import { chooseAIMove } from './ai'
import type { GameState } from './engine'

function countGlass(state: GameState): number {
  const bag = state.bag.length + state.tower.length
  const table = state.center.length + state.factories.flat().length
  const panes = state.players.reduce((sum, player) => sum + player.strips.reduce((s, strip) =>
    s + strip.panes.filter(Boolean).length + Number(!!strip.upper) + Number(!!strip.lower), 0), 0)
  const marker = state.phase === 'finished' ? 0 : (7 - state.round)
  return bag + table + panes + marker
}

describe('silnik Sintra', () => {
  it('rozstawia 5/7/9 warsztatów i 100 tafli', () => {
    for (const opponents of [1, 2, 3]) {
      const game = newGame({ opponents, seed: 123 })
      expect(game.factories).toHaveLength(FACTORY_COUNT[opponents + 1])
      expect(game.factories.every((factory) => factory.length === 4)).toBe(true)
      expect(game.players.every((player) => player.strips.length === 8)).toBe(true)
      expect(countGlass(game)).toBe(100)
    }
  })
  it('po pobraniu z warsztatu odkłada resztę do środka; nie mutuje stanu', () => {
    const game = newGame({ opponents: 1, seed: 7 })
    const move = legalMoves(game).find((m) => m.kind === 'take' && m.source.type === 'factory')!
    expect(move.kind).toBe('take')
    if (move.kind !== 'take' || move.source.type !== 'factory') return
    const original = [...game.factories[move.source.index]]
    const next = applyMove(game, move)
    expect(next.factories[move.source.index]).toHaveLength(0)
    expect(next.center).toHaveLength(original.filter((c) => c !== move.color).length)
    expect(game.factories[move.source.index]).toEqual(original)
    expect(countGlass(next)).toBe(100)
  })
  it('odrzuca nielegalne ruchy i blokuje pozycje po lewej', () => {
    const state = newGame({ opponents: 1, seed: 15 })
    state.players[0].glazier = 4
    expect(availableTargets(state, COLORS[0]).every((index) => index >= 4)).toBe(true)
    expect(() => applyMove(state, { kind: 'take', source: { type: 'center' }, color: 'rose', windowIndex: 0 })).toThrow()
    expect(legalMoves(state).some((m) => m.kind === 'reset')).toBe(true)
  })
  it('rozegranie pełnej partii przez boty kończy grę bez gubienia tafli', () => {
    for (const seed of [11, 33, 224]) {
      let state = newGame({ opponents: 3, seed, palaceSide: 'B' })
      let steps = 0
      while (state.phase !== 'finished' && steps++ < 500) {
        const move = chooseAIMove(state, 'hard')
        expect(move).not.toBeNull()
        state = applyMove(state, move!)
        expect(countGlass(state)).toBe(100)
      }
      expect(state.phase).toBe('finished')
      expect(state.round).toBe(6)
      expect(state.players.every((player) => Number.isFinite(player.score))).toBe(true)
      expect(standings(state)).toHaveLength(4)
    }
  })
  it('pola joker znajdują się tylko na rewersie odpowiedniej kwatery', () => {
    const state = newGame({ opponents: 1, seed: 42 })
    const special = state.players[0].strips.find((strip) => strip.back.includes('wild'))!
    expect(patternFor(special)).not.toContain('wild')
    special.side = 1
    expect(patternFor(special).filter((c) => c === 'wild')).toHaveLength(2)
  })
  it('poprawnie wykrywa dostępne źródła', () => {
    const state = newGame({ opponents: 1, seed: 100 })
    expect(availableSources(state).reduce((sum, source) => sum + source.count, 0)).toBe(20)
  })
})
