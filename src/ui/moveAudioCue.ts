import type { GameState } from '../game/engine'

export type MoveAudioCue = 'place' | 'score' | 'round' | 'gameOver'

/** Pick one sound for an applied legal move, with the match-ending fanfare highest priority. */
export function moveAudioCue(before: GameState, after: GameState): MoveAudioCue {
  // Only a real transition from an ongoing game may trigger the victory WAV.
  // Opening results, reloading a completed save, and starting a new game are not transitions.
  if (before.phase === 'playing' && after.phase === 'finished') return 'gameOver'
  if (after.round !== before.round) return 'round'
  if (after.players[before.currentPlayer].score > before.players[before.currentPlayer].score) return 'score'
  return 'place'
}
