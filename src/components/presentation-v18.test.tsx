import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { newGame } from '../game/engine'
import { GameBoard } from './GameBoard'
import { GlassVisualEffects } from './GlassVisualEffects'
import { GameMenu } from './GameMenu'

describe('completed window presentation', () => {
  it('centers GOTOWE in the available aperture and hides the reverse preview of only finished windows', () => {
    const game = newGame({ opponents: 1, seed: 80127, palaceSide: 'A' })
    const player = game.players[0]
    const original = renderToStaticMarkup(createElement(GameBoard, {
      player, index: 0, isCurrent: false,
    }))
    expect(original.match(/aria-label="Podgląd drugiej strony"/g)?.length).toBe(8)
    player.strips[6].side = 2
    const finished = renderToStaticMarkup(createElement(GameBoard, {
      player, index: 0, isCurrent: false,
    }))
    expect(finished.match(/aria-label="Podgląd drugiej strony"/g)?.length).toBe(7)
    expect(finished).toContain('sg-window-completed')
    expect(finished).toContain('sg-finished')
    expect(finished).toContain('GOTOWE')
    expect(finished).toContain('data-sg-window="6"')
  })
})

describe('gameplay-only visual effects', () => {
  it('renders particles only while a glass-placement event is active', () => {
    const empty = renderToStaticMarkup(createElement(GlassVisualEffects, { bursts: [] }))
    expect(empty).toBe('')
    const placed = renderToStaticMarkup(createElement(GlassVisualEffects, {
      bursts: [{ id: 1, kind: 'glass', x: 100, y: 120, color: '#6ac5df' }],
    }))
    expect(placed).toContain('sg-vfx-layer')
    expect(placed).toContain('sg-vfx-spark')
    expect(placed).not.toContain('<canvas')
  })

  it('still displays floating scoring feedback for real moves', () => {
    const markup = renderToStaticMarkup(createElement(GlassVisualEffects, {
      bursts: [{ id: 2, kind: 'score', x: 200, y: 140,
        color: '#f6df98', label: '+8 pkt', positive: true }],
    }))
    expect(markup).toContain('+8 pkt')
    expect(markup).toContain('sg-vfx-positive')
  })
})

describe('header menu', () => {
  it('renders one consolidated trigger with stateful audio and effects options available in the menu', () => {
    const markup = renderToStaticMarkup(createElement(GameMenu, {
      effectsEnabled: true, reducedMotion: false, toggleEffects: () => {},
      musicEnabled: true, musicUnavailable: false, toggleMusic: () => {},
      soundEnabled: true, toggleSound: () => {}, openRules: () => {}, openStrategy: () => {},
    }))
    expect(markup).toContain('Otwórz menu gry')
    expect(markup).toContain('aria-expanded="false"')
  })
})
