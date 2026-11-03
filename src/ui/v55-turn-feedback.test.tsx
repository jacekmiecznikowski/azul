import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { roundPresentationTiming, ROUND_CINEMATIC_MS, ROUND_MINIMAL_MS, POST_ROUND_PAUSE_MS } from './turnPresentation'
import { RoundAnnouncement } from '../components/RoundAnnouncement'
import { GameBoard } from '../components/GameBoard'
import { newGame } from '../game/engine'

const css = readFileSync(new URL('../turn-market-v56.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const geometry = readFileSync(new URL('../hooks/useSharedGlassGeometry.ts', import.meta.url), 'utf8')

describe('v56 – gold outer frame, 1v1 markets and reliable human-turn notices', () => {
  it('does not let the AI move during the opening round ceremony', () => {
    const timing = roundPresentationTiming(true,false)
    expect(timing).toEqual({
      cinematic:true, visibleMs:ROUND_CINEMATIC_MS,
      unlockMs:ROUND_CINEMATIC_MS + POST_ROUND_PAUSE_MS,
    })
    expect(timing.unlockMs).toBeGreaterThan(timing.visibleMs)
    expect(app).toContain('!roundIsReady || game.players[game.currentPlayer].controller')
    expect(app).toContain('window.setTimeout(() => setRoundReady(releasingRound), roundTiming.unlockMs)')
  })

  it('respects effects off/reduced motion: a short static round cue, no blinking', () => {
    for (const flags of [[false,false],[true,true],[false,true]] as const) {
      const timing = roundPresentationTiming(flags[0],flags[1])
      expect(timing.cinematic).toBe(false)
      expect(timing.visibleMs).toBe(ROUND_MINIMAL_MS)
      expect(timing.unlockMs).toBe(ROUND_MINIMAL_MS + POST_ROUND_PAUSE_MS)
    }
    const announcement = renderToStaticMarkup(createElement(RoundAnnouncement,{round:2,color:'cyan',minimal:true}))
    expect(announcement).toContain('sg-round-announcement--minimal')
    expect(css).toContain('backdrop-filter:none!important')
    expect(css).toContain('animation:none!important')
    expect(app).toContain('showTurnPopup = humanCanPlay && roundTiming.cinematic')
    expect(app).toContain('showTurnPopup && turnNotice')
  })

  it('highlights the FULL eight-window board with a GOLD frame, not the glass panes', () => {
    const game=newGame({opponents:1,seed:56})
    const html=renderToStaticMarkup(createElement(GameBoard,{
      player:game.players[0],index:0,isCurrent:true,isHuman:true,isHumanTurn:true,
    }))
    expect(html).toContain('sg-board-your-turn')
    expect(html).toContain('TWOJA TURA')
    expect((html.match(/data-sg-window=/g)??[])).toHaveLength(8)
    expect(css).toContain('.sg .sg-board.sg-board-your-turn')
    expect(css).toContain('@keyframes sg-v56-palace-ripple')
    expect(css).toContain('opacity:1!important')
    expect(css).toContain('animation:sg-v56-palace-ripple 3.6s ease-in-out infinite!important')
    expect(css).not.toContain('opacity:.42')
    expect(app).toContain('turn-market-v56.css')
    expect(app).not.toContain("import './turn-feedback-v55.css'")
  })

  it('keeps the turn toast visible and legible, never blinking the screen', () => {
    expect(app).toContain('<strong>TWOJA TURA</strong>')
    expect(app).toContain('setTurnNotice(null), 2700')
    expect(css).toContain('.sg .sg-human-turn-notice')
    expect(css).toContain('min-height:75px')
    expect(css).toContain('pointer-events:none')
  })

  it('scales 1v1 discs on LAPTOPS and keeps all gems and open slots synchronized', () => {
    expect(css).toContain('data-sg-orbit-count="5"')
    expect(css).toContain('--sg-disc-size:clamp(110px,min(46cqb,29cqi),118px)')
    expect(css).toContain('data-sg-orbit-count="7"')
    expect(css).toContain('width:calc(var(--sg-unified-gem-size,28px) * 1.064)')
    expect(geometry).toContain('const relaxed = !narrow && factoryCount <= 7')
    expect(geometry).toContain('const paneRatio = relaxed ? .90 : .84')
    expect(geometry).toContain("root.style.setProperty('--sg-unified-gem-size', value)")
  })

  it('gives selected diamonds a gold SHAPE outline, not a rectangular button frame', () => {
    expect(css).toContain('.sg-token-selected::before')
    expect(css).toContain('clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)')
    expect(css).toContain('transform:none!important')
    expect(css).toContain('sg-factory-is-selected')
  })
})
