import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { RoundTracker } from '../components/RoundTracker'
import { GameBoard } from '../components/GameBoard'
import { RoundAnnouncement } from '../components/RoundAnnouncement'
import { COLORS, newGame } from '../game/engine'

const css = readFileSync(new URL('../header-ceremony-glazier-v54.css', import.meta.url),'utf8')

describe('v54 desktop center, cinema round and violet glazier', () => {
  it('includes the featured glass/color and all 6 stage markers', () => {
    const html=renderToStaticMarkup(createElement(RoundTracker,{round:3,colors:[...COLORS,COLORS[0]]}))
    expect(html).toContain('sg-round-v54-bonus')
    expect(html).toContain('PREMIOWANY KOLOR')
    expect(html).toContain('sg-round-v54-featured-gem')
    expect((html.match(/sg-glass-placed sg-gem-faceted/g)||[])).toHaveLength(1)
    expect((html.match(/sg-round-v52-step sg-round-v52-/g)||[])).toHaveLength(0)
    expect(html).toContain('NIEBIESKIE')
  })
  it('centers with symmetric header grid and scales controls together', () => {
    expect(css).toContain('grid-template-columns:minmax(0,1fr) minmax(345px,430px) minmax(0,1fr)')
    expect(css).toContain('height:76px')
    expect(css).toContain('height:44px')
    expect(css).toContain('sg-round-v54-bonus')
    expect(css).toContain('grid-column:2;')
    expect(css).toContain('grid-row:1;')
  })
  it('darkens and blurs backdrop while the round panel fills the visual focus', () => {
    const announcement=renderToStaticMarkup(createElement(RoundAnnouncement,{round:4,color:'rose'}))
    expect(announcement).toContain('RUNDA')
    expect(announcement).toContain('CZERWONY')
    expect(css).toContain('backdrop-filter:blur(10px) brightness(.36)')
    expect(css).toContain('width:min(760px,86vw)')
    expect(css).toContain('z-index:90')
  })
  it('uses a purple glazier border and medallion without tinting the five floors', () => {
    const game=newGame({opponents:1,seed:54})
    const board=renderToStaticMarkup(createElement(GameBoard,{player:game.players[0],index:0,isCurrent:true}))
    expect((board.match(/data-sg-glazier="true"/g)||[])).toHaveLength(1)
    expect(css).toContain('border:1px solid #cc96ff!important')
    expect(css).toContain('background:radial-gradient(circle at 30% 15%,#d9b6fc')
  })
})
