import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { COLORS, newGame } from '../game/engine'
import { StainedGlassPane } from '../components/EmptyGlassSocket'
import { GameBoard } from '../components/GameBoard'
import { Glass, WindowCard } from '../components/WindowBoard'

describe('v39: an identical stained-glass mounting in both states', () => {
  const css = readFileSync(new URL('../glass-panes-v39.css', import.meta.url), 'utf8')
  it('shares one frame and four colored facets for both empty and filled', () => {
    for(const color of [...COLORS,'wild'] as const) {
      const empty=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:false}))
      const filled=renderToStaticMarkup(createElement(StainedGlassPane,{color,filled:true}))
      for(const part of ['sg-stained-pane-'+color,'sg-stained-frame','sg-socket-shard-nw',
        'sg-socket-shard-ne','sg-socket-shard-se','sg-socket-shard-sw','sg-socket-core']) {
        expect(empty).toContain(part)
        expect(filled).toContain(part)
      }
      expect(empty).toContain('Puste pole')
      expect(filled).toContain('Ułożona tafla')
      expect(empty).not.toContain('sg-glass-placed')
      expect(filled).toContain('sg-glass-placed')
      expect(filled).not.toContain('sg-empty-socket')
    }
  })
  it('renders on both tabletop and classic boards without altering slot counts', () => {
    const game=newGame({opponents:3,seed:39})
    const board=renderToStaticMarkup(createElement(GameBoard,{player:game.players[0],index:0,isCurrent:true}))
    expect((board.match(/class="sg-empty-socket /g)||[])).toHaveLength(40)
    const legacy=renderToStaticMarkup(createElement(WindowCard,{
      strip:game.players[0].strips[0],index:0,glazier:0,
      highlighted:false,active:false,onClick:()=>{},isHumanTurn:false
    }))
    expect((legacy.match(/class="sg-empty-socket /g)||[])).toHaveLength(5)
    expect(renderToStaticMarkup(createElement(Glass,{color:'amber',pane:true}))).toContain('sg-stained-pane-filled')
  })
  it('uses a restrained, distinguishable six-tone visual palette (five physical + joker)', () => {
    for(const hex of ['#A94452','#D7BE63','#4B90AE','#B96E4E','#DCE5E3','#8E6BAF'])expect(css).toContain(hex)
    for(const neon of ['#FFD60A','#F35B04','#1FB6FF','#B81FFF'])expect(css).not.toContain(neon)
    expect(COLORS).toHaveLength(5)
    expect(newGame({opponents:3,seed:9}).roundColors).toHaveLength(6)
  })
})
