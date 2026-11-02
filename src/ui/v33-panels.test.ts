import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { glassInventory, newGame } from '../game/engine'
import { Market, TurnSummary, PenaltyTrack } from '../App'
import { GlassResources } from '../components/GlassResources'

describe('v33 compact central panels', () => {
  const game = newGame({ opponents: 3, seed: 20261101 })

  it('keeps the five glass locations in header resources rather than inside workshops', () => {
    const market = renderToStaticMarkup(createElement(Market, {
      game, selection: null, disabled: false, onPick: () => {},
    }))
    const header = renderToStaticMarkup(createElement(GlassResources, {game}))
    expect(market).not.toContain('sg-stock-place')
    expect(market).not.toContain('sg-first-token')
    expect(header).toContain('sg-resource-trigger')
    expect(header).toContain('Pokaż zasoby szkła')
    const inventory = glassInventory(game)
    expect(Object.keys(inventory)).toEqual(expect.arrayContaining(['tower', 'table', 'playerBoards', 'roundTrack', 'bag']))
    expect(inventory.roundTrack).toBe(6)
    expect(inventory.total).toBe(100)
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
