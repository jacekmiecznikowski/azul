import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BROKEN_TRACK, newGame } from '../game/engine'
import { PenaltyTrack, TurnSummary } from '../App'

describe('v32 middle-panel presentation', () => {
  const game = newGame({ opponents: 3, seed: 213 })

  it('removes the status dot solely from the PRZY STOLE title', () => {
    const markup = renderToStaticMarkup(createElement(TurnSummary, { game }))
    expect(markup).toContain('PRZY STOLE')
    expect(markup).not.toContain('sg-live-dot')
    expect(markup).toContain('sg-score-current')
  })
  it('keeps all 9 real glass-penalty milestones, including the final -18', () => {
    const markup = renderToStaticMarkup(createElement(PenaltyTrack, { game }))
    expect((markup.match(/<div class="sg-track-step(?=[ "])/g) ?? [])).toHaveLength(BROKEN_TRACK.length)
    expect(markup).toContain('−18')
    expect(markup).toContain('sg-track-occupied')
    expect(markup).not.toContain('sg-track-legend')
    expect(markup).not.toContain('/8</b>')
  })

  it('keeps the 100-glass accounting invariant and all six round markers', async () => {
    const { glassInventory, legalMoves, applyMove } = await import('../game/engine')
    for (const seed of [1, 42, 213]) {
      let state = newGame({ opponents: 3, seed })
      for (let moveIndex = 0; moveIndex < 45 && state.phase === 'playing'; moveIndex++) {
        const inv = glassInventory(state)
        expect(inv.total).toBe(100)
        expect(inv.roundTrack).toBe(7 - state.round)
        const action = legalMoves(state)[0]
        state = applyMove(state, action)
      }
      expect(glassInventory(state).total).toBe(100)
    }
  })

})
