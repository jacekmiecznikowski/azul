import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { MARKET_ORBIT_POSITIONS, Market } from '../App'
import { COLORS, glassInventory, newGame } from '../game/engine'

const css = readFileSync(new URL('../market-orbit-v46.css', import.meta.url), 'utf8')

describe('v46 circular workshops and genuine shared center', () => {
  it.each([1, 2, 3])('uses a single circular orbit with %i AI opponents', opponents => {
    const state = newGame({ opponents, seed: 460 + opponents })
    const html = renderToStaticMarkup(createElement(Market, {
      game: state, selection: null, disabled: false, onPick: () => {},
    }))
    const n = state.factories.length
    expect(n).toBe(2 * (opponents + 1) + 1)
    expect(html).toContain(`data-sg-orbit-count="${n}"`)
    expect((html.match(/class="sg-orbit-position-v46"/g) ?? [])).toHaveLength(n)
    expect((html.match(/class="sg-factory sg-factory-v45/g) ?? [])).toHaveLength(n)
    expect(html).toContain('sg-center-pile sg-center-v45')
    expect(html).toContain('sg-center-accessible')
    expect(html).not.toContain('>ŚRODEK<')
    expect(glassInventory(state).total).toBe(100)
  })

  it('keeps all five center colors separately selectable and accessible', () => {
    const state = newGame({ opponents: 3, seed: 464 })
    for (const color of COLORS) {
      const index = state.bag.indexOf(color)
      state.center.push(...state.bag.splice(index, 1))
    }
    const html = renderToStaticMarkup(createElement(Market, {
      game: state, selection: {source: {type:'center'}, color: COLORS[0]},
      disabled: false, onPick: () => {},
    }))
    expect((html.match(/class="sg-center-choice/g) ?? [])).toHaveLength(5)
    expect(html).toContain('sg-center-choice sg-token-selected')
    expect(html).toContain('Środek stołu: 1 ×')
    expect(glassInventory(state).total).toBe(100)
  })

  it.each([5, 7, 9])('spreads %i workshops across the rectangular table without collisions', n => {
    const positions = MARKET_ORBIT_POSITIONS[n]
    expect(positions).toHaveLength(n)
    const width = 570
    const height = 310
    const diameter = Math.min(92, .23 * height, .19 * width)
    const rects = positions.map(([px, py]) => ({
      x: px / 100 * width, y: py / 100 * height,
    }))
    rects.forEach(({x, y}) => {
      expect(x).toBeGreaterThan(diameter/2)
      expect(width-x).toBeGreaterThan(diameter/2)
      expect(y).toBeGreaterThan(diameter/2)
      expect(height-y).toBeGreaterThan(diameter/2)
    })
    for (let i=0; i<n; i++) for(let j=i+1;j<n;j++) {
      const distance = Math.hypot(rects[i].x - rects[j].x, rects[i].y - rects[j].y)
      expect(distance).toBeGreaterThan(diameter+6)
    }
  })
  it('keeps selections inside their circular discs without external outlines', () => {
    expect(css).toContain('.sg-orbit-position-v46 > .sg-factory-v45')
    expect(css).toContain('width:100%')
    expect(css).toContain('sg-token-selected')
    expect(css).toContain('box-shadow:inset 0 0 0 2px #f6d18a')
    expect(css).toContain('width:35%')
    expect(css).toContain('background:')
  })
})
