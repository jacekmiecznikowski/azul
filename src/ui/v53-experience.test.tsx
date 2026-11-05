import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { newGame, legalMoves } from '../game/engine'
import type { Move } from '../game/engine'
import { RoundAnnouncement } from '../components/RoundAnnouncement'
import { GameBoard } from '../components/GameBoard'
import { ManualPlacementDialog } from '../components/ManualPlacementDialog'
import { CompactScores } from '../components/ScorePanels'

const styles = readFileSync(new URL('../experience-polish-v53.css', import.meta.url), 'utf8')

describe('v53 – round announcement, readable status, glazier and manual placement', () => {
  it('announces the round and premium color with a genuine faceted glass', () => {
    const html = renderToStaticMarkup(createElement(RoundAnnouncement, { round:4, color:'rose' }))
    expect(html).toContain('RUNDA')
    expect(html).toContain('>4</strong>')
    expect(html).toContain('PREMIOWANY KOLOR')
    expect(html).toContain('CZERWONY')
    expect(html).toContain('sg-glass-placed sg-gem-faceted')
    expect(html).toContain('aria-live="polite"')
    expect(styles).toContain('pointer-events:none')
    expect(styles).toContain('@media (prefers-reduced-motion:reduce)')
  })
  it('reports who started and who will start next, with no duplicate token icon', () => {
    const state = newGame({ opponents:3, seed:53 })
    const started = renderToStaticMarkup(createElement(CompactScores,{game:state}))
    expect(started).toContain('Rozpoczyna:')
    expect(started).not.toContain('sg-turn-token-icon')
    state.firstCenterTaken = true
    state.nextStartingPlayer = 1
    const next = renderToStaticMarkup(createElement(CompactScores,{game:state}))
    expect(next).toContain('Następna runda:')
    expect(next).toContain(state.players[1].name)
  })
  it('makes the only glazier window unmistakably distinct, without changing the pane colors', () => {
    const game = newGame({ opponents:1, seed:54 })
    const board = renderToStaticMarkup(createElement(GameBoard,{
      player:game.players[0],index:0,isCurrent:true,
    }))
    expect((board.match(/data-sg-glazier="true"/g)??[])).toHaveLength(1)
    expect((board.match(/sg-window-active/g)??[])).toHaveLength(1)
    expect(styles).toContain('.sg .sg-board-windows .sg-window.sg-window-active')
    expect(styles).toContain('border:2px solid #f7d18b')
  })
  it('renders manual choice as five actual palace floors with dark empty diamond sockets', () => {
    const game = newGame({ opponents:1, seed:55 })
    const candidate = legalMoves(game).find((move): move is Extract<Move,{kind:'take'}> =>
      move.kind === 'take' && move.windowIndex !== null)
    expect(candidate).toBeDefined()
    if (!candidate || candidate.windowIndex === null) return
    const html = renderToStaticMarkup(createElement(ManualPlacementDialog,{
      strip:game.players[game.currentPlayer].strips[candidate.windowIndex],
      candidates:[candidate],picked:1,onClose:()=>{},onConfirm:()=>{},
    }))
    expect((html.match(/sg-manual-pane-field sg-pane-/g)??[])).toHaveLength(5)
    expect(html).toContain('sg-manual-pane-socket')
    expect(html).toContain('sg-manual-pane-empty-diamond')
    expect(html).toContain('sg-manual-progress-track')
    expect(styles).toContain('background:linear-gradient(145deg,#f9e2ae')
  })
})
