import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { CutGlassDiamond } from '../components/CutGlassDiamond'
import { StainedGlassPane } from '../components/EmptyGlassSocket'
import { GlassPiece } from '../components/GameBoard'
import { Market } from '../App'
import { COLORS, newGame } from '../game/engine'

describe('v41: physically identical glass and larger, contained workshop center',()=>{
  const css=readFileSync(new URL('../workshops-v42.css',import.meta.url),'utf8')
  it('reuses the exact same physical diamond in workshops and filled windows',()=>{
    for(const color of COLORS){
      const diamond=renderToStaticMarkup(createElement(CutGlassDiamond,{color}))
      const loose=renderToStaticMarkup(createElement(GlassPiece,{color}))
      const filled=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:true}))
      const empty=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:false}))
      expect(loose).toBe(diamond)
      expect(filled).toContain(diamond)
      expect(empty).not.toContain('sg-cut-diamond')
      expect(empty).toContain('sg-socket-core')
    }
    expect(css).toContain('sg-glass-diamond-v42')
  })
  it('shows up to all FIVE center choices in a two-column grid, not a spilling list',()=>{
    const game=newGame({opponents:3,seed:41})
    const pile=COLORS.flatMap(c=>[c,c])
    // Use valid pieces taken out of the bag, keeping the game conservation invariant.
    pile.forEach(c=>{
      const n=game.bag.indexOf(c)
      expect(n).toBeGreaterThanOrEqual(0)
      game.bag.splice(n,1)
      game.center.push(c)
    })
    const html=renderToStaticMarkup(createElement(Market,{game,selection:null,disabled:false,onPick:()=>{}}))
    expect(html).toContain('sg-center-tokens-v42')
    expect((html.match(/class="sg-center-choice/g)||[])).toHaveLength(5)
    const names=['czerwone','żółte','niebieskie','pomarańczowe','białe']
    for (const name of names) expect(html).toContain(`Środek stołu: 2 × ${name} tafle`)
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(css).toContain('sg-center-pile-v42')
  })
  it('preserves 100 glass pieces in the engine',()=>{
    const g=newGame({opponents:3,seed:41})
    const count=g.bag.length+g.factories.flat().length+g.roundColors.length+g.center.length+g.tower.length+
      g.players.reduce((n,p)=>n+p.strips.reduce((z,s)=>z+s.panes.filter(Boolean).length,0),0)
    expect(count).toBe(100)
  })
})
