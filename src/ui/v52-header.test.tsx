import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { RoundTracker } from '../components/RoundTracker'
import { GlassResources } from '../components/GlassResources'
import { COLORS, newGame, glassInventory } from '../game/engine'

const style = readFileSync(new URL('../header-premium-v52.css', import.meta.url), 'utf8')

describe('v52 – premium physical glass round tracker and responsive stock', () => {
  it.each([1, 2, 3, 4, 5, 6])('renders six identical faceted glass pieces in round %i', round => {
    const colors = [...COLORS, COLORS[0]]
    const html = renderToStaticMarkup(createElement(RoundTracker, {round,colors}))
    expect((html.match(/class="sg-round-v52-step(?: sg-round-v52-(?:active|past|future))?"/g) ?? [])).toHaveLength(6)
    expect((html.match(/sg-glass-placed sg-gem-faceted/g) ?? [])).toHaveLength(6)
    expect(html).not.toContain('sg-color-dot')
    expect((html.match(/aria-current="step"/g) ?? [])).toHaveLength(1)
    expect(html).toContain('sg-round-v52-active')
    expect(html).toContain(`Runda ${round} z 6`)
  })

  it('always shows five stock sources on full screens without claiming 100 is a variable resource', () => {
    const state = newGame({opponents:3,seed:52})
    const html = renderToStaticMarkup(createElement(GlassResources,{game:state}))
    const stock = glassInventory(state)
    expect(stock.total).toBe(100)
    expect((html.match(/class="sg-resource-ribbon-item"/g)??[])).toHaveLength(5)
    for(const value of [stock.tower,stock.table,stock.playerBoards,stock.roundTrack,stock.bag])
      expect(html).toContain(`sg-resource-ribbon-value">${value}`)
    expect(html).not.toContain('100 / 100')
    expect(html).toContain('Pokaż zasoby szkła')
    expect(html).toContain('aria-controls="sg-resources-popover"')
  })

  it('reserves the full ribbon only for large screens, with a mobile dropdown', () => {
    expect(style).toContain('@media (min-width:1700px) and (min-height:650px)')
    expect(style).toContain('.sg .sg-header .sg-resource-ribbon')
    expect(style).toContain('.sg .sg-header .sg-resource-trigger {display:none;}')
    expect(style).toContain('@media (max-width:1100px), (max-height:620px)')
    expect(style).toContain('.sg .sg-header .sg-round-v52-gem .sg-glass.sg-gem-faceted')
    expect(style).toContain('aspect-ratio:1')
  })
})
