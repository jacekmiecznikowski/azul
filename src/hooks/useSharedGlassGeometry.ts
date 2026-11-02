import { useEffect } from 'react'

/**
 * One geometric glass diameter per displayed table, measured from the
 * smallest real pane and factory cell. Do not read the socket size here:
 * sockets themselves use the resulting variable, so doing so would create
 * a resize feedback loop.
 */
export function useSharedGlassGeometry(
  enabled: boolean,
  revision: string | number,
) {
  useEffect(() => {
    if (!enabled) return

    let frame = 0
    const observers: ResizeObserver[] = []
    const layouts = [
      document.querySelector<HTMLElement>('.sg .sg-felt'),
      document.querySelector<HTMLElement>('.sg .sg-mobile-layout'),
    ].filter((el): el is HTMLElement => el !== null)

    function measure(root: HTMLElement) {
      if (!root.getClientRects().length) return
      const pane = root.querySelector<HTMLElement>('.sg-pane')
      const grid = root.querySelector<HTMLElement>('.sg-factory-grid')
      const center = root.querySelector<HTMLElement>('.sg-center-pile.sg-center-v45')
      if (!pane || !grid || !center) return
      if (pane.clientWidth === 0 || grid.clientWidth === 0) return

      const narrow = root.classList.contains('sg-mobile-layout')
      const columns = narrow && center.clientWidth < 125 ? 2 : 3
      const paneSpace = Math.min(pane.clientWidth * .84, pane.clientHeight * .84)
      const factorySpace = Math.min(grid.clientWidth / 2, grid.clientHeight / 2) * .91
      const centerSpace = (center.clientWidth - (columns - 1) * 3) / columns - 11
      const centerHeightSpace = (center.clientHeight - 12) / Math.ceil(5 / columns) - 4
      const diameter = Math.max(8, Math.min(48, paneSpace, factorySpace, centerSpace, centerHeightSpace))
      const value = `${Math.round(diameter * 10) / 10}px`
      if (root.style.getPropertyValue('--sg-unified-gem-size') !== value) {
        root.style.setProperty('--sg-unified-gem-size', value)
      }
      root.style.setProperty('--sg-center-columns', String(columns))
      root.dataset.sgSharedGem = value
    }

    const recalc = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => layouts.forEach(measure))
    }
    for (const layout of layouts) {
      const observer = new ResizeObserver(recalc)
      observer.observe(layout)
      for (const selector of ['.sg-pane', '.sg-factory-grid', '.sg-center-pile.sg-center-v45']) {
        const node = layout.querySelector(selector)
        if (node) observer.observe(node)
      }
      observers.push(observer)
    }
    window.addEventListener('resize', recalc)
    recalc()
    return () => {
      window.removeEventListener('resize', recalc)
      observers.forEach(observer => observer.disconnect())
      cancelAnimationFrame(frame)
    }
  }, [enabled, revision])
}
