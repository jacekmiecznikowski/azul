import { describe, expect, it } from 'vitest'
import { newGame } from '../game/engine'
import { moveAudioCue } from './moveAudioCue'

const makeState = () => newGame({ opponents: 1, palaceSide: 'A', seed: 20261101 })

describe('end-of-match sound trigger', () => {
  it('plays the recorded game-over cue instead of a score or round cue on the final move', () => {
    const before = makeState()
    const after = structuredClone(before)
    after.phase = 'finished'
    after.round += 1
    after.players[before.currentPlayer].score += 15
    expect(moveAudioCue(before, after)).toBe('gameOver')
  })

  it('does not mistake a normal round change for game over', () => {
    const before = makeState()
    const after = structuredClone(before)
    after.round += 1
    expect(moveAudioCue(before, after)).toBe('round')
  })

  it('preserves existing point and glass placement sound decisions', () => {
    const before = makeState()
    const after = structuredClone(before)
    after.players[before.currentPlayer].score += 3
    expect(moveAudioCue(before, after)).toBe('score')
    expect(moveAudioCue(before, before)).toBe('place')
  })

  it('does not play the endgame cue when loading or displaying an already finished game', () => {
    const before = makeState()
    before.phase = 'finished'
    const after = structuredClone(before)
    expect(moveAudioCue(before, after)).not.toBe('gameOver')
  })
})
