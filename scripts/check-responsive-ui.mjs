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
  for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1101,621],[1024,768],[844,390],[667,375],[390,844],[320,568]]) {
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
      if (width === 1920 && height === 1080 && opponents === 3) {
        const announcement = page.locator('.sg-round-announcement')
        await announcement.waitFor({ state:'visible', timeout:2500 })
        assert.equal(await announcement.locator('.sg-glass.sg-gem-faceted').count(),1,
          'New-round ceremony must display one real faceted glass')
        await page.waitForTimeout(850)
        const opacity = await announcement.evaluate(el => Number(getComputedStyle(el).opacity))
        assert(opacity > .75, `Round ceremony not visible during animation (opacity=${opacity})`)
        await announcement.screenshot({
          path:'reports/ui/round-announcement-v53.png', animations:'allow',
        })
        await announcement.waitFor({ state:'hidden', timeout:5000 })
      }
      await page.evaluate(() => document.fonts.ready)
      const root = width > 1100 && height > 620 ? '.sg-stage' : '.sg-mobile-layout'
      if (width === 1366 && height === 768 && opponents === 1) {
        await page.locator('.sg-round-announcement').waitFor({state:'hidden',timeout:5000})
        const active = page.locator(`${root} .sg-board.sg-board-your-turn`)
        await active.waitFor({state:'visible',timeout:3500})
        assert.match(await active.locator('.sg-board-label').innerText(),/TWOJA TURA/,
          'Human turn must remain explicitly labelled ON the full palace')
        const border = await active.evaluate(el=>({
          animation:getComputedStyle(el).animationName,
          border:getComputedStyle(el).borderTopColor,
          opacity:getComputedStyle(el).opacity,
          rootClass:document.querySelector('.sg')?.className,
          boardClass:el.className,
          reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
          animationDuration:getComputedStyle(el).animationDuration,
        }))
        assert(border.animation.includes('sg-v57-turn-glow'),
          `Gold frame animation missing: ${JSON.stringify(border)}`)
        assert.equal(border.opacity,'1','Whole board must remain fully visible during its turn')
        const cue=page.locator('.sg-human-turn-notice')
        await cue.waitFor({state:'visible',timeout:3500})
        assert.match(await cue.innerText(),/TWOJA TURA/,'The player turn toast must be readable')
        const cuePosition = await cue.boundingBox()
        assert(cuePosition && Math.abs(cuePosition.y + cuePosition.height/2 - height/2) < 3 &&
          Math.abs(cuePosition.x + cuePosition.width/2 - width/2) < 3,
          'The human turn cue must be centered EXACTLY on both viewport axes')
        await page.screenshot({path:'reports/ui/1366x768-1v1-your-turn.png',animations:'allow'})
      }
      // Every visible player has precisely one strongly marked glazier window.
      const glazierMarks = await page.locator(root).evaluate(layout => {
        return [...layout.querySelectorAll('.sg-board')].map(board => ({
          active:board.querySelectorAll('.sg-window.sg-window-active').length,
          marked:board.querySelectorAll('.sg-window[data-sg-glazier="true"]').length,
          jewel:board.querySelectorAll('.sg-window[data-sg-glazier="true"] .sg-window-glazier svg').length,
        }))
      })
      assert(glazierMarks.length > 0, `${width}x${height}: no visible player board`)
      glazierMarks.forEach((mark,i) => {
        assert.deepEqual(mark,{active:1,marked:1,jewel:1},
          `${width}x${height}: incorrect glazier highlight on player ${i+1}`)
      })

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
      // Larger full-HD trays must remain fully separated around the orbit.
      if (width >= 1700 && height >= 880) {
        for (let i=0; i<metrics.factories.length; i++) {
          for (let j=i+1; j<metrics.factories.length; j++) {
            const a=metrics.factories[i], b=metrics.factories[j]
            const distance=Math.hypot((a.x+a.width/2)-(b.x+b.width/2),
              (a.y+a.height/2)-(b.y+b.height/2))
            const touchingDistance=(a.width+b.width)/2
            assert(distance >= touchingDistance-2,
              `${width}x${height}: full-HD workshops ${i+1} and ${j+1} overlap by ${touchingDistance-distance}px`)
          }
        }
      }
      if (width === 1366 && height === 768 && opponents === 1) {
        const sizing = await page.locator(root).evaluate(stage => {
          const pane=stage.querySelector('.sg-pane')
          const grid=stage.querySelector('.sg-factory-grid')
          const center=stage.querySelector('.sg-center-pile.sg-center-v45')
          return {pane:[pane.clientWidth,pane.clientHeight],grid:[grid.clientWidth,grid.clientHeight],
            center:[center.clientWidth,center.clientHeight],
            boards:[...stage.querySelectorAll('.sg-board')].map(board=>({
              name:board.querySelector('.sg-board-name')?.textContent?.trim(),
              size:[board.clientWidth,board.clientHeight],
              pane:[board.querySelector('.sg-pane')?.clientWidth,board.querySelector('.sg-pane')?.clientHeight],
              className:board.className,
            })),
            canonical:getComputedStyle(stage.querySelector('.sg-felt')??stage).getPropertyValue('--sg-unified-gem-size')}
        })
        console.log(`SIZE laptop 1v1: factory=${metrics.factories[0].width.toFixed(1)}px, diamond=${metrics.gems[0].width.toFixed(1)}px, geometry=${JSON.stringify(sizing)}`)
        assert(metrics.factories[0].width >= 57,
          'Larger laptop 1v1 workshops must use the room around the five-circle orbit')
        assert(metrics.gems[0].width >= 19,
          'Laptop 1v1 gemstones should be enlarged with empty pane sockets')
      }
      const label = `${width}x${height}-${opponents+1}players`
      // Record useful *finished* game layouts at laptop resolution, not
      // a screenshot half-covered by the temporary round/turn notifications.
      if (width === 1366 && height === 768) {
        await page.locator('.sg-round-announcement').waitFor({state:'hidden',timeout:5000})
        await page.locator('.sg-human-turn-notice').waitFor({state:'hidden',timeout:5000})
      }
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
      const originalGem = await first.locator('.sg-glass').boundingBox()
      await first.click()
      assert(await page.locator(`${root} .sg-token-selected`).count() > 0, `${label}: source selection failed`)
      const selectedShape = await page.locator(`${root} .sg-market-token.sg-token-selected`).first().evaluate(button => {
        const style = getComputedStyle(button)
        return {clip:style.clipPath, shadow:style.boxShadow, background:style.backgroundColor,
          ring:getComputedStyle(button,'::before').backgroundImage,
          gemTransform:getComputedStyle(button.querySelector('.sg-glass')).transform}
      })
      assert(selectedShape.clip.includes('polygon('), `${label}: selected target is not a diamond`)
      assert(selectedShape.shadow === 'none', `${label}: rectangular selected highlight`)
      assert(selectedShape.ring.includes('linear-gradient'),
        `${label}: selected diamond has no visible gold ring`)
      const selectedGem = await first.locator('.sg-glass').boundingBox()
      assert(selectedGem && originalGem && Math.abs(selectedGem.width-originalGem.width)<1.2 &&
        Math.abs(selectedGem.height-originalGem.height)<1.2,
        `${label}: selection changes physical gemstone size`)
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
      const headerLayout = await page.locator('.sg-header').evaluate(head => {
        const r = node => { const b=node.getBoundingClientRect()
          return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,
            width:b.width,height:b.height,center:b.left+b.width/2}
        }
        return {
          header:r(head),
          brand:r(head.querySelector('.sg-brand')),
          tracker:r(head.querySelector('.sg-round-tracker-v52')),
          actions:r(head.querySelector('.sg-header-actions')),
          bonus:r(head.querySelector('.sg-round-v54-bonus')),
          steps:r(head.querySelector('.sg-round-v52-steps')),
          roundLayout:getComputedStyle(head.querySelector('.sg-round-tracker-v52')).display,
          bonusGem:r(head.querySelector('.sg-round-v54-featured-gem .sg-glass')),
        }
      })
      assert(headerLayout.bonusGem.width >= 14 &&
        Math.abs(headerLayout.bonusGem.width-headerLayout.bonusGem.height) < 1,
        `${label}: featured bonus isn't a clear square glass`)
      assert(headerLayout.bonus.left >= headerLayout.tracker.left - 1 &&
        headerLayout.bonus.right <= headerLayout.tracker.right + 1,
        `${label}: featured bonus spills out of header tracker`)
      if (width <= 1100 && height >= width) {
        assert.equal(headerLayout.roundLayout,'grid',`${label}: portrait round bar is not a grid`)
        assert(headerLayout.bonus.bottom <= headerLayout.steps.top + 1,
          `${label}: bonus label overlaps six-round timeline: ${JSON.stringify(headerLayout)}`)
      }
      if (width > 1100 && height > 620) {
        assert(Math.abs(headerLayout.header.center-headerLayout.tracker.center) < 1.25,
          `${label}: round tracker not exactly centered: ${JSON.stringify(headerLayout)}`)
        assert(headerLayout.header.height >= 74, `${label}: desktop header too short`)
        assert(headerLayout.brand.right + 4 <= headerLayout.tracker.left &&
          headerLayout.tracker.right + 4 <= headerLayout.actions.left,
          `${label}: desktop header elements overlap: ${JSON.stringify(headerLayout)}`)
      }
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

  // Fundamental invariant: at a given desktop resolution factory/diamond
  // geometry is IDENTICAL for five, seven or nine workshops (2/3/4 people).
  for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,720],[1101,621]]) {
    const entries=results.filter(row=>row.label.startsWith(`${width}x${height}-`))
    assert.equal(entries.length,3,`missing 2/3/4-player market sample at ${width}x${height}`)
    for (const entry of entries.slice(1)) {
      assert(Math.abs(entry.factories[0].width-entries[0].factories[0].width) < 1,
        `${width}x${height}: factory diameter changes with player count`)
      assert(Math.abs(entry.gems[0].width-entries[0].gems[0].width) < 1,
        `${width}x${height}: gemstone diameter changes with player count`)
    }
    console.log(`PASS ${width}x${height}: 5/7/9 factories and gems use exactly equal size`)
  }

  // Compact scoring is the only default; its contents must fit without scrolling.
  for (const [width,height] of [[1440,900],[1101,621],[390,844],[844,390],[320,568]]) {
    const page=await browser.newPage({viewport:{width,height}})
    await page.goto('http://127.0.0.1:5179')
    await page.evaluate(async()=>{
      const {newGame}=await import('/src/game/engine.ts')
      localStorage.setItem('sintra-glass-save-v1',JSON.stringify(newGame({opponents:3,seed:258,playerControllers:['human','human','human','human']})))
    })
    await page.reload()
    await page.getByRole('button',{name:'Kontynuuj partię'}).click()
    const mobile=width<=1100 || height<=620
    if(mobile) await page.getByRole('button',{name:'Wyniki'}).click()
    const root=page.locator(mobile ? '.sg-mobile-stats' : '.sg-stage .sg-side-left')
    const compact=root.locator('.sg-compact-scores')
    assert.equal(await compact.locator('.sg-compact-player').count(),4)
    assert(await root.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Compact scoring must fit without scrolling')
    const launcher = compact.getByRole('button',{name:'Powiększ tor punktów'})
    if (mobile) {
      assert.equal(await launcher.count(), 0)
      assert.equal(await compact.locator('.sg-compact-glass-cell').count(), 9)
      const rounds = compact.locator('.sg-score-round-tile')
      assert.equal(await rounds.count(), 6)
      assert(await rounds.last().evaluate(el => {
        const bounds = el.getBoundingClientRect()
        const panel = el.closest('.sg-mobile-stats').getBoundingClientRect()
        return bounds.top >= panel.top && bounds.bottom <= Math.min(panel.bottom, innerHeight) + 1
      }), 'Last round tile clipped on mobile')
    } else {
      await compact.getByRole('button',{name:'Powiększ tor punktów'}).click()
      const dialog=page.getByRole('dialog',{name:'Powiększona plansza punktacji'})
      assert.equal(await dialog.locator('.sg-boardscore-cell').count(),100)
      assert.equal(await dialog.locator('.sg-score-round-tile').count(),6)
      assert.equal(await dialog.locator('.sg-boardscore-broken-step').count(),9)
      await page.keyboard.press('Escape')
    }
    await page.close()
  }

  // Regression: an AI that starts a new round MUST NOT move underneath the
  // ceremony, regardless of whether visual effects are enabled.
  for (const enabled of [true,false]) {
    const page=await browser.newPage({viewport:{width:1440,height:900}})
    try {
      await page.goto('http://127.0.0.1:5179')
      await page.evaluate(async enabled => {
        const {newGame,legalMoves}=await import('/src/game/engine.ts')
        // Seat zero is deliberately always human; seed seat one as the AI starter.
        const state=newGame({opponents:1,seed:105,playerControllers:['human','ai'],
          botDifficulties:['easy']})
        state.currentPlayer=1
        state.startingPlayer=1
        if (state.players[1].controller!=='ai' || legalMoves(state).length===0)
          throw new Error('Invalid AI-first test fixture')
        localStorage.setItem('sintra-glass-save-v1',JSON.stringify(state))
        localStorage.setItem('sintra-glass-visual-effects-v1',String(enabled))
      },enabled)
      await page.reload()
      await page.getByRole('button',{name:'Kontynuuj partię'}).click()
      const popup=page.locator('.sg-round-announcement')
      await popup.waitFor({state:'visible',timeout:2600})
      assert.equal(await popup.locator('.sg-glass.sg-gem-faceted').count(),1,
        'Round cue must show a physical faceted bonus gem')
      const minimal=await popup.evaluate(el=>el.classList.contains('sg-round-announcement--minimal'))
      assert.equal(minimal,!enabled,'Visual effects switch does not control the round cue')
      if (enabled) {
        await page.waitForTimeout(850)
        const blur=await popup.evaluate(el=>getComputedStyle(el).backdropFilter)
        assert(blur.includes('blur('),'Cinematic ceremony must blur the board')
      } else {
        const backdrop=await popup.evaluate(el=>getComputedStyle(el).backdropFilter)
        assert(backdrop==='none','Effects OFF should not blur the board')
      }
      const readTurn=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sintra-glass-save-v1')).turn)
      assert.equal(await readTurn(),0,'AI moved while round announcement was visible')
      await popup.waitFor({state:'hidden',timeout:5000})
      assert.equal(await readTurn(),0,'AI moved before the ceremony finished')
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sintra-glass-save-v1')).turn>=1,
        null,{timeout:11000})
      // The second seat is human: only cinematic mode shows the brief turn cue.
      if(enabled) {
        await page.locator('.sg-human-turn-notice').waitFor({state:'visible',timeout:2600})
      } else {
        assert.equal(await page.locator('.sg-human-turn-notice').count(),0,
          'Effects OFF must not display the human turn popup')
      }
      console.log(`PASS ai-round-gate-effects-${enabled?'on':'off'}: no hidden AI move, optional turn cue`)
    } finally {
      await page.close()
    }
  }
} finally {
  await browser?.close()
  await server.close()
}
