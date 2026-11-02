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
          factories, gemDiscs, zoom: parseFloat(getComputedStyle(root.querySelector('.sg-felt') ?? root).zoom) || 1,
          documentWidth:document.documentElement.scrollWidth, viewport:innerWidth }
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
      // The open socket's dark diamond is the physical size reference.
      // ALL loose factory glass and center glass must match it in rendered pixels.
      const unified = await page.locator(root).evaluate(root => {
        const r = node => {
          const b = node.getBoundingClientRect()
          return {x:b.x, y:b.y, width:b.width, height:b.height,
            cx:b.x + b.width/2, cy:b.y + b.height/2}
        }
        const open = root.querySelector('.sg-pane-empty-diamond')
        const factoryGem = root.querySelector('.sg-market-token .sg-glass.sg-gem-faceted')
        const placed = root.querySelector('.sg-pane-socket .sg-glass.sg-gem-faceted')
        const parent = open?.closest('.sg-pane-socket')
        const style = getComputedStyle(root.querySelector('.sg-market-orbit-v46'))
        return {open:open?r(open):null, factory:factoryGem?r(factoryGem):null,
          installed:placed?r(placed):null, socket:parent?r(parent):null,
          cssValue:getComputedStyle(root.querySelector('.sg-felt') ?? root).getPropertyValue('--sg-unified-gem-size')?.trim(),
          orbitSize:style.getPropertyValue('--sg-disc-size')?.trim()}
      })
      if (unified.open && unified.factory) {
        assert(Math.abs(unified.open.width - unified.factory.width) <= 1.2,
          `${label}: market gem does not match empty window diamond: ${JSON.stringify(unified)}`)
        assert(Math.abs(unified.open.height - unified.factory.height) <= 1.2,
          `${label}: market gem height differs from empty window diamond`)
        assert(Math.abs(unified.open.width - unified.open.height) <= 1,
          `${label}: empty socket isn't square`)
      }
      assert(unified.cssValue?.endsWith('px'), `${label}: no canonical measured diamond size`)
      metrics.gems.forEach((gem, i) => {
        const minimum = Math.max(9.5, 12 * metrics.zoom)
        assert(gem.width >= minimum && gem.height >= minimum, `${label}: invisible/tiny gem ${i}: ${JSON.stringify(gem)}, scale=${metrics.zoom}`)
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
      // All six rounds use the *real* faceted glass component; no CSS dots.
      const roundUI = await page.locator('.sg-header .sg-round-tracker-v52').evaluate(el => {
        const rect = node => { const r = node.getBoundingClientRect()
          return {x:r.x,y:r.y,width:r.width,height:r.height}
        }
        const steps = [...el.querySelectorAll('.sg-round-v52-step')]
        const gems = [...el.querySelectorAll('.sg-round-v52-gem .sg-glass.sg-gem-faceted')]
        const all = [el, ...steps, ...gems]
        const head = el.closest('.sg-header')
        const headBox = rect(head)
        const over = all.some(node => {
          const r = rect(node)
          return r.width < 5 || r.height < 5 ||
            r.x < headBox.x - 1 || r.x+r.width > headBox.x+headBox.width+1 ||
            r.y < headBox.y - 1 || r.y+r.height > headBox.y+headBox.height+1
        })
        return {steps:steps.length,gems:gems.map(rect),over,
          active:steps.filter(x=>x.getAttribute('aria-current')==='step').length,
          header:headBox}
      })
      assert.equal(roundUI.steps,6,`${label}: round step count`)
      assert.equal(roundUI.gems.length,6,`${label}: expected 6 physical gems`)
      assert.equal(roundUI.active,1,`${label}: exactly one active round`)
      assert(!roundUI.over,`${label}: round tracker clipped/overflowed: ${JSON.stringify(roundUI)}`)
      for(const [i,g] of roundUI.gems.entries()) {
        assert(Math.abs(g.width - g.height) < 1,`${label}: distorted round diamond ${i}`)
      }

      const resources = page.locator('.sg-header .sg-resource-trigger')
      const ribbon = page.locator('.sg-header .sg-resource-ribbon')
      if (width >= 1700 && height >= 650) {
        assert(await ribbon.isVisible(), `${label}: stock counters hidden on full resolution`)
        assert.equal(await ribbon.locator('.sg-resource-ribbon-item').count(),5,
          `${label}: missing stock location(s)`)
        assert(!(await resources.isVisible()), `${label}: redundant resources button on full screen`)
        const ribbonGeom = await ribbon.evaluate(el => {
          const a=el.getBoundingClientRect(), h=el.closest('.sg-header').getBoundingClientRect()
          return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,hleft:h.left,hright:h.right,htop:h.top,hbottom:h.bottom}
        })
        assert(ribbonGeom.left >= ribbonGeom.hleft && ribbonGeom.right <= ribbonGeom.hright &&
          ribbonGeom.top >= ribbonGeom.htop && ribbonGeom.bottom <= ribbonGeom.hbottom,
          `${label}: resource ribbon escapes header`)
      } else {
        assert(!(await ribbon.isVisible()), `${label}: compact screen has oversized resource ribbon`)
        await resources.click()
        assert.equal(await resources.getAttribute('aria-expanded'), 'true', `${label}: resources disclosure failed`)
        assert.equal(await page.getByRole('region', { name: 'Zasoby szkła' }).count(), 1,
          `${label}: resources missing`)
        await page.getByRole('button', { name: 'Zamknij zasoby' }).click()
        assert.equal(await resources.getAttribute('aria-expanded'), 'false', `${label}: resources did not close`)
      }
      // A real layout regression: one shared color must not be magnified, and
      // five shared colors must not be flattened or squeezed by grid row count.
      if ((width === 1440 && opponents === 2) ||
          (width === 844 && opponents === 1) ||
          (width === 390 && opponents === 3)) {
        let referenceSize = null
        for (const count of [1, 2, 3, 4, 5]) {
          await page.evaluate(async ({ count, opponents }) => {
            const { newGame, COLORS } = await import('/src/game/engine.ts')
            const state = newGame({
              opponents, seed: 145, playerControllers: ['human', 'human', 'human', 'human'],
            })
            for (const color of COLORS.slice(0, count)) {
              const index = state.bag.indexOf(color)
              if (index < 0) throw new Error('Seed missing target center color')
              state.center.push(...state.bag.splice(index, 1))
            }
            localStorage.setItem('sintra-glass-save-v1', JSON.stringify(state))
          }, { count, opponents })
          await page.reload()
          await page.getByRole('button', { name: 'Kontynuuj partię' }).click()
          await page.evaluate(() => document.fonts.ready)
          const sizes = await page.locator(root).evaluate(root => {
            const rect = el => { const r = el.getBoundingClientRect(); return {
              x:r.x,y:r.y,width:r.width,height:r.height,
            } }
            const center = root.querySelector('.sg-center-pile.sg-center-v45')
            return {
              pile: rect(center),
              gems: [...center.querySelectorAll('.sg-center-choice .sg-glass.sg-gem-faceted')].map(rect),
              buttons: [...center.querySelectorAll('.sg-center-choice')].map(rect),
              factoryGem: rect(root.querySelector('.sg-factory-v45 .sg-market-token .sg-glass.sg-gem-faceted')),
              emptyWidth: root.querySelector('.sg-pane-empty-diamond')?.getBoundingClientRect().width ?? null,
            }
          })
          assert.equal(sizes.gems.length, count, `${label}: missing center color(s) at ${count}`)
          sizes.gems.forEach((gem, i) => {
            assert(Math.abs(gem.width - gem.height) < 1,
              `${label}: center color ${i} distorted at ${count} colors: ${JSON.stringify(gem)}`)
            assert(gem.width >= (width >= 1101 ? 12 : 9),
              `${label}: center color ${i} too small at ${count} colors; center=${gem.width}, factory=${sizes.factoryGem.width}, pileHeight=${sizes.pile.height}`)
            assert(gem.x >= sizes.pile.x - 1 && gem.y >= sizes.pile.y - 1 &&
              gem.x + gem.width <= sizes.pile.x + sizes.pile.width + 1 &&
              gem.y + gem.height <= sizes.pile.y + sizes.pile.height + 1,
              `${label}: center gem escapes pile with ${count} colors`)
            const button = sizes.buttons[i]
            assert(gem.x >= button.x - 1 && gem.y >= button.y - 1 &&
              gem.x + gem.width <= button.x + button.width + 1 &&
              gem.y + gem.height <= button.y + button.height + 1,
              `${label}: center gem escapes button with ${count} colors`)
            if (width >= 1101) {
              const emptyWidth = sizes.emptyWidth
              assert(Math.abs(gem.width - emptyWidth) <= 1.2,
                `${label}: center diamond differs from empty window by ${Math.abs(gem.width-emptyWidth)}px`)
            }
            assert(Math.abs(gem.width - sizes.gems[0].width) < 1,
              `${label}: different gem sizes within same center`)
            if (referenceSize !== null) {
              assert(Math.abs(gem.width - referenceSize) < 1,
                `${label}: gem size changes with center count (1:${referenceSize}, ${count}:${gem.width})`)
            }
          })
          if (referenceSize === null) referenceSize = sizes.gems[0].width
          if (width >= 1101) {
            assert(Math.abs(referenceSize - sizes.factoryGem.width) <= 4,
              `${label}: center gems have a different scale from workshop gems (center=${referenceSize}, factory=${sizes.factoryGem.width})`)
          }
          if (count === 2 || count === 5) {
            await page.locator(root).screenshot({
              path:`reports/ui/${label}-center-${count}-colors.png`,
            })
          }
        }
        console.log(`PASS ${label}: square, consistent center gems with 1–5 colors`)
      }
      // Symmetric physical stained-glass windows: no varying right border and
      // no offset sockets / placed jewels across the 8 window strips.
      if (width === 1440 && height === 900 && opponents === 3) {
        await page.evaluate(() => {
          const source = document.querySelector('.sg-stage .sg-market-token > .sg-glass')
          const windows = [...document.querySelectorAll('.sg-stage .sg-seat-south .sg-window')]
          for (const window of windows) for (const paneIndex of [0, 4]) {
            const socket = window.querySelectorAll('.sg-pane-socket')[paneIndex]
            if (!source || !socket) throw new Error('No workshop gem or pane socket')
            socket.querySelector('.sg-pane-empty-diamond')?.remove()
            socket.querySelector('.sg-glass')?.remove()
            socket.append(source.cloneNode(true))
          }
        })
        const geometry = await page.locator('.sg-stage .sg-seat-south').evaluate(seat => {
          const rect = node => {
            const r = node.getBoundingClientRect()
            return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}
          }
          return [...seat.querySelectorAll('.sg-window')].map(win => {
            const lancet = win.querySelector('.sg-window-lancet')
            const panes = [...win.querySelectorAll('.sg-pane')]
            const border = getComputedStyle(lancet)
            return {
              window: rect(win), lancet:rect(lancet),
              borderLeft:parseFloat(border.borderLeftWidth),
              borderRight:parseFloat(border.borderRightWidth),
              rows: panes.map(pane => ({
                pane:rect(pane),
                socket:rect(pane.querySelector('.sg-pane-socket')),
                gem:pane.querySelector('.sg-pane-socket .sg-glass') ?
                  rect(pane.querySelector('.sg-pane-socket .sg-glass')) : null,
              })),
            }
          })
        })
        assert.equal(geometry.length, 8, 'There must be 8 windows')
        for (const [i, window] of geometry.entries()) {
          assert.equal(window.borderLeft,window.borderRight,`Window ${i+1}: unequal left and right gold borders`)
          for (const [j,{pane,socket,gem}] of window.rows.entries()) {
            const maxDelta = 1.2
            assert(Math.abs(pane.cx - window.lancet.cx) < maxDelta,
              `Window ${i+1}, floor ${j+1}: floor not horizontally centered`)
            assert(Math.abs(socket.cx - pane.cx) < maxDelta,
              `Window ${i+1}, floor ${j+1}: gold socket not centered`)
            if (gem) {
              assert(Math.abs(gem.cx - socket.cx) < maxDelta &&
                Math.abs(gem.cy - socket.cy) < maxDelta,
                `Window ${i+1}, floor ${j+1}: placed gem is off-center`)
              assert(Math.abs(gem.width-gem.height)<1,
                `Window ${i+1}, floor ${j+1}: placed gem isn't square`)
            }
          }
        }
        await page.locator('.sg-stage .sg-seat-south').screenshot({
          path:'reports/ui/1440x900-stained-glass-centering.png',
        })
        console.log('PASS 1440x900: all 8 windows have symmetric borders and centered sockets/gems')
      }
      assert.deepEqual(errors, [], label)
      console.log(`PASS ${label}: ${metrics.gems.length} visible gems, selection works`)
      await page.close()
    }
  }
} finally {
  await browser?.close()
  await server.close()
}
