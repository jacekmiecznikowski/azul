import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmptyGlassSocket, EMPTY_SLOT_LABELS } from '../components/EmptyGlassSocket'
import { GameBoard, GlassPiece } from '../components/GameBoard'
import { Glass, WindowCard } from '../components/WindowBoard'
import { COLORS, newGame } from '../game/engine'

describe('v37: bold empty sockets, real tiles and accessible glazier', () => {
  it('preserves 20 pieces of each of the FIVE physical colors (not six)', () => {
    const state = newGame({ opponents: 3, seed: 37 })
    expect(COLORS).toHaveLength(5)
    for (const color of COLORS) {
      const physical = state.bag.filter(x=>x===color).length +
        state.factories.flat().filter(x=>x===color).length +
        state.roundColors.filter(x=>x===color).length
      expect(physical).toBe(20)
    }
    expect(EMPTY_SLOT_LABELS.wild).toContain('joker')
  })
  it('has four LARGE colored shards around a genuinely dark/empty centre', () => {
    for (const color of [...COLORS, 'wild'] as const) {
      const html = renderToStaticMarkup(createElement(EmptyGlassSocket,{color}))
      expect(html).toContain('sg-empty-socket-'+color)
      expect(html).toContain('Puste pole')
      expect((html.match(/sg-socket-shard sg-socket-shard-/g) ?? [])).toHaveLength(4)
      expect(html).toContain('sg-socket-core')
      expect(html).not.toContain('sg-glass-placed')
    }
  })
  it('shows a different component for a PLACED pane than an empty pane in both boards', () => {
    const empty=renderToStaticMarkup(createElement(GlassPiece,{color:'amber',placed:false}))
    const full=renderToStaticMarkup(createElement(GlassPiece,{color:'amber',placed:true}))
    const other=renderToStaticMarkup(createElement(Glass,{color:'amber',ghost:true}))
    expect(empty).toContain('sg-empty-socket-amber')
    expect(other).toContain('sg-empty-socket-amber')
    expect(full).toContain('sg-glass-placed')
    expect(full).not.toContain('sg-empty-socket')
  })
  it('shows glazier location AND the unchanged forty initially empty board panes', () => {
    const state=newGame({opponents:3,seed:83})
    const html=renderToStaticMarkup(createElement(GameBoard,{player:state.players[0],index:0,isCurrent:true}))
    expect((html.match(/class="sg-empty-socket /g) ?? [])).toHaveLength(40)
    expect((html.match(/sg-glazier-arrow/g) ?? [])).toHaveLength(1)
    expect((html.match(/sg-window-active/g) ?? [])).toHaveLength(1)
    const legacy=renderToStaticMarkup(createElement(WindowCard,{
      strip:state.players[0].strips[0], index:0, glazier:0,
      highlighted:false,active:false,onClick:()=>{},isHumanTurn:false
    }))
    expect(legacy).toContain('artisan-arrow')
    expect((legacy.match(/class="sg-empty-socket /g) ?? [])).toHaveLength(5)
  })
})
