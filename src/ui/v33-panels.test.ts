import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { glassInventory, newGame } from '../game/engine'
import { Market, TurnSummary, PenaltyTrack } from '../App'

describe('v33 compact central panels', () => {
  const game = newGame({ opponents: 3, seed: 20261101 })

  it('renders five separate glass locations including the six bonus markers', () => {
    const html = renderToStaticMarkup(createElement(Market, {
      game, selection: null, disabled: false, onPick: () => {},
    }))
    expect((html.match(/class="sg-stock-place/g) || [])).toHaveLength(5)
    for (const label of ['Na stole','Witraże','Woreczek','Wieża','Premie rund']) {
      expect(html).toContain(label)
    }
    expect(html).not.toContain('100/100')
    expect(html).toContain('>6</strong>')
    expect(glassInventory(game).total).toBe(100)
  })

  it('retains four active-player scoreboard entries without a duplicated glass legend', () => {
    const turn = renderToStaticMarkup(createElement(TurnSummary, { game }))
    const glass = renderToStaticMarkup(createElement(PenaltyTrack, { game }))
    expect((turn.match(/class="sg-score-line/g) || [])).toHaveLength(4)
    expect(glass).not.toContain('sg-track-legend')
    expect((glass.match(/<div class="sg-track-step(?=[ "])/g) || [])).toHaveLength(9)
    expect(glass).toContain('sg-track-pawns')
  })
})
