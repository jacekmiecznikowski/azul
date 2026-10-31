import { describe, expect, it } from 'vitest'
import { finishOverlayVisibility } from './finishOverlayVisibility'

const finished = { phase: 'finished' as const, setupOpen: false, rulesOpen: false, resultsOpen: false }

describe('end-of-game overlays', () => {
  it('shows the finish banner after closing final results', () => {
    expect(finishOverlayVisibility(finished)).toEqual({ banner: true, results: false })
  })

  it('hides the finish banner while New Game setup is open', () => {
    expect(finishOverlayVisibility({ ...finished, setupOpen: true })).toEqual({ banner: false, results: false })
  })

  it('never stacks the final results over New Game setup', () => {
    expect(finishOverlayVisibility({ ...finished, resultsOpen: true, setupOpen: true })).toEqual({ banner: false, results: false })
  })

  it('does not obscure the rules modal', () => {
    expect(finishOverlayVisibility({ ...finished, rulesOpen: true })).toEqual({ banner: false, results: false })
  })

  it('shows final results only when no other modal is open', () => {
    expect(finishOverlayVisibility({ ...finished, resultsOpen: true })).toEqual({ banner: false, results: true })
  })

  it('does not display end-of-game UI during active play', () => {
    expect(finishOverlayVisibility({ ...finished, phase: 'playing' })).toEqual({ banner: false, results: false })
  })
})
