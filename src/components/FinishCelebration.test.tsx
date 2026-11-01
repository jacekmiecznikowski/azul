import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { newGame } from '../game/engine'
import { FinishCelebration } from './FinishCelebration'
import { finishOverlayVisibility } from '../ui/finishOverlayVisibility'

function finish(scores: number[], penalties?: number[]) {
  const state = newGame({ opponents: scores.length - 1, seed: 54321, palaceSide: 'A' })
  state.phase = 'finished'
  scores.forEach((score, i) => {
    state.players[i].score = score
    state.players[i].glassLost = penalties?.[i] ?? 0
  })
  return state
}

function markup(scores: number[], penalties?: number[]) {
  return renderToStaticMarkup(createElement(FinishCelebration, {
    state: finish(scores, penalties), onResults: () => {}, onNewGame: () => {},
  }))
}

describe('elegant opt-in game finish', () => {
  it('presents the actual champion and final score in the compact ceremony', () => {
    const state = finish([32, 48, 41])
    const html = renderToStaticMarkup(createElement(FinishCelebration, {
      state, onResults: () => {}, onNewGame: () => {},
    }))
    expect(html).toContain('Koniec partii')
    expect(html).toContain('Zwycięzca tej rozgrywki')
    expect(html).toContain(state.players[1].name)
    expect(html).toContain('>48</b>')
    expect(html).toContain('Zobacz podliczenie')
    expect(html).toContain('Nowa partia')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('sg-finish-primary')
    expect(html).not.toContain('Szczegółowe podliczenie końcowe')
  })

  it('uses the broken-glass tiebreaker instead of reporting a false tie', () => {
    const html = markup([42, 42, 32], [5, 3, 0])
    expect(html).toContain('Zwycięzca tej rozgrywki')
    expect(html).not.toContain('Zwycięzcy tej rozgrywki')
  })

  it('names all real joint winners when score and glass penalties are tied', () => {
    const state = finish([29, 29], [4, 4])
    const html = renderToStaticMarkup(createElement(FinishCelebration, {
      state, onResults: () => {}, onNewGame: () => {},
    }))
    expect(html).toContain('Zwycięzcy tej rozgrywki')
    expect(html).toContain(state.players[0].name)
    expect(html).toContain(state.players[1].name)
  })

  it('shows the victory screen first, then only detailed results when explicitly requested', () => {
    const ready = { phase: 'finished' as const, setupOpen: false, rulesOpen: false, resultsOpen: false }
    expect(finishOverlayVisibility(ready)).toEqual({ banner: true, results: false })
    expect(finishOverlayVisibility({ ...ready, resultsOpen: true })).toEqual({ banner: false, results: true })
    expect(finishOverlayVisibility(ready)).toEqual({ banner: true, results: false })
    expect(finishOverlayVisibility({ ...ready, setupOpen: true })).toEqual({ banner: false, results: false })
  })
})
