import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { GameBoard, GlassPiece } from '../components/GameBoard'
import { COLORS, glassInventory, newGame, patternFor } from '../game/engine'

const render = (player: ReturnType<typeof newGame>['players'][number]) =>
  renderToStaticMarkup(createElement(GameBoard, { player, index:0, isCurrent:true }))

describe('v44 ornate stained glass; same colored floors before and after placement', () => {
  const css=readFileSync(new URL('../stained-glass-v44.css',import.meta.url),'utf8')

  it('renders 40 full-color glass floors and exactly 40 empty center sockets', () => {
    const game=newGame({ opponents:3, seed:44 })
    const html=render(game.players[0])
    expect((html.match(/data-sg-pane="/g) ?? []).length).toBe(40)
    expect((html.match(/sg-pane-lead/g) ?? []).length).toBe(40)
    expect((html.match(/sg-pane-empty-diamond/g) ?? []).length).toBe(40)
    for(const c of ['rose','citrine','cyan','amber','slate']) {
      expect(css).toContain('.sg-pane-'+c)
    }
    expect(glassInventory(game).total).toBe(100)
  })

  it('preserves a row background when a matching jewel fills its socket', () => {
    const game=newGame({ opponents:3, seed:45 })
    const strip=game.players[0].strips[0]
    const target=patternFor(strip)[0]
    const color=target==='wild'?'rose':target
    const before=render(game.players[0])
    expect(before).toContain('sg-pane-'+target)
    strip.panes[0]=color
    const after=render(game.players[0])
    expect(after).toContain('sg-pane-'+target+' sg-pane-filled')
    expect(after).toContain('sg-gem-faceted')
    expect(after).toContain('sg-gem-facet-top')
    expect((after.match(/sg-pane-empty-diamond/g)??[]).length).toBe(39)
    expect((after.match(/data-sg-pane="/g)??[]).length).toBe(40)
    // The CSS paints the floor from the required pattern, never from placed state.
    expect(css).toContain('.sg .sg-pane,')
    expect(css).toContain('.sg .sg-pane.sg-pane-filled')
    expect(css).not.toContain('.sg-pane-filled {background:')
  })

  it('shows both physically functional bonus-glass sockets in a larger gold footer', () => {
    const game=newGame({ opponents:3, seed:46 })
    const html=render(game.players[0])
    expect((html.match(/class="sg-kept-slot"/g)??[]).length).toBe(16)
    expect((html.match(/sg-kept-empty/g)??[]).length).toBe(16)
    game.players[0].strips[4].upper='cyan'
    game.players[0].strips[4].lower='slate'
    const after=render(game.players[0])
    expect((after.match(/sg-kept-empty/g)??[]).length).toBe(14)
    expect(after).toContain('Górna ozdoba: szkło ułożone')
    expect(after).toContain('Dolna ozdoba: szkło ułożone')
    expect(css).toContain('sg-window-kept>span.sg-kept-slot')
  })

  it('uses one faceted gemstone style in the source market and the fitted window', () => {
    for(const c of COLORS){
      const markup=renderToStaticMarkup(createElement(GlassPiece,{color:c}))
      expect(markup).toContain('sg-glass-'+c)
      expect(markup).toContain('sg-gem-faceted')
      expect((markup.match(/sg-gem-facet sg-gem-facet-/g)??[]).length).toBe(4)
    }
    const small=renderToStaticMarkup(createElement(GlassPiece,{color:'cyan',small:true}))
    expect(small).toContain('sg-glass-small')
    expect(css).toContain('--sg-gem-size:38px')
  })
})
