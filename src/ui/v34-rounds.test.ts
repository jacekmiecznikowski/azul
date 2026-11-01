import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RoundTracker } from '../components/RoundTracker'
import { newGame } from '../game/engine'

describe('v34 round-bonus widget shared by all screen sizes', () => {
  const {roundColors} = newGame({opponents:3,seed:21034})
  it('shows six numbered colors with exactly one active bonus', () => {
    const html = renderToStaticMarkup(createElement(RoundTracker,{round:1,colors:roundColors}))
    expect((html.match(/class="sg-round-v34-step/g) || [])).toHaveLength(6)
    expect((html.match(/aria-current="step"/g) || [])).toHaveLength(1)
    expect(html).not.toContain('PREMIA TERAZ')
    expect(html).not.toContain('sg-round-v34-bonus')
    expect(html).toContain('Runda 1 z 6')
  })
  it('updates the highlight and dims earlier bonuses', () => {
    const html = renderToStaticMarkup(createElement(RoundTracker,{round:3,colors:roundColors}))
    expect((html.match(/sg-round-v34-past/g) || [])).toHaveLength(2)
    expect((html.match(/sg-round-v34-active/g) || [])).toHaveLength(1)
    expect(html).toContain('Runda 3 z 6')
  })
})
