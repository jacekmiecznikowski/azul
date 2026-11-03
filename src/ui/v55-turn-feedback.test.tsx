import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { roundPresentationTiming, ROUND_CINEMATIC_MS, ROUND_MINIMAL_MS, POST_ROUND_PAUSE_MS } from './turnPresentation'
import { RoundAnnouncement } from '../components/RoundAnnouncement'

const css = readFileSync(new URL('../turn-feedback-v55.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const geometry = readFileSync(new URL('../hooks/useSharedGlassGeometry.ts', import.meta.url), 'utf8')

describe('v55 – player turn feedback / bot round gate / effect preferences', () => {
  it('keeps AI locked until after a complete cinematic announcement', () => {
    const timing = roundPresentationTiming(true,false)
    expect(timing).toEqual({
      cinematic:true, visibleMs:ROUND_CINEMATIC_MS,
      unlockMs:ROUND_CINEMATIC_MS + POST_ROUND_PAUSE_MS,
    })
    expect(timing.unlockMs).toBeGreaterThan(timing.visibleMs)
    expect(app).toContain('!roundIsReady || game.players[game.currentPlayer].controller')
    expect(app).toContain('window.setTimeout(() => setRoundReady(releasingRound), roundTiming.unlockMs)')
    expect(app).toContain('window.setTimeout(() => setRoundAnnouncement(null), roundTiming.visibleMs)')
  })
  it('effects OFF (and reduced motion) show only a short static cue, not the modal blackout', () => {
    for (const flags of [[false,false],[true,true],[false,true]] as const) {
      const timing = roundPresentationTiming(...flags)
      expect(timing.cinematic).toBe(false)
      expect(timing.visibleMs).toBe(ROUND_MINIMAL_MS)
      expect(timing.unlockMs).toBe(ROUND_MINIMAL_MS + POST_ROUND_PAUSE_MS)
    }
    const html = renderToStaticMarkup(createElement(RoundAnnouncement,{round:2,color:'cyan',minimal:true}))
    expect(html).toContain('sg-round-announcement--minimal')
    expect(html).toContain('NIEBIESKI')
    expect(css).toContain('.sg-round-announcement.sg-round-announcement--minimal')
    expect(css).toContain('backdrop-filter:none')
    expect(css).toContain('animation:none!important')
    expect(app).toContain('showTurnPopup = humanCanPlay && roundTiming.cinematic')
    expect(app).toContain('showTurnPopup && turnNotice')
  })
  it('normal mode uses the same accessible faceted gem as the small cue', () => {
    const detailed = renderToStaticMarkup(createElement(RoundAnnouncement,{round:3,color:'rose'}))
    const small = renderToStaticMarkup(createElement(RoundAnnouncement,{round:3,color:'rose',minimal:true}))
    expect(detailed).not.toContain('sg-round-announcement--minimal')
    for (const html of [detailed,small]) {
      expect(html).toContain('sg-glass-placed sg-gem-faceted')
      expect(html).toContain('aria-live="polite"')
      expect(html).toContain('CZERWONY')
    }
  })
  it('marks human palace without an unwanted pulse when effects are switched off', () => {
    expect(css).toContain('.sg.sg-effects-cinematic .sg-seat.sg-seat-active-human .sg-board')
    expect(css).toContain('.sg.sg-effects-minimal .sg-seat.sg-seat-active-human .sg-board')
    expect(css).toContain('animation:none!important')
    expect(app).toContain('sg-mobile-player-current-human')
  })
  it('full-HD factory enlargement keeps the same shared pixel size as all empty sockets', () => {
    expect(css).toContain('--sg-disc-size:clamp(54px,min(30cqb,22cqi),122px)')
    expect(css).toContain('width:calc(var(--sg-unified-gem-size,28px) * 1.08)')
    expect(geometry).toContain('const paneRatio = roomy ? .91 : .84')
    expect(geometry).toContain('const factoryRatio = roomy ? .97 : .91')
    expect(geometry).toContain('root.style.setProperty(\'--sg-unified-gem-size\', value)')
  })
})
