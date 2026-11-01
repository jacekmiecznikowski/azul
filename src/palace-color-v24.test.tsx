import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { newGame } from './game/engine'
import { TurnSummary } from './App'
import { GameBoard } from './components/GameBoard'

describe('player colors come from randomized palace assignment', () => {
  for (const color of ['red','blue','yellow','white'] as const) {
    it(`keeps the turn icon and physical board consistent when palace is ${color}`, () => {
      const game = newGame({opponents: 3, seed: 98765, palaceSide: 'A'})
      const playerIndex = 0 // historically painted red because this is seat 0
      game.currentPlayer = playerIndex
      game.players[playerIndex].palaceColor = color
      const turn = renderToStaticMarkup(createElement(TurnSummary, {game}))
      const board = renderToStaticMarkup(createElement(GameBoard, {
        player: game.players[playerIndex], index: playerIndex, isCurrent: true,
      }))
      expect(turn).toContain(`sg-player-icon sg-palace-icon-${color}`)
      expect(turn).not.toContain('sg-player-icon sg-player-icon-0')
      expect(board).toContain(`sg-palace-${color}`)
      expect(board).toContain(`sg-palace-icon-${color}`)
    })
  }
})
