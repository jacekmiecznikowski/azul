import { describe, expect, it } from 'vitest'
import { newGame } from './engine'
import { decodeSavedGame } from './savedGame'

describe('restoring a local game', () => {
  it('preserves a valid game and rejects invalid seats and incomplete strips', () => {
    const game = newGame({opponents:1, seed:19})
    const decode = (value: unknown) => decodeSavedGame(JSON.stringify(value))
    expect(decode(game)).toEqual(game)
    for (const field of ['currentPlayer','startingPlayer','nextStartingPlayer','initialStartingPlayer']) {
      expect(decode({...game,[field]:4})).toBeNull()
    }
    game.players[0].strips[0].panes.pop()
    expect(decode(game)).toBeNull()
  })
  it('migrates the complete opening name even when another name is its suffix', () => {
    const game = newGame({opponents:1,seed:19,playerNames:['Jan','Pan Jan']})
    delete game.initialStartingPlayer
    game.history[0].description = 'Rozpoczęto partię 2 graczy. Pierwszą rundę rozpoczyna Pan Jan.'
    game.startingPlayer = 0
    expect(decodeSavedGame(JSON.stringify(game))?.initialStartingPlayer).toBe(1)
  })
})
