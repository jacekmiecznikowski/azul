import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { newGame } from '../game/engine'
import { GameBoard } from './GameBoard'
import { TableAmbient } from './TableAmbient'
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

describe('tabletop visual ambience', () => {
  it('has many glowing particles and is an entirely decorative, pointer-transparent layer', () => {
    const markup = renderToStaticMarkup(createElement(TableAmbient, { enabled: true }))
    expect(markup.match(/sg-table-mote-/g)?.length).toBe(78)
    expect(markup).toContain('sg-table-caustic-a')
    expect(markup).toContain('sg-table-caustic-b')
    expect(markup).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(createElement(TableAmbient, { enabled: false }))).toBe('')
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
