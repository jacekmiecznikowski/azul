import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179'], { stdio: 'pipe' })
let browser
const results = []
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start')), 30000)
    server.stdout.on('data', data => { if (data.toString().includes('127.0.0.1:5179')) { clearTimeout(timer); resolve() } })
    server.on('error', reject)
  })
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
        return { gems, tokens, market:rect(market), documentWidth:document.documentElement.scrollWidth, viewport:innerWidth }
      })
      const label = `${width}x${height}-${opponents+1}players`
      await page.screenshot({ path:`reports/ui/${label}.png`, fullPage:true })
      results.push({ label, ...metrics, errors })
      await writeFile('reports/ui/metrics.json', JSON.stringify(results, null, 2))
      assert.equal(metrics.gems.length, (2 * (opponents+1) + 1) * 4, label)
      assert(metrics.documentWidth <= width + 1, `${label}: page overflow`)
      metrics.gems.forEach((gem, i) => {
        assert(gem.width >= 12 && gem.height >= 12, `${label}: invisible/tiny gem ${i}: ${JSON.stringify(gem)}`)
        assert(Math.abs(gem.width-gem.height) < 1, `${label}: distorted gem ${i}`)
        const token = metrics.tokens[i]
        assert(gem.x >= token.x-1 && gem.y >= token.y-1 && gem.x+gem.width <= token.x+token.width+1 && gem.y+gem.height <= token.y+token.height+1, `${label}: gem outside button ${i}`)
      })
      const first = page.locator(`${root} .sg-market-token`).first()
      await first.click()
      assert(await page.locator(`${root} .sg-token-selected`).count() > 0, `${label}: source selection failed`)
      assert(await page.locator(`${root} .sg-window-target`).count() > 0, `${label}: no placement targets`)
      assert.deepEqual(errors, [], label)
      console.log(`PASS ${label}: ${metrics.gems.length} visible gems, selection works`)
      await page.close()
    }
  }
} finally {
  await browser?.close()
  server.kill()
}
