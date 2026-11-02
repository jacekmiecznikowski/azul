import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { GLASS_COLOR_LABELS_PL } from '../game/colorLabels'
import { COLORS, newGame } from '../game/engine'
import { LiveHistory } from '../components/LiveHistory'
import { GlassResources } from '../components/GlassResources'
import { Market } from '../App'

const css = readFileSync(new URL('../market-layout-v47.css', import.meta.url), 'utf8')

describe('v47 workshop space, diamond selection and names', () => {
  it('has no inventory/footer inside the playable market, and exposes resources in toolbar', () => {
    const game = newGame({ opponents: 3, seed: 47 })
    const market = renderToStaticMarkup(createElement(Market, { game, selection: null, disabled: false, onPick: () => {} }))
    const resources = renderToStaticMarkup(createElement(GlassResources, { game }))
    expect(market).not.toContain('sg-stock-ledger')
    expect(market).not.toContain('sg-first-token')
    expect(resources).toContain('sg-resource-trigger')
    expect(resources).toContain('aria-expanded="false"')
    expect(resources).not.toContain('100 / 100')
    expect(resources).not.toContain('Żeton pierwszego gracza')
    expect(css).toContain('inset:28px 7px 7px')
  })
  it('has a diamond-shaped hit area and no rectangular selected background', () => {
    const game = newGame({ opponents: 3, seed: 48 })
    const market = renderToStaticMarkup(createElement(Market, {
      game, selection:{source:{type:'factory', index:0}, color:game.factories[0][0]},
      disabled:false, onPick:()=>{},
    }))
    expect(market).toContain('sg-token-selected')
    expect(css).toContain('clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)')
    expect(css).toContain('background:transparent!important')
    expect(css).toContain('.sg-market-token.sg-token-selected::before')
  })
  it('uses physical red blue and white names in the history for every source', () => {
    const game = newGame({ opponents: 1, seed: 49 })
    game.history = COLORS.map((color,i) => ({
      id: i+1, round:1, playerIndex:0, kind:'take' as const, color, picked:1,
      source:{type:'factory' as const,index:0}, placed:1, description:'history',
    }))
    const markup = renderToStaticMarkup(createElement(LiveHistory, {state:game, status:''}))
    COLORS.forEach(color => expect(markup).toContain(`1 × ${GLASS_COLOR_LABELS_PL[color]}`))
    expect(markup).not.toContain('różowe')
    expect(markup).not.toContain('turkusowe')
    expect(markup).not.toContain('szare')
  })
})
