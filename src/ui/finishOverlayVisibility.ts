/** Show only one end-of-game overlay at a time. Setup/rules modals take priority. */
export interface FinishOverlayState {
  phase: 'playing' | 'finished'
  setupOpen: boolean
  rulesOpen: boolean
  resultsOpen: boolean
}

export function finishOverlayVisibility(state: FinishOverlayState): { banner: boolean; results: boolean } {
  const endOfGameVisible = state.phase === 'finished' && !state.setupOpen && !state.rulesOpen
  return {
    banner: endOfGameVisible && !state.resultsOpen,
    results: endOfGameVisible && state.resultsOpen,
  }
}
