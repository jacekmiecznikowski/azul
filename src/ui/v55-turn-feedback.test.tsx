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

describe('v57 – consistent market geometry, centered cue, short gold border signal', () => {
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
    expect(html).not.toContain('TWOJA TURA')
    expect((html.match(/data-sg-window=/g)??[])).toHaveLength(8)
    expect(css).toContain('.sg .sg-board.sg-board-your-turn')
    expect(css).toContain('@keyframes sg-v57-turn-glow')
    expect(css).toContain('opacity:1!important')
    expect(css).toContain('animation:sg-v57-turn-glow 1.15s ease-out 1 both!important')
    expect(css).not.toContain('opacity:.42')
    expect(app).toContain('turn-market-v56.css')
    expect(app).not.toContain("import './turn-feedback-v55.css'")
  })

  it('keeps the turn toast visible and legible, never blinking the screen', () => {
    expect(app).toContain('<strong>TWOJA TURA</strong>')
    expect(app).toContain('setTurnNotice(null), 2000')
    expect(css).toContain('.sg .sg-human-turn-notice')
    expect(css).toContain('min-height:100px')
    expect(css).toContain('pointer-events:none')
    expect(css).toContain('top:50%')
    expect(css).toContain('transform:translate(-50%,-50%)')
  })

  it('scales 1v1 discs on LAPTOPS and keeps all gems and open slots synchronized', () => {
    expect(css).toContain('grid-template-columns:235px minmax(0,1fr) 255px')
    expect(css).toContain('--sg-disc-size:89px!important')
    expect(css).not.toContain('data-sg-orbit-count="7"')
    expect(css).toContain('width:calc(var(--sg-unified-gem-size,29px) * 1.064)')
    expect(geometry).toContain('const desktop = !narrow && window.innerWidth >= 1101')
    expect(geometry).toContain('const diameter = desktop ? 29 : mobileDiameter')
    expect(geometry).toContain("root.style.setProperty('--sg-unified-gem-size', value)")
  })

  it('makes the active AI seat glow just like a human seat', () => {
    const game = newGame({opponents:1,seed:156})
    const bot = renderToStaticMarkup(createElement(GameBoard,{
      player:game.players[1],index:1,isCurrent:true,isHuman:false,isHumanTurn:false,
    }))
    expect(bot).toContain('sg-board-current')
    expect(bot).not.toContain('sg-board-your-turn')
    expect(css).toContain('.sg.sg-effects-cinematic .sg-board.sg-board-current')
    expect(css).toContain('.sg.sg-effects-minimal .sg-board.sg-board-current')
  })

  it('gives selected diamonds a gold SHAPE outline, not a rectangular button frame', () => {
    expect(css).toContain('.sg-token-selected::before')
    expect(css).toContain('clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)')
    expect(css).toContain('transform:none!important')
    expect(css).toContain('sg-factory-is-selected')
  })
})
