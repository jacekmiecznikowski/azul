import { describe, expect, it } from 'vitest'
import { applyMove, legalMoves, newGame, nextClockwisePlayer } from './engine'

describe('local human and bot game configuration', () => {
  it('defaults to one human and the original AI opponents', () => {
    const game = newGame({ opponents: 3, seed: 20261101 })
    expect(game.players.map(player => player.controller)).toEqual(['human','ai','ai','ai'])
    expect(game.players.map(player => player.name)).toEqual(['Ty','Aurora','Iris','Noctis'])
    expect(game.players.slice(1).every(player => player.difficulty === 'normal')).toBe(true)
  })

  it('supports four human players with individual names and no bot difficulty', () => {
    const game = newGame({
      opponents:3, seed:20261101, palaceSide:'B',
      playerControllers:['human','human','human','human'],
      playerNames:['Ala','Bartek','Celina','Damian'],
      botDifficulties:['expert','hard','master'],
    })
    expect(game.players.map(p => p.controller)).toEqual(['human','human','human','human'])
    expect(game.players.map(p => p.name)).toEqual(['Ala','Bartek','Celina','Damian'])
    expect(game.players.every(p => p.difficulty === undefined)).toBe(true)
    expect(game.factories).toHaveLength(9)
    expect(game.palaceSide).toBe('B')
    for (let turn = 0; turn < 8 && game.phase === 'playing'; turn++) {
      const current = game.currentPlayer
      const next = applyMove(game, legalMoves(game)[0])
      expect(game.players[current].controller).toBe('human')
      if (next.round === game.round) {
        expect(next.currentPlayer).toBe(nextClockwisePlayer(current, 4))
      }
      // Always advance to the new immutable engine state.
      Object.assign(game, next)
    }
  })

  it('supports a nonadjacent pair of local humans with AI between them', () => {
    const game = newGame({
      opponents:3, seed:12345,
      playerControllers:['human','ai','human','ai'],
      playerNames:['Kasia','IGNORED','Marek','IGNORED'],
      botDifficulties:['hard','expert','master'],
    })
    expect(game.players.map(p=>p.controller)).toEqual(['human','ai','human','ai'])
    expect(game.players.map(p=>p.name)).toEqual(['Kasia','Aurora','Marek','Noctis'])
    expect(game.players.map(p=>p.difficulty)).toEqual([undefined,'hard',undefined,'master'])
  })

  it('keeps the selected number of factories for 2 and 3 player hot-seat tables', () => {
    const duo = newGame({opponents:1,playerControllers:['human','human'],seed:777})
    const trio = newGame({opponents:2,playerControllers:['human','human','human'],seed:777})
    expect(duo.factories).toHaveLength(5)
    expect(trio.factories).toHaveLength(7)
    expect(duo.players.every(p=>p.controller === 'human')).toBe(true)
    expect(trio.players.every(p=>p.controller === 'human')).toBe(true)
  })

  it('sanitizes optional human names without changing the game rules', () => {
    const game = newGame({opponents:1,seed:8,playerControllers:['human','human'],
      playerNames:['   ', '  Zosia  ']})
    expect(game.players.map(p=>p.name)).toEqual(['Ty','Zosia'])
    expect(game.players.every(p=>p.strips.length===8)).toBe(true)
  })
})
