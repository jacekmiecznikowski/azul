import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { Market } from '../App'
import { GlassPiece, GameBoard } from '../components/GameBoard'
import { StainedGlassPane } from '../components/EmptyGlassSocket'
import { CutGlassDiamond } from '../components/CutGlassDiamond'
import { COLORS, glassInventory, newGame } from '../game/engine'

describe('v42: shared glass geometry and rectangular workshops',()=>{
  const css=readFileSync(new URL('../workshops-v42.css',import.meta.url),'utf8')

  it('renders precisely the same diamond markup in a workshop and a filled window',()=>{
    for(const color of COLORS){
      const marketTile=renderToStaticMarkup(createElement(GlassPiece,{color}))
      const filled=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:true}))
      const cut=renderToStaticMarkup(createElement(CutGlassDiamond,{color}))
      const empty=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:false}))
      expect(marketTile).toBe(filled)
      expect(cut).toBe(filled)
      for(const html of [filled,empty]){
        expect(html).toContain('sg-glass-diamond-v42')
        expect(html).toContain('sg-glass-diamond-core-v42')
        expect(html).toContain('sg-stained-pane-'+color)
      }
      expect(empty).toContain('sg-glass-diamond-empty')
      expect(filled).toContain('sg-glass-diamond-filled')
      expect(empty).not.toContain('sg-glass-diamond-filled')
    }
    expect(css).toContain('--sg-pane-size:32px')
    expect(css).toContain('width:var(--sg-pane-size)')
    expect(css).toContain('sg-glass-diamond-v42')
  })

  it.each([1,2,3])('uses a rectangular 3-column factory grid with %i opponents', opponents => {
    const game=newGame({opponents,seed:opponents*42})
    const html=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    expect((html.match(/class="sg-factory sg-factory-v42/g)||[]).length).toBe(game.factories.length)
    expect(html).toContain('sg-market-factories-v42')
    expect(html).toContain('sg-market-workspace-v42')
    expect(html).toContain('sg-center-pile-v42')
    expect(html).not.toContain('sg-market-circle-v41')
    expect(html).not.toContain('sg-market-ring-v41')
    expect(html).toContain('grid-template-rows:repeat(')
    expect(html).toContain('sg-stock-ledger')
    expect(glassInventory(game).total).toBe(100)
  })

  it('keeps all five colored center choices available and their size defined by one token',()=>{
    const game=newGame({opponents:3,seed:42})
    for(const color of COLORS){
      const index=game.bag.indexOf(color)
      expect(index).toBeGreaterThanOrEqual(0)
      game.center.push(...game.bag.splice(index,1))
    }
    const html=renderToStaticMarkup(createElement(Market,{
      game,selection:null,disabled:false,onPick:()=>{}
    }))
    expect((html.match(/class="sg-center-choice/g)||[])).toHaveLength(5)
    expect(html).toContain('sg-center-tokens-v42')
    expect(html).toContain('grid-template-rows:repeat(3,')
    expect(html).toContain('aria-label="Środek stołu: 1 ×')
    expect(html).toContain('sg-glass-diamond-filled')
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(css).toContain('touch-action:manipulation')
    expect(glassInventory(game).total).toBe(100)
  })

  it('preserves player glazier and forty initial panes',()=>{
    const state=newGame({opponents:3,seed:43})
    const markup=renderToStaticMarkup(createElement(GameBoard,{player:state.players[0],index:0,isCurrent:true}))
    expect((markup.match(/class="sg-empty-socket /g)||[])).toHaveLength(40)
    expect((markup.match(/sg-glazier-arrow/g)||[])).toHaveLength(1)
  })
})
