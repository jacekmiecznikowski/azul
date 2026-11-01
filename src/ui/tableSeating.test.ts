import { describe, expect, it } from 'vitest'
import { newGame, nextClockwisePlayer } from '../game/engine'
import { seatsForViewer, viewingPlayerIndex } from './tableSeating'

describe('rotating hot-seat tabletop', () => {
  for (const count of [2, 3, 4]) {
    it(`puts each of ${count} players on the south edge during their turn`, () => {
      const places = count === 2 ? ['south', 'north'] :
        count === 3 ? ['south', 'west', 'north'] : ['south', 'west', 'north', 'east']
      for (let current = 0; current < count; current++) {
        const seats = seatsForViewer(current, count)
        expect(seats.map(seat => seat.place)).toEqual(places)
        expect(seats[0].playerIndex).toBe(current)
        expect(new Set(seats.map(seat => seat.playerIndex)).size).toBe(count)
        for (let i = 1; i < count; i++)
          expect(seats[i].playerIndex).toBe(nextClockwisePlayer(seats[i - 1].playerIndex, count))
      }
    })
  }

  it('preserves the clockwise order for four people through every rotation', () => {
    expect(seatsForViewer(0, 4)).toEqual([
      {playerIndex:0,place:'south'},
      {playerIndex:3,place:'west'},
      {playerIndex:1,place:'north'},
      {playerIndex:2,place:'east'},
    ])
    expect(seatsForViewer(1, 4)[0]).toEqual({playerIndex:1,place:'south'})
    expect(seatsForViewer(2, 4)[0]).toEqual({playerIndex:2,place:'south'})
    expect(seatsForViewer(3, 4)[0]).toEqual({playerIndex:3,place:'south'})
  })

  it('holds the last human perspective during the bot turn', () => {
    const players = ['human','ai','human','ai'] as const
    expect(viewingPlayerIndex(1,0,players)).toBe(0)
    expect(viewingPlayerIndex(2,0,players)).toBe(2)
    expect(viewingPlayerIndex(3,2,players)).toBe(2)
    expect(viewingPlayerIndex(0,2,players)).toBe(0)
    expect(viewingPlayerIndex(1,6,players)).toBe(0)
  })

  it('rejects invalid tables instead of silently duplicating seats', () => {
    expect(() => seatsForViewer(-1,4)).toThrow()
    expect(() => seatsForViewer(4,4)).toThrow()
    expect(() => seatsForViewer(0,5)).toThrow()
  })

  it('a restored state with a human current player still has a valid bottom seat', () => {
    const state = newGame({
      opponents:3, palaceSide:'B', seed:98765,
      playerControllers:['human','ai','human','human'],
    })
    const viewer = viewingPlayerIndex(state.currentPlayer,0,state.players.map(p=>p.controller))
    expect(seatsForViewer(viewer,state.players.length)[0].playerIndex).toBe(viewer)
    expect(state.players[0].controller).toBe('human')
    expect(state.players[2].controller).toBe('human')
    expect(state.players[3].controller).toBe('human')
  })
})
