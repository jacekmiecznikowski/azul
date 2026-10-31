import { describe, expect, it } from 'vitest'
import { newGame, legalMoves, sameMove, applyMove, glassInventory } from './engine'
import type { GameState } from './engine'
import { FEATURE_NAMES, TRAINED_WEIGHTS, chooseLearnedMove, moveFeatures } from './learnedPolicy'
import { chooseAIMove } from './ai'

describe('wytrenowany bot Mistrz', () => {
  it('wczytuje kompletny, skończony zestaw parametrów', () => {
    expect(FEATURE_NAMES.length).toBeGreaterThan(10)
    for (const key of FEATURE_NAMES) expect(Number.isFinite(TRAINED_WEIGHTS[key])).toBe(true)
  })
  it('zwraca legalny ruch i nie zmienia stanu', () => {
    for (const opponents of [1, 2, 3]) {
      const state = newGame({ opponents, seed: 1432 + opponents })
      const original = JSON.stringify(state)
      const move = chooseAIMove(state, 'master')
      expect(move).not.toBeNull()
      expect(legalMoves(state).some(legal => move && sameMove(legal, move))).toBe(true)
      expect(JSON.stringify(state)).toBe(original)
      const next = applyMove(state, move!)
      expect(glassInventory(next).total).toBe(100)
    }
  })
  it('ocenia ten sam stan zawsze tak samo', () => {
    const state = newGame({ opponents: 1, seed: 121451 })
    expect(chooseLearnedMove(state)).toEqual(chooseLearnedMove(state))
  })
  it('nie zagląda do kolejności tafli ukrytego woreczka', () => {
    const state = newGame({ opponents: 1, seed: 2397 })
    const modified: GameState = { ...state, bag: [...state.bag].reverse() }
    const move = chooseLearnedMove(state)
    expect(chooseLearnedMove(modified)).toEqual(move)
    if (move) expect(moveFeatures(state, move)).toEqual(moveFeatures(modified, move))
  })
})
