import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true } })
let browser
const results = []
try {
  await server.listen()
  browser = await chromium.launch()
  await mkdir('reports/ui', { recursive: true })
  for (const [width, height] of [[1920,1080],[1440,900],[1280,720],[1101,621],[1024,768],[844,390],[667,375],[390,844],[320,568]]) {
    for (const opponents of [1,2,3]) {
      const page = await browser.newPage({ viewport: { width, height } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto('http://127.0.0.1:5179')
      await page.evaluate(async opponents => {
        const { newGame } = await import('/src/game/engine.ts')
        const state = newGame({ opponents, seed: 145, playerControllers: ['human','human','human','human'] })
        localStorage.setItem('sintra-glass-save-v1', JSON.stringify(state))
      }, opponents)
      await page.reload()
      await page.getByRole('button', { name: 'Kontynuuj partię' }).click()
      await page.evaluate(() => document.fonts.ready)
      const root = width > 1100 && height > 620 ? '.sg-stage' : '.sg-mobile-layout'
      const metrics = await page.locator(root).evaluate(root => {
        const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height } }
        const gems = [...root.querySelectorAll('.sg-market-token > .sg-glass')].map(rect)
        const tokens = [...root.querySelectorAll('.sg-market-token')].map(rect)
        const market = root.querySelector('.sg-market-layout-v45')
        const orbit = root.querySelector('.sg-market-orbit-v46')
        const factories = [...orbit.querySelectorAll('.sg-factory-v45')].map(rect)
        const gemDiscs = [...root.querySelectorAll('.sg-market-token')].map(el => rect(el.closest('.sg-factory-v45')))
        return { gems, tokens, market:rect(market), orbit:rect(orbit),
          factories, gemDiscs, documentWidth:document.documentElement.scrollWidth, viewport:innerWidth }
      })
      const label = `${width}x${height}-${opponents+1}players`
      await page.screenshot({ path:`reports/ui/${label}.png`, fullPage:true })
      results.push({ label, ...metrics, errors })
      await writeFile('reports/ui/metrics.json', JSON.stringify(results, null, 2))
      assert.equal(metrics.gems.length, (2 * (opponents+1) + 1) * 4, label)
      assert(metrics.documentWidth <= width + 1, `${label}: page overflow`)
      assert(metrics.orbit.width >= metrics.market.width - 1, `${label}: orbit does not fill panel width`)
      assert(metrics.orbit.height >= metrics.market.height - 1, `${label}: orbit does not fill panel height`)
      assert.equal(metrics.factories.length, 2 * (opponents+1) + 1, label)
      if (root === '.sg-stage') {
        const minY = Math.min(...metrics.factories.map(f => f.y))
        const maxY = Math.max(...metrics.factories.map(f => f.y + f.height))
        const coverage = (maxY - minY) / metrics.market.height
        assert(coverage >= .85, `${label}: ring wastes vertical space (${coverage.toFixed(2)})`)
        assert(Math.abs((minY+maxY)/2 - (metrics.market.y+metrics.market.height/2)) < 13,
          `${label}: ring is not vertically centered`)
      }
      metrics.factories.forEach((f, i) => {
        assert(f.x >= metrics.market.x - 1 && f.y >= metrics.market.y - 1 &&
          f.x + f.width <= metrics.market.x + metrics.market.width + 1 &&
          f.y + f.height <= metrics.market.y + metrics.market.height + 1,
          `${label}: factory ${i} is clipped`)
      })
      for (let i=0;i<metrics.factories.length;i++) for(let j=i+1;j<metrics.factories.length;j++) {
        const a=metrics.factories[i], b=metrics.factories[j]
        const gap=Math.hypot(a.x+a.width/2-b.x-b.width/2, a.y+a.height/2-b.y-b.height/2)
        assert(gap >= (a.width+b.width)/2 + 2, `${label}: factories ${i} and ${j} overlap`)
      }
      metrics.gems.forEach((gem, i) => {
        assert(gem.width >= 12 && gem.height >= 12, `${label}: invisible/tiny gem ${i}: ${JSON.stringify(gem)}`)
        assert(Math.abs(gem.width-gem.height) < 1, `${label}: distorted gem ${i}`)
        const disc = metrics.gemDiscs[i]
        assert(gem.x >= disc.x - 1 && gem.y >= disc.y - 1 &&
          gem.x + gem.width <= disc.x + disc.width + 1 &&
          gem.y + gem.height <= disc.y + disc.height + 1,
          `${label}: gem ${i} escapes its circular workshop`)
        const token = metrics.tokens[i]
        assert(gem.x >= token.x-1 && gem.y >= token.y-1 && gem.x+gem.width <= token.x+token.width+1 && gem.y+gem.height <= token.y+token.height+1, `${label}: gem outside button ${i}; gem=${JSON.stringify(gem)} button=${JSON.stringify(token)} disc=${JSON.stringify(metrics.gemDiscs[i])}`)
      })
      const first = page.locator(`${root} .sg-market-token`).first()
      await first.click()
      assert(await page.locator(`${root} .sg-token-selected`).count() > 0, `${label}: source selection failed`)
      const selectedShape = await page.locator(`${root} .sg-market-token.sg-token-selected`).first().evaluate(button => {
        const style = getComputedStyle(button)
        return {clip:style.clipPath, shadow:style.boxShadow, background:style.backgroundColor}
      })
      assert(selectedShape.clip.includes('polygon('), `${label}: selected target is not a diamond`)
      assert(selectedShape.shadow === 'none', `${label}: rectangular selected highlight`)
      assert(await page.locator(`${root} .sg-window-target`).count() > 0, `${label}: no placement targets`)
      const resources = page.locator('.sg-header .sg-resource-trigger')
      await resources.click()
      assert.equal(await resources.getAttribute('aria-expanded'), 'true', `${label}: resources disclosure failed`)
      assert.equal(await page.getByRole('region', { name: 'Zasoby szkła' }).count(), 1,
        `${label}: resources missing`)
      await page.getByRole('button', { name: 'Zamknij zasoby' }).click()
      assert.equal(await resources.getAttribute('aria-expanded'), 'false', `${label}: resources did not close`)
      assert.deepEqual(errors, [], label)
      console.log(`PASS ${label}: ${metrics.gems.length} visible gems, selection works`)
      await page.close()
    }
  }
} finally {
  await browser?.close()
  await server.close()
}
