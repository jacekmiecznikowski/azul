import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { newGame, BROKEN_TRACK } from '../game/engine'
import { BoardScoringPanel, DigitalBrokenGlass, ScoreRoundBonuses, scoreTrackCells, scoreTrackPosition } from '../components/ScorePanels'

const app = readFileSync(new URL('../App.tsx', import.meta.url),'utf8')
const menu = readFileSync(new URL('../components/GameMenu.tsx', import.meta.url),'utf8')
const css = readFileSync(new URL('../score-presentation-v58.css', import.meta.url),'utf8')

describe('v58 — two visual scoring modes, original scoring logic untouched', () => {
  it('snakes across all 100 distinct scoring squares exactly once', () => {
    const path=scoreTrackCells()
    expect(path).toHaveLength(100)
    expect(new Set(path).size).toBe(100)
    expect(path.slice(0,10)).toEqual([0,1,2,3,4,5,6,7,8,9])
    expect(path.slice(10,20)).toEqual([19,18,17,16,15,14,13,12,11,10])
    expect(path.at(-1)).toBe(90)
    expect(scoreTrackPosition(-18)).toBe(0)
    expect(scoreTrackPosition(100)).toBe(0)
    expect(scoreTrackPosition(143)).toBe(43)
  })
  it('renders physical scoreboard with exactly 100 cells, live player markers and a 9-step penalty track', () => {
    const game=newGame({ opponents:3, seed:58 })
    game.players[0].score=105
    game.players[1].score=25
    game.players[2].score=-18
    game.players[3].score=88
    game.players[1].brokenSteps=6
    const html=renderToStaticMarkup(createElement(BoardScoringPanel,{game}))
    expect((html.match(/class="sg-boardscore-cell/g)??[])).toHaveLength(100)
    expect((html.match(/class="sg-boardscore-broken-step/g)??[])).toHaveLength(BROKEN_TRACK.length)
    expect((html.match(/class="sg-boardscore-legend-item"/g)??[])).toHaveLength(4)
    expect(html).toContain('105')
    expect(html).toContain('−11')
    expect(html).toContain('Powiększ tor punktów')
    expect(html).toContain('sg-score-rounds')
    expect((html.match(/class="sg-score-round-tile/g)??[])).toHaveLength(6)
  })
  it('renders concise digital penalties for every player and the same round jewels', () => {
    const game=newGame({opponents:2,seed:158})
    game.players[1].brokenSteps=8
    const html=renderToStaticMarkup(createElement(DigitalBrokenGlass,{game}))
    expect((html.match(/class="sg-digital-penalty-row/g)??[])).toHaveLength(3)
    expect(html).toContain('−18')
    expect(html).toContain('STŁUCZONE SZKŁO')
    expect((html.match(/sg-score-round-gem/g)??[])).toHaveLength(6)
    const rounds=renderToStaticMarkup(createElement(ScoreRoundBonuses,{game}))
    expect((rounds.match(/sg-glass-placed sg-gem-faceted/g)??[])).toHaveLength(6)
  })
  it('persists selection independently of saved game rules and uses it on desktop and mobile', () => {
    expect(app).toContain("SCORE_MODE_KEY = 'sintra-glass-score-presentation-v1'")
    expect(app).toContain('localStorage.setItem(SCORE_MODE_KEY,scoreMode)')
    expect(app).toContain('onScoreModeChange={setScoreMode}')
    expect(app).toContain("scoreMode === 'board'")
    expect(app).toContain('sg-mobile-stats sg-score-mode-')
    expect(menu).toContain('aria-label="Tryb punktacji"')
    expect(menu).toContain("onScoreModeChange('board')")
    expect(menu).toContain("onScoreModeChange('digital')")
  })
  it('keeps the purple glazier styling entirely outside window contents', () => {
    expect(css).toContain('.sg .sg-board-windows .sg-window.sg-window-active {')
    expect(css).toContain('outline:2px solid #b786d9')
    expect(css).toContain('background:transparent!important')
    expect(css).toContain('border-color:#668e93!important')
    expect(css).toContain('border:2px solid #c6a46e!important')
    expect(css).toContain('box-shadow:none!important')
  })
})
