import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { Market } from '../App'
import { GlassPiece, GameBoard } from '../components/GameBoard'
import { COLORS, glassInventory, newGame } from '../game/engine'

const css=readFileSync(new URL('../market-gems-v45.css',import.meta.url),'utf8')

describe('v45 market: visually identical playable diamonds and no floor gaps',()=>{
  it.each([1,2,3])('keeps %i AI opponents with functional 5/7/9 workshops',opponents=>{
    const game=newGame({opponents,seed:450+opponents})
    const html=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    expect((html.match(/class="sg-factory sg-factory-v45/g)??[]).length).toBe(game.factories.length)
    expect(game.factories.length).toBe(2*(opponents+1)+1)
    expect(html).toContain('sg-market-layout-v45')
    expect(html).toContain('sg-market-factories-v45')
    expect(html).toContain('sg-center-v45')
    expect(html).toContain('sg-stock-ledger')
    expect(html).not.toContain('sg-market-circle')
    expect(html).not.toContain('sg-market-ring')
    expect(glassInventory(game).total).toBe(100)
  })
  it('puts the full 4-facet diamond into workshop buttons rather than tiny symbols',()=>{
    const game=newGame({opponents:3,seed:45})
    const html=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    expect((html.match(/sg-market-token sg-market-token-/g)??[]).length)
      .toBe(game.factories.flat().length)
    expect(html).toContain('sg-gem-faceted')
    expect(html).toContain('sg-gem-facet-top')
    expect(css).toContain('--sg-play-gem:28px')
    expect(css).toContain('width:min(var(--sg-play-gem),92%)')
    expect(css).toContain('.sg .sg-pane-socket .sg-glass.sg-gem-faceted')
    expect(css).toContain('width:min(var(--sg-play-gem),88%)')
  })
  it('displays five large central gems with visible counts without losing tiles',()=>{
    const game=newGame({opponents:3,seed:451})
    for(const color of COLORS){
      const index=game.bag.indexOf(color)
      expect(index).toBeGreaterThanOrEqual(0)
      game.center.push(...game.bag.splice(index,1))
    }
    const html=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    expect((html.match(/class="sg-center-choice/g)??[])).toHaveLength(5)
    expect(html).toContain('sg-center-tokens-v45')
    expect(html).toContain('sg-gem-faceted')
    expect(html).toContain('Środek stołu: 1 ×')
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(glassInventory(game).total).toBe(100)
  })
  it('uses exactly the same gem markup and size token on the tabletop and windows',()=>{
    const game=newGame({opponents:3,seed:452})
    const board=renderToStaticMarkup(createElement(GameBoard,{
      player:game.players[0],index:0,isCurrent:true
    }))
    const market=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    const gem=renderToStaticMarkup(createElement(GlassPiece,{color:COLORS[0]}))
    expect(board).toContain('sg-pane-socket')
    expect(market).toContain('sg-glass-placed sg-gem-faceted')
    expect(gem).toContain('sg-gem-faceted')
    expect(css).toContain('.sg .sg-market .sg-center-v45 .sg-center-choice .sg-glass.sg-gem-faceted')
    expect(css).toContain('.sg .sg-market .sg-factory-v45 .sg-market-token .sg-glass.sg-gem-faceted')
    expect(css).toContain('.sg .sg-pane-socket .sg-glass.sg-gem-faceted')
    expect(css).toContain('--sg-play-gem:24px')
  })
  it('removes upper/lower lancet gaps without modifying colored level geometry',()=>{
    expect(css).toContain('.sg .sg-window-lancet')
    expect(css).toContain('padding:0 1px;')
    expect(css).toContain('gap:0;')
    expect(css).toContain('.sg .sg-window-lancet > .sg-pane:first-child')
    expect(css).toContain('.sg .sg-window-lancet > .sg-pane:last-child')
  })
})
