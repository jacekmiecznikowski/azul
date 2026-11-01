import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { finalBreakdown, newGame } from '../game/engine'
import { GameBoard, ornamentBonus } from './GameBoard'

function renderBoard() {
  const game = newGame({ opponents: 1, palaceSide: 'A', seed: 20261101 })
  const player = game.players[0]
  return { player, markup: () => renderToStaticMarkup(
    createElement(GameBoard, { player, index: 0, isCurrent: true, palaceSide: 'A' }),
  ) }
}

describe('paired ornamental windows', () => {
  it('connects the eight original interactive windows as four exact scoring pairs', () => {
    const { markup } = renderBoard()
    const html = markup()
    expect((html.match(/data-sg-ornament="/g) ?? []).length).toBe(4)
    for (let pair = 0; pair < 4; pair++) {
      expect(html).toContain(`data-sg-ornament="${pair}"`)
      expect(html).toContain(`kwatery ${pair * 2 + 1} i ${pair * 2 + 2}`)
    }
    expect((html.match(/data-sg-window="/g) ?? []).length).toBe(8)
    for (let window = 0; window < 8; window++) expect(html).toContain(`data-sg-window="${window}"`)
    expect((html.match(/sg-ornament-crown/g) ?? []).length).toBe(4)
    expect((html.match(/sg-ornament-petal"/g) ?? []).length).toBe(16)
    expect((html.match(/data-ornament-progress="0"/g) ?? []).length).toBe(4)
  })

  it('reveals separately completed halves and lights exactly three of four petals', () => {
    const { player, markup } = renderBoard()
    player.strips[0].side = 2
    player.strips[1].side = 1
    const html = markup()
    expect(html).toContain('data-sg-ornament="0" data-ornament-progress="3"')
    expect(html).toContain('Premia pałacu A: 6 pkt')
    expect((html.match(/sg-ornament-petal-lit/g) ?? []).length).toBe(3)
    expect((html.match(/sg-ornament-wing-full/g) ?? []).length).toBe(1)
    expect((html.match(/sg-ornament-wing-lit/g) ?? []).length).toBe(2)
    expect((html.match(/data-ornament-progress="0"/g) ?? []).length).toBe(3)
  })

  it('connects both complete strips into a single golden full ornament', () => {
    const { player, markup } = renderBoard()
    player.strips[6].side = 2
    player.strips[7].side = 2
    const html = markup()
    expect(html).toContain('data-sg-ornament="3" data-ornament-progress="4"')
    expect(html).toContain('sg-ornament-complete')
    expect((html.match(/sg-ornament-petal-lit/g) ?? []).length).toBe(4)
    expect(html).toContain('Premia pałacu A: 10 pkt')
    expect((html.match(/sg-window-completed/g) ?? []).length).toBe(2)
  })

  it('matches the Palace A final-scoring progression of 0, 3, 6 and 10 points', () => {
    expect([0, 1, 2, 3, 4].map(ornamentBonus)).toEqual([0, 0, 3, 6, 10])
    const { player } = renderBoard()
    const strips = player.strips
    strips[0].upper = 'rose'
    strips[0].lower = 'slate'
    strips[1].upper = 'cyan'
    expect(finalBreakdown(player, 'A').palaceDetails[0]).toBe(ornamentBonus(3))
    strips[1].lower = 'amber'
    expect(finalBreakdown(player, 'A').palaceDetails[0]).toBe(ornamentBonus(4))
  })

  it('does not claim Palace A pair bonuses when Palace B is selected', () => {
    const { player } = renderBoard()
    const html = renderToStaticMarkup(createElement(GameBoard, {
      player, index: 0, isCurrent: false, palaceSide: 'B',
    }))
    expect(html).toContain('Na stronie B premia zależy od dominującego koloru szkła')
    expect(html).not.toContain('Premia pałacu A:')
  })
})
