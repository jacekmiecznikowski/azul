import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Market } from '../App'
import { newGame, COLORS } from '../game/engine'

describe('v40: cut glass diamonds in workshops', () => {
  const css=readFileSync(new URL('../glass-polish-v40.css',import.meta.url),'utf8')
  it('uses a dark blue and muted straw yellow, without replacing physical colors', () => {
    expect(css).toContain('#397995')
    expect(css).toContain('#D8C579')
    expect(css).not.toContain('#FFD60A')
    expect(COLORS).toHaveLength(5)
  })
  it('renders true diamonds in both factory and center selections', () => {
    expect(css).toContain('.sg-factory-grid .sg-market-token .sg-glass.sg-glass-placed')
    expect(css).toContain('.sg-center-tokens .sg-center-choice .sg-glass.sg-glass-placed')
    expect(css).toContain('transform:rotate(45deg) scale(.70)')
    expect(css).toContain('clip-path:none')
    expect(css).toContain('touch-action:manipulation')
    expect(css).toContain(':focus-visible')
  })
  it('retains action buttons, scores and glass selection semantics', () => {
    const game=newGame({opponents:3,seed:40})
    // Move one physical piece into the centre: an untouched starting board
    // has an empty middle and cannot exercise its selectable diamonds.
    const tile = game.factories[0].shift()
    if (!tile) throw new Error('Starting factory unexpectedly empty')
    game.center.push(tile)
    const html=renderToStaticMarkup(createElement(Market,{
      game,selection:null,disabled:false,onPick:()=>{},
    }))
    expect((html.match(/sg-market-token sg-market-token-/g)||[]).length)
      .toBe(game.factories.flat().length)
    expect(html).toContain('sg-factory-grid')
    expect(html).toContain('Warsztat 1')
    expect(html).toContain('sg-center-choice')
    expect(html).toContain('sg-stock-ledger')
  })
})
