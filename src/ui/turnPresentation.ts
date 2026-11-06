/** The gameplay gate follows the exact duration of the visible round cue.
 * Disabling visual effects removes the cinematic overlay without letting AI
 * make an invisible move before players can orient themselves. */
export const ROUND_CINEMATIC_MS = 2700
export const ROUND_MINIMAL_MS = 700
export const POST_ROUND_PAUSE_MS = 350

export function roundPresentationTiming(effectsEnabled: boolean, reducedMotion: boolean) {
  const cinematic = effectsEnabled && !reducedMotion
  const visibleMs = cinematic ? ROUND_CINEMATIC_MS : ROUND_MINIMAL_MS
  return { cinematic, visibleMs, unlockMs: visibleMs + POST_ROUND_PAUSE_MS }
}
